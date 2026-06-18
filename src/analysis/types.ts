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
  birthYear: number
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
  majorStar?: string
  coStar?: string
  majorStarBrightness?: string
  coStarBrightness?: string
  minorStars?: string[]
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
  bazi?: { year: string; month: string; day: string; hour: string | null }
}

export type AlertItem = {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  relatedPalaces: GongName[]
}

export type PalaceScoreItem = {
  palace: GongName
  quality: { score: number; grade: string; breakdown: string[] }
  energy: { score: number; grade: string; breakdown: string[] }
  quadrant: string
  natalHua: string[]
  natalHuaMeaning: string
  tiYongNote: string
}

export type PatternItem = {
  name: string
  category: '吉' | '煞' | '特殊'
  description: string
  judgment: string
  palaces: GongName[]
}

export type MingQianAxisOverview = {
  ming: {
    stars: string
    diZhi: string
    natalHua: string[]
  }
  qianyi: {
    stars: string
    diZhi: string
    natalHua: string[]
  }
  summary: string
}

export type OverallResult = {
  laiyinGong: GongName
  shenGong: GongName
  laiyinInterpretation: string
  personalityType: string
  personalityTags: string[]
  alerts: AlertItem[]
  highlights: string[]
  palaceScores: PalaceScoreItem[]
  patterns: PatternItem[]
  natalSiHua: NatalSiHuaOverview
  mingQianAxis: MingQianAxisOverview
}

export type TopicName = '个性' | '事业' | '财富' | '婚姻' | '健康'

export type TopicResult = {
  topic: TopicName
  headline: string
  summary: string
  focusPalaces: GongName[]
  points: string[]
  alerts: AlertItem[]
}

export type ChartProfile = {
  generatedAt: number
  chartModelHash: string
  baziPattern: {
    patternName: string
    dayMasterAssessment: string
    keyDynamics: string[]
    fiveElementComment: string
  }
  ziweiStructure: {
    coreStructure: string
    lifeBodyAxis: string
    keyPalaces: Array<{ palace: string; signal: string }>
    laiyinTheme: string
  }
  integratedArchetype: {
    name: string
    oneLine: string
    strengthClusters: string[]
    riskClusters: string[]
  }
  sihuaCore: {
    dynamicSummary: string
    jiImpact: string
    quanImpact: string
    keImpact: string
    luImpact: string
  }
  confidence: 'high' | 'medium' | 'low'
}

export type NatalSiHuaItem = {
  star: string
  type: SiHuaType
  palace: GongName
  meaning: string
  duiGong: GongName
  duiGongRelation: string
  liuNeiWai: '六内' | '六外'
}

export type ZhenJiaLu = {
  luItem: NatalSiHuaItem
  jiItem: NatalSiHuaItem
  isZhen: boolean
  grade: '最优' | '真禄' | '假禄·差' | '假禄'
  narrative: string
}

export type NatalSiHuaOverview = {
  items: NatalSiHuaItem[]
  summary: string
  distribution: string
  zhenJiaLu: ZhenJiaLu | null
  abilityFlow: string
  jiDeepDive: {
    star: string
    palace: GongName
    meaning: string
    duiGong: GongName
    duiImpact: string
    liuNeiWai: '六内' | '六外'
    narrative: string
  }
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
  heTuBreaks: HeTuBreakItem[]
}

export type HeTuBreakItem = {
  groupName: string
  groupTheme: string
  from: GongName
  to: GongName
  star: string
  targetPalace: GongName
  severity: 'high' | 'medium' | 'critical'
  triggers: string[]
  directInterpretation: string
  transferredInterpretation: string
  asymmetricNote?: string
  affectedLines: {
    palace: GongName
    line: [GongName, GongName]
    daXianRange: string
    isPrimary: boolean
  }[]
  liuNianGroups: {
    daXianPalace: GongName
    daXianRange: string
    years: { tianGanDiZhi: string; age: number; isTaiSui: boolean }[]
  }[]
  taiSuiCycle: {
    diZhi: string
    shengXiao: string
    years: { tianGanDiZhi: string; age: number }[]
  }
}
