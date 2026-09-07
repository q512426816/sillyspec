---
author: qinyi
created_at: 2026-09-07T23:02:00+08:00
---

# 提案（Proposal）— 2026-09-07-ir-hardening

## 一句话

IR 补强四件：把 P3b/P3a 的存量豁免收紧为「新变更默认强制」、design 清单行级核验、delta 补跑链修复与增量 scan 回灌、supportedFixes 机器试跑回执。

## 为什么做

IR P3a–P3d 落地后，四条核验链仍各留一个可绕过的口子（探针段缺失 skip / 零声明 skip / design 清单无核验 / delta 链断），对不配合的 agent 而言 IR 实际是可选项——「agent 只做判断、机器做核验」的原则没有兑现到底。

## 做什么

1. **严格模式闸门**（FR-01）：created_at ≥ IR_STRICT_SINCE 的新变更，verify 探针子节全缺 = ERROR、target_files 整变更零声明 = ERROR；存量豁免零变化。
2. **design 清单核验**（FR-02）：brainstorm 末步对 design.md 文件清单逐条存在性核验（幻觉路径 ERROR / NEW: 豁免）。
3. **delta 链闭合**（FR-03）：手动补跑 project 同口径修复；last-delta sidecar + scan 启动 advisory 增量回灌。
4. **acceptsFix 最小件**（FR-04）：docs check --fix 修复回执（前后失效数对比）；引用类诊断 supportedFixes 可逐字执行。

## 不做什么（Non-Goals）

通用 acceptsFix 框架、scan 文档模块级增量刷新、跨仓对账口径、部分声明收紧——见 design.md 非目标节。

## 影响

14 文件修改 + 4 测试新增；无 db/表结构变更；存量变更行为零变化（时间戳闸门 fail-open）。
