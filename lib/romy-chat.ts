import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _sb: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
    )
  }
  return _sb
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_STORED = 30

export async function loadHistory(phone: string): Promise<ChatMessage[]> {
  const { data } = await sb()
    .from('romy_conversations')
    .select('messages')
    .eq('phone', phone)
    .maybeSingle()
  const raw = (data?.messages || []) as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === 'object' &&
        (m as { role?: unknown }).role !== undefined &&
        typeof (m as { content?: unknown }).content === 'string'
    )
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
}

export async function appendTurn(
  phone: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  const prior = await loadHistory(phone)
  const next = [
    ...prior,
    { role: 'user' as const, content: userMessage },
    { role: 'assistant' as const, content: assistantReply },
  ].slice(-MAX_STORED)

  await sb()
    .from('romy_conversations')
    .upsert(
      {
        phone,
        messages: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone' }
    )
}

export async function appendAssistantOnly(
  phone: string,
  assistantReply: string
): Promise<void> {
  const prior = await loadHistory(phone)
  const next = [
    ...prior,
    { role: 'assistant' as const, content: assistantReply },
  ].slice(-MAX_STORED)

  await sb()
    .from('romy_conversations')
    .upsert(
      {
        phone,
        messages: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone' }
    )
}

export async function resetHistory(
  phone: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  await sb()
    .from('romy_conversations')
    .upsert(
      {
        phone,
        messages: [
          { role: 'user' as const, content: userMessage },
          { role: 'assistant' as const, content: assistantReply },
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone' }
    )
}
