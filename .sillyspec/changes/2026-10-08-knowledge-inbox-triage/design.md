---
author: flow-machine-draft
created_at: 2026-10-08T02:38:25.757Z
---
# 设计记录（Design Record）— 2026-10-08-knowledge-inbox-triage

## 做法概述

纯知识库文档迁移，零代码改动：逐条读 uncategorized.md 的 40 个内容块，按「条目最主要的可操作价值」归类——项目坑（known-issues，22 块：🟢 已修复 15 / 🟡 在案 7）、架构模式（patterns，8 条）、项目约定（conventions，2 条）、测试坑（testing-gotchas，4 条）、SillySpec 工具坑（sillyspec-gotchas，4 条）。正文逐字搬移，仅标题按目标文件惯例重排（known-issues 加 🟢/🟡 状态前缀 + 已修复标注；testing-gotchas 加「后端：/前端：/daemon：」域前缀）；掉标题孤儿块（sessions/events 路由被两段式参数路由吞）补拟标题随迁；原文件中 `\f`/`\n` 控制字符损坏的路径文本按原意修复。INDEX.md 在对应 section 末尾追加关键词索引行（锚按 GitHub slug 规则推算），Uncategorized 段改为已清空描述；uncategorized.md 留头部 + 一行清账留痕。

## 接口契约

无代码/CLI/端点/文件格式签名变化。对外可见变化仅限知识库 markdown：uncategorized.md 清空、5 个分类文件追加条目、INDEX.md 增 40 行索引并改 Uncategorized 段描述。INDEX.md 同时含他会话未提交的 fr/ 索引重构 hunks，本变更不触碰、不提交该文件（增量经 flow done --freeze-dirty 进冻结面，避免夹带半份他会话逻辑变更）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——一次性清账快照迁移，无事件流。若迁移期间他会话向收件箱追加新条目，Edit 基于旧读态写会冲突报错；重读最新态并入对账后再清空。
2. 并发写：INDEX.md 当前带他会话（fr/ 重构）未提交 hunks——本变更只在 Conventions/Patterns/Known Issues/SillySpec Gotchas/Testing Gotchas/Uncategorized 各 section 内追加与改写，不删改其 FR 段 hunks；提交用显式 pathspec 排除 INDEX.md。其余 6 个知识文件当前无他侧改动，整文件追加无冲突面。
3. 切换/生命周期：迁移按文件分批落盘，中断后 `flow status` 恢复、未落盘条目仍在收件箱可续迁；markdown 整段替换无半写风险。
4. 作用域：改动全部落本仓 `.sillyspec/knowledge/` 与本变更目录，无跨仓/跨工作区写入；知识内容含跨仓（sillyhub）经验，落点仍为本仓知识库，`repo://sillyhub/...` 锚路径原样保留。

## 风险与死路

最大风险=归类误判（条目常跨类，如 antd v6 三坑兼含组件 API 坑与 vi.mock 测试坑、Alembic 条目兼含目录惯例与事故处置）——对策：按主要可操作价值归类，INDEX 关键词行写入跨类关键词多路命中兜底。已放弃方案：① 把「待确认」条目一律升格已核实——放弃，仅核实本仓可查的 sillyspec 9a63466（跨端 mock 契约修复锚），sillyhub 侧条目（execFile ENOENT / antd v6 等）保留「待确认」原样；② 跨类条目拆分进多个文件——放弃，破坏原文完整性且违背「逐条归类」指令；③ 提交 INDEX.md 全文件——放弃，会夹带他会话指向未跟踪 fr/ 新文件的半份逻辑变更。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改写 | .sillyspec/changes/2026-10-08-knowledge-inbox-triage/requirements.md | FR 正文 + 场景 + 测试绑定 |
| 改写 | .sillyspec/changes/2026-10-08-knowledge-inbox-triage/design.md | 四节作答 + 文件变更清单（本文件） |
| 改写 | .sillyspec/changes/2026-10-08-knowledge-inbox-triage/tasks.md | 工作队列按实现路径重排 4 任务 |
| 追加 | .sillyspec/knowledge/known-issues.md | 迁入 22 块（🟢 已修复 15 / 🟡 在案 7） |
| 追加 | .sillyspec/knowledge/patterns.md | 迁入 8 条 |
| 追加 | .sillyspec/knowledge/conventions.md | 迁入 2 条 |
| 追加 | .sillyspec/knowledge/testing-gotchas.md | 迁入 4 条 |
| 追加 | .sillyspec/knowledge/sillyspec-gotchas.md | 迁入 4 条 |
| 清空留痕 | .sillyspec/knowledge/uncategorized.md | 仅留头部 + 清账留痕行 |
| 追加/改段 | .sillyspec/knowledge/INDEX.md | 40 行索引 + Uncategorized 段更新（不提交，留给 fr 重构归属会话；--freeze-dirty 入冻结面） |
