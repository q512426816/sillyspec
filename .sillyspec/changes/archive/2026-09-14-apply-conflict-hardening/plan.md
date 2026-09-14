---
author: qinyi
created_at: 2026-09-14 14:20:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-14-apply-conflict-hardening

## 复杂度分类

```
plan_level: full
reason: 文件清单 10 项跨 worktree/change-management/core-engine/cli-entry 四模块，涉及 fail-closed 语义与新检测面（manifest 指纹），两轮 Grill 收敛
estimated_files: 10
cross_module: true
has_schema_change: false
has_state_machine_change: false
needs_parallel_execution: false
needs_human_review: true
```

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖前序 Wave）
- task-02
- task-03

## Wave 3（依赖前序 Wave）
- task-04

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 收口层：merge 写回 add+三出口 manifest+rescue 指引 | W1 | P0 | — | FR-01, FR-02, D-001@v1, D-003@v1 | worktree-apply.js 单文件三改点 |
| task-02 | 拦截层：guard 收集导出+锁内相交预检+flag 接线 | W2 | P0 | task-01 | FR-03, D-002@v1 | quicklog/worktree-apply/index 三文件；三分支语义（exit 1/--force/autoApply 软跳过） |
| task-03 | 检测面：doctor 漂移检查+ROADMAP+§64 状态 | W2 | P1 | task-01 | FR-04, D-004@v1, D-005@v1 | doctor-diagnostics+两文档；与 task-02 路径正交可并行 |
| task-04 | 测试与模块卡：集成测试四块+三卡同步 | W3 | P1 | task-01, task-02, task-03 | 全 FR | 真 git 临时仓；三卡收尾登记 |

## 关键路径
task-01 → task-02 → task-04（收口层→拦截层→测试卡）

## 全局验收标准
1. npm test / npm run lint 全绿（新增 apply-conflict-hardening 集成测试四块）
2. merge 写回后该批文件全部 staged（含新增）——集成断言
3. 三成功出口均产 manifest 且 files 覆盖实际落盘面
4. 相交四态：空集零变化/CLI 拦截 exit 1 带会话×文件对/--force 放行留痕/autoApply 软跳过+warning
5. doctor：篡改一字节报漂移/未篡改零告警（哈希口径=staged blob LF 规范态，worktree 比对前 CRLF 归一）/无 manifest 零输出
6. rescue 输出含 git add 指引行；ROADMAP 含观察项；troubleshooting §64 状态更新
7. 存量项目（无活跃交集/无 manifest）行为零回归

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | 全局验收 2/3 |
| D-002@v1 | task-02 | 全局验收 4 |
| D-003@v1 | task-01 | 全局验收 6 |
| D-004@v1 | task-03 | 全局验收 6（ROADMAP） |
| D-005@v1 | task-01, task-03 | 全局验收 3/5 |
| FR-01~04 | task-01~04 | 见各验收 |
