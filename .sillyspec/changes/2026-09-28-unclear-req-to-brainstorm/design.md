---
author: qinyi
created_at: 2026-09-28 17:47:05
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-28-unclear-req-to-brainstorm

## 背景

「需求不清晰→头脑风暴预段→flow start 收编走轻量」链路 2026-09-25 已落地（commit 82b3d9c1），但实际几乎从不触发：需求清不清晰的判断完全发生在 agent 脑内、CLI 调用之前，清晰度门（src/flow.js:442）是格式门（只拦 --input 缺失/成功标准 0 条），agent 按指引教的格式随手可编出条目，编造成本为零；AGENTS.md 选道表第 1 行标「默认快道」，agent 自评门槛极低（D-001）。

方案探索三轮收敛（D-003/D-005）：词表枚举检测被否（开放世界不可枚举，复潮库内 D-001@v1 第四例）；「已定方案」声明硬门被否（需求清晰度是谱值非布尔，只能事后证伪）；定案方案 Ⅱ——前门弱盘问＋事后闭环强信号。随行发现并收编知识注入结构性缺口（D-004）：自动注入只锚变更入口（src/flow.js:137、src/knowledge-match.js:6），设计时点新机制词零检索面，AGENTS.md 速查行「勿自行重复检索」反向劝退——本变第四次撞上库内已否决路线即为实证。

## 设计目标

- 需求语义不清晰的变更真的进头脑风暴预段：前门盘问把自检问题从「需求清晰吗」（必然答'清晰'）重述为「还有没有必须问用户才能动手的问题」（逼 agent 现场枚举真实悬而未决，答"无"心理成本高得多）
- 假自检有代价：事后闭环用过程形态指标（封闭面：diff 比例与计数，非词表）标记「疑似该走预段未走」，下次同仓 flow start 点名提示，形成每仓自校准回路
- 设计时点知识检索面闭合：方案/设计步指引加机制词检索动作＋--done 门自动检索命中回显，让库内否决路线在决策时点可见

## 非目标

- 不做需求清晰度的机器语义判定（词表/模型分类均不做——D-003 否决，开放世界归 agent）
- 不做前门硬阻断：不设「已定方案」节、不加声明 flag、不 exit 2（D-005）
- 不动 run 族入口（完整流程从 brainstorm 起步，无跳过问题——D-002）；不动 adopt/resume 路径（无重复仪式）
- 不改清晰度门既有格式判定（--input 缺失/成功标准 0 条的 exit 2 行为逐字保留）

## 总体方案

三层，各层用各自最强信号（三层分工模式：机械层只锚封闭面，判定层归 agent，门禁层 fail-closed 不查内容）：

**Wave 1 前门·盘问重述（FR-01）**：flow start 全新建变更路径，创建成功输出固定自检段——「对本需求，你还有没有必须问用户才能动手的问题？有→先走头脑风暴预段（它就是结构化问询协议）；无→继续」。纯提示面。同屏注入 FR-02 历史提示（若上个轻量变更被标记）。配套 templates/agents-instruction.md 选道表改写：第 1 行前提式（自检通过才走）、第 2 行负面信号以「举例」身份列出（明示举例非机制）、速查行「勿自行重复检索」改写。

**Wave 2 后门·事后闭环（FR-02）**：新模块 src/route-hindsight.js——flow done 收口时计算过程形态指标（design.md 终稿 vs 机器起草首版的重写比、tasks.md 终稿 vs 机器预填稿改写率、收口评审盲维命中数、实测失败次数——后两者读既有记录面 review.json/flow-state substeps），任一超阈值（重写比 >50%、改写率 >60%、盲维 ≥2、实测失败 ≥2，常量可调）→「疑似该走预段未走」标记落 .sillyspec/.runtime/route-hindsight.json（per-repo 单文件）；下次 flow start 读取并点名提示（措辞「疑似」非定罪，可无视）。

**Wave 3 设计时点知识检索面（FR-03）**：brainstorm 方案步（Step 4）/设计步指引模板加固定动作——落盘方案/决策前把方案引入的机制词跑 `sillyspec knowledge search --query "<机制词>"`，命中必读再定稿（关键词由 agent 现场生成，指引只举例不设表）；方案步 --done 门对 --output 与 decisions.md 新增条目自动跑既有检索匹配器，命中即回显（条目 id+标题+一句话）并提示 evidence 回应——v1 只 warn 不阻断。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/route-hindsight.js | 指标计算＋标记落库＋提示读取（导出 computeHindsightMetrics / markHindsight / readHindsightHint） |
| 修改 | src/flow.js | 前门盘问渲染（新建变更成功输出段）＋hindsight 提示注入＋flow done 收口指标计算接线 |
| 修改 | src/stages/brainstorm.js | Step 4/Step 5 指引模板加机制词检索固定动作 |
| 修改 | src/run/command.js | 方案步 --done 门自动检索命中回显（warn 不阻断） |
| 修改 | templates/agents-instruction.md | 选道表前提式改写＋负面信号举例＋速查行改写 |
| 修改 | package.json | 版本号 bump（AGENTS.md 模板随 init 版本感知刷新传播） |
| 新增 | NEW:test/route-hindsight.test.mjs | 指标计算/阈值/落库/读取回归 |
| 新增 | NEW:test/flow-clarity-probe.test.mjs | 前门盘问渲染与历史提示注入回归 |
| 新增 | NEW:test/design-knowledge-check.test.mjs | --done 门检索回显回归 |

## 接口定义

```js
// src/route-hindsight.js
/** 收口指标计算（封闭面：只读文件与既有记录，无语义判定） */
export function computeHindsightMetrics({ changeDir, reviewJson, flowState }) →
  { designRewriteRatio, tasksRewriteRatio, blindDims, testFailures, raw: {...} }
/** 超阈判定＋标记落库（.sillyspec/.runtime/route-hindsight.json，per-repo 单条） */
export function markHindsight({ cwd, specBase, change, metrics }) → { marked: boolean, reasons: string[] }
/** 下次 flow start 提示读取；无标记/文件缺失返回 null（新装零影响） */
export function readHindsightHint({ specBase }) → string | null
```

基线快照来源：design 首版＝flow 机器稿起草后首次落盘内容（收编/新建时机器稿即首版）；tasks 首版＝机器预填 tasks.md（thin-agent-tasks 既有产物）。终稿＝flow done 收口时点文件内容，行级 diff 比例。

## 生命周期契约表

本变更不涉及生命周期契约/lifecycle contract 相关机制（无 session/lease/agent_run/daemon/state transition/claim/heartbeat 面——hindsight 落盘为一次性文件写，无状态机）。

## 数据模型

无 db schema 变更。`.sillyspec/.runtime/route-hindsight.json` 单文件：`{ change, marked_at, metrics: { designRewriteRatio, tasksRewriteRatio, blindDims, testFailures }, reasons: [] }`——每次标记整文件覆盖（per-repo 只留最近一条，提示语义即「上个轻量变更」）。

## 兼容策略（brownfield 必填）

- 未升级/无 hindsight 文件的仓：readHindsightHint 返回 null，flow start 输出与现状一致（零行为变化）
- 清晰度门格式判定（exit 2 两选一）逐字保留；前门盘问是纯增量渲染段
- AGENTS.md 模板改写靠版本 bump 传播：同版本重跑 init 不更新（既有惯例），旧版仓维持旧模板不受影响
- --done 门检索回显为增量 warn：无命中时输出与现状一致

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 事后指标误标（用户中途合法改需求被记「疑似」）→ 提示成噪音被无视 | P2 | 「疑似」措辞非定罪＋提示可无视；阈值常量保守（D-005 故障面） |
| R-02 | 门检索误命中噪音 → 狼来了效应，命中被习惯性无视 | P2 | v1 warn 不阻断（D-004 故障面）；查询串取决策标题+question 拼装，降噪 |
| R-03 | 并行会话（2026-09-28-tap-judge）在改 src/flow-draft.js | P1 | 本变更零改 flow-draft.js（清单无此文件）；提交显式 pathspec |
| R-04 | 基线快照时机错（首版取晚）→ 重写比恒 0 闭环失效 | P2 | 首版锚定机器稿起草时点（start/adopt 时机器稿即快照源）；测试钉住 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 背景节（三重根因）、FR-01+FR-02（判断面+行为面双轮） | 已确认 |
| D-002@v1 | 非目标节（run 族入口不动）、文件变更清单（无 run 族入口文件） | 已确认 |
| D-003@v1 | 非目标节首条（禁机器语义判定）、总体方案（指标全封闭面） | 已确认（rejected 落实为禁区） |
| D-004@v1 | 背景节、FR-03、Wave 3 | 已确认 |
| D-005@v1 | 总体方案（方案 Ⅱ 全貌）、FR-01/FR-02 | 已确认 |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语
- [x] UI 原型分级核对（无前端文件，跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无存疑项）
