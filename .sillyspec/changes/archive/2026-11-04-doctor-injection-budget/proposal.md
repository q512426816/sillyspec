---
author: flow-machine-draft
created_at: 2026-11-04T07:29:28.378Z
---
# 提案书（Proposal）— 2026-11-04-doctor-injection-budget

## 动机

任务原话转写：doctor 常驻注入面体积预算告警
常驻注入面（AGENTS/CLAUDE/SKILL.md）超 20000 字节压缩截断线后超线内容压缩即不可见，agent 丢纪律无感知（superpowers #2481 实证：SDD 技能丢五轮上限跑 18 轮修复）；仓内 silyspec-execute SKILL.md 已 18.9KB 贴线，无护栏必然破线。

成功标准：
- doctor 新增 injection_budget 维度：扫描 AGENTS/CLAUDE/根 SKILL.md 与 .claude/skills/*/SKILL.md 及模板源，任一超 20000 字节 WARN 并给瘦身指引（超线不 FAIL 收口）
- 预算内回显最大面与预算（可观测）；非 init 仓跳过不误报
- 新增单测覆盖超线/预算内/跳过三态，既有回归面零破坏

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. doctor 新增 injection_budget 维度：扫描 AGENTS/CLAUDE/根 SKILL.md 与 .claude/skills/*/SKILL.md 及模板源，任一超 20000 字节 WARN 并给瘦身指引（超线不 FAIL 收口）
2. 预算内回显最大面与预算（可观测）；非 init 仓跳过不误报
3. 新增单测覆盖超线/预算内/跳过三态，既有回归面零破坏

## 成功标准（可验证）

1. doctor 新增 injection_budget 维度：扫描 AGENTS/CLAUDE/根 SKILL.md 与 .claude/skills/*/SKILL.md 及模板源，任一超 20000 字节 WARN 并给瘦身指引（超线不 FAIL 收口）
2. 预算内回显最大面与预算（可观测）；非 init 仓跳过不误报
3. 新增单测覆盖超线/预算内/跳过三态，既有回归面零破坏
