---
author: qinyi
created_at: 2026-09-07T04:20:00+08:00
---

# 任务清单（Tasks）

- [x] task-01: src/design-facts.js 纯函数模块（解析/索引/核验/骨架生成）
- [x] task-02: 步骤级 gate 接线（complete.js 钩子链，ERROR exit 1/信封）+ index.js design-init 命令 (depends_on: task-01)
- [x] task-03: prompt 双更新（brainstorm.js Step3 NEW: 指引 + Step6 design-init 卸责；prompt.js Step2 _facts 注入）
- [x] task-04: 测试套件 test/design-facts.test.mjs（双源一致/核验分级/骨架契约/幂等/注入）(depends_on: task-01,task-02,task-03)
