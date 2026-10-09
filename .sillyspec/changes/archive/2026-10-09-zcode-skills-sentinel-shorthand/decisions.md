---
author: flow-machine-draft
created_at: 2026-10-09T01:13:33.522Z
---
# 决策记录（Decisions）— 2026-10-09-zcode-skills-sentinel-shorthand

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：展开正则过宽把非任务数字串（如版本号 task-013、task-010）误切放大证据面——以尾数前瞻 `(?!\d)` + 组内逐段 `\d{1,2}` 双约束锁边，测试③钉住。试过但放弃：在 flow.js 内联一份连写展开正则（放弃理由——与哨兵判定口径分叉，正是本坑复发的温床；收敛为 sentinel-assertions.js 单一导出、两处共用）。
