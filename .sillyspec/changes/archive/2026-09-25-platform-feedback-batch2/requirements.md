---
author: flow-machine-draft
created_at: 2026-09-25T15:44:59.553Z
---
# 需求规格（Requirements）— 2026-09-25-platform-feedback-batch2

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 他侧声明时效+skipped 标因+触发收敛+声明面自证
Given 平台狗粮第二轮反馈
When B/C/D/E 四件修复
Then 陈旧声明不抢文件、跳过有因、触发不误报、声明面有自证
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: B：collectForeignDeclaredFiles 增加时效判据——变更超过 7 天无活动（progress DB lastActive 或变更目录 mtime）的声明视为陈旧忽略
FR-02: C：test 结果 skipped 时带 reason 字段（环境缺件/无测试面/模块未命中/纯 doc）——实测面对账行透传
FR-03: D：PROMISE_RE 收敛——移除幂等（实现手段，由 diff 原语面覆盖），保留 at-least-once/exactly-once/不丢失/不重复/不丢不重/不重不漏/串台（交付语义）
FR-04: E：flow done patch 子步后自证——design.md 文件变更清单中声明的文件是否都在冻结面，不在则警告（design 声明了改但没交付=承诺未兑现面）
FR-05: 测试：D 收敛正负例/B 时效（新变更声明生效+旧变更声明忽略）/C reason 字段/E 声明面自证
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 D 收敛后承诺词测试更新 + B 时效隐式覆盖 + C fmt 输出含 reason + E 声明面自证隐式覆盖）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 D 收敛后承诺词测试更新 + B 时效隐式覆盖 + C fmt 输出含 reason + E 声明面自证隐式覆盖）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 D 收敛后承诺词测试更新 + B 时效隐式覆盖 + C fmt 输出含 reason + E 声明面自证隐式覆盖）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 D 收敛后承诺词测试更新 + B 时效隐式覆盖 + C fmt 输出含 reason + E 声明面自证隐式覆盖）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 D 收敛后承诺词测试更新 + B 时效隐式覆盖 + C fmt 输出含 reason + E 声明面自证隐式覆盖）
