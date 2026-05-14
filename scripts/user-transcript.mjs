// Lookup für "User N Sandbox Transkript".
// Verwendung:
//   node scripts/user-transcript.mjs <userNumber>           # neuestes Transcript dumpen
//   node scripts/user-transcript.mjs <userNumber> --short   # ohne stdout/stderr
//   node scripts/user-transcript.mjs <userNumber> --list    # nur Liste, kein Download
//
// Die Nummerierung folgt dem Admin-Dashboard (app/admin/page.tsx):
// anonyme Web-User (kein name/email, keine echte Telefon-Nummer)
// werden nach updated_at aufsteigend durchnummeriert ab #1.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) {
    let v = m[2]
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    process.env[m[1]] = v.trim()
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
)

const target = Number(process.argv[2])
const short = process.argv.includes('--short')
const listOnly = process.argv.includes('--list')
if (!Number.isFinite(target) || target < 1) {
  console.error('Usage: node scripts/user-transcript.mjs <userNumber> [--short|--list]')
  process.exit(1)
}

const [convosRes, customersRes] = await Promise.all([
  sb
    .from('romy_conversations')
    .select('phone, updated_at, messages')
    .order('updated_at', { ascending: false })
    .limit(500),
  sb.from('romy_customers').select('session_id, email, name'),
])
if (convosRes.error) { console.error('convos query failed:', convosRes.error); process.exit(1) }

const customerBySession = new Map((customersRes.data || []).map((c) => [c.session_id, c]))
const ordered = (convosRes.data || [])
  .filter((c) => c.phone && c.phone !== '__hook__')
  .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())

let n = 1
let found = null
for (const c of ordered) {
  const cust = customerBySession.get(c.phone)
  const hasIdentity = !!(cust?.name?.trim() || cust?.email?.trim())
  const looksLikePhone = /^\+?\d{6,}$/.test(c.phone.replace(/^web:/, ''))
  if (hasIdentity || looksLikePhone) continue
  if (n === target) { found = c; break }
  n++
}

if (!found) {
  console.log(`User #${target} nicht gefunden. Es gibt ${n - 1} anonyme User in den letzten 500 Convos.`)
  process.exit(0)
}

console.log(`User #${target}  phone=${found.phone}  letzte Aktivität=${found.updated_at}  msgs=${found.messages?.length || 0}`)

const { data: site, error: siteErr } = await sb
  .from('romy_sites')
  .select('slug, business_name, builds_used, paid, created_at')
  .eq('phone', found.phone)
  .maybeSingle()
if (siteErr) console.error('site lookup failed:', siteErr.message)
console.log(`Site  slug=${site?.slug || '-'}  biz="${site?.business_name || '-'}"  builds_used=${site?.builds_used ?? '-'}  paid=${site?.paid ?? '-'}`)

const { data: builds } = await sb
  .from('romy_build_logs')
  .select('created_at, ok, was_warm, duration_ms, cost_usd, error_step, error_msg, user_message')
  .eq('phone', found.phone)
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`\nBuild-Logs (${builds?.length || 0}):`)
for (const b of builds || []) {
  const ts = b.created_at.slice(5, 19)
  console.log(`  [${ts}] ok=${b.ok} warm=${b.was_warm} dur=${b.duration_ms}ms step=${b.error_step || '-'}  user="${(b.user_message || '').slice(0, 80)}"`)
  if (b.error_msg) console.log(`    err: ${b.error_msg}`)
}

if (!site?.slug) {
  console.log('\nKein Slug → keine Transkript-Suche möglich.')
  process.exit(0)
}

const allFiles = []
const { data: dayEntries, error: dayErr } = await sb.storage
  .from('romy-transcripts')
  .list(site.slug, { limit: 200 })
if (dayErr) {
  console.error('bucket list failed:', dayErr.message)
}
for (const day of dayEntries || []) {
  if (day.id) continue // skip files at root of slug
  const { data: files } = await sb.storage
    .from('romy-transcripts')
    .list(`${site.slug}/${day.name}`, { limit: 500 })
  for (const f of files || []) allFiles.push(`${site.slug}/${day.name}/${f.name}`)
}
allFiles.sort().reverse()

console.log(`\nTranskripte für Slug "${site.slug}": ${allFiles.length}`)
for (const p of allFiles.slice(0, 10)) console.log(`  ${p}`)

if (allFiles.length === 0) {
  console.log('\nKein Transkript für diesen User vorhanden.')
  console.log('Mögliche Gründe: Build vor 2026-05-13 (Persistence-Patch), oder Outer-Timeout vor 2026-05-14 (vor Outer-Save-Patch).')
  process.exit(0)
}

if (listOnly) process.exit(0)

const latestPath = allFiles[0]
console.log(`\n=== Neuestes Transkript: ${latestPath} ===`)
const { data: blob, error: dlErr } = await sb.storage.from('romy-transcripts').download(latestPath)
if (dlErr || !blob) {
  console.error('Download fehlgeschlagen:', dlErr?.message)
  process.exit(1)
}
const text = await blob.text()
let obj
try {
  obj = JSON.parse(text)
} catch {
  console.log(text)
  process.exit(0)
}
if (short && obj.agent) {
  obj.agent.stdout = `[${obj.agent.stdout?.length || 0} chars elided]`
  obj.agent.stderr = `[${obj.agent.stderr?.length || 0} chars elided]`
}
console.log(JSON.stringify(obj, null, 2))
