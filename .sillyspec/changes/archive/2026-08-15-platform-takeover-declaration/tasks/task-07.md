---
id: task-07
title: 文档同步 — file-lifecycle / platform-interface-map / skills
title_zh: 文档同步 — 生命周期/接口地图/skills
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P1
depends_on: [task-06]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/platform-interface-map.md
  - .claude/skills/sillyspec-doctor/SKILL.md
goal: |
  文档与新文件类型/行为对齐：file-lifecycle 登记 .sillyspec-platform-managed；
  platform-interface-map 补声明机制双入口描述（doc-ref-check 行号同步）；
  doctor skill 补新诊断信号说明。
implementation: |
  1. docs/sillyspec/file-lifecycle.md：运行时文件类型表加 .sillyspec-platform-managed
     （项目根，平台接管声明，无过期，disconnect 删除）；updated_at 刷新。
  2. docs/sillyspec/platform-interface-map.md：指针章节（§ 指针状态机附近）补：
     声明文件机制（三写来源/双入口 fail-closed/disconnect 三清）；
     新增 file:line 引用须过 doc-ref-check（node test/doc-ref-check.test.mjs）。
  3. .claude/skills/sillyspec-doctor/SKILL.md：诊断信号清单补 pointer_missing_but_managed。
  4. 提示词镜像 docs/prompt/ 不涉及（不改 src/stages/*.js prompt），不跑 _extract.mjs。
acceptance: |
  - doc-ref-check 全过（含新增引用）
  - file-lifecycle.md 与实际文件行为一致（写/读/删三路径全描述）
verify: |
  node test/doc-ref-check.test.mjs；人工对照 design §5 三写/双入口/三清。
constraints: |
  - 只动三个文档文件；SKILL.md 对外纯净性（禁内部 docs 路径/D-编号/源码符号）
---
# task-07: 文档同步
## 目标
见 frontmatter goal（file-lifecycle 文档同步铁律）。
## 验收
见 frontmatter acceptance。
