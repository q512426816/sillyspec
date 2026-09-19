---
author: qinyi
created_at: 2026-09-19 06:21:22
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-03

## Wave 2（依赖 Wave 1）
- task-04

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 判定层：covered-service 计分子+锚点硬约束+advisory+门禁文案 | W1 | P0 | — | FR-01, FR-02, D-001@v1, D-002@v1 | src/stage-contract.js 六改点（白名单/matrixEvidenceMissing/锚点分支/记账/advisory/文案四处） |
| task-02 | 骨架与指引八面文案中的六面 | W1 | P0 | — | FR-02 | renderApiCoverageMatrixLines 五选一+占位两处、probe7 注记 :1929+:1930、stages/verify.js、模板、index.js :1212 |
| task-03 | 预检器认新枚举 | W1 | P0 | — | FR-02, D-002@v1 | probe7-anchor-check.js :70/:72——advisory 预检不跳过 covered-service |
| task-04 | 测试五组 + 断言同步 + 全量验证 | W2 | P0 | task-01,02,03 | FR-01, FR-02 | api-coverage-matrix.test.mjs 新用例+断言同步、acceptance-matrix-probe.test.mjs :213、npm test 全量 |

## 关键路径
task-01 → task-04（判定层是测试的判定基准；task-02/03 与 task-01 并行无阻塞）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- 存量四枚举文档校验行为逐字不变：covered/partial/uncovered/non-testable 路径零改动（covered-service 是纯新增分支）。
- covered-service 锚点校验复用同文件 matrixEvidenceHasAnchor（:817 三形态），禁第二套解析文法。
- 零 facts schema 变更：verify-facts.json 零新字段，advisory 由 stage-contract 从 MD 槽直接判。
- stage-contract 零 import verify-probes 铁律不破（零新增依赖边）。
- 移交联动（:1247/:1248）与 PASS 封顶条件④零改动——covered-service 不进 partial/uncovered 集是设计核验事实，执行期不许顺手改这两处。
- 不做 service 承接占比上限；不动回执门禁/集成证据门/写端点权限 advisory。
- 八面文案全部呈现五枚举口径（covered/covered-service/partial/uncovered/non-testable）。
- 零新正则零路径拼接（Windows/macOS/Linux 无差）。

## 全局验收标准
1. npm test 全量通过（含五组新用例与既有回归）
2. 纯四枚举文档行为逐字不变（向后兼容回归组）
3. covered-service 行：计分子放行 + 缺测试锚点 error + advisory 计数 + 不触发移交/封顶

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02, task-04 | 五组用例①②③（计分子/缺锚点/advisory） |
| D-002@v1 | task-01, task-03, task-04 | 用例④（验收矩阵联动不误报 unfilled）+ anchor-check 预检 |
| D-003@v1 | task-01..04（方案 A 全篇） | 全局验收 1-3 |
