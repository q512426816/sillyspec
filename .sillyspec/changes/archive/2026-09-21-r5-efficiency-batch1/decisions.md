---
author: qinyi
created_at: 2026-09-21 20:30:00
---
# 决策记录（Decisions）— R5 效率优化第 1 批

## D-001@v1: B-① 验靶不实砍实现项，B-⑥ 轮数纪律顶替并随本批实现

- type: scope
- question: 优化方案 B-①（读清单注入）靶子是否成立？
- answer: 不成立。db 实证（round4/b1-b1-target-validation.md）：task-08 子代理 62 次工具调用全在契约链内、零越界读；8.6M 名义 = 58 轮 × 148K 轮均上下文的缓存重发（新鲜输入仅 186K）；全扇出 19 子代理名义 41.77M 中新鲜仅 1.34M（3.2%）。读取上界太小，无钱可省。
- normalized_requirement: 不实现读清单注入；新增 B-⑥ 轮数纪律（合并相邻同文件 Edit / TodoWrite 降频 / 测试合并跑）进 execute 派发 prompt；R5 用子代理请求数（基线 522req）验收。
- impacts: [execute 派发 prompt, R5 验收协议]
- evidence: round4/b1-b1-target-validation.md（工具 round4/b1-analyze-task08.mjs 可复现）
- 故障面: 轮数纪律若导致单轮 Edit 过大可能增加单次失败重试成本（Edit 失败重试是单文件局部，风险低于多轮重发）
- 退役判据: R5 子代理请求数未降（提示词被无视）→ 升级机制化（CLI 侧合并 Edit 指令模板）

## D-002@v1: 本批范围=五项轻机制，红线不动

- type: scope
- question: 第 1 批做什么、不做什么？
- answer: 做：B-③ plan batch 默认（提示词+postcheck 机械提醒+并发护栏）/ B-④ 材料包扩展到 execute / B-⑥ 轮数纪律 / C-1 B1 返回契约 + B2 回收瘦身 / R5 探针套件。不做：不动四道防线语义、不动四律请求钳、不动 allowed_paths 门禁、不动状态机、不做 B-② digest（第 3 批完整流程）、不做 C-2/C-3。
- normalized_requirement: 变更面限定 prompt 渲染 + 材料组装 + 探针资产三类；gate/verify 门禁判定逻辑零改动。
- impacts: [plan prompt, execute prompt, verify-probes 资产]
- evidence: round4/optimization-plan.md v3.2 执行顺序第 1 批；用户 2026-09-21「开工」指令
- 退役判据: R5 验收后按指标决定扩展或回滚

## D-003@v1: B-④ 材料包稳定段先行装配

- type: architecture
- question: 材料包内容如何排序才能兑现「统一前缀 → 缓存命中」收益？
- answer: 跨任务稳定内容（design 契约通摘 / 接口签名锚点）在前，任务专属内容（task 卡要点 / 变更面摘录）在后。混排则任务差异打断前缀，收益折半（v3.2 评审第 6 条）。
- normalized_requirement: assembleExecuteMaterials（或复用 assembleStageReviewMaterials 扩展）输出顺序契约：稳定段 → 专属段；单材料包上限声明（防 377K→250K 指标被注入反噬，v3.2 纪律一）。
- impacts: [execute 派发 prompt, R5 主会话峰值指标]
- evidence: round4/optimization-plan.md v3.2 B-④ 装配顺序契约
- 故障面: 材料包若转错契约事实即内部版「错键正典」——须带 file:line 锚点与回源条款（与 B-② 同风险面，故材料包只摘不译：摘录原文锚点，不做语义转写）
- 退役判据: R5 扇出/峰值指标无改善且归因到材料包 → 降级为可选注入
