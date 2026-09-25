---
author: flow-machine-draft
created_at: 2026-09-25T09:56:45.431Z
---
# 需求规格（Requirements）— 2026-09-25-feedback-fixes

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 勾选/指纹/CRLF/恢复四件修复
Given 平台狗粮实证反馈
When 逐条判定修复
Then 勾选自由、CRLF 兼容、报错可恢复
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: tasks-rows 去指纹化（agent 直接勾选，不走 amend 不触发 editRatio——与 FR 区同模式）
FR-02: CRLF 全局归一化：flow-draft.js readText helper + flow-review.js classifyReviewNeed 两处读取归一
FR-03: 槽位报错加恢复指引（从 step-guides 指纹缓存找骨架
FR-04: 删文件重入 flow start）
FR-05: ②⑤记档不修（②已有勾选纪律提示
FR-06: ⑤需设计冻结面重触发机制，独立变更）
FR-07: 67+180 全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 tasks 无指纹断言 + CRLF 场景隐式覆盖）
