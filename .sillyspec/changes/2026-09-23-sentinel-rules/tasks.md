---
author: qinyi
created_at: 2026-09-23 10:30:00
---
# 任务注册表（Tasks）— 2026-09-23-sentinel-rules

> Wave 与 plan.md 一致；切片边界：一=引擎+快照扩展（task-01/02），二=L0 纯函数
> （task-03），三=回补+挂点（task-04/05），四=登记与门（task-06）。测试与实现同卡。

## Wave 1（并行基础面，无依赖）
- [x] task-01: 快照四源扩展——src/watcher.js buildSnapshot 增 commits（git log -20
  --format=%h|%s --name-only 单调用解析，含 files）/dirtyCode（porcelain 剔
  .sillyspec//docs//*.md 同 quality-scan 口径）/scanStatus（账本 testResult.status
  读取）/reviews（execute-runs review.json mtime 面）+ files 条目 checkedTasks 提取；
  全注入参数化（gitLogImpl/porcelainImpl/readdirSyncImpl）
- [x] task-02: applySentinelRules 四规则纯函数引擎——R1 假勾选（commit subject token
  边界 ∪ review mtime）、R2 改测试凑绿（FAIL 锚+testDirtyAtFail 快照状态机）、
  R3 范围漂移（声明面 fail-open+globMatch 复用）、R4 停滞（相位锁存+episode 去重+
  水位锚）；warning 事件 {kind:warning, rule, severity, provisional:true}；子进程
  循环接线（best-effort 包裹，warning 不计活动）

## Wave 2（依赖 Wave 1 的事件/快照口径）
- [x] task-03: NEW src/sentinel-assertions.js——detectFakeCheckCompletion
  {changeDir,tasksMd,commits} 三态（complete/fake/none+missing），id 行判集+token
  边界+review.json 在场证据（可注入）；本批不接线收口

## Wave 3（依赖引擎在位）
- [x] task-04: 水位回补——watcher-last-snapshot-<change>.json 每轮内容去重落盘，
  重启读取为 prev 补发 backfill:true 事件（幂等：同水位零事件；损坏缺失全新启动）
- [x] task-05: run 族最小挂点——src/run/command.js runAutoMode 头部 spawnWatcher
  best-effort（与 flow start 同款；避开 1727/2073 冲突带；冲突 rebase 以 A 为先）

## Wave 4（收尾登记）
- [x] task-06: NEW test/sentinel-rules.test.mjs——四规则各≥1正≥1负（fixture 快照
  序列）+三态+回补幂等+warning 事件形态+token 边界钉；module-map sync 模块 paths
  补录 sentinel-assertions.js；lint 过+全量 npm test 绿
