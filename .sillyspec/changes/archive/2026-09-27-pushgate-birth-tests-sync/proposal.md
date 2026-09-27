---
author: flow-machine-draft
created_at: 2026-09-27T15:23:27.782Z
---
# 提案书（Proposal）— 2026-09-27-pushgate-birth-tests-sync

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:df63dbace0ff27985a954871d20d2be37a5c865e499fdf45021cb0a9a4a2b333:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
任务原话转写：推送门真红双清偿——eb3b4bce 出生未入门态语义的存量测试面同步遗留：a) test/stage-contract.test.mjs 转换表 brainstorm→execute 期望过时（出生未入门态〔brainstorm 仍 pending/无 stages 行〕等价旧 scan 出生态，主流程直入放行——eb3b4bce 设计意图，其⑤组 9 断言已覆盖真入门守卫）；表行改带 fromStageData:{status:'in-progress'} 测真在 brainstorm 中跳步仍拦 + 补出生未入门放行行。b) test/state-machine-guards.test.mjs 用例 1a fixture 未显式入态（initChange 出生即 brainstorm/pending，新语义直入放行 exit 0）；fixture 补 stages.brainstorm.status='in-progress' 显式入态，保留「未合法走完主流程链直跳 verify 被拦」守卫断言。成功标准：
- test/stage-contract.test.mjs 全绿（含出生未入门放行断言 + 真入门拦截断言）
- test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）
- 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:5f520881f8f761fb98acb4b0ecc1e6881bd27820f4efb434a0aa2d01ea537040:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
按成功标准机械推导，共 2 条验收面：
1. test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）
2. 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:06580feb5b276d2b542cf216ec7258f13ed4ba448cbeccc8fadcc66ab79879b6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
1. test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）
2. 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
