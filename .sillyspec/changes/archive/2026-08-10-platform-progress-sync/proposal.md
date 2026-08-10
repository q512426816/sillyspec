---
author: qinyi
created_at: 2026-08-10T15:06:03+08:00
change: 2026-08-10-platform-progress-sync
---

# 提案（Proposal）— 多用户进度同步到 sillyhub 平台

## 动机

SillySpec 的进度库 `.sillyspec/.runtime/sillyspec.db`（better-sqlite3，非 PROJECT.md 过时描述的 sql.js）是流程状态（stage/step/approvals/batch_progress/isolation）的唯一 source of truth，但被 `.gitignore` 忽略——各用户本地各自一份、互不可见。现有 `src/sync.js` 的 `SyncManager` 仅单向上行（`POST /api/changes/{name}/progress` 推 `ProgressManager.read()` 全量进度），无下行 pull、无多用户合并、无冲突处理；`changes` 表的 `platform_change_id/workspace_id/platform_last_sync/sync_enabled` 四字段是死占位（只写不读）。

需求：同一项目进度在 sillyhub 平台统一可见；多用户可拉平台进度覆盖本地；处理张三/李四各有更新的合并（详见 design.md §1）。

## 方案概述

**方案 A：平台权威 + progress JSON 投影同步**（用户已选定）：
- DB 始终本地嵌入式不变（保本地可用性、不换引擎）；同步载体是 `ProgressManager.serializeForSync()`（**新增**，六表完整序列化）输出的 JSON 投影（文本、可合并，绕开 SQLite 不可合并）。
- 补 `ProgressManager.import()`（**新增**）逆操作重建 DB 行：单事务原子写 + import 前 `copyFileSync` 到独立 `.bak` snapshot。
- user/base_ts/pushed_at 走 **HTTP header**（`X-SillySpec-User`/`X-SillySpec-Base-Ts`/`X-SillySpec-Pushed-At`，body 保持裸 JSON，sillyhub 向后兼容零回归，D-015）。
- 乐观锁 base_ts（`changes.last_synced_platform_ts` 新列）+ b 策略 human-in-loop（绝不字段级 auto-merge）。

详见 design.md §5。

## 内部交付波次（单 change 内，不拆 change）

- **Wave 1 地基（纯本地，可独立测）**：`serializeForSync()` + `import()` + schema 加列 + `.bak` snapshot
- **Wave 2 下行**：`sync.js pull()`/`pullList()` + sillyhub GET 端点（独立 change）+ 轻量列表 + user/base_ts header
- **Wave 3 冲突**：base_ts 乐观锁 + 冲突持久化 + `platform resolve` + b 策略交互

## 边界（scope）

- **本 change 纯 SillySpec 侧**（B3 用户决策"不阻塞"，D-014）：serializeForSync/import/pull/resolve/schema 加列/triggerPull/user 字段。
- **sillyhub 后端改动拆独立 change** 另排期（GET 端点 + 聚合存储 + base_ts 冲突检测 + POST header 读取 + 落盘灾备）；sillyhub 未就绪时 pull Best Effort 降级保本地可用（R-09 已由 D-015 header 方案零回归化解）。
- 不碰 `src/sillyhub-mcp/` 任务派发层（`converge_mission` 铁律 D-004 无关）。

## 非目标（克制清单，见 design.md §3）

离线 push 队列 / 实时推送(WebSocket/SSE) / 字段级 auto-merge / 分布式锁 / SQLite 远端连 / 改 DB source of truth 模型。
