---
author: flow-machine-draft
created_at: 2026-10-10T03:18:39.119Z
---
# 提案书（Proposal）— 2026-10-10-worktree-salvage-archive-aware

## 动机

任务原话转写：worktree 清理前的 spec 产物打捞（_salvageSpecArtifacts，坑 worktree-spec-artifact-misplace）只对比主仓 changes/<name>/ 原路径是否存在，不感知归档搬运。归档流程先 runArchiveChain renameSyncRetry 把变更目录移入 changes/archive/ 再调 archiveWorktreeCleanup → cleanup → 打捞（src/run/complete-handlers.js:973→1187），此刻原路径整体不存在，worktree 内旧快照被整批判定「主仓缺失」复制回原路径，复活出已归档变更的旧版目录并滞留 git 跟踪（下游实证：2026-10-09-attachment-inline-reference 残留 13 文件，人工删除收尾）。同类触发面共五条入口：归档正常路径、归档自愈路径（src/run/complete-handlers.js:1158）、doctor 已归档清理（src/worktree.js:1802）、无 meta 孤儿 force 兜底（src/run/complete-handlers.js:352）、事后手动 worktree cleanup。打捞逻辑当前零测试覆盖。

成功标准：
- 归档态清理：主仓 changes/archive/<name>/ 已有对应文件时，打捞逐文件跳过不复制，changes/<name>/ 原路径不复活（目录不重建），结束后一行 warn 说明跳过数与原因
- 未归档态行为不变：worktree 独有产物（原路径缺）照捞；原路径同名不同内容照旧仅列冲突清单不覆盖
- 原路径与 archive 均缺的真独有产物仍照捞（坑 worktree-spec-artifact-misplace 不回归）
- 新增测试覆盖上述三态；触及 src 的实测全绿（本变更测试 ∪ 关联回归）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 归档态清理：主仓 changes/archive/<name>/ 已有对应文件时，打捞逐文件跳过不复制，changes/<name>/ 原路径不复活（目录不重建），结束后一行 warn 说明跳过数与原因
2. 未归档态行为不变：worktree 独有产物（原路径缺）照捞；原路径同名不同内容照旧仅列冲突清单不覆盖
3. 原路径与 archive 均缺的真独有产物仍照捞（坑 worktree-spec-artifact-misplace 不回归）
4. 新增测试覆盖上述三态；触及 src 的实测全绿（本变更测试 ∪ 关联回归）

## 成功标准（可验证）

1. 归档态清理：主仓 changes/archive/<name>/ 已有对应文件时，打捞逐文件跳过不复制，changes/<name>/ 原路径不复活（目录不重建），结束后一行 warn 说明跳过数与原因
2. 未归档态行为不变：worktree 独有产物（原路径缺）照捞；原路径同名不同内容照旧仅列冲突清单不覆盖
3. 原路径与 archive 均缺的真独有产物仍照捞（坑 worktree-spec-artifact-misplace 不回归）
4. 新增测试覆盖上述三态；触及 src 的实测全绿（本变更测试 ∪ 关联回归）
