---
author: flow-machine-draft
created_at: 2026-10-21T00:00:00.000Z
---
# 设计记录（Design Record）— 2026-10-21-review-rerun-scope

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四份评审子代会话逐工具时序画像（用户裁决「改」）：思考面合理（roundtrip 评审 39 工具零冗余抓 4 真 P3），复跑面不合理——ui-proto 评审内部两轮全量 8.4min、provenance 起 bg 任务等 187s、scoped-verify 复跑 145s；对照差异唯一变量是派发词是否点名复跑面。根因=任务书无复跑口径+材料包无 ledger 回执（scoped-verify-policy 只覆盖 AGENTS 主会话面）。修法：①任务书增「复跑口径」节（五要素，与 AGENTS 口径同源）；②材料包增 testReceipt 子源——findLatestTestReceipt 纯扫描 verify-runs（CLI 亲测产物，符合护栏③「机械抽取」），assembleReviewPack 机械渲染回执行，评审员从「自己重跑验证」变「回执基线抽验」。预计初审评审 10-21min → 4-7min。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- flow-review.js：renderReviewerTaskbook 输出增一节（其余逐字不变）；无签名变化。
- flow-review-pack.js：新增导出 findLatestTestReceipt(verifyRunsDir, changeName)；assembleReviewPack 增可选参 testReceipt（缺省 null 行为=现状）。无 CLI 命令/schema 变化。
- flow.js：review 子步装配处多一次 findLatestTestReceipt 调用（fail-soft）传参。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
回执取目录名时间序最新，ledger 先于 review 子步（SUBSTEPS 顺序）——迟到回执（不可能：ledger 是 review 前置）不适用；扫描瞬时读。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
verify-runs 按 runId 目录隔离只追加不覆写；并发 flow done 各自 runId 不互踩；fail-soft。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
回执是历史留档只读；缺席零注入退化到口径节文字指引，无状态残留。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
按 changeName 过滤 test-result.json 的 change 字段，跨变更不串；runtimeRoot 锚定本仓（与 ledger 写入同根）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险1：回执过期（ledger 后源码又变）——review 子步在 patch 冻结后、源码面已定；且口径节要求「抽验复核」非盲信回执；可接受。
- 风险2：口径节被派发缩编丢弃——任务书已含「原样复制」纪律行，口径节属于任务书本体；可接受。
- 死路：考虑过让 ledger 直接把回执写进 change 目录（评审员必读面）——放弃：verify-runs 已是既定留档位，复制第二份成双源；材料包注入即可达评审员。
