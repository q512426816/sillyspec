---
author: flow-machine-draft
created_at: 2026-09-24T16:12:07.183Z
---
# 设计记录（Design Record）— 2026-09-25-thin-dogfood-fixes

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三个修复同片落地：①flow-draft 新增 redraftMissingArtifacts（幂等补起草——缺哪补哪/已存在不碰/ledger 合并/criteria 从既有 proposal 机器段回提），接线在 flow start 重入分支恢复简报之前；②cmdFlowDone 新增 attributedChangedFiles 单源清单——ledger 门与 distill 的 deliverableFiles 都经 splitOwnVsForeignDiffFiles 归属切分（他侧声明文件剔除并打印，未声明保留 fail-closed）；③ledger 子步成功路径输出实测面对账行（test/lint 命令+时长+结果文件路径）。全部挂在既有子步内，协议调用数不变（仍 2 次）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js 新增导出 redraftMissingArtifacts（default export 扩）；flow.js cmdFlowStart 重入分支行为扩展（补起草 best-effort 失败仅 warn）、cmdFlowDone ledger/distill 的文件清单来源从直取 changedFilesSinceBaseline 改为归属切分后的清单。无 CLI 参数/命令面变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯同步文件操作）。
2. 并发写：redraft 只写「不存在」的文件（existsSync 先判），与 agent 填槽天然互不相遇；ledger 写为整读-合并-原子写，与 amend 通道串行面一致。
3. 切换/中断：补起草在 start 侧重入幂等；归属切分是纯函数式的每子步重算，中断重入无半态残留。
4. 作用域：切分器只读本仓他侧 active 声明（quick --files/design 清单），剔除仅影响本变更的测试面与 FR 路由，不改他侧任何状态。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=归属切分若把本变更真改的文件误判为他侧（同文件双声明）会漏测——兜底是 own 声明优先（splitOwnVsForeignDiffFiles 既有语义）+ 未声明文件保留。死路=考虑过把补起草做进 flow done（收口时补），但 done 时补的骨架 agent 已无法作答（随后即归档），必炸空槽门——补起草必须发生在 start 侧重入，agent 才有机会填。
