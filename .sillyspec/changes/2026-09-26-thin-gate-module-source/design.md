---
author: flow-machine-draft
created_at: 2026-09-26T00:21:43.802Z
---
# 设计记录（Design Record）— 2026-09-26-thin-gate-module-source

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
在 src/verify-postcheck.js 的 runVerifyTestCheck 命中源计算处做「空源回退」：strategy==='module' 与 strategy===null（deps-auto 缺省收窄）两个分支，各自在既有的 restrictFiles 过滤之后加一条判定——源为空数组且调用方传了 restrictFiles（非空）时，以归一化后的 restrictFiles 兜底作命中源（打印一行可见日志）。选此方案因为 restrictFiles 本就是会话范围真相（flow 的 baseline..HEAD 归属面 / quick 的审计∪声明面），与门禁隔离快照 overlay 同源，语义上「声明即边界」家族一致；改动单点收口在共享入口 runVerifyTestCheck。作用范围（评审 P2 陈述清偿）：当前唯一传 restrictFiles 的调用方是收口门（quick-audit），回退仅在该路径可达——verify 阶段门（gates.js:1016 未传清单）在「变更全提交后跑门」同形下仍可能 0 命中假 skip，该路径接线留作后续变更。实证根因：thin 协议「先提交再 flow done」使门跑时 HEAD 已含全部改动，无 worktree meta 的变更命中源回退 git diff HEAD（仅未提交改动）恒空（2026-09-25-quick-channel-retire 收口实证：72 个门文件在手、test 门 skipped、诊断打印 diff 0 个文件；匹配器本身无辜——同清单实测命中 cli-core+run-gates）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无函数签名增删；runVerifyTestCheck（export 不变）内部行为变化：命中源为空数组＋restrictFiles 非空 → 以清单兜底（此前恒 0 命中 skip / strategy-null 落全量）。restrictFiles 既有「过滤收窄」语义不变（仅当过滤后为空才 substitute）；源为 null（git 不可用，hitCount=-1）语义不变；0 命中 skip 分支的诊断文案与 reason 不变（无清单时行为逐字保留）。对外可见：thin/全提交 quick 收口的实测面从「test: skipped」变为实际执行模块子集/deps 子集。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：命中源计算是单次同步快照（resolveVerifyChangedFiles 或 restrictFiles 二选一），无事件顺序假设；restrictFiles 是调用方在门入口一次性传入的冻结清单，不受后续文件变化影响。
2. 并发写：回退只读 restrictFiles 数组（调用方栈上对象），不写任何共享文件；模块子集执行沿用 runOneModule 既有隔离（快照 cwd/known_failures 口径），并行会话脏文件本就被 restrict 过滤排除——回退清单本身即会话范围。
3. 切换/生命周期：回退判定无中间状态（纯函数式分支），门中断重跑幂等；restrictFiles 为空数组的调用方（未传）走原路径，零行为漂移。
4. 作用域：restrictFiles 由各门调用方以本会话文件面传入（flow 的 baseline..HEAD 归属 / quick 的审计∪声明），路径为仓内相对路径并经反斜杠/前缀归一——跨仓 ctx 分支不消费本回退（跨仓走各仓 full），不串台。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险＝回退清单过宽或过窄导致实测面失真：过宽（restrictFiles 含非本会话文件）——清单上游就是会话归属面（快照 overlay 同源），且仅在 git 源为空时兜底，非空时仍以 git diff 为准；过窄（flow 归属面漏文件）——与快照 overlay 完全同源，漏则同漏，不引入新偏差。次风险＝日志噪音：回退打一行 ℹ️，每次门跑至多一条。放弃方案：①flow 把 baseline_commit 作 diffBase 穿进 runVerifyTestCheck——接线三层（flow.js→quick-audit→verify-postcheck）、签名扩散，且不覆盖 quick 会话全提交同形；②0 命中时无条件回退全量——正是既有 module-zero-hit-skip 分支刻意避免的（防超时/预存失败），不动。
