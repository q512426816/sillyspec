---
id: task-03
title: filterDeliverableFiles 精细化 + 去双写（坑3）
title_zh: filterDeliverableFiles 精细化 + 去双写（坑3）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P0
depends_on: []
blocks: [task-06, task-07]
requirement_ids: [FR-03]
decision_ids: [D-03@v1]
allowed_paths:
  - src/worktree-apply.js
  - src/verify-postcheck.js
  - src/index.js
  - test/worktree-apply-meta-exclude.test.mjs
goal: |
  worktree apply 把 .sillyspec/docs/sillyspec/modules/*.md（dogfood 模块文档=交付物）改动
  apply 回主仓，仅排 .sillyspec/changes/ + .sillyspec/.runtime/ + .sillyspec/quicklog/
  + meta.json（worktree 专属/运行时）。消除 verify-postcheck 内联副本双写漂移。
implementation: |
  - src/worktree-apply.js:48-50 filterDeliverableFiles 改精细化（design §7 Fix-3）：
    return files.filter(f =>
      !f.startsWith('.sillyspec/changes/') &&
      !f.startsWith('.sillyspec/.runtime/') &&
      !f.startsWith('.sillyspec/quicklog/') &&
      f !== 'meta.json'
    )
  - src/verify-postcheck.js:798-799 内联副本改 import { filterDeliverableFiles }
    from '../worktree-apply.js'（Grill X-010 核实无环依赖：verify-postcheck imports 不含
    worktree-apply，反向亦然）。
  - src/index.js:787 注释同步（filterDeliverableFiles 不再一刀切排除 .sillyspec/）。
  - test/worktree-apply-meta-exclude.test.mjs 改四态断言：docs/ 保留 + changes/ 排除 +
    .runtime/ 排除 + quicklog/ 排除。
acceptance: |
  - .sillyspec/docs/sillyspec/modules/*.md 改动 apply 回主仓。
  - .sillyspec/changes/<wt-change>/ 仍排除（防 worktree 专属误放行）。
  - .sillyspec/.runtime/ 仍排除。
  - .sillyspec/quicklog/ 仍排除。
  - 非 .sillyspec/ 文件行为不变。
verify: |
  node test/worktree-apply-meta-exclude.test.mjs
constraints: |
  - 排除规则精确到 .sillyspec/changes/（所有 change 目录含 worktree 专属，R-03）。
  - 仅保留 .sillyspec/docs/（白名单思路，非全保留 .sillyspec/）。
  - verify-postcheck 必须改 import 共享去双写（R-04），不能内联同步。
  - 非 .sillyspec/ 文件行为不变（兼容）。
---

# task-03: filterDeliverableFiles 精细化 + 去双写（坑3）

filterDeliverableFiles（worktree-apply.js:48-50）一刀切 !f.startsWith('.sillyspec/')
把模块文档也排除，worktree 子代理对 .sillyspec/docs/sillyspec/modules/*.md 的改动 apply
不回主仓（要手动 git show）。本 task 精细化 filter + 去双写副本。

## 依据
- design.md §5 Fix-3 / §7 Fix-3 代码片段 / FR-03 / D-03@v1
- 根因：worktree-apply.js:48-50 + verify-postcheck.js:797-799 内联副本 + index.js:787 注释。
- Grill X-010：verify-postcheck → worktree-apply 无环依赖，可 import 共享。
