import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

export interface RomyCustomer {
  id: string
  session_id: string
  email: string | null
  name: string | null
  provider: string | null
  auth_user_id: string | null
  stripe_customer_id: string | null
  first_build_at: string | null
  created_at: string
  updated_at: string
}

export async function ensureCustomer(sessionId: string): Promise<RomyCustomer> {
  const existing = await findCustomer(sessionId)
  if (existing) return existing

  const { data, error } = await sb()
    .from('romy_customers')
    .insert({ session_id: sessionId })
    .select('*')
    .single()

  if (error) {
    const again = await findCustomer(sessionId)
    if (again) return again
    throw new Error(`Could not ensure customer for ${sessionId}: ${error.message}`)
  }
  return data as RomyCustomer
}

export async function findCustomer(sessionId: string): Promise<RomyCustomer | null> {
  const { data } = await sb()
    .from('romy_customers')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  return (data as RomyCustomer) || null
}

export async function findCustomerByAuthUserId(
  authUserId: string
): Promise<RomyCustomer | null> {
  const { data } = await sb()
    .from('romy_customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as RomyCustomer) || null
}

export async function findCustomerByEmail(email: string): Promise<RomyCustomer | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const { data } = await sb()
    .from('romy_customers')
    .select('*')
    .eq('email', normalized)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as RomyCustomer) || null
}

export async function markFirstBuild(sessionId: string): Promise<void> {
  await sb()
    .from('romy_customers')
    .update({
      first_build_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .is('first_build_at', null)
}

export async function linkAuthUser(
  sessionId: string,
  fields: { authUserId: string; email: string | null; name: string | null; provider: string }
): Promise<void> {
  await sb()
    .from('romy_customers')
    .update({
      auth_user_id: fields.authUserId,
      email: fields.email,
      name: fields.name,
      provider: fields.provider,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
}

export async function setCustomerEmail(
  sessionId: string,
  email: string,
  name: string | null = null
): Promise<void> {
  await sb()
    .from('romy_customers')
    .update({
      email,
      name,
      provider: 'email',
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
}

export async function setStripeCustomer(
  sessionId: string,
  stripeCustomerId: string
): Promise<void> {
  await sb()
    .from('romy_customers')
    .update({
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
}

export async function findCustomerByStripeId(
  stripeCustomerId: string
): Promise<RomyCustomer | null> {
  const { data } = await sb()
    .from('romy_customers')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()
  return (data as RomyCustomer) || null
}

export function isAuthenticated(customer: RomyCustomer | null | undefined): boolean {
  if (!customer) return false
  return !!customer.auth_user_id
}

export function hasCompletedFirstBuild(customer: RomyCustomer | null | undefined): boolean {
  return !!customer?.first_build_at
}

export async function resetCustomer(sessionId: string): Promise<void> {
  await sb().from('romy_customers').delete().eq('session_id', sessionId)
}
