---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# hooks
> 最后更新：2026-08-09
> 最近变更：2026-08-08-progress-db-concurrency（hook 阶段检测废阶段状态缓存双源，改 queryDbFirstCell 直读 better-sqlite3 readonly 子进程 fail-closed）
> 模块路径：src/hooks/**

## 职责
Claude Code 工具拦截守卫，在 worktree 隔离模式下根据阶段门控、路径门控和命令门控决定是否阻止 Write/Edit/MultiEdit/Bash 操作。

## 当前设计
模块由两个文件组成，职责分离：

**`worktree-guard.js`（ESM）**：纯判断逻辑模块，实现三重门禁：
1. **stageGate**：检查当前阶段是否允许写入（只有 `execute` 和 `quick` 阶段放行）
2. **locationGate**：判断操作目标是否在 worktree 目录内（`.sillyspec/.runtime/worktrees/`）
3. **fileGate**：文件白名单（`.md` 扩展名 + 特定配置文件名）和 Bash 命令分类（只读/危险）

阶段检测直读 `sillyspec.db` 的 `current_stage`：`queryDbFirstCell` 经 `execFileSync` 起真实 node 子进程 `require` better-sqlite3（`readonly:true + fileMustExist:true` 打开只读连接），`pluck().get()` 取第一行第一列。原阶段状态缓存文件（execute/quick 写出）已在 task-10 彻底废除（全 src 无写点），DB 为唯一权威源；db 缺失/损坏/查询异常时 `queryDbFirstCell` 返回 null，调用方（`readCurrentStage`/`isNoWorktreeMode`）走 fail-closed（warn+null，不 fail-open）。每个阶段有专属提示（`STAGE_HINTS`），给出具体修复建议。

**`claude-pre-tool-use.cjs`（CommonJS）**：Claude Code `PreToolUse` hook 入口。从 stdin 读取 JSON 输入，映射工具名（Write/Edit/MultiEdit/Bash），构造 `opts` 对象后调用 `worktree-guard.js` 的 `shouldBlock`。拦截失败（exit code 2）时 Claude Code 会阻止工具执行并显示原因。整体采用"安全放行"策略：stdin 读取失败、JSON 解析失败、模块加载失败时均放行（exit 0），避免 hook 自身故障阻断工作流。

## 对外接口（表格）
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `shouldBlockWrite(filePath, cwd)` | 判断文件写入是否应被拦截 | `filePath: string, cwd: string` -> `{ blocked, reason }` |
| `shouldBlockBash(command, cwd)` | 判断 Bash 命令是否应被拦截 | `command: string, cwd: string` -> `{ blocked, reason }` |
| `shouldBlock(opts, ctx)` | 统一拦截判断入口 | `opts: { tool, filePath?, filePaths?, command? }, ctx: object` -> `{ blocked, reason }` |
| `main()`（claude-pre-tool-use.cjs） | hook 主入口，从 stdin 读取并调用 shouldBlock | — |

## 关键数据流
1. Claude Code 触发 PreToolUse hook -> `claude-pre-tool-use.cjs` 从 stdin 读取 JSON
2. 解析 `tool_name` 和 `tool_input`，映射为统一的 `opts` 格式
3. 动态 import `worktree-guard.js`，调用 `shouldBlock(opts)`
4. `shouldBlock` 按工具类型分发：Write/Edit/MultiEdit -> `shouldBlockWrite`；Bash -> `shouldBlockBash`
5. 三重门禁依次检查：阶段 -> 路径 -> 文件/命令规则
6. 返回 `{ blocked: true/false, reason }` -> 拦截则 exit(2)，放行则 exit(0)

## 设计决策（表格）
| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 双文件分离（.cjs 入口 + .js 逻辑） | Claude Code hook 要求 CommonJS 入口，逻辑模块保持 ESM | 全部 CommonJS / 全部 ESM |
| 三重门禁架构 | 分层拦截，阶段优先，避免低层判断浪费 | 单一复杂判断函数 |
| "安全放行"容错策略 | hook 自身故障不应阻断开发流程 | 严格拦截（任何异常都阻止） |
| 阶段检测直读 sillyspec.db（better-sqlite3 readonly 子进程） | DB 为唯一权威源（原阶段状态缓存文件双源已废，消除 stale 缓存绕过）；WAL 只读连接不阻塞主进程写，且可见已 commit 的过渡态 | 阶段状态缓存文件双源（stale 风险） |
| 3 秒 stdin 读取超时 | 防止 hook 挂起阻塞 Claude Code | 无超时 / 更长超时 |
| 命令拆分（`\|\|`、`&&`、`\|`） | 复合命令需逐段检查危险性 | 只检查整体命令 |

## 依赖关系
- 内部依赖：无（worktree-guard.js 独立；claude-pre-tool-use.cjs 动态 import worktree-guard.js）
- 外部依赖：
  - worktree-guard.js：`fs`（`existsSync`, `readFileSync`, `readdirSync`）、`path`、`child_process`（`execFileSync`，用于 `queryDbFirstCell` 起 node 子进程直读 sillyspec.db）、`module`（`createRequire` 解析 better-sqlite3 绝对路径注入子进程）
  - claude-pre-tool-use.cjs：`path`、`fs`

## 注意事项
- `claude-pre-tool-use.cjs` 使用 CommonJS 格式，因为 Claude Code hooks 运行环境限制；`worktree-guard.js` 保持 ESM
- `shouldBlock` 拦截提示中包含阶段专属修复建议（`STAGE_HINTS`），修改阶段名称时需同步更新
- `READONLY_COMMANDS` 和 `DANGER_GIT_SUBS` 等常量定义了命令白名单/黑名单，新增工具时需评估是否加入
- `FILE_WHITELIST_EXTS` 目前只包含 `.md`，新增可写文件类型需同步更新
- hook 的 exit code 语义：0 = 放行，2 = 阻止，其他 = 未定义行为
- `isNoWorktreeMode` 检测 `.sillyspec/local.yaml` 中的 `noWorktree` 标志，worktree 模式关闭时所有写入放行

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-08 | ql-20260808-005-b3ff | worktree-guard quick baseline 比对路径归一 forward-slash（split(path.sep).join），修 Windows 下 path.relative 产 backslash 与 baseline（forward-slash）不匹配致实时防护被静默绕过 |
| 2026-08-09 | 2026-08-08-progress-db-concurrency | hook 阶段检测废阶段状态缓存文件 fallback 双源，改 queryDbFirstCell 直读 sillyspec.db（better-sqlite3 readonly+fileMustExist 子进程）；db 缺失/损坏 fail-closed warn+null 不 fail-open |
