---
id: task-04
title: write-fix-six-scenario-tests
title_zh: docs-check --fix 六场景测试
author: qinyi
created_at: 2026-08-18 22:42:51
priority: P0
depends_on: [task-03]
blocks: [task-05]
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-002@v2, D-003@v2, D-004@v1, D-006@v1]
allowed_paths:
  - test/docs-check-fix.test.mjs
provides: []
expects_from:
  task-03:
    - contract: cli-fix-flags
      needs: [fix, dryRun]
goal: >
  为 --fix 修复链路写六场景测试，锁定单命中改、多命中不动、零命中报告、dry-run 零写盘、CRLF 保持、同行多引用六类行为契约。
implementation:
  - fixture 沿用 docs-check.test.mjs 的 tmp 目录模式——源码树布 token 唯一命中、多处命中、零命中三类符号与对应文档引用
  - 场景一单命中——修复后行号改写为 token 当前所在行，文档其余字节逐字节不变（FR-01）
  - 场景二多命中——条目不被自动改写，报告含候选行号列表（FR-03，D-006）
  - 场景三零命中——分类 needs-manual 输出原因报告，文件不动（FR-02）
  - 场景四 dry-run——--fix --dry-run 全程零写盘，文件内容与修改时间均不变（FR-05）
  - 场景五 CRLF——修复后 \r\n 行结束符保持不丢（R-05）
  - 场景六同行多引用——按行内偏移从后往前全部正确替换无错位（R-04）
  - 追加 CLI 子进程对照断言（plan-review 修正 #3）——无 --fix 时 CLI 输出与改动前逐字节一致（快照文件对比）（FR-04）
acceptance:
  - 六场景断言全部成立且 fixture 全 tmp 不污染仓库
  - CLI 子进程对照断言证明缺省路径输出与改动前一致（D-004）
verify:
  - node test/docs-check-fix.test.mjs
  - npm run lint
constraints:
  - 只写测试不改 src——发现实现缺陷回 task-01~03 修，禁止改测试绕过
  - CLI 断言走真实子进程（node bin/sillyspec.js docs check），不 mock 内部模块
---
