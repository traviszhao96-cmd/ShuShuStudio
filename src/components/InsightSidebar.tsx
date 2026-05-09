import type { SihuaRiskPalace, WorkspaceMode, ZiweiInsightPayload } from '../types'

type InsightSidebarProps = {
  risks?: SihuaRiskPalace[]
  mode: WorkspaceMode
  insights?: ZiweiInsightPayload | null
}

export function InsightSidebar({ risks = [], mode, insights }: InsightSidebarProps) {
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
