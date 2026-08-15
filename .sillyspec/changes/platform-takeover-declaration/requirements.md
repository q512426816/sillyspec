---
author: agent (Claude) + 用户
created_at: 2026-08-15
updated_at: 2026-08-15
---
# requirements.md — 平台接管声明机制

## FR-01 声明落盘
平台模式接入（init 带平台 flag / scan 带平台参数）时，项目根落 `.sillyspec-platform-managed` 声明文件，含 `managed: true`、specRoot 副本、workspaceId、declaredAt。声明无过期机制。

## FR-02 fail-closed 阻断
恢复指针不存在但声明存在且有效（managed=true）时，CLI fail-closed，**双入口**：① `resolvePlatformSpecDir` 路径（progress/status/worktree/doctor 等）抛 `PlatformManagedError`；② `runCommand` 指针恢复链路径（run/quick/scan 全 stage 命令）打印引导 + exit 1。报错含原 specRoot + 三选项恢复引导（重跑 scan 重建指针 / platform disconnect 解除托管 / 显式 --spec-dir）。

## FR-03 本地模式零变化
无声明且无指针的项目（纯本地），行为与现状逐字节一致。

## FR-04 唯一退出路径
`platform disconnect` 三清：local.yaml platform 段 + 恢复指针 + 声明文件。`platform pointer --cleanup`（含 STALE 清理）只删指针不删声明，cleanup 输出提示 disconnect 才是彻底脱离方式。

## FR-05 逃生口
显式 `--spec-dir` / `--spec-root` 传参时跳过声明检查（与现有 PointerUnreachableError 逃生口语义一致）。

## FR-06 诊断可见
doctor 诊断（D2 pointer 健康）新增 `pointer_missing_but_managed` 信号：声明存在+指针缺失，诊断项（非阻断），给出与 FR-02 相同的引导。

## FR-07 幂等与安全
声明写入幂等（重复写无害）；任何自动流程不删声明；不自动删任何数据。
