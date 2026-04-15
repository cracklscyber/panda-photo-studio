import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function normalizePhoneNumber(phone: string): string {
  // Strip spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '')
  // German local format: 0171... → +49171...
  if (normalized.startsWith('0')) {
    normalized = '+49' + normalized.substring(1)
  }
  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }
  return normalized
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Parse and normalize phone number
    const { phoneNumber } = await request.json()
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Telefonnummer fehlt' }, { status: 400 })
    }

    const normalized = normalizePhoneNumber(phoneNumber)

    // Look up existing whatsapp_users entry
    const { data: waUser } = await supabase
      .from('whatsapp_users')
      .select('id, linked_user_id')
      .eq('phone_number', normalized)
      .single()

    if (waUser) {
      // Check if already linked to a different user
      if (waUser.linked_user_id && waUser.linked_user_id !== user.id) {
        return NextResponse.json(
          { error: 'Diese Nummer ist bereits mit einem anderen Konto verknüpft' },
          { status: 409 }
        )
      }

      // Update linked_user_id
      await supabase
        .from('whatsapp_users')
        .update({ linked_user_id: user.id })
        .eq('id', waUser.id)

      // Migrate existing gallery images from whatsapp:UUID to auth user ID
      await supabase
        .from('gallery_images')
        .update({ user_id: user.id })
        .eq('user_id', `whatsapp:${waUser.id}`)
    } else {
      // Create new whatsapp_users entry with link pre-set
      await supabase
        .from('whatsapp_users')
        .insert({ phone_number: normalized, linked_user_id: user.id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link phone error:', error)
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 })
  }
}
