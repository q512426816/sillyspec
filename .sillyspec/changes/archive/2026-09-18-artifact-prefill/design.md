---
author: qinyi
created_at: 2026-09-18 23:55:00
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-18-artifact-prefill

## 背景

基线锚批 3 定位：主会话成本第三刀（轮次轴——写作轮次 -10%+产物变薄）。verify-result 的机械预填模式（预填≠结论，agent 逐格复核改写）已验证可行，推广到 design/tasks/taskcard 三产物。白名单槽制（D-001）防假完成雪球。本变更同时是批 1/2 效果的首个实测点（D-004）。

## 设计目标

1. 三生成器（fourpiece-init/design-init/taskcard）骨架阶段即预填白名单槽——agent 从「从零写」变「核对改写」。
2. 预填值带来源标记+门禁注清零校验（预填≠结论）。
3. prefill-refresh 单命令重放（仅白名单槽，人工槽不动）。
4. 本变更全程消费批 1/2 机制，归档对表。

## 非目标

- 非白名单槽（非目标/取舍理由/风险声明正文/goal/acceptance）一律不预填（D-001 红线）。
- 不改 <!--TODO--> 骨架纪律与 decisions/requirements 的 CLI 单一写入方。
- 不做 LLM 预 draft（D-001 否决的 B 方案）。

## 拆分判断

三槽同源（都从 decisions/target_tasks/requirements 机械推导）+共享预填标记协议——单变更完整性单元；prefill-refresh 是同一协议的再执行入口，不拆。

## 总体方案

**Phase 1 预填引擎（新模块 src/prefill.js）**：三个纯函数——prefillFileChangeList({tasksDir})（各 task 卡 target_files 并集，NEW: 前缀保形，design.md 清单形态行）、prefillDecisionTable({changeDir})（decisions.md 的 ## D-xxx@vN 清单 → 决策追踪表行，状态列「待确认」）、prefillCardIds({changeDir})（requirements.md FR-NN 抽取 + decisions 清单 → TaskCard frontmatter requirement_ids/decision_ids）。输出统一带来源行内注「（预填冒号 核对后删本注——字面量分散写防探针自咬）」。

**Phase 2 生成器接线**：fourpiece-init（proposal/requirements 骨架无白名单槽，跳过）；design-init 的决策追踪表段用 prefillDecisionTable（有 decisions.md 时）；taskcard 的 requirement_ids/decision_ids 占位用 prefillCardIds 直填（骨架生成时 tasks/*.md 与 requirements.md 可能尚未全在——按当时在场文件预填，缺则留空数组+提示行）。清单槽：design-init 时 tasks/ 可能不存在（design 先于 task 卡），预填入口移到 plan 阶段 taskcard --all 落盘后——prefill-refresh 承担主通道（D-005 语义）。

**Phase 3 prefill-refresh 命令**：sillyspec prefill-refresh --change <名>——重放三槽预填（仅白名单槽；已含人工内容的槽跳过——检测「预填注已删」即视为确认，不覆盖）；CLI 幂等。

**Phase 4 门禁与对表**：①--done 门禁（brainstorm/plan）对含未删预填注的白名单槽记 warning（不阻断——预填注删除是确认动作，忘了删=未确认提示）；②verify docs-check 型校验：归档前预填注清零（error 级）；③本变更对表数据按 D-004 落 delta 附录。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/prefill.js | 三纯函数+来源注协议+槽检测（已确认跳过判定） |
| 修改 | src/index.js | design-init 决策追踪表接线+taskcard ids 接线+prefill-refresh 命令路由 |
| 修改 | src/run/gates.js | 预填注未删 warning（brainstorm/plan --done 门，advisory） |
| 修改 | src/verify-probes.js | 归档前预填注清零校验（error，挂 --init 探针面） |
| 新增 | NEW:test/prefill.test.mjs | 三槽预填直测+refresh 幂等+已确认跳过+注清零校验 |
| 修改 | docs/sillyspec/cost-baseline-2026-09-18.md | 批 3 对表附录（D-004） |
| 修改 | docs/sillyspec/platform-interface-map.md | execute 评审移交债①：task-02 插入行位移的锚重锚（docs check --fix 机械） |
| 修改 | docs/sillyspec/architecture-4a.md | 同上（机械重锚批） |
| 修改 | docs/sillyspec/file-lifecycle.md | 同上（机械重锚批） |
| 修改 | docs/sillyspec/multi-agent-review-2026-08-08.md | 同上+人工 2 锚（doctor.js 超界裁剪） |
| 修改 | docs/sillyspec/self-audit-2026-08-16.md | 人工 2 锚（stage-contract/verify 行号实线+?） |
| 修改 | docs/sillyspec/prompt-control-debt.md | 机械重锚批（--fix 波及） |
| 修改 | docs/sillyspec/review-2026-08-08.md | 机械重锚批（--fix 波及） |
| 修改 | docs/sillyspec/review-2026-08-09.md | 机械重锚批（--fix 波及） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | prefill.js 登记（lint 覆盖门，module-map 白名单放行） |

数据流向：tasks/*.md target_files + decisions.md + requirements.md → prefill.js 单点推导 → 生成器/refresh 落槽（带注）→ agent 核对删注=确认 → 门禁（advisory→error 梯度）。

## 接口定义

export function prefillFileChangeList({ tasksDir })   // → string[]（design 清单行，NEW: 保形）
export function prefillDecisionTable({ changeDir })   // → string[]（表行，状态=待确认）
export function prefillCardIds({ changeDir })         // → { requirementIds, decisionIds }
export function hasUnconfirmedPrefill(filePath)       // → boolean（预填注在场检测）
export async function runPrefillRefresh({ cwd, specBase, changeName }) // → { filled, skipped, confirmed }

本变更接口面：0 端点（纯函数+CLI 接线+门禁，无 HTTP/RPC——critical 判级零接口面显式声明）

## 生命周期契约表

不涉及 session/lease/daemon/lifecycle——预填是文件级幂等操作，无状态转移。

## 数据模型

无 db schema 变更；无新 runtime 文件（预填直接进产物文件）。

## 兼容策略（brownfield 必填）

- 无 tasks/ 或 decisions.md 时：对应槽预填为空+提示行（现状骨架行为不变）。
- 已确认槽（注已删）：refresh 跳过不覆盖（人工内容保护）。
- 不带 prefill 的旧路径：--done 无新硬门（advisory 而已），零回归。
- 回退：prefill.js 摘除+生成器回 <!--TODO--> 骨架。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 预填值错误（target_files 与实际漂移）误导 agent 确认 | P2 | 来源注明示推导源+核对语义（预填≠结论 D-003）；task 卡变更后 refresh 重放 |
| R-02 | 注删除被忘 → warning 噪音 | P3 | advisory 提示+归档 error 兜底（梯度） |
| R-03 | 生成器接线破坏既有骨架测试 | P2 | 定向回归（fourpiece/design-init/taskcard 测试） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 非目标第一条+Phase 1 三槽定义 | 已落实 |
| D-002@v1 | Phase 2 生成器接线+总体方案 | 已落实 |
| D-003@v1 | Phase 4 门禁梯度+来源注协议 | 已落实 |
| D-004@v1 | Phase 4 对表+文件清单 baseline 附录 | 已落实 |
| D-005@v1 | Phase 3 refresh 命令+已确认跳过 | 已落实 |

无未解决决策；风险挂账 R-01~R-03。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-005 全入）
- [x] 生命周期关键词豁免（表内明示无契约）
- [x] UI 原型分级核对（纯 CLI，跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无）
