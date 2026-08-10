---
author: qinyi
created_at: 2026-08-10 11:29:04
---

# 提案书（Proposal）

## 动机

主仓一有并发未提交 dirty 文件（多 agent 仓库高频——他人会话正在编辑），`applyWorktree` 的 step4.5/5a fail-loud 拦截就**整体阻断 apply**，agent 唯一出路是手动 `cp` worktree 文件到主仓，但 CLI 不给任何 cp 线索。memory 记录此痛点复发 3 次（`sillyspec-worktree-apply-blocked-by-staged-dirty` / `sillyspec-apply-gate-two-blockers` / `sillyspec-worktree-patch-apply-conflict`）。需在不破坏 fail-loud 安全边界的前提下，让 agent 拿到可执行的逐文件 rescue 指令。

## 关键问题

1. **现状不给 cp 线索**：拦截只说"请先 commit/stash"，但 dirty 往往是他人会话的、agent 无法替他人处理，只能盲猜 cp 哪些文件、哪些安全、哪些会覆盖他人工作。
2. **fail-loud 必须保留**：实证（autocrlf on/off 对照）证实 step4.5 的"git --3way 对 dirty 树不稳"在 Windows/autocrlf 下确有其据（CRLF 副作用），仓库 CRLF 混用 + 规则 13 要求 Windows 兼容 → 拦截不能放宽。
3. **rescue 不能造成新数据丢失**：cp 若覆盖主干已提交推进文件（hashMismatch）或他人未提交 dirty，等于回退他人工作。rescue 必须自动排除这两类 + 给风险标注。

## 变更范围

- 新增导出纯函数 `generateRescueCommands`（逐文件分类：SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）
- `applyWorktree` 新增 additive 返回字段 `result.rescueCommands`；step4.5/5a 拦截分支 + assess 三处调用
- **step3.5（前移）**：把现 step5b 的 hashMismatch 计算前移到 step4.5 之前（Grill P0 修复——否则拦截短路时 EXCLUDE-MISMATCH 失效，cp 会覆盖主干已提交推进）
- step2 扩展收集 deletedFiles；step4.5/5a 拦截按统一口径算 dirtyFiles（tracked-modified∪untracked）
- src/index.js `worktree apply`/`assess` 打印器补结构化 `Rescue commands (N/M)` 段（UX 增强）
- 补正 step4.5 注释 :243-245 归因（CRLF 副作用非 git 限制）

## 不在范围内（显式清单）

- **不放宽 step4.5/5a dirty 拦截**（fail-loud 安全边界，R-01）
- **不新增 `--files`/`--rescue` CLI flag 或子命令**（任务卡定 print-only）
- **不修 CRLF 根因**（`.gitattributes` 规范化是 troubleshooting.md「Edit CRLF 失配」方向 A 的更大工程，超范围）
- 不改 apply 的 patch / --3way / --merge 决策路径
- 不自动执行 rescue cp（只输出指令，agent 决定）
- 不改 meta.json schema / sillyspec.db 表结构 / applyWorktree 签名

## 成功标准（可验证）

- 主仓并发 dirty 场景下 apply 被拦截时，CLI 输出逐文件 cp 指令清单（SAFE-CP 子集）+ 被排除文件风险标注
- **R-03 回归**：main 已提交推进 fileA + fileB dirty 共存时，rescue 排除 fileA（hashMismatch 前移生效，专项测试锁死）
- fail-loud 对真正冲突（dirty∩changed、--3way 真冲突）仍拦截，行为零改动
- 未触发 dirty 拦截时 `result.rescueCommands === null`，apply 行为 100% 不变（零回归）
- assess（checkOnly）阶段也能预览 rescue 指令
- npm test 全量 EXIT=0、npm run lint 绿
