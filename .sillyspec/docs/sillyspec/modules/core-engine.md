---
updated_at: 2026-08-24T00:40:00+08:00
author: qinyi
created_at: 2026-06-01T09:05:00
---

# core-engine
> 最后更新：2026-08-23
> 最近变更：2026-08-23-adopt-harness-practices（knowledge-match 增 decisionHits 防复潮解析 + verify-postcheck skip 真跳过/evidence-auto 推荐）/ 2026-08-16-scan-docs-reconcile（契约/评审族与基础原语补录归属 + propose 回收）/ ql-20260809-003-c88a（#5 next-action 读路径对齐变更根目录 + #6 initChange 用 VALID_STAGES 单一源 + 修正 propose 残留误述）
> 模块路径：src/db.js, src/db-engine.js + 契约/评审族与基础原语（stage-contract 三件、check-primitives、stage-review、task-review、verify-postcheck、review-tier、change-risk-profile、classify-change、contract-matrix、endpoint-extractor、knowledge-match、doctor-diagnostics、fs-atomic、constants、scan-postcheck）；完整清单见 _module-map.yaml core-engine paths。历史正文中的 run.js / progress.js / index.js 章节已分属 runtime / progress / cli-entry 模块卡

## 职责
SillySpec 的核心运行引擎 — 负责数据库存储、进度管理、阶段调度和 CLI 入口。

## 当前设计

core-engine 是 SillySpec 的基础设施层，由三个层次组成：持久化层（DB）、进度管理层（ProgressManager）、调度层（runCommand/index）。

**DB 类**（src/db.js）封装了 better-sqlite3（SQLite 的原生绑定，同步 API）。数据库文件位于 `.sillyspec/.runtime/sillyspec.db`，通过 PRAGMA 配置 journal_mode=WAL（伴随 `.db-wal`/`.db-shm` 侧车）、busy_timeout=5000、foreign_keys=ON、synchronous=NORMAL。better-sqlite3 打开即持久化，DDL/事务提交直接落盘主库，不再有旧 WASM 内存引擎的「全库 load 到内存 → 序列化写回」模型（旧模型是 last-writer-wins lost update 根因，现 WAL 单写者串行 + 应用层 SQLITE_BUSY 有限重试根治）。DB 类提供事务支持（`transaction` 方法，含 BUSY 退避重试），所有写操作通过事务批量提交；`close()` 时 better-sqlite3 自动做 WAL checkpoint 合并 `-wal`/`-shm` 回主库，无需显式 `_save`。`.bak` 损坏回退保留（主库→`.bak`→全新/报错 逐级回退）。

**ProgressManager 类**（src/progress.js）是核心状态管理器，管理项目全局数据和变更级进度。每个变更的进度由 stages 对象表示，每个 stage 包含 steps 数组。VALID_STAGES 定义了 8 个合法阶段：scan, brainstorm, plan, execute, verify, archive, quick, explore（主流程顺序见 MAIN_FLOW_ORDER：brainstorm→plan→execute→verify→archive；propose 阶段已移除——阶段合并进 brainstorm 产出四件套）。ProgressManager 通过 DB 类的 SQLite 后端存储所有状态。

**runCommand 函数**（src/run.js）是 CLI 调度核心，处理参数解析、变更名解析、阶段步骤获取/确保、步骤完成/跳过/重置、自动模式运行等。它通过 stageRegistry 和 auxiliaryStages 从 stages 模块获取阶段定义。

**契约/评审族与基础原语**（根级散文件，2026-08-16-scan-docs-reconcile 补录归属；与 ProgressManager/DB 同层共用）：

- `src/stage-contract.js` — 阶段协议单一来源（允许前置/必须产出/validators），completeStep 后必须过 validator；另导出 detectChangeRisk / checkExecuteCodeEvidence
- `src/stage-contract-spec.js` — 阶段产物字面校验规则的结构化 manifest（单一真相源：validators 消费它判定、prompt 渲染它事前预览，事前==事后同源）
- `src/stage-contract-engine.js` — 产物字面校验通用引擎（消费 spec manifest 按 kind dispatch 产出 errors/warnings；引擎不碰 fs，readFile 由调用方注入）
- `src/check-primitives.js` — 共享产物字面校验原语（纯函数：contains_sections/min_lines/no_placeholder/no_empty_files 全仓单一语义源），workflow 与 stage-contract 两引擎共用
- `src/stage-review.js` — 阶段级审查门（brainstorm/plan/execute-acceptance 的阶段级 review.json 校验：文档证据 reviewedFiles + docHash）
- `src/task-review.js` — execute 每 task 的 review.json 校验（git 代码 diff 证据：base/head）
- `src/verify-postcheck.js` — verify 完成时 CLI 亲自执行 local.yaml 测试命令与 verify-result.md 自报告对账（自报 PASS 但实测失败 → 阻断）；2026-08-23 起 test_strategy 新值接线（D-005@v2）：`resolveTestStrategy` 统一入口（`src/verify-postcheck.js:354`）解析配置策略 + evidence-auto 按 module-impact.md 影响面推荐检查组合（行为→module 聚焦测试、文档/prompt→docs-check、门禁契约→gate；缺失/不可解析降级 module 并注记）；
  skip=真跳过（`src/verify-postcheck.js:1010` mode 'strategy-skip'）——不回退全量、verify 输出显式标注留审计痕迹（R-07），`--done` 对账按 skip 分支放行
- `src/review-tier.js` — 审查分级（self/independent）：plan_level 确定性映射（none/light→self、full→independent），无 plan_level 阶段退文件数启发式；run/gates.js 与 run/prompt.js 消费
- `src/change-risk-profile.js` — 变更风险分级检测（P0 阻塞确认 / P1 记录 / P2 通过，产出 risk-profile.json）
- `src/classify-change.js` — 变更规模分类器（quick/auto/full，供 auto 模式决定内部流程深度）
- `src/contract-matrix.js` / `src/endpoint-extractor.js` — API 契约矩阵生成与注入（provider/consumer 端点提取与 parity check）
- `src/knowledge-match.js` — knowledge 关键词匹配引擎（INDEX.md 条目解析 + 任务上下文匹配生成 hit report）；2026-08-23 起 INDEX `## Decisions` 段路由行进决策匹配（`src/knowledge-match.js:110-155`）：新增 `parseDecisionEntries` 解析 decisions/<域>.md 条目 + `matchKnowledge` 返回值新增 decisionHits——任务上下文命中的 Decisions 路由行所指向文件内全部 D-xxx@vN 条目，rejected 优先排序（防复潮信息最先可见）；matched/entries/report/json 旧四键结构与语义不变，无 decisions 库/路由行未命中 → decisionHits: []，供 brainstorm Step2 防复潮注入（runtime run/prompt.js 消费）
- `src/doctor-diagnostics.js` — 结构化项目自检（平台模式状态分裂检测 D1-D5 + safe_actions 只描述建议动作绝不自动执行，`sillyspec doctor --json`）
- `src/fs-atomic.js` — 原子文件写 + Windows 友好 rename 重试（writeAtomicSync，用于 .runtime/*.json/pointer 等跨进程读文件；sillyspec.db 不走此路）
- `src/constants.js` — 平台状态枚举（manifest/pointer/postcheck/workflow-runs 共享，SillyHub 侧直接用常量值）
- `src/scan-postcheck.js` — CLI 层 scan 完成后强制校验（不依赖 agent 自检报告；平台模式须全过才 success 否则降级）

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
| 2026-08-10 | 2026-08-10-platform-progress-sync | run/shared.js 新增 `triggerPull`/`triggerPullActiveChange`（8s 熔断 SYNC_TOTAL_TIMEOUT_MS、Best Effort console.warn 不抛、未连接/平台模式跳过；activeChange 单活跃自动推导，多/无跳过），CLI 启动（stage case block runCommand 前）+ platform approve 前注入下行拉最新；配套 db.js schema v4（changes 加 last_synced_platform_ts=base_ts 乐观锁 + last_local_modified_ts=本地脏度）+ progress.js `serializeForSync`（六表完整序列化，含 approvals，changes 排除 isolation_*）+ `import`（逆运算事务原子 + 独立 sillyspec.db.pre-import-<ts>.bak，import 后脏度重置 pushed_at D-013）+ 全写入路径 `_touchLocalModified` 脏度（读路径 `run().changes>0` guard 不标脏）。 |
| 2026-08-19 | ql-20260819-014-0082 | 审计 medium 批修（core-engine 侧）：db.js close() 容错（close 抛错仍置 null + warn，防后续操作已损坏句柄）；fs-atomic.js writeAtomicSync tmp 名加随机段（pid 单因子撞 Windows PID 重用）；progress.js revision=0 不再被 falsy 吞（`!= null` 判定） |
| 2026-08-28 | ql-20260828-001-b050 | verify 测试对账通过行误判修复（坑 verify-known-failures-pass-line-false-positive）：partitionFailures 分类前按行首通过标记（✓/√/✔/PASS，剥 ANSI 色码后判定）剔除通过行——PER_TEST_FAIL_RE 的 FAILED/error:/exception 子串会命中用例名恰含这些字样的 vitest 通过行（2710 用例套件 382 个"失败行"中 378 假阳性，known_failures 实质失效）；PER_TEST_FAIL_RE 补 vitest ×(U+00D7) 失败标记；SUMMARY_LINE_RE 补 vitest 无冒号汇总行（Test Files/Tests + 数字）；test/verify-postcheck-known-failures.test.mjs 补 4 组回归 |
| 2026-08-28 | ql-20260828-002-b3fa | 同坑追加（真实全量输出实测）：vitest 控制台捕获噪声另三类剔除——CONSOLE_CAPTURE_RE（stdout/stderr 捕获横幅行，横幅带用例名含 failed 字样）、ENV_NOISE_RE（jsdom `Not implemented:` 警告，i 标志修大写 N 失配）、SUMMARY_LINE_RE 增 Failed Tests 分节头与 ELIFECYCLE 退出横幅；端到端：multi-agent-platform frontend 全量（2710 用例 4 真实失败）失败行 382→15，7 条语义化豁免 remaining=0 |
