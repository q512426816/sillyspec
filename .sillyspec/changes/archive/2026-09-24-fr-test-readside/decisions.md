---
author: qinyi
created_at: 2026-09-24 14:10:00
---

# 决策记录（Decisions）— 2026-09-24-fr-test-readside

## D-001@v1: 锚点集=task 卡 requirement_ids 并集；差集保守向
- type: definition
- status: accepted
- **覆盖**: FR-01, FR-02
- **上下文**: 锚点集怎么算（含 ql 面/diff 扩展？）；差集哪些可证。
- **裁定**: 一期锚点集=变更内 task 卡 requirement_ids 局部号并集（ql 行恒
  candidate 不进跑集天然 no-op；diff 扩展默认关——方案 §3.3 裁定）；可证覆盖
  仅 deps-auto-subset 文件集，命令型一律全补。
- **理由**: 方案原文——「碰旧 FR 拉大作用域」与「解析命令串猜覆盖」均被裁定
  禁止；宁多重跑不假绿。

## D-002@v1: 现选测逐字保留，残差只在结果层加法
- type: architecture
- status: accepted
- **覆盖**: FR-03
- **上下文**: 残差并入会否改变既有动作语义。
- **裁定**: decideVerifyTestAction 与既有执行分支零改动；skip/zero-hit 且
  trace 非空时以 trace 残差**替代执行**（mode=trace-residual），skip 声明语义
  本身不动；trace 空路径字节级不变。
- **理由**: 方案红线——本方案不改现选测缺省与 skip 语义；假绿禁令属另一策略变更。
- **故障面**: skip+trace 路径此前零执行、现在有执行——若 trace 行误绑会多跑；
  护栏=悬空硬错+行须 active（晋升经 agent 复核）。

## D-003@v1: runner 复用 buildDepsBatches 推断面
- type: consistency
- status: accepted
- **覆盖**: FR-04
- **上下文**: 残差文件用什么 runner 跑。
- **裁定**: 组卷/前缀推断复用 deps 既有实现（扩展名分语言组卷+pytest 前缀自
  模块命令），不新造第二套执行配置；无法归一硬错。
- **理由**: 方案 §3.6——「绑定行禁存 shell command」「复用既有推断面」。
- **退役判据**: 命名 runner profile 落地时本适配层退役为 profile 引用。

## D-004@v1: 悬空硬错=门入口 fail-fast
- type: definition
- status: accepted
- **覆盖**: FR-05
- **上下文**: 悬空检查放执行前还是对账后。
- **裁定**: verify 门入口先查——任一 active 行路径缺失直接 failed（不跑任何
  测试），reason 带缺失清单+`sillyspec tests --unbind` 修复指引。
- **理由**: 悬空表比没表更糟；先跑后拦浪费整轮墙钟；修复命令前笔同批已落地
  （无死锁——方案 §3.2 红线）。

## D-005@v1: 披露真源=JSON sidecar
- type: definition
- status: accepted
- **覆盖**: FR-06
- **上下文**: 差集披露落哪（verify-result.md 人读节/console/sidecar）。
- **裁定**: `changes/<名>/verify-trace-disclosure.json` 为真源（覆盖式幂等写），
  console 一行摘要；verify-result.md 人读节由 agent 模板承担不机械注入。
- **理由**: 方案 §6.1 建议——统计要机械可算，人读面不进机器真源。

## D-006@v1: trace 非空变更账本停复用（fail-closed）
- type: architecture
- status: accepted
- **覆盖**: FR-07
- **上下文**: 残差并入后 v2 账本键（config+整目录面）不再描述实际跑面。
- **裁定**: verify 门 consult/record 前读 trace——非空 active 行存在即双双跳过；
  空变更照用 v2（行为不变）。
- **理由**: run plan 含残差、consult 侧静态预测需复制整套动作决策（重且易漂）；
  fail-closed 停复用方向安全（多跑一轮 vs 误复用未含残差的旧绿）。收窄另案
  落地时随 plan 键恢复。
- **故障面**: trace 变更失去免重跑缓存（墙钟+一轮）——代价已知且方向安全；
  退役判据=账本键 v3 携 aggregate run plan 时恢复复用。
