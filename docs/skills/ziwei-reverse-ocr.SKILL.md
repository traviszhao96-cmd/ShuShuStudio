---
name: ziwei-reverse-ocr
description: Use when the user wants 紫微命盘截图 OCR 识别、逆向排盘、共盘筛查、先人工确认再反推出生日期或时辰, or wants a workflow that reads a chart image, outputs a confirmation draft, and only then runs reverse chart search.
---

# Ziwei Reverse OCR

Use this skill when the user gives a 紫微斗数截图 and wants reverse chart search instead of normal排盘.

## Workflow

1. Inspect the image directly and transcribe only high-confidence fields first:
   - gender
   - year stem if confirmed from 四化
   - five-elements class
   - palace branches when clearly visible
   - major stars
   - a few high-confidence minor stars or 四化落宫
2. Do not search immediately. First produce a structured confirmation draft for the user.
3. Create the draft with one of these paths:
   - `node /Users/travis.zhao/SSMaster/scripts/reverse-ziwei-session.mjs init --output <path>`
   - or if OCR / manual transcript text already exists:
   - `node /Users/travis.zhao/SSMaster/scripts/reverse-ziwei-session.mjs ingest --input <ocr.txt> --output <path>`
4. If `init` was used, fill the JSON manually with the transcribed fields.
5. Show the confirmation summary with:
   - `node /Users/travis.zhao/SSMaster/scripts/reverse-ziwei-session.mjs confirm --input <path>`
6. Only after the user confirms, run:
   - `node /Users/travis.zhao/SSMaster/scripts/reverse-ziwei-session.mjs search --input <path>`
7. If many candidates still tie, ask only for the smallest next discriminator:
   - 四化落宫
   - 左辅 / 右弼 / 文昌 / 文曲 / 禄存
   - 身宫位置
   - 空劫火铃

## OCR Rules

- Treat model vision as OCR assistance, not ground truth.
- Mark uncertain fields in `notes.ocrWarnings`.
- Prefer leaving a field blank over guessing.
- For reverse search, prioritize:
  - `yearStem`
  - `fiveElementsClass`
  - palace major stars
  - then minor stars / 四化落宫
- Do not use `命主` / `身主` as hard filters unless the user explicitly confirms them.

## Draft Shape

The JSON draft should contain:

- `search`
  - `from`, `to`, `gender`
  - optional `yearStem`, `fiveElementsClass`, `soul`, `body`, `soulBranch`, `bodyBranch`
  - `majorOnly`, `exactOnly`, `limit`
- `constraints`
  - items like `{ "palace": "夫妻", "branch": "未", "stars": ["紫微", "破军"] }`
- `notes.sihua`
  - `lu`, `quan`, `ke`, `ji`
- `notes.ocrWarnings`

The plain-text ingest format can be loose. It supports lines like:

```text
阳男
壬年
土五局
命宫@酉: 天府
夫妻@未: 紫微,破军
化权: 紫微在夫妻宫
```

## Output Discipline

- Always present one manual confirmation round before search unless the user explicitly waives it.
- Separate:
  - `OCR 草稿`
  - `用户确认版`
  - `逆向排盘结果`
- If the result is 共盘, say that clearly and list the tied dates/times.
