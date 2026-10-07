---
author: flow-machine-draft
created_at: 2026-10-07T13:21:36.780Z
---
# 决策记录（Decisions）— 2026-10-07-allticked-gate-docs-resync

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：全勾硬门对存量在途变更的收紧（未勾收口从放行变拒收）——出口明确（补 token 提交+tick 或改写任务面），且与证据门同哲学；次风险：tick 触发的后台同步在网络差时堆积——bg-sync 单飞锁+合并天然防堆积。试过放弃：时序门（tick 时 token 提交须已存在，先证后勾）——用户裁定参考 openspec：openspec 无任何时序/证据审计，完成状态机（全勾才收口）+自愿循环指令即是其全部机制，我们已有证据门加全勾门已强于它，时序门属过度强制，放弃。
