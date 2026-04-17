import { NextRequest, NextResponse } from 'next/server'
import { runRomyCoder } from '@/lib/romy-coder'
import { listSiteFiles } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || 'coder-test'
  const message =
    req.nextUrl.searchParams.get('message') ||
    'Bau mir eine einfache Startseite für mein Café "Testcafé" mit Öffnungszeiten Mo-Fr 8-18 Uhr.'

  const result = await runRomyCoder({ slug, userMessage: message })

  const filesAfter = await listSiteFiles(slug).catch(() => [])

  return NextResponse.json({
    ...result,
    files_in_storage_after: filesAfter,
  })
}
