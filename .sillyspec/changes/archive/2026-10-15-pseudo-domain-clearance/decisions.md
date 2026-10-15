---
author: flow-machine-draft
created_at: 2026-10-15T01:37:52.755Z
---
# 决策记录（Decisions）— 2026-10-15-pseudo-domain-clearance

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：release 模块卡的 doc-debt 机器把任何 package.json 触达（含依赖升级）计为卡欠账 behind——接受：这正是发布面应有的可见性，欠账是 advisory 不阻断。次风险：docs-consistency 承接 10 条语义混杂（报告/收件箱/入库）——接受并留痕：一次性文档工作不值逐条建卡，未来同类工作若复发再立专域。放弃方案：①全部迁 unmapped（伪域计数归零但把 holding pen 灌爆，unmapped 基线消音机制会被打穿）；②为每个 auto-* 补卡转正（伪域即「无模块卡」的病本身，转正等于把噪音域固化进路由词典）；③按 suggestDomainFromFiles 机械迁移（实测对纯文档变更 5/8 组无法判定、2/8 组误建议——正是伪域成因机制本身，不可作为裁决依据）。
