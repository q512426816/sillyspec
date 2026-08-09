---
author: qinyi
created_at: 2026-08-09T10:52:00+08:00
---

# requirements.md — 统一 git 调用入口

- **FR-01**：新建 `src/git-helper.js` 作为唯一公共 git 调用入口，提供 `safeGit(cwd,args,opts)`（返回 `{value,error}`、带 `-c safe.directory`+timeout）、`git(cwd,args,opts)`（失败抛错）、`gitQuiet(cwd,args,opts)`（失败返回 null），全部 `execFileSync('git', [...args])` 数组形式，不经 shell。
- **FR-02**：`src/run/shared.js` 的 `safeGit` 删除本地实现，改 `export { safeGit } from '../git-helper.js'`（re-export），现有 run/ 层调用方路径与行为不变。
- **FR-03**：`src/worktree.js` 删本地 `git()`/`gitQuiet()`，import 公共入口；51 处 helper 调用点 + 注入点（:63 check-ignore `${relPath}`、:775 worktree remove `${worktreePath}`、:1346 commit `${changeName}` 等含变量点）改传数组。
- **FR-04**：`src/worktree-apply.js` 删本地 `git()`/`gitQuiet()`，import 公共入口；26 处 helper 调用点 + 裸 execSync 注入核心（:357/:369-372 `git diff --binary ${trackedArgs/diffCachedArgs}` 的 files.join(' ') 产物）改传数组。
- **FR-05**：`src/index.js:859` `worktree diff --base <commit>` 的 base 不再插值进 shell，改数组调用。
- **FR-06**：含变量拼接改写规则：字符串字面→数组元素、`'sub '+v`→`['sub',v]`、`'-- '+files.join(' ')`→`['--',...files]`（每个文件独立 argv 元素）。
- **FR-07**：新增 `test/git-helper-injection.test.mjs`：含空格文件名不拆词；含 `$(touch <tmp>)` 文件名调用后断言 `<tmp>` 副作用文件不存在（证明不经 shell）；safeGit/git/gitQuiet 三语义回归；grep 反向断言全仓不再存在 `` execSync(`git `` 模板串。
- **FR-08**：全量 `npm test`（worktree/db 相关回归）+ `npm run lint` 全绿。
