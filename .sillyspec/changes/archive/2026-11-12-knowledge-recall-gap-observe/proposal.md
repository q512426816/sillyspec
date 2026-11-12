---
author: flow-machine-draft
created_at: 2026-11-12T07:48:34.506Z
---
# 提案书（Proposal）— 2026-11-12-knowledge-recall-gap-observe

## 动机

任务原话转写：知识召回缺口记录：历史裁决不被意图查询命中

本次对话中先给出「补生成式快照」建议，事后 grep 才发现该能力已于 2026-10-15 裁决冻结（D-001@v1），暴露知识召回缺口：knowledge search 按关键词命中，无法覆盖「我要不要做 X」这类意图查询，历史「已裁决不做」的决策不会在提建议时被自动召回。按规则 18 记入 troubleshooting.md 作为独立观察项。

成功标准：
- docs/troubleshooting.md 新增条目「意图查询无法召回历史裁决」，含症状、根因、诊断、处置四段
- 条目以本次 L3 裁决未被召回为实证，指明召回机制（knowledge-scope / 注入面）的缺口位置
- 文档头部 updated_at 更新为 2026-11-12

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. docs/troubleshooting.md 新增条目「意图查询无法召回历史裁决」，含症状、根因、诊断、处置四段
2. 条目以本次 L3 裁决未被召回为实证，指明召回机制（knowledge-scope / 注入面）的缺口位置
3. 文档头部 updated_at 更新为 2026-11-12

## 成功标准（可验证）

1. docs/troubleshooting.md 新增条目「意图查询无法召回历史裁决」，含症状、根因、诊断、处置四段
2. 条目以本次 L3 裁决未被召回为实证，指明召回机制（knowledge-scope / 注入面）的缺口位置
3. 文档头部 updated_at 更新为 2026-11-12
