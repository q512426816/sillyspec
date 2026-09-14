---
author: qinyi
created_at: 2026-09-14 19:34:00
---
# 任务清单（Tasks）

<!-- plan 阶段展开细节并写回本文件；Wave 划分见 design.md 总体方案 -->

- [x] task-01: 数据层——schema v6 迁移（owner_session 列+四处版本 bump+幂等 ALTER）+config 键+example+owner 读写 API+同步投影扩列 (depends_on: —)
- [x] task-02: 所有权语义——三级会话标识+首建 owner+assertChangeOwnership 三分支+五接线点（apply/cleanup/assess/归档/quick 轻量链）+--takeover/--session flag (depends_on: task-01)
- [x] task-03: 收口与归因——归档 checkOnly 门+放行相交过滤（两路径）+归因模式分流（DB 判源+终态空源空集）+complete-handlers 所有权两接线 (depends_on: task-01, task-02)
- [x] task-04: 测试与模块卡——迁移/四态/旁路/过滤/分流/空源集成测试（真 git 临时仓）+六卡同步+AGENTS.md 铁律 (depends_on: task-01, task-02, task-03)
