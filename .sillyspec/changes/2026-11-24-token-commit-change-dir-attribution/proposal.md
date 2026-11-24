---
author: flow-machine-draft
created_at: 2026-11-24T04:28:30.659Z
---
# 提案书（Proposal）— 2026-11-24-token-commit-change-dir-attribution

## 动机

任务原话转写：无名 task 提交按触及的变更目录归属

2026-11-24 multi-agent-platform 仓实证（变更 2026-11-24-presession-payload-knowledge-assert）：CLI 把「标题含任意 task-NN」的提交都算作当前变更的交付提交——src/flow-parity.js 的 detectPatchDrift 与 deliveryFaceAnchoredAfter 用 /task-\d+/ 分支判 own，src/foreign-declared.js 的 buildCommitAttribution 用 tokened 标记、isForeignByCommit 对 tokened 恒判 own。共享仓多会话并行、各会话都按 task-NN 约定提交时，别的会话的提交被误判为本变更的：冻结补丁从 7 个文件膨胀到 34 个（只有 3 个属于该变更），已通过的独立评审被当作过期而隔离作废，每次重跑都会再触发，收口走不到终点。用户选择由 agent 来修 CLI。

实证中 5 笔被误判的提交全部触及了它们各自变更的目录（.sillyspec/changes/<其变更名>/…）——task tick 的提交指引把该变更的 tasks.md 与 task-ticks.jsonl 随交付同一提交入库，这是可用的提交事实。约束：2026-11-13 坑 flow-done-patch-refreeze-skip-on-rework 的回归（test/flowdone-disposition-drift.test.mjs 第 ⑦ 条）要求「无名有 task-NN、但不触及任何变更目录」的返工提交仍算本变更提交，不得回归。

成功标准：
- 别的变更的 task-NN 提交不再触发本变更的审计时点漂移：带 task-NN 但无变更名的提交，在触及了其他变更的目录时不算本变更提交
- 同一条规则贯通文件级归属：这类提交触碰的文件不进本变更的 own 面与 patch 冻结面
- 带本变更名的提交、触及本变更目录的无名 task 提交、以及不触及任何变更目录的无名 task 提交，维持原行为（仍算本变更提交）——既有回归测试（含第 ⑦ 条）保持通过
- 补单测覆盖「他变更的 task-NN 提交不触发漂移」

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 别的变更的 task-NN 提交不再触发本变更的审计时点漂移：带 task-NN 但无变更名的提交，在触及了其他变更的目录时不算本变更提交
2. 同一条规则贯通文件级归属：这类提交触碰的文件不进本变更的 own 面与 patch 冻结面
3. 带本变更名的提交、触及本变更目录的无名 task 提交、以及不触及任何变更目录的无名 task 提交，维持原行为（仍算本变更提交）——既有回归测试（含第 ⑦ 条）保持通过
4. 补单测覆盖「他变更的 task-NN 提交不触发漂移」

## 成功标准（可验证）

1. 别的变更的 task-NN 提交不再触发本变更的审计时点漂移：带 task-NN 但无变更名的提交，在触及了其他变更的目录时不算本变更提交
2. 同一条规则贯通文件级归属：这类提交触碰的文件不进本变更的 own 面与 patch 冻结面
3. 带本变更名的提交、触及本变更目录的无名 task 提交、以及不触及任何变更目录的无名 task 提交，维持原行为（仍算本变更提交）——既有回归测试（含第 ⑦ 条）保持通过
4. 补单测覆盖「他变更的 task-NN 提交不触发漂移」
