import type { ChartModel, TopicName } from '../analysis/types'

const TOPIC_GUIDES: Record<TopicName, string> = {
  个性: `命宫主星决定的核心性格；迁移宫如何影响外界表现；福德宫如何影响内在感受；四化能量如何塑造人格。`,
  事业: `官禄宫主星决定的职业特质；迁移宫如何影响外部舞台；财帛宫如何影响资源兑现；四化能量的推动或制约。`,
  财富: `财帛宫主星决定的财富特质；福德宫对消费欲望的影响；田宅宫对资产沉淀的作用；四化能量对财运的推动或消耗。`,
  婚姻: `夫妻宫主星决定的感情特质；官禄宫对婚姻的联动影响；福德宫如何影响感情期待；四化能量对感情的推动或挑战。`,
  健康: `疾厄宫主星对应的体质特点；福德宫对精神状态的影响；父母宫对先天体质的影响；四化能量对健康的促进或消耗。注意只做趋势分析，不给出医疗建议。`,
}

export type ReportSection = {
  conclusion: string
  facts: string
}

export type ParsedReport = {
  headline: string
  sections: ReportSection[]
}

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

export function buildTopicPrompt(model: ChartModel, topic: TopicName) {
  const guide = TOPIC_GUIDES[topic]
  const facts = buildPalaceFacts(model, topic)
  const overall = [
    `来因${model.laiyinGong}`,
    `生年四化：${model.shengNianSiHua.map((x) => `${x.star}化${x.type}落${x.palace}`).join('、') || '无'}`,
    `五行局${model.basicInfo.wuXingJu}`,
  ].join('；')

  return `你是紫微斗数命理分析师。对「${topic}」专题撰写报告。

输出格式（严格）：
第一行：# 论断式标题（10-16字，凝练有力）
之后每个分析点用以下结构：
§ 论断
† 支撑该论断的命盘事实（仅星曜/宫位/四化，一句话）

要求：
- 每个§段落只写分析结论，不写事实
- 每个†只写命盘事实，不写分析
- 共写3-5组§+†
- 不要写其他文字

分析要点：${guide}

背景：${overall}
相关宫位：${facts}`
}

export function parseReport(raw: string): ParsedReport {
  const lines = raw.trim().split('\n')
  let headline = ''
  const sections: ReportSection[] = []
  let currentConclusion = ''
  let currentFacts = ''

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue

    if (t.startsWith('# ')) {
      headline = t.replace(/^#\s+/, '')
    } else if (t.startsWith('§')) {
      // Save previous section if exists
      if (currentConclusion) {
        sections.push({ conclusion: currentConclusion.trim(), facts: currentFacts.trim() })
      }
      currentConclusion = t.replace(/^§\s*/, '')
      currentFacts = ''
    } else if (t.startsWith('†')) {
      currentFacts = t.replace(/^†\s*/, '')
    } else if (currentFacts) {
      // Continuation of facts
      currentFacts += ' ' + t
    } else if (currentConclusion) {
      // Continuation of conclusion
      currentConclusion += '\n' + t
    }
  }

  // Save last section
  if (currentConclusion) {
    sections.push({ conclusion: currentConclusion.trim(), facts: currentFacts.trim() })
  }

  return {
    headline: headline || `${'专题分析'}`,
    sections: sections.length > 0 ? sections : [{ conclusion: raw, facts: '' }],
  }
}
