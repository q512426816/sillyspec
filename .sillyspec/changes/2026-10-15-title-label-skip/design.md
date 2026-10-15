---
author: flow-machine-draft
created_at: 2026-10-15T03:34:08.898Z
---
# 设计记录（Design Record）— 2026-10-15-title-label-skip

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

答：变更标题（deriveChangeTitle）与模块索引摘要（flow.js 模块回写）都取 --input 首行，而 AGENTS.md 过门格式示例的首行是段头占位「动机与背景：」——agent 照抄段头后，剥离白名单 `^(?:需求|动机|背景|任务|标题)[:：]` 不含复合词「动机与背景」，整行成为标题/摘要（进度库实测 6 个变更 title 中招、stages.changelog 1 行摘要中招）。修三层：① quicklog.js deriveChangeTitle 增加两道防御——白名单补复合词（动机与背景/背景与动机）+ 短标签行跳过（`^[^:：]{1,12}[:：]$` 的纯段头行整行跳过取次非空行，未来「变更背景：」类变体免疫）；② flow.js 模块索引回写摘要弃用裸首行提取，改走 flow-parity.js 新导出的 motiveFromInput（内部复用 deriveChangeTitle，空提取回退变更名）——两处口径单源化；③ 模板与文案断诱因——AGENTS.md / templates/agents-instruction.md / sillyspec-flow SKILL.md 的 --input 示例与 flow.js/index.js 用法串首行改为「一句中文概括（即变更标题）」，不再展示段头形态。存量清偿：进度库 6 行 title 与 stages.changelog.md 1 行摘要数据修复为真实概括（修复回执落本变更目录）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

答：deriveChangeTitle(input, max) 签名不变，行为增强（新增标签行跳过与复合词剥离；既有行为——首行概括/白名单剥离/成功标准止/≤50 截断/空返回 ''——全部保持，调用方 flow.js 三处、run/command.js 四处自动受益零改动）。flow-parity.js 新增导出 motiveFromInput(input, change)（纯函数）。appendChangeIndexEntries 签名不变（summary 入参语义不变，喂参源变优）。CLI 命令面零变化；用户可见变化：段头写法的 --input 不再产生「动机与背景：」标题/摘要，模板示例首行改为概括句。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

答：纯字符串提取，无事件面。存量数据修复（DB UPDATE + changelog 行改写）一次性执行，先读后写、行内自包含，无乱序维度。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

答：deriveChangeTitle/motiveFromInput 均纯函数无副作用。数据修复走 openDatabase 单连接 UPDATE（进度库自身有 WAL/锁语义），stages.changelog.md 单行 sed 式改写前先 grep 锚定唯一性；并行会话若同时写该文件属既有共享仓风险面（显式 pathspec 提交隔离），本修复窗口极短。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

答：代码修复随本变更原子提交；数据修复幂等（UPDATE 按 name 定点、改写行按内容锚定，重跑零变化）。修复回执落变更目录随归档留痕，中断重跑可续。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

答：title 存本仓进度库（.runtime，gitignored），changelog 行在本仓 docs；修复不触他仓。模板修复（templates/agents-instruction.md）随包发布，消费仓 init 后生效，存量消费仓的既有 AGENTS.md 不回改（各仓自行重跑 init 或手改——不在本变更范围）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

答：最大风险——通用标签行跳过正则误伤「本身以冒号结尾的合法标题」（≤12 字无冒号后内容）。评估：一行若除冒号外无任何内容，作标题无信息量，跳过后回退次行/变更名仍可辨识；白名单显式词（动机与背景）不受影响。次风险——存量 6 行 title 修复写错概括：真实概括取自各变更归档件 changelog 行/做法概述（非臆造），修复回执逐行留 before/after。
死路（放弃）：仅扩白名单不加密钥式通用跳行——放弃：白名单是打地鼠，「变更背景：」「详细说明：」等变体还会再踩，通用「短标签行」形态判定一次根治。
死路（放弃）：改 AGENTS.md 格式为 JSON/YAML 结构化输入——放弃：过门格式是轻量道低摩擦核心（引号内换行即用），结构化加重书写负担，违备选道设计初衷。
死路（放弃）：存量 6 行不修只防增量——放弃：平台面板/flow status 展示面持续可见 6 个无意义标题，修复成本一行 UPDATE 级，留着是持续噪音。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/quicklog.js | deriveChangeTitle：白名单补复合词 + 短标签行跳过 |
| 修改 | src/flow-parity.js | 新增导出 motiveFromInput（复用 deriveChangeTitle，空回退变更名） |
| 修改 | src/flow.js | 模块索引回写摘要改用 motiveFromInput；用法串 2 处首行改概括句 |
| 修改 | src/index.js | 用法/报错文案 2 处 --input 示例首行改概括句 |
| 修改 | src/hooks/worktree-guard.js | 同款占位 3 处（FR-03 仓内 grep 零残留判定式覆盖） |
| 修改 | src/stages/brainstorm.js | 粗判步骤可照抄建议命令占位（同上） |
| 修改 | src/run/stage.js | 转道提示占位（同上） |
| 修改 | src/run/command.js | auto/quick 退役提示占位 3 处（同上） |
| 修改 | AGENTS.md | --input 过门格式示例首行改概括句 |
| 修改 | templates/agents-instruction.md | 同 AGENTS.md（随包模板） |
| 修改 | .claude/skills/sillyspec-flow/SKILL.md | 同 AGENTS.md |
| 修改 | test/change-title-flow.test.mjs | 新增标签行跳过/复合词剥离用例（先红） |
| 新增 | test/motive-from-input.test.mjs | motiveFromInput 单测（段头免疫/回退变更名/同源性） |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.changelog.md | 存量清偿：legacy-renumber 行摘要修复 |
