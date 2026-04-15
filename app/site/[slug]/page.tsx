import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { FONT_MAP, WebsiteData } from '@/components/templates/types'
import ElegantTemplate from '@/components/templates/ElegantTemplate'
import DefaultTemplate from '@/components/templates/DefaultTemplate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SitePage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const { data: site } = await supabase
    .from('luna_websites')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!site) {
    notFound()
  }

  const w = site as WebsiteData
  const fontKey = w.font || 'inter'
  const fontData = FONT_MAP[fontKey] || FONT_MAP.inter
  const fontImport = `https://fonts.googleapis.com/css2?family=${fontData.import}&display=swap`
  const fontFamily = `'${fontData.name}', sans-serif`

  const templateProps = { site: w, fontImport, fontFamily }

  // Select template
  const template = w.template || 'default'

  return (
    <>
      <head>
        <link href={fontImport} rel="stylesheet" />
      </head>
      {template === 'elegant' ? (
        <ElegantTemplate {...templateProps} />
      ) : (
        <DefaultTemplate {...templateProps} />
      )}
    </>
  )
}
