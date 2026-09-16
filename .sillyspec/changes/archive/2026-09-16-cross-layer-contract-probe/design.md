---
author: qinyi
created_at: 2026-09-16 12:23:00
scale: large
---
# 设计文档（Design）— 扩展探针8：design 契约枢纽维度（契约外载荷键 + 必填漏发）

## 背景

2026-09-15 wp EHS 三仓会话复盘实证：verify 判 PASS WITH NOTES 后人工深挖 5 个 P1，其中 4 个是跨层字段对齐问题。**凌晨 ed540c6（quick ql-20260916-007-5e1a）已落地探针8「载荷字段契约对账」**：前端载荷键 × 后端 Java 字段（归一化覆盖 ∪ 子串/Jaccard≥0.6 疑似配对）∪ SQL NOT NULL 列缺送核对，advisory——覆盖 leaderUserId↔rpLeaderUserId、reportOrgId（NOT NULL 路径）、report_org_name 类案例。

plan 独立审查（plan-review-2026-09-16-122643）发现本变更原案（新增 design 契约枢纽探针）与 ed540c6 撞车；用户裁决（D-002@v1）：**扩展现有探针8**，补两个它盖不住的场景：

1. **无词法映射的错位**：`sourceShdId` ↔ `safelyHiddenId`——归一化/子串/Jaccard 全不命中（token Jaccard=0.2），只有 design 契约表能揭示「契约里这字段叫什么」；
2. **diff 无 SQL DDL 时的必填漏发**：NOT NULL 路径依赖 .sql 文件进 design 清单；design 契约表的 required 标注不依赖 SQL 在场。

## 设计目标

1. 现有探针8 输出面新增两组 advisory 信号：契约外载荷键（contractOrphans）、契约必填漏发（missingRequired）。
2. 既有直接比对语义零变动（ed540c6 的 mispairs/feOnly/missingNotNull 与三提取器不动）。
3. 补齐 ed540c6 未接线的一环：探针一致性抽查（checkProbeConsistency）纳入 probe8 维度（WARNING 级）。

## 非目标

- 不改既有探针8 三提取器与配对策略语义（extractJavaFields / extractSqlNotNullColumns / extractPayloadKeys 原样复用）。
- 不做类型形状比对（Map vs Array，留待实证）。
- 不做硬门（advisory 维持；升门是后续独立决策）。
- 不覆盖 js/jsx/ts/tsx + java/sql 之外的语言对（.vue 现有提取器本就未覆盖，维持现状不扩）。

## 拆分判断

单一内聚扩展（两个新维度 + 一致性接线 + 测试），不拆分。

## 总体方案

### 1. 契约面解析（新增 `parseDesignContracts`）

解析 design.md 契约类章节（标题含「接口定义/数据模型/接口契约/字段」之一）内的表格，**表头首列须含「字段/Field」判据**——防止文件清单表（首列「操作」）、风险表（首列「#」）误入。每张命中表产出 `{ name, fields: Set<string>, required: Set<string> }`：字段名取首列（剥反引号/类型注记），required=说明列含「必填/required/※」。含 `<!-- probe8-skip -->` 的章节整章跳过。无契约面 → 两新维度 skipped + 注记（不干扰既有维度输出）。

### 2. 两个新维度（挂在 runProbe8PayloadParity 内，输出面扩展）

**契约外载荷键 contractOrphans**：feKeys 中既 ∉ 全部契约面字段并集（归一化口径复用 normFieldKey）、又已落入既有 feOnly/mispairs 疑似面的键 → `contractOrphans: Array<{fe, hint?}>`——hint 用既有 token-Jaccard 配对逻辑对契约字段集跑一遍（低阈值 0.4，仅提示性）；sourceShdId 类无 hint 也照报（契约外即信号）。

**必填漏发 missingRequired**：契约 required 字段（归一化）在 feKeys 全集零出现，且 design 含新增提交端点（「接口定义」章含 POST/PUT 行）→ `missingRequired: Array<{field, contract}>`；无提交端点不启用（防查询载荷误报）。

两维度结果并入既有 `out` 返回结构（新增两数组 + `contractCount` 计数），渲染段（PROBE8_HEADING 区）与 facts metrics 同步扩两行。

### 3. 一致性抽查接线（ed540c6 缺口）

`src/verify-postcheck.js` `checkProbeConsistency`（probe1/6=ERROR、probe3/5=WARNING 分级处）纳入 probe8 维度：**WARNING 级**（环境敏感——probe8 结果依赖 design 清单与文件读取，HEAD 前进会漂移，对齐 probe3/probe5 处置）。gates.js 信封路由为通用面，无需改动。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | 探针8 扩展：新增 `parseDesignContracts` 导出 + `runProbe8PayloadParity` 内 contractOrphans/missingRequired 两维度（输出面扩展，既有三维度语义零变动）+ PROBE8 渲染段两行 + facts metrics 扩展。数据流：producer=parseDesignContracts（读 design.md 契约章节）→ runProbe8PayloadParity 比对 → 骨架预填段渲染 → consumer=agent 逐条裁定 + verify-postcheck 一致性抽查（WARNING 级漂移检测） |
| 修改 | src/verify-postcheck.js | checkProbeConsistency 纳入 probe8 维度（WARNING 级，环境敏感维度组，对齐 probe3/probe5 处置——ed540c6 未接线缺口） |
| 新增 | NEW:test/probe8-contract-pivot.test.mjs | 契约维度五用例（见测试与验收）；既有 test/probe8-payload-parity.test.mjs 零触碰（直接比对面回归由其锁定） |

## 接口定义

```js
// src/verify-probes.js 新增导出（既有导出面零变动）
parseDesignContracts(designPath)
// → { contracts: Array<{name: string, fields: Set<string>, required: Set<string>}>, skippedSections: number } | null（design.md 不存在）

// runProbe8PayloadParity 返回结构扩展（既有字段不动，新增）：
//   contractCount: number, contractOrphans: Array<{fe: string, hint?: string}>, missingRequired: Array<{field: string, contract: string}>
```

## 测试与验收

`test/probe8-contract-pivot.test.mjs` 五用例（fixture 复用既有 probe8 测试的临时仓手法）：

1. **契约外键命中**：契约表含 `safelyHiddenId`，前端载荷含 `sourceShdId`（无词法关系）→ contractOrphans 含该键；既有 mispairs/feOnly 面不受影响。
2. **必填漏发命中**：契约 `reportOrgId` 标必填 + 接口定义含 POST 行，feKeys 无该键 → missingRequired 命中；无 POST 行时不报。
3. **契约内对齐零新告警**：载荷键全 ∈ 契约字段 → 两新数组空，既有维度照常输出。
4. **无契约面 skipped**：design 无契约章节 → contractCount=0 + 注记，不误报不空段。
5. **非契约表不入面**：design 含文件清单表/风险表 → 不被误当契约面（表头判据）。

验收：五用例全绿 + npm test 全量 0 失败（含既有 probe8-payload-parity 五组）+ lint 过。

## 风险登记

| # | 风险 | 应对 |
|---|---|---|
| R-01 | design 契约表格式方差（列序/合并单元格）致契约面解析偏窄 | 章节判据+表头判据双重限定；无契约面即 skipped 不硬跑；agent 裁定兜底 |
| R-02 | 必填漏发误报（查询/列表载荷天然不含提交必填） | 仅 design 含 POST/PUT 端点行时启用；advisory |
| R-03 | 契约外键误报（本地 UI 态键恰在请求窗口内） | 仅对已落入 feOnly/mispairs 疑似面的键报（既有维度已过滤一轮）；advisory |
| R-04 | 一致性抽查 probe8 维度漂移误报（HEAD 前进） | WARNING 级放行 + 修复提示对齐 probe3/5 既有文案 |

## 自审（Self-Review）

- D-002@v1 一致：扩展现有探针8，既有三提取器/配对策略语义零变动（非目标显式锁定）。
- 文件清单 3 条：2 修改 + 1 NEW: 前缀测试文件；verify-postcheck.js 接线点真实存在（checkProbeConsistency probe1/3/5/6 分级处（probe7 走独立 advisory 校验））。
- Grill 自审两项修正延续有效：契约表章节+表头双重判据（源①）、依赖方向无冲突（扩展全在 verify-probes.js 内，不新增跨模块 import）。
- 生命周期契约表：不涉及 session/lease/lifecycle 关键词，省略。
