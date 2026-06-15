import 'dotenv/config'
import { buildChartModel } from '../src/analysis/chartModel'
import {
  buildCombinedPrompt,
  buildZiweiOnlyPrompt,
  buildBaziOnlyPrompt,
  buildMergePrompt,
} from '../src/agent/topicPrompts'
import * as fs from 'fs'

const ZHAO = {
  id: 'test-zhao',
  name: '赵',
  birthday: '1996-03-19',
  birthTimeText: '01:30',
  birthTime: 1,
  birthdayType: 'solar' as const,
  gender: 'male' as const,
  bazi: {
    yearPillar: '丙子',
    monthPillar: '辛卯',
    dayPillar: '乙卯',
    hourPillar: '丁丑',
  },
}

const API_URL = 'https://api.deepseek.com/chat/completions'
const API_KEY = process.env.VITE_AGENT_API_KEY || ''
const MODEL = 'deepseek-v4-pro'

type ApiResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

if (!API_KEY) {
  console.error('Missing VITE_AGENT_API_KEY in .env')
  process.exit(1)
}

async function callAI(systemPrompt: string, userMsg = '请分析。') {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    }),
  })
  const data = await res.json() as ApiResponse
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data.choices?.[0]?.message?.content || ''
}

async function main() {
  console.log('Building chart model for 赵...')
  const model = buildChartModel(ZHAO)
  if (!model) { console.error('Chart model build failed'); process.exit(1) }
  console.log(`Model built: ${model.palaces.length} palaces, laiyin=${model.laiyinGong}`)
  if (model.bazi) console.log(`Bazi: ${model.bazi.year} ${model.bazi.month} ${model.bazi.day} ${model.bazi.hour}`)

  const topics = ['个性', '事业', '财富', '婚姻', '健康'] as const

  // ─── Approach A: Combined (5 requests) ───
  console.log('\n========== APPROACH A: Combined ==========')
  const combined: Record<string, string> = {}
  for (const topic of topics) {
    const prompt = buildCombinedPrompt(model, topic)
    console.log(`\n--- [${topic}] prompt: ${prompt.length} chars ---`)
    try {
      const reply = await callAI(prompt)
      combined[topic] = reply
      console.log(reply.slice(0, 200))
      console.log('...')
    } catch (e: unknown) {
      console.error(`ERROR: ${errorMessage(e)}`)
      combined[topic] = `ERROR: ${errorMessage(e)}`
    }
  }
  fs.writeFileSync('/tmp/approach-a.json', JSON.stringify(combined, null, 2))

  // ─── Approach B: Two-pass (3 requests) ───
  console.log('\n========== APPROACH B: Two-pass ==========')

  console.log('\n--- Step 1/3: Ziwei bulk ---')
  const ziwiPrompt = buildZiweiOnlyPrompt(model)
  console.log(`Prompt: ${ziwiPrompt.length} chars`)
  let ziwiRaw = ''
  try {
    ziwiRaw = await callAI(ziwiPrompt, '请分析五个专题。')
    console.log(ziwiRaw.slice(0, 300))
    console.log(`... (${ziwiRaw.length} chars)`)
  } catch (e: unknown) {
    console.error(`ERROR: ${errorMessage(e)}`)
  }
  fs.writeFileSync('/tmp/approach-b-ziwei.txt', ziwiRaw)

  console.log('\n--- Step 2/3: Bazi bulk ---')
  const baziPrompt = buildBaziOnlyPrompt(model)
  console.log(`Prompt: ${baziPrompt.length} chars`)
  let baziRaw = ''
  if (baziPrompt) {
    try {
      baziRaw = await callAI(baziPrompt, '请分析五个专题。')
      console.log(baziRaw.slice(0, 300))
      console.log(`... (${baziRaw.length} chars)`)
    } catch (e: unknown) {
      console.error(`ERROR: ${errorMessage(e)}`)
    }
  }
  fs.writeFileSync('/tmp/approach-b-bazi.txt', baziRaw)

  console.log('\n--- Step 3/3: Merge ---')
  const mergePrompt = buildMergePrompt(ziwiRaw, baziRaw)
  console.log(`Prompt: ${mergePrompt.length} chars`)
  let mergedRaw = ''
  try {
    mergedRaw = await callAI(mergePrompt, '请整合。')
    console.log(mergedRaw.slice(0, 300))
    console.log(`... (${mergedRaw.length} chars)`)
  } catch (e: unknown) {
    console.error(`ERROR: ${errorMessage(e)}`)
  }
  fs.writeFileSync('/tmp/approach-b-merged.txt', mergedRaw)

  console.log('\n========== DONE ==========')
  console.log(`A (combined): ${Object.values(combined).join('').length} total chars → /tmp/approach-a.json`)
  console.log(`B (3-step): ${(ziwiRaw + baziRaw + mergedRaw).length} total chars → /tmp/approach-b-*.txt`)
}

main().catch(console.error)
