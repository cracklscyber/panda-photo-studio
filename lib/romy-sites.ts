import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

let _sb: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
    )
  }
  return _sb
}

function anthropicClient(): Anthropic {
  const credential = process.env.ANTHROPIC_API_KEY || ''
  if (credential.startsWith('sk-ant-oat')) {
    return new Anthropic({ authToken: credential })
  }
  return new Anthropic({ apiKey: credential })
}

export interface RomySite {
  phone: string
  slug: string
  business_name: string | null
  last_sandbox_id: string | null
  custom_domain: string | null
  builds_used: number
  paid: boolean
  callback_requested_at: string | null
  created_at: string
  updated_at: string
}

export const FREE_BUILD_LIMIT = 4

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'kunde'
}

async function slugExists(slug: string): Promise<boolean> {
  const { data } = await sb()
    .from('romy_sites')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  return !!data
}

export async function uniquifySlug(base: string): Promise<string> {
  const clean = slugify(base)
  if (!(await slugExists(clean))) return clean
  for (let i = 2; i < 100; i++) {
    const candidate = `${clean}-${i}`
    if (!(await slugExists(candidate))) return candidate
  }
  return `${clean}-${Date.now().toString(36)}`
}

export async function findSiteByPhone(phone: string): Promise<RomySite | null> {
  const { data } = await sb()
    .from('romy_sites')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()
  return (data as RomySite) || null
}

export async function findSiteByDomain(domain: string): Promise<RomySite | null> {
  const { data } = await sb()
    .from('romy_sites')
    .select('*')
    .eq('custom_domain', domain.toLowerCase())
    .maybeSingle()
  return (data as RomySite) || null
}

async function extractBusinessName(userMessage: string): Promise<string | null> {
  const client = anthropicClient()
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 40,
      system:
        'Du extrahierst aus einer deutschen Nachricht eine kurze Bezeichnung fürs Geschäft, die als URL-Subdomain taugt.\n' +
        'Antworte NUR mit der Bezeichnung, nichts sonst. Keine Anführungszeichen, keine Erklärung.\n' +
        'Reihenfolge:\n' +
        '1. Wenn ein konkreter Eigenname da ist ("Cafe Sonne", "Friseur Müller"), nutze den.\n' +
        '2. Sonst nutze den Branchentyp ("Nagelstudio", "Friseur", "Cafe", "Pizzeria", "Tierarzt"). Nur das Substantiv, keine Füllwörter.\n' +
        '3. Nur wenn wirklich nichts erkennbar ist (reine Begrüßung o.ä.), antworte mit: NONE',
      messages: [{ role: 'user', content: userMessage }],
    })
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
      .replace(/^["'«»]+|["'«»]+$/g, '')
    if (!text || text.toUpperCase() === 'NONE' || text.length > 60) return null
    return text
  } catch {
    return null
  }
}

export async function getOrCreateSite(
  phone: string,
  userMessage: string
): Promise<RomySite> {
  const existing = await findSiteByPhone(phone)
  if (existing) return existing

  const businessName = await extractBusinessName(userMessage)
  const slugBase = businessName || 'kunde'
  const slug = await uniquifySlug(slugBase)

  const { data, error } = await sb()
    .from('romy_sites')
    .insert({
      phone,
      slug,
      business_name: businessName,
    })
    .select('*')
    .single()

  if (error) {
    // Race: another concurrent insert won. Refetch.
    const again = await findSiteByPhone(phone)
    if (again) return again
    throw new Error(`Could not create romy_site for ${phone}: ${error.message}`)
  }
  // Register the subdomain with Vercel so HTTPS cert gets issued.
  // Hobby plan can't wildcard-cert with external DNS, so we add each subdomain.
  const { ensureVercelSubdomain } = await import('./vercel-domains')
  await ensureVercelSubdomain(slug).catch((err) =>
    console.error('ensureVercelSubdomain failed:', err)
  )
  return data as RomySite
}

export async function updateSiteSandboxId(
  phone: string,
  sandboxId: string
): Promise<void> {
  await sb()
    .from('romy_sites')
    .update({ last_sandbox_id: sandboxId, updated_at: new Date().toISOString() })
    .eq('phone', phone)
}

export async function incrementBuildCount(phone: string): Promise<void> {
  const { data } = await sb()
    .from('romy_sites')
    .select('builds_used')
    .eq('phone', phone)
    .maybeSingle()
  const current = (data?.builds_used as number | undefined) ?? 0
  await sb()
    .from('romy_sites')
    .update({ builds_used: current + 1, updated_at: new Date().toISOString() })
    .eq('phone', phone)
}

export async function markCallbackRequested(phone: string): Promise<void> {
  await sb()
    .from('romy_sites')
    .update({
      callback_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('phone', phone)
}

export async function setPaid(phone: string, paid: boolean): Promise<void> {
  await sb()
    .from('romy_sites')
    .update({ paid, updated_at: new Date().toISOString() })
    .eq('phone', phone)
}

export async function resetQuota(phone: string): Promise<void> {
  await sb()
    .from('romy_sites')
    .update({
      builds_used: 0,
      callback_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('phone', phone)
}
