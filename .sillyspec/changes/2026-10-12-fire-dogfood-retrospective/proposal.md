---
author: flow-machine-draft
created_at: 2026-10-12T14:06:41.953Z
---
# 提案书（Proposal）— 2026-10-12-fire-dogfood-retrospective

## 动机

任务原话转写：fire-equipment 会话（2026-10-10~12，30 轮，claude 平台）是 SillySpec 迄今覆盖面最全的一次 dogfood：完整五阶段跨三仓大变更 + 7 个轻量变更 + 限流中断恢复。四个分析子代理对其 full.json（5654 条日志）做了量化取证（调用量/重试密度/评审独立性/approve 治理），结论已驱动本仓四项清偿变更（approve-channel-attest / review-probe-injection / tick-evidence-multi-anchor / cli-friction-signal，均已归档）。本变更把量化发现与处置对照落盘为带日期复盘快照，供后续优化排期校准——对齐仓内 R16 系列分析文档先例（docs-check skip 登记同级处理）。

成功标准：
- 报告落盘 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，含五节：样本概况 / 调用量化（子命令分布、重试密度、读源码猜格式次数）/ 门禁有效性正面清单（评审真拦截的缺陷实录）/ 问题-处置对照表（P1~P11 与本批四变更 commit 锚）/ 校准基线与遗留项
- 报告内数据全部来自四子代理取证（时间戳/计数可回溯 full.json），不做无据推断
- docs-check skip 登记（R16 同级：带日期快照行号冻结），doc-ref-check 与 lint 复绿
- 纯文档变更：实测面按仓规自动跳过（docs gate 判定）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 报告落盘 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，含五节：样本概况 / 调用量化（子命令分布、重试密度、读源码猜格式次数）/ 门禁有效性正面清单（评审真拦截的缺陷实录）/ 问题-处置对照表（P1~P11 与本批四变更 commit 锚）/ 校准基线与遗留项
2. 报告内数据全部来自四子代理取证（时间戳/计数可回溯 full.json），不做无据推断
3. docs-check skip 登记（R16 同级：带日期快照行号冻结），doc-ref-check 与 lint 复绿
4. 纯文档变更：实测面按仓规自动跳过（docs gate 判定）

## 成功标准（可验证）

1. 报告落盘 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，含五节：样本概况 / 调用量化（子命令分布、重试密度、读源码猜格式次数）/ 门禁有效性正面清单（评审真拦截的缺陷实录）/ 问题-处置对照表（P1~P11 与本批四变更 commit 锚）/ 校准基线与遗留项
2. 报告内数据全部来自四子代理取证（时间戳/计数可回溯 full.json），不做无据推断
3. docs-check skip 登记（R16 同级：带日期快照行号冻结），doc-ref-check 与 lint 复绿
4. 纯文档变更：实测面按仓规自动跳过（docs gate 判定）
