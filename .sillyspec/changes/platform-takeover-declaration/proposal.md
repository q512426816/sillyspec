---
author: agent (Claude) + 用户
created_at: 2026-08-15
updated_at: 2026-08-15
---
# proposal.md — 平台接管声明机制

## 一句话
项目根落一个不随指针过期的「平台接管声明」，指针丢失时 CLI fail-closed 报错引导恢复，堵住"指针该在但不在 → 静默建本地进度库"的分裂断点。

## 背景与动机
- ql-20260815-004 已让 init 即落双指针，消除了 init→scan 窗口期断点。
- 但指针文件本身可能消失：`platform pointer --cleanup`（用户/误操作）、24h STALE 清理、项目目录挪动、指针写入静默失败。
- 现状 fail-closed 只覆盖"指针存在但坏"；指针不在 = 被当作纯本地项目静默落本地库，是进度库分裂（本地 42 vs 平台 3 changes 零交集）的直接成因。

## 提议
- 声明文件 `.sillyspec-platform-managed`（项目根）：`{ managed, specRoot(副本), workspaceId, declaredAt }`，无过期。
- 写入收敛到 `writePlatformPointer`（三写：主文件+指针+声明）。
- 读取**双入口**：`resolvePlatformSpecDir`（progress/status/worktree/doctor 路径）+ `runCommand` 指针恢复链（run/quick/scan 全 stage 路径）——无指针 + 有声明 → fail-closed（`PlatformManagedError` / exit 1）+ 三选项恢复引导。
- 删除唯一路径 = `platform disconnect`，语义为三清（local.yaml 段 + 指针 + 声明）。
- 逃生口：显式 `--spec-dir` 不受影响。

## 不在范围内 / Non-Goals
- 本地→平台 migration/merge（P2 另行）。
- 修改 24h STALE 指针清理策略。
- 网络验证/daemon 在线检查。
- 保护从未接入平台的项目。

## 备选方案（已否决）
- B db 侧标记：本地无 db 时无从查起，堵不住冷启动。
- C 平台网络验证：daemon 不可达即瘫痪 CLI，违背离线可用硬约束。
