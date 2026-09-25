---
author: flow-machine-draft
created_at: 2026-09-25T04:45:01.221Z
---
# 需求规格（Requirements）— 2026-09-25-fr-agent-writable

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: FR 区 agent 直写架构
Given 轻量变更的 requirements 需 agent 填写行为语义
When flow start 生成骨架后 agent 直接书写
Then FR 质量由 agent 保证、不走 amend、不触发 edit_ratio
<!-- 参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then -->
### FR-01: draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变
Given 平台按当前契约运行
When 本变更交付并运行
Then draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变

### FR-02: amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）
Given 平台按当前契约运行
When 本变更交付并运行
Then amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）

### FR-03: flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）
Given 平台按当前契约运行
When 本变更交付并运行
Then flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）

### FR-04: adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽，不受影响
Given 平台按当前契约运行
When 本变更交付并运行
Then adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽，不受影响

### FR-05: 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
Given 平台按当前契约运行
When 本变更交付并运行
Then 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-agent-writable.test.mjs 全套四态（骨架/填写过/空白拒/绑定回归）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-agent-writable.test.mjs 全套四态（骨架/填写过/空白拒/绑定回归）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-agent-writable.test.mjs 全套四态（骨架/填写过/空白拒/绑定回归）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-agent-writable.test.mjs 全套四态（骨架/填写过/空白拒/绑定回归）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-agent-writable.test.mjs 全套四态（骨架/填写过/空白拒/绑定回归）
