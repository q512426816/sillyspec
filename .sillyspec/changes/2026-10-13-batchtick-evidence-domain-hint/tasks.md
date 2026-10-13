---
author: flow-machine-draft
created_at: 2026-10-13T03:33:36.784Z
---
# 任务注册表（Tasks）— 2026-10-13-batchtick-evidence-domain-hint

- [x] task-01: 测试先行——batch-tick-gate.test.mjs 扩 ②b（evidenceComplete 优先序断言）+新增 ②d（纯函数新态+源码接线钉）+ e2e 证据完备一把勾放行留痕；新增 ④ flow start 域预判 e2e（命中/未命中/绿地/零路径四态）；先跑确认新断言红
- [x] task-02: 实现 ①——sentinel-assertions.js resolveBatchTickAction 加 evidenceComplete 参数与降级态（优先序：flag>未知>evidence>代勾>reject）；flow.js 接线（哨兵 complete 信号传递 + batch_ticked 留痕 + advisory 文案）；跑单测绿
- [x] task-03: 实现 ②——fr-index.js 导出 pseudoDomainFromPaths（实现零改动）；flow.js start 侧复用 extractRoutingInputPaths+reconcileModuleDocs 出域预判段（绿地/零路径零输出）；跑新 e2e 绿
- [x] task-04: 全量回归 + lint 绿（batch-tick-gate/sentinel-wiring 既有断言零改动通过），边干边勾
