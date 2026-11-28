---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — hooks

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-hooks-001@v1 hook 零未声明依赖（测试直接 ESM 导入）
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
原编号：D-904@v1
锚点：src/hooks/worktree-guard.js
最近确认：71a7fe6
理由：src/hooks/ 下 hook 会被测试直接以 ESM 导入——不得引入 package.json 未声明的外部包，简单本地配置解析优先用项目内已有实现或标准库，否则 `npm test` 在导入阶段即失败（ql-20260604-001-7a4c）。

## D-core-engine-013@v1 refresh 编辑拍 × scan 覆盖保护=guard 握手（mode+refreshDocs 白名单前置分支，顺带修 7/40 位错配）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-007@v1
锚点：未记录
最近确认：318e80c
理由：握手机制三件：①refresh ①拍**原子写** scan-guard.json 为刷新会话态：{ name_zh: '增量刷新守卫', mode: 'scan-refresh', refreshDocs: ['docs/<p>/scan/<doc>.md', ...]（相对 specRoot 的 POSIX 路径）, sourceCommit: <7 位短 HEAD——与盖章同格式>, startedAt: now, forceRescan: false }；②worktree-guard.js shouldBlockScanDocOverwrite 在 guard 读取后加**前置分支**：guard.mode==='scan-refresh' 且目标文档相对路径 ∈ refreshDocs → 放行；不在白名单的 scan 文档继续走原保护（非本次刷新面不放松）；③顺带修存量 bug：check-1 比对前双方归一为 7 位短哈希（String(x).slice(0,7)），恢复「同基线放行/异基线拦截」的设计本意（现 7 vs 40 恒拦）。不做 draft 暂存区方案（agent 写 .runtime 草稿 + CLI apply——复杂度不成比例且 postcheck 时序别扭）；不滥用 forceRescan=true（会全局解除保护到下次 scan，攻击面过大）。--done 后 guard 不清理（沿用现状「下次 run scan 重写」语义，与 scan 会话同款生命周期）。

## D-hooks-002@v1 2026-11-28-file-write-optimistic-lock——问题：repo-native 模式下 daemon 与 CLI 共用同一物理 spec 树，多个 agent 会话各自按上下文里的旧快照整文件 Write，互不
状态：implemented
变更：2026-11-28-file-write-optimistic-lock
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-28-file-write-optimistic-lock/design.md
文件：docs/file-write-optimistic-lock.md, src/file-guard.js, src/hooks/claude-post-tool-use.cjs, src/hooks/claude-pre-tool-use.cjs, test/file-guard.test.mjs, test/hub08-spec-sync-conflict.test.mjs
最近确认：2c560803290281d6ba139bb1750f3df7aa594059
理由：问题：repo-native 模式下 daemon 与 CLI 共用同一物理 spec 树，多个 agent 会话各自按上下文里的旧快照整文件 Write，互不感知（Claude 内置的 stale-read 校验只覆盖 Edit，不覆盖 Write 全文件覆盖，且 Codex 等引擎无此校验）。下行通道仲裁（2026-11-28-spec-downstream-write-arbitration）只防「同步通道覆盖」，防不了「另一个 agent 直接写」。 方案：**乐观锁放在 hook 层**，用「读取时记录 hash → 写入前比对」的标准乐观并发控制。三块改动： 1. 新增 `src/file-guard.js`（ESM 纯逻辑 + 状态读写）：`recordRead()` 在 PostToolUse(Read) 后把「路径 → sha256」写进 `specRoot/.runtime/state/file-read-baseline-<session_id>.json`；`checkBeforeWrite()` 在写前比对当前盘面 hash 与基线，不一致返回 block + 原因。只监控 `specRoot` 前缀（默认 `.sillyspec/`），避免全仓 hook 开销。 2. 新增 `src/hooks/claude-post-tool-use.cjs`（PostToolUse 入口，matcher `Read`）：调 recordRead，全程 fail-open。 3. 改 `src/hooks/claude-pre-tool-use.cjs`：在既有 worktree-guard 判定**之后**追加 file-guard 判定（worktree 拦截优先，行为零回归），file-guard 异常一律放行并留痕。 为什么不放在同步层：同步层只能事后发现「服务器/本地不一致」；写入层的窗口是「agent 读到写」这几分钟，只有写前拦截才能阻止覆盖本身。为什么用会话级基线文件而不是内存：hook 每次是独立进程，跨调用只能靠文件；`session_id` 由 Claude Code 注入，天然隔离并行会话。
