---
author: flow-machine-draft
created_at: 2026-10-15T01:55:40.179Z
---
# 需求规格（Requirements）— 2026-10-15-vector-gate-tighten

## 功能需求

### FR-01: 平台已配置但未显式开启时 matchKnowledgeHybrid 对平台零网络调用、本地回退无 vector 标记

- local.yaml 有 platform 段但 knowledge.vector_search 键未写时，matchKnowledgeHybrid 必须对平台端点发起零网络请求并走本地回退（结果不得带 vector 标记）；env 未设与 yaml 键未写同属缺省关。

#### 场景：主路径

- Given mock 平台在位、local.yaml 仅 platform 段，When 路由零命中查询触发 hybrid，Then mock 请求计数为 0 且结果无 vector 标记（测试⑧）。

### FR-02: 显式 on 时既有命中/降级/超时行为逐字段不变（测试 ①~⑦ 零回归）

- local.yaml knowledge.vector_search: on 或 env SILLYSPEC_KNOWLEDGE_VECTOR=on|auto 时，向量层行为必须与收紧前逐字段一致（命中/404/不可达/超时降级/路由优先/开关关六面零回归）；真实库锚点映射测试（⑦）必须显式开启后照常通过。

#### 场景：主路径

- When 运行 test/knowledge-vector-recall.test.mjs 全文件，Then ①~⑦ 零失败。

### FR-03: 404 后同平台 URL 本进程后续调用零网络请求（死信短路）

- 平台端点返回 404 时必须按平台 URL 记进程级死信，本进程后续对同 URL 的向量调用必须零网络请求直接本地降级；不同 URL（含测试独立端口）互不污染。

#### 场景：主路径

- Given mock 404 端点，When 同 URL 连续两次 hybrid 调用，Then 请求计数恒为 1（测试⑨）。

### FR-04: scope 遍历层不受开关门影响（第三层照常工作）

- 向量开关关闭（缺省或显式 off）时，scopeFiles 在场的 scope 遍历召回必须照常执行（第三层在开关门之外），行为与收紧前逐字段一致。

#### 场景：主路径

- Given 开关未开启且 scopeFiles 非空，When hybrid 调用，Then scope 遍历层照常接管（knowledge-graph 既有测试面零回归佐证）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-vector-recall.test.mjs「⑧ 缺省关（2026-10-15-vector-gate-tighten）：平台已配置但未显式开启 → 平台零调用本地回退」
FR-02: test/knowledge-vector-recall.test.mjs「① 命中面」「②③④ 降级三面」「⑤⑥ 触发纪律」「⑦ 真实库锚点映射」
FR-03: test/knowledge-vector-recall.test.mjs「⑨ 404 进程级短路：同平台 URL 首次 404 标记死信，第二次调用零网络请求」
FR-04: test/knowledge-graph.test.mjs（scope 遍历既有断言零回归）+ test/knowledge-inject.test.mjs（hybrid 消费方零回归）
