---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-03
title: apply 校验逻辑
priority: P0
estimated_hours: 4h
depends_on: [task-01, task-02]
blocks: [task-06, task-08, task-09]
allowed_paths:
  - src/worktree-apply.js (新增)
---

# task-03: apply 校验逻辑

## 修改文件（必填）
- 新增 `src/worktree-apply.js`

## 实现要求
1. 创建 `src/worktree-apply.js`，导出 `applyWorktree` 函数
2. 实现两阶段流程：check（校验）→ apply（回写）
3. 校验内容：变更文件 ⊆ design.md 文件变更清单 + 主工作区 base hash 一致
4. apply 使用 `git diff` + `git apply` 方式（非 merge），保证主工作区干净

## 接口定义（代码类任务必填）

```javascript
import { execSync } from 'child_process'
import { WorktreeManager } from './worktree.js'
import { parseFileChangeList } from './change-list.js'

/**
 * apply worktree 的校验和回写
 * @param {string} changeName - 变更名
 * @param {{ checkOnly?: boolean, cwd?: string }} opts
 * @returns {{
 *   ok: boolean,
 *   checkResult?: { changedFiles: string[], allowedFiles: Set, extraFiles: string[], baseHashOk: boolean },
 *   applyResult?: { patchApplied: boolean, cleanupDone: boolean },
 *   error?: string
 * }}
 */
export function applyWorktree(changeName, { checkOnly = false, cwd = process.cwd() } = {}) {}
```

### 控制流伪代码
```
applyWorktree(changeName, { checkOnly, cwd }):
  1. wm = new WorktreeManager({ cwd })
  2. meta = wm.getMeta(changeName)
     → null → return { ok: false, error: 'worktree not found' }
  3. 获取 worktree 中相对于 baseHash 的变更文件：
     execSync `git -C <worktreePath> diff --name-only <meta.baseHash>`
     → 这是关键：diff 比较的是 baseHash 到工作区内容（staged + unstaged），不是 baseHash..HEAD
  4. 获取允许的文件清单：
     designMdPath = path.join(cwd, '.sillyspec', 'changes', changeName, 'design.md')
     allowedFiles = parseFileChangeList(designMdPath)
  5. 校验文件清单：
     extraFiles = changedFiles.filter(f => !allowedFiles.has(f))
     → 允许清单中标记为"新增"的文件，即使不在允许集合中也放行
     → 不存在 design.md 时（如 quick 阶段），跳过文件清单校验
  6. 校验 base hash：
     currentBaseHash = execSync `git -C <cwd> rev-parse HEAD`
     baseHashOk = (currentBaseHash.trim() === meta.baseHash)
  7. 构建 checkResult:
     { changedFiles, allowedFiles, extraFiles, baseHashOk }
  8. if checkOnly:
     return { ok: extraFiles.length === 0 && baseHashOk, checkResult }
  9. if !checkOnly && (extraFiles.length > 0 || !baseHashOk):
     return { ok: false, checkResult, error: 'validation failed' }
  10. 生成 patch 并 apply:
      execSync `git -C <worktreePath> diff --binary <meta.baseHash> -- <changedFiles.join(' ')>` > tmpPatch
      execSync `git -C <cwd> apply --check <tmpPatch>`
      execSync `git -C <cwd> apply --3way <tmpPatch>`
      rmSync(tmpPatch)
  11. apply 成功后 cleanup:
      wm.cleanup(changeName)
  12. return { ok: true, checkResult, applyResult: { patchApplied: true, cleanupDone: true } }
```

### 错误处理流程
```
如果 git apply --check 失败:
  return { ok: false, checkResult, error: `patch conflict: ${stderr}` }
  不自动 cleanup，保留 worktree 供手动处理

如果 git apply --3way 失败:
  return { ok: false, checkResult, error: `apply failed: ${stderr}` }
  不自动 cleanup
```

## 边界处理（必填）
- worktree 不存在 → 返回 `{ ok: false, error: 'worktree not found' }`，不抛错
- worktree 中无任何修改（空 diff）→ checkResult.changedFiles 为空数组，ok: true（无操作）
- design.md 不存在（quick 阶段）→ 跳过文件清单校验，只校验 base hash
- 主工作区 HEAD 与 meta.baseHash 不一致 → ok: false，error 提示"主工作区已被修改"
- git apply 冲突 → 返回错误详情，不自动 cleanup
- apply 过程中进程中断 → worktree 保留，可通过 list + cleanup 手动恢复
- changedFiles 包含被删除的文件 → 正常处理（git diff 会显示删除），git apply --3way 处理删除
- 不修改传入参数 changeName、opts

## 非目标（本任务不做的事）
- 不做 CLI 子命令（task-04 负责）
- 不做 execute 阶段集成（task-06/08 负责）
- 不做 hook 逻辑（task-05 负责）

## 参考
- `src/worktree.js` — WorktreeManager（task-01）
- `src/change-list.js` — parseFileChangeList（task-02）
- design.md §2.2 — apply 流程详细设计

## TDD 步骤
1. 在 sillyspec 项目自身创建 test worktree
2. 在 worktree 中修改一个文件
3. 运行 checkOnly 模式验证校验逻辑
4. 运行 apply 模式验证回写
5. 验证 base hash 不一致时拒绝 apply

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | checkOnly 模式：worktree 有修改、清单校验通过、base hash 一致 | ok: true，checkResult 包含 changedFiles 和 allowedFiles |
| AC-02 | checkOnly 模式：有清单外文件 | ok: false，extraFiles 非空 |
| AC-03 | checkOnly 模式：base hash 不一致 | ok: false，baseHashOk: false |
| AC-04 | apply 模式：校验通过 | 主工作区文件被修改，worktree 被自动 cleanup |
| AC-05 | apply 模式：校验失败 | 主工作区不受影响，worktree 保留 |
| AC-06 | apply 模式：git apply 冲突 | 返回 error，主工作区不受影响 |
| AC-07 | worktree 不存在 | ok: false，error 包含 'not found' |
| AC-08 | design.md 不存在 | 跳过文件清单校验，只校验 base hash |
