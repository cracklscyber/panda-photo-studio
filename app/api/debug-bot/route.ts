import { NextRequest, NextResponse } from 'next/server'
import { handleLunaMessage } from '@/lib/luna-agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone') || '+491234567890'
  const message = req.nextUrl.searchParams.get('message') || 'Hallo Romy, test'
  const t0 = Date.now()
  try {
    const reply = await handleLunaMessage(phone, message)
    return NextResponse.json({ ok: true, duration_ms: Date.now() - t0, phone, message, reply })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        duration_ms: Date.now() - t0,
        phone,
        message,
        error: (err as Error).message,
        stack: (err as Error).stack?.split('\n').slice(0, 5),
      },
      { status: 500 }
    )
  }
}
