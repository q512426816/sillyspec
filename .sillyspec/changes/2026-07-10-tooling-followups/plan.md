---
plan_level: full
author: qinyi
created_at: 2026-07-10T22:50:24+08:00
---

# 实现计划（Plan）— sillyspec 工具侧 follow-up（local.yaml 轻量 + module 策略 + §4.6 收尾）

## Spike 前置验证

无 Spike。3 项改进方案均已在 design.md 决策（D-001/002/003@v1），技术路径确定，无未验证集成。

## Wave 1（并行，无依赖）
- [x] task-01: §4.6 quick 收尾从 session guard.json 读 guard（不依赖 progress.quickGuard）（覆盖：D-003@v1）
- [x] task-02: 新增 local-detect.js — detectLocalYaml 纯 fs 嗅探 + 单测（覆盖：D-001@v1）
- [x] task-03: verify-postcheck 支持 test_strategy:module 子集测试（覆盖：D-002@v1）

## Wave 2（依赖 Wave 1）
- [x] task-04: index.js `local detect` 路由 + scan.js 复用 detectLocalYaml（覆盖：D-001@v1）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | §4.6 quick 收尾读 session guard.json | W1 | P0 | — | D-003@v1 | run.js completeStep 收尾块从文件读 guard，跨进程 --done 不再跳过清理 |
| task-02 | 新增 local-detect.js detectLocalYaml + 单测 | W1 | P0 | — | D-001@v1 | 纯 fs 嗅探 package.json/pom.xml/build.gradle/Makefile，零 AI/零 token |
| task-03 | verify-postcheck test_strategy:module | W1 | P0 | — | D-002@v1 | 按 git diff 命中 module.path 跑子集，聚合 status，fallback commands.test |
| task-04 | local detect 路由 + scan 复用 | W2 | P0 | task-02 | D-001@v1 | index.js 加 `case 'local'`，scan.js:193 生成本地配置步骤调 detectLocalYaml |

## 关键路径

task-02 → task-04（detectLocalYaml 必须先存在，scan/CLI 才能 wiring）。task-01、task-03 为独立并行支线，不在关键路径上。

## 全局验收标准

- [ ] `npm test` 全绿（含新增 local-detect / verify-postcheck-module / quick-session-guard-cleanup 三份测试）
- [ ] （brownfield）local.yaml 无 `modules` 配置或无 `test_strategy` 时，verify-postcheck fallback 跑 `commands.test`，行为与现状一致
- [ ] （brownfield）session guard.json 不存在时，completeStep fallback 旧单文件 quick-guard.json → 都没有则跳过审计仅清理，不抛错
- [ ] `sillyspec local detect` 可独立运行并生成 local.yaml（不跑 scan）
- [ ] scan.js 生成本地配置步骤复用 detectLocalYaml，不重写探测逻辑
- [ ] machine-interface gate/derive 的 verify-test 透传逻辑不变（聚合 status 对外行为一致）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-04 | AC: `sillyspec local detect` 独立生成 local.yaml；scan 复用 detectLocalYaml |
| D-002@v1 | task-03 | AC: test_strategy:module 按 git diff 命中模块跑子集，聚合 status，无命中 fallback commands.test |
| D-003@v1 | task-01 | AC: completeStep 跨进程 --done 时从 session guard.json 读 guard，执行 auditQuickCompletion + 清理 session 目录 |

## 调用点搜索

本次无函数签名变更（`runVerifyTestCheck` 入参不变、`detectLocalYaml` 为新增、`completeStep` 为内部函数），无需搜索外部调用点。task-04 消费 task-02 的 `detectLocalYaml`，契约（provides/expects_from）在对应 TaskCard 中声明。
