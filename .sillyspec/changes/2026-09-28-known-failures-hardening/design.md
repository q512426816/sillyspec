---
author: flow-machine-draft
created_at: 2026-09-28T06:39:48.180Z
---
# 设计记录（Design Record）— 2026-09-28-known-failures-hardening

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件：① 匹配语义升级——锚定式（^…/$… 对 trim 后整行正则）+ 泛用裸模式停用（整条模式即失败词/极短符号串的裸子串失去豁免资格——物理关闭裸 '--- ' 吞 go FAIL 行、裸 AssertionError 吞真实断言行；具体模式如文件名用例名不受限，跨仓零破坏）；② 分层入库——.sillyspec/known-failures.yaml 承载工具债类（先例 redlines.yaml），loader 合并入库与 local 两源；既有 27 条审计迁移（删陈旧垃圾 2 条、锚定收窄 4 条、废裸 AssertionError、待审计标记 4 条）；③ 裁判与装载披露——豁免通过 reason 标注锚定与裸子串命中计数（裸命中给收敛提示）、装载行报两源条数、停用条目点名警告。顺手修真缺口：PER_TEST_FAIL_RE 补 node:test 实际标记 ✖（U+2716）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
verify-postcheck.js：GENERIC_BARE_PATTERN_RE 常量、partitionFailures 匹配块（锚定式+停用+exemptedBy 追加字段）、judgeWithKnownFailures 披露、装载合并两源；.sillyspec/known-failures.yaml 新增（24 条）；local.yaml known_failures 清空留指针；测试 +11 断言（含 M1 kill-shot 三连）。exemptedBy 为追加字段（既有消费方零破坏）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯函数+装载只读）。2. 并发写：verify-postcheck.js 为共享大文件，提交前逐 hunk 核对（5 hunk 全属本变更）。3. 切换：无状态。4. 作用域：入库文件随仓走（跨机可审计），local.yaml 保持机器级；跨仓消费者 local.yaml 裸子串语义不变（仅泛用词停用——停用是安全方向：不豁免不会假 PASS）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-known-failures-hardening 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：泛用词停用可能让某仓既有清单里的懒模式失效 → 该仓门从假 PASS 变真 FAIL——这是修复不是回归（装载警告点名停用条目，改锚定式即恢复）。放弃方案：硬失败行只准锚定式豁免（首轮实现实测误伤主用例——按文件名豁免预存失败测试正是硬行+裸子串的合法组合，跨仓全在用，已回退改为泛用词停用）。
