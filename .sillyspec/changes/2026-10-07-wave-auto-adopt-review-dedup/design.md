---
author: flow-machine-draft
created_at: 2026-10-06T23:09:36.897Z
---
# 设计记录（Design Record）— 2026-10-07-wave-auto-adopt-review-dedup

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

## 追加范围（task-07 并入：实测门失败面增量重跑——方案 1）

做法：失败轮把「失败批测试文件（TAP not ok 块 location 路径归因，pytest FAILED 行兜底，归因不出保守全记批文件）+ 当时 git HEAD」落稳定指针 `<specBase>/.runtime/test-rerun-<change>.json`；下一轮 verify --done 的 dynamic-subset 分支先算增量面 =「自失败 HEAD 以来变更文件（diff∪untracked）∪ 前轮失败批文件」，严格小于全量面时只跑增量面（三源推断以增量输入重算——修复文件的 import 依赖与 FR 关联回归自然入面），未触碰绿面复用不重跑，mode=incremental-rerun 并在 reason 披露口径；增量绿后 ledger 清 failedFiles（下轮自然回全子集基线）。批对象补发 files（buildDepsBatches 三批 push + runModuleSubset perModule 透传）。逃生：local.yaml verify: test_rerun: full / env SILLYSPEC_TEST_RERUN=full 恒全子集（2026-10-07 前现状），config-schema 注册 + renderExample token。仅作用 dynamic-subset 档，test_strategy: full / skip 不受影响。

追加边界（盲维同主文，增量面特有）：归因解析对非 TAP 非 FAILED 形态输出保守全记（退化=现状不误报）；ledger head 为 null（git 失败）时增量判定直接不触发；增量面 ≥ 全量面回全子集（宁多跑不绕过基线）。测试：test/test-incremental-rerun.test.mjs 四契约（纯函数三态/集成主链路真跑 node--test/config full 现状/ledger fail-soft）。
