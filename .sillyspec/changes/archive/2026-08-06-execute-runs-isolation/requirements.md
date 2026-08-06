---
author: qinyi
created_at: 2026-08-06 13:52:01
---

# 需求规格（Requirements）

## 功能需求

### FR-01 drift 守卫设 specDriftAnchor
当 `detectWorktreeSpecDrift(specBase)` 命中（agent cd 进 worktree 跑 plan/execute/verify/archive，非平台模式、非显式 --spec-dir）时，drift 守卫必须在 `platformOpts` 上追加字段 `specDriftAnchor = wt.mainSpecBase`（主仓 specBase 绝对路径）。
- **验证**：drift 命中后读 `platformOpts.specDriftAnchor` 等于主仓 `.sillyspec` 绝对路径；非 drift / 平台模式 / 显式 --spec-dir 时不设（undefined）。

### FR-02 resolveRuntimeRoot 工具函数
`src/run/shared.js` 新增 `resolveRuntimeRoot(platformOpts, localSpecBase)`，按优先级返回 `.runtime` 根目录：
1. `platformOpts.runtimeRoot`（平台模式优先）
2. `platformOpts.specDriftAnchor` 命中 → `join(specDriftAnchor, '.runtime')`
3. `join(localSpecBase, '.runtime')`（常规本地兜底）
- **验证**：三种输入组合的单元测试；函数纯函数无副作用。

### FR-03 11 处 A 类站点统一改用 resolveRuntimeRoot
下列站点（design §5.A）的 runtimeRoot 解析公式 `platformOpts?.runtimeRoot || join(<localSpecBase>, '.runtime')` 改为 `resolveRuntimeRoot(platformOpts, <localSpecBase>)`：
- `src/run/gates.js:111`（enforceReviewJsonGate）
- `src/run/gates.js:271`（Stage Review Gate 读 marker）
- `src/run/gates.js:314`（execute Task Review Gate 写 marker）
- `src/run/stage.js:92`（execute step 进入写 marker）
- `src/run/complete.js:500`（execute complete 读 marker / 产物）
- `src/run/prompt.js:453`（execute prompt 注入 marker）
- `src/run/prompt.js:491`（tier review 注入）
- `src/run/prompt.js:529`（task completion 报告注入）
- `src/run/command.js:427`（quick run-id marker）
- `src/run/command.js:735`（quick run-id 写入）
- `src/task-review.js:631`（writeExecuteRunMarker / task review 写入）
- **验证**：drift 场景下每站点产出的 marker / review.json 路径在主仓 `.runtime`。

### FR-04 3 处 contract-matrix 调用方解析 runtimeRoot（B 类）
`src/contract-matrix.js:146/217/334`（extractProviderArtifact / buildConsumerInjection / verifyApiParity）的调用方（`verify-postcheck.js:723` runVerifyParityCheck / `gates.js:219` parity 透传 / 可能含 `machine-interface.js:184,402`）改为先经 `resolveRuntimeRoot` 解析出绝对 runtimeRoot 再传入；contract-matrix 函数内兜底公式保留作防御。
- **验证**：parity check 在 drift 场景读主仓 contract-artifacts。

### FR-05 drift 场景 execute-runs 落主仓
drift 命中时，execute marker（`current-execute-run-id-<changeName>`）与 task review.json（`execute-runs/<runId>/tasks/task-<NN>/review.json`）落 `<主仓>/.sillyspec/.runtime/`，worktree 内 `.runtime/` 无这些文件。
- **验证**：T-01 / T-02。

### FR-06 drift 场景 stage-reviews 落主仓
drift 命中时，stage review marker（`current-stage-review-run-id-<changeName>`）与 review 目录（`stage-reviews/<stage>-<runId>/review.json`）落主仓 `.runtime`。
- **验证**：T-03。

### FR-07 specDriftAnchor 不触发平台 sentinel
drift 命中后，`triggerSync`（`shared.js:288`）/ `checkApproval`（`shared.js:315`）仍按本地链路执行（未被 `specRoot||runtimeRoot` 短路跳过）；prompt 渲染走本地分支（`prompt.js:217` isPlatform=false）；scan-postcheck 不误进平台分支。
- **验证**：T-05；grep 确认 sentinel 检查形式均为 `specRoot||runtimeRoot`，不含 specDriftAnchor。

### FR-08 多 change 并行隔离
多个 change 并行 drift 时，各 marker 路径含各自 changeName，runId 全局唯一（时间戳），execute-runs / stage-reviews 产物路径无覆盖。
- **验证**：T-04。

## 非功能需求

### NFR-01 零回归
- 平台模式（runtimeRoot 已设）行为零变化（FR-02 优先级 1）。
- 常规本地模式（无 drift）行为零变化（FR-02 优先级 3）。
- **验证**：T-06 / T-07。

### NFR-02 跨平台兼容
- 路径用 `node:path` join（Windows 反斜杠 / POSIX 正斜杠兼容）。
- 无换行 / 并发引入的新问题。
- **验证**：CI Windows + Linux。

### NFR-03 可维护性
- 13 站点统一调 `resolveRuntimeRoot`，避免公式漂移（单点维护）。
- **验证**：code review + grep 核对无残留旧公式。

### NFR-04 文档同步
- `docs/sillyspec/file-lifecycle.md` 同步 execute-runs / stage-reviews 落点说明（drift 场景落主仓）+ 更新 `updated_at`。
- 若 prompt 注入文本未改则 `docs/prompt/` 不动（plan 复核）。
- **验证**：人工核对。

## 风险级
risk_level = **unit-sufficient**（确定性路径解析逻辑，单元测试覆盖；无并发 / IO 竞态 / 外部依赖）。
