// Vercel API utilities for fetching logs and debugging

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = 'panda-photo-studio'
const VERCEL_TEAM_ID = 'cracklscyber'

interface VercelLog {
  id: string
  message: string
  timestamp: number
  source: string
  level: string
}

export async function fetchVercelLogs(limit: number = 100): Promise<VercelLog[]> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const response = await fetch(
    `https://api.vercel.com/v2/projects/${VERCEL_PROJECT_ID}/logs?teamId=${VERCEL_TEAM_ID}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status}`)
  }

  const data = await response.json()
  return data.logs || []
}

export async function fetchDeploymentLogs(deploymentId: string): Promise<VercelLog[]> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const response = await fetch(
    `https://api.vercel.com/v2/deployments/${deploymentId}/events?teamId=${VERCEL_TEAM_ID}`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status}`)
  }

  const data = await response.json()
  return data || []
}

export async function getLatestDeployment(): Promise<any> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const response = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status}`)
  }

  const data = await response.json()
  return data.deployments?.[0]
}
