---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# core-engine
> 最后更新：2026-08-09
> 最近变更：ql-20260809-003-c88a（#5 next-action 读路径对齐变更根目录 + #6 initChange 用 VALID_STAGES 单一源 + 修正 propose 残留误述）
> 模块路径：src/run.js, src/index.js, src/progress.js, src/db.js

## 职责
SillySpec 的核心运行引擎 — 负责数据库存储、进度管理、阶段调度和 CLI 入口。

## 当前设计

core-engine 是 SillySpec 的基础设施层，由三个层次组成：持久化层（DB）、进度管理层（ProgressManager）、调度层（runCommand/index）。

**DB 类**（src/db.js）封装了 better-sqlite3（SQLite 的原生绑定，同步 API）。数据库文件位于 `.sillyspec/.runtime/sillyspec.db`，通过 PRAGMA 配置 journal_mode=WAL（伴随 `.db-wal`/`.db-shm` 侧车）、busy_timeout=5000、foreign_keys=ON、synchronous=NORMAL。better-sqlite3 打开即持久化，DDL/事务提交直接落盘主库，不再有旧 WASM 内存引擎的「全库 load 到内存 → 序列化写回」模型（旧模型是 last-writer-wins lost update 根因，现 WAL 单写者串行 + 应用层 SQLITE_BUSY 有限重试根治）。DB 类提供事务支持（`transaction` 方法，含 BUSY 退避重试），所有写操作通过事务批量提交；`close()` 时 better-sqlite3 自动做 WAL checkpoint 合并 `-wal`/`-shm` 回主库，无需显式 `_save`。`.bak` 损坏回退保留（主库→`.bak`→全新/报错 逐级回退）。

**ProgressManager 类**（src/progress.js）是核心状态管理器，管理项目全局数据和变更级进度。每个变更的进度由 stages 对象表示，每个 stage 包含 steps 数组。VALID_STAGES 定义了 8 个合法阶段：scan, brainstorm, plan, execute, verify, archive, quick, explore（主流程顺序见 MAIN_FLOW_ORDER：brainstorm→plan→execute→verify→archive；propose 仅作 knowledge 阶段子命令，非流程阶段）。ProgressManager 通过 DB 类的 SQLite 后端存储所有状态。

**runCommand 函数**（src/run.js）是 CLI 调度核心，处理参数解析、变更名解析、阶段步骤获取/确保、步骤完成/跳过/重置、自动模式运行等。它通过 stageRegistry 和 auxiliaryStages 从 stages 模块获取阶段定义。

## 对外接口（表格）

### src/db.js — DB 类
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `DB` (class) | SQLite 数据库封装 | `constructor(dbPath)` |
| `DB.init()` | 同步初始化（better-sqlite3 同步打开/创建库、设 PRAGMA、按 schema 版本戳建表；主库→.bak→全新 逐级回退） | — |
| `DB.close()` | 关闭连接（better-sqlite3 close 自动 WAL checkpoint 合并 -wal/-shm 回主库，无需显式 _save） | — |
| `DB.transaction(fn)` | 原生事务（自动 BEGIN/COMMIT/ROLLBACK，fn 抛错自动回滚不吞错）+ SQLITE_BUSY 应用层有限重试（3 次退避） | `fn(sqlDb)` |
| `DB.getDb()` | 返回底层 better-sqlite3 Database 实例（供 progress.js 直接 prepare/run） | — |

### src/progress.js — ProgressManager 类
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `ProgressManager` (class) | 进度状态管理器 | `constructor()` |
| `ProgressManager.init(cwd)` | 初始化项目级数据库和目录结构 | `cwd` |
| `ProgressManager.initChange(cwd, changeName)` | 初始化变更级数据 | `cwd, changeName` |
| `ProgressManager.read(cwd, changeName?)` | 读取变更进度 | `cwd, changeName?` |
| `ProgressManager._write(cwd, data, changeName?)` | 写入变更进度 | `cwd, data, changeName?` |
| `ProgressManager.readGlobal(cwd)` | 读取全局数据 | `cwd` |
| `ProgressManager.listChanges(cwd)` | 列出所有活跃变更 | `cwd` |
| `ProgressManager.registerChange(cwd, changeName)` | 注册新变更 | `cwd, changeName` |
| `ProgressManager.unregisterChange(cwd, changeName)` | 注销变更 | `cwd, changeName` |
| `ProgressManager.setStage(cwd, stage, changeName?)` | 切换当前阶段 | `cwd, stage, changeName?` |
| `ProgressManager.addStep(cwd, stage, stepName, changeName?)` | 添加步骤 | `cwd, stage, stepName, changeName?` |
| `ProgressManager.updateStep(cwd, stage, stepName, options, changeName?)` | 更新步骤状态 | `cwd, stage, stepName, {status, output, input?}, changeName?` |
| `ProgressManager.completeStage(cwd, stage, changeName?)` | 标记阶段完成（含历史快照） | `cwd, stage, changeName?` |
| `ProgressManager.show(cwd, changeName?)` | 显示变更进度详情 | `cwd, changeName?` |
| `ProgressManager.status(cwd, changeName?)` | 获取进度状态摘要 | `cwd, changeName?` |
| `ProgressManager.validate(cwd, changeName?)` | 校验进度数据完整性 | `cwd, changeName?` |
| `ProgressManager.reset(cwd, stage, changeName?)` | 重置指定阶段 | `cwd, stage, changeName?` |
| `ProgressManager.updateBatchProgress(cwd, batchData, changeName?)` | 批量更新进度 | `cwd, batchData, changeName?` |
| `ProgressManager.readBatchProgress(cwd, changeName?)` | 读取批量进度 | `cwd, changeName?` |

### src/run.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `runCommand(args, cwd)` | CLI 主入口 — 参数解析、调度阶段运行 | `args: string[], cwd: string` |

### src/index.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `main()` | CLI 顶层入口 — 解析命令行参数、分发子命令 | — |

## 关键数据流

1. **CLI 入口流**: main() (index.js) → runCommand(args, cwd) (run.js) → ProgressManager → DB → SQLite 文件
2. **阶段运行流**: runCommand → resolveChangeName → ensureStageSteps → runStage → outputStep(输出 prompt) → completeStep → ProgressManager.updateStep
3. **自动模式流**: runAutoMode → 按 MAIN_FLOW_ORDER（brainstorm→plan→execute→verify→archive）自动推进阶段，每个阶段内按步骤顺序执行；brainstorm→plan 衔接由变更根目录 next-action.json 的 has_blocking_questions 门控（true 则 wait 用户回答阻塞问题）
4. **进度持久化**: ProgressManager 的所有写操作通过 DB.transaction 批量提交到 SQLite，数据库文件在 `.sillyspec/.runtime/sillyspec.db`

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 使用 better-sqlite3（原生 SQLite 绑定）而非旧 WASM 内存引擎 | 原生绑定直连 SQLite，WAL 真生效（WASM 纯内存库 WAL 无意义）；事务提交即持久化，消除全库 export/load 的 last-writer-wins lost update 根因 | WASM 内存库（零原生依赖但纯内存，需全库 export 落盘） |
| 同步 API（非 async）用于数据库操作 | better-sqlite3 是同步原生绑定；PM 核心读写方法已同步化，read 每次查最新不缓存快照 | 异步 ORM |
| VALID_STAGES 硬编码为常量 | 阶段固定且与 stageRegistry 一一对应 | 配置文件驱动 |
| 进度快照写入 history 目录 | 便于回溯和调试 | 仅保留当前状态 |
| 双层目录结构 (.runtime + changes) | 运行时数据与变更数据隔离 | 扁平结构 |

## 依赖关系
- 内部依赖：src/stages/index.js（stageRegistry, auxiliaryStages）、src/stages/execute.js（buildExecuteSteps）、src/stages/plan.js（buildPlanSteps）、src/init.js（cmdInit, getVersion）
- 外部依赖：better-sqlite3、fs、path

## 注意事项
- DB 类使用同步 API；better-sqlite3 事务提交即落盘主库（WAL），close() 负责 WAL checkpoint 合并 -wal/-shm 回主库并释放连接（不再需要旧 WASM 引擎时代的显式 _save）
- ProgressManager 的方法大多接受 `changeName = null`，null 表示使用 currentChange
- VALID_STAGES 必须与 stageRegistry 的 key 保持一致
- runCommand 中的 resolveChangeName 有多级回退：显式指定 > progress.currentChange > 自动检测
- 自动模式 (runAutoMode) 按 MAIN_FLOW_ORDER（brainstorm→plan→execute→verify→archive）顺序推进，跳过已完成的阶段
- quick 守卫（`auditQuickCompletion`）：step 1 记录 baselineFiles（预存脏文件），`--done` 审计时排除它们；quick 自身写入的 `.sillyspec/` 元数据（quicklog/.runtime/modules/_module-map）由 `isQuickMetadata` 精确豁免。`--force-baseline`（覆盖受保护/危险文件如 src/run.js）/`--allow-new`（允许新增）在 step 1 持久化进 guard.json，也可在 `--done` 时传入（与持久化值取或）

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-07-13 | ql-20260713-002-7628 | quick 守卫两修复：(1) baseline 录入去掉 `.sillyspec/` 粗过滤，预存 untracked `.sillyspec/changes/` 不再被误判危险/新增；(2) `--done` 的 `--force-baseline`/`--allow-new` 并入 guard（原只传 `{isConfirm}` 致 flag 静默无效），并修正审计复审误导文案 |
| 2026-08-09 | 2026-08-08-progress-db-concurrency | DB 引擎换 better-sqlite3 原生 WAL 绑定（删全库 export/load 到内存模型，PM 核心读写同步化、read 取最新不缓存）；废阶段状态缓存文件双源，hook 改 queryDbFirstCell 直读 DB readonly 子进程 fail-closed |
| 2026-08-09 | ql-20260809-003-c88a | #5 command.js:1115 next-action.json 读路径 brainstorm/→变更根目录（self-audit#3 漏改的读端，还回 has_blocking_questions 门控）；#6 progress.js:563 initChange allStages 改用 VALID_STAGES 单一源；顺带修正 core-engine.md propose 阶段残留误述（VALID_STAGES 实为 8 个、auto 流程无 propose） |
