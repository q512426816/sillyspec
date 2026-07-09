---
author: qinyi
created_at: 2026-07-09 19:53:30
---

# 需求 — 机器接口 v1

> 决策来源：decisions.md D-001@v1 ~ D-009@v1，全部当前版本决策均被下列 FR 覆盖。

## FR-01 gate 命令（阶段门控聚合）

- 新增 `sillyspec gate <stage> --change <name> [--json]`。
- 聚合检查：artifacts（runValidators）、transition（checkTransition，informational）、execute 阶段加 task-reviews + execute-evidence、verify 阶段加 verify-test。
- 只读：调用前后 sillyspec.db 内容不变，不写 gate-status.json，不 triggerSync（D-002@v1）。
- execute 下 artifacts 与 execute-evidence 同源核验只执行一次、结论不得矛盾（D-008@v1）。
- 覆盖决策：D-001、D-002、D-003、D-008。

## FR-02 derive 命令（单项事实核验）

- 新增 `sillyspec derive <facet> --change <name> [--json]`，facet ∈ {execute-evidence, verify-test, task-reviews, artifacts}。
- 分别复用 checkExecuteCodeEvidence / runVerifyTestCheck / validateTaskReviews / runValidators，返回结构化事实。
- 非法 facet → exit 2。
- 覆盖决策：D-001、D-003。

## FR-03 退出码与输出纪律

- gate/derive 退出码仅允许：0 核验通过（可含 warnings）、1 核验失败、2 无法核验（用法/环境/内部异常）（D-004@v1）。
- `--json` 模式 stdout 仅输出一段可 JSON.parse 的文本；日志与第三方打印重定向 stderr；内部异常兜底输出合法 JSON 并 exit 2。
- 覆盖决策：D-002、D-004。

## FR-04 接口契约文档

- 新增 `docs/sillyspec/interface-contract.md`：命令面、envelope schema（顶层固定字段 schema_version/command/change/ok/errors/warnings/generated_at）、退出码语义、副作用声明（verify-test 落盘取证 + 慢命令/重复执行行为）、演进规则（加字段随意，改语义 bump schema_version）、TBD-hub-api 待对账清单。
- 覆盖决策：D-005、D-009。

## FR-05 platform approve / reject 实现

- `sillyspec platform approve <change>` / `platform reject <change> [--reason]` 真实调用平台 API 并更新 approvals 表（_updateApprovalStatus）。
- 网络/平台失败：可读错误 + exit 1（显式动作 fail-visible，不同于 best-effort sync）。
- 端点形态标记 TBD-hub-api，实现单点封装于 sync.js。
- 覆盖决策：D-006。

## FR-06 workflow-runs runtimeRoot 透传

- run.js 中 scan 深度扫描与 archive 模块影响两处 `saveWorkflowRun` 调用透传 `runtimeRoot`/`scanRunId`，平台模式下 workflow run 落 `<runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/`。
- 非平台模式行为不变（参数 undefined 走既有默认分支）。
- 覆盖决策：D-006。

## NFR

- NFR-01 零新增外部依赖，原生 node（既有仓库约定）。
- NFR-02 纯增量、可整体回退：不改 run/progress 存量行为与输出格式（D-001、方案 B）。
- NFR-03 无生命周期状态机：gate/derive 无状态单次调用（D-007@v1）。
- NFR-04 测试：新增 test/machine-interface.test.mjs 纳入 npm test，覆盖 design.md 9 条验收标准。

## 剩余风险

- TBD-hub-api：approve/reject 端点以 SillyHub 实际 API 为准（design.md §8，最高优先待对账）。
- 无未覆盖的 D-xxx 决策。
