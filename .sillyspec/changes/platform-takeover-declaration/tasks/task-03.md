---
id: task-03
title: command.js — runCommand 指针恢复链封堵
title_zh: command.js — 入口二恢复链封堵
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P0
depends_on: [task-01]
blocks: []
allowed_paths:
  - src/run/command.js
expects_from:
  task-01:
    - contract: check-platform-managed
      needs: [managed, specRoot]
goal: |
  入口二 fail-closed：runCommand 独立指针恢复链（不经 resolvePlatformSpecDir）
  在指针+platform-scan.json 皆缺失、specBase 兜底本地前查声明，命中 exit(1)+引导。
implementation: |
  改 src/run/command.js 恢复链（约 L283-327）：
  1. 在「命令行没传 spec-root/runtimeRoot 且 platformFileExists=false」的恢复尝试结束后、
     let specBase = platformOpts.specRoot || join(cwd, '.sillyspec') 兜底前插入：
     const decl = checkPlatformManaged(cwd)（import 已有 writePlatformPointer 自 './shared.js'，同处补 checkPlatformManaged/PLATFORM_MANAGED_FILENAME）；
     decl → console.error 引导文案（同 task-02 三选项，含 decl.specRoot）+ process.exit(1)。
  2. exit(1) 而非邻近环境错的 exit(2)：对齐 PointerUnreachableError 顶层 catch 的语义
     （这是"状态保护阻断"非"用法/环境错"）——代码注释写明此理由（v2 复审观察 a）。
  3. 显式 --spec-dir/--spec-root 传参时 platformOpts.specRoot 已赋值，不进此分支（逃生口自然成立）。
acceptance: |
  - 删指针保声明 → run/quick/scan 等 stage 命令裸调 exit 1，stderr 含"平台接管"+ 原 specRoot + 三选项
  - 无声明（纯本地项目）→ 恢复链行为逐字节不变
  - 显式 --spec-dir → 不触发（逃生口）
verify: |
  场景③（task-06）：CLI 子进程 node bin/sillyspec.js --dir <tmpdir> run quick --status，
  断言 exit code 1 + stderr 含"平台接管"；对照组无声明 exit 0。
constraints: |
  - 只改 src/run/command.js；不动指针存在分支与恢复成功路径；不动 resolvePlatformSpecDir（task-02 事）
---
# task-03: 入口二 fail-closed
## 目标
见 frontmatter goal（D-B@v2 双入口之二——Grill P0 修复点）。
## 验收
见 frontmatter acceptance。
