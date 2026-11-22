---
author: flow-machine-draft
created_at: 2026-11-22T16:46:33.395Z
---
# 提案书（Proposal）— 2026-11-22-init-config-three-phase

## 动机

任务原话转写：init 与 config 三段式问询交互

动机与背景：ROADMAP 批 5②（mattpocock/skills 吸收路线，setup skill「先探测后问/每问带推荐（一词接受）/已定跳过」三段式思想）+ 单 A 感知 1 实证（推荐的价值建立在探测深度上）。现状：init skill 固定 7 问顺序模板（无探测前置、无已定跳过）；config skill 同缺。与批 1 提问分型纪律协同：意图类问题保持开放（禁选项防锚定），决策类问题必带推荐+一手依据锚（单 A 刚立）。

成功标准：
- init skill（.claude/skills/sillyspec-init/SKILL.md）问询改三段式：先探测（能自查的不问——工作区模式/已有配置/用户输入中已给的答案）→ 意图问开放+决策问带推荐与依据（与 brainstorm 分型同源）→ 已定项跳过并回放确认
- config skill（.claude/skills/sillyspec-config/SKILL.md）同款三段式：先探测 local.yaml 既有键与仓现状，已配置项跳过问，决策问带推荐与依据
- 既有「一次只问一个」与 AskUserQuestion 交互规范保留不变
- 纯 skill 文本改动（不触 src/test），文本规范审读验收

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. init skill（.claude/skills/sillyspec-init/SKILL.md）问询改三段式：先探测（能自查的不问——工作区模式/已有配置/用户输入中已给的答案）→ 意图问开放+决策问带推荐与依据（与 brainstorm 分型同源）→ 已定项跳过并回放确认
2. config skill（.claude/skills/sillyspec-config/SKILL.md）同款三段式：先探测 local.yaml 既有键与仓现状，已配置项跳过问，决策问带推荐与依据
3. 既有「一次只问一个」与 AskUserQuestion 交互规范保留不变
4. 纯 skill 文本改动（不触 src/test），文本规范审读验收

## 成功标准（可验证）

1. init skill（.claude/skills/sillyspec-init/SKILL.md）问询改三段式：先探测（能自查的不问——工作区模式/已有配置/用户输入中已给的答案）→ 意图问开放+决策问带推荐与依据（与 brainstorm 分型同源）→ 已定项跳过并回放确认
2. config skill（.claude/skills/sillyspec-config/SKILL.md）同款三段式：先探测 local.yaml 既有键与仓现状，已配置项跳过问，决策问带推荐与依据
3. 既有「一次只问一个」与 AskUserQuestion 交互规范保留不变
4. 纯 skill 文本改动（不触 src/test），文本规范审读验收
