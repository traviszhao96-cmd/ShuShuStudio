import type { ChartModel, GongName, OverallResult, PalaceModel, SiHuaType } from '../analysis/types'

const SIHUA_ORDER: SiHuaType[] = ['禄', '权', '科', '忌']

type ReportPanelProps = {
  chartModel?: ChartModel | null
  overallAnalysis?: OverallResult | null
}

function formatStars(palace?: PalaceModel) {
  return palace?.mainStar.length ? palace.mainStar.join('、') : '无主星'
}

function PalaceFact({
  label,
  palaceName,
  palace,
}: {
  label: string
  palaceName: GongName
  palace?: PalaceModel
}) {
  return (
    <article className="chart-fact-card">
      <span>{label}</span>
      <strong>{palaceName}</strong>
      <p>
        {palace ? `${palace.heavenlyStem}${palace.diZhi} · ${formatStars(palace)}` : '宫位资料暂缺'}
      </p>
    </article>
  )
}

export function ReportPanel({ chartModel, overallAnalysis }: ReportPanelProps) {
  if (!chartModel) return null

  const lifePalace = chartModel.palaces.find((palace) => palace.name === '命宫')
  const bodyPalace = chartModel.palaces.find((palace) => palace.name === chartModel.basicInfo.shenGong)
  const laiyinPalace = chartModel.palaces.find((palace) => palace.name === chartModel.laiyinGong)

  return (
    <section className="report-panel chart-basics-panel" data-slot="report-panel">
      <div className="report-header chart-basics-header">
        <div>
          <p className="section-kicker">Natal Chart Facts</p>
          <h2>命盘总览</h2>
        </div>
        <div className="chart-basics-meta" aria-label="命盘定盘信息">
          <span>{chartModel.basicInfo.lunarBirth}</span>
          <span>{chartModel.basicInfo.shengxiao}</span>
          <span>{chartModel.basicInfo.wuXingJu}</span>
        </div>
      </div>

      <div className="chart-facts-grid">
        <PalaceFact label="命宫" palaceName="命宫" palace={lifePalace} />
        <PalaceFact label="身宫" palaceName={chartModel.basicInfo.shenGong} palace={bodyPalace} />
        <PalaceFact label="来因宫" palaceName={chartModel.laiyinGong} palace={laiyinPalace} />
      </div>

      <section className="natal-sihua-section">
        <div className="natal-sihua-heading">
          <span>生年四化</span>
          <small>原盘之体</small>
        </div>
        <div className="natal-sihua-grid">
          {SIHUA_ORDER.map((type) => {
            const mutagen = chartModel.shengNianSiHua.find((item) => item.type === type)

            return (
              <article key={type} className={`natal-sihua-card type-${type}`}>
                <span>化{type}</span>
                <strong>{mutagen?.star ?? '未定位'}</strong>
                <p>{mutagen ? `落${mutagen.palace}` : '当前未读取到落点'}</p>
              </article>
            )
          })}
        </div>
      </section>

      {overallAnalysis ? (
        <section className="combined-pattern-section">
          <div className="combined-pattern-heading">
            <div>
              <span>格局总览</span>
              <small>原盘结构摘要</small>
            </div>
            <div className="combined-pattern-badges">
              <strong>{overallAnalysis.patternLabel}</strong>
              <strong>{overallAnalysis.energyQuadrant}</strong>
            </div>
          </div>

          <div className="combined-pattern-metrics">
            <span>来因 {overallAnalysis.laiyinGong}</span>
            <span>格局 {overallAnalysis.patternScore}</span>
            <span>能量 {overallAnalysis.energyScore}</span>
            <span>四化人格 {overallAnalysis.personalityType}</span>
          </div>

          <div className="combined-pattern-grid">
            <article>
              <strong>四化人格</strong>
              <p>
                {overallAnalysis.personalityTags.length > 0
                  ? overallAnalysis.personalityTags.join('；')
                  : '当前还没有足够四化人格标签。'}
              </p>
            </article>
            <article>
              <strong>关键结论</strong>
              <ul>
                {overallAnalysis.highlights.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <strong>关键警示</strong>
              {overallAnalysis.alerts.length > 0 ? (
                <ul>
                  {overallAnalysis.alerts.slice(0, 3).map((item) => (
                    <li key={`${item.category}-${item.description}`}>{item.description}</li>
                  ))}
                </ul>
              ) : (
                <p>当前没有形成高优先级警示。</p>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </section>
  )
}
