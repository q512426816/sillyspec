---
change: 2026-08-11-node-sqlite-migration
stage: archive
step: extract-module-impact
author: qinyi
created_at: 2026-08-11T16:20:00+08:00
---

# 模块影响分析（Module Impact）— db.js 引擎迁移 better-sqlite3→node:sqlite

> 真相源：git diff `2bfae81`（本变更提交）文件清单，对照 design §6 文件变更清单 + tasks/ 任务路径三重交叉验证。_module-map.yaml schema_version=1 无 paths glob，按文件名启发式映射模块。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| runtime | 新增 + 接口变更 + 逻辑变更 | src/db-engine.js（新增）、src/db.js | 新增 db-engine 抽象层（node:sqlite DatabaseSync + 3 缺口 shim）；db.js 换引擎（import/openDatabase/applyPragmas/runTransaction + BUSY errcode 适配），schema v5/title/quicklog_id 保留 | false |
| runtime | 逻辑变更 | src/doctor-diagnostics.js | 两处 new Database（probeDb+dumpDb）迁 openDatabase，pluck→pluckGet/pluckAll，只读 fail-closed 不变 | false |
| worktree | 调用关系变更 | src/hooks/worktree-guard.js | queryDbFirstCell 子进程 require better-sqlite3→node:sqlite（D-003 进程隔离不纳入 db-engine），fail-closed 不变 | false |
| (配置) | 配置变更 | package.json、package-lock.json、.gitignore | clean cut 删 better-sqlite3 + engines>=22.11.0 + version 4.0.0；.gitignore 注释引擎名 | false |
| (文档) | 配置变更（文档同步） | README.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/file-lifecycle/worktree-and-guard.md | better-sqlite3 引用改 node:sqlite + node 版本要求 | false |
| (测试) | 逻辑变更（测试迁移） | test/db-engine.test.mjs（新增）、test/db-atomic-write.test.mjs、test/machine-interface.test.mjs、test/db-concurrency.test.mjs、test/worktree-guard-db-fallback.test.mjs、test/worktree-guard-execute-guard.test.mjs | 新增 db-engine 单测（13 用例）；5 测试迁 node:sqlite DatabaseSync+readOnly 驼峰 / 注释清理 | false |

## 三重交叉验证

- **声明范围**（design §6 文件变更清单 14 文件）：src/db-engine.js / src/db.js / src/doctor-diagnostics.js / src/hooks/worktree-guard.js / package.json / package-lock.json / .gitignore / README.md / docs × 4 / test × 6 —— 与 git diff 一致（design 漏列 dumpDb 第二处，task-05 补；docs storage-and-state.md + sillyhub-progress-sync-contract.md 因并发 dirty 被 apply 排除，需并发会话收尾）。
- **任务范围**（tasks/task-01..10 allowed_paths）：与 git diff 一致。
- **真实变更**（git diff 2bfae81）：以本为准，上表已覆盖全部源码/测试/配置/文档文件。

## 未匹配文件（_module-map schema_version=1 无 paths，按文件名归 runtime/worktree 已覆盖；无遗漏）

- .sillyspec/changes/ 下的 change 文档（proposal/design/plan/tasks/decisions/verify-result/module-impact）属本变更流程产物，非源码模块，不纳入模块矩阵。

## needs_review 汇总

全部模块 needs_review=false：本变更是引擎同类替换，DB wrapper 对外职责与 progress 层调用面字面零改动（G3 实证），无跨模块接口语义变更。
