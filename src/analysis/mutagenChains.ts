import { getOppositeGong } from './chartModel'
import type { ChartModel, JiChain, MutagenChainResult } from './types'

export function buildMutagenChains(model: ChartModel): MutagenChainResult {
  const natalJi = model.shengNianSiHua.find((item) => item.type === '忌')
  const jiChains: JiChain[] = model.feiHua
    .filter((item) => item.hua === '忌')
    .map((item) => ({
      source: {
        gong: item.sourcePalace,
        star: item.star,
        type: natalJi?.palace === item.sourcePalace ? '生年忌' : '飞宫忌',
      },
      target: {
        gong: item.targetPalace,
        star: item.star,
      },
      impact: `${item.sourcePalace}飞${item.star}忌到${item.targetPalace}，同时冲${getOppositeGong(item.targetPalace)}。`,
      severity: natalJi?.palace === item.sourcePalace ? 'high' : 'medium',
    }))

  const luSuiJi = jiChains
    .map((chain) => {
      const lu = model.feiHua.find((item) => item.sourcePalace === chain.source.gong && item.hua === '禄')
      if (!lu) return null
      return {
        jiSource: chain.source.gong,
        luTarget: lu.targetPalace,
        description: `${chain.source.gong}已经飞忌到${chain.target.gong}，同宫飞禄到${lu.targetPalace}，可作为禄随忌走的第一层提示。`,
      }
    })
    .filter(Boolean) as MutagenChainResult['luSuiJi']

  const keSuiQuan = model.feiHua
    .filter((item) => item.hua === '权')
    .map((quan) => {
      const ke = model.feiHua.find((item) => item.sourcePalace === quan.sourcePalace && item.hua === '科')
      if (!ke) return null
      return {
        quanSource: quan.sourcePalace,
        keTarget: ke.targetPalace,
        description: `${quan.sourcePalace}飞权到${quan.targetPalace}，同宫飞科到${ke.targetPalace}，可作为科随权走的解释线索。`,
      }
    })
    .filter(Boolean) as NonNullable<MutagenChainResult['keSuiQuan']>

  return {
    jiChains,
    luSuiJi,
    keSuiQuan,
  }
}
