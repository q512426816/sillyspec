---
author: flow-machine-draft
created_at: 2026-09-29T07:35:25.179Z
---
# 需求规格（Requirements）— 2026-09-29-skill-prompt-retire

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 删除 .claude/skills/sillyspec-quick、sillyspec-export
Given 系统就绪
When 删除 .claude/skills/sillyspec-quick、sillyspec-export、sillyspec-resume 三个目录
Then 行为符合本条标准描述

### FR-02: 其余 skill 零改动
Given 系统就绪
When 其余 skill 零改动
Then 行为符合本条标准描述

### FR-03: worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为 
Given 系统就绪
When worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为 flow start 轻量道（bug 修复/小改动的默认快道
Then 行为符合本条标准描述

### FR-04: docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」
Given 系统就绪
When docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」标注
Then 行为符合本条标准描述

### FR-05: 既有测试全绿（worktree-guard 相关用例如断言旧文案则按新口径适配）
Given 测试 相关模块就绪
When 既有测试全绿（worktree-guard 相关用例如断言旧文案
Then 按新口径适配）

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 x -->
不适用：纯删除与提示词文案，行为由 guard 系/quick-retired 既有用例守护（23/0 绿）

<!--AGENT:测试绑定FR-02 x -->
不适用：纯删除与提示词文案，行为由 guard 系/quick-retired 既有用例守护（23/0 绿）

<!--AGENT:测试绑定FR-03 x -->
不适用：纯删除与提示词文案，行为由 guard 系/quick-retired 既有用例守护（23/0 绿）

<!--AGENT:测试绑定FR-04 x -->
不适用：纯删除与提示词文案，行为由 guard 系/quick-retired 既有用例守护（23/0 绿）

<!--AGENT:测试绑定FR-05 x -->
不适用：纯删除与提示词文案，行为由 guard 系/quick-retired 既有用例守护（23/0 绿）
