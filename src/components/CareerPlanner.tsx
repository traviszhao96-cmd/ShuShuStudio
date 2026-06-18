import { Shuffle, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { getLatestReport, type AgentReport } from '../agent/reportStore'
import { getProfile } from '../analysis/profileStore'
import { buildDestinyProfilePrompt, parseDestinyProfileResponse, type DestinyProfile } from '../analysis/destinyProfile'
import { requestAgentReply, loadAgentApiSettings } from '../agent/modelClient'
import type { ChartModel, ChartProfile, OverallResult, TopicName } from '../analysis/types'

// ── 卡牌类型 ──

type FeedbackValue = 'reason' | 'meh' | 'nonsense'
type CardKind = 'gift' | 'shadow'

type TalentCard = {
  id: string
  kind: CardKind
  title: string
  subtitle: string
  description: string
  hint: string
  alternatives?: TalentCard[]
  isPending?: boolean
}

type TalentDeckState = {
  feedback: Record<string, FeedbackValue>
  flipped: Record<string, boolean>
  rerollCursor: Record<string, number>
}

type CareerPlannerProps = {
  caseId: string
  caseName: string
  chartModel: ChartModel | null
  overallAnalysis: OverallResult | null
  onAskExplore?: (question: string) => void
}

// ── 持久化 ──

const STORAGE_KEY = 'ssmaster-talent-deck-v2'
const DESTINY_STORAGE_KEY = 'ssmaster-destiny-profiles'

function loadState(caseId: string): TalentDeckState {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, TalentDeckState>
    return all[caseId] ?? { feedback: {}, flipped: {}, rerollCursor: {} }
  } catch {
    return { feedback: {}, flipped: {}, rerollCursor: {} }
  }
}

function saveState(caseId: string, state: TalentDeckState) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, TalentDeckState>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [caseId]: state }))
}

function loadDestinyProfile(caseId: string): DestinyProfile | null {
  try {
    const all = JSON.parse(localStorage.getItem(DESTINY_STORAGE_KEY) ?? '{}') as Record<string, DestinyProfile>
    return all[caseId] ?? null
  } catch {
    return null
  }
}

function saveDestinyProfile(caseId: string, profile: DestinyProfile) {
  const all = JSON.parse(localStorage.getItem(DESTINY_STORAGE_KEY) ?? '{}') as Record<string, DestinyProfile>
  localStorage.setItem(DESTINY_STORAGE_KEY, JSON.stringify({ ...all, [caseId]: profile }))
}

// ── 硬编码 fallbacks ──

const FALLBACK_GIFT_CARDS: TalentCard[] = [
  {
    id: 'fallback-gift-vision', kind: 'gift',
    title: '看见机会', subtitle: '优势牌 01',
    description: '你对变化、趋势和新机会比较敏感，容易先看到别人还没整理清楚的可能性。',
    hint: '适合放在探索、产品定义、策略判断和从 0 到 1 的场景里使用。',
  },
  {
    id: 'fallback-gift-translate', kind: 'gift',
    title: '把复杂说清楚', subtitle: '优势牌 02',
    description: '你不只是接收信息，更擅长把复杂东西重新组织成别人能理解、能使用的表达。',
    hint: '适合做方案、内容、研究、产品设计，或者任何需要"翻译复杂度"的工作。',
  },
  {
    id: 'fallback-gift-drive', kind: 'gift',
    title: '关键时刻敢冲', subtitle: '优势牌 03',
    description: '当事情进入混乱或不确定阶段，你反而可能比在稳定流程里更容易被激活。',
    hint: '适合处理新项目、转型期、危机修复，或者需要快速判断的角色。',
  },
  {
    id: 'fallback-gift-focus', kind: 'gift',
    title: '能抓重点', subtitle: '备用优势',
    description: '你可能比较擅长从一堆混乱信息里抓住真正影响结果的关键点。',
    hint: '适合用于判断方向、拆问题和做重要选择。',
  },
  {
    id: 'fallback-gift-sense', kind: 'gift',
    title: '对人有感觉', subtitle: '备用优势',
    description: '你可能能比较快感受到别人的态度、需求和关系里的微妙变化。',
    hint: '适合用在沟通、协作、用户理解和内容表达里。',
  },
]

const FALLBACK_SHADOW_CARDS: TalentCard[] = [
  {
    id: 'fallback-shadow-control', kind: 'shadow',
    title: '容易卡在掌控感里', subtitle: '弱点牌 01',
    description: '当事情不够确定、别人反应不符合预期时，你可能会下意识想多想一点、抓紧一点。',
    hint: '可以练习先区分：这件事是真的危险，还是只是暂时不确定。',
  },
  {
    id: 'fallback-shadow-overthink', kind: 'shadow',
    title: '脑子太忙', subtitle: '弱点牌 02',
    description: '你可能很难完全停下来，容易一边做事一边预演风险、后果和别人的评价。',
    hint: '适合用短周期行动来落地，不要让所有判断都停留在脑内推演。',
  },
  {
    id: 'fallback-shadow-boundary', kind: 'shadow',
    title: '边界容易被拉扯', subtitle: '弱点牌 03',
    description: '你可能既想保持自己的判断，又会被重要关系、外部期待或评价牵动。',
    hint: '需要把"我想要什么"和"别人希望我怎样"拆开看。',
  },
  {
    id: 'fallback-shadow-delay', kind: 'shadow',
    title: '容易想太完整', subtitle: '备用弱点',
    description: '你可能会希望想清楚再开始，但越想完整，行动的启动成本越高。',
    hint: '可以先做一个 30 分钟的小验证，不急着一次想出完整方案。',
  },
  {
    id: 'fallback-shadow-sensitive', kind: 'shadow',
    title: '容易受评价影响', subtitle: '备用弱点',
    description: '别人一句话、一个态度，可能会让你反复琢磨自己是不是做错了。',
    hint: '可以把反馈分成"有信息量"和"只是情绪噪音"两类。',
  },
]

// ── 卡片构建 ──

function firstText(report: AgentReport | null, topic: TopicName) {
  const item = report?.topics?.[topic]
  const parsed = item?.parsed
  const conclusion = parsed?.sections.find((s) => s.conclusion.trim())?.conclusion.trim()
  return {
    title: parsed?.headline || item?.headline || topic,
    description: conclusion || item?.content || '',
  }
}

function stripMarkdown(value: string, fallback = '') {
  const clean = value.replace(/[#*`_>§†]/g, '').replace(/\s+/g, ' ').trim()
  return clean || fallback
}

function makeCard(input: { id: string; kind: CardKind; index: number; title: string; description: string; hint?: string }): TalentCard {
  return {
    id: input.id,
    kind: input.kind,
    title: stripMarkdown(input.title, input.kind === 'gift' ? '一张优势牌' : '一张弱点牌'),
    subtitle: `${input.kind === 'gift' ? '优势牌' : '弱点牌'} 0${input.index + 1}`,
    description: stripMarkdown(input.description, ''),
    hint: input.hint ?? (input.kind === 'gift'
      ? '可以想想：这个优势最适合放在哪种工作场景里？'
      : '可以想想：这个弱点通常在什么压力下最容易出现？'),
  }
}

function buildCardsFromProfile(profile: ChartProfile | null, report: AgentReport | null): TalentCard[] {
  if (!profile && !report) return []

  const giftInputs = [
    ...(profile?.integratedArchetype.strengthClusters ?? []).map((item) => ({ title: item, description: item, hint: '这是档案里反复出现的优势线索。' })),
    ...(profile?.baziPattern.keyDynamics ?? []).map((item) => ({ title: item, description: item, hint: '一种底层能力，需通过具体任务看清。' })),
    ...(['个性', '事业', '财富'] as TopicName[]).map((topic) => {
      const item = firstText(report, topic)
      return { title: item.title, description: item.description, hint: `来自「${topic}」报告摘要。` }
    }),
  ].filter((item) => item.title || item.description)

  const shadowInputs = [
    ...(profile?.integratedArchetype.riskClusters ?? []).map((item) => ({ title: item, description: item, hint: '这不是缺点定论，而是一个容易消耗自己的模式。' })),
    profile?.sihuaCore.jiImpact ? { title: profile.sihuaCore.jiImpact, description: profile.sihuaCore.jiImpact, hint: '压力触发点，观察什么场景下会被牵动。' } : null,
    ...(['婚姻', '健康', '个性'] as TopicName[]).map((topic) => {
      const item = firstText(report, topic)
      return { title: item.title, description: item.description, hint: `来自「${topic}」报告摘要。` }
    }),
  ].filter((item): item is { title: string; description: string; hint: string } => Boolean(item && (item.title || item.description)))

  const gifts = Array.from({ length: 3 }, (_, i) => {
    const input = giftInputs[i]
    const fallback = FALLBACK_GIFT_CARDS[i]
    return input
      ? makeCard({ id: `gift-${i}`, kind: 'gift', index: i, ...input })
      : { ...fallback, id: `gift-${i}`, subtitle: `优势牌 0${i + 1}` }
  })

  const shadows = Array.from({ length: 3 }, (_, i) => {
    const input = shadowInputs[i]
    const fallback = FALLBACK_SHADOW_CARDS[i]
    return input
      ? makeCard({ id: `shadow-${i}`, kind: 'shadow', index: i, ...input })
      : { ...fallback, id: `shadow-${i}`, subtitle: `弱点牌 0${i + 1}` }
  })

  return [...gifts, ...shadows].map((card) => ({
    ...card,
    alternatives: card.kind === 'gift'
      ? FALLBACK_GIFT_CARDS.slice(3).map((item, i) => ({ ...item, id: `${card.id}-alt-${i}`, subtitle: '重抽优势' }))
      : FALLBACK_SHADOW_CARDS.slice(3).map((item, i) => ({ ...item, id: `${card.id}-alt-${i}`, subtitle: '重抽弱点' })),
  }))
}

/** 从 DestinyProfile 直接构建 6 张牌 */
function buildCardsFromDestiny(profile: DestinyProfile): TalentCard[] {
  const strengths = profile.strengthMap.slice(0, 3).map((item, i) =>
    makeCard({
      id: `destiny-gift-${i}`,
      kind: 'gift',
      index: i,
      title: item.name,
      description: item.description,
      hint: item.evidence.join('；') || item.bestScenarios.join('；'),
    }),
  )

  const risks = profile.riskMap.slice(0, 3).map((item, i) =>
    makeCard({
      id: `destiny-shadow-${i}`,
      kind: 'shadow',
      index: i,
      title: item.name,
      description: item.description,
      hint: item.mitigation,
    }),
  )

  const all = [...strengths, ...risks]
  // add fallback alternatives for reroll
  for (const card of all) {
    const pool = card.kind === 'gift' ? FALLBACK_GIFT_CARDS : FALLBACK_SHADOW_CARDS
    card.alternatives = pool.slice(3).map((item, i) => ({ ...item, id: `${card.id}-alt-${i}`, subtitle: '重抽' }))
  }
  return all
}

function resolveCard(card: TalentCard, state: TalentDeckState) {
  const cursor = state.rerollCursor[card.id] ?? 0
  const alternatives = card.alternatives ?? []
  return alternatives.length > 0 && cursor > 0 ? alternatives[(cursor - 1) % alternatives.length] : card
}

// ── 组件 ──

export function CareerPlanner({ caseId, caseName, chartModel, overallAnalysis, onAskExplore }: CareerPlannerProps) {
  const [state, setState] = useState(() => loadState(caseId))
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [destinyProfile, setDestinyProfile] = useState<DestinyProfile | null>(() => loadDestinyProfile(caseId))
  const [dealtCount, setDealtCount] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)
  const [genMessage, setGenMessage] = useState<string>('')

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const dealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const genMsgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const GEN_MESSAGES = [
    '🃏 上帝正在找牌…',
    '🔮 正在解读命盘结构…',
    '🔄 正在洗牌…',
    '✨ 你的回合，抽卡！',
    '🎴 正在摆牌…',
  ]

  // 加载已有档案
  const chartProfile = getProfile(caseId)
  const report = getLatestReport(caseId)

  const baseCards = useMemo(() => {
    if (destinyProfile) return buildCardsFromDestiny(destinyProfile)
    const fromOld = buildCardsFromProfile(chartProfile, report)
    if (fromOld.length > 0) return fromOld
    return []
  }, [destinyProfile, chartProfile, report])

  const hasCards = baseCards.length >= 6
  const cards = baseCards.map((card) => ({ baseId: card.id, card: resolveCard(card, state) }))
  const giftCards = cards.filter(({ card }) => card.kind === 'gift')
  const shadowCards = cards.filter(({ card }) => card.kind === 'shadow')
  const detailCard = detailCardId ? cards.find((item) => item.baseId === detailCardId) : null
  const detailCardIndex = detailCardId ? cards.findIndex((item) => item.baseId === detailCardId) : -1
  const flippedCount = Object.values(state.flipped).filter(Boolean).length
  const allFlipped = hasCards && flippedCount >= 6

  // ── 发牌动画 ──
  useEffect(() => {
    if (!hasCards) {
      setDealtCount(0)
      return
    }
    // 如果已全部发出，不再重发
    if (dealtCount >= 6) return

    setDealtCount(0)
    let count = 0
    dealTimerRef.current = setInterval(() => {
      count++
      setDealtCount(count)
      if (count >= 6) {
        if (dealTimerRef.current) clearInterval(dealTimerRef.current)
      }
    }, 180)
    return () => {
      if (dealTimerRef.current) clearInterval(dealTimerRef.current)
    }
  }, [hasCards])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  // ── AI 生成（含状态消息轮播）──
  const generatingRef = useRef(false)

  async function handleGenerate() {
    if (generatingRef.current) return
    if (!chartModel) {
      setGenError('命盘数据未加载，请先切换到命盘页面生成排盘。')
      return
    }
    if (!overallAnalysis) {
      setGenError('格局分析数据未生成，请先在命盘页面完成计算。')
      return
    }
    generatingRef.current = true
    setIsGenerating(true)
    setGenError(null)
    setDealtCount(0)

    let msgIndex = 0
    setGenMessage(GEN_MESSAGES[0])
    genMsgTimerRef.current = setInterval(() => {
      msgIndex++
      if (msgIndex < GEN_MESSAGES.length) {
        setGenMessage(GEN_MESSAGES[msgIndex])
      }
    }, 8000)

    try {
      const prompt = buildDestinyProfilePrompt(chartModel, overallAnalysis, caseName)
      const settings = loadAgentApiSettings()
      const reply = await requestAgentReply({
        settings,
        contextMarkdown: prompt,
        messages: [],
        modelOverride: 'deepseek-v4-pro',
      })
      const profile = parseDestinyProfileResponse(reply, chartModel)
      if (profile) {
        saveDestinyProfile(caseId, profile)
        setDestinyProfile(profile)
      } else {
        setGenError('AI 返回了无法解析的结果，请重试。')
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : '生成失败，请稍后重试。')
    } finally {
      if (genMsgTimerRef.current) clearInterval(genMsgTimerRef.current)
      setGenMessage('')
      setIsGenerating(false)
      generatingRef.current = false
    }
  }

  function updateState(updater: (current: TalentDeckState) => TalentDeckState) {
    setState((current) => {
      const next = updater(current)
      saveState(caseId, next)
      return next
    })
  }

  function flipCard(baseId: string) {
    updateState((current) => ({
      ...current,
      flipped: { ...current.flipped, [baseId]: true },
    }))
  }

  function setFeedback(baseId: string, value: FeedbackValue) {
    updateState((current) => {
      const next: TalentDeckState = {
        ...current,
        flipped: { ...current.flipped, [baseId]: true },
        feedback: { ...current.feedback, [baseId]: value },
      }
      if (value === 'nonsense') {
        next.rerollCursor = { ...current.rerollCursor, [baseId]: (current.rerollCursor[baseId] ?? 0) + 1 }
        next.feedback = { ...next.feedback, [baseId]: 'meh' }
      }
      return next
    })
  }

  function rerollCard(baseId: string) {
    updateState((current) => {
      const { [baseId]: _removed, ...feedback } = current.feedback
      return {
        ...current,
        flipped: { ...current.flipped, [baseId]: true },
        feedback,
        rerollCursor: { ...current.rerollCursor, [baseId]: (current.rerollCursor[baseId] ?? 0) + 1 },
      }
    })
  }

  function openDetail(baseId: string) {
    updateState((current) => ({ ...current, flipped: { ...current.flipped, [baseId]: true } }))
    setDetailCardId(baseId)
  }

  function showToast(message: string) {
    setToast(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1700)
  }

  function switchDetailCard(direction: -1 | 1) {
    if (detailCardIndex < 0) return
    const nextIndex = detailCardIndex + direction
    if (nextIndex < 0) { showToast('已经是第一张牌了'); return }
    if (nextIndex >= cards.length) { showToast('已经是最后一张牌了'); return }
    const nextBaseId = cards[nextIndex].baseId
    updateState((current) => ({ ...current, flipped: { ...current.flipped, [nextBaseId]: true } }))
    setDetailCardId(nextBaseId)
  }

  function handleDetailTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0]
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  function handleDetailTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
    switchDetailCard(deltaX < 0 ? 1 : -1)
  }

  const feedbackButtons = (baseId: string, feedback: FeedbackValue | undefined, iconSize = 13) => (
    <>
      {feedback === 'meh' ? (
        <button type="button" className="talent-reroll-button" onClick={() => rerollCard(baseId)}>换一张</button>
      ) : null}
      {([
        ['reason', '有道理', ThumbsUp],
        ['meh', '没感觉', ThumbsDown],
      ] as Array<[FeedbackValue, string, typeof ThumbsUp]>).map(([value, label, Icon]) => (
        <button
          key={value} type="button"
          className={feedback === value ? 'is-active' : ''}
          onClick={() => setFeedback(baseId, value)}
          aria-label={label} title={label}
        >
          <Icon size={iconSize} strokeWidth={2.2} />
        </button>
      ))}
    </>
  )

  return (
    <div className="career-planner talent-deck">
      <header className="career-hero talent-hero">
        <p className="section-kicker">Destiny Deck · 命运牌组</p>
        <h2>{caseName}，先看清自己的牌面</h2>
        <p>
          系统读取命盘计算层结果，由 AI 生成 3 张优势牌和 3 张弱点牌。
          翻开后只需凭直觉反馈：有道理、没感觉。反馈越多，画像越准。
        </p>

        {isGenerating ? (
          <div className="talent-generate-area">
            <div className="talent-gen-message">{genMessage}</div>
            <div className="talent-gen-spinner" />
            {genError ? <p className="talent-gen-error">{genError}</p> : null}
          </div>
        ) : !hasCards ? (
          <div className="talent-generate-area">
            <button
              type="button"
              className="talent-generate-button"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles size={18} />
              AI 生成我的牌组
            </button>
            {genError ? <p className="talent-gen-error">{genError}</p> : null}
            <p className="talent-gen-hint">基于命盘计算层结果（格局、四化、宫位评分），生成个性化卡牌。</p>
          </div>
        ) : (
          <div className="career-hero-status">
            <button type="button" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={14} />{isGenerating ? '生成中…' : '重新生成'}
            </button>
          </div>
        )}
      </header>

      {hasCards ? (
        <section className="career-section talent-section">
          <div className="talent-card-rows">
            {([
              ['优势', giftCards],
              ['弱点', shadowCards],
            ] as Array<[string, typeof cards]>).map(([title, rowCards]) => (
              <div key={title} className={`talent-card-row talent-card-row--${title === '优势' ? 'gift' : 'shadow'}`}>
                <div className="talent-row-label">{title}</div>
                <div className="talent-card-grid">
                  {rowCards.map(({ baseId, card }, index) => {
                    const globalIndex = title === '优势' ? index : index + 3
                    const isDealt = globalIndex < dealtCount
                    const isFlipped = Boolean(state.flipped[baseId])
                    const feedback = state.feedback[baseId]

                    return (
                      <article
                        key={baseId}
                        className={`talent-card is-${card.kind} ${isFlipped ? 'is-flipped' : ''} ${isDealt ? 'is-dealt' : ''}`}
                        style={{ animationDelay: `${globalIndex * 0.18}s` }}
                      >
                        <button type="button" className="talent-card-face talent-card-back" onClick={() => flipCard(baseId)}>
                          <small>{card.kind === 'gift' ? 'Gift' : 'Shadow'}</small>
                          <strong>{card.kind === 'gift' ? '优势牌' : '弱点牌'}</strong>
                          <span>点击翻开</span>
                        </button>

                        <div className="talent-card-face talent-card-front">
                          <div className="talent-card-topline">
                            <span />
                            {state.rerollCursor[baseId] ? <em><Shuffle size={12} />已重抽</em> : null}
                          </div>
                          <h3>{card.title}</h3>
                          <p>{card.description}</p>
                          <button type="button" className="talent-detail-trigger" onClick={() => openDetail(baseId)}>
                            查看详情
                          </button>
                          <blockquote>{card.hint}</blockquote>
                          <div className="talent-feedback" aria-label={`评价：${card.title}`}>
                            {feedbackButtons(baseId, feedback)}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {allFlipped ? (
        <div className="talent-action-bar">
          <p className="talent-action-hint">全部翻完，想继续深入理解自己？</p>
          <div className="talent-action-buttons">
            {([
              {
                label: '我该如何扬长避短？',
                question: '根据上述命盘和牌组反馈，帮我分析在实际工作和生活中如何扬长避短。',
              },
              {
                label: '工作生活中如何提升自己？',
                question: '根据上述命盘和牌组反馈，帮我分析在工作生活中如何系统性提升自己，给出具体可执行的建议。',
              },
              {
                label: '给我定一个七步改命计划',
                question: '根据上述命盘和牌组反馈，给我制定一个7步改命计划，每一步要有具体行动和预期结果。',
              },
            ] as Array<{ label: string; question: string }>).map(({ label, question }) => (
              <button
                key={label}
                type="button"
                className="talent-action-button"
                onClick={() => {
                  const parts: string[] = []

                  // 1. 命盘底稿
                  if (chartModel) {
                    parts.push('## 命盘底稿')
                    parts.push(`来因宫：${chartModel.laiyinGong}`)
                    const bazi = chartModel.bazi
                    if (bazi) {
                      parts.push(`八字：${bazi.year} ${bazi.month} ${bazi.day}${bazi.hour ? ` ${bazi.hour}` : ''}`)
                    }
                    parts.push(`命宫：${chartModel.palaces.find(p => p.name === '命宫')?.mainStar.join('、') || '待定'}`)
                    parts.push(`身宫：${chartModel.basicInfo.shenGong}`)
                    parts.push(`生年四化：${chartModel.shengNianSiHua.map(x => `${x.star}化${x.type}落${x.palace}`).join('、')}`)
                    parts.push('')
                  }

                  // 2. 牌组反馈
                  parts.push('## 牌组反馈')
                  const likedGifts = giftCards.filter(({ baseId }) => state.feedback[baseId] === 'reason').map(({ card }) => card.title)
                  const likedShadows = shadowCards.filter(({ baseId }) => state.feedback[baseId] === 'reason').map(({ card }) => card.title)
                  const mehCards = cards.filter(({ baseId }) => state.feedback[baseId] === 'meh').map(({ card }) => card.title)

                  if (likedGifts.length) parts.push(`认可的优势：${likedGifts.join('、')}`)
                  if (likedShadows.length) parts.push(`认可的弱点：${likedShadows.join('、')}`)
                  if (mehCards.length) parts.push(`没感觉的牌：${mehCards.join('、')}`)
                  parts.push('')

                  // 3. 计算层结果
                  if (overallAnalysis) {
                    parts.push('## 计算层结果')
                    if (overallAnalysis.patterns.length) {
                      parts.push(`命中格局：${overallAnalysis.patterns.map(p => p.name).join('、')}`)
                    }
                    const n = overallAnalysis.natalSiHua
                    if (n?.distribution) parts.push(`四化分布：${n.distribution}`)
                    if (n?.zhenJiaLu) parts.push(`真假禄：${n.zhenJiaLu.grade}`)
                    const problems = overallAnalysis.palaceScores.filter(s => s.quadrant === '病灶型' || s.quality.grade === '差')
                    if (problems.length) parts.push(`问题宫位：${problems.map(s => `${s.palace}(${s.quadrant})`).join('、')}`)
                    parts.push('')
                  }

                  // 4. 用户问题
                  parts.push('## 用户问题')
                  parts.push(question)

                  onAskExplore?.(parts.join('\n'))
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {detailCard ? (() => {
        const { baseId, card } = detailCard
        const feedback = state.feedback[baseId]
        return (
          <div className="talent-detail-overlay" role="dialog" aria-modal="true" aria-label={`${card.title}详情`} onClick={() => setDetailCardId(null)}>
            <article
              className={`talent-detail-card is-${card.kind}`}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleDetailTouchStart}
              onTouchEnd={handleDetailTouchEnd}
            >
              <button type="button" className="talent-detail-close" onClick={() => setDetailCardId(null)} aria-label="关闭详情">
                <X size={18} />
              </button>
              <div className="talent-detail-content">
                <p className="talent-detail-kicker">{card.kind === 'gift' ? '优势牌' : '弱点牌'}</p>
                <h2>{card.title}</h2>
                <section>
                  <h3>完整说明</h3>
                  <p>{card.description}</p>
                </section>
              </div>
              <div className="talent-detail-bottom">
                <div className="talent-swipe-hint" aria-label="滑动切换卡牌">
                  <span className="talent-swipe-arrow talent-swipe-arrow--left">←</span>
                  <span>滑动切换卡牌</span>
                  <span className="talent-swipe-arrow talent-swipe-arrow--right">→</span>
                </div>
                <div className="talent-detail-feedback" aria-label={`评价：${card.title}`}>
                  {feedbackButtons(baseId, feedback, 19)}
                </div>
              </div>
            </article>
            {toast ? <div className="talent-toast" role="status">{toast}</div> : null}
          </div>
        )
      })() : null}
    </div>
  )
}
