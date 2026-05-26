const VERCEL_API = 'https://api.vercel.com'

function apexDomain(): string {
  return (process.env.ROMY_APEX_DOMAIN || 'halloluna.net')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

export async function ensureVercelSubdomain(slug: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token || !projectId) return

  const name = `${slug}.${apexDomain()}`
  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(
    `${VERCEL_API}/v10/projects/${projectId}/domains${qs}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    }
  )

  if (res.ok) return
  const body = await res.json().catch(() => ({}))
  const code = (body as { error?: { code?: string } }).error?.code
  // Treat "already configured" as success.
  if (code === 'domain_already_in_use_by_different_project') {
    console.warn(`Vercel: ${name} already on another project`)
    return
  }
  if (code === 'domain_already_exists' || code === 'conflict') return
  console.error('Vercel add-domain failed:', res.status, body)
}
