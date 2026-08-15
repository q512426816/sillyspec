---
id: task-05
title: doctor-diagnostics.js — D2 诊断信号 pointer_missing_but_managed
title_zh: doctor — D2 诊断信号 pointer_missing_but_managed
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P1
depends_on: [task-01]
blocks: [task-06]
allowed_paths:
  - src/doctor-diagnostics.js
expects_from:
  task-01:
    - contract: check-platform-managed
      needs: [managed, specRoot]
goal: |
  doctor 只读诊断：声明存在+指针缺失 → 报 pointer_missing_but_managed 信号
  （含原 specRoot 与恢复引导），非阻断。测试断言归 task-06（同一测试文件同 Wave 冲突，
  postcheck 拦截后调整——本 task 只改源码）。
implementation: |
  1. src/doctor-diagnostics.js detectPointerHealth（约 L217 起）无指针提前返回分支：
     调 checkPlatformManaged(cwd)（import 自 './run/shared.js'），
     命中 → 该诊断项加 issue/severity:warning，code 'pointer_missing_but_managed'，
     文案含 decl.specRoot 与三选项引导。
  2. doctor 场景测试由 task-06 统一落（test/platform-managed-declaration.test.mjs 场景⑧），
     本 task 不碰测试文件。
acceptance: |
  - doctor --json 在"声明存在+指针缺失"时报 pointer_missing_but_managed（warning 非阻断）
  - 无声明时不报（现状行为不变）
verify: |
  task-06 场景⑧：doctor --json 子进程断言信号 code。
constraints: |
  - 只改 src/doctor-diagnostics.js；不碰测试文件（归 task-06，同 Wave 并行冲突）
---
# task-05: doctor 诊断信号
## 目标
见 frontmatter goal（FR-06）。
## 验收
见 frontmatter acceptance。
