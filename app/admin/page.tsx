import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  isAdminAuthed,
  setAdminCookie,
  clearAdminCookie,
  verifyPassword,
} from '@/lib/admin-auth'
import { displayPerson, countGeneratedImages } from '@/lib/admin-display'

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ConvoRow {
  phone: string
  messages: ChatMessage[] | unknown
  updated_at: string
}

interface SiteRow {
  phone: string
  slug: string
  business_name: string | null
  builds_used: number | null
  paid: boolean | null
  callback_requested_at: string | null
}

interface CustomerRow {
  session_id: string
  email: string | null
  name: string | null
  provider: string | null
  auth_user_id: string | null
  first_build_at: string | null
  stripe_customer_id: string | null
}

const FREE_LIMIT = 4

interface BuildLogRow {
  phone: string
  cost_usd: number | null
  ok: boolean
}

async function login(formData: FormData) {
  'use server'
  const password = String(formData.get('password') || '')
  if (!verifyPassword(password)) {
    redirect('/admin?e=1')
  }
  await setAdminCookie()
  redirect('/admin')
}

async function logout() {
  'use server'
  await clearAdminCookie()
  redirect('/admin')
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'gerade eben'
  if (ms < 3_600_000) return `vor ${Math.floor(ms / 60_000)} Min`
  if (ms < 86_400_000) return `vor ${Math.floor(ms / 3_600_000)} Std`
  return `vor ${Math.floor(ms / 86_400_000)} Tagen`
}

function isLive(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 5 * 60_000
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>
}) {
  const sp = await searchParams
  const authed = await isAdminAuthed()

  if (!authed) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f5efe2] text-[#1a1714]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 10%, rgba(33,230,107,0.18), transparent 45%), radial-gradient(circle at 80% 90%, rgba(26,23,20,0.10), transparent 50%)',
          }}
        />
        <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
          <form
            action={login}
            className="w-full rounded-3xl border border-[#1a1714]/8 bg-white/70 p-10 shadow-[0_24px_60px_-24px_rgba(26,23,20,0.25)] backdrop-blur-xl"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1a1714]/55">
              Romy
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-none tracking-tight">
              Admin
            </h1>
            <p className="mt-4 text-sm text-[#1a1714]/60">
              Passwort eingeben, um fortzufahren.
            </p>
            <input
              name="password"
              type="password"
              autoFocus
              placeholder="Passwort"
              className="mt-7 w-full rounded-xl border border-[#1a1714]/15 bg-white/80 px-4 py-3 text-sm text-[#1a1714] placeholder:text-[#1a1714]/40 focus:border-[#1a1714] focus:outline-none focus:ring-2 focus:ring-[#1a1714]/10"
            />
            <button
              type="submit"
              className="mt-3 w-full rounded-xl bg-[#1a1714] px-4 py-3 text-sm font-semibold text-[#f5efe2] shadow-[0_8px_24px_-12px_rgba(26,23,20,0.5)] transition hover:bg-[#2a2522]"
            >
              Anmelden
            </button>
            {sp.e && (
              <p className="mt-4 text-xs text-red-600">Falsches Passwort.</p>
            )}
          </form>
        </div>
      </main>
    )
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )

  const [convosRes, sitesRes, buildsRes, customersRes] = await Promise.all([
    sb
      .from('romy_conversations')
      .select('phone, messages, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
    sb
      .from('romy_sites')
      .select(
        'phone, slug, business_name, builds_used, paid, callback_requested_at'
      ),
    sb.from('romy_build_logs').select('phone, cost_usd, ok'),
    sb
      .from('romy_customers')
      .select(
        'session_id, email, name, provider, auth_user_id, first_build_at, stripe_customer_id'
      ),
  ])

  const convos: ConvoRow[] = (convosRes.data as ConvoRow[]) || []
  const sites: SiteRow[] = (sitesRes.data as SiteRow[]) || []
  const builds: BuildLogRow[] = (buildsRes.data as BuildLogRow[]) || []
  const customers: CustomerRow[] = (customersRes.data as CustomerRow[]) || []

  const siteByPhone = new Map(sites.map((s) => [s.phone, s]))
  const customerBySession = new Map(customers.map((c) => [c.session_id, c]))
  const costByPhone = new Map<string, { total: number; count: number }>()
  for (const b of builds) {
    const cur = costByPhone.get(b.phone) || { total: 0, count: 0 }
    cur.total += b.cost_usd || 0
    cur.count += 1
    costByPhone.set(b.phone, cur)
  }

  const anonymousNumberByPhone = new Map<string, number>()
  const numberingOrder = convos
    .filter((c) => c.phone && c.phone !== '__hook__')
    .map((c) => ({
      phone: c.phone,
      seenAt: c.updated_at,
    }))
    .sort(
      (a, b) => new Date(a.seenAt).getTime() - new Date(b.seenAt).getTime()
    )
  let nextNumber = 1
  for (const entry of numberingOrder) {
    const cust = customerBySession.get(entry.phone)
    const hasIdentity = !!(cust?.name?.trim() || cust?.email?.trim())
    const looksLikePhone = /^\+?\d{6,}$/.test(entry.phone.replace(/^web:/, ''))
    if (hasIdentity || looksLikePhone) continue
    anonymousNumberByPhone.set(entry.phone, nextNumber++)
  }

  const rows = convos
    .filter((c) => c.phone && c.phone !== '__hook__')
    .map((c) => {
      const messages = (Array.isArray(c.messages) ? c.messages : []) as ChatMessage[]
      const last = messages[messages.length - 1]
      const site = siteByPhone.get(c.phone)
      const customer = customerBySession.get(c.phone)
      const cost = costByPhone.get(c.phone) || { total: 0, count: 0 }
      const images = countGeneratedImages(messages)
      const person = displayPerson({
        phone: c.phone,
        customerName: customer?.name,
        customerEmail: customer?.email,
        anonymousNumber: anonymousNumberByPhone.get(c.phone) ?? null,
      })
      return {
        phone: c.phone,
        updated_at: c.updated_at,
        last,
        messageCount: messages.length,
        site,
        customer,
        cost,
        images,
        person,
        live: isLive(c.updated_at),
      }
    })

  const liveCount = rows.filter((r) => r.live).length
  const callbackPendingCount = rows.filter(
    (r) => r.site?.callback_requested_at && !r.site?.paid
  ).length
  const totalImages = rows.reduce((s, r) => s + r.images.total, 0)
  const totalBuilds = rows.reduce((s, r) => s + r.cost.count, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost.total, 0)
  const registeredCount = rows.filter((r) => r.customer?.auth_user_id).length

  rows.sort((a, b) => {
    const aPending = a.site?.callback_requested_at && !a.site?.paid ? 1 : 0
    const bPending = b.site?.callback_requested_at && !b.site?.paid ? 1 : 0
    if (aPending !== bPending) return bPending - aPending
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return (
    <main className="relative min-h-screen bg-[#f5efe2] text-[#1a1714]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 15% 0%, rgba(33,230,107,0.14), transparent 55%), radial-gradient(ellipse at 85% 0%, rgba(26,23,20,0.06), transparent 60%)',
        }}
      />

      <header className="relative">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1a1714]/55">
              Romy
            </p>
            <span className="h-px w-8 bg-[#1a1714]/20" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#1a1714]/55">
              Admin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/todos"
              className="rounded-full border border-[#1a1714]/12 bg-white/60 px-4 py-1.5 text-xs font-medium text-[#1a1714]/75 backdrop-blur transition hover:border-[#1a1714]/25 hover:bg-white"
            >
              Todos
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-[#1a1714]/12 bg-white/60 px-4 py-1.5 text-xs font-medium text-[#1a1714]/75 backdrop-blur transition hover:border-[#1a1714]/25 hover:bg-white"
            >
              Aktualisieren
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-[#1a1714]/12 bg-white/60 px-4 py-1.5 text-xs font-medium text-[#1a1714]/75 backdrop-blur transition hover:border-[#1a1714]/25 hover:bg-white"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 pt-10">
          <h1 className="font-[family-name:var(--font-display)] text-[44px] font-medium leading-[1.05] tracking-[-0.015em] sm:text-[56px]">
            Heute auf Romy.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#1a1714]/65">
            {rows.length} Gespräch{rows.length === 1 ? '' : 'e'} in den letzten
            Tagen, {liveCount > 0 ? `${liveCount} gerade aktiv` : 'aktuell ruhig'}
            {callbackPendingCount > 0
              ? `, ${callbackPendingCount} ${callbackPendingCount === 1 ? 'Anruf wartet' : 'Anrufe warten'}`
              : ''}
            .
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-3 px-6 sm:grid-cols-4">
          <StatCard label="Gespräche" value={rows.length} hint={`${registeredCount} mit Konto`} />
          <StatCard
            label="Jetzt aktiv"
            value={liveCount}
            hint="letzte 5 Min"
            accent={liveCount > 0 ? '#21a356' : undefined}
          />
          <StatCard
            label="Bilder generiert"
            value={totalImages}
            hint="Drafts + Bestätigt"
          />
          <StatCard
            label="Site-Builds"
            value={totalBuilds}
            hint={`$${totalCost.toFixed(2)} gesamt`}
          />
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium tracking-tight">
            Konversationen
          </h2>
          {callbackPendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1714] px-3 py-1 text-[11px] font-medium text-[#f5efe2]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffb648]" />
              {callbackPendingCount} {callbackPendingCount === 1 ? 'Anruf wartet' : 'Anrufe warten'}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1a1714]/15 bg-white/40 px-6 py-16 text-center text-sm text-[#1a1714]/60">
            Noch keine Konversationen.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#1a1714]/8 bg-white shadow-[0_24px_60px_-30px_rgba(26,23,20,0.18)]">
            <div className="grid grid-cols-[16px_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,2fr)_auto] gap-x-6 border-b border-[#1a1714]/8 bg-[#faf6ec] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a1714]/45">
              <span />
              <span>Person</span>
              <span>Geschäft</span>
              <span>Letzte Nachricht</span>
              <span className="text-right">Aktivität</span>
            </div>
            <ul className="divide-y divide-[#1a1714]/6">
              {rows.map((r) => {
                const pending =
                  r.site?.callback_requested_at && !r.site?.paid
                return (
                  <li key={r.phone}>
                    <Link
                      href={`/admin/${encodeURIComponent(r.phone)}`}
                      className="group grid grid-cols-[16px_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,2fr)_auto] items-center gap-x-6 px-6 py-4 transition hover:bg-[#faf6ec]/60"
                    >
                      <span className="flex h-4 items-center">
                        {r.live ? (
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inset-0 animate-ping rounded-full bg-[#21e66b] opacity-60" />
                            <span className="relative h-2 w-2 rounded-full bg-[#21a356]" />
                          </span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1a1714]/15" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`truncate text-[15px] font-medium ${r.person.isAnonymous ? 'text-[#1a1714]/85' : 'text-[#1a1714]'}`}
                          >
                            {r.person.primary}
                          </span>
                          {r.person.secondary && !r.person.isAnonymous && (
                            <span className="truncate text-[12px] text-[#1a1714]/45">
                              {r.person.secondary}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[#1a1714]/55">
                          {r.customer?.auth_user_id ? (
                            <span className="inline-flex items-center gap-1 text-[#21a356]">
                              <span className="h-1 w-1 rounded-full bg-[#21a356]" />
                              Konto
                            </span>
                          ) : r.customer?.first_build_at ? (
                            <span className="inline-flex items-center gap-1 text-[#b58200]">
                              <span className="h-1 w-1 rounded-full bg-[#d69c1e]" />
                              Konto fehlt
                            </span>
                          ) : r.person.isWhatsapp ? (
                            <span className="text-[#1a1714]/45">WhatsApp</span>
                          ) : (
                            <span className="text-[#1a1714]/45">Anonym</span>
                          )}
                          <span className="text-[#1a1714]/20">·</span>
                          <span>{r.messageCount} Nachrichten</span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        {r.site?.business_name ? (
                          <>
                            <div className="truncate text-[14px] font-medium text-[#1a1714]">
                              {r.site.business_name}
                            </div>
                            {r.site?.slug && (
                              <div className="truncate font-mono text-[11px] text-[#1a1714]/45">
                                {r.site.slug}.halloromy.com
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[13px] text-[#1a1714]/35">
                            noch ohne Geschäft
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`shrink-0 text-[11px] font-semibold uppercase tracking-wider ${r.last?.role === 'user' ? 'text-[#1a1714]/80' : 'text-[#21a356]'}`}
                          >
                            {r.last?.role === 'user' ? 'User' : 'Romy'}
                          </span>
                          <span className="truncate text-[13px] text-[#1a1714]/70">
                            {cleanPreview(r.last?.content) || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[13px] font-medium tabular-nums text-[#1a1714]/80">
                            {formatRelative(r.updated_at)}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#1a1714]/50">
                            {r.images.total > 0 && (
                              <Pill>
                                <ImageIcon /> {r.images.total}
                              </Pill>
                            )}
                            {r.cost.count > 0 && (
                              <Pill>{r.cost.count} Build{r.cost.count === 1 ? '' : 's'}</Pill>
                            )}
                            {pending ? (
                              <Pill tone="warn">Anruf offen</Pill>
                            ) : r.site?.paid ? (
                              <Pill tone="ok">Paid</Pill>
                            ) : (
                              <Pill>
                                {r.site?.builds_used ?? 0}/{FREE_LIMIT}
                              </Pill>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </main>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number | string
  hint?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-[#1a1714]/8 bg-white/70 px-5 py-4 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a1714]/45">
        {label}
      </div>
      <div
        className="mt-2 font-[family-name:var(--font-display)] text-[34px] font-medium leading-none tracking-tight tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11px] text-[#1a1714]/50">{hint}</div>
      )}
    </div>
  )
}

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'ok' | 'warn'
}) {
  const styles =
    tone === 'ok'
      ? 'bg-[#21a356]/10 text-[#21a356]'
      : tone === 'warn'
        ? 'bg-[#ffb648]/15 text-[#b58200]'
        : 'bg-[#1a1714]/[0.06] text-[#1a1714]/65'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${styles}`}
    >
      {children}
    </span>
  )
}

function ImageIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  )
}

function cleanPreview(content: string | undefined): string {
  if (!content) return ''
  return content
    .replace(/\[ROMY_(?:USER_IMAGE|IMAGE_DRAFT|IMAGE_CONFIRMED):[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
