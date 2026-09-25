---
author: flow-machine-draft
created_at: 2026-09-24T16:25:47.328Z
---
# 设计记录（Design Record）— 2026-09-25-thin-patch-bindings

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两块能力一片落地：①flow done 新增 patch 子步（ledger 后 noAI）——buildFrozenPatch 以 baseline 为基、归属收窄后的本变更文件面冻结（含工作树未提交与 untracked 自拼 hunk），落 change.patch + change-patch.json（行数+sha256 锚），fail-soft；②测试绑定链——draftRequirements 每条 FR 附「测试绑定」AGENT 槽，artifacts 子步加槽位门（不适用=已答，零槽=旧骨架指路补生成），distill 在 indexRequirements 前经 extractRequirementBindings 落 test-trace.json（FR 局部锚/candidate/machine），随既有发号提升铸全局。SUBSTEPS 六变七（+patch）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js 新增导出 verifyRequirementBindings / extractRequirementBindings，draftRequirements 输出加绑定节与槽；flow.js SUBSTEPS 增 patch、artifacts 加绑定门、distill 加 trace 落盘；无 CLI 参数变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯同步）。2. 并发写：patch 子步只读本变更归属文件与 git，写 change dir；绑定槽 agent 单写、CLI 只读。3. 切换/中断：patch 子步失败不标 done、重入重试；绑定门在 artifacts 子步幂等。4. 作用域：patch 文件面=归属收窄后清单（他侧声明剔除）；绑定行只写本 change 目录的 test-trace.json，提升走既有 fail-open 链。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-bindings 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=SUBSTEPS 变更对在途变更的兼容——旧 flow-state 无 patch 标记 → 子步视为未做照常执行，归档件幂等，实测无碍。死路=考虑过 patch 挂在 archive 子步内做（少一个子步），但 archive 会搬目录且语义是"收尾"——审计件应在测试过后的稳定点独立冻结，故立独立子步。
