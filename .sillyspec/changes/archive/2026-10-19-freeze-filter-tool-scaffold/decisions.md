---
author: flow-machine-draft
created_at: 2026-10-19T10:43:00.135Z
---
# 决策记录（Decisions）— 2026-10-19-freeze-filter-tool-scaffold

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：只改 `.claude/skills/**` 的合法 skill 变更将不再进入 change.patch（归档仍保留变更文档与 git 历史）——这是显式取舍：工具注入面不算业务交付，且此类变更常为 init 模板刷新，正是生产污染源。放弃方案：①按文件内容/类别智能判定——漂移且误伤合法 skill 编写；②把 `filterDeliverableFiles` 的 tool 档也硬剔——会影响 worktree apply 的交付语义，超出本次范围；③剔除 AGENTS.md——它是跨 harness 的项目指令，可能是真实交付（本仓 3.33.1 刷新即例），故保留。
