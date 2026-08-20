---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-01
title: worktree 管理核心模块
priority: P0
estimated_hours: 4h
depends_on: []
blocks: [task-03, task-04]
allowed_paths:
  - src/worktree.js (新增)
---

# task-01: worktree 管理核心模块

## 修改文件（必填）
- 新增 `src/worktree.js`

## 实现要求
1. 创建 `src/worktree.js`，导出 `WorktreeManager` 类
2. `WorktreeManager` 封装 git worktree 的生命周期管理：create、list、cleanup、getMeta
3. 所有方法通过 `execSync` 或 `execFile` 调用 git 命令（项目当前使用同步命令模式）
4. worktree 存储目录：`.sillyspec/.runtime/worktrees/<change-name>/`
5. 分支命名：`sillyspec/<change-name>`

## 接口定义（代码类任务必填）

```javascript
import { execSync, execFileSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class WorktreeManager {
  constructor({ cwd, worktreeDir }) {
    // cwd: 项目根目录（默认 process.cwd()）
    // worktreeDir: worktree 存储根目录（默认 .sillyspec/.runtime/worktrees）
  }

  /**
   * 创建 worktree
   * @param {string} changeName - 变更名
   * @param {{ base?: string }} opts - base: 基础分支，默认当前 HEAD
   * @returns {{ branch: string, worktreePath: string, baseHash: string }}
   * @throws {Error} worktree 已存在、git 不可用
   */
  create(changeName, { base } = {}) {}

  /**
   * 列出所有活跃 worktree
   * @returns {Array<{ changeName: string, branch: string, baseHash: string, createdAt: string, worktreePath: string }>}
   */
  list() {}

  /**
   * 清理 worktree（强制删除，不 apply）
   * @param {string} changeName
   * @throws {Error} worktree 不存在
   */
  cleanup(changeName) {}

  /**
   * 读取 worktree 元数据
   * @param {string} changeName
   * @returns {object|null} meta.json 内容，不存在返回 null
   */
  getMeta(changeName) {}

  /**
   * 获取 worktree 目录绝对路径
   * @param {string} changeName
   * @returns {string}
   */
  getWorktreePath(changeName) {}
}
```

### meta.json 结构
```json
{
  "changeName": "2026-05-29-worktree-isolation",
  "branch": "sillyspec/2026-05-29-worktree-isolation",
  "baseBranch": "main",
  "baseHash": "abc1234...",
  "createdAt": "2026-05-29T22:00:00Z",
  "worktreePath": "/abs/path/to/.sillyspec/.runtime/worktrees/2026-05-29-worktree-isolation"
}
```

### 控制流伪代码
```
create(changeName, { base }):
  1. 检查 getWorktreePath(changeName) 对应目录是否存在
     → 存在则 throw new Error(`worktree already exists: ${changeName}. Run cleanup first.`)
  2. 解析 base 分支（默认：取当前 HEAD 对应的分支名）
  3. 获取 base 分支的最新 commit hash（baseHash）
  4. mkdirSync 递归创建 worktrees 根目录
  5. execSync `git worktree add <worktreePath> -b sillyspec/<changeName> <baseHash>`
     → 失败则 throw，携带 git stderr
  6. 写入 meta.json 到 worktreePath
  7. return { branch, worktreePath, baseHash }

cleanup(changeName):
  1. meta = getMeta(changeName)
     → null 则 throw
  2. execSync `git worktree remove <worktreePath> --force`
     → 失败则先尝试 rmSync 强制删除目录
  3. execSync `git branch -D sillyspec/<changeName>`（忽略分支不存在错误）
  4. rmSync 删除 worktreePath 目录（如果 git worktree remove 没清干净）
```

## 边界处理（必填）
- changeName 为 null/undefined/空字符串 → 抛出 Error，不静默忽略
- worktree 目录已存在 → 抛出 Error 明确提示"先 cleanup"，不覆盖
- git worktree 命令不存在（git < 2.15）→ 抛出 Error 携带版本检查信息
- meta.json 损坏（非 JSON）→ getMeta 返回 null，cleanup 时提示手动清理
- cleanup 时 worktree 对应的 git 分支已被删除 → 忽略 branch -D 错误，继续清理目录
- 项目根目录不是 git repo → create 时 git 命令失败，Error 传播
- worktreeDir 配置不存在 → create 时自动 mkdirSync 递归创建

## 非目标（本任务不做的事）
- 不做 apply 逻辑（task-03 负责）
- 不做 hook 拦截（task-05 负责）
- 不做 CLI 子命令注册（task-04 负责）
- 不做 npm install 或依赖安装

## 参考
- 项目使用 `execSync` 模式（见 `src/progress.js` 中的 exec 用法）
- 文件操作使用 `fs` 原生 API（见 `src/index.js`、`src/run.js`）
- ES Module 风格（import/export）

## TDD 步骤
1. 手动验证（无单元测试框架，项目当前无测试基础设施）：
   - 在 sillyspec 项目自身创建 worktree → 验证目录和分支创建
   - `sillyspec worktree list`（task-04 实现后验证）
   - cleanup 后确认目录和分支已删除
2. 边界用例手动验证：
   - 重复创建 → 报错
   - cleanup 不存在的 worktree → 报错

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | 创建 worktree：`node -e "import('./src/worktree.js').then(m => { const w = new m.WorktreeManager({cwd: process.cwd()}); console.log(w.create('test-wt')) })"` | 目录存在、分支 sillyspec/test-wt 存在、meta.json 正确 |
| AC-02 | 重复创建同 changeName | 抛出 Error，提示"already exists" |
| AC-03 | getMeta 读取已创建的 worktree | 返回正确的 meta.json 对象 |
| AC-04 | getMeta 读取不存在的 worktree | 返回 null |
| AC-05 | list 列出所有活跃 worktree | 返回数组包含已创建的 worktree |
| AC-06 | cleanup 删除 worktree | 目录、分支、meta.json 全部清理 |
| AC-07 | cleanup 不存在的 worktree | 抛出 Error |
