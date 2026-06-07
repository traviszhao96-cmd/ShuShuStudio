import { History, Plus, Settings, Trash2, X } from 'lucide-react'
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  createAgentChatMessage,
  createAgentChatSession,
  deriveAgentChatTitle,
  loadAgentChatSessions,
  saveAgentChatSessions,
  type AgentChatCase,
  type AgentChatMessage,
  type AgentChatSession,
} from '../agent/chatHistory'
import { buildAgentRequestMarkdown } from '../agent/contextMarkdown'
import {
  isAgentApiConfigured,
  loadAgentApiSettings,
  requestAgentReply,
  saveAgentApiSettings,
  type AgentApiSettings,
} from '../agent/modelClient'

type AgentTalkBarProps = {
  contextMarkdown: string
  activeCase: AgentChatCase
  onActivateCase: (caseId: string) => void
}

type CaseAnchorRect = {
  top: number
  left: number
  width: number
  overlayTop: number
}

const STARTER_QUESTIONS = ['概括当前命盘主轴', '分析当前大限与流年', '解释当前四化重点']

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="agent-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function formatSessionTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function AgentTalkBar({ contextMarkdown, activeCase, onActivateCase }: AgentTalkBarProps) {
  const [draft, setDraft] = useState('')
  const [previewQuestion, setPreviewQuestion] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isContextOpen, setIsContextOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [caseAnchorRect, setCaseAnchorRect] = useState<CaseAnchorRect | null>(null)
  const [sessions, setSessions] = useState(loadAgentChatSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [apiSettings, setApiSettings] = useState<AgentApiSettings>(loadAgentApiSettings)
  const [settingsDraft, setSettingsDraft] = useState<AgentApiSettings>(loadAgentApiSettings)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const lastScrollY = useRef(0)
  const dragStartY = useRef<number | null>(null)
  const dragOffsetRef = useRef(0)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const pendingSessionRef = useRef<AgentChatSession | null>(null)

  const preferredSession = sessions.find(
    (session) => session.id === activeSessionId && session.caseId === activeCase.id,
  )
  const activeSession =
    preferredSession ??
    [...sessions]
      .filter((session) => session.caseId === activeCase.id)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
    null
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession])
  const requestMarkdown = useMemo(
    () => buildAgentRequestMarkdown(contextMarkdown, previewQuestion),
    [contextMarkdown, previewQuestion],
  )
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  )

  useEffect(() => {
    saveAgentChatSessions(sessions)
    pendingSessionRef.current = null
  }, [sessions])

  useEffect(() => {
    lastScrollY.current = window.scrollY

    function handleScroll() {
      const nextScrollY = window.scrollY
      const delta = nextScrollY - lastScrollY.current

      if (nextScrollY <= 12) {
        setIsHidden(false)
      } else if (delta > 8) {
        setIsHidden(true)
      } else if (delta < -8) {
        setIsHidden(false)
      }

      lastScrollY.current = nextScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isChatOpen) return

    window.setTimeout(() => composerRef.current?.focus(), 120)
  }, [isChatOpen])

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  const closeChat = useCallback(() => {
    dragOffsetRef.current = 0
    dragStartY.current = null
    setIsDragging(false)
    setDragOffset(0)
    setIsHistoryOpen(false)
    setIsChatOpen(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    function handlePointerMove(event: PointerEvent) {
      if (dragStartY.current === null) return
      const nextOffset = Math.max(0, event.clientY - dragStartY.current)
      dragOffsetRef.current = nextOffset
      setDragOffset(nextOffset)
    }

    function handlePointerEnd() {
      dragStartY.current = null
      setIsDragging(false)
      if (dragOffsetRef.current > 64) {
        closeChat()
        return
      }
      dragOffsetRef.current = 0
      setDragOffset(0)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [closeChat, isDragging])

  function updateSessionMessages(
    sessionId: string,
    updater: (current: AgentChatMessage[]) => AgentChatMessage[],
  ) {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) return session
        const nextMessages = updater(session.messages)
        return {
          ...session,
          messages: nextMessages,
          title: deriveAgentChatTitle(nextMessages),
          updatedAt: Date.now(),
        }
      }),
    )
  }

  function ensureActiveSession() {
    const existing =
      sessions.find(
        (session) => session.id === activeSessionId && session.caseId === activeCase.id,
      ) ??
      [...sessions]
        .filter((session) => session.caseId === activeCase.id)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]

    if (existing) {
      setActiveSessionId(existing.id)
      return existing
    }

    if (pendingSessionRef.current?.caseId === activeCase.id) {
      return pendingSessionRef.current
    }

    const nextSession = createAgentChatSession(activeCase)
    pendingSessionRef.current = nextSession
    setSessions((current) => [...current, nextSession])
    setActiveSessionId(nextSession.id)
    return nextSession
  }

  function openChat() {
    ensureActiveSession()
    const sourceCard = document.querySelector<HTMLElement>('.case-header-panel .case-current-card')
    if (sourceCard) {
      const rect = sourceCard.getBoundingClientRect()
      const top = Math.max(rect.top, window.innerWidth <= 720 ? 8 : 32)
      setCaseAnchorRect({
        top,
        left: rect.left,
        width: rect.width,
        overlayTop: top + rect.height + (window.innerWidth <= 720 ? 8 : 12),
      })
    }
    setIsChatOpen(true)
  }

  function openPreview(question = draft) {
    setPreviewQuestion(question.trim())
    setCopyStatus('idle')
    setIsContextOpen(true)
  }

  function openSettings() {
    setSettingsDraft(apiSettings)
    setSettingsSaved(false)
    setIsSettingsOpen(true)
  }

  function persistSettings() {
    const nextSettings = {
      apiUrl: settingsDraft.apiUrl.trim(),
      apiKey: settingsDraft.apiKey.trim(),
      model: settingsDraft.model.trim(),
    }
    saveAgentApiSettings(nextSettings)
    setApiSettings(nextSettings)
    setSettingsSaved(true)
    window.setTimeout(() => setIsSettingsOpen(false), 350)
  }

  function startNewChat() {
    activeRequest.current?.abort()
    activeRequest.current = null
    setIsSending(false)
    const nextSession = createAgentChatSession(activeCase)
    setSessions((current) => [...current, nextSession])
    setActiveSessionId(nextSession.id)
    setDraft('')
    setIsHistoryOpen(false)
    window.setTimeout(() => composerRef.current?.focus(), 80)
  }

  function selectSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId)
    if (!session) return

    activeRequest.current?.abort()
    activeRequest.current = null
    setIsSending(false)
    setActiveSessionId(session.id)
    onActivateCase(session.caseId)
    setIsHistoryOpen(false)
  }

  function deleteSession(sessionId: string) {
    const nextSessions = sessions.filter((session) => session.id !== sessionId)
    if (sessionId !== activeSession?.id) {
      setSessions(nextSessions)
      return
    }

    const fallback =
      [...nextSessions]
        .filter((session) => session.caseId === activeCase.id)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? createAgentChatSession(activeCase)

    setSessions(nextSessions.some((session) => session.id === fallback.id) ? nextSessions : [...nextSessions, fallback])
    setActiveSessionId(fallback.id)
  }

  function handleDragStart(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    dragStartY.current = event.clientY
    setIsDragging(true)
  }

  async function sendMessage(question = draft) {
    const normalized = question.trim()
    const sessionId = activeSession?.id
    if (!normalized || isSending || !sessionId) return

    if (!isAgentApiConfigured(apiSettings)) {
      setDraft(normalized)
      openSettings()
      return
    }

    const userMessage = createAgentChatMessage('user', normalized)
    const statusMessage = createAgentChatMessage(
      'agent',
      '正在结合当前命盘与分析上下文生成回答…',
      'loading',
    )
    const requestMessages = [
      ...messages
        .filter((message) => !message.status)
        .map((message) => ({
          role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: message.content,
        })),
      { role: 'user' as const, content: normalized },
    ]
    const controller = new AbortController()

    updateSessionMessages(sessionId, (current) => [...current, userMessage, statusMessage])
    setPreviewQuestion(normalized)
    setDraft('')
    setIsSending(true)
    activeRequest.current = controller

    try {
      const reply = await requestAgentReply({
        settings: apiSettings,
        contextMarkdown,
        messages: requestMessages,
        signal: controller.signal,
      })
      updateSessionMessages(sessionId, (current) =>
        current.map((message) =>
          message.id === statusMessage.id ? { ...message, content: reply, status: undefined } : message,
        ),
      )
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : '模型请求失败，请检查 API 设置后重试。'
      updateSessionMessages(sessionId, (current) =>
        current.map((item) =>
          item.id === statusMessage.id
            ? { ...item, content: `请求失败：${message}`, status: 'error' }
            : item,
        ),
      )
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setIsSending(false)
      }
    }
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(requestMarkdown)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  return (
    <>
      <div className={`agent-talkbar-shell ${isHidden || isChatOpen || isContextOpen || isSettingsOpen ? 'is-hidden' : ''}`}>
        <form
          className="agent-talkbar"
          onSubmit={(event) => {
            event.preventDefault()
            openChat()
          }}
        >
          <button
            type="button"
            className="agent-context-button"
            onClick={() => openPreview('')}
            aria-label="预览 Agent 上下文"
            title="预览 Agent 上下文"
          >
            文
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={openChat}
            onClick={openChat}
            placeholder="询问当前命盘、宫位或流年…"
            aria-label="打开 Agent 对话"
          />
          <button type="submit" className="agent-send-button" aria-label="打开 Agent 对话" title="打开 Agent 对话">
            ↑
          </button>
        </form>
      </div>

      {isChatOpen ? (
        <>
          <div
            className="agent-chat-case-anchor case-current-card"
            style={
              caseAnchorRect
                ? {
                    top: caseAnchorRect.top,
                    left: caseAnchorRect.left,
                    right: 'auto',
                    width: caseAnchorRect.width,
                  }
                : undefined
            }
          >
            <div className="case-current-summary">
              <div className="case-current-line">
                <strong className="case-current-name" title={activeCase.name}>
                  {activeCase.zodiacIcon ? (
                    <span className="case-current-zodiac" aria-hidden="true">
                      {activeCase.zodiacIcon}
                    </span>
                  ) : null}
                  <span className="case-current-name-text">{activeCase.name}</span>
                </strong>
                <span className="case-current-date" title={activeCase.solarHeaderLabel ?? activeCase.solarLabel}>
                  {activeCase.solarHeaderLabel ?? activeCase.solarLabel}
                </span>
                {activeCase.lunarHeaderLabel ? (
                  <span className="case-current-date case-current-lunar" title={activeCase.lunarHeaderLabel}>
                    {activeCase.lunarHeaderLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="case-expand-button agent-chat-case-end" aria-hidden="true">
              <span className="case-inline-arrow">▾</span>
            </div>
          </div>
          <div
            className="agent-chat-overlay"
            role="presentation"
            style={caseAnchorRect ? { top: caseAnchorRect.overlayTop } : undefined}
          >
            <section
              className={`agent-chat-sheet ${isDragging ? 'is-dragging' : ''}`}
              style={{ transform: `translateY(${dragOffset}px)` }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="agent-chat-title"
            >
              <header
                className="agent-chat-header agent-chat-drag-region"
                onPointerDown={handleDragStart}
              >
                <div className="agent-chat-handle" aria-hidden="true" />
                <button
                  type="button"
                  className="agent-chat-icon-button"
                  onClick={() => openPreview(previewQuestion)}
                  aria-label="查看上下文"
                  title="查看上下文"
                >
                  文
                </button>
                <div className="agent-chat-title">
                  <span aria-hidden="true">命</span>
                  <strong id="agent-chat-title">{activeSession?.title ?? '命理 Agent'}</strong>
                  <small>
                    {isSending
                      ? '正在生成回答'
                      : isAgentApiConfigured(apiSettings)
                        ? `已连接 ${apiSettings.model}`
                        : '等待填写 DeepSeek API Key'}
                  </small>
                </div>
                <div className="agent-chat-header-actions">
                  <button
                    type="button"
                    className="agent-chat-icon-button"
                    onClick={() => setIsHistoryOpen(true)}
                    aria-label="历史对话"
                    title="历史对话"
                  >
                    <History size={16} strokeWidth={1.8} />
                  </button>
                  <button type="button" className="agent-chat-icon-button" onClick={openSettings} aria-label="模型设置" title="模型设置">
                    <Settings size={16} strokeWidth={1.8} />
                  </button>
                  <button type="button" className="agent-chat-icon-button" onClick={startNewChat} aria-label="新对话" title="新对话">
                    <Plus size={17} strokeWidth={1.9} />
                  </button>
                </div>
              </header>

              <div className="agent-chat-messages">
                {messages.length === 0 ? (
                  <div className="agent-chat-empty">
                    <span className="agent-chat-mark" aria-hidden="true">
                      命
                    </span>
                    <h2>从 {activeCase.name} 的命盘开始</h2>
                    <p>Agent 会携带当前命例、命盘资料、初步分析以及正在查看的大限流年。</p>
                    <div className="agent-chat-starters">
                      {STARTER_QUESTIONS.map((question) => (
                        <button key={question} type="button" onClick={() => sendMessage(question)} disabled={isSending}>
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="agent-chat-thread">
                    {messages.map((message) => (
                      <article
                        key={message.id}
                        className={`agent-chat-message is-${message.role} ${message.status ? `is-${message.status}` : ''}`}
                      >
                        <span>{message.role === 'user' ? '你' : '命'}</span>
                        <MarkdownContent content={message.content} />
                      </article>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                className="agent-chat-composer"
                onSubmit={(event) => {
                  event.preventDefault()
                  sendMessage()
                }}
              >
                <textarea
                  ref={composerRef}
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={`询问 ${activeCase.name} 的命盘…`}
                  aria-label="向命理 Agent 提问"
                />
                <div className="agent-chat-composer-actions">
                  <button
                    type="button"
                    className="agent-chat-tool-button"
                    onClick={() => openPreview(previewQuestion)}
                    aria-label="查看上下文资料"
                    title="查看上下文资料"
                  >
                    文
                  </button>
                  <button type="button" className="agent-chat-context-link" onClick={() => openPreview(previewQuestion)}>
                    查看上下文
                  </button>
                  <button type="submit" className="agent-chat-submit" disabled={!draft.trim() || isSending} aria-label="发送">
                    ↑
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
      ) : null}

      {isHistoryOpen ? (
        <div className="agent-history-overlay" role="presentation" onClick={() => setIsHistoryOpen(false)}>
          <section
            className="agent-history-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-history-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="agent-history-header">
              <div>
                <p className="section-kicker">Conversations</p>
                <h2 id="agent-history-title">历史对话</h2>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen(false)} aria-label="关闭历史对话">
                <X size={18} />
              </button>
            </header>
            <div className="agent-history-list">
              {sortedSessions.map((session) => (
                <article
                  key={session.id}
                  className={`agent-history-item ${session.id === activeSession?.id ? 'is-active' : ''}`}
                >
                  <button type="button" className="agent-history-main" onClick={() => selectSession(session.id)}>
                    <div className="agent-history-item-title">
                      <strong>{session.title}</strong>
                      {session.caseId === activeCase.id ? <em>当前命例</em> : null}
                    </div>
                    <span>{session.caseName} · {session.caseSolarLabel}</span>
                    <small>{formatSessionTime(session.updatedAt)} · {session.messages.length} 条消息</small>
                  </button>
                  <button
                    type="button"
                    className="agent-history-delete"
                    onClick={() => deleteSession(session.id)}
                    aria-label={`删除对话：${session.title}`}
                    title="删除对话"
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {isContextOpen ? (
        <div className="agent-context-overlay" role="presentation" onClick={() => setIsContextOpen(false)}>
          <section
            className="agent-context-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-context-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="agent-context-header">
              <div>
                <p className="section-kicker">Agent Context</p>
                <h2 id="agent-context-title">发送内容预览</h2>
              </div>
              <div className="agent-context-actions">
                <button type="button" onClick={copyRequest}>
                  {copyStatus === 'copied' ? '已复制' : copyStatus === 'error' ? '复制失败' : '复制 MD'}
                </button>
                <button
                  type="button"
                  className="agent-context-close"
                  onClick={() => setIsContextOpen(false)}
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="agent-context-meta">
              <span>{requestMarkdown.length.toLocaleString()} 字符</span>
              <span>{previewQuestion ? '包含最近问题' : '仅命盘上下文'}</span>
            </div>

            <div className="agent-context-preview agent-context-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{requestMarkdown}</ReactMarkdown>
            </div>
          </section>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div className="agent-settings-overlay" role="presentation" onClick={() => setIsSettingsOpen(false)}>
          <form
            className="agent-settings-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-settings-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              persistSettings()
            }}
          >
            <header className="agent-settings-header">
              <div>
                <p className="section-kicker">DeepSeek API</p>
                <h2 id="agent-settings-title">DeepSeek V4 Pro</h2>
              </div>
              <button type="button" onClick={() => setIsSettingsOpen(false)} aria-label="关闭">
                ×
              </button>
            </header>

            <div className="agent-settings-fields">
              <label>
                <span>完整 API 地址</span>
                <input
                  type="url"
                  value={settingsDraft.apiUrl}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, apiUrl: event.target.value }))}
                  placeholder="https://api.deepseek.com/chat/completions"
                  required
                />
              </label>
              <label>
                <span>API Key</span>
                <input
                  type="password"
                  value={settingsDraft.apiKey}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, apiKey: event.target.value }))}
                  placeholder="填写你的 DeepSeek API Key"
                  required
                />
              </label>
              <label>
                <span>模型名</span>
                <input
                  value={settingsDraft.model}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, model: event.target.value }))}
                  placeholder="deepseek-v4-pro"
                  required
                />
              </label>
            </div>

            <p className="agent-settings-note">地址与模型已默认配置为 DeepSeek V4 Pro，你只需要填写 API Key。</p>

            <button type="submit" className="agent-settings-save">
              {settingsSaved ? '已保存' : '保存连接设置'}
            </button>
          </form>
        </div>
      ) : null}
    </>
  )
}
