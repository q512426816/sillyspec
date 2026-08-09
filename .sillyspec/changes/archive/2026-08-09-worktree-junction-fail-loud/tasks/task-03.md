---
id: task-03
title: junction fail-loud regression tests
title_zh: junction fail-loud 回归测试 + 门禁
author: qinyi
created_at: 2026-08-09T16:10:00+08:00
priority: P0
depends_on: [task-01, task-02]
blocks: []
allowed_paths:
  - test/worktree-junction-fail-loud.test.mjs
goal: 新增测试覆盖 lstat EPERM throw + 解链失败 throw + 正常解链成功；npm test/lint 全绿零回归
implementation: |
  - 新增 test/worktree-junction-fail-loud.test.mjs（node:test mock.module 模式，参考 test/stage-completion-atomicity.test.mjs 的 mock 签名）
  - mock fs.lstatSync 抛 EPERM（Object.assign(new Error('EPERM'), {code:'EPERM'})）→ 断言 cleanup + _doctorReprovision 均 throw（断言 throw + git worktree remove / provisionDeps 未被调用）
  - mock 解链 execSync(unix unlinkSync 或 win32 rmdir via child_process.execSync) 失败 → 断言两者 throw（断言 throw + git remove / provisionDeps 未调用）
  - 正常 junction（mock lstatSync.isSymbolicLink()=true + 解链成功）→ 断言解链成功不 throw，details 含 junction removed
  - 非 junction（isSymbolicLink()=false，普通目录）→ 不尝试解链，正常流转（回归）
acceptance:
  - EPERM 时 cleanup + _doctorReprovision throw（断言 throw + git remove/provisionDeps 未调用）
  - 解链失败时两者 throw（断言 throw + git remove/provisionDeps 未调用）
  - 正常 junction 解链成功不 throw
  - npm test 全绿 + npm run lint 全绿（既有 worktree-native-overlay/worktree-apply 套件零回归）
verify:
  - node --test test/worktree-junction-fail-loud.test.mjs
  - npm test
  - npm run lint
constraints:
  - mock 跨平台（win32 rmdir / unix unlinkSync 两分支覆盖，或 platform-split mock）
  - 不改既有 worktree 测试（仅新增）
related_tests: []
---

# task-03：junction fail-loud 回归测试 + 门禁

## 背景
task-01/02 改容错策略（静默 catch → throw），需测试锁定 fail-loud 行为，防回归回静默。

## 测试矩阵
| 场景 | lstatSync | 解链 | 期望 |
|---|---|---|---|
| EPERM 锁 junction | throw EPERM | — | cleanup/doctor throw，不 git remove/provisionDeps |
| 解链失败 | isSymbolicLink true | throw | cleanup/doctor throw，不 git remove/provisionDeps |
| 正常 junction | isSymbolicLink true | 成功 | 解链成功，继续流转 |
| 非 junction 目录 | isSymbolicLink false | — | 不解链，正常流转 |
