import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface CustomerProfile {
  id: string
  whatsapp_user_id: string | null
  user_id: string | null
  customer_name: string | null
  company_name: string | null
  brand_colors: string | null
  preferred_styles: string | null
  favorite_backgrounds: string | null
  image_format_preferences: string | null
  address_form: string
  special_notes: string | null
}

// Get or create WhatsApp user by phone number
export async function getOrCreateWhatsAppUser(phoneNumber: string): Promise<string> {
  const { data: existing } = await supabase
    .from('whatsapp_users')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single()

  if (existing) return existing.id

  const { data: newUser, error } = await supabase
    .from('whatsapp_users')
    .insert({ phone_number: phoneNumber })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating WhatsApp user:', error)
    return phoneNumber
  }
  return newUser.id
}

// Check if a WhatsApp user has a linked website account
export async function getLinkedUserIdServer(whatsappUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('whatsapp_users')
    .select('linked_user_id')
    .eq('id', whatsappUserId)
    .single()

  return data?.linked_user_id || null
}

// Get customer profile for a WhatsApp user
export async function getCustomerProfile(whatsappUserId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('whatsapp_user_id', whatsappUserId)
    .single()

  if (error || !data) return null
  return data
}

// Create or update customer profile
export async function upsertCustomerProfile(
  whatsappUserId: string,
  updates: Partial<Omit<CustomerProfile, 'id' | 'whatsapp_user_id'>>
): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .upsert(
      {
        whatsapp_user_id: whatsappUserId,
        ...updates,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'whatsapp_user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting customer profile:', error)
    return null
  }
  return data
}

// Load chat history from DB
export async function loadChatHistory(
  whatsappUserId: string,
  limit: number = 50
): Promise<Array<{ role: string; content: string }>> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', whatsappUserId)
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error loading chat history:', error)
    return []
  }
  return data || []
}

// Save a WhatsApp message to DB
export async function saveWhatsAppMessage(
  whatsappUserId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: whatsappUserId,
      role,
      content,
      channel: 'whatsapp'
    })

  if (error) {
    console.error('Error saving WhatsApp message:', error)
  }
}

// Trim chat history to keep only the most recent messages
export async function trimChatHistory(
  userId: string,
  max: number = 50,
  channel: 'whatsapp' | 'web' = 'whatsapp'
): Promise<void> {
  const { count, error: countError } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', channel)

  if (countError || !count || count <= max) return

  const { data: keepFrom } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(1)
    .range(max - 1, max - 1)

  if (!keepFrom || keepFrom.length === 0) return

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)
    .eq('channel', channel)
    .lt('created_at', keepFrom[0].created_at)

  if (error) {
    console.error('Error trimming chat history:', error)
  }
}

// === Website user functions ===

// Get customer profile by auth user ID
export async function getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data
}

// Create or update customer profile for website user
export async function upsertCustomerProfileByUserId(
  userId: string,
  updates: Partial<Omit<CustomerProfile, 'id' | 'user_id' | 'whatsapp_user_id'>>
): Promise<CustomerProfile | null> {
  // Check if profile exists
  const existing = await getCustomerProfileByUserId(userId)

  if (existing) {
    const { data, error } = await supabase
      .from('customer_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating customer profile:', error)
      return null
    }
    return data
  }

  const { data, error } = await supabase
    .from('customer_profiles')
    .insert({ user_id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) {
    console.error('Error creating customer profile:', error)
    return null
  }
  return data
}

// Load web chat history
export async function loadWebChatHistory(
  userId: string,
  limit: number = 50
): Promise<Array<{ role: string; content: string }>> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .eq('channel', 'web')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error loading web chat history:', error)
    return []
  }
  return data || []
}

// Save a web chat message
export async function saveWebChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      role,
      content,
      channel: 'web'
    })

  if (error) {
    console.error('Error saving web chat message:', error)
  }
}
