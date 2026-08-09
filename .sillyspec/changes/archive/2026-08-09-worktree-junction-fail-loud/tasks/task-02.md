---
id: task-02
title: doctorReprovision junction unlink fail-loud
title_zh: _doctorReprovision junction 解链改 fail-loud（废弃 best-effort）
author: qinyi
created_at: 2026-08-09T16:10:00+08:00
priority: P0
depends_on: [task-01]
blocks: [task-03]
allowed_paths:
  - src/worktree.js
goal: _doctorReprovision(:866-881) 同源 fail-loud + 废弃 :878 best-effort 注释（解链失败 throw 不调 provisionDeps，避免 install 经 junction 误改主仓 node_modules）
implementation: |
  - src/worktree.js _doctorReprovision 函数 :870 lstatSync try{}catch{} 静默 → catch 改 throw（同 task-01 口径，EPERM 阻断）
  - :872-878 解链 try{}catch{} → catch 改 throw（**删除 :878 注释「解链失败不阻断：交由 provisionDeps install 分支处理」**，解链失败 throw 阻断 doctor，不调 provisionDeps）
  - isLink 初始值 `let isLink = false` 去掉 → lstat 失败直接 throw
acceptance:
  - lstatSync 抛 EPERM 时 _doctorReprovision throw（不跳过解链、不调 provisionDeps）
  - 解链 rmdir/unlinkSync 失败时 _doctorReprovision throw（**不调 provisionDeps**，D-002@v1——install 经 junction 误改主仓的根因消除）
  - 正常 junction 解链成功后继续 provisionDeps（回归不破）
verify:
  - node --test test/worktree-junction-fail-loud.test.mjs（task-03 提供）
constraints:
  - 接口签名 _doctorReprovision(name, wtPath) 不变（调用方 doctor 已有 try/catch 兜底）
  - 遵循 D-001@v1（fail-loud）+ D-002@v1（废弃 best-effort，解链失败不 install）
related_tests: []
---

# task-02：_doctorReprovision junction 解链 fail-loud

## 背景
同 task-01 同源坑。_doctorReprovision（doctor --fix reprovision）在 provisionDeps 前解链 junction。当前 :878 `catch {} // 解链失败不阻断：交由 provisionDeps install 分支处理` 是 best-effort——但 provisionDeps 跑 `npm install` 经 junction 会**误改主仓 node_modules**（正是 #4 坑的另一半）。

## 改动点
1. lstat catch → throw（同 task-01）
2. 解链 catch → throw + 删 :878 best-effort 注释（解链失败不调 provisionDeps）
3. 去 `isLink = false` 默认值
