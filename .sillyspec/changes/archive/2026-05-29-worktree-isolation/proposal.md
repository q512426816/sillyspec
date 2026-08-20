# Proposal: execute 阶段 worktree 隔离

## 变更名
`2026-05-29-worktree-isolation`

## 动机

当前 SillySpec 的 execute 阶段，AI 子代理直接在主工作区修改源码。这带来四个严重问题：

1. **并行冲突**：多个 Agent 在同一项目并行时互相干扰，一个 agent 的改动可能被另一个覆盖
2. **越权修改**：子代理可能修改了 design.md 文件变更清单外的文件，无法追溯
3. **破坏性操作**：verify 阶段子代理曾通过 `git checkout` 覆盖源码（历史事故）
4. **不可回滚**：主工作区已被污染，无法做到"改了不想要就扔掉"

## 核心方案

引入 **git worktree 隔离**机制：

1. execute 阶段自动创建临时 worktree，子代理在隔离环境中写代码
2. 主工作区通过 hook 禁止源码写入（只允许文档类文件）
3. 完成后通过受控流程回写 diff 到主工作区
4. 多 Agent 天然隔离在不同 worktree，互不干扰

## 影响范围

### 新增
- `sillyspec worktree` 子命令（create/apply/list/cleanup）
- Hook 拦截逻辑（Write/Edit/MultiEdit/Bash）
- worktree 状态文件（`.sillyspec/.runtime/worktrees/`）

### 修改
- `src/stages/execute.js` — 前缀/后缀步骤增加 worktree 生命周期
- `src/index.js` — 注册 worktree 子命令
- Wave prompt — 告知子代理 worktree 路径

### 不变
- quick 阶段（小改动直接在主工作区，hook 降级放行）
- brainstorm/plan/design 等文档阶段（不涉及源码修改）
- verify 阶段（已有独立逻辑）

## 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| git worktree 在某些 repo 配置下不可用 | 中 | 启动时检测，不支持时降级到直接模式 + 明确警告 |
| hook 拦截导致正常操作被误杀 | 高 | 白名单可配置，提供 override 机制 |
| apply 时主工作区已被其他操作修改 | 中 | base hash 校验，不一致时报错而非强制 apply |
| worktree 残留占用磁盘 | 低 | cleanup + 定期扫描清理 stale worktree |

## 里程碑

1. **worktree 子命令**：create/apply/list/cleanup 基础功能
2. **hook 拦截**：主工作区源码保护
3. **execute 阶段集成**：自动创建/apply/cleanup
4. **验证增强**：文件变更清单校验 + base hash 检查
