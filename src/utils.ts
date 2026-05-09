import { astro } from 'iztro'
import type {
  CaseRecord,
  ChartConfig,
  ChartSummary,
  SihuaRiskPalace,
  TimelineModel,
  ZiweiInsightPayload,
} from './types'

const PALACE_ORDER = [
  '命宫',
  '兄弟',
  '夫妻',
  '子女',
  '财帛',
  '疾厄',
  '迁移',
  '交友',
  '官禄',
  '田宅',
  '福德',
  '父母',
] as const

const PEOPLE_PALACES = new Set(['命宫', '兄弟', '夫妻', '子女', '交友', '父母'])

const STEM_MUTAGENS: Record<string, { 禄: string; 权: string; 科: string; 忌: string }> = {
  甲: { 禄: '廉贞', 权: '破军', 科: '武曲', 忌: '太阳' },
  乙: { 禄: '天机', 权: '天梁', 科: '紫微', 忌: '太阴' },
  丙: { 禄: '天同', 权: '天机', 科: '文昌', 忌: '廉贞' },
  丁: { 禄: '太阴', 权: '天同', 科: '天机', 忌: '巨门' },
  戊: { 禄: '贪狼', 权: '太阴', 科: '右弼', 忌: '天机' },
  己: { 禄: '武曲', 权: '贪狼', 科: '天梁', 忌: '文曲' },
  庚: { 禄: '太阳', 权: '武曲', 科: '太阴', 忌: '天同' },
  辛: { 禄: '巨门', 权: '太阳', 科: '文曲', 忌: '文昌' },
  壬: { 禄: '天梁', 权: '紫微', 科: '左辅', 忌: '武曲' },
  癸: { 禄: '破军', 权: '巨门', 科: '太阴', 忌: '贪狼' },
}

const STAR_TRAITS: Record<string, string> = {
  紫微: '主贵与统御，容易把人生重点放在掌控感与格局感。',
  天机: '主机巧与变化，思路快，做事更依赖判断与应变。',
  太阳: '主光明与名望，重表达、责任与外在评价。',
  武曲: '主财务与执行，重结果、效率与资源掌控。',
  天同: '主福气与缓和，重舒适感、人情与情绪环境。',
  廉贞: '主才艺、制度与是非边界，人生里常伴随欲望与取舍。',
  天府: '主稳定、保守与资源保存，重积累与稳态。',
  太阴: '主内在感受、财库与细腻度，重安全感与情绪质量。',
  贪狼: '主欲望、社交与才华表现，容易把人生推向更活跃的场域。',
  巨门: '主口才、怀疑与辨析，很多问题会通过表达、解释或误会显现。',
  天相: '主辅助、服务与协调，重关系秩序与配合。',
  天梁: '主庇护、化解与原则，常带老成、照顾与担责气质。',
  七杀: '主开创、压力与破局，人生推进方式比较直接。',
  破军: '主破旧立新，适合变局中的重组与重启。',
}

const STAR_DETAILED_READINGS: Record<
  string,
  {
    core: string
    career?: string
    wealth?: string
    relationship?: string
    health?: string
  }
> = {
  紫微: {
    core: '紫微坐命时，人的主轴通常会落在掌控、体面、统筹与自我标准上，比较难接受无序和被动。',
    career: '事业上更适合承担总控、管理、决策或资源整合角色，不太喜欢长期只做纯执行。',
    wealth: '财务态度往往带着“要有规模、要有体面”的倾向，理财决策容易和身份感绑定。',
  },
  天机: {
    core: '天机坐命时，命主往往思路快、反应快、观察细，靠判断力和变化能力吃饭，但也容易想太多、变太快。',
    career: '事业上更适合需要策划、分析、沟通、顾问、产品、技术判断的路径，怕的是反复摇摆而难定主线。',
    wealth: '财务上通常不属于死守型，而是会随着判断、消息、机会去调整资源配置。',
    relationship: '关系里容易先动脑、先预判，敏感度高，但也容易因为想得太多而变得不够放松。',
    health: '压力型消耗会比较明显，容易体现在睡眠、神经系统、思虑过度或节律失衡。',
  },
  太阳: {
    core: '太阳主光明、表达和责任，坐命时通常很在意是否被看见、是否有担当。',
    career: '事业上适合面对公众、承担责任、需要号召力或对外表达的位置。',
    relationship: '关系里容易承担照顾者、付出者角色，也更在意对方是否认可自己的价值。',
    health: '太阳受损时，常见的是精力透支、操劳感强，恢复速度变慢。',
  },
  武曲: {
    core: '武曲坐命的人，人生推进方式偏务实、重效率、重结果，做事讲成本和兑现。',
    career: '适合资源管理、经营、金融、运营、执行、商业决策等看得见结果的领域。',
    wealth: '财务观往往很直接，重控制感和可落袋的成果。',
    relationship: '感情表达有时偏硬，不一定不在乎，而是更不习惯柔软表达。',
  },
  天同: {
    core: '天同坐命时，人的核心需求更偏向舒适、和气、情绪环境稳定，不喜欢长期高压硬碰硬。',
    relationship: '关系里更重陪伴感、轻松感和被理解感，不喜欢过度冲突。',
    health: '当压力累积时，容易先从情绪、饮食、作息舒适区被打乱开始表现出来。',
  },
  廉贞: {
    core: '廉贞坐命常带规则感、边界感和欲望议题，人生会频繁碰到“要不要、值不值、越不越界”的题目。',
    career: '事业上适合制度、组织、管理、项目推进与复杂关系场域，但也更容易遇到是非考验。',
    relationship: '感情中吸引力和边界问题会更明显，既讲感觉，也讲原则。',
  },
  天府: {
    core: '天府坐命的人重稳态、重积累、重保存，做事通常不喜欢太冒进。',
    career: '事业更适合稳定组织、资源管理、平台经营、长期累积型路径。',
    wealth: '财务上有“守得住”的能力，适合做仓储式积累而非高频冒险。',
  },
  太阴: {
    core: '太阴坐命时，人的核心更偏内在感受、安全感、细腻度与情绪质量。',
    wealth: '太阴与财库感、储蓄感联系紧，很多财务决策会受安全感驱动。',
    relationship: '感情里重体验、重氛围、重稳定回应，不喜欢粗糙互动。',
    health: '太阴受压时，常见情绪、内分泌、睡眠、身体恢复力层面的波动。',
  },
  贪狼: {
    core: '贪狼坐命时，人生动力会更强地来自欲望、体验、社交、表现与资源调动。',
    career: '适合市场、内容、娱乐、销售、流量、整合资源或人际场景强的方向。',
    wealth: '财务机会通常跟人脉、项目、流动性和机会感连得比较紧。',
    relationship: '桃花感、吸引力、选择题会比一般盘更明显。',
  },
  巨门: {
    core: '巨门坐命的人，很多人生议题都会通过语言、解释、误会、辨析、怀疑来展开。',
    career: '适合咨询、研究、法务、表达、教学、内容判断，但也容易卷入口舌。',
    relationship: '亲密关系里如果沟通节奏失衡，就容易从讨论变成消耗。',
    health: '压力常容易累在咽喉、呼吸、消化或长期闷着不说的状态里。',
  },
  天相: {
    core: '天相坐命偏向秩序、分寸、服务、协调，擅长把关系和结构理顺。',
    career: '适合服务型管理、协同岗位、组织支持、品牌或中台角色。',
    relationship: '关系中比较讲公平和体面，也容易为了维持平衡而压住真实情绪。',
  },
  天梁: {
    core: '天梁坐命常带“照顾、原则、保护、化解”的气质，也会带一点老成感。',
    career: '事业上容易走向顾问、照护、教育、治理、规则与风险控制类位置。',
    health: '天梁也常让人比较在意健康议题或恢复机制，重保养。',
  },
  七杀: {
    core: '七杀坐命时，人生推进感很强，很多事要靠自己顶、自己破局、自己扛压力。',
    career: '适合高压、高竞争、开创、带队、危机决策型环境。',
    relationship: '关系里容易显得强势、急、硬，需要学会让压力不过度外溢。',
    health: '七杀压力感重时，身体反应通常也来得直接。',
  },
  破军: {
    core: '破军坐命的人，常常要通过打碎旧结构、重建新结构来推动人生。',
    career: '适合变革、创业、转型、重组、破旧立新类路径。',
    wealth: '财务波动感可能比稳定盘更强，赚法和花法都可能更极端。',
    relationship: '感情里不太适合僵死关系，很多时候必须靠调整与重构才能继续。',
  },
}

const PALACE_TOPIC_GUIDE: Record<string, string> = {
  命宫: '命宫定主轴，看的是性格、做事方式和一生最核心的推进模式。',
  迁移: '迁移宫看外界舞台、未来环境和他人眼中的你，也常决定适不适合走出去。',
  财帛: '财帛宫看直接财富获取方式与理财态度。',
  官禄: '官禄宫看职业角色、事业位置与长期事业重心。',
  夫妻: '夫妻宫看婚姻模式、配偶特质与亲密关系经营能力。',
  疾厄: '疾厄宫看体质弱点、压力落点与健康议题的显化方式。',
  福德: '福德宫看内在精神世界、潜意识和长期消耗来源。',
}

const CAREER_STARS = new Set(['紫微', '太阳', '武曲', '天府', '天相', '七杀', '破军'])
const RELATIONSHIP_STARS = new Set(['太阴', '贪狼', '巨门', '天同', '天相', '廉贞'])
const WEALTH_STARS = new Set(['武曲', '天府', '太阴', '贪狼', '紫微'])
const HEALTH_STARS = new Set(['天梁', '巨门', '七杀', '破军', '廉贞', '太阴'])

function normalizePalaceName(name: string) {
  const normalized = String(name || '').replace(/宫$/, '')
  if (normalized === '命') return '命宫'
  if (normalized === '仆役') return '交友'
  return normalized
}

function oppositePalaceName(name: string) {
  const index = PALACE_ORDER.indexOf(normalizePalaceName(name) as (typeof PALACE_ORDER)[number])
  return index >= 0 ? PALACE_ORDER[(index + 6) % 12] : ''
}

export function toTimeIndex(value: string) {
  const [rawHour = '0'] = value.split(':')
  const hour = Number(rawHour)

  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    return 0
  }

  if (hour === 0) return 0
  if (hour === 23) return 12
  return Math.floor((hour + 1) / 2)
}

export function buildChartSummary(config: ChartConfig): ChartSummary | null {
  try {
    const astrolabe =
      config.birthdayType === 'solar'
        ? astro.bySolar(config.birthday, config.birthTime, config.gender, true, 'zh-CN')
        : astro.byLunar(config.birthday, config.birthTime, config.gender, false, true, 'zh-CN')

    return {
      lunarDate: astrolabe.lunarDate,
      sign: astrolabe.sign,
      zodiac: astrolabe.zodiac,
      fiveElementsClass: astrolabe.fiveElementsClass,
      soul: astrolabe.soul,
      body: astrolabe.body,
      soulPalace: astrolabe.earthlyBranchOfSoulPalace,
      bodyPalace: astrolabe.earthlyBranchOfBodyPalace,
      timeRange: astrolabe.timeRange,
      palaces: astrolabe.palaces.map((palace) => ({
        name: palace.name,
        earthlyBranch: palace.earthlyBranch,
        majorStars: palace.majorStars.map((star) => star.name),
      })),
    }
  } catch {
    return null
  }
}

function getAstrolabe(config: ChartConfig) {
  return config.birthdayType === 'solar'
    ? astro.bySolar(config.birthday, config.birthTime, config.gender, true, 'zh-CN')
    : astro.byLunar(config.birthday, config.birthTime, config.gender, false, true, 'zh-CN')
}

function getYearPalaceShortLabel(palaceName: string) {
  switch (normalizePalaceName(palaceName)) {
    case '命宫':
      return '年命'
    case '兄弟':
      return '年兄'
    case '夫妻':
      return '年夫'
    case '子女':
      return '年子'
    case '财帛':
      return '年财'
    case '疾厄':
      return '年疾'
    case '迁移':
      return '年迁'
    case '交友':
      return '年友'
    case '官禄':
      return '年官'
    case '田宅':
      return '年田'
    case '福德':
      return '年福'
    case '父母':
      return '年父'
    default:
      return '年宫'
  }
}

function getDecadalPalaceShortLabel(palaceName: string) {
  switch (normalizePalaceName(palaceName)) {
    case '命宫':
      return '大命'
    case '兄弟':
      return '大兄'
    case '夫妻':
      return '大夫'
    case '子女':
      return '大子'
    case '财帛':
      return '大财'
    case '疾厄':
      return '大疾'
    case '迁移':
      return '大迁'
    case '交友':
      return '大友'
    case '官禄':
      return '大官'
    case '田宅':
      return '大田'
    case '福德':
      return '大福'
    case '父母':
      return '大父'
    default:
      return '大宫'
  }
}

export function buildTimelineModel(config: ChartConfig, pivotYear = new Date().getFullYear()): TimelineModel | null {
  try {
    const astrolabe = getAstrolabe(config)
    const solarBirthYear = Number(String(astrolabe.solarDate).split('-')[0])
    const currentHoroscope = astrolabe.horoscope(new Date(`${pivotYear}-06-01T12:00:00`))

    const decadalOptions = astrolabe.palaces
      .map((palace) => {
        const [startAge, endAge] = palace.decadal.range
        let decadalPalaceNames: string[] = []
        const years = Array.from({ length: endAge - startAge + 1 }, (_, offset) => {
          const nominalAge = startAge + offset
          const year = solarBirthYear + nominalAge - 1
          const horoscope = astrolabe.horoscope(new Date(`${year}-06-01T12:00:00`))

          if (offset === 0) {
            decadalPalaceNames = horoscope.decadal.palaceNames
          }

          return {
            year,
            nominalAge,
            yearlyIndex: horoscope.yearly.index,
            yearlyPalaceLabels: horoscope.yearly.palaceNames.map((name) => getYearPalaceShortLabel(name)),
          }
        })

        return {
          palaceIndex: palace.index,
          palaceName: normalizePalaceName(palace.name),
          heavenlyStem: palace.decadal.heavenlyStem,
          earthlyBranch: palace.decadal.earthlyBranch,
          startAge,
          endAge,
          decadalPalaceLabels: decadalPalaceNames.map((name: string) => getDecadalPalaceShortLabel(name)),
          years,
        }
      })
      .sort((a, b) => a.startAge - b.startAge)

    return {
      decadalOptions,
      defaultDecadalIndex: currentHoroscope.decadal.index,
      defaultYear: pivotYear,
    }
  } catch {
    return null
  }
}

export function buildSihuaRiskSummary(config: ChartConfig): SihuaRiskPalace[] {
  try {
    const astrolabe =
      config.birthdayType === 'solar'
        ? astro.bySolar(config.birthday, config.birthTime, config.gender, true, 'zh-CN')
        : astro.byLunar(config.birthday, config.birthTime, config.gender, false, true, 'zh-CN')

    const riskMap = new Map<string, SihuaRiskPalace>()
    const allPalaces = astrolabe.palaces

    const allStars = allPalaces.flatMap((palace) => [
      ...palace.majorStars.map((star) => ({ star, palace })),
      ...palace.minorStars.map((star) => ({ star, palace })),
      ...palace.adjectiveStars.map((star) => ({ star, palace })),
    ])

    const natalJi = allStars.find((item) => item.star.mutagen === '忌')

    function ensureRiskPalace(palaceName: string) {
      const normalized = normalizePalaceName(palaceName)
      const matchedPalace = allPalaces.find((palace) => normalizePalaceName(palace.name) === normalized)
      if (!matchedPalace) return null

      if (!riskMap.has(normalized)) {
        riskMap.set(normalized, {
          palace: normalized,
          opposite: oppositePalaceName(normalized),
          palaceType: PEOPLE_PALACES.has(normalized) ? '人宫' : '物宫',
          majorStars: matchedPalace.majorStars.map((star) => star.name),
          reasons: [],
        })
      }

      return riskMap.get(normalized) ?? null
    }

    function pushReason(palaceName: string, reason: string) {
      const target = ensureRiskPalace(palaceName)
      if (!target) return
      if (!target.reasons.includes(reason)) {
        target.reasons.push(reason)
      }
    }

    if (natalJi) {
      const jiSourcePalace = natalJi.palace
      const mutaged = jiSourcePalace.mutagedPlaces?.() ?? []
      const jiDest = mutaged[3]
      const jiDestName = jiDest ? normalizePalaceName(jiDest.name) : ''

      if (jiDestName) {
        pushReason(
          jiDestName,
          `生年忌 ${natalJi.star.name}(${normalizePalaceName(jiSourcePalace.name)}) 忌转忌落入此宫。`,
        )

        const clashPalace = oppositePalaceName(jiDestName)
        if (clashPalace) {
          pushReason(clashPalace, `生年忌 ${natalJi.star.name} 忌转忌所冲的对宫。`)
        }
      }
    }

    allPalaces.forEach((palace) => {
      const normalizedSource = normalizePalaceName(palace.name)
      const mutaged = palace.mutagedPlaces?.() ?? []
      const jiDest = mutaged[3]
      const jiDestName = jiDest ? normalizePalaceName(jiDest.name) : ''
      const jiStar = STEM_MUTAGENS[palace.heavenlyStem]?.忌

      if (jiDestName && jiStar) {
        pushReason(jiDestName, `${normalizedSource}(${palace.heavenlyStem}) 飞 ${jiStar}忌 直接落入此宫。`)

        const clashPalace = oppositePalaceName(jiDestName)
        if (clashPalace) {
          pushReason(clashPalace, `${normalizedSource}(${palace.heavenlyStem}) 飞 ${jiStar}忌 所冲的对宫。`)
        }
      }

      if (palace.selfMutaged?.('忌')) {
        pushReason(normalizedSource, `${normalizedSource} 自化忌，宫内事务容易自我拉扯。`)
      }
    })

    return Array.from(riskMap.values())
      .filter((item) => item.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length || PALACE_ORDER.indexOf(a.palace as (typeof PALACE_ORDER)[number]) - PALACE_ORDER.indexOf(b.palace as (typeof PALACE_ORDER)[number]))
      .slice(0, 6)
  } catch {
    return []
  }
}

export function buildZiweiDoushuInsights(config: ChartConfig): ZiweiInsightPayload | null {
  try {
    const astrolabe =
      config.birthdayType === 'solar'
        ? astro.bySolar(config.birthday, config.birthTime, config.gender, true, 'zh-CN')
        : astro.byLunar(config.birthday, config.birthTime, config.gender, false, true, 'zh-CN')

    const lifePalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '命宫')
    const spousePalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '夫妻')
    const wealthPalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '财帛')
    const careerPalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '官禄')
    const healthPalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '疾厄')
    const travelPalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '迁移')
    const fortunePalace = astrolabe.palaces.find((palace) => normalizePalaceName(palace.name) === '福德')

    const lifeStars = lifePalace?.majorStars.map((star) => star.name) ?? []
    const headline = lifeStars.length > 0 ? `命宫主轴：${lifeStars.join('、')}坐命` : '命宫主轴：待补定盘'
    const summary =
      lifeStars.length > 0
        ? lifeStars
            .map((star) => STAR_DETAILED_READINGS[star]?.core ?? STAR_TRAITS[star] ?? `${star} 是当前命格主轴的重要星曜。`)
            .join('')
        : '当前盘面还没有抓到足够的命宫主星信息，建议先确认排盘输入。'

    function formatPalaceLabel(palace: typeof astrolabe.palaces[number] | undefined) {
      if (!palace) return '未定位'
      return `${palace.name}（${palace.heavenlyStem}${palace.earthlyBranch}）`
    }

    function formatMutagens(stars: typeof astrolabe.palaces[number]['majorStars']) {
      const mutagens = stars.filter((star) => star.mutagen).map((star) => `${star.name}化${star.mutagen}`)
      return mutagens.length > 0 ? mutagens.join('、') : ''
    }

    function buildStarDetailLines(
      stars: typeof astrolabe.palaces[number]['majorStars'],
      aspect?: 'career' | 'relationship' | 'wealth' | 'health',
    ) {
      return stars.map((star) => {
        const detail = STAR_DETAILED_READINGS[star.name]
        const topicNote = aspect ? detail?.[aspect] : ''
        const mutagenNote = star.mutagen ? `${star.name}当前带生年化${star.mutagen}。` : ''
        const brightnessNote = star.brightness ? `${star.name}${star.brightness}。` : ''
        return [topicNote || detail?.core || STAR_TRAITS[star.name], mutagenNote, brightnessNote].filter(Boolean).join('')
      })
    }

    function makeTopicPoints(
      palace: typeof astrolabe.palaces[number] | undefined,
      topic: 'career' | 'relationship' | 'wealth' | 'health',
    ) {
      if (!palace) return ['当前还缺少对应宫位数据。']
      const stars = palace.majorStars.map((star) => star.name)
      const mutagens = formatMutagens(palace.majorStars)
      const starSet =
        topic === 'career'
          ? CAREER_STARS
          : topic === 'relationship'
            ? RELATIONSHIP_STARS
            : topic === 'wealth'
              ? WEALTH_STARS
              : HEALTH_STARS

      const matched = stars.filter((star) => starSet.has(star))
      const points = [
        `${PALACE_TOPIC_GUIDE[normalizePalaceName(palace.name)] ?? ''}${formatPalaceLabel(palace)}主星：${stars.length > 0 ? stars.join('、') : '无主星'}。`,
      ]

      if (matched.length > 0) {
        points.push(`就这个专题看，${matched.join('、')} 是更值得优先读取的星曜。`)
      }

      buildStarDetailLines(palace.majorStars, topic).slice(0, 2).forEach((line) => {
        if (line) points.push(line)
      })

      if (mutagens) {
        points.push(`宫内已见四化：${mutagens}，说明这个专题已经带有明显的动态引动。`)
      }

      if (topic === 'career' && travelPalace?.majorStars.length) {
        points.push(`事业判断还要联看迁移宫：${travelPalace.majorStars.map((star) => star.name).join('、')}。`)
      }

      if (topic === 'relationship' && careerPalace?.majorStars.length) {
        points.push(`婚姻专题需要参考官禄宫这条夫妻迁移线：${careerPalace.majorStars.map((star) => star.name).join('、')}。`)
      }

      if (topic === 'wealth' && fortunePalace?.majorStars.length) {
        points.push(`财运不只看财帛宫，还要联看福德宫的财源想法：${fortunePalace.majorStars.map((star) => star.name).join('、')}。`)
      }

      if (topic === 'health' && fortunePalace?.majorStars.length) {
        points.push(`健康专题建议同时观察福德宫，判断压力与潜意识消耗。`)
      }

      return points
    }

    const natalMutagenEntries = astrolabe.palaces.flatMap((palace) =>
      palace.majorStars
        .filter((star) => star.mutagen)
        .map((star) => `${star.name}化${star.mutagen}落在${palace.name}`),
    )

    return {
      headline,
      summary,
      sections: [
        {
          title: '命盘主轴',
          points: [
            `${formatPalaceLabel(lifePalace)}主星：${lifeStars.length > 0 ? lifeStars.join('、') : '无主星'}。`,
            `命迁轴需要联看${formatPalaceLabel(travelPalace)}，这是“自己怎么活”和“外界怎么接你”的两面。`,
            ...buildStarDetailLines(lifePalace?.majorStars ?? []).slice(0, 3),
          ],
        },
        {
          title: '事业专题',
          points: makeTopicPoints(careerPalace, 'career'),
        },
        {
          title: '财运专题',
          points: makeTopicPoints(wealthPalace, 'wealth'),
        },
        {
          title: '婚姻专题',
          points: makeTopicPoints(spousePalace, 'relationship'),
        },
        {
          title: '健康专题',
          points: makeTopicPoints(healthPalace, 'health'),
        },
        {
          title: '生年四化落点',
          points:
            natalMutagenEntries.length > 0
              ? natalMutagenEntries
              : ['当前没有从主星层读取到生年四化落点。'],
        },
      ],
      methodology: [
        '先定命宫主星，再看命迁、财官、夫妻官禄、疾厄福德这些专题轴线。',
        '四化只作为动态加权，不单独脱离宫位和星曜解释。',
        '这版右侧内容是“根据当前命盘信息生成的结构化解读稿”，不是泛泛的原则摘要。',
      ],
    }
  } catch {
    return null
  }
}

const zodiacIcons: Record<string, string> = {
  鼠: '🐭',
  牛: '🐮',
  虎: '🐯',
  兔: '🐰',
  龙: '🐲',
  蛇: '🐍',
  马: '🐴',
  羊: '🐑',
  猴: '🐵',
  鸡: '🐔',
  狗: '🐶',
  猪: '🐷',
}

export function buildCasePreview(caseRecord: CaseRecord) {
  const chart = buildChartSummary(caseRecord)

  return {
    ...caseRecord,
    solarLabel: `${caseRecord.birthday} ${caseRecord.birthTimeText}`,
    lunarLabel: chart?.lunarDate ?? '未生成',
    zodiac: chart?.zodiac ?? '',
    zodiacIcon: zodiacIcons[chart?.zodiac ?? ''] ?? '✨',
  }
}
