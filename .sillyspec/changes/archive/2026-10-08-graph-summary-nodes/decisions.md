---
author: flow-machine-draft
created_at: 2026-10-08T09:31:52.378Z
---
# 决策记录（Decisions）— 2026-10-08-graph-summary-nodes

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：clusters 数量随域增长（真图 883 簇）撑爆平台 lite 画布——已由 `--clusters N` 截断旗标化解（消费方按需取 top-N，簇计数守恒不变）。放弃的方案：①CLI 侧默认截断 50——否，默认值是平台 UI 偏好不是引擎语义，全量才是可审计口径；②summary 落盘缓存——否，违反 D-003 图不落盘铁律且引入失效问题；③doctor 内调 summary 复用——已如此（同源口径互引，不复制实现）。死路提示：不要为「跨仓锚点单列计数」去解析 local.yaml 外仓（探测面无界，历史否决同型）。
