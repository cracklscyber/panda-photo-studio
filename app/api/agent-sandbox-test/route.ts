import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from '@vercel/sandbox'

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
  const debug = req.nextUrl.searchParams.get('debug') === '1'

  if (debug) {
    const envKeys = Object.keys(process.env).filter(k => k.startsWith('VERCEL_') || k === 'VERCEL')
    const envInfo: Record<string, unknown> = {}
    for (const k of envKeys) {
      const v = process.env[k] || ''
      envInfo[k] = { length: v.length, prefix: v.slice(0, 12) }
    }
    return NextResponse.json({ env: envInfo })
  }

  const t0 = Date.now()
  const log: Array<{ step: string; ms: number; detail?: unknown }> = []
  const mark = (step: string, detail?: unknown) => log.push({ step, ms: Date.now() - t0, detail })
  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  let sandbox: Sandbox | null = null
  try {
    mark('start', { message, reqId })

    // Cache-bust: Vercel Sandbox SDK marks methods with "use step", which gets
    // step-cached by the Workflow runtime when inputs are identical. Vary inputs
    // per request via REQ_ID so every call produces a fresh sandbox.
    sandbox = await Sandbox.create({
      teamId: process.env.VERCEL_TEAM_ID!,
      projectId: process.env.VERCEL_PROJECT_ID!,
      token: process.env.VERCEL_TOKEN!,
      timeout: 120_000,
      env: { REQ_ID: reqId },
    })
    mark('sandbox_created', { id: sandbox.sandboxId })

    const install = await sandbox.runCommand({
      cmd: 'sh',
      args: [
        '-c',
        `echo "req=${reqId}" >/dev/null; cd /tmp && npm init -y >/dev/null 2>&1 && npm install @anthropic-ai/claude-agent-sdk 2>&1 | tail -3`,
      ],
    })
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
    await sandbox.writeFiles([
      { path: '/tmp/agent.mjs', content: Buffer.from(agentScript) },
    ])
    mark('script_written')

    // Forward the key under multiple env names; whichever Claude Code
    // recognises for this token format (sk-ant-oat01-... is an OAuth token,
    // sk-ant-api03-... is a regular API key) will pick it up.
    const apiKey = process.env.ANTHROPIC_API_KEY!
    const run = await sandbox.runCommand({
      cmd: 'node',
      args: ['/tmp/agent.mjs'],
      cwd: '/tmp',
      env: {
        ANTHROPIC_API_KEY: apiKey,
        CLAUDE_CODE_OAUTH_TOKEN: apiKey,
        ANTHROPIC_AUTH_TOKEN: apiKey,
      },
    })
    const stdout = await run.stdout()
    const stderr = await run.stderr()
    mark('agent_run', { exitCode: run.exitCode })

    let parsed: unknown = null
    const marker = stdout.indexOf('__ROMY_RESULT__')
    if (marker >= 0) {
      try {
        parsed = JSON.parse(stdout.slice(marker + '__ROMY_RESULT__'.length).trim())
      } catch {}
    }

    return NextResponse.json({
      ok: run.exitCode === 0,
      message,
      duration_ms: Date.now() - t0,
      response: parsed,
      log,
      debug: {
        stdout_tail: stdout.slice(-1500),
        stderr_tail: stderr.slice(-800),
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
      try { await sandbox.stop() } catch {}
    }
  }
}
