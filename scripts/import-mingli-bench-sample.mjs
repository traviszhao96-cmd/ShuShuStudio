#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('/Users/travis.zhao/SSMaster')
const dbPath = resolve(root, 'db/cases.sqlite')
const benchPath = resolve('/Users/travis.zhao/MingLi-Bench/data/data.json')

export const BENCH_IMPORT = 'mingli-bench-sample-10'

function pad(value) {
  return String(value).padStart(2, '0')
}

function toTimeIndex(value) {
  const [rawHour = '0'] = value.split(':')
  const hour = Number(rawHour)

  if (Number.isNaN(hour) || hour < 0 || hour > 23) return 0
  if (hour === 0) return 0
  if (hour === 23) return 12
  return Math.floor((hour + 1) / 2)
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''")
}

function buildName(question, index) {
  const cleaned = question.replace(/\s+/g, '').replace(/[？?。！!]/g, '')
  return `题${pad(index + 1)}·${cleaned.slice(0, 10)}`
}

const raw = JSON.parse(readFileSync(benchPath, 'utf8'))
const questions = (raw.questions ?? []).slice(0, 10)

const statements = ['BEGIN TRANSACTION;']

questions.forEach((item, index) => {
  const birth = item.birth_info ?? {}
  const solarDate = `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`
  const birthTimeText = `${pad(birth.hour ?? 12)}:${pad(birth.minute ?? 0)}`
  const birthTimeIndex = toTimeIndex(birthTimeText)
  const gender = birth.gender === '男' ? '男' : birth.gender === '女' ? '女' : '未知'
  const options = (item.options ?? [])
    .map((option) => `${option.letter}. ${option.text}`)
    .join(' / ')
  const note = `【${item.category}】${item.question} 选项：${options} 正确答案：${item.answer}`
  const name = buildName(item.question, index)
  const sourceOrder = 1000 + index + 1

  statements.push(`
    INSERT INTO cases (
      name,
      gender,
      solar_date,
      birth_time_text,
      birth_time_index,
      birth_time_source,
      manual_group,
      source_section,
      source_order,
      imported_from,
      note
    ) VALUES (
      '${escapeSql(name)}',
      '${gender}',
      '${solarDate}',
      '${birthTimeText}',
      ${birthTimeIndex},
      'manual',
      NULL,
      '评测',
      ${sourceOrder},
      '${BENCH_IMPORT}',
      '${escapeSql(note)}'
    )
    ON CONFLICT(imported_from, source_order) DO UPDATE SET
      name = excluded.name,
      gender = excluded.gender,
      solar_date = excluded.solar_date,
      birth_time_text = excluded.birth_time_text,
      birth_time_index = excluded.birth_time_index,
      birth_time_source = excluded.birth_time_source,
      source_section = excluded.source_section,
      note = excluded.note;
  `)
})

statements.push('COMMIT;')

execFileSync('sqlite3', [dbPath, statements.join('\n')], {
  cwd: root,
  encoding: 'utf8',
})

console.log(`Imported ${questions.length} MingLi-Bench questions into cases database`)
