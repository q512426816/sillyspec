---
author: qinyi
created_at: 2026-08-08 13:10:07
---

# 提案书（Proposal）

## 动机

SillySpec 立身之本是「多 agent 同时操作代码」（CLAUDE.md 第一段），但 CLI 无任何机制让 agent 在写操作（`quick --done` / `execute --done`）前感知工作树里的他者并发改动。本次主会话与并行会话在同一仓库实打实撞车（俩会话都改 `quick-audit.js`/`shared.js`/`complete.js`），把这一缺口从抽象论据变成体感。本提案落实债单「### 2026-08-08 候选增补」（commit 27d2e41）。

## 关键问题（现有方案为何不够）

1. **内部已知却对外静默**：`src/run/shared.js:406` 的 `isQuickMetadata()` 已把 `.sillyspec/changes/<他者变更>/` 下脏文件识别为「并发他者会话的工作」，却作为元数据噪音**整体静默放行**——agent 无从知情，分类逻辑现成却只用于过滤不用于报告。
2. **写操作是撞车高发点却零预检**：`quick --done` / `execute --done` 是 sillyspec 写进度库 + agent 收尾提交的点，正是多 agent 撞车高发处，却没有任何并发感知。撞车后只能靠 agent 手跑 `git status` 摸对方足迹避让（如本次会话全程所做）。
3. **同工作树 git status 只见主仓会话**：在独立 worktree 工作的会话对主仓 `git status` 不可见（v1 非目标，留 v2 worktree 扫描）。

## 变更范围

- 新增 `src/run/concurrent-detect.js`：纯函数 `detectConcurrentChanges()` + `formatConcurrentWarning()`，单次 `git status --porcelain` 扫描，复用 `isQuickMetadata` 分类，产出 `foreignFiles`（他者真实业务文件）+ `otherActiveChanges`（脏变更目录）两类信号。
- 修改 `src/run/complete-handlers.js`：quick --done 完成路径加并发预检 warn（ownFiles = `review.changedFiles ∪ guard.baselineFiles`，B-01 修）。
- 修改 `src/run/gates.js`：`completeStageGates` 入口 guard `stageName==='execute'` 加并发预检 warn（ownFiles 源优先级链，B-02 钉）。
- 新增测试：纯函数测 + 2 集成测试。
- 非阻塞 advisory（绝不阻断 audit/gate），fail-open（git 不可读不崩）。

## 不在范围内（Non-Goals）

- 不做 worktree 扫描（`git worktree list` 逐 worktree 查脏）——留 v2。
- 不上只读 `sillyspec doctor` 子命令（主动查询入口）——留 follow-up。
- 不做硬阻断——并发是立身前提，阻断破坏合法协作；「是否撞车」属软判定归 sillyhub 不归 SillySpec 确定性 gate。
- 不检测 quick/execute 启动点——仅 `--done` 写入点（用户决策①）。
- 不扩到 verify/archive --done——留 fast-follow（verify 产物校验本身 fail-closed、archive 低频）。
- 不改 `isQuickMetadata` 返回值——仅新增对外报告函数。

## 成功标准（可验证）

- 他者脏文件 / 脏变更目录在场时，`quick --done` / `execute --done` 打印 `⚠️` 警告含文件清单 + 提交卫生提示。
- 干净仓（无他者并发）零额外输出。
- 检测不阻断：audit result.status / gate 通过性 / `isQuickMetadata` 语义完全不变（回归测试守护）。
- `git status` 读失败时 fail-open（不崩、不阻断、不误报）。
- 多 agent 脏工作树场景：本会话预存文件（baselineFiles）不被误报为他者（B-01 验收）。
- in-place 模式：本变更交付文件不被误报为他者（B-02 验收）。
- `npm test` 全绿 + `npm run lint` 通过。
