---
author: qinyi
created_at: 2026-10-06T00:30:00+08:00
---
# 中断恢复与多 agent 并发安全流程

## 目标

跨会话、跨天、多 agent 并行下不变味：SQLite（sillyspec.db）是进度唯一权威，断点随时续跑；会话/变更/worktree 三级隔离让多个 agent 同时操作一个仓库不串线、分得清谁改的；提交纪律防夹带他人进行中文件。

## 参与模块

- progress.js + progress/ / db*.js：进度唯一权威（changes/stages/steps 落库）
- workspace.js / quick-session-owner.js / agent-session-log.js：会话身份与归属
- hooks/：worktree 守卫（直读 DB 做写入/命令守卫）
- worktree*.js：worktree 生命周期与幽灵清理
- git-helper.js / commit-guard.js / wt-commit.js：提交纪律与守卫
- doctor-diagnostics.js：13 维自诊（幽灵 worktree / 僵尸会话归档）
- handoff.js：跨会话交接

## 流程摘要

```
恢复：status / progress show 查看进度
  → 完整道 run <stage> 续跑（--reopen --from-step 可重开已完成阶段）
  → 轻量道重跑 flow start 出恢复简报；handoff 出交接包；doctor 自诊自愈

并发：会话启动 export SILLYSPEC_SESSION_ID=<唯一标识>（接管类判定依赖）
  → 每变更一个目录 + 一行 DB（隔离）
  → 文件锁分配编号（O_EXCL 抢锁 + 双占用 fail-closed 硬拦）
  → quick --files 声明文件边界（归属切分）
  → --done 前并发写预检（脏文件分类：本变更关联 vs 他者，后者告警）
  → 提交：显式 pathspec 且 add/commit 同清单（git commit -m ... -- 文件…）
      禁目录级 add / git add -A；核对暂存面用 git diff --cached --name-only 全量读
```

## 关键规则

- 三级隔离：会话 / 变更 / worktree。
- 双占用 fail-closed：盘上同 ID 条目 ≥2 直接硬拦，不猜。
- 会话身份缺失降级机器级标识（只拦他机，同机不设防）——harness 不持久 env 时每条接管命令显式 `--session`。
- 幽灵 worktree / 僵尸会话由 doctor 自动归档。
- 破坏性 git op 前先备份；多 agent 场景 Edit 前重读最新盘面。
