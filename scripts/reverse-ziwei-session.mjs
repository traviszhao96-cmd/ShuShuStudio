#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'

const HELP_TEXT = `用法:
  node scripts/reverse-ziwei-session.mjs init --output ./tmp/ziwei-draft.json
  node scripts/reverse-ziwei-session.mjs ingest --input ./tmp/ocr.txt --output ./tmp/ziwei-draft.json
  node scripts/reverse-ziwei-session.mjs confirm --input ./tmp/ziwei-draft.json
  node scripts/reverse-ziwei-session.mjs search --input ./tmp/ziwei-draft.json

说明:
  这个脚本服务于“截图 OCR -> 用户确认 -> 逆向排盘”的流程。
  1. init    生成可编辑的 JSON 草稿
  2. ingest  把 OCR 文本或人工转录文本解析成 JSON 草稿
  3. confirm 读取 JSON，打印给用户确认的结构化摘要
  4. search  将确认后的 JSON 转成 reverse-ziwei-chart 的命令并执行
`

const TEMPLATE = {
  meta: {
    source: 'ziwei-screenshot',
    status: 'draft',
    note: '先由模型从截图转录，再由用户手动确认一轮。',
    ocrEngine: '',
  },
  search: {
    from: '1990-01-01',
    to: '2005-12-31',
    gender: 'male',
    yearStem: '',
    fiveElementsClass: '',
    soul: '',
    body: '',
    soulBranch: '',
    bodyBranch: '',
    majorOnly: false,
    exactOnly: false,
    limit: 20,
  },
  constraints: [
    { palace: '命宫', branch: '', stars: [''] },
  ],
  notes: {
    sihua: {
      lu: '',
      quan: '',
      ke: '',
      ji: '',
    },
    ocrWarnings: [
      '把不确定的字段留空，不要硬猜。',
    ],
  },
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    input: { type: 'string' },
    output: { type: 'string' },
    overwrite: { type: 'boolean' },
    json: { type: 'boolean' },
    help: { type: 'boolean' },
  },
})

if (values.help || positionals.length === 0) {
  console.log(HELP_TEXT)
  process.exit(0)
}

const command = positionals[0]

try {
  if (command === 'init') {
    runInit(values)
  } else if (command === 'ingest') {
    runIngest(values)
  } else if (command === 'confirm') {
    runConfirm(values)
  } else if (command === 'search') {
    runSearch(values)
  } else {
    throw new Error(`未知命令: ${command}`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

function runInit(rawValues) {
  const output = requirePath(rawValues.output, '--output')
  if (fs.existsSync(output) && !rawValues.overwrite) {
    throw new Error(`文件已存在: ${output}；如需覆盖请加 --overwrite`)
  }
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(TEMPLATE, null, 2)}\n`)
  console.log(`已写入草稿模板: ${output}`)
}

function runIngest(rawValues) {
  const input = requirePath(rawValues.input, '--input')
  const output = requirePath(rawValues.output, '--output')
  const sourceText = fs.readFileSync(input, 'utf8')
  const draft = JSON.parse(JSON.stringify(TEMPLATE))
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  draft.meta.source = 'ziwei-ocr-text'
  draft.meta.ocrEngine = 'manual-or-external'
  draft.meta.status = 'draft'
  draft.meta.note = `由 OCR/转录文本导入: ${path.basename(input)}`

  for (const line of lines) {
    parseLineIntoDraft(line, draft)
  }

  draft.constraints = dedupeConstraints(draft.constraints)
  draft.notes.ocrWarnings = draft.notes.ocrWarnings.filter(Boolean)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(draft, null, 2)}\n`)
  console.log(`已从 OCR 文本生成草稿: ${output}`)
}

function runConfirm(rawValues) {
  const data = readDraft(rawValues.input)
  const lines = []
  const search = data.search ?? {}
  const constraints = normalizeConstraints(data.constraints ?? [])

  lines.push('请用户确认以下转录结果')
  lines.push(`  搜索区间: ${search.from || '(未填)'} -> ${search.to || '(未填)'}`)
  lines.push(`  性别: ${search.gender || '(未填)'}`)
  if (search.yearStem) lines.push(`  生年天干: ${search.yearStem}`)
  if (search.fiveElementsClass) lines.push(`  五行局: ${search.fiveElementsClass}`)
  if (search.soul) lines.push(`  命主: ${search.soul}`)
  if (search.body) lines.push(`  身主: ${search.body}`)
  if (search.soulBranch) lines.push(`  子斗/命宫地支: ${search.soulBranch}`)
  if (search.bodyBranch) lines.push(`  身宫地支: ${search.bodyBranch}`)
  lines.push(`  匹配模式: ${search.majorOnly ? '仅主星' : '主星 + 可加辅星/杂曜'}`)
  lines.push('')
  lines.push('宫位约束')
  for (const item of constraints) {
    const branch = item.branch ? `@${item.branch}` : ''
    lines.push(`  ${item.palace}${branch}: ${item.stars.join('、')}`)
  }

  const sihua = data.notes?.sihua ?? {}
  if (sihua.lu || sihua.quan || sihua.ke || sihua.ji) {
    lines.push('')
    lines.push('四化备注')
    if (sihua.lu) lines.push(`  化禄: ${sihua.lu}`)
    if (sihua.quan) lines.push(`  化权: ${sihua.quan}`)
    if (sihua.ke) lines.push(`  化科: ${sihua.ke}`)
    if (sihua.ji) lines.push(`  化忌: ${sihua.ji}`)
  }

  const warnings = (data.notes?.ocrWarnings ?? []).filter(Boolean)
  if (warnings.length) {
    lines.push('')
    lines.push('OCR 风险提示')
    for (const warning of warnings) {
      lines.push(`  - ${warning}`)
    }
  }

  lines.push('')
  lines.push('确认后可运行')
  lines.push(`  node scripts/reverse-ziwei-session.mjs search --input ${rawValues.input}`)
  console.log(lines.join('\n'))
}

function runSearch(rawValues) {
  const inputPath = requirePath(rawValues.input, '--input')
  const data = readDraft(inputPath)
  const search = data.search ?? {}
  const constraints = normalizeConstraints(data.constraints ?? [])
  if (!constraints.length) {
    throw new Error('缺少 constraints，至少需要一个宫位约束。')
  }

  const args = ['scripts/reverse-ziwei-chart.mjs']
  pushOption(args, '--from', search.from)
  pushOption(args, '--to', search.to)
  pushOption(args, '--gender', search.gender)
  pushOption(args, '--year-stem', search.yearStem)
  pushOption(args, '--five-elements', search.fiveElementsClass)
  pushOption(args, '--soul', search.soul)
  pushOption(args, '--body', search.body)
  pushOption(args, '--soul-branch', search.soulBranch)
  pushOption(args, '--body-branch', search.bodyBranch)
  pushOption(args, '--limit', String(search.limit ?? 20))
  if (search.majorOnly) args.push('--major-only')
  if (search.exactOnly) args.push('--exact-only')
  if (rawValues.json) args.push('--json')

  for (const item of constraints) {
    const branch = item.branch ? `@${item.branch}` : ''
    args.push('--palace', `${item.palace}${branch}:${item.stars.join(',')}`)
  }

  const result = spawnSync('node', args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  })

  process.exit(result.status ?? 0)
}

function readDraft(inputPath) {
  const resolved = requirePath(inputPath, '--input')
  return JSON.parse(fs.readFileSync(resolved, 'utf8'))
}

function requirePath(value, optionName) {
  if (!value) {
    throw new Error(`缺少 ${optionName}`)
  }
  return path.resolve(String(value))
}

function normalizeConstraints(rawConstraints) {
  return rawConstraints
    .map((item) => ({
      palace: String(item?.palace ?? '').trim(),
      branch: String(item?.branch ?? '').trim(),
      stars: Array.isArray(item?.stars)
        ? item.stars.map((star) => String(star).trim()).filter(Boolean)
        : [],
    }))
    .filter((item) => item.palace && item.stars.length)
}

function pushOption(args, flag, value) {
  if (value === undefined || value === null || value === '') return
  args.push(flag, String(value))
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

function parseLineIntoDraft(line, draft) {
  const normalized = line.replace(/[：]/g, ':').replace(/\s+/g, ' ').trim()

  if (normalized.includes('阳男')) {
    draft.search.gender = 'male'
  } else if (normalized.includes('阴男')) {
    draft.search.gender = 'male'
    draft.notes.ocrWarnings.push('检测到“阴男”，脚本当前只记录性别，不单独记录阴阳。')
  } else if (normalized.includes('阳女') || normalized.includes('阴女')) {
    draft.search.gender = 'female'
  }

  const yearStemMatch = normalized.match(/([甲乙丙丁戊己庚辛壬癸])年/)
  if (yearStemMatch) {
    draft.search.yearStem = yearStemMatch[1]
  }

  const fiveElementsMatch = normalized.match(/([木金水火土][三四二六五]局)/)
  if (fiveElementsMatch) {
    draft.search.fiveElementsClass = fiveElementsMatch[1]
  }

  const soulMatch = normalized.match(/命主[: ]*([^\s]+)/)
  if (soulMatch) {
    draft.search.soul = soulMatch[1]
  }

  const bodyMatch = normalized.match(/身主[: ]*([^\s]+)/)
  if (bodyMatch) {
    draft.search.body = bodyMatch[1]
  }

  const soulBranchMatch = normalized.match(/(?:子斗|命宫地支|命宫)[: ]*([子丑寅卯辰巳午未申酉戌亥])/)
  if (soulBranchMatch && /子斗|命宫地支/.test(normalized)) {
    draft.search.soulBranch = soulBranchMatch[1]
  }

  const bodyBranchMatch = normalized.match(/身宫(?:地支)?[: ]*([子丑寅卯辰巳午未申酉戌亥])/)
  if (bodyBranchMatch) {
    draft.search.bodyBranch = bodyBranchMatch[1]
  }

  const sihuaMappings = [
    ['化禄', 'lu'],
    ['化权', 'quan'],
    ['化科', 'ke'],
    ['化忌', 'ji'],
  ]
  for (const [label, key] of sihuaMappings) {
    const match = normalized.match(new RegExp(`${label}[: ]*(.+)$`))
    if (match) {
      draft.notes.sihua[key] = match[1].trim()
    }
  }

  const palaceMatch = normalized.match(/^([命兄弟夫妻子女财帛疾厄迁移交友仆役官禄田宅福德父母]{1,3}宫?|事业|仆役)(?:@([子丑寅卯辰巳午未申酉戌亥]))?[: ]+(.+)$/)
  if (!palaceMatch) {
    return
  }

  const palace = normalizePalaceName(palaceMatch[1])
  const branch = palaceMatch[2] ?? ''
  const stars = palaceMatch[3]
    .split(/[,\uFF0C、\/+\s]+/)
    .map((star) => star.trim())
    .filter(Boolean)

  if (!palace || !stars.length) {
    return
  }

  draft.constraints.push({ palace, branch, stars })
}

function dedupeConstraints(rawConstraints) {
  const map = new Map()
  for (const item of rawConstraints) {
    if (!item?.palace) continue
    const palace = String(item.palace).trim()
    const branch = String(item.branch ?? '').trim()
    const stars = Array.isArray(item.stars) ? item.stars.map((star) => String(star).trim()).filter(Boolean) : []
    if (!stars.length) continue
    const key = `${palace}@${branch}`
    const current = map.get(key) ?? new Set()
    for (const star of stars) current.add(star)
    map.set(key, current)
  }

  return [...map.entries()].map(([key, set]) => {
    const [palace, branch = ''] = key.split('@')
    return { palace, branch, stars: [...set] }
  })
}
