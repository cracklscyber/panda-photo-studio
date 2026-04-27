import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthed } from '@/lib/admin-auth'
import { setPaid, resetQuota } from '@/lib/romy-sites'

const FREE_LIMIT = 4

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  const [convoRes, siteRes, buildsRes] = await Promise.all([
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
  ])

  const messages =
    (Array.isArray(convoRes.data?.messages)
      ? (convoRes.data.messages as ChatMessage[])
      : []) || []
  const site = (siteRes.data as SiteRow | null) || null
  const builds: BuildLogRow[] = (buildsRes.data as BuildLogRow[]) || []
  const totalCost = builds.reduce((s, b) => s + (b.cost_usd || 0), 0)

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              ← Übersicht
            </Link>
            <div className="h-4 w-px bg-neutral-200" />
            <div>
              <h1 className="text-base font-semibold">
                {site?.business_name || phone}
              </h1>
              <p className="font-mono text-xs text-neutral-500">{phone}</p>
            </div>
          </div>
          {site?.slug && (
            <a
              href={`https://${site.slug}.halloromy.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
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
            {messages.map((m, i) => (
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
                  {m.role === 'user' ? 'User' : 'Romy'}
                </div>
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
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
            <p className="mb-3 text-sm">
              Total Cost:{' '}
              <span className="font-medium">${totalCost.toFixed(3)}</span>
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
