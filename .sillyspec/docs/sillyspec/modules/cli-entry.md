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

**worktree 副本漂移自动锚定**（2026-08-05，`run/command.js`，D-03@v1）：`runCommand` 入口算 `specBase` 后调 `detectWorktreeSpecDrift`；命中（cwd 落在 `.sillyspec/.runtime/worktrees/<change>/` 内的副本 spec，100% 误操作）时**不 exit(2)**，把 `specBase`/`specRoot`/`specDir` 重写为 `wt.mainSpecBase` + warn 提示已锚定主仓，流程继续——进度/产出落主仓、不再写分裂副本（pm 按锚定后的 specBase 重建）。其他 cwd 漂移（changeMissing、quick session drift）仍 `exit(2)`；显式 `--spec-dir` / 平台 `specRoot` 跳过自动锚定。**2026-08-06 增补**（坑 execute-runs-isolation，方案 A）：命中分支追加 `platformOpts.specDriftAnchor = wt.mainSpecBase`——下游 `.runtime` 根解析（`resolveRuntimeRoot`，`run/shared.js`）读此锚点落主仓，execute-runs / stage-reviews 不随 worktree cleanup 消失；**不**设 `specRoot`/`runtimeRoot`（否则触发平台 sentinel 副作用：误跳 `triggerSync`/`checkApproval`、误进平台渲染分支）。

**gate/derive 顶层命令 drift 锚定**（2026-08-07，`index.js` `case 'gate'`/`case 'derive'`，坑 execute-runs-isolation index 层遗留 gap）：上述 `run/command.js` 守卫只覆盖走 `runCommand` 的 plan/execute/verify/archive；`gate`/`derive` 是顶层命令不经 `runCommand`，worktree cwd 下 `specDriftAnchor` 不会被设 → `runGate`/`runDerive` 的 `resolveRuntimeRoot` 走本地兜底、execute-run-id marker 读副本 `.runtime`。修复：两 case 在未显式 `--spec-dir` 时同样调 `detectWorktreeSpecDrift(resolveSpecDir(dir))`，命中即向 `runGate`/`runDerive` 传 `specDriftAnchor=wt.mainSpecBase`（对齐 machine-interface 已扩展入参），使 execute 段 / task-reviews facet 的 marker 读取锚主仓 `.runtime`（与 execute 落点同源，不读随 cleanup 消失的副本）。显式 `--spec-dir` 跳过（与 `run/command.js` 守卫条件 `!specDir` 对称）。

**--done 底部推进锚定行**（2026-08-05，`run/complete.js`，问题 5）：`outputStep` 渲染的长 prompt 易被 tail 视窗截断，`completeStep` 在 `outputStep` 之后再打一行 `🚀 advanced to step <i+1>/<total>: <name>`，让 agent 不必二次 `grep step:` 确认是否真推进。

## 注意事项

- `sillyspec init /path/to/project` 语法：第二个参数如果是路径会被当作 targetDir，而非子命令
- `runCommand` 中变更名解析逻辑复杂：优先 `--change` 参数 → `resolveChangeNameAuto` → 辅助阶段 fallback `'default'`
- `runAutoMode` 会连续推进多个阶段，中间若某步骤失败会中断并提示
- 审批门禁（approval）通过 `approvals` 表控制，`--skip-approval` 可绕过（仅限特定场景）
- `triggerSync` 在每步执行前触发，可能与外部平台（如飞书/GitHub）同步
- **apply / assess 自动 apply 消息同步**（坑3，`index.js`）：apply 与 assess 自动 apply 的用户面消息改为「`.sillyspec/changes/`、`.sillyspec/.runtime/`、`.sillyspec/quicklog/` 不自动 apply（worktree 进度/产物非交付物），模块文档 `.sillyspec/docs/` 会自动 apply 回主仓」——对齐 `worktree-apply.js#filterDeliverableFiles` 精细化过滤（保留 docs/、排除 changes/+.runtime/+quicklog/+meta.json）
- **apply / assess dirty 拦截 rescue 段**（2026-08-10-worktree-apply-dirty-resilient，`index.js`）：apply/assess 命中 step4.5/5a dirty fail-loud 拦截时，在 errors/reasons 主通道文本之后补结构化 rescue 段 `🆘 Rescue commands (N safe / M excluded，旁路 git apply，cp 后需手动 sillyspec worktree cleanup <wtName>):` + 逐行 cp 指令 + warnings（gated on `result.rescueCommands` / `assessment.rescueCommands` 非空，===null 时零影响）；rescue 指令由 `worktree-apply.js#generateRescueCommands` 逐文件四分类生成（SAFE-CP 给 cp、EXCLUDE-DIRTY/MISMATCH 进 warnings、DELETE 给 rm）

## 变更索引

- ql-20260807-001-a260 | gate/derive 顶层命令补 worktree drift 锚定：未显式 --spec-dir 时 detectWorktreeSpecDrift(resolveSpecDir(dir)) 命中即向 runGate/runDerive 传 specDriftAnchor（对齐 machine-interface 已扩展入参），execute/task-reviews marker 读主仓 .runtime（补 test/gate-derive-spec-drift.test.mjs 3 场景 e2e）。
- 2026-08-10-worktree-apply-dirty-resilient | apply/assess dirty 拦截补结构化 rescue 打印段（gated on rescueCommands 非空）：`🆘 Rescue commands (N safe / M excluded)` + 逐行 cp 指令（`generateRescueCommands` 逐文件四分类），旁路 git apply，cp 后提示手动 worktree cleanup；纯 additive，`rescueCommands===null` 零影响。
- 2026-08-10-platform-progress-sync | platform case 新增 `pull` 子命令（--change 单变更 / 无参先 pullList 再逐个 pull）+ `resolve` 子命令（三 flag --keep-local/--take-platform/--abort 互斥校验，多/缺均报错）+ `status` 扩展（collectStatus：落后标记 + 未决冲突列表）；stage case block（brainstorm/plan/execute/verify/archive）runCommand 前 + platform approve 前注入 `triggerPullActiveChange`/`triggerPull`（下行拉最新避免过期状态审批）；help 文本同步加 pull/resolve 行。

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
