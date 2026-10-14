---
author: flow-machine-draft
created_at: 2026-10-14T13:26:29.480Z
---
# 任务注册表（Tasks）— 2026-10-14-tick-burst-sidecar-gate

- [x] task-01: detectTickBurst 纯函数 + ②f 测试族——src/sentinel-assertions.js 新增导出（同任务取最早/坏行跳过/排序分簇/最大簇>=2、windowMs 缺省 60s 可覆写、fail-open）；test/batch-tick-gate.test.mjs「②f」用例（快连点/渐进/混合/坏行/同任务最早/窗口覆写）跑绿
- [x] task-02: 节奏门回退接线 + ②g/②h——src/flow.js 事件流空结果回退 parseTickLog(侧车)+detectTickBurst、拒收文案来源感知；②h 接线钉 + ②g e2e（快连点证据完备→advisory+batch_ticked+归档；渐进超窗→零告警）跑绿
- [x] task-03: 回测与门槛——归档 watcher 事件流 CLI task-done 时戳回测（近期快连点形态检出清单落证据）；全量 npm test 零失败 + npm run lint 零 hard fail；模块卡 changelog 增量
