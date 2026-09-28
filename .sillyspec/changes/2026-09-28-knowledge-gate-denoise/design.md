---
author: flow-machine-draft
created_at: 2026-09-28T16:00:58.225Z
---
# 设计记录（Design Record）— 2026-09-28-knowledge-gate-denoise

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：① matchKnowledge decisionHits 条目附加 score 字段（relScore 既有计算透出，加法不改排序与既有键）；② 三消费方回显收窄为「deathPath ∪ (rejected 且 score>0)」——flow.js 注入段、run/complete.js 门回显、run/prompt.js {DECISION_HITS} 同口径；③ 门已回应静默——complete.js 升格 decisions.md 全文读取，命中条目若与「自身 id＋域文件名」（如 unmapped.md D-001@v1）在正文共现则不回显（小白鼠回应书写形态即此）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：decisionHits 条目新增 number 型 score（[0,1] Jaccard 重叠率）；matchKnowledge 其余键与排序语义不变；API 层不过滤（空标题零分条目仍在列表）——过滤职责在消费方回显面；门静默判据为 _dm.includes(id) && _dm.includes(去路径域名) 共现。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯过滤与文本共现判断，无状态无 IO 新面（decisions.md 读取本就在场，仅扩大利用）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：① 零分过滤可能压掉「标题与查询零重叠但语义相关」的真 rejected——防复潮面本就靠词面路由，标题零重叠即零证据，可接受（宁少勿噪，与狼来了面取舍一致）；② 已回应静默的共现判据有误静默面（正文恰含同 id＋域名但非回应语境）——误静默有界：仅损失门 warn 信号（flow 注入段与 {DECISION_HITS} 两面不套用静默，冗余在场；正文 token 变动后自然恢复）；③ score 透出让消费方各取所需，若未来消费方误当阈值语义用需文档化。退役判据=噪音投诉消失后若出现「真命中被漏弹」实证，回退为仅死路优先。
