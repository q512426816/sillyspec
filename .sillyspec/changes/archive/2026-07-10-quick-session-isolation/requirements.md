---
author: qinyi
created_at: 2026-07-10T16:10:00+08:00
---

# 需求（Requirements）— quick 会话状态隔离

## FR

- **FR-01 sessionId 作 changeName**：quick 不再固定 `default`（run.js:1386）。每会话生成 `quick-<uuid8hex>`（crypto.randomUUID 前 8）；尊重用户 `--change <name>` 显式指定。
- **FR-02 DB 分行**：每会话 `progress.quick-<uuid8>`，changes 表 name UNIQUE 多行兼容。各自 stages/steps/quickGuard 独立，`--done` 各推各的，不互相覆盖。
- **FR-03 --done 跨进程传递**：run quick 写 `current-quick-run-id`（最新 session fallback）+ 输出 sessionId；`--done --change quick-<uuid8>` 精确；`--done`（不带）fallback 读 current-quick-run-id（单会话兼容）。
- **FR-04 quick-guard.json 按 session 存**：`.runtime/quick-sessions/<sessionId>/guard.json`（隔离，A/B 不互覆盖）；`--done` 收尾删 session 目录。
- **FR-05 worktree-guard hook 合并 guard**：hook 独立进程无法可靠知当前 session（current-quick-run-id 多会话覆盖），改为读所有活跃 `quick-sessions/*/guard.json` 合并 baseline/allowedFiles 并集（安全侧倾斜，不误拦）。

## NFR

- **NFR-01 零新增外部依赖**：crypto.randomUUID 是 Node 19+ 原生。
- **NFR-02 向后兼容**：旧 quick-guard.json（单文件无 sessionId）→ 视为 default session 一次性迁移或忽略；旧 default 行不破坏。
- **NFR-03 测试覆盖**：test/quick-session-isolation.test.mjs——两会话独立 steps、guard 不互覆盖、--done 各推各的、hook 合并 guard 放行各自 allowedFiles。
- **NFR-04 纯增量可回退**：恢复 changeName='default' + guard 回单文件 + 删 quick-sessions/。

## 剩余风险

- A/B 改同一文件仍物理撞（quick 不 worktree，声明接受）。
- `--done` 不带 `--change` 时多会话可能 fallback 到他者 session（文档建议多会话带 --change）。
