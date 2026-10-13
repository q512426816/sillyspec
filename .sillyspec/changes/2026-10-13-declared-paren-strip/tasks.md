---
author: flow-machine-draft
created_at: 2026-10-13T08:38:14.250Z
---
# 任务注册表（Tasks）— 2026-10-13-declared-paren-strip
- [x] task-01: 测试先行——test/change-list-paren-strip.test.mjs：列表/表格括号注记剥除（含内嵌冒号/角色前缀/未闭合残片）、normalizePath 兜底、buildThinSnapshotRows 合并去重、既有形态回归（冒号描述/双尾注/incidental）、e2e 污染清单收口单行；先跑红
- [x] task-02: 实现——change-list 列表分支剥括号前置 + normalizePath 未闭合残片 + buildThinSnapshotRows 兜底合并；新测试全绿
- [x] task-03: 回归——change-list/design-coverage/design-facts/flow-diff 既有测试零改动全绿 + lint + 全量 npm test
