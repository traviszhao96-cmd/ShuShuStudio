import type { ReactNode } from 'react'
import type { BaziPillars, ChartConfig } from '../types'

type BaziChartProps = {
  config: ChartConfig
}

type ElementType = '木' | '火' | '土' | '金' | '水'
type YinYang = '阳' | '阴'

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱']
const NAYIN_PAIRS = [
  ['甲子', '乙丑', '海中金'],
  ['丙寅', '丁卯', '炉中火'],
  ['戊辰', '己巳', '大林木'],
  ['庚午', '辛未', '路旁土'],
  ['壬申', '癸酉', '剑锋金'],
  ['甲戌', '乙亥', '山头火'],
  ['丙子', '丁丑', '涧下水'],
  ['戊寅', '己卯', '城头土'],
  ['庚辰', '辛巳', '白蜡金'],
  ['壬午', '癸未', '杨柳木'],
  ['甲申', '乙酉', '泉中水'],
  ['丙戌', '丁亥', '屋上土'],
  ['戊子', '己丑', '霹雳火'],
  ['庚寅', '辛卯', '松柏木'],
  ['壬辰', '癸巳', '长流水'],
  ['甲午', '乙未', '沙中金'],
  ['丙申', '丁酉', '山下火'],
  ['戊戌', '己亥', '平地木'],
  ['庚子', '辛丑', '壁上土'],
  ['壬寅', '癸卯', '金箔金'],
  ['甲辰', '乙巳', '覆灯火'],
  ['丙午', '丁未', '天河水'],
  ['戊申', '己酉', '大驿土'],
  ['庚戌', '辛亥', '钗钏金'],
  ['壬子', '癸丑', '桑柘木'],
  ['甲寅', '乙卯', '大溪水'],
  ['丙辰', '丁巳', '沙中土'],
  ['戊午', '己未', '天上火'],
  ['庚申', '辛酉', '石榴木'],
  ['壬戌', '癸亥', '大海水'],
]

const STEM_META: Record<string, { element: ElementType; yinYang: YinYang }> = {
  甲: { element: '木', yinYang: '阳' },
  乙: { element: '木', yinYang: '阴' },
  丙: { element: '火', yinYang: '阳' },
  丁: { element: '火', yinYang: '阴' },
  戊: { element: '土', yinYang: '阳' },
  己: { element: '土', yinYang: '阴' },
  庚: { element: '金', yinYang: '阳' },
  辛: { element: '金', yinYang: '阴' },
  壬: { element: '水', yinYang: '阳' },
  癸: { element: '水', yinYang: '阴' },
}

const BRANCH_MAIN_ELEMENT: Record<string, ElementType> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
}

const GENERATES: Record<ElementType, ElementType> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

const CONTROLS: Record<ElementType, ElementType> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
}

const GROWTH_STAGES_BY_STEM: Record<string, Record<string, string>> = {
  甲: buildGrowthMap('亥子丑寅卯辰巳午未申酉戌'),
  乙: buildGrowthMap('午巳辰卯寅丑子亥戌酉申未'),
  丙: buildGrowthMap('寅卯辰巳午未申酉戌亥子丑'),
  戊: buildGrowthMap('寅卯辰巳午未申酉戌亥子丑'),
  丁: buildGrowthMap('酉申未午巳辰卯寅丑子亥戌'),
  己: buildGrowthMap('酉申未午巳辰卯寅丑子亥戌'),
  庚: buildGrowthMap('巳午未申酉戌亥子丑寅卯辰'),
  辛: buildGrowthMap('子亥戌酉申未午巳辰卯寅丑'),
  壬: buildGrowthMap('申酉戌亥子丑寅卯辰巳午未'),
  癸: buildGrowthMap('卯寅丑子亥戌酉申未午巳辰'),
}

const NAYIN_BY_PILLAR = NAYIN_PAIRS.reduce(
  (acc, [first, second, label]) => ({
    ...acc,
    [first]: label,
    [second]: label,
  }),
  {} as Record<string, string>,
)

const XUN_EMPTY_BRANCHES = [
  ['戌', '亥'],
  ['申', '酉'],
  ['午', '未'],
  ['辰', '巳'],
  ['寅', '卯'],
  ['子', '丑'],
]

const WEN_CHANG: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}

const LU_SHEN: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
}

const YANG_REN: Record<string, string> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
}

const TIAN_YI: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['卯', '巳'],
  癸: ['卯', '巳'],
  辛: ['寅', '午'],
}

const GROUP_STARS = [
  { branches: ['申', '子', '辰'], peach: '酉', horse: '寅', canopy: '辰', general: '子' },
  { branches: ['寅', '午', '戌'], peach: '卯', horse: '申', canopy: '戌', general: '午' },
  { branches: ['巳', '酉', '丑'], peach: '午', horse: '亥', canopy: '丑', general: '酉' },
  { branches: ['亥', '卯', '未'], peach: '子', horse: '巳', canopy: '未', general: '卯' },
]

function buildGrowthMap(branches: string) {
  const stages = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
  return branches.split('').reduce(
    (acc, branch, index) => ({
      ...acc,
      [branch]: stages[index],
    }),
    {} as Record<string, string>,
  )
}

function getStem(pillar?: string | null) {
  return pillar?.slice(0, 1) ?? ''
}

function getBranch(pillar?: string | null) {
  return pillar?.slice(1, 2) ?? ''
}

function getTenGod(dayStem: string, targetStem: string) {
  if (!dayStem || !targetStem || !STEM_META[dayStem] || !STEM_META[targetStem]) return '待定'

  const day = STEM_META[dayStem]
  const target = STEM_META[targetStem]
  const samePolarity = day.yinYang === target.yinYang

  if (day.element === target.element) return samePolarity ? '比肩' : '劫财'
  if (GENERATES[target.element] === day.element) return samePolarity ? '偏印' : '正印'
  if (GENERATES[day.element] === target.element) return samePolarity ? '食神' : '伤官'
  if (CONTROLS[day.element] === target.element) return samePolarity ? '偏财' : '正财'
  if (CONTROLS[target.element] === day.element) return samePolarity ? '七杀' : '正官'

  return '待定'
}

function getCycleIndex(pillar: string) {
  const stemIndex = HEAVENLY_STEMS.indexOf(getStem(pillar))
  const branchIndex = EARTHLY_BRANCHES.indexOf(getBranch(pillar))

  if (stemIndex < 0 || branchIndex < 0) return -1

  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return index
  }

  return -1
}

function getEmptyBranches(pillar?: string | null) {
  if (!pillar) return []
  const cycleIndex = getCycleIndex(pillar)
  if (cycleIndex < 0) return []
  return XUN_EMPTY_BRANCHES[Math.floor(cycleIndex / 10)] ?? []
}

function getGroupStars(dayBranch: string) {
  return GROUP_STARS.find((group) => group.branches.includes(dayBranch)) ?? null
}

function getShenSha(dayStem: string, dayBranch: string, branch: string, dayEmpty: string[]) {
  const items: string[] = []
  const group = getGroupStars(dayBranch)

  if (WEN_CHANG[dayStem] === branch) items.push('文昌')
  if (LU_SHEN[dayStem] === branch) items.push('禄神')
  if (YANG_REN[dayStem] === branch) items.push('羊刃')
  if (TIAN_YI[dayStem]?.includes(branch)) items.push('天乙')
  if (group?.peach === branch) items.push('桃花')
  if (group?.horse === branch) items.push('驿马')
  if (group?.canopy === branch) items.push('华盖')
  if (group?.general === branch) items.push('将星')
  if (dayEmpty.includes(branch)) items.push('空亡')

  return items
}

function getPillarList(bazi?: BaziPillars | null) {
  return [bazi?.yearPillar, bazi?.monthPillar, bazi?.dayPillar, bazi?.hourPillar]
}

function buildBaziRows(config: ChartConfig) {
  const pillars = getPillarList(config.bazi)
  const dayStem = getStem(config.bazi?.dayPillar)
  const dayBranch = getBranch(config.bazi?.dayPillar)
  const dayEmpty = getEmptyBranches(config.bazi?.dayPillar)

  return pillars.map((pillar, index) => {
    const stem = getStem(pillar)
    const branch = getBranch(pillar)
    const hiddenStems = HIDDEN_STEMS[branch] ?? []

    return {
      label: PILLAR_LABELS[index],
      pillar,
      stem,
      branch,
      stemElement: STEM_META[stem]?.element,
      branchElement: BRANCH_MAIN_ELEMENT[branch],
      role: index === 2 ? (config.gender === 'female' ? '元女' : '元男') : getTenGod(dayStem, stem),
      hiddenStems,
      hiddenRoles: hiddenStems.map((item) => getTenGod(dayStem, item)),
      growth: GROWTH_STAGES_BY_STEM[dayStem]?.[branch] ?? '待定',
      selfSit: stem ? (GROWTH_STAGES_BY_STEM[stem]?.[branch] ?? '待定') : '待定',
      empty: getEmptyBranches(pillar).join('') || '待定',
      nayin: pillar ? (NAYIN_BY_PILLAR[pillar] ?? '待定') : '待定',
      shensha: branch ? getShenSha(dayStem, dayBranch, branch, dayEmpty) : [],
    }
  })
}

function ElementText({ value, className = '' }: { value: string; className?: string }) {
  const element = STEM_META[value]?.element ?? BRANCH_MAIN_ELEMENT[value]

  return <span className={`bazi-element bazi-element--${element ?? 'unknown'} ${className}`}>{value}</span>
}

function BaziCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bazi-grid-cell ${className}`}>{children}</div>
}

export function BaziChart({ config }: BaziChartProps) {
  const rows = buildBaziRows(config)
  const hasBazi = Boolean(config.bazi?.yearPillar && config.bazi.monthPillar && config.bazi.dayPillar)

  return (
    <div className="bazi-app-panel">
      <div className="bazi-table-shell">
        <div className="bazi-grid">
          <BaziCell className="bazi-row-head">日期</BaziCell>
          {rows.map((item) => (
            <BaziCell key={item.label} className="bazi-column-head">
              {item.label}
            </BaziCell>
          ))}

          <BaziCell className="bazi-row-head">主星</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-role`}>{hasBazi ? item.role : '待补录'}</BaziCell>
          ))}

          <BaziCell className="bazi-row-head bazi-large-row">天干</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-stem`} className="bazi-large-row">
              {item.stem ? (
                <div className="bazi-big-symbol">
                  <ElementText value={item.stem} />
                  <small>{item.stemElement}</small>
                </div>
              ) : (
                <span className="bazi-muted">待定</span>
              )}
            </BaziCell>
          ))}

          <BaziCell className="bazi-row-head bazi-large-row">地支</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-branch`} className="bazi-large-row">
              {item.branch ? (
                <div className="bazi-big-symbol">
                  <ElementText value={item.branch} />
                  <small>{item.branchElement}</small>
                </div>
              ) : (
                <span className="bazi-muted">待定</span>
              )}
            </BaziCell>
          ))}

          <BaziCell className="bazi-row-head">藏干</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-hidden`} className="bazi-hidden-stems-cell">
              {item.hiddenStems.length > 0 ? (
                item.hiddenStems.map((hiddenStem) => (
                  <span key={hiddenStem}>
                    <ElementText value={hiddenStem} /> {STEM_META[hiddenStem]?.element}
                  </span>
                ))
              ) : (
                <span className="bazi-muted">待定</span>
              )}
            </BaziCell>
          ))}

          <BaziCell className="bazi-row-head">副星</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-hidden-role`} className="bazi-stack-cell">
              {item.hiddenRoles.length > 0 ? (
                item.hiddenRoles.map((role, index) => <span key={`${role}-${index}`}>{role}</span>)
              ) : (
                <span className="bazi-muted">待定</span>
              )}
            </BaziCell>
          ))}

          <BaziCell className="bazi-row-head">星运</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-growth`}>{item.growth}</BaziCell>
          ))}

          <BaziCell className="bazi-row-head">自坐</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-self`}>{item.selfSit}</BaziCell>
          ))}

          <BaziCell className="bazi-row-head">空亡</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-empty`}>{item.empty}</BaziCell>
          ))}

          <BaziCell className="bazi-row-head">纳音</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-nayin`}>{item.nayin}</BaziCell>
          ))}

          <BaziCell className="bazi-row-head bazi-shensha-head">神煞</BaziCell>
          {rows.map((item) => (
            <BaziCell key={`${item.label}-shensha`} className="bazi-stack-cell bazi-shensha-cell">
              {item.shensha.length > 0 ? (
                item.shensha.map((label) => <span key={label}>{label}</span>)
              ) : (
                <span className="bazi-muted">无</span>
              )}
            </BaziCell>
          ))}
        </div>
      </div>
    </div>
  )
}
