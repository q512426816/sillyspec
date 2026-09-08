---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-09-08
---

# 存储与状态

## Runtime 目录

`.sillyspec/.runtime/` 是当前实现的运行时目录，`init.js` 和 `ProgressManager._ensureRuntimeDir()` 会创建：

```text
.sillyspec/.runtime/
├── sillyspec.db
├── sillyspec.db.pre-import-<ts>.bak  (import 前全库快照，滚动只留最新 1 份，见下)
├── user-inputs.md
├── platform-scan.json            (平台 scan 参数暂存)
├── scan-projects.json            (scan step 2 后的项目展开状态)
├── audit.log                     (--force 绕过校验的审计记录，JSONL)
├── sync-noise-mute.json          (平台连接类失败噪音闸窗口 marker，成功即清，见 sync 模块卡)
├── spec-sync-follow-reported.json (follower/stale 集合去重 marker，集合变化才重报)
├── artifacts/                    (超长步骤输出存档，写入侧滚动保留最新 100 份)
├── history/
├── logs/
├── templates/
├── verify-runs/                  (verify 阶段 CLI 实测测试结果)
├── workflow-runs/                (workflow check 归档，写入侧滚动保留最新 30 份)
├── doctor-dumps/                 (孤儿库诊断 dump，写入侧滚动保留最新 5 份)
└── worktrees/
```

`.runtime/` 在 `.gitignore` 中，默认不进入版本控制。

## `sillyspec.db`

位置：`.sillyspec/.runtime/sillyspec.db`

创建方：`ProgressManager._ensureDB()` 使用 `src/db.js` 的 `DB.init()`。底层是 **`node:sqlite`（`DatabaseSync` 原生绑定）**（同步 API），打开即持久化——`init()` 一次性设置 PRAGMA：`journal_mode=WAL` + `busy_timeout=5000` + `foreign_keys=ON` + `synchronous=NORMAL`。事务经 `DB.transaction(fn)` 包装，提交直接写主库文件 `sillyspec.db` + WAL 侧车 `.db-wal`/`.db-shm`。主库损坏/为空/不存在时 `_openWithFallback` 尝试从 `sillyspec.db.bak` 恢复（copy 回主库），两者均不可用则 fail-loud。**注：node:sqlite 提交即持久化，不再像 sql.js 时代写前备份主 `.bak`；`.bak` 恢复是向后兼容兜底，仅对 sql.js 时代遗留的 `.bak` 生效，全新项目不产生主 `.bak`。**WAL 单写者串行 + SQLITE_BUSY 应用层有限重试（3 次递增退避 50→100→200ms，达上限 fail-loud），并发安全不丢更新。

当前 DDL 包含：

| 表 | 用途 |
|---|---|
| `project` | 项目名、schema version、创建/更新时间 |
| `changes` | 变更名、当前阶段、活跃/归档状态、`no_worktree`、平台同步字段、隔离状态字段、`title`/`quicklog_id`（quick-<hex> 的中文标题 + QUICKLOG ql-ID 关联，2026-08-11 加） |
| `stages` | 每个 change 的阶段状态 |
| `steps` | 每个 stage 的步骤状态和输出摘要 |
| `batch_progress` | 批量任务统计 |
| `approvals` | 平台审批状态 |

`progress.js`（W6 Step9 后为 facade，逻辑在 `src/progress/*.js` 子模块；persistence-core `read`/`_write` 留 facade 本体）通过 SQL 读写这些表，并组装成兼容旧 progress 格式的 JS 对象。进度数据仅存储在 SQLite 数据库中，不再使用 progress.json 文件。

注意：DB schema 版本号四处一致 = `5`（`db.js` 的 `DB_SCHEMA_VERSION` / `project.schema_version` DDL DEFAULT / `CURRENT_VERSION`（W6 Step9d 抽到 `src/progress/shared.js`）/ `progress.js read()._version`）。D-012（platform-progress-sync）原始对齐至 `4`；2026-08-11 changes 表加 `title`/`quicklog_id` 列 bump 至 `5`。bump 时四处须同步更新（`platform-sync-schema.test.mjs` 守卫锁死一致）。

双库分裂探测（2026-09-04，坑 progress-repair-dual-library-blind）：`progress check`/`progress repair`（ConsistencyDoctor.detectLibrarySplit）在 cwd 存在平台接管指针且 specRoot ≠ cwd/.sillyspec、同时 cwd/.sillyspec/.runtime/sillyspec.db 残留时报告「双进度库并存」——两库均有活跃变更、或 --change 目标变更只在旧库活跃 → issue 级（repair 进 manual 清单：哪边是权威库 repair 修不了，只能亮出来）；仅并存单侧活跃 → warning 级（平台模式本地库保留真实资产是容忍态，防常态误报）。自指指针/无指针/旧库无 db 不报。旧库仅在其 sillyspec.db 已存在时直读（绝不新建库文件），读失败 fail-open 不阻断主流程。

## pre-import 快照回收

位置：`.sillyspec/.runtime/sillyspec.db.pre-import-<ts>.bak`（+ 同名 `.bak-wal` 侧车）

写入方：`ProgressManager.import()`（`src/progress.js`），每次 `platform pull` / `platform resolve --take-platform` 在 import 事务前落一份全库快照。独立于主 `sillyspec.db.bak` 回退链（不抢 `_openWithFallback` 的路径）。

回收方：`ProgressManager._pruneImportBaks(cwd, keepPath)`，在 `copyFileSync` 落盘后立即调用。口径：

- **默认只留最新 1 份**（`PRE_IMPORT_BAK_KEEP_DEFAULT`）。这类快照只服务「刚 pull 完发现平台盖错、要退回 pull 前」这一个场景，最新一份即可覆盖；越旧的快照 schema 可能已 bump，恢复价值随时间衰减。
- 份数可用环境变量 `SILLYSPEC_PREIMPORT_BAK_KEEP` 覆盖（灾难排查期想多留几份），非法值 / `< 1` 钳回默认。
- 排序依据 = **文件名内嵌的 ISO 时间戳字典序**（冒号/点已替换为 `-`，定宽无进位歧义，等价时间序）。不用 `statSync` 的 mtime——copy / 同步工具会改写 mtime。
- 被裁的快照连自己的 `.bak-wal` 侧车成对删；**存活快照的侧车必须保留**（缺侧车的快照恢复时会丢尾部已提交事务，即 BUG-18 连 `-wal` 一起备份的原因）。
- 本次刚写的 `keepPath` 显式排除、永不裁（并发 import 互删护栏）。
- 单份删除失败（他进程持句柄 / 权限）跳过不连坐其余份，下次 import 再收。
- 裁剪整体包在 `try/catch` 里 **fail-open**：卫生动作失败只 `console.warn`，不阻断 import 主流程。

**为什么修在写入侧而不是新增 GC 命令**：靠人工记得跑 GC 等于没有回收——此前只写不裁，实证单仓（multi-agent-platform）累积 292 份 / 317MB，占该仓 `.runtime/` 体积绝对大头。写入侧自愈一次改完永久生效，多 agent 并行也无需协调。契约测试 `test/preimport-bak-rotation.test.mjs`（25 断言）。

## `global.json`

`progress.js` 仍保留 `GLOBAL_FILE = 'global.json'` 常量和注释，但 `readGlobal()` / `writeGlobal()` 已经改为 SQL 查询/写入 `project` 与 `changes` 表。

当前代码没有创建或维护 `.sillyspec/.runtime/global.json` 的实际生命周期。

## `user-inputs.md`

位置：`.sillyspec/.runtime/user-inputs.md`

创建方：`ProgressManager.init()`。

追加方：`run.js` 的 `completeStep()`。当 `sillyspec run <stage> --done --output ...` 携带 output 时，按当前 change/stage/step 追加记录。

每条记录形态：

```markdown
## <时间> | <change> | <stage>: <step-name>
- 输入：<inputText>
- 输出：<outputText>
```

如果 output 超过 200 字，step 表中只保存截断摘要，但 `user-inputs.md` 保存完整 output。

## `artifacts/`

位置：

- 本地模式：`.sillyspec/.runtime/artifacts/`
- 平台 scan 且传入 `--runtime-root`：`<runtime-root>/scan-runs/<scan-run-id>/`

写入方：`run.js completeStep()`。

触发条件：`--output` 长度超过 200 字。

文件名：

```text
<change>-<stage>-step<N>-<YYYYMMDDHHMMSS>.txt
```

回收方：写入侧滚动裁剪（`runtime-hygiene.js pruneTimestampedEntries`，keep=100 按 mtime——文件名时间戳在尾部、前缀是变更名，长变更晚收峰会乱序；实证本仓曾累积 534 份）。`SILLYSPEC_RUNTIME_KEEP` 可覆盖保留份数。

注意：artifact 路径由 `completeStep()` 处理；这不等同于 workflow run 归档路径。

## 无归属审计类产物的写入侧滚动回收

`.runtime/` 只写不回收路径系统性排查（2026-09-08，与「归档取证回收」定界）后，按**产物是否有 change 归属语义**分两路回收：

- **变更归属类证据**（execute-runs / stage-reviews / verify-runs / apply-pathspec）：走归档时按 change 精确回收（pruneArchivedChangeRuntime，见上方专节）+ `doctor --gc-unstamped-runs` 清存量。不接写入侧滚动——keep-N 是启发式，多 agent 高频写入会把活跃变更的证据跌出保留窗，Stage/Task Review Gate 会读到被裁掉的 review。
- **无归属审计类**（本节，`src/runtime-hygiene.js pruneTimestampedEntries` 写入侧滚动）：无生命周期事件可挂、无归属语义、只有时间价值的产物：
  - `artifacts/`：keep=100，orderBy=mtime（见上节）；
  - `workflow-runs/`：`saveWorkflowRun` 写后裁，keep=30（文件名零填充时间戳开头，name 字典序==时间序）；
  - `doctor-dumps/`：`writeDump` 写后裁，keep=5（孤儿库处置前的证据快照，决策完成即失效）。

统一契约：单条删除失败跳过不连坐；目录缺失/异常返回 0 绝不抛（fail-open）；keep 内幂等；`SILLYSPEC_RUNTIME_KEEP`（整数 ≥1）统一覆盖各默认，非法值回落调用方默认。

## `history/`

位置：`.sillyspec/.runtime/history/`

写入方：`ProgressManager.completeStage()`。

文件名：

```text
<change>-<stage>-<timestamp>.json
```

`sillyspec run <stage> --done` 的普通流程不直接调用 `completeStage()`；它通过 `_write()` 更新 DB。只有使用 `sillyspec progress complete-stage <stage>` 这类 progress 子命令时会写 history 文件。

注意：`progress complete-stage` / `update-step`（触发阶段自动完成时）现在会先跑 `stage-contract.js` 的阶段产物校验（`_validateStageArtifacts`），校验失败拒绝标记 completed；`--force` 可强制通过，但会向 `audit.log` 追加审计记录。

## `audit.log`

位置：`.sillyspec/.runtime/audit.log`

写入方：`ProgressManager._appendAuditLog()`。

触发条件：`sillyspec progress complete-stage <stage> --force` 或 `update-step ... --force`（阶段自动完成路径）在校验未通过或显式 force 时追加。

格式：JSONL，每行一条：

```json
{"at":"2026-07-09T12:00:00.000Z","action":"complete-stage --force","stage":"execute","change":"my-change","validationErrors":["..."]}
```

## `verify-runs/`

位置：`.sillyspec/.runtime/verify-runs/<YYYYMMDDHHMMSS>/test-result.json`

写入方：`verify-postcheck.js` 的 `runVerifyTestCheck()`，在 verify 阶段完成、产物校验通过后由 `run.js` 触发。

内容：CLI 亲自执行 `local.yaml` `commands.test` 的客观结果（`command`、`exit_code`、`status`、`duration_ms`、`output_tail`、`reason`、`ran_at`）。实测失败会阻断 verify 阶段完成（与 verify-result.md 自报告对账）。未配置 test 命令（或标记 `unavailable`）时跳过执行、不落盘、不阻断。额外字段：全量 fallback 时含 `fallback_reason`（非 null 表示本次全量是非显式 fallback——未配 `test_strategy` / `modules:` 块无效 / git 未命中——失败可能含未变更模块的预存错误）；`test_strategy: module` 命中子集时含 `modules` 各模块明细（`name`/`command`/`exit_code`/`status` 等）。归档后该目录按 change 精确回收，见下方「归档取证回收」。

## 归档取证回收

接线：`archiveWorktreeCleanup`（`src/run/complete-handlers.js`）在清完 runId marker 之后、worktree `if (!meta) return` 早退之前调用 `pruneArchivedChangeRuntime(runtimeRoot, changeName)`。时点保证：`handleArchiveConfirmStep` 先 `buildDeltaReport` 把 reconcile / apply-pathspec 吃进 `delta.md`，再 `archiveChangeDirectory` → 本清理。自愈归档 / quick 轻量归档 / `change-delete` 无 delta 同样可删（变更已终态，runtime 取证无读者）。

**不复制进 `changes/archive/<change>/evidence/`**：review.json 体积小，双写会漂移；delta.md 已覆盖交付清单。归档后再跑 `sillyspec delta --change` 会失去 runtime 侧 reconcile/apply-pathspec 源，以归档包内已有 `delta.md` + `verify-facts.json` 为准。

归属 fail-closed（禁 mtime 猜、禁后缀匹配，对齐坑 marker-suffix-overmatch / execute-runs-isolation）：

| 产物 | 删除条件 |
|---|---|
| `apply-pathspec-<change>.txt` | 文件名精确相等 |
| `execute-runs/<runId>/` | 目录内 `change` 戳全等本变更；**无戳不删** |
| `stage-reviews/<dir>/` | `review.json` 的 `reviewedFiles[0]` 解析 `changes/<name>/` 首段 **===** 本变更 |
| `verify-runs/<ts>/` | 目录内 JSON 的 `change` 字段集合 size=1 且等于本变更；无字段 / 混有他变更 → 整目录不删 |

本轮不扩 `endpoint-baselines/`、`contract-artifacts/`、`last-delta.json`、`sillyspec.db`。卫生动作 fail-open，不阻断归档。契约测试 `test/archive-runtime-prune.test.mjs`。

## 存量无戳 execute-runs

归档热路径故意留下无 `change` 戳的旧 `execute-runs/<runId>/`（禁 mtime 猜删）。存量清扫走旁路，**不接进 archive**：

```text
sillyspec doctor --gc-unstamped-runs           # dry-run 只列
sillyspec doctor --gc-unstamped-runs --confirm # 才删除
```

实现：`src/doctor-diagnostics.js` `gcUnstampedExecuteRuns`，接线 `src/index.js` `case 'doctor'`（对齐 `--cleanup-ghosts`）。只处理无戳 execute-runs；有戳的留给 `pruneArchivedChangeRuntime`。

归属 fail-closed（`archiveDestDirName` 原样返回 changeName，归档目录名 = 变更名）：

| 判定 | 动作 |
|---|---|
| 目录内有非空 `change` 戳 | skip `has_stamp` |
| `reviewedFiles` 的 `changes/<name>/` 首段命中 **活跃** 变更 | skip `matches_active`（`login` 不伤 `2026-08-01-login`） |
| 路径命中多个归档目录 | skip `ambiguous_archive` |
| 路径命中恰好一个归档；且 run 的 task-NN 是该归档 `tasks.md` 的子集（或 tasks.md 无任务） | 列为候选，via `path` |
| 路径命中但 run 多出 `tasks.md` 没有的 task-NN | skip `tasks_md_mismatch` |
| 无路径：task-NN 与恰好一个归档 `tasks.md` **集合全等**，且无活跃变更全等 | 列为候选，via `tasks_md`（子集太弱：`task-01` 几乎每个变更都有） |
| 其余 | skip `no_attribution` |

默认 dry-run 零写入；`--confirm` 才 `rmSync` 候选。不扩 `stage-reviews/` / `verify-runs/`。契约测试 `test/doctor-gc-unstamped-runs.test.mjs`。

## `local.yaml` 路径口径

当前主配置口径已经统一到：

```text
.sillyspec/local.yaml
```

| 位置 | 代码/提示 | 当前行为 |
|---|---|---|
| `.sillyspec/local.yaml` | `init.js` gitignore、`scan.js` prompt、`sync.js`、多个阶段 prompt | 平台配置、本地命令配置、hook 扩展白名单的主入口 |
| `.sillyspec/local.yml` | `worktree-guard.js loadLocalConfig()` | hook 兼容读取 |
| `local.yaml` / `local.yml`（项目根） | `worktree-guard.js loadLocalConfig()` | hook fallback 兼容旧配置 |

因此，文档可以把 `.sillyspec/local.yaml` 写成当前稳定主入口，但不能删除根目录 `local.yaml` / `local.yml` 的兼容说明。

## 派发抽象层（dispatch）的运行时产物

`src/dispatch/`（变更 2026-08-07-sillyhub-mcp-dispatch）**不新增 `.runtime/` 文件**：派发走内存（探测结果 + 指令文本注入 execute prompt），回收复用既有 `.runtime/execute-runs/<run-id>/tasks/task-XX/review.json`（屏蔽 Local / SillyHub 后端差异，R-07）。

仅 `.sillyspec/local.yaml` 增可选 `dispatch:` 段（`src/dispatch/probe.js` 与 `backends/sillyhub-mcp.js` best-effort 读，缺省用默认值，绝不抛）：

```yaml
dispatch:
  probe_ttl_ms: 60000       # 探测负面缓存 TTL（默认 60000），daemon 抖动免反复探测（R-06）
  poll_interval_ms: 15000   # SillyHub 后端轮询 list_workers 间隔（默认 15000）
  worker_timeout_ms: ...    # per-worker 超时（超时 → kill lease 防双写 + fallback Local，UB-6）
```

无 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN` 环境变量时派发全程走 Local（本机 Agent tool），`dispatch:` 段不读，现有 execute 行为零回归（D-005）。详见模块文档 `.sillyspec/docs/sillyspec/modules/dispatch.md`。
