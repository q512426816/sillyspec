---
author: qinyi
created_at: 2026-09-07T03:32:51+08:00
---

# 提案书（Proposal）

## 动机
把 archify「visual-check 可独立复核」搬到 verify 域（种子稿 §4 / P3b 分期）：探针命令持久化可复跑 + gate 一致性抽查，消除「预填被篡改」的声称测过残余风险，并给 claims 分层标注。

## 关键问题
1. verify-result.md 探针预填段 agent 可篡改/删除，无一致性核验
2. 探针命令行与首跑快照未持久化，事后无从审计复跑
3. 报告章节无机器/人工分层，读者无从分辨证据强度

## 变更范围
verify-facts.json 机器底稿（CLI 全权）+ checkProbeConsistency 分级抽查（gate 接线）+ 骨架层标注 + Step 7 prompt 纪律 + 测试

## 不在范围内（显式清单）
- agent 手写 facts 表（判断层保持散文）
- 探针 2/4 命令化（人工判断层）
- P3c/P3d（独立变更）

## 成功标准（可验证）
- 篡改/删除预填探针段被 gate 拦（ERROR）
- probe3/5 环境漂移仅 WARNING；存量旧报告零红门禁
- facts.json 含可复跑命令行；层标注进骨架不破坏结论提取
