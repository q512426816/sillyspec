---
author: flow-machine-draft
created_at: 2026-09-28T16:24:44.398Z
---
# 设计记录（Design Record）— 2026-09-29-decision-route-vocab

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法两件：① matchKnowledge 零命中时查询侧词片回退——只测查询自身的词片（CJK bigram＋≥4 字符 ASCII 词，纯 ASCII 查询不回退），逐 decisions 域文件数词片在条目文本（标题∪理由）出现次数，落在「跨条目复现但非泛在」窗 [2, max(2, 5%·条目数)] → 文件级命中（合成路由条目进 entries，CLI search／digest／门三面共享）＋条目级命中（score=复现词片数，既有 score>0 回显资格兼容）；② 蒸馏标题必填——裸号条目 needsWait（对齐 rejected 缺否决理由先例）。入库侧词表派生方案已试并弃：同窗词片 1176 个按序截断=抽签（谓词排 759），死路记录于 decisions.md。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：matchKnowledge 新增零命中回退路径——matched=true 时 json.fallback=true 可判别；decisionHits 条目 score 语义分路径（路由=Jaccard [0,1]，回退=复现词片数 ≥1），消费方只判 >0。distillIntoKnowledge needsWait 扩至标题缺失（消息点名「标题」）。查询侧零写入（INDEX/域文件字节不变，有测试钉住）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：回退为纯读计算（每查询解析 decisions 文件 ~15 个，毫秒级），无状态无写入无并发面；蒸馏标题门为既有 needsWait 链路的条件扩展。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-decision-route-vocab 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：① 回退窗口是频次计数，语义无关词形复现（两个条目碰巧共享词片）可误命中文件级——后果是有指向价值的文件指针而非错误断言，且仅在路由零命中时触发（正常路由路径不变）；② 小域窗口=[2,2] 收紧后三条目以下域的复现词覆盖弱（宁可少弹）；③ 条目级 score 语义混用（Jaccard vs 计数）若未来消费方误当阈值用需文档化——JSDoc 已注明。退役判据=真实使用中回退命中的文件指针多数与主题无关（狼来了证据），或路由 tag 人工扩充覆盖到位后词片查询不再零命中。
