---
author: qinyi
created_at: 2026-07-10T16:10:00+08:00
---

# 任务清单（Tasks）— quick 会话状态隔离

> 细节在 plan 阶段展开，此处只列任务名。

- [ ] task-01: src/run.js — quick sessionId 生成（UUID8hex）+ changeName 解耦（去 default 硬编码）+ 写 current-quick-run-id + 输出 sessionId
- [ ] task-02: src/run.js — `--done` 恢复 sessionId（优先 --change，fallback current-quick-run-id）+ 收尾删 quick-sessions/<sid>/
- [ ] task-03: src/run.js + src/stages/quick.js — quick-guard.json 改写 `.runtime/quick-sessions/<sid>/guard.json`（含 sessionId 字段）
- [ ] task-04: src/hooks/worktree-guard.js — 读 guard 改合并所有活跃 quick-sessions/*/guard.json（baseline/allowedFiles 并集）
- [ ] task-05: src/stages/quick.js — step1/3 prompt 适配（告知 agent sessionId + --done 带 --change）
- [ ] task-06: test/quick-session-isolation.test.mjs — 多会话隔离回归（独立 steps + guard 不覆盖 + --done 各推 + hook 合并放行）
