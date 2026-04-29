import type { SihuaRiskPalace, WorkspaceMode } from '../types'

type InsightSidebarProps = {
  risks?: SihuaRiskPalace[]
  mode: WorkspaceMode
}

export function InsightSidebar({ risks = [], mode }: InsightSidebarProps) {
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
        <p className="section-kicker">Skill Pipeline</p>
        <h2>{mode === 'sihua' ? '四化分析输出区' : mode === 'bazi' ? '八字分析输出区' : '三合分析输出区'}</h2>
        <ul>
          <li>核心结论：这里放 skill 归纳后的主轴判断与结论浓缩。</li>
          <li>关键链条：这里放三合结构、四化链路或八字格局的重点。</li>
          <li>待验证点：这里放需要结合经历、六亲或校时补证的项目。</li>
        </ul>
      </section>
    </aside>
  )
}
