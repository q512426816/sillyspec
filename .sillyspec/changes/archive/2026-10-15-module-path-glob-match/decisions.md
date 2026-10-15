---
author: flow-machine-draft
created_at: 2026-10-15T08:00:54.993Z
---
# 决策记录（Decisions）— 2026-10-15-module-path-glob-match

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：命中面变宽可能把「脏卡/过宽 pattern」的路径吸进模块归属（如 `**` 过宽 pattern 吞全仓）——评估：pattern 质量是卡作者责任，历史精确条目语义逐字未变；过宽 pattern 在旧世界也会命中（前缀语义同样宽）。次风险：存量数据（平台仓 92 条伪域 + 444 条 unmapped 决策）不随本修复自动迁移——本变更止增量；存量清偿属消费仓数据治理（伪域可 tests --redomain 迁；unmapped 决策因 id 寻址含 file 键迁移需专门工具，与本仓 C5 同裁决缓办）。第三风险：head 注释再踩 `*/` 序列坑（模块注释曾因 `**/*.tsx`/`**/` 字面量提前闭合——两次实测）——已改措辞，留训于设计。放弃方案：①把 globMatch 复制进 modules.js（重复实现，违反单一源）；②改 sillyspec-scan 生成非 glob 卡（卡形态已散落消费仓存量 + scan 重扫成本，匹配器宽容化收益全局）；③只在 fr-index 单点修（decision/module-impact/docs-debt 等仍失效，治标不治本）。
