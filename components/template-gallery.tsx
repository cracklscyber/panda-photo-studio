'use client'

import { CSSProperties } from 'react'
import { SITE_TEMPLATES, SiteTemplate, PENDING_TEMPLATE_KEY } from '@/lib/templates'

const FONT_FAMILY_MAP: Record<SiteTemplate['preview']['fontFamily'], string> = {
  serif: 'var(--font-display), Georgia, "Times New Roman", serif',
  'display-serif': 'var(--font-display), Georgia, serif',
  sans: 'var(--font-sans), "Helvetica Neue", Arial, sans-serif',
}

const WEIGHT_MAP: Record<SiteTemplate['preview']['headlineWeight'], number> = {
  regular: 400,
  medium: 500,
  bold: 700,
}

function TemplatePreview({ template }: { template: SiteTemplate }) {
  const p = template.preview
  const isDark = isDarkColor(p.bg)
  const dotInk = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
  const borderInk = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const navInk = withAlpha(p.ink, 0.65)

  const surfaceStyle: CSSProperties = {
    background: p.bg,
    color: p.ink,
    fontFamily: FONT_FAMILY_MAP[p.fontFamily],
  }

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl"
      style={surfaceStyle}
    >
      {/* faux browser chrome */}
      <div
        className="flex items-center gap-1.5 border-b px-3 py-2"
        style={{ borderColor: borderInk }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotInk }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotInk }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotInk }} />
      </div>
      {/* mini site */}
      <div className="flex h-[calc(100%-25px)] flex-col px-5 pt-3">
        {/* nav */}
        <div className="mb-auto flex items-center justify-between text-[8px] uppercase tracking-[0.22em]" style={{ color: navInk }}>
          <span className="font-medium" style={{ color: p.ink }}>{template.name}</span>
          <span className="flex gap-2.5">
            <span>Menu</span>
            <span>Über</span>
            <span>Kontakt</span>
          </span>
        </div>
        {/* hero block */}
        <div className="pb-5">
          <div
            className="mb-2 inline-flex items-center gap-1.5 text-[8px] font-medium uppercase tracking-[0.25em]"
            style={{ color: p.accent }}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: p.accent }} />
            {p.tag}
          </div>
          <h3
            className="whitespace-pre-line leading-[0.95] tracking-[-0.02em]"
            style={{
              fontFamily: FONT_FAMILY_MAP[p.fontFamily],
              fontWeight: WEIGHT_MAP[p.headlineWeight],
              fontSize: 'clamp(18px, 2.6vw, 26px)',
              color: p.ink,
            }}
          >
            {p.headline}
          </h3>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p
              className="text-[9px] leading-snug"
              style={{ color: p.muted, fontFamily: FONT_FAMILY_MAP[p.fontFamily] }}
            >
              {p.sub}
            </p>
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-medium tracking-[0.04em]"
              style={{
                background: p.accent,
                color: contrastOn(p.accent),
                fontFamily: FONT_FAMILY_MAP[p.fontFamily],
              }}
            >
              {p.cta} →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function handleSelect(id: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_TEMPLATE_KEY, id)
  } catch {
    // localStorage off → fail silent, chat will just open empty
  }
  // Existing flow: setting #chat triggers the auth gate (or opens the chat if authed)
  window.location.hash = '#chat'
}

export function TemplateGallery() {
  return (
    <section
      id="templates"
      className="border-y border-black/[0.05] bg-[#faf9f6] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1a1714]/55">
            Templates
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.025em] text-[#1a1714] sm:text-5xl">
            Such dir einen Stil aus.
          </h2>
          <p className="mt-5 text-balance text-base text-[#1a1714]/65 sm:text-lg">
            Klick auf eine Vorlage — Romy übernimmt das Layout und füllt es im Chat mit deinen Inhalten und Bildern.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {SITE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template.id)}
              className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-3 text-left shadow-[0_2px_8px_-4px_rgba(26,23,20,0.06),0_18px_40px_-22px_rgba(26,23,20,0.18)] transition duration-300 hover:-translate-y-1 hover:border-black/[0.12] hover:shadow-[0_4px_12px_-4px_rgba(26,23,20,0.08),0_32px_60px_-22px_rgba(26,23,20,0.24)]"
              aria-label={`Template ${template.name} auswählen`}
            >
              <TemplatePreview template={template} />
              <div className="px-3 pb-3 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-[#1a1714]">
                    {template.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1a1714]/45 transition group-hover:text-[#1a1714]">
                    Auswählen
                    <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-[#1a1714]/60">
                  {template.tagline}
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#1a1714]/40">
                  {template.fitFor}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function isDarkColor(hex: string): boolean {
  const m = hex.match(/^#?([0-9a-f]{6})$/i)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  // Perceived luminance — anything below ~0.55 reads as dark
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.55
}

function withAlpha(hex: string, alpha: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

function contrastOn(hex: string): string {
  return isDarkColor(hex) ? '#fbfaf6' : '#1a1714'
}
