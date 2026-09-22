---
author: qinyi
created_at: 2026-09-23 00:20:00
plan_level: light
execution_mode: main
plan_level_reason: light——9 文件但 5 task 单仓 2 模块、无并行派发/无 worktree 调度基建、execution_mode=main 串行直写（full 触发条件均不满足，postcheck 规模信号注记）
---

# 轻量计划（Light Plan）：旧流程阶段折叠（burst 模式）+ flow 缺省翻回 legacy

## 来源
brainstorm 冻结版设计（design.md 四 Phase + Grill 双轮 pass）与任务书 round5/prompt-stage-burst.md；法证依据 round5/r5l-forensic-verdict.md §二①（CLI 状态机往返 +29.1M token）。

## 范围
- FR-01/FR-04（task-01）：src/run/shared.js 新增 readStageBurst（readLocalYamlRaw+js-yaml 读 stage.burst，env SILLYSPEC_STAGE_BURST=0/1 覆写）
- FR-02（task-02）：src/run/stage.js 抽取 executeNoAiCliAction 与阶段收尾助手；runStage burst 渲染分支（白名单 brainstorm/plan/execute）
- FR-03/FR-06（task-03）：src/run/complete.js 新增 completeStepBurst（循环包装：轮首尾随 stale 拉回/printNext:false/每轮 P0-2 合成/answer 快照单次消费/step 断言仅首轮/50 轮上限；completeStep 本体零 diff）；src/run/command.js :1727/:2073 两处 --done 分发接 burst 门（auto 路径跳过 :2064-2070 预合成）
- FR-05（task-04）：src/flow.js readFlowConfig 缺省 thin→legacy（:66/:76 + :18/:62/:124 文案）；src/config-schema.js :170 desc 文案同步；test/flow-protocol.test.mjs / test/flow-route.test.mjs / test/flow-draft.test.mjs fixtures 补 flow: mode: thin
- 验收全 FR 面（task-05）：NEW:test/stage-burst.test.mjs burst 机制测试（七组：配置三态/渲染折叠/等价性/断点/answer 消费/尾随 stale/逃生阀——覆盖 FR-01~FR-06 行为面）

## 验收
- AC-01（验收书 1）：burst 开启时 brainstorm/plan/execute 各恰好 2 次 CLI 调用走通，done 逐步打印每步完成行（fixture 实证）
- AC-02（验收书 2）：同 fixture 双跑 burst on/off——各步 postcheck 与 completeStageGates 判定一致；burst 中途门禁失败停在失败步、progress 态与逐步模式失败态一致
- AC-03（验收书 3）：burst 缺省 OFF——全量 npm test 零回归
- AC-04（验收书 4）：SILLYSPEC_STAGE_BURST=0 逃生阀生效（配置 true 下仍单步渲染）
- AC-05（验收书 5）：flow 族三测试文件修后全绿；npm test + lint 全过；本仓 local.yaml 自举（不入提交面）

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-03/AC-04 |
| D-002@v2 | task-02 | AC-01/AC-02 |
| D-003@v2 | task-03 | AC-01/AC-02 |
| D-004@v2 | task-03 | AC-02 |
| D-005@v1 | task-03 | AC-02 |
| D-006@v1 | task-02, task-03 | AC-03 |
| D-007@v1 | task-01 | AC-04 |
| D-008@v1 | task-02 | AC-03 |
| D-009@v1 | task-03 | AC-01 |
| D-010@v2 | task-04 | AC-05 |
| D-011@v1 | task-01~task-05 | AC-01~AC-05 |
