---
author: flow-machine-draft
created_at: 2026-10-12T14:39:47.534Z
---
# 决策记录（Decisions）— 2026-10-12-thick-taskbook-cli

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：任务书内嵌 renderReviewJsonContract 全文（含面向主代理的通道优先序段）——评审员视角读到达人指引略错位。接受：单源胜过第二套摘要（契约漂移的代价大于文案错位；通道段落对评审员无害——其通道已由派发方决定）。诚实边界：任务书仍由主代理复制转发，理论上可被篡改——与 thin 任务书同界（CLI 单源降低手写 leading 概率，不防恶意篡改；强凭据属平台层课题）。 试过但放弃：①改 stages/*.js 步骤指引模板内嵌任务书——模板被指纹测试钉死且三阶段重复维护，打印出口纯增面零回归；②新子命令 `review taskbook`——两个既有出口（撞门后/骨架生成时）已覆盖全部获取时机，新命令徒增维护面；③任务书内嵌前轮 findings 注入（thin 有）——厚档复审链由 register-stage-review --refresh-hash 与 docHash 机制承担，v1 不做（YAGNI，留待真实复审痛点出现）。
