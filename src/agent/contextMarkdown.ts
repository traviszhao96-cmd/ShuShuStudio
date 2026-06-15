import type {
  ChartModel,
  OverallResult,
  PalaceResult,
  TopicResult,
} from '../analysis/types'
import type {
  CaseRecord,
  SihuaRiskPalace,
  TimelineDecadalOption,
  TimelineYearOption,
  WorkspaceMode,
  ZiweiInsightPayload,
} from '../types'

export type AgentContextInput = {
  activeCase: CaseRecord
  mode: WorkspaceMode
  chartModel: ChartModel | null
  overallAnalysis: OverallResult | null
  topicAnalyses: TopicResult[]
  selectedPalace: PalaceResult | null
  activeDecadal: TimelineDecadalOption | null
  activeTimelineYear: TimelineYearOption | null
  timelineDisplayMode: 'decade' | 'yearly'
  ziweiInsights: ZiweiInsightPayload | null
  sihuaRisks: SihuaRiskPalace[]
}

const MODE_LABELS: Record<WorkspaceMode, string> = {
  analysis: '分析',
  career: '职业规划',
  sanhe: '三合',
  sihua: '四化',
  circle: '圆盘四化',
  bazi: '八字',
}

function text(value: unknown, fallback = '无') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function list(items: string[], empty = '暂无') {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${empty}`
}

function tableCell(value: unknown) {
  return text(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function buildPalaceTable(model: ChartModel) {
  const header = '| 宫位 | 干支 | 主星 | 辅星 | 生年四化 | 自化/向心 | 大限 |'
  const divider = '| --- | --- | --- | --- | --- | --- | --- |'
  const rows = model.palaces.map((palace) => {
    const natal = model.shengNianSiHua
      .filter((item) => item.palace === palace.name)
      .map((item) => `${item.star}化${item.type}`)
      .join('、')
    const self = model.ziHua
      .filter((item) => item.sourcePalace === palace.name || item.targetPalace === palace.name)
      .map((item) => `${item.sourcePalace}${item.direction}${item.star}化${item.hua}→${item.targetPalace}`)
      .join('、')

    return `| ${tableCell(palace.name)} | ${tableCell(`${palace.heavenlyStem}${palace.diZhi}`)} | ${tableCell(
      palace.mainStar.join('、') || '无主星',
    )} | ${tableCell(palace.minorStar.join('、'))} | ${tableCell(natal)} | ${tableCell(self)} | ${tableCell(
      palace.daXianRange,
    )} |`
  })

  return [header, divider, ...rows].join('\n')
}

function buildOverallSection(overall: OverallResult | null) {
  if (!overall) return '暂无整体分析。'

  return [
    `- 来因宫：${overall.laiyinGong}`,
    `- 来因解释：${overall.laiyinInterpretation}`,
    `- 四化人格：${overall.personalityType}`,
    `- 人格标签：${overall.personalityTags.join('；') || '暂无'}`,
    '',
    '### 关键结论',
    list(overall.highlights),
    '',
    '### 关键警示',
    list(
      overall.alerts.map(
        (alert) =>
          `[${alert.severity}] ${alert.category}：${alert.description}（相关宫位：${alert.relatedPalaces.join('、')}）`,
      ),
    ),
  ].join('\n')
}

function buildSelectedPalaceSection(palace: PalaceResult | null) {
  if (!palace) return '当前未选中具体宫位。'

  return [
    `- 当前宫位：${palace.palace}`,
    `- 宫位本义：${palace.basics.primary}`,
    `- 六内外：${palace.basics.liuNeiWai}`,
    `- 河图组：${palace.basics.heTuGroup}`,
    `- 对宫：${palace.sanFangSiZheng.duiGong}`,
    `- 三方：${palace.sanFangSiZheng.left}、${palace.sanFangSiZheng.right}`,
    '',
    '### 当前宫位四化效应',
    list(palace.siHuaHere.map((item) => `${item.star}化${item.type}：${item.meaning}`)),
    '',
    '### 当前宫位能量流向',
    list([
      ...(palace.flowAnalysis?.outgoing.map((item) => `飞出：${item}`) ?? []),
      ...(palace.flowAnalysis?.incoming.map((item) => `飞入：${item}`) ?? []),
    ]),
    '',
    '### 当前宫位警示',
    list(palace.alerts.map((alert) => `[${alert.severity}] ${alert.category}：${alert.description}`)),
  ].join('\n')
}

function buildTopicSections(topics: TopicResult[]) {
  if (topics.length === 0) return '暂无专题分析。'

  return topics
    .map((topic) =>
      [
        `### ${topic.topic}`,
        `- 标题：${topic.headline}`,
        `- 摘要：${topic.summary}`,
        `- 重点宫位：${topic.focusPalaces.join('、')}`,
        '',
        list(topic.points),
        topic.alerts.length > 0
          ? `\n警示：\n${list(topic.alerts.map((alert) => `[${alert.severity}] ${alert.description}`))}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

function buildRuleOutput(insights: ZiweiInsightPayload | null) {
  if (!insights) return '暂无规则输出。'

  return [
    `- 主轴：${insights.headline}`,
    `- 摘要：${insights.summary}`,
    '',
    ...insights.sections.flatMap((section) => [
      `### ${section.title}`,
      list(section.points),
      '',
    ]),
    '### 方法依据',
    list(insights.methodology),
  ].join('\n')
}

export function buildAgentContextMarkdown(input: AgentContextInput) {
  const {
    activeCase,
    mode,
    chartModel,
    overallAnalysis,
    topicAnalyses,
    selectedPalace,
    activeDecadal,
    activeTimelineYear,
    timelineDisplayMode,
    ziweiInsights,
    sihuaRisks,
  } = input

  const bazi = activeCase.bazi
  const basicInfo = chartModel?.basicInfo

  return [
    '# SSMASTER 命理 Agent 上下文',
    '',
    '> 本文档由 App 根据当前命例、命盘模型、规则分析与页面状态自动生成。',
    '> 请把“命盘事实”和“初步规则分析”区分开；未在上下文出现的信息不要自行补造。',
    '',
    '## 当前任务状态',
    `- 当前页面：${MODE_LABELS[mode]}`,
    `- 当前时间视角：${timelineDisplayMode === 'yearly' ? '流年' : '大限'}`,
    `- 当前选中宫位：${selectedPalace?.palace ?? '无'}`,
    `- 当前大限：${
      activeDecadal
        ? `${activeDecadal.startAge}~${activeDecadal.endAge}岁 ${activeDecadal.heavenlyStem}${activeDecadal.earthlyBranch}限（${activeDecadal.palaceName}）`
        : '无'
    }`,
    `- 当前流年：${
      activeTimelineYear ? `${activeTimelineYear.year}年，虚岁${activeTimelineYear.nominalAge}岁` : '无'
    }`,
    '',
    '## 命例基础信息',
    `- 姓名：${activeCase.name}`,
    `- 阳历出生：${activeCase.birthday} ${activeCase.birthTimeText}`,
    `- 历法输入：${activeCase.birthdayType === 'solar' ? '阳历' : '农历'}`,
    `- 性别：${activeCase.gender === 'male' ? '男' : '女'}`,
    `- 农历出生：${basicInfo?.lunarBirth ?? '未生成'}`,
    `- 生肖：${basicInfo?.shengxiao ?? '未生成'}`,
    `- 五行局：${basicInfo?.wuXingJu ?? '未生成'}`,
    `- 身宫：${basicInfo?.shenGong ?? '未生成'}`,
    `- 八字：${bazi ? [bazi.yearPillar, bazi.monthPillar, bazi.dayPillar, bazi.hourPillar ?? '未知时柱'].join(' ') : '未生成'}`,
    `- 命例备注：${text(activeCase.note)}`,
    '',
    '## 原盘核心事实',
    chartModel
      ? [
          `- 来因宫：${chartModel.laiyinGong}`,
          `- 生年四化：${chartModel.shengNianSiHua
            .map((item) => `${item.star}化${item.type}落${item.palace}`)
            .join('；') || '无'}`,
          `- 自化与向心：${chartModel.ziHua
            .map((item) => `${item.sourcePalace}${item.direction}${item.star}化${item.hua}到${item.targetPalace}`)
            .join('；') || '无'}`,
        ].join('\n')
      : '命盘模型生成失败。',
    '',
    '## 十二宫资料',
    chartModel ? buildPalaceTable(chartModel) : '暂无十二宫资料。',
    '',
    '## 飞化关系',
    chartModel
      ? list(
          chartModel.feiHua.map(
            (item) => `${item.sourcePalace}飞${item.star}化${item.hua}到${item.targetPalace}`,
          ),
        )
      : '- 暂无',
    '',
    '## 整体初步分析',
    buildOverallSection(overallAnalysis),
    '',
    '## 当前宫位详细分析',
    buildSelectedPalaceSection(selectedPalace),
    '',
    '## 专题初步分析',
    buildTopicSections(topicAnalyses),
    '',
    '## 现有论命规则输出',
    buildRuleOutput(ziweiInsights),
    '',
    '## 四化风险摘要',
    list(
      sihuaRisks.map(
        (risk) =>
          `${risk.palace}（对宫${risk.opposite}，${risk.palaceType}）：${risk.reasons.join('；')}`,
      ),
    ),
    '',
    '## Agent 回答约束',
    '- 优先回答用户当前问题，不要机械复述整份上下文。',
    '- 结论应说明依据的宫位、星曜、四化或规则。',
    '- 将命盘事实、规则推断和待验证事项明确区分。',
    '- 不把初步分析描述成确定事实；涉及健康、财务等议题时避免绝对化表达。',
  ].join('\n')
}

export function buildAgentRequestMarkdown(contextMarkdown: string, question: string) {
  return `${contextMarkdown}\n\n## 用户当前问题\n${text(question, '请结合当前上下文进行整体分析。')}`
}
