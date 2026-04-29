import type { WorkspaceMode } from '../types'

const reportTemplates: Record<
  WorkspaceMode,
  Array<{ title: string; body: string }>
> = {
  sanhe: [
    {
      title: '1. 三合主轴',
      body: '这里放三方四正、主轴结构、宫位互拱后的核心判断。',
    },
    {
      title: '2. 关系结构',
      body: '这里放夫妻、财福、父疾等线的关系判断与结构备注。',
    },
    {
      title: '3. 待验证点',
      body: '这里放需要结合实际经历或六亲反馈进一步确认的部分。',
    },
  ],
  sihua: [
    {
      title: '1. 四化锚点',
      body: '这里放生年禄权科忌、来因宫、体用主轴和第一层飞化结论。',
    },
    {
      title: '2. 风险链',
      body: '这里放四化串联后的风险链、聚焦线与需要优先解读的宫线。',
    },
    {
      title: '3. 应期与验证',
      body: '这里放四化在大限流年上的引动，以及待校验事件。',
    },
  ],
  bazi: [
    {
      title: '1. 八字结构',
      body: '这里放日主、格局、旺衰与十神主轴的浓缩结论。',
    },
    {
      title: '2. 大运流转',
      body: '这里放大运方向、重要阶段与时间轴上的关键提示。',
    },
    {
      title: '3. 紫微对照',
      body: '这里放未来八字与紫微共读时的交叉印证区域。',
    },
  ],
}

type ReportPanelProps = {
  mode: WorkspaceMode
}

export function ReportPanel({ mode }: ReportPanelProps) {
  const sections = reportTemplates[mode]

  return (
    <section className="report-panel" data-slot="report-panel">
      <div className="report-header">
        <div>
          <p className="section-kicker">Full Report</p>
          <h2>完整报告</h2>
        </div>
      </div>

      <div className="report-grid">
        {sections.map((section) => (
          <article key={section.title} className="report-card">
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
