export type AuthUser = {
  id: string
  email: string
  provider: 'email' | 'wechat'
}

type AuthSession = {
  accessToken: string
  user: AuthUser
}

const SESSION_STORAGE_KEY = 'fateish-auth-session'
const DEFAULT_GATEWAY_URL = 'https://api.fateish.cn'

export const fateishApiUrl = String(import.meta.env.VITE_FATEISH_API_URL ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, '')

export function loadAuthSession(): AuthSession | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as AuthSession | null
    return parsed?.accessToken && parsed.user?.id ? parsed : null
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${fateishApiUrl}/v1/auth/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const payload = await response.json().catch(() => null) as {
    access_token?: string
    user?: AuthUser
    message?: string
  } | null
  if (!response.ok || !payload?.access_token || !payload.user) {
    throw new Error(payload?.message ?? '登录失败，请检查账号和登录密码。')
  }
  const session = { accessToken: payload.access_token, user: payload.user }
  saveAuthSession(session)
  return session
}

export async function loadCloudCases(accessToken: string) {
  const response = await fetch(`${fateishApiUrl}/v1/cases`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('云端命例读取失败。')
  const payload = await response.json() as { cases?: unknown[] }
  return payload.cases ?? []
}

export async function saveCloudCases(accessToken: string, cases: unknown[]) {
  const response = await fetch(`${fateishApiUrl}/v1/cases`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cases }),
  })
  if (!response.ok) throw new Error('云端命例保存失败。')
}
