---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-04
title: worktree 子命令注册
priority: P0
estimated_hours: 3h
depends_on: [task-01]
blocks: [task-06, task-08, task-09]
allowed_paths:
  - src/index.js (修改)
---

# task-04: worktree 子命令注册

## 修改文件（必填）
- 修改 `src/index.js`

## 实现要求
1. 在 `src/index.js` 中注册 `worktree` 命令组及其子命令
2. 子命令：`create`、`apply`（支持 `--check-only`）、`list`、`cleanup`
3. 调用 `WorktreeManager` 和 `applyWorktree` 对应方法
4. 格式化输出（成功/失败信息，非 JSON 模式下用表格）

## 接口定义（代码类任务必填）

```javascript
// 在 src/index.js 的 CLI 解析逻辑中添加：
// sillyspec worktree create <change-name> [--base <branch>]
// sillyspec worktree apply <change-name> [--check-only]
// sillyspec worktree list
// sillyspec worktree cleanup <change-name>
```

### 控制流伪代码
```
在 index.js 的 parseArgs 或 switch 分支中：
case 'worktree':
  subcommand = args[0]  // create/apply/list/cleanup
  changeName = args[1]

  switch(subcommand):
    case 'create':
      opts = {}
      if --base in args: opts.base = <value>
      wm = new WorktreeManager({ cwd })
      result = wm.create(changeName, opts)
      console.log(`✅ worktree created: ${result.branch}`)
      console.log(`   path: ${result.worktreePath}`)
      console.log(`   base: ${result.baseHash.slice(0,7)}`)

    case 'apply':
      checkOnly = --check-only in args
      result = applyWorktree(changeName, { checkOnly, cwd })
      if !result.ok:
        if result.checkResult.extraFiles:
          console.log(`❌ extra files: ${result.checkResult.extraFiles.join(', ')}`)
        if !result.checkResult.baseHashOk:
          console.log(`❌ base hash mismatch`)
        process.exit(1)
      if checkOnly:
        console.log(`✅ check passed: ${result.checkResult.changedFiles.length} files`)
        result.checkResult.changedFiles.forEach(f => console.log(`   ${f}`))
      else:
        console.log(`✅ applied ${result.checkResult.changedFiles.length} files, cleaned up`)

    case 'list':
      wm = new WorktreeManager({ cwd })
      items = wm.list()
      if items.length === 0:
        console.log('No active worktrees')
      else:
        // 表格输出：Change | Branch | Created
        console.table(items.map(i => ({ Change: i.changeName, Branch: i.branch, Created: i.createdAt })))

    case 'cleanup':
      wm = new WorktreeManager({ cwd })
      wm.cleanup(changeName)
      console.log(`✅ cleaned up: ${changeName}`)
```

### 错误处理
```
所有命令的错误处理：
  - try/catch 包裹
  - Error 输出到 stderr
  - process.exit(1)
  - 不静默吞错
```

## 边界处理（必填）
- 缺少 changeName 参数 → 输出 usage 提示并 exit(1)
- 未知的 worktree 子命令 → 输出可用子命令列表
- `--base` 指定的分支不存在 → git 命令报错，传播到用户
- `--check-only` 与不带 `--check-only` 都走同一函数（applyWorktree），通过参数区分
- list 结果为空 → 显示"No active worktrees"而非空表格
- 不修改 WorktreeManager 和 applyWorktree 的行为（只做薄包装）

## 非目标（本任务不做的事）
- 不修改 WorktreeManager 内部逻辑（task-01 负责）
- 不修改 applyWorktree 内部逻辑（task-03 负责）
- 不添加 `--json` 输出模式（可后续扩展）

## 参考
- 现有 `src/index.js` 的命令解析模式（progress 子命令是参考）
- `src/init.js` 中的 exec 用法和错误处理模式
- `src/worktree.js` — WorktreeManager（task-01）
- `src/worktree-apply.js` — applyWorktree（task-03）

## TDD 步骤
1. 验证 `node bin/sillyspec.js worktree create test-cli-wt` 创建成功
2. 验证 `node bin/sillyspec.js worktree list` 显示创建的 worktree
3. 验证 `node bin/sillyspec.js worktree cleanup test-cli-wt` 清理成功
4. 验证缺少参数时输出 usage
5. 验证 `--check-only` 参数传递正确

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | `sillyspec worktree create test-abc` | 输出 branch、path、base hash，worktree 目录和分支存在 |
| AC-02 | `sillyspec worktree create test-abc`（重复） | 报错"already exists" |
| AC-03 | `sillyspec worktree list` | 显示已创建的 worktree 表格 |
| AC-04 | `sillyspec worktree cleanup test-abc` | 输出"cleaned up"，目录和分支不存在 |
| AC-05 | `sillyspec worktree` 不带子命令 | 显示可用子命令列表 |
| AC-06 | `sillyspec worktree apply test-abc --check-only` | 输出 check 结果，不实际 apply |
