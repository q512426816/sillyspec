---
author: flow-machine-draft
created_at: 2026-10-13T03:33:33.661Z
---
# 任务注册表（Tasks）— 2026-10-13-h2-repo-heading-parse

- [x] task-01: 测试先行——test/change-list-repo-heading.test.mjs 六用例（h2 段头解析/变体/列表形态/未注册 fail-closed/非段头截断零回归/h3 与既有形态共存），先跑红
- [x] task-02: 实现——REPO_SECTION_HEADER_RE 单一源上移 change-list.js 导出、plan-postcheck 改 import；节扫描穿过段头 h2 + 段头行 currentRepo 设置器（注册表 fail-closed）；单测 6/6 绿
- [x] task-03: e2e+回归——thin-empty-face-crosscheck 增「## libx 仓变更」空面用例（7/7 绿）+ 60 项回归锚（design-coverage/design-facts/cross-repo-patch-freeze/change-list-*）全绿 + lint 绿 + HEAD 隔离 worktree 全量
- [x] task-04: 评审 P2/P3 清偿——单一源守卫测试真承载（去 grep 空声称）、提交夹带披露入 design（pathspec-commit 取工作树语义踩坑记档）
