import type { ChartSummary } from '../types'

type InsightSidebarProps = {
  chart: ChartSummary | null
}

export function InsightSidebar({ chart }: InsightSidebarProps) {
  const palaceHighlights = chart?.palaces.slice(0, 4) ?? []

  return (
    <aside className="insight-column" data-slot="insight-column">
      <section className="summary-card" data-slot="insight-summary">
        <p className="section-kicker">Quick Read</p>
        <h2>盘面摘要</h2>

        {chart ? (
          <>
            <div className="stat-grid">
              <article>
                <span>农历</span>
                <strong>{chart.lunarDate}</strong>
              </article>
              <article>
                <span>五行局</span>
                <strong>{chart.fiveElementsClass}</strong>
              </article>
              <article>
                <span>命宫</span>
                <strong>{chart.soulPalace}</strong>
              </article>
              <article>
                <span>身宫</span>
                <strong>{chart.bodyPalace}</strong>
              </article>
              <article>
                <span>命主</span>
                <strong>{chart.soul}</strong>
              </article>
              <article>
                <span>身主</span>
                <strong>{chart.body}</strong>
              </article>
            </div>

            <div className="identity-strip">
              <span>{chart.sign}</span>
              <span>{chart.zodiac}</span>
              <span>{chart.timeRange}</span>
            </div>
          </>
        ) : (
          <p className="error-text">当前输入无法生成命盘，请检查日期和时辰。</p>
        )}
      </section>

      <section className="palace-card" data-slot="insight-palaces">
        <p className="section-kicker">Palace Focus</p>
        <h2>前四宫速览</h2>

        <div className="palace-list">
          {palaceHighlights.map((palace) => (
            <article key={`${palace.name}-${palace.earthlyBranch}`} className="palace-item">
              <div className="palace-title">
                <strong>{palace.name}</strong>
                <span>{palace.earthlyBranch}</span>
              </div>
              <p>{palace.majorStars.join(' / ') || '无主星'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-card" data-slot="insight-feature">
        <p className="section-kicker">Why This Layout</p>
        <h2>这页适合继续往下做什么</h2>
        <ul>
          <li>接账号体系后，可以演化成个人排盘工作台。</li>
          <li>把右侧摘要换成规则引擎输出，就能接原局分析或风险扫描。</li>
          <li>顶部表单已经是完整入口，后面接 API 或本地存档都很自然。</li>
        </ul>
      </section>
    </aside>
  )
}
