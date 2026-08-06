---
schema_version: 1
doc_type: module-card
module_id: machine-interface
author: qinyi
created_at: 2026-07-09T14:20:00+08:00
---

# machine-interface

## 定位

SillyHub driver 模式的机器接口层。把 SillySpec 门控与事实核验从人类可读输出流抽象成可程序化消费的统一 JSON envelope + 退出码契约（0/1/2）。**只读聚合既有策略引擎，不新增校验逻辑**（design §2 方案 B：独立模块单点封装）。

## 契约摘要

- `sillyspec gate <stage> --change <name> [--json]`：聚合门控（回答「该阶段此刻能否标记完成」，一次调用出综合结论 + checks 数组）
- `sillyspec derive <facet> --change <name> [--json]`：单项事实核验，facet ∈ {execute-evidence, verify-test, task-reviews, artifacts}
- envelope：`schema_version=1` + 固定字段（command/change/ok/errors/warnings/generated_at）+ 按需（stage/facet/checks/data）
- 退出码：0 通过（可含 warnings）/ 1 事实阻断（JSON 含 errors）/ 2 无法核验（用法/环境/变更不存在/内部异常）
- 只读语义（D-002）：不写 sillyspec.db、不写 gate-status.json、不 triggerSync、不推进 step/stage；唯一例外是 verify-test 落盘 `.runtime/verify-runs/` 取证
- 契约基准：`docs/sillyspec/interface-contract.md`（SillySpec↔SillyHub 对账）

## 关键逻辑

- `runGate(stage, changeName, {cwd, specBase, runtimeRoot, specDriftAnchor})` → `{envelope, exitCode}`：聚合 artifacts / transition(informational，不参与综合 ok) / execute 阶段加 task-reviews + execute-evidence / verify 阶段加 verify-test；D-008 execute-evidence 单次调用去重；异常 try/catch 兜底输出合法 JSON + exit 2
- `runDerive(facet, changeName, {cwd, specBase, runtimeRoot, specDriftAnchor})` → `{envelope, exitCode}`：单 facet 结构化 data 返回；非法 facet / 变更不存在 → exit 2
- `buildEnvelope({command, stage, facet, change, ok, errors, warnings, checks, data})`：统一 envelope 组装，按需字段用 `!== undefined` 判断
- 复用既有策略引擎（不重写校验）：stage-contract（runValidators / checkTransition / checkExecuteCodeEvidence）、task-review（validateTaskReviews）、verify-postcheck（runVerifyTestCheck）
- `--json` 输出纪律由 CLI 层 `src/index.js` 的 `withJsonOutput` 处理（调用期间劫持 console.log/info → stderr，stdout 留给最终 JSON）；本模块只返回 `{envelope, exitCode}` 不直接写 stdout

## 注意事项

- gate/derive 无状态单次调用（D-007，不引入 session/lease/lifecycle 状态机；文中 daemon 指 SillyHub 侧调用方，本仓库不实现守护进程）
- `validateTaskReviews` 真实签名是**单 opts 解构** `{planContent, runtimeRoot, executeRunId, allowCannotVerify, changeDir, gitDir}`（非 `(changeDir, {gitDir})`）；调用需自行组装这些参数，现成范式见 `src/run.js:3223-3249` 与本模块 runGate/runDerive
- runGate/runDerive 的 task-reviews 段 runtimeRoot 解析统一调 `resolveRuntimeRoot({runtimeRoot, specDriftAnchor}, specRoot)`（`src/run/shared.js`，三级优先级 runtimeRoot > specDriftAnchor > 本地 specBase/.runtime，坑 execute-runs-isolation）：drift 场景调用方传 specDriftAnchor=主仓 specBase 时，execute-run-id marker 读主仓 .runtime 而非 worktree 副本；未传则行为同旧公式（向后兼容）。调用方职责是据 drift 场景传入 anchor，本模块只消费
- transition check 须传 `fromStageData`（`progress.stages[currentStage]`）以触发 failed_post_check 门控，与 completeStep 保持同源（design §8 风险对策）
- Windows 下退出用 `process.exitCode` + 自然退出（非 `process.exit`），避免 UV_HANDLE_CLOSING assertion 覆盖退出码
- TBD-hub-api：approve/reject 端点待 SillyHub 实际 API 对齐（封装在 sync.js `_submitApproval` 单点）

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
