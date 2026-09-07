---
author: qinyi
created_at: 2026-09-07T23:02:00+08:00
---

# 需求（Requirements）— 2026-09-07-ir-hardening

## 功能需求

- **FR-01 严格模式闸门与两档收紧**：`IR_STRICT_SINCE` 常量（'2026-09-07'）+ `getChangeCreatedAt` 只读访问器 + `isStrictChange` helper（读不到 fail-open 落存量豁免）。严格模式下：verify-result.md 探针子节全缺且无 verify-facts.json → ERROR（code `probe_prefill_missing_strict`，指引 verify-probes --init）；task 卡全部零声明 → ERROR（code `target_files_all_missing_strict`，指引逐卡 Edit）。存量（< 闸门）skip/WARNING 语义零变化；部分声明/全跨仓任何模式不变。
- **FR-02 design 清单行级核验**：`validateDesignFileList({changeDir, cwd})` 纯函数——清单条目路径存在（含 `<...>` 占位段归一化）或 NEW: 前缀通过；不存在且无前缀 → ERROR（code `design_file_ref_invalid`）阻断 brainstorm 完成；清单段缺失/解析异常 → WARNING 不阻断。挂点与决策模块域核验同点位。
- **FR-03 delta 链闭合**：`delta --change` 的 project 从 progress.project 取值（null 兜底降级不变）；`writeLastDeltaSidecar` 落 `.runtime/last-delta.json`（schemaVersion 1 / change / affectedModules / affectedFiles / updatedAt，幂等覆盖 fail-soft），归档自动路径与手动补跑都写；`executeScanResumeCheck` 读 sidecar（14 天窗口）打印增量核对 advisory，缺失/过期/解析失败静默。
- **FR-04 acceptsFix 最小件**：`docs check --fix` 输出修复回执（修复前失效数 → 重锚数 → 修复后失效数，后值由 fix 后重跑失效收集得出）；引用失效类诊断 supportedFixes 全部为可逐字执行的 CLI 命令（含 --paths 范围）；非 --fix 路径输出零变化。

## 非功能需求

- **NFR-01 存量兼容**：created_at < IR_STRICT_SINCE 的变更全链路行为与改动前逐字节一致（skipReason 允许追加来源注记）；测试锁定。
- **NFR-02 fail-open 边界**：isStrictChange 异常、sidecar 读写异常、回执计数异常均降级不阻断主流程。
- **NFR-03 平台模式**：specRoot/runtimeRoot 分离场景下闸门读 db、sidecar 落 runtimeRoot 口径正确。
