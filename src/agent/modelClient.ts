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
}

const SETTINGS_STORAGE_KEY = 'ssmaster-agent-api-settings'

const DEEPSEEK_V4_PRO_DEFAULTS: AgentApiSettings = {
  apiUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-v4-pro',
}

const ENV_SETTINGS: AgentApiSettings = {
  apiUrl: String(import.meta.env.VITE_AGENT_API_URL ?? DEEPSEEK_V4_PRO_DEFAULTS.apiUrl),
  apiKey: String(import.meta.env.VITE_AGENT_API_KEY ?? DEEPSEEK_V4_PRO_DEFAULTS.apiKey),
  model: String(import.meta.env.VITE_AGENT_MODEL ?? DEEPSEEK_V4_PRO_DEFAULTS.model),
}

function isLegacyMockSettings(settings: Partial<AgentApiSettings>) {
  return settings.apiUrl === 'http://127.0.0.1:8787/v1/chat/completions' && settings.model === 'mock-model'
}

export function loadAgentApiSettings(): AgentApiSettings {
  if (typeof window === 'undefined') return ENV_SETTINGS

  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as Partial<AgentApiSettings>
    if (isLegacyMockSettings(stored)) {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
      return ENV_SETTINGS
    }

    return {
      apiUrl: stored.apiUrl ?? ENV_SETTINGS.apiUrl,
      apiKey: stored.apiKey ?? ENV_SETTINGS.apiKey,
      model: stored.model ?? ENV_SETTINGS.model,
    }
  } catch {
    return ENV_SETTINGS
  }
}

export function saveAgentApiSettings(settings: AgentApiSettings) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function isAgentApiConfigured(settings: AgentApiSettings) {
  return Boolean(settings.apiUrl.trim() && settings.apiKey.trim() && settings.model.trim())
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
  if (typeof data.error === 'string') return data.error
  if (typeof data.error?.message === 'string') return data.error.message
  if (typeof data.message === 'string') return data.message
  return fallback
}

export async function requestAgentReply({
  settings,
  contextMarkdown,
  messages,
  signal,
}: AgentReplyInput) {
  const apiUrl = settings.apiUrl.trim()
  const apiKey = settings.apiKey.trim()
  const model = settings.model.trim()

  if (!apiUrl || !apiKey || !model) {
    throw new Error('请先填写 DeepSeek API Key。')
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: 'system',
          content: contextMarkdown,
        },
        ...messages,
      ],
    }),
    signal,
  })

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    throw new Error(readErrorMessage(payload, `模型请求失败（${response.status}）`))
  }

  const reply = readReplyContent(payload)
  if (!reply) {
    throw new Error('模型接口返回成功，但没有读取到回答内容。')
  }

  return reply
}
