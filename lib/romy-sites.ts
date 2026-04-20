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
  created_at: string
  updated_at: string
}

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
        'Extrahiere den Geschäftsnamen aus einer deutschen Nachricht. Antworte NUR mit dem Namen, nichts sonst. Wenn kein klarer Name erkennbar ist, antworte mit: NONE',
      messages: [{ role: 'user', content: userMessage }],
    })
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
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
  const slugBase = businessName || phone.replace(/[^0-9]/g, '').slice(-8) || 'kunde'
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

export async function updateSiteSandboxId(
  phone: string,
  sandboxId: string
): Promise<void> {
  await sb()
    .from('romy_sites')
    .update({ last_sandbox_id: sandboxId, updated_at: new Date().toISOString() })
    .eq('phone', phone)
}
