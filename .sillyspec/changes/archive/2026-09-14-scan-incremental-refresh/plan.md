---
plan_level: full
---

# 实现计划（Plan）— 2026-09-14-scan-incremental-refresh

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-03
- task-04

## Wave 2（依赖前序 Wave）
- task-05

## Wave 3（依赖前序 Wave）
- task-06

## Wave 4（依赖前序 Wave）
- task-07
- task-08

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | scan-diff 聚合改「落后最多」+ collectStaleRefs/parseNameStatus 导出 | W1 | P0 | — | FR-4, D-003@v2, D-009@v1 | staleRefs 命中段抽导出（防双源漂移）；存量单文档断言不动 |
| task-02 | scan-staleness 基线收集改全文档聚合 | W1 | P0 | — | FR-4, D-003@v2 | 去 break 全收集取落后最多；存量单文档断言不动，新增异基线用例 |
| task-03 | bumpScanDocBaselines 独立盖章函数 + 单测 | W1 | P0 | — | FR-3, D-002@v1 | 不动 stampScanDocHeaders 只补缺契约；建 scan-refresh.test.mjs 首版 |
| task-04 | worktree-guard 握手分支 + 7/40 归一化修复 | W1 | P0 | — | FR-7, D-007@v1 | 前置分支（mode=scan-refresh 白名单）；存量用例不删不改 |
| task-05 | scan-refresh 计算层 computeRefreshPlan（含纯函数单测） | W2 | P0 | task-01, task-04 | FR-2, FR-5, D-002@v1, D-004@v1, D-005@v1, D-007@v1, D-008@v1 | dirtyCheck/三硬一软门/per-doc 分组 diff/受影响集/工单材料/guard 握手原子写 |
| task-06 | scan-refresh IO 面 + index.js 接线 | W3 | P0 | task-03, task-05 | FR-2, FR-3, FR-6, D-002@v1, D-009@v1 | runRefresh/finalizeRefresh（内容比对门/specDir 转换/审计）；help 检出极限声明 |
| task-07 | 全链路 e2e（临时 git 仓） | W4 | P0 | task-06 | FR-1~FR-8, D-007@v1 | 门控四类拒绝/软门 force/编辑放行/bump 闭环/下轮 diff 新基线起算 |
| task-08 | 契约文档同步 | W4 | P1 | task-06 | FR-6, FR-7 | platform-interface-map 锚点 + file-lifecycle 刷新行 + guard 行为变化说明 |

## 关键路径
task-01 → task-05 → task-06 → task-07（scan-diff 导出 → 计算层 → IO/接线 → e2e）

## 全局验收标准
1. `npm test` 全量通过（464+ 用例 + 本变更新增）
2. `npm run lint` 0 告警
3. docs check 全过（新增锚点登记后）
4. （brownfield）未跑 `scan refresh` 时 scan diff/staleness/guard 存量行为回归全绿——存量用例不删不改
5. e2e 断言：受影响文档 source_commit 推进、未受影响不动、下轮 diff 从新基线起算、白名单外文档保护不放松

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-05, task-07 | e2e 断言写面限界（modules/knowledge 零写入） |
| D-002@v1 | task-03, task-05, task-06 | 两拍命令面 + 工单渲染 + per-doc 盖章函数 |
| D-003@v2 | task-01, task-02 | 落后最多聚合回归用例（双消费方） |
| D-004@v1 | task-05, task-07 | dirty fail-closed 用例 |
| D-005@v1 | task-05, task-07 | 三硬一软门用例 |
| D-006@v1 | task-06, task-08 | help/工单/审计检出极限声明 |
| D-007@v1 | task-04, task-05, task-07 | 白名单放行 + 7/40 归一化用例 |
| D-008@v1 | task-05, task-07 | 三处 scope 口径用例 |
| D-009@v1 | task-01, task-05, task-06, task-07 | 聚合键/内容比对门/specDir 口径用例 |
