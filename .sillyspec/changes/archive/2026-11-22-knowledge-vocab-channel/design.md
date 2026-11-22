---
author: flow-machine-draft
created_at: 2026-11-21T23:58:13.036Z
---
# 设计记录（Design Record）— 2026-11-22-knowledge-vocab-channel

> 倒推收口登记（CLAUDE.md 规则 7）：实现已在吸收工作树经 mattpocock/skills 全链路（grill-with-docs→to-spec→to-tickets→implement-spec→code-review 双轴→修复→retro）完成并合回 main（integration/vocab-channel @ 56c2c33f）；本文档为交付后如实转写，非事前拟制。过程档案：.claude/worktrees/matt-absorb/.scratch/mattpocock-absorb/（spec/tickets/gap-matrix/retro-report）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

词汇通道=知识注入的**旁路**：新增独立纯函数模块读取 `knowledge/glossary.md`（术语+定义行式，`#` 维护注释行不进 prompt），在阶段级（buildKnowledgeInjection）与 Wave 级（buildWaveKnowledgeSection）两个注入挂点恒注入「📖 词汇基准」段——不经 matchKnowledge 三层匹配、不占 top-3 名额、不进命中分母；缺失静默（proceed silently）。选旁路方案是因为 D-001 裁决词汇不进 knowledge 路由机制（既有匹配行为零回归是硬约束）。膨胀防线：归一正文 40 行上限截断+按文件路径进程级一次告警；观测面：hits.jsonl 记独立 type `vocab-inject`（Wave 面不落遥测——票 02 设计选择，spec Further Notes 注记）。配套 ADR 三条件门（难逆+无上下文会惊讶+真权衡，缺一跳过）挂两处决策提示面（flow start 执行期横幅+brainstorm 决策落盘段），提示词纪律不设机器硬拦。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新模块 `src/knowledge-vocab.js` 导出：`readVocabSection(knowledgeDir)`（契约兼容入口）、`readVocabSectionDetailed`（含 vocabMeta）、`VOCAB_FILE`/`VOCAB_SECTION_HEADER`/`VOCAB_MAX_LINES` 约定锚、`appendVocabInjectTelemetry`
- `buildKnowledgeInjection` 返回值新增 `vocabSection`/`vocabMeta` 字段，既有字段（matched/section/report/json）零变化
- hits.jsonl 新增 type `vocab-inject`（无 matchedFiles、含 lines/truncated）
- prompt 文本面：flow start 决策横幅与 brainstorm 决策段各增一行三条件提示；CLI 命令面零变化

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。词汇注入是注入时点的纯文本一次性变换（读文件→拼段→返回），无顺序依赖；阶段级与 Wave 级两挂点各自独立拼装，无跨点状态。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   无写冲突面。词汇文件是维护者手改的只读面，注入路径不写 knowledge；遥测 append 沿用既有 fail-soft 追加（hits 落盘失败不阻断注入本体）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。核心路径纯函数无状态；唯一进程内状态=截断告警去重 Set（按词汇文件绝对路径），重启即重置——告警是留痕非数据面，重置可接受。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。词汇文件按各变更/各仓自己的 knowledgeDir 解析，worktree 与主仓各读各的副本；词汇内容不参与匹配层，多实例注入结果确定。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：词汇膨胀吃 prompt 预算 → 已设 40 行上限+截断标记+按路径一次告警（膨胀可见可治）。
- 混淆风险：双 glossary 约定（docs 面 scan 产物 glossary.md 与本通道 knowledge/glossary.md）——retro 报告已记录区分，词汇文件头注释亦有说明。
- 未走的路：词汇内容参与匹配层（可被检索命中）未尝试——旁路是 spec 既定决策（D-001 边界：不进 knowledge 路由机制）；跨进程告警去重未做——按路径进程级一次已满足「不刷屏」语义，跨进程去重属过度设计。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/knowledge-vocab.js | 词汇读取纯函数+截断+遥测 |
| 修改 | src/run/prompt.js | 阶段级旁路挂点+共享拼装函数 appendVocabBypassSection |
| 修改 | src/stages/execute.js | Wave 级旁路挂点 |
| 修改 | src/stages/brainstorm.js | 决策落盘段三条件提示 |
| 修改 | src/flow.js | 执行期决策横幅三条件提示 |
| 新增 | test/knowledge-vocab-channel.test.mjs | 12 节专项测试（在场/旁路/缺失/截断/遥测/Wave 两态/头注释过滤/去重） |
| 修改 | test/prompt-golden.json | brainstorm prompt 合法变更后的金档同步 |
| 新增 | .sillyspec/knowledge/glossary.md | 仓级词汇首批 4 条（吸收/批次/纪律原语/前沿） |
| 修改 | docs/prompt/README.md、execute.md、brainstorm.md、_extracted.json | 占位符语义同步+金档再生 |
| 修改 | docs/sillyspec/file-lifecycle.md | 注入管道描述补恒旁路与 vocab-inject（updated_at 2026-11-22） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | knowledge-vocab.js 归 core-engine |
