import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { name, phone } = await req.json()

  if (!name || !phone) {
    return NextResponse.json({ error: 'Name und Telefonnummer sind erforderlich' }, { status: 400 })
  }

  // Normalize phone number: strip spaces/dashes, ensure +49 prefix
  let normalized = phone.replace(/[\s\-\(\)]/g, '')
  if (normalized.startsWith('0')) {
    normalized = '+49' + normalized.slice(1)
  } else if (!normalized.startsWith('+')) {
    normalized = '+49' + normalized
  }

  const { data, error } = await supabase
    .from('luna_leads')
    .insert({ name, phone: normalized })
    .select()
    .single()

  if (error) {
    // Duplicate phone number
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Diese Nummer ist bereits registriert' }, { status: 409 })
    }
    console.error('Lead insert error:', error)
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}
