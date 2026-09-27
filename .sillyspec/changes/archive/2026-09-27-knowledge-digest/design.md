---
author: flow-machine-draft
created_at: 2026-09-27T05:23:04.935Z
---
# 设计记录（Design Record）— 2026-09-27-knowledge-digest

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
新模块 src/knowledge-digest.js（纯只读扫描）：collectKnowledgeDigest 四信号——rot 待复核行按域计数（阈 100）、uncategorized.md 收件箱（阈 20）、auto-*/unmapped 伪域条目（阈 0，unmapped 尊重 local.yaml fr_unmapped_baseline 基线消音只报增量）、绑定行经 resolveTestFileRel（与 repair-paths 同口径单源）解析失败（阈 0）；renderKnowledgeDigestText 人读出口。stages/knowledge.js 挂 digest 子命令（--json 全局旗标经 index.js 传 opts.json，进 data 面平铺）。落域机械改进：fr-index 归档伪域告警附 suggestDomainFromFiles 建议域（backend/app/modules/<seg> 最强 → daemon/frontend/backend → <pkg>/src/ → 目录段），与 digest 信号卡共用单源。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新 CLI：sillyspec knowledge digest [--json]（json 形 {ok,subcommand,generated_at,healthy,signals[],totals}）；suggestDomainFromFiles 导出；indexRequirements 伪域告警文案增强（附建议域+digest 指引）；cmdKnowledge opts +json。零写副作用。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
乱序/迟到：digest 每次现扫库态无缓存。并发写：只读扫描与写入方天然无竞态；伪域告警在归档写盘后打印，幂等重跑无重复副作用。切换/生命周期：--json 与文本双出口同源单算；基线消音键缺失=无基线恒报（与 fr-index 落库告警同口径）。作用域：projectRoot=CLI 运行目录，绑定解析锚仓根；digest 不跨仓（平台侧经 daemon RPC 到各仓分别采集）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-knowledge-digest 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：阈值为拍脑袋初值（rot 100/inbox 20）——先按本仓实测量级定（本仓实测 305/39 首跑双超），连续安静或持续爆表都该调，防仪式化熔断在案。次风险：suggestDomainFromFiles 对扁平 src 布局返回 src（无意义域）——已接受（monorepo 规则在前覆盖；错建议不自动执行只提示，人工裁决兜底）。readFrBindings 逐条目扫描 O(条目×文件) 性本仓秒级可接受（周节奏消费）。放弃方案：rot 判据收紧——细看后收回：广域变更打 239 条标记是诚实信号（真触达），病在阅读面不在判据，digest 按域聚合即解。
