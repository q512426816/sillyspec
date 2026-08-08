---
id: task-04
title: quick/execute preflight integration test
title_zh: 并发预检钩子集成测试
author: qinyi
created_at: 2026-08-08 13:16:00
priority: P0
depends_on: [task-02, task-03]
blocks: []
requirement_ids: [FR-05, FR-06, FR-07]
decision_ids: []
allowed_paths:
  - test/concurrent-preflight-hooks.test.mjs
---

## goal
> 新增集成测试，验证 quick --done 与 execute --done 在他者脏文件在场时触发 console.warn 且不阻断，干净仓零输出。

## implementation
- 新建 test/concurrent-preflight-hooks.test.mjs，spy console.warn 或捕获 stderr
- 首选驱动真实完成路径（B-004）：quick 侧驱动 handleQuickStageCompletion、execute 侧驱动 completeStageGates（复用 test/run-complete-step-quick.test.mjs 的 fixture 模式），构造含他者脏文件的工作树
- 场景一 quick --done 工作树含他者脏文件 → warn 触发，audit 不阻断（review.status 不变）
- 场景二 execute --done 工作树含他者脏文件 → warn 触发，gate 不阻断
- 场景三 干净仓 → 零 warn
- 仅当驱动真实路径确不可行时才降级为测 detectConcurrentChanges 调用契约，且明确标注 AC「console.warn 被调用」将落空的风险（B-004）

## acceptance
- quick/execute --done 他者脏文件在场时 console.warn 被调用（须驱动真实钩子验证，非降级）
- 两种 --done 都不阻断（audit safe / gate 通过）
- 干净仓 console.warn 零调用

## verify
- node test/concurrent-preflight-hooks.test.mjs（绿）

## constraints
- 不改源码（只测 task-02/03 的钩子行为）
- 跨平台 fixture（os.tmpdir 隔离，复用 test/run-complete-step-quick.test.mjs 模式）
- 首选驱动真实完成路径，降级仅末路且标注 AC 落空风险（B-004）
