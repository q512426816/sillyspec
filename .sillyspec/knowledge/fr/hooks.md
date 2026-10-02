---
author: sillyspec-fr-index
created_at: 2026-09-29T07:47:04.323Z
---

# FR 索引 — hooks

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/hooks.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-hooks-001 删除 .claude/skills/sillyspec-quick、sillyspec-export
变更：2026-09-29-skill-prompt-retire
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 删除 .claude/skills/sillyspec-quick、sillyspec-export、sillyspec-resume 三个目录；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-skill-prompt-retire/requirements.md#FR-01
最近确认：9a44c32586586969def3262a1e5de06919bb08b5

## FR-hooks-002 其余 skill 零改动
变更：2026-09-29-skill-prompt-retire
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 其余 skill 零改动；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-skill-prompt-retire/requirements.md#FR-02
最近确认：9a44c32586586969def3262a1e5de06919bb08b5

## FR-hooks-003 worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为
变更：2026-09-29-skill-prompt-retire
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为 flow start 轻量道（bug 修复/小改动的默认快道；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-skill-prompt-retire/requirements.md#FR-03
最近确认：9a44c32586586969def3262a1e5de06919bb08b5

## FR-hooks-004 docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」
变更：2026-09-29-skill-prompt-retire
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」标注；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-skill-prompt-retire/requirements.md#FR-04
最近确认：9a44c32586586969def3262a1e5de06919bb08b5

## FR-hooks-005 既有测试全绿（worktree-guard 相关用例如断言旧文案则按新口径适配）
变更：2026-09-29-skill-prompt-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有测试全绿（worktree-guard 相关用例如断言旧文案；Then 按新口径适配）
全文：.sillyspec/changes/archive/2026-09-29-skill-prompt-retire/requirements.md#FR-05
最近确认：9a44c32586586969def3262a1e5de06919bb08b5
