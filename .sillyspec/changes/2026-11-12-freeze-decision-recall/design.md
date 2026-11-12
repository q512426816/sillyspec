---
author: t
created_at: 2026-11-12 16:53:13
generated_by: sillyspec-design-init
scale: small
---

# 设计文档（Design）— 2026-11-12-freeze-decision-recall

## 背景

`src/decision-distill.js` 的入选规则把 `type=scope` 整体排除在知识库之外（`decision-values.js:31` 的 `KNOWLEDGE_TYPES` 即「正典去 scope」）。该设计假设「范围裁决不需要长期记住」，但实操中 scope 被当成兜底类型滥用，把两类**必须可召回**的决策一并吞掉：

- **能力冻结**：`2026-10-15-fr-chain-l3-adjudication` 的 D-001@v1「冻结 L3 活规格树不建」——已于四周前裁决，却因 type=scope 从未入库，导致 2026-11-12 会话中 agent 再次提议「生成式当前行为契约快照」这一已被证伪的方向。
- **实为否决**：`2026-10-20-decision-caliber-unify` 的决策带「否决理由」+「复潮条件」，语义上属于 rejected，却因 type 标成 scope 而同样静默。

同变更的 3 条 FR 已正常入 `knowledge/fr/core-engine.md`，唯独决策缺席——问题不在召回算法，在决策根本没进召回池。详细证据链见 `docs/troubleshooting.md`「意图查询无法召回历史裁决」条目。

## 设计目标

1. 让「写了复潮条件的决策」无条件入库——复潮条件是决策者主动声明的「未来重启条件」，丢弃它等于丢弃召回信号。
2. 让这些决策出现在 agent 真正看见的注入面（`flow start` / brainstorm 的防复潮提示）。
3. 存量 3 条 scope 决策回填，本次事件的 D-001@v1 必须真的回来。

## 非目标

- **不新增 `freeze` 类型**（D-002@v1）：类型需人工标注，写决策的 agent 未必知道这是能力冻结，且治不了已标 scope 的存量。
- **不做类型与复潮条件的双判据并行**（D-003@v1）：改动面覆盖类型白名单、写入校验、提示清单、蒸馏、注入四处以上，两条判据并存会引入「哪条优先」的新歧义。
- **不为 scope 开专属特例**（D-005@v1）：补丁式，其他类型带复潮条件仍被丢弃，根因换壳重演。
- **不绕开蒸馏直扫归档**（D-006@v1）：每次 `flow start` O(N) 扫全归档，形成第二真相源，且 `knowledge search` 仍查不到。
- **不只在修规则后不管存量**（D-008@v1）：D-001@v1 仍在外面，变更核心价值不成立。
- **不写一次性脚本**（D-009@v1）：不可复用不可审计，规则再变还得再写一次。
- 不改 `fallbackByQueryShingles` 词片兜底、不改路由词表、不加 decisions.md 缺席硬门、不动 marker 目录名（对应知识门 5 条 rejected 提示，均不复潮）。

## 拆分判断

不适用。改动集中在决策蒸馏链 + 两处注入面 + 一个回填子命令，单上下文可完整吞吐，无需 Wave 并行编排。

## 总体方案

### 一、入选判据（`src/decision-distill.js`）

`dispositionOf` 增加第二判据，与既有 type/status 值集并列而非嵌套：

```js
function dispositionOf(entry) {
  const t = (entry.type || '').toLowerCase()
  const s = (entry.status || '').toLowerCase()
  if (s === 'rejected') return 'rejected'
  if (IMPLEMENTED_TYPES.has(t) && IMPLEMENTED_STATUSES.has(s)) return 'implemented'
  // 复潮条件 = 决策者声明的「未来重启条件」——强于类型分类，任何类型都适用
  if (entry.revisitWhen && (s === '' || IMPLEMENTED_STATUSES.has(s))) {
    return entry.rejectReason ? 'rejected' : 'implemented'
  }
  return null
}
```

status 门排除 `superseded / proposed / draft`（已失效或未定案）；**空 status 视同定案**——存量手写条目常见，第三条 `decision-caliber-unify` 正是此形态。

### 二、渲染与解析

- 渲染侧（`src/decision-distill.js` 的条目渲染段）：implemented 条目若 `revisitWhen` 非空，追加「复潮条件：」行。当前只有 rejected 写这行，导致入库后信号丢失。
- 解析侧零改动：`src/knowledge-match.js:72` 的 `DECISION_FIELD_RE` 与 `:175` 的赋值均已覆盖该字段。

### 三、注入面（四处口径必须一致）

防复潮过滤 `deathPath || status === 'rejected'` 在仓内共四处，全部加 `|| h.revisitWhen`：

- `src/flow.js:357`（flow start 的 rejectedDecisions）
- `src/flow.js:379`（flow start 的 scopeRejected 小节）
- `src/run/prompt.js:1437`（brainstorm 等阶段的 `{DECISION_HITS}` 渲染）
- `src/knowledge-graph.js:1102`（scopeDecisionHits 的遥测过滤——该处注释明写「遥测必须与实际渲染面对齐」，不同步会导致遥测与实际展示脱节）

这是 agent 真正看见的闸门，不改则前两步全部白做。

### 四、存量回填（复用既有 replay 模块）

**不新建模块**：`src/archive-baseline-replay.js` 已是完整的存量回放实现——`planBaselineReplay` 规划、`applyBaselineReplay` 执行、幂等预扫、`headHashOf` 缺省「未记录」、单变更失败留痕不阻断批次。它当前只跑 `{ baselineOnly: true }`（只写 D-000 叙事基线）。

本变更给它加 `full: true` 选项：跳过 `baselineOnly`、跑完整蒸馏，且 full 模式不按「已有基线」预跳过（幂等交由 `distillIntoKnowledge` 内部「号 + 变更」键保证，否则「有基线但缺人工条目」的变更会被误跳——正是本变更的目标场景）。

`src/stages/knowledge.js` 加子命令出口：

```
sillyspec knowledge distill-backfill [--dry-run] [--apply] [--change <名>]
```

缺省 dry-run，必须显式 `--apply` 才落盘（与 `redomain-unmapped` 同惯例）。本模块此前只由「各仓 .runtime 一次性脚本」调用，本次补正式 CLI 出口。

### 五、实施顺序

1. 改 `dispositionOf` + 渲染 → 跑既有 distill 测试确认零回归
2. 改两处注入面 → 补注入面测试
3. 加 backfill 模块与子命令 → 补幂等测试
4. dry-run 核对本仓 3 条 → `--apply` 回填 → 验证 D-001@v1 入库

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/decision-distill.js | `dispositionOf` 增加复潮条件第二判据；implemented 条目渲染「复潮条件：」行（producer=decisions.md 的 revisit_when → 蒸馏渲染 → consumer=knowledge/decisions/*.md 的「复潮条件：」行 → knowledge-match.js:175 解析为 h.revisitWhen → 注入面过滤） |
| 修改 | src/flow.js | 两处注入面过滤各加 `|| h.revisitWhen`（:357 rejectedDecisions、:379 scopeRejected） |
| 修改 | src/run/prompt.js | `{DECISION_HITS}` 渲染段过滤加 `|| h.revisitWhen`（:1437） |
| 修改 | src/knowledge-graph.js | scopeDecisionHits 遥测过滤同步加 `|| h.revisitWhen`（:1102，与渲染面对齐） |
| 修改 | src/archive-baseline-replay.js | 加 `full` 模式：跳过 baselineOnly 跑完整蒸馏，且 full 模式不做「已有基线」预跳过 |
| 修改 | src/stages/knowledge.js | 子命令路由 `distill-backfill` + help 文案 |
| 新增 | NEW:test/freeze-decision-recall.test.mjs | 判据分流、渲染、四处注入面一致、backfill 幂等四组用例 |

## 接口定义

```js
// src/archive-baseline-replay.js（扩展既有函数，不新增模块）
/**
 * @param {string} archiveRoot   .sillyspec/changes/archive
 * @param {string} knowledgeRoot .sillyspec/knowledge
 * @param {{ signals?: string[], headHashOf?: (change: string) => string,
 *           full?: boolean }} [opts]
 *   full=true → 完整蒸馏（不带 baselineOnly），且跳过「已有基线」预筛；
 *   full 缺省 false → 沿用现有基线回放行为（逐字不变）
 * @returns {{ applied: number, appliedChanges: string[], failed: Array<{change,error}>,
 *             planned: number, skipped: object }}
 */
export function applyBaselineReplay(archiveRoot, knowledgeRoot, opts = {})
```

CLI：`sillyspec knowledge distill-backfill [--dry-run] [--apply] [--change <名>]`，缺省 dry-run。

**兼容性**：`full` 缺省 false——既有一次性脚本调用路径行为逐字不变。

## 生命周期契约表

本变更不涉及生命周期契约（lifecycle contract: N/A）——无 session/lease/agent_run/daemon 状态机，backfill 为一次性幂等批处理。

## 数据模型

无 schema 变更。知识文件仍为 md，字段行契约不变（仅新增 implemented 条目可选的「复潮条件：」行，解析侧兼容）。

## 兼容策略（brownfield 必填）

- **未写复潮条件的决策**：行为与改动前逐字一致——scope 仍排除，其他类型仍按值集判定。
- **已有 rejected 条目**：走原分支，渲染与入库均不变。
- **注入面**：原 `deathPath || rejected` 的条目集合是改动后集合的子集，不会减少任何现有提示。
- **回填**：默认 dry-run，不显式 `--apply` 不落盘；幂等键保证重复执行零漂移。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 噪音回流：agent 为绕过过滤给所有 scope 决策无脑写复潮条件，注入面被淹没 | P1 | 复潮条件须实质内容（空/占位不入选）；注入面保留 score 过滤；distill 摘要打印入选条目 id 供事后审计 |
| R-02 | 空 status 放宽过度，把已失效条目（superseded 之外的历史散值）拉回 | P2 | 测试锁死 superseded/proposed/draft 仍排除；空 status 仅在有复潮条件时放行，且必须无 rejectReason 才入 implemented |
| R-03 | backfill 改写既有条目而非只新增 | P2 | 幂等键 = 号 + 变更，跨变更同号不折叠；dry-run 先行核对 planned 清单与现有文件 diff |
| R-04 | 四处注入面口径漂移（改了 flow.js 忘了 prompt.js / knowledge-graph.js） | P2 | 测试同时断言四处过滤结果一致；四处注释互指「同口径」并列出全部位置 |
| R-05 | `full` 模式误跳「有基线但缺人工条目」的变更 | P2 | full 模式显式跳过 `existingBaselineChanges` 预筛，幂等交由 distill 内部「号 + 变更」键；测试覆盖该场景 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 §一 入选判据——复潮条件作为判据 | 已覆盖 |
| D-002@v1 | 非目标「不新增 freeze 类型」 | 已覆盖（落选留痕） |
| D-003@v1 | 非目标「不做双判据并行」 | 已覆盖（落选留痕） |
| D-004@v1 | 总体方案 §一/§二/§三——独立通道 + 渲染 + 注入 | 已覆盖 |
| D-005@v1 | 非目标「不为 scope 开专属特例」 | 已覆盖（落选留痕） |
| D-006@v1 | 非目标「不绕开蒸馏直扫归档」 | 已覆盖（落选留痕） |
| D-007@v1 | 总体方案 §四 存量回填 | 已覆盖 |
| D-008@v1 | 非目标「不只在修规则后不管存量」 | 已覆盖（落选留痕） |
| D-009@v1 | 非目标「不写一次性脚本」 | 已覆盖（落选留痕） |

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-009 全覆盖）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（已写豁免）
- [x] UI 原型分级核对：本变更纯 CLI/后端，无界面变化，跳过原因已记入非目标与风险登记上下文
- [x] 无遗留存疑项
