export type CalendarType = 'solar' | 'lunar'
export type GenderType = 'male' | 'female'
export type BirthTimeSource = 'manual' | 'bazi_match' | 'bazi_branch' | 'placeholder'

export type BaziPillars = {
  yearPillar: string
  monthPillar: string
  dayPillar: string
  hourPillar: string | null
}

export type ChartConfig = {
  birthday: string
  birthTimeText: string
  birthTime: number
  birthdayType: CalendarType
  gender: GenderType
  birthTimeSource?: BirthTimeSource
  bazi?: BaziPillars | null
}

export type CaseRecord = ChartConfig & {
  id: string
  name: string
  group: '家人' | '同学' | '同事' | '名人' | '朋友' | '评测'
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

export type WorkspaceMode = 'sanhe' | 'sihua' | 'circle' | 'bazi'

export type TimelineYearOption = {
  year: number
  nominalAge: number
  yearlyIndex: number
  yearlyPalaceLabels: string[]
}

export type TimelineDecadalOption = {
  palaceIndex: number
  palaceName: string
  heavenlyStem: string
  earthlyBranch: string
  startAge: number
  endAge: number
  decadalPalaceLabels: string[]
  years: TimelineYearOption[]
}

export type TimelineModel = {
  decadalOptions: TimelineDecadalOption[]
  defaultDecadalIndex: number
  defaultYear: number
}

export type SihuaRiskPalace = {
  palace: string
  opposite: string
  palaceType: '人宫' | '物宫'
  majorStars: string[]
  reasons: string[]
}

export type ZiweiInsightSection = {
  title: string
  points: string[]
}

export type ZiweiInsightPayload = {
  headline: string
  summary: string
  sections: ZiweiInsightSection[]
  methodology: string[]
}
