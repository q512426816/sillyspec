---
author: qinyi
created_at: 2026-08-09T15:45:00+08:00
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— worktree junction 解链 fail-loud（review-2026-08-09 #4）

## 背景与目标

`docs/sillyspec/review-2026-08-09.md` #4 [P1]：`src/worktree.js` cleanup(:742) + `_doctorReprovision`(:870) 两处 `lstatSync` 判 junction 被 `try{}catch{}` 静默化——Windows 杀毒/索引锁住 junction 偶发 EPERM 时 `isLink` 保持 false → 跳过解链 → 后续 `git worktree remove`/`rmSync recursive`（cleanup）或 `provisionDeps`（_doctorReprovision）**跟随 junction 删/改主仓 node_modules**。

memory `sillyspec-worktree-cleanup-deletes-node-modules` 记录此坑（cleanup 后 npm install 恢复 workaround）。当前 try/catch 静默化反而去掉 fail-loud 机会——EPERM 时静默跳过解链 = 默默埋下删主仓 node_modules 的雷。

**目标**：junction 检测/解链失败时 fail-loud 阻断 cleanup / _doctorReprovision，保护主仓 node_modules 不被误删/误改。符合 review #4 建议「lstat 失败 fail-loud 阻断 cleanup」。

## 方案（方案A 双 fail-loud，step3/4 用户确认）

两处统一改 `try{}catch{}` 静默为 fail-loud throw：
- **lstat 失败**（EPERM 杀毒/索引锁）→ throw 阻断（不跳过解链、不继续 git remove/provisionDeps）
- **解链失败**（rmdir/unlink）→ throw 阻断（不继续后续删/装）

错误信息含恢复指引（关闭占用进程 / 手动 `rmdir "<wtNodeModules>"` / 重试）。

### cleanup（src/worktree.js:738-757 现状 → 改）

```js
const wtNodeModules = join(worktreePath, 'node_modules');
if (existsSync(wtNodeModules)) {
  let isLink;
  try { isLink = lstatSync(wtNodeModules).isSymbolicLink(); }
  catch (e) {
    throw new Error(`worktree node_modules junction 检测失败（疑似 EPERM：杀毒/索引占用），阻断 cleanup 保护主仓 node_modules：${e.message}。请关闭占用进程或手动 rmdir "${wtNodeModules}" 后重试 sillyspec worktree cleanup`);
  }
  if (isLink) {
    try {
      if (process.platform === 'win32') execSync(`rmdir "${wtNodeModules}"`, { shell: 'cmd.exe' });
      else unlinkSync(wtNodeModules);
      details.push('worktree node_modules junction/symlink removed (protect main checkout)');
    } catch (e) {
      throw new Error(`worktree node_modules junction 解链失败，阻断 cleanup 保护主仓 node_modules：${e.message}。请手动 rmdir "${wtNodeModules}" 后重试`);
    }
  }
}
```

### _doctorReprovision（src/worktree.js:866-881 现状 → 改）

同源改 fail-loud（lstat + 解链 throw）。**关键**：原 :878 `catch {} // 解链失败不阻断：交由 provisionDeps install 分支处理` 的 best-effort 语义**废弃**——解链失败若继续 `provisionDeps`，install 经 junction 误改主仓 node_modules（正是 #4 坑）。解链失败 → throw 阻断 doctor（**不调 provisionDeps**）。lstat 失败同 cleanup → throw。

## 接口定义（Interface）

`cleanup(changeName, {force, maxRetries})` / `_doctorReprovision(name, wtPath)` 接口签名不变（仍可能在 junction 解链失败时 throw Error，调用方 `run`/`doctor` 已有 try/catch 兜底）。变更仅是容错策略收紧（静默 `catch{}` → `throw`），无新增/改方法签名、无对外字段变动。仅改内部实现。

## 非目标（Non-Goals）
- 不改 `git worktree remove` 本身（仅保护 junction 解链前置步骤）
- 不改 in-place-fallback（worktreePath 即主仓，无 junction）/ native-worktree（外部隔离，跳过）分支
- **不加「自动 npm install 恢复」**——fail-loud 显式错误让用户决策，符合 review 建议「fail-loud 而非静默」；自动恢复会掩盖根因
- 不改其他 `lstatSync` 用法（仅 junction 解链两处）
- ③ complete-stage 后门 / R5 4th persist（#2 defer 债）不在本变更范围

不涉及生命周期契约（junction 文件操作，非 stage/step 状态机；无 lifecycle 事件）。

## 文件变更清单（File Changes）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/worktree.js | cleanup:738-757 + _doctorReprovision:866-881 两处 try{}catch{} 静默 → fail-loud throw（lstat 失败 EPERM + 解链失败 rmdir/unlink）；_doctorReprovision:878 best-effort 注释废弃（解链失败不调 provisionDeps） |
| 新增 | test/worktree-junction-fail-loud.test.mjs | mock lstat 抛 EPERM → 断言 throw；mock 解链 rmdir/unlink 失败 → 断言 throw + 不继续 git remove/provisionDeps；正常 junction 解链仍成功 |

## 风险登记（Risk）
- **R1 fail-loud 阻断 cleanup 影响流程**（execute 归档 cleanup 失败）：缓解——错误提示含恢复指引（手动 rmdir + 重试），用户可处理；优于静默删主仓 node_modules（数据丢失不可逆 vs cleanup 重试可恢复）
- **R2 EPERM 偶发瞬态**（杀毒/索引瞬锁）：缓解——错误提示建议关闭占用进程重试；不加自动重试（fail-loud 显式，避免静默重试掩盖持续问题）
- **R3 _doctorReprovision 解链 fail-loud 改变 doctor 行为**（原 best-effort → 阻断）：缓解——doctor 是 `--fix` 显式调用，解链失败不该继续 provisionDeps 经 junction；fail-loud 让用户知道 junction 未解
- **R4 非 Windows 平台 lstat/unlink 极少 EPERM**：缓解——Unix `unlinkSync` 失败也 fail-loud（一致口径，不 platform-split 容错）
- **R5 测试 mock lstat 抛 EPERM 跨平台**：缓解——node:test mock（参考 #2 task-05 stage-completion-atomicity 的 mock.module 模式）或 spy `lstatSync`

## 决策追踪（Decisions）
- **D-001@v1: junction 解链改 fail-loud（双 throw）**：cleanup + _doctorReprovision 两处 `lstatSync` 判 junction 的 `try{}catch{}` 静默化 → lstat 失败(EPERM) + 解链失败(rmdir/unlinkSync) 均 throw 阻断，保护主仓 node_modules 不被 git remove/rmSync/provisionDeps 跟 junction 误删/误改。来源：step3/4 用户确认方案A。supersedes：无。
- **D-002@v1: 废弃 _doctorReprovision:878 best-effort 注释**：原「解链失败不阻断：交 provisionDeps install 分支处理」是 bug 根因（install 经 junction 误改主仓）→ 解链失败 throw 阻断 doctor，**不调 provisionDeps**。来源：design §_doctorReprovision 分析。

## 自审（Self-Review）
- 与 #2（complete-gate-atomicity）独立（worktree.js vs complete/gates/stage.js，不同模块）
- 兼容性：cleanup/_doctorReprovision 接口不变（仍可能 throw Error，调用方已有 try/catch 兜底——cleanup 调用方 `run` / `_doctorReprovision` 调用方 `doctor`）
- Windows/Linux/macOS：rmdir win32 / unlinkSync unix，fail-loud 一致口径
- 不破坏既有 worktree 测试（worktree-native-overlay 等）：junction 解链仅在 Windows worktree 模式触发，mock 测试隔离
