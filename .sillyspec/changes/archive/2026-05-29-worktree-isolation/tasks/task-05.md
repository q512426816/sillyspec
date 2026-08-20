---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-05
title: Hook 拦截实现
priority: P0
estimated_hours: 5h
depends_on: []
blocks: [task-09, task-10]
allowed_paths:
  - src/hooks/worktree-guard.js (新增)
---

# task-05: Hook 拦截实现

## 修改文件（必填）
- 新增 `src/hooks/worktree-guard.js`

## 实现要求
1. 实现 AI 工具调用的源码保护拦截逻辑
2. 三重门禁：阶段门禁（stageGate）× 位置门禁（locationGate）× 文件门禁（fileGate）
3. 支持 Write/Edit/MultiEdit 路径拦截 + Bash 命令拦截
4. 环境变量 `SILLYSPEC_DISABLE_HOOKS=1` 紧急逃生

## 接口定义（代码类任务必填）

```javascript
import { existsSync, readFileSync } from 'fs'
import path from 'path'

/**
 * 判断工具调用是否应被拦截
 * @param {{
 *   tool: 'Write' | 'Edit' | 'MultiEdit' | 'Bash',
 *   filePath?: string,
 *   filePaths?: string[],  // MultiEdit
 *   command?: string,
 *   cwd?: string
 * }} opts
 * @param {{ cwd?: string }} ctx
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function shouldBlock(opts, ctx = {}) {}

/**
 * 判断 Bash 命令是否应被拦截
 * @param {string} command - Bash 命令字符串
 * @param {string} cwd - 当前工作目录
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function shouldBlockBash(command, cwd) {}

/**
 * 判断文件写入是否应被拦截
 * @param {string} filePath - 目标文件绝对路径
 * @param {string} cwd - 当前工作目录
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function shouldBlockWrite(filePath, cwd) {}
```

### 控制流伪代码

```
shouldBlock(opts, ctx):
  if process.env.SILLYSPEC_DISABLE_HOOKS === '1':
    return { blocked: false }

  cwd = opts.cwd || ctx.cwd || process.cwd()
  filePath = opts.filePath || (opts.filePaths?.[0])
  worktreeDir = resolveWorktreeDir(cwd)

  switch(opts.tool):
    case 'Write': case 'Edit':
      return shouldBlockWrite(resolve(filePath, cwd), cwd)
    case 'MultiEdit':
      for fp of opts.filePaths:
        result = shouldBlockWrite(resolve(fp, cwd), cwd)
        if result.blocked: return result
      return { blocked: false }
    case 'Bash':
      return shouldBlockBash(opts.command, cwd)
    default:
      return { blocked: false }

shouldBlockWrite(filePath, cwd):
  // 文件门禁：文档类/配置类始终放行
  if matchFileWhitelist(filePath):
    return { blocked: false }

  // 阶段门禁
  gateStatus = readGateStatus(cwd)
  if !gateStatus || gateStatus.stage not in ['execute', 'quick']:
    return { blocked: true, reason: `stage "${gateStatus?.stage}" does not allow source code writes` }

  // 位置门禁
  if isInsideWorktree(filePath, cwd):
    return { blocked: false }
  else:
    return { blocked: true, reason: `source code write blocked in main worktree` }

shouldBlockBash(command, cwd):
  // cwd 在 worktree 内 → 全部放行
  if isInsideWorktree(cwd, cwd):
    return { blocked: false }

  // 阶段门禁
  gateStatus = readGateStatus(cwd)
  if !gateStatus || gateStatus.stage not in ['execute', 'quick']:
    // 非 execute/quick 阶段，Bash 命令只允许只读白名单
    if matchReadonlyWhitelist(command):
      return { blocked: false }
    return { blocked: true, reason: `Bash command blocked in stage "${gateStatus?.stage}"` }

  // execute/quick 阶段 + 主工作区：检查危险命令
  if matchDangerBlacklist(command):
    return { blocked: true, reason: `dangerous command blocked: ${command}` }

  if matchReadonlyWhitelist(command):
    return { blocked: false }

  // 不确定的命令 → 放行（安全优先：只拦截明确的危险命令）
  return { blocked: false }
```

### 辅助函数

```
matchFileWhitelist(filePath):
  filePath 以 .sillyspec/ 开头 → true
  filePath 扩展名为 .md → true
  filePath 文件名为 package.json / tsconfig.json / local.yaml → true
  filePath 在 .git/ 下 → true
  否则 → false

matchReadonlyWhitelist(command):
  提取第一个命令名（command.split(/\s+/)[0]）
  只读命令：grep, rg, ag, find, ls, cat, head, tail, wc, stat
  只读 git：git diff, git status, git log, git show, git branch, git stash list
  版本检查：node --version, npm --version, npx --version
  其他只读：echo, pwd, basename, dirname, realpath
  worktree 管理：sillyspec worktree
  匹配 → true，否则 → false

matchDangerBlacklist(command):
  危险 git：git add, git commit, git push, git checkout, git restore, git reset, git clean, git mv, git rm, git stash (drop/clear/pop)
  危险系统：rm -rf, mv (移动文件)
  sudo
  匹配 → true，否则 → false

readGateStatus(cwd):
  读取 .sillyspec/.runtime/gate-status.json
  不存在 → return null
  返回 { stage: string, ... }

isInsideWorktree(filePath, cwd):
  filePath 包含 '.sillyspec/.runtime/worktrees/' → true
  否则 → false

resolveWorktreeDir(cwd):
  path.join(cwd, '.sillyspec', '.runtime', 'worktrees')
```

## 边界处理（必填）
- `SILLYSPEC_DISABLE_HOOKS=1` → 直接放行所有操作，不做其他检查
- gate-status.json 不存在 → stageGate = false，禁止源码写入（默认安全）
- filePath 为 null/undefined → 返回 `{ blocked: true, reason: 'no file path' }`
- filePath 为相对路径 → resolve 为绝对路径后再判断
- Bash command 为空字符串 → 放行（不拦截空命令）
- Bash 命令含管道（`|`）或链式（`&&`/`||`）→ 对整条命令的每个部分分别检查，任一部分命中危险黑名单则拦截
- cwd 为 undefined → 使用 process.cwd()
- 不修改传入参数 opts、ctx
- 白名单规则可通过 `local.yaml` 扩展（读取 `worktree-hook.fileWhitelist` 和 `worktree-hook.readonlyCommands`）

## 非目标（本任务不做的事）
- 不实现 hook 的实际注入机制（由 MCP server 或 AI platform 处理）
- 不实现白名单配置 UI
- 不做 execute/quick 阶段集成（task-06/09 负责）
- 不做降级逻辑（task-10 负责）

## 参考
- design.md §3 — Hook 拦截逻辑详细设计
- requirements.md FR-4 — Hook 拦截功能需求

## TDD 步骤
1. 验证文档类文件路径（.md、.sillyspec/）→ 放行
2. 验证源码文件路径（.js、.ts）→ 在 execute 阶段 + worktree 内放行，主工作区拦截
3. 验证 Bash 只读命令 → 放行
4. 验证 Bash 危险命令 → 拦截
5. 验证 `SILLYSPEC_DISABLE_HOOKS=1` → 全部放行
6. 验证管道命令中包含危险子命令 → 拦截

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | Write .md 文件（任意阶段） | blocked: false（白名单放行） |
| AC-02 | Write .js 文件 + execute 阶段 + worktree 内 | blocked: false |
| AC-03 | Write .js 文件 + execute 阶段 + 主工作区 | blocked: true |
| AC-04 | Write .js 文件 + brainstorm 阶段 | blocked: true |
| AC-05 | Bash `git log`（任意阶段） | blocked: false（只读白名单） |
| AC-06 | Bash `git commit` + execute 阶段 + 主工作区 | blocked: true |
| AC-07 | Bash `npm test` + execute 阶段 + worktree 内 | blocked: false |
| AC-08 | Bash `echo hello && git commit` | blocked: true（管道中含危险命令） |
| AC-09 | SILLYSPEC_DISABLE_HOOKS=1 + Write .js 文件 + brainstorm | blocked: false |
| AC-10 | gate-status.json 不存在 | blocked: true（默认安全） |
