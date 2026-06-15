import { buildChartModel } from '../src/analysis/chartModel.ts'
import { buildCombinedPrompt, buildZiweiOnlyPrompt, buildBaziOnlyPrompt, buildMergePrompt } from '../src/agent/topicPrompts.ts'

const ZHAO = {
  id: 'test-zhao',
  name: '赵',
  birthday: '1996-03-19',
  birthTimeText: '01:30',
  birthTime: 1,
  birthdayType: 'solar',
  gender: 'male',
  bazi: {
    yearPillar: '丙子',
    monthPillar: '辛卯',
    dayPillar: '乙卯',
    hourPillar: '丁丑',
  },
}

const API_URL = process.env.VITE_AGENT_API_URL || 'https://api.deepseek.com/chat/completions'
const API_KEY = process.env.VITE_AGENT_API_KEY || ''
const MODEL = process.env.VITE_AGENT_MODEL || 'deepseek-v4-pro'

if (!API_KEY) {
  console.error('Missing VITE_AGENT_API_KEY')
  process.exit(1)
}

async function callAI(systemPrompt, userMsg = '请分析。') {
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
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data.choices?.[0]?.message?.content || ''
}

async function main() {
  console.log('Building chart model...')
  const model = buildChartModel(ZHAO)
  if (!model) { console.error('Chart model build failed'); process.exit(1) }

  const topics = ['个性', '事业', '财富', '婚姻', '健康']

  // ─── Approach A: Combined ───
  console.log('\n=== APPROACH A: Combined (5 requests) ===')
  const combinedResults = {}
  for (const topic of topics) {
    const prompt = buildCombinedPrompt(model, topic)
    console.log(`\n--- ${topic} prompt length: ${prompt.length} chars ---`)
    try {
      const reply = await callAI(prompt, '请分析。')
      combinedResults[topic] = reply
      console.log(`[${topic}] ${reply.slice(0, 120)}...`)
    } catch (e) {
      console.error(`[${topic}] ERROR:`, e.message)
      combinedResults[topic] = `ERROR: ${e.message}`
    }
  }

  // ─── Approach B: Two-pass ───
  console.log('\n=== APPROACH B: Two-pass (3 requests) ===')

  // Step 1: Ziwei bulk
  const ziwiPrompt = buildZiweiOnlyPrompt(model)
  console.log(`\n--- Ziwei bulk prompt: ${ziwiPrompt.length} chars ---`)
  let ziwiRaw = ''
  try {
    ziwiRaw = await callAI(ziwiPrompt, '请分析五个专题。')
    console.log(`Ziwei output: ${ziwiRaw.slice(0, 150)}...`)
  } catch (e) {
    console.error('Ziwei ERROR:', e.message)
  }

  // Step 2: Bazi bulk
  const baziPrompt = buildBaziOnlyPrompt(model)
  console.log(`\n--- Bazi bulk prompt: ${baziPrompt.length} chars ---`)
  let baziRaw = ''
  if (baziPrompt) {
    try {
      baziRaw = await callAI(baziPrompt, '请分析五个专题。')
      console.log(`Bazi output: ${baziRaw.slice(0, 150)}...`)
    } catch (e) {
      console.error('Bazi ERROR:', e.message)
    }
  }

  // Step 3: Merge
  const mergePrompt = buildMergePrompt(ziwiRaw, baziRaw)
  console.log(`\n--- Merge prompt: ${mergePrompt.length} chars ---`)
  let mergedRaw = ''
  try {
    mergedRaw = await callAI(mergePrompt, '请整合。')
    console.log(`Merged output: ${mergedRaw.slice(0, 150)}...`)
  } catch (e) {
    console.error('Merge ERROR:', e.message)
  }

  // ─── Save results ───
  const fs = await import('fs')
  fs.writeFileSync('/tmp/approach-a-combined.json', JSON.stringify(combinedResults, null, 2))
  fs.writeFileSync('/tmp/approach-b-ziwei.txt', ziwiRaw)
  fs.writeFileSync('/tmp/approach-b-bazi.txt', baziRaw)
  fs.writeFileSync('/tmp/approach-b-merged.txt', mergedRaw)

  console.log('\n=== DONE ===')
  console.log('A (combined): /tmp/approach-a-combined.json')
  console.log('B (ziwei):    /tmp/approach-b-ziwei.txt')
  console.log('B (bazi):     /tmp/approach-b-bazi.txt')
  console.log('B (merged):   /tmp/approach-b-merged.txt')

  // Print comparison summary
  console.log('\n=== COMPARISON ===')
  console.log(`Approach A: ${Object.values(combinedResults).join('').length} total chars`)
  console.log(`Approach B: ${(ziwiRaw + baziRaw + mergedRaw).length} total chars`)
}

main().catch(console.error)
