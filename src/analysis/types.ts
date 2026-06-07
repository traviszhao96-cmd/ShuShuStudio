export type SiHuaType = '禄' | '权' | '科' | '忌'
export type GongName =
  | '命宫'
  | '兄弟'
  | '夫妻'
  | '子女'
  | '财帛'
  | '疾厄'
  | '迁移'
  | '交友'
  | '官禄'
  | '田宅'
  | '福德'
  | '父母'

export type BasicInfo = {
  gender: 'male' | 'female'
  lunarBirth: string
  shengxiao: string
  tianGan: string
  shenGong: GongName
  wuXingJu: string
}

export type StarModel = {
  name: string
  palace: GongName
  brightness?: string
  mutagen?: SiHuaType
  category: 'major' | 'minor' | 'adjective'
}

export type PalaceModel = {
  index: number
  name: GongName
  diZhi: string
  heavenlyStem: string
  daXianRange?: string
  liuNianDiZhi?: string
  mainStar: string[]
  minorStar: string[]
  adjectiveStar: string[]
  shengNianSiHua?: { star: string; hua: SiHuaType }
  ziHua?: { star: string; hua: SiHuaType; direction: '离心' | '向心' }
}

export type SiHua = {
  type: SiHuaType
  star: string
  palace: GongName
  palaceIndex: number
}

export type ZiHua = {
  sourcePalace: GongName
  sourcePalaceIndex: number
  targetPalace: GongName
  targetPalaceIndex: number
  star: string
  hua: SiHuaType
  direction: '离心' | '向心'
}

export type FeiHua = {
  sourcePalace: GongName
  sourcePalaceIndex: number
  targetPalace: GongName
  targetPalaceIndex: number
  star: string
  hua: SiHuaType
}

export type DaXian = {
  palace: GongName
  palaceIndex: number
  range: string
}

export type ChartModel = {
  basicInfo: BasicInfo
  palaces: PalaceModel[]
  stars: StarModel[]
  shengNianSiHua: SiHua[]
  ziHua: ZiHua[]
  feiHua: FeiHua[]
  daXian: DaXian[]
  laiyinGong: GongName
}

export type AlertItem = {
  severity: 'high' | 'medium' | 'low'
  category: string
  description: string
  relatedPalaces: GongName[]
}

export type OverallResult = {
  laiyinGong: GongName
  laiyinInterpretation: string
  personalityType: string
  personalityTags: string[]
  patternScore: number
  patternLabel: '上格' | '中上' | '中格' | '中下'
  energyScore: number
  energyQuadrant: '福报型' | '病灶型' | '隐藏型' | '空白型'
  alerts: AlertItem[]
  highlights: string[]
}

export type PalaceBasic = {
  number: number
  primary: string
  layers: { label: string; meaning: string }[]
  liuNeiWai: '六内' | '六外'
  heTuGroup: string
}

export type ZhuanGongItem = {
  as: GongName
  meaning: string
  implication: string
}

export type SiHuaEffect = {
  type: SiHuaType
  star: string
  meaning: string
  severity?: 'neutral' | 'caution' | 'warning'
}

export type SanFangInfo = {
  main: GongName
  duiGong: GongName
  left: GongName
  right: GongName
}

export type FlowAnalysis = {
  outgoing: string[]
  incoming: string[]
}

export type PalaceResult = {
  palace: GongName
  basics: PalaceBasic
  zhuanGong: ZhuanGongItem[]
  siHuaHere: SiHuaEffect[]
  duiGongRelation: string
  sanFangSiZheng: SanFangInfo
  flowAnalysis?: FlowAnalysis
  alerts: AlertItem[]
}

export type SiHuaFlow = {
  type: SiHuaType
  star: string
  source: GongName
  target: GongName
}

export type PingFangItem = {
  palace: GongName
  description: string
}

export type HeTuGroup = {
  name: string
  palaces: GongName[]
  theme: string
}

export type MethodologyResult = {
  laiyinGong: GongName
  laiyinChain: SiHuaFlow[]
  tiYong: {
    ti: GongName[]
    yong: GongName[]
  }
  pingFang?: PingFangItem[]
  liuNeiWaiMap: Record<GongName, '六内' | '六外'>
  heTuGroups: HeTuGroup[]
}

export type JiChain = {
  source: { gong: GongName; star: string; type: '生年忌' | '飞宫忌' }
  target: { gong: GongName; star: string }
  impact: string
  severity: 'high' | 'medium' | 'low'
}

export type LuSuiJiItem = {
  jiSource: GongName
  luTarget: GongName
  description: string
}

export type KeSuiQuanItem = {
  quanSource: GongName
  keTarget: GongName
  description: string
}

export type MutagenChainResult = {
  jiChains: JiChain[]
  luSuiJi: LuSuiJiItem[]
  keSuiQuan?: KeSuiQuanItem[]
}

export type TopicName = '个性' | '家庭' | '学业' | '婚姻' | '交友' | '事业' | '财富' | '健康'

export type TopicResult = {
  topic: TopicName
  headline: string
  summary: string
  focusPalaces: GongName[]
  points: string[]
  alerts: AlertItem[]
}
