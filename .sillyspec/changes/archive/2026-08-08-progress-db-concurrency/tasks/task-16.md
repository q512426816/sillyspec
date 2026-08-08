---
id: task-16
title: execute 期 worktree-guard 守卫边界用例（hook 直读 DB，AC-02/G2）
title_zh: execute 期 worktree-guard 守卫边界用例（hook 子进程直读 DB）
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P0
depends_on: [task-10, task-11]
blocks: []
requirement_ids: [AC-02]
decision_ids: [D-02@v1]
allowed_paths:
  - test/worktree-guard-execute-guard.test.mjs
goal: >
  新增 execute 期 worktree-guard 守卫边界测试：验证废 gate-status 后 hook 经真实子进程直读 DB
  判定阶段与 worktree 登记，守卫不 fail-open（AC-02/G2）。
implementation:
  - 新建 test/worktree-guard-execute-guard.test.mjs，跟随现有 worktree-guard 测试风格（node 直跑脚本 + assert 计数 + process.exit(1)）
  - fixture 构造：mkdtemp 临时项目，经 src/db.js DB 类初始化 better-sqlite3 库，INSERT project 与 changes（current_stage=execute、status=active、no_worktree=0）行，登记 .runtime/worktrees/<change>/meta.json；刻意不写 gate-status.json，验证 DB 为单一权威源
  - hook 子进程实测：调用 _queryDbFirstCellForTest（内部 execFileSync 真实 node 子进程，require better-sqlite3 只读连接）断言直读 current_stage=execute 与 active changes 命中
  - shouldBlock 边界断言：registered worktree 内 Write 放行；unregistered worktree 源码写拦截；主工作区 execute 期源码写拦截；no_worktree=1 变更源码写拦截
  - fail-closed 断言：db 缺失或损坏时 queryDbFirstCell 返回 null、readCurrentStage 降级 null，源码写被拦截而非误放行（守卫不 fail-open）
  - 清理临时目录，输出通过/失败计数
acceptance:
  - 无 gate-status.json（无 stale 缓存）时 execute 期守卫行为正确：registered worktree 内写放行，unregistered/主工作区源码写拦截
  - hook 子进程（真实 execFileSync，非单元 mock）直读 DB 拿到 execute 期 current_stage 与 active changes
  - db 缺失或损坏场景守卫 fail-closed：源码写被拦截而非放行
  - 全量 npm test（test/run-tests.mjs 自动收集 *.test.mjs）通过
verify:
  - npm test
  - node test/worktree-guard-execute-guard.test.mjs（单文件直跑）
constraints:
  - 必须含 hook 子进程实测（execFileSync 起真实 node 子进程 require better-sqlite3），不只单元级同步调用
  - fixture 不写 gate-status.json，验证 DB 为唯一权威源（AC-02/G2）
  - 兼容 Windows/Linux/macOS（临时目录、子进程 spawn、db 读写）；不依赖外部 sqlite3 CLI（Windows 默认没有）
  - 本 task 只写测试文件，不触碰 src/hooks/worktree-guard.js 生产逻辑（生产改动归 task-10/11）
related_tests: []
---
