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
}

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

  const [convosRes, sitesRes, buildsRes] = await Promise.all([
    sb
      .from('romy_conversations')
      .select('phone, messages, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
    sb.from('romy_sites').select('phone, slug, business_name'),
    sb.from('romy_build_logs').select('phone, cost_usd, ok'),
  ])

  const convos: ConvoRow[] = (convosRes.data as ConvoRow[]) || []
  const sites: SiteRow[] = (sitesRes.data as SiteRow[]) || []
  const builds: BuildLogRow[] = (buildsRes.data as BuildLogRow[]) || []

  const siteByPhone = new Map(sites.map((s) => [s.phone, s]))
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
      const cost = costByPhone.get(c.phone) || { total: 0, count: 0 }
      return {
        phone: c.phone,
        updated_at: c.updated_at,
        last,
        messageCount: messages.length,
        site,
        cost,
        live: isLive(c.updated_at),
      }
    })

  const liveCount = rows.filter((r) => r.live).length

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
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">Geschäft</th>
                  <th className="px-4 py-3 font-medium">Letzte Nachricht</th>
                  <th className="px-4 py-3 font-medium">Aktiv</th>
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
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        href={`/admin/${encodeURIComponent(r.phone)}`}
                        className="block"
                      >
                        <span
                          className={`mr-1 text-xs font-medium ${r.last?.role === 'user' ? 'text-blue-600' : 'text-neutral-500'}`}
                        >
                          {r.last?.role === 'user' ? 'User:' : 'Romy:'}
                        </span>
                        <span className="truncate text-neutral-700">
                          {r.last?.content?.slice(0, 80) || '—'}
                          {(r.last?.content?.length || 0) > 80 ? '…' : ''}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      <Link href={`/admin/${encodeURIComponent(r.phone)}`}>
                        {formatRelative(r.updated_at)}
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
