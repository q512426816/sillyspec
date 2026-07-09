---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-07-09
---

# 存储与状态

## Runtime 目录

`.sillyspec/.runtime/` 是当前实现的运行时目录，`init.js` 和 `ProgressManager._ensureRuntimeDir()` 会创建：

```text
.sillyspec/.runtime/
├── sillyspec.db
├── user-inputs.md
├── gate-status.json              (按阶段动态生成/删除)
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

创建方：`ProgressManager._ensureDB()` 使用 `src/db.js` 的 `DB.init()`。底层是 `sql.js`，每次事务后通过 `db.export()` 写回磁盘。

当前 DDL 包含：

| 表 | 用途 |
|---|---|
| `project` | 项目名、schema version、创建/更新时间 |
| `changes` | 变更名、当前阶段、活跃/归档状态、`no_worktree`、平台同步字段、隔离状态字段 |
| `stages` | 每个 change 的阶段状态 |
| `steps` | 每个 stage 的步骤状态和输出摘要 |
| `batch_progress` | 批量任务统计 |
| `approvals` | 平台审批状态 |

`progress.js` 通过 SQL 读写这些表，并组装成兼容旧 progress 格式的 JS 对象。进度数据仅存储在 SQLite 数据库中，不再使用 progress.json 文件。

注意：`db.js` 的 `project.schema_version` DDL 默认值是 `4`，但 `progress.js` 的 `CURRENT_VERSION` 是 `3`，并在初始化/写入时使用 `3`。文档不要把这里写成稳定的 v4 schema 事实。

## `global.json`

`progress.js` 仍保留 `GLOBAL_FILE = 'global.json'` 常量和注释，但 `readGlobal()` / `writeGlobal()` 已经改为 SQL 查询/写入 `project` 与 `changes` 表。

当前代码没有创建或维护 `.sillyspec/.runtime/global.json` 的实际生命周期。

## `gate-status.json`

位置：`.sillyspec/.runtime/gate-status.json`

写入/删除方：`ProgressManager._updateGateStatus()`。每次 `ProgressManager._write()` 后调用。

生成条件：

- 查询 `changes` 表中 `status = 'active'`
- 且 `current_stage IN ('execute', 'quick')`
- 有匹配行时写入，没有匹配行时删除

结构：

```json
{
  "stage": "execute",
  "changes": ["change-name"],
  "updatedAt": "2026-06-04T08:00:00.000Z",
  "noWorktree": true
}
```

`stage` 优先取 `execute`；同时存在 execute/quick 时，execute 会覆盖 quick。`noWorktree` 只要任一匹配 change 的 `no_worktree = 1` 就出现。

消费者：`src/hooks/worktree-guard.js`。hook 会先读 gate 文件，再 fallback 到 sqlite3 CLI 查询 `sillyspec.db`。

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

内容：CLI 亲自执行 `local.yaml` `commands.test` 的客观结果（`command`、`exit_code`、`status`、`duration_ms`、`output_tail`、`reason`、`ran_at`）。实测失败会阻断 verify 阶段完成（与 verify-result.md 自报告对账）。未配置 test 命令（或标记 `unavailable`）时跳过执行、不落盘、不阻断。

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
