import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'romy_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function expectedToken(): string | null {
  const password = process.env.ROMY_ADMIN_PASSWORD
  if (!password) return null
  return createHmac('sha256', password).update('romy-admin-v1').digest('hex')
}

export async function isAdminAuthed(): Promise<boolean> {
  const expected = expectedToken()
  if (!expected) return false
  const c = await cookies()
  const got = c.get(COOKIE_NAME)?.value
  if (!got || got.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function setAdminCookie(): Promise<void> {
  const expected = expectedToken()
  if (!expected) return
  const c = await cookies()
  c.set(COOKIE_NAME, expected, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearAdminCookie(): Promise<void> {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}

export function verifyPassword(plain: string): boolean {
  const password = process.env.ROMY_ADMIN_PASSWORD
  if (!password || !plain) return false
  if (plain.length !== password.length) return false
  try {
    return timingSafeEqual(Buffer.from(plain), Buffer.from(password))
  } catch {
    return false
  }
}
