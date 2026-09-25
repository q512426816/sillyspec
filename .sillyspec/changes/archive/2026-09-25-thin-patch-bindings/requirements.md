---
author: flow-machine-draft
created_at: 2026-09-24T16:29:37.943Z
---
# 需求规格（Requirements）— 2026-09-25-thin-patch-bindings

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:d559b5091dc6db47ed60bdc082511039d3f70e73013b800b5aea5f0706aa7360:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
### FR-01: flow done 新增 patch 子步（ledger 后 noAI）：bui
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done 新增 patch 子步（ledger 后 noAI）：buildFrozenPatch 以 baseline 为基、归属收窄后的本变更文件面冻结（含工作树未提交与 untracked），落 changes/<名>/change.patch 与 change-patch.json（行数统计+sha256 锚），fail-soft 不阻断

### FR-02: requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flo
Given flow 薄跑道在跑
When flow done 裁决执行
Then requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flow done artifacts 校验槽非空（不适用加理由=已答；零槽=骨架过旧，指引删除后重入 start 补生成）

### FR-03: distill 在 indexRequirements 前从槽位提取绑定行落 t
Given flow 薄跑道在跑
When flow done 裁决执行
Then distill 在 indexRequirements 前从槽位提取绑定行落 test-trace.json（FR 局部锚、candidate、machine 口径），随既有归档提升铸全局

### FR-04: 新增测试覆盖三件，flow 系测试全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试覆盖三件，flow 系测试全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑥b/⑨ 用例（patch 留档断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs ⑩ 用例（槽位门三态）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑨ 用例（trace 落盘+提升断言）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs（⑦⑧⑩）与 test/flow-protocol.test.mjs、test/flow-route.test.mjs 全套
