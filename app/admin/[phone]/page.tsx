import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthed } from '@/lib/admin-auth'
import { setPaid, resetQuota } from '@/lib/romy-sites'
import { displayPerson, countGeneratedImages } from '@/lib/admin-display'

const FREE_LIMIT = 4

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function parseChatContent(content: string): {
  text: string
  imageUrls: string[]
  siteUrl?: string
} {
  // Bild-Marker (User-Upload, Draft, Confirmed) extrahieren — wie zuvor.
  const imageMarkerRe = /\[ROMY_(?:USER_IMAGE|IMAGE_DRAFT|IMAGE_CONFIRMED):([^\]]+)\]/g
  const urls: string[] = []
  let text = content.replace(imageMarkerRe, (_match, url: string) => {
    urls.push(url)
    return ''
  })
  const unique = Array.from(new Set(urls))
  for (const url of unique) {
    const urlEsc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`\\s*${urlEsc}\\s*`, 'g'), ' ')
  }

  // Site-Link extrahieren — exakt dieselbe Logik wie im Website-Chat
  // (components/website-chat.tsx parseAssistantMessage), damit der Admin
  // genau dasselbe sieht wie der User: Button bei Match, roher Link bei Fehler.
  let siteUrl: string | undefined
  const siteMarkerRe = /\[ROMY_SITE:([^\]]+)\]/
  const siteMarkerMatch = text.match(siteMarkerRe)
  if (siteMarkerMatch) {
    siteUrl = siteMarkerMatch[1]
    text = text.replace(siteMarkerRe, '').trim()
  } else {
    const siteUrlRe = /https?:\/\/(?:[a-z0-9-]+\.)?halloluna\.net\/(?:site\/)?[a-z0-9-]+/i
    const m = text.match(siteUrlRe)
    if (m) {
      siteUrl = m[0]
      text = text.replace(m[0], '').trim()
    }
  }

  // Quick-Reply-Marker im Admin nicht anzeigen
  text = text.replace(/\[ROMY_QUICK_REPLIES:[^\]]+\]/g, '').trim()

  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return { text, imageUrls: unique, siteUrl }
}

interface SiteRow {
  phone: string
  slug: string
  business_name: string | null
  last_sandbox_id: string | null
  custom_domain: string | null
  builds_used: number | null
  paid: boolean | null
  callback_requested_at: string | null
  created_at: string
  updated_at: string
}

interface BuildLogRow {
  ok: boolean
  cost_usd: number | null
  duration_ms: number | null
  was_warm: boolean | null
  user_message: string | null
  created_at?: string
}

interface CustomerRow {
  session_id: string
  email: string | null
  name: string | null
  provider: string | null
  auth_user_id: string | null
  first_build_at: string | null
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'gerade eben'
  if (ms < 3_600_000) return `vor ${Math.floor(ms / 60_000)} Min`
  if (ms < 86_400_000) return `vor ${Math.floor(ms / 3_600_000)} Std`
  return `vor ${Math.floor(ms / 86_400_000)} Tagen`
}

async function togglePaid(formData: FormData) {
  'use server'
  const phone = String(formData.get('phone') || '')
  const next = formData.get('next') === '1'
  if (!(await isAdminAuthed()) || !phone) return
  await setPaid(phone, next)
  revalidatePath(`/admin/${encodeURIComponent(phone)}`)
  revalidatePath('/admin')
}

async function resetQuotaAction(formData: FormData) {
  'use server'
  const phone = String(formData.get('phone') || '')
  if (!(await isAdminAuthed()) || !phone) return
  await resetQuota(phone)
  revalidatePath(`/admin/${encodeURIComponent(phone)}`)
  revalidatePath('/admin')
}

export default async function ConvoPage({
  params,
}: {
  params: Promise<{ phone: string }>
}) {
  const authed = await isAdminAuthed()
  if (!authed) redirect('/admin')

  const { phone: encodedPhone } = await params
  const phone = decodeURIComponent(encodedPhone)

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )

  const [convoRes, siteRes, buildsRes, customerRes, allConvosRes, allCustomersRes] =
    await Promise.all([
      sb
        .from('romy_conversations')
        .select('phone, messages, updated_at')
        .eq('phone', phone)
        .maybeSingle(),
      sb.from('romy_sites').select('*').eq('phone', phone).maybeSingle(),
      sb
        .from('romy_build_logs')
        .select('ok, cost_usd, duration_ms, was_warm, user_message, created_at')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(20),
      sb.from('romy_customers').select('*').eq('session_id', phone).maybeSingle(),
      sb
        .from('romy_conversations')
        .select('phone, updated_at')
        .order('updated_at', { ascending: false })
        .limit(500),
      sb.from('romy_customers').select('session_id, name, email'),
    ])

  const messages =
    (Array.isArray(convoRes.data?.messages)
      ? (convoRes.data.messages as ChatMessage[])
      : []) || []
  const site = (siteRes.data as SiteRow | null) || null
  const builds: BuildLogRow[] = (buildsRes.data as BuildLogRow[]) || []
  const customer = (customerRes.data as CustomerRow | null) || null
  const totalCost = builds.reduce((s, b) => s + (b.cost_usd || 0), 0)
  const imageStats = countGeneratedImages(messages)

  const allConvos =
    (allConvosRes.data as Array<{
      phone: string
      updated_at: string
    }> | null) || []
  const allCustomers =
    (allCustomersRes.data as Array<{
      session_id: string
      name: string | null
      email: string | null
    }> | null) || []
  const identityBySession = new Map(allCustomers.map((c) => [c.session_id, c]))
  let anonymousNumber: number | null = null
  let counter = 0
  const ordered = [...allConvos].sort(
    (a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  )
  for (const c of ordered) {
    if (!c.phone || c.phone === '__hook__') continue
    const id = identityBySession.get(c.phone)
    const hasIdentity = !!(id?.name?.trim() || id?.email?.trim())
    const looksLikePhone = /^\+?\d{6,}$/.test(c.phone.replace(/^web:/, ''))
    if (hasIdentity || looksLikePhone) continue
    counter += 1
    if (c.phone === phone) {
      anonymousNumber = counter
      break
    }
  }

  const person = displayPerson({
    phone,
    customerName: customer?.name,
    customerEmail: customer?.email,
    anonymousNumber,
  })
  const headerTitle = site?.business_name || person.primary

  return (
    <main className="min-h-screen bg-[#f5efe2] text-[#1a1714]">
      <header className="border-b border-[#1a1714]/8 bg-[#f5efe2]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-[#1a1714]/55 transition hover:text-[#1a1714]"
            >
              ← Übersicht
            </Link>
            <div className="h-5 w-px bg-[#1a1714]/15" />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-medium tracking-tight">
                {headerTitle}
              </h1>
              <p className="mt-0.5 text-xs text-[#1a1714]/50">
                {person.isAnonymous
                  ? 'Anonym — kein Konto'
                  : person.isWhatsapp
                    ? `WhatsApp · ${person.primary}`
                    : person.secondary || 'Registriert'}
              </p>
            </div>
          </div>
          {site?.slug && (
            <a
              href={`https://${site.slug}.halloluna.net`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#1a1714]/12 bg-white/70 px-4 py-1.5 text-xs font-medium text-[#1a1714]/80 transition hover:border-[#1a1714]/25 hover:bg-white"
            >
              Site öffnen ↗
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 md:grid-cols-[1fr_280px]">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Verlauf ({messages.length})
          </h2>
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-neutral-500">Keine Nachrichten.</p>
            )}
            {messages.map((m, i) => {
              const { text, imageUrls, siteUrl } = parseChatContent(m.content)
              return (
                <div
                  key={i}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    m.role === 'user'
                      ? 'ml-12 bg-blue-50 text-blue-950'
                      : 'mr-12 bg-white text-neutral-900 border border-neutral-200'
                  }`}
                >
                  <div
                    className={`mb-1 text-xs font-medium ${m.role === 'user' ? 'text-blue-600' : 'text-neutral-500'}`}
                  >
                    {m.role === 'user' ? 'User' : 'Luna'}
                  </div>
                  {imageUrls.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {imageUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Chat-Bild"
                            className="max-h-48 w-auto rounded-lg border border-neutral-200"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {text && (
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {text}
                    </div>
                  )}
                  {siteUrl && (
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
                    >
                      {siteUrl.includes('/site/') ? 'Entwurf ansehen' : 'Website ansehen'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Kunde
            </h3>
            {customer ? (
              <dl className="space-y-1.5 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Name</dt>
                  <dd>{customer.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">E-Mail</dt>
                  <dd className="break-all">{customer.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Login</dt>
                  <dd>
                    {customer.auth_user_id
                      ? `${customer.provider || 'oauth'} verbunden`
                      : 'nicht verbunden'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Erster Build</dt>
                  <dd className="text-xs">
                    {customer.first_build_at
                      ? formatRelative(customer.first_build_at)
                      : '—'}
                  </dd>
                </div>
                {customer.stripe_customer_id && (
                  <div>
                    <dt className="text-xs text-neutral-500">Stripe</dt>
                    <dd className="font-mono text-xs">verbunden</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-neutral-400">Noch kein Kunde.</p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Quota & Bezahlung
            </h3>
            <div className="mb-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Builds genutzt</span>
                <span className="font-medium">
                  {site?.builds_used ?? 0}/{FREE_LIMIT}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Status</span>
                {site?.paid ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Paid
                  </span>
                ) : site?.callback_requested_at ? (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                    Anruf offen
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">Free Tier</span>
                )}
              </div>
              {site?.callback_requested_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    Anruf angefragt
                  </span>
                  <span className="text-xs">
                    {formatRelative(site.callback_requested_at)}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <form action={togglePaid}>
                <input type="hidden" name="phone" value={phone} />
                <input
                  type="hidden"
                  name="next"
                  value={site?.paid ? '0' : '1'}
                />
                <button
                  type="submit"
                  className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium ${
                    site?.paid
                      ? 'border border-neutral-200 hover:bg-neutral-50'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {site?.paid ? 'Paid zurücksetzen' : 'Als bezahlt markieren'}
                </button>
              </form>
              <form action={resetQuotaAction}>
                <input type="hidden" name="phone" value={phone} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                >
                  Quota zurücksetzen
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Site
            </h3>
            {site ? (
              <dl className="space-y-1.5 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Slug</dt>
                  <dd className="font-mono text-xs">{site.slug}</dd>
                </div>
                {site.business_name && (
                  <div>
                    <dt className="text-xs text-neutral-500">Name</dt>
                    <dd>{site.business_name}</dd>
                  </div>
                )}
                {site.custom_domain && (
                  <div>
                    <dt className="text-xs text-neutral-500">Domain</dt>
                    <dd className="font-mono text-xs">{site.custom_domain}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-neutral-500">Angelegt</dt>
                  <dd className="text-xs">{formatRelative(site.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Sandbox warm</dt>
                  <dd className="text-xs">
                    {site.last_sandbox_id ? 'ja' : 'nein'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-neutral-400">Noch keine Site.</p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Builds ({builds.length})
            </h3>
            <p className="mb-1 text-sm">
              Total Cost:{' '}
              <span className="font-medium">${totalCost.toFixed(3)}</span>
            </p>
            <p className="mb-3 text-xs text-neutral-500">
              Bilder generiert:{' '}
              <span className="font-medium text-neutral-700">
                {imageStats.total}
              </span>
              {imageStats.total > 0 && (
                <span className="ml-1 text-neutral-400">
                  ({imageStats.drafts} Drafts, {imageStats.confirmed} bestätigt)
                </span>
              )}
            </p>
            <div className="space-y-2">
              {builds.length === 0 && (
                <p className="text-xs text-neutral-400">Keine Builds.</p>
              )}
              {builds.map((b, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-100 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        b.ok ? 'text-emerald-600' : 'text-red-600'
                      }
                    >
                      {b.ok ? '✓' : '✗'}{' '}
                      {b.was_warm ? 'warm' : 'cold'}
                    </span>
                    <span className="font-medium">
                      ${(b.cost_usd || 0).toFixed(3)}
                    </span>
                  </div>
                  {b.duration_ms != null && (
                    <div className="text-neutral-400">
                      {(b.duration_ms / 1000).toFixed(1)}s
                    </div>
                  )}
                  {b.user_message && (
                    <div className="mt-1 line-clamp-2 text-neutral-600">
                      {b.user_message.slice(0, 100)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
