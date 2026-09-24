---
author: flow-machine-draft
created_at: 2026-09-24T22:52:37.391Z
---
# 需求规格（Requirements）— 2026-09-25-thin-precheck-removal

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:8cf4805ec973a8c1305af6f16c62a4d171ef766507a73f73562a4d6563e3b91b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-precheck-removal 留痕重锚 -->
### FR-01: flow start 删除复杂度预判块（classifyChange 关键词升厚
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 删除复杂度预判块（classifyChange 关键词升厚建议不再出现在薄道简报——选道只剩形态信号：清晰度门管需求不明，升厚只留用户决策与运行时信号）

### FR-02: 测试 ⑭ 反转：含迁移关键词的 input 不再出现任何升厚建议文案
Given flow 薄跑道在跑
When flow done 裁决执行
Then 测试 ⑭ 反转：含迁移关键词的 input 不再出现任何升厚建议文案

### FR-03: agents-instruction 规则 5 同步（选道不看技术关键词，风险面
Given flow 薄跑道在跑
When flow done 裁决执行
Then agents-instruction 规则 5 同步（选道不看技术关键词，风险面归收口评审证据判定）

### FR-04: flow 系全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑭（迁移关键词 doesNotMatch 三断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑭ 同上（反转即覆盖）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
templates/agents-instruction.md 规则 5（人工核对面）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst 50 例 + test:core 176 例
