#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { astro } from 'iztro'

const HELP_TEXT = `用法:
  node scripts/reverse-ziwei-time.mjs --date 1996-03-19 --gender male --calendar solar --palace "命宫:贪狼" --palace "父母:天机,巨门"
  node scripts/reverse-ziwei-time.mjs --date 1996-03-19 --gender 男 --calendar 公历 --palace "夫妻=紫微,破军,红鸾" --json

说明:
  这个工具适合“生日已知、时辰未知”的场景。
  你给出若干宫位里出现的星曜，它会遍历 13 个时辰档，输出最匹配的候选时辰排名。

参数:
  --date            出生日期，格式 YYYY-MM-DD
  --datetime        出生日期时间；若同时传了具体时间，会忽略时分，只使用日期部分
  --gender          male|female|男|女
  --calendar        solar|lunar|阳历|公历|农历|阴历
  --palace          宫位约束，格式 "命宫:贪狼,文昌"；可重复传入
  --time-indexes    只比较指定时辰，格式如 0,1,2,12；默认比较全部 0..12
  --major-only      只按主星匹配，不参考辅星/杂曜
  --json            输出结构化 JSON
  --help            显示帮助
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

const { values } = parseArgs({
  options: {
    date: { type: 'string' },
    datetime: { type: 'string' },
    gender: { type: 'string' },
    calendar: { type: 'string' },
    palace: { type: 'string', multiple: true },
    'time-indexes': { type: 'string' },
    'major-only': { type: 'boolean' },
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
  const candidates = input.timeIndexes.map((timeIndex) => evaluateCandidate(input, timeIndex))
  const ranking = [...candidates]
    .sort(compareCandidates)
    .map((candidate, index) => ({
      rank: index + 1,
      timeIndex: candidate.timeIndex,
      time: candidate.time,
      timeRange: candidate.timeRange,
      score: candidate.summary.score,
      matchedConstraints: candidate.summary.matchedConstraints,
      fullyMatchedConstraints: candidate.summary.fullyMatchedConstraints,
      expectedStars: candidate.summary.expectedStars,
      matchedStars: candidate.summary.matchedStars,
    }))

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          input: {
            date: input.date,
            gender: input.gender,
            calendar: input.calendar,
            majorOnly: input.majorOnly,
            constraints: input.constraints,
            timeIndexes: input.timeIndexes,
          },
          candidates,
          ranking,
        },
        null,
        2,
      ),
    )
    process.exit(0)
  }

  console.log(renderText(input, ranking, candidates))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function normalizeInput(rawValues) {
  const date = extractDate(rawValues.date ?? rawValues.datetime)
  if (!date) {
    throw new Error('缺少出生日期。请传 --date 1996-03-19，或传 --datetime "1996-03-19 01:40"。')
  }

  const gender = normalizeGender(rawValues.gender)
  const calendar = normalizeCalendar(rawValues.calendar)
  const constraints = parsePalaceConstraints(rawValues.palace)
  const majorOnly = Boolean(rawValues['major-only'])
  const timeIndexes =
    rawValues['time-indexes'] !== undefined
      ? parseTimeIndexes(rawValues['time-indexes'])
      : Array.from({ length: 13 }, (_, index) => index)

  return {
    date,
    gender,
    calendar,
    constraints,
    majorOnly,
    timeIndexes,
  }
}

function extractDate(value) {
  if (!value) return null
  const text = String(value).trim()
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

function normalizeGender(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'male' || normalized === '男') return 'male'
  if (normalized === 'female' || normalized === '女') return 'female'
  throw new Error('无法识别性别。请传 male|female|男|女。')
}

function normalizeCalendar(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'solar' || normalized === '阳历' || normalized === '公历') return 'solar'
  if (normalized === 'lunar' || normalized === '阴历' || normalized === '农历') return 'lunar'
  throw new Error('无法识别历法。请传 solar|lunar|阳历|公历|农历|阴历。')
}

function parsePalaceConstraints(rawConstraints = []) {
  if (!rawConstraints.length) {
    throw new Error('至少需要一个 --palace，格式如 "命宫:贪狼,文昌"。')
  }

  return rawConstraints.map((constraint) => {
    const [rawPalace = '', rawStars = ''] = String(constraint).split(/[:：=]/)
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

    return { palace, stars }
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

function parseTimeIndexes(value) {
  const parsed = String(value)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item))

  const unique = [...new Set(parsed)].filter((item) => item >= 0 && item <= 12).sort((a, b) => a - b)
  if (!unique.length) {
    throw new Error('无法识别 --time-indexes，请传 0 到 12 之间的整数列表。')
  }
  return unique
}

function evaluateCandidate(input, timeIndex) {
  const chart =
    input.calendar === 'solar'
      ? astro.bySolar(input.date, timeIndex, input.gender, true, 'zh-CN')
      : astro.byLunar(input.date, timeIndex, input.gender, false, true, 'zh-CN')

  const palaceMap = new Map(
    chart.palaces.map((palace) => [
      normalizePalaceName(palace.name),
      {
        name: normalizePalaceName(palace.name),
        earthlyBranch: palace.earthlyBranch,
        heavenlyStem: palace.heavenlyStem,
        majorStars: palace.majorStars.map((star) => star.name),
        minorStars: palace.minorStars.map((star) => star.name),
        adjectiveStars: (palace.adjectiveStars ?? []).map((star) => star.name),
      },
    ]),
  )

  const matches = input.constraints.map((constraint) => evaluateConstraint(constraint, palaceMap, input.majorOnly))
  const summary = summarizeMatches(matches)

  return {
    timeIndex,
    time: chart.time,
    timeRange: chart.timeRange,
    matches,
    summary,
  }
}

function evaluateConstraint(constraint, palaceMap, majorOnly) {
  const palace = palaceMap.get(constraint.palace)
  if (!palace) {
    return {
      palace: constraint.palace,
      expectedStars: constraint.stars,
      matchedStars: [],
      missingStars: constraint.stars,
      matched: false,
      fullMatch: false,
      score: 0,
      earthlyBranch: '',
    }
  }

  const matchedStars = []
  const missingStars = []
  let score = 0

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

  const fullMatch = missingStars.length === 0
  if (fullMatch) {
    score += 4
  }

  return {
    palace: constraint.palace,
    earthlyBranch: palace.earthlyBranch,
    expectedStars: constraint.stars,
    matchedStars,
    missingStars,
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
      if (match.matched) summary.matchedConstraints += 1
      if (match.fullMatch) summary.fullyMatchedConstraints += 1
      return summary
    },
    {
      score: 0,
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
  if (right.summary.matchedConstraints !== left.summary.matchedConstraints) {
    return right.summary.matchedConstraints - left.summary.matchedConstraints
  }
  if (right.summary.matchedStars !== left.summary.matchedStars) {
    return right.summary.matchedStars - left.summary.matchedStars
  }
  if (right.summary.score !== left.summary.score) {
    return right.summary.score - left.summary.score
  }
  return left.timeIndex - right.timeIndex
}

function renderText(input, ranking, candidates) {
  const lines = []
  lines.push('输入')
  lines.push(`  出生日期: ${input.date}`)
  lines.push(`  性别: ${input.gender === 'male' ? '男' : '女'}`)
  lines.push(`  历法: ${input.calendar === 'solar' ? '阳历' : '农历'}`)
  lines.push(`  匹配模式: ${input.majorOnly ? '仅主星' : '主星 + 辅星/杂曜'}`)
  lines.push(`  宫位约束: ${input.constraints.map((item) => `${item.palace}[${item.stars.join('、')}]`).join('；')}`)
  lines.push('')
  lines.push('候选时辰排名')

  for (const item of ranking) {
    lines.push(
      `  ${item.rank}. ${item.time} (${item.timeRange}, index ${item.timeIndex})：完整命中 ${item.fullyMatchedConstraints}/${input.constraints.length}，部分命中 ${item.matchedConstraints}/${input.constraints.length}，星曜命中 ${item.matchedStars}/${item.expectedStars}，总分 ${item.score}`,
    )
  }

  for (const candidate of candidates) {
    lines.push('')
    lines.push(`${candidate.time} (${candidate.timeRange}, index ${candidate.timeIndex})`)
    for (const match of candidate.matches) {
      const hits = match.matchedStars.map((star) => `${star.name}(${formatSource(star.source)})`).join('、') || '无'
      const misses = match.missingStars.join('、') || '无'
      lines.push(
        `  ${match.palace} [${match.earthlyBranch}]：命中 ${hits}；缺失 ${misses}；${match.fullMatch ? '完整命中' : match.matched ? '部分命中' : '未命中'}`,
      )
    }
  }

  return lines.join('\n')
}

function formatSource(source) {
  if (source === 'major') return '主星'
  if (source === 'minor') return '辅星'
  return '杂曜'
}
