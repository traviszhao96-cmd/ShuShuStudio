#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { SCREENSHOT_IMPORT, screenshotBaziRows } from './screenshot-bazi-data.mjs'

const root = resolve('/Users/travis.zhao/SSMaster')
const dbPath = resolve(root, 'db/cases.sqlite')
const paipanScript = '/Users/travis.zhao/.codex/skills/bazi-chart/scripts/paipan.py'

if (!existsSync(dbPath)) {
  console.log(`Skipped DB migration: missing ${dbPath}`)
  process.exit(0)
}

const columnsToAdd = [
  ['birth_time_text', 'TEXT'],
  ['birth_time_index', 'INTEGER CHECK (birth_time_index BETWEEN 0 AND 12)'],
  ['birth_time_source', "TEXT CHECK (birth_time_source IN ('manual', 'bazi_match', 'bazi_branch', 'placeholder'))"],
  ['manual_group', "TEXT CHECK (manual_group IN ('家人', '同学', '同事', '名人', '朋友'))"],
  ['bazi_year_pillar', 'TEXT'],
  ['bazi_month_pillar', 'TEXT'],
  ['bazi_day_pillar', 'TEXT'],
  ['bazi_hour_pillar', 'TEXT'],
]

const tableInfo = JSON.parse(
  execFileSync('sqlite3', ['-json', dbPath, 'PRAGMA table_info(cases);'], {
    cwd: root,
    encoding: 'utf8',
  }),
)

const existingColumns = new Set(tableInfo.map((row) => row.name))

for (const [name, definition] of columnsToAdd) {
  if (!existingColumns.has(name)) {
    execFileSync('sqlite3', [dbPath, `ALTER TABLE cases ADD COLUMN ${name} ${definition};`], {
      cwd: root,
      encoding: 'utf8',
    })
  }
}

const candidateTimes = [
  { text: '00:30', index: 0 },
  { text: '01:30', index: 1 },
  { text: '03:30', index: 2 },
  { text: '05:30', index: 3 },
  { text: '07:30', index: 4 },
  { text: '09:30', index: 5 },
  { text: '11:30', index: 6 },
  { text: '13:30', index: 7 },
  { text: '15:30', index: 8 },
  { text: '17:30', index: 9 },
  { text: '19:30', index: 10 },
  { text: '21:30', index: 11 },
  { text: '23:30', index: 12 },
]

const hourBranchFallback = {
  子: { text: '23:30', index: 12 },
  丑: { text: '01:30', index: 1 },
  寅: { text: '03:30', index: 2 },
  卯: { text: '05:30', index: 3 },
  辰: { text: '07:30', index: 4 },
  巳: { text: '09:30', index: 5 },
  午: { text: '11:30', index: 6 },
  未: { text: '13:30', index: 7 },
  申: { text: '15:30', index: 8 },
  酉: { text: '17:30', index: 9 },
  戌: { text: '19:30', index: 10 },
  亥: { text: '21:30', index: 11 },
}

function parsePillars(output) {
  const match = output.match(/年柱\s+(\S{2})\s+月柱\s+(\S{2})\s+日柱\s+(\S{2})\s+时柱\s+(\S{2})/)
  if (!match) return null
  return {
    yearPillar: match[1],
    monthPillar: match[2],
    dayPillar: match[3],
    hourPillar: match[4],
  }
}

function findBirthTimeByBazi(solarDate, pillars) {
  if (!pillars.hourPillar) return null

  for (const candidate of candidateTimes) {
    const output = execFileSync('python3', [paipanScript, `${solarDate} ${candidate.text}`], {
      cwd: root,
      encoding: 'utf8',
    })
    const parsed = parsePillars(output)

    if (
      parsed &&
      parsed.yearPillar === pillars.yearPillar &&
      parsed.monthPillar === pillars.monthPillar &&
      parsed.dayPillar === pillars.dayPillar &&
      parsed.hourPillar === pillars.hourPillar
    ) {
      return { ...candidate, source: 'bazi_match' }
    }
  }

  const branch = pillars.hourPillar.slice(1)
  if (branch in hourBranchFallback) {
    return { ...hourBranchFallback[branch], source: 'bazi_branch' }
  }

  return null
}

const solarDateSql = `
  SELECT name, solar_date
  FROM cases
  WHERE imported_from = '${SCREENSHOT_IMPORT.replaceAll("'", "''")}';
`

const importedRows = JSON.parse(
  execFileSync('sqlite3', ['-json', dbPath, solarDateSql], {
    cwd: root,
    encoding: 'utf8',
  }),
)

const solarDateByName = new Map(importedRows.map((row) => [row.name, row.solar_date]))

const statements = ['BEGIN TRANSACTION;']

for (const row of screenshotBaziRows) {
  const solarDate = solarDateByName.get(row.name)
  if (!solarDate) continue

  const derivedTime = findBirthTimeByBazi(solarDate, row)
  const birthTimeText = derivedTime?.text ?? '12:00'
  const birthTimeIndex = derivedTime?.index ?? 6
  const birthTimeSource = derivedTime?.source ?? 'placeholder'

  statements.push(`
    UPDATE cases
    SET
      bazi_year_pillar = '${row.yearPillar}',
      bazi_month_pillar = '${row.monthPillar}',
      bazi_day_pillar = '${row.dayPillar}',
      bazi_hour_pillar = ${row.hourPillar ? `'${row.hourPillar}'` : 'NULL'},
      birth_time_text = '${birthTimeText}',
      birth_time_index = ${birthTimeIndex},
      birth_time_source = '${birthTimeSource}'
    WHERE imported_from = '${row.importedFrom}'
      AND name = '${row.name.replaceAll("'", "''")}';
  `)
}

statements.push('COMMIT;')

execFileSync('sqlite3', [dbPath, statements.join('\n')], {
  cwd: root,
  encoding: 'utf8',
})

console.log(`Migrated ${screenshotBaziRows.length} screenshot cases with bazi metadata`)
