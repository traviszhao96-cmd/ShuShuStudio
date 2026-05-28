# Analysis Output Spec

## Goal

The analysis surface should turn the local Zi Wei method into a navigable product flow, not a long static essay.

The primary reading flow is:

1. Overall structure first.
2. Palace detail second.
3. Timeline and validation after the original chart is clear.

This matches the local `ziwei-toolkit` method:

`定盘 -> 命格主轴 -> 六亲 -> 体用落地 -> 核心宫位与触发点 -> 大限总论`

## Frontend Information Architecture

### Level 1: Overall Pattern View

This is the default right-side analysis view. It should answer "what is this chart mainly about?" before the user clicks into any palace.

Recommended sections:

1. `定盘状态`
   - calendar, gender, birth time source
   - whether this is the current working chart
   - missing validation notes, if any

2. `核心四化`
   - 来因宫
   - 生年禄权科忌落点
   - one-line meaning of each mutagen in this chart
   - true/false usefulness should not be judged from 禄 alone; 忌落点 must be shown nearby

3. `格局主轴`
   - 命宫主星 and 命迁轴
   - main advantage
   - main pressure
   - one-sentence chart thesis

4. `体用结构`
   - 体: 生年四化
   - 用: 自化 and 飞宫
   - first priority chain: 忌转忌
   - second priority chains: 禄随忌走, 科随权走

5. `核心宫位与触发点`
   - high-risk or high-focus palaces
   - reasons grouped by palace
   - whether the palace is a people palace or object/topic palace

6. `大限总览`
   - current decade
   - decade hitting 来因宫 / 生年忌宫 / 平方宫 / topic palace
   - only summarize here; detailed timing belongs in timeline detail

### Level 2: Palace Detail View

Clicking a palace on the chart should replace the right-side overall pattern view with a palace detail view.

The detail view should have a clear back button:

`← 返回格局总览`

Palace detail should not repeat the full chart. It should answer "why does this palace matter, and how is it activated?"

Recommended sections:

1. `宫位身份`
   - palace name, stem/branch
   - opposite palace
   - six-line pair, for example 命迁线 / 夫官线 / 财福线
   - people palace or object/topic palace

2. `星曜底色`
   - major stars
   - visible four-mutagen stars
   - brief topic meaning for this palace

3. `生年四化`
   - whether natal 禄/权/科/忌 lands here
   - what this palace receives from the original chart

4. `自化与飞化`
   - outward self-mutagen on stars in this palace
   - inward self-mutagen vectors entering this palace
   - flying mutagens from this palace to other palaces
   - especially 忌转忌 and its opposite-palace impact

5. `对宫联动`
   - why the opposite palace must be read together
   - whether the issue is self-side, other-side, or axis tension

6. `现实问题翻译`
   - likely topic: family, relationship, money, career, body, external movement, mental pressure
   - concrete language, not abstract rule names only

7. `验证点`
   - what real-life facts can confirm or reject this reading
   - keep separate from confident conclusions

## Component Mapping

### Current State

- `ChartStage` owns the main stage mode: `三合 / 四化 / 八字`.
- `SihuaAstrolabe` renders the dedicated four-mutagen board and already knows hovered palace state internally.
- `InsightSidebar` currently shows:
  - high-risk palaces in `四化` mode
  - generated rule output from `buildZiweiDoushuInsights`
- `ReportPanel` is still mostly template placeholders.
- `utils.ts` already contains first-pass analysis builders:
  - `buildSihuaRiskSummary`
  - `buildZiweiDoushuInsights`

### Proposed State

Move palace selection up to `App`:

- `selectedPalaceIndex: number | null`
- `selectedPalaceName: string | null`
- `analysisView: 'overview' | 'palace'`

Then pass callbacks down:

- `ChartStage`
  - receives `selectedPalaceIndex`
  - receives `onSelectPalace`
  - passes both into `SihuaAstrolabe`

- `SihuaAstrolabe`
  - keeps hover for temporary visual highlighting
  - adds click selection for persistent analysis
  - selected palace should remain visibly active after click

- `InsightSidebar`
  - if no selected palace: show Overall Pattern View
  - if selected palace: show Palace Detail View with back button

`ReportPanel` should become a secondary, fuller reading surface. It should not compete with the right sidebar.

## Data Shape

The current `ZiweiInsightPayload` is too essay-like for drill-down. Add a structured analysis model.

Suggested types:

```ts
type AnalysisViewMode = 'overview' | 'palace'

type AnalysisPoint = {
  label: string
  body: string
  weight?: 'primary' | 'secondary' | 'validation'
}

type OverallAnalysis = {
  chartStatus: AnalysisPoint[]
  coreMutagens: AnalysisPoint[]
  patternAxis: AnalysisPoint[]
  bodyUseChains: AnalysisPoint[]
  focusPalaces: Array<{
    palace: string
    palaceIndex: number
    reasons: string[]
  }>
  decadeSummary: AnalysisPoint[]
}

type PalaceAnalysis = {
  palaceIndex: number
  palace: string
  opposite: string
  line: string
  palaceType: '人宫' | '物宫'
  stars: string[]
  natalMutagens: AnalysisPoint[]
  selfMutagens: AnalysisPoint[]
  flyingMutagens: AnalysisPoint[]
  oppositeAxis: AnalysisPoint[]
  realWorldTranslation: AnalysisPoint[]
  validation: AnalysisPoint[]
}
```

## Rule-to-UI Mapping

| Method rule | UI location |
| --- | --- |
| 先定盘，后论命 | Overall view, first block |
| 先看体，后看用 | Overall view: `核心四化` before `体用结构` |
| 来因宫 + 生年四化定主轴 | Overall view: top-level thesis |
| 六条本对线 | Palace detail: `宫位身份` and `对宫联动` |
| 自化不能脱体空讲 | Palace detail: show self-mutagen only with natal source context |
| 忌转忌优先 | Overall focus palaces and palace detail activation |
| 平方 is high priority | Overall focus palaces; mark as primary trigger |
| 原盘先于时间引动 | Timeline controls stay secondary to overview/detail |
| 应期看大限流年叠宫 | Timeline detail, not default sidebar prose |

## Interaction Rules

1. Hover is for visual exploration only.
2. Click is for analysis navigation.
3. Right sidebar default is overall pattern analysis.
4. Clicking a palace switches sidebar into palace detail.
5. Back returns to overall pattern analysis.
6. Mode switch resets selected palace unless a future design says otherwise.
7. Timeline selection should update analysis context but should not erase the selected palace.

## First Implementation Slice

1. Add `selectedPalaceIndex` state in `App`.
2. Add `onSelectPalace` prop to `ChartStage` and `SihuaAstrolabe`.
3. Add click handling to each `.sihua-palace`.
4. Add a selected palace visual state.
5. Split `InsightSidebar` into two render branches:
   - `OverallPatternPanel`
   - `PalaceDetailPanel`
6. Add `buildPalaceAnalysis(config, palaceIndex)` in `utils.ts`.
7. Keep `ReportPanel` unchanged until the sidebar interaction feels right.

## Product Principle

The chart should carry structure visually; the sidebar should explain the selected layer.

Do not put the full method text on screen. The UI should reveal it progressively:

- overview for the chart thesis
- palace click for local causes and effects
- timeline for when it becomes active
- full report only after the user wants a longer read
