---
id: task-03
title: Wave 1 测试（占位符 + 阻断文案）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P0
depends_on: [task-01, task-02]
blocks: []
allowed_paths:
  - test/execute-prompt-spec-root-placeholder.test.mjs
  - test/review-gate-block-message.test.mjs
---
> 为坑 2（占位符化）和建议 3（阻断文案）写测试，并在 run-tests.mjs 注册。

## implementation
- 新增 test/execute-prompt-spec-root-placeholder.test.mjs：读 execute.js prompt 文本，断言无裸 `.sillyspec/.runtime/`、含 `{SPEC_ROOT}/.runtime/execute-runs/` 与 `{SPEC_ROOT}/.runtime/contract-artifacts/`
- 新增 test/review-gate-block-message.test.mjs：构造缺 review.json 的 task，调 review gate，断言阻断文案含期望路径 + runId
- 在 test/run-tests.mjs 注册两个新测试文件（沿用 TESTING.md 注册风格）
- 沿用内联 assertEqual/assertThrows 风格

## acceptance
- 两测试文件存在并在 run-tests.mjs 注册
- 占位符测试覆盖仓库内 + 平台两种 {SPEC_ROOT} 重写（如可构造）
- 阻断文案测试断言路径 + runId

## verify
- `npm test` 两新测试通过
- `npm run lint` 0 error

## constraints
- 不改源码（只测试）；若发现源码 bug 走 reverse-sync 先改 design
- 测试自包含，不依赖真实 sillyspec.db
- brownfield：测试不破坏现有 npm test 套件
