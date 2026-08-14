---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-08-09
---

# 存储与状态

## Runtime 目录

`.sillyspec/.runtime/` 是当前实现的运行时目录，`init.js` 和 `ProgressManager._ensureRuntimeDir()` 会创建：

```text
.sillyspec/.runtime/
├── sillyspec.db
├── user-inputs.md
├── platform-scan.json            (平台 scan 参数暂存)
├── scan-projects.json            (scan step 2 后的项目展开状态)
├── audit.log                     (--force 绕过校验的审计记录，JSONL)
├── artifacts/
├── history/
├── logs/
├── templates/
├── verify-runs/                  (verify 阶段 CLI 实测测试结果)
├── workflow-runs/
└── worktrees/
```

`.runtime/` 在 `.gitignore` 中，默认不进入版本控制。

## `sillyspec.db`

位置：`.sillyspec/.runtime/sillyspec.db`

创建方：`ProgressManager._ensureDB()` 使用 `src/db.js` 的 `DB.init()`。底层是 **`node:sqlite`（`DatabaseSync` 原生绑定）**（同步 API），打开即持久化——`init()` 一次性设置 PRAGMA：`journal_mode=WAL` + `busy_timeout=5000` + `foreign_keys=ON` + `synchronous=NORMAL`。事务经 `DB.transaction(fn)` 包装，提交直接写主库文件 `sillyspec.db` + WAL 侧车 `.db-wal`/`.db-shm`。写前自动备份为 `sillyspec.db.bak`，主库损坏/为空时从 `.bak` 回退，两者均坏则 fail-loud。WAL 单写者串行 + SQLITE_BUSY 应用层有限重试（3 次递增退避 50→100→200ms，达上限 fail-loud），并发安全不丢更新。

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

注意：artifact 路径由 `completeStep()` 处理；这不等同于 workflow run 归档路径。

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

内容：CLI 亲自执行 `local.yaml` `commands.test` 的客观结果（`command`、`exit_code`、`status`、`duration_ms`、`output_tail`、`reason`、`ran_at`）。实测失败会阻断 verify 阶段完成（与 verify-result.md 自报告对账）。未配置 test 命令（或标记 `unavailable`）时跳过执行、不落盘、不阻断。额外字段：全量 fallback 时含 `fallback_reason`（非 null 表示本次全量是非显式 fallback——未配 `test_strategy` / `modules:` 块无效 / git 未命中——失败可能含未变更模块的预存错误）；`test_strategy: module` 命中子集时含 `modules` 各模块明细（`name`/`command`/`exit_code`/`status` 等）。

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
