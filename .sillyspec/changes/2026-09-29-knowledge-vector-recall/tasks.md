---
author: flow-machine-draft
created_at: 2026-09-28T16:48:52.216Z
---
# 任务注册表（Tasks）— 2026-09-29-knowledge-vector-recall

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 检索分层：路由 tag 命中 →（零命中）平台向量召回 → 本地词片复现窗口 → 空
- [x] task-02: 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deathPath/回显资格全部本地解析（文件是真相源）
- [x] task-03: 端点契约 POST /api/spec/knowledge/vector-search（Bearer token…
- [x] task-04: 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断
- [x] task-05: local.yaml knowledge.vector_search: off 可关
- [x] task-06: 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid
- [x] task-07: 既有同步 matchKnowledge 行为零变化（其他调用方不动）
- [x] task-08: mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面 + 真实库锚点映射正确
- [x] task-09: 既有测试与 test:core 全绿
- [x] task-06: knowledge-vector.js 三层编排＋knowledge-match 导出拆分＋四消费方切换＋端点规格文档＋mock 六面测试与实弹演示（本变更实际路径）
