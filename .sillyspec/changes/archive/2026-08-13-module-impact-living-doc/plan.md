---
author: qinyi
created_at: 2026-08-13 10:10:00
plan_level: full
---

# 实现计划（Plan）：module-impact.md 分阶段生成 + archive 终审

## Spike 前置验证
无。纯 prompt 注入 + validator 规则 + 校验链路补全，技术方案确定（design Grill 已验证 review_plan 是 LLM 步骤、condition 引擎支持 scale）。

## Wave 1（并行，无依赖）：plan 首版生成机制 + validator
- [x] task-01: plan.js review_plan 步骤 prompt 注入生成 module-impact.md 首版指引（复用 archive extract-module-impact 核心文本，注释同源；含无 _module-map.yaml 降级语义；**显式指引 agent 用 design.md 文件变更清单 + plan.md 任务列表作输入**——review_plan 在 generate_blueprints 之前，TaskCard/allowed_paths 未生成）（覆盖：FR-01, FR-07, D-001@v2, D-004@v1, D-008@v1）
- [x] task-02: stage-contract-spec.js 新增 `plan.module-impact.exists`（error, condition scale≠small, root=change）（覆盖：FR-02, FR-08, D-002@v1, D-003@v2）
- [x] task-03: stage-contract.js validatePlanOutputs 加 design.md scale 读取链路，`evaluateRules('plan', { changeDir, scale })`（覆盖：FR-03, D-009@v1）

> Wave 1 三 task 文件正交（plan.js / stage-contract-spec.js / stage-contract.js），可并行。task-02 的 condition 依赖 task-03 的 scale 链路才生效——集成验证在 Wave 4。

## Wave 2（依赖 Wave 1）：后续阶段更新 + archive 终审
- [x] task-04: execute.js Wave 步骤 prompt 加「主代理 Wave 后汇总更新 module-impact.md」指引（覆盖：FR-04, D-007@v1）
- [x] task-05: verify.js「输出验证报告」步骤 prompt 加核对 module-impact.md 指引（覆盖：FR-05）
- [x] task-06: archive.js extract-module-impact 步骤改写为最终确认（**不改 step 名只改 prompt**——D-005@v2，消除 stage-definitions.test.mjs:37 硬编码断点；无 migratedFrom 成本）（覆盖：FR-06, D-005@v2, D-008@v1）

> Wave 2 三 task 文件正交（execute.js / verify.js / archive.js），可并行。逻辑上依赖 Wave 1（首版生成机制先建立，后续阶段才更新/终审）。

## Wave 3（依赖 Wave 1-2）：文档 + 提示词 + skills 同步
- [x] task-07: docs/sillyspec/file-lifecycle.md 记录 module-impact.md 在 plan(large) 生成 + archive 终审（更新 updated_at）
- [x] task-08: 跑 `node docs/prompt/_extract.mjs` 再生 _extracted.json + 同步 docs/prompt/plan.md/execute.md/verify.md/archive.md
- [x] task-09: .claude/skills/ 对应 skill 同步 module-impact 要点

> Wave 3 反映 Wave 1-2 的实际 prompt 改动，必须在其后。

## Wave 4（依赖 Wave 1-3）：受影响测试修复
- [x] task-10: 修受影响测试（archive 相关：run-complete-step-archive / archive-cli-git-add / archive-idempotent-selfheal / archive-sync-module-docs-wait；plan validator 相关）+ 跑全量 npm test

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | plan.js review_plan 注入 module-impact 生成指引 | W1 | P0 | — | FR-01, FR-07, D-001@v2, D-004, D-008 | 复用 archive 核心文本 + 降级语义 |
| task-02 | stage-contract-spec 新增 plan.module-impact.exists | W1 | P0 | — | FR-02, FR-08, D-002, D-003 | error + condition scale≠small |
| task-03 | stage-contract validatePlanOutputs 加 scale 链路 | W1 | P0 | — | FR-03, D-009 | 参照 validateBrainstormOutputs:264-272 |
| task-04 | execute.js Wave 注入主代理汇总更新指引 | W2 | P0 | W1 | FR-04, D-007 | 主代理 Wave 后汇总（非子代理各改） |
| task-05 | verify.js 输出报告注入核对指引 | W2 | P0 | W1 | FR-05 | 核对 module-impact 与实际变更一致 |
| task-06 | archive.js step2 改最终确认 | W2 | P0 | W1 | FR-06, D-005@v2, D-008 | 不改 step 名只改 prompt（消除 stage-definitions 断点） |
| task-07 | file-lifecycle.md 同步 | W3 | P0 | W1-2 | — | 记录多阶段生成 |
| task-08 | docs/prompt 再生 | W3 | P0 | W1-2 | — | 跑 _extract.mjs |
| task-09 | .claude/skills 同步 | W3 | P0 | W1-2 | — | plan/execute/verify/archive skill |
| task-10 | 受影响测试修复 + 全量 npm test | W4 | P0 | W1-3 | — | archive + plan validator 测试 |

## 关键路径
task-01 → task-06 → task-08 → task-10（prompt 改动 → 文档再生 → 测试验证，最长路径）

## 全局验收标准
- [ ] 所有单元测试通过（npm test 全绿，含修好的 archive/plan validator 测试）
- [ ] npm run lint 通过
- [ ] plan.js review_plan 步骤 prompt 含「生成 module-impact.md」指引（grep 可机械验证，FR-01 注入落地）
- [ ] plan 完成 validator 校验：large 缺 module-impact.md 阻断（FR-02），small 豁免不阻断（FR-08）
- [ ] 无 _module-map.yaml 时 plan 生成降级 unmapped 版不阻断（FR-07）
- [ ] archive step2 改终审后，归档流程仍正常（archive 测试通过）
- [ ] （brownfield）既有变更（无 module-impact 要求的历史 change）行为不受影响——validator 仅作用于新 plan 完成

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v2 | task-01 | large 在 review_plan 生成（非 postcheck） |
| D-002@v1 | task-02 | plan.module-impact.exists error |
| D-003@v2 | task-02 | condition scale≠small（small 豁免） |
| D-004@v1 | task-01 | prompt 含降级语义 |
| D-005@v2 | task-06 | archive step2 终审（不改名只改 prompt） |
| D-006@v1 | 全局约束 | 不抽公共生成函数（方案 A） |
| D-007@v1 | task-04 | execute 主代理汇总 |
| D-008@v1 | task-01, task-06 | archive prompt 复制同源 |
| D-009@v1 | task-03 | validatePlanOutputs scale 链路 |
| FR-01 | task-01 | AC: review_plan 后 module-impact 落盘 |
| FR-02 | task-02 | AC: large 缺 module-impact 阻断 plan |
| FR-03 | task-03 | AC: validator condition 生效 |
| FR-04 | task-04 | AC: execute prompt 含主代理汇总指引 |
| FR-05 | task-05 | AC: verify prompt 含核对指引 |
| FR-06 | task-06 | AC: archive step2 终审 |
| FR-07 | task-01 | AC: 无映射降级不阻断 |
| FR-08 | task-02 | AC: small 豁免不阻断 |
