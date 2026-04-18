import { Sandbox } from 'e2b'
import {
  listSiteFiles,
  downloadSiteFile,
  uploadSiteFile,
  sitePublicUrl,
} from './supabase-storage'

const WORKSPACE = '/home/user/workspace'

const ROMY_CODER_SYSTEM_PROMPT = `Du bist Romy, eine freundliche WhatsApp-Assistentin die Websites für lokale Geschäfte erstellt.

Du arbeitest in deinem aktuellen Arbeitsverzeichnis (cwd). Dort liegen (falls vorhanden) die aktuellen Dateien der Kundenwebsite. Du kannst sie lesen, bearbeiten oder neue Dateien schreiben mit den Tools Read, Write, Edit, Glob, Grep.

## Regeln für den Code
- Die Haupt-Einstiegsseite ist immer index.html im cwd.
- Vollständiges, in sich geschlossenes HTML (<!doctype html>, <html>, <head>, <body>).
- Bevorzugt einzelne index.html Datei. Nur wenn nötig, separate CSS/JS-Dateien daneben legen (styles.css, main.js etc.).
- Mobile-first, modernes CSS (flex/grid), keine externen Frameworks außer Google Fonts (einbinden via <link>).
- Inline <style> oder eine styles.css ist okay — keine Tailwind-CDN, kein React, kein Next.js.
- Keine relativen Pfade mit ../ — alle Assets im gleichen Ordner.
- Bilder nur als externe URLs (https://...) einbinden, keine Base64-Einbettungen.
- Deutschsprachiger Inhalt falls nicht anders gewünscht.

## Antwort an den Kunden
Nachdem du die Dateien bearbeitet hast, gib eine kurze WhatsApp-taugliche Zusammenfassung in 1-3 Sätzen auf Deutsch auf was du gemacht hast. Keine Codeblöcke, keine Markdown-Überschriften. Sparsam Emojis.

Gib deine Antwort an den Kunden als allerletzte Nachricht aus, nachdem alle Datei-Änderungen fertig sind.`

export interface RomyCoderResult {
  ok: boolean
  reply: string
  files_changed: string[]
  site_url: string
  duration_ms: number
  cost_usd: number | null
  sandbox_id: string | null
  error?: string
  error_step?: string
  stdout_tail?: string
  stderr_tail?: string
  log?: Array<{ step: string; ms: number; detail?: unknown }>
}

interface RomyCoderInput {
  slug: string
  userMessage: string
  imageUrl?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function runRomyCoder(input: RomyCoderInput): Promise<RomyCoderResult> {
  const { slug, userMessage, imageUrl, history = [] } = input
  const t0 = Date.now()

  const credential = process.env.ANTHROPIC_API_KEY || ''
  const isOAuth = credential.startsWith('sk-ant-oat')
  const agentEnvVar = isOAuth ? 'CLAUDE_CODE_OAUTH_TOKEN' : 'ANTHROPIC_API_KEY'

  let sandbox: Sandbox | null = null
  const log: Array<{ step: string; ms: number; detail?: unknown }> = []
  const mark = (step: string, detail?: unknown) => log.push({ step, ms: Date.now() - t0, detail })
  let currentStep = 'init'

  try {
    currentStep = 'sandbox_create'
    sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY!,
      timeoutMs: 5 * 60_000,
      envs: { [agentEnvVar]: credential },
    })
    mark('sandbox_created', { id: sandbox.sandboxId })

    currentStep = 'mkdir_workspace'
    const mk = await sandbox.commands.run(`mkdir -p ${WORKSPACE}`, {
      onStderr: () => {},
    })
    mark('mkdir_workspace', { exitCode: mk.exitCode })

    currentStep = 'list_existing'
    const existingFiles = await listSiteFiles(slug).catch(() => [])
    mark('existing_files', { count: existingFiles.length })

    for (const file of existingFiles) {
      currentStep = `download_${file.name}`
      const buf = await downloadSiteFile(slug, file.name)
      if (!buf) continue
      const target = `${WORKSPACE}/${file.name}`
      const dir = target.substring(0, target.lastIndexOf('/'))
      if (dir && dir !== WORKSPACE) {
        await sandbox.commands.run(`mkdir -p ${JSON.stringify(dir)}`)
      }
      const b64 = buf.toString('base64')
      await sandbox.commands.run(
        `echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(target)}`
      )
    }

    currentStep = 'npm_install'
    const install = await sandbox.commands.run(
      'cd /tmp && npm init -y >/dev/null 2>&1 && npm install @anthropic-ai/claude-agent-sdk 2>&1 | tail -5'
    )
    mark('npm_install', { exitCode: install.exitCode, tail: install.stdout.slice(-300) })
    if (install.exitCode !== 0) {
      throw new Error(`npm install failed: ${install.stderr.slice(-400)}`)
    }

    const promptParts: string[] = []
    if (history.length > 0) {
      promptParts.push('Bisheriger Gesprächsverlauf (älteste zuerst):')
      for (const h of history.slice(-10)) {
        promptParts.push(`${h.role === 'user' ? 'Kunde' : 'Romy'}: ${h.content}`)
      }
      promptParts.push('---')
    }
    promptParts.push(`Neue Nachricht vom Kunden: ${userMessage}`)
    if (imageUrl) {
      promptParts.push(`Kunde hat ein Bild mitgeschickt. URL/DataURL-Länge: ${imageUrl.length}`)
    }
    const fullPrompt = promptParts.join('\n')

    const agentScript = `
import { query } from '@anthropic-ai/claude-agent-sdk'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function listAll(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = full.slice(base.length + 1)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...listAll(full, base))
    else out.push({ path: rel, size: st.size, mtimeMs: st.mtimeMs })
  }
  return out
}

const before = new Map()
try {
  for (const f of listAll(${JSON.stringify(WORKSPACE)})) before.set(f.path, f.mtimeMs)
} catch {}

const stream = query({
  prompt: ${JSON.stringify(fullPrompt)},
  options: {
    model: 'claude-sonnet-4-6',
    maxTurns: 25,
    permissionMode: 'bypassPermissions',
    cwd: ${JSON.stringify(WORKSPACE)},
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    systemPrompt: ${JSON.stringify(ROMY_CODER_SYSTEM_PROMPT)},
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

let changed = []
try {
  const after = listAll(${JSON.stringify(WORKSPACE)})
  for (const f of after) {
    if (!before.has(f.path) || before.get(f.path) !== f.mtimeMs) changed.push(f.path)
  }
} catch {}

console.log('__ROMY_RESULT__' + JSON.stringify({
  assistant: lastAssistant,
  changed,
  result: resultMsg ? {
    subtype: resultMsg.subtype,
    is_error: resultMsg.is_error,
    api_error_status: resultMsg.api_error_status,
    duration_ms: resultMsg.duration_ms,
    total_cost_usd: resultMsg.total_cost_usd,
  } : null,
}))
`
    currentStep = 'script_write'
    await sandbox.files.write('/tmp/agent.mjs', agentScript)
    mark('script_written')

    currentStep = 'agent_run'
    type CommandResult = { exitCode: number; stdout: string; stderr: string }
    let run: CommandResult
    try {
      run = await sandbox.commands.run('cd /tmp && node /tmp/agent.mjs', {
        timeoutMs: 4 * 60_000,
      })
    } catch (e) {
      const errObj = e as { exitCode?: number; stdout?: string; stderr?: string; message?: string }
      run = {
        exitCode: errObj.exitCode ?? -1,
        stdout: errObj.stdout ?? '',
        stderr: errObj.stderr ?? errObj.message ?? String(e),
      }
    }
    mark('agent_run', {
      exitCode: run.exitCode,
      stdout_len: run.stdout.length,
      stderr_len: run.stderr.length,
      stderr_tail: run.stderr.slice(-600),
      stdout_tail: run.stdout.slice(-400),
    })

    let parsed: {
      assistant?: string
      changed?: string[]
      result?: { is_error?: boolean; total_cost_usd?: number } | null
    } = {}
    const marker = run.stdout.indexOf('__ROMY_RESULT__')
    if (marker >= 0) {
      try {
        parsed = JSON.parse(run.stdout.slice(marker + '__ROMY_RESULT__'.length).trim())
      } catch {}
    }

    const changedFiles = parsed.changed || []
    const uploaded: string[] = []
    for (const rel of changedFiles) {
      if (rel.startsWith('node_modules/') || rel.startsWith('.git/')) continue
      const readRes = await sandbox.commands.run(
        `cat ${JSON.stringify(WORKSPACE + '/' + rel)} | base64`
      )
      if (readRes.exitCode !== 0) continue
      const buf = Buffer.from(readRes.stdout.trim(), 'base64')
      await uploadSiteFile(slug, rel, buf)
      uploaded.push(rel)
    }

    const reply =
      parsed.assistant?.trim() ||
      (run.exitCode === 0
        ? 'Fertig! Schau gerne mal auf deiner Seite nach.'
        : 'Hmm, da ist etwas schiefgelaufen. Magst du es noch einmal versuchen?')

    return {
      ok: run.exitCode === 0 && !parsed.result?.is_error,
      reply,
      files_changed: uploaded,
      site_url: sitePublicUrl(slug),
      duration_ms: Date.now() - t0,
      cost_usd: parsed.result?.total_cost_usd ?? null,
      sandbox_id: sandbox.sandboxId,
      stdout_tail: run.stdout.slice(-1500),
      stderr_tail: run.stderr.slice(-800),
      log,
    }
  } catch (err) {
    mark('error', { step: currentStep, message: (err as Error).message })
    return {
      ok: false,
      reply: 'Entschuldigung, es gab einen Fehler. Bitte versuche es nochmal!',
      files_changed: [],
      site_url: sitePublicUrl(slug),
      duration_ms: Date.now() - t0,
      cost_usd: null,
      sandbox_id: sandbox?.sandboxId || null,
      error: (err as Error).message,
      error_step: currentStep,
      log,
    }
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill()
      } catch {}
    }
  }
}
