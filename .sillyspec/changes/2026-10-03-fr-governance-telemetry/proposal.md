---
author: flow-machine-draft
created_at: 2026-10-02T17:01:53.470Z
---
# 提案书（Proposal）— 2026-10-03-fr-governance-telemetry

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:dc66bf407f142798011753ac13159c4ee5ed77f4c49d299f1b1aeef6c9e6ad9f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
任务原话转写：治理遥测补齐——让 L3 裁决有的放矢。动机：fr-rot-suspect（72 次）与 fr-unreferenced（64 次，平台仓口径）只带域级计数不带 FR id——裁决「哪些条目该退休」无的放矢，证据发生器在发电没人接电（全局审计实证：两仓 decisions 零 L3 裁决记录）。方案：①两类事件负载补 FR id 清单（帽 20，存量事件无字段向后兼容）；②knowledge stats 新增裁决候选视图（按 id 聚合触达/未引用次数 Top-N，渲染附仪式指引）；③unmapped 停车场（本仓 723 条）治理：planRedomain 机械可迁者迁移、不可迁者头注显式降级「检索面-only」。
成功标准：
- fr-rot-suspect 事件带 frIds（覆盖命中条目 id，帽 20）、fr-unreferenced 事件带 ids（同帽）——存量无字段事件解析零破坏
- knowledge stats 输出新增「裁决候选」视图：按 FR id 聚合 rot-suspect 触达次数与 unreferenced 次数，Top-N 渲染附来源变更与处置指引行
- 本仓 unmapped 池机械迁移执行（planRedomain 干跑→可迁者 --write），不可迁残余在 unmapped.md 头注「检索面-only」声明，数量披露
- 新增测试全绿 + 既有断言零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:77e2c4ab505f70dc54e8ad1226893c619adf7ddfb6d1f340508317ddf5279665:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. fr-rot-suspect 事件带 frIds（覆盖命中条目 id，帽 20）、fr-unreferenced 事件带 ids（同帽）——存量无字段事件解析零破坏
2. knowledge stats 输出新增「裁决候选」视图：按 FR id 聚合 rot-suspect 触达次数与 unreferenced 次数，Top-N 渲染附来源变更与处置指引行
3. 本仓 unmapped 池机械迁移执行（planRedomain 干跑→可迁者 --write），不可迁残余在 unmapped.md 头注「检索面-only」声明，数量披露
4. 新增测试全绿 + 既有断言零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:66a4773743087ca4361d8d98fa38a68c022fcdda3b244bb4e63ee8ed17de565b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
1. fr-rot-suspect 事件带 frIds（覆盖命中条目 id，帽 20）、fr-unreferenced 事件带 ids（同帽）——存量无字段事件解析零破坏
2. knowledge stats 输出新增「裁决候选」视图：按 FR id 聚合 rot-suspect 触达次数与 unreferenced 次数，Top-N 渲染附来源变更与处置指引行
3. 本仓 unmapped 池机械迁移执行（planRedomain 干跑→可迁者 --write），不可迁残余在 unmapped.md 头注「检索面-only」声明，数量披露
4. 新增测试全绿 + 既有断言零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
