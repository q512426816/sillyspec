---
author: flow-machine-draft
created_at: 2026-09-24T15:50:11.560Z
---
# 需求规格（Requirements）— 2026-09-24-thin-design-record

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:7fa1405c70ce628881035d3573a1a2aa47e77413712b7f29ec129cdbc0211670:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-24-thin-design-record 留痕重锚 -->
### FR-01: flow start 为每个新变更机器起草 changes/<名>/design
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 为每个新变更机器起草 changes/<名>/design.md：四节骨架（做法概述/接口契约/边界与并发盲维四问/风险与死路），机器段为固定问题模板带指纹，AGENT 槽为作答面

### FR-02: flow done 工件子步对 design.md 做指纹三态校验，且 AGEN
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done 工件子步对 design.md 做指纹三态校验，且 AGENT 槽空槽拒收（写不适用加理由视作已填）

### FR-03: 新增测试覆盖骨架生成与空槽拒收两档用例，flow 系测试面全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试覆盖骨架生成与空槽拒收两档用例，flow 系测试面全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->
