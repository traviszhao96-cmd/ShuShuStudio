/**
 * 命盘 Markdown 生成器
 *
 * 纯计算层输出 — 从 ChartModel 程序化生成 mingpan.md。
 * 无 AI 参与，内容全部来自 iztro 计算 + 规则推导。
 * 这是三层架构的第一层：计算层 → 格局分析层 → 工具层。
 */

import type { ChartModel } from './types'

// ── 常量 ──

const ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

const CANG_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
  '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
  '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
}

const SHI_SHEN: Record<string, string> = {
  '甲': '劫财', '乙': '比肩', '丙': '伤官', '丁': '食神',
  '戊': '正财', '己': '偏财', '庚': '正官', '辛': '七杀',
  '壬': '正印', '癸': '偏印',
}

const GAN_HE: Record<string, string> = {
  '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火',
}

const ZHI_HE: Record<string, string> = {
  '子丑': '土', '寅亥': '木', '卯戌': '火', '辰酉': '金', '巳申': '水', '午未': '日月',
}

const LU_POSITION: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
  '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
  '壬': '亥', '癸': '子',
}

// ── 工具 ──

function ganHe(a: string, b: string): string | null {
  return GAN_HE[a + b] || GAN_HE[b + a] || null
}
function zhiHe(a: string, b: string): string | null {
  return ZHI_HE[a + b] || ZHI_HE[b + a] || null
}
function cang(zhi: string): string {
  return (CANG_GAN[zhi] || []).map((g) => `${g}(${SHI_SHEN[g] || '?'})`).join('、')
}
// ── 八字 ──

function buildBaziSection(model: ChartModel): string[] {
  const out: string[] = []
  const bazi = model.bazi
  if (!bazi || !bazi.day) return ['八字数据不完整。']

  const pillars = [
    { col: '年', gan: bazi.year[0], zhi: bazi.year[1] },
    { col: '月', gan: bazi.month[0], zhi: bazi.month[1] },
    { col: '日', gan: bazi.day[0], zhi: bazi.day[1] },
    { col: '时', gan: bazi.hour?.[0] ?? '?', zhi: bazi.hour?.[1] ?? '?' },
  ]
  const riGan = bazi.day[0]
  const luZhi = LU_POSITION[riGan]

  out.push('## 八字')
  out.push('')
  out.push(`四柱：${bazi.year} ${bazi.month} ${bazi.day}${bazi.hour ? ` ${bazi.hour}` : ''}`)
  out.push('')

  out.push('### 日主')
  const luCount = pillars.filter((p) => p.zhi === luZhi).length
  const yueDesc = pillars[1].zhi === luZhi ? '建禄' : ''
  const selfZuo = pillars[2].zhi === luZhi ? '自坐禄' : ''
  const desc = `${riGan}木，生于${pillars[1].zhi}月${yueDesc ? `（${yueDesc}）` : ''}${selfZuo ? `，${selfZuo}` : ''}。` +
    (luCount >= 2 ? ` 地支${luCount > 1 ? '双' : ''}禄，日主身强。` : '')
  out.push(desc)
  out.push('')

  out.push('### 天干')
  out.push('')
  out.push('| 柱 | 天干 | 日主十神 |')
  out.push('|----|------|----------|')
  for (const t of pillars)
    out.push(`| ${t.col} | ${t.gan} | ${t.gan === riGan ? '日主' : SHI_SHEN[t.gan] || '?'} |`)
  out.push('')

  out.push('### 地支')
  out.push('')
  out.push('| 柱 | 地支 | 藏干 |')
  out.push('|----|------|------|')
  for (const t of pillars) out.push(`| ${t.col} | ${t.zhi} | ${cang(t.zhi)} |`)
  out.push('')

  out.push('### 关键关系')
  out.push('')
  const rels: string[] = []
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const h = ganHe(pillars[i].gan, pillars[j].gan)
      if (h) rels.push(`${pillars[i].col}${pillars[j].col}天干合：${pillars[i].gan}${pillars[j].gan}合化${h}`)
      const z = zhiHe(pillars[i].zhi, pillars[j].zhi)
      if (z) rels.push(`${pillars[i].col}${pillars[j].col}六合：${pillars[i].zhi}${pillars[j].zhi}合${z}`)
    }
  }
  for (const t of pillars) {
    if (t.zhi === luZhi) rels.push(`${t.col}支${t.zhi}为日主${riGan}木的禄位`)
    if (['辰', '丑', '未', '戌'].includes(t.zhi))
      rels.push(`${t.col}支${t.zhi}为库`)
  }
  for (const r of rels) out.push(`- ${r}`)

  return out
}

// ── 紫微斗数 ──

function buildZiweiSection(model: ChartModel): string[] {
  const out: string[] = []
  out.push('## 紫微斗数')
  out.push('')
  out.push('| 宫位 | 干支 | 主星 | 辅星 | 杂曜 | 生年四化 | 大限 |')
  out.push('|------|------|------|------|------|----------|------|')

  const sorted = [...model.palaces].sort(
    (a, b) => ZHI_ORDER.indexOf(a.diZhi) - ZHI_ORDER.indexOf(b.diZhi),
  )

  for (const p of sorted) {
    const main = p.mainStar.filter((s) => s !== '天马')
    const tianMa = p.mainStar.includes('天马') ? ['天马'] : []
    const minors = [...tianMa, ...p.minorStar]
    const natal = model.shengNianSiHua
      .filter((x) => x.palace === p.name)
      .map((x) => `${x.star}化${x.type}`)

    out.push(
      `| ${p.name} | ${p.heavenlyStem}${p.diZhi} | ` +
        `${main.join('、') || '无主星'} | ${minors.join('、') || '—'} | ` +
        `${p.adjectiveStar.join('、') || '—'} | ${natal.join('、') || '—'} | ${p.daXianRange || ''} |`,
    )
  }

  return out
}

// ── 主入口 ──

export function buildMingpanMarkdown(model: ChartModel, caseName: string): string {
  const sections: string[] = []
  sections.push(`# 命盘档案 · ${caseName}`)
  sections.push('')
  sections.push(...buildBaziSection(model))
  sections.push('')
  sections.push(...buildZiweiSection(model))
  return sections.join('\n')
}
