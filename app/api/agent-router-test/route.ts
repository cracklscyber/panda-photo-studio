import { NextRequest, NextResponse } from 'next/server'
import { routeMessage } from '@/lib/romy-router'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const message = req.nextUrl.searchParams.get('message') || 'Hallo!'
  const hasImage = req.nextUrl.searchParams.get('image') === '1'
  const historyParam = req.nextUrl.searchParams.get('history') || ''

  // history format: "user:hi|assistant:Hallo|user:was kostet das"
  const history = historyParam
    ? historyParam.split('|').map((seg) => {
        const [role, ...rest] = seg.split(':')
        return {
          role: role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: rest.join(':'),
        }
      })
    : []

  const result = await routeMessage(history, message, hasImage)

  return NextResponse.json({
    input: { message, has_image: hasImage, history_len: history.length },
    ...result,
  })
}
