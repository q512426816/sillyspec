# Tasks: execute 阶段 worktree 隔离

## Wave 1: 基础设施

### task-01: worktree 管理核心模块
- **文件:** 新增 `src/worktree.js`
- **说明:** 导出 WorktreeManager 类，封装 create/apply/list/cleanup
- **参考:** design.md §2
- **步骤:**
  1. 创建 `src/worktree.js`，导出 WorktreeManager
  2. 实现 `create(changeName, { base })` — git worktree add + 分支创建 + meta.json 写入
  3. 实现 `list()` — 扫描 worktrees 目录，读取 meta.json
  4. 实现 `cleanup(changeName)` — git worktree remove + 分支删除
  5. 实现 `getMeta(changeName)` — 读取 meta.json，不存在返回 null
  6. 错误处理：worktree 已存在、git 不可用、meta 损坏

### task-02: design.md 文件变更清单解析
- **文件:** 新增 `src/change-list.js`
- **说明:** 从 design.md 解析文件变更清单表格
- **步骤:**
  1. 创建 `src/change-list.js`
  2. 实现 `parseFileChangeList(designMdPath)` — 解析 markdown 表格
  3. 返回 `Set<string>`（文件路径集合）
  4. 处理表格变体：有无 header 行、操作列不同值（新增/修改/删除）
  5. 忽略 .sillyspec/ 内的路径、忽略注释行

### task-03: apply 校验逻辑
- **文件:** 新增 `src/worktree-apply.js`
- **说明:** apply 的核心校验 + 回写逻辑
- **参考:** design.md §2.2
- **步骤:**
  1. 创建 `src/worktree-apply.js`，导出 `applyWorktree(changeName, { checkOnly, cwd })`
  2. 读取 meta.json 获取 baseHash
  3. `git diff --name-only baseHash..worktree` 获取变更文件
  4. 调用 `parseFileChangeList` 获取清单
  5. 校验：变更文件 ⊆ 清单（允许清单中标记为"新增"的文件）
  6. 校验：主工作区文件 base hash 一致
  7. checkOnly 模式：输出检查结果后返回
  8. 非 checkOnly：生成 diff patch → `git apply` 到主工作区
  9. 成功后调用 cleanup

## Wave 2: CLI + Hook

### task-04: worktree 子命令注册
- **文件:** 修改 `src/index.js`
- **说明:** 注册 worktree create/apply/list/cleanup 子命令
- **步骤:**
  1. 在 src/index.js 添加 `worktree` 命令组
  2. 注册 create/apply/list/cleanup 四个子命令
  3. 调用 WorktreeManager / applyWorktree 对应方法
  4. 格式化输出（表格/JSON）

### task-05: Hook 拦截实现
- **文件:** 新增 `src/hooks/worktree-guard.js`
- **说明:** AI 工具调用拦截：Write/Edit/MultiEdit/Bash
- **参考:** design.md §3
- **步骤:**
  1. 创建 `src/hooks/worktree-guard.js`
  2. 实现 `shouldBlock({ tool, filePath, command, cwd })` — 返回 { blocked, reason }
  3. Write/Edit/MultiEdit：路径白名单检查
  4. Bash：只读白名单 + 危险命令黑名单
  5. worktree 内 cwd 全放行
  6. 环境变量 `SILLYSPEC_DISABLE_HOOKS` 紧急逃生
  7. 白名单配置可从 `local.yaml` 读取自定义规则

## Wave 3: execute 集成 + 测试

### task-06: execute 阶段前缀步骤改造
- **文件:** 修改 `src/stages/execute.js`
- **说明:** 在「加载上下文」后插入「创建 worktree」步骤
- **参考:** design.md §4.1
- **步骤:**
  1. 在 fixedPrefix 数组中「加载上下文」后插入新步骤
  2. 步骤 prompt：运行 `sillyspec worktree create <change-name>`，记录路径
  3. 创建失败时报错停止
  4. 将 worktree 路径注入后续步骤的上下文

### task-07: Wave prompt 注入 worktree 路径
- **文件:** 修改 `src/stages/execute.js`
- **说明:** Wave prompt 中告知子代理 worktree 路径
- **参考:** design.md §4.3
- **步骤:**
  1. 修改 `buildWavePrompt` 函数，接受 worktreePath 参数
  2. 注入 cwd 指令到 prompt
  3. 固定前缀步骤将 worktree 路径传递到 Wave 步骤

### task-08: execute 阶段后缀步骤改造
- **文件:** 修改 `src/stages/execute.js`
- **说明:** 「完成确认」步骤改为 apply 流程
- **参考:** design.md §4.2
- **步骤:**
  1. 修改 fixedSuffix 中「完成确认」的 prompt
  2. 先执行 `sillyspec worktree apply --check-only`
  3. 展示 diff 摘要 + 校验结果
  4. 用户确认后执行 apply
  5. 失败时提供 cleanup 选项

### task-09: quick 阶段 worktree 集成
- **文件:** 修改 `src/stages/quick.js`
- **说明:** quick 阶段同样走 worktree 隔离流程
- **步骤:**
  1. quick 阶段开始时创建 worktree（同 execute）
  2. prompt 告知子代理在 worktree 中工作
  3. quick 完成时 apply + cleanup
  4. hook 的 stageGate 同时放行 execute 和 quick
  5. quick 没有 design.md 时，apply 跳过文件清单校验（无清单 = 允许所有）

### task-10: 降级与逃生逻辑
- **文件:** 修改 `src/hooks/worktree-guard.js`、`src/stages/execute.js`
- **说明:** git worktree 不可用时的降级
- **参考:** design.md §3.4, requirements.md FR-6
- **步骤:**
  1. worktree create 失败时检测 git 版本，不支持的版本输出警告
  2. 提供 `--no-worktree` 标志跳过隔离
  3. **没有"降级到放行"路径**——降级只意味着更严格（无 worktree = 无法写源码）
  4. 紧急逃生：`SILLYSPEC_DISABLE_HOOKS=1` 环境变量

### task-11: 文档更新
- **文件:** 新增 `docs/worktree-isolation.md`（可选）
- **说明:** 更新项目文档说明 worktree 隔离机制
- **步骤:**
  1. 说明 worktree 隔离的目的和使用方式
  2. 说明 hook 机制和降级方案
  3. 说明 `sillyspec worktree` 命令用法
