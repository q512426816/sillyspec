---
author: qinyi
created_at: 2026-09-14 19:34:46
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-14-knowledge-loop-close

## 背景

知识学习闭环的吞吐卡在两处（2026-09-14 会话实证盘点 + Design Grill X-004/X-012 修订）：

1. **生产端归类堵塞**：quick 收尾发现的坑追加到 `knowledge/uncategorized.md` 后，归类需要「经用户确认」（INDEX.md 头部约定），人注意力稀缺导致积压——实测 17 条（9 条带 ql 标题行 + 8 条历史无标注），最早 2026-06/07 的条目仍挂着「建议归类到 known-issues.md」未执行。归档侧蒸馏已机械化（decision-distill，b89180f 实证 5 条决策 → 4 主题文件 63 行），瓶颈集中在 quick 侧人闸。另有格式分裂存量债：quick.js:132 指引写尾注格式、knowledge.js validate 契约是标题行格式（X-001）。
2. **消费端不完整、不可聚合**：execute「确认执行范围」step 已有 report 级机械注入（prompt.js:757-786 `{KNOWLEDGE_HIT_REPORT}` + `.runtime/knowledge-hit-report.json` 遥测）——但它只报告命中清单不注入正文，且 quick 侧完全没有对应物（quick.js:28 仅 prompt 建议自行 cat INDEX），遥测是 json 快照不是可聚合事件流，命中矩阵无从统计。knowledge/ 沉淀是否被真实消费，缺全链路事实依据。

## 设计目标

1. 归类动作发生在 quick `--done` / archive 时刻，无需逐条人确认；错误归类有审计面且可逆。
2. uncategorized 条数受棘轮基线约束，方向单调下降。
3. 知识消费从「report 级/建议读」升级为「正文机械注入」（确定性进入上下文），quick 与 execute 双侧覆盖，且注入留统一遥测事件流。
4. 命中矩阵可查，为后续「是否升级消费门禁」提供数据依据。

## 非目标

- 不做「必须消费」硬门禁（先遥测后优化，D-002 明确）。
- 不做知识文件自动删除/合并（死重清单只报告）。
- 不新造匹配引擎——复用 `src/knowledge-match.js` 的 `parseKnowledgeIndex` / `matchKnowledge`。
- 不改归档侧 decision-distill 既有链路（已在跑，本次只接 quick 侧）。
- 不移除既有 `knowledge-hit-report.json`（保留兼容，遥测增量统一走 hits.jsonl）。
- 不涉及平台/dashboard 侧改动。

## 拆分判断

归类闭环与消费注入是同一学习闭环的生产/消费两端，共享 matchKnowledge 基础设施；拆开则各自不完整（D-001 否决方案 C 的理由）。单一变更、五个子机制，不走批量模式。

## 总体方案

**A. 归类提议器（生产端）**：宿主为 `src/run/complete-handlers.js` 的 `handleQuickStageCompletion`（quick `--done`，:983）与 `handleArchiveConfirmStep`（archive）。quick `--done` 收尾渲染时，CLI 直接用**进程内**刚通过校验的四字段 outputText（completeQuicklogEntry :1353 落盘后同进程继续渲染，免读回盘）拼查询串跑 `matchKnowledge(knowledgeDir, ctx)`；命中则在收尾输出渲染「📚 待归类提议：ql-xxx 根因疑似命中 `<目标文件>#<条目>`，确认归类跑 `sillyspec knowledge classify --ql <id> --file <目标>`」。根因为「无，纯新增/纯样式」形态或未命中时不提议（保持「拿不准不写」铁律，不制造硬凑条目）。

**B. `knowledge classify` 子命令**：`--ql <id> [--file <目标文件>] [--section <标题>] [--keywords <kw1,kw2>] [--dry-run]`。动作四步：从 uncategorized.md 解析该条目——**双格式寻址**（标题行 `## <qlId> | <标题>` 前缀 ∪ 正文尾注 `（<qlId>）`，X-001；无标注历史条目用 `--title` 模糊匹配兜底）→ 追加到目标知识文件（保留原文，条目格式 `## <标题>` + 一段说明）→ INDEX.md 对应分类段补路由行（**anchor 规则：中文条目标题直接作 anchor**，先例 knowledge/INDEX.md `#平台审核占位`；**keywords 来源：`--keywords` 显式传，缺省按条目标题分词兜底**，X-005）→ 从 uncategorized.md 删除该条目。幂等：目标文件已含同标题条目则跳过追加只做迁移收尾。`--dry-run` 只渲染将要发生的变更。归类动作写一行审计进 `.runtime/knowledge-hits.jsonl`（type: classify）。

**C. knowledge-baseline 棘轮**：`.sillyspec/knowledge-baseline` 存单整数（uncategorized 条数上限，语义对齐 docs-check-baseline）。**计数口径与 `sillyspec knowledge` validate 同款正则** `/^#{2,3}\s+\S/gm`（X-010，防双数字打架）。quick `--done` / archive 收尾时计数对比：超线 → 软警告（⚠️ 提示 + 建议 classify 清单，**不阻断**）；低于基线 → 自动收紧基线到当前值。文件缺失 → 视为未启用，不警告（存量仓零迁移成本）。

**D. 机械注入（消费端，升级既有机制而非并行新建，X-004）**：execute 侧——升级 prompt.js:757-786 既有 `{KNOWLEDGE_HIT_REPORT}` 段：从「命中清单报告」升级为「命中正文注入」（top-3 文件限额、单文件截断、段头保留命中报告语义），查询串沿用该 step 现有来源（changeName + tasks.md 任务行，prompt.js:763-776）；Wave 粒度补充：`buildWavePrompt`（execute.js:763）注入 Wave 任务名串匹配段。quick 侧——`quickFirstStep`（prompt.js:1096-1105）注入，查询串用 `readQuickGuardField('taskDescription')` 现成读取（X-008）。**top-3 选取规则：按 entries 出现序（INDEX 行序）取前 3 个不同 file**（matchKnowledge 为布尔 filter 无相关度排序，X-009）。未命中整段不出现（字节零变化）。注入同时逐条落 `.runtime/knowledge-hits.jsonl`（type: inject）；既有 knowledge-hit-report.json 照旧写（兼容）。

**E. `knowledge stats` 子命令**：读 hits.jsonl 聚合输出——近 30 天命中矩阵（文件 × 次数 × 最近命中时间）+ 从未命中文件清单（对照 INDEX 全集，标注疑似死重）。纯只读。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/knowledge-classify.js | classify 子命令核心：uncategorized 双格式条目解析/迁移/INDEX 更新（keywords+anchor 规则）/幂等判定 |
| 新增 | NEW:src/knowledge-stats.js | stats 子命令核心：hits.jsonl 聚合 + 死重对照 |
| 新增 | NEW:src/knowledge-hits.js | hits.jsonl 追加写 + 读取（inject/classify 两类记录，append 单行 JSON + '\n'，残行容忍） |
| 修改 | src/stages/knowledge.js | cmdKnowledge 二级路由（:506-524 switch）注册 classify/stats + available 列表（X-002：注册锚点在此，非 index.js——后者 :2612 仅转发） |
| 修改 | src/run/prompt.js | 升级 {KNOWLEDGE_HIT_REPORT} 为正文注入（top-3+截断+hits 落盘）；quickFirstStep 新增注入段；buildWavePrompt 注入 Wave 粒度匹配段 |
| 修改 | src/stages/quick.js | step1 prompt 说明命中知识段来源；step3 收尾输出接归类提议渲染点（宿主 complete-handlers，quick.js 只留指引） |
| 修改 | src/stages/execute.js | Wave prompt 说明命中知识段来源（agent 勿自行重跑匹配） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 新模块文件补录 core-engine paths（knowledge-hits/classify/stats，lint 覆盖门禁；W1 实证欠账） |
| 修改 | src/run/complete-handlers.js | handleQuickStageCompletion（:983）quick --done 收尾渲染归类提议 + 棘轮对比；handleArchiveConfirmStep archive 收尾渲染抽审清单（X-006 裁决定锚，原二选一存疑关闭） |
| 新增 | NEW:test/knowledge-classify.test.mjs | classify 四步动作/双格式寻址/幂等/dry-run/--title 兜底/keywords+anchor 生成 |
| 新增 | NEW:test/knowledge-inject.test.mjs | 注入段格式/top-3 限额（INDEX 行序前 3 不同 file）/未命中零变化/hits 落盘/旧 report.json 兼容共存 |
| 新增 | NEW:test/knowledge-baseline.test.mjs | 超线软警告不阻断/降线自动收紧/缺失不警告/计数正则口径 |
| 新增 | NEW:test/knowledge-stats.test.mjs | stats 聚合/死重对照/空数据提示 |

## 接口定义

```js
// src/knowledge-classify.js
export function classifyUncategorizedEntry({ knowledgeDir, qlId, targetFile, sectionTitle, keywords, titleFallback, dryRun })
// keywords: string[]（--keywords 显式或标题分词兜底，用于 INDEX 路由行）
// titleFallback: --title 模糊匹配（无 ql 标注历史条目）
// → { ok, moved: bool, appendedTo, indexUpdated: bool, anchor: string, skippedReason?: string }

// src/knowledge-hits.js
export function appendKnowledgeHit(runtimeDir, { type: 'inject'|'classify', change, query, matchedFiles, at })
export function readKnowledgeHits(runtimeDir, { sinceDays }?)  // → [{...}]（容忍残行跳过）

// src/knowledge-stats.js
export function buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays = 30 })
// → { matrix: [{file, hits, lastHitAt}], neverHit: [file], totalInjects, totalClassifies }
```

CLI 面：`sillyspec knowledge classify --ql <id> [--file <path>] [--section <title>] [--keywords a,b] [--title <模糊>] [--dry-run]`；`sillyspec knowledge stats [--since-days N] [--json]`。

## 生命周期契约

本变更不涉及生命周期契约（lifecycle contract）——无 session/lease/daemon/heartbeat/状态转移新增；hits.jsonl 为单向 append 事件流，无消费者契约。

## 数据模型

`.runtime/knowledge-hits.jsonl`（append-only，每行一个 JSON + '\n'）：

```json
{"type":"inject","change":"2026-09-14-x","query":"任务描述摘要…","matchedFiles":["known-issues.md#worktree-apply-三道坎"],"at":"2026-09-14T12:00:00+08:00"}
{"type":"classify","change":"quick-abcd1234","qlId":"ql-20260914-009-1a2b","targetFile":"known-issues.md","at":"…"}
```

`.sillyspec/knowledge-baseline`：UTF-8 单整数文本（对齐 docs-check-baseline 的 2 字节形态）。INDEX.md 路由行格式不变（`- kw1|kw2 → [display](file#anchor)`，classify 只按既有格式追加，anchor=条目标题）。既有 `.runtime/knowledge-hit-report.json` 保留（兼容，不迁移）。

## 兼容策略（brownfield 必填）

- INDEX.md / knowledge 目录缺失：matchKnowledge 已返回 `matched:false`，注入与提议全链路 no-op。
- hits.jsonl 缺失：stats 输出空矩阵 + 提示「暂无遥测数据」；append 时自动创建。
- knowledge-baseline 缺失：棘轮视为未启用，不警告不阻断；首次 classify 清落后由下次收尾自动生成。
- 存量 uncategorized 条目双格式寻址：标题行 `## <qlId> |` 前缀（validate 契约格式，9 条）∪ 正文尾注 `（<qlId>）`（quick.js:132 指引格式）∪ `--title` 模糊兜底（8 条无标注历史条目）。
- execute 既有 {KNOWLEDGE_HIT_REPORT} 消费方（prompt 与 agent 阅读习惯）：段头语义保留，仅从清单升级为正文；knowledge-hit-report.json 继续落盘。
- 旧版 CLI 消费方无感知：无既有 API/表结构变更；QUICKLOG/INDEX 格式不变。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 归类提议错位（根因字段与知识文件语义不匹配） | P2 | 提议仅是提示不自动执行；classify 需显式确认；archive/doctor 抽审可 revert（条目不丢，位置可改；revert 为手工搬运，无专用命令——可接受） |
| R-02 | 注入段膨胀 prompt | P2 | top-3 文件限额（INDEX 行序前 3 不同 file）+ 单文件行数截断 + 截断标记；未命中零字节 |
| R-03 | INDEX 与知识文件漂移（classify 追加后路由失效） | P2 | classify 更新 INDEX 同事务；anchor 按条目标题机械生成保一致；既有 `sillyspec knowledge` validate 兜底 broken_reference/unregistered_file——**anchor 级漂移不在 validate 范围**（X-011），靠 anchor=标题的机械规则保证 |
| R-04 | hits.jsonl 并发 append 交错 | P3 | CLI 短进程串行调用为常态；单行小 JSON appendFileSync+'\n'；残行容忍（读取跳过坏行）；必要时复用 quicklog.js withFileLock O_EXCL 先例 |
| R-05 | 棘轮误伤（计数口径与人工整理不一致） | P3 | 计数正则与 validate 同款（/^#{2,3}\s+\S/gm）；软警告起步不阻断；基线缺失即未启用；观测一个周期后再评估升级 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01（归类提议）/ FR-02（classify 命令）/ FR-03（棘轮）；总体方案 A/B/C 节 | 已覆盖 |
| D-002@v1 | FR-04（机械注入）/ FR-05（stats 矩阵）；总体方案 D/E 节；非目标第 1 条（不做硬门禁） | 已覆盖 |

无未解决决策；Design Grill X-001..X-006（P1）与 X-009..X-012（warning）已全部修订入正文，无剩余风险超出 R-01..R-05 登记面。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1、D-002@v1 均入决策追踪表）
- [x] 生命周期关键词核对：不涉及，豁免短语已紧邻「生命周期契约（lifecycle contract）」
- [x] UI 原型分级核对：纯 CLI/prompt 组装变更，无界面变化，跳过原型（step 5 已声明）
- [x] Design Grill 6 项 P1 已修订并经原审查者复核确认 passed（X-001 双格式寻址/X-002 注册锚点 stages/knowledge.js/X-003 requirements FR-01..05 已补齐/X-004 升级既有注入/X-005 keywords+anchor/X-006 定锚 complete-handlers.js）；5 项 warning 全部吸收；原「complete.js vs complete-handlers.js 二选一」存疑已由 X-006 裁决关闭
