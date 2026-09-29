---
author: flow-machine-draft
created_at: 2026-09-29T05:15:34.163Z
---
# 设计记录（Design Record）— 2026-09-29-rot-retire-inject-cap

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两件并一变更（三个只读子代理已全仓核证影响面）。其一「拆标记层」：FR 腐烂待复核持久标记零消费实证（471 条无一被复核行动；fr-rot-precision 评审曾误删 72 条无人发现），且信号饱和反噬注入排序（cli-entry 224/238 带标=排序失真）。拆除全部持久化设施（两处写入点：flow.js rotSuspectFlow、run/shared.js auditQuickCompletion；字段与消费：readActiveFrDigest.needsReview 及 flow 注入排序/prompt digest 渲染；设施：markFrNeedsReview、cleanupStaleReviewMarks（已确证死代码）、knowledge-digest rot 告警臂），一次性剥除九个域文件 471 条「待复核：」行；保留 rotSuspectFlow 的覆盖计算+收口 advisory+fr-rot-suspect 遥测（提醒在发生时刻被看见，不留账）。其二「修注入失控」：{FR_INDEX_DIGEST} 是全仓唯一无上限的 prompt 渲染面且不滤 unmapped（遥测 11/11 次全量灌 723 条），修为滤 unmapped+top-8 截断+指针行，同批把 stage-contract 重复软门的同款缺失（口径与孪生 frDupGateFlow 漂移）一并对齐。测试门消费的 activeFrCoverageHits/collectFrLinkedTests 一字不动。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
内部导出面（无 CLI 命令面变化）：① fr-index.js 删除导出 markFrNeedsReview、cleanupStaleReviewMarks，删除常量 FR_NEEDS_REVIEW_PREFIX；② readActiveFrDigest 返回条目移除 needsReview 字段（消费方仅 flow.js/prompt.js 两处，先拆消费后拆字段）；③ rotSuspectFlow 返回对象移除 marked 键，warn 文案去掉「已打待复核标记 N 条」段；④ knowledge-digest 输出移除 rot 信号卡与底数行 rot 段；⑤ {FR_INDEX_DIGEST} 注入值形态：条目行 ≤8、超量含指针行、unmapped-only 时空态文案（指向 fr/unmapped.md）；⑥ fr-inject 遥测（digest 源）加字段 rendered/truncated/unmappedFiltered，count 保持全量口径；⑦ stage-contract 重复软门 domains 加 unmapped 过滤。数据面：knowledge/fr/*.md 的「待复核：」行消失（spec-sync 整文件哈希同步，无 schema 影响）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：无事件序依赖。剥「待复核：」行是一次性幂等重写——重跑时无行可剥即为空操作；标记写入路径删除后不存在迟到补标。
2. 并发写：本仓多会话并行在途（另一会话有 fr-index.js/knowledge-digest.js 未提交改动，区域与本变更不重叠）。剥离脚本写前快照比对、内容漂移即跳过该文件重跑消化（沿 writeAtomicSync 原子写，不产生交错残行）；提交时对共享文件做逐 hunk 切分，不夹带他会话 hunks。
3. 切换/生命周期：纯函数级删除+一次性数据重写，任意点中断可重入（剥行幂等、删码以测试绿为完成判据）；flow-state 断点续跑不受影响。
4. 作用域：仅本仓 .sillyspec 与 src；spec-sync 按文件哈希整传新内容，平台侧无解析依赖（已核证 sync 链路从不解析标记行）；外置 spec 根场景同构。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：needsReview 字段存在未核证的隐性消费方导致运行时 undefined——已由三个只读子代理全仓 grep 核证仅 flow.js:172 与 prompt.js:1231 两处，且拆除顺序钉死「先拆消费、后拆字段」。次风险：剥行误伤条目正文中的「待复核」字样——剥离仅匹配行首前缀「^待复核：」，与机器契约行格式一致，另有测试断言剥后 grep 为零。
死路（已试弃，防复潮）：① 修 rot 判据精度（枢纽文件 df 降权）保留标记层——零消费实证下把信号修准仍是家具，先拆后看；② unmapped 池整池外移冻结——resolveTouchedDomains 兜底会重建池子、104 个来源变更的幂等闸门只扫 fr/ 会把搬走条目静默写回（子代理核证），本次只做注入排除；③ distill dup 升硬门——存量 active 标题 pairwise 38 对 ≥0.6（「测试覆盖」三条互撞 1.00）全是真独立需求，硬门逼假承接行污染取代链。
