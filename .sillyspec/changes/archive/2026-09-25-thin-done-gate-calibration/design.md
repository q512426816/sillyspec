---
author: flow-machine-draft
created_at: 2026-09-25T09:28:51.309Z
---
# 设计记录（Design Record）— 2026-09-25-thin-done-gate-calibration

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
坑1（勾选态归一）：在 machine-draft.js 的 bodyHash 单点加归一——哈希前把 `^([-*] \[)[ xX](?= task-\d)` 归一回 `- [ ]`。选单点是因为 wrapSection 标记、verifyMarkers 判定、reanchorText 重锚、draft-ledger 台账四处哈希全走 bodyHash，天然同口径，不会分叉出第五套口径。语义依据：勾选是 flow start 横幅教的预期写面（哨兵证据面），不该参与「被改写」判定；draft 产出恒 `[ ]`，存量台账两侧归一后同哈希，兼容。替代方案（checkbox 行挪出机器段）改动大且丢掉「任务行=机器推导」的指纹保护，放弃。
坑2（哨兵证据口径）：flow.js 与 run/quick-audit.js 两处哨兵取证的 git log 由 `--format=%s` 改 `--format=%B%x1e`（记录分隔符按提交切记录，标题+正文整条消息都是证据面；advisory「区间已有 N 个提交」的计数按记录数取，不被多行正文撑大），拒收文案同步写明「标题或正文」。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- machine-draft.js：新增模块内归一函数 normalizeTaskCheckboxState（不导出——lint 未引用导出门，bodyHash 单点消费）；bodyHash(s) 行为变化=task-NN 勾选行的哈希与勾选态解耦（其余内容哈希逐字不变；消费方 verify-draft.js 的机器段无 task 勾选行，实测零影响）。
- flow.js / run/quick-audit.js：内部 git log format 变更（%s→%B%x1e）+ 变量更名 commitSubjects→commitMessages，无导出签名变化；哨兵拒收文案由「提交带 task-NN」改为「提交标题或正文带 task-NN」。
- sentinel-assertions.js：仅文件头注释口径更新（subject→标题或正文），detectFakeCheckCompletion 签名与判据不动（commits 数组本就接受整条消息字符串）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：勾选与收口校验都是对盘面全文的幂等重算——先勾后跑与先跑后勾重跑结果一致；勾选先于 start 的补起草（redraftMissingArtifacts 已存在不碰）与归一无交集。
2. 并发写：draft-ledger 与 tasks.md 均单写者（CLI 原子写 / agent 手改）；两执行体同改 tasks.md 是 git 工作树层面既有问题，本变更不新增写点。
3. 切换/中断：归一是纯函数、done 断点重入重算同哈希；%B%x1e 切分对空消息（trim 后滤除）与超长正文照常，git log 失败走既有 fail-open 跳过。
4. 作用域：归一口径只认 task-NN 行（负向前瞻同哨兵），普通清单勾选行不归一——verify-result 机器段（跨件族消费方）无 task 行不串台。已知边界：watcher 哨兵源一仍取 subject（恒 provisional 观测旁路、不拒收），正文 token 在观测面会漏报成 advisory——不扩进本变更，留观测旁路降噪议题。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-done-gate-calibration 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：存量在途变更若曾按旧口径「先勾选再 amend-draft」，台账里存的是 [x] 形态的哈希——升级后 verify 归一算的是 [ ] 形态哈希，会失配。触发面极窄（须勾选→amend→工具升级三连），撞上时按提示再跑一次 amend-draft 重锚即愈（amend 的 reanchorText 也走归一哈希，重锚后不再复发）。
放弃的方案：①把 checkbox 行挪出机器段（机器段只留题面）——改动大、丢任务行指纹保护、所有在途台账失效；②只在 flow 侧归一不动共享 bodyHash——wrapSection/verifyMarkers 立刻分叉两套口径，恰好是要修的病。
