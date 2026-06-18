import { buildNatalSiHuaOverview, buildPalaceScores, describeLaiyinGong, detectPatterns } from './methodology'
import { buildMutagenChains } from './mutagenChains'
import type { AlertItem, ChartModel, GongName, MingQianAxisOverview, OverallResult, SiHuaType } from './types'

const PERSONALITY_TAGS: Record<SiHuaType, string> = {
  禄: '重资源与顺手感',
  权: '重掌控与执行',
  科: '重名义与解释权',
  忌: '重结果也容易执着',
}

function starText(model: ChartModel, palaceName: GongName) {
  const palace = model.palaces.find((item) => item.name === palaceName)
  return palace?.mainStar.length ? palace.mainStar.join('、') : '无正曜'
}

function palaceDiZhi(model: ChartModel, palaceName: GongName) {
  return model.palaces.find((item) => item.name === palaceName)?.diZhi ?? ''
}

function natalHuaText(model: ChartModel, palaceName: GongName) {
  return model.shengNianSiHua
    .filter((item) => item.palace === palaceName)
    .map((item) => `${item.star}化${item.type}`)
}

function buildMingQianAxis(model: ChartModel): MingQianAxisOverview {
  const mingHua = natalHuaText(model, '命宫')
  const qianyiHua = natalHuaText(model, '迁移')
  const mingHasJi = mingHua.some((item) => item.endsWith('化忌'))
  const qianyiHasJi = qianyiHua.some((item) => item.endsWith('化忌'))
  const summary = qianyiHasJi
    ? '迁移宫见生年忌，命迁轴的重点在外界环境、社会评价与外出变动对自我稳定感的影响。'
    : mingHasJi
      ? '命宫见生年忌，命迁轴的重点在自我要求、身份认同与向外发展之间的拉扯。'
      : '命宫看自身底色，迁移宫看外部舞台；这条轴适合用来判断一个人如何把自身能力带到外界。'

  return {
    ming: {
      stars: starText(model, '命宫'),
      diZhi: palaceDiZhi(model, '命宫'),
      natalHua: mingHua,
    },
    qianyi: {
      stars: starText(model, '迁移'),
      diZhi: palaceDiZhi(model, '迁移'),
      natalHua: qianyiHua,
    },
    summary,
  }
}

export function buildOverallAnalysis(model: ChartModel | null): OverallResult | null {
  if (!model) return null

  const chains = buildMutagenChains(model)
  const palaceScores = buildPalaceScores(model)

  // 告警: 河图破 + 忌转忌(top4) + 病灶型宫位
  const alerts: AlertItem[] = [
    ...chains.heTuBreaks.map((b) => ({
      severity: b.severity,
      category: `河图破·${b.groupName}`,
      description: `${b.from}${b.star}忌→${b.targetPalace}冲${b.to}。${b.triggers.join('；')}`,
      relatedPalaces: [b.from, b.to],
    })),
    ...chains.jiChains
      .sort((a, b) => (a.severity === 'high' ? -1 : b.severity === 'high' ? 1 : 0))
      .slice(0, 4)
      .map((chain) => ({
        severity: chain.severity,
        category: '忌转忌',
        description: chain.impact,
        relatedPalaces: [chain.source.gong, chain.target.gong],
      })),
    ...palaceScores
      .filter((p) => p.quadrant === '病灶型')
      .map((p) => ({
        severity: 'medium' as const,
        category: '病灶宫',
        description: `${p.palace} 能量${p.energy.grade}但质量${p.quality.grade}(${p.quality.score}分)，高能低质，容易成为问题焦点。`,
        relatedPalaces: [p.palace],
      })),
  ]

  const personalityType = model.shengNianSiHua.map((item) => item.type).join('-') || '待定'
  const personalityTags = model.shengNianSiHua.map((item) => PERSONALITY_TAGS[item.type])
  const jiTarget = model.shengNianSiHua.find((item) => item.type === '忌')

  return {
    laiyinGong: model.laiyinGong,
    shenGong: model.basicInfo.shenGong,
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
    palaceScores,
    patterns: detectPatterns(model),
    natalSiHua: buildNatalSiHuaOverview(model),
    mingQianAxis: buildMingQianAxis(model),
  }
}
