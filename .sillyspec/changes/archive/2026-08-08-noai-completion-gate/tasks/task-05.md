---
id: task-05
title: T1-T4 复现测试（plan/scan 受害者 + continueStep）
title_zh: T1-T4 复现测试（plan/scan 受害者 + continueStep）
author: qinyi
created_at: 2026-08-08 08:41:43
allowed_paths:
  - test/noai-completion-gate.test.mjs (新增)
---

# task-05: T1-T4 复现测试（plan/scan 受害者 + continueStep）

## 目标
新建 `test/noai-completion-gate.test.mjs`，复现 design §11 T1-T4，锁住 S1/S2「noAI 末步 + continueStep 完成分支绕过 completeStageGates」bug。修复前红（gate 被绕过 → stage 误标 completed / manifest 不落盘），task-01~04 接入后转绿。

## allowed_paths
- `test/noai-completion-gate.test.mjs`（新增）

## 验收标准
| # | 场景 | 修复前（红） | 修复后（绿） |
|---|---|---|---|
| T1 | plan postcheck（noAI 末步）完成 + independent-tier review verdict=fail | plan 误标 completed（绕过 Stage Review Gate） | plan 不 completed，rollback in-progress，末步回退 pending |
| T2 | plan postcheck 后 validatePlanForExecute 失败（task id 不连续） | plan 误标 completed | 阻断，stdout 含「Plan → Execute Contract 校验失败」 |
| T3 | 平台 quick scan step3（noAI scanPostcheck）完成 + platformOpts | manifest.json / SCAN_COMPLETED 不落盘 | manifest.json 落盘 + 指针 status=scan_completed |
| T4 | continueStep 完成分支 + runValidators 失败（design.md 缺失） | stage 误标 completed（绕过 gate） | 阻断 + rollback，status 回 in-progress |

`npm test`（该文件四用例全过）+ `npm run lint` 通过。

## 依赖
- expects_from: task-01（completeStageGates）+ task-02/03/04（三处接入）落地后转绿
- 测试可先写红（TDD 驱动）：当前 main 跑应失败，Wave 1/2 接入后翻转
- **测试导出缺口**：当前 `src/run.js` barrel 仅 export `_completeStepForTest`/`_outputStepForTest`，`runStage`/`continueStep` 无 ForTest 出口。需 task-01~04（或本任务）补 `_runStageForTest`（=runStage，from `./run/stage.js`）+ `_continueStepForTest`（=continueStep，from `./run/complete.js`）re-export

## 实现要点
- 复用 `test/_complete-step-harness.mjs`（`makeRepo`/`initChange`/`seedStage`/`runCapturing`/`cleanup`/`report`/`assert`）；自实现 runner：`count={passed,failed,failures}` + `assert(cond,msg)` + 末尾 `report(...)`；文件名必须 `.test.mjs`（run-tests.mjs 递归收集，非 node:test）
- T1/T2：`seedStage(pm,cwd,cn,'plan', planStepsWithLastPending())`（末步 postcheck 是 noAI），调 `_runStageForTest(pm,progress,'plan',cwd,cn,...)` 驱动 noAI 末步收尾。T1 预置 independent-tier review.json（verdict=fail）+ marker；T2 plan.md 写 task-01→task-03（缺 task-02）。断言 `after.stages.plan.status !== 'completed'` + 末步 pending（参照 run-complete-step-validator-rollback.test.mjs plan 分支）
- T3：`seedStage(...,'scan', scanStepsThirdPending())` + `platformOpts={specRoot,workspaceId,scanRunId}` + 写 `.sillyspec-platform.json` 指针，调 `_runStageForTest`。断言 `existsSync(join(specRoot,'manifest.json'))` + 指针 `status==='scan_completed'`（参照 run-complete-step-scan-platform.test.mjs manifest 断言，但走 runStage noAI 路径非 completeStep）
- T4：`seedStage(...,'brainstorm', brainstormStepsWithLastPending())` + 故意缺 design.md，调 `_continueStepForTest(pm,progress,'brainstorm',cwd,answer,{changeName:cn,printNext:false})`。断言 `stageCompleted===false` + `after.stages.brainstorm.status==='in-progress'` + 末步 pending
- `runCapturing` 已桩 process.exit 为 throw（continueStep 多处 exit(1)）；断言走 `r.result`/`r.stdout`/`after` DB 三件套

## TDD
本任务本身即测试：先写红 → task-01~04 落地后转绿，`npm test` 验证翻转。T5-T8 由 task-06 补。
