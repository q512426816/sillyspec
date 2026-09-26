---
author: flow-machine-draft
created_at: 2026-09-26T01:24:45.967Z
---
# 设计记录（Design Record）— 2026-09-26-review-unsupervised-exit

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
加法式豁免通道（向下兼容）：R18-full 实证无嵌套派发能力的环境（子代理不能再派子代理）阶段评审全降自审表演（三份自审全 PASS 零信息）+门硬拦形式合规（15 拦截中 5 次 review 形式）；R8 实证有派发能力时评审抓过真缺口——层有价值，价值条件=独立评审者。诚实出口：agent 写变更目录 review-unsupervised.md（含 unsupervised 字样声明）→ 四消费点（doctor-align 门/review-json 硬门/Stage Review tier 分支/Execute Task Review）二选一放行（warn+遥测 review-unsupervised-escape 观测豁免率）；生成侧三处指引（brainstorm Grill/plan/execute QA）加豁免分支（不自审表演）。Task Review 层退役清理（砍生成+砍门）独立收口不在本变更。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
gates.js 新导出 readReviewUnsupervisedWaiver(changeDir)+私有 waiveWithTelemetry（appendKnowledgeHit 遥测 fail-soft）；四消费点接线（豁免先于校验）；stages 三文件各插一行指引。既有有效 review.json 路径零变化（真独立评审仍强制）；两凭据皆无照旧 fail-closed。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：豁免凭据是变更目录文件（start 后任意时点写均有效——晚写者补历史豁免可接受：声明的是环境能力非时点事实）。2. 并发：凭据读是单文件 existsSync+read（原子性够）；遥测 appendKnowledgeHit 追加型。3. 切换：凭据文件随变更目录归档（留痕面自动持久）。4. 作用域：豁免只在 tier=independent 分支与 execute 评审门生效；tier=self 原语义不变；verify 终局评审（flow done 式）不在此豁免面（那是终局条件触发，另有 review_force 声明通道）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-review-unsupervised-exit 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=豁免被滥用（有派发能力的环境也写声明逃避评审）——对抗面：声明是显式自曝文件随归档公开（审计可见）+遥测可观测豁免率（异常升高可查）+指引明示「有派发能力时豁免不适用」；不做密码学强验（agent 环境能力 CLI 无法机器判定——诚实暴露优于伪检测）。死路：CLI 检测派发能力（harness 工具集对 CLI 不可见）——伪检测比声明制更假，弃；死路：豁免凭据用 env/flag（不落盘不留痕=可静默滥用）——文件制随归档，弃。
