#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { createRequire } from 'node:module'
import { astro } from 'iztro'

const require = createRequire(import.meta.url)
const { getSoulAndBody, getPalaceNames, getFiveElementsClass } = require('iztro/lib/astro/palace.js')
const { getMajorStar } = require('iztro/lib/star/majorStar.js')
const { getHeavenlyStemAndEarthlyBranchBySolarDate } = require('lunar-lite')
const { getConfig } = require('iztro/lib/astro/astro.js')

const HELP_TEXT = `用法:
  node scripts/reverse-ziwei-chart.mjs --from 1980-01-01 --to 2005-12-31 --gender male --five-elements "土五局" --soul 文曲 --body 天梁 --palace "命宫@酉:天府" --palace "夫妻@未:紫微,破军"
  node scripts/reverse-ziwei-chart.mjs --from 1900-01-01 --to 2100-12-31 --gender 男 --year-stem 壬 --palace "迁移@卯:武曲,七杀" --palace "福德@亥:廉贞,贪狼" --limit 20 --json

说明:
  这个工具适合“只拿到命盘截图，没有出生时间，甚至没有生日”的场景。
  你给出越多可靠的宫位/星曜/中央信息，它就越能把候选日期与时辰收窄。

参数:
  --from             搜索起始日期，格式 YYYY-MM-DD
  --to               搜索结束日期，格式 YYYY-MM-DD
  --gender           male|female|男|女；不传则男女都搜
  --year-stem        生年天干，如 壬
  --five-elements    五行局，如 土五局
  --soul             命主，如 文曲
  --body             身主，如 天梁
  --soul-branch      命宫地支 / 子斗，如 巳
  --body-branch      身宫地支，如 酉
  --palace           宫位约束，格式 "夫妻@未:紫微,破军,红鸾"；地支可省略成 "夫妻:紫微,破军"
  --major-only       只按主星匹配，不参考辅星/杂曜
  --exact-only       只保留所有约束都完整命中的候选
  --limit            输出前 N 个候选，默认 20
  --json             输出结构化 JSON
  --help             显示帮助
`

const CANONICAL_PALACES = [
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
]

const DEFAULT_LIMIT = 20
const YEAR_DIVIDE = getConfig().yearDivide
const HOROSCOPE_DIVIDE = getConfig().horoscopeDivide
const BRANCH_LABELS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const SOUL_BY_BRANCH = {
  子: '贪狼',
  丑: '巨门',
  寅: '禄存',
  卯: '文曲',
  辰: '廉贞',
  巳: '武曲',
  午: '破军',
  未: '武曲',
  申: '廉贞',
  酉: '文曲',
  戌: '禄存',
  亥: '巨门',
}
const BODY_BY_YEAR_BRANCH = {
  子: '火星',
  丑: '天相',
  寅: '天梁',
  卯: '天同',
  辰: '文昌',
  巳: '天机',
  午: '火星',
  未: '天相',
  申: '天梁',
  酉: '天同',
  戌: '文昌',
  亥: '天机',
}
const TIME_LABELS = ['早子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '晚子时']
const TIME_RANGES = ['00:00~01:00', '01:00~03:00', '03:00~05:00', '05:00~07:00', '07:00~09:00', '09:00~11:00', '11:00~13:00', '13:00~15:00', '15:00~17:00', '17:00~19:00', '19:00~21:00', '21:00~23:00', '23:00~00:00']
const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    to: { type: 'string' },
    gender: { type: 'string' },
    'year-stem': { type: 'string' },
    'five-elements': { type: 'string' },
    soul: { type: 'string' },
    body: { type: 'string' },
    'soul-branch': { type: 'string' },
    'body-branch': { type: 'string' },
    palace: { type: 'string', multiple: true },
    'major-only': { type: 'boolean' },
    'exact-only': { type: 'boolean' },
    limit: { type: 'string' },
    json: { type: 'boolean' },
    help: { type: 'boolean' },
  },
})

if (values.help) {
  console.log(HELP_TEXT)
  process.exit(0)
}

try {
  const input = normalizeInput(values)
  const results = []
  const timeHistogram = new Map()
  let scannedDays = 0
  let scannedCandidates = 0
  let coarsePassedCandidates = 0

  for (const date of iterateDates(input.from, input.to)) {
    scannedDays += 1
    for (const gender of input.genders) {
      for (const timeIndex of Array.from({ length: 13 }, (_, index) => index)) {
        scannedCandidates += 1
        const candidate = evaluateCandidate({ ...input, date, gender, timeIndex })
        if (!candidate) {
          continue
        }
        coarsePassedCandidates += 1

        if (input.exactOnly && candidate.summary.fullyMatchedConstraints !== input.constraints.length) {
          continue
        }

        results.push(candidate)
        timeHistogram.set(candidate.time, (timeHistogram.get(candidate.time) ?? 0) + 1)
      }
    }
  }

  results.sort(compareCandidates)
  const topResults = results.slice(0, input.limit)
  const timeRanking = [...timeHistogram.entries()]
    .map(([time, count]) => ({ time, count }))
    .sort((left, right) => right.count - left.count || left.time.localeCompare(right.time, 'zh-CN'))

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          input,
          scannedDays,
          scannedCandidates,
          coarsePassedCandidates,
          totalMatches: results.length,
          timeRanking,
          results: topResults,
        },
        null,
        2,
      ),
    )
    process.exit(0)
  }

  console.log(renderText(input, scannedDays, scannedCandidates, coarsePassedCandidates, results.length, timeRanking, topResults))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function normalizeInput(rawValues) {
  const from = normalizeDate(rawValues.from)
  const to = normalizeDate(rawValues.to)
  if (!from || !to) {
    throw new Error('请同时传 --from 和 --to，格式如 1980-01-01。')
  }
  if (from > to) {
    throw new Error('--from 不能晚于 --to。')
  }

  const genders = rawValues.gender ? [normalizeGender(rawValues.gender)] : ['male', 'female']
  const constraints = parsePalaceConstraints(rawValues.palace)
  if (!constraints.length) {
    throw new Error('至少需要一个 --palace。')
  }

  const limit = rawValues.limit === undefined ? DEFAULT_LIMIT : parsePositiveInt(rawValues.limit, '--limit')

  return {
    from,
    to,
    genders,
    yearStem: rawValues['year-stem']?.trim() || null,
    fiveElementsClass: rawValues['five-elements']?.trim() || null,
    soul: rawValues.soul?.trim() || null,
    body: rawValues.body?.trim() || null,
    soulBranch: rawValues['soul-branch']?.trim() || null,
    bodyBranch: rawValues['body-branch']?.trim() || null,
    constraints,
    majorOnly: Boolean(rawValues['major-only']),
    exactOnly: Boolean(rawValues['exact-only']),
    limit,
  }
}

function normalizeDate(value) {
  if (!value) return null
  const text = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`无法识别日期: ${value}`)
  }
  return text
}

function normalizeGender(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'male' || normalized === '男') return 'male'
  if (normalized === 'female' || normalized === '女') return 'female'
  throw new Error('无法识别性别。请传 male|female|男|女。')
}

function parsePositiveInt(value, optionName) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} 需要是正整数。`)
  }
  return parsed
}

function parsePalaceConstraints(rawConstraints = []) {
  return rawConstraints.map((constraint) => {
    const [rawLeft = '', rawStars = ''] = String(constraint).split(/[:：=]/)
    const [rawPalace = '', rawBranch = ''] = rawLeft.split('@')
    const palace = normalizePalaceName(rawPalace)
    if (!CANONICAL_PALACES.includes(palace)) {
      throw new Error(`无法识别宫位: ${rawPalace}`)
    }

    const stars = rawStars
      .split(/[,\uFF0C、\/+\s]+/)
      .map((star) => star.trim())
      .filter(Boolean)

    if (!stars.length) {
      throw new Error(`宫位约束缺少星曜: ${constraint}`)
    }

    return {
      palace,
      branch: rawBranch.trim() || null,
      stars,
    }
  })
}

function normalizePalaceName(value) {
  const normalized = String(value ?? '').trim().replace(/宫$/, '')
  if (normalized === '命') return '命宫'
  if (normalized === '兄弟') return '兄弟'
  if (normalized === '夫妻') return '夫妻'
  if (normalized === '子女') return '子女'
  if (normalized === '财帛') return '财帛'
  if (normalized === '疾厄') return '疾厄'
  if (normalized === '迁移') return '迁移'
  if (normalized === '交友' || normalized === '仆役') return '交友'
  if (normalized === '官禄' || normalized === '事业') return '官禄'
  if (normalized === '田宅') return '田宅'
  if (normalized === '福德') return '福德'
  if (normalized === '父母') return '父母'
  return `${normalized}宫`
}

function* iterateDates(from, to) {
  const cursor = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (cursor <= end) {
    yield `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    cursor.setDate(cursor.getDate() + 1)
  }
}

function evaluateCandidate(input) {
  const coarse = evaluateCoarseMetadata(input)
  if (!coarse) {
    return null
  }

  const palaceMap = buildPalaceMap(input, coarse)

  const matches = input.constraints.map((constraint) => evaluateConstraint(constraint, palaceMap, input.majorOnly))
  const summary = summarizeMatches(matches)

  return {
    solarDate: input.date,
    gender: input.gender,
    timeIndex: input.timeIndex,
    time: TIME_LABELS[input.timeIndex],
    timeRange: TIME_RANGES[input.timeIndex],
    yearStem: coarse.yearStem,
    fiveElementsClass: coarse.fiveElementsClass,
    soul: coarse.soul,
    body: coarse.body,
    soulBranch: coarse.soulBranch,
    bodyBranch: coarse.bodyBranch,
    matches,
    summary,
  }
}

function evaluateCoarseMetadata(input) {
  let soulAndBody
  let yearly
  try {
    soulAndBody = getSoulAndBody({
      solarDate: input.date,
      timeIndex: input.timeIndex,
      fixLeap: true,
    })
    yearly = getHeavenlyStemAndEarthlyBranchBySolarDate(input.date, input.timeIndex, {
      year: YEAR_DIVIDE,
      month: HOROSCOPE_DIVIDE,
    }).yearly
  } catch {
    return null
  }

  const soulBranch = soulAndBody.earthlyBranchOfSoul
  const soul = SOUL_BY_BRANCH[soulBranch]
  const fiveElementsClass = getFiveElementsClass(soulAndBody.heavenlyStemOfSoul, soulBranch)
  const yearStem = yearly[0]
  const yearBranch = yearly[1]
  const body = BODY_BY_YEAR_BRANCH[yearBranch]
  const bodyBranch = BRANCH_LABELS[(soulAndBody.bodyIndex + 2) % 12]

  if (input.yearStem && yearStem !== input.yearStem) return null
  if (input.soulBranch && soulBranch !== input.soulBranch) return null
  if (input.soul && soul !== input.soul) return null
  if (input.fiveElementsClass && fiveElementsClass !== input.fiveElementsClass) return null
  if (input.body && body !== input.body) return null
  if (input.bodyBranch && bodyBranch !== input.bodyBranch) return null

  return {
    soulIndex: soulAndBody.soulIndex,
    soulBranch,
    bodyBranch,
    yearStem,
    soul,
    body,
    fiveElementsClass,
  }
}

function buildPalaceMap(input, coarse) {
  if (!input.majorOnly) {
    const chart = astro.bySolar(input.date, input.timeIndex, input.gender, true, 'zh-CN')
    return new Map(
      chart.palaces.map((palace) => [
        normalizePalaceName(palace.name),
        {
          name: normalizePalaceName(palace.name),
          earthlyBranch: palace.earthlyBranch,
          majorStars: palace.majorStars.map((star) => star.name),
          minorStars: palace.minorStars.map((star) => star.name),
          adjectiveStars: (palace.adjectiveStars ?? []).map((star) => star.name),
        },
      ]),
    )
  }

  const palaceNames = getPalaceNames(coarse.soulIndex).map(normalizePalaceName)
  const majorStars = getMajorStar({
    solarDate: input.date,
    timeIndex: input.timeIndex,
    fixLeap: true,
  })

  return new Map(
    palaceNames.map((name, index) => [
      name,
      {
        name,
        earthlyBranch: BRANCH_LABELS[(index + 2) % 12],
        majorStars: majorStars[index].map((star) => star.name),
        minorStars: [],
        adjectiveStars: [],
      },
    ]),
  )
}

function evaluateConstraint(constraint, palaceMap, majorOnly) {
  const palace = palaceMap.get(constraint.palace)
  if (!palace) {
    return {
      palace: constraint.palace,
      expectedBranch: constraint.branch,
      actualBranch: null,
      expectedStars: constraint.stars,
      matchedStars: [],
      missingStars: constraint.stars,
      branchMatched: false,
      matched: false,
      fullMatch: false,
      score: 0,
    }
  }

  const matchedStars = []
  const missingStars = []
  let score = 0

  const branchMatched = constraint.branch ? palace.earthlyBranch === constraint.branch : true
  if (constraint.branch) {
    score += branchMatched ? 5 : -6
  }

  for (const star of constraint.stars) {
    if (palace.majorStars.includes(star)) {
      matchedStars.push({ name: star, source: 'major' })
      score += 6
      continue
    }
    if (!majorOnly && palace.minorStars.includes(star)) {
      matchedStars.push({ name: star, source: 'minor' })
      score += 3
      continue
    }
    if (!majorOnly && palace.adjectiveStars.includes(star)) {
      matchedStars.push({ name: star, source: 'adjective' })
      score += 2
      continue
    }
    missingStars.push(star)
    score -= 4
  }

  if (matchedStars.length > 0) {
    score += 2
  }

  const fullMatch = branchMatched && missingStars.length === 0
  if (fullMatch) {
    score += 4
  }

  return {
    palace: constraint.palace,
    expectedBranch: constraint.branch,
    actualBranch: palace.earthlyBranch,
    expectedStars: constraint.stars,
    matchedStars,
    missingStars,
    branchMatched,
    matched: matchedStars.length > 0,
    fullMatch,
    score,
  }
}

function summarizeMatches(matches) {
  return matches.reduce(
    (summary, match) => {
      summary.score += match.score
      summary.expectedStars += match.expectedStars.length
      summary.matchedStars += match.matchedStars.length
      if (match.branchMatched) summary.branchMatched += 1
      if (match.matched) summary.matchedConstraints += 1
      if (match.fullMatch) summary.fullyMatchedConstraints += 1
      return summary
    },
    {
      score: 0,
      branchMatched: 0,
      matchedConstraints: 0,
      fullyMatchedConstraints: 0,
      expectedStars: 0,
      matchedStars: 0,
    },
  )
}

function compareCandidates(left, right) {
  if (right.summary.fullyMatchedConstraints !== left.summary.fullyMatchedConstraints) {
    return right.summary.fullyMatchedConstraints - left.summary.fullyMatchedConstraints
  }
  if (right.summary.branchMatched !== left.summary.branchMatched) {
    return right.summary.branchMatched - left.summary.branchMatched
  }
  if (right.summary.matchedConstraints !== left.summary.matchedConstraints) {
    return right.summary.matchedConstraints - left.summary.matchedConstraints
  }
  if (right.summary.matchedStars !== left.summary.matchedStars) {
    return right.summary.matchedStars - left.summary.matchedStars
  }
  if (right.summary.score !== left.summary.score) {
    return right.summary.score - left.summary.score
  }
  if (left.solarDate !== right.solarDate) {
    return left.solarDate.localeCompare(right.solarDate, 'zh-CN')
  }
  return left.timeIndex - right.timeIndex
}

function renderText(input, scannedDays, scannedCandidates, coarsePassedCandidates, totalMatches, timeRanking, results) {
  const lines = []
  lines.push('输入')
  lines.push(`  搜索区间: ${input.from} -> ${input.to}`)
  lines.push(`  性别: ${input.genders.join(' / ')}`)
  if (input.yearStem) lines.push(`  生年天干: ${input.yearStem}`)
  if (input.fiveElementsClass) lines.push(`  五行局: ${input.fiveElementsClass}`)
  if (input.soul) lines.push(`  命主: ${input.soul}`)
  if (input.body) lines.push(`  身主: ${input.body}`)
  if (input.soulBranch) lines.push(`  子斗/命宫地支: ${input.soulBranch}`)
  if (input.bodyBranch) lines.push(`  身宫地支: ${input.bodyBranch}`)
  lines.push(`  匹配模式: ${input.majorOnly ? '仅主星' : '主星 + 辅星/杂曜'}`)
  lines.push(`  宫位约束: ${input.constraints.map(formatConstraint).join('；')}`)
  lines.push('')
  lines.push('搜索摘要')
  lines.push(`  扫描天数: ${scannedDays}`)
  lines.push(`  扫描候选: ${scannedCandidates}`)
  lines.push(`  通过粗筛: ${coarsePassedCandidates}`)
  lines.push(`  候选总数: ${totalMatches}`)
  lines.push(`  输出上限: ${input.limit}`)
  if (timeRanking.length) {
    lines.push(`  时辰热度: ${timeRanking.slice(0, 8).map((item) => `${item.time} x ${item.count}`).join('；')}`)
  }

  lines.push('')
  lines.push('最像的候选')
  for (const candidate of results) {
    lines.push(
      `  ${candidate.solarDate} ${candidate.time} (${candidate.timeRange}, ${candidate.gender === 'male' ? '男' : '女'})：完整命中 ${candidate.summary.fullyMatchedConstraints}/${input.constraints.length}，星曜命中 ${candidate.summary.matchedStars}/${candidate.summary.expectedStars}，总分 ${candidate.summary.score}`,
    )
    lines.push(
      `    ${candidate.yearStem}年 / ${candidate.fiveElementsClass} / 命主${candidate.soul} / 身主${candidate.body} / 命宫地支${candidate.soulBranch} / 身宫地支${candidate.bodyBranch}`,
    )
  }

  return lines.join('\n')
}

function formatConstraint(constraint) {
  const branch = constraint.branch ? `@${constraint.branch}` : ''
  return `${constraint.palace}${branch}[${constraint.stars.join('、')}]`
}
