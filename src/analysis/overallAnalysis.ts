import { describeLaiyinGong } from './methodology'
import { buildMutagenChains } from './mutagenChains'
import type { AlertItem, ChartModel, OverallResult, SiHuaType } from './types'

const PERSONALITY_TAGS: Record<SiHuaType, string> = {
  禄: '重资源与顺手感',
  权: '重掌控与执行',
  科: '重名义与解释权',
  忌: '重结果也容易执着',
}

export function buildOverallAnalysis(model: ChartModel | null): OverallResult | null {
  if (!model) return null

  const chains = buildMutagenChains(model)
  const highEnergyPalaces = model.palaces.filter((palace) => {
    const natalCount = model.shengNianSiHua.filter((item) => item.palace === palace.name).length
    const ziHuaCount = model.ziHua.filter((item) => item.targetPalace === palace.name).length
    return natalCount + ziHuaCount >= 2
  })
  const alerts: AlertItem[] = [
    ...chains.jiChains.slice(0, 4).map((chain) => ({
      severity: chain.severity,
      category: '忌转忌',
      description: chain.impact,
      relatedPalaces: [chain.source.gong, chain.target.gong],
    })),
    ...highEnergyPalaces.slice(0, 3).map((palace) => ({
      severity: 'medium' as const,
      category: '过犹不及',
      description: `${palace.name}同时承接多组四化或自化，容易成为能量浓度较高的位置。`,
      relatedPalaces: [palace.name],
    })),
  ]
  const personalityType = model.shengNianSiHua.map((item) => item.type).join('-') || '待定'
  const personalityTags = model.shengNianSiHua.map((item) => PERSONALITY_TAGS[item.type])
  const jiTarget = model.shengNianSiHua.find((item) => item.type === '忌')

  return {
    laiyinGong: model.laiyinGong,
    laiyinInterpretation: describeLaiyinGong(model.laiyinGong),
    personalityType,
    personalityTags: Array.from(new Set(personalityTags)),
    alerts,
    highlights: [
      `来因宫落${model.laiyinGong}，一级分析要先从这里定整盘起事点。`,
      jiTarget ? `生年忌落${jiTarget.palace}，这是第一优先级的压力落点。` : '当前没有抓到生年忌落点。',
      `当前读到${model.ziHua.length}组自化/向心线，适合继续拆体用发用。`,
      alerts[0]?.description ?? '暂未形成高强度警示链，可以先从命迁轴和来因宫展开。',
    ],
  }
}
