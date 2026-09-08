---
id: task-04
title: 'Tests for parse fixes + migrate + stdout channel'
title_zh: '测试——docs-fix-capability + docs-migrate 新单测 + docs-check-fix.test.mjs 通道断言改造'
author: 'qinyi'
created_at: 2026-09-08 09:37:00
priority: P0
depends_on: [task-01, task-02, task-03]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07]
decision_ids: [D-006@v1, D-005@v1]
allowed_paths:
  - NEW:test/docs-fix-capability.test.mjs
  - NEW:test/docs-migrate.test.mjs
  - test/docs-check-fix.test.mjs
target_files: [NEW:test/docs-fix-capability.test.mjs, NEW:test/docs-migrate.test.mjs, test/docs-check-fix.test.mjs]
goal: >
  新单测覆盖 FR-1/3/4（docs-fix-capability）与 FR-2（docs-migrate）；
  docs-check-fix.test.mjs 通道断言改造（FR-5：15+ 处 stderr 断言与 S7 逐字节通道一致测试按新出口契约更新——Grill 阻断项）。
implementation:
  - docs-fix-capability.test.mjs：
    - 括号路径：app/(dashboard)/ppm/shared.tsx:21 全量提取+真实校验；(dashboard)/page.tsx:5 全量
    - markdown 链接零回归：[t](foo.js:12) 提取 foo.js:12
    - ReDoS evil 用例：长 token（n=30+）无 :N 后缀，断言耗时线性（< 100ms）——锁死 D-006
    - 省略号：api/.../route.ts → skippedFuzzy++ 不计 invalid
    - 顿号：a.py:21、b.py:63 拆两条独立引用（字符集排除全角标点回归锁）
    - 豁免：archive/ 路径段、finished/ 路径段、frontmatter doc_type: snapshot（含行内注释容忍）、带引号不识别；exempt: false 恢复
    - candidates：tie 歧义 {file,line}；带 / 路径文件不存在 {file}；裸名不存在无 candidates
  - docs-migrate.test.mjs：
    - planDocsMigrate 正确性（前缀过滤/newRef 重组/行号保留）
    - dry-run 零写盘（文件 mtime/内容不变断言）
    - --apply 写盘 + postCheck 失效数报告
    - unverified 标记（目标不存在）+ --apply 时 exit 1
    - from=to 反例（零计划 exit 0）
  - docs-check-fix.test.mjs 通道改造：
    - S7 逐字节一致测试：stdout 侧更新（报告内容迁入）、stderr 侧收窄（仅 ⚠️ 行）
    - 15+ 处 r.stderr.includes 报告断言 → r.stdout.includes
    - 新增子进程断言：docs check 失败时 stdout 含失效清单、stderr 不含
acceptance:
  - npm test 全过（含两个新测试文件）
  - evil 用例耗时断言锁死 ReDoS 回归
  - docs-check-fix.test.mjs 全绿（通道契约更新后）
verify:
  - npm test
  - npm run lint
constraints:
  - 测试断言新出口契约（stdout=报告、stderr=诊断），不是恢复旧契约
  - evil 用例阈值 100ms（留 CI 抖动余量，Grill 实测 0.01ms）
---

## 上下文

design.md §测试计划 + Grill 阻断项（docs-check-fix.test.mjs 通道断言改造）。
