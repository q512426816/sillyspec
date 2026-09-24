---
author: qinyi
created_at: 2026-09-24
---

# 提案书（Proposal）

## 动机

门禁隔离快照（%TEMP%/sillyspec-gate-*）泄漏不可自愈：进程被杀、rmSync 无重试、git worktree 注册残留三条路径必然漏，实测攒到 41 个目录+2 个 prunable 注册，且全仓无清扫机制——每次门禁跑成功也漏一点。

## 关键问题

1. **崩溃即泄漏**：门禁自身警告"勿按超时杀进程"，但被杀是常态，finally cleanup 根本不执行。
2. **Windows 清理脆**：`rmSync` 无 `maxRetries`，junction/EPERM 下失败被空 catch 吞掉（"残留交 OS tmp 清理"，但 OS 不清 %TEMP%）。
3. **无发现机制**：残留既不自愈也不可见，doctor 无维度，只能等人工撞见。

## 变更范围

账本登记（create/cleanup 双路径销账）+ 创建前 TTL×pid 双闸自动回收（目录与 git 注册双清）+ cleanup Windows 重试与 prune 兜底 + doctor 泄漏维度（warning 级）。

## 不在范围内（显式清单）

- 不改门禁判定语义、快照隔离/血统三态、信任边界。
- 不做常驻清扫进程、不做 %TEMP% 全局清理器。
- 不改 quick 守卫/worktree doctor 既有 TTL 默认值。
- 不清理其他仓/其他工具的临时目录。

## 成功标准（可验证）

- 杀掉门禁进程后，账本留条目；下一个门禁建快照前自动回收（目录+worktree 注册皆无）。
- 活跃门禁快照（pid 活或 age<TTL）零误删。
- doctor 报出超期泄漏条目（warning 级不阻断）。
- 门禁正常路径输出逐字节不变；全量测试与 lint 零失败。
