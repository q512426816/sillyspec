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

## 跨任务字段契约（provides / expects_from）

### 问题背景

跨 task 的接口/DTO/响应消费场景中，consumer task 常因「误以为 provider 已实现某字段」而 fallback 编造，导致运行时 403/500。

典型链路：前端 task 期望后端 DTO 含 `daemon_instance_id` → 后端 task 漏实现该字段 → 前端拿不到 → fallback 成 `runtime_id` → PUT 鉴权 403。这类 bug 在 plan/execute 阶段无任何拦截，到运行时才暴露。

### 机制

TaskCard frontmatter 新增两个**可选**字段，让跨任务契约显式化：

```yaml
# provider task（产出接口/DTO/响应的一方）
provides:
  - contract: DaemonRuntimeRead        # 对外契约名（DTO/接口/响应类型）
    fields: [id, runtime_id, daemon_instance_id]

# consumer task（消费的一方）
expects_from:
  task-05:                             # provider task id
    - contract: DaemonRuntimeRead
      needs: [daemon_instance_id]      # 必须从该 provider 拿到的字段
```

### 三层防线

| 阶段 | 校验函数 | 缺字段时行为 |
|------|---------|-------------|
| plan 完成时（postcheck） | `validateCrossTaskContracts`：每个 `expects_from[provider].needs` 必须是 provider `provides.fields` 子集 | **阻断 plan，不进入 execute** |
| execute 启动子代理前 | `buildContractFieldInjection`：把 needs↔provides 对比注入 consumer 子代理 | 注入 `CONTRACT_GAP`，铁律要求子代理 **stop and report，禁止 fallback 编造** |
| verify | `runVerifyParityCheck`（端点级 parity check，依赖 execute 提取的 `contract-artifacts`；后端提取多框架 FastAPI/Express/Spring） | missingBackend>0 → advisory warning（不阻断归档）；无 artifact → skipped |

### 向后兼容

`provides` / `expects_from` 均为可选字段：未声明时不触发校验。单 task 变更、无跨任务接口的场景无需填写；老 TaskCard（无这两个字段）完全兼容，不会被阻断。

### 何时填写

- 前后端联动（后端产出 API + DTO，前端消费）
- 一个 task 定义接口/类型，另一个 task 实现调用方
- 任何「task-A 的产出形状被 task-B 依赖」的场景

不要把内部实现字段塞进 `provides`；只暴露给其他 task 的对外契约形状。

## 双重校验

契约在两个时点执行：

1. **plan 完成时**（plan postcheck）：plan.md 不合法 → 阻断 completed，plan 阶段无法完成
2. **execute 启动时**（execute entry）：plan.md 不合法 → fail-fast，不进入 execute

这确保 plan.md 在进入 execute 之前就是合法的，execute 启动时的校验是二次保险。
