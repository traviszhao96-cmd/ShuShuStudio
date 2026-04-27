export type CalendarType = 'solar' | 'lunar'
export type GenderType = 'male' | 'female'

export type ChartConfig = {
  birthday: string
  birthTimeText: string
  birthTime: number
  birthdayType: CalendarType
  gender: GenderType
}

export type CaseRecord = ChartConfig & {
  id: string
  name: string
  group: '家人' | '同学' | '同事' | '名人' | '朋友'
  note: string
}

export type ChartSummary = {
  lunarDate: string
  sign: string
  zodiac: string
  fiveElementsClass: string
  soul: string
  body: string
  soulPalace: string
  bodyPalace: string
  timeRange: string
  palaces: Array<{
    name: string
    earthlyBranch: string
    majorStars: string[]
  }>
}
