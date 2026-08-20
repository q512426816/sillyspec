# Requirements: execute 阶段 worktree 隔离

## 功能需求

### FR-1: worktree 创建
- **FR-1.1** `sillyspec worktree create <change-name>` 创建隔离 worktree
- **FR-1.2** 自动创建分支 `sillyspec/<change-name>`
- **FR-1.3** 支持 `--base <branch>` 指定基础分支，默认当前 HEAD
- **FR-1.4** 记录 meta.json（baseHash、创建时间、路径）
- **FR-1.5** worktree 已存在时拒绝创建，提示先 cleanup

### FR-2: worktree apply
- **FR-2.1** `sillyspec worktree apply <change-name>` 受控回写 diff
- **FR-2.2** `--check-only` 只检查不 apply
- **FR-2.3** 校验：变更文件 ⊆ design.md 文件变更清单
- **FR-2.4** 校验：主工作区 base hash 一致
- **FR-2.5** 全部通过后 `git apply` 到主工作区
- **FR-2.6** apply 成功后自动清理 worktree
- **FR-2.7** apply 失败时展示详细错误，不自动清理

### FR-3: worktree 列表和清理
- **FR-3.1** `sillyspec worktree list` 列出所有活跃 worktree
- **FR-3.2** `sillyspec worktree cleanup <change-name>` 强制删除（不 apply）

### FR-4: Hook 拦截
- **FR-4.1** Write/Edit/MultiEdit 拦截主工作区源码写入
- **FR-4.2** worktree 内操作放行
- **FR-4.3** 文档类文件白名单放行（.md, .yaml, .sillyspec/）
- **FR-4.4** Bash 命令只读白名单 + 危险命令黑名单
- **FR-4.5** `sillyspec worktree` 命令始终放行

### FR-5: execute 阶段集成
- **FR-5.1** execute 前缀步骤自动创建 worktree
- **FR-5.2** Wave prompt 注入 worktree 路径，子代理 cwd 设为 worktree
- **FR-5.3** execute 后缀步骤执行 apply --check-only → 用户确认 → apply
- **FR-5.4** 用户拒绝 apply 时提供 cleanup 选项

### FR-6: 降级兼容
- **FR-6.1** git worktree 不可用时降级到直接模式 + 警告
- **FR-6.2** quick 阶段不创建 worktree，hook 降级为记录模式
- **FR-6.3** `SILLYSPEC_DISABLE_HOOKS=1` 紧急禁用

## 非功能需求

### NFR-1: 性能
- worktree create 应在 5 秒内完成（不含 npm install）
- apply 检查应在 3 秒内完成

### NFR-2: 可靠性
- 任何步骤失败不残留脏状态
- 进程中断后可通过 list + cleanup 恢复

### NFR-3: 兼容性
- 支持 git >= 2.15（worktree 功能）
- 不影响不使用 worktree 的现有流程

## 验收标准

- [ ] 多 Agent 并行执行互不干扰
- [ ] 子代理无法修改 design.md 清单外的文件（apply 时被拦截）
- [ ] verify 阶段子代理无法执行 git checkout（hook 拦截）
- [ ] apply 失败时主工作区保持干净
- [ ] worktree 可随时丢弃，主工作区不受影响
