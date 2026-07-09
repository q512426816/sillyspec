---
id: task-08
title: 同步 file-lifecycle 三份文档
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P2
depends_on: [task-04, task-05, task-06]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/file-lifecycle/known-implementation-gaps.md
  - docs/sillyspec/file-lifecycle/platform-workflows-sync.md
expects_from:
  task-01:
    - contract: gate-envelope-json
      needs: [schema_version, ok, checks]
goal: |
  按仓库文档同步铁律更新 file-lifecycle 文档族，使其与本变更代码一致。
implementation: |
  1. docs/sillyspec/file-lifecycle.md：
     - 新增「机器接口（gate/derive）」小节：只读语义、verify-runs 取证副作用、指向 interface-contract.md
     - 更新头部 updated_at 时间戳
  2. docs/sillyspec/file-lifecycle/known-implementation-gaps.md：
     - 移除「platform approve/reject 未实现」与「workflow-runs runtimeRoot 未接通」两个已补齐缺口
     （或移入"已解决"记录，按该文档既有体例）
  3. docs/sillyspec/file-lifecycle/platform-workflows-sync.md：
     - approve/reject 真实流转说明（端点 TBD-hub-api 标注）
     - workflow-runs 平台模式落盘路径 <runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/
  对照 CLAUDE.md 更新检查清单逐项核对（文件名引用一致/流转逻辑一致/时间戳更新）。
acceptance: |
  - 三份文档内容与 task-01~06 实际实现一致，无残留"尚未实现"表述
  - file-lifecycle.md 头部 updated_at 已更新
verify: |
  对照代码逐条核对 CLAUDE.md 检查清单；grep "尚未实现" 确认文档无残留。
constraints: |
  - 只改 allowed_paths 内三份文档；不改代码与其他文档
---

# task-08: file-lifecycle 文档同步

## 目标

见 frontmatter goal（CLAUDE.md 文档同步铁律）。

## 实现蓝图

见 frontmatter implementation。

## 验收标准

见 frontmatter acceptance（2 条）。

## TDD/验证

见 frontmatter verify。
