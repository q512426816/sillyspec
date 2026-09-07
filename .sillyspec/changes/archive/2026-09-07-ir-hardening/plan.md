---
author: qinyi
created_at: 2026-09-07T23:12:00+08:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-07-ir-hardening

> 任务名唯一真相在 tasks.md；本文件 Wave 段为纯 ID 引用。依据：design.md（Grill 修订版）+ decisions.md D-001~D-007。

## 全局验收标准

1. 存量回归零变化：created_at 早于 IR_STRICT_SINCE 的变更，P3b/P3a/全链路输出与改动前一致（skipReason 允许追加注记）。
2. 严格模式两 ERROR 信封（probe_prefill_missing_strict / target_files_all_missing_strict）在 gates envelope 与 print 层独立路由并阻断回滚，文案含可执行指引。
3. validateDesignFileList：幻觉路径 ERROR 阻断 brainstorm 完成；NEW: 前缀 / glob 字符 / `<...>` 占位三形态豁免或跳过；清单缺失 WARNING。
4. delta --change 与归档自动路径模块归属同口径（progress.project 取值）；last-delta.json sidecar 两路径都写，scan 断点续扫步 14 天窗口 advisory。
5. docs check --fix 输出「前失效数 → 重锚数 → 后失效数」回执；非 --fix 路径输出零变化；引用类 supportedFixes 全部可逐字执行。
6. 全量测试套件 0 失败 + lint 0 告警。

## Wave 1

- task-01
- task-04

## Wave 2

- task-02
- task-05

## Wave 3

- task-03
- task-06

## Wave 4

- task-07

## Wave 5

- task-08

## Wave 6

- task-09

## Wave 7

- task-10

## Wave 依赖说明

- Wave 排布受「同 Wave 禁改同文件」硬约束（postcheck 蓝图一致性）：
  - src/verify-postcheck.js + src/run/gates.js 消费者 task-01/02/03 分驻 W1/W2/W3 串行；
  - src/index.js 四消费者 task-05/06/07/08 分驻 W2/W3/W4/W5 串行。
- 依赖闭合：task-02/03 ← task-01（W1）；task-06 ← task-05（W2）；task-09 ← 02/03/04/06/07（W5 前全齐）；task-10 ← task-09。

## 跨任务契约

- task-01 产出 `isStrictChange`（verify-postcheck.js 导出）——task-02/03 的唯一判别子来源，签名以 design.md 接口定义为准。
- task-06 产出 `buildDeltaReport({ withSummary })` 结构化返回——sidecar 写入的唯一数据源（防口径漂移，D-003 grill 采纳）。
- 信封 code 常量（两个 strict code）在 task-02/03 中定义于 verify-postcheck.js，gates.js 只消费不自造。
