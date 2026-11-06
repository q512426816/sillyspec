---
author: flow-machine-draft
created_at: 2026-11-07T05:00:00Z
---
# 设计记录（Design Record）— 2026-11-07-knowledge-k-shape-minimal

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

K 形态契约的完整字段化（独立发号/解析器/退役判据机器化）是更大设计，本变更只落三件最小事：①目标集扩展——knowledge-classify.js 的 CATEGORY_SECTIONS 与 ACCEPT_TARGETS 各加两行（sillyspec-gotchas/testing-gotchas），修掉「gotcha 知识被迫落 known-issues」的语义错位（昨日 6 条合入已现此妥协）；②accept 输出结构完整度 advisory——正文段标题机械检测（问题/解法类），缺失列 structuralWarnings 不阻断，作为 K 四段结构的质量信号面（不挡紧急合并，完整契约落地前的过渡形态）；③SKILL.md 补四段模板指引（propose 撰写参照）。选 advisory 而非硬校验：既有合入流（平台 merge/CLI accept 双端）格式已多元，硬门会把历史形态大量打回——advisory 先立信号，完整 K 契约变更再决定是否升硬门。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- CATEGORY_SECTIONS/ACCEPT_TARGETS 常量扩为五目标（src/knowledge-classify.js）；classify --file 与 accept --file/--category 路由面同步生效。
- acceptProposedEntry 返回对象新增可选键 structuralWarnings: string[]（仅缺失时出现；dry-run 同样携带）。
- cmdKnowledgeAccept 输出透传该键。
- 其余命令/格式零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：不适用：常量扩展与 advisory 检测均为无状态同步逻辑。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：与 accept/classify 既有并发语义一致，本变更新增面（advisory 计算）为纯读侧，零新增并发面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全：advisory 在落盘前计算纯内存，中断无中间态；目标集扩展不改变落盘顺序。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会：五目标均为知识目录内相对路径；平台仓无这两个文件时 accept 显式 --file 会如实报 target_file_missing（错误码既有），category 自动路由只在文件在场的仓生效——不静默改写跨仓行为。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：advisory 检测的段标题启发式（问题/解法|规则|模式|约定）误报——标题措辞多元（如「现象」「根因」不命中「问题」）导致警告噪声。缓解：警告文案注明是启发式建议非硬性；完整 K 契约落地时随字段化一起精确化。放弃的方案：①硬校验缺段打回——历史形态大量打回（平台 merge 端同格式约束未同步），先 advisory 过渡；②把五目标扩展等到完整 K 契约一起做——gotcha 语义错位是现痛（昨日 6 条已妥协），两行常量不值得等。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-classify.js | CATEGORY_SECTIONS/ACCEPT_TARGETS 扩五目标；acceptProposedEntry 加 structuralWarnings 计算 |
| 修改 | .claude/skills/sillyspec-knowledge/SKILL.md | 补 K 四段模板指引节 |
| 新增 | NEW:test/knowledge-k-shape-minimal.test.mjs | T1~T4 四组用例 |