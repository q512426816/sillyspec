---
author: qinyi
created_at: 2026-08-16T18:22:30+08:00
updated_at: 2026-08-16T18:22:30+08:00
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 维护 agent | 执行本次文档对账（读源码、写文档） |
| 消费 agent | 后续 brainstorm/plan/execute 阶段读 scan 文档与模块卡做上下文 |
| docs gate | pre-push ratchet 校验（共享基线，受并行会话影响） |

## 功能需求

### FR-01: module-map 升 v2 并补录 26 文件归属
覆盖决策：无
Given `_module-map.yaml` 为 schema_version 1（无 paths 字段）且 26 个 6-24 后新增 src 文件无归属
When 按 design 归卡原则（目录前缀 + 源码头注释 + 根级独立子系统新建卡）写入 paths 与模块条目
Then schema_version=2，26 文件每文件至少归属一个模块且卡内有 1-2 行准确描述；`parseModuleMapSimple` 解析出的模块数不减少

### FR-02: propose 多文档回收
Given `stages/propose.js` 已删除且 VALID_STAGES 无 propose，但 5 处文档（ARCHITECTURE/CONCERNS/STRUCTURE/core-engine.md/stages.md）仍描述该阶段
When P1 改卡回收 + P2/P3 刷新 scan 文档
Then grep propose 在 7 份 scan + 全部模块卡中零阶段描述残留（文件名级提及如"移除了 propose"允许）

### FR-03: STRUCTURE 目录树刷新
Given STRUCTURE.md 目录树为 850b485 旧结构（单体 run.js/progress.js、无 src/run/ src/progress/ dispatch/ sillyhub-mcp/）
When P2 按当前实际结构重写目录树
Then 目录树与 `ls src/` 一致：run.js barrel、src/run/ 11 文件、src/progress/ 5 文件、src/dispatch/、src/sillyhub-mcp/、src/stages/ 15 文件、根级文件全列且带一行注释

### FR-04: 剩余 scan 文档核对刷新
Given PROJECT/INTEGRATIONS/TESTING/CONCERNS 停 6-26，ARCHITECTURE/CONVENTIONS 缺新模块段落
When P3 逐份按当前代码核对（含 ARCHITECTURE.md:L99 引用修复）
Then 各文档描述与当前代码一致；frontmatter source_commit/updated_at 更新为对账完成时点

### FR-05: 验证与提交
覆盖决策：D-001@v1
Given 并行会话遗留 5 处 docs-check 失效（不在本清单）
When P4 验证
Then `docs check` 清单内 0 新增失效（存量 5 处登记）；`npm test` 210 文件全绿；提交用显式 pathspec 隔离并行会话暂存文件

## 非功能需求

- 兼容性：10 个 module-map 消费者全走 `parseModuleMapSimple`（已支持 v2+paths），零代码改动
- 可回退：分 Phase 独立提交，每 Phase 一个 commit 可单独 revert
- 可测试：`docs check`（引用有效性）+ `npm test`（无回归）+ grep propose（零残留）三重机械验证
- 约束：对账完成后勿跑 `modules rebuild --force`（会清空补录的 paths，design P4 警告）

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-05 | docs gate 6 失效处置：相对口径 + P3 修 L99 + 5 处留 fail-open 会话 |
