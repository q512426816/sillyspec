---
author: flow-machine-draft
created_at: 2026-09-26T07:53:32.795Z
---
# 任务注册表（Tasks）— 2026-09-26-binding-anchor-fidelity

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: extractRequirementBindings 提取保真——路径邻接用例锚四形态（「…」组 / #… / ::… / > …）进 tests 行，「：」后描述不误捕；裸文件名/路径段解析为项目相对全路径（存在性优先＋仓内唯一命中，歧义原样保留）
- [x] task-02: test-bindings.js 新增 testAnchorFile 导出；文件面消费点适配——resolveTraceResidual / resolveTestFileOwners / covHit 与 rotSuspectFlow 覆盖集 / index.js --unbind 匹配
- [x] task-03: 绑定槽模板（flow-draft.js 两处）与 flow 收口指引文案收紧（项目相对全路径＋用例名）
- [x] task-04: test/flow-draft-binding-extract.test.mjs 新测试＋既有 flow-draft / test-bindings / verify-trace-residual / residual-runner-parity 套件全绿；npm run test:core 与 lint 全绿
