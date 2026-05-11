import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  isAdminAuthed,
  setAdminCookie,
  clearAdminCookie,
  verifyPassword,
} from '@/lib/admin-auth'

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
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
        <form
          action={login}
          className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
        >
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Romy Admin</h1>
          <p className="mb-6 text-sm text-neutral-500">Passwort eingeben.</p>
          <input
            name="password"
            type="password"
            autoFocus
            placeholder="Passwort"
            className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Login
          </button>
          {sp.e && (
            <p className="mt-3 text-xs text-red-600">Falsches Passwort.</p>
          )}
        </form>
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

  const rows = convos
    .filter((c) => c.phone && c.phone !== '__hook__')
    .map((c) => {
      const messages = (Array.isArray(c.messages) ? c.messages : []) as ChatMessage[]
      const last = messages[messages.length - 1]
      const site = siteByPhone.get(c.phone)
      const customer = customerBySession.get(c.phone)
      const cost = costByPhone.get(c.phone) || { total: 0, count: 0 }
      return {
        phone: c.phone,
        updated_at: c.updated_at,
        last,
        messageCount: messages.length,
        site,
        customer,
        cost,
        live: isLive(c.updated_at),
      }
    })

  const liveCount = rows.filter((r) => r.live).length
  const callbackPendingCount = rows.filter(
    (r) => r.site?.callback_requested_at && !r.site?.paid
  ).length

  rows.sort((a, b) => {
    const aPending = a.site?.callback_requested_at && !a.site?.paid ? 1 : 0
    const bPending = b.site?.callback_requested_at && !b.site?.paid ? 1 : 0
    if (aPending !== bPending) return bPending - aPending
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Romy Admin</h1>
            <p className="text-xs text-neutral-500">
              {rows.length} Konversation{rows.length === 1 ? '' : 'en'} •{' '}
              <span className="font-medium text-emerald-600">
                {liveCount} aktiv jetzt
              </span>
              {callbackPendingCount > 0 && (
                <>
                  {' '}
                  •{' '}
                  <span className="font-medium text-orange-600">
                    {callbackPendingCount} Anruf offen
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/todos"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Todos
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Aktualisieren
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Noch keine Konversationen.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Kunde</th>
                  <th className="px-4 py-3 font-medium">Geschäft</th>
                  <th className="px-4 py-3 font-medium">Letzte Nachricht</th>
                  <th className="px-4 py-3 font-medium">Aktiv</th>
                  <th className="px-4 py-3 font-medium">Quota</th>
                  <th className="px-4 py-3 font-medium text-right">Msgs</th>
                  <th className="px-4 py-3 font-medium text-right">Builds</th>
                  <th className="px-4 py-3 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr
                    key={r.phone}
                    className="cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="block"
                      >
                        {r.live ? (
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="inline-flex h-2 w-2 rounded-full bg-neutral-300" />
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="block hover:text-neutral-900"
                      >
                        {r.phone}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="block"
                      >
                        <span className="block truncate font-medium">
                          {r.customer?.name || r.customer?.email || '—'}
                        </span>
                        {r.customer?.email && (
                          <span className="block truncate text-xs text-neutral-500">
                            {r.customer.email}
                          </span>
                        )}
                        {r.customer?.auth_user_id ? (
                          <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                            Konto
                          </span>
                        ) : r.customer?.first_build_at ? (
                          <span className="mt-1 inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] text-yellow-700">
                            Konto fehlt
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="block"
                      >
                        {r.site?.business_name ? (
                          <span className="font-medium">
                            {r.site.business_name}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                        {r.site?.slug && (
                          <span className="ml-2 text-xs text-neutral-400">
                            {r.site.slug}.halloromy.com
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="flex max-w-[280px] items-baseline gap-1"
                      >
                        <span
                          className={`shrink-0 text-xs font-medium ${r.last?.role === 'user' ? 'text-blue-600' : 'text-neutral-500'}`}
                        >
                          {r.last?.role === 'user' ? 'User:' : 'Romy:'}
                        </span>
                        <span className="truncate text-neutral-700">
                          {r.last?.content || '—'}
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">
                      <Link href={`/admin/${encodeURIComponent(r.phone)}`}>
                        {formatRelative(r.updated_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="block"
                      >
                        {r.site?.paid ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                            Paid
                          </span>
                        ) : r.site?.callback_requested_at ? (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                            Anruf offen
                          </span>
                        ) : (
                          <span className="text-neutral-500">
                            {r.site?.builds_used ?? 0}/{FREE_LIMIT}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-neutral-600">
                      {r.messageCount}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-neutral-600">
                      {r.cost.count}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-neutral-600">
                      ${r.cost.total.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
