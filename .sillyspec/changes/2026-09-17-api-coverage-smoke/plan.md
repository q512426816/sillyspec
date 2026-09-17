---
plan_level: full
---

# 实现计划（Plan）— 2026-09-17-api-coverage-smoke

## Spike 前置验证

无——全部插位经 Design Grill 两轮逐 file:line 实证（含 B-1 分类链反例实测），零不确定性。

## Wave 1（基础，无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2）
- task-03

## Wave 4（依赖 Wave 2-3；两任务文件面不相交真可并行）
- task-04
- task-06

## Wave 5（依赖 Wave 3-4——validator 消费解析器产出与第五条件形态）
- task-05

## Wave 6（依赖全部）
- task-07

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | commands.smoke 配置与执行段 | W1 | P0 | — | FR-01, D-001, D-010 | config-schema 登记；verify-quality-scan 亲跑（300s 帽/快照超时回退主仓 lint 先例）；指纹自动含新键；实测记录 additive smoke 段；回执记录落盘（verify-logs/smoke-<change>.log） |
| task-02 | 机器段来源标记链 | W2 | P0 | task-01 | FR-03, D-003 | parseEvidenceSlots 逐条 source 提取（cli-noai-smoke 尾注回填）；classifyReceiptSourceTag/classifyReceiptCommandSource 双侧认标记直判 cross-layer（B-1 金路径闭合）；回执槽 ensure 式注入（:1905 先例）+缺态标注；checkProbeConsistency 增回执槽一致性对比 |
| task-03 | smokeRan producer + 第五条件 | W3 | P0 | task-01, task-02 | FR-02, D-002 | backfill 写 facts.smokeRan（五边界态封闭）；evaluatePassEligibility 加 smoke-not-run 枚举（判级限定/不设 handover 豁免子句/两出路文案） |
| task-04 | parseDesignApiTable + 矩阵骨架段 | W4 | P0 | task-02 | FR-05, FR-04, D-005, D-006 | tolerant 解析器（段头过滤+方法/路径双 token）；骨架「接口验证覆盖矩阵」段（预填/口径注记/声明占位）；消费面子行 advisory + 表间完备性 advisory 输出 |
| task-05 | validateApiCoverageMatrix validator | W5 | P0 | task-03, task-04 | FR-04, FR-05, FR-06, D-004, D-010 | covered 记账（分子只认 covered）；有效分母=N−non-testable；锚点解析级校验（design接口表#命中解析集）；partial/uncovered×零移交联动 error；探索性/子行不计账；声明降级；critical×零接口面 error |
| task-06 | prompt 纪律 + 清单 + 镜像 | W4 | P1 | task-03 | FR-07, D-008 | verify.js smoke 纪律段（命中条件注入四段）+ :197/:210 矛盾文案改写；checklist verify 键+渲染接线+快照 3→4；镜像三步流水线 |
| task-07 | 测试补全 | W6 | P0 | task-01~06 | 全 FR | NEW smoke-gate（执行三态+回退/指纹/机器段/分类器脚本形态回归/一致性对比/五边界/第五条件含 advisory 不豁免/config-schema 新键断言——不动 test/config-schema.test.mjs，其不在 design 清单）+ NEW api-coverage-matrix（解析五形态/covered 记账语义/锚点解析级/降级/advisory）+ 既有增量（pass-eligibility 第五条件态/verify-conclusion-slot smoke-not-run 文案/stage-review-checklist 断言增量——快照修改归 task-06，两者划界） |

## 关键路径
task-01 → task-02 → task-03 → task-05 → task-07（标记链→producer/consumer→validator→测试）

## 全局硬约束（据 design.md/requirements.md 要点汇编，绑定所有 task）
1. **版本底线**：纯 JavaScript（ESM），无 TypeScript，无构建步骤；Node.js >= 22.13。
2. **零新依赖**：解析器本地正则；分类器改词不改架构。
3. **分层单向**：stage-contract 保持零 import verify-probes（readFactsForEligibility 就地实现先例 stage-contract.js:966-969）；task-05 validator 消费 parseDesignApiTable 的路径钉死为「verify-probes 侧产出落盘/经 context 传参」，不在 stage-contract 内动态 import（Plan 审查 P1 修正——conclusion 先例方向为 verify-probes 顶层回指，非 stage-contract 反向）。
4. **兼容铁律**：未配置 commands.smoke 零行为变化；facts schemaVersion 与结论枚举不变；probe7/probe8 语义不动；存量 critical 变更首跑三条合法出路写入 error 文案。
5. **fail-closed 边界**：矩阵对账/第五条件为硬拦；解析零行零声明判级 critical → error；producer 记录缺失 fail-open 注记。
6. **跨平台**：Windows / Linux / macOS（path.join、CRLF/LF 容忍）。

## 全局验收标准
1. `npm test` 全量通过（含两个新测试文件与既有增量，+50~70 断言）
2. 配置 smoke 后 CLI 亲跑实录（exit/log/mtime 机器段）；未配置零行为；指纹命中复用
3. 判级 critical + smokeRan≠ran + PASS → smoke-not-run error；advisory handover 不豁免；非判级零行为
4. 脚本形态 smoke（node scripts/smoke.mjs）机器回执判 cross-layer（金路径不误拦）
5. 矩阵 covered 分子 < 有效分母 → error；uncovered/partial×零移交 → error；non-testable 理由合法；探索性/子行不计账
6. 解析零行零声明判级 critical → error；critical×声明 0 端点 → warning
7. 消费面/表间完备性 advisory warning 输出
8. `npm run lint` 通过；（brownfield）未配置新功能时行为不变

## 覆盖矩阵（decisions.md 10 条 → FR → task）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-07 | 执行三态+指纹+回退断言 |
| D-002@v1 | task-03, task-07 | 第五条件含 advisory 不豁免断言 |
| D-003@v1 | task-02, task-07 | 机器段/标记提取/一致性对比断言 |
| D-004@v1 | task-05, task-07 | covered 记账+联动断言 |
| D-005@v1 | task-04, task-05, task-07 | 解析五形态+降级断言 |
| D-006@v1 | task-04, task-07 | 子行 advisory 断言 |
| D-007@v1 | task-04, task-07 | 表间 warning 断言 |
| D-008@v1 | task-06 | prompt 段落盘+快照 |
| D-009@v1 | （边界） | 非目标对照 |
| D-010@v1 | task-01, task-05 | 硬度形态 |
