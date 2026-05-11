import { NextRequest, NextResponse } from 'next/server'
import { findSiteByPhone } from '@/lib/romy-sites'
import { generateImagesForBranche } from '@/lib/gemini-images'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function cleanSessionId(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: unknown; branche?: unknown; count?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = cleanSessionId(body.sessionId)
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const sessionKey = `web:${sessionId}`
  const site = await findSiteByPhone(sessionKey)
  if (!site) {
    return NextResponse.json({ error: 'No site for session.' }, { status: 404 })
  }

  const branche =
    typeof body.branche === 'string' && body.branche.trim()
      ? body.branche.trim()
      : site.business_name || site.slug
  const count = typeof body.count === 'number' ? body.count : 3

  try {
    const images = await generateImagesForBranche({
      slug: site.slug,
      branche,
      count,
    })
    return NextResponse.json({
      ok: true,
      slug: site.slug,
      images: images.map((i) => ({ url: i.url, storagePath: i.storagePath })),
    })
  } catch (err) {
    console.error('generate-images failed:', err)
    return NextResponse.json(
      { error: (err as Error).message || 'Bild-Generierung fehlgeschlagen.' },
      { status: 500 }
    )
  }
}
