---
author: flow-machine-draft
created_at: 2026-10-15T04:29:32.251Z
---
# 提案书（Proposal）— 2026-10-15-vector-switch-discoverability

## 动机

任务原话转写：效果评估清偿批 B1 收尾缺口（用户问出）：向量开关 knowledge.vector_search 收紧为缺省关后，新项目/其他项目的 agent 无从知晓该开关存在——代码里唯一文档是 knowledge-vector.js 头注释（agent 不可见面），init 模板/知识 help/search 输出/注入面均未提及。修法三触点：①config-schema.js 注册 knowledge.vector_search live 键（单一注册源+renderExample 模板加 knowledge 段，init 落盘 local.yaml.example 即自文档，防漂耦合测试自动钉住）；②knowledge-vector.js 新增 vectorSwitchHint(cwd) 单源（平台已连接+开关未开→一行可执行提示，否则空串零噪音）；③两个需要语义召回的时刻消费提示：knowledge search 输出加 hint 键、flow start 注入零命中行追加提示。

成功标准：
- config schema 注册 knowledge.vector_search 且 renderExample 含 knowledge 段（防漂耦合测试绿）
- vectorSwitchHint 三态：平台未连接空串/已连接未开提示/已开空串
- search 输出 hint 键（未开+已连接时）；flow 注入零命中时追加提示行（已开或未连接零新增）
- 新增测试全绿+既有 vector/schema 测试零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. config schema 注册 knowledge.vector_search 且 renderExample 含 knowledge 段（防漂耦合测试绿）
2. vectorSwitchHint 三态：平台未连接空串/已连接未开提示/已开空串
3. search 输出 hint 键（未开+已连接时）；flow 注入零命中时追加提示行（已开或未连接零新增）
4. 新增测试全绿+既有 vector/schema 测试零回归

## 成功标准（可验证）

1. config schema 注册 knowledge.vector_search 且 renderExample 含 knowledge 段（防漂耦合测试绿）
2. vectorSwitchHint 三态：平台未连接空串/已连接未开提示/已开空串
3. search 输出 hint 键（未开+已连接时）；flow 注入零命中时追加提示行（已开或未连接零新增）
4. 新增测试全绿+既有 vector/schema 测试零回归
