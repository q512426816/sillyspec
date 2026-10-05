---
author: flow-machine-draft
created_at: 2026-10-05T13:03:31.030Z
---
# 设计记录（Design Record）— 2026-10-05-redomain-preview-bychange

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在途代码倒推收尾（坑 redomain-plan-preview-by-change-ignored，2026-10-02 实证；本会话接手收编，非原作者）。单点修复：index.js 的 `tests --redomain` 预览分支调 planRedomain 时补透传 `byChange: byChangeD || null`（76338b4d 收编在途工作时漏传——落盘分支已透传，planRedomain 侧 byChange 过滤本就在场，预览漏传导致预览列整域而 --write 只迁分批子集）；预览计数行随动带「（仅「变更：X」）」标注让子集口径在输出面显式。CLI 级单测（execFileSync 走真实 CLI）锁定子集计数与排除项。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

CLI `sillyspec tests --redomain --from <域> --to <域> [--by-change <变更名>]` 预览输出行为变化：带 --by-change 时预览条目集与计数收窄为该变更子集并带标注（此前恒列整域）；--write 落盘行为不变（本就按 byChange 过滤）。无 JS API 签名变化（planRedomain 未改）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——预览是单次同步只读计算（planRedomain 扫 knowledge/fr 文件内存态过滤），无状态累积；knowledge 文件此刻是什么就预览什么。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   预览路径零写盘（--write 才落盘），并发写者只影响单次预览读到的新旧快照，无损坏面；落盘分支并发语义未改（本变更不触碰）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——预览无落盘无中间态；中断重跑幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：byChange 透传的是 CLI 参数字面值，planRedomain 在调用方给定的 knowledgeRoot 内过滤，不读跨仓数据；--spec-dir 锚定各自的 knowledge 根。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：byChangeD 为空字符串时 `byChangeD || null` 归 null——与既有落盘分支同款归一（非新行为），无新增面。倒推收尾特有风险：接手代码语义理解偏差——diff 仅一行透传 + 一行文案，已逐行核对并实跑其自带 CLI 单测。放弃的方案：无（更深的重构——如把预览/落盘共用一条参数组装路径——超出坑修复面，不动）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/index.js | tests --redomain 预览分支补 byChange 透传 + 计数行子集标注 |
| 修改 | test/fr-domain-guard-and-redomain-bychange.test.mjs | 新增 CLI 级单测 ⑥：预览只列分批子集、他变更条目不进清单 |
