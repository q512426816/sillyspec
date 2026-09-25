---
author: flow-machine-draft
created_at: 2026-09-25T04:09:24.337Z
---
# 设计记录（Design Record）— 2026-09-25-thin-r16-patches

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
R16 三遗留：①patch 冻结面双修——flow start 简报钉死「交付代码先 git commit（显式 pathspec）再 flow done」；patch 子步经 collectFreezeFiles 收集冻结面：会话专属 worktree（gate-snapshot 同款路径判定注入 exclusive）下未提交 dirty 交付面一并入冻结（独占树内全归属），共享主仓 dirty 无法归属只警告（他侧声明免警告）——审计缺口从静默变显式。②评审任务书检查单加「披露边界显式裁决」条款：每条声明的设计边界/取舍必须写明可接受与否与理由（可接受进 dimensionNotes、不可接受按严重度进 findings、无边界写明、未裁决=未审）——R16 实证已披露取舍最易被默认放行。③ledger 子步断点续跑 skip 时经 backfillGateSummary 从 verify-runs 最近 test-result.json 回填实测面摘要，回执不再失忆（review 回填同族）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-parity.js 新增 collectFreezeFiles（git status dirty 收集+归属切分+exclusive 双路径）与 backfillGateSummary（verify-runs 按 change 匹配取最近）；flow.js 简报两行、patch 子步接 collectFreezeFiles+exclusive 探测+双路径输出、ledger skip 分支接回填；flow-review.js 检查单 3→5 条（新增边界裁决，防护/生成物顺移）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯读盘收集与文本渲染，无时序与共享可变状态；dirty 收集与归属切分均为单次快照读。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-r16-patches 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=exclusive 判定按路径正则（.sillyspec/.runtime/worktrees/ 前缀）——非 worktree 的独占目录（如 r16 对撞的兄弟目录 worktree）不在判定内，走共享主仓路径只警告不阻断，缺口可见。死路=让 agent 声明「代码已全部提交」自证——自证不算证据，机械收集才算（CLI 只认盘面）。
