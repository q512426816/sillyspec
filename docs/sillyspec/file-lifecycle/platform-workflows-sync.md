---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-07-02 11:00:00
---

# 平台模式、Workflow 与 Sync

## 平台 scan 参数

`sillyspec run scan` 支持：

```text
--spec-root <path>
--runtime-root <path>
--workspace-id <id>
--scan-run-id <id>
```

`run.js` 会在首次 scan 时把这些参数暂存到：

```text
.sillyspec/.runtime/platform-scan.json
```

后续 `--done` / `--skip` 会从该文件恢复参数。

## 平台残留清理（一次性）

`run.js` 在平台模式（`specRoot` 指向外部）首次启动时，会检查源码目录 `cwd/.sillyspec/` 是否为旧版本残留并清理（复用 `init.js` 的 `cleanupRuntimeResidue`）。该清理**仅在首次执行一次**：完成后在 cwd 根写入 `.sillyspec-platform-cleaned` 标记文件，后续每次 `run` 直接跳过，避免重复检查与噪声。清理白名单与边界见总览的「平台模式残留清理边界」。

## 路径替换

`run.js outputStep()` 在 scan 阶段替换：

| 占位符 | 本地模式 | 平台模式 |
|---|---|---|
| `{DOCS_ROOT}` | `<cwd>/.sillyspec/docs/<project>` | `<spec-root>/.sillyspec/docs/<project>` |
| `{PROJECTS_ROOT}` | `<cwd>/.sillyspec/projects` | `<spec-root>/.sillyspec/projects` |

传入 `--runtime-root` 时，输出 prompt 会附加运行时产物路径：

```text
<runtime-root>/scan-runs/<scan-run-id>/
```

## long output artifact

当 step output 超过 200 字：

- 本地模式写 `.sillyspec/.runtime/artifacts/`
- 平台模式且有 `runtimeRoot` 时写 `<runtime-root>/scan-runs/<scan-run-id>/`

这是 `run.js completeStep()` 的真实行为。

## `manifest.json`

触发条件：scan 阶段完成，且 `platformOpts.specRoot` 存在。

写入位置：

```text
<spec-root>/.sillyspec/manifest.json
```

字段：

```json
{
  "workspace_id": "optional",
  "scan_run_id": "optional",
  "source_commit": "git HEAD or null",
  "generated_at": "ISO timestamp",
  "schema_version": 1
}
```

写入后，`run.js` 会尝试删除 `.sillyspec/.runtime/platform-scan.json`，并检查本地 source root 的 `.sillyspec/docs/` 是否有文档污染；发现 `.md` 文件时只输出 warning。

## Workflow 定义

目录：

```text
.sillyspec/workflows/
```

创建方：`init.js` 从 `templates/workflows/*.yaml` 复制。

当前核心模板：

- `scan-docs.yaml`
- `archive-impact.yaml`

加载方：`workflow.js loadWorkflow(cwd, name)`。

CLI：

```text
sillyspec workflow list
sillyspec workflow check <name> --project <project> [--json] [--save]
```

## Workflow run 归档

`workflow.js saveWorkflowRun()` 支持两种路径：

- 默认：`<cwd>/.sillyspec/.runtime/workflow-runs/`
- 如果调用方传 `runtimeRoot`：`<runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/`

文件名：

```text
<YYYYMMDDHHMMSS>-<workflow>-<project>-<status>.json
```

记录包含：

- `run_id`
- `created_at`
- `source`
- `stage`
- `step`
- `workflow`
- `project`
- `status`
- `spec_version`
- `roles`
- `workflow_checks`
- `failures`
- `retry_prompts`

当前接线限制：`run.js` 在 scan/archive post-check 中调用 `saveWorkflowRun(result, { cwd, source, stage, step })`，没有传 `runtimeRoot` 和 `scanRunId`。所以即使平台 scan 有 runtimeRoot，当前 run.js 自动 workflow 归档仍会落在本地 `.sillyspec/.runtime/workflow-runs/`。

## scan post-check

触发点：`run.js completeStep()` 中，scan step 名包含“深度扫描”时。

行为：

1. 加载 `scan-docs` workflow。
2. 根据当前 step 的 `project` 字段或步骤名中的 `[project]` 判断检查项目。
3. 对项目运行 `runPostCheck()`。
4. 打印报告。
5. 保存 workflow run。
6. 失败时打印 retry prompt。

保存时 `stage` 字段当前传的是 `verify`，这是代码中的实际参数。

## archive post-check

触发点：archive step 名包含 `extract-module-impact` 时。

行为：

1. 加载 `archive-impact` workflow。
2. 替换 `<change-name>`。
3. 固定用 project `sillyspec` 运行 `runPostCheck()`。
4. 只摘出 `impact-analyzer` 角色结果打印。
5. 保存 workflow run。

## SillyHub sync

平台同步实现位于 `src/sync.js`。

配置文件：

```text
.sillyspec/local.yaml
```

`platform connect` 会写入：

```yaml
platform:
  url: <url>
  token: <token>
  last_connected: <iso-time>
```

命令：

```text
sillyspec platform connect <url> [--token <token>]
sillyspec platform disconnect
sillyspec platform sync [--change <name>]
sillyspec platform sync-docs [--change <name>]
sillyspec platform status
sillyspec platform approve <change-name>
sillyspec platform reject <change-name> [--reason <reason>]
```

当前真实情况：

- `connect`、`disconnect`、`sync`、`sync-docs`、`status` 有实现。
- `approve` / `reject` 目前只打印 “尚未实现” warning。
- `sync()` 和 `syncDocuments()` 网络失败只 warning，不抛错。
- `sync()` 成功后会调用 `ProgressManager._updatePlatformLastSync()`，更新 `changes.platform_last_sync` 并打开 `platform_sync_enabled`。
- `checkApproval()` 成功后会调用 `ProgressManager._updateApprovalStatus()`，把平台审批状态写入 `approvals` 表。

## 自动 sync 接线

`run.js` 在 `_write()` 后会 best-effort 调用 `triggerSync()`。

当前实现中 `triggerSync(cwd, changeName)` 会先确认 `.sillyspec/changes/<changeName>/` 仍存在，然后调用：

```js
syncMod.sync(changeName, cwd)
```

这与 `sync.js` 导出的签名一致：

```js
sync(changeName, cwd)
```

`execute` 启动前的审批检查也按同一顺序调用：

```js
syncMod.checkApproval(changeName, cwd)
```

自动 sync 和审批检查都是 best-effort：未连接平台、网络失败或本地更新失败时只 warning，不阻断本地阶段推进。
