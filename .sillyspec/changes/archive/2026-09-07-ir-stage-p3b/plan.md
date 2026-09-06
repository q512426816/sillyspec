---
author: qinyi
created_at: 2026-09-07T03:50:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-04

## Wave 2（依赖 Wave 1）
- task-03

## Wave 3（依赖 Wave 2）
- task-05

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | facts 底稿 + 层标注 | W1 | P0 | — | FR-01, FR-03, D-001 | verify-probes.js：buildVerifyFacts + --init 落盘 + generateVerifyResultSkeleton 标题后缀层标注 |
| task-02 | 一致性纯函数 | W1 | P0 | — | FR-02, D-002/003 | verify-postcheck.js：checkProbeConsistency（重跑+#### 子节定界锚点+分级+判别子+HEAD 前进子案）+ 锚点常量导出与渲染同源 |
| task-03 | gates 接线 | W2 | P0 | task-02 | FR-02 | gates.js：reconcile 接线后追加，信封 code 三值 + 落盘 verify-runs（P3a 同款） |
| task-04 | prompt 纪律 | W1 | P0 | — | FR-03 | stages/verify.js Step 7 两条（预填禁篡改/facts 禁改） |
| task-05 | 测试套件 | W3 | P0 | task-01, task-02, task-03 | FR-01~03 | test/verify-probes-facts.test.mjs + 既有骨架格式断言更新义务 |

## 关键路径

task-02 → task-03 → task-05

## 全局验收标准

1. 篡改/删除预填探针段（facts 在场）被 gate 拦 ERROR——冒烟锁定
2. probe3/5 漂移仅 WARNING；存量旧报告 skip 零红门禁
3. 既有 verify-probes/骨架格式测试零回归（层标注后缀不破子串断言）
4. npm test（module 策略子集）全绿

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-04 | facts CLI 全权 + prompt 禁改 |
| D-002@v1 | task-02, task-03 | 分级判定 + 正文基准 |
| D-003@v1 | task-02, task-03 | 子节定界/判别子/HEAD 子案/签名 |
