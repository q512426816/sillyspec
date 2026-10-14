---
author: flow-machine-draft
created_at: 2026-10-14T08:05:40.486Z
---
# 提案书（Proposal）— 2026-10-14-timeline-ticktime-anchor-scope

## 动机

任务原话转写：时间线两处数据缺陷修复（2026-10-14-deploy-release-notes@multi-agent-platform 时间线实证）：①勾选时刻全为「?」——tasks.md 复选框无时间戳，timeline 只能从 watcher 事件流 task-done 计数链推断，而直接 Edit 翻格 + watcher 观测盲窗（watcher 11:25 才拉起，勾选发生在上午）导致事件流 0 条 task-done，推断不可用；②提交锚跨变更误锚——anchor 匹配是对提交消息做 task-NN 纯文本 token 匹配，同仓其他变更（litellm-retire）提交消息里恰好含 task-01/04/05 token 被误锚到 deploy-release-notes 任务行，而真正含全部产出的功能提交 26a6ea023 因消息无 task-NN 一个锚都没贡献。

成功标准：
- task tick 翻格成功后在变更目录落带时间戳的勾选留痕（task-ticks.jsonl，随归档进 git 跨机可读），timeline 任务面优先显示该精确时刻（不带 ≈），侧车缺行再退事件流推断（≈），再退「?」——观测盲窗里的 CLI tick 不再丢勾选时刻
- 提交锚按变更名收敛：提交全消息不含本变更名的提交不参与该变更任务行的锚定（litellm-retire 案例回归：6c490325f/ab87d6adb 含 task-01/04/05 token 但消息属他变更，不得锚到 deploy-release-notes 任务行）；事件时间轴 commit 行展示面不变
- 幂等重勾零追加、侧车写失败不阻断翻格、已有测试全绿 + lint 绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. task tick 翻格成功后在变更目录落带时间戳的勾选留痕（task-ticks.jsonl，随归档进 git 跨机可读），timeline 任务面优先显示该精确时刻（不带 ≈），侧车缺行再退事件流推断（≈），再退「?」——观测盲窗里的 CLI tick 不再丢勾选时刻
2. 提交锚按变更名收敛：提交全消息不含本变更名的提交不参与该变更任务行的锚定（litellm-retire 案例回归：6c490325f/ab87d6adb 含 task-01/04/05 token 但消息属他变更，不得锚到 deploy-release-notes 任务行）；事件时间轴 commit 行展示面不变
3. 幂等重勾零追加、侧车写失败不阻断翻格、已有测试全绿 + lint 绿

## 成功标准（可验证）

1. task tick 翻格成功后在变更目录落带时间戳的勾选留痕（task-ticks.jsonl，随归档进 git 跨机可读），timeline 任务面优先显示该精确时刻（不带 ≈），侧车缺行再退事件流推断（≈），再退「?」——观测盲窗里的 CLI tick 不再丢勾选时刻
2. 提交锚按变更名收敛：提交全消息不含本变更名的提交不参与该变更任务行的锚定（litellm-retire 案例回归：6c490325f/ab87d6adb 含 task-01/04/05 token 但消息属他变更，不得锚到 deploy-release-notes 任务行）；事件时间轴 commit 行展示面不变
3. 幂等重勾零追加、侧车写失败不阻断翻格、已有测试全绿 + lint 绿
