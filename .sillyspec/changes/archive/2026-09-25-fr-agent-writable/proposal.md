---
author: flow-machine-draft
created_at: 2026-09-25T04:43:57.047Z
---
# 提案书（Proposal）— 2026-09-25-fr-agent-writable

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:51a0b36b8012150e8c389e85c3493b11a4205185b05027dbadb2899dbb29d83b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
任务原话转写：动机：FR 内容从机器指纹段改为 agent 书写面（同 design 槽模式）——机器只搭骨架（节标题+绑定槽+参考摘录注释），FR 内容 agent 干活时直接写不走 amend 不触发 edit_ratio。平台狗粮实证：机器摘录 FR 太薄（仅「flow done 全绿」级），agent 改走 amend 被 route_hint:thick 误报，摩擦大且 FR 质量仍受限。
成功标准：
- draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变
- amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）
- flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）
- adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽，不受影响
- 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:b3e17f36a059e675b52638ad56a1591df4e4398ce19d2020a26fa332e49cbd74:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变
2. amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）
3. flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）
4. adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽，不受影响
5. 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:0932bce357c752f8b5970ee684c7b7097a7eb9985528f63dd46db9763893bbc2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
1. draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变
2. amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）
3. flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）
4. adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽，不受影响
5. 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
