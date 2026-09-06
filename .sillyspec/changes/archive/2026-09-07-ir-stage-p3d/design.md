---
author: qinyi
created_at: 2026-09-07T06:40:00+08:00
scale: large
---

# 设计文档（Design）— IR 五阶段 P3d：archive delta 聚合回灌

## 背景

种子稿 `docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md` §5：归档时生成变更 delta（archify Delta 的 Before/Delta/After 对应物）回灌 scan 与 knowledge。提案审查轮已实证其「contract-matrix before/after 已有数据」失实（只有事后快照）——工作量按修正分析缩范围。

前三期落地的机器产物（本设计的数据源，全部已存在）：
- **P3a**：`.runtime/verify-runs/<ts>/reconcile-result.json`（verify gate 落盘：三类差集 + matched 清单 + form/sources）——touched 事实表。
- **P3b**：变更目录 `verify-facts.json`（探针命令 + 指标快照）。
- **P3c**：decisions.md 模块域 + `decision-distill` 提炼清单（knowledge 回灌机制已存在）。
- `docs/<project>/modules/_module-map.yaml`（模块归属索引）；`apply-pathspec-<change>.txt`（交付文件清单）。

## 设计目标

1. **delta 聚合器**：`sillyspec delta --change <名>` 从四源聚合生成 `changes/<名>/delta.md`（Before/Delta/After 三段式），agent 零参与（纯 CLI 读 CLI 产物）。
2. **archive 自动生成**：archive「确认归档」步自动调用（产物随归档目录保存）；独立命令可复跑（幂等）。
3. **advisory 联动**：delta.md 尾部「scan 刷新建议」段——受影响模块清单（module-map 归属推导），提示下次 `scan facts` 关注面。

## 非目标

- **端点 before/after 基线不做**（D-001@v1：contract-matrix 无 before 数据，基线机制独立立项；delta 不含端点增删段）。
- **增量 scan 引擎不做**（scan facts 全量幂等，增量刷新属 scan 域大改；本设计只产 advisory 段）。
- **knowledge 自动沉淀不做**（decision-distill 已是既有机制，不重复建设）。
- 不改 scan facts/contract-matrix/module-changelog 既有行为。

## 拆分判断

单 change 小型收口：聚合器单文件 + CLI case + archive 接线一行 + 测试。

## 总体方案

### src/archive-delta.js 纯函数聚合器

`buildDeltaReport({ changeDir, specRoot, project, runtimeRoot })` → string（delta.md 全文）：

**四源采集（fail-soft，缺源降级注记）**：
1. `reconcile-result.json`：runtimeRoot/verify-runs/ 下按 ts 排序、**按 change 字段过滤后**取最新一份——matched（①清单）/missing/undeclared/form/sources；无对账产物（存量变更）→ Delta 段改用 apply-pathspec-<change>.txt 交付清单兜底（文件级，无差集），注记「无 reconcile 产物（变更先于 P3a），清单取 apply-pathspec」。
2. `verify-facts.json`：变更目录存在则取四探针 metrics 摘要；缺省注记。
3. **module-map 归属**：matched + undeclared 文件清单 × prefixPairs 前缀推导受影响模块集（未匹配文件列「未匹配」）；无 map → 模块列注记。
4. **decisions.md**：当前版本 D 条目清单（id + 模块域——parseDecisionDomains 返回形态即此，无 title）——复用 design-facts 的 parseDecisionDomains（P3c 已导出）；模块归属推导复用 design-facts 的 deriveActualModules（需导出——信息项采纳）。

**三段式输出（md）**：
- **Before**：变更前状态摘要——受影响模块的 module-map 注册信息（id/status/paths 计数）+ 声明域（decisions 模块域并集，NEW: 标记）。
- **Delta**：做了什么——交付文件×模块归属表（来自 matched；missing/undeclared 差集附注）+ 决策清单 + 探针指标摘要（「验证结论表的机器半边」快照）。
- **After**：建议动作——模块卡同步状态引用（module-impact.md 更新结果行）+ **scan 刷新建议**（受影响模块列表：`sillyspec scan facts` 下次刷新重点关注 <modules>；未匹配文件提示 modules 补录）+ 端点基线独立立项提示（若 verify-facts probe5 指标非零）。

**接线**：
- CLI：index.js 新 case `delta --change <名> [--spec-dir]`——生成/覆盖 delta.md（幂等复跑），输出路径与摘要。
- archive 自动：archive「确认归档」步（--confirm 路径，目录移动前）调用 buildDeltaReport 落盘——归档后随目录进 archive/。接线点在 run/complete-handlers.js 的 handleArchiveConfirmStep（读该函数确认插入点）或 stages/archive.js 确认步——以代码实勘为准，原则：移动目录**之前**生成。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/archive-delta.js | buildDeltaReport 纯函数（四源采集 fail-soft + 三段式渲染） |
| 修改 | src/design-facts.js | deriveActualModules（:149）加 export（一行，D-003 ④——plan 审查补） |
| 修改 | src/index.js | delta 命令 case |
| 修改 | 接线点（complete-handlers.js 或 stages/archive.js，实勘定） | 确认归档步自动生成 |
| 新增 | test/archive-delta.test.mjs | 四源聚合/降级/三段式/幂等/归属推导断言 |

**字段数据流标注**（产物 delta.md）：producer = CLI（delta 命令 / archive 自动，读四源机器产物）→ consumer = ①归档审计（人读：变更做成了什么）②scan facts 刷新 advisory（人/agent 读建议段）。agent 不写该文件。

## 接口定义

```js
// src/archive-delta.js
collectDeltaSources({ changeDir, specRoot, project, runtimeRoot })
// → { reconcile: object|null, verifyFacts: object|null, moduleMap: object|null, decisions: [{id,domains}]|null, deliverables: string[] }（deliverables=reconcile 缺失时的 apply-pathspec 兜底清单，Gap-2 定义）
buildDeltaReport({ changeDir, specRoot, project, runtimeRoot }) // → string（md 全文）
// CLI: sillyspec delta --change <名> [--spec-dir] [--json]（机读 JSON 对齐 design-init 先例：{command,change,ok,path,written}）
```

## 生命周期契约表

不涉及生命周期契约（聚合器与产物，无 session/lease/状态机语义）。

## 数据模型

无 DB schema 变更。新产物 delta.md（三段式 md）。

## 兼容策略（brownfield 必填）

- 存量变更（无 reconcile/verify-facts/decisions 任一或全部缺失）：对应段降级注记，delta.md 仍生成（不因缺源失败）。
- module-map 缺失：模块列注记，未匹配文件照列。
- archive 自动生成失败（异常）：fail-soft 跳过（归档不阻断），提示可用 delta 命令手动补。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | verify-runs 多 ts 目录取错 change 的 reconcile（跨变更串台） | P1 | reconcile-result.json 含 change 字段（P3a 落盘有）——按 change 过滤后再取最新 |
| R-02 | 归属推导误报（paths 缺口文件） | P2 | 未匹配文件显式列出不猜；advisory 措辞留人工裁量 |
| R-03 | archive 接线点实勘与预期不符（complete-handlers vs stages/archive.js） | P2 | 以「目录移动前生成」为不变量实勘插入点；测试锁定归档后 delta.md 在 archive/ 目录内 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1（缩范围+不做清单） | 非目标、总体方案 | 全覆盖 |
| D-002@v1（双入口/三段式） | 总体方案、接口定义 | 全覆盖 |
| D-003@v1（--json/兜底/源4/导出） | 接口定义、文件清单 | 全覆盖 |

无未解决决策。

## 自审

- 章节齐全 ✓；frontmatter ✓；中文标题 ✓；豁免短语紧邻 ✓；D-001/002 引用 ✓；数据流标注 ✓；原型跳过 ✓
- ⚠️ 自审存疑 1：R-03 接线点实勘（task 内以代码为准）。
- ⚠️ 自审存疑 2：decisions 复用 design-facts 的 parseDecisionDomains（P3c 导出）——无环核实（archive-delta 新文件单向依赖）。
