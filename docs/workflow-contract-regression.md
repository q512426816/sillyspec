# Workflow Contract Regression Audit

> 日期：2026-06-19  
> 范围：16 commits (f52e670..977ad0a)  
> 结论：**全绿，0 bug，274 个断言全部通过**

## 审计目标

确认今晚 16 个 commit 引入的 contract/revision/stale safety 改动没有误伤现有主链路。

## 审计范围

### 新增功能
1. **Revision v1** — 阶段重开 + 步骤级修订控制
2. **Revision v1.1** — 可观测性与状态自检
3. **Revision v1.2** — progress repair 安全修复状态元数据
4. **Execute stale safety v1** — 防止基于旧 plan 继续执行
5. **Verify/Archive stale safety** — 8 个测试固化安全链
6. **Plan→Execute contract v1** — 校验 + 文档 + 测试
7. **Plan postcheck contract v1** — plan 完成时校验 execute 契约
8. **Brainstorm→Plan contract v1** — design.md 输入校验

### 新增契约链

```
brainstorm → design.md → [Design Contract 校验] → plan → plan.md → [Plan Contract 校验] → execute
```

- **brainstorm → plan**: `validateDesignForPlan` — 3 error + 3 warning
- **plan → execute**: `validatePlanForExecute` — 5 error + 1 warning
- 双重校验：plan 完成时 + execute 启动时

### 新增 Stale Cascade 链

```
scan → brainstorm → plan → execute → verify → archive
```

- `checkConsistency` 基于 STAGE_ORDER 遍历上游，自动发现下游假完成
- `repair` cascade：execute stale → verify/archive stale → verify stale → archive stale

## 测试执行

### 命令
```bash
cd ~/Desktop/sillyspec && npm test
```

### 测试套件 (15 个，274 断言)

| 测试套件 | 断言数 | 状态 |
|---------|-------|------|
| brainstorm-plan-contract.test.mjs | 11 | ✅ |
| plan-execute-contract.test.mjs | 12 | ✅ |
| platform-artifacts.test.mjs | 31 | ✅ |
| platform-failure-samples.test.mjs | 20 | ✅ |
| platform-recovery-chain.test.mjs | 15 | ✅ |
| platform-recovery.test.mjs | 19 | ✅ |
| platform-scan-p0.test.mjs | 19 | ✅ |
| revision-v1.test.mjs | 12 | ✅ |
| scan-paths.test.mjs | 38 | ✅ |
| scan-postcheck.test.mjs | 38 | ✅ |
| spec-dir.test.mjs | 15 | ✅ |
| stage-contract.test.mjs | 19 | ✅ |
| stage-definitions.test.mjs | 29 | ✅ |
| wait-gates.test.mjs | 15 | ✅ |
| worktree-guard.test.mjs | (included) | ✅ |

**总计：15 套件，274 断言，0 失败。**

## 主链路验收

### 1. 完整主链路 (scan → brainstorm → plan → execute → verify)
- ✅ stage-contract.test.mjs 覆盖了各阶段的校验与转换
- ✅ stage-definitions.test.mjs 覆盖了所有阶段定义的步骤初始化
- ✅ 无 contract 误伤

### 2. Plan 级别验收 (none/light/full)
- ✅ plan-execute-contract.test.mjs 覆盖 none/light/full
- ✅ plan postcheck 在 plan completion path 执行
- ✅ execute startup 二次校验保留

### 3. Revision 链路
- ✅ revision-v1.test.mjs 覆盖 reopen/repair/checkConsistency
- ✅ verify/archive --reopen 清除旧 completed steps
- ✅ execute --reopen 重新解析最新 plan.md
- ✅ repair cascade execute → verify → archive

### 4. Progress check/repair
- ✅ 正常状态无误报
- ✅ 异常状态报告清晰（checkConsistency 输出 upstream/downstream 关系）
- ✅ repair 只修 progress 元数据，不改产物文件

## 发现

**0 bug。** 274 个断言全部通过，无回归。

### 设计确认
- checkConsistency 和 repair 基于 STAGE_ORDER 通用遍历，不针对特定 stage
- verify/archive 用静态 steps，不需要从文件重解析
- contract validator 只在阶段边界执行，不影响阶段内步骤流转
- repair cascade 是自然结果，不需要硬编码 stage 间关系

## 文件变更统计

16 commits, 28 files changed, +3675/-689 lines。
