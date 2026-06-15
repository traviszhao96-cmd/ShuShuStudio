import type { ChartModel, TopicName } from '../analysis/types'

const TOPIC_ORDER: TopicName[] = ['个性', '事业', '财富', '婚姻', '健康']

const TOPIC_GUIDES: Record<TopicName, string> = {
  个性: `命宫主星决定的核心性格；迁移宫如何影响外界表现；福德宫如何影响内在感受；四化能量如何塑造人格`,
  事业: `官禄宫主星决定的职业特质；迁移宫如何影响外部舞台；财帛宫如何影响资源兑现；四化能量的推动或制约`,
  财富: `财帛宫主星决定的财富特质；福德宫对消费欲望的影响；田宅宫对资产沉淀的作用；四化能量对财运的推动或消耗`,
  婚姻: `夫妻宫主星决定的感情特质；官禄宫对婚姻的联动影响；福德宫如何影响感情期待；四化能量对感情的推动或挑战`,
  健康: `疾厄宫主星对应的体质特点；福德宫对精神状态的影响；父母宫对先天体质的影响；四化能量对健康的促进或消耗`,
}

export type ReportSection = {
  conclusion: string
  facts: string
}

export type ParsedReport = {
  headline: string
  sections: ReportSection[]
}

export type AnalysisMode = 'combined' | 'two-pass'

function buildPalaceFacts(model: ChartModel, topic: TopicName) {
  const palaceMap: Record<TopicName, string[]> = {
    个性: ['命宫', '迁移', '福德'],
    事业: ['官禄', '迁移', '财帛'],
    财富: ['财帛', '福德', '田宅'],
    婚姻: ['夫妻', '官禄', '福德'],
    健康: ['疾厄', '福德', '父母'],
  }
  return palaceMap[topic]
    .map((name) => {
      const p = model.palaces.find((x) => x.name === name)
      if (!p) return `${name}：-`
      const s = [p.mainStar.join('、') || '无主星']
      const n = model.shengNianSiHua.filter((x) => x.palace === name)
      if (n.length) s.push(n.map((x) => `${x.star}化${x.type}`).join('、'))
      return `${name}（${p.heavenlyStem}${p.diZhi}）：${s.join('，')}`
    })
    .join('；')
}

function buildZiweiBlock(model: ChartModel) {
  const lines = [
    `来因${model.laiyinGong}`,
    `生年四化：${model.shengNianSiHua.map((x) => `${x.star}化${x.type}落${x.palace}`).join('、') || '无'}`,
    `五行局${model.basicInfo.wuXingJu}`,
  ]
  TOPIC_ORDER.forEach((topic) => {
    lines.push(`【${topic}】${buildPalaceFacts(model, topic)}`)
  })
  return lines.join('\n')
}

function buildBaziBlock(model: ChartModel) {
  if (!model.bazi) return '无八字数据'
  const p = model.bazi
  return [
    `四柱：${p.year} ${p.month} ${p.day}${p.hour ? ` ${p.hour}` : ''}`,
    `日主为日柱天干，代表命主自身`,
  ].join('\n')
}

// ── Approach A: Combined single prompt ──

export function buildCombinedPrompt(model: ChartModel, topic: TopicName) {
  const guide = TOPIC_GUIDES[topic]
  const ziwei = buildZiweiBlock(model)
  const bazi = buildBaziBlock(model)

  return `你是一位温和、有同理心的命理咨询师，精通紫微斗数与八字。对「${topic}」撰写分析。

语气：温和鼓励，像长辈或导师娓娓道来。整合紫微与八字两个体系。

输出格式（严格）：
第一行：# 论断式标题（8-12字）
之后：
§ 论断
† 支撑事实（星曜/宫位/四化/四柱，一句话）

共写3-5组§+†，不写其他文字。

分析要点：${guide}

【紫微斗数】
${ziwei}

【八字】
${bazi}`
}

// ── Approach B: Two-pass (Ziwei-only → Bazi-only → merge) ──

const ZIWEI_TOPIC_GUIDES: Record<TopicName, string> = {
  个性: `命宫主星决定核心性格，看迁移宫外界表现，福德宫内在感受，四化能量的性格塑造。`,
  事业: `官禄宫主星决定职业特质，迁移宫影响外部舞台与机遇，财帛宫影响资源兑现方式，四化推动或制约。`,
  财富: `财帛宫主星决定财富特质与格局，福德宫影响消费欲望与金钱态度，田宅宫影响资产沉淀。`,
  婚姻: `夫妻宫主星决定感情模式与配偶特质，官禄宫（夫官线）联动影响婚姻质量，福德宫影响感情期待。`,
  健康: `疾厄宫主星对应体质弱点，福德宫影响精神状态与压力承受，父母宫影响先天体质与遗传。`,
}

const BAZI_TOPIC_GUIDES: Record<TopicName, string> = {
  个性: `日主强弱与五行配置决定性格底色，十神分布看行为模式，月令提纲看人生基调。`,
  事业: `官杀与印星配置看事业方向与权力，食伤看才华输出方式，财星看资源获取能力。`,
  财富: `财星强弱与位置看财富格局，食伤是否生财看赚钱能力，比劫是否夺财看守财能力。`,
  婚姻: `日支夫妻宫与配偶星配置看感情模式，官杀（女）/财星（男）看配偶特质，日柱看婚姻稳定性。`,
  健康: `五行偏枯看体质弱点，日主强弱看元气根基，冲刑会合看疾病隐患与突发风险。`,
}

export function buildZiweiOnlyPrompt(model: ChartModel) {
  const guides = TOPIC_ORDER.map((t) => `【${t}】${ZIWEI_TOPIC_GUIDES[t]}`).join('\n')
  return `内部分析任务：仅从紫微斗数角度，对以下五个专题提取可供最终报告使用的判断。你的输出是分析底稿，不直接展示给普通用户。

各专题分析要点：
${guides}

【紫微斗数数据】
${buildZiweiBlock(model)}

输出格式（每个专题用 ## 专题名 分隔）：
## 个性
# 一句话核心判断
§ 可观察到的现实表现或倾向
† 支撑判断的星曜/宫位/四化事实
（2-3组）

## 事业
...
要求：
- 五个专题都要写
- 依据只用于校验判断，不展开讲解术语
- 不写命理科普，不堆砌星曜和宫位名称
- 避免绝对化预测，重点提取现实倾向`
}

export function buildBaziOnlyPrompt(model: ChartModel) {
  if (!model.bazi) return ''
  const guides = TOPIC_ORDER.map((t) => `【${t}】${BAZI_TOPIC_GUIDES[t]}`).join('\n')
  return `内部分析任务：仅从八字角度，对以下五个专题提取可供最终报告使用的判断。你的输出是分析底稿，不直接展示给普通用户。禁止使用紫微斗数术语（如命宫、迁移宫、福德宫等）。

各专题分析要点：
${guides}

【八字数据】
${buildBaziBlock(model)}

输出格式（每个专题用 ## 专题名 分隔）：
## 个性
# 一句话核心判断
§ 可观察到的现实表现或倾向
† 支撑判断的八字事实
（2-3组）

## 事业
...
要求：
- 五个专题都要写
- 依据只用于校验判断，不展开讲解术语
- 不写命理科普，不堆砌日主、十神、五行和柱位
- 避免绝对化预测，重点提取现实倾向`
}

export function buildMergePrompt(ziweiOutput: string, baziOutput: string) {
  return `你是一位温和、清醒的人生方向顾问。参考两份内部分析底稿，写一份面向普通用户的现实生活报告。

这不是命理知识讲解。读者更关心自己可能有哪些特点、适合怎样选择，以及接下来能做什么。

要求：
- 用最简单平实的现代语言，像一位了解读者的朋友或职业顾问
- 正文重点写现实表现、优势、可能的盲区和可执行建议
- 把命理依据留在内部思考中，不要逐条复述，不要解释命理知识
- 综合正文原则上禁止出现星曜名称、宫位、四化、四柱、日主、十神、五行等术语
- 每个专题只有确有必要时才允许一句极短的依据说明，并立即翻译成现实含义；没有必要时完全不提
- 输出前自检：删除不影响结论的所有命理术语和依据描述
- 不使用“注定”“必然”“一定会”等绝对表达
- 健康部分只讨论生活习惯与压力管理，不诊断疾病
- 用"你"称呼读者，语气温暖、直接、不煽情
- 必须用 Markdown 格式输出
- 每个专题写3-4段，每段承担一种作用：核心判断、现实表现、行动建议、必要提醒
- 建议必须具体，避免“相信自己”“保持积极”等空泛表达

输出格式（每个专题用 ## 专题名 分隔）：
## 个性
# 现实、易懂的标题（8-12字，不使用命理术语）

正文段落（Markdown）...

## 事业
...

【参考分析】
${ziweiOutput}

${baziOutput || ''}`
}

// ── Parsers ──

export function parseReport(raw: string): ParsedReport {
  const lines = raw.trim().split('\n')
  let headline = ''
  const sections: ReportSection[] = []
  let markdownLines: string[] = []
  let legacySection: ReportSection | null = null
  let legacyField: keyof ReportSection | null = null

  const flushMarkdown = () => {
    const conclusion = markdownLines.join('\n').trim()
    if (conclusion) sections.push({ conclusion, facts: '' })
    markdownLines = []
  }

  const flushLegacy = () => {
    if (legacySection && (legacySection.conclusion || legacySection.facts)) {
      sections.push({
        conclusion: legacySection.conclusion.trim(),
        facts: legacySection.facts.trim(),
      })
    }
    legacySection = null
    legacyField = null
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      flushMarkdown()
      continue
    }
    if (t.startsWith('# ') && !headline) {
      headline = t.replace(/^#\s+/, '')
      continue
    }
    if (t.startsWith('§')) {
      flushMarkdown()
      flushLegacy()
      legacySection = { conclusion: t.replace(/^§\s*/, ''), facts: '' }
      legacyField = 'conclusion'
      continue
    }
    if (t.startsWith('†')) {
      flushMarkdown()
      legacySection ??= { conclusion: '', facts: '' }
      const facts = t.replace(/^†\s*/, '')
      legacySection.facts += `${legacySection.facts ? '\n' : ''}${facts}`
      legacyField = 'facts'
      continue
    }
    if (legacySection && legacyField) {
      legacySection[legacyField] += `${legacySection[legacyField] ? '\n' : ''}${t}`
      continue
    }
    markdownLines.push(line.trimEnd())
  }
  flushMarkdown()
  flushLegacy()

  return {
    headline: headline || '专题分析',
    sections,
  }
}

/** Split a bulk response (## 专题名 sections) into per-topic raw strings */
export function splitBulkResponse(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  const blocks = raw.split(/(?=^## )/m)
  for (const block of blocks) {
    const m = block.match(/^##\s*(\S+)/m)
    if (m) {
      // map possible names
      const name = m[1]
      const key = TOPIC_ORDER.find((t) => name.includes(t)) ?? name
      result[key] = block.replace(/^##\s*\S+.*\n?/m, '').trim()
    }
  }
  return result
}
