---
author: qinyi
created_at: 2026-08-23T21:10:00+08:00
---

# 决策记录（Decisions）— 2026-08-23-adopt-harness-practices

> 本变更的决策台账。归档时经 decision-distill 步骤提炼进 knowledge/decisions/ 活跃库（本变更是该机制的第一个用户）。

## D-001@v1 落地范围取方案C分期混合，命令化留二期

- type: scope
- status: confirmed
- source: 用户 2026-08-23 方案选择（AskUserQuestion 三选一）
- question: deepseek-harness 实践落地的范围与深度？
- answer: 方案C：本期完整做决策生命周期 + 轻量 postmortem + 证据匹配检查；`sillyspec decisions`/`postmortem` 命令化二期视 dogfood 使用频率再定
- normalized_requirement: 不新增顶层命令；所有能力内嵌现有阶段（archive/verify/brainstorm/doctor）
- impacts: 全部 Wave；stages/archive.js、stages/verify.js 不新增 CLI case
- evidence: 方案A被否（无 behind 检测、postmortem 随归档死）；方案B被否（工作量 2-3 倍且 postmortem 使用频率未验证，YAGNI）
- priority: P0

## D-002@v1 决策活跃库为文件型 knowledge/decisions/，不进 SQLite

- type: architecture
- status: confirmed
- source: brainstorm Step3 代码实证（knowledge/ 现状为纯文件 + INDEX.md 路由）
- question: 决策条目存文件还是进 progress DB？
- answer: 文件型，与 knowledge/ 同构；progress DB 仍是进度唯一权威，不扩表
- normalized_requirement: decision-distill 只读写 markdown 文件；docs-check 做机械解析校验
- impacts: src/decision-distill.js 设计；数据模型节「无表结构变更」
- evidence: knowledge/ 三类文件 + proposed/uncategorized 均为文件；决策需要人读、git diff 可审、删除即回退——文件天然满足；DB 会引入迁移成本且不可直读
- priority: P0

## D-003@v1 docs-check 决策规则 advisory 起步，稳定后升 error

- type: process
- status: confirmed
- source: 既有 known_failures 豁免机制先例（verify postcheck）
- question: 决策锚点/behind 校验阻断还是警告？
- answer: 起步 advisory（warn 不阻断）；dogfood 一个稳定周期后另立小变更升 error
- normalized_requirement: docs-check 新规则默认 warn；known_failures 可豁免
- impacts: src/docs-check.js 规则族；兼容策略节
- evidence: 锚点 file:line 漂移误报风险真实存在（本仓 35 处 file:line 重锚历史）；上来就 error 会阻断正常归档
- priority: P1

## D-004@v1 postmortem 由 quicklog 根因字段承载，不新增命令/目录

- type: scope
- status: confirmed
- source: 方案C 设计确认
- question: postmortem 做成一等产物（编号目录）还是 quicklog 字段升级？
- answer: quicklog 根因块嵌套四子字段（现象/根因/护栏/证据），verify/doctor 触发提示补写；knowledge/postmortems/ 目录二期命令化时再建
- normalized_requirement: 子字段必须 `- ` 列表行形态，不得引入新顶层标签
- impacts: src/quicklog.js 解析；W2 全节
- evidence: quicklog 四字段边界解析（quicklog.js:486-504）按顶层标签严格切段，新顶层标签会破坏单行压缩兼容；agent-session-log 证据源已存在无人消费
- priority: P1

## D-005@v1 test_strategy 扩 evidence-auto 枚举，旧三值语义不变

- type: compatibility
- status: superseded（被 D-005@v2 取代——Grill C-05 实证前提错误）
- source: W3 设计
- question: 证据匹配检查怎么进入现有 test_strategy 配置？
- answer: （v1 表述）增第四枚举 evidence-auto；未配置或旧三值行为完全不变
- normalized_requirement: config-schema 枚举扩展 + 默认值不变
- impacts: src/config-schema.js、src/stages/verify.js、local.yaml
- evidence: 兼容策略要求未配置行为不变；evidence-auto 依赖 module-impact.md，缺失时降级回 module 策略
- priority: P1

## D-005@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto

- type: compatibility
- status: confirmed
- supersedes: D-005@v1
- source: design-grill（brainstorm-review-2026-08-23-205426 C-05/C-06）+ 用户裁决 B-2「顺带接线」
- question: test_strategy 现状枚举与设计前提不符（实际 ['full','module']，skip 声明未接线）怎么处理？
- answer: 修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
- normalized_requirement: config-schema 枚举 ['full','module','skip','evidence-auto']；verify-postcheck skip→真跳过不回退全量；skip 生效时 verify 输出显式标注留审计痕迹
- impacts: [G4, R-07, src/config-schema.js, src/verify-postcheck.js, 兼容策略节]
- evidence: config-schema.js:120（枚举仅两值）、verify-postcheck.js:175（skip→null→全量回退）；行为变化属声明语义兑现（修 bug 性质）
- priority: P1

## D-006@v1 防复潮注入挂 brainstorm Step2（knowledge-match 扩展），不新建步骤

- type: architecture
- status: confirmed
- source: W1 设计（brainstorm Step2 已有 knowledge 查询动作）
- question: rejected 决策的防复潮提示挂在哪个环节？
- answer: 扩展 knowledge-match 扫描 knowledge/decisions/，Step2 加载上下文时命中即注入否决理由与复潮条件；不加新步骤、不动 Step3+
- normalized_requirement: matchKnowledge 返回结构新增 decisionHits 字段（向后兼容，旧调用方不读即无感）
- impacts: src/knowledge-match.js、src/stages/brainstorm.js Step2 prompt
- evidence: Step2 已有「查询知识库按关键词命中」动作，扩展路由成本最低；deepseek-harness 同构做法是 browse notes 目录，sillyspec 用索引路由更机械
- priority: P1

## D-007@v1 decisions.md 记录契约扩展四字段，保纯函数提炼

- type: architecture
- status: confirmed
- source: design-grill B-1（C-02/C-03/C-04 三断点）+ 用户裁决「a 扩记录约定」
- question: 决策提炼的输入字段（锚点/模块域/否决理由/复潮条件）在现有记录约定中不存在，怎么补？
- answer: 扩展 brainstorm Step6 决策记录模板，四字段在决策产生时写入（锚点：src/…:NN、模块域：module-id、否决理由/复潮条件：rejected 必填）；decision-distill 保持纯函数机械提炼。放弃备选「archive 时 agent 辅助补推」——归档时上下文陈旧、LLM 补推易错、不可确定性测试
- normalized_requirement: 字段全可选容旧格式；提炼入选规则 type∈{architecture,compatibility,boundary,definition,process} 且 status∈{confirmed,accepted}，或任意 type 的 rejected；scope 不入选
- impacts: [G1, W1.0, src/stages/brainstorm.js, src/decision-distill.js, test/decisions-lifecycle.test.mjs]
- evidence: Grill 实证 brainstorm.js:336-341 现约定无此四字段；deepseek-harness 同构模式（Agent Note 决策时写 + 格式 gate 事后机械校验）
- priority: P0

## D-008@v1 quick.js 最小纳入：警告文案修正 + step3 模板提示

- type: scope
- status: confirmed
- source: design-grill B-3（C-11）+ 用户裁决「最小纳入」
- question: quick.js:103「避免嵌套全角冒号」警告与 W2 嵌套四子字段（- 现象：…）直接冲突，纳入范围多大？
- answer: 最小纳入：仅修 :103 警告文案（明确嵌套 `- 字段：` 列表行合法、顶层标签边界不受影响）+ step3 模板补一句可选四子字段提示；prompt 镜像扩到 quick.md 第四处
- normalized_requirement: 不改 quick 流程结构；文案与 quicklog.js 解析器实际行为一致
- impacts: [G3, W2.2, src/stages/quick.js, docs/prompt/quick.md, R-06]
- evidence: Grill C-11：不修则持续误导 agent 回避设计要求的形态；C-15 实证解析器支持嵌套形态
- priority: P2
