export type AgentChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  status?: 'loading' | 'error'
}

export type AgentChatCase = {
  id: string
  name: string
  solarLabel: string
  headerLabel?: string
  solarHeaderLabel?: string
  lunarHeaderLabel?: string
  zodiacIcon?: string
}

export type AgentChatSession = {
  id: string
  caseId: string
  caseName: string
  caseSolarLabel: string
  title: string
  createdAt: number
  updatedAt: number
  messages: AgentChatMessage[]
}

const CHAT_HISTORY_STORAGE_KEY = 'ssmaster-agent-chat-history-v1'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createAgentChatSession(activeCase: AgentChatCase): AgentChatSession {
  const now = Date.now()

  return {
    id: createId('chat'),
    caseId: activeCase.id,
    caseName: activeCase.name,
    caseSolarLabel: activeCase.solarLabel,
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

export function createAgentChatMessage(
  role: AgentChatMessage['role'],
  content: string,
  status?: AgentChatMessage['status'],
): AgentChatMessage {
  return {
    id: createId('message'),
    role,
    content,
    status,
  }
}

export function deriveAgentChatTitle(messages: AgentChatMessage[]) {
  const firstQuestion = messages.find((message) => message.role === 'user')?.content.trim()
  if (!firstQuestion) return '新对话'
  return firstQuestion.length > 24 ? `${firstQuestion.slice(0, 24)}…` : firstQuestion
}

export function loadAgentChatSessions() {
  if (typeof window === 'undefined') return [] as AgentChatSession[]

  try {
    const stored = JSON.parse(window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) ?? '[]') as AgentChatSession[]
    if (!Array.isArray(stored)) return []

    return stored.map((session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.status === 'loading'
          ? { ...message, content: '上次请求未完成，请重新提问。', status: 'error' as const }
          : message,
      ),
    }))
  } catch {
    return []
  }
}

export function saveAgentChatSessions(sessions: AgentChatSession[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(sessions))
}
