import { ArrowRight, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, Compass, Sparkles } from 'lucide-react'
import type { WorkspaceMode } from '../types'

type AppHomeProps = {
  caseName: string
  onOpenTool: (mode: WorkspaceMode) => void
  onOpenCases: () => void
}

const tools: Array<{
  mode: WorkspaceMode
  icon: typeof Compass
  title: string
  description: string
  status: string
}> = [
  {
    mode: 'analysis',
    icon: Sparkles,
    title: '认识自己',
    description: '综合紫微与八字，理解你的优势、盲区与人生主轴。',
    status: '已有分析',
  },
  {
    mode: 'career',
    icon: BriefcaseBusiness,
    title: '职业方向',
    description: '校准职业判断，选择方向，并开始一次现实验证。',
    status: '首次实验',
  },
  {
    mode: 'sanhe',
    icon: Compass,
    title: '我的命盘',
    description: '查看三合、四化、圆盘与八字的专业命盘工具。',
    status: '专业工具',
  },
  {
    mode: 'sihua',
    icon: ChartNoAxesCombined,
    title: '人生趋势',
    description: '结合大限与流年，理解当前阶段的机会与风险。',
    status: '开发中',
  },
]

export function AppHome({ caseName, onOpenTool, onOpenCases }: AppHomeProps) {
  return (
    <main className="app-home">
      <header className="home-topbar">
        <div>
          <p className="section-kicker">Fate-ish</p>
          <button type="button" className="home-case-switcher" onClick={onOpenCases}>
            下午好，{caseName}
            <ChevronDown size={15} />
          </button>
        </div>
        <button type="button" className="home-avatar-mini" aria-label="当前虚拟形象">命</button>
      </header>

      <section className="companion-hero">
        <div className="companion-visual" aria-hidden="true">
          <div className="companion-orbit companion-orbit-a" />
          <div className="companion-orbit companion-orbit-b" />
          <div className="companion-face">
            <span />
            <span />
          </div>
        </div>
        <div className="companion-copy">
          <p className="section-kicker">Today’s Direction</p>
          <h1>今天先收束方向，完成一次真实验证。</h1>
          <p>
            你现在更需要用现实反馈确认职业方向，而不是继续增加新的分析。先选择一个方向，给自己七天时间做出可被检验的成果。
          </p>
          <div className="companion-actions">
            <button type="button" onClick={() => onOpenTool('career')}>
              继续职业规划 <ArrowRight size={16} />
            </button>
            <span>建议依据：当前目标与职业分析</span>
          </div>
        </div>
      </section>

      <section className="home-progress-card">
        <div>
          <span>当前人生主线</span>
          <strong>找到值得长期投入的职业方向</strong>
        </div>
        <div className="home-progress-track"><i /></div>
        <small>第一阶段 · 校准你的职业能力结构</small>
      </section>

      <section className="home-tools">
        <header>
          <div>
            <p className="section-kicker">Tools</p>
            <h2>从一个具体问题开始</h2>
          </div>
          <span>4 个工具</span>
        </header>
        <div className="home-tool-grid">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.mode}
                type="button"
                className="home-tool-card"
                onClick={() => onOpenTool(tool.mode)}
                disabled={tool.status === '开发中'}
              >
                <div className="home-tool-card-top">
                  <span><Icon size={20} strokeWidth={1.7} /></span>
                  <small>{tool.status}</small>
                </div>
                <strong>{tool.title}</strong>
                <p>{tool.description}</p>
                <ArrowRight className="home-tool-arrow" size={16} />
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
