import { useState } from 'react'
import type { TopicName, TopicResult } from '../analysis/types'

const TOPIC_ORDER: TopicName[] = ['个性', '家庭', '学业', '婚姻', '交友', '事业', '财富', '健康']

type AnalysisTopicsProps = {
  topics: TopicResult[]
}

export function AnalysisTopics({ topics }: AnalysisTopicsProps) {
  const [activeTopic, setActiveTopic] = useState<TopicName>('个性')
  const activeReport = topics.find((item) => item.topic === activeTopic) ?? topics[0]

  return (
    <div className="analysis-topic-stage" data-slot="analysis-topics">
      <div className="analysis-topic-tabs" aria-label="分析专题">
        {TOPIC_ORDER.map((topic) => (
          <button
            key={topic}
            type="button"
            className={`analysis-topic-tab ${activeReport?.topic === topic ? 'is-active' : ''}`}
            onClick={() => setActiveTopic(topic)}
          >
            {topic}
          </button>
        ))}
      </div>

      {activeReport ? (
        <article className="analysis-topic-report">
          <div className="analysis-topic-heading">
            <p className="section-kicker">Topic Report</p>
            <h3>{activeReport.headline}</h3>
            <p>{activeReport.summary}</p>
          </div>

          <div className="analysis-topic-palaces">
            {activeReport.focusPalaces.map((palace) => (
              <span key={palace}>{palace}</span>
            ))}
          </div>

          <div className="analysis-topic-points">
            {activeReport.points.map((point, index) => (
              <section key={`${activeReport.topic}-${index}`}>
                <strong>{index === 0 ? '核心宫位' : index === activeReport.points.length - 1 ? '判断提示' : '联动宫位'}</strong>
                <p>{point}</p>
              </section>
            ))}
          </div>

          {activeReport.alerts.length > 0 ? (
            <div className="analysis-topic-alerts">
              {activeReport.alerts.slice(0, 3).map((alert) => (
                <section key={`${alert.category}-${alert.description}`} data-severity={alert.severity}>
                  <strong>{alert.category}</strong>
                  <p>{alert.description}</p>
                </section>
              ))}
            </div>
          ) : null}
        </article>
      ) : (
        <p className="risk-empty-text">当前命例还没有生成专题分析。</p>
      )}
    </div>
  )
}
