---
id: task-06
title: 八场景测试 + cleanHomePointer 扩展
title_zh: 八场景测试 + cleanHomePointer 扩展
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05]
blocks: [task-07]
allowed_paths:
  - test/platform-managed-declaration.test.mjs
  - test/run-tests.mjs
goal: |
  全链路测试证据：八场景（七机制场景 + doctor 信号场景⑧）+ run-tests.mjs teardown 扩展
  防 HOME 声明泄漏（plan review gap 项）。
implementation: |
  1. 新建 test/platform-managed-declaration.test.mjs：
     ①三落盘：init --spec-dir 外部 --workspace-id → 三文件齐 + 声明四字段断言（含无多余字段）
     ②resolvePlatformSpecDir 直测：删指针保声明 → expect throw PlatformManagedError，err.name==='PointerUnreachableError'
     ③runCommand CLI 子进程：删指针保声明 → node bin/sillyspec.js --dir <d> run quick --status → exit 1 + stderr 含"平台接管"
     ④无声明走本地：纯本地项目裸调 → 不报错，行为不变
     ⑤disconnect 三清：平台项目 disconnect → 指针/声明删 + 裸调恢复本地
     ⑥--spec-dir 逃生口：声明+无指针状态传 --spec-dir → 正常执行不阻断
     ⑦幂等：连续两次 init 平台参数 → 声明仍有效四字段
     ⑧doctor 信号：删指针保声明 → doctor --json 输出含 pointer_missing_but_managed（FR-06 证据）
     fixture：tmpdir + git init 隔离（仿 platform-recovery.test.mjs setup），每场景 clean。
  2. test/run-tests.mjs cleanHomePointer：扩展为同时清理 ~/.sillyspec-platform-managed
     （HOME 泄漏会让 home 下后续所有命令 fail-closed 且套件不自愈）。
acceptance: |
  - 八场景全绿；npm test 全量绿；npm run lint 过
verify: |
  node test/platform-managed-declaration.test.mjs 单跑 + npm test 全量。
constraints: |
  - 只动 test/platform-managed-declaration.test.mjs + test/run-tests.mjs；
    不为通过改既有测试断言（逻辑问题修逻辑）
---
# task-06: 八场景测试
## 目标
见 frontmatter goal（R-01 fixture 清理 + plan review gap teardown 扩展）。
## 验收
见 frontmatter acceptance。
