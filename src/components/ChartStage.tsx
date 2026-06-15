import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Iztrolabe } from 'react-iztro'
import type { TopicName } from '../analysis/types'
import type { ChartConfig, WorkspaceMode } from '../types'
import { AnalysisTopics } from './AnalysisTopics'
import { BaziChart } from './BaziChart'
import { CareerPlanner } from './CareerPlanner'
import { CircularAstrolabe } from './CircularAstrolabe'
import { SihuaAstrolabe } from './SihuaAstrolabe'
import { getLatestReport } from '../agent/reportStore'
import { parseReport } from '../agent/topicPrompts'

const TOPIC_ORDER: TopicName[] = ['个性', '事业', '财富', '婚姻', '健康']

type TimelineOverlay = {
  displayMode: 'decade' | 'yearly'
  activeYear: number
  decadalPalaceLabelsByPalace: Map<number, string>
  decadeYearLabelsByPalace: Map<number, string>
  yearlyPalaceLabelsByPalace: Map<number, string>
}

type ChartStageProps = {
  config: ChartConfig
  mode: WorkspaceMode
  onChangeMode: (mode: WorkspaceMode) => void
  onEnterCharts: () => void
  onBackToAnalysis: () => void
  headerRight?: ReactNode
  timelineOverlay?: TimelineOverlay
  selectedPalaceIndex?: number | null
  onSelectPalace?: (palaceIndex: number | null) => void
  chartModel?: import('../analysis/types').ChartModel | null
  activeCaseId?: string
  activeCaseName?: string
  onRequireAnalysisLogin?: () => boolean
}

const modeItems: Array<{ value: Exclude<WorkspaceMode, 'analysis'>; label: string }> = [
  { value: 'sanhe', label: '三合' },
  { value: 'sihua', label: '四化' },
  { value: 'circle', label: '圆盘' },
  { value: 'bazi', label: '八字' },
]

export function ChartStage({
  config,
  mode,
  onChangeMode,
  onEnterCharts,
  onBackToAnalysis,
  headerRight,
  timelineOverlay,
  selectedPalaceIndex = null,
  onSelectPalace,
  chartModel = null,
  activeCaseId,
  activeCaseName = '当前用户',
  onRequireAnalysisLogin,
}: ChartStageProps) {
  const [triggerGenerate, setTriggerGenerate] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleGenerateClick = () => {
    if (onRequireAnalysisLogin && !onRequireAnalysisLogin()) return
    if (activeCaseId) {
      const existing = getLatestReport(activeCaseId)
      if (existing) {
        setShowConfirm(true)
        return
      }
    }
    setTriggerGenerate((n) => n + 1)
  }

  const handleConfirmGenerate = () => {
    if (onRequireAnalysisLogin && !onRequireAnalysisLogin()) return
    setShowConfirm(false)
    setTriggerGenerate((n) => n + 1)
  }
  return (
    <section className={`chart-stage ${mode === 'career' ? 'chart-stage--career' : ''}`} data-slot="chart-stage">
      {showConfirm && activeCaseId ? (() => {
        const existing = getLatestReport(activeCaseId)
        return (
          <div className="ai-confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="ai-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <p className="ai-confirm-title">重新生成报告</p>
              <p className="ai-confirm-body">
                当前已有报告{existing ? `（${new Date(existing.generatedAt).toLocaleString('zh-CN')}）` : ''}，需要重新生成吗？
              </p>
              <div className="ai-confirm-actions">
                <button type="button" className="ai-confirm-btn ai-confirm-btn--secondary" onClick={() => setShowConfirm(false)}>取消</button>
                <button type="button" className="ai-confirm-btn ai-confirm-btn--primary" onClick={handleConfirmGenerate}>重新生成</button>
              </div>
            </div>
          </div>
        )
      })() : null}
      {mode !== 'career' ? <div className="panel-heading" data-slot="chart-header">
        <div className="chart-heading-main" data-slot="chart-header-left">
          {mode !== 'analysis' ? (
            <button type="button" className="chart-back-button" onClick={onBackToAnalysis} aria-label="返回分析">
              <span aria-hidden="true">←</span>
            </button>
          ) : null}
          <div>
          <p className="section-kicker">Live Astrolabe</p>
          <h2>
            {mode === 'analysis'
              ? '分析报告'
              : mode === 'sanhe'
                ? '三合舞台'
                : mode === 'sihua'
                  ? '四化舞台'
                  : mode === 'circle'
                    ? '圆盘四化'
                    : '八字舞台'}
          </h2>
          </div>
        </div>

        <div className="chart-header-actions">
          {mode === 'analysis' ? (
            <>
              <button
                type="button"
                className="ai-generate-btn"
                onClick={handleGenerateClick}
                disabled={!chartModel}
              >
                <span className="ai-generate-btn-icon">
                  <svg width="18" height="18" viewBox="0 0 1024 1024">
                    <rect width="1024" height="1024" rx="240" fill="#F3E4CC"/>
                    <g fill="none" stroke="#265C4F" strokeWidth="44">
                      <ellipse cx="512" cy="512" rx="312" ry="128"/>
                      <ellipse cx="512" cy="512" rx="312" ry="128" transform="rotate(60 512 512)"/>
                      <ellipse cx="512" cy="512" rx="312" ry="128" transform="rotate(-60 512 512)"/>
                    </g>
                    <circle cx="512" cy="512" r="68" fill="#B16039"/>
                  </svg>
                </span>
                开始分析
              </button>
              <button type="button" className="enter-chart-button" onClick={onEnterCharts}>
                命盘
                <span aria-hidden="true">→</span>
              </button>
              {activeCaseName === '赵' ? (
                <button type="button" className="enter-chart-button career-entry-button" onClick={() => onChangeMode('career')}>
                  职业规划
                  <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </>
          ) : (
            <div className="chart-mode-tabs" data-slot="chart-mode-tabs">
              {modeItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`chart-mode-tab ${mode === item.value ? 'is-active' : ''}`}
                  onClick={() => onChangeMode(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {headerRight}
        </div>
      </div> : null}

      {mode === 'career' ? (
        <CareerPlanner
          caseId={activeCaseId ?? 'no-case'}
          caseName={activeCaseName}
          chartModel={chartModel}
        />
      ) : mode === 'analysis' ? (
        <AnalysisTopics
          key={activeCaseId ?? 'no-case'}
          chartModel={chartModel}
          activeCaseId={activeCaseId}
          triggerGenerate={triggerGenerate}
        />
      ) : mode === 'sanhe' ? (
        <div className="chart-frame chart-frame--sanhe" data-slot="chart-canvas">
          <div className="sanhe-chart-scroll">
            <div className="sanhe-chart-square">
              <Iztrolabe
                birthday={config.birthday}
                birthTime={config.birthTime}
                birthdayType={config.birthdayType}
                gender={config.gender}
                centerPalaceAlign
                horoscopeDate={new Date(`${timelineOverlay?.activeYear ?? 2026}-06-01T12:00:00`)}
                horoscopeHour={config.birthTime}
              />
            </div>
          </div>
        </div>
      ) : mode === 'sihua' ? (
        <div className="chart-frame chart-frame--sihua" data-slot="chart-canvas">
          <div className="chart-mode-note">
            <p className="section-kicker">Sihua Focus</p>
            <p>
              这里是四化专用命盘。鼠标停留宫位即可查看该宫天干四化，并用禄绿、权紫、科蓝、忌红高亮对应因化落点；
              星曜旁短线看离心，对宫射入的长线看向心。
            </p>
          </div>
          <SihuaAstrolabe
            key={`${config.birthday}-${config.birthTime}-${config.birthdayType}-${config.gender}`}
            config={config}
            timelineOverlay={timelineOverlay}
            selectedPalaceIndex={selectedPalaceIndex}
            onSelectPalace={onSelectPalace}
          />
        </div>
      ) : mode === 'circle' ? (
        <div className="chart-frame chart-frame--circular" data-slot="chart-canvas">
          <div className="chart-mode-note">
            <p className="section-kicker">Circular Focus</p>
            <p>十二宫沿圆周展开，点选宫位查看三方四正；生年四化与向心、离心自化共同显示在圆盘中。</p>
          </div>
          <CircularAstrolabe
            key={`${config.birthday}-${config.birthTime}-${config.birthdayType}-${config.gender}`}
            config={config}
            timelineOverlay={timelineOverlay}
            selectedPalaceIndex={selectedPalaceIndex}
            onSelectPalace={onSelectPalace}
          />
        </div>
      ) : (
        <div className="analysis-stage bazi-stage" data-slot="chart-canvas">
          <BaziChart config={config} />
        </div>
      )}
    </section>
  )
}

export function ChartBottomAnalysis({ caseId, source }: { caseId: string; source: 'ziwei' | 'bazi' }) {
  const [topic, setTopic] = useState<TopicName>('个性')
  const sectionRefs = useRef<Map<TopicName, HTMLElement>>(new Map())

  const report = useMemo(() => getLatestReport(caseId), [caseId])
  const sourceReports = report?.sources?.[source] as Record<string, string> | undefined
  const parsedTopics = useMemo(() => TOPIC_ORDER.map((name) => {
    const raw = sourceReports?.[name] ?? ''
    return { name, parsed: raw ? parseReport(raw) : null }
  }), [sourceReports])
  const hasSourceReport = parsedTopics.some(({ parsed }) => parsed && parsed.sections.length > 0)

  useEffect(() => {
    if (!hasSourceReport) return

    const updateTopic = () => {
      let nextTopic = TOPIC_ORDER[0]
      for (const name of TOPIC_ORDER) {
        const section = sectionRefs.current.get(name)
        if (section && section.getBoundingClientRect().top <= 150) nextTopic = name
      }
      setTopic((current) => current === nextTopic ? current : nextTopic)
    }

    updateTopic()
    window.addEventListener('scroll', updateTopic, { passive: true })
    return () => window.removeEventListener('scroll', updateTopic)
  }, [hasSourceReport])

  if (!report || !hasSourceReport) return null

  const scrollToTopic = (name: TopicName) => {
    setTopic(name)
    sectionRefs.current.get(name)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <article className="chart-module-report">
      <header className="chart-module-report-header">
        <p className="section-kicker">{source === 'ziwei' ? 'Ziwei Report' : 'Bazi Report'}</p>
        <h2>{source === 'ziwei' ? '紫微斗数专题报告' : '四柱八字专题报告'}</h2>
        <p>本报告来自分析模式中生成的{source === 'ziwei' ? '紫微斗数' : '四柱八字'}独立分析。</p>
      </header>

      <nav className="analysis-topic-tabs chart-module-report-tabs" aria-label={`${source === 'ziwei' ? '紫微斗数' : '四柱八字'}报告章节`}>
        {TOPIC_ORDER.map((name) => (
          <button key={name} type="button" className={`analysis-topic-tab ${topic === name ? 'is-active' : ''}`}
            aria-current={topic === name ? 'true' : undefined}
            onClick={() => scrollToTopic(name)}>{name}</button>
        ))}
      </nav>

      <div className="chart-module-report-article">
        {parsedTopics.map(({ name, parsed }) => (
          <section key={name} className="chart-module-report-section"
            ref={(element) => {
              if (element) sectionRefs.current.set(name, element)
              else sectionRefs.current.delete(name)
            }}>
            <p className="ai-report-topic-label">{name}</p>
            <h3>{parsed?.headline || name}</h3>
            {parsed?.sections.map((section, index) => (
              <div key={index} className="chart-module-report-point">
                {section.conclusion ? <p>{section.conclusion}</p> : null}
                {section.facts ? <p className="ai-report-facts">{section.facts}</p> : null}
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  )
}
