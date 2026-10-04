---
author: flow-machine-draft
created_at: 2026-10-04T16:28:05.675Z
---
# 决策记录（Decisions）— 2026-10-04-log-window-arity

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：把 D7 改绿被误读为「修测试过门」——但方向相反：产码缺陷（裸计数 fatal）是真修复主体，夹具修正只是让测试重新测到它（修复前该断言在纯 HEAD 稳定红）。试过放弃：只改产码不动夹具（否决——B1 先命中下 note 断言仍永红，测试继续假失败）。
