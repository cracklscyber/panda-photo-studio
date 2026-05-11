import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findCustomer, isAuthenticated } from '@/lib/romy-customers'

export const dynamic = 'force-dynamic'

function cleanSessionId(input: string | null): string {
  if (!input) return ''
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

export async function GET(req: NextRequest) {
  const sessionId = cleanSessionId(req.nextUrl.searchParams.get('sessionId'))
  if (!sessionId) {
    return NextResponse.json({ authenticated: false })
  }

  const customer = await findCustomer(`web:${sessionId}`)
  if (!customer || !isAuthenticated(customer)) {
    return NextResponse.json({ authenticated: false })
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user || data.user.id !== customer.auth_user_id) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    name: customer.name,
    email: customer.email,
    provider: customer.provider,
  })
}
