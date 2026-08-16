---
author: qinyi
created_at: 2026-08-16T17:14:31+08:00
updated_at: 2026-08-16T17:14:31+08:00
scale: large
status: draft
---

# Design：scan 文档对账（2026-08-16-scan-docs-reconcile）

## 背景与动机

scan 快照停 850b485（2026-06-24），期间源码推进 400+ commit（审查时实测 408，执行以实跑为准）：W6 重构拆出 `src/run/`（11 文件）与 `src/progress/`（5 文件）、新增 dispatch/sillyhub-mcp 子系统与 docs 一致性四件等。文档漂移三类实证：

- **缺文档**：26 个 src 文件未被任何 scan 文档/模块卡提及（`git diff --name-status 850b485..HEAD` 对照 grep 实证）
- **多文档**：`stages/propose.js` 已删除且 propose 已从 VALID_STAGES 移除，但 5 处文档仍描述该阶段（ARCHITECTURE/CONCERNS/STRUCTURE/core-engine.md/stages.md）
- **过时**：STRUCTURE.md 目录树仍是单体 run.js/progress.js 旧结构；PROJECT/INTEGRATIONS/TESTING/CONCERNS 停 6-26

用户裁决（step3/4/5）：边界=全量对账 7 份 scan；方式=方案 A 分批定点对账（CLI diff 清单驱动，省 token）；`_module-map` 顺手升 v2 加 paths。

## 设计目标

1. 7 份 scan 快照 + 模块卡 + `_module-map.yaml` 与当前代码一致（缺补、多收、过时刷）
2. 定点补写：只读清单命中文件，不重扫全仓；token 总量 ≤60k
3. docs-check 相对口径（D-001@v1）：本 change 不新增失效（存量 6 处为并行会话 3fd0e7d 改 command.js 行号漂移遗留——5 处在 prompt-control-debt.md/self-audit-2026-08-16.md 不在本清单，留给该会话清偿；1 处 ARCHITECTURE.md:L99 在 P3 顺手修复）；npm test 无回归（当前实测 210 文件全绿）

## 非目标（Non-Goals）

- 不做 scan/模块卡双轨合并（D-7 方案 C，已裁决暂不做）
- 不改 src/ 任何源码（纯文档变更；modules.js 已支持 v2+paths，无需代码改动）
- 不重跑 `scan --force-rescan` 全量生成
- 不刷新 `docs/sillyspec/scan/` 旧副本（platform 模式实际消费 `.sillyspec/docs/sillyspec/scan/`）

## 总体方案（四阶段）

### P1：module-map 升 v2 + 模块卡补录（~20k token）
- `_module-map.yaml` schema v1→v2：每模块加 `paths` 字段，26 个新文件按归属写入；worktree 卡 review_reasons 里"待升 v2 补录 git-helper.js"顺势闭环
- 新建模块卡 `progress`（progress.js facade + src/progress/ 5 文件）
- docs 一致性四件（docs-check/docs-gate/docs-debt/scan-staleness）新建 `docs-consistency` 卡（与 dispatch/sillyhub-mcp 同级的独立子系统，塞 core-engine 会稀释该卡职责）
- 回收 propose：core-engine.md / stages.md 移除 propose 描述；scan 文档中的 propose 描述在 P2/P3 顺带回收
- 每文件 1-2 行描述，读源码头部注释写，不臆测

### P2：STRUCTURE.md 目录树刷新（~10k）
- 目录树更新为当前 src/ 实际结构：run.js barrel + src/run/ 9 模块 + src/progress/ 5 文件 + src/dispatch/ + src/sillyhub-mcp/ + src/stages/ 15 文件 + 根级文件全列
- 移除 propose.js 条目

### P3：剩余 scan 文档核对（~20k）
- ARCHITECTURE/CONVENTIONS（今晨已修引用）：补新模块段落（dispatch/sillyhub-mcp/progress/docs-consistency）
- PROJECT/INTEGRATIONS/TESTING/CONCERNS（停 6-26）：逐份按当前代码核对刷新
- 各文档顺带移除 propose 残留描述

### P4：验证 + 提交（~5k）
- `docs check`（不新增失效：存量 5 处并行遗留 + 清单内 ARCHITECTURE.md:L99 已修）、`npm test`（实测基线 210 文件无回归）、显式 pathspec 提交（隔离并行会话 state-machine-fail-open 的暂存文件）
- ⚠️ 对账完成后**勿跑 `modules rebuild --force`**：rebuildModuleMap 解析现有 map 时 paths 恒初始化空数组不回读（modules.js:100），会清空刚补录的 v2 paths 字段

## 文件变更清单

| 文件 | 动作 | 说明 |
|---|---|---|
| .sillyspec/docs/sillyspec/modules/_module-map.yaml | 修改 | v1→v2 + paths 补录 26 文件归属 |
| .sillyspec/docs/sillyspec/modules/progress.md | 新增 | progress 模块卡 |
| .sillyspec/docs/sillyspec/modules/docs-consistency.md | 新增 | docs 一致性四件卡 |
| .sillyspec/docs/sillyspec/modules/core-engine.md | 修改 | 回收 propose |
| .sillyspec/docs/sillyspec/modules/stages.md | 修改 | 回收 propose + 补 brainstorm-auto/knowledge |
| .sillyspec/docs/sillyspec/modules/runtime.md | 修改 | 补 quick-audit/scan-profile 等归属 |
| .sillyspec/docs/sillyspec/modules/worktree.md | 修改 | needs_review 闭环（git-helper 补录） |
| .sillyspec/docs/sillyspec/scan/STRUCTURE.md | 修改 | 目录树刷新 + 移除 propose |
| .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md | 修改 | 补新模块段落 + 移除 propose |
| .sillyspec/docs/sillyspec/scan/CONVENTIONS.md | 修改 | 核对补充 |
| .sillyspec/docs/sillyspec/scan/PROJECT.md | 修改 | 按当前代码核对 |
| .sillyspec/docs/sillyspec/scan/INTEGRATIONS.md | 修改 | 按当前代码核对 |
| .sillyspec/docs/sillyspec/scan/TESTING.md | 修改 | 按当前代码核对 |
| .sillyspec/docs/sillyspec/scan/CONCERNS.md | 修改 | 按当前代码核对 |

## 兼容策略

- **module-map v2**：10 个消费者（docs-debt/index/modules/complete-handlers/prompt/shared/stage/archive/brainstorm-auto/brainstorm）全走 `parseModuleMapSimple`，已支持 paths 字段解析（src/modules.js:317/326）；生成器 rebuild 输出 schema_version: 2（src/modules.js:121）——纯数据升级，零代码改动
- **scan 文档 frontmatter**：`source_commit` 更新为对账完成时的 HEAD，`updated_at` 同步；ARCHITECTURE 等今晨修过引用的文档内容已较新，只做增量补充不重写

## 风险登记

| 风险 | 等级 | 缓解 |
|---|---|---|
| 26 文件归属判断错误（根级文件归属歧义） | 中 | 读源码头部注释定归属；拿不准的文件在卡内标注"暂归"并在 design 记录 |
| docs-check 新增引用失效 | 低 | P4 全量 docs check 兜底；写引用时对照源码行号 |
| 并行会话 state-machine-fail-open 同期改 stages/runtime 相关文件 | 中 | 只动 .sillyspec/docs/（该会话动 src/），无接触面；提交用显式 pathspec |
| token 超预算 | 低 | 分 Phase 独立提交，每 Phase 后核对；超 60k 即停并报告 |

## 自审（Self-Review）

- ✅ 边界与用户三轮裁决一致（全量对账/方案A/四阶段确认）
- ✅ v2 兼容性有代码级证据（modules.js:121 生成 v2、:317/326 解析 paths、消费者清单 grep 实证）
- ✅ propose 回收点完整（grep 实证 5 处全覆盖）
- ⚠️ 26 文件归卡明细在 plan 阶段逐文件定（design 定原则：读源码头注释、根级独立子系统新建卡、其余按目录前缀归卡）
- ✅ 生命周期契约：不涉及生命周期契约（纯文档对账，无状态流转/事件/契约变更）
