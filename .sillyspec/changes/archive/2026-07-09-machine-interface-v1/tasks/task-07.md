---
id: task-07
title: 新增 test/machine-interface.test.mjs — 覆盖全局验收标准
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P0
depends_on: [task-03, task-05, task-06]
blocks: []
allowed_paths:
  - test/machine-interface.test.mjs
  - package.json
expects_from:
  task-01:
    - contract: machine-interface-module
      needs: [runGate, buildEnvelope, EXIT_OK, EXIT_BLOCKED, EXIT_UNKNOWN]
  task-02:
    - contract: derive-api
      needs: [runDerive, FACETS]
  task-03:
    - contract: cli-machine-commands
      needs: [gate, derive]
  task-05:
    - contract: platform-approval-api
      needs: [approve, reject]
  task-06:
    - contract: workflow-run-platform-path
      needs: [runtimeRoot, scanRunId]
goal: |
  用自研 assert 脚本风格（参照 test/agent-gate-hardening.test.mjs 的 mkdtemp + git fixture 模式）
  覆盖 plan.md 全局验收标准 1-7，并接入 npm test。
implementation: |
  新建 test/machine-interface.test.mjs，分节：
  1. envelope：buildEnvelope 固定字段、schema_version=1、generated_at ISO 格式
  2. gate：临时 fixture 变更目录（参照 agent-gate-hardening.test.mjs 的 initGitRepo/
     .gitignore 先行提交模式）——execute 产物齐+有代码变更→exit 0；伪造 review.json/零变更→
     exit 1 且 errors 指明原因；变更不存在→exit 2
  3. D-008 一致性：gate execute 输出中 artifacts 与 execute-evidence 结论不矛盾
  4. derive：四 facet 结构断言 + 非法 facet exit 2
  5. 只读性：gate/derive 调用前后 sillyspec.db 文件 hash（crypto createHash）不变，
     gate-status.json 不产生/不变化
  6. CLI 端到端：execFileSync node bin/sillyspec.js gate/derive --json，stdout JSON.parse
     成功（含制造内部异常场景验证兜底 JSON + exit 2）
  7. approve/reject：node:http mock server 断言 POST 路径/body 与 approvals 表落库、
     失败场景 exit 1 表不变
  8. saveWorkflowRun：带/不带 runtimeRoot+scanRunId 两分支落盘路径断言
  若 package.json 的 npm test 不是通配（逐文件列出），把本文件接入 test 脚本。
acceptance: |
  - node test/machine-interface.test.mjs 全绿
  - 全量 npm test 通过（含本文件与所有存量测试）
verify: |
  TDD：每节先写断言（红）再依赖已完成实现变绿；最终跑全量 npm test。
constraints: |
  - 只改 allowed_paths 内文件；测试用临时目录（mkdtempSync），不污染仓库工作区
  - 复用 agent-gate-hardening.test.mjs 的 fixture 辅助模式，不引入测试框架
---

# task-07: machine-interface 测试套件

## 目标

见 frontmatter goal。

## 实现蓝图

见 frontmatter implementation（8 节）。

## 验收标准

见 frontmatter acceptance（2 条）。

## TDD/验证

见 frontmatter verify。
