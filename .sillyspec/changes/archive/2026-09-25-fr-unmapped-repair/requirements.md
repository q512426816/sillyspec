---
author: flow-machine-draft
created_at: 2026-09-25T12:39:47.186Z
---
# 需求规格（Requirements）— 2026-09-25-fr-unmapped-repair

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 幽灵条目补节头修复
Given unmapped.md 有 7 条缺 FR 节头的孤立字段块（外部合回切割损伤）
When 按全文锚点从在场归档恢复标题并补 FR-unmapped-714~720 节头
When 修复后 readActiveFrDigest 读到全部 7 条（标题非佚失）

### FR-02: 写入路径健壮性钉
Given 幽灵损伤不可能来自本仓写入路径的论断
When indexRequirements 产出经 splitKnowledgeSections 解析
Then preamble 零孤立字段行（变更：/状态：开头）且条目全数成 section



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/fr-unmapped-repair.test.mjs 用例②（714-720 可读+标题恢复断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/fr-unmapped-repair.test.mjs 用例①（preamble 零孤立字段行）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段（成功标准逐句拆条），验收面已并入 FR-01/FR-02
<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段（成功标准逐句拆条），验收面已并入 FR-01/FR-02
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段（成功标准逐句拆条），验收面已并入 FR-01/FR-02
