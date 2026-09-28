---
author: flow-machine-draft
created_at: 2026-09-28T07:05:54.764Z
---
# 设计记录（Design Record）— 2026-09-28-split-guard-and-gate-report

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件：① splitCompoundCriteria 增谓词资格（SEGMENT_PREDICATE_RE 词表）——斜杠拆分仅当每段都含行为谓词词元（访问、生效、校验、入仓等 30 词）才拆；成对短名词（节点与边、页面 UI、语言框架）与单侧谓词形态保持整条；分号拆分与 pathLike 守卫不变（2026-09-25 决策语义保留）。② flow.js 测试门 FAIL 分支增三件套：失败行样本前五（读 resultPath 的 failure_remaining）、未过批命令原文（可粘贴重放）、结果文件全路径。③ quick-audit.js finally 增快照证据回拷：FAIL 时 verify-runs 目录同名不覆盖回拷主仓 .runtime 后再 cleanup。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js（SEGMENT_PREDICATE_RE + splitCompoundCriteria 守卫）、flow.js（FAIL 三件套 best-effort try/catch）、quick-audit.js（copySnapshotVerifyRuns + imports 扩 readdirSync/cpSync）。无导出签名变化；fr-compound-split 测试增 ①b 七断言。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯函数与只读回拷）。2. 并发写：flow-draft.js 与 quick-audit.js 均有他会话在途——flow-draft 用 git apply --cached 半块补丁只暂存本变更 hunk（MM 态分离提交，他会话 extractTestAnchors hunk 留工作树零夹带）；quick-audit 提交前逐 hunk 核对全属本变更。3. 切换：回拷同名不覆盖（主仓结果优先），无半态。4. 作用域：回拷只在快照模式 FAIL 时触发，主仓路径零变化。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-split-guard-and-gate-report 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：谓词词表漏词导致该拆的不拆（标准粒度变粗）——保守方向（不拆优于误拆，误拆需人工重写 FR，不拆只是粒度粗），词表可增量扩。放弃方案：取消斜杠拆分（推翻 2026-09-25 刻意决策且有测试锁定——评审否决）；全仓 env 白名单清洗（Windows 砍系统变量风险，归 P1 变更处理）。
