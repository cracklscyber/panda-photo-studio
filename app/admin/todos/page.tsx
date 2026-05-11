import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthed } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

interface TodoRow {
  id: number
  title: string
  description: string | null
  done: boolean
  sort_order: number
  created_at: string
  completed_at: string | null
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  )
}

async function addTodo(formData: FormData) {
  'use server'
  if (!(await isAdminAuthed())) redirect('/admin')
  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim() || null
  if (!title) redirect('/admin/todos')
  const { data: maxRow } = await sb()
    .from('romy_todos')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = ((maxRow?.sort_order as number | undefined) ?? 0) + 10
  await sb()
    .from('romy_todos')
    .insert({ title, description, sort_order: nextOrder })
  redirect('/admin/todos')
}

async function toggleTodo(formData: FormData) {
  'use server'
  if (!(await isAdminAuthed())) redirect('/admin')
  const id = Number(formData.get('id') || 0)
  const done = String(formData.get('done') || '') === '1'
  await sb()
    .from('romy_todos')
    .update({
      done: !done,
      completed_at: !done ? new Date().toISOString() : null,
    })
    .eq('id', id)
  redirect('/admin/todos')
}

async function deleteTodo(formData: FormData) {
  'use server'
  if (!(await isAdminAuthed())) redirect('/admin')
  const id = Number(formData.get('id') || 0)
  await sb().from('romy_todos').delete().eq('id', id)
  redirect('/admin/todos')
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'gerade eben'
  if (ms < 3_600_000) return `vor ${Math.floor(ms / 60_000)} Min`
  if (ms < 86_400_000) return `vor ${Math.floor(ms / 3_600_000)} Std`
  return `vor ${Math.floor(ms / 86_400_000)} Tagen`
}

export default async function AdminTodosPage() {
  if (!(await isAdminAuthed())) redirect('/admin')

  const { data } = await sb()
    .from('romy_todos')
    .select('*')
    .order('done', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const todos = (data as TodoRow[]) || []
  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)
  const total = todos.length
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100)

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Meine Todos</h1>
            <p className="text-xs text-neutral-400">
              {open.length} offen · {done.length} erledigt
              {total > 0 && <> · {pct}%</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
            >
              ← Admin
            </Link>
          </div>
        </div>
        {total > 0 && (
          <div className="h-1 w-full bg-neutral-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form
          action={addTodo}
          className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <input
            name="title"
            required
            placeholder="Neue Aufgabe…"
            className="w-full bg-transparent text-sm font-medium text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            autoComplete="off"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Details (optional)"
            className="mt-2 w-full resize-none bg-transparent text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white"
            >
              Hinzufügen
            </button>
          </div>
        </form>

        {open.length === 0 && done.length === 0 ? (
          <p className="text-sm text-neutral-500">Noch keine Todos. Leg los.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {open.map((t) => (
                <li
                  key={t.id}
                  className="group rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 transition hover:border-neutral-700"
                >
                  <div className="flex items-start gap-3">
                    <form action={toggleTodo} className="pt-0.5">
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="done" value="0" />
                      <button
                        type="submit"
                        aria-label="Erledigt markieren"
                        className="h-5 w-5 rounded-md border border-neutral-600 transition hover:border-emerald-500 hover:bg-emerald-500/10"
                      />
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-100">
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">
                          {t.description}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-neutral-600">
                        erstellt {formatRelative(t.created_at)}
                      </p>
                    </div>
                    <form action={deleteTodo}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        aria-label="Löschen"
                        className="rounded-md px-2 py-1 text-xs text-neutral-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            {done.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Erledigt ({done.length})
                </h2>
                <ul className="space-y-2">
                  {done.map((t) => (
                    <li
                      key={t.id}
                      className="group rounded-xl border border-neutral-800/60 bg-neutral-900/40 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <form action={toggleTodo} className="pt-0.5">
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="done" value="1" />
                          <button
                            type="submit"
                            aria-label="Wieder öffnen"
                            className="flex h-5 w-5 items-center justify-center rounded-md border border-emerald-600/60 bg-emerald-500/20 text-[11px] text-emerald-400"
                          >
                            ✓
                          </button>
                        </form>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-500 line-through">
                            {t.title}
                          </p>
                          {t.completed_at && (
                            <p className="mt-1 text-[11px] text-neutral-600">
                              erledigt {formatRelative(t.completed_at)}
                            </p>
                          )}
                        </div>
                        <form action={deleteTodo}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            aria-label="Löschen"
                            className="rounded-md px-2 py-1 text-xs text-neutral-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
