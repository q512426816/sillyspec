---
author: qinyi
created_at: 2026-09-14 19:40:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-14-change-ownership-guards

## 复杂度分类

```
plan_level: full
reason: schema v6 迁移（数据模型）+跨 progress/worktree/runtime/cli-entry/core-engine/setup 六模块+fail-closed 语义（所有权四态/旁路堵点/终态空源）
estimated_files: 20
cross_module: true
has_schema_change: true
has_state_machine_change: false
needs_parallel_execution: false
needs_human_review: true
```

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖前序 Wave）
- task-02

## Wave 3（依赖前序 Wave）
- task-03

## Wave 4（依赖前序 Wave）
- task-04

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 数据层：v6 迁移+config+owner API+投影扩列 | W1 | P0 | — | FR-01, D-005@v1 | db/shared/progress/change-registry/config-schema/example 六文件；连带 platform-sync-schema 五处断言随 bump |
| task-02 | 所有权语义：三级标识+三分支+flag 全量注册 | W2 | P0 | task-01 | FR-01, D-001@v1 | progress 链+index.js（apply/cleanup/assess 三接线点）+run/command.js（--takeover/--session/--skip-apply 白名单）；归档/quick 链两点在 task-03 文件内由 task-03 接线（消费 task-02 导出的 assertChangeOwnership——plan-review 阻断1 归边） |
| task-03 | 收口与归因：归档门+放行过滤+模式分流+所有权两接线 | W3 | P0 | task-01, task-02 | FR-02, FR-03, D-001@v1, D-002@v1, D-003@v1, D-004@v1 | worktree-apply（两路径）+complete-handlers（归档门+quick 链所有权接线）+task-review；连带测试 worktree-apply-review-allowlist 用例 1 断言翻转 |
| task-04 | 测试与模块卡：集成测试+六卡+AGENTS.md 铁律 | W4 | P1 | task-01, task-02, task-03 | 全 FR | 真 git 临时仓；progress/worktree/runtime/cli-entry/core-engine/setup 六卡 |

## 关键路径
task-01 → task-02 → task-03 → task-04

## 全局验收标准
1. npm test / npm run lint 全绿（新增 change-ownership-guards 集成测试）
2. v5→v6 幂等迁移（列存在跳过）；存量 owner=NULL 无主零回归
3. 所有权四态（自有放行/活跃拒绝列 owner+指引/窗口外自动接管/--takeover 留痕）
4. 五接线点全覆盖含 assess 自动 apply 与 quick 轻量归档链（旁路零残留）
5. 归档：未 apply 面阻断+--skip-apply 留痕放行；无交付面零变化
6. 放行：外来声明剔除进违规报告；allow 面内（含 facade 转发类有据越界）不受影响
7. 归因：worktree 模式零依赖主仓窗口；分支已删=空集+注记；NULL 存量按 meta 路由
8. AGENTS.md 铁律+flag 回退示例；六卡登记

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-03 | 全局验收 3/4 |
| D-002@v1 | task-03 | 全局验收 5 |
| D-003@v1 | task-03 | 全局验收 6 |
| D-004@v1 | task-03 | 全局验收 7 |
| D-005@v1 | task-01, task-02 | 全局验收 2 + 投影扩列 |
| FR-01~03 | task-01~04 | 见各验收 |
