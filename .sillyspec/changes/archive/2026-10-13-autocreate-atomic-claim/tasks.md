---
author: flow-machine-draft
created_at: 2026-10-13T16:01:02.371Z
---
# 任务注册表（Tasks）— 2026-10-13-autocreate-atomic-claim

- [x] task-01: progress.js 新增 initChangeIfNoActive——INSERT..SELECT 双守卫（NOT EXISTS active / NOT EXISTS 同名）单语句原子抢占，成功同事务种 stages+脏度戳、事后建目录返 {created:true, progress}，失败返 {created:false, reason, activeChanges}——验证：单测三场景（零活跃/已有活跃/同名）断言行、目录、返回形态
- [x] task-02: run/command.js 两处自动建名调用点换 initChangeIfNoActive——brainstorm 无 --change 与 run auto 分支移除两步形态，created:false 复用既有 exit 2 引导（含清单）——验证：CLI spawn 裸 run brainstorm 于有活跃项目 exit 2 且列名
- [x] task-03: 败者零残留——目录创建移到抢占成功后；单测断言失败调用后无同名目录无同名行——验证：单测直接断言（task-01 用例内含，独立用例钉死）
- [x] task-04: 显式路径回归——initChange 本体不动，单测断言重名跳过/目录先建语义保持；全量测试交 flow done 实测门——验证：单测 + flow done 亲测 npm test 零失败
