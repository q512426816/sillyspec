---
author: qinyi
created_at: 2026-08-13 13:26:51
---
# 需求（Requirements）— quick --done 同文件并发检测

## 功能需求
- **FR-01**: step1 quick 启动录 allowedFiles 的 sha256 到 `guard.allowedFilesHash`（文件不存在/读失败跳过，容错读）
- **FR-02**: --done `auditQuickCompletion` 检测 allowedFile 在 baseline（用 `isBaselineFile`，含目录前缀，避 P2-1 目录折叠盲区）且 当前 sha256 ≠ `guard.allowedFilesHash[file]` → 同文件并发
- **FR-03**: 同文件并发 warn（advisory 不阻断，不改 result.status）+ 给 `git add -p`/`git diff > mine.patch + git apply --cached` 分离指引
- **FR-04**: 向后兼容（旧 guard 无 `allowedFilesHash` → `?.[f] === undefined` 检测跳过）

## 决策引用
- **D-001@v1**: 检测范围 quick --done only（最高频并发热点）
- **D-002@v1**: warn advisory 不阻断（与 detectConcurrentChanges 一致）
- **D-003@v1**: 方案 A hash 对比（非 B 强制审计 / C patch 减法）

## 剩余风险
- P2-1（grill）：检测用 isBaselineFile 而非 includes（避目录折叠盲区，execute 落实）
- P2-2（grill）：插入点 try 内末尾（异常由外层 catch 兜）
- P2-4：未声明 allowedFiles 的 quick 不检测（已知限制）
