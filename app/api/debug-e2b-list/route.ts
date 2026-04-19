import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || ''
  const service = req.nextUrl.searchParams.get('service') || 'romy-coder-v1'

  const out: Record<string, unknown> = {}

  try {
    const p1 = Sandbox.list({
      apiKey: process.env.E2B_API_KEY!,
      query: { state: ['running'] },
      limit: 20,
    })
    const all = await p1.nextItems()
    out.all_running = all.map((s) => ({
      id: s.sandboxId,
      metadata: s.metadata,
      startedAt: s.startedAt,
      endAt: s.endAt,
    }))
  } catch (e) {
    out.all_running_error = (e as Error).message
  }

  try {
    const p1b = Sandbox.list({
      apiKey: process.env.E2B_API_KEY!,
      query: { state: ['running', 'paused'] },
      limit: 20,
    })
    const all = await p1b.nextItems()
    out.all_any_state = all.map((s) => ({
      id: s.sandboxId,
      metadata: s.metadata,
      startedAt: s.startedAt,
      endAt: s.endAt,
    }))
  } catch (e) {
    out.all_any_state_error = (e as Error).message
  }

  if (slug) {
    try {
      const p2 = Sandbox.list({
        apiKey: process.env.E2B_API_KEY!,
        query: { metadata: { slug, service }, state: ['running'] },
        limit: 5,
      })
      const items = await p2.nextItems()
      out.filtered = items.map((s) => ({ id: s.sandboxId, metadata: s.metadata }))
    } catch (e) {
      out.filtered_error = (e as Error).message
    }
  }

  return NextResponse.json(out)
}
