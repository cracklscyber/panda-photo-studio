import { Sandbox } from '@vercel/sandbox'
import { readFileSync } from 'node:fs'

// Load .env.local manually
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const t0 = Date.now()
console.log('Creating sandbox...')

const sandbox = await Sandbox.create({
  teamId: env.VERCEL_TEAM_ID,
  projectId: env.VERCEL_PROJECT_ID,
  token: env.VERCEL_TOKEN,
  timeout: 60_000,
})

console.log(`Sandbox created in ${Date.now() - t0}ms — id=${sandbox.sandboxId}`)

const result = await sandbox.runCommand({
  cmd: 'sh',
  args: ['-c', 'echo "hello from sandbox" && node --version && whoami && pwd'],
})

console.log('stdout:', await result.stdout())
console.log('exitCode:', result.exitCode)

await sandbox.stop()
console.log(`Done. Total time: ${Date.now() - t0}ms`)
