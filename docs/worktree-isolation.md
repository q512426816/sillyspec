# Worktree 隔离

SillySpec 在 `execute` 和 `quick` 阶段使用 **git worktree** 隔离 AI 子代理的代码修改，确保主工作区始终干净。

## 概述

AI 子代理在执行任务时会在 worktree 中修改源码，而非直接在主工作区操作。任务完成后通过 `worktree apply` 将变更合入主工作区。这带来几个好处：

- **安全性** — 主工作区不受意外修改影响
- **可审计** — 变更集中在一个 diff 中，便于 review
- **可回退** — 不满意直接 cleanup，主工作区零影响
- **多 Agent 并行** — 多个子代理可以同时工作在不同的 worktree 中

### 架构示意

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

## 命令参考

### `sillyspec worktree create <change-name> [--base <branch>]`

创建一个隔离的 worktree。

- 基于 `--base` 分支（默认当前 HEAD）创建新分支 `sillyspec/<change-name>`
- worktree 目录位于 `.sillyspec/.runtime/worktrees/<change-name>/`
- 在目录内生成 `meta.json` 记录元数据（分支名、base hash、创建时间等）
- 如果 worktree 已存在则报错，提示先执行 cleanup

### `sillyspec worktree apply <change-name> [--check-only] [--merge]`

将 worktree 中的变更合入主工作区。

- 读取 `meta.json` 中的 base hash，与主工作区比对
- 从 `design.md` 解析文件变更清单，校验变更范围
- `--check-only` 只输出检查结果，不实际 apply
- 校验通过后生成 patch 并 3-way apply 到主工作区
- apply 成功后自动清理 worktree
- `--merge`：显式用 `git merge sillyspec/<change>` 三方合并兜底（引合并提交），用于 `--3way` 冲突场景

**主干推进时的行为（2026-07 放宽；未提交 dirty 2026-08-20 再放宽为只拦重叠）**：

- 主干**已提交**推进（如 quick 改完 commit）→ `--3way` 自动三路合并：不同文件/不同区域干净合，同区域重叠 → 回滚工作区干净 + 提示 `--merge` 兜底，不留半成品冲突标记。
- 主干**未提交** dirty **与本次变更文件重叠** → apply 拒绝，点名重叠文件并引导先 `commit`/`stash`（重叠才是 git apply 无法安全应用的实际危险区）。
- 主干**未提交** dirty **与本次变更无重叠** → 放行并 warning 提示（无关脏文件不再硬挡逼 rescue cp 手动路径）。残余风险：Windows autocrlf on 时 `--3way` 可报 `does not match index`（非内容冲突）——此时已自动回滚无损，`git stash` 后重试即可。

**文件变更清单解析：** 从 `.sillyspec/changes/<change-name>/design.md` 中的 `## 文件变更清单` 表格提取。

### `sillyspec worktree list`

列出所有活跃的 worktree。

输出表格包含变更名、分支名和创建时间。

### `sillyspec worktree cleanup <change-name>`

清理指定的 worktree。

- 强制移除 worktree 目录
- 删除 `sillyspec/<change-name>` 分支
- 删除 `meta.json`

> ⚠️ cleanup 会丢弃所有未 apply 的变更，请确认后再执行。

**归档 / execute 完成时的自动清理**：如果你用 `git cherry-pick` / `rebase` / `merge` 把 worktree 的提交直接落到了主分支（没走 `sillyspec worktree apply`），归档（`run archive`）和 execute 阶段完成时会识别这些变更"已应用"（已 byte-identical 落在主工作区 HEAD）并自动 cleanup，**不会误报"未 apply 变更"、无需手动 `cleanup --force`**。只有当主工作区还没拿到这些代码、或检测失败时才保留 worktree。详见 [file-lifecycle/worktree-and-guard.md](sillyspec/file-lifecycle/worktree-and-guard.md#归档完成时的自动清理判定hasunappliedchanges)。

## Hook 拦截机制

SillySpec 通过 hook 在 AI 工具调用（Write/Edit/MultiEdit/Bash）前拦截非法写入。判断逻辑采用 **三重门禁**：

```
allowWrite = stageGate && locationGate && fileGate
```

### 阶段门禁（stageGate）

- 读取 `.sillyspec/.runtime/gate-status.json`（由 CLI 维护）
- 只有 `execute` 和 `quick` 阶段允许源码写入
- 其他阶段（brainstorm/plan/verify/archive/explore）→ 禁止
- 无 `gate-status.json` → 禁止（默认安全）

### 位置门禁（locationGate）

- 目标路径必须在 `.sillyspec/.runtime/worktrees/` 下才允许源码写入
- 主工作区的源码目录一律禁止

### 文件门禁（fileGate）

文档类、配置类文件在所有阶段放行，不受阶段和位置限制：

- `.sillyspec/` 开头的路径
- `.md` 文件
- `package.json`、`tsconfig.json`、`local.yaml` 等配置文件
- `.git/` 下的文件

### Bash 命令拦截

| 类型 | 示例 |
|------|------|
| **只读放行** | `grep`、`cat`、`git diff`、`git status`、`ls`、`find`、`sillyspec worktree apply/create/list/cleanup` |
| **禁止** | `git add`、`git commit`、`git push`、`git checkout`、`rm -rf`、`sudo` 等 |
| **不确定** | 启发式判断，放行但警告 |

> 在 worktree 目录下执行 Bash 命令时全部放行，不做拦截。

## 降级方案和逃生开关

| 场景 | 处理方式 |
|------|---------|
| **git < 2.15** | 不支持 worktree，报错停止 |
| **`--no-worktree` 标志** | ⚠️ **未接通**（`runCommand` 未解析此 flag，相关错误提示已移除）。worktree 失败改用 `sillyspec worktree doctor --fix` 或手动清理残留（`git worktree prune && git branch -D sillyspec/<change>`）；紧急用 `SILLYSPEC_DISABLE_HOOKS=1`。详见 `docs/sillyspec/file-lifecycle/known-implementation-gaps.md` |
| **`SILLYSPEC_DISABLE_HOOKS=1`** | 紧急禁用所有 hook，全部放行 |
| **无 gate-status.json** | stageGate=false，默认禁止源码写入 |
| **worktree 创建失败** | 自动降级为 in-place + baseline protection（mode: in-place-fallback） |
| **已在 linked worktree** | 复用当前目录（mode: native-worktree） |
| **worktree 目录未 ignore** | 阻断创建，提示修复 |

> ⚠️ in-place 降级模式仍会记录 baseline（baselineFiles + baselineHash + baselineCommit），hook 拦截继续生效，不会无保护地直接写源码。

## 多 Agent 并行使用

不同的 AI 子代理可以同时创建各自的 worktree：

```bash
# Agent A 处理 task-01
sillyspec worktree create feature-auth
# worktree: .sillyspec/.runtime/worktrees/feature-auth/

# Agent B 处理 task-02
sillyspec worktree create feature-ui
# worktree: .sillyspec/.runtime/worktrees/feature-ui/
```

两个 Agent 在各自的 worktree 中独立工作，互不干扰。各自完成后分别 apply 合入主工作区。

> 💡 如果两个 Agent 修改了相同的文件，后 apply 的一方可能遇到冲突。建议在 `plan` 阶段通过 Wave 分组避免同一文件被多个 Agent 修改。

## 环境变量

| 变量 | 说明 |
|------|------|
| `SILLYSPEC_DISABLE_HOOKS` | 设为 `1` 时禁用所有 hook（紧急逃生） |
| `SILLYSPEC_WORKTREE_DIR` | 自定义 worktree 存储目录（默认 `.sillyspec/.runtime/worktrees/`） |

## 环境隔离检测

SillySpec 在创建 worktree 前会自动检测当前环境的隔离状态：

### submodule 防护

使用 `git rev-parse --git-dir` 和 `--git-common-dir` 判断是否在 linked worktree 中。
同时用 `--show-superproject-working-tree` 排除 git submodule 的误判：

```
if GIT_DIR != GIT_COMMON && 无 superproject:
  → 已在 linked worktree，复用当前隔离环境
if 无 superproject 为空:
  → 在 git submodule 内，阻断创建并提示
else:
  → 在主仓库中，正常创建 worktree
```

### .gitignore 强制校验

worktree 存储目录 `.sillyspec/.runtime/worktrees/` 必须被 `.gitignore` 忽略：

- **init / doctor 阶段：** 预检查并提示修复
- **execute 阶段：** 未 ignore 则直接阻断 worktree 创建，抛出明确错误
- **不会自动修改 .gitignore：** 避免污染 baseline

修复方式：在项目 `.gitignore` 中添加：
```
.sillyspec/.runtime/worktrees/
```

### isolation 状态

worktree create 后，isolation 状态写入 `sillyspec.db` 的 `changes` 表（权威状态源）：

| 字段 | 说明 |
|------|------|
| `isolation_status` | pending / verified / degraded / blocked |
| `isolation_mode` | worktree / native-worktree / in-place-fallback / null |
| `isolation_reason` | blocked 或 degraded 时的原因说明 |

状态映射：

| status | mode | 触发条件 |
|--------|------|----------|
| verified | worktree | `git worktree add` 成功 |
| verified | native-worktree | 已在 linked worktree，复用 |
| degraded | in-place-fallback | `git worktree add` 失败，降级 in-place |
| blocked | null | submodule 内 / gitignore 未配置 |
| null | null | 尚未执行隔离检查 |

> ⚠️ isolation 的权威来源是 sillyspec.db。meta.json 中的 mode 仅作为 worktree 目录的运行时元信息。gate-status.json 不存储 isolation。

## 常见问题和故障排除

### worktree 残留无法清理

```bash
# 查看所有活跃 worktree
sillyspec worktree list

# 强制清理指定 worktree
sillyspec worktree cleanup <change-name>

# 如果 worktree 目录被手动删除但分支残留
git worktree prune
git branch -D sillyspec/<change-name>
```

### apply 失败：主工作区有未提交的改动

说明主工作区有未 commit 的脏改动**且与本次 apply 的变更文件重叠**（step 4.5/5a 只拦重叠；无关未提交文件已放行并 warning 提示）。处理方式：

1. 检查重叠文件的变更：`git diff`（报错会点名重叠文件）
2. 提交它们：`git add -A && git commit -m "..."`（推荐——已提交推进可被 `--3way` 自动合并）
3. 或暂存：`git stash`，apply 后 `git stash pop`

### apply 失败：--3way 冲突（已提交推进重叠）

说明主干**已提交**推进与本变更改了同一文件的同一区域，`--3way` 无法自动合并。apply 已自动回滚工作区（无半成品冲突标记）。处理方式：

1. 用 `--merge` 三方合并兜底：`sillyspec worktree apply <change-name> --merge`（引入合并提交）
2. 或手动解决后重试

### apply 失败：文件清单校验不通过

说明 worktree 中修改了 `design.md` 清单之外的文件。处理方式：

1. 查看清单外文件：apply 的输出会列出
2. 确认是否是合理的新增（如测试文件）
3. 更新 `design.md` 中的文件变更清单后重试
4. 或用 `--check-only` 排查后再 apply

### Hook 误拦截了合法操作

- 临时方案：设置 `SILLYSPEC_DISABLE_HOOKS=1` 环境变量
- 检查目标文件是否应加入文件白名单（fileGate）
- 检查当前阶段是否正确（gate-status.json）

### worktree 内 node_modules 问题

worktree 创建后需要安装依赖：

```bash
cd .sillyspec/.runtime/worktrees/<change-name>/
npm install
```

如果项目使用 pnpm 且有 monorepo，可能需要额外配置。
