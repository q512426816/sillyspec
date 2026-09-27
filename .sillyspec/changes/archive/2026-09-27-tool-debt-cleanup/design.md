---
author: flow-machine-draft
created_at: 2026-09-27T09:44:22.951Z
---
# 设计记录（Design Record）— 2026-09-27-tool-debt-cleanup

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
四笔清偿：① 提交面过滤抽为 flow-parity.filterCommittedFace 纯函数并扩展保留 .sillyspec/docs/ 交付文档（模块卡漏出审计 patch 的评审 P2 修复）；② flow.js 变更目录遍历排除 flow-state.yaml 运行态（不再当 new file 冻进 patch）；③ _module-map.yaml 登记 ui-visual.js 与 hunk-attribution.js（cli-entry）及他会话遗留的 knowledge-digest.js（core-engine，knowledge 系家族归属）；④ test-bindings.js 去除 normalizeTestsRootRel 冗余导出。③④ 使 check-syntax 全仓 lint 门解锁（pass 1 fail 0 实测）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出 filterCommittedFace（src/flow-parity.js）；flow.js patch 子步改用该函数 + walk 排除 flow-state.yaml + meta.note 更新；_module-map 三条 paths；test-bindings 去一导出。无 CLI 命令签名变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯过滤函数与只读登记）。2. 并发写：共享文件提交前逐 hunk 人工核对（本会话新纪律），实测 5 hunk 全属本变更零外源。3. 切换：过滤函数无状态。4. 作用域：knowledge-digest.js 归属判定按 importer 家族（stages/knowledge.js 与 fr-index.js 均在 core-engine），非臆测。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-tool-debt-cleanup 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：.sillyspec/docs/ 全保留可能把他会话在途的 docs WIP 冻进本变更 patch——对冲：docs 面提交前归属由既有夹带嫌疑 advisory 与 hunk 归属门（昨日变更）覆盖；本变更实测区间内 docs 提交均为本变更模块卡。放弃方案：只保留 modules/ 子目录（更窄）——放弃，scan/CONVENTIONS 等 docs 同为交付物，窄口径会再造下一个漏。
