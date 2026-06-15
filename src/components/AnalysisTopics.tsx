import { useCallback, useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { ImageDown } from 'lucide-react'
import type { TopicName } from '../analysis/types'
import {
  buildZiweiOnlyPrompt, buildBaziOnlyPrompt, buildMergePrompt,
  parseReport, splitBulkResponse, type ParsedReport,
} from '../agent/topicPrompts'
import { loadAgentApiSettings, requestAgentReply } from '../agent/modelClient'
import {
  getLatestReport, saveReport,
  type AgentReport, type ReportSources,
} from '../agent/reportStore'
import type { ChartModel } from '../analysis/types'

const TOPIC_ORDER: TopicName[] = ['个性', '事业', '财富', '婚姻', '健康']
const REPORT_VERSION = 'v5'
const REPORT_GENERATION_SESSION_KEY = 'ssmaster-consumed-report-generations'
const activeReportGenerations = new Set<string>()

type AnalysisTopicsProps = {
  chartModel?: ChartModel | null
  activeCaseId?: string
  triggerGenerate?: number
}

type AIState = {
  loading: boolean
  step: string
  error: string | null
}

export function AnalysisTopics({ chartModel, activeCaseId, triggerGenerate = 0 }: AnalysisTopicsProps) {
  const [activeTopic, setActiveTopic] = useState<TopicName>('个性')
  const [report, setReport] = useState<AgentReport | null>(() => activeCaseId ? getLatestReport(activeCaseId) : null)
  const [aiState, setAiState] = useState<AIState>({ loading: false, step: '', error: null })
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [isExportingImage, setIsExportingImage] = useState(false)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastGenerateTriggerRef = useRef(triggerGenerate)

  useEffect(() => {
    if (!report) return

    const updateActiveTopic = () => {
      const activationLine = 150
      let nextTopic = TOPIC_ORDER[0]
      const isAtPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (isAtPageEnd) {
        setActiveTopic((current) => current === TOPIC_ORDER[TOPIC_ORDER.length - 1] ? current : TOPIC_ORDER[TOPIC_ORDER.length - 1])
        return
      }
      for (const topic of TOPIC_ORDER) {
        const section = sectionRefs.current.get(topic)
        if (section && section.getBoundingClientRect().top <= activationLine) nextTopic = topic
      }
      setActiveTopic((current) => current === nextTopic ? current : nextTopic)
    }

    updateActiveTopic()
    window.addEventListener('scroll', updateActiveTopic, { passive: true })
    window.addEventListener('resize', updateActiveTopic)
    return () => {
      window.removeEventListener('scroll', updateActiveTopic)
      window.removeEventListener('resize', updateActiveTopic)
    }
  }, [report])

  const scrollToTopic = (topic: TopicName) => {
    setActiveTopic(topic)
    const el = sectionRefs.current.get(topic)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const generateAll = useCallback(async () => {
    if (!chartModel || !activeCaseId) return
    if (activeReportGenerations.has(activeCaseId)) return
    activeReportGenerations.add(activeCaseId)
    const settings = loadAgentApiSettings()

    let wakeLock: WakeLockSentinel | null = null
    try {
      // Keep screen on during report generation (prevents network drop on background)
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen')
        } catch {
          // Wake Lock not available
        }
      }

      setAiState({ loading: true, step: '正在分析紫微斗数…', error: null })
      const ziwiPrompt = buildZiweiOnlyPrompt(chartModel)
      const ziwiRaw = await requestAgentReply({ settings, contextMarkdown: ziwiPrompt, messages: [{ role: 'user', content: '请分析五个专题。' }], modelOverride: 'deepseek-v4-flash' })

      let baziRaw = ''
      setAiState({ loading: true, step: '正在分析四柱八字…', error: null })
      const baziPrompt = buildBaziOnlyPrompt(chartModel)
      if (baziPrompt) {
        baziRaw = await requestAgentReply({ settings, contextMarkdown: baziPrompt, messages: [{ role: 'user', content: '请分析五个专题。' }], modelOverride: 'deepseek-v4-flash' })
      }

      setAiState({ loading: true, step: '正在整合分析报告…', error: null })
      const mergePrompt = buildMergePrompt(ziwiRaw, baziRaw)
      const mergedRaw = await requestAgentReply({ settings, contextMarkdown: mergePrompt, messages: [{ role: 'user', content: '请整合。' }], modelOverride: 'deepseek-v4-pro' })

      const mergedBlocks = splitBulkResponse(mergedRaw)
      const ziweiBlocks = splitBulkResponse(ziwiRaw)
      const baziBlocks = splitBulkResponse(baziRaw)

      const topicResults: Record<string, { headline: string; content: string; parsed: ParsedReport }> = {}
      const ziweiOut: Record<string, string> = {}
      const baziOut: Record<string, string> = {}

      for (const topic of TOPIC_ORDER) {
        const block = mergedBlocks[topic] || ''
        topicResults[topic] = { headline: '', content: block, parsed: parseReport(block) }
        ziweiOut[topic] = ziweiBlocks[topic] || ''
        baziOut[topic] = baziBlocks[topic] || ''
      }

      const sources: ReportSources = { ziwei: ziweiOut, bazi: baziOut, merged: topicResults }
      const saved = saveReport(activeCaseId, REPORT_VERSION, topicResults, sources)
      setReport(saved)
      setAiState({ loading: false, step: '', error: null })
    } catch (err) {
      setAiState({ loading: false, step: '', error: (err as Error).message })
    } finally {
      // Release wake lock
      if (wakeLock) {
        try { await wakeLock.release() } catch { /* ignore */ }
      }
      activeReportGenerations.delete(activeCaseId)
    }
  }, [chartModel, activeCaseId])

  useEffect(() => {
    if (triggerGenerate <= lastGenerateTriggerRef.current) return
    lastGenerateTriggerRef.current = triggerGenerate

    const requestKey = `${activeCaseId ?? 'no-case'}:${triggerGenerate}`
    try {
      const consumed = new Set<string>(
        JSON.parse(window.sessionStorage.getItem(REPORT_GENERATION_SESSION_KEY) ?? '[]') as string[],
      )
      if (consumed.has(requestKey)) return
      consumed.add(requestKey)
      window.sessionStorage.setItem(REPORT_GENERATION_SESSION_KEY, JSON.stringify([...consumed].slice(-100)))
    } catch {
      // The in-memory lock below still prevents overlapping generation.
    }

    if (aiState.loading || (activeCaseId && activeReportGenerations.has(activeCaseId))) return
    const timeout = window.setTimeout(() => void generateAll(), 0)
    return () => window.clearTimeout(timeout)
  }, [activeCaseId, aiState.loading, generateAll, triggerGenerate])

  const handleExportImage = async () => {
    const el = scrollContainerRef.current
    if (!el || isExportingImage) return
    setIsExportingImage(true)
    setExportMessage(null)

    try {
      const isNative = Capacitor.isNativePlatform()
      const canvas = await html2canvas(el, {
        backgroundColor: '#faf7f2',
        scale: isNative ? Math.min(window.devicePixelRatio, 2) : 2,
        onclone: (documentClone) => {
          documentClone
            .querySelectorAll('.ai-report-meta-row, .ai-report-export-image-button')
            .forEach((element) => element.remove())
        },
      })
      const filename = `ssmaster-report-${new Date().toISOString().slice(0, 10)}.png`

      if (isNative) {
        const base64 = canvas.toDataURL('image/png').split(',')[1]
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        })
        await Share.share({
          title: '导出分析报告图片',
          files: [result.uri],
          dialogTitle: '保存或分享报告图片',
        })
        return
      }

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('图片生成失败')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      setExportMessage(`图片导出失败：${(err as Error).message}`)
      window.setTimeout(() => setExportMessage(null), 4000)
    } finally {
      setIsExportingImage(false)
    }
  }

  const hasReport = report !== null

  const getTopicContent = (topic: TopicName) => {
    return report?.topics[topic]?.parsed ?? null
  }

  return (
    <div className="analysis-topic-stage" data-slot="analysis-topics">
      <div ref={scrollContainerRef} className="analysis-report-scroll">
        {aiState.loading ? (
          <div className="ai-loading">
            <span className="ai-loading-spinner" />
            <div>
              <p className="ai-loading-title">正在生成报告</p>
              <p className="ai-loading-step">{aiState.step}</p>
            </div>
          </div>
        ) : aiState.error ? (
          <div className="ai-error"><p>生成失败：{aiState.error}</p><button type="button" onClick={generateAll}>重试</button></div>
        ) : hasReport ? (
          <article className="analysis-report-paper">
            <nav className="analysis-topic-tabs analysis-topic-tabs--sticky" aria-label="报告章节">
              {TOPIC_ORDER.map((topic) => (
                <button key={topic} type="button" className={`analysis-topic-tab ${activeTopic === topic ? 'is-active' : ''}`}
                  aria-current={activeTopic === topic ? 'true' : undefined}
                  onClick={() => scrollToTopic(topic)}>{topic}</button>
              ))}
            </nav>
            <div className="analysis-report-article">
              {TOPIC_ORDER.map((topic) => {
                const parsed = getTopicContent(topic)
                return (
                  <section key={topic} className="ai-report-section" data-topic={topic}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(topic, el)
                      else sectionRefs.current.delete(topic)
                    }}>
                    <p className="ai-report-topic-label">{topic}</p>
                    {parsed ? (
                      <>
                        <h2 className="ai-report-headline">{parsed.headline || topic}</h2>
                        <div className="ai-report-content">
                        {parsed.sections.map((sec, i) => (
                          <div key={i}>
                            {sec.conclusion ? (
                              <div className="ai-report-markdown" dangerouslySetInnerHTML={{ __html: mdToHtml(sec.conclusion) }} />
                            ) : null}
                            {sec.facts ? <p className="ai-report-facts">{sec.facts}</p> : null}
                          </div>
                        ))}
                        </div>
                      </>
                    ) : (
                      <p className="ai-report-empty">暂无「{topic}」分析</p>
                    )}
                  </section>
                )
              })}
              <div className="ai-report-meta-row">
                <p className="ai-report-meta">{REPORT_VERSION} · {new Date(report!.generatedAt).toLocaleString('zh-CN')}</p>
                {exportMessage ? <span className="ai-export-message">{exportMessage}</span> : null}
              </div>
              <button
                type="button"
                className="ai-report-export-image-button"
                onClick={handleExportImage}
                disabled={isExportingImage}
              >
                <span className="ai-report-export-image-icon" aria-hidden="true">
                  <ImageDown size={20} strokeWidth={1.8} />
                </span>
                <span>
                  <strong>{isExportingImage ? '正在生成报告图片' : '导出为图片'}</strong>
                  <small>{isExportingImage ? '请稍候，不要重复点击' : '保存或分享完整分析报告'}</small>
                </span>
              </button>
            </div>
          </article>
        ) : (
          <div className="ai-report-empty"><p>点击右上角「开始分析」生成 AI 报告</p></div>
        )}
      </div>
    </div>
  )
}

function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
  html = '<p>' + html + '</p>'
  html = html.replace(/<p><h([234])>/g, '<h$1>').replace(/<\/h([234])><\/p>/g, '</h$1>')
  html = html.replace(/<p>\s*<br\/>\s*<\/p>/g, '')
  return html
}
