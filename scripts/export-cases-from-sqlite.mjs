#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve('/Users/travis.zhao/SSMaster')
const dbPath = resolve(root, 'db/cases.sqlite')
const outPath = resolve(root, 'src/data/cases.generated.ts')

const sql = `
  SELECT
    id,
    name,
    gender,
    solar_date,
    birth_time_text,
    birth_time_index,
    birth_time_source,
    manual_group,
    bazi_year_pillar,
    bazi_month_pillar,
    bazi_day_pillar,
    bazi_hour_pillar,
    source_section,
    source_order,
    imported_from,
    note
  FROM cases
  ORDER BY source_order ASC;
`

const raw = execFileSync('sqlite3', ['-json', dbPath, sql], {
  cwd: root,
  encoding: 'utf8',
})

const rows = JSON.parse(raw)

const famousNames = new Set(['黄仁勋', '乔布斯', '戚继光', '苏轼'])
const explicitGroupOverrides = new Map([
  ['阿汤 男朋友', '朋友'],
  ['zoey老公', '朋友'],
])
const familyKeywords = [
  '爸',
  '妈',
  '姥',
  '爷',
  '奶',
  '叔',
  '姨',
  '舅',
  '哥',
  '姐',
  '弟',
  '妹',
  '老公',
  '老婆',
  '男朋友',
  '女朋友',
  '丈夫',
  '妻子',
  '儿',
  '女儿',
  '儿子',
  '外婆',
  '外公',
]

function inferGroup(name) {
  const overriddenGroup = explicitGroupOverrides.get(name)
  if (overriddenGroup) return overriddenGroup
  if (famousNames.has(name)) return '名人'
  if (familyKeywords.some((keyword) => name.includes(keyword))) return '家人'
  return '朋友'
}

function inferGender(gender) {
  if (gender === '男') return 'male'
  if (gender === '女') return 'female'
  return 'female'
}

function toCaseRecord(row) {
  const hasBazi =
    row.bazi_year_pillar &&
    row.bazi_month_pillar &&
    row.bazi_day_pillar

  const birthTimeText = row.birth_time_text ?? '12:00'
  const birthTimeIndex = Number.isInteger(row.birth_time_index) ? row.birth_time_index : 6
  const timeNote =
    row.birth_time_source === 'bazi_match'
      ? '截图导入，时间按八字四柱精确匹配。'
      : row.birth_time_source === 'bazi_branch'
        ? '截图导入，时间按八字时柱折算到对应时辰。'
        : '截图导入，八字时柱缺失；时辰暂以午时占位。'

  return {
    id: `db-case-${row.id}`,
    name: row.name,
    group: row.manual_group ?? inferGroup(row.name),
    note: row.note ?? timeNote,
    birthday: row.solar_date,
    birthTimeText,
    birthTime: birthTimeIndex,
    birthdayType: 'solar',
    gender: inferGender(row.gender),
    birthTimeSource: row.birth_time_source ?? 'placeholder',
    bazi: hasBazi
      ? {
          yearPillar: row.bazi_year_pillar,
          monthPillar: row.bazi_month_pillar,
          dayPillar: row.bazi_day_pillar,
          hourPillar: row.bazi_hour_pillar ?? null,
        }
      : null,
  }
}

const generated = `import type { CaseRecord } from '../types'

export const caseRecords: CaseRecord[] = ${JSON.stringify(rows.map(toCaseRecord), null, 2)} as CaseRecord[]

export const defaultCase = caseRecords[0]
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, generated, 'utf8')

console.log(`Exported ${rows.length} cases to ${outPath}`)
