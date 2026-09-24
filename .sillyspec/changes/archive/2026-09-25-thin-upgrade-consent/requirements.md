---
author: flow-machine-draft
created_at: 2026-09-24T17:41:52.765Z
---
# 需求规格（Requirements）— 2026-09-25-thin-upgrade-consent

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:8851bc88ddd8af88a60fb4acbc3fd7c5bbacacc20b9565ee76a8c0d768d08344:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
### FR-01: 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未
Given flow 薄跑道在跑
When flow done 裁决执行
Then 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未带 --upgrade-thick 时拒跑 exit 2 并指路（征得同意带 flag 重跑 / 未确认回薄道）；带 flag 才落 legacy_fallback 且留痕同意时点

### FR-02: flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照办式表述）

### FR-03: agents-instruction 规则同步（升厚需用户同意）
Given flow 薄跑道在跑
When flow done 裁决执行
Then agents-instruction 规则同步（升厚需用户同意）

### FR-04: 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑤（无 flag 拒跑/带 flag 留痕两态断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑭（由用户裁决文案断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
templates/agents-instruction.md 规则 5（人工核对面）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + test/stage-burst.test.mjs 43 例
