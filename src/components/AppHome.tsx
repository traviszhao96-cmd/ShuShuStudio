import { ArrowRight, ChartNoAxesCombined, Compass, Sparkles, VenetianMask } from 'lucide-react'
import type { GenderType, WorkspaceMode } from '../types'
import { CaseSwitchButton } from './CaseSwitchButton'

type AppHomeProps = {
  caseName: string
  caseGender: GenderType
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
    icon: VenetianMask,
    title: '命运牌组',
    description: '翻开 3 张优势与 3 张弱点牌，看看哪些判断真的有感觉。',
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

export function AppHome({ caseName, caseGender, onOpenTool, onOpenCases }: AppHomeProps) {
  return (
    <main className="app-home">
      <header className="home-topbar">
        <div>
          <p className="section-kicker">Fate-ish</p>
          <strong>下午好，{caseName}</strong>
        </div>
        <CaseSwitchButton caseName={caseName} gender={caseGender} onClick={onOpenCases} />
      </header>

      <section className="home-tools">
        <header>
          <div>
            <p className="section-kicker">Tools</p>
            <h2>从一个小工具开始</h2>
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
                className={`home-tool-card home-tool-card--${tool.mode}`}
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
