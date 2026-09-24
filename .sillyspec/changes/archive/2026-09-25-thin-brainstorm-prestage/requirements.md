---
author: flow-machine-draft
created_at: 2026-09-24T16:40:05.518Z
---
# 需求规格（Requirements）— 2026-09-25-thin-brainstorm-prestage

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:6aa2393b53219c8c718b005947d19e2cec643f396d80980cf6c79e678af05342:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
### FR-01: flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时 exit 2 并给两选一（头脑风暴预段 / 补成功标准重跑）；重入与 adopt 路径不受此门影响

### FR-02: adopt 收编：变更目录存在 brainstorm 产物（proposal/d
Given flow 薄跑道在跑
When flow done 裁决执行
Then adopt 收编：变更目录存在 brainstorm 产物（proposal/design 在场）且无 flow-state 时，flow start 收编进薄道——写 flow-state（adopted_from=brainstorm）、redraft 只补缺件（criteria 从 proposal 成功标准回提）、requirements 无测试绑定槽则机器追加绑定节

### FR-03: flow done 对 adopted 变更豁免 design 四节槽门（bra
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done 对 adopted 变更豁免 design 四节槽门（brainstorm 设计更丰富，打印豁免说明）；绑定门不豁免

### FR-04: agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴
Given flow 薄跑道在跑
When flow done 裁决执行
Then agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口

### FR-05: 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑫ 用例（两选一/不建变更断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑬ 用例（收编/补缺件/回提/绑定槽/豁免全链断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs ⑫ 用例（实际编号追加/幂等/no-op）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
templates/agents-instruction.md 规则 3-8 与 SKILL.md 快速开始/工作流段（人工核对面）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs + test/flow-protocol.test.mjs + test/flow-route.test.mjs 全套 25 例
