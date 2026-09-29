---
author: flow-machine-draft
created_at: 2026-09-29T05:52:18.701Z
---
# 决策记录（Decisions）— 2026-09-29-rot-retire-inject-cap

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：needsReview 字段存在未核证的隐性消费方导致运行时 undefined——已由三个只读子代理全仓 grep 核证仅 flow.js:172 与 prompt.js:1231 两处，且拆除顺序钉死「先拆消费、后拆字段」。次风险：剥行误伤条目正文中的「待复核」字样——剥离仅匹配行首前缀「^待复核：」，与机器契约行格式一致，另有测试断言剥后 grep 为零。 死路（已试弃，防复潮）：① 修 rot 判据精度（枢纽文件 df 降权）保留标记层——零消费实证下把信号修准仍是家具，先拆后看；② unmapped 池整池外移冻结——resolveTouchedDomains 兜底会重建池子、104 个来源变更的幂等闸门只扫 fr/ 会把搬走条目静默写回（子代理核证），本次只做注入排除；③ distill dup 升硬门——存量 active 标题 pairwise 38 对 ≥0.6（「测试覆盖」三条互撞 1.00）全是真独立需求，硬门逼假承接行污染取代链。
