---
author: qinyi
created_at: 2026-08-09T15:50:00+08:00
---
# 任务（Tasks）— worktree junction 解链 fail-loud

- [ ] task-01: `cleanup`(:738-757) 两处 `try{}catch{}` 静默 → fail-loud throw（lstat 失败 EPERM + 解链失败 rmdir/unlinkSync），错误含恢复指引（覆盖：FR-01, FR-02, FR-05）
- [ ] task-02: `_doctorReprovision`(:866-881) 同源改 fail-loud（lstat + 解链 throw，**废弃 :878 best-effort 注释**，解链失败不调 provisionDeps）（覆盖：FR-03, FR-04, FR-05）
- [ ] task-03: 新增 `test/worktree-junction-fail-loud.test.mjs`（mock lstat EPERM throw + 解链失败 throw + 正常解链成功；断言解链失败时不继续 git remove/provisionDeps）（覆盖：FR-06）
- [ ] task-04: 验收门禁 `npm test` + `npm run lint` 全绿 + 既有 worktree 回归套件零回归（覆盖：FR-07）
