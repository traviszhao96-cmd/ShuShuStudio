import { getOppositeGong, GONG_ORDER } from './chartModel'
import type { ChartModel, HeTuBreakItem, JiChain, MutagenChainResult } from './types'

// 河图太极分组（三成员版：等差五递增）
// 一六: 1→6→11  二七: 2→7→12  三八/四九/五十: 命名对即全体
const HE_TU_MEMBERS: Record<string, string[]> = {
  '一六共宗': ['命宫', '疾厄', '福德'],
  '二七同道': ['兄弟', '迁移', '父母'],
  '三八为朋': ['夫妻', '交友'],
  '四九为友': ['子女', '官禄'],
  '五十同途': ['财帛', '田宅'],
}

const HE_TU_THEMES: Record<string, string> = {
  '一六共宗': '自己·身体·精神',
  '二七同道': '同辈·外界·长辈',
  '三八为朋': '亲密·大众关系',
  '四九为友': '成果·事业延伸',
  '五十同途': '资源·资产沉淀',
}

// 河图破方向直解（来源：hetu-break.md + brother-palace-analysis.md）
type HeTuDirection = {
  direct: string
  transferred: string
  asymmetric?: string
}
// key: "groupName|from|to"
const HE_TU_DIRECTION_MAP: Record<string, HeTuDirection> = {
  // === 一六共宗 ===
  '一六共宗|命宫|疾厄': { direct: '自身行为/选择伤害身体健康。', transferred: '命宫=疾厄的福德宫→精神源头压迫身体，过度思虑内耗致病。' },
  '一六共宗|疾厄|命宫': { direct: '身体疾病/先天体质限制人生发展。', transferred: '疾厄=命宫的疾厄宫(自反)→身体本身就是命主的底层课题。' },
  '一六共宗|命宫|福德': { direct: '自身选择/行为伤害精神健康和福气。透支型人格。', transferred: '命宫=福德的命宫→命主的存在方式本身就消耗自身福报。' },
  '一六共宗|福德|命宫': { direct: '精神困扰/抑郁反噬人生方向。想太多做不了。', transferred: '福德=命宫的福德宫→先天福报不足反噬自身。' },
  '一六共宗|疾厄|福德': { direct: '疾病/身体消耗精神福气。久病拖垮心态。', transferred: '疾厄=福德的疾厄宫→精神世界的病灶落在身体上，身心一体互相拖累。' },
  '一六共宗|福德|疾厄': { direct: '精神压力/焦虑致病。情绪问题躯体化。', transferred: '福德=疾厄的福德宫→身体的福报被精神掏空，心病引身病。' },
  // === 二七同道 ===
  '二七同道|兄弟|父母': { direct: '手足/平辈关系冲击父母/长辈。', transferred: '兄弟=父母的夫妻宫→父母婚姻出问题，或母亲克父亲。' },
  '二七同道|父母|兄弟': { direct: '长辈/父母冲击手足/平辈关系。', transferred: '父母=兄弟的福德宫→父母高期待严厉管教压垮手足。' },
  '二七同道|迁移|父母': { direct: '外出奔波变动伤害与父母/长辈的缘分。', transferred: '迁移=父母的交友宫→父母外部人脉反噬父母本身。' },
  '二七同道|迁移|兄弟': { direct: '外出奔波伤害手足/平辈关系。', transferred: '迁移=兄弟的疾厄宫→手足身体不好或根基不稳。' },
  '二七同道|父母|迁移': { direct: '长辈家庭责任牵制外出发展。', transferred: '父母=迁移的疾厄宫→先天根基限制发展方向。' },
  // === 三八为朋 ===
  '三八为朋|交友|夫妻': { direct: '外部人际关系破坏婚姻。朋友圈/工作圈的人插足。', transferred: '交友=夫妻的疾厄宫→外来者盯上婚姻弱点；同时也伤自身事业。', asymmetric: '⚠️ 交友冲夫妻 > 夫妻冲交友。戴安娜王妃案例：交友文昌忌冲夫妻，外部关系毁婚姻。' },
  '三八为朋|夫妻|交友': { direct: '婚姻状况影响外部社交。已婚者社交受限制。', transferred: '夫妻=交友的田宅宫→家庭/婚姻拖累朋友圈。' },
  // === 四九为友 ===
  '四九为友|子女|官禄': { direct: '下属搞鬼、合伙出问题、子女拖累事业。陈小飞原话：下属搞小动作，在背后捅你一刀。', transferred: '子女=官禄的子女宫→事业的产出物反噬事业本身；培养的人翻脸。', asymmetric: '⚠️ 子女冲官禄 > 官禄冲子女。' },
  '四九为友|官禄|子女': { direct: '事业压力伤害子女/下属关系。', transferred: '官禄=子女的官禄宫→工作太忙忽略孩子；事业方向让产出打折扣。' },
  // === 五十同途 ===
  '五十同途|田宅|财帛': { direct: '房产/家庭掏空财富。买房负债、家宅耗财。', transferred: '田宅=财帛的福德宫→财富的精神源头(家)在消耗钱。' },
  '五十同途|财帛|田宅': { direct: '钱财问题冲击家庭/房产。破产卖房、钱的问题伤家。', transferred: '财帛=田宅的财帛宫(自反)→家本身需要钱但来源断了。' },
}

function getHeTuDirection(groupName: string, from: string, to: string): HeTuDirection {
  return HE_TU_DIRECTION_MAP[`${groupName}|${from}|${to}`] ?? { direct: `${from}飞忌冲${to}，河图破成立。`, transferred: '' }
}

// 本对线映射
function getLine(palace: string): [string, string] {
  return [palace, getOppositeGong(palace)]
}

const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const TIAN_GAN_ARY = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const SHENGXIAO: Record<string, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪',
}

function buildHeTuBreaks(model: ChartModel): HeTuBreakItem[] {
  const jis = model.feiHua.filter((f) => f.hua === '忌')
  const results: HeTuBreakItem[] = []
  const birthYear = model.basicInfo.birthYear

  for (const [groupName, members] of Object.entries(HE_TU_MEMBERS)) {
    for (const A of members) {
      for (const ji of jis.filter((j) => j.sourcePalace === A)) {
        const chongTarget = getOppositeGong(ji.targetPalace)
        if (!members.includes(chongTarget) || chongTarget === A) continue

        const B = chongTarget
        const triggers: string[] = []
        let severity: 'medium' | 'high' | 'critical' = 'medium'

        // 引爆等级判定（★=潜伏 ★★=自化引爆 ★★★=生年引爆 ★★★★=双向引爆）
        const natalB = model.shengNianSiHua.filter((s) => s.palace === B)
        const ziJiA = model.ziHua.filter((z) => z.sourcePalace === A && z.hua === '忌')
        const ziJiB = model.ziHua.filter((z) => z.sourcePalace === B && z.hua === '忌')
        const natalA = model.shengNianSiHua.filter((s) => s.palace === A && s.type === '忌')

        if (natalB.length && (ziJiA.length || ziJiB.length || natalA.length)) {
          severity = 'critical'
          triggers.push(`${B}:生年${natalB.map((n) => n.star + n.type).join('+')}`)
        } else if (natalB.length) {
          severity = 'high'
          triggers.push(`${B}:生年${natalB.map((n) => n.star + n.type).join('+')}`)
        } else if (ziJiA.length || ziJiB.length) {
          severity = 'medium'
          if (ziJiA.length) triggers.push(`${A}:自化忌`)
          if (ziJiB.length) triggers.push(`${B}:自化忌`)
        } else {
          triggers.push('潜伏：双方无四化/自化')
        }
        if (natalA.length) triggers.push(`${A}:生年忌`)

        // 非对称严重度：三八交友冲夫妻、四九子女冲官禄 → 提一档
        const dir = getHeTuDirection(groupName, A, B)
        if (dir.asymmetric) {
          if (severity === 'medium') severity = 'high'
          else if (severity === 'high') severity = 'critical'
        }

        // 每条本对线上两个宫的大限(过滤 >100)
        const affectedLines: HeTuBreakItem['affectedLines'] = []
        for (const p of [B, A]) {
          const line = getLine(p)
          for (const g of line) {
            const dx = model.daXian.find((d) => d.palace === g)
            const range = dx?.range ?? ''
            const start = parseInt(range.split('-')[0])
            if (!isNaN(start) && start <= 100 && start >= 0) {
              // 去重
              if (!affectedLines.find(l => l.palace === g)) {
                affectedLines.push({ palace: g, line, daXianRange: range, isPrimary: g === B })
              }
            }
          }
        }
        // 排序: 被冲优先 → 按大限先后
        affectedLines.sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
          return parseInt(a.daXianRange) - parseInt(b.daXianRange)
        })

        // 流年: 每个有效大限都输出流年规则
        const liuNianGroups: HeTuBreakItem['liuNianGroups'] = []
        for (const aff of affectedLines) {
          const dx = model.daXian.find((d) => d.palace === aff.palace)
          const pal = model.palaces.find((p) => p.name === aff.palace)
          if (!dx || !pal || !dx.range) continue
          const [ageStart, ageEnd] = dx.range.split('-').map(Number)
          if (ageStart > 100 || ageEnd > 100) continue
          const targetDiZhi = pal.diZhi
          const years = []
          for (let age = ageStart; age <= ageEnd && age <= 100; age++) {
            const calYear = birthYear + age - 1
            const tIdx = (calYear - 4) % 10
            const dIdx = (calYear - 4) % 12
            years.push({
              tianGanDiZhi: TIAN_GAN_ARY[tIdx] + DIZHI[dIdx],
              age,
              isTaiSui: DIZHI[dIdx] === targetDiZhi,
            })
          }
          liuNianGroups.push({ daXianPalace: aff.palace, daXianRange: dx.range, years })
        }

        // 太岁周期: 被冲宫地支 → 一生中每次临太岁
        const taiDiZhi = model.palaces.find((p) => p.name === B)?.diZhi ?? ''
        const taiSuiYears: { tianGanDiZhi: string; age: number }[] = []
        if (taiDiZhi) {
          for (let age = 1; age <= 100; age++) {
            const calYear = birthYear + age - 1
            const dIdx = (calYear - 4) % 12
            if (DIZHI[dIdx] === taiDiZhi) {
              const tIdx = (calYear - 4) % 10
              taiSuiYears.push({ tianGanDiZhi: TIAN_GAN_ARY[tIdx] + taiDiZhi, age })
            }
          }
        }
        const taiSuiCycle = {
          diZhi: taiDiZhi,
          shengXiao: SHENGXIAO[taiDiZhi] ?? taiDiZhi,
          years: taiSuiYears,
        }

        results.push({
          groupName, groupTheme: HE_TU_THEMES[groupName] ?? '',
          from: A, to: B, star: ji.star,
          targetPalace: ji.targetPalace, severity, triggers,
          directInterpretation: dir.direct,
          transferredInterpretation: dir.transferred,
          asymmetricNote: dir.asymmetric,
          affectedLines, liuNianGroups, taiSuiCycle,
        })
      }
    }
  }

  return results
}

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
    heTuBreaks: buildHeTuBreaks(model),
  }
}
