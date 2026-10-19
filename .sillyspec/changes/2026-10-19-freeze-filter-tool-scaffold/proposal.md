---
author: flow-machine-draft
created_at: 2026-10-19T10:31:43.568Z
---
# 提案书（Proposal）— 2026-10-19-freeze-filter-tool-scaffold

## 动机

任务原话转写：冻结面剔除工具治理模板

动机与背景：消防工作区 4e9eb05b 实证 change.patch 被 .claude/（29）、.codex/（21）、CLAUDE.md 等工具治理模板刷屏（61 文件中 50 个是模板），真实交付被淹没；现有 freeze 过滤器只剔 .sillyspec/（除 docs/），工具模板全部进冻结面。

成功标准：
- filterCommittedFace 剔除 .claude/.codex/.gemini/.opencode/.zcode/.cursor 目录与 CLAUDE.md；AGENTS.md 等项目指令文件保留为交付面
- 新增单测与 e2e 覆盖模板剔除、正常源码保留两态，既有冻结/空面/跨仓测试全绿
- 归档 patch 的 files[]/change.patch 不再出现工具治理模板

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. filterCommittedFace 剔除 .claude/.codex/.gemini/.opencode/.zcode/.cursor 目录与 CLAUDE.md；AGENTS.md 等项目指令文件保留为交付面
2. 新增单测与 e2e 覆盖模板剔除、正常源码保留两态，既有冻结/空面/跨仓测试全绿
3. 归档 patch 的 files[]/change.patch 不再出现工具治理模板

## 成功标准（可验证）

1. filterCommittedFace 剔除 .claude/.codex/.gemini/.opencode/.zcode/.cursor 目录与 CLAUDE.md；AGENTS.md 等项目指令文件保留为交付面
2. 新增单测与 e2e 覆盖模板剔除、正常源码保留两态，既有冻结/空面/跨仓测试全绿
3. 归档 patch 的 files[]/change.patch 不再出现工具治理模板
