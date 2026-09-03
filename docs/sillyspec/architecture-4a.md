---
author: qinyi
created_at: 2026-08-14T12:19:38+08:00
updated_at: 2026-08-14T12:19:38+08:00
---

# SillySpec 4A 架构总纲

> 把 SillySpec 当作一个企业架构（EA）实例，用 **4A 框架**（业务 BA / 数据 DA / 应用 AA / 技术 TA）自上而下拆解。
> SillySpec 的"业务"不是企业销售/生产，而是 **「AI Agent 协作下按 spec 流程开发代码」** 这件事——这是整张映射的轴。
>
> **事实源约定**：本文以 `src/` 源码为唯一事实源。凡与旧文档冲突处，以源码为准（已知文档漂移点见 [§8](#8-已知文档漂移点)）。

## 0. 定位

SillySpec 是给 AI Agent 调用的 **CLI 流程状态机**：Agent 通过 CLI 告诉它"我在哪"，它告诉 Agent"下一步做什么"；Agent 执行步骤，它校验产出、推进状态，人类只在关键决策点介入审批。它本身就是一个迷你 EA——把"AI 怎么按流程把代码做对"这件战略目标，自上而下翻译成数据→应用→技术。

| 4A 层 | 回答 | SillySpec 的一句话映射 |
|---|---|---|
| **BA 业务架构** | 做什么 | 流程状态机：10 阶段 + 转换仲裁 + 级联校验门 + 多 change 隔离 |
| **DA 数据架构** | 用什么数据 | `node:sqlite` 进度库（6 表）+ spec 四件套文档资产 |
| **AA 应用架构** | 怎么做 | 8 层模块：CLI 入口 / 调度 run / 状态 progress / 阶段 stages / 判定中枢 / 集成 / 机器接口 / 工具 |
| **TA 技术架构** | 在什么上做 | Node≥22 ESM + `node:sqlite` 内置引擎 + git worktree 隔离 + 跨平台原子写 |

---

## 1. BA 业务架构（做什么）

### 1.1 业务能力（阶段清单）

阶段注册表是单一真相源：`src/stages/index.js:15-26`（`stageRegistry`）。共 **10 个阶段**，主链 5 个 + 辅助 5 个（辅助标记 `src/stages/index.js:13`，清单 `src/stages/index.js:15 stageRegistry（原 constants.js，已迁）`）。

| 阶段 | 核心业务能力 | 步骤数 | 类别 |
|---|---|---|---|
| brainstorm | 探索需求、出方案、写 design.md 并自审/Grill 交叉审查、按 `scale` 分叉产物 | 8 | 主链·起点 |
| plan | 把 design 拆成 Wave 分组 + TaskCard，跑确定性 postcheck | 动态（默认 9） | 主链 |
| execute | 子代理按 Wave 并行实现 + 强制 TDD + 两阶段审查（task review / stage review） | 动态（默认 12） | 主链 |
| verify | 对照 design/模块文档逐项核验 + CLI 实测测试对账 | 7 | 主链 |
| archive | 提取模块影响、同步模块文档、`--confirm` 移动变更目录注销 active | 5 | 主链·终点 |
| scan | 生成 7 份扫描文档 + 模块映射 + 知识库提取 | 11 | 辅助 |
| quick | 跳过完整流程直接改主工作区，CLI 接管 QUICKLOG + 边界审计 | 3 | 辅助·旁路 |
| explore | 只读讨论/调研/画图，不写实现代码 | 1 | 辅助 |
| status | 项目级只读快照（非流程推进） | 3 | 辅助 |
| doctor | 检查配置/构建环境/外部依赖 + 进度一致性修复 | 5 | 辅助 |

> 两个"主流程顺序"常量语义不同（`src/progress/shared.js:22-27`）：`STAGE_ORDER`（含 scan）仅展示顺序；`MAIN_FLOW_ORDER`（不含 scan）用于下游 cascade / 上下游一致性判定。

### 1.2 流程状态机

**转换合法性**由 `checkTransition(fromStage, toStage)` 仲裁（`src/stage-contract.js:874`），契约转换图（`src/stage-contract.js:874`）：

```
brainstorm (allowedFrom:[]) → plan (allowedFrom:[brainstorm])
  → execute (allowedFrom:[plan]) → verify (allowedFrom:[execute])
  → archive (allowedFrom:[verify])
```

规则要点：辅助阶段（除 archive）随时可执行；同阶段可重跑；`scan` 处于 `failed_post_check` 时禁止进入主链下游；变更起始只能进 brainstorm 或辅助阶段。

**推进不是自动的，分三层**：
1. **进入阶段** `runStage`（`src/run/stage.js:30`）→ `checkTransition` → 设 `currentStage`。execute 启动期自动创建 worktree（`stage.js:37`）、固定 `executeRunId`、审批检查。
2. **步骤内推进** `completeStep`（`src/run/complete.js:81`）处理 `--done`：标记 step completed → 找下一个 pending → 无 pending 则进阶段完成分支。
3. **下一步建议** `_getNextSuggestion`（`src/progress/stage-machine.js:444`）按状态机推荐下一阶段命令。

**重开与级联**：`reopenStage`（`src/progress/stage-machine.js:579`）`--reopen --from-step N` 把 N 置 pending、其后置 stale，阶段转 `revising`，并级联把下游主链阶段标 `stale`。

### 1.3 校验门与审批点

按阻断强度排列（`process.exit(1)` = 进程硬阻断；`rollbackCompletionAndReturn` = 回滚阶段状态；advisory = 只打印不阻断）：

| 门 | 触发 | 阻断 | 依据 |
|---|---|---|---|
| 转换门 `checkTransition` | 阶段跳转不符合 allowedFrom / scan failed | `exit(1)` | `src/stage-contract.js:874` |
| WAIT 门 | `--done` output 含等待标记 / step `requiresWait` 未答 | `exit(1)` | `src/run/complete.js:118` |
| execute deps 门 | worktree `depsStatus` 未达标 | step blocked + `exit(1)` | `src/run/gates.js:323` |
| execute review.json 门 | 已勾 task 缺 review.json | step blocked + `exit(1)` | `src/run/gates.js:273` |
| 阶段完成 gate 级联 | 所有 step completed 时跑 | 失败回滚 | `src/run/gates.js:371,628` |
| archive `--confirm` | 归档步缺 `--confirm` | 回退该步 pending | `src/run/complete-handlers.js:262` |
| quick 边界审计 | 命中受保护/危险文件或删除 | BLOCKED `exit(1)` | `src/run/shared.js:497` |

**阶段完成 gate 级联**（`runStageCompletionGates` `src/run/gates.js:523`，统一收尾管线）顺序：
1. `runValidators`（客观产物校验，`src/stage-contract.js:944`）：`validateBrainstormOutputs` / `validatePlanOutputs` / `validateExecuteOutputs`+`checkExecuteCodeEvidence` / `validateVerifyOutputs` / `validateScanOutputs`。
2. verify 实测对账：CLI 亲跑 `local.yaml` 的 `commands.test`，自报告 PASS 但实测失败→阻断（`gates.js:598`）。
3. Plan→Execute Contract（`validatePlanForExecute` `gates.js:701`）。
4. Stage Review Gate（brainstorm/plan/execute，`gates.js:240`）：`classifyReviewTier` 判 tier=self（自审）/independent（强制独立子代理 review.json）。
5. Execute Task Review Gate（`gates.js:527`）：校验所有 task review.json 存在 + verdict 通过 + git 真实性交叉校验。

### 1.4 多 change 隔离

由 `ChangeRegistry`（`src/progress/change-registry.js`）+ SQLite `changes` 表承担：每个 change 独立目录 `.sillyspec/changes/<change>/`；`registerChange`/`unregisterChange`（归档=`status='archived'` 软删除，不复活）；`listChanges` 只列 active；`--change <名>` 是隔离单位，永不重置他人 change。运行时并发协作防护 `detectConcurrentChanges`（`src/run/concurrent-detect.js`）扫他者未提交改动，warn 不阻断。

---

## 2. DA 数据架构（用什么数据）

### 2.1 数据模型（表清单）

权威存储引擎 = **`node:sqlite`（`DatabaseSync` 原生绑定）**，非 better-sqlite3（`src/db-engine.js:8`）。全部 DDL 集中在 `src/db.js` 的 `_createSchema()`（`db.js:207-334`），共 **6 张表 + 4 个索引**：

| 表 | 用途 | 关键列 / 依据 |
|---|---|---|
| `project` | 全局单行（id 恒为 1） | `name` / `schema_version`(=5) / 时间戳 — `db.js:249` |
| `changes` | 变更主表 | `name`(UNIQUE) / `current_stage`(默认 scan) / `status`(active/archived) / 隔离列 / 平台同步戳 / `title`/`quicklog_id` — `db.js:260` + 8 列迁移 |
| `stages` | 阶段行 | `change_id`(FK CASCADE) / `stage` / `status` / `revision` 等重开支持列 — `db.js:265` |
| `steps` | 步骤行 | `stage_id`(FK CASCADE) / `status` / `output` / `ordering` + wait 交互列；**无 UNIQUE**，用 DELETE-then-INSERT UPSERT — `db.js:289` |
| `batch_progress` | 批量任务统计 | `change_id`(UNIQUE) / total/completed/failed/skipped — `db.js:300` |
| `approvals` | 平台审批状态 | `change_id`(UNIQUE) / `status`(默认 not_required)；`read()` 不读此表 — `db.js:304` |

外键级联：`changes` 删 → `stages`/`steps`/`batch_progress`/`approvals` 级联删（`ON DELETE CASCADE`）。

### 2.2 Schema 版本与 Migration

- 当前版本 `DB_SCHEMA_VERSION = 5`（`src/db.js:10`），四处一致性被 `platform-sync-schema.test.mjs` 守卫。
- **版本戳驱动建表**：侧车 `${dbPath}.schema-version` 内容匹配则跳过 `_createSchema`（高频读路径省 DDL 开销，`db.js:75-85`）。
- **Migration**：无独立框架，全部走 `_migrateAddColumn`（`db.js:341`）幂等 `ALTER TABLE ADD COLUMN`；bump 版本戳 → 下次 init 整体重跑。
- 版本线（`src/progress/shared.js:29`）：v1/v2 progress.json → v3 迁 SQLite → v4 平台同步 base_ts/脏度 → v5 title/quicklog_id。

### 2.3 数据治理

- **WAL 单写者 + PRAGMA**（`db.js:64-69`）：`journal_mode=WAL` / `busy_timeout=5000` / `foreign_keys=ON` / `synchronous=NORMAL`。
- **SQLITE_BUSY 双层重试**：引擎层 `busy_timeout=5000` 自动等待 + 应用层 `MAX_BUSY_RETRIES=3` 退避 `[50,100,200]ms`（`db.js:19-20,184-200`），达上限 fail-loud。
- **`.bak` 损坏回退**：`_openWithFallback`（`db.js:99-158`）主库 → `.bak` → 全新/报错 三级回退，绝不静默建空库吞进度。
- **consistency-doctor**（`src/progress/consistency-doctor.js`）：`checkConsistency` 遍历 5 类不变量，`detectLostUpdateSignals` 探 lost-update 间接信号——**只读诊断不写 DB**。
- **import snapshot**（`progress.js:536`）：平台同步 import 前独立 snapshot `sillyspec.db.pre-import-<ts>.bak`，四表重建在单 transaction 内原子完成。

### 2.4 Spec 文档资产（文档即数据）

与 SQLite 结构化进度互补的 markdown/yaml 资产，流转口径见 `docs/sillyspec/file-lifecycle/stage-artifacts.md`：

| 资产 | 产出阶段 | 消费者 | 血缘要点 |
|---|---|---|---|
| `design.md` | brainstorm 第 6 步（frontmatter `scale`） | plan/execute/verify、worktree apply、quick | **多阶段血缘核心**：`change-list.js` 解析文件清单 → worktree-apply allow list |
| `plan.md` | plan 步骤 | `completeStep` 读取 → `buildPlanSteps` 动态插任务步骤 | 解析 `- [ ] task-XX:` 触发动态步骤 |
| `tasks/task-NN.md` | 任务蓝图子代理 | execute 按 Wave 执行；archive | frontmatter `allowed_paths` 是 worktree apply 的 task 级允许路径 |
| `proposal.md`/`requirements.md` | brainstorm 第 8 步（仅 large） | propose/plan/verify | 与 design.md 合称"四件套" |
| `verify-result.md` | verify 末步 | `validateVerifyOutputs` + CLI 实测对账 | **双源对账**：自报告 vs `.runtime/verify-runs/<ts>/test-result.json` |
| `module-impact.md` | archive `extract-module-impact` | archive post-check | **多阶段血缘终点**：plan 首版→execute 更新→verify 核对→archive 终审 |
| scan 文档（7 份） | scan | brainstorm/plan 参考 | ARCHITECTURE/CONVENTIONS/STRUCTURE/INTEGRATIONS/TESTING/CONCERNS/PROJECT |
| QUICKLOG | CLI 接管（`src/quicklog.js`） | 人类对账、DB↔QUICKLOG 反查 | O_EXCL lockfile 串行 + `writeAtomic` 原子覆盖 + >500 行轮转 |

### 2.5 运行时数据目录 `.sillyspec/.runtime/`

`.runtime/` 在 `.gitignore`（`progress.js:7`）。核心文件：`sillyspec.db`（权威库）/ `sillyspec.db-wal`/`-shm`（WAL 侧车）/ `.bak`（损坏回退）/ `.schema-version`（版本戳）/ `user-inputs.md`（用户原话）/ `audit.log`（`--force` 审计）/ `artifacts/`（step output 全文归档）/ `history/`（complete-stage 快照）/ `verify-runs/`（CLI 实测）/ `worktrees/`（worktree 注册名单）/ `execute-runs/<run-id>/tasks/task-XX/review.json`（task review 产物）。

> **`gate-status.json` 已废除**：`src/hooks/worktree-guard.js:8` + `src/progress.js:10` 注释明示，worktree-guard 改为直读 `sillyspec.db`（task-10 后唯一来源）。

---

## 3. AA 应用架构（怎么做）

### 3.1 模块分层（8 层）

| 层 | 代表文件 | 职责 |
|---|---|---|
| **L1 CLI 入口** | `bin/sillyspec.js`、`src/index.js`（巨型 switch 路由） | 进程入口 + 命令路由 |
| **L2 调度内核 run/** | `src/run.js`（barrel）+ `src/run/*.js` | "下一步做什么 + 校验产出 + 推进状态"核心引擎 |
| **L3 状态内核 progress/** | `src/progress.js`（facade）+ `src/progress/*.js` | 进度库读写、状态机、step 存储、change 注册、doctor |
| **L4 阶段定义 stages/** | `src/stages/index.js` + `src/stages/*.js` | 声明式阶段定义 `{name,title,steps[]}` |
| **L5 判定中枢** | `stage-contract*.js`、`stage-review.js`、`review-tier.js`、`knowledge-match.js` | 可复用纯判定函数，被 L2 与 L7 共同消费 |
| **L6 集成层** | `dispatch/`、`sillyhub-mcp/`、`worktree*.js`、`sync.js` | 双后端派发、MCP 客户端、worktree 隔离合并、平台 sync |
| **L7 机器接口** | `src/machine-interface.js` | `gate`/`derive` 无状态只读子命令，输出 envelope JSON 供外部 daemon |
| **L8 工具层** | `fs-atomic.js`、`git-helper.js`、`db.js`、`constants.js` | 跨切面底层原语 |

> W6 重构后 `run.js`（`run.js:5-6（barrel re-export）`）退化为纯 barrel，真正逻辑全在 `run/*.js` 叶子模块；`progress.js`（878 行）是 facade，转发给 4 个子模块（`progress.js:763-956`）。

### 3.2 调度内核（run/）职责

| 职责 | 文件:函数 |
|---|---|
| 命令分发 | `run/command.js:131 runCommand`（解析 flags、cwd 纠正、平台参数恢复） |
| 阶段执行 | `run/stage.js:30 runStage`（转换校验→execute 审批→建 worktree→固定 runId→输出 step prompt） |
| prompt 注入 | `run/prompt.js:136 outputStep`（persona / 全局护栏 / `{{include}}` 模板 / 占位符 / execute 动态块） |
| gate 门控 | `run/gates.js`（deps/review.json 硬门 + `completeStageGates` 级联） |
| complete 流转 | `run/complete.js`（`completeStep:93` / `waitStep:610` / `continueStep:691` / `skipStep:895`） |
| 阶段特化 handler | `run/complete-handlers.js`（archive/plan/scan/workflow/quick/execute 各阶段副作用） |

`completeStep` 标准链序：WAIT 硬校验 → requiresWait 门控 → deps gate → review.json gate → 标记 completed → 阶段特化 handler → execute 批量完成检测 → `completeStageGates`。

### 3.3 集成方式

**dispatch 双后端 —— "派发策略生成器，不是 JS 执行体"**（`dispatch/strategy.js:4-9`）：它**不调任何 tool，只生成注入 prompt 的"派发指令文本"**——因为本机 Agent tool 和 SillyHub MCP tool 都只有 agent 能调，CLI（Node）调不了。后端选择纯由 `probe.available` 驱动（available→sillyhub，否则 local）。execute 三态派发（派发段注入起 `stages/execute.js:594` `getDispatchMode`）：`local`/`local-fallback`/`sillyhub`。回收约定（R-07）：无论哪个后端，worker **绝不 git commit**，SillySpec 主体自己 `git diff` worktree 写 review.json。

**worktree-apply —— 跨仓 task 合并回主干**（`applyWorktree` `src/worktree-apply.js:443` 起，变更文件列表经 `filterDeliverableFiles` `src/worktree-apply.js:55`）：跨仓 task no-op 校验 → meta 校验 → 变更文件列表（`filterDeliverableFiles` 排除 `.sillyspec/`）→ allowList 校验（从 task 卡 `allowed_paths` 读）→ `assessApplyRisk` 风险审计（SAFE/WARNING 自动 apply 到 main）。

**MCP 客户端**（`src/sillyhub-mcp/`）：`config.js` 统一凭据读源（local.yaml mcp 段 > env > null）；`client.js` 封装 `probeDaemon`/`listTools`/`dispatchWorker` 等。

### 3.4 可复用判定中枢（纯函数，双消费）

| 中枢 | 文件 | 判定什么 | 设计要点 |
|---|---|---|---|
| stage-contract（三件套） | `stage-contract-spec.js`（数据源）+ `stage-contract-engine.js:145`（按 kind dispatch）+ `stage-contract.js`（高层封装） | 阶段产物字面校验 + 转换合法性 + execute 代码变更核验 | **"事前给的 == 事后查的"**：prompt 渲染 spec 给 agent 预览，CLI validator 查同一份 spec |
| stage-review | `stage-review.js` | review.json 契约渲染、schema 校验、docHash 防伪、marker 注册 | 治 tier=independent 的 marker 死锁 |
| review-tier | `review-tier.js:45 classifyReviewTier` | 审查分级（self 自审 / independent 独立子代理） | **agent 路径与 gate 路径同函数判定，不信 agent 自报 tier** |
| knowledge-match | `knowledge-match.js:67 matchKnowledge` | 知识库关键词匹配 | 中文子串 + ASCII 词边界（避免 "DB" 命中 "dashboard"） |

### 3.5 接口契约（三种形态并存）

1. **阶段 ↔ 调度**：声明式 JS 对象 + `stageRegistry` 查表（`stages/*.js`）。
2. **dispatch ↔ 后端**：JSDoc typedef + 纯模板函数，无 JSON 协议/无 IPC（`backends/*.js`）。
3. **CLI ↔ 外部 daemon**：envelope JSON 契约（`docs/sillyspec/interface-contract.md` + `machine-interface.js:57 buildEnvelope`），退出码三值（0 通过/1 事实阻断/2 无法核验），**只读语义**（只调 ProgressManager 读路径）。

---

## 4. TA 技术架构（在什么上做）

### 4.1 运行时

- **Node ≥ 22.13.0**（`package.json:16`）——硬性下限因 `node:sqlite` 在 v22.13.0 才移除 `--experimental-sqlite` flag（`src/db-engine.js:5`）。
- **纯 ESM**（`package.json:11` `"type": "module"`），全源文件 `import/export`。
- **入口** `bin/sillyspec.js`（shebang + 一行 `import '../src/index.js'`）。
- `test`/`lint` 均自研纯 Node 脚本（`node test/run-tests.mjs` / `node test/check-syntax.mjs`），不依赖 jest/mocha/eslint。

### 4.2 数据库引擎（node:sqlite，已完成迁移）

从 better-sqlite3（需 node-gyp 编译）/ sql.js（WASM 纯内存）迁移到内置 `node:sqlite`，核心动因是**零原生依赖**。`db-engine.js` 消解三个缺口（`db-engine.js:2-4`）：

| 缺口 | better-sqlite3 | node:sqlite 消解 |
|---|---|---|
| pragma | `.pragma()` | 统一 `db.exec('PRAGMA key=value')`（`applyPragmas`） |
| transaction | `.transaction()` | 手写 `SAVEPOINT/RELEASE/ROLLBACK TO`（`runTransaction`） |
| pluck | `.get()` 可返标量 | `.get()` 返行对象，`Object.values(row)[0]`（`pluckGet`） |

关闭即持久化（`close()` 自动 WAL checkpoint），不需要 sql.js 时代的 `_save()` 整库 export。

### 4.3 Worktree 隔离架构

git worktree 隔离多 Agent 并发改动：每个 change 在 `.sillyspec/.runtime/worktrees/<change>/` 建独立工作区 + 分支 `sillyspec/<change>`（`src/worktree.js:23-25`）。

- **创建**（方法 `worktree.js:360`，类 `worktree.js:286`）：submodule/native-worktree 检测 → gitignore 守卫 → 幽灵 worktree fail-closed → 解析 base → `git worktree add`（失败降级 in-place-fallback）→ 占位 meta 原子写 → dirty baseline overlay（`git diff --binary | git apply`）→ baseline checkpoint commit → 依赖供给 → 写完整 meta。
- **三种 mode**：`worktree`（标准）/ `native-worktree`（外部已 linked）/ `in-place-fallback`（沙箱/权限降级）。
- **cleanup**（`worktree.js:953-1100`）：三重清理 + **fail-closed**（`hasUnappliedChanges` 有未 apply 交付则拒绝，需 `--force`）；**Windows junction 必须先解链**（`worktree.js:867-1050`），否则 `rmSync` 跟随 junction 误删主仓 node_modules。
- **node_modules provision**（`src/worktree-deps.js`）：junction/symlink 快路径（Windows `mklink /J`，POSIX `ln -s`，lockfile 一致才 link）+ install 兜底（`inferInstallCommand` 推断 node/maven/gradle/python/generic）。

### 4.4 跨平台（Win/Linux/macOS）

- **原子写**（`src/fs-atomic.js`）：`writeAtomicSync`（同目录 tmp 含 pid → write → `renameSyncRetry` 覆盖）；`renameSyncRetry`（`:33`）对 `EPERM/EBUSY/EACCES/ENOTEMPTY`（Windows 杀毒/索引/IDE 占用）短退避重试。
- **git 调用统一数组形式**（`src/git-helper.js`）：`execFileSync('git', [...args])` 不经 shell，路径含空格/元字符安全；统一带 `-c safe.directory` + `-C cwd`——跨平台 + 命令注入防御核心。
- **CRLF/路径**：worktree-guard 的 `toPosixPath`/`isPathInside`（`hooks/worktree-guard.js:122-131`）；`_pathToChangeName` 用 `path.relative` 而非 `startsWith`（自动适配平台分隔符 + 跨盘符）。
- **Windows 长路径** `core.longpaths=true`（`worktree.js:454`）。
- **不依赖外部命令**：`sleepMs` 用 busy-wait（Windows cmd 无 `sleep`）；hook 查 DB 用 `node -e` 子进程（Windows 默认无 `sqlite3` CLI）。

### 4.5 依赖栈（`package.json:30-38`）

无 devDependencies（test/lint 自研）。均为运行时依赖：

| 依赖 | 用途 |
|---|---|
| `@inquirer/prompts` | 关键决策点的人类审批交互输入 |
| `chalk` / `ora` | 终端彩色输出 / spinner（长 git/install 进度反馈） |
| `chokidar` | 文件监听（watch/sync） |
| `js-yaml` | YAML 解析（tasks.md / design.md / local.yaml） |
| `open` | 打开浏览器/URL（homepage/dashboard） |
| `ws` | WebSocket（SillyHub MCP / watch 推送） |

> 注：`local.yaml` 在 worktree-deps / worktree-guard 里用轻量手写正则解析，**刻意不引 js-yaml**（减少依赖层级）。

### 4.6 并发与门禁

- **DB 并发**：WAL 单写者 + 引擎 `busy_timeout=5000` + 应用层 3 次退避；读不阻塞写（WAL），hook 子进程 readOnly 打开可并发读。
- **`.husky/pre-push`**：push 前强制 `npm run lint` + `npm test`，任一失败 exit 1 阻断。
- **`worktree-guard` hook**（`src/hooks/worktree-guard.js`）：Claude Code 写入/命令门禁，三重门 `stageGate × locationGate × fileGate`——直读 `sillyspec.db` 的 `current_stage`（`node -e` 子进程）；非 execute/quick 阶段禁源码写入；execute 只允许在已注册 worktree 内写；Bash 危险黑名单 + 管道拆分防绕过；fail-closed（DB 不存在/查询失败走严格拦截）。

---

## 5. 驱动链路（自上而下驱动 / 自下而上支撑）

```
战略：AI 严格按 spec 流程产出可校验代码，人类只在关键点审批
  │
  ▼ 驱动（需要哪些能力）
BA  10 阶段状态机 · checkTransition 仲裁 · completeStageGates 级联 · 多 change 隔离
  │
  ▼ 驱动（每能力依赖什么状态/产物）
DA  node:sqlite 进度库(6 表) · spec 四件套文档资产 · module-impact 多阶段血缘
  │
  ▼ 指导（能力由哪些模块实现）
AA  stages/* 定义 · run/* 调度 · progress/* 状态机 · dispatch 集成 · 判定中枢
  │
  ▼ 支撑
TA  Node22 ESM · node:sqlite(WAL) · git worktree · 跨平台 fs-atomic · husky/worktree-guard 门禁
```

自下而上也成立：**TA 的 worktree+WAL** 撑起 **AA 的 dispatch/apply**，**AA 的 progress 内核**撑起 **DA 的状态一致性**，**DA 的进度库**让 **BA 的状态机能"记住你在哪"**——抽掉底层，业务流程就退化成口头约定。

---

## 6. 概念对照（4A 术语 → SillySpec 实例）

| 4A 术语 | SillySpec 实例 |
|---|---|
| 业务能力地图 | `src/stages/index.js` 的 `stageRegistry` |
| 业务流程（端到端） | 状态机 `brainstorm→plan→execute→verify→archive` |
| 业务-IT 对齐 | spec 文档（意图）↔ 落盘代码（实现）的对账 |
| 主数据（黄金记录） | `sillyspec.db` 的 `changes`/`stages`/`steps` 行 |
| 数据治理 | WAL/BUSY 退避/.bak 回退/consistency-doctor |
| 数据资产 | spec 四件套 + scan 文档 + QUICKLOG |
| 应用 / 功能模块 | `src/stages/*.js` 各阶段定义 |
| 应用集成 | dispatch 双后端 + worktree-apply + MCP |
| 服务化 / 能力中心 | review-tier / stage-review / contract / knowledge 判定中枢 |
| 接口契约 | `interface-contract.md` envelope JSON |
| 基础设施 | Node 运行时 + git worktree + 文件系统 |
| 安全架构 | worktree-guard 三重门 + husky pre-push + fail-closed |
| 避免"技术债" | `validateExecuteOutputs`+`checkExecuteCodeEvidence`（plan 有 task 却零变更即阻断） |
| 消除"信息孤岛" | `module-impact.md` 活文档 + change-registry 跨 change 关联 |
| TOGAF / ADM | dogfood 自管：维护 SillySpec 自己也走 `brainstorm→...→archive`，`docs/sillyspec/` 即架构资产库 |
| 中台（能力沉淀） | 判定中枢（review-tier/stage-review/contract/knowledge） |

---

## 7. 关键设计特征

1. **dispatch 不执行只渲染**（`dispatch/strategy.js:4-9`）——AA 最反直觉的设计：派发逻辑是 prompt 文本生成器，tool 调用由 agent 执行。这让 dispatch 可纯函数测试、零进程间耦合。
2. **判定中枢双消费同源**——`runValidators`/`checkTransition`/`classifyReviewTier` 同时被 `run/`（agent 走）和 `machine-interface.js`（daemon 走）调用，是"判定不分裂"的架构保证。
3. **spec manifest 单一真相源**（`stage-contract-spec.js`）——prompt 预览与 CLI 校验同源，杜绝"prompt 说 A、CLI 查 B"。
4. **dogfood + TOGAF 式自管**——SillySpec 用自己的流程迭代自己，`docs/sillyspec/` 即其 ADM 架构资产库，天然带架构开发循环。

---

## 8. 已知文档漂移点

落盘时已校正（以源码为准），列出供后续同步：

| 漂移点 | 旧文档措辞 | 源码事实 | 校正依据 |
|---|---|---|---|
| 存储引擎 | `docs/sillyspec/file-lifecycle/storage-and-state.md:35` 写"better-sqlite3 原生绑定" | 已迁 `node:sqlite` | `src/db-engine.js:8` |
| propose 阶段 | `docs/sillyspec/file-lifecycle.md` 阶段表残留 `propose | 7` 行 | 无独立 propose 阶段（已并入 brainstorm） | `src/stages/index.js:15-26`（10 阶段，无 propose） |
| scan 步骤数 | `stage-artifacts.md` 写 scan 10 步 | scan 11 步 | `src/stages/scan.js` |
| `.bak` 主动写时机 | `db.js:96`/`progress.js:743` 注释称"写前自动备份为 .bak" | `_write`/`transaction` 路径未见主动 copy 到主 `.bak`（主 `.bak` 实际由 `_openWithFallback` 恢复时使用 + import 的 `.pre-import-*.bak` 产生） | 已订正（见 ql-20260814-003）：4 处描述统一为「node:sqlite 提交即持久化、`.bak` 恢复是向后兼容兜底」 |
