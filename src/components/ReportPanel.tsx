import { useState } from 'react'
import type { CaseRecord, WorkspaceMode } from '../types'

const reportTemplates: Record<
  WorkspaceMode,
  Array<{ title: string; body: string }>
> = {
  analysis: [
    {
      title: '1. 专题总览',
      body: '这里承接个性、家庭、学业、婚姻、交友、事业、财富、健康八个专题的浓缩报告。',
    },
    {
      title: '2. 规则来源',
      body: '专题报告优先读取分析桥接层中的 ChartModel、OverallResult、PalaceResult 与飞化链。',
    },
    {
      title: '3. 后续扩展',
      body: '后续可逐步接入 OpenClaw 继续整理的宫位知识、格局评分、命签纸田和应期规则。',
    },
  ],
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
  circle: [
    {
      title: '1. 圆盘总览',
      body: '这里放十二宫圆形结构中的整体关系，突出命宫、身宫、来因宫与三方四正。',
    },
    {
      title: '2. 宫位焦点',
      body: '这里放点选宫位后的主题解释，并承接对宫和三方带来的补充判断。',
    },
    {
      title: '3. 四化路径',
      body: '这里放圆盘中的生年四化、自化、向心线与后续可扩展的飞化路径。',
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
  activeCase?: CaseRecord | null
}

function BenchmarkAnswerToggle({ answer }: { answer: string }) {
  const [isAnswerVisible, setIsAnswerVisible] = useState(false)

  return (
    <div className="benchmark-answer-block">
      <button
        type="button"
        className="benchmark-answer-toggle"
        onClick={() => setIsAnswerVisible((visible) => !visible)}
      >
        {isAnswerVisible ? '隐藏答案' : '显示答案'}
      </button>
      {isAnswerVisible ? <p className="benchmark-answer">标准答案：{answer}</p> : null}
    </div>
  )
}

function parseBenchmarkNote(note: string) {
  const categoryMatch = note.match(/^【([^】]+)】/)
  const questionMatch = note.match(/^【[^】]+】(.+?)\s+选项：/)
  const optionsMatch = note.match(/选项：(.+?)\s+正确答案：/)
  const answerMatch = note.match(/正确答案：([A-D])/)

  if (!categoryMatch || !questionMatch || !optionsMatch) return null

  return {
    category: categoryMatch[1],
    question: questionMatch[1],
    options: optionsMatch[1].split(' / ').map((item) => item.trim()),
    answer: answerMatch?.[1] ?? '',
  }
}

export function ReportPanel({ mode, activeCase }: ReportPanelProps) {
  const sections = reportTemplates[mode]
  const benchmarkMeta = activeCase?.group === '评测' ? parseBenchmarkNote(activeCase.note) : null

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

      {benchmarkMeta ? (
        <div className="report-benchmark-note">
          <p className="section-kicker">Benchmark Note</p>
          <h3>
            {benchmarkMeta.category}题：{benchmarkMeta.question}
          </h3>
          <ul>
            {benchmarkMeta.options.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ul>
          {benchmarkMeta.answer ? (
            <BenchmarkAnswerToggle
              key={`${activeCase?.id ?? 'unknown'}-${mode}`}
              answer={benchmarkMeta.answer}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
