---
id: task-02
title: src/worktree.js 删本地 git/gitQuiet 改 import 公共入口，51 处 helper 调用点 + :63/:775/:1346 等含变量注入点改传数组（覆盖：FR-03, FR-06）
title_zh: worktree.js 收口公共 git 入口并数组化调用点
author: qinyi
created_at: 2026-08-09 11:19:03
priority: P0
depends_on: [task-01]
blocks: [task-05]
requirement_ids: [FR-03, FR-06]
allowed_paths:
  - src/worktree.js
goal: >
  一句话：把 worktree.js 本地 git 字符串拼接 helper 删除、收口到公共入口 git-helper.js，全部调用点（含第 63 行、第 775 行、第 1346 行含变量注入点）改为数组传参，消除命令注入与空格拆词，行为语义不变。
implementation:
  - 删除 worktree.js 顶部第 70 到 80 行的本地 git 与 gitQuiet 两个 helper 函数，改为从 git-helper.js import git 与 gitQuiet
  - 把全部 51 处 helper 调用点由字符串改传数组：字符串字面量按空格拆为数组元素，拼接形式把变量作为独立数组元素，文件列表改为展开符展开为独立 argv 元素
  - 含变量注入点逐个改数组：第 63 行 check-ignore 的 relPath 插值、第 775 行 worktree remove 的 worktreePath 插值、第 1346 行 commit 的 changeName 插值，变量都作独立数组元素不再插值进字符串
  - 健壮面无变量调用点（第 42、43、211、932、1236、1259、1335、1345 行）一并改数组形式保持口径统一
  - 对长 git 操作（worktree list、大 diff、commit）按需给调用点传更大 timeout（如 30 秒），规避新入口默认 5 秒超时
  - 保留原 helper 语义：git 失败抛异常、gitQuiet 失败返回 null，调用方逻辑不变
acceptance:
  - worktree.js 不再有本地 git 与 gitQuiet 函数定义，统一从 git-helper.js import
  - worktree.js 内不再存在反引号模板串拼接的 execSync git 调用，全部调用点为数组传参
  - 第 63、775、1346 行的 relPath、worktreePath、changeName 变量均作独立 argv 元素，无字符串插值
  - worktree 相关测试回归全绿，无新增失败
verify:
  - node test/worktree-native-overlay.test.mjs
  - node test/worktree-apply-incidental.test.mjs
  - npm test
  - npm run lint
constraints:
  - 行为不变：git 命令语义与返回 trim、抛错、静默口径不变，仅不经 shell
  - 每个文件名作为独立 argv 元素，空格与元字符天然安全，禁止再 join 拼接
  - 兼容 Windows、Linux、macOS，路径分隔与换行不引入新问题
  - 本任务只改 src/worktree.js，不碰 git-helper.js（task-01）与 worktree-apply.js、index.js（其他 task）
---
