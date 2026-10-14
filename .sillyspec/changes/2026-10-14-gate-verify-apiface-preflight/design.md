---
author: flow-machine-draft
created_at: 2026-10-14T05:35:20.439Z
---
# 设计记录（Design Record）— 2026-10-14-gate-verify-apiface-preflight

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

gate verify 预检的锚点解析级核对消费 `facts.apiFace`（stage-contract judgeApiCoverageMatrix 的 parseSet），但其唯一生产者是 `run verify --done` 收尾前置的 backfillFactsFromMdAndTests（src/run/gates.js），gate 路径（machine-interface runGate）不回填、`verify-probes --init` 又刻意不落键（writeVerifyFacts「不落键」注记）——facts.apiFace 缺席/过期时 parseSet 为空/旧，任何 `design接口表#` 锚点恒报空指，预检必败而同状态的 verify --done 实际可通过（backfill 先行）。本变更以「同因注入」修复：gate/derive 的 verify 产物校验前，用同一解析器 parseDesignApiTable 实况解析 design.md，经 runValidators 已有的 context 透传通道（sharedEvidence 先例）把实况面传给 validateApiCoverageMatrix，覆写 facts.apiFace 作 parseSet——与 --done backfill 产物同形同源，预检过=必过；全程零落盘，D-002 只读契约不破；解析异常 fail-soft 不注入退回现状口径。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/verify-probes.js 新增导出 `computeApiFaceFromDesign(designPath)` → `{ endpoints, declared, writeEndpoints } | null`：与 backfillFactsFromMdAndTests 落盘的 facts.apiFace 同形同源（同一 parseDesignApiTable、同一 writeEndpoints 过滤）；design.md 缺失/不可读返 null（不注入信号）；backfill 内 apiFace 段重构为复用该 helper（单一产物源不各写各的）。
- src/stage-contract.js `validateApiCoverageMatrix` 新增可选 `context.apiFaceLive`：在场时覆写 facts.apiFace 作为解析产出集；纯函数 judgeApiCoverageMatrix 签名不变、其余取数（consumerHints/handover/riskLevel）仍走 facts/design.md。
- src/machine-interface.js runGate（verify 阶段 artifacts check）与 derive（artifacts facet，currentStage=verify 时）内部行为变化：校验前实况解析注入（fail-soft try/catch）；CLI 门面（gate/derive 参数、envelope schema、输出字段）不变。
- 跨仓交付：无（本仓单仓改动）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：gate 与 --done 并发交错（另一会话正在 backfill 写 facts）时——注入只影响本次 gate 进程内存判定、不写盘，--done 的 backfill 次序不受影响；预检判定以调用时点 design.md 实况为准，迟到的设计改动下一轮预检自然生效，无半态。
2. 并发写：gate 零写盘，不产生 facts.json 并发写竞争面；与 --done 并发时各读各的（--done 写 facts，gate 读自己的实况解析），互不阻塞互不污染。
3. 切换/生命周期：变更中途 design.md 被改——预检按当下实况判，--done 收口时 backfill 同样按当下实况落盘；两时点不同最多导致预检过期一轮（多跑一次 --done 或预检），不产生持久化半态，重跑即自愈。
4. 作用域：specRoot 由 runGate 调用方解析（平台指针/--spec-dir/drift 锚三合一，既有逻辑），design.md 路径自 specRoot 拼接；validateApiCoverageMatrix 侧 changeDir 仍走既有 resolveChangeDir——注入面只覆写 apiFace 单字段，不触碰 changeDir/riskLevel 等其他取数，无跨工作区串台新面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：注入后 `newPipeline`（apiFace != null）判定从 false 翻 true——对「factsExpected=true 但 facts.apiFace 缺席」的变更，矩阵段缺失从 warning 升 error（仅严格档/critical）；这与 --done backfill 后的判定完全一致（backfill 无条件落 apiFace），属预检对齐而非回归；非严格非 critical 仍 warning，存量兼容口径不变。

试过但放弃的方案：
- gate 路径直接做 backfill 落盘（与 gates.js 同款调用）——违反 gate 只读契约（D-002@v1），且引入多 agent 并发 gate 时 facts.json 读改写竞争面，放弃。
- verify-probes --init 侧落 apiFace——制造双生产者且改 writeVerifyFacts 分段合并语义；且救不了存量 facts（本次平台变更正卡在 --init 后形态），把修复责任推给使用方逐变更重跑 --init，放弃。
- stage-contract 内直接 live 解析——违反消费路径铁律（本模块零 import verify-probes，verify-probes TLA 动态 import 回指 stage-contract，静态依赖成环死锁），放弃；改由壳层调用方（machine-interface，与 gates.js 同款动态 import 时点）注入。

独立评审修正（2026-10-14 review P1 清偿）：design.md 缺失/不可读态 helper 返 null（不注入、facts 口径继续），不返空面——初版空面注入会覆写有效 facts.apiFace 反致误阻断，违 FR-03。披露边界并裁决：该态下 gate（facts 口径）与 --done（backfill 会把空面落盘）判定可能分叉——可接受：design.md 在 verify 中途消失属病态（design 不应蒸发），gate 预检按最后已知解析面放行不误导，--done 侧该态本就该拦（design 缺失是更大口径的问题），分叉方向安全（预检宽、收口严，不产生假绿）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| UPDATE | src/verify-probes.js | 新增导出 computeApiFaceFromDesign；backfill apiFace 段重构复用（同形同源单一产物源） |
| UPDATE | src/stage-contract.js | validateApiCoverageMatrix 支持 context.apiFaceLive 覆写 parseSet |
| UPDATE | src/machine-interface.js | runGate verify 段与 derive artifacts 段 fail-soft 实况解析注入 |
| UPDATE | test/api-coverage-matrix.test.mjs | 新增第 9 组：空指复现→注入命中→注入优先→helper 同形/缺文件 fail-soft |
