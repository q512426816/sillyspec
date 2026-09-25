---
author: flow-machine-draft
created_at: 2026-09-25T05:08:34.231Z
---
# 需求规格（Requirements）— 2026-09-25-flow-checkpoints

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 轻量变更三断点可控性
Given 轻量变更 2 调用协议
When agent 执行任务
Then 用户在三个断点可以看到进度并确认
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: flow start 简报增加三断点纪律段：①spec 断点（填完 FR/design 槽后把摘要给用户看，等确认再写代码）②执行断点（写完代码跑完测试后把结果给用户看）③归档断点（flow done 后把收口结果给用户看）——用户明确说全跑完则跳过
FR-02: 新增 flow status 子命令：读 flow-state.yaml 显示当前变更名/阶段（spec/execute/archive）/已填槽位/子步进度
FR-03: flow done 收口输出加「即将归档」预告行（8 子步跑完 → 📦 归档前预告 → 归档执行）
FR-04: 测试：status 命令三态（无变更/进行中/已归档）、简报三断点文案断言
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-checkpoints.test.mjs 全套（简报三断点断言+status 三态）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-checkpoints.test.mjs 全套（简报三断点断言+status 三态）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-checkpoints.test.mjs 全套（简报三断点断言+status 三态）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-checkpoints.test.mjs 全套（简报三断点断言+status 三态）
