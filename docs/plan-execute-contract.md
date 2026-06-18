---
author: qinyi
created_at: 2026-06-19 00:25:00
---

# Plan → Execute Contract

## 核心契约

`plan.md` 是 execute 阶段的**唯一任务蓝图输入**。execute 不从其他来源（brainstorm、tasks.md、agent 记忆）获取任务列表。

## plan.md 格式要求

### Checkbox Task（必须）

execute 通过 checkbox 解析任务，格式：

```markdown
- [ ] task-01: 实现用户认证模块
- [ ] task-02: 添加权限校验中间件
- [ ] task-03: 编写集成测试
```

### Task ID 规则

- 格式：`task-XX`（XX 为数字，建议两位补零）
- 必须唯一：同一 plan.md 内不能有两个相同 task id
- 建议连续：从 task-01 开始递增
- 不能为空：每个 checkbox task 必须有 id

### Task Name 规则

- 必须非空
- 清晰描述任务内容

### Wave 分组

```markdown
## Wave 1
- [ ] task-01: 搭建项目骨架
- [ ] task-02: 配置 CI/CD

## Wave 2
- [ ] task-03: 实现业务逻辑
```

- Wave 内任务无依赖（可并行）
- Wave 间有依赖（按序执行）
- Wave 只能引用已存在的 task

## 校验规则

execute 进入前调用 `validatePlanForExecute(planContent)`：

| # | 规则 | 级别 |
|---|------|------|
| 1 | plan.md 非空 | error |
| 2 | 至少有一个 checkbox task | error |
| 3 | task id 唯一 | error |
| 4 | task id 连续（task-01 起） | error |
| 5 | task name 非空 | error |
| 6 | task 有 id（无 id 只 warning） | warning |

校验失败 → fail-fast，不进入 execute。
校验通过但有 warning → 继续执行，提示警告。

## 复杂度场景

### none（最小变更）
```markdown
## Wave 1
- [ ] task-01: 修复 bug
```
至少 1 个 checkbox task。

### light（轻量变更）
```markdown
## Wave 1
- [ ] task-01: 添加 API 端点
- [ ] task-02: 添加前端调用
```
1 个 Wave，2-3 个 task。

### full（完整变更）
```markdown
## Wave 1: 基础设施
- [ ] task-01: 数据库 schema
- [ ] task-02: 模型定义

## Wave 2: 业务逻辑
- [ ] task-03: API 实现
- [ ] task-04: 业务规则

## Wave 3: 测试
- [ ] task-05: 集成测试
```
多个 Wave，每个 Wave 1-N 个 task。

## execute reopen 契约

当 execute 被 `--reopen` 时：
1. **必须从最新 plan.md 重新解析 steps**（不复用旧 task/wave）
2. 如果 plan.md 已变更（wave 数量变了），execute steps 会反映最新状态
3. 旧 completed steps 不保留（全部回到 pending/stale）

## 错误处理

| 场景 | 行为 |
|------|------|
| plan.md 不存在 | 生成默认 3 Wave（向后兼容） |
| plan.md 存在但无 checkbox | fail-fast |
| task id 重复 | fail-fast |
| task id 不连续 | fail-fast |
| plan.md 被修改后 execute reopen | 重新解析，使用最新 wave/task |

## 双重校验

契约在两个时点执行：

1. **plan 完成时**（plan postcheck）：plan.md 不合法 → 阻断 completed，plan 阶段无法完成
2. **execute 启动时**（execute entry）：plan.md 不合法 → fail-fast，不进入 execute

这确保 plan.md 在进入 execute 之前就是合法的，execute 启动时的校验是二次保险。
