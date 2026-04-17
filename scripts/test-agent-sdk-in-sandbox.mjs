import { Sandbox } from '@vercel/sandbox'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const t0 = Date.now()
console.log('Creating sandbox...')
const sandbox = await Sandbox.create({
  teamId: env.VERCEL_TEAM_ID,
  projectId: env.VERCEL_PROJECT_ID,
  token: env.VERCEL_TOKEN,
  timeout: 300_000,
})
console.log(`Sandbox ready in ${Date.now() - t0}ms — id=${sandbox.sandboxId}`)

// Sanity check: plain Anthropic SDK first, proves the key itself is valid
console.log('\n→ Sanity check with @anthropic-ai/sdk (direct API call)...')
const sanityScript = `
import Anthropic from '@anthropic-ai/sdk'
const a = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const msg = await a.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 50,
  messages: [{ role: 'user', content: 'Say hi in 3 words.' }],
})
console.log('RESPONSE:', msg.content.map(b => b.text).join(''))
`

await sandbox.runCommand({
  cmd: 'sh',
  args: ['-c', 'cd /tmp && npm init -y >/dev/null 2>&1 && npm install @anthropic-ai/sdk @anthropic-ai/claude-agent-sdk 2>&1 | tail -3'],
})

await sandbox.writeFiles([
  { path: '/tmp/sanity.mjs', content: Buffer.from(sanityScript) },
])

const sanity = await sandbox.runCommand({
  cmd: 'node',
  args: ['/tmp/sanity.mjs'],
  cwd: '/tmp',
  env: { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY },
})
console.log('stdout:', await sanity.stdout())
console.log('stderr:', (await sanity.stderr()).slice(0, 500))
console.log('exitCode=', sanity.exitCode)

if (sanity.exitCode !== 0) {
  console.log('\n⚠ Key is invalid or network issue. Stopping here.')
  await sandbox.stop()
  process.exit(1)
}

// Now the Agent SDK test
console.log('\n→ Agent SDK query() with properly-forwarded env...')
const agentScript = `
import { query } from '@anthropic-ai/claude-agent-sdk'
const stream = query({
  prompt: 'Reply with exactly: AGENT_SDK_OK',
  options: {
    model: 'claude-sonnet-4-6',
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    allowedTools: [],
  },
})
for await (const msg of stream) {
  if (msg.type === 'result') {
    console.log('RESULT:', JSON.stringify({ subtype: msg.subtype, is_error: msg.is_error, result: msg.result, duration_ms: msg.duration_ms }))
  } else if (msg.type === 'assistant') {
    const text = msg.message?.content?.find?.(c => c.type === 'text')?.text
    if (text) console.log('ASSISTANT:', text)
  }
}
`

await sandbox.writeFiles([
  { path: '/tmp/agent.mjs', content: Buffer.from(agentScript) },
])

const agent = await sandbox.runCommand({
  cmd: 'node',
  args: ['/tmp/agent.mjs'],
  cwd: '/tmp',
  env: { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY },
})
console.log('stdout:', await agent.stdout())
console.log('stderr:', (await agent.stderr()).slice(0, 800))
console.log('exitCode=', agent.exitCode)

await sandbox.stop()
console.log(`\nTotal: ${Date.now() - t0}ms`)
