import { getOppositeGong, getSanFang, GONG_ORDER } from './chartModel'
import { getHeTuGroupName, LIU_NEI_WAI_MAP } from './methodology'
import { buildMutagenChains } from './mutagenChains'
import type { AlertItem, ChartModel, GongName, PalaceBasic, PalaceResult, ZhuanGongItem } from './types'

const PALACE_PRIMARY: Record<GongName, string> = {
  命宫: '性格主轴、行动方式和一生最核心的推进模式。',
  兄弟: '同辈、手足、亲近合作和资源分担方式。',
  夫妻: '亲密关系、配偶特质与婚恋互动模式。',
  子女: '子女、作品、桃花、延伸成果与成家后状态。',
  财帛: '直接财富、收入方式、资源调度和花钱逻辑。',
  疾厄: '身体承载、压力落点、隐性消耗与健康议题。',
  迁移: '外界舞台、移动变化、他人眼中的自己。',
  交友: '大众关系、团队、合作对象与外部人脉。',
  官禄: '事业角色、社会位置、责任结构与长期目标。',
  田宅: '家庭空间、不动产、内在安定感和资源沉淀。',
  福德: '精神世界、享受方式、潜意识和长期福报。',
  父母: '长辈、原生家庭、学习证照和外部保护系统。',
}

function buildPalaceBasic(palace: GongName): PalaceBasic {
  return {
    number: GONG_ORDER.indexOf(palace) + 1,
    primary: PALACE_PRIMARY[palace],
    layers: [
      { label: '本宫', meaning: PALACE_PRIMARY[palace] },
      { label: '对宫', meaning: `必须同时联看${getOppositeGong(palace)}，判断这件事是本宫内发，还是被对宫牵动。` },
      { label: '体用', meaning: '先看生年四化作为体，再看自化与飞宫作为用。' },
    ],
    liuNeiWai: LIU_NEI_WAI_MAP[palace],
    heTuGroup: getHeTuGroupName(palace),
  }
}

function buildZhuanGong(palace: GongName): ZhuanGongItem[] {
  const palaceIndex = GONG_ORDER.indexOf(palace)
  return ['命宫', '夫妻', '财帛'].map((asPalace) => {
    const asIndex = GONG_ORDER.indexOf(asPalace as GongName)
    const relative = GONG_ORDER[(palaceIndex - asIndex + 12) % 12]
    return {
      as: asPalace as GongName,
      meaning: `以${asPalace}为太极，${palace}可转为${relative}。`,
      implication: `这让${palace}除了本义之外，也能补充${asPalace}专题里的${relative}象。`,
    }
  })
}

export function buildPalaceResult(model: ChartModel | null, palaceIndex: number | null): PalaceResult | null {
  if (!model || palaceIndex === null) return null

  const palace = model.palaces.find((item) => item.index === palaceIndex)
  if (!palace) return null

  const chains = buildMutagenChains(model)
  const relatedAlerts: AlertItem[] = chains.jiChains
    .filter((chain) => chain.source.gong === palace.name || chain.target.gong === palace.name)
    .map((chain) => ({
      severity: chain.severity,
      category: '忌转忌',
      description: chain.impact,
      relatedPalaces: [chain.source.gong, chain.target.gong],
    }))
  const natalHere = model.shengNianSiHua.filter((item) => item.palace === palace.name)
  const ziHuaHere = model.ziHua.filter((item) => item.targetPalace === palace.name || item.sourcePalace === palace.name)
  const outgoing = model.feiHua.filter((item) => item.sourcePalace === palace.name)
  const incoming = model.feiHua.filter((item) => item.targetPalace === palace.name)
  const sanFang = getSanFang(palace.name)

  return {
    palace: palace.name,
    basics: buildPalaceBasic(palace.name),
    zhuanGong: buildZhuanGong(palace.name),
    siHuaHere: [
      ...natalHere.map((item) => ({
        type: item.type,
        star: item.star,
        meaning: `${item.star}生年化${item.type}落在${palace.name}，这是原盘给本宫的体。`,
        severity: item.type === '忌' ? ('warning' as const) : ('neutral' as const),
      })),
      ...ziHuaHere.map((item) => ({
        type: item.hua,
        star: item.star,
        meaning: `${item.sourcePalace}${item.direction}${item.star}化${item.hua}到${item.targetPalace}，这是本宫的用或被牵动处。`,
        severity: item.hua === '忌' ? ('warning' as const) : ('caution' as const),
      })),
    ],
    duiGongRelation: `${palace.name}与${getOppositeGong(palace.name)}互为本对宫。这里的结论不能只看本宫，要看对宫如何补充、冲动或承接。`,
    sanFangSiZheng: {
      main: sanFang.main,
      duiGong: sanFang.duiGong,
      left: sanFang.left,
      right: sanFang.right,
    },
    flowAnalysis: {
      outgoing: outgoing.map((item) => `${palace.name}飞${item.star}${item.hua}到${item.targetPalace}`),
      incoming: incoming.map((item) => `${item.sourcePalace}飞${item.star}${item.hua}到${palace.name}`),
    },
    alerts: relatedAlerts,
  }
}
