---
author: flow-machine-draft
created_at: 2026-11-02T09:15:34.486Z
---
# 决策记录（Decisions）— 2026-11-02-knowledge-provenance

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：**风险**：① 模板特征词启发式可能漏判/误判——报告逐条列出 title/reason 供人工核，计数与审查实测对照暴露差异；② 平台仓路径不可用时只出本仓报告（如实披露）。 **放弃的方案**：① 直接跑 redomain 归域（审查实测：可迁全模板、真实决策 0 条可迁）；② 用 suggestDomainFromFiles 批量归域（37/39 与模块投票不一致、产出 src 伪域）；③ 在本变更里改知识文件（4A 定位只读对账，写入属 4B/4C）。
