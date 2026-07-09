---
author: qinyi
created_at: 2026-07-09 19:52:30
---

# 提案 — 机器接口 v1（SillyHub driver 模式地基）

## 为什么

SillyHub 平台将做控制流反转（driver 模式）：平台按步驱动子 agent，产物核验通过才下发下一步。这从根上解决"agent 不调 CLI 就失控"的架构缺陷——但前提是 SillySpec 的门控和事实核验能被程序化消费。

当前的阻碍：

1. **门控埋在人类可读输出里**。`runValidators`、`checkExecuteCodeEvidence`、`runVerifyTestCheck` 等核验只在 `run --done` 流程内触发，结论混在装饰性文本中，退出码 1 同时表示"校验失败"和"用法错误"，daemon 无法可靠分流。
2. **两个平台对接缺口**：`platform approve/reject` 只打印"尚未实现"（审批闭环断裂）；平台模式的 workflow-runs 不落 runtimeRoot（平台读不到 postcheck 取证）。
3. **无接口契约**。两个仓库各自演进没有对账基准，集成靠口头约定必然漂移。

## 做什么

1. **新增机器接口层**（`src/machine-interface.js` + index.js 路由）：
   - `sillyspec gate <stage> --change <name> --json`——聚合回答"该阶段现在能否标记完成"，只读
   - `sillyspec derive <facet> --change <name> --json`——单项事实核验（execute-evidence / verify-test / task-reviews / artifacts）
   - 统一 JSON envelope（schema_version=1）、退出码 0（通过）/1（阻断）/2（无法核验）
2. **冻结接口契约**（`docs/sillyspec/interface-contract.md`）：命令面、envelope schema、退出码语义、副作用声明、演进规则，作为 SillyHub 对账基准。
3. **补齐平台缺口**：实现 `platform approve/reject`（HTTP + approvals 表）；`saveWorkflowRun` 透传 runtimeRoot/scanRunId。

## 不在范围内

- 长驻进程 / `sillyspec serve`（D-001@v1 否决）
- gate 写状态或推进流程（D-002@v1 否决）
- 全部存量命令的 --json 化改造（方案 C 否决）
- 派生式状态模型重构（P2 独立变更）
- SillyHub 仓库侧的 orchestrator 实现（P3+，另一仓库）
- verify-test 结果复用/缓存（D-009@v1 留 P3）

## 收益

- SillyHub driver 模式获得可编程的核验地基，策略引擎保持单点（本仓库），平台零重复实现
- 审批闭环打通，平台可远程控制 execute 前进/停止
- 契约文档使两仓库可独立演进、按 schema_version 对账

## 风险概要

最高优先待对账项：approve/reject 的平台端点形态（TBD-hub-api，已单点封装在 sync.js）。其余见 design.md §8。
