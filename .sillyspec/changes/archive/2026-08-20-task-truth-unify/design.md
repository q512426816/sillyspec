---
author: qinyi
created_at: 2026-08-20T11:20:00+08:00
scale: large
---

# 设计文档（Design）— tasks.md 任务清单单一真相

## 背景

任务清单现状存在三份表示且已实际漂移（证据变更 `2026-07-10-quick-session-isolation`，已归档）：

1. **tasks.md**（brainstorm 生成名字级骨架）：六条 checkbox 永远未勾；task-04/05 编号与 plan.md 对调——同一变更两份文件对「task-04 是什么」给出不同答案。
2. **plan.md Wave checkbox**：真正的机器注册表（`validatePlanForExecute` @ execute.js:16 解析、机器勾选器 `autoCheckPlanFromReviews` @ complete.js:635 写入、agent 按 review gate 勾选）。
3. **plan.md 任务总表**：同文件内人类视图（良性，不动）。

根因：brainstorm.js:540 承诺「plan 阶段展开」tasks.md，但 plan 阶段对 tasks.md 只读不写（plan.js 仅 3 处「读取」），骨架永远停留在 brainstorm 时刻；同时消费方指向分裂——execute 提示词「读取 tasks.md（执行计划）」（execute.js:137，实际注册表是 plan.md，误导）、verify「对照 tasks.md 检查完成状态」（verify.js:101，对着僵尸骨架必然误报）、机器解析读 plan.md（execute.js:399/:456 收容正则、:617-627 buildWavePrompt、:975 buildExecuteSteps）。

## 设计目标

- tasks.md 成为唯一任务真相：注册表（task-XX + 一句话名 + 可选 `[model:xxx]` 档位 + 可选 `(depends_on: …)` 依赖标注）、执行勾选（agent 手动 + CLI 机器勾选器均落 tasks.md）、完成检查全部对齐 tasks.md。
- plan.md 退为策略文档：Wave 分组/关键路径/全局验收/覆盖矩阵保留，Wave 段下任务改纯 ID 引用，不重抄任务名——结构性杜绝双写漂移。任务总表保留为人类视图（含依赖列）。
- plan 阶段兑现「展开写回」：brainstorm 骨架在 plan 阶段被展开后的清单覆盖写回 tasks.md。
- quick 的 ql-xxx 追加/勾选机制（quicklog.js append/checkTaskCheckbox）零改动。

## 非目标

- 不做新旧格式兼容层 / 存量迁移工具。经独立审查核实：三个旧格式变更（2026-05-29-worktree-isolation、2026-06-02-module-doc-redesign、2026-07-10-quick-session-isolation）**均已归档**（changes/archive/，归档于 06-30/07-10），当前无活跃旧格式变更——clean switch 无存量负担，无需 doctor 存量提示。
- 不做 tasks.md↔plan.md 双向同步（单真原则，同步即重新引入漂移面）。
- 不改 plan_level 分级机制（none/light/full）与 none 级最小占位 plan。
- 不改任务卡（`tasks/task-XX.md`）机制——任务卡是 execute 阶段产物，与任务清单（tasks.md）是两个文件，术语上统一「任务卡 vs 任务清单」防混淆。

## 拆分判断

单一机器格式契约变更 + 五阶段提示词联动 + 约 10 个机器消费点迁移，属一个内聚变更，不拆分；任务模式不重复，不走批量模式。

## 决策与方案选择

三案对比后用户选定**方案A**（D-001@v1）：A=tasks.md 唯一真相+plan.md 纯 ID 引用+交叉校验；B=plan.md 保持注册表仅改指向+停生成骨架（改动最小但清单与策略同文件）；C=Wave 结构进 tasks.md（解析最简但清单承载计划结构）。关键派生决策：plan 写回仅重写 task-XX 行集合、保留 quick 挂载的 ql-xxx 行（D-002@v1，Design Grill G1）；depends_on 行内标注随任务名迁 tasks.md 行内（D-003@v1，独立审查补录）。完整决策记录见 decisions.md。

## 总体方案

### Wave 1（契约与机器消费面，先行定契约）

1. **契约点全量清单化**（审查已给出，实施时以此为准 grep 复核）：execute.js:16/:399/:456/:617-627/:975、run/gates.js:355（validatePlanForExecute 唯一运行时调用方，plan 完成门禁）/:38 extractTaskIdsFromPlan/:109 isCurrentWaveAllNoDepsVerify/:169-172 enforceReviewJsonGate、run/complete.js:635-690 autoCheckPlanFromReviews（机器勾选写入器）/:695-723 detectExecuteBatchFinish、task-review.js:58/:68、progress.js:1020-1043 readPlanCheckboxStatus+alignExecuteToPlan、doctor-diagnostics.js:434-481（D5）、taskcard.js:107、contract-matrix.js:107-132 parseTaskDependencies、run/prompt.js:425-426、plan-postcheck.js:358/512/636、run/shared.js:1173/1248（坑7）、plan.js:566/:576 parseTaskCount/parseTaskNames。
2. `validatePlanForExecute(planContent)`（execute.js:16）重构为双文件签名：`validatePlanForExecute(tasksContent, planContent)`——注册表（task-XX、名称、勾选态、model/depends_on 标注）从 tasks.md 解析；plan.md 只解析 Wave 段的 ID 引用行（`- task-01`，无 checkbox）。**调用方 gates.js:355 同步改双参数**（读两文件后传入）。
3. 交叉校验（新契约核心）：plan.md 引用的 ID 全部存在于 tasks.md；tasks.md 的每个 ID 恰被一个 Wave 覆盖（无遗漏、无重复）；编号连续；`[model:xxx]`/`(depends_on: …)` 标注只认 tasks.md 行内。
4. 机器消费点迁移：
   - complete.js autoCheckPlanFromReviews：勾选写入目标 plan.md→tasks.md（锁文件名随之 `.tasks.md.lock`）；detectExecuteBatchFinish 读 tasks.md 已勾行。
   - gates.js 三道门（extractTaskIdsFromPlan / isCurrentWaveAllNoDepsVerify / enforceReviewJsonGate）：符号影响面与勾选态来源改 tasks.md（Wave 结构仍取 plan.md ID 引用）。
   - task-review.js / progress.js readPlanCheckboxStatus（plan.md 优先回退改为 tasks.md 唯一源；doctor --align-execute-progress 语义保持）/ doctor-diagnostics.js D5 / taskcard.js / run/prompt.js knowledge 匹配任务名源。
   - contract-matrix.js parseTaskDependencies 方式2：depends_on 行内标注随任务名迁至 tasks.md（方式1 任务总表依赖列保留兜底）。
   - shared.js 坑7 兼扫分支按新形态复核（plan.md 无 checkbox 行后的聚合路径）。
5. 无 task 诊断函数（execute.js:389-416，坑 plan-md-format-contract-hidden 套路）迁移：区分 tasks.md 无 checkbox / Wave 段无 ID 引用 / ID 悬空三类根因，文案给新格式可照抄示例。
6. 新增 `test/task-truth-contract.test.mjs`：合法新格式通过 / 引用悬空拦 / Wave 覆盖缺失拦 / 编号断档拦 / 旧格式（plan.md 带 checkbox 任务名）明确报错指路 / tasks.md 勾选态驱动续跑判定 / 机器勾选器写 tasks.md / ql-xxx 行保留回归 / 跨仓聚合（坑7）回归。

### Wave 2（五阶段提示词联动，依赖 Wave 1 契约）

1. brainstorm.js:540 与 brainstorm-auto.js:220 两处 tasks.md 骨架模板注释改为事实：「plan 阶段展开写回 tasks.md」；骨架行格式不变。
2. plan.js 生成计划步骤（full/light 两分支）：新增动作「把展开后的任务清单写回 tasks.md（checkbox 行 task-XX+一句话名+[model:xxx]/(depends_on: …) 可选标注）」；**写回规则：保留 frontmatter/中文标题/所有非 task-XX 行（quick 挂载的 ql-xxx 勾选行、自审注记等），仅重写 task-XX checkbox 行集合**——防摧毁 quick 挂载条目；plan.md 模板 Wave 段改 ID 引用行；light 级取消 `## Tasks` checkbox 段（任务一律在 tasks.md）；「Wave 下的 checkbox 行必须保留」约束删除，改为「Wave 段 ID 引用行必须保留（机器解析依赖）」。
3. execute.js 提示词：勾选动作全面改指 tasks.md（:858「勾选 plan.md 中的 checkbox」、:892-893 Wave 中断恢复判定、:922「review.json 成功后才允许勾选」、:877 batch 协议）；:137「读取 tasks.md（执行计划）」语义从此为真，补一句「任务注册表与勾选都在 tasks.md；plan.md 只提供 Wave/依赖结构」。
4. verify.js:101 对照 tasks.md 表述补勾选来源说明（agent 手动 + complete.js 机器勾选器按 review gate 写入 tasks.md）。
5. **archive.js:10-18/:130**（审查 G10 补录）：提示词「plan.md 的 - [x] checkbox 显示态」「确保所有 checkbox 已勾选」改指 tasks.md；docs/prompt 镜像清单相应含 archive（共五文件）。

### Wave 3（文档三线同步，依赖 W1+W2）

1. docs/sillyspec/file-lifecycle.md：tasks.md/plan.md 生命周期与契约描述更新（brainstorm 骨架→plan 展开写回→execute 双路勾选→verify 对照→archive 校验）。
2. docs/prompt/ 五文件（brainstorm/plan/execute/verify/archive）按 CLAUDE.md 规则跑 `_extract.mjs` 再生 + 镜像替换。
3. .claude/skills/ 对应技能（sillyspec-brainstorm/plan/execute/verify/archive）勾选与文件指向同步。
4. 模块文档（modules/stages.md、modules/runtime.md）变更索引补录本变更。
5. 全量回归：npm test + lint 全绿；对照 Wave 1 契约点清单逐项核对无遗漏（清单核对即验收，替代原「doctor 存量提示」——存量已归档无需提示）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stages/execute.js | validatePlanForExecute 双文件签名重构 + 交叉校验 + 诊断迁移（:389-416）；提示词勾选指引改 tasks.md（约 8 处） |
| 修改 | src/run/gates.js | :355 validatePlanForExecute 调用改双参数（唯一运行时调用方）；:38/:109/:169-172 三道门的任务符号/勾选态来源改 tasks.md |
| 修改 | src/run/complete.js | :635-690 autoCheckPlanFromReviews 勾选写入目标迁 tasks.md（锁文件 .tasks.md.lock）；:695-723 detectExecuteBatchFinish 读 tasks.md |
| 修改 | src/task-review.js | :58 parseTaskIdsFromPlan / :68 countPlanCheckboxes 迁 tasks.md（archive 完成度源） |
| 修改 | src/progress.js | :1020-1043 readPlanCheckboxStatus+alignExecuteToPlan 改 tasks.md 唯一源（doctor --align 语义保持） |
| 修改 | src/doctor-diagnostics.js | :434-481 D5 execute-progress 维度适配新源 |
| 修改 | src/taskcard.js | :107 任务名源从 plan.js parseTaskNames 迁 tasks.md |
| 修改 | src/contract-matrix.js | :107-132 parseTaskDependencies 方式2 改读 tasks.md 行内 depends_on |
| 修改 | src/run/prompt.js | :425-426 knowledge 匹配任务名源改 tasks.md |
| 修改 | src/stages/plan-postcheck.js | 三道校验器中 plan.md checkbox 解析分支适配新契约 |
| 修改 | src/run/shared.js | 坑7 兼扫分支按新形态复核适配 |
| 修改 | src/stages/plan.js | full/light 模板 Wave 段改 ID 引用；新增写回 tasks.md 动作；light 级去 Tasks 段；:566/:576 parseTaskCount/parseTaskNames 迁 tasks.md；格式约束文案 |
| 修改 | src/stages/brainstorm.js | tasks.md 骨架模板注释（展开承诺改事实）；frontmatter 不变 |
| 修改 | src/stages/brainstorm-auto.js | 同上（auto 模式同款骨架模板注释） |
| 修改 | src/stages/verify.js | 完成状态对照表述 + 勾选来源说明 |
| 修改 | src/stages/archive.js | :10-18/:130 提示词勾选指向改 tasks.md（第五阶段联动） |
| 新增 | test/task-truth-contract.test.mjs | 新契约九类用例（见 Wave 1.6） |
| 修改 | test/ | 既有受影响测试适配断言（不删断言凑绿；具体文件以实施时测试清单为准） |
| 修改 | docs/sillyspec/file-lifecycle.md | 文件生命周期与契约描述 |
| 修改 | docs/prompt/_extracted.json | 机械再生镜像 |
| 修改 | docs/prompt/brainstorm.md | 镜像（骨架注释） |
| 修改 | docs/prompt/brainstorm-auto.md | 镜像（骨架注释） |
| 修改 | docs/prompt/plan.md | 镜像（写回动作+ID 引用模板） |
| 修改 | docs/prompt/execute.md | 镜像（勾选指向） |
| 修改 | docs/prompt/verify.md | 镜像（对照说明） |
| 修改 | docs/prompt/archive.md | 镜像（勾选指向） |
| 修改 | .claude/skills/sillyspec-brainstorm/SKILL.md | 勾选与文件指向同步 |
| 修改 | .claude/skills/sillyspec-plan/SKILL.md | 勾选与文件指向同步 |
| 修改 | .claude/skills/sillyspec-execute/SKILL.md | 勾选与文件指向同步 |
| 修改 | .claude/skills/sillyspec-verify/SKILL.md | 勾选与文件指向同步 |
| 修改 | .claude/skills/sillyspec-archive/SKILL.md | 勾选与文件指向同步 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md | 变更索引补录 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 变更索引补录 |

数据流标注（机器契约字段）：task 注册表 producer=plan 阶段 agent 写入 tasks.md（checkbox 行）→ 流转点=无归一化（纯文本契约，`- [ ] task-XX:` 行格式）→ consumer=validatePlanForExecute（gates.js:355 plan 完成门禁调用）+ complete.js autoCheckPlanFromReviews（机器勾选写回）+ detectExecuteBatchFinish + gates 三道门 + task-review/progress(doctor align)/doctor-diagnostics D5/taskcard/contract-matrix/run-prompt knowledge 匹配 + execute 提示词（agent 勾选）+ verify（完成对照）+ status.js:29（完成度 X/Y 展示，改造后自动变正确）+ complete-handlers.js:983（quick 全勾判定，行为不变）。plan.md Wave ID 引用 producer=plan 阶段 agent → consumer=validatePlanForExecute 交叉校验 + gates Wave 结构门 + execute buildWavePrompt/buildExecuteSteps。

## 接口定义

```js
// src/stages/execute.js（重构）
export function validatePlanForExecute(tasksContent, planContent)
// 返回 { ok, errors[], warnings[], tasks: [{ id, name, done, model, dependsOn }], waves: [{ name, taskIds }] }
// 旧单参数签名删除（无历史兼容负担）；唯一运行时调用方 gates.js:355（plan 完成门禁）同步改双参数
// execute 侧 buildExecuteSteps(:975)/buildWavePrompt(:617-627) 经 parseWavesFromPlan 消费 Wave 结构——ID 引用行驱动
```

提示词侧无代码接口（agent 动作）：plan 写回 tasks.md、execute 勾选 tasks.md、verify 对照 tasks.md。

生命周期契约表判定：本变更关键词扫描命中「complete/勾选完成」仅指 markdown checkbox 完成态，无 session/lease/daemon/agent_run/claim/heartbeat 等跨进程生命周期语义，判定不适用（自审记录；唯一跨进程并发点是 complete.js 机器勾选器的 withFileLock 文件锁，随目标文件迁移为 .tasks.md.lock，语义不变）。

## 数据模型

无 DB schema 变更。纯文本契约：tasks.md checkbox 行（`- [ ] task-XX: 名称 [model:xxx] (depends_on: task-01,02)`）与 plan.md Wave ID 引用行（`- task-XX`）。

## 兼容策略（brownfield）

- 存量：三个旧格式变更均已归档（独立审查核实），当前活跃变更无旧格式——无迁移负担、无 doctor 存量提示需求。
- quick 流程（ql-xxx 行）与 task-XX 行正交（前缀不撞），append/checkTaskCheckbox 零改动、零行为变化。quick 自动归档判定（complete-handlers.js:983「tasks.md 全勾且阶段停在 brainstorm 及之前」）：新契约下 tasks.md 的 task-XX 勾选只在 plan 之后发生，此时变更已不在「brainstorm 及之前」，归档判定行为不变。
- plan 写回保留非 task-XX 行（含 ql-xxx 勾选行），quick 挂载条目不被摧毁（Grill G1）。
- 未走完整流程的变更（quick-only）不产生 plan.md/tasks.md 任务行，不受影响。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R1 | 机器消费面迁移遗漏（审查已点名 10+ 处，仍可能有暗角） | P1 | Wave 1.1 契约点清单为实施验收基准；全量 grep `- \[ \] task-`/`task-\d+`/checkbox 复核；契约测试锁双端 |
| R2 | 提示词与解析器发布窗口不同步（agent 仍按旧习惯勾 plan.md） | P1 | 同一 Wave 内原子改造 + 契约测试锁双端；旧格式进门禁即拦并指路 |
| R3 | complete.js 机器勾选器与 agent 手动勾选并发写 tasks.md | P2 | 延续 withFileLock 机制（锁文件随目标迁移 .tasks.md.lock）；checkbox 翻转幂等 |
| R4 | 任务卡（tasks/task-XX.md）与任务清单（tasks.md）术语混淆 | P2 | 提示词统一「任务卡/任务清单」称呼；design/plan 模板各加一行说明 |
| R5 | doctor --align-execute-progress / D5 诊断在新源下语义漂移 | P2 | progress.js/doctor-diagnostics.js 同 Wave 迁移 + 各自既有测试回归 |

## 自审记录

- 交叉审查：数据流标注覆盖双端全消费面（含独立审查补录的 10 处机器点）；R1/R2 为 P1 已给应对；非目标排除兼容层与双向同步。
- 可行性：所有消费点为纯函数文本解析或文件锁写入，无新 IO 面。
- 与 scan/module docs 无冲突：涉及模块 stages、runtime 均有模块文档，W3 补变更索引。

## Design Grill 记录（2026-08-20）

| 交叉点 | 层 | 发现 | 处置 |
|---|---|---|---|
| plan 写回 tasks.md × quick ql-xxx 挂载行 | 一致性 | G1(P1)：整体覆盖写回会摧毁 quick 挂载的 ql-xxx 勾选行 | 写回规则改为「仅重写 task-XX 行集合」——已修入 Wave 2.2 |
| brainstorm-auto.js × 骨架模板 | 一致性 | G2(P1)：auto 模式同样生成 tasks.md 骨架（:214/:220），原清单遗漏 | 补入文件变更清单——已修 |
| plan.md checkbox × shared.js 跨仓聚合（坑7 兼扫） | 一致性 | G3(P2)：shared.js:1173/1248 依赖「plan.md 只留 checkbox 行」旧形态 | 纳入 Wave 1.4 消费点迁移 + 契约测试回归 |
| tasks.md 完成度 × status 展示 / quick 全勾归档 | 可行性 | G4(信息)：status.js:29 与 complete-handlers.js:983 为 tasks.md 读侧 | 无需改码：status 改造后自动正确；quick 归档判定行为不变 |

## 独立审查修订记录（2026-08-20，review-2026-08-20-112115）

首轮独立审查 specVerdict=fail，以下修订均已入稿：

| 审查发现 | 修订 |
|---|---|
| P0 遗漏：complete.js:635-690 autoCheckPlanFromReviews 机器勾选写入器（勾选的 CLI 侧另一半） | 补入文件清单与 Wave 1.4；FR-04 补机器勾选；R3 记并发锁迁移 |
| P0 遗漏：gates.js:355 是 validatePlanForExecute 唯一运行时调用方（且在 plan 完成门禁，非 execute）；另 :38/:109/:169-172 三道门 | 补入文件清单与 Wave 1.2/1.4；接口定义更正调用位置 |
| 遗漏消费点：task-review.js / progress.js(readPlanCheckboxStatus+alignExecuteToPlan) / doctor-diagnostics.js D5 / taskcard.js / contract-matrix.js parseTaskDependencies / run/prompt.js / archive.js / plan.js parseTaskCount·parseTaskNames | 全部补入文件清单与 Wave 1 契约点清单 / Wave 1.4 迁移 / Wave 2.5 五阶段联动；docs/prompt 镜像扩为五文件 |
| depends_on 行内标注（contract-matrix 方式2）随 checkbox 行消失，未声明新家 | 新家=tasks.md 行内 `(depends_on: …)`（与 [model:xxx] 同风格），方式1 任务总表依赖列保留兜底 |
| 事实错误：execute.js:582 与任务解析无关（实为 :617-627/:975）；:444 实为 :456 | 背景与 Wave 1.1 行号已更正 |
| 前提错误：「3 个存量活跃变更会被拦」——三者均已归档，当前无活跃旧格式 | 非目标/兼容策略/R1→R5 重写（存量条目删除，R1 改为消费面遗漏风险）；proposal/requirements/tasks.md 对应条目同步修订 |

修订后复审结论见 review.json（review-2026-08-20-112115）。
