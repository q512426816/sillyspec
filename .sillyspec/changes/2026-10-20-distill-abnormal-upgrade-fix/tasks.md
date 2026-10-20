---
author: flow-machine-draft
created_at: 2026-10-20T02:58:34.269Z
---
# 任务注册表（Tasks）— 2026-10-20-distill-abnormal-upgrade-fix

- [x] task-01: 新增 test/distill-abnormal-upgrade.test.mjs（三态判定先红 + 调用点钉 + 零回归锚），跑红确认现状缺陷（验证：node --test 新套件 ①② 红、④ 绿）
- [x] task-02: decision-distill.js 导出 isDistillAbnormal；flow.js 2568 判定换调用 + upgrade_reason 去幽灵引用 + 2534 头注同步；新套件全绿（验证：node --test 新套件 6/6 绿）
- [ ] task-03: 复跑既有 decision-distill-flat-list / decision-caliber-unify 零回归 + lint（验证：node --test 两文件全绿 + npm run lint 绿）
