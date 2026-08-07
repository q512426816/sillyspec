---
author: qinyi
created_at: 2026-08-07T14:50:00+08:00
updated_at: 2026-08-07T14:50:00+08:00
related_change: 2026-08-07-sillyhub-mcp-dispatch
---

# SillyHub 路径 A 跨仓契约（供 multi-agent-platform 独立变更对齐）

> 本文档声明 SillySpec 侧变更 `2026-08-07-sillyhub-mcp-dispatch` 对 SillyHub（multi-agent-platform 仓库）的**路径 A 期望**。SillySpec 侧已实现派发抽象层 + `SillyHubMcpBackend` stub（探测到路径 A 未落地 → fallback Local + 提示），本变更可独立交付。SillyHub 侧路径 A 落地后，SillySpec 的 SillyHub 后端自动启用（`isPathASupported()` 改为探测 daemon schema 返回 true）。

## 背景

SillySpec 作为流程控制器单向调用 SillyHub MCP 派 worker（D-001）。worker 须在 **SillySpec 自建 worktree** 执行（D-002），SillySpec 自己 apply 不用 converge（D-004）。为此 SillyHub 的 `dispatch_worker` 须支持「caller 提供 worktree」模式（路径 A），否则 worker 进 SillyHub 自建 worktree、代码落点失控、且 worker commit 污染 sillyspec 分支。

## 路径 A：SillyHub 须改三处（D-003@v2）

### 1. `dispatch_worker` 增可选参数（向后兼容）

`dispatch_worker` schema 增可选参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `worktree_path` | string? | caller（SillySpec）提供的 worktree 绝对路径。worker cwd = 此路径。 |
| `branch` | string? | caller worktree 当前分支。 |
| `worker_prompt` | string? | 覆写 worker 执行 prompt（caller 控制 commit 行为，见下）。 |

**不传** → 走原自建 worktree/分支逻辑（向后兼容，不影响既有 SillyHub 调用方）。

SillySpec 侧调用（`src/sillyhub-mcp/client.js#dispatchWorker`）已按此契约传参：`worktree_path` / `branch` / `read_only` / `model` / `agent_profile_id` / `worker_prompt`。

### 2. `execution.py` 检测 caller worktree → 跳过自建

`execution.py`（约 184-236 行，自建 worktree/分支逻辑）须检测 caller 是否提供 `worktree_path`：

- caller 提供 → **跳过自建 worktree/分支**，`root_path = caller worktree_path`，分支 = caller `branch`。
- caller 未提供 → 原自建逻辑不变。

daemon `workspace.ts` 分支 0（目录已存在 → 直接 cwd）已支持；路径 A 复用此分支。

### 3. `render_worker_prompt` 路径 A 下 worker 不 git commit（关键，UB-1）

`render_worker_prompt`（约 105-129 行）当前**硬编码** worker 执行 `git add -A && git commit` + "主 agent merge"。路径 A 下 worker 进 SillySpec worktree，**必须改为 worker 不 git commit**——改动留工作区交 SillySpec 对 worktree 工作区 git diff（D-004 SillySpec 自己 apply）。

否则 worker 会 commit 到 `sillyspec/<change>` 分支，污染分支历史 + 撞 SillySpec 的 worktree apply/assess 门控（D-004）。

两种实现方式（任一）：
- (a) `render_worker_prompt` 检测路径 A 分支（caller 提供 worktree）→ 不输出 `git add -A && git commit`，改为"留工作区改动"。
- (b) `dispatch_worker` 的 `worker_prompt` 覆写参数（见 #1）让 caller 直接控制 worker prompt（SillySpec 侧 `worker_prompt` 已传"不 commit 留工作区"覆写）。

## daemon root_path 约束（R-08 / UB-3）

SillyHub daemon 的 `ws.root_path`（`assertWithinAllowedRoots` 越界门）**必须 ≥ SillySpec 主仓根**，含所有 SillySpec worktree 路径（如 `.claude/worktrees/` 或 `.sillyspec/.runtime/worktrees/` 下的 worktree）。

否则 daemon 的 `assertWithinAllowedRoots` 会拒 SillySpec worktree（不在 root_path 内）→ dispatch 失败。

SillySpec 侧 `probeSillyHub`（`src/dispatch/probe.js`）已实现 root_path 校验：仅当 caller 传 `rootPath` 时校验 `worktreePath` 在内，越界 → `{available:false, reason:'worktree-outside-root'}` → fallback Local。路径 A 落地后 daemon 须暴露 `root_path`（如经 daemon 状态/能力查询），SillySpec 侧据该校验。

## SillySpec 侧 stub 行为（路径 A 未落地时）

- `isPathASupported()`（`src/dispatch/backends/sillyhub-mcp.js`）当前 stub 恒 `false`。
- `execute buildWavePrompt` 的 `getDispatchMode()`：env 配置 + `isPathASupported()` 都满足才 'sillyhub'；否则 'local'（无配置，零回归）或 'local-fallback'（有配置但路径 A stub，短提示）。
- 即便配置了 MCP，路径 A 未落地 → 派发走 Local（现状行为），不阻断本变更 ship。
- `killLease`（`client.js`）：无专用 kill tool，best-effort `report_progress` 带 kill 标记 + 保守 `killed=false`。路径 A 落地时建议 SillyHub 增专用 kill/lease-revoke tool。

## 落地时序

1. **本变更（SillySpec 侧）**：抽象层 + Local + 探测 + stub 独立交付（零回归）。
2. **SillyHub 侧（multi-agent-platform 独立变更）**：路径 A 三处 + daemon root_path 约束。
3. **接通**：SillyHub 侧落地后，SillySpec `isPathASupported()` 改为探测 daemon schema（dispatch_worker 支持 worktree_path / worker_prompt）返回 true → SillyHub 后端自动启用。

## 校验清单（SillyHub 侧落地后）

- [ ] `dispatch_worker` 接受 `worktree_path`/`branch`/`worker_prompt` 可选参数，不传走原逻辑
- [ ] `execution.py` caller 提供 worktree → 跳过自建，root_path/分支用 caller 的
- [ ] `render_worker_prompt` 路径 A 下 worker 不 git commit（或 `worker_prompt` 覆写生效）
- [ ] daemon `ws.root_path` 配置 ≥ SillySpec 主仓根（含 worktree 路径）
- [ ] （建议）专用 kill/lease-revoke tool（替代 `report_progress` kill 标记）
