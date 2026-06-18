import { buildMingpanMarkdown } from './mingpanMarkdown'
import type { ChartModel, OverallResult } from './types'
import { hashChartModel } from './patternAnalysis'

export type DestinyProfile = {
  generatedAt: number
  chartModelHash: string
  profileVersion: 'destiny-profile-v1'
  coreIdentity: {
    title: string
    oneLine: string
    primaryDrive: string
    behaviorStyle: string
    decisionStyle: string
    stressPattern: string
  }
  strengthMap: Array<{
    name: string
    description: string
    evidence: string[]
    bestScenarios: string[]
  }>
  riskMap: Array<{
    name: string
    description: string
    evidence: string[]
    mitigation: string
  }>
  lifeTheme: {
    mainThread: string
    innerOuterDirection: string
    recurringLesson: string
  }
  careerAndAbility: {
    suitableModes: string[]
    unsuitableModes: string[]
    abilitiesToBuild: string[]
    broadDirections: string[]
  }
  relationshipStyle: {
    collaborationRole: string
    relationshipRisks: string[]
    advice: string[]
  }
  actionPrinciples: string[]
  evidenceIndex: string[]
  confidence: 'high' | 'medium' | 'low'
}

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function pickEvidence(overall: OverallResult) {
  return {
    格局检测: overall.patterns.map((item) => ({
      名称: item.name,
      类型: item.category,
      断语: item.judgment,
      相关宫位: item.palaces,
    })),
    生年四化: {
      来因宫: overall.laiyinGong,
      来因解释: overall.laiyinInterpretation,
      四化: overall.natalSiHua.items.map((item) => ({
        星曜: item.star,
        四化: item.type,
        落宫: item.palace,
        含义: item.meaning,
        对宫关系: item.duiGongRelation,
      })),
      真假禄: overall.natalSiHua.zhenJiaLu
        ? {
            等级: overall.natalSiHua.zhenJiaLu.grade,
            说明: overall.natalSiHua.zhenJiaLu.narrative,
          }
        : null,
      忌深挖: overall.natalSiHua.jiDeepDive,
    },
    命宫主轴: overall.mingQianAxis,
    河图检测: overall.alerts
      .filter((item) => item.category.startsWith('河图破'))
      .map((item) => ({
        类别: item.category,
        说明: item.description,
        相关宫位: item.relatedPalaces,
      })),
  }
}

export function buildDestinyProfilePrompt(model: ChartModel, overall: OverallResult, caseName: string) {
  const computedEvidence = pickEvidence(overall)
  const mingpanMarkdown = buildMingpanMarkdown(model, caseName)

  return `你是一个命理档案生成引擎。你的任务不是重新排盘，而是读取“命盘事实 + 计算层结果”，生成一份长期可复用的用户命理档案。

## 总原则
1. 计算层已经给出格局、四化、命迁轴和河图检测，你只能基于这些事实做解释、归纳、排序和建议。
2. 不要使用“注定、必然、一定会”等绝对化表达。
3. 每个优势和风险都必须写 evidence，引用输入里的具体事实，例如“天机化权落迁移”“命宫主星 xx”“格局命中 xx”“河图检测 xx”。
4. 这份档案是长期画像，不要写成流年运势，也不要给具体年份预测。
5. 输出必须是严格 JSON，不要 Markdown，不要额外解释。

## 命盘事实底稿
${mingpanMarkdown}

## 计算层结果
${compactJson(computedEvidence)}

## 输出 JSON Schema
{
  "coreIdentity": {
    "title": "8字以内的人格原型名",
    "oneLine": "一句话概括这个人的长期画像",
    "primaryDrive": "核心驱动力",
    "behaviorStyle": "行为风格",
    "decisionStyle": "决策方式",
    "stressPattern": "压力反应"
  },
  "strengthMap": [
    {
      "name": "优势名称",
      "description": "优势说明",
      "evidence": ["命理事实1", "命理事实2"],
      "bestScenarios": ["适合发挥的场景1", "适合发挥的场景2"]
    }
  ],
  "riskMap": [
    {
      "name": "弱点/风险名称",
      "description": "风险说明",
      "evidence": ["命理事实1", "命理事实2"],
      "mitigation": "规避或修正建议"
    }
  ],
  "lifeTheme": {
    "mainThread": "人生主线",
    "innerOuterDirection": "更适合向内稳定还是向外打开，以及原因",
    "recurringLesson": "反复需要学习的课题"
  },
  "careerAndAbility": {
    "suitableModes": ["适合的工作/发展模式"],
    "unsuitableModes": ["不适合的环境"],
    "abilitiesToBuild": ["值得长期建设的能力"],
    "broadDirections": ["宽泛职业/行业方向，不要过窄"]
  },
  "relationshipStyle": {
    "collaborationRole": "团队/协作中的适合角色",
    "relationshipRisks": ["关系风险"],
    "advice": ["协作建议"]
  },
  "actionPrinciples": ["可长期复用的行动原则，3-5条"],
  "evidenceIndex": ["最核心的证据索引，5-8条"],
  "confidence": "high | medium | low"
}

## 数量要求
- strengthMap 输出 3-5 条。
- riskMap 输出 3-5 条。
- actionPrinciples 输出 3-5 条。
- evidenceIndex 输出 5-8 条。`
}

function cleanJson(raw: string) {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function objectArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Record<string, unknown>[] : []
}

export function parseDestinyProfileResponse(raw: string, model: ChartModel): DestinyProfile | null {
  try {
    const parsed = JSON.parse(cleanJson(raw)) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null

    const core = (parsed.coreIdentity ?? {}) as Record<string, unknown>
    const lifeTheme = (parsed.lifeTheme ?? {}) as Record<string, unknown>
    const career = (parsed.careerAndAbility ?? {}) as Record<string, unknown>
    const relationship = (parsed.relationshipStyle ?? {}) as Record<string, unknown>

    return {
      generatedAt: Date.now(),
      chartModelHash: hashChartModel(model),
      profileVersion: 'destiny-profile-v1',
      coreIdentity: {
        title: String(core.title ?? ''),
        oneLine: String(core.oneLine ?? ''),
        primaryDrive: String(core.primaryDrive ?? ''),
        behaviorStyle: String(core.behaviorStyle ?? ''),
        decisionStyle: String(core.decisionStyle ?? ''),
        stressPattern: String(core.stressPattern ?? ''),
      },
      strengthMap: objectArray(parsed.strengthMap).map((item) => ({
        name: String(item.name ?? ''),
        description: String(item.description ?? ''),
        evidence: stringArray(item.evidence),
        bestScenarios: stringArray(item.bestScenarios),
      })),
      riskMap: objectArray(parsed.riskMap).map((item) => ({
        name: String(item.name ?? ''),
        description: String(item.description ?? ''),
        evidence: stringArray(item.evidence),
        mitigation: String(item.mitigation ?? ''),
      })),
      lifeTheme: {
        mainThread: String(lifeTheme.mainThread ?? ''),
        innerOuterDirection: String(lifeTheme.innerOuterDirection ?? ''),
        recurringLesson: String(lifeTheme.recurringLesson ?? ''),
      },
      careerAndAbility: {
        suitableModes: stringArray(career.suitableModes),
        unsuitableModes: stringArray(career.unsuitableModes),
        abilitiesToBuild: stringArray(career.abilitiesToBuild),
        broadDirections: stringArray(career.broadDirections),
      },
      relationshipStyle: {
        collaborationRole: String(relationship.collaborationRole ?? ''),
        relationshipRisks: stringArray(relationship.relationshipRisks),
        advice: stringArray(relationship.advice),
      },
      actionPrinciples: stringArray(parsed.actionPrinciples),
      evidenceIndex: stringArray(parsed.evidenceIndex),
      confidence: (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high' | 'medium' | 'low')
        ? parsed.confidence as 'high' | 'medium' | 'low'
        : 'medium',
    }
  } catch {
    return null
  }
}
