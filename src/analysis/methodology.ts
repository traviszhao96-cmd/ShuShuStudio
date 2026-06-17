import { getOppositeGong, GONG_ORDER } from './chartModel'
import type { ChartModel, GongName, HeTuGroup, MethodologyResult, NatalSiHuaOverview, PalaceScoreItem } from './types'

// ═══════════════════════════════════════
// 星曜亮度：庙旺得利平不陷
// ═══════════════════════════════════════
const BRIGHTNESS_SCORE: Record<string, number> = {
  '庙': 10, '旺': 8, '得': 5, '利': 2, '平': 0, '不': -2, '陷': -5, '': 0,
}

const BRIGHTNESS_GRADE: Record<string, string> = {
  '庙': '庙', '旺': '旺', '得': '得', '利': '利', '平': '平', '不': '不', '陷': '陷',
}

// 吉星煞星分类
const JI_STAR = new Set(['天魁', '天钺', '左辅', '右弼', '文昌', '文曲', '禄存', '天马'])
const SHA_STAR = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'])

// 星座亮度简称缩写
const STAR_ALIAS: Record<string, string> = {
  '紫微': '紫微', '天机': '天机', '太阳': '太阳', '武曲': '武曲', '天同': '天同', '廉贞': '廉贞',
  '天府': '天府', '太阴': '太阴', '贪狼': '贪狼', '巨门': '巨门', '天相': '天相', '天梁': '天梁',
  '七杀': '七杀', '破军': '破军',
}

export const LIU_NEI_WAI_MAP: Record<GongName, '六内' | '六外'> = {
  命宫: '六内',
  兄弟: '六外',
  夫妻: '六外',
  子女: '六外',
  财帛: '六内',
  疾厄: '六内',
  迁移: '六外',
  交友: '六外',
  官禄: '六内',
  田宅: '六内',
  福德: '六内',
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

export function getLaiyinMeaning(palace: GongName) {
  return LAIYIN_MEANING[palace]
}

export function describeLaiyinGong(palace: GongName) {
  const info = LAIYIN_MEANING[palace]
  return `来因为${palace}(${info.driveType})：${info.theme}。四化从此出发，落点决定各领域优先级。`
}

// ═══════════════════════════════════════
// 来因宫12宫含义表 (穷举)
// ═══════════════════════════════════════
const LAIYIN_MEANING: Record<GongName, { driveType: string; theme: string; focus: string }> = {
  命宫:       { driveType: '自我驱动', theme: '自我成长与身份认同', focus: '格局高低直接决定一生高度，四化从此出发投射到人生各领域' },
  兄弟:       { driveType: '关系驱动', theme: '手足同辈与合作关系', focus: '人生主线围绕合作、竞争、同辈互动展开，兄弟宫状态决定助力或拖累' },
  夫妻:       { driveType: '关系驱动', theme: '婚姻感情与一对一关系', focus: '感情、承诺、合作关系是一生反复课题，夫妻宫质量影响幸福感' },
  子女:       { driveType: '关系驱动', theme: '子嗣桃花与创作合伙', focus: '生育、桃花、合伙创业、创作表达是人生核心动力' },
  财帛:       { driveType: '环境驱动', theme: '赚钱与资源获取', focus: '一生围绕财富积累展开，赚钱方式、理财习惯是核心议题' },
  疾厄:       { driveType: '身体驱动', theme: '健康与身体承载', focus: '身体是一切的容器，健康状态、体质强弱决定能走多远' },
  迁移:       { driveType: '先天驱动', theme: '外出变动与外界环境', focus: '人生因变动而精彩，外出、迁移、远行是命运转折点' },
  交友:       { driveType: '关系驱动', theme: '朋友与大众关系', focus: '朋友质量、社会圈层、大众口碑是人生重要变量' },
  官禄:       { driveType: '环境驱动', theme: '事业与社会角色', focus: '事业成就、社会地位、职业方向是人生主线' },
  田宅:       { driveType: '环境驱动', theme: '家庭与房产根基', focus: '家庭背景、房产运、晚年归属感是核心关切' },
  福德:       { driveType: '先天驱动', theme: '精神世界与福报', focus: '内心满足感、精神追求、因果福报比物质更重要' },
  父母:       { driveType: '环境驱动', theme: '长辈与学历文书', focus: '父母长辈关系、学历文凭、读书运是人生基础' },
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

// ═══════════════════════════════════════
// 逐宫质量评分
// ═══════════════════════════════════════
function scorePalaceQuality(palaceName: GongName, model: ChartModel) {
  const breakdown: string[] = []
  let score = 50
  const pal = model.palaces.find((p) => p.name === palaceName)
  if (!pal) return { score: 50, grade: '中', breakdown: ['无数据'] }

  // 主星亮度
  if (pal.majorStar) {
    const b = pal.majorStarBrightness || ''
    const pts = BRIGHTNESS_SCORE[b] ?? 0
    score += pts
    breakdown.push(`${pal.majorStar}${BRIGHTNESS_GRADE[b] || b} ${pts > 0 ? '+' + pts : pts}`)
  }
  if (pal.coStar) {
    const b = pal.coStarBrightness || ''
    const pts = BRIGHTNESS_SCORE[b] ?? 0
    score += pts
    breakdown.push(`${pal.coStar}${BRIGHTNESS_GRADE[b] || b} ${pts > 0 ? '+' + pts : pts}`)
  }

  // 辅星
  let jiBonus = 0
  let shaPenalty = 0
  for (const s of pal.minorStars || []) {
    if (JI_STAR.has(s)) jiBonus += 2
    else if (SHA_STAR.has(s)) shaPenalty -= 3
  }
  score += jiBonus + shaPenalty
  if (jiBonus) breakdown.push(`吉星+${jiBonus}`)
  if (shaPenalty) breakdown.push(`煞星${shaPenalty}`)

  // 生年四化(禄权科+4, 忌+2)
  const natal = model.shengNianSiHua.filter((s) => s.palace === palaceName)
  let natalBonus = 0
  for (const n of natal) {
    natalBonus += n.type === '忌' ? 2 : 4
  }
  score += natalBonus
  if (natalBonus) breakdown.push(`生年四化+${natalBonus}`)

  // 对宫忌冲
  const opp = getOppositeGong(palaceName)
  const chong = model.feiHua.filter((f) => f.targetPalace === opp && f.hua === '忌')
  if (chong.length) {
    score -= 5
    breakdown.push(`对宫${chong.map((f) => f.sourcePalace + f.star + '忌').join(',')}冲-5`)
  }

  // 六内
  if (LIU_NEI_WAI_MAP[palaceName] === '六内') {
    score += 2
    breakdown.push('六内+2')
  }

  const grade = score >= 80 ? '优' : score >= 65 ? '良' : score >= 50 ? '中' : score >= 35 ? '差' : '劣'
  return { score: Math.min(98, Math.max(10, score)), grade, breakdown }
}

// ═══════════════════════════════════════
// 逐宫能量浓度
// ═══════════════════════════════════════
function scorePalaceEnergy(palaceName: GongName, model: ChartModel) {
  const breakdown: string[] = []
  let score = 0
  const pal = model.palaces.find((p) => p.name === palaceName)
  if (!pal) return { score: 0, grade: '空', breakdown: ['无数据'] }

  // 主星
  let starCount = 0
  if (pal.majorStar) starCount++
  if (pal.coStar) starCount++
  const starPts = starCount * 1.5
  score += starPts
  if (starPts) breakdown.push(`主星×${starCount}=${starPts.toFixed(1)}`)

  // 辅星
  const minorPts = pal.minorStars?.length || 0
  score += minorPts
  if (minorPts) breakdown.push(`辅星+${minorPts}`)

  // 生年四化
  const natal = model.shengNianSiHua.filter((s) => s.palace === palaceName)
  const natalPts = natal.length * 2
  score += natalPts
  if (natalPts) breakdown.push(`生年四化×${natal.length}=${natalPts}`)

  // 自化
  const ziHuaCount = model.ziHua.filter((z) => z.sourcePalace === palaceName).length
  const ziPts = ziHuaCount * 1.5
  score += ziPts
  if (ziPts) breakdown.push(`自化×${ziHuaCount}=${ziPts.toFixed(1)}`)

  // 飞入
  const feiIn = model.feiHua.filter((f) => f.targetPalace === palaceName).length
  const feiPts = feiIn * 0.5
  score += feiPts
  if (feiPts) breakdown.push(`飞入×${feiIn}=${feiPts.toFixed(1)}`)

  const grade = score >= 12 ? '极高' : score >= 8 ? '高' : score >= 5 ? '中' : score >= 2 ? '低' : '空'
  return { score: Math.round(score * 10) / 10, grade, breakdown }
}

// ═══════════════════════════════════════
// 四象限分类
// ═══════════════════════════════════════
function classifyQuadrant(qScore: number, eGrade: string) {
  if (eGrade === '极高' || eGrade === '高') {
    return qScore >= 60 ? '福报型' : '病灶型'
  }
  if (eGrade === '中') return '平实型'
  return qScore >= 60 ? '隐藏型' : '空白型'
}

// ═══════════════════════════════════════
// 生年四化×12宫 含义表 (48条)
// ═══════════════════════════════════════
const NATAL_HUA_MEANING: Record<string, Record<GongName, string>> = {
  // ═══ 化禄：缘分/福禄/资源型 — 来源许铨仁p03+p04 ═══
  禄: {
    命宫: '天生福气人，人缘佳，一辈子衣食无忧，乐观忙碌',
    兄弟: '手足情深，兄弟姐妹互相助益，母亲有福',
    夫妻: '婚缘早发，配偶给我福禄，感情甜蜜',
    子女: '子女缘好得子早，有合伙福分，桃花善缘',
    财帛: '钱财丰足，赚钱容易出手大方，但有钱就"病"(懒散)',
    疾厄: '身体底子好，少病少灾，体质强健',
    迁移: '外出有贵人处处逢缘，社会福报好',
    交友: '朋友多且对我好，人脉是资源',
    官禄: '事业顺遂工作轻松，福报型事业',
    田宅: '家宅兴旺房产运好，祖上有庇荫可继承，家庭和睦有福',
    福德: '精神愉悦有福可享，晚景安逸寿元绵长',
    父母: '父母疼爱我给我福禄，长辈是资源',
  },
  // ═══ 化权：掌控/专业/开创 — 来源许铨仁p03+p05 ═══
  权: {
    命宫: '自我意识强，性刚果决有专技，具开创魄力',
    兄弟: '手足中掌权主导，母亲强势，同辈竞争有角力',
    夫妻: '配偶或我强势占有，婚前父母之命婚后夫妻之争',
    子女: '对子女管教严苛，子女有主见不驯',
    财帛: '赚钱有一套擅开创财路，用钱有主张',
    疾厄: '用意志力克服身体问题，身体素质反因磨练而强健，但需防意外伤灾',
    迁移: '外出展现领导力，在外有地位但人际有摩擦',
    交友: '交友中有话语权主导权，朋友中有领头者',
    官禄: '事业能当主管，专业能力强有实权',
    田宅: '家产掌控强置产果断，能守祖产，在家掌权',
    福德: '精神有主见不随波逐流，晚景自主，不易被说服',
    父母: '父母管教严或自己读书有功名，长辈强势',
  },
  // ═══ 化科：名声/教养/聪明 — 来源许铨仁p03+p06 ═══
  科: {
    命宫: '聪明斯文有才华，爱面子重声望，有解厄之功',
    兄弟: '手足有教养相处客气，母亲有教养，君子之交',
    夫妻: '相识而识的介绍型结合，不是一见钟情',
    子女: '子女有教养学业有成，桃花有品味',
    财帛: '钱来得体面名声好，理财有章法，量不多但够用',
    疾厄: '重视养生调理，有病能遇良医，学习能力强',
    迁移: '外出受人尊重有好名声，体面外出',
    交友: '朋友有素质，人际和谐，君子之交',
    官禄: '事业靠专业名声，技术型/顾问型工作',
    田宅: '家宅有书香气息，祖业有传承，布置有品味',
    福德: '精神世界丰富有品味，晚年充实，爱好风雅',
    父母: '长辈有学识教养好，沟通顺畅，学历运好',
  },
  // ═══ 化忌：亏欠/执着/不顺 — 来源许铨仁p03+p08(十二宫完整版) ═══
  忌: {
    命宫: '一生事与愿违，个性拘谨固执钻牛角尖，有牛角尖天赋(研发/技术)，宜创业不宜上班',
    兄弟: '手足有不顺，我对兄弟姐妹潜意识亏欠(怎么补偿都不够)，母亲需注意身体',
    夫妻: '配偶不顺+我对配偶欠债般付出，配偶严肃固执不懂沟通，非恋爱结婚，夫妻关系有波动反复',
    子女: '子女不顺+我对子女溺爱亏欠(永远觉得补偿不够)，得子迟先女后子，合伙不顺',
    财帛: '有钱但守不住(赚多花多)，守财奴性格(钱放出去心里悬)，女忌为容貌花钱有容貌焦虑，擅理财规划',
    疾厄: '身体底子差带遗传体质，脾气直喜怒形于色直肠子',
    迁移: '出外不顺招小人，社会际遇差，外出总有遗憾，需注意人身意外安全',
    交友: '交友不顺+对朋友亏欠(付出再多都不够)，朋友执着黏着赖上你，朋友多固执型',
    官禄: '工作事业多变动，宜创业不宜上班，事业有是非缺贵人',
    田宅: '有房产但过程波折(头期款不够要借贷)，居无定所小时常搬家，得不到祖业须白手起家，成家辛苦',
    福德: '精神层面较没福气(有钱但忙碌没时间休息)，晚年操劳，精神劳碌操烦多',
    父母: '父母一生有不顺感受，我对父母亏欠感→实则孝顺，亲子沟通有隔阂',
  },
}

export function getNatalHuaMeaning(hua: string, palace: GongName): string {
  if (hua === '禄' || hua === '权' || hua === '科' || hua === '忌') {
    return NATAL_HUA_MEANING[hua]?.[palace] ?? ''
  }
  return ''
}

// ═══════════════════════════════════════
// 生年四化落点表 + 体用标注
// ═══════════════════════════════════════
function buildNatalHua(palaceName: GongName, model: ChartModel) {
  const items = model.shengNianSiHua.filter((s) => s.palace === palaceName)
  return items.length ? items.map((n) => `${n.star}${n.type}`) : ['—']
}

function buildTiYongNote(palaceName: GongName, model: ChartModel) {
  const parts: string[] = []
  const natal = model.shengNianSiHua.filter((s) => s.palace === palaceName)
  if (natal.length) {
    parts.push(`体(${natal.map((n) => n.star + n.type).join('、')})`)
  }
  const ziHuaOut = model.ziHua.filter((z) => z.sourcePalace === palaceName)
  if (ziHuaOut.length) {
    const paths = ziHuaOut.map((z) => `${z.star}${z.hua}→${z.targetPalace}`)
    parts.push(`自化→${paths.join(',')}`)
  }
  if (!parts.length) parts.push('—')
  return parts.join(' | ')
}

// ═══════════════════════════════════════
// 导出：完整逐宫评分
// ═══════════════════════════════════════
export function buildPalaceScores(model: ChartModel): PalaceScoreItem[] {
  return GONG_ORDER.map((palaceName) => {
    const q = scorePalaceQuality(palaceName, model)
    const e = scorePalaceEnergy(palaceName, model)
    return {
      palace: palaceName,
      quality: q,
      energy: e,
      quadrant: classifyQuadrant(q.score, e.grade),
      natalHua: buildNatalHua(palaceName, model),
      natalHuaMeaning: model.shengNianSiHua
        .filter((s) => s.palace === palaceName)
        .map((s) => getNatalHuaMeaning(s.type, palaceName))
        .join(' / ') || '—',
      tiYongNote: buildTiYongNote(palaceName, model),
    }
  })
}

// ═══════════════════════════════════════
// 生年四化总览
// ═══════════════════════════════════════

const JI_CHONG_IMPACT: Record<GongName, string> = {
  命宫: '命宫被冲=底层自我的稳定性受挑战，自信心和方向感容易动摇',
  兄弟: '兄弟被冲=手足同辈关系承受压力，现金流和合作层面有隐患',
  夫妻: '夫妻被冲=感情婚姻受到来自外部的直接冲击，承诺易被破坏',
  子女: '子女被冲=子嗣桃花合伙领域受压，创作力和生育力受影响',
  财帛: '财帛被冲=财运直接承受压力，赚钱和理财容易出状况',
  疾厄: '疾厄被冲=身体健康面临挑战，体质底子有隐忧',
  迁移: '迁移被冲=外出发展受阻，外界环境对自身不友好',
  交友: '交友被冲=朋友和大众关系容易破裂，被朋友拖累',
  官禄: '官禄被冲=事业发展和职场地位受到震动',
  田宅: '田宅被冲=家庭房产根基不稳，家宅安宁受扰',
  福德: '福德被冲=内心世界不得安宁，精神层面长期受压',
  父母: '父母被冲=长辈关系或学历文书运承受压力',
}

// ═══ 真假禄：禄宫×忌宫 枚举解读（陈小飞P06中阶第六课） ═══
const LU_JI_GRADE_COMMENT: Record<string, string> = {
  '真禄': '真禄，忌在六内守得住→',
  '最优': '真禄·最优，外面资源流进自己口袋→',
  '假禄·差': '假禄·最差，自家资源外流→',
  '假禄': '假禄，能量在外与你无关→',
}

// 禄宫→忌宫的精准断语枚举，共144条
// 宫位领域简称（用于真假禄叙事）
const GONG_DOMAIN: Record<string, string> = {
  '命宫': '自身/本体', '兄弟': '兄弟平辈/现金流', '夫妻': '配偶/婚姻',
  '子女': '子女/合伙', '财帛': '钱财/财富', '疾厄': '身体/健康',
  '迁移': '外出/社会', '交友': '人脉/朋友', '官禄': '事业/工作',
  '田宅': '家宅/房产', '福德': '精神/福报', '父母': '长辈/体制',
}

// 禄随忌走叙事生成（结构描述，不定断具体事件）
function buildZhenJiaLuNarrative(luPalace: GongName, jiPalace: GongName, grade: string): string {
  const luDomain = GONG_DOMAIN[luPalace] || luPalace
  const jiDomain = GONG_DOMAIN[jiPalace] || jiPalace
  const neiwaiNote: Record<string, string> = {
    '真禄': `${luPalace}禄随忌走落${jiPalace}，均为六内，资源从${luDomain}转入${jiDomain}，内循环可控。`,
    '最优': `${luPalace}禄随忌走落${jiPalace}，禄在六外忌在六内，外部资源从${luDomain}流入${jiDomain}，外财内收。`,
    '假禄·差': `${luPalace}禄随忌走落${jiPalace}，禄在六内忌在六外，资源从${luDomain}流出${jiDomain}，内部资源外耗。`,
    '假禄': `${luPalace}禄随忌走落${jiPalace}，均为六外，资源从${luDomain}流转至${jiDomain}，在外流转不入己。`,
  }
  return neiwaiNote[grade] || `${luPalace}禄随忌走落${jiPalace}`
}

/** 生年四化总览：集中列举+忌深度拆解+真假禄分析 */
export function buildNatalSiHuaOverview(model: ChartModel): NatalSiHuaOverview {
  const items = model.shengNianSiHua.map((h) => {
    const duiGong = getOppositeGong(h.palace)
    const relation =
      h.type === '忌' ? `忌冲${duiGong}`
      : h.type === '禄' ? `禄照${duiGong}`
      : h.type === '权' ? `权照${duiGong}`
      : `科照${duiGong}`
    return {
      star: h.star,
      type: h.type,
      palace: h.palace,
      meaning: getNatalHuaMeaning(h.type, h.palace),
      duiGong,
      duiGongRelation: relation,
      liuNeiWai: LIU_NEI_WAI_MAP[h.palace],
    }
  })

  const inner = items.filter((i) => i.liuNeiWai === '六内')
  const outer = items.filter((i) => i.liuNeiWai === '六外')
  const dist = `六内${inner.length}条(${inner.map((i) => i.type).join('、') || '无'})，六外${outer.length}条(${outer.map((i) => i.type).join('、') || '无'})`

  // 忌优先排最前
  const ordered = [...items].sort((a, b) => {
    const order: Record<string, number> = { 忌: 0, 权: 1, 科: 2, 禄: 3 }
    return (order[a.type] ?? 99) - (order[b.type] ?? 99)
  })

  const summary =
    ordered.map((i) => `${i.star}${i.type}在${i.palace}(${i.liuNeiWai})→${i.duiGongRelation}`).join('；') +
    `。${dist}`

  const ji = items.find((i) => i.type === '忌')
  const jiDeepDive = ji
    ? {
        star: ji.star,
        palace: ji.palace,
        meaning: ji.meaning,
        duiGong: ji.duiGong,
        duiImpact: `忌在${ji.palace}冲${ji.duiGong}。${JI_CHONG_IMPACT[ji.duiGong] || `${ji.duiGong}承受直接压力`}`,
        liuNeiWai: ji.liuNeiWai,
        narrative:
          `${ji.star}忌落在${ji.palace}(${ji.liuNeiWai})，冲${ji.duiGong}。` +
          `${ji.liuNeiWai === '六内' ? '忌在六内=压力在可控范围内，通过自身调整可以化解。' : '忌在六外=压力来自外部环境，靠一己之力难以掌控，需要策略性应对。'}` +
          `生年忌是整盘优先级最高的压力信号——${ji.meaning}`,
      }
    : {
        star: '',
        palace: '' as GongName,
        meaning: '',
        duiGong: '' as GongName,
        duiImpact: '',
        liuNeiWai: '六外' as const,
        narrative: '此盘无生年忌',
      }

  // ═══ 真假禄分析（陈小飞P06中阶第六课） ═══
  // 核心原则：禄的吉凶由忌的位置决定（禄随忌走）
  let zhenJiaLu: NatalSiHuaOverview['zhenJiaLu'] = null
  const abilityFlow = (() => {
    const allIn = inner.length === 4
    const allOut = outer.length === 4
    if (allIn) return '四化全在六内，能量封闭如"一潭死水"，保守守成，难成大局。'
    if (allOut) return '四化全在六外，一生为他人奔忙，若配特定财富格可成大富但钱财难自享。'
    const outsiders = outer.length
    const insiders = inner.length
    return `六内${insiders}条+六外${outsiders}条，能量有内外流通。${outsiders > insiders ? '外部能量为主，需借力打力。' : insiders > outsiders ? '内部根基为主，向外拓展需主动出击。' : '内外均衡，能量收放自如。'}`
  })()

  const lu = items.find((i) => i.type === '禄')
  if (lu && ji) {
    const luIn = lu.liuNeiWai === '六内'
    const jiIn = ji.liuNeiWai === '六内'
    let grade: ZhenJiaLu['grade']
    if (luIn && jiIn) {
      grade = '真禄'
    } else if (!luIn && jiIn) {
      grade = '最优'
    } else if (luIn && !jiIn) {
      grade = '假禄·差'
    } else {
      grade = '假禄'
    }
    const narrative = `${LU_JI_GRADE_COMMENT[grade]} ${buildZhenJiaLuNarrative(lu.palace, ji.palace, grade)}`
    zhenJiaLu = { luItem: lu, jiItem: ji, isZhen: grade === '真禄' || grade === '最优', grade, narrative }
  }

  return { items, summary, distribution: dist, zhenJiaLu, abilityFlow, jiDeepDive }
}

// ═══════════════════════════════════════
// 三合派格局检测
// ═══════════════════════════════════════

// 星曜简称映射
const STAR_SHORT: Record<string, string> = {
  紫微:'紫微',天机:'天机',太阳:'太阳',武曲:'武曲',天同:'天同',廉贞:'廉贞',
  天府:'天府',太阴:'太阴',贪狼:'贪狼',巨门:'巨门',天相:'天相',天梁:'天梁',
  七杀:'七杀',破军:'破军',
}

function getMajors(stars: any[], palace: GongName): string[] {
  return stars.filter(s => s.palace === palace && s.category === 'major').map(s => s.name)
}

function getMinors(stars: any[], palace: GongName): string[] {
  return stars.filter(s => s.palace === palace && s.category === 'minor').map(s => s.name)
}

function hasStar(stars: any[], palace: GongName, name: string): boolean {
  return stars.some(s => s.palace === palace && s.name === name)
}

function getDiZhi(model: ChartModel, palace: GongName): string {
  return model.palaces.find(p => p.name === palace)?.diZhi || ''
}

export function detectPatterns(model: ChartModel): PatternItem[] {
  const patterns: PatternItem[] = []
  const s = model.stars
  const d = (p: GongName) => getDiZhi(model, p)

  const ming = getMajors(s, '命宫')
  const cai = getMajors(s, '财帛')
  const guan = getMajors(s, '官禄')
  const allMajors = [...ming, ...cai, ...guan]
  const mingtri: GongName[] = ['命宫','财帛','官禄']

  // 1. 杀破狼格
  if (ming.includes('贪狼') && allMajors.includes('七杀') && allMajors.includes('破军')) {
    patterns.push({ name:'杀破狼格', category:'特殊',
      description: '贪狼在命，七杀破军在三方，一生动荡多变动，开创型人格',
      judgment: '动荡即是机遇。宜创业、开拓、军警武职，不宜安逸求稳。动中求财，静中反凶。',
      palaces:['命宫','财帛','官禄'] })
  }

  // 2. 机月同梁格
  const jiytl = ['天机','太阴','天同','天梁']
  if (jiytl.every(star => allMajors.includes(star))) {
    patterns.push({ name:'机月同梁格', category:'吉',
      description: '天机太阴天同天梁齐聚三方，适合公职、幕僚、策划',
      judgment: '入此格宜公职、研究、策划、幕僚，不宜经商或自主创业。以谋定后动取胜，非猛冲猛打之人。',
      palaces:['命宫','财帛','官禄'] })
  }

  // 3. 巨日格 (巨门+太阳同宫在寅申)
  if (hasStar(s,'命宫','巨门') && hasStar(s,'命宫','太阳') && ['寅','申'].includes(d('命宫'))) {
    patterns.push({ name:'巨日同宫格', category:'特殊',
      description: '太阳巨门同宫在寅申，口才出众，适合外交、法律、传播',
      judgment: '以言立身。口才即武器，宜传播、法律、教育、外交。注意言多必失，口舌之争在所难免。',
      palaces:['命宫'] })
  }

  // 4. 阳梁昌禄格
  if (hasStar(s,'命宫','太阳') && hasStar(s,'命宫','天梁') && (hasStar(s,'命宫','文昌') || hasStar(s,'命宫','禄存'))) {
    patterns.push({ name:'阳梁昌禄格', category:'吉',
      description: '太阳天梁文昌/禄存同宫，考试运佳，学术成就高',
      judgment: '天生考试型选手。宜走学历路线、考公、考证，以文取胜。学术、体制内路线是最优解。',
      palaces:['命宫'] })
  }

  // 5. 紫微在午(极向离明)
  if (hasStar(s,'命宫','紫微') && d('命宫') === '午') {
    patterns.push({ name:'极向离明格', category:'吉',
      description: '紫微在午坐命，帝星正位，气度不凡',
      judgment: '帝星正位，格局层次拔高一个等级。天生有领导气质，但须防刚愎自用。位高责重，架子放不下来是最大隐患。',
      palaces:['命宫'] })
  }

  // 6. 紫府朝垣(紫微在命或迁移+天府在命宫三方)
  // 紫微"朝"向命垣，天府守垣，非必须同宫
  const ziweiPalace = s.find(st => st.name === '紫微')?.palace || ''
  const tianfuPalace = s.find(st => st.name === '天府')?.palace || ''
  if (ziweiPalace && tianfuPalace &&
      (ziweiPalace === '命宫' || ziweiPalace === '迁移') &&
      mingtri.includes(tianfuPalace)) {
    const samePalace = ziweiPalace === tianfuPalace
    const extra = samePalace ? '且同宫' : `(${ziweiPalace}照命)`
    patterns.push({ name:'紫府朝垣格', category:'吉',
      description: `紫微在${ziweiPalace}${extra}，天府在${tianfuPalace}，君臣照会，贵气临身`,
      judgment: '紫微朝命，天府守业。贵气与实力兼备，格局高于常人。宜走体制、管理、领导岗位，不宜"自降身价"走偏门。',
      palaces:[ziweiPalace, tianfuPalace] as GongName[] })
  }

  // 7. 月朗天门(太阴在亥)
  if (hasStar(s,'命宫','太阴') && d('命宫') === '亥') {
    patterns.push({ name:'月朗天门格', category:'吉',
      description: '太阴在亥，夜生人尤佳，容貌出众，才艺过人',
      judgment: '靠才华和容貌吃饭的命格。宜文艺、设计、美容、服务行业。夜生人更佳，昼生人打折。',
      palaces:['命宫'] })
  }

  // 8. 日照雷门(太阳在卯)
  if (hasStar(s,'命宫','太阳') && d('命宫') === '卯') {
    patterns.push({ name:'日照雷门格', category:'吉',
      description: '太阳在卯，朝气蓬勃，光明磊落',
      judgment: '少年得志型。早发格，三十岁前已有成就。为人磊落大方，但须防过热后的冷却期。',
      palaces:['命宫'] })
  }

  // 9. 日月并明(太阳太阴同宫在丑未)
  if (hasStar(s,'命宫','太阳') && hasStar(s,'命宫','太阴') && ['丑','未'].includes(d('命宫'))) {
    patterns.push({ name:'日月并明格', category:'吉',
      description: '日月同宫在丑未，光明内敛，心性平衡',
      judgment: '阴阳调和，刚柔并济。做人做事有分寸感，不宜极端。适合需要平衡协调的角色：管理、调解、咨询。',
      palaces:['命宫'] })
  }

  // 10. 日月反背 (太阳陷+太阴陷)
  const sunStar = s.find(st => st.name === '太阳')
  const moonStar = s.find(st => st.name === '太阴')
  if (sunStar && moonStar && sunStar.brightness === '陷' && moonStar.brightness === '陷') {
    patterns.push({ name:'日月反背格', category:'煞',
      description: '太阳太阴皆落陷，早年辛苦，靠后天打拼',
      judgment: '白手起家型。先天资源配置少，早年多磨。一旦熬过35岁，后劲反而比顺遂之人足。忌与别人比起点。',
      palaces:[sunStar.palace, moonStar.palace] })
  }

  // 11. 火贪格/铃贪格 (火星/铃星+贪狼同宫)
  if (hasStar(s,'命宫','贪狼') && (hasStar(s,'命宫','火星') || hasStar(s,'命宫','铃星'))) {
    const huo = hasStar(s,'命宫','火星') ? '火贪' : '铃贪'
    patterns.push({ name:`${huo}格`, category:'特殊',
      description: '贪狼逢火铃，横发横破，爆发力强',
      judgment: '富贵险中求。宜投机、偏财、短线操作。来得快去得也快，赚到第一桶金后须及时转稳健路线。不转必破。',
      palaces:['命宫'] })
  }

  // 12. 禄马交驰 (禄存+天马同宫或对宫)
  const luPalace = s.find(st => st.name === '禄存')?.palace || ''
  const maPalace = s.find(st => st.name === '天马')?.palace || ''
  if (luPalace && maPalace) {
    const oppLu = getOppositeGong(luPalace as GongName)
    if (maPalace === luPalace || maPalace === oppLu) {
      patterns.push({ name:'禄马交驰格', category:'吉',
        description: '禄存天马同宫或对照，奔波生财，动中得利',
      judgment: '越动越有。宜外勤、出差、跨境贸易、物流运输。坐办公室反而不聚财。动起来就是钱。',
      palaces:[luPalace, maPalace] as GongName[] })
    }
  }

  // 13. 双禄朝垣 (禄存+生年禄在命宫三方)
  const huaLuPalaces = model.shengNianSiHua.filter(h => h.type === '禄').map(h => h.palace)
  const luCunP = s.find(st => st.name === '禄存')?.palace || ''
  if (luCunP && huaLuPalaces.length &&
      mingtri.includes(luCunP) && huaLuPalaces.some(p => mingtri.includes(p))) {
    patterns.push({ name:'双禄朝垣格', category:'吉',
      description: '禄存+化禄在命宫三方，钱财不愁',
      judgment: '福禄深厚，钱财自然聚拢。赚钱不太费力，但须防安逸心。若无忌星鞭策，容易"混日子"。',
      palaces:[luCunP, ...huaLuPalaces] })
  }

  // 14. 文星拱命 (文昌/文曲在命宫三方)
  const wenStars = ['文昌','文曲']
  if (wenStars.some(w => allMajors.includes(w) || hasStar(s,'命宫',w) || hasStar(s,'财帛',w) || hasStar(s,'官禄',w))) {
    // check if 文昌/文曲 are in 命宫三方 as minor stars too
    const hasWen = wenStars.some(w =>
      mingtri.some(p => hasStar(s, p, w))
    )
    // Actually check stars not just majors
    const wenPalaces = wenStars.flatMap(w =>
      s.filter(st => st.name === w && mingtri.includes(st.palace)).map(st => st.palace)
    )
    if (wenPalaces.length >= 2 || (wenPalaces.length === 1 && allMajors.some(m => wenStars.includes(m)))) {
      patterns.push({ name:'文星拱命格', category:'吉',
        description: '文昌文曲在命宫三方，才华出众',
      judgment: '靠笔杆子和才华立足。宜学术、写作、文艺、策划。硬拼体力不是强项，凭智力降维打击才是正道。',
      palaces:Array.from(new Set(wenPalaces)) as GongName[] })
    }
  }

  // 15. 三奇嘉会 (禄权科同在命宫三方)
  const huaTypes = model.shengNianSiHua
    .filter(h => mingtri.includes(h.palace))
    .map(h => h.type)
  if (new Set(huaTypes).size >= 3 && ['禄','权','科'].every(t => huaTypes.includes(t))) {
    patterns.push({ name:'三奇嘉会格', category:'吉',
      description: '禄权科三奇汇聚命宫三方，人生格局高',
      judgment: '天选之人。禄权科三方到位——资源、权力、名声一个不落。格局层次拔尖，但高处不胜寒，人生起伏也大。',
      palaces: mingtri as GongName[] })
  }

  // 16. 马头带剑 (天马+擎羊同宫在午)
  if (hasStar(s,'命宫','天马') && hasStar(s,'命宫','擎羊') && d('命宫')==='午') {
    patterns.push({ name:'马头带剑格', category:'煞',
      description: '天马擎羊在午，变动中带刑伤，军警武职可化解',
      judgment: '宜武不宜文。变动+刑克=浑身带刺。军警、运动员、外科医生等能化煞为用，坐办公室反而出事。',
      palaces:['命宫'] })
  }

  // 17. 刑囚夹印 (廉贞+擎羊+天相)
  if (hasStar(s,'命宫','廉贞') && hasStar(s,'命宫','擎羊') && hasStar(s,'命宫','天相')) {
    patterns.push({ name:'刑囚夹印格', category:'煞',
      description: '廉贞天相擎羊同宫，易有官非牢狱之象',
      judgment: '法律风险高。签名盖章须慎之又慎，合同契约反复审查。可化煞为用——律师、法官、监察正得其所。',
      palaces:['命宫'] })
  }

  // 18. 空劫夹命 (地空/地劫夹命宫两侧)
  const kongPalaces = ['地空','地劫'].map(n => s.find(st => st.name === n)?.palace).filter(Boolean)
  if (kongPalaces.length >= 2) {
    const indices = kongPalaces.map(p => model.palaces.find(pp => pp.name === p)?.index).filter(Boolean) as number[]
    const mingIdx = model.palaces.find(p => p.name === '命宫')?.index || -1
    if (indices.length === 2 && mingIdx >= 0) {
      // 夹命: 空劫在命宫前后
      const left = (mingIdx - 1 + 12) % 12
      const right = (mingIdx + 1) % 12
      if (indices.includes(left) && indices.includes(right)) {
        patterns.push({ name:'空劫夹命格', category:'煞',
          description: '地空地劫夹命宫，一生多波折，宜修行或艺术',
      judgment: '另辟蹊径之人。常规路线行不通，与其死磕不如转向宗教、艺术、玄学、互联网等非传统领域。空劫是创新的土壤。',
      palaces:['命宫'] })
      }
    }
  }

  // 19. 命无正曜 (命宫无主星)
  if (ming.length === 0) {
    patterns.push({ name:'命无正曜格', category:'特殊',
      description: '命宫无主星，借对宫安星，一生易受环境影响',
      judgment: '借风行船。自身定位不固定，须靠环境和他人来定义自己。宜跟对人、选对平台，环境决定上限。',
      palaces:['命宫'] })
  }

  // 20. 府相朝垣 (天府+天相在三方照命)
  if (allMajors.includes('天府') && allMajors.includes('天相')) {
    patterns.push({ name:'府相朝垣格', category:'吉',
      description: '天府天相在三方照命，稳重务实，衣食无忧',
      judgment: '守业型人生。稳扎稳打，不冒进不贪快。适合稳健行业和长期积累型工作。下限高上限低，富贵有余传奇不足。',
      palaces:['命宫','财帛','官禄'] })
  }

  // 21. 雄宿乾元格 (廉贞独坐寅申，无煞)
  if (hasStar(s,'命宫','廉贞') && ['寅','申'].includes(d('命宫'))
      && ming.length === 1 && !ming.some(m => SHA_STAR.has(m))) {
    patterns.push({ name:'雄宿乾元格', category:'吉',
      description: '廉贞独坐在寅申，无煞星破格，文质彬彬',
      judgment: '廉贞独坐寅申，化囚为才。宜文职、艺术、设计，不宜武职或投机。格局清高，忌煞星破格。',
      palaces:['命宫'] })
  }

  // 22. 石中隐玉格 (巨门在子午坐命)
  if (hasStar(s,'命宫','巨门') && ['子','午'].includes(d('命宫'))) {
    patterns.push({ name:'石中隐玉格', category:'特殊',
      description: '巨门在子午坐命，暗中藏锋，大器晚成',
      judgment: '巨门为暗曜在子午，如玉在石中。才华内敛，需时间打磨。宜法律、咨询、学术，不宜过早亮相。一旦出石，锋芒毕露。',
      palaces:['命宫'] })
  }

  // 23. 金灿光辉格 (太阳在午坐命)
  if (hasStar(s,'命宫','太阳') && d('命宫') === '午') {
    patterns.push({ name:'金灿光辉格', category:'吉',
      description: '太阳在午，日正当中，光芒最盛',
      judgment: '太阳正位午宫，光明磊落事业有成。宜领导、公众事业、外交。光芒外显招人注目也招妒，须懂得收敛锋芒。',
      palaces:['命宫'] })
  }

  // 24. 英星入庙格 (破军在子午坐命)
  if (hasStar(s,'命宫','破军') && ['子','午'].includes(d('命宫'))) {
    patterns.push({ name:'英星入庙格', category:'特殊',
      description: '破军在子午坐命，破而后立，大将之才',
      judgment: '破军英星入庙，魄力十足。宜军警、创业、改革类岗位。"破"是常态，破一次立一次，但忌破而不立。',
      palaces:['命宫'] })
  }

  // 25. 七杀朝斗格 (七杀在寅申坐命)
  if (hasStar(s,'命宫','七杀') && ['寅','申'].includes(d('命宫'))) {
    patterns.push({ name:'七杀朝斗格', category:'特殊',
      description: '七杀在寅申，将星朝斗，魄力过人',
      judgment: '七杀朝斗，大将之命。宜军事、警界、大企业管理。杀性刚猛，需配合紫微天府方能化权成器，否则凶暴难制。',
      palaces:['命宫'] })
  }

  // 26. 蟾宫折桂格 (天同+太阴同宫在子)
  if (hasStar(s,'命宫','天同') && hasStar(s,'命宫','太阴') && d('命宫') === '子') {
    patterns.push({ name:'蟾宫折桂格', category:'吉',
      description: '天同太阴同宫在子，水秀人清，才貌双全',
      judgment: '福星与月同辉，才貌兼备。宜文艺、设计、服务、咨询。性格温和人缘好，但须防过于安逸不思进取。',
      palaces:['命宫'] })
  }

  // 27. 禄文拱命 (禄存+文昌文曲在三方拱命)
  const wenStarsAll = ['文昌','文曲']
  if (luCunP && mingtri.includes(luCunP)) {
    const wenInTri = wenStarsAll.filter(w =>
      s.filter((st: any) => st.name === w && mingtri.includes(st.palace)).length > 0
    )
    if (wenInTri.length >= 2) {
      patterns.push({ name:'禄文拱命格', category:'吉',
        description: '禄存+文昌文曲在命宫三方，禄文交汇，富贵双全',
        judgment: '禄文朝垣，富贵与才华兼备。禄为财源，文昌文曲为才艺，一生不缺物质也不缺精神食粮。但须防安逸过度。',
        palaces: mingtri as GongName[] })
    }
  }

  // 28. 善荫朝纲格 (天机+天梁同宫在辰戌)
  if (hasStar(s,'命宫','天机') && hasStar(s,'命宫','天梁') && ['辰','戌'].includes(d('命宫'))) {
    patterns.push({ name:'善荫朝纲格', category:'吉',
      description: '天机天梁同宫在辰戌，善谋善断，谋士之才',
      judgment: '天机的谋+天梁的善=善谋善断。宜幕僚、顾问、法律、学术。"机梁善谈兵"——口才出众，善分析，但须防优柔寡断。',
      palaces:['命宫'] })
  }

  // 29. 水澄桂萼格 (太阴在子宫独坐+天同守照)
  if (hasStar(s,'命宫','太阴') && d('命宫') === '子'
      && !hasStar(s,'命宫','天同')
      && hasStar(s,'官禄','天同')) {
    patterns.push({ name:'水澄桂萼格', category:'吉',
      description: '太阴独坐在子，天同在官禄照命，水秀清明',
      judgment: '太阴独坐子宫，水澄如镜。心性清明，直觉敏锐。宜文艺、心理学、咨询、玄学。格局清秀但须防过于敏感。',
      palaces:['命宫','官禄'] })
  }

  return patterns
}
