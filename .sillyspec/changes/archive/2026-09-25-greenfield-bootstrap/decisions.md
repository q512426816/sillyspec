---
author: flow-machine-draft
created_at: 2026-09-25T16:15:29.366Z
---
# 决策记录（Decisions）— 2026-09-25-greenfield-bootstrap

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险=草案模块切分错误（把一个模块劈成两个或并错段）——错误域语义比 unmapped 更隐蔽（评审 P3 已预登）；缓释：draft 标识+醒目提示 scan 校准+modules rebuild 可重建；不校准也可用（域路由至少分流不堆积）。死路①：草案含 blast 段——判级消费 blast 缺席有安全降级（S1 起步），写入反而引入过时 blast 风险，弃；死路②：unmapped 治理自动化（自动按目录段迁移存量条目）——720 条存量迁移是数据操作需逐条人审（承接语义），超出本变更，交治理指引引导后续变更分批承接。
