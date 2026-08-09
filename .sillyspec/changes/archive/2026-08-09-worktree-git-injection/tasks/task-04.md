---
id: task-04
title: src/index.js:859 worktree diff --base 改数组调用（覆盖：FR-05, FR-06）
title_zh: index.js worktree diff 的 base 改数组调用消除注入
author: qinyi
created_at: 2026-08-09 11:19:03
priority: P0
depends_on: [task-01]
blocks: [task-05]
requirement_ids: [FR-05, FR-06]
allowed_paths:
  - src/index.js
goal: >
  一句话：把 index.js worktree diff 子命令的用户/agent 输入 base 值由 shell 字符串插值改为公共入口数组调用，消除 RCE 注入面，行为保持不变。
implementation:
  - 在 src/index.js 顶部 import 公共入口的 git 函数（依赖 task-01 的 src/git-helper.js）
  - 找到 worktree diff 分支（约 859 行）当前用 execSync 把 meta.worktreePath 和 base 插值进 shell 模板串的那一处
  - 改为调用公共入口 git 数组形式，cwd 传 meta.worktreePath，args 数组元素依次为 --no-pager diff --no-renames 与 base
  - base 作为数组最后一个独立元素传入，不再插值进字符串，meta.worktreePath 也经由 cwd 参数传入不经 shell
  - 保留原有 try 包裹与失败时打印 base 前 8 位并退出码 1 的错误处理语义
  - 保留 stdio 捕获 stdout 输出、空 diff 提示无变更、非空时写 stdout 的现有行为
acceptance:
  - worktree diff 分支不再出现 execSync 拼接 git 模板串，base 与 worktreePath 均不经 shell 插值
  - base 含空格或 shell 元字符时按独立 argv 元素传给 git，不触发拆词或注入
  - 显式 --base 与 meta.baseHash 与 HEAD 三级回退取值逻辑保持不变
  - node 对该文件做语法检查通过，全量 npm test 不引入回归
verify:
  - node --check src/index.js
  - npm test
constraints:
  - 仅改 src/index.js 单文件，不动 worktree.js 与 worktree-apply.js（属 task-02 与 task-03）
  - 行为不变：git 命令语义与输出格式不变，仅调用方式由 shell 字符串改为数组
  - 数组调用统一带超时与 safe.directory，与公共入口默认口径一致
  - 兼容 Windows 与 Linux 与 macOS，不引入新的 shell 依赖
---
