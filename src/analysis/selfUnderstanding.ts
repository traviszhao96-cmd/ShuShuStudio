import { buildMingpanMarkdown } from './mingpanMarkdown'
import type { DestinyProfile } from './destinyProfile'
import type { ChartModel, OverallResult } from './types'

export type SelfUnderstandingMode = 'profile-only' | 'full-context'

export type SelfUnderstandingReport = {
  title: string
  subtitle: string
  opening: string
  domains: Array<{
    domain: '个性' | '事业' | '财富' | '关系' | '健康状态'
    headline: string
    analysis: string
    evidence: string[]
    cautions: string[]
    suggestions: string[]
  }>
  questionsToAsk: string[]
  naturalQuestions: string[]
  closing: string
}

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

const GENTLE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/系马高楼，孤星照夜/g, '在理想与现实之间寻找平衡'],
  [/系马高楼/g, '理想与现实之间的平衡'],
  [/孤星/g, '独立感'],
  [/赌徒式/g, '直觉型'],
  [/巨石/g, '需要慢慢理解的课题'],
  [/暗流/g, '隐性的影响'],
  [/吞噬/g, '消耗'],
  [/不可抗力/g, '不易控制的因素'],
  [/最需要警惕/g, '可以多留意'],
  [/注定/g, '倾向于'],
  [/必然/g, '容易'],
  [/恶意是常态/g, '外界反馈不一定总是顺利'],
  [/命中如此/g, '从盘面看有这种倾向'],
  [/小人/g, '复杂人际'],
  [/打击/g, '影响'],
  [/冲击/g, '影响'],
  [/警示/g, '提醒'],
  [/警惕/g, '留意'],
  [/高压/g, '较强压力'],
]

function softenText(value: string) {
  return GENTLE_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}

function softenValue<T>(value: T): T {
  if (typeof value === 'string') return softenText(value) as T
  if (Array.isArray(value)) return value.map((item) => softenValue(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, softenValue(item)]),
    ) as T
  }
  return value
}

function computedSummary(overall: OverallResult) {
  return {
    格局检测: overall.patterns,
    生年四化分析: {
      来因宫: overall.laiyinGong,
      来因解释: overall.laiyinInterpretation,
      四化: overall.natalSiHua.items,
      真假禄: overall.natalSiHua.zhenJiaLu,
      忌深挖: overall.natalSiHua.jiDeepDive,
    },
    命宫主轴: overall.mingQianAxis,
    河图检测: overall.alerts.filter((item) => item.category.startsWith('河图破')),
  }
}

function buildGentleProfileContext(profile: DestinyProfile) {
  return softenValue({
    coreIdentity: {
      primaryDrive: profile.coreIdentity.primaryDrive,
      behaviorStyle: profile.coreIdentity.behaviorStyle,
      decisionStyle: profile.coreIdentity.decisionStyle,
      stressPattern: profile.coreIdentity.stressPattern,
    },
    strengthMap: profile.strengthMap.map((item) => ({
      name: item.name,
      description: item.description,
      evidence: item.evidence,
    })),
    riskMap: profile.riskMap.map((item) => ({
      name: item.name,
      evidence: item.evidence,
      mitigation: item.mitigation,
    })),
    lifeTheme: profile.lifeTheme,
    careerAndAbility: profile.careerAndAbility,
    relationshipStyle: profile.relationshipStyle,
    actionPrinciples: profile.actionPrinciples,
    evidenceIndex: profile.evidenceIndex,
  })
}

export function buildSelfUnderstandingPrompt(input: {
  caseName: string
  mode: SelfUnderstandingMode
  profile: DestinyProfile
  model?: ChartModel
  overall?: OverallResult
}) {
  const profileBlock = compactJson(buildGentleProfileContext(input.profile))
  const contextBlock = input.mode === 'full-context' && input.model && input.overall
    ? `\n## 命盘事实底稿\n${buildMingpanMarkdown(input.model, input.caseName)}\n\n## 计算层结果\n${compactJson(computedSummary(input.overall))}\n`
    : ''

  const modeRule = input.mode === 'profile-only'
    ? '本次只能使用“用户命理档案层”，不要重新分析命盘，也不要补充档案中没有的命盘细节。'
    : '本次可以使用“命盘事实底稿 + 计算层结果 + 用户命理档案层”，但命理档案层优先，命盘和计算层只用于补充依据。'

  return `你是“认识自己”工具的温和引导型分析引擎。你的任务是把命理线索转译成用户能理解自己的语言，风格更接近心理咨询中的自我觉察与支持性引导，而不是下判断、贴标签或强调风险。

## 当前模式
${input.mode}

${modeRule}

## 写作原则
1. 输出仍然是“分领域命理分析”，但表达要偏心理支持：先理解用户，再解释倾向，最后给出温和建议。
2. 命理依据只是观察线索，不是定论。正文必须使用“可能、容易、倾向、可以留意、适合尝试”等非绝对表达。
3. 不要写成传统命理批语，不要恐吓，不要绝对化，禁止使用“注定、必然、孤星、恶意是常态、命中如此、系马高楼、巨石、赌徒、暗流、吞噬、不可抗力、最需要警惕”等过重或诗化表达。
4. 不要把用户描述成“有问题的人”。即使谈到挑战，也要写成“需要被理解和照顾的部分”。
5. 每个领域都必须包含 evidence，但 evidence 只放中性命理事实，不要引用过重断语。
6. cautions 字段写“温和提醒”，不要写成风险警告。
7. suggestions 字段写成可尝试的小行动，不要命令用户。
8. 不要输出 Markdown，只输出严格 JSON。
9. 控制篇幅，不要长篇发挥；每个领域只讲最关键的 2-3 个观察。

## 用户命理档案层
${profileBlock}
${contextBlock}
## 输出 JSON Schema
{
  "title": "认识自己",
  "subtitle": "五个领域的自我理解",
  "opening": "一段温和开场，说明这份内容不是给人下定义，而是帮助用户更理解自己",
  "domains": [
    {
      "domain": "个性 | 事业 | 财富 | 关系 | 健康状态",
      "headline": "该领域的一句话温和观察",
      "analysis": "该领域的解释正文：先共情，再说明倾向，最后引导用户理解自己",
      "evidence": ["中性命理依据1", "中性命理依据2"],
      "cautions": ["温和提醒1", "温和提醒2"],
      "suggestions": ["可以尝试的小行动1", "可以尝试的小行动2"]
    }
  ],
  "naturalQuestions": ["用户读完后心里自然冒出来、想继续了解自己的问题，3-5个"],
  "questionsToAsk": ["兼容字段：内容与 naturalQuestions 完全一致"],
  "closing": "一段收束语"
}

## 内容结构要求
- domains 必须刚好输出 5 个领域，顺序固定为：个性、事业、财富、关系、健康状态。
- title 固定为“认识自己”，subtitle 固定为“五个领域的自我理解”。
- 每个领域 analysis 控制在 80-140 个中文字符。
- 每个领域 evidence 2-4 条，必须引用宫位、星曜、四化、格局、河图检测或八字事实。
- 每个领域 cautions 1-2 条，每条不超过 40 个中文字符。
- 每个领域 suggestions 2-3 条，每条不超过 40 个中文字符。
- headline 不要像结论判词，要像咨询师的温和观察。
- naturalQuestions 不是系统反问用户，而是模拟用户读完报告后心里自然冒出来的追问。
- naturalQuestions 要用第一人称表达，例如“我为什么总是在关系里想太多？”“我适合怎样建立安全感？”
- questionsToAsk 必须与 naturalQuestions 完全一致，用于兼容旧前端字段。
- 事业领域重点看官禄宫、命宫、迁移宫、财帛宫和格局。
- 财富领域重点看财帛宫、福德宫、田宅宫、生年禄忌和资源流向。
- 关系领域重点看夫妻宫、交友宫、子女宫、父母宫，以及四化互动。
- 健康状态领域重点看疾厄宫、福德宫、命宫、身宫和八字五行，但不能给医疗诊断。`
}

function cleanJson(raw: string) {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export function parseSelfUnderstandingResponse(raw: string): SelfUnderstandingReport | null {
  try {
    const parsed = JSON.parse(cleanJson(raw)) as Record<string, unknown>
    const domains = Array.isArray(parsed.domains) ? parsed.domains : []
    const naturalQuestions = stringArray(parsed.naturalQuestions).length > 0
      ? stringArray(parsed.naturalQuestions)
      : stringArray(parsed.questionsToAsk)
    return {
      title: String(parsed.title ?? ''),
      subtitle: String(parsed.subtitle ?? ''),
      opening: String(parsed.opening ?? ''),
      domains: domains
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          domain: String(item.domain ?? '个性') as SelfUnderstandingReport['domains'][number]['domain'],
          headline: String(item.headline ?? ''),
          analysis: String(item.analysis ?? ''),
          evidence: stringArray(item.evidence),
          cautions: stringArray(item.cautions),
          suggestions: stringArray(item.suggestions),
        })),
      questionsToAsk: naturalQuestions,
      naturalQuestions,
      closing: String(parsed.closing ?? ''),
    }
  } catch {
    return null
  }
}
