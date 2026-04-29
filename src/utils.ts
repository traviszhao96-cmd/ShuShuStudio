import { astro } from 'iztro'
import type { CaseRecord, ChartConfig, ChartSummary, SihuaRiskPalace } from './types'

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
