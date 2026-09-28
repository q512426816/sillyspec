---
author: flow-machine-draft
created_at: 2026-09-28T14:57:31.393Z
---
# 设计记录（Design Record）— 2026-09-28-sentinel-waiver-hardening

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：三处——① sentinel-assertions：镜像豁免仅在区间提交非空时生效（零交付不豁免，空转变更回到从严）；② flow.js 三个快照点（adopt/resume/fresh——首版漏 fresh 路径是角度 C 复测未拦的根因）快照后即向 flow-state 写 baseline_sha256；哨兵消费前校验哈希，不符→按无基线从严＋篡改告警（.runtime 明文基线不可信面闭合）；③ 调用方空区间修正：git log 空串（区间零提交）与失败（null）分流——空串照跑哨兵（此前被 fail-open 跳过，角度 A 空转收口的真正卡点），quick-audit 同修。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：detectFakeCheckCompletion 零提交时 mirror=空集（mirrored 不报告、missing 全量）；route-hindsight 新导出 baselineSha256({specBase, change})→hex|null；flow-state 增可选键 baseline_sha256（writeFlowState 透传，旧变更无该键=过渡期信任基线）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯判据与哈希校验，快照-锚定同点写入无并发窗口（start/adopt 单趟）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-sentinel-waiver-hardening 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：①过渡期变更（镜像豁免变更与本变更之间 start 的）无锚定——信任基线（窗口一天内的少量变更，接受）；②agent 篡改 flow-state 里的 baseline_sha256 本身（change 目录内文件）——flow-state 属机器记账面，篡改它等于篡改 substeps/review_force 等全部收口依据，攻击面超出本哨兵职责（审计件 change.patch sha256 锚定兜底）。watcher R1 为 advisory 人判面，容忍无锚基线（消费侧未哈希校验——硬门在 flow done，纵深以锚定为准）；死路=把基线挪进 git 追踪（.runtime 惯例是本地观测面不进 git，为豁免破例不值）。退役判据=零提交从严误伤真实场景（如纯评审类变更无交付提交但有合法勾选）出现投诉。
