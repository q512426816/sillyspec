---
author: flow-machine-draft
created_at: 2026-10-15T04:29:32.251Z
---
# 设计记录（Design Record）— 2026-10-15-vector-switch-discoverability

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

效果评估清偿批 B1 收尾缺口（用户问出：「新项目或其他项目里，他们的 agent 怎么知道要配置这个」）：knowledge.vector_search 收紧缺省关（2026-10-15-vector-gate-tighten）后，开关唯一的文档在 knowledge-vector.js 头注释——agent 不可见面；init 模板/search 输出/注入面均未提及。修法三触点：

① **config-schema.js 注册 `knowledge.vector_search` live 键 + renderExample 模板加 knowledge 段**——这是体系既有的配置发现机制（init 落盘 local.yaml.example 自文档；防漂耦合测试「每个 live 键必现 example 文本」自动钉住），新项目 init 即见。note 段写明开启前置（平台已部署端点）与未部署时的安全性（404 死信短路静默降级）。

② **vectorSwitchHint(cwd) 单源**（knowledge-vector.js 导出）：平台已连接（readPlatformConfig 命中）且开关未开 → 一行可执行提示（含 `vector_search: on` 配置形态+缺省关注记+config schema 指路）；平台未连接/已开启 → 空串零噪音。

③ **双消费面挂在「正需要语义召回而未获得」的时刻**：knowledge search JSON 输出加 hint 键（未命中与命中两路径都带——命中也可能只吃了词面层）；flow start 注入零命中（`!km.matched && rejected 空`）追加提示行。有命中/已开启/未连接零新增。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/knowledge-vector.js 新增导出 `vectorSwitchHint(cwd) → string`（只读谓词组合，无副作用）。
- src/stages/knowledge.js cmdSearch：JSON 输出新增可选 `hint` 键（提示空时键不出现——消费方 `'hint' in json` 判定不受影响）。
- src/flow.js flowKnowledgeDigest：零命中时 lines 追加至多一行提示（返回形状不变）。
- src/config-schema.js：新增 knowledge 段（1 live 键）+ renderExample 模板段。
- 平台侧/知识文件/遥测面零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——提示为即时谓词求值（每次调用现读 local.yaml 与平台配置）。
2. 并发写：只读无写盘；local.yaml 由用户/platform connect 写入，读取侧既有容错（无文件=缺省）。
3. 切换/生命周期：提示随开关状态即时翻转（开→提示消失），无缓存无残留；env 覆盖（SILLYSPEC_KNOWLEDGE_VECTOR=on）同样即时生效并抑制提示。
4. 作用域：提示只在本仓 local.yaml 有 platform 段时出现——平台连接是 per-repo 配置，无跨仓串台；hint 文案单源双消费（search/flow），漂移由测试①钉。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：提示疲劳——平台已连接的仓每次 search/零命中 start 都带一行。评估：两触点都是「未获得语义召回」的上下文（search 可能命中、flow 零命中行本就是空态提示行），且提示在用户开启开关后永久消失——自消失性使其天然有界。次风险：平台未部署端点的仓开了开关 → 每次检索白打一轮 404——已有死信短路（进程级一次），成本可忽略。放弃方案：①只在 init 时打一次性提示（新项目 init 时平台多半未连接，提示语境错误）；②写进 AGENTS.md 模板（init 生成面已由 local.yaml.example 覆盖，双文档漂移风险）；③把开关改回缺省开（语义检索是增量能力不是默认依赖，收紧决策不动）。
