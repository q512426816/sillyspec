---
author: qinyi
created_at: 2026-09-22 15:56:14
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
R5-L 法证账（round5/r5l-forensic-verdict.md）：旧流程（run 族）每变更 42-106 次 CLI 调用，步进往返是大头（CLI 状态机往返 +29.1M token，106 vs 18 次请求对比 OpenSpec）；37 步状态机每步 ≥2 请求（渲染+完成）。产品裁定：保留五阶段形状与全部门禁语义，只折叠交互形状——每阶段 2 次调用（渲染 1 + done 1）。

## 关键问题
1. 步进往返的成本结构：每次 CLI 调用按当时全量上下文计费，37 步 ×2 请求的往返在低决策密度任务上是纯流程税（round5/r5l-forensic-verdict.md §二①）。
2. 薄流程（flow 族）不是答案：用户明确不用（flow 保留为实验通道、缺省翻回 legacy）；形态不是问题，贵在往返——所以折叠 run 族自身的交互形状。
3. 折叠不能碰门禁语义：守卫链（WAIT 硬校验/waiting 前置/requiresWait 门控/意图断言/门禁/并发防护）是承重墙，改本体=等价性论证失效。

## 变更范围
1. **burst 渲染**（src/run/stage.js）：白名单阶段（brainstorm/plan/execute）+ readStageBurst 开启时，单趟遍历剩余步——noAI 步就地 CLI 执行+标完成，AI 步逐个调既有 outputStep 一次下发全部说明书；抽取 _cliAction 分发与阶段收尾两助手防副本。
2. **burst done**（src/run/complete.js + src/run/command.js 两处分发）：completeStepBurst 循环调 completeStep(printNext:false, outputText=null 走 P0-2 合成)；--answer 单次消费、--step 断言仅首轮、50 轮上限；completeStep 本体零 diff。
3. **配置面**（src/run/shared.js）：readStageBurst（local.yaml stage.burst + env SILLYSPEC_STAGE_BURST=0/1 覆写，缺省 OFF）。
4. **flow 翻转**（src/flow.js）：readFlowConfig 缺省 thin→legacy + flow-protocol fixtures 补 mode: thin 配置行。
5. **测试**（NEW:test/stage-burst.test.mjs）：配置三态/渲染折叠/等价性双跑/断点/answer 消费/逃生阀。

## 不在范围内（显式清单）
- verify/archive 阶段机制不动（已压到 1-2 次调用）
- 薄流程（flow 族）除缺省翻转外零改动
- watcher 接 run 族 + 哨兵规则引擎（下一批独立变更）
- burst 全量默认翻转/全量测试面迁移（验收后另立）
- completeStep 函数本体改动（D-003 铁律）

## 成功标准（可验证）
1. burst 开启：brainstorm/plan/execute 各恰好 2 次 CLI 调用走通（done 内部逐步推进打印每步完成行）
2. 等价性：同 fixture 双跑（burst on/off）各步 postcheck 与 completeStageGates 判定一致；burst 中途门禁失败停在失败步、progress 状态与逐步模式失败态一致
3. burst 缺省 OFF：既有全部测试零回归
4. env 逃生阀 SILLYSPEC_STAGE_BURST=0 生效
5. flow 族测试修后全绿；全量 npm test + lint 过（无新 src 文件，module-map 零改动——lint 覆盖面仅 src/）
