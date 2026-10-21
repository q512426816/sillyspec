---
author: flow-machine-draft
created_at: 2026-10-21T06:18:15.804Z
---
# 提案书（Proposal）— 2026-10-21-flow-skill-askuser

## 动机

任务原话转写：轻量技能补AskUserQuestion交互规范
用户要求：sillyspec-flow（轻量变更）skill 缺少其他 skill（brainstorm/commit/auto/explore 等）均有的「交互规范」节——需要用户从多个选项做选择时必须用内置 AskUserQuestion 工具把选项作为参数传入让用户作答，禁止用编号列表让用户手动输入数字。补齐该节，措辞与 brainstorm 对齐。skills 源即仓库 .claude/skills/（init.js:462 复制源），改一处即改源。

成功标准：
- .claude/skills/sillyspec-flow/SKILL.md 出现「交互规范」节，含 AskUserQuestion 强制句与禁编号列表句，语义与 sillyspec-brainstorm 同版
- 纯 markdown 指令文档变更，无代码行为——测试不适用：无逻辑可断言，验收靠文档审阅

## 变更范围

按成功标准机械推导，共 2 条验收面：
1. .claude/skills/sillyspec-flow/SKILL.md 出现「交互规范」节，含 AskUserQuestion 强制句与禁编号列表句，语义与 sillyspec-brainstorm 同版
2. 纯 markdown 指令文档变更，无代码行为——测试不适用：无逻辑可断言，验收靠文档审阅

## 成功标准（可验证）

1. .claude/skills/sillyspec-flow/SKILL.md 出现「交互规范」节，含 AskUserQuestion 强制句与禁编号列表句，语义与 sillyspec-brainstorm 同版
2. 纯 markdown 指令文档变更，无代码行为——测试不适用：无逻辑可断言，验收靠文档审阅
