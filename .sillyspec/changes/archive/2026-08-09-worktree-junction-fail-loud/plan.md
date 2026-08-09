---
author: qinyi
created_at: 2026-08-09T16:05:00+08:00
plan_level: light
---

# 轻量计划（Light Plan）：worktree junction 解链 fail-loud

## 来源
brainstorm design.md 方案A 双 fail-loud（D-001@v1 junction 解链 throw / D-002@v1 废弃 _doctorReprovision:878 best-effort，解链失败不调 provisionDeps）。

## 范围
- src/worktree.js（cleanup:738-757 + _doctorReprovision:866-881）
- test/worktree-junction-fail-loud.test.mjs（新增）

## Tasks
- [x] task-01: cleanup:738-757 两处 `try{}catch{}` 静默 → fail-loud throw（lstat EPERM + 解链 rmdir/unlink 失败），错误含恢复指引（覆盖：FR-01, FR-02, FR-05, D-001@v1）
- [x] task-02: _doctorReprovision:866-881 同源 fail-loud + 废弃 :878 best-effort 注释（解链失败 throw 不调 provisionDeps）（覆盖：FR-03, FR-04, FR-05, D-001@v1, D-002@v1）
- [x] task-03: 新增 test/worktree-junction-fail-loud.test.mjs（mock lstat EPERM throw + 解链失败 throw + 正常解链成功；断言解链失败不继续 git remove/provisionDeps）+ npm test / lint 全绿（覆盖：FR-06, FR-07）

## 验收
- cleanup / _doctorReprovision 在 lstat 抛 EPERM 时 throw（不跳过解链、不继续 git worktree remove / provisionDeps）
- 解链 rmdir / unlinkSync 失败时 throw（不继续后续删/装经 junction 误改主仓 node_modules）
- 正常 junction 仍解链成功（回归不破）
- npm test + npm run lint 全绿，既有 worktree 套件零回归

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02 | lstat+解链失败均 throw（AC-fail-loud）|
| D-002@v1 | task-02 | 解链失败不调 provisionDeps（AC-no-provisionDeps）|
