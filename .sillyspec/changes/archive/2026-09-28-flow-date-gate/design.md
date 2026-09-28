---
author: flow-machine-draft
created_at: 2026-09-28T06:51:06.976Z
---
# 设计记录（Design Record）— 2026-09-28-flow-date-gate

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
把厚流程既有的变更名日期前缀门禁（assertDatedChangeName，brainstorm step6 规则 CLI 化，已在 run --change / change-rename 两边界强制）补到轻量道入口：src/flow.js cmdFlow 的 start 分支在 validateChangeName 之后、cmdFlowStart 之前，对「净新建」名字（changes/<名> 与 changes/archive/<名> 均不存在）跑 assertDatedChangeName，不合规 exit 2 并附教学文案＋重试提示（与 run/command.js 同款语义）。选此方案而非自动规范化：厚流程先例是拒收教学（日期由 agent 给定，跨天续跑不重算），自动补前缀会造成 agent 所记名与物化名漂移（flow done 携原 name 反而查无此变更）。同时把 start 缺省自动名从 flow-<date>-<hex> 调整为 <date>-flow-<hex>，使其自身通过 DATED_CHANGE_NAME_RE。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
CLI 行为变化仅一条：sillyspec flow start --change <名>——净新建且名字非 YYYY-MM-DD-<简短描述> 形态时 exit 2（此前照单物化）。恢复（目录在场）、头脑风暴预段收编、平台 writer 预建空目录、归档同名均不拦截（存量不追诉，对齐 run 门）。缺省自动名形态变化：flow-2026-09-28-ab12 → 2026-09-28-flow-ab12。flow status/done/amend-draft 不动；库函数 cmdFlowStart/initChange 保持宽松（门只在 CLI 边界，测试/平台工具合法用任意名建 fixture）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：无事件序问题——门是单次同步校验；日期只验形状不验「当天」（assertDatedChangeName 既定语义），跨天续跑恢复路径走目录在场豁免，不受影响。
2. 并发写：两 agent 同时 flow start 同名无前缀变更——两者都 exit 2，无物化竞争；一先一后建合规名，后者走恢复简报（既有幂等路径不变）。门只读 existsSync 不写盘，无新竞争面。
3. 切换/生命周期：门在 start 解析层、任何物化（目录/DB/flow-state）之前执行，中断点不存在；已物化变更重入不再过门（目录在场）。
4. 作用域：specBase（平台参数面）解析在前，门用同一 specBase 判目录在场——平台模式与本地模式各自对齐，不串台。多仓共享暂存区纪律不变（显式 pathspec 提交）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：既有 ~46 处 flow start 测试调用点用非日期名（fc-1 / flow-h2-t1 / sw-fake 等），过门后假红——逐文件把名字适配为日期前缀形态（固定 2026-09-01- 前缀，日期不验当天）。次风险：报错文案被测试断言（validateChangeName 非法名用例仍先触发、文案不变）。试过放弃：自动补前缀（名字漂移见槽1）；门放 cmdFlowStart 内部（会拦 mcp/平台工具直调与库调用，违背「门只在 CLI 边界」既定决策）。
