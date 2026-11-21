---
author: flow-machine-draft
created_at: 2026-11-21T16:05:31.080Z
---
# 提案书（Proposal）— 2026-11-22-diagnose-skill

## 动机

任务原话转写：新增 bug 诊断环纪律 skill
mattpocock/skills 调研（docs/ROADMAP.md 吸收路线批 2、盲维分析首选项）：diagnosing-bugs 的「先建 red-capable 复现回路再假设」纪律是「先测试后实现」在诊断场景的同构物，agent 修 bug 的典型失败（读代码锚定首个假设改了碰巧绿）正是它针对的。以纯 skill 层落地（不动状态机），复现命令直接作为 flow done 实测门证据，闭环无摩擦。
成功标准：
- 新增 .claude/skills/sillyspec-diagnose/SKILL.md：五阶段 gated 诊断环（复现回路先行/最小化/可证伪假设排序/tagged 插桩/修复+回归锚定），frontmatter 含触发场景描述
- skill 内含 SillySpec 流程衔接指引：bug 类轻量变更把复现命令写进成功标准、收口实测优先跑它、根因一句话 distill 进 knowledge
- 纯 skill 层新增，不修改 src/ 与任何状态机代码
- 插桩前缀等纪律引用 execute 既有铁律口径，不双写正文

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 新增 .claude/skills/sillyspec-diagnose/SKILL.md：五阶段 gated 诊断环（复现回路先行/最小化/可证伪假设排序/tagged 插桩/修复+回归锚定），frontmatter 含触发场景描述
2. skill 内含 SillySpec 流程衔接指引：bug 类轻量变更把复现命令写进成功标准、收口实测优先跑它、根因一句话 distill 进 knowledge
3. 纯 skill 层新增，不修改 src/ 与任何状态机代码
4. 插桩前缀等纪律引用 execute 既有铁律口径，不双写正文

## 成功标准（可验证）

1. 新增 .claude/skills/sillyspec-diagnose/SKILL.md：五阶段 gated 诊断环（复现回路先行/最小化/可证伪假设排序/tagged 插桩/修复+回归锚定），frontmatter 含触发场景描述
2. skill 内含 SillySpec 流程衔接指引：bug 类轻量变更把复现命令写进成功标准、收口实测优先跑它、根因一句话 distill 进 knowledge
3. 纯 skill 层新增，不修改 src/ 与任何状态机代码
4. 插桩前缀等纪律引用 execute 既有铁律口径，不双写正文
