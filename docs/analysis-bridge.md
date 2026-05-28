# ANALYSIS_BRIDGE.md — 分析引擎 ↔ 前端展示 桥接规格

> **用途**：AI Agent（知识库管理）与 CodeX（前端开发）之间的共享契约。
> 本文档定义分析输出的数据模型、两级展示结构、规则模块映射。
> **任何一方修改分析逻辑时，必须同步更新此文件。**

---

## 1. 统一数据模型（chartModel.ts 输出）

```typescript
// ===== 基础类型 =====

interface ChartModel {
  basicInfo: BasicInfo;
  palaces: Palace[];          // 12 宫
  stars: Star[];              // 所有星曜
  shengNianSiHua: SiHua[];    // 生年四化 (4 条)
  ziHua: ZiHua[];             // 自化 (离心力/向心力)
  daXian: DaXian[];           // 大限
  laiyinGong: GongName;       // 来因宫
}

interface BasicInfo {
  gender: "male" | "female";
  lunarBirth: string;         // 农历生日
  shengxiao: string;          // 生肖
  tianGan: string;            // 生年天干
  shenGong: GongName;         // 身宫
  wuXingJu: string;           // 五行局
}

interface Palace {
  name: GongName;
  diZhi: string;              // 地支 (寅卯辰...)
  daXianRange?: string;       // 大限年龄范围 (叠大限后)
  liuNianDiZhi?: string;      // 流年地支 (叠流年后)
  mainStar: string[];         // 主星列表
  minorStar: string[];        // 辅星列表
  shengNianSiHua?: { star: string; hua: "禄"|"权"|"科"|"忌" };
  ziHua?: { star: string; hua: "禄"|"权"|"科"|"忌"; direction: "离心"|"向心" };
}

type GongName = "命宫"|"兄弟"|"夫妻"|"子女"|"财帛"|"疾厄"|"迁移"|"交友"|"官禄"|"田宅"|"福德"|"父母";
```

---

## 2. 两级分析结构

### 2.1 「一级」总览 → overallAnalysis.ts

盘打开后第一时间展示的全局格局。一行一结论。

```typescript
interface OverallResult {
  // --- 来因宫 ---
  laiyinGong: GongName;
  laiyinInterpretation: string;    // e.g. "来因宫在命宫：命运由自己决定，白手起家"

  // --- 四化人格 ---
  personalityType: string;         // "禄-权-科-忌" 组合
  personalityTags: string[];       // ["随和大方", "追求成就", "有计划性", "执念深"]

  // --- 格局评分 ---
  patternScore: number;            // 0-100
  patternLabel: string;            // "上格" | "中上" | "中格" | "中下"

  // --- 能量浓度 ---
  energyScore: number;             // 0-100
  energyQuadrant: string;          // "福报型"|"病灶型"|"隐藏型"|"空白型"

  // --- 关键警示 ---
  alerts: AlertItem[];

  // --- 全局特征 ---
  highlights: string[];            // 3-5 条一句话结论
}

interface AlertItem {
  severity: "high" | "medium" | "low";
  category: string;                // "忌冲"|"过犹不及"|"身宫风险"|"婚姻不正位"
  description: string;
  relatedPalaces: GongName[];
}
```

#### overallAnalysis 调用的规则模块

| 规则 | 来源文件 | 状态 |
|:--|:--|:--|
| 来因宫定位+含义 | methodology.ts → `laiyinGongRule` | ✅ 已入库 |
| 四化人格特质（科权禄忌型） | `ziwei-knowledge/rules/01-四化人格特质.md` | ✅ 已入库 |
| 过犹不及皆是病 | `ziwei-knowledge/daily-rules-progress.md` #1 | ✅ 已入库 |
| 格局评分（双维度） | `2026-05-28_2023_two-dimension-scoring.md` | ✅ 已入库 |
| 命签纸田（意外三宫） | 待补 #2 | ❌ |
| 六组阴阳宫二分 | 待补 #3 | ❌ |
| 身宫深度判断 | methodology.ts → `shenGongRule` | 🔧 部分覆盖 |

---

### 2.2 「二级」宫位详情 → palaceAnalysis.ts

点击某个宫位后展开的详细信息。

```typescript
interface PalaceResult {
  palace: GongName;
  basics: PalaceBasic;             // 本义 + 多层解读
  zhuanGong: ZhuanGongItem[];      // 转宫视角
  siHuaHere: SiHuaEffect[];        // 此宫四化效应
  duiGongRelation: string;         // 对宫关系
  sanFangSiZheng: SanFangInfo;     // 三方四正
  flowAnalysis?: FlowAnalysis;     // 能量流向 (如已排大限/流年)
  alerts: AlertItem[];             // 此宫相关警示
}

interface PalaceBasic {
  number: number;                  // 1-12
  primary: string;                 // 本义
  layers: { label: string; meaning: string }[];  // 多层解读
  liuNeiWai: "六内" | "六外";
  heTuGroup: string;               // 河图分组名称
}

interface ZhuanGongItem {
  as: GongName;                    // 以什么宫为太极
  meaning: string;                 // e.g. "兄弟宫 = 父母宫的夫妻宫"
  implication: string;             // 实际论命含义
}

interface SiHuaEffect {
  type: "禄"|"权"|"科"|"忌";
  star: string;
  meaning: string;
  severity?: "neutral"|"caution"|"warning";
}

interface SanFangInfo {
  main: GongName;                  // 本宫
  duiGong: GongName;               // 对宫
  left: GongName;                  // 三方左
  right: GongName;                 // 三方右
}
```

---

## 3. 宫位知识映射表（palaceAnalysis 调用）

每个宫位的「本义 + 多层解读」从知识库中提取。

```
宫位编号 → 宫位名称 → 知识点文件（knowledge base 中的位置）
```

| # | 宫位 | 知识来源 | 提取状态 |
|:--|:--|:--|:--|
| 1 | 命宫 | `ziwei_knowledge_full.md` + `陈小飞初阶_第七课` | ✅ |
| 2 | 兄弟宫 | `ziwei_knowledge_full.md` L47-73 + L783, L813 | ✅ (今晚) |
| 3 | 夫妻宫 | 待提取 | ❌ |
| 4 | 子女宫 | 部分提取 | 🔧 |
| 5 | 财帛宫 | 部分提取 | 🔧 |
| 6 | 疾厄宫 | 部分提取 | 🔧 |
| 7 | 迁移宫 | 待提取 | ❌ |
| 8 | 交友宫 | `ziwei_knowledge_full.md` L47-73 + L695 + L813 | ✅ (今晚) |
| 9 | 官禄宫 | 待提取 | ❌ |
| 10 | 田宅宫 | 部分提取 | 🔧 |
| 11 | 福德宫 | 待提取 | ❌ |
| 12 | 父母宫 | 待提取 | ❌ |

---

## 4. 专项方法论模块（methodology.ts + mutagenChains.ts）

```typescript
// ===== methodology.ts =====

interface MethodologyResult {
  // 来因宫
  laiyinGong: GongName;
  laiyinChain: SiHuaFlow[];       // 来因宫 → 生年四化各落点

  // 体用
  tiYong: {
    ti: GongName[];               // 体（静态格局）
    yong: GongName[];             // 用（动态事件宫位）
  };

  // 平方象意
  pingFang?: PingFangItem[];

  // 六内六外判断
  liuNeiWaiMap: Record<GongName, "六内"|"六外">;

  // 河图分组
  heTuGroups: HeTuGroup[];
}

interface HeTuGroup {
  name: string;                   // "一六共宗" | "二七同道" | ...
  palaces: GongName[];
  theme: string;                  // "论自己" | "论人际" | ...
}

// ===== mutagenChains.ts =====

interface MutagenChainResult {
  // 忌转忌
  jiChains: JiChain[];
  // 禄随忌走
  luSuiJi: LuSuiJiItem[];
  // 科随权走 (可选)
  keSuiQuan?: KeSuiQuanItem[];
}

interface JiChain {
  source: { gong: GongName; star: string; type: "生年忌"|"飞宫忌" };
  target: { gong: GongName; star: string };
  impact: string;                  // e.g. "冲田宅宫 → 损财"
  severity: "high"|"medium"|"low";
}
```

#### 规则 → 模块映射

| 规则 | 模块 | 状态 |
|:--|:--|:--|
| 来因宫定位+含义 | methodology.ts | ✅ |
| 体用关系（由体入用/由用归体） | methodology.ts | 🔧 |
| 平方象意（同星同四化） | methodology.ts | 🔧 |
| 六内六外判断 | methodology.ts | ✅ |
| 河图五组太极分组 | methodology.ts | 🔧 |
| 忌转忌 | mutagenChains.ts | ✅ |
| 禄随忌走 | mutagenChains.ts | 🔧 |
| 有效飞宫判断 | mutagenChains.ts | ❌ 待补 #8 |
| 化出化入区分 | methodology.ts | ❌ 待补 #10 |
| 一五九法 | methodology.ts | ❌ 待补 #9 |

---

## 5. 交互数据流

```
用户打开命盘
    │
    ▼
chartModel.ts: iztro → ChartModel
    │
    ├──► overallAnalysis.ts
    │       ├── methodology.ts.laiyinGongRule
    │       ├── 四化人格特质规则
    │       ├── 过犹不及规则
    │       ├── 格局评分规则
    │       ├── 能量浓度规则
    │       └── 各专项检查 (命签纸田/身宫等)
    │       │
    │       └──► OverallResult (一级总览)
    │
    └──► 用户点击某宫位
            │
            ▼
         palaceAnalysis.ts
            ├── PalaceBasic (从宫位知识库取)
            ├── ZhuanGongItem[] (转宫算法)
            ├── SiHuaEffect[] (四化在本宫)
            ├── 对宫关系 + 三方四正
            ├── mutagenChains.ts (相关忌冲链)
            └──► PalaceResult (二级详情)
```

---

## 6. 知识库文件索引（供 CodeX 直接引用）

| 文件 | 大小 | 内容 |
|:--|:--|:--|
| `ziwei-knowledge/ziwei_knowledge_full.md` | 460KB | 全量课程知识聚合 |
| `ziwei-knowledge/ziwei_rules_structured.md` | 164KB | 按主题结构化规则 |
| `ziwei-knowledge/ziwei_rules_v3.md` | 220KB | 规则 v3（含置信度标注） |
| `ziwei-knowledge/ziwei_technique_catalog_v1.md` | 11KB | 75 条技法名录（索引） |
| `ziwei-knowledge/daily-rules-progress.md` | 2KB | 每日规则提取进度 |
| `ziwei-knowledge/rules/` | dir | 按规则拆分的独立文件 |
| `memory/2026-05-19.md` | — | 技法名录生成记录 |
| `memory/2026-05-28.md` | — | 双维度评分入库记录 |

---

## 7. 当前状态 & 下一步

### 前端可立即实现的（✅）
- 来因宫定位 + 一句话含义
- 四化人格类型标签
- 格局评分 + 能量浓度四象限
- 过犹不及检测
- 六内六外分类
- 忌转忌链追踪
- 河图五组太极分组
- **兄弟宫、交友宫的多层解读**（今晚提取的完整内容 ✅）
- 十二宫编号 + 本对宫关系 + 三方四正结构
- 转宫算法（以任意宫立太极，重新映射 12 宫含义）

### 前端暂不可用的（❌/🔧）
- 夫妻/子女/财帛/疾厄/迁移/官禄/田宅/福德/父母宫的详细多层解读
- 命签纸田（意外三宫）
- 六组阴阳宫二分
- 有效飞宫判断
- 一五九法
- 身宫深度判断（部分覆盖）
- 平方象意取象（部分覆盖）

### 建议开发顺序
1. 先打通数据流：ChartModel → OverallResult → 前端一级渲染
2. 实现宫位点击 → PalaceResult 的基本结构（本义 + 转宫 + 对宫）
3. 逐宫补全多层解读知识（顺今晚的命→兄→交节奏继续）
4. 接入忌转忌和来因宫飞化链
5. 补充缺失规则

---

> 📍 创建时间：2026-05-28
> 📝 维护者：AI Agent + CodeX
> 🔄 更新规则：每次知识库新增规则后，更新本文档对应状态标记
