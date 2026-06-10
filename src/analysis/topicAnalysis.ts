import { buildOverallAnalysis } from './overallAnalysis'
import { buildPalaceResult } from './palaceAnalysis'
import type { ChartModel, GongName, TopicName, TopicResult } from './types'

const TOPIC_PALACES: Record<TopicName, GongName[]> = {
  个性: ['命宫', '迁移', '福德'],
  事业: ['官禄', '迁移', '财帛'],
  财富: ['财帛', '福德', '田宅'],
  婚姻: ['夫妻', '官禄', '福德'],
  健康: ['疾厄', '福德', '父母'],
}

const TOPIC_INTRO: Record<TopicName, string> = {
  个性: '先看命宫主轴，再看迁移与福德如何把人格放到外界和内在感受里。',
  事业: '事业以官禄为核心，联看迁移的外部舞台与财帛的资源兑现方式。',
  财富: '财富以财帛为核心，但必须联看福德的欲望/享受与田宅的资源沉淀。',
  婚姻: '婚姻以夫妻宫为核心，必须联看官禄这条夫官线，以及福德里的关系感受。',
  健康: '健康以疾厄为核心，联看福德的精神消耗和父母宫的先天/长辈压力线索。',
}

function getPalaceIndex(model: ChartModel, palace: GongName) {
  return model.palaces.find((item) => item.name === palace)?.index ?? null
}

function describePalace(model: ChartModel, palace: GongName) {
  const palaceModel = model.palaces.find((item) => item.name === palace)
  if (!palaceModel) return `${palace}资料暂缺。`

  const stars = palaceModel.mainStar.length > 0 ? palaceModel.mainStar.join('、') : '无主星'
  const natal = model.shengNianSiHua
    .filter((item) => item.palace === palace)
    .map((item) => `${item.star}化${item.type}`)
  const self = model.ziHua
    .filter((item) => item.sourcePalace === palace || item.targetPalace === palace)
    .map((item) => `${item.direction}${item.star}化${item.hua}`)

  return `${palace}主星：${stars}。${natal.length > 0 ? `生年四化：${natal.join('、')}。` : ''}${
    self.length > 0 ? `自化/向心：${self.slice(0, 3).join('、')}。` : ''
  }`
}

export function buildTopicAnalyses(model: ChartModel | null): TopicResult[] {
  if (!model) return []

  const overall = buildOverallAnalysis(model)

  return (Object.keys(TOPIC_PALACES) as TopicName[]).map((topic) => {
    const focusPalaces = TOPIC_PALACES[topic]
    const palaceResults = focusPalaces
      .map((palace) => {
        const palaceIndex = getPalaceIndex(model, palace)
        return palaceIndex === null ? null : buildPalaceResult(model, palaceIndex)
      })
      .filter(Boolean)
    const alerts = palaceResults.flatMap((result) => result?.alerts ?? [])
    const leadingPalace = focusPalaces[0]

    return {
      topic,
      headline: `${topic}：先看${leadingPalace}`,
      summary: `${TOPIC_INTRO[topic]}${overall ? ` 当前整盘格局为${overall.patternLabel}、${overall.energyQuadrant}。` : ''}`,
      focusPalaces,
      points: [
        ...focusPalaces.map((palace) => describePalace(model, palace)),
        alerts[0]?.description ?? `${topic}专题暂未形成高强度警示，先按本宫、对宫、三方四正顺序阅读。`,
      ],
      alerts,
    }
  })
}
