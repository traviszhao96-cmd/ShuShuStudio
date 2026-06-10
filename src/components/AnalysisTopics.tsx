import { useCallback, useEffect, useState } from 'react'
import type { TopicName, TopicResult } from '../analysis/types'
import { buildTopicPrompt, parseReport, type ParsedReport } from '../agent/topicPrompts'
import { loadAgentApiSettings, requestAgentReply } from '../agent/modelClient'
import { getLatestReport, saveReport, type AgentReport } from '../agent/reportStore'
import type { ChartModel } from '../analysis/types'

const TOPIC_ORDER: TopicName[] = ['个性', '事业', '财富', '婚姻', '健康']
const REPORT_VERSION = 'v2'

type AnalysisTopicsProps = {
  topics: TopicResult[]
  chartModel?: ChartModel | null
  activeCaseId?: string
  triggerGenerate?: number
}

type AIState = {
  loading: boolean
  error: string | null
}

export function AnalysisTopics({ topics: _topics, chartModel, activeCaseId, triggerGenerate = 0 }: AnalysisTopicsProps) {
  const [activeTopic, setActiveTopic] = useState<TopicName>('个性')
  const [report, setReport] = useState<AgentReport | null>(null)
  const [aiState, setAiState] = useState<AIState>({ loading: false, error: null })
  const [showFacts, setShowFacts] = useState(true)
  const currentParsed: ParsedReport | null = report?.topics[activeTopic]?.parsed ?? null

  useEffect(() => {
    if (activeCaseId) {
      const existing = getLatestReport(activeCaseId)
      setReport(existing)
      setAiState({ loading: false, error: null })
    }
  }, [activeCaseId])

  const generateAll = useCallback(async () => {
    if (!chartModel || !activeCaseId) return
    const settings = loadAgentApiSettings()

    setAiState({ loading: true, error: null })

    try {
      const topicResults: Record<string, { headline: string; content: string; parsed: ParsedReport }> = {}

      for (const topic of TOPIC_ORDER) {
        const prompt = buildTopicPrompt(chartModel, topic)
        const rawReply = await requestAgentReply({
          settings,
          contextMarkdown: prompt,
          messages: [{ role: 'user', content: `请对「${topic}」专题进行分析。` }],
        })
        const parsed = parseReport(rawReply)
        topicResults[topic] = { headline: parsed.headline, content: rawReply, parsed }
      }

      const saved = saveReport(activeCaseId, REPORT_VERSION, topicResults)
      setReport(saved)
      setAiState({ loading: false, error: null })
    } catch (err) {
      setAiState({ loading: false, error: (err as Error).message })
    }
  }, [chartModel, activeCaseId])

  useEffect(() => {
    if (triggerGenerate > 0 && !aiState.loading) {
      generateAll()
    }
  }, [triggerGenerate])

  return (
    <div className="analysis-topic-stage" data-slot="analysis-topics">
      <div className="analysis-topic-tabs" aria-label="分析专题">
        {TOPIC_ORDER.map((topic) => (
          <button
            key={topic}
            type="button"
            className={`analysis-topic-tab ${activeTopic === topic ? 'is-active' : ''}`}
            onClick={() => setActiveTopic(topic)}
          >
            {topic}
          </button>
        ))}
      </div>

      <article className="analysis-topic-report">
        {aiState.loading ? (
          <div className="ai-loading">
            <span className="ai-loading-spinner" />
            <p>AI 正在分析「{activeTopic}」...</p>
          </div>
        ) : null}

        {aiState.error ? (
          <div className="ai-error">
            <p>生成失败：{aiState.error}</p>
            <button type="button" onClick={generateAll}>重试</button>
          </div>
        ) : null}

        {currentParsed ? (
          <div className="ai-report-structured">
            <div className="ai-report-headline-row">
              <h2 className="ai-report-headline">{currentParsed.headline}</h2>
              <label className="facts-toggle">
                <input type="checkbox" checked={showFacts} onChange={(e) => setShowFacts(e.target.checked)} />
                <span className="facts-toggle-label">依据</span>
              </label>
            </div>
            {currentParsed.sections.map((sec, i) => (
              <div key={i} className="ai-report-card">
                <p className="ai-report-conclusion">{sec.conclusion}</p>
                {sec.facts && showFacts ? (
                  <p className="ai-report-facts">{sec.facts}</p>
                ) : null}
              </div>
            ))}
            {report && (
              <p className="ai-report-meta">
                {REPORT_VERSION} · {new Date(report.generatedAt).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        ) : !aiState.loading && !aiState.error ? (
          <div className="ai-report-empty">
            <p>点击右上角「开始分析」生成 AI 报告</p>
          </div>
        ) : null}
      </article>
    </div>
  )
}
