# spec 文档写入层乐观锁

> 变更：2026-11-28-file-write-optimistic-lock
> 背景：repo-native 下 daemon 与 CLI 共用同一物理 spec 树，多 agent 会话各自按上下文旧快照
> 整文件 Write，互不感知（2026-11-28 `decisions.md` 双向抖动实证）。

## 1. 机制

标准乐观并发控制，**读取记录基线 → 写前比对**：

1. **PostToolUse(Read)**：把「文件相对路径 → 内容 sha256」写入会话级基线
   `.sillyspec/.runtime/state/file-read-baseline-<session_id>.json`；
2. **PreToolUse(Write|Edit|MultiEdit)**：写前重算当前盘面 sha256 与基线比对：
   - 一致 → 放行；
   - 不一致 → **阻止（exit 2）**并提示「文件已被他人改写，请重读后再写」；
   - 无基线（新文件 / 未读过 / 基线损坏）→ 放行。

关键口径：

| 项 | 口径 |
| --- | --- |
| 监控范围 | `specRoot` 之内（缺省整个 `.sillyspec/`；`file_guard.paths` 可收窄），`.runtime/` 恒排除 |
| 前缀语义 | 相对 **specRoot**（如 `changes/`）；误写 `.sillyspec/` 前缀会被自动剥离 |
| 会话隔离 | 按 `session_id` 分文件，并行会话互不干扰 |
| 过期 | 基线条目 24h 后在下一次读写时丢弃 |
| 失败姿态 | **一律 fail-open**：任何异常放行并输出 `[sillyspec-hook]` 留痕 |

## 2. Claude Code 配置样例

在项目 `.claude/settings.json`（或用户级 `~/.claude/settings.json`）的 `hooks` 中：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node /绝对路径/sillyspec/src/hooks/claude-pre-tool-use.cjs" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          { "type": "command", "command": "node /绝对路径/sillyspec/src/hooks/claude-post-tool-use.cjs" }
        ]
      }
    ]
  }
}
```

注：`claude-pre-tool-use.cjs` 同时承载既有的 worktree-guard 判定（matcher 也可只写
`Edit|Write|MultiEdit|Bash`，与 worktree-guard 共用同一入口，两种 matcher 写法都可用）。
worktree-guard 的拦截优先级高于乐观锁（先判流程门，后判乐观锁），两者文案互不覆盖。

## 3. 多引擎降级

| 引擎 | 能力 | 行为 |
| --- | --- | --- |
| Claude Code | PreToolUse / PostToolUse hook | **完整乐观锁**（读记基线 + 写前拦截） |
| Codex CLI | 无 PreToolUse 拦截能力（仅 notify 通知） | **降级**：无写入前拦截，只能事后由人工/同步层发现。建议在 AGENTS.md 写明「改前重读」纪律 |
| 其他（opencode / cursor 等） | 视引擎而定 | 支持等价 hook 时复用同一 `file-guard.js`（引擎无关纯函数）；不支持则同 Codex 降级 |

`src/file-guard.js` 是引擎无关的纯逻辑（`recordRead` / `checkBeforeWrite`），任何能调用
Node 的 hook 机制都可接入。

## 4. 已知局限

1. **只覆盖工具写路径**：agent 通过 Bash（`sed -i`、重定向、`git checkout`）改文件后，
   再走 Write 会被判为「他人改写」而误拦——提示重读即可恢复，不会丢内容；
2. **毫秒级窗口仍在**：写前校验到实际落盘之间，另一进程仍可能写入（已把分钟级旧快照
   覆盖缩到毫秒级竞争）；
3. **不覆盖 `_write` 以外的外部进程**：人类编辑器、同步守护进程的写入只能靠「下次读→写」
   时的校验兜底；
4. **hook 开销**：每次 Read/Write 多一次 Node 进程 + 小文件读写（约 50-100ms），仅对
   监控前缀生效。

## 5. daemon `pullSpecBundle` 的 mtime → hash 评估结论（跨仓，本次不实施）

现状（`multi-agent-platform/sillyhub-daemon/src/spec-sync-parts/pull.ts`）：
`hasUnsyncedLocalChanges` 用「`.runtime/pending_push` 标记 + specDir mtime 新于
`platform.json.synced_at`」判定「本地有未回灌改动」，据此决定 pull 前是否先回灌。

**结论：可行，且应替换为内容 hash，理由是 mtime 判定有已实证的失真面**：

- git 操作（checkout / pull / restore）会刷新 mtime → 误判「本地有改动」→ 每次 pull 前
  都触发一次回灌（性能损耗，无害）；
- 反向失真更危险：`git checkout` 把内容换回旧版但 mtime 变新 → 被判「本地新」→ 回灌旧内容
  覆盖服务器（这正是 2026-11-28 事故的另一半）；
- hash 判定免疫文件系统时间语义。

**复用点**：CLI 侧 `src/spec-sync-guard.js` 已有 `readBaseHashes(specDir)` 与
`shouldKeepLocal({specDir, relPath, baseHashes})`（2026-11-28-spec-downstream-write-arbitration），
daemon 可直接移植同一判据（基线文件同为 `.runtime/state/spec-sync-base.json`，两侧格式一致）。

**风险**：daemon 的 specDir 在 repo-native 下是 junction（指向源项目），基线文件位置与 CLI
共享——需确认两侧对同一基线文件的读写不冲突（CLI 写、daemon 读为主）。建议实施时：
① 先只把 `hasUnsyncedLocalChanges` 的 mtime 分支换成 hash 分支，保留 `pending_push` 标记；
② 加一个「hash 基线缺失 → 回退 mtime」的过渡分支；
③ 在 multi-agent-platform 仓走它自己的 SillySpec 流程实施。
