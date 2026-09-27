---
author: flow-machine-draft
created_at: 2026-09-27T09:00:56.675Z
---
# 提案书（Proposal）— 2026-09-27-gate-docs-cleanup

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:222da6c1f2d426cad7ab1ef6458f12ba5584550765f8948e4d5a2bcfe9755305:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-docs-cleanup 留痕重锚 -->
任务原话转写：背景：2026-09-27-hunk-attribution-gate 归档评审留 P2 文档债（config-schema 的 hunk_gate error 档描述写「三类信号任一阻断」而实现只在未归因与跨变更竞争时阻断、在途残留恒警告）；两道新门（UI 视觉证据门、行级归属门）收口时模块卡认领 advisory 列了八张卡无增量。本变更为纯文档清理：描述对齐 + 三张实际受影响模块卡补增量。
成功标准：
- config-schema.js 的 hunk_gate 描述改为与实现一致：error 档未归因与跨变更竞争任一在场阻断、在途残留恒仅警告
- cli-entry.md 补带日期注记：flow start UI 触达注入执行须知与 flow done probes 子步双门执法
- core-engine.md 补带日期注记：verify 探针族增员至 12（UI 视觉证据分级门预填与段渲染）
- setup.md 补带日期注记：local.yaml 新增 ui_visual_gate 与 hunk_gate 两键及三档语义
- 三卡 updated_at 刷新；零代码行为改动（config-schema 仅字符串描述）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b0abb1c28bfa261a552882d71c3a9ead33cf33c1aa12c6d9706765b589fb87ea:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-docs-cleanup 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. config-schema.js 的 hunk_gate 描述改为与实现一致：error 档未归因与跨变更竞争任一在场阻断、在途残留恒仅警告
2. cli-entry.md 补带日期注记：flow start UI 触达注入执行须知与 flow done probes 子步双门执法
3. core-engine.md 补带日期注记：verify 探针族增员至 12（UI 视觉证据分级门预填与段渲染）
4. setup.md 补带日期注记：local.yaml 新增 ui_visual_gate 与 hunk_gate 两键及三档语义
5. 三卡 updated_at 刷新
6. 零代码行为改动（config-schema 仅字符串描述）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:593a1494b4d0634d3441bc6a9742ead673f8462a6b54494ae5693bda87f7e7e4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-docs-cleanup 留痕重锚 -->
1. config-schema.js 的 hunk_gate 描述改为与实现一致：error 档未归因与跨变更竞争任一在场阻断、在途残留恒仅警告
2. cli-entry.md 补带日期注记：flow start UI 触达注入执行须知与 flow done probes 子步双门执法
3. core-engine.md 补带日期注记：verify 探针族增员至 12（UI 视觉证据分级门预填与段渲染）
4. setup.md 补带日期注记：local.yaml 新增 ui_visual_gate 与 hunk_gate 两键及三档语义
5. 三卡 updated_at 刷新
6. 零代码行为改动（config-schema 仅字符串描述）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
