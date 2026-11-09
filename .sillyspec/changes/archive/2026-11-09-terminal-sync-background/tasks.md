---
author: flow-machine-draft
created_at: 2026-11-09T06:41:23.072Z
---
# 任务注册表（Tasks）— 2026-11-09-terminal-sync-background

- [x] task-01: 测试先行——terminal-sync-strict.test.mjs 既有内联用例钉到 SILLYSPEC_SYNC_BG=0 前提 + 新增后台化（bgImpl 注入 spawned→pending marker/delegated background/不置 exitCode、coalesced、spawn 异常降级内联）用例 + 新建 final-sync-marker.test.mjs（write/read/收敛 ok/failed/超时验证/consume 清理与横幅），跑红复现（验证：新用例红、既有套件除改造点外绿）
- [x] task-02: 实现——src/final-sync.js 新模块 + shared.js 终态分支后台化（逃生阀/降级保留内联旧路径）+ bg-sync.js 主轮后挂收敛扫描，跑绿（验证：task-01 全部用例转绿）
- [x] task-03: 全量回归绿 + 模块文档同步（docs/sillyspec 对应模块卡补终态语义变化），跑 node test/run-tests.mjs 全绿（验证：退出码 0，文档落盘）
