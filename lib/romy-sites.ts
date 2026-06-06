import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { deleteAllSiteFiles } from './supabase-storage'

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
    return new Anthropic({ apiKey: null, authToken: credential })
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

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/i)
  if (!match) return null
  const raw = match[0].replace(/[),.;]+$/g, '')
  return raw.startsWith('http') ? raw : `https://${raw}`
}

function cleanTitle(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ouml;/g, 'ö')
    .replace(/&auml;/g, 'ä')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferBusinessNameFromTitle(title: string, url: string): string | null {
  const parts = cleanTitle(title)
    .split(/\s+[|–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const generic =
    /^(home|startseite|willkommen|website|hundetrainer|beratung|coaching|training|leistungen|kontakt)$/i
  const useful = parts.find(
    (part) => !generic.test(part) && /[a-zäöüß]+\s+[a-zäöüß]+/i.test(part)
  )
  const fallback = parts.find((part) => !generic.test(part)) || parts[0]
  const name = useful || fallback || new URL(url).hostname.replace(/^www\./, '')
  return name && !generic.test(name) ? name.slice(0, 60) : null
}

async function extractBusinessNameFromUrl(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; RomyBot/1.0; +https://halloluna.net)',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      cache: 'no-store',
    })
    const html = await res.text()
    const title =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      ''
    return title ? inferBusinessNameFromTitle(title, url) : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
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

function isPlaceholderSlug(slug: string, phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  const tail = digits.slice(-8)
  return (
    slug === 'kunde' ||
    slug.startsWith('kunde-') ||
    slug === tail ||
    slug === `image-${tail}`
  )
}

async function extractBusinessName(context: string): Promise<string | null> {
  const url = extractFirstUrl(context)
  if (url) {
    const fromUrl = await extractBusinessNameFromUrl(url)
    if (fromUrl) return fromUrl
  }

  const client = anthropicClient()
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 40,
      system:
        'Du extrahierst aus einem deutschen Chat-Verlauf eine kurze Bezeichnung fürs Geschäft, die als URL-Subdomain taugt.\n' +
        'Antworte NUR mit der Bezeichnung, nichts sonst. Keine Anführungszeichen, keine Erklärung.\n' +
        'Reihenfolge:\n' +
        '1. Wenn ein konkreter Eigenname da ist ("Cafe Sonne", "Friseur Müller"), nutze den.\n' +
        '2. Sonst nutze den Branchentyp ("Nagelstudio", "Friseur", "Cafe", "Pizzeria", "Tierarzt"). Nur das Substantiv, keine Füllwörter.\n' +
        '3. Nur wenn wirklich nichts erkennbar ist (reine Begrüßung o.ä.), antworte mit: NONE',
      messages: [{ role: 'user', content: context }],
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
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<RomySite> {
  const existing = await findSiteByPhone(phone)
  // Ganze History als Kontext mitgeben damit der Firmenname auch dann
  // erkannt wird wenn die aktuelle Nachricht nur "ja" oder "mach los" ist.
  const context = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .concat(userMessage)
    .join('\n')

  if (existing) {
    if (
      !existing.business_name &&
      isPlaceholderSlug(existing.slug, phone)
    ) {
      const businessName = await extractBusinessName(context)
      if (businessName) {
        const slug = await uniquifySlug(businessName)
        const { data, error } = await sb()
          .from('romy_sites')
          .update({
            slug,
            business_name: businessName,
            updated_at: new Date().toISOString(),
          })
          .eq('phone', phone)
          .select('*')
          .single()
        if (!error && data) return data as RomySite
      }
    }
    return existing
  }

  const businessName = await extractBusinessName(context)
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
  return data as RomySite
}

export interface PublishConfirmation {
  // Pflicht-Flag: muss true sein. Dient als Hard-Coded-Sicherung gegen
  // versehentliches Veröffentlichen aus zukünftigen Codepfaden. Wer
  // publishSite ohne diesen Beweis ruft, fliegt sofort raus.
  userExplicitlyConfirmed: true
}

export async function publishSite(
  phone: string,
  confirmation: PublishConfirmation
): Promise<RomySite | null> {
  if (!confirmation || confirmation.userExplicitlyConfirmed !== true) {
    throw new Error(
      'publishSite refused: userExplicitlyConfirmed flag is required. ' +
        'Sites must never go live without an explicit user confirmation.'
    )
  }
  const site = await findSiteByPhone(phone)
  if (!site) return null

  // Register the subdomain only after the customer explicitly confirms publish.
  // Hobby plan can't wildcard-cert with external DNS, so we add each subdomain.
  const { ensureVercelSubdomain } = await import('./vercel-domains')
  await ensureVercelSubdomain(site.slug)
  await sb()
    .from('romy_sites')
    .update({ updated_at: new Date().toISOString() })
    .eq('phone', phone)
  return site
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

async function clearWarmMetaForSlug(slug: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  await fetch(
    `${baseUrl}/storage/v1/object/customer-sites/_meta/${slug}.json`,
    { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } }
  ).catch(() => {})
}

export async function resetSite(phone: string): Promise<void> {
  const existing = await findSiteByPhone(phone)
  if (!existing) return

  await deleteAllSiteFiles(existing.slug).catch((err) =>
    console.error('resetSite deleteAllSiteFiles failed:', err)
  )
  await clearWarmMetaForSlug(existing.slug).catch((err) =>
    console.error('resetSite clearWarmMeta failed:', err)
  )
  await sb()
    .from('romy_sites')
    .delete()
    .eq('phone', phone)
}
