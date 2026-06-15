import { ArrowRight, Check, RotateCcw, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ChartModel, GongName } from '../analysis/types'

type FeedbackValue = 'accurate' | 'partial' | 'inaccurate'

type CareerDirection = {
  id: string
  title: string
  subtitle: string
  fit: string
  experiment: string
  deliverable: string
}

type CareerPlanState = {
  feedback: Record<string, FeedbackValue>
  selectedDirectionId: string | null
  planStarted: boolean
}

type CareerPlannerProps = {
  caseId: string
  caseName: string
  chartModel: ChartModel | null
}

const STORAGE_KEY = 'ssmaster-career-plans'

const HYPOTHESES = [
  {
    id: 'create',
    title: '你更适合开创，而不是长期维护成熟流程',
    description: '面对还没有标准答案的问题，你通常更容易进入状态；重复执行和层级束缚会快速消耗动力。',
  },
  {
    id: 'translate',
    title: '你的核心价值来自把复杂问题变成可用成果',
    description: '技术、策略、表达并不是彼此分开的能力。真正有优势的位置，是把它们组合成产品、方案或作品。',
  },
  {
    id: 'autonomy',
    title: '你需要较高自主权，但不等于适合完全独自工作',
    description: '你适合主导方向与关键判断，同时需要可靠伙伴帮助校验外部沟通、合作边界与长期节奏。',
  },
]

const DIRECTIONS: CareerDirection[] = [
  {
    id: 'product-founder',
    title: 'AI 产品与创新创业',
    subtitle: '把新技术与真实需求组合成新产品',
    fit: '适合开创、重构、快速学习和跨领域整合，也能让技术、审美与判断共同产生价值。',
    experiment: '选择一个你真正想解决的问题，做出可让 3 位真实用户体验的最小原型。',
    deliverable: '一页产品定义、一个可操作原型、三份真实反馈。',
  },
  {
    id: 'strategy-research',
    title: '产品策略与行业研究',
    subtitle: '发现变化，形成判断，影响关键决策',
    fit: '适合复杂信息处理、趋势判断与独立分析，能减少高频事务执行带来的消耗。',
    experiment: '围绕一个熟悉行业，完成一份有明确判断而非资料堆砌的策略简报。',
    deliverable: '三页策略简报、一个核心判断、两条可执行建议。',
  },
  {
    id: 'knowledge-creator',
    title: '知识产品与专业表达',
    subtitle: '将复杂知识转化为内容、课程或工具',
    fit: '适合利用表达、研究与产品化能力建立长期影响力，但需要稳定发布机制避免只做内部打磨。',
    experiment: '选择一个你有独特判断的主题，发布一份可以帮助具体人群解决问题的内容产品。',
    deliverable: '一篇公开内容或一个轻量工具、五位目标用户反馈。',
  },
]

function loadState(caseId: string): CareerPlanState {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, CareerPlanState>
    return all[caseId] ?? { feedback: {}, selectedDirectionId: null, planStarted: false }
  } catch {
    return { feedback: {}, selectedDirectionId: null, planStarted: false }
  }
}

function saveState(caseId: string, state: CareerPlanState) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, CareerPlanState>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [caseId]: state }))
  } catch {
    // Local feedback is helpful but should never block the planning flow.
  }
}

function palaceStars(model: ChartModel | null, palace: GongName) {
  return model?.palaces.find((item) => item.name === palace)?.mainStar.join('、') || '未读取'
}

export function CareerPlanner({ caseId, caseName, chartModel }: CareerPlannerProps) {
  const [state, setState] = useState<CareerPlanState>(() => loadState(caseId))

  const selectedDirection = DIRECTIONS.find((item) => item.id === state.selectedDirectionId) ?? null
  const answeredCount = Object.keys(state.feedback).length
  const evidence = useMemo(
    () => [
      `官禄宫：${palaceStars(chartModel, '官禄')}，偏向需要决断、破局与承担结果的工作方式。`,
      `财帛宫：${palaceStars(chartModel, '财帛')}，价值兑现更适合来自重构、创新与非标准路径。`,
      `命宫：${palaceStars(chartModel, '命宫')}，职业需要保留探索、创造与自主空间。`,
      chartModel?.bazi
        ? `八字：${[chartModel.bazi.year, chartModel.bazi.month, chartModel.bazi.day, chartModel.bazi.hour].filter(Boolean).join(' ')}，现有报告强调以才华输出与技能产品化形成价值。`
        : '当前八字资料未完整读取，职业初始判断主要依据紫微结构。',
    ],
    [chartModel],
  )

  function updateState(updater: (current: CareerPlanState) => CareerPlanState) {
    setState((current) => {
      const next = updater(current)
      saveState(caseId, next)
      return next
    })
  }

  function resetPlan() {
    updateState(() => ({ feedback: {}, selectedDirectionId: null, planStarted: false }))
  }

  return (
    <div className="career-planner">
      <header className="career-hero">
        <p className="section-kicker">Career Direction Lab · 首次实验</p>
        <h1>{caseName}，先找到值得验证的职业方向</h1>
        <p>
          这不是替你决定唯一职业。我们先用命盘生成初始假设，再用你的反馈与现实行动确认什么真正适合你。
        </p>
        <div className="career-hero-status">
          <span>{answeredCount}/3 项判断已校准</span>
          <span>{selectedDirection ? `当前方向：${selectedDirection.title}` : '尚未选择验证方向'}</span>
          <button type="button" onClick={resetPlan}><RotateCcw size={14} />重置实验</button>
        </div>
      </header>

      <section className="career-section">
        <div className="career-section-heading">
          <span>01</span>
          <div>
            <h2>职业能力结构</h2>
            <p>先判断这些从命盘提取的职业假设，是否符合你的真实经验。</p>
          </div>
        </div>
        <div className="career-hypothesis-list">
          {HYPOTHESES.map((item) => (
            <article key={item.id} className="career-hypothesis-card">
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <div className="career-feedback" aria-label={`评价：${item.title}`}>
                {([
                  ['accurate', '很准确'],
                  ['partial', '部分准确'],
                  ['inaccurate', '不准确'],
                ] as Array<[FeedbackValue, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={state.feedback[item.id] === value ? 'is-active' : ''}
                    onClick={() =>
                      updateState((current) => ({
                        ...current,
                        feedback: { ...current.feedback, [item.id]: value },
                      }))
                    }
                  >
                    {state.feedback[item.id] === value ? <Check size={14} /> : null}
                    {label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
        <details className="career-evidence">
          <summary>查看命理判断依据</summary>
          <ul>{evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      </section>

      <section className="career-section">
        <div className="career-section-heading">
          <span>02</span>
          <div>
            <h2>选择一个方向做现实验证</h2>
            <p>“天选职业”不是一个职位名称，而是你更容易长期创造价值的工作结构。</p>
          </div>
        </div>
        <div className="career-direction-grid">
          {DIRECTIONS.map((direction) => (
            <button
              key={direction.id}
              type="button"
              className={`career-direction-card ${state.selectedDirectionId === direction.id ? 'is-active' : ''}`}
              onClick={() =>
                updateState((current) => ({
                  ...current,
                  selectedDirectionId: direction.id,
                  planStarted: false,
                }))
              }
            >
              <span className="career-direction-check">{state.selectedDirectionId === direction.id ? <Check size={16} /> : null}</span>
              <small>候选方向</small>
              <strong>{direction.title}</strong>
              <em>{direction.subtitle}</em>
              <p>{direction.fit}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={`career-section career-plan ${selectedDirection ? 'is-ready' : ''}`}>
        <div className="career-section-heading">
          <span>03</span>
          <div>
            <h2>七天职业验证计划</h2>
            <p>先用一个小型真实行动验证方向，不急着做重大职业决定。</p>
          </div>
        </div>
        {selectedDirection ? (
          <div className="career-plan-card">
            <div className="career-plan-title">
              <Target size={21} />
              <div>
                <small>验证方向</small>
                <h3>{selectedDirection.title}</h3>
              </div>
            </div>
            <div className="career-plan-grid">
              <div>
                <span>七天任务</span>
                <p>{selectedDirection.experiment}</p>
              </div>
              <div>
                <span>完成标准</span>
                <p>{selectedDirection.deliverable}</p>
              </div>
              <div>
                <span>重点观察</span>
                <p>完成过程中，你是否持续有动力？你享受的是创造、判断、表达，还是获得外部认可？</p>
              </div>
              <div>
                <span>风险提醒</span>
                <p>不要继续增加方向和功能。七天内只完成这一次验证，先获得真实反馈。</p>
              </div>
            </div>
            <button
              type="button"
              className={`career-start-button ${state.planStarted ? 'is-started' : ''}`}
              onClick={() => updateState((current) => ({ ...current, planStarted: !current.planStarted }))}
            >
              {state.planStarted ? <><Check size={17} />计划已开始</> : <>开始七天验证<ArrowRight size={17} /></>}
            </button>
          </div>
        ) : (
          <div className="career-plan-empty">先从上方选择一个最想验证的职业方向。</div>
        )}
      </section>
    </div>
  )
}
