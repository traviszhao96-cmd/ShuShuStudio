/**
 * 格局分析模块
 *
 * 职责：
 * 1. 从 ChartModel 程序化生成格局分析 prompt（不硬编码命盘数据）
 * 2. 解析 AI 返回的 JSON → ChartProfile
 *
 * 这份 prompt 在用户完成第一次 AI 分析后调用一次，结果缓存为"命理档案"。
 * 后续工具（天赋地图、职业规划等）直接引用档案，不再重复分析原始命盘。
 */

import type { ChartModel, ChartProfile, GongName } from './types'

// ── 十二宫顺序 ──
const GONG_ORDER: GongName[] = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '官禄', '田宅', '福德', '父母',
]

// ── Prompt 构建 ──

/** 生成一个宫位的单行描述 */
function palaceLine(model: ChartModel, name: GongName): string {
  const p = model.palaces.find((x) => x.name === name)
  if (!p) return `- ${name}：无数据`

  const parts: string[] = []
  for (const s of p.mainStar) {
    const star = model.stars.find(
      (x) => x.name === s && x.palace === name && x.category === 'major',
    )
    const brightness = star?.brightness ? `[${star.brightness}]` : ''
    const mutagen = star?.mutagen ? `(化${star.mutagen})` : ''
    parts.push(`${s}${brightness}${mutagen}`)
  }
  // 辅星
  const minors = p.minorStar.filter((s) => s !== '天马')
  if (minors.length > 0) parts.push(...minors)
  // 杂曜（仅列出有特殊含义的）
  const keyAdjs = p.adjectiveStar.filter((s) =>
    ['天姚', '天才', '龙池', '华盖', '凤阁', '天贵', '恩光', '天巫', '蜚廉', '解神'].includes(s),
  )
  if (keyAdjs.length > 0) parts.push(...keyAdjs)

  return `- ${name}（${p.heavenlyStem}${p.diZhi}）：${parts.join('、') || '无主星'}`
}

/** 生成八字简述 */
function baziBlock(model: ChartModel): string {
  if (!model.bazi) return '八字数据不完整'
  const { year, month, day, hour } = model.bazi
  return [
    `四柱：${year} ${month} ${day}${hour ? ` ${hour}` : ''}`,
    `日主：${day[0]}（${day}的日干）`,
    `月令：${month[1]}月`,
    `性别：${model.basicInfo.gender === 'male' ? '男' : '女'}`,
  ].join('\n')
}

/** 生成生年四化列表 */
function sihuaList(model: ChartModel): string {
  return model.shengNianSiHua
    .map((x) => `${x.star}化${x.type}落${x.palace}`)
    .join('、') || '无'
}

/** 生成大运简述 */
function luckBlock(model: ChartModel): string {
  // 找到当前大限（约覆盖当前年龄的）
  const now = new Date()
  const birthYear = Number(model.basicInfo.lunarBirth?.split?.('-')?.[0] ?? 1996)
  const currentAge = now.getFullYear() - birthYear

  const current = model.daXian.find((d) => {
    const [start, end] = d.range.split('-').map(Number)
    return currentAge >= start && currentAge <= end
  })

  if (current) {
    return `当前大限：${current.palace}（${current.range}）`
  }
  return `大限数据：${model.daXian.map((d) => `${d.palace}(${d.range})`).join('、')}`
}

/**
 * 构建格局分析 prompt
 * 所有命盘数据从 ChartModel 程序化提取，不硬编码
 */
export function buildPatternAnalysisPrompt(model: ChartModel): string {
  const keyPalaces: GongName[] = GONG_ORDER
  const laiyin = model.laiyinGong
  const body = model.basicInfo.shenGong
  const start = '你是命理格局分析引擎。你的任务是对一个命盘进行结构性诊断，不是给用户写报告。'

  const ziweiPalaces = keyPalaces.map((name) => palaceLine(model, name)).join('\n')

  return `${start}

## 命盘数据（由排盘工具程序化生成，确保准确）

### 八字
${baziBlock(model)}

### 紫微斗数
${ziweiPalaces}

- 身宫：${body}
- 来因宫：${laiyin}
- 生年四化：${sihuaList(model)}
- 五行局：${model.basicInfo.wuXingJu}

### 大运
${luckBlock(model)}

## 输出要求

你必须输出一个严格的 JSON 对象，不要包含任何 Markdown 标记或其他文字。

JSON 结构如下：

{
  "baziPattern": {
    "patternName": "命理格局的经典名称，如 建禄格、食伤泄秀",
    "dayMasterAssessment": "日主强弱与气质的简要判断",
    "keyDynamics": ["3-5个关键动态"],
    "fiveElementComment": "五行配置的一句话评价"
  },
  "ziweiStructure": {
    "coreStructure": "紫微核心结构名称，如 杀破狼、机月同梁、紫府同宫",
    "lifeBodyAxis": "命宫+身宫的关系判断",
    "keyPalaces": [
      {"palace": "官禄", "signal": "一句话"},
      {"palace": "财帛", "signal": "一句话"},
      {"palace": "迁移", "signal": "一句话"},
      {"palace": "福德", "signal": "一句话"}
    ],
    "laiyinTheme": "来因宫揭示的人生课题"
  },
  "integratedArchetype": {
    "name": "整合八字与紫微后的原型名称",
    "oneLine": "一句话概括核心特质",
    "strengthClusters": ["2-3个天赋集群"],
    "riskClusters": ["2-3个风险/盲区集群"]
  },
  "sihuaCore": {
    "dynamicSummary": "四化主轴的一句话概括",
    "jiImpact": "化忌的影响评估（如有）",
    "quanImpact": "化权的影响评估（如有）",
    "keImpact": "化科的影响评估（如有）",
    "luImpact": "化禄的影响评估（如有）"
  },
  "confidence": "high | medium | low"
}

## 关键约束
1. 只基于提供的命盘事实判断，不要编造数据
2. 八字格局判断参考经典命理，输出用现代语言
3. 紫微格局参考星曜组合和宫位关系
4. 避免"注定""必然""一定"等绝对化表达
5. 每个结论必须有明确的命理事实支撑
6. JSON 必须合法，字段必须完整
7. 来因宫已明确标注，直接使用不需要重新推断`
}

// ── 响应解析 ──

/** 简单的字符串哈希 */
function hashString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return String(h)
}

/** 生成 ChartModel 的摘要哈希，用于判断命盘是否变更 */
export function hashChartModel(model: ChartModel): string {
  const key = [
    model.laiyinGong,
    ...model.palaces.map((p) => `${p.name}:${p.mainStar.join(',')}:${p.heavenlyStem}${p.diZhi}`),
    ...model.shengNianSiHua.map((x) => `${x.star}${x.type}${x.palace}`),
    model.bazi ? Object.values(model.bazi).join('') : '',
  ].join('|')
  return hashString(key)
}

/** 检查 AI 返回的 JSON 对象是否可以安全转换为 ChartProfile */
function isValidProfile(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  return (
    typeof r.baziPattern === 'object' &&
    typeof r.ziweiStructure === 'object' &&
    typeof r.integratedArchetype === 'object' &&
    typeof r.sihuaCore === 'object'
  )
}

/** 从 AI 返回的原始文本解析 ChartProfile */
export function parseProfileResponse(raw: string, model: ChartModel): ChartProfile | null {
  try {
    // 去除可能的 markdown 代码块标记
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    if (!isValidProfile(parsed)) return null

    return {
      generatedAt: Date.now(),
      chartModelHash: hashChartModel(model),
      baziPattern: {
        patternName: String((parsed.baziPattern as any).patternName ?? ''),
        dayMasterAssessment: String((parsed.baziPattern as any).dayMasterAssessment ?? ''),
        keyDynamics: Array.isArray((parsed.baziPattern as any).keyDynamics)
          ? (parsed.baziPattern as any).keyDynamics.map(String)
          : [],
        fiveElementComment: String((parsed.baziPattern as any).fiveElementComment ?? ''),
      },
      ziweiStructure: {
        coreStructure: String((parsed.ziweiStructure as any).coreStructure ?? ''),
        lifeBodyAxis: String((parsed.ziweiStructure as any).lifeBodyAxis ?? ''),
        keyPalaces: Array.isArray((parsed.ziweiStructure as any).keyPalaces)
          ? (parsed.ziweiStructure as any).keyPalaces.map((kp: any) => ({
              palace: String(kp.palace ?? ''),
              signal: String(kp.signal ?? ''),
            }))
          : [],
        laiyinTheme: String((parsed.ziweiStructure as any).laiyinTheme ?? ''),
      },
      integratedArchetype: {
        name: String((parsed.integratedArchetype as any).name ?? ''),
        oneLine: String((parsed.integratedArchetype as any).oneLine ?? ''),
        strengthClusters: Array.isArray((parsed.integratedArchetype as any).strengthClusters)
          ? (parsed.integratedArchetype as any).strengthClusters.map(String)
          : [],
        riskClusters: Array.isArray((parsed.integratedArchetype as any).riskClusters)
          ? (parsed.integratedArchetype as any).riskClusters.map(String)
          : [],
      },
      sihuaCore: {
        dynamicSummary: String((parsed.sihuaCore as any).dynamicSummary ?? ''),
        jiImpact: String((parsed.sihuaCore as any).jiImpact ?? ''),
        quanImpact: String((parsed.sihuaCore as any).quanImpact ?? ''),
        keImpact: String((parsed.sihuaCore as any).keImpact ?? ''),
        luImpact: String((parsed.sihuaCore as any).luImpact ?? ''),
      },
      confidence: (['high', 'medium', 'low'] as const).includes((parsed as any).confidence)
        ? (parsed as any).confidence
        : 'medium',
    }
  } catch {
    return null
  }
}
