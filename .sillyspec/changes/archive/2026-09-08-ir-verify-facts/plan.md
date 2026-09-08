---
author: qinyi
created_at: 2026-09-08T23:30:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（基础层，无依赖）
- task-01

## Wave 2（并行，依赖 Wave 1）
- task-02
- task-04

## Wave 3（并行，依赖 Wave 2）
- task-03
- task-05

## Wave 4（收口，依赖 Wave 1-3）
- task-06

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | facts v2 schema 单点模块 + 构建与分段合并写入 | W1 | P0 | — | FR-01, D-001@v2, D-005@v2 | NEW:src/verify-facts-schema.js（FACTS_SCHEMA_VERSION/EVIDENCE_STATUS/EXEMPTION_RE/classifyVerifiedFile/validateFactsV2/parseEvidenceSlots）+ verify-probes.js（buildVerifyFacts 四段扩展、writeVerifyFacts 分段合并、骨架两槽段渲染、backfillFactsFromMdAndTests、md 槽段缺失补齐）+ index.js --init 守卫接线 + NEW:test/verify-facts-v2.test.mjs + 修改 test/verify-probes-facts.test.mjs（schemaVersion 1→2 与章节数断言随 task-01 同步修正——既有测试必红认领） |
| task-02 | requiredEvidence 分类核验升级 | W2 | P0 | task-01 | FR-02, D-001@v2 | verify-postcheck.js runVerifyRequiredEvidenceCheck v2（分类核验：代码类 存在×mtime×diff 交集 / 运行时产物类豁免 diff；legacy 降级）+ progress.js getStageCompletedAt（verifyStartAt 基准）+ NEW:test/verify-evidence-triple.test.mjs |
| task-04 | 集成回执一致性校验 | W2 | P0 | task-01 | FR-04, D-003@v1 | change-risk-profile.js checkIntegrationEvidence v2（绿判据四条件 + 签名噪声剔除引 verify-postcheck 先例）+ stage-contract.js:613 调用点传参（runtimeEvidence/verifyStartAt/specBase，经 parseEvidenceSlots）+ 回执测试入 NEW:test/verify-receipt-rerun.test.mjs |
| task-03 | cannot_verify 硬门与执行次序接线 | W3 | P0 | task-02, task-04 | FR-03, D-002@v1 | gates.js verify 收尾：backfill（md 槽段）先行 → runValidators → test 实测二次回填 tests 段 → cannot_verify 硬门（missing 无豁免阻断）+ 失败输出 + W3 接线后补 gates 级 e2e 断言（函数级 blocked 在 task-02 测试先行） |
| task-05 | facts 基线对比维度 | W3 | P0 | task-02 | FR-05, D-001@v2 | verify-postcheck.js checkProbeConsistency 增 vs facts 快照对比（分级 probe1/6=ERROR、probe3/5=WARNING，继承 HEAD-advance 降级）+ factsConsistency 段固化 + 基线对比测试入 test/verify-receipt-rerun.test.mjs |
| task-06 | 槽位指引与文档同步 | W4 | P1 | task-01, task-03, task-05 | FR-06, D-005@v2 | stages/verify.js step2/step7 槽位指引 + docs/prompt 镜像（_extract/_sync）+ core-engine/stages/runtime/progress 卡与 sidecar + --done 回填链路收口断言 |

## 关键路径
task-01 → task-02 → task-05（最长路径；task-03 同层并行不延长）

## 全局验收标准
1. 全部单测通过：三个新测试文件覆盖 FR-01/02/04/05 的 GWT 全分支（含 legacy 降级三分支）
2. 存量兼容零回归：无槽 md / facts v1 / 无 evidence 需求变更走 legacy 或 skipped，npm test 全量套件与基线一致（11 个并行 flaky 除外，单跑复核）
3. 门禁语义验收：cannot_verify 无豁免 missing 阻断、无绿回执 integration-critical 阻断、facts 手改对齐后基线对比报出（W4 收口断言）
4. 未配置场景行为不变：quick 流程零影响（本变更不触碰 quick 路径）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v2 | task-01, task-02, task-05 | AC-1（槽/固化的双层写入模型 + slot-backfill 边界测试） |
| D-002@v1 | task-03（范围圈定） | AC-4（文件面全在 verify 域，plan 不含 Wave 派生/archive/doctor 任务） |
| D-003@v1 | task-04 | AC-3（回执绿判据四条件，无代跑代码） |
| D-004@v1 | —（非目标） | 本变更不触碰 runVerifyLintCheck advisory 语义（AC-4 旁证） |
| D-005@v2 | task-01, task-06 | AC-1（schema 单点 verify-facts-schema.js，四方 import 同源断言） |
