---
author: flow-machine-draft
created_at: 2026-10-09T01:06:25.718Z
---
# 提案书（Proposal）— 2026-10-09-zcode-skills-sentinel-shorthand

## 动机

任务原话转写：zcode 宿主技能落点双层缺口（坑 init-skills-sync-no-zcode）：detectTools 无 .zcode 检测分支（自动发现失灵）+ skillToolDirs 无 zcode 映射（显式 --tool zcode 也拿不到技能），CLI 升级刷新内嵌技能时 .zcode/skills 静默失配；提交消息连写组坑（flow-done-sentinel-token-split）：task-01/02/03 自然语言连写组只含首个完整 token，哨兵字面匹配把其余任务误判零完成证据拒收，autopilot 自动勾选提取（flow.js）同病；另补三个内嵌技能（sillyspec-export/sillyspec-quick/sillyspec-resume）与评审任务书「无子代理通道时主会话代行自审、reviewer 字段如实标注降级」指引。

成功标准：
- .zcode 在场 → detectTools 发现 zcode；skillToolDirs 含 zcode→.zcode/skills 映射（--tool zcode 技能可落）
- 连写组三形态（斜杠/顿号/逗号+空格）展开后任务全有完成证据；补零归一；task-010/版本串三连数字不误切；既有独立 token 行为零变化
- 既有六工具信号（claude/cursor/openclaw/codex/gemini/opencode）发现零变化
- 三个新技能随 .claude/skills 源分发，init 同步可达
- 新增两测试文件（7 用例）+ lint 全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. .zcode 在场 → detectTools 发现 zcode；skillToolDirs 含 zcode→.zcode/skills 映射（--tool zcode 技能可落）
2. 连写组三形态（斜杠/顿号/逗号+空格）展开后任务全有完成证据；补零归一；task-010/版本串三连数字不误切；既有独立 token 行为零变化
3. 既有六工具信号（claude/cursor/openclaw/codex/gemini/opencode）发现零变化
4. 三个新技能随 .claude/skills 源分发，init 同步可达
5. 新增两测试文件（7 用例）+ lint 全绿

## 成功标准（可验证）

1. .zcode 在场 → detectTools 发现 zcode；skillToolDirs 含 zcode→.zcode/skills 映射（--tool zcode 技能可落）
2. 连写组三形态（斜杠/顿号/逗号+空格）展开后任务全有完成证据；补零归一；task-010/版本串三连数字不误切；既有独立 token 行为零变化
3. 既有六工具信号（claude/cursor/openclaw/codex/gemini/opencode）发现零变化
4. 三个新技能随 .claude/skills 源分发，init 同步可达
5. 新增两测试文件（7 用例）+ lint 全绿
