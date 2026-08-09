---
author: qinyi
created_at: 2026-08-09T10:52:00+08:00
---

# tasks.md — 统一 git 调用入口

## Wave 1：公共入口 + 收口

- [x] T-001：新建 `src/git-helper.js`（safeGit 从 run/shared.js 移入作单一实现 + 新增 git/gitQuiet）；`src/run/shared.js` safeGit 改 re-export。验证：run/ 层现有 safeGit 调用方（stage.js/quick-audit.js/concurrent-detect.js/complete-handlers.js/prompt.js）行为不变。
- [x] T-002：`src/worktree.js` 删本地 git/gitQuiet 改 import 公共入口；51 处 helper 调用点 + :63/:775/:1346 等含变量点改传数组。
- [x] T-003：`src/worktree-apply.js` 删本地 git/gitQuiet 改 import 公共入口；26 处 helper 调用点 + :357/:369-372 裸 execSync 注入核心改传数组。
- [x] T-004：`src/index.js:859` worktree diff --base 改数组调用。

## Wave 2：测试 + 验证

- [x] T-005：新增 `test/git-helper-injection.test.mjs`（空格不拆词 / `$(touch)` 副作用锚点 / 三语义回归 / grep 反向断言无 execSync(\`git 模板串）。
- [x] T-006：全量 `npm test` + `npm run lint` 全绿；grep 反向断言全仓无残留字符串拼接 git。
