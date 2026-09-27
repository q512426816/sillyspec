---
author: flow-machine-draft
created_at: 2026-09-27T09:19:23.172Z
---
# 决策记录（Decisions）— 2026-09-27-confirm-on-use

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：橡皮图章——agent 全点确认。缓解三层：抽查式（注入至多点名 2 条）、证据机械校验（必须盘上真实测试文件，口头相符不收）、confirm 只翻绑定状态不改内容（错翻的代价=绑定行显示 active，门禁消费 candidate/active 无行为差异——宁多跑语义不变，长期准确性靠 digest 坏绑定卡兜）。次风险：upsertFrBindingsRaw 不走 agent 行保护（权威重写）——但行集来自 readFrBindings 全行读（含 agent 行原样回写），只改 confirmed_by/state 两字段，无删除面。放弃方案：FR 条目级 confirmed 状态（新机器字段）——绑定状态机已够用，条目级标题/域问题归 digest 信号与人工裁决，不为此发明第二套状态。
