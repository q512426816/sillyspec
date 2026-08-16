---
author: qinyi
created_at: 2026-08-16 15:52:30
---

# 需求规格（Requirements）

## FR-01 — --done gate 失败退出码 fail-closed

- **描述**: `--done` 完成阶段时，阶段产物 gate 失败（含 rollback 回滚路径与 scan 非平台 failed_post_check 直返路径）→ `process.exitCode = 1`。
- **验收**: 构造 gate 失败场景（缺产物/校验失败/scan post-check 失败），`--done` 后进程 exit code = 1，且进度回滚至 pending 不落假 completed。

## FR-02 — --done 与 run 同源转换守卫

- **描述**: `--done` 调用 completeStep 前执行 `checkTransition(progress.currentStage || '', stageName, { fromStageData })`，与 runStage 同源；不合法 → 报错 + `--skip-approval` 可绕过。
- **验收**: 未合法到达的阶段（如 brainstorm 态直跑 `verify --done`）被拦；同阶段 --done、合法链、auxiliary --done 不误伤；fromStageData 透传让 scan failed_post_check 门控对 --done 生效。

## FR-03 — auxiliary 阶段不写 currentStage

- **描述**: scan/quick/explore/archive/status/doctor 阶段执行后不写 `progress.currentStage`；currentStage 语义收窄为主流程当前阶段。
- **验收**: `run status` 后 currentStage 保持原值；`gates.js:730` auxiliary 重置分支幂等（不误清主流程阶段）。

## FR-04 — status/doctor 查询零副作用

- **描述**: READONLY_AUXILIARY_STAGES（status/doctor）无显式写 flag 时，在 registerChange/ensureStageSteps 之前短路：progress 不存在 → 提示 exit 0 不建 default；存在 → 只读展示不 seed steps 不刷 lastActive。
- **验收**: 新项目 `run status` 不建 `changes/default/`；已有变更 `run status` 不改 DB（steps/lastActive/currentStage 均不变）。

## FR-05 — brainstorm auto-create gating

- **描述**: `run brainstorm` 无 `--change` 仅当无已存在活跃变更时 auto-create；多活跃变更仓 → exit 2 + 引导 `--change`。
- **验收**: 多活跃变更仓无 `--change` 报错 exit 2 不建幽灵变更；0 活跃变更新项目 auto-create 保留。

## FR-06 — 既有合法流程不误伤

- **描述**: 合法链（brainstorm→plan→execute→verify→archive）、同阶段 --done、--reopen 修订、--skip-approval 绕过均保持可用。
- **验收**: 全量 npm test 无既有测试因本变更失败（除设计判定的合法收紧外）。

## FR-07 — 回归测试

- **描述**: 新增 `test/state-machine-guards.test.mjs`，子进程驱动 CLI 断言进程级行为（exitCode 等），覆盖 FR-01..FR-06。
- **验收**: 新测试文件全绿；断言构造 currentStage 前置态验证守卫拦截与放行。
