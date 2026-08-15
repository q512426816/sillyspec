---
id: task-06
title: 文档同步
title_zh: 文档同步
author: qinyi
created_at: 2026-08-15 16:16:00
priority: P1
depends_on: [task-02, task-03, task-04, task-05]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/interface-contract.md
  - docs/sillyspec/doc-consistency-debt.md
  - .claude/skills/
repo: main
goal: >
  同步文档：file-lifecycle.md 新命令生命周期行、interface-contract.md CLI 契约段、
  doc-consistency-debt.md D-6 销账、SKILL 可用性说明（若涉及）。
implementation:
  - file-lifecycle.md：docs check 命令行为 + 配置
  - interface-contract.md：CLI 接口（参数/exit code/输出结构）
  - doc-consistency-debt.md：D-6 标已修
  - 检查 .claude/skills/ 是否需加命令提及
acceptance:
  - 文档与实现一致（参数名/缺省值/exit code 逐字核对）
verify:
  - npm run lint（doc 不扫但整体跑）
  - doc-ref-check（本命令吃自己的狗粮）
constraints:
  - updated_at 时间戳更新
---

## 验收标准

- 三份文档与实现一致；D-6 销账记录落盘
