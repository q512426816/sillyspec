---
author: flow-machine-draft
created_at: 2026-09-25T10:35:38.656Z
---
# 设计记录（Design Record）— 2026-09-25-sentinel-evidence-freeze

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两条记档负面收口：②哨兵证据——并行会话已修 %B%x1e 全消息格式（代码已到位），本片补简报文案说清「提交标题或正文均含 task-NN 即为证据」；⑤冻结面归属三修——提交面（baseline..HEAD）不再过 foreign 声明切分（我提交的就是我的，陈旧声明的旧变更抢不走），dirty 面保持切分并打警告（不再静默，指明来源变更名），--refreeze flag 重置 patch 子步强制下次重冻结。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow.js：简报勾选纪律更新（标题或正文）、patch 子步提交面去 foreign 切分+dirty 面切分加警告、--refreeze flag 子命令入口。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：提交面切分移除是安全性提升（多留面不漏面），dirty 面切分保留+可见化。--refreeze 是逃生口不影响正常流。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-evidence-freeze 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=提交面不过 foreign 切分后，共享分支的并行会话提交会进冻结面——但薄变更的 baseline..HEAD 就是本变更工作窗口的实际提交，把窗口内提交全量入冻结件是正确语义（审计完整性>归属精确性，归属精确性由实测面 attributedChangedFiles 保持）。
