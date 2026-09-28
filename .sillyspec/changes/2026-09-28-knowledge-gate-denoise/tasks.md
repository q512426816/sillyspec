---
author: flow-machine-draft
created_at: 2026-09-28T16:00:58.226Z
---
# 任务注册表（Tasks）— 2026-09-28-knowledge-gate-denoise

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）
- [x] task-02: 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 或 deathPath 才弹…
- [x] task-03: 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
- [x] task-04: 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.md D-001@v1 形态）的命中在后续 --done 回显…
- [x] task-05: 未回应命中照常弹
- [x] task-06: 无命中
- [x] task-07: 全静默时输出与现状一致
- [x] task-08: 既有知识面测试回归全绿，test:core 全绿
- [x] task-06: score 字段透出＋三消费方零分过滤＋门已回应静默＋降噪测试三件（本变更实际路径）
