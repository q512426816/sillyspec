---
author: flow-machine-draft
created_at: 2026-10-04T16:16:16.959Z
---
# 提案书（Proposal）— 2026-10-04-log-window-arity

## 动机

任务原话转写：动机：pre-push 全量测试暴露预存缺陷——verify-postcheck B4 救赎窗口用裸计数 git log 20（git 2.45 下 ambiguous argument fatal，fail-open 静默吞）——救赎 note 路径在本机从未生效，plan-target-files D7 断言在纯 HEAD 上稳定红。一行修：-n 形态。
成功标准：
- B4 救赎窗口的 git log 裸计数改为 -n 形态，救赎 note 路径恢复生效且既有 D7 断言转绿
- 既有测试回归绿且 lint 零死导出

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. B4 救赎窗口的 git log 裸计数改为 -n 形态，救赎 note 路径恢复生效且既有 D7 断言转绿
2. 既有测试回归绿且 lint 零死导出

## 成功标准（可验证）

1. B4 救赎窗口的 git log 裸计数改为 -n 形态，救赎 note 路径恢复生效且既有 D7 断言转绿
2. 既有测试回归绿且 lint 零死导出
