---
author: qinyi
created_at: 2026-08-09 04:05:00
---

# 模块影响分析（Module Impact）— 进度库并发安全（sql.js→better-sqlite3 + 废 gate-status）

> 真实变更以 git diff 为准（commit a7f46c2，38 文件）。声明范围见 design.md §6 / plan.md task-01~17。三重交叉（声明/design §6 ∪ task allowed_paths = 真实 git diff）一致。
> _module-map.yaml schema_version=1（无 paths glob），模块归属按架构语义手工映射（modules/runtime.md = 持久化+状态机，modules/worktree.md = worktree+hook，modules/machine-interface.md = gate/derive，modules/cli-entry.md = init/index 路由）。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| runtime（持久化+PM+状态机） | 数据结构变更 + 逻辑变更 + 接口变更 | src/db.js, src/progress.js, src/progress/step-store.js, src/progress/change-registry.js, src/progress/stage-machine.js, src/progress/consistency-doctor.js, src/sync.js | db.js 全量换 better-sqlite3 原生 WAL（删 sql.js 整库 export 模型）；PM 全方法 async→同步，read 不缓存快照；consistency-doctor 新增 detectLostUpdateSignals 对账；sync.js 去 await（H2 隐藏写者消除） | false |
| runtime（阶段状态机 gates/complete） | 逻辑变更 + 调用关系变更 | src/run/command.js, src/run/stage.js, src/run/gates.js, src/run/complete.js, src/run/complete-handlers.js, src/run/quick-audit.js | 主流程写者 await pm.* 去 await（H1 覆盖）；completeStageGates 共享管线接 better-sqlite3 同步 PM | false |
| worktree（worktree+hook） | 逻辑变更 + 接口变更 | src/worktree.js, src/hooks/worktree-guard.js | hook 废 readGateStatus，queryDbFirstCell 子进程改 require better-sqlite3 readonly+fileMustExist 直读 DB，fail-closed warn+null（H3 stale 双源根除）；worktree.js 误导注释清理 | false |
| runtime（doctor 只读诊断） | 逻辑变更 | src/doctor-diagnostics.js | sql.js import 改 better-sqlite3 只读连接（D1 多 db 检测，H4 读写分离：doctor 只读不写） | false |
| machine-interface（gate/derive） | 调用关系变更 | src/machine-interface.js | await pm.* 同步化；§5 只读性断言改语义级（WAL close checkpoint 改写主库） | false |
| cli-entry（init/index 路由） | 逻辑变更 + 配置变更 | src/init.js, src/index.js | init.js RUNTIME_KEEP 删 gate-status.json；index.js PM 调用同步化 + 误导注释清理 | false |
| 配置/构建 | 配置变更 | package.json, package-lock.json, .gitignore, README.md | package.json +better-sqlite3 ^11.x −sql.js；.gitignore +*.db-wal/*.db-shm；README 平台声明 | false |
| docs/skills | 文档变更 | docs/sillyspec/file-lifecycle.md, docs/sillyspec/file-lifecycle/storage-and-state.md, docs/sillyspec/file-lifecycle/worktree-and-guard.md, docs/sillyspec/interface-contract.md, .claude/skills/sillyspec-doctor/SKILL.md | file-lifecycle 全家+interface-contract+doctor SKILL 同步 better-sqlite3 WAL 口径 + 删 gate-status 全部条目 | false |
| 测试 | 新增 + 逻辑变更 | test/db-concurrency.test.mjs（新）, test/worktree-guard-execute-guard.test.mjs（新）, test/consistency-doctor-lost-update.test.mjs（新）, test/db-atomic-write.test.mjs, test/worktree-guard.test.mjs, test/worktree-guard-db-fallback.test.mjs, test/machine-interface.test.mjs, test/quick-session-isolation.test.mjs, test/runtime-cleanup-keeps-worktree.test.mjs, test/enforce-deps-gate-diagnostic.test.mjs | G1 多进程并发无 lost update 回归（800/800×2）；G2 execute 期守卫 fail-closed（10/0）；G3 doctor 对账（5/0）；6 测试重写 better-sqlite3 行为/直读 DB 断言 | false |

## 未匹配文件

| 文件 | 原因 |
|------|------|
| （无） | 38 文件全部映射到上述模块；meta.json（worktree 基础设施）不属本变更交付（apply 已排除 .sillyspec/changes/.runtime/quicklog） |

## 影响汇总

- **核心**：runtime 模块（db.js + PM + 状态机）数据结构/逻辑/接口三重变更——引擎替换强耦合，是本次最大影响面。
- **安全关键**：worktree 模块 hook 改直读 DB fail-closed（H3），execute 期源码写守卫不 fail-open。
- **零破坏兼容**：DB_SCHEMA_VERSION=3 不变，PM 方法名不变仅 async→sync，旧 sillyspec.db 直接 better-sqlite3 打开（D-03/D-04）。
- **删除项**：sql.js 依赖（package.json）、gate-status.json 运行时产物（概念性，双源废除）。
- 全模块 needs_review=false：影响均已通过独立 acceptance 审查（13/13 pass）+ 全量 npm test 143/0 实证确定。
