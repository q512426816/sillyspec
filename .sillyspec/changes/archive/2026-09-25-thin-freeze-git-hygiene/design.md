---
author: flow-machine-draft
created_at: 2026-09-25T04:54:34.562Z
---
# 设计记录（Design Record）— 2026-09-25-thin-freeze-git-hygiene

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
冻结面与 git 历史解耦（用户提出的留存形态问题）：原则=patch 冻结件是审计真相（sha256 锚定、随归档不可变），git 历史是展示层可自由重写。三件：①flow done 新增 --freeze-dirty——显式声明非他侧声明的 dirty 交付文件全归本变更并入冻结面（独占 worktree 自动路径的手动版，输出标签区分 flag/worktree 来源）；②共享主仓 dirty 警告改三选一指引（接受缺口/--freeze-dirty 重跑/下次专属 worktree）；③归档完成且 head≠baseline 时打印 reset --soft 压扁指引（多轮中间提交收成一个最终提交），注明 knowledge 最近确认 hash 压扁后成孤儿引用属预期；④简报从「先提交再 done」教条软化为冻结面规则说明。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js：cmdFlow dispatch 传 freezeDirty、签名收参、exclusiveFrom 来源标签（flag/worktree/null）、警告与归档指引输出、简报改写；test/flow-protocol.test.mjs：⑱ 新增（--freeze-dirty 入冻+压扁指引断言）+ ⑥b/⑭ 文案同步。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：flag 判定与指引输出均为纯同步逻辑；冻结收集是单次快照读，无时序面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=--freeze-dirty 在真多会话共享仓被滥用（把他侧未声明 WIP 冻进自己审计件）——出路口径同 --upgrade-thick 类留痕 flag（使用即声明，审计面可见）；滥用后果是审计件污染而非代码风险。死路=让 CLI 自动判定 dirty 归属——共享主仓无归属信号，判定即猜测（49 文件泄漏实证），显式声明是唯一诚实解。
