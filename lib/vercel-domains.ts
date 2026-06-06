const VERCEL_API = 'https://api.vercel.com'

function apexDomain(): string {
  return (process.env.ROMY_APEX_DOMAIN || 'halloluna.net')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

export async function ensureVercelSubdomain(slug: string): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token || !projectId) return false

  const name = `${slug}.${apexDomain()}`
  const qs = teamId ? `?teamId=${teamId}` : ''
  let res: Response
  try {
    res = await fetch(
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
  } catch (err) {
    console.error('Vercel add-domain request failed:', err)
    return false
  }

  if (res.ok) return true
  const body = await res.json().catch(() => ({}))
  const code = (body as { error?: { code?: string } }).error?.code
  // Treat "already configured" as success.
  if (code === 'domain_already_in_use_by_different_project') {
    console.warn(`Vercel: ${name} already on another project`)
    return true
  }
  if (code === 'domain_already_exists' || code === 'conflict') return true
  console.error('Vercel add-domain failed:', res.status, body)
  return false
}
