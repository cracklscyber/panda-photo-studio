import { Template, defaultBuildLogger } from 'e2b'

const alias = process.env.ROMY_E2B_TEMPLATE_ALIAS || 'romy-claude-code'

const template = Template()
  .fromNodeImage('20')
  .setWorkdir('/home/user/romy-claude')
  .makeDir('/home/user/romy-claude')
  .runCmd(
    'cd /home/user/romy-claude && npm init -y && npm install --include=optional @anthropic-ai/claude-agent-sdk @anthropic-ai/claude-code'
  )
  .setReadyCmd(
    'cd /home/user/romy-claude && test -x /home/user/romy-claude/node_modules/.bin/claude && node -e "import(\'@anthropic-ai/claude-agent-sdk\')"'
  )

try {
  const info = await Template.build(template, {
    alias,
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger({ minLevel: 'debug' }),
  })

  console.log(`E2B template built: ${info.templateId}`)
  console.log(`Set ROMY_E2B_TEMPLATE=${alias} in Vercel and locally.`)
} catch (err) {
  console.error('E2B template build failed.')
  console.error(err?.stack || err?.message || err)
  if (err && typeof err === 'object') {
    console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
  }
  process.exit(1)
}
