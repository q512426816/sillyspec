---
id: task-03
title: src/worktree-apply.js 删本地 git/gitQuiet 改 import 公共入口，26 处 helper 调用点 + :357/:369-372 裸 execSync 注入核心改传数组（覆盖：FR-04, FR-06）
title_zh: worktree-apply.js 收口公共 git 入口并数组化注入核心
author: qinyi
created_at: 2026-08-09 11:19:03
priority: P0
depends_on: [task-01]
blocks: [task-05]
requirement_ids: [FR-04, FR-06]
allowed_paths:
  - src/worktree-apply.js
goal: >
  一句话：把 worktree-apply.js 本地 git 字符串拼接 helper 与绕开 helper 的裸 execSync 注入核心（git diff --binary 拼文件列表产物）全部改为公共入口数组形式，消除注入与空格拆词。
implementation:
  - 删除文件顶部约 25-35 行的本地 git 与 gitQuiet helper，改为从 git-helper.js 导入公共的 git 与 gitQuiet（依赖 task-01 产物），并删掉不再需要的 execSync 顶部导入
  - 全文 26 处 helper 调用点由字符串参数改为传数组：固定子命令按空格拆成多个元素，含变量的拼接把变量作为独立数组元素，文件列表不再 join 而是逐个展开为独立 argv 元素
  - 注入核心一：约 357 行 tracked 变更的 git diff --binary 裸 execSync，把 diffBase 与 trackedFiles 改为数组元素传入（文件列表逐个展开），不再把文件列表 join 拼进命令字符串
  - 注入核心二：约 369-372 行 untracked 新文件的 git diff --binary --cached 裸 execSync，把 untrackedPatchFiles 逐个展开为数组元素，配套约 366 行 add 与约 375 行 reset 同步数组化
  - apply 链路的文件参数全部数组化：约 108 行 ls-tree、约 347 行 ls-files、约 402 行 apply --3way、约 459 行 checkout HEAD、约 396 行 cat-file -e、约 453 行 diff --name-only 等，含变量处一律改为数组元素
acceptance:
  - worktree-apply.js 不再存在本地 git 与 gitQuiet 定义，改为从 git-helper.js 导入
  - 该文件内不再存在以反引号模板拼 git 命令的 execSync 调用，diff --binary 两处注入核心均改数组形式且文件列表逐个展开
  - grep 该文件无残留字符串拼接 git 命令，git diff --binary 与 git diff --binary --cached 均不经 shell
  - 26 处 helper 调用点全部改传数组，行为与原字符串语义一致（参数个数与顺序不变）
  - worktree-apply-incidental 等相关测试回归通过，含空格文件路径不漏文件
verify:
  - node test/worktree-apply-incidental.test.mjs
  - npm test
  - npm run lint
constraints:
  - 只改 src/worktree-apply.js，不动 git-helper.js（task-01）与其他文件
  - 行为不变：git 命令语义、参数顺序、trim 与静默语义与原字符串版本一致，仅不经 shell
  - 兼容 Windows / Linux / macOS，文件路径含空格与特殊字符须安全
  - 长操作调用点（如大 diff）必要时按 design R3 传更大 timeout，逐处评估不盲目统一
---
