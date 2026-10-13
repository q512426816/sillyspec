---
author: flow-machine-draft
created_at: 2026-10-13T03:33:36.784Z
---
# 设计记录（Design Record）— 2026-10-13-batchtick-evidence-domain-hint

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处独立小修，同源一个 agent dogfood 反馈。①单拍勾选硬门降级（src/sentinel-assertions.js + src/flow.js）：resolveBatchTickAction 纯函数加 evidenceComplete 参数与降级态——哨兵证据完备（detectFakeCheckCompletion status='complete'：每格已勾任务均有 token 提交/review.json 证据）的单拍从 reject 降为 advisory，flow.js 接线处写 flow-state batch_ticked 留痕。为什么：同形态两层检查语义不一致（git 时点检查「一把勾模式」因 token 证据齐放行、事件流硬门证据盲硬拒），硬门自注释护的是 per-task 时间戳/进度信号面（信号面损害非数据正确性）；证据缺失形态（0/12 事故）另有勾选证据哨兵独立拦截在先，证据完备单拍的实际损害只剩平台时间线信号失真——advisory+留痕与损害对齐。②flow start 域预判（仅 src/flow.js——fr-index.js 零编辑）：对 --input 提及路径（extractRoutingInputPaths 已有，勿重算）用已导出的 matchedModuleIds+discoverModuleIndex（读 docs/<project>/modules/_module-map.yaml，与 distill 域路由同一匹配面）做逐文件命中判定；未命中文件集作 filesOverride 调已导出的 resolveTouchedDomains（内部即 pseudoDomainFromPaths+词典守卫，与 distill 同一伪域回退链）取预判伪域名。为什么：第一次知道路径未登记是在收口模块门（最贵时点），早期提示把登记成本挪到干活前；纯提示不设门（input 路径可能不全，路由真相以实际交付文件为准，不做起草时锁域）；fr-index.js 是他会话在途脏文件，零编辑同时规避暂存夹带。为什么：第一次知道路径未登记是在收口模块门（最贵时点），早期提示把登记成本挪到干活前；纯提示不设门（input 路径可能不全，路由真相以实际交付文件为准，不做起草时锁域）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

resolveBatchTickAction({ batchTick, nonMirrorCount, allowBatchTick, autopilotTicked, evidenceComplete })——新参数缺省 false（additive，既有调用方零感知）；返回 action 集从四态扩为含 'advisory'/'evidence-complete' 路径（reason 新值 'evidence-complete'）。flow-state.yaml 新增可选键 batch_ticked（evidenceComplete 降级时留痕 true）。fr-index.js 零编辑（预判经已导出的 resolveTouchedDomains/matchedModuleIds 复用 distill 同一域匹配与伪域回退链，单一实现防镜像漂移）。flow start 横幅新增条件段「🗺️ FR 域预判」（命中点名 fr/<域>／未命中点名伪域＋登记指引）——仅当模块图在场且 input 提及路径时输出，其余形态横幅逐字节不变。CLI 命令/flag/文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。evidenceComplete 信号来自哨兵同一时点计算（baseline..HEAD 提交消息 + review.json 快照），批次门在哨兵之后消费同一快照内的布尔值——无跨时点竞态。resolveBatchTickAction 决策顺序固定（flag > 哨兵面未知 > evidence-complete > autopilot > reject），输入顺序无关。域预判对 input 路径逐条独立判定，路径顺序不影响命中/未命中归类（伪域投票取众数，同票排序稳定——sort 后取首位，伪域仅作预判展示非路由真相）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

留痕写 flow-state batch_ticked 走既有 writeFlowState 合并写通道（与 autopilot_ticked/accept_empty_face 同款），change 目录单变更所有权下无并发同写。域预判纯只读（模块图 + input 路径），零写面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。降级留痕 best-effort（写失败不阻断，与 allow_batch_tick 留痕同容错）；拒收/降级都不改子步完成态，重入从 ledger 断点续语义不变。域预判在 flow start 一次性输出，无状态可断。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。evidenceComplete 只读本变更 changeDir 与工作区仓 git log（哨兵既有扫描面，跨仓提交不在面内——降级不会因跨仓证据误开）；域预判读本仓模块图与本仓 input，多工作区各自读各自 .sillyspec。pseudoDomainFromPaths 导出后单一实现两消费面（distill 路由/flow start 预判），词典守卫参数 knowledgeRoot 两处同源传入，不产生第二套伪域铸造口径。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：降级被对抗利用——agent 学会「一把勾+事后补 token」绕节奏纪律。评估：token 证据是提交哈希锚定的客观面（不是自声明），「事后补 token」意味着真做交付提交，证据语义未失真；损失的只有平台时间线 per-task 时点信号，advisory+flow-state 留痕使该损失审计可见。0/12 事故形态（零证据一把勾）不走降级路径（status≠complete 保持硬拒+哨兵独立拦截）。次风险：域预判误导——input 提及路径与实际交付面不一致时预判落空；缓解：预判行明示「以收口实际交付文件路由为准」，不设门不锁域。试过放弃的方案：①事件流门完全退役只留 git 时点检查——证据完备判定依赖哨兵先行，事件流门仍是零证据形态的节奏牙齿，退役扩大打击面；②起草时把预判域写进 draft-ledger 锚供 distill 消费——input 路径过时预测会覆盖实际文件路由（更糟），预判只做提示；③横幅预判做成硬门（未登记即拦）——绿地/探索性变更会被误拦，与模块门「绿地无图不拦」语义冲突。均否。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | 哨兵 complete 信号传递（_sentinelEvidenceComplete）+ 批次门 evidenceComplete 参数 + evidence-complete 降级分支（batch_ticked 留痕）+ flow start 域预判块（matchedModuleIds/resolveTouchedDomains 复用，绿地/零路径零输出） |
| 修改 | src/sentinel-assertions.js | resolveBatchTickAction 新增 evidenceComplete 参数（缺省 false）与降级态（优先序：flag > 哨兵面未知 > evidence > 代勾 > reject），JSDoc 五态更新 |
| 修改 | test/batch-tick-gate.test.mjs | ②b 扩 evidenceComplete 断言；新增 ②d 接线钉、②e 降级 e2e、④ 域预判 e2e（命中/未命中/绿地草案/零路径） |
