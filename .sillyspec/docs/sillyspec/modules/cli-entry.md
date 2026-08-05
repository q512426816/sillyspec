---
schema_version: 1
doc_type: module-card
module_id: cli-entry
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
---
# cli-entry

## 定位

CLI 入口 + 命令分发 + 阶段执行引擎。`bin/sillyspec.js` 是 shebang 入口，`src/index.js` 负责命令路由（init / setup / progress / run / …），`src/run.js` 是 `sillyspec run` 的核心执行引擎，管理步骤流转、审批门禁、自动模式。不负责数据库层实现（委托 ProgressManager/DB）。

## 契约摘要

- **src/index.js** — `main()` 解析 `process.argv`，路由到 `cmdInit` / `cmdSetup` / ProgressManager 子命令 / `runCommand`；支持 `--dir`、`--tool`、`--interactive`、`--json` 等全局选项
- **src/run.js** — `runCommand(args, cwd)` 为核心入口；`runStage()` 执行单个阶段的所有步骤；`runAutoMode()` 连续推进 brainstorm→plan→execute→verify；`completeStep()` / `skipStep()` 管理步骤状态变更
- **stageRegistry** (`src/stages/index.js`) — 阶段注册表，定义各阶段的步骤模板、输入输出规范、审批需求
- **auxiliaryStages** — 辅助阶段列表（scan / explore / quick / doctor / status），无需初始化变更即可运行

## 关键逻辑

```
main(argv)
  → 解析全局选项 → resolve targetDir
  → switch(command): init | setup | progress(sub) | run | ...

runCommand(args, cwd)
  → 解析 stageName + flags (--done/--skip/--status/--reset/--change/--output/--input)
  → ProgressManager.read(cwd) 获取进度
  → auxiliaryStages? → 直接执行，无需完整变更上下文
  → 否则: resolveChangeName → ensureStageSteps → runStage / showStatus / resetStage

runStage(pm, progress, stageName, cwd, changeName)
  → stageRegistry[stageName] 获取步骤模板
  → ensureStageSteps: 从模板同步到数据库
  → 遍历 steps: pending → checkApproval → triggerSync → outputStep(执行) → completeStep
  → 可选: skipApproval 模式跳过人工审批门禁
```

**worktree 副本漂移自动锚定**（2026-08-05，`run/command.js`，D-03@v1）：`runCommand` 入口算 `specBase` 后调 `detectWorktreeSpecDrift`；命中（cwd 落在 `.sillyspec/.runtime/worktrees/<change>/` 内的副本 spec，100% 误操作）时**不 exit(2)**，把 `specBase`/`specRoot`/`specDir` 重写为 `wt.mainSpecBase` + warn 提示已锚定主仓，流程继续——进度/产出落主仓、不再写分裂副本（pm 按锚定后的 specBase 重建）。其他 cwd 漂移（changeMissing、quick session drift）仍 `exit(2)`；显式 `--spec-dir` / 平台 `specRoot` 跳过自动锚定。

**--done 底部推进锚定行**（2026-08-05，`run/complete.js`，问题 5）：`outputStep` 渲染的长 prompt 易被 tail 视窗截断，`completeStep` 在 `outputStep` 之后再打一行 `🚀 advanced to step <i+1>/<total>: <name>`，让 agent 不必二次 `grep step:` 确认是否真推进。

## 注意事项

- `sillyspec init /path/to/project` 语法：第二个参数如果是路径会被当作 targetDir，而非子命令
- `runCommand` 中变更名解析逻辑复杂：优先 `--change` 参数 → `resolveChangeNameAuto` → 辅助阶段 fallback `'default'`
- `runAutoMode` 会连续推进多个阶段，中间若某步骤失败会中断并提示
- 审批门禁（approval）通过 `approvals` 表控制，`--skip-approval` 可绕过（仅限特定场景）
- `triggerSync` 在每步执行前触发，可能与外部平台（如飞书/GitHub）同步

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
