---
author: flow-machine-draft
created_at: 2026-09-27T00:19:43.382Z
---
# 设计记录（Design Record）— 2026-09-27-gate-face-binding-parity

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
① faceOverride：runVerifyTestCheck 新增可选参，在场时跳过快照内二次推导（含收窄与空回退），直接以调用方权威面（posix 归一去重）算三源；quick-audit 两处调用点透传 files（源自 flow done 主仓侧 baseline..HEAD+status 归因面，含已提交交付）。② full 绑定面：completeStageGates 的 brainstorm 分支单源复用 ensureBindingSlots（有 FR 块按编号追加/已有槽 no-op/无块缺省 FR-01），verify --done 既有 auto-bind 因槽在场闭环——不改 verify 门新增任何硬门。③ renderExample 的 test_strategy: full 注释化（与 r23-cli 实验快照预适用一致）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
runVerifyTestCheck 签名 +faceOverride（缺省 null 零行为变化）；quick-audit runQuickTestLintGate 内部两处 runVerifyTestCheck 调用 +faceOverride: files；completeStageGates +brainstorm 分支（best-effort try/catch 不阻断）；config-schema renderExample 模板 1 行。CLI 命令面零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
乱序/迟到：faceOverride 每次门禁时点由调用方现算，无缓存态。并发写：ensureBindingSlots 原子写+幂等（已有槽 no-op），与他侧并发追加输者重跑安全；verify-postcheck 改动与会话内并行 WIP（.ts 内容分流）同文件共存，提交整文件带走并在提交信息披露。切换/生命周期：faceOverride 缺省=旧推导路径原样（空数组视同缺省），中断重入无半态。作用域：faceOverride 只进主仓动态子集，跨仓仓照旧 full；绑定槽追加只动 changes/<名>/requirements.md（变更私有目录）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-gate-face-binding-parity 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：faceOverride 旁路了快照 diff 的二次校验——若调用方面过声明（含未真改文件），动态子集可能多跑（宁多勿漏，方向安全）；权威面上游已过 foreign 归因收窄（splitOwnVsForeignDiffFiles），过声明面受双保险。次风险：brainstorm --done 追加槽改变 full 流程 requirements 形态，下游消费者（索引/对账）按 AGENT 槽注释扫描——槽是注释面不进指纹，verifyFlowDrafts 不校验 full 侧。放弃方案：快照锚 baseline commit（改 createGateSnapshot 全局面，波及 verify 门与 quick 通道）——影响面大且 thin 权威面已现成，不值。
