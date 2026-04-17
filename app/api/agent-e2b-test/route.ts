import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ROMY_SYSTEM_PROMPT = `Du bist Romy, eine freundliche WhatsApp-Assistentin die Websites für lokale Geschäfte erstellt und verwaltet.

## Deine Persönlichkeit
- Du sprichst Deutsch, freundlich aber professionell
- Du bist hilfsbereit und proaktiv
- Halte Antworten kurz und klar (WhatsApp-Format, keine langen Texte)
- Nutze Emojis sparsam aber passend

Für diesen Test: antworte einfach natürlich auf die Nachricht des Kunden.`

export async function GET(req: NextRequest) {
  const message = req.nextUrl.searchParams.get('message') || 'Hallo Romy, wer bist du?'

  const t0 = Date.now()
  const log: Array<{ step: string; ms: number; detail?: unknown }> = []
  const mark = (step: string, detail?: unknown) => log.push({ step, ms: Date.now() - t0, detail })

  let sandbox: Sandbox | null = null
  try {
    mark('start', { message })

    const credential = process.env.ANTHROPIC_API_KEY!
    const isOAuth = credential.startsWith('sk-ant-oat')
    const agentEnvVar = isOAuth ? 'CLAUDE_CODE_OAUTH_TOKEN' : 'ANTHROPIC_API_KEY'

    sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY!,
      timeoutMs: 120_000,
      envs: { [agentEnvVar]: credential },
    })
    mark('sandbox_created', { id: sandbox.sandboxId })

    const install = await sandbox.commands.run(
      'cd /tmp && npm init -y >/dev/null 2>&1 && npm install @anthropic-ai/claude-agent-sdk 2>&1 | tail -3'
    )
    mark('npm_install', { exitCode: install.exitCode })

    const agentScript = `
import { query } from '@anthropic-ai/claude-agent-sdk'

const stream = query({
  prompt: ${JSON.stringify(message)},
  options: {
    model: 'claude-sonnet-4-6',
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    allowedTools: [],
    systemPrompt: ${JSON.stringify(ROMY_SYSTEM_PROMPT)},
  },
})

let lastAssistant = ''
let resultMsg = null
for await (const msg of stream) {
  if (msg.type === 'assistant') {
    const blocks = msg.message?.content || []
    for (const b of blocks) if (b.type === 'text' && b.text) lastAssistant = b.text
  } else if (msg.type === 'result') {
    resultMsg = msg
  }
}

console.log('__ROMY_RESULT__' + JSON.stringify({
  assistant: lastAssistant,
  result: resultMsg ? {
    subtype: resultMsg.subtype,
    is_error: resultMsg.is_error,
    api_error_status: resultMsg.api_error_status,
    duration_ms: resultMsg.duration_ms,
    total_cost_usd: resultMsg.total_cost_usd,
  } : null,
}))
`
    await sandbox.files.write('/tmp/agent.mjs', agentScript)
    mark('script_written')

    const run = await sandbox.commands.run('cd /tmp && node /tmp/agent.mjs')
    mark('agent_run', { exitCode: run.exitCode })

    let parsed: unknown = null
    const marker = run.stdout.indexOf('__ROMY_RESULT__')
    if (marker >= 0) {
      try {
        parsed = JSON.parse(run.stdout.slice(marker + '__ROMY_RESULT__'.length).trim())
      } catch {}
    }

    return NextResponse.json({
      ok: run.exitCode === 0,
      provider: 'e2b',
      message,
      duration_ms: Date.now() - t0,
      response: parsed,
      log,
      debug: {
        stdout_tail: run.stdout.slice(-1500),
        stderr_tail: run.stderr.slice(-800),
      },
    })
  } catch (err) {
    mark('error', { message: (err as Error).message })
    return NextResponse.json(
      {
        ok: false,
        error: (err as Error).message,
        duration_ms: Date.now() - t0,
        log,
      },
      { status: 500 }
    )
  } finally {
    if (sandbox) {
      try { await sandbox.kill() } catch {}
    }
  }
}
