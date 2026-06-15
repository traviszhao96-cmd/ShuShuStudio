import type { AlertItem, OverallResult, PalaceResult } from '../analysis/types'
import type { SihuaRiskPalace, WorkspaceMode, ZiweiInsightPayload } from '../types'

type AnalysisLine = {
  label: string
  body: string
  weight?: 'primary' | 'secondary' | 'validation'
}

type InsightSidebarProps = {
  risks?: SihuaRiskPalace[]
  mode: WorkspaceMode
  insights?: ZiweiInsightPayload | null
  overallAnalysis?: OverallResult | null
  selectedPalace?: PalaceResult | null
  onBackToOverview?: () => void
}

function LineList({ points }: { points: AnalysisLine[] }) {
  return (
    <ul>
      {points.map((point) => (
        <li key={`${point.label}-${point.body}`} data-weight={point.weight ?? 'secondary'}>
          <strong>{point.label}</strong>
          <span>{point.body}</span>
        </li>
      ))}
    </ul>
  )
}

function AlertList({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) {
    return <p className="risk-empty-text">当前没有形成高优先级警示。</p>
  }

  return (
    <ul className="analysis-alert-list">
      {alerts.map((alert) => (
        <li key={`${alert.category}-${alert.description}`} data-severity={alert.severity}>
          <strong>{alert.category}</strong>
          <span>{alert.description}</span>
        </li>
      ))}
    </ul>
  )
}

function OverallPatternPanel({ overall }: { overall: OverallResult }) {
  return (
    <section className="feature-card palace-detail-panel" data-slot="overall-pattern">
      <p className="section-kicker">Overall Pattern</p>
      <h2>格局总览</h2>

      <div className="palace-detail-meta">
        <span>来因 {overall.laiyinGong}</span>
      </div>

      <div className="skill-insight-panel">
        <section className="skill-insight-block palace-detail-block">
          <strong>来因宫</strong>
          <LineList
            points={[
              {
                label: overall.laiyinGong,
                body: overall.laiyinInterpretation,
                weight: 'primary',
              },
            ]}
          />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>四化人格</strong>
          <LineList
            points={[
              {
                label: overall.personalityType,
                body: overall.personalityTags.length > 0 ? overall.personalityTags.join('；') : '当前还没有足够四化人格标签。',
                weight: 'primary',
              },
            ]}
          />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>关键结论</strong>
          <LineList points={overall.highlights.map((item, index) => ({ label: `#${index + 1}`, body: item }))} />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>关键警示</strong>
          <AlertList alerts={overall.alerts} />
        </section>
      </div>
    </section>
  )
}

function PalaceDetailPanel({
  palace,
  onBackToOverview,
}: {
  palace: PalaceResult
  onBackToOverview?: () => void
}) {
  const flowPoints: AnalysisLine[] = [
    ...(palace.flowAnalysis?.outgoing ?? []).map((item) => ({ label: '飞出', body: item })),
    ...(palace.flowAnalysis?.incoming ?? []).map((item) => ({ label: '飞入', body: item })),
  ]

  return (
    <section className="feature-card palace-detail-panel" data-slot="palace-detail">
      <button type="button" className="analysis-back-button" onClick={onBackToOverview}>
        ← 返回格局总览
      </button>

      <p className="section-kicker">Palace Detail</p>
      <h2>
        {palace.palace}
        <span>
          第{palace.basics.number}宫 · {palace.basics.liuNeiWai} · {palace.basics.heTuGroup}
        </span>
      </h2>

      <div className="palace-detail-meta">
        <span>对宫 {palace.sanFangSiZheng.duiGong}</span>
        <span>三方 {palace.sanFangSiZheng.left}</span>
        <span>三方 {palace.sanFangSiZheng.right}</span>
      </div>

      <div className="skill-insight-panel">
        <section className="skill-insight-block palace-detail-block">
          <strong>宫位本义</strong>
          <LineList
            points={[
              { label: '主旨', body: palace.basics.primary, weight: 'primary' },
              ...palace.basics.layers.map((layer) => ({ label: layer.label, body: layer.meaning })),
            ]}
          />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>四化效应</strong>
          <LineList
            points={
              palace.siHuaHere.length > 0
                ? palace.siHuaHere.map((item) => ({
                    label: `${item.star}化${item.type}`,
                    body: item.meaning,
                    weight: item.severity === 'warning' ? 'primary' : 'secondary',
                  }))
                : [{ label: '未见直接四化', body: '此宫暂未承接直接四化，优先看对宫、三方与飞入飞出。' }]
            }
          />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>转宫视角</strong>
          <LineList points={palace.zhuanGong.map((item) => ({ label: item.as, body: `${item.meaning}${item.implication}` }))} />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>能量流向</strong>
          <LineList points={flowPoints.length > 0 ? flowPoints : [{ label: '暂无', body: '当前没有读到直接飞入飞出。' }]} />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>对宫三方</strong>
          <LineList
            points={[
              { label: '本对宫', body: palace.duiGongRelation, weight: 'primary' },
              {
                label: '三方四正',
                body: `${palace.palace}、${palace.sanFangSiZheng.duiGong}、${palace.sanFangSiZheng.left}、${palace.sanFangSiZheng.right} 共同构成这一宫的结构场。`,
              },
            ]}
          />
        </section>

        <section className="skill-insight-block palace-detail-block">
          <strong>警示</strong>
          <AlertList alerts={palace.alerts} />
        </section>
      </div>
    </section>
  )
}

export function InsightSidebar({
  risks = [],
  mode,
  insights,
  overallAnalysis,
  selectedPalace,
  onBackToOverview,
}: InsightSidebarProps) {
  if ((mode === 'sihua' || mode === 'circle') && selectedPalace) {
    return (
      <aside className="insight-column" data-slot="insight-column">
        <PalaceDetailPanel palace={selectedPalace} onBackToOverview={onBackToOverview} />
      </aside>
    )
  }

  if ((mode === 'sihua' || mode === 'circle' || mode === 'analysis') && overallAnalysis) {
    return (
      <aside className="insight-column" data-slot="insight-column">
        <OverallPatternPanel overall={overallAnalysis} />
      </aside>
    )
  }

  return (
    <aside className="insight-column" data-slot="insight-column">
      {mode === 'sihua' ? (
        <section className="feature-card risk-card-panel" data-slot="insight-risk">
          <p className="section-kicker">Risk Focus</p>
          <h2>高风险宫位</h2>
          {risks.length > 0 ? (
            <div className="risk-palace-list">
              {risks.map((risk) => (
                <article key={risk.palace} className="risk-palace-item">
                  <div className="risk-palace-head">
                    <strong>{risk.palace}</strong>
                    <span>
                      对宫 {risk.opposite} · {risk.palaceType}
                    </span>
                  </div>
                  <p className="risk-palace-stars">
                    主星：{risk.majorStars.length > 0 ? risk.majorStars.join('、') : '无主星'}
                  </p>
                  <ul>
                    {risk.reasons.slice(0, 3).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <p className="risk-empty-text">当前命例还没有汇总出可展示的高风险宫位。</p>
          )}
        </section>
      ) : null}

      <section className="feature-card" data-slot="insight-feature">
        <p className="section-kicker">Ziwei Doushu Skill</p>
        <h2>{mode === 'bazi' ? '八字分析参考' : '论命规则输出'}</h2>
        {insights ? (
          <div className="skill-insight-panel">
            <section className="skill-insight-block">
              <strong>{insights.headline}</strong>
              <p>{insights.summary}</p>
            </section>

            {insights.sections.map((section) => (
              <section key={section.title} className="skill-insight-block">
                <strong>{section.title}</strong>
                <ul>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="skill-insight-block">
              <strong>方法依据</strong>
              <ul>
                {insights.methodology.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <p className="risk-empty-text">当前还没有生成可展示的论命规则输出。</p>
        )}
      </section>
    </aside>
  )
}
