---
author: qinyi
created_at: 2026-07-10T16:10:00+08:00
---

# 提案书（Proposal）— quick 会话状态隔离

## 动机

quick 阶段固定 `changeName='default'`，所有 quick 会话共享 DB 单行 `progress.default.quick`。多个并行 quick 会话（multi-agent-platform 同日 3+ 会话是**常态**）互相覆盖：状态回退、post-check 找错 ql、steps 在 step2/step3 横跳无法收敛。底层是 sql.js 进程内内存库跨进程零互斥，last-write-wins。

## 关键问题（现有方案为何不够）

1. **DB 单行共享**：`changes.name='default'` + `stages.stage='quick'` 全项目唯一一行，多会话 last-write-wins。`current-quick-run-id`（run.js:1597）虽生成但**零读取者**，注释自承"逻辑隔离"未生效。
2. **post-check 找错 ql**：`auditQuickCompletion` 读 `progress.quickGuard`（DB 单行快照），多会话时拿到他者 baseline → 找错 ql 绑定。
3. **静默继承**：启动无条件 reset（run.js:1585）+ 复用他者 quick-guard.json linkedChanges（run.js:1434），不告警不询问。

## 提案

quick 每会话用 `sessionId`（UUID 前 8 hex）作 changeName，DB 分行 `progress.quick-<uuid8>`。各自 steps/baseline/ql 独立。**不开 worktree**（quick 轻量定位 + baseline 语义=主工作区脏文件与 worktree clean 冲突），**不动 db schema**（change key 天然分区）。

## 不在范围内（Non-Goals）

- 工作区文件冲突（A/B 改同一文件仍撞，quick 不 worktree，文档声明）
- QUICKLOG 序号竞态（append check-then-act，留后续）
- 自动 session 识别（sillyspec CLI 短进程无 session 持久，多会话靠 --change 显式传递）
