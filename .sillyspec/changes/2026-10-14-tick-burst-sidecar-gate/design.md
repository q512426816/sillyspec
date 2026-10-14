---
author: flow-machine-draft
created_at: 2026-10-14T13:26:29.480Z
---
# 设计记录（Design Record）— 2026-10-14-tick-burst-sidecar-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两级检测补盲：新增纯函数 detectTickBurst（src/sentinel-assertions.js）+ flow done 节奏门回退接线（src/flow.js）。为什么用侧车：事件流侧有两级盲区——①CLI 逐格快连点是单格精确事件，2026-10-07 thin-tasks-v3 的采样去重按设计豁免它（防误伤的代价：收口端快连点——正是要抓的形态——对 detectBatchCheckCadence 不可见，近期实证 scale-large-evidence 6 格 2 秒内/turbo-guide-tier-copy 4 格 1 秒内零检出）；②直接 Edit 翻格在观测盲窗丢事件（deploy-release-notes 实证事件流 0 条）。task-ticks.jsonl 侧车（2026-10-14-timeline-ticktime-anchor-scope 落地）是 CLI tick 的毫秒级事实源、随归档进 git、不受盲窗影响——把 tickLog 时戳按相邻间隔窗口（缺省 60s）分簇，最大簇 ≥2 即一把连点。档位：检出走既有 resolveBatchTickAction（证据完备=advisory+batch_ticked 留痕；零证据=硬拒）——用户确认维持 10-13 语义，先可见攒数据再议升齿。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/sentinel-assertions.js：新增命名导出 `detectTickBurst(tickLog, opts = { windowMs })` → batchTick 同形记录 `{from,to,size,spanMs,ts,source:'tick-burst',detail:'checked F→T（task tick 侧车突发 N 格）'}` | null。from/to 是 CLI 勾序计数（Edit 翻格不记侧车，与事件流 checked N→M 计数空间不同源）——resolveBatchTickAction 只消费跳幅（to-from）与 ts，语义等价；detail 标注防口径混淆。
- src/flow.js 节奏门：事件流检测为空时回退 `detectTickBurst(parseTickLog(changeDir/task-ticks.jsonl))`；事件流结果优先不双重报告；拒收文案来源感知（`batch.source==='tick-burst'` →「侧车时戳观测到」）。
- CLI/命令/文件格式：无变化（侧车文件与 parseTickLog 均为既有产物，只新增消费方）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 答：侧车行序不定——函数内按 ts 排序；同任务多行取最早（runTaskTick 幂等 already 零追加，此处防御性双保险）；迟到补写行下次收口重算（构建期现读现判，无缓存）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 答：收口单线程读侧车（只读）；侧车追加是既有 appendFileSync 单行原子；detectTickBurst 纯函数无共享态。并发安全。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 答：侧车缺失/坏行由 parseTickLog 既有容错（跳过/空数组）→ fail-open 无证据静默，行为与改动前一致；flow done 重入幂等重判（batch_ticked 留痕写幂等）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 答：侧车按 change 目录物理隔离（与 tasks.md 同粒度）；收口在仓内读本变更侧车，无跨仓/多实例串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：误报合法近距勾选（两个真实完成相隔 <60s 的任务单元连点）——后果止于 advisory 提示 + flow-state 留痕（用户确认档位，不阻断）；窗口取 60s 保守值：实测快连点形态 span 279ms–29s，渐进勾选间隔通常分钟级，两侧留有余量。
- 死路（放弃）：在事件流侧修判据（对 CLI 精确事件也做时距分析）——事件流是 .runtime 机本位 + 观测盲窗（deploy-release-notes 实证 0 条 task-done），检测面先天缺失；侧车才是跨机事实源。
- 死路（放弃）：检出即恢复证据完备硬拒——重演 2026-10-13 之前的误伤/摩擦循环（用户未选该档，先留痕攒数据）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/sentinel-assertions.js | 新增导出 detectTickBurst（侧车突发检测纯函数） |
| 修改 | src/flow.js | 节奏门回退侧车接线 + 拒收文案来源感知 |
| 修改 | test/batch-tick-gate.test.mjs | ②f 纯函数族 + ②g e2e（突发/渐进两态）+ ②h 接线钉 |
| 修改 | .sillyspec/docs/sillyspec/modules/{core-engine,cli-entry}.changelog.md | 模块卡变更索引增量（按模块归属实配） |
