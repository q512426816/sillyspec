---
author: flow-machine-draft
created_at: 2026-10-21T12:14:13.558Z
---
# 任务注册表（Tasks）— 2026-10-21-lint-to-prepush

- [x] task-01: local.yaml `lint: "unavailable"` 标记落盘（注释带变更名与理由）；验证：node 解析 extractLintCommand 返回 null（或等价 grep 确认标记形态符合 verify-postcheck 认法），.husky/pre-push 保持零改动（git diff 面不含该文件）
- [ ] task-02: AGENTS.md 与 templates/agents-instruction.md 规则 4 逐字同改（补 unavailable 跳过语义+自验口径句改写）、CLAUDE.md 规则 8 lint 句同步、test-runner-failed-face.test.mjs ③ KEY 更新；验证：node --test test/test-runner-failed-face.test.mjs 全绿
