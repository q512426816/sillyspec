---
author: flow-machine-draft
created_at: 2026-10-05T13:02:32.808Z
---
# 决策记录（Decisions）— 2026-10-05-flowdone-lintfail-output

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：读改写 test-result.json 的并入分支在结果文件损坏时静默退独立落盘——同变更可能留下两份结果文件（原损坏件+独立 lint 件），消费端按 kind 字段区分；显式 best-effort 边界已在 JSDoc 声明。倒推收尾特有风险：接手非本会话原创的代码，语义理解偏差——已逐行核对 diff 与既有 test 三件套同构性并实跑其自带 e2e 锁定。放弃的方案：① 在 runVerifyLintCheck 内直接落盘——该函数被多路径复用（verify/quick/flow），落盘时机与归属 change 名在调用方才知道，写入层错位；② 改 tally 记全量输出——tally 是计数器不是存储，扩容错位。均已弃。
