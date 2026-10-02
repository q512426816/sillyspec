---
author: flow-machine-draft
created_at: 2026-10-02T16:04:16.302Z
---
# 任务注册表（Tasks）— 2026-10-03-fr-inject-relevance-rank

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: fr-index 覆盖分区抽内部助手 partitionByCoverage（activeFrCoverageHits 改委托、判据逐字不变）+ 新增导出 rankFrDigestForInjection（TierA 覆盖命中/TierB 来源变更日期新→旧/无日期居尾/tie-break id 升序）
- [x] task-02: 厚道注入接入：buildFrIndexDigestSection（src/run/prompt.js）按 rank 排序 + 🎯 标注 + 遥测新增 tierA（design 交付面作触碰文件，fail-soft；既有字段零改动）
- [x] task-03: 轻量道注入接入：flowKnowledgeDigest（src/flow.js）同排序 + 🎯（input 路径或 design 交付面作触碰文件；抽查确认点名随 ranked 序）
- [x] task-04: flow-draft 修复：draftGwtSkeleton 标题去 50 字符硬截断；切分改括号深度感知（括号内 →/➜/则/使得 不切，无切分点走既有兜底）
- [x] task-05: 测试扩展全绿：fr-inject-cap.test.mjs ⑤覆盖命中进注入 ⑥日期新者优先 ⑦轻量道直测 + flow-draft.test.mjs 长标题不截断/括号内箭头不切 + 既有断言零回归
- [ ] task-06: 全量回归（本变更测试 ∪ FR 关联回归）+ flow done 收口 + 显式 pathspec 提交
