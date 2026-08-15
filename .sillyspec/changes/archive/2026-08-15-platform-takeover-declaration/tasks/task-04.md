---
id: task-04
title: sync.js/index.js — disconnect 三清 + cleanup 提示
title_zh: sync/index — disconnect 三清 + cleanup 提示
author: qinyi
created_at: 2026-08-15T15:50:00+08:00
priority: P0
depends_on: [task-01]
blocks: []
allowed_paths:
  - src/sync.js
  - src/index.js
expects_from:
  task-01:
    - contract: platform-managed-declaration
      needs: [managed]
goal: |
  声明唯一退出路径：platform disconnect 三清（local.yaml platform 段 + 指针 + 声明）；
  pointer --cleanup 输出提示 disconnect 才是彻底脱离。
implementation: |
  1. src/sync.js disconnect 命令（cmdDisconnect，约 L333-353）：现只 replaceTopLevelSection(local.yaml)
     → 追加 unlink join(cwd,'.sillyspec-platform.json') 与 join(cwd,PLATFORM_MANAGED_FILENAME)
     （existsSync 后 try unlink，静默容错），输出"已清理平台指针与接管声明"。
  2. src/index.js platform pointer --cleanup 分支（CORRUPTED 与 STALE 两处 unlink 后）：
     各补一行 console.log 提示"如需彻底脱离平台（含接管声明），请使用 sillyspec platform disconnect"。
acceptance: |
  - disconnect 后：local.yaml platform 段删 + 指针文件删 + 声明文件删 → 裸调恢复本地模式
  - pointer --cleanup 只删指针不删声明，输出含 disconnect 提示
verify: |
  场景⑤（task-06）：平台项目 disconnect → 三文件断言（local.yaml 段/指针/声明）→ 裸调 run 不再 fail-closed。
constraints: |
  - 只改 src/sync.js + src/index.js 两文件；unlink 全部 try/catch 容错（文件本就不在不算错）
---
# task-04: disconnect 三清
## 目标
见 frontmatter goal（D-C@v2 三清语义——Grill P1 修复点）。
## 验收
见 frontmatter acceptance。
