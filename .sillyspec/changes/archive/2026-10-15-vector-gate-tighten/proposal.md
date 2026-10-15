---
author: flow-machine-draft
created_at: 2026-10-15T01:55:40.179Z
---
# 提案书（Proposal）— 2026-10-15-vector-gate-tighten

## 动机

任务原话转写：效果评估实证：CLI 向量召回层 2026-09-29 发布时缺省 auto（有平台配置即试），但平台端 /api/spec/knowledge/vector-search 从未实现（线上 404 实证半个月，10-14 评审探针坐实）——CLI 发布了一个对着不存在后端空转探测的能力，每次检索白走一轮失败分支，语义召回整体空缺。本变更做 CLI 侧契约收紧：缺省从「有平台配置即试」改为「显式开启才试」（local.yaml knowledge.vector_search: on|auto 或 env SILLYSPEC_KNOWLEDGE_VECTOR=on|auto），404 另按平台 URL 进程级死信短路；平台侧实现端点后打开开关即恢复，CLI 零改动（平台侧实现另立变更登记）。

成功标准：
- 平台已配置但未显式开启时 matchKnowledgeHybrid 对平台零网络调用、本地回退无 vector 标记
- 显式 on 时既有命中/降级/超时行为逐字段不变（测试 ①~⑦ 零回归）
- 404 后同平台 URL 本进程后续调用零网络请求（死信短路）
- scope 遍历层不受开关门影响（第三层照常工作）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 平台已配置但未显式开启时 matchKnowledgeHybrid 对平台零网络调用、本地回退无 vector 标记
2. 显式 on 时既有命中/降级/超时行为逐字段不变（测试 ①~⑦ 零回归）
3. 404 后同平台 URL 本进程后续调用零网络请求（死信短路）
4. scope 遍历层不受开关门影响（第三层照常工作）

## 成功标准（可验证）

1. 平台已配置但未显式开启时 matchKnowledgeHybrid 对平台零网络调用、本地回退无 vector 标记
2. 显式 on 时既有命中/降级/超时行为逐字段不变（测试 ①~⑦ 零回归）
3. 404 后同平台 URL 本进程后续调用零网络请求（死信短路）
4. scope 遍历层不受开关门影响（第三层照常工作）
