---
author: flow-machine-draft
created_at: 2026-10-06T06:26:23.301Z
---
# 决策记录（Decisions）— 2026-10-06-wallclock-entry

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：scan facts markdown 的 `generatedAt` 消费者（人读文档、快照 diff）看到值形状变化（UTC→本地）。已核实仓库内无测试断言 UTC 形、无机器按该字段做时间运算（git --since 消费的是 verify-facts.json），风险面收敛于人读显示。 放弃的方案：让 toWallClock 只接受 ISO 字符串并手写正则解析——放弃，正则白名单就是格式枚举，开放解析面应委托 Date 构造器；再如给 scan-facts 保留 UTC 但加后缀标注——放弃，与 datetime.js 既定的人读=本地墙钟约定冲突，制造两种并存形状。
