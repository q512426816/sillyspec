---
author: flow-machine-draft
created_at: 2026-09-27T05:47:48.613Z
---
# 决策记录（Decisions）— 2026-09-27-knowledge-digest

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：阈值为拍脑袋初值（rot 100/inbox 20）——先按本仓实测量级定（本仓实测 305/39 首跑双超），连续安静或持续爆表都该调，防仪式化熔断在案。次风险：suggestDomainFromFiles 对扁平 src 布局返回 src（无意义域）——已接受（monorepo 规则在前覆盖；错建议不自动执行只提示，人工裁决兜底）。readFrBindings 逐条目扫描 O(条目×文件) 性本仓秒级可接受（周节奏消费）。放弃方案：rot 判据收紧——细看后收回：广域变更打 239 条标记是诚实信号（真触达），病在阅读面不在判据，digest 按域聚合即解。
