import { getOppositeGong, GONG_ORDER } from './chartModel'
import type { ChartModel, GongName, HeTuGroup, MethodologyResult } from './types'

export const LIU_NEI_WAI_MAP: Record<GongName, '六内' | '六外'> = {
  命宫: '六内',
  兄弟: '六内',
  夫妻: '六内',
  子女: '六内',
  财帛: '六内',
  疾厄: '六内',
  迁移: '六外',
  交友: '六外',
  官禄: '六外',
  田宅: '六外',
  福德: '六外',
  父母: '六外',
}

export const HE_TU_GROUPS: HeTuGroup[] = [
  { name: '一六共宗', palaces: ['命宫', '疾厄'], theme: '论自己与身体承载' },
  { name: '二七同道', palaces: ['兄弟', '迁移'], theme: '论同辈与外界环境' },
  { name: '三八为朋', palaces: ['夫妻', '交友'], theme: '论亲密关系与大众关系' },
  { name: '四九为友', palaces: ['子女', '官禄'], theme: '论成果延伸与社会角色' },
  { name: '五十同途', palaces: ['财帛', '田宅'], theme: '论资源取得与资源沉淀' },
]

export function getHeTuGroupName(palace: GongName) {
  return HE_TU_GROUPS.find((group) => group.palaces.includes(palace))?.name ?? '未分组'
}

export function describeLaiyinGong(palace: GongName) {
  const opposite = getOppositeGong(palace)
  return `来因宫在${palace}，整体格局会反复围绕${palace}及其对宫${opposite}展开；先看这里为什么起事，再看四化往哪里落。`
}

export function buildMethodologyResult(model: ChartModel): MethodologyResult {
  const ti = Array.from(new Set(model.shengNianSiHua.map((item) => item.palace)))
  const yong = Array.from(new Set(model.ziHua.map((item) => item.targetPalace)))

  return {
    laiyinGong: model.laiyinGong,
    laiyinChain: model.shengNianSiHua.map((item) => ({
      type: item.type,
      star: item.star,
      source: model.laiyinGong,
      target: item.palace,
    })),
    tiYong: {
      ti,
      yong,
    },
    liuNeiWaiMap: GONG_ORDER.reduce(
      (acc, palace) => ({
        ...acc,
        [palace]: LIU_NEI_WAI_MAP[palace],
      }),
      {} as Record<GongName, '六内' | '六外'>,
    ),
    heTuGroups: HE_TU_GROUPS,
  }
}
