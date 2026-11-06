---
author: flow-machine-draft
created_at: 2026-11-06T16:41:53.102Z
---
# 任务注册表（Tasks）— 2026-11-07-sync-proposed-no-revive

- [x] task-01: 新增 test/spec-sync-proposed-no-revive.test.mjs 四组用例（T1 exists=false 残留不生成 add/T2 清理段删除+提示+幂等/T3 新提议照常 add/T4 非 proposed exists=false 行为不变），先跑确认红
- [x] task-02: computeSpecOps 拦截（src/spec-sync.js add 生成处：knowledge/proposed/ 前缀 + manifest 行 exists===false 跳过）+ cleanupPlatformDisposedProposed 导出（只清本地在场残件）+ syncSpecTree 接线（fail-soft）；T1~T4 转绿（9/9）
- [x] task-03: 跑既有 spec-sync 测试面（9 个 spec-sync*.test.mjs）全绿（0 fail）
