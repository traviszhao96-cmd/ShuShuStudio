import { astro } from 'iztro'
import type { CaseRecord, ChartConfig, ChartSummary } from './types'

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
