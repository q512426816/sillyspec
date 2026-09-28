---
author: flow-machine-draft
created_at: 2026-09-28T16:00:58.225Z
---
# 提案书（Proposal）— 2026-09-28-knowledge-gate-denoise

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:91cd370f75b2a42e9f63bb43bfa289d324e1b1c22ae9fe7b8741482b7f896304:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
任务原话转写：knowledge-gate 回显去重降噪：零分不弹＋已回应不重弹。

动机：行为实测（三只小白鼠）证实门回显噪音面：① 空标题 rejected 条目靠状态进 guard 组蹭进回显（D-009/010/011 与查询零主题重叠仍弹，小白鼠被迫逐条甄别——D-004 预警的狼来了效应行为级实锤）；② 同一命中每次方案步 --done 重弹，已回应过的照弹不误。

成功标准：
- matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）；门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 或 deathPath 才弹，空标题零分 rejected 噪音消失
- 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
- 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.md D-001@v1 形态）的命中在后续 --done 回显静默；未回应命中照常弹
- 无命中/全静默时输出与现状一致；既有知识面测试回归全绿，test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:a1044acb9098bdb18d28348c58c2fc0eed7a9a00ec27b81fb64f3e68a8e5e9e0:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）
2. 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 或 deathPath 才弹，空标题零分 rejected 噪音消失
3. 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
4. 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.md D-001@v1 形态）的命中在后续 --done 回显静默
5. 未回应命中照常弹
6. 无命中
7. 全静默时输出与现状一致
8. 既有知识面测试回归全绿，test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:ca09ea270ee5856242746675cf93799656252dba850bce2e3205af305f7089c1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-gate-denoise 留痕重锚 -->
1. matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）
2. 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 或 deathPath 才弹，空标题零分 rejected 噪音消失
3. 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
4. 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.md D-001@v1 形态）的命中在后续 --done 回显静默
5. 未回应命中照常弹
6. 无命中
7. 全静默时输出与现状一致
8. 既有知识面测试回归全绿，test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
