---
plan_level: full
---

# 实现计划（Plan）— 2026-09-17-pass-cap-semantics

## Spike 前置验证

无——技术方案零新增依赖、全部落点经 Design Grill 独立审查逐 file:line 实证（18 项 checklist 0 fail），无不确定性。

## Wave 1（基础，无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2；两任务文件面不相交可并行）
- task-03
- task-04

## Wave 4（依赖 Wave 1-3；两任务文件面不相交可并行）
- task-05
- task-06

## Wave 5（依赖全部）
- task-07
- task-08

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | facts 管线 producer 扩写 | W1 | P0 | — | FR-01, FR-06, D-011, D-005@v2 | backfillFactsFromMdAndTests 增 integrationRan（首次 backfill 时点、quality-scan 记录自 specBase 推导自读）/dbScriptDeclarations/matrixPartialRows/runtimeEndpointExcluded；parseHandoverRows 三列扩四列+类型缺省映射+降级理由文法；parseDbScriptDeclarations 与 Runtime Evidence「不涉及」行识别文法（producer 侧）；verify-facts-schema additive 登记（5 字段） |
| task-02 | 封顶 validator + 豁免洞分层 + sourceTag | W2 | P0 | task-01 | FR-01, FR-02, D-001@v2, D-002, D-006, D-010, D-011 | validatePassEligibility 注册壳（同 validateAcceptanceMatrix 三参签名）+ evaluatePassEligibility 纯函数 + factsExpected 判定式；requiresEvidence :646-652 三处分层；change-risk-profile auditRuntimeReceipt sourceTag（本文件内按 command 来源分类） |
| task-03 | probe7 联动 + Runtime Evidence 收口 | W3 | P0 | task-01, task-02 | FR-03, FR-04, D-003, D-004 | validateAcceptanceMatrix partial/uncovered 分支（读 facts.handover，本体 MD 解析充当锚点）；Runtime Evidence 骨架降级路径提示与消费侧收口（行识别文法的解析写入归 task-01 producer） |
| task-04 | fix.sql 双门 + handover 互锁与注入 | W3 | P0 | task-01 | FR-05, FR-06, D-007, D-012, D-005@v2 | verify 侧事实③已在 task-02（声明面/diff 判定）；本任务落 worktree-apply 尾声 + archive --confirm 前置兜底门；db-script handover 互斥校验；archive Step3 prompt 注入 facts.handover 清单（severity 标注 blocking 置顶封顶渲染） |
| task-05 | 配套四小修 | W4 | P0 | task-01 | FR-07, FR-08, FR-09, FR-10, D-008 | skip 跨仓档位（mergeCrossRepoResults 前置短路）；adopt 勾选两层（白名单 + prefetchDiffFileSet 跨仓源）；probe7 多根（buildAcceptanceHints）；design 无段头降 warning |
| task-06 | prompt/清单新增 + 文档镜像 | W4 | P1 | task-02 | FR-11, D-009 | stages prompt 源新增两条目（角色生产口径/菜单 DML 对账）+ stage-review-checklist 落盘；verify prompt 封顶自查提示；node docs/prompt/_extract.mjs 再生镜像（verify.md/brainstorm.md/_extracted.json） |
| task-07 | 测试补全 | W5 | P0 | task-01~06 | 全 FR | NEW:test/pass-eligibility.test.mjs（四事实条件/全清 PASS/豁免洞分层/severity 映射降级三列兼容/facts 缺失双源/双门）；8 个既有测试文件就近补断言（cross-repo-verify / verify-handover-structured / verify-conclusion-slot / acceptance-matrix-probe / probe7-anchor-testfile / task-review-adopt / stage-review-checklist / design-facts） |
| task-08 | Wave 步骤完成度门 | W5 | P0 | task-05 | FR-12, D-013 | assertWaveTasksComplete：Wave N --done 时 fail-closed 校验本 Wave 任务 checkbox 全勾（autoCheck 先行幂等）；无 Wave 段 warn 放行；NEW:test/wave-task-complete-gate.test.mjs 直测。与 task-05 共享 run/complete.js 故 W4→W5 串行。动机=本变更执行中 Wave2 越位实证 |

## 关键路径
task-01 → task-02 → task-03 → task-07（producer→consumer→联动→测试，最长路径）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
1. **版本底线**：纯 JavaScript（ESM），无 TypeScript，无构建步骤；Node.js >= 22.13（node:sqlite）。
2. **零新依赖**：全部改动用本地正则/既有函数；不解析日志内容猜测（回执来源标签来自命令来源声明）。
3. **分层单向**：verify-probes → stage-contract 维持单向（矩阵事实经动态 import 传参，不造静态 import 环）。
4. **兼容铁律**：未触发事实条件行为零变化；存量三列 handover 零迁移；存量无 facts 变更沿用兼容口径；结论枚举三值 / facts schemaVersion / 平台同步协议不变。
5. **fail-closed 边界**：consumer 侧 facts 缺失（factsExpected=true）按条件触发拦下；producer 侧输入缺失 fail-open 注记；被拦出路=降级 NOTES 非失败。
6. **跨平台**：Windows / Linux / macOS 兼容（path.join、CRLF/LF 容忍，既有 parse 同风格）。

## 全局验收标准
1. `npm test` 全量通过（含新增 test/pass-eligibility.test.mjs 与 8 个既有文件增量断言，+60~80 断言）
2. 四事实条件各一态触发 error + 全清 PASS 态放行（FR-01 四态断言）
3. 未触发条件的存量场景行为零变化（兼容性断言）
4. explicit + integration-critical + NOTES 无 handover → error（豁免洞分层断言）
5. apply 集 ∩ db/*.sql ⊄ 声明集 → apply 与 archive --confirm 双阻断
6. severity 映射/降级理由文法/三列缺省兼容断言；db-script 互斥断言
7. `npm run lint`（check-syntax）通过
8. （brownfield）未配置新功能时行为不变——R-01/R-07 的 escape 路径（重跑扫描步/降级 NOTES）在报错文案中可达

## 覆盖矩阵（decisions.md 12 条 → FR → task）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v2 | task-02, task-07 | FR-01 四态断言 |
| D-002@v1 | task-02, task-07 | 豁免洞分层断言 |
| D-003@v1 | task-03, task-07 | 矩阵联动分支断言 |
| D-004@v1 | task-03, task-07 | Runtime Evidence 收口断言 |
| D-005@v2 | task-01, task-04, task-07 | severity 四列/互锁/注入断言 |
| D-006@v1 | task-02, task-07 | integrationRan 判定表断言 |
| D-007@v1 | task-04, task-07 | 双门断言 |
| D-008@v1 | task-05, task-07 | 四小修断言 |
| D-009@v1 | task-06 | 清单条目落盘 |
| D-010@v1 | task-02 | validator 注册壳形态 |
| D-011@v1 | task-01, task-02, task-07 | facts 锚定/双源断言 |
| D-012@v1 | task-02, task-04, task-07 | 事实③时序断言 |
| D-013@v1 | task-08 | Wave 门直测（全勾放行/未勾 exit 1/无段放行） |
