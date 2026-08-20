# Design: execute 阶段 worktree 隔离

## 1. 架构总览

```
主工作区                              worktree 隔离区
┌──────────────────────┐           ┌──────────────────────────┐
│ src/                 │           │ .sillyspec/.runtime/      │
│   (hook 禁止写入)     │           │   worktrees/              │
│ .sillyspec/          │           │     <change-name>/        │
│   changes/           │           │       src/ (完整副本)      │
│     <change-name>/    │           │       node_modules/       │
│       design.md       │           │       ...                 │
│       tasks.md        │           │                           │
│ .sillyspec/.runtime/  │           │  分支: sillyspec/<name>   │
│   gate-status.json    │           └──────────────────────────┘
│   worktrees/          │                    │
│     <change-name>/    │                    │ sillyspec worktree apply
│       meta.json       │────────────────────┘
└──────────────────────┘
```

## 2. CLI 子命令设计

### 2.1 `sillyspec worktree create <change-name> [--base <branch>]`

**行为：**
1. 创建 worktree 目录：`.sillyspec/.runtime/worktrees/<change-name>/`
2. 基于当前 HEAD 创建分支 `sillyspec/<change-name>`
3. 执行 `git worktree add .sillyspec/.runtime/worktrees/<change-name>/ -b sillyspec/<change-name> [base]`
4. 记录元数据到 `.sillyspec/.runtime/worktrees/<change-name>/meta.json`：
   ```json
   {
     "changeName": "<change-name>",
     "branch": "sillyspec/<change-name>",
     "baseBranch": "main",
     "baseHash": "abc123...",
     "createdAt": "2026-05-29T22:00:00Z",
     "worktreePath": "/abs/path/to/worktree"
   }
   ```
5. 返回 worktree 绝对路径

**错误处理：**
- worktree 已存在 → 报错，提示先 cleanup
- git worktree 不可用 → 报错并提示降级方案

### 2.2 `sillyspec worktree apply <change-name> [--check-only]`

**行为：**
1. 检查 worktree 存在 + meta.json 有效
2. `git diff --name-only baseHash..worktree` 获取变更文件列表
3. 读取 `design.md` 文件变更清单（解析 markdown 表格）
4. 校验：变更文件 ⊆ 清单文件（允许新增文件，需明确列出）
5. 校验：主工作区对应文件的 base hash 与 meta.json 一致
6. `--check-only`：只输出检查结果，不 apply
7. 通过校验后：从 worktree 生成 patch 并 apply 到主工作区：
   ```bash
   # 注意：worktree 内的修改可能没有 commit，不要用 baseHash..HEAD
   # 要比较 baseHash 到工作区内容（staged + unstaged）
   git -C <worktree> diff --binary <baseHash> -- <allowed-files> > /tmp/task.patch
   git -C <main-worktree> apply --check /tmp/task.patch
   git -C <main-worktree> apply --3way /tmp/task.patch
   rm /tmp/task.patch
   ```
8. 成功后：`git worktree remove <path>` 清理

**文件变更清单解析：**
- 从 `.sillyspec/changes/<change-name>/design.md` 中提取
- 表格格式：`| 操作 | 文件路径 | 说明 |`
- 只匹配项目根目录下的文件（src/, test/, bin/ 等）
- 忽略 .sillyspec/ 内的文件

### 2.3 `sillyspec worktree list`

**行为：**
1. 扫描 `.sillyspec/.runtime/worktrees/` 下所有目录
2. 读取 meta.json，输出表格：

```
Change Name              Branch                    Created
2026-05-29-xxx           sillyspec/2026-05-29-xxx   2026-05-29 22:00
```

### 2.4 `sillyspec worktree cleanup <change-name>`

**行为：**
1. `git worktree remove <path> --force`
2. `git branch -D sillyspec/<change-name>`
3. 删除 `.sillyspec/.runtime/worktrees/<change-name>/` 目录

## 3. Hook 拦截逻辑

### 3.1 触发条件

Hook 在 AI 工具调用（Write/Edit/MultiEdit/Bash）前执行，检查 cwd 和目标路径。

### 3.2 判断逻辑（三重门禁）

hook 判断写入是否允许，需要同时满足三个条件：

```
allowWrite =
  stageGate &&          // 阶段门禁：execute 或 quick
  locationGate &&       // 位置门禁：目标路径在注册 worktree 内
  fileGate              // 文件门禁：目标路径命中文件白名单
```

**阶段门禁（stageGate）：**
```
读取 .sillyspec/.runtime/gate-status.json（由 CLI _updateGateStatus 维护）
stage in ["execute", "quick"] → stageGate = true
否则（brainstorm/plan/design/verify/archive/explore）→ stageGate = false
无 gate-status.json → stageGate = false（没有活跃阶段，不允许写源码）
```

**位置门禁（locationGate）：**
```
resolvePath(file_path, cwd) → absolute_path
if absolute_path 包含 ".sillyspec/.runtime/worktrees/" → locationGate = true
else → locationGate = false
```

**文件门禁（fileGate）：**
```
路径白名单（文档类、配置类，在 worktree 内外都放行）：
  - 路径以 .sillyspec/ 开头
  - 文件扩展名为 .md
  - 文件名为 package.json / tsconfig.json / local.yaml 等
  - 路径在 .git/ 下
命中任一规则 → fileGate = true
```

**判断流程：**
```
if SILLYSPEC_DISABLE_HOOKS=1 → 放行
if fileGate命中文档/配置类 → 放行（不受阶段限制）
if stageGate=false → 拦截
if locationGate=false → 拦截（主工作区源码禁止写入）
if fileGate=false（源码不在白名单）→ 拦截
→ 放行
```

> 关键：brainstorm/plan/verify/archive 阶段，即使文件命中白名单、路径在 worktree 里，
> 只要阶段不是 execute/quick 就禁止源码写入。worktree 只在 execute/quick 阶段存在，
> 所以位置门禁和阶段门禁互为补充。

### 3.3 Bash 命令拦截

```
if cwd 在 worktree 下 → 全部放行

if cwd 在主工作区:
  只读命令白名单（正则匹配命令名）：
  - grep, rg, ag, find, ls, cat, head, tail, wc, stat
  - git diff, git status, git log, git show, git branch, git stash list
  - node --version, npm --version, npx --version
  - echo, pwd, basename, dirname, realpath
  - sillyspec worktree apply/create/list/cleanup（允许 worktree 管理命令）
  
  禁止命令（正则匹配）：
  - git add, git commit, git push, git checkout, git restore, git reset, git clean
  - git mv, git rm, git stash (drop/clear/pop)
  - rm -rf, mv (移动源码文件)
  - 任何 sudo 操作
  
  其他命令 → 根据命令名启发式判断，不确定时放行 + 警告
```

### 3.4 降级机制

- `SILLYSPEC_DISABLE_HOOKS=1` → 紧急逃生，放行所有写入
- gate-status.json 不存在 → stageGate=false，禁止源码写入（默认安全）
- quick 阶段：CLI 在 quick 开始时创建 worktree，结束时 apply+cleanup，hook 逻辑与 execute 一致
- 无 worktree 目录存在 → locationGate=false，禁止源码写入
- **不存在"降级到放行"的路径**，只有"降级到更严格"或"逃生开关"

## 4. execute 阶段改造

### 4.1 固定前缀步骤调整

在「加载上下文」和「确认执行范围」之间插入新步骤：

```
步骤 1: 状态检查
步骤 2: 加载上下文
步骤 3: 创建 worktree [新增]
步骤 4: 确认执行范围
步骤 N: Wave 执行...
步骤 N+1: acceptance...
步骤 最后: 完成确认 [改造]
```

**新增步骤「创建 worktree」：**
```
为本次执行创建隔离的 git worktree。

### 操作
1. 运行 `sillyspec worktree create <change-name>`
2. 记录输出的 worktree 路径
3. 后续所有子代理的 cwd 设为该 worktree 路径
4. 如果创建失败 → 报错并停止（不要在无隔离状态下继续）

### 输出
worktree 路径 + 分支名
```

### 4.2 固定后缀步骤调整

**「完成确认」步骤改造：**
```
所有任务完成后的收尾。

### 操作
1. 运行 `sillyspec worktree apply --check-only <change-name>`
2. 展示 diff 摘要（文件列表 + 变更统计）
3. 检查结果说明（是否通过文件清单校验）
4. 用户确认后运行 `sillyspec worktree apply <change-name>`
5. apply 成功 → 自动 cleanup
6. apply 失败 → 展示错误详情，用户选择重试或手动处理
7. 建议下一步：`sillyspec run verify`

### 输出
apply 结果 + 下一步建议

### 注意
- 如果用户不想 apply → 运行 `sillyspec worktree cleanup <change-name>` 丢弃
```

### 4.3 Wave prompt 调整

在 Wave prompt 中注入 worktree 路径：
```
### 工作目录
你必须在以下 worktree 中工作（子代理的 cwd 设为此路径）：
`<worktree-path>`

不要在主工作区修改源码文件。所有代码变更只在 worktree 中进行。
```

## 5. 数据模型

### 5.1 meta.json（worktree 元数据）

```json
{
  "changeName": "2026-05-29-worktree-isolation",
  "branch": "sillyspec/2026-05-29-worktree-isolation",
  "baseBranch": "main",
  "baseHash": "abc1234...",
  "createdAt": "2026-05-29T22:00:00Z",
  "worktreePath": "/abs/path/to/.sillyspec/.runtime/worktrees/2026-05-29-worktree-isolation"
}
```

### 5.2 design.md 文件变更清单格式（已有，保持不变）

```markdown
## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | src/worktree.js | worktree 管理核心逻辑 |
| 修改 | src/stages/execute.js | 集成 worktree 生命周期 |
| 新增 | src/hooks/worktree-guard.js | hook 拦截逻辑 |
```

## 6. 错误处理策略

| 场景 | 处理 |
|------|------|
| worktree 创建失败 | 报错停止，建议降级到直接模式 |
| apply 时文件清单校验失败 | 列出清单外文件，用户确认后重试或手动处理 |
| apply 时 base hash 不一致 | 报错，提示主工作区已被修改 |
| git worktree 残留 | `sillyspec worktree list` + `cleanup` 手动清理 |
| hook 误拦截 | 白名单可配置，紧急时可设置 `SILLYSPEC_DISABLE_HOOKS=1` 环境变量 |

## 7. 环境变量

| 变量 | 说明 |
|------|------|
| `SILLYSPEC_DISABLE_HOOKS` | 设为 1 时禁用所有 hook（紧急逃生） |
| `SILLYSPEC_WORKTREE_DIR` | 自定义 worktree 存储目录（默认 `.sillyspec/.runtime/worktrees/`） |
