import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || 'finaltest-01'
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const bucket = 'customer-sites'

  const listRoot = await sb.storage.from(bucket).list('', { limit: 100 })
  const listSlug = await sb.storage.from(bucket).list(slug, { limit: 100 })
  const listSlugSlash = await sb.storage.from(bucket).list(slug + '/', { limit: 100 })

  return NextResponse.json({
    bucket,
    slug,
    root: { data: listRoot.data, error: listRoot.error?.message },
    by_slug: { data: listSlug.data, error: listSlug.error?.message },
    by_slug_trailing_slash: { data: listSlugSlash.data, error: listSlugSlash.error?.message },
  })
}
