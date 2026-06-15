import { parseReport } from '../src/agent/topicPrompts'
import type { TopicReport } from '../src/agent/reportStore'
import fs from 'fs'

const ziweiRaw = fs.readFileSync('/tmp/approach-b-ziwei.txt', 'utf-8')
const baziRaw = fs.readFileSync('/tmp/approach-b-bazi.txt', 'utf-8')
const mergedRaw = fs.readFileSync('/tmp/approach-b-merged.txt', 'utf-8')

function extractTopics(raw: string) {
  const blocks = raw.split(/(?=^## )/m)
  const result: Record<string, string> = {}
  for (const block of blocks) {
    const m = block.match(/^##\s*(\S+)/m)
    if (m) {
      const topics = ['个性', '事业', '财富', '婚姻', '健康']
      const key = topics.find((t) => m[1].includes(t)) ?? m[1]
      result[key] = block.replace(/^##\s*\S+.*\n?/m, '').trim()
    }
  }
  return result
}

const mergedTopics = extractTopics(mergedRaw)
const ziweiTopics = extractTopics(ziweiRaw)
const baziTopics = extractTopics(baziRaw)

const report = {
  id: 'rpt-zhao-import',
  caseId: 'db-case-41',
  generatedAt: Date.now(),
  version: 'v3-two-pass',
  topics: {} as Record<string, TopicReport>,
  sources: {
    ziwei: ziweiTopics,
    bazi: baziTopics,
    merged: {} as Record<string, TopicReport>,
  },
}

for (const [topic, content] of Object.entries(mergedTopics)) {
  const parsed = parseReport(content)
  report.topics[topic] = {
    headline: parsed.headline,
    content,
    parsed: { headline: parsed.headline, sections: parsed.sections },
  }
  report.sources.merged[topic] = report.topics[topic]
}

const json = JSON.stringify([report], null, 2)
const outPath = '/Users/travis.zhao/SSMaster/docs/ssmaster-report-zhao.json'
fs.writeFileSync(outPath, json)
console.log(`Report saved: ${outPath}`)
console.log(`Size: ${json.length} chars, Topics: ${Object.keys(report.topics).join(', ')}`)
