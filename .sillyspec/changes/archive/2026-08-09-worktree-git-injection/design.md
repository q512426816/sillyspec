---
author: qinyi
created_at: 2026-08-09T10:52:00+08:00
scale: large
risk_level: unit-sufficient
---

# design.md — 统一 git 调用入口，消除 worktree 链路命令注入 + 空格拆词

## 背景与目标

依据 `docs/sillyspec/review-2026-08-09.md` #1（4 子代理共识：数据并发 B / 健壮性 C / 代码质量 D / 测试安全 E 独立命中）。

**问题**：worktree 链路全仓唯一还在用字符串拼接执行 git——
- `src/worktree.js:70-76` 本地 `git()`/`gitQuiet()` helper：`execSync(\`git ${args}\`)`，51 处调用
- `src/worktree-apply.js:25-35` 同款 helper：26 处调用
- `src/index.js:859`：`worktree diff --base <commit>` 把用户/agent 输入的 base 直接插值进 shell

**双重危害**：
1. **空格拆词（确定性 live bug）**：apply 链路把 worktree 工作树的文件名（`trackedFiles`/`patchFiles`）`.join(' ')` 拼进 shell，文件名含空格（Windows 用户目录、文档名常见）被 shell 切词 → apply 静默漏文件。
2. **命令注入（RCE 面）**：worktree 内文件名 agent 可控（plan 可诱导产出），含 `;`/`$()`/`` ` `` 时 `execSync` 经 shell 在用户机器上执行任意命令。

**口径分裂**：`src/run/shared.js:373` 的 `safeGit` 已用 `execFileSync('git', [...args])` 数组形式（注释明示避免拆词），唯独 worktree 链没同步——A 代理 #24 点名的 run/shared.js 杂烩 + 同名工具双源的一部分。

**目标**：建立单一公共 git 调用入口（数组形式），worktree 链收口共用，消除注入 + 空格拆词 + 口径分裂。**行为不变**（git 命令语义不变，仅不经 shell）。

## 决策 / 方案选择

| 方案 | 描述 | 取舍 |
|------|------|------|
| A 最小修复 | 只把 worktree 链本地 helper 改数组形式，safeGit 保持独立 | 改动小，但保留口径分裂（A #24 双源） |
| **B 统一入口（选定）** | 新建 src/git-helper.js，safeGit 移入作单一实现，worktree 链 + run/shared.js 收口共用 | **选定**（用户明确「要统一入口」）：消除分裂、单一真相源、彻底 |
| C 第三方库 | 引 shell-quote/参数转义库 | 增依赖且不如原生 execFileSync 数组根本 |

**最终决策 = 方案 B**。落点选择：safeGit 从 `src/run/shared.js` 移入新建 `src/git-helper.js`（而非留在 run/shared.js）——根级文件让 worktree.js（根级）与 run/（下层）都平级引用，无分层倒置，并顺带收敛 A #23 点名的双源之一。

## 方案（实现要点）

新建 `src/git-helper.js` 作为**唯一公共 git 调用入口**，把 `safeGit` 从 `src/run/shared.js` 移入（原实现原样保留，`execFileSync` 数组形式已是正确范式）：

```js
// src/git-helper.js
export function safeGit(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000 } = opts
  const fullArgs = ['-c', `safe.directory=${cwd}`, '-C', cwd, ...args]
  try {
    let value = execFileSync('git', fullArgs, { encoding: 'utf8', timeout })
    if (trim) value = value.trim()
    return { value, error: null }
  } catch (e) {
    return { value: null, error: e.message.split('\n')[0] }
  }
}
// 抛错版（worktree.js 原 git() 语义：失败抛异常，调用方自行 catch）
export function git(cwd, args, opts = {}) {
  const { trim = true, timeout = 5000 } = opts
  const fullArgs = ['-c', `safe.directory=${cwd}`, '-C', cwd, ...args]
  const value = execFileSync('git', fullArgs, { encoding: 'utf8', timeout })
  return trim ? value.trim() : value
}
// 静默版（worktree.js 原 gitQuiet() 语义：失败返回 null）
export function gitQuiet(cwd, args, opts = {}) {
  try { return git(cwd, args, opts) } catch { return null }
}
```

迁移：
- `src/run/shared.js`：删除本地 `safeGit`，改为 `export { safeGit } from '../git-helper.js'`（re-export，现有 run/ 层调用方路径不变、行为不变）
- `src/worktree.js`：删除本地 `git()`/`gitQuiet()`，改 `import { git, gitQuiet } from './git-helper.js'`；51 处 helper 调用点由字符串改传数组
- `src/worktree-apply.js`：删除本地 `git()`/`gitQuiet()`，改 `import { git, gitQuiet } from './git-helper.js'`；26 处 helper 调用点改传数组
- `src/index.js:859`：`worktree diff --base` 的 base 值不再插值进 shell，改 `git`/`safeGit` 数组调用

### 改动面精确界定（Design Grill 修订：注入面 vs 健壮面）

**注入/拆词面（必须改，文件名/路径/用户输入进命令行）**——helper 调用点之外还有绕开 helper 的裸 execSync 模板串：
- worktree-apply.js `git diff --binary ... ${trackedArgs}`（`:357`）与 `git diff --binary --cached ${diffCachedArgs}`（`:369-372`）：trackedArgs/diffCachedArgs 是 `files.join(' ')` 产物，文件名直接拼进 shell——**注入核心**，绕开了 helper。
- worktree-apply.js helper 调用点中带文件列表的（`:108` ls-tree、`:347` ls-files、`:366` add、`:375` reset、`:402` apply --3way、`:459` checkout）。
- worktree.js `:63` `git check-ignore -q ${relPath}`（relPath 插值）、`:775` `git worktree remove ${worktreePath} --force`（worktreePath 未加引号插值）。
- worktree.js helper 调用点中带 worktreePath/分支/文件参数的全部。

**健壮面（可顺带改，无变量拼接、非注入，仅去 shell 更稳）**：worktree.js `:42/:43` rev-parse、`:211` git --version、`:932` worktree list --porcelain、`:1236/:1259` git diff（无参数）、`:1335` git add -A、`:1345`；worktree-apply.js 同类无变量调用。改成数组形式更稳但不属注入修复核心，执行时一并收口以保持口径统一。

**不在本变更**：worktree.js `:758/:885` Windows `rmdir` junction 删除（属 #4 解链 race，独立项）、`git` 字符串里的 `--base`/固定子命令本身。

**调用点改写规则**：字符串字面 `'a b c'` → `['a','b','c']`；拼接 `'sub ' + v` → `['sub', v]`；文件列表 `'... ' + files.join(' ')` → `[..., ...files]`（每个文件作为独立 argv 元素，天然不经 shell、空格/元字符安全）。

## 文件变更清单 / File Changes

- 新增 `src/git-helper.js`（统一入口：safeGit + git + gitQuiet，数组形式）
- 修改 `src/worktree.js`（删本地 helper、import 公共入口、51 调用点数组化）
- 修改 `src/worktree-apply.js`（删本地 helper、import 公共入口、26 调用点数组化）
- 修改 `src/run/shared.js`（safeGit 改 re-export 自 git-helper.js）
- 修改 `src/index.js`（:859 --base 拼接改数组调用）
- 新增 `test/git-helper-injection.test.mjs`（注入 + 空格回归测试）

## 风险登记 / Risk

- **R1 漏改调用点**：77 处 helper 调用点 + 裸 execSync 注入点漏改任一会留攻击面或运行时抛。**缓解（修订）**：lint 仅是 `node --check` 语法检查查不出语义错，改用**反向断言**——grep 断言全仓不再存在 `` execSync(`git `` 与 `execFileSync(`git ${`（test/git-helper-injection.test.mjs 内置该断言）+ 全量 npm test。
- **R2 拆错拼接**：含变量的拼接（尤其 files.join(' ')→...files）拆数组时参数顺序/个数错。缓解：逐处对照原字符串语义；worktree 相关测试（worktree-native-overlay / worktree-apply-incidental / db-concurrency 等）回归。
- **R3 行为微差**：原字符串 `execSync` 无 timeout，新入口统一 timeout 5000 —— 长 git 操作（如大 diff、worktree list）可能超时。缓解：对已知长操作调用点传更大 timeout（如 30s，对齐 verify-postcheck.js 现状）；执行阶段逐处评估。
- **R4 safe.directory 差异**：原 worktree helper 无 `-c safe.directory`，新入口统一带 —— 行为更稳健（不更坏），但需回归确认无意外失败。
- **R5 测试有效性**：仅「调 helper 不抛」证明不了「不经 shell」。**缓解（修订）**：测试用**可观测锚点**——含 `$(touch <tmpfile>)` 的文件名经 helper 调用后断言 `<tmpfile>` 副作用文件不存在；或 spy execFileSync 断言收到数组且无 `shell:true`。

## 自审 / Self-Review

- 统一入口为单一真相源，消除 A 代理点名的口径分裂；方案与用户「要统一入口」明确要求一致。
- 本变更不引入新 stage / 不改 stage 流转 / 不改 ProgressManager 存储 / 不改运行时文件类型 → 无需同步文件生命周期文档与 prompt 提取；execute 阶段不再重复声明。
- 生命周期契约：不适用（本变更不涉及会话、租约、守护进程、claim、agent_run、心跳等运行时生命周期事件，属机械重构无跨进程状态机改动，故无跨进程集成证据要求）。
- 非目标（Non-Goals）：不改 run/shared.js 其余杂烩（A #24 的其他关注点）、不统一 safeGit 之外的调用、不解决 #2 persist/gate 窗口或 #3 lost-update（属后续批次）。

## 测试方案

新增 `test/git-helper-injection.test.mjs`：
1. **不经 shell 的可观测锚点**：构造含 `$(touch <tmpfile>)` 的文件名经 git helper 数组调用，断言 `<tmpfile>` 副作用文件**不存在**（若经 shell 会被执行产生副作用）；含空格文件名作为独立 argv 元素不被拆词。
2. safeGit/git/gitQuiet 三者的 trim/抛错/静默语义回归。
3. **反向断言**：grep 全仓（src/）断言不再存在 `` execSync(`git `` 模板串（除白名单的无变量固定子命令外）。
4. 全量 npm test（worktree/db 相关测试回归）+ npm run lint。
