---
author: flow-machine-draft
created_at: 2026-10-21T04:01:24.321Z
---
# 任务注册表（Tasks）— 2026-10-21-brainstorm-proto-worktree

- [x] task-01: worktree-guard 位置豁免——先在 test/worktree-guard.test.mjs 增 FR-01 三场景断言（brainstorm 期已注册 worktree 内 Write 放行 / 主树 Write 拦且 reason 含 worktree create 指引 / 无 meta 存储区子路径仍拦），再改 src/hooks/worktree-guard.js（:806 后插入 isInsideRegisteredWorktree 放行 + STAGE_HINTS.brainstorm 文案）；验证：node --test 该文件绿
- [x] task-02: native create 幂等测试固化——test/worktree-native-overlay.test.mjs 增「linked worktree 内 create：meta 已存在幂等复用（返回 branch/worktreePath/baseHash/mode 与既有一致，无 overlay）」用例（现状行为固化）；验证：该文件跑绿
- [ ] task-03: WorktreeManager.ensure 提取——src/worktree.js 增 ensure(name, opts)（getMeta 命中返回 {...existing, existing:true}，否则 create），src/run/stage.js execute 分支改调（日志语义不变），新增 test/worktree-ensure-idempotent.test.mjs 验两次 ensure 均返回既有不重建；验证：新测试绿 + 既有 execute/worktree 回归绿
