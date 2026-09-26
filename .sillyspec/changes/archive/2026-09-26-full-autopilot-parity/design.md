---
author: flow-machine-draft
created_at: 2026-09-26T10:50:12.876Z
---
# 设计记录（Design Record）— 2026-09-26-full-autopilot-parity

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
governance-autopilot 两条直接迁移到完整流程（R21 thin 实证治理手工从 25 轮压到 2 轮、token 14.4M 反超 OS）：①execute --done 自动勾选——complete.js 的 execute 完成路径，解析 run 内提交 task-NN token 代勾 tasks.md（与 thin 的 flow done 同逻辑不同时点）；②verify --done 自动绑定——gates.js 的 verify 测试门之后（test-result.json 已生成），从测试结果补全空绑定槽（与 thin 同逻辑同代码形态）。GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——后续独立变更从 design.md 推导）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
complete.js：execute 完成路径加 auto-tick（近 20 提交范围解析 token、正则代勾、writeAtomicSync 原子写、fail-soft）；gates.js：verify 测试门 runVerifyTestCheck 之后加 auto-bind（verify-runs 读→逐行扫描空槽→插入→原子写、fail-soft）。零既有行为变化（两条均是「有证据/有数据时代勾/代填，无则静默跳过」）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：auto-tick 在 --done 时点快照（近 20 提交窗口）；auto-bind 在测试门之后（test-result.json 刚生成）。2. 并发：auto-tick 原子写；auto-bind fail-soft。3. 切换：两条幂等（已勾/已填不覆盖）。4. 作用域：auto-tick 只在 execute --done（verify --done 不触发）；auto-bind 只在 verify 测试门的真跑分支（ledger-reuse/scan-reuse 分支不触发——复用路径文件面已对齐无需补全）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-full-autopilot-parity 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=auto-tick 的近 20 提交窗口可能捕到其他变更的 task token（多 agent 共享仓）——窗口缩小到 run 范围更精确但 runId 解析复杂度高；20 窗口是 pragmatic 平衡，误勾由 checkExecuteCodeEvidence 兜底。auto-bind 的 test-result 路径在平台模式（runtime 分离根）可能读不到——fail-soft 跳过不阻断，与 thin 同风险面。死路：GWT 预填直接迁移（用 input 文本推导 full 的 FR）——full 的 requirements 来自对话演化，input 只是起点；直接迁移会产出生成式填空题质量低于 thin（无对话上下文），弃。
