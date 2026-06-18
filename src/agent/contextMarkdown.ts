import type {
  ChartModel,
  OverallResult,
  PalaceResult,
  TopicResult,
  ChartProfile,
} from '../analysis/types'
import type { AgentReport } from './reportStore'
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

export type ProfileOnlyAgentContextInput = {
  activeCase: CaseRecord
  profile: ChartProfile | null
  report: AgentReport | null
  profileStatus?: 'ready' | 'missing' | 'stale'
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

function buildLifeFactsSection(facts: CaseRecord['lifeFacts'] | undefined) {
  if (!facts?.length) return '暂无已录入的现实事实。'

  return list(
    facts.map((fact) => {
      const meta = [
        fact.category,
        fact.date,
        fact.source,
        fact.confidence ? `可信度：${fact.confidence}` : '',
      ].filter(Boolean)

      return `${meta.length ? `【${meta.join(' / ')}】` : ''}${fact.content}`
    }),
  )
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

// ── 新增：格局检测、宫位评分、四化总览 ──

function buildPatternSection(overall: OverallResult | null) {
  if (!overall?.patterns?.length) return ''

  return [
    '### 格局检测',
    list(
      overall.patterns.map((p) => {
        const parts = [`[${p.category}] **${p.name}**：${p.description}`]
        if (p.judgment) parts.push(`  断语：${p.judgment}`)
        if (p.palaces?.length) parts.push(`  相关宫位：${p.palaces.join('、')}`)
        return parts.join('\n')
      }),
    ),
  ].join('\n')
}

function buildPalaceScoreSection(overall: OverallResult | null) {
  if (!overall?.palaceScores?.length) return ''

  const lines = overall.palaceScores.map((s) =>
    `- ${s.palace}：质量${s.quality.grade}(${s.quality.score}) 能量${s.energy.grade} ${s.quadrant}`,
  )

  const problems = overall.palaceScores.filter(
    (s) => s.quadrant === '病灶型' || s.quality.grade === '差' || s.quality.grade === '劣',
  )
  if (problems.length) {
    lines.push('')
    lines.push('**需关注**：' + problems.map((s) => `${s.palace}(${s.quadrant})`).join('、'))
  }

  return ['### 宫位评分', ...lines].join('\n')
}

function buildNatalSiHuaSection(overall: OverallResult | null) {
  if (!overall?.natalSiHua) return ''

  const n = overall.natalSiHua
  const lines: string[] = []

  lines.push(`- 分布：${n.distribution}`)
  lines.push(`- 能力流向：${n.abilityFlow || '无'}`)
  lines.push(
    ...n.items.map(
      (item) =>
        `- ${item.star}化${item.type}落${item.palace}（${item.liuNeiWai}，${item.duiGongRelation}）：${item.meaning}`,
    ),
  )

  if (n.zhenJiaLu) {
    const z = n.zhenJiaLu
    lines.push(`- 真假禄：${z.grade} → ${z.narrative}`)
  }

  if (n.jiDeepDive?.star) {
    const j = n.jiDeepDive
    lines.push(`- 忌深挖：${j.star}忌在${j.palace}${j.duiImpact ? '，' + j.duiImpact : ''}`)
    if (j.narrative) lines.push(`  ${j.narrative}`)
  }

  return ['### 生年四化总览', ...lines].join('\n')
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

function buildChartProfileSection(profile: ChartProfile | null) {
  if (!profile) return '暂无正式命理档案层。'

  return [
    `- 档案版本时间：${new Date(profile.generatedAt).toLocaleString('zh-CN')}`,
    `- 置信度：${profile.confidence}`,
    '',
    '### 整合原型',
    `- 名称：${profile.integratedArchetype.name || '未命名'}`,
    `- 一句话：${profile.integratedArchetype.oneLine || '暂无'}`,
    `- 优势集群：${profile.integratedArchetype.strengthClusters.join('；') || '暂无'}`,
    `- 风险集群：${profile.integratedArchetype.riskClusters.join('；') || '暂无'}`,
    '',
    '### 底层结构摘要（仅供内部参考，回答时不要直接堆术语）',
    `- 内在气质线索：${profile.baziPattern.patternName || '暂无'}；${profile.baziPattern.dayMasterAssessment || '暂无'}`,
    `- 关键动态：${profile.baziPattern.keyDynamics.join('；') || '暂无'}`,
    `- 行为结构线索：${profile.ziweiStructure.coreStructure || '暂无'}；${profile.ziweiStructure.lifeBodyAxis || '暂无'}`,
    `- 人生课题线索：${profile.ziweiStructure.laiyinTheme || '暂无'}`,
    '',
    '### 关键生活领域信号',
    list(profile.ziweiStructure.keyPalaces.map((item) => `${item.palace}：${item.signal}`)),
    '',
    '### 动力与压力线索',
    `- 主轴：${profile.sihuaCore.dynamicSummary || '暂无'}`,
    `- 禄：${profile.sihuaCore.luImpact || '暂无'}`,
    `- 权：${profile.sihuaCore.quanImpact || '暂无'}`,
    `- 科：${profile.sihuaCore.keImpact || '暂无'}`,
    `- 忌：${profile.sihuaCore.jiImpact || '暂无'}`,
  ].join('\n')
}

function buildReportProfileSection(report: AgentReport | null) {
  if (!report) return '暂无已生成的认识自己报告摘要。'

  return [
    `- 报告版本：${report.version}`,
    `- 生成时间：${new Date(report.generatedAt).toLocaleString('zh-CN')}`,
    '',
    ...Object.entries(report.topics).map(([topic, value]) => {
      const parsed = value.parsed
      return [
        `### ${topic}`,
        `- 标题：${parsed?.headline || value.headline || '暂无'}`,
        parsed?.sections?.length
          ? list(parsed.sections.map((section) => section.conclusion).filter(Boolean).slice(0, 3))
          : list([value.content].filter(Boolean).slice(0, 1), '暂无摘要'),
      ].join('\n')
    }),
  ].join('\n')
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
    '## 已知现实事实',
    buildLifeFactsSection(activeCase.lifeFacts),
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
    ...[
      buildPatternSection(overallAnalysis),
      buildNatalSiHuaSection(overallAnalysis),
      buildPalaceScoreSection(overallAnalysis),
    ].filter(Boolean),
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

export function buildProfileOnlyAgentContextMarkdown(input: ProfileOnlyAgentContextInput) {
  const { activeCase, profile, report, profileStatus = profile ? 'ready' : 'missing' } = input

  return [
    '# SSMASTER 方向助手上下文（Profile Only）',
    '',
    '> 你是一个偏心理支持与自我觉察的方向助手，不是传统命理师。',
    '> 命理档案只作为理解用户的背景线索，回答时应优先使用心理分析、现实经验和行动建议。',
    '> 本上下文不包含原始十二宫表、完整命盘、计算层格局明细、大限流年明细。',
    '',
    '## 当前模式',
    '- 模式：profile-only',
    '- 模型意图：用温和、清楚、像咨询对话的方式，帮助用户理解自己、整理困惑、找到下一步。',
    '- 命理权重：低。只在用户明确要求“命理依据”时简短说明，否则不要主动展开命理术语。',
    `- 档案状态：${profileStatus === 'ready' ? '正式命理档案可用' : profileStatus === 'stale' ? '命理档案可能已过期' : '正式命理档案暂未生成'}`,
    '',
    '## 用户基础信息',
    `- 姓名：${activeCase.name}`,
    `- 性别：${activeCase.gender === 'male' ? '男' : '女'}`,
    `- 命例备注：${text(activeCase.note)}`,
    '',
    '## 已知现实事实',
    buildLifeFactsSection(activeCase.lifeFacts),
    '',
    '## 用户命理档案层',
    buildChartProfileSection(profile),
    '',
    '## 已生成认识自己报告摘要',
    buildReportProfileSection(report),
    '',
    '## 方向助手回答方式',
    '- 先回应用户的感受或困惑，再给出观察，不要一上来下结论。',
    '- 优先用心理语言解释：需求、动机、防御、压力反应、边界感、安全感、关系模式、行动惯性。',
    '- 每次回答尽量包含三层：1）你可能正在经历什么；2）这种模式可能怎么形成；3）现在可以做什么小调整。',
    '- 语气要像一个温和、清醒、尊重用户自主性的咨询陪伴者，不要像算命批语。',
    '- 少用“命宫、四化、格局、化忌、八字、星曜、大限、流年”等术语。除非用户主动问依据，否则不要主动展开。',
    '- 如果必须提命理依据，只用一句话带过，并立即翻译成现实心理含义。',
    '- 不要使用“注定、必然、一定、你就是、你必须、你的问题是”等绝对化或评判性表达。',
    '- 多使用“可能、倾向、也许、可以观察、可以先试试”。',
    '- 不要替用户做重大决定；给出可验证的小行动、反思问题和下一步实验。',
    '- 如果用户问具体命盘依据，但 profile-only 上下文没有提供，就说明“当前档案里没有这部分依据”，不要补造。',
    '- 回答长度控制在 3-6 段；用户问得很小，就简短回答。',
  ].join('\n')
}

export function buildAgentRequestMarkdown(contextMarkdown: string, question: string) {
  return `${contextMarkdown}\n\n## 用户当前问题\n${text(question, '请结合当前上下文进行整体分析。')}`
}
