export type AgentApiSettings = {
  apiUrl: string
  apiKey: string
  model: string
}

export type AgentConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AgentReplyInput = {
  settings: AgentApiSettings
  contextMarkdown: string
  messages: AgentConversationMessage[]
  signal?: AbortSignal
  modelOverride?: string
}

type GuestTokenResponse = {
  access_token?: string
}

const AUTH_SESSION_STORAGE_KEY = 'fateish-auth-session'
const DEFAULT_GATEWAY_URL = 'https://api.fateish.cn'

const APP_SETTINGS: AgentApiSettings = {
  apiUrl: String(import.meta.env.VITE_FATEISH_API_URL ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, ''),
  apiKey: '',
  model: 'Fate-ish AI',
}

export function loadAgentApiSettings(): AgentApiSettings {
  return APP_SETTINGS
}

function readReplyContent(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''

  const data = payload as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>
    output_text?: string
  }
  const content = data.choices?.[0]?.message?.content

  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? '')
      .join('')
      .trim()
  }
  if (typeof data.output_text === 'string') return data.output_text.trim()
  return ''
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const data = payload as { error?: { message?: string } | string; message?: string }
  if (typeof data.error === 'string') return data.message ? `${data.error}：${data.message}` : data.error
  if (typeof data.error?.message === 'string') return data.error.message
  if (typeof data.message === 'string') return data.message
  return fallback
}

function getAccessToken() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? 'null') as GuestTokenResponse | null
    const token = stored?.access_token?.trim() ?? (stored as { accessToken?: string } | null)?.accessToken?.trim()
    if (token) return token
  } catch {
    // Login dialog will handle an invalid local session.
  }
  throw new Error('login_required：请先登录后再开始分析。')
}

function createIdempotencyKey() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function requestAgentReply({
  settings,
  contextMarkdown,
  messages,
  signal,
  modelOverride,
}: AgentReplyInput) {
  const apiUrl = settings.apiUrl.replace(/\/+$/, '')
  const requestBody = JSON.stringify({
    model: modelOverride,
    messages: [
      { role: 'system', content: contextMarkdown },
      ...messages,
    ],
  })
  const idempotencyKey = createIdempotencyKey()

  for (let authAttempt = 0; authAttempt < 2; authAttempt += 1) {
    const token = getAccessToken()
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: requestBody,
      signal,
    })

    if (response.status === 401 && authAttempt === 0) {
      throw new Error('登录状态已失效，请重新登录。')
    }

    const payload = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      throw new Error(readErrorMessage(payload, `分析服务请求失败（${response.status}）`))
    }

    const reply = readReplyContent(payload)
    if (!reply) throw new Error('分析服务返回成功，但没有读取到回答内容。')
    return reply
  }

  throw new Error('登录状态已失效，请稍后重试。')
}
