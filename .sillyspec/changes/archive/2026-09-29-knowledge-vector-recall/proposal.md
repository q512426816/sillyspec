---
author: flow-machine-draft
created_at: 2026-09-28T16:48:52.214Z
---
# 提案书（Proposal）— 2026-09-29-knowledge-vector-recall

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ca56f5d52fa4914e2860b27566e869755efe3db6380028198860bd8e03c775f3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
任务原话转写：检索三层化：平台向量召回层（已连接平台时），本地零模型约束不变。

动机：词片回退桥不了同义词（查询说拆分、条目写误拆——封闭面匹配原理性缺口）；平台（SillyHub/PG）可承载语义召回，CLI 已有平台连接链路（env SILLYHUB_PLATFORM_URL/TOKEN → local.yaml platform 段）与知识同步。用户裁决：连平台走平台向量查询，否则降级本地这套。

成功标准：
- 检索分层：路由 tag 命中 →（零命中）平台向量召回 → 本地词片复现窗口 → 空；平台只做语义召回（spec_path+anchor+score 候选），条目 status/deathPath/回显资格全部本地解析（文件是真相源）
- 端点契约 POST /api/spec/knowledge/vector-search（Bearer token，query+limit → results[{spec_path,anchor,score}]）；平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断；local.yaml knowledge.vector_search: off 可关
- 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid；既有同步 matchKnowledge 行为零变化（其他调用方不动）
- mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面 + 真实库锚点映射正确；既有测试与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:e9428f9323e50d2326019976450cf6214ae905f8c494486ad32e5a3729962f02:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
按成功标准机械推导，共 9 条验收面：
1. 检索分层：路由 tag 命中 →（零命中）平台向量召回 → 本地词片复现窗口 → 空
2. 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deathPath/回显资格全部本地解析（文件是真相源）
3. 端点契约 POST /api/spec/knowledge/vector-search（Bearer token，query+limit → results[{spec_path,anchor,score}]）
4. 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断
5. local.yaml knowledge.vector_search: off 可关
6. 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid
7. 既有同步 matchKnowledge 行为零变化（其他调用方不动）
8. mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面 + 真实库锚点映射正确
9. 既有测试与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:7c8e9406eba587a8b1fb000999421f15f4960e45d4ece92b29981e3907c67c1a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
1. 检索分层：路由 tag 命中 →（零命中）平台向量召回 → 本地词片复现窗口 → 空
2. 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deathPath/回显资格全部本地解析（文件是真相源）
3. 端点契约 POST /api/spec/knowledge/vector-search（Bearer token，query+limit → results[{spec_path,anchor,score}]）
4. 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断
5. local.yaml knowledge.vector_search: off 可关
6. 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid
7. 既有同步 matchKnowledge 行为零变化（其他调用方不动）
8. mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面 + 真实库锚点映射正确
9. 既有测试与 test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
