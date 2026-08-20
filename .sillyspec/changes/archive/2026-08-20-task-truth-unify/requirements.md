---
author: qinyi
created_at: 2026-08-20T11:25:00+08:00
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| Agent（plan 阶段） | 展开任务清单写回 tasks.md；生成 ID 引用版 plan.md |
| Agent（execute 阶段） | 按 tasks.md 注册表执行；review.json 成功后勾选 tasks.md |
| Agent（verify 阶段） | 对照 tasks.md 勾选态检查任务完成 |
| CLI 门禁 | validatePlanForExecute 双文件交叉校验 |

## 功能需求

### FR-01: plan 阶段展开写回 tasks.md
覆盖决策：D-001@v1, D-002@v1
Given 变更含 brainstorm 生成的名字级 tasks.md 骨架
When plan 阶段生成计划落盘
Then tasks.md 被展开后的 checkbox 行集合覆盖（`- [ ] task-XX: 一句话名 [model:xxx] 可选`），且 frontmatter、中文标题、所有非 task-XX 行（含 quick 挂载的 ql-xxx 勾选行）逐行保留

### FR-02: plan.md 退为策略文档
覆盖决策：D-001@v1
Given plan_level 为 full 或 light
When 生成 plan.md
Then Wave 段下任务为纯 ID 引用行（`- task-XX`，不含任务名与 checkbox）；light 级不再含 `## Tasks` checkbox 段；任务总表/关键路径/全局验收/覆盖矩阵保留；none 级最小占位不变

### FR-03: plan 完成门禁交叉校验
覆盖决策：D-001@v1
Given 变更完成 plan 阶段（gates.js:355 调用 validatePlanForExecute，唯一运行时调用方）
When CLI 校验 tasks.md 与 plan.md
Then 注册表从 tasks.md 解析；plan.md 引用 ID 悬空、tasks.md 任务未被任何 Wave 覆盖、一任务多 Wave 覆盖、编号断档四类情形分别拦截且诊断文案区分根因并给可照抄新格式示例；旧格式（plan.md 含任务名 checkbox 行）被拦并指路迁移方向

### FR-04: 勾选双路落 tasks.md
覆盖决策：D-001@v1
Given execute 执行中，task 的 review.json 写入成功
Then agent 手动勾选与 CLI 机器勾选器（complete.js autoCheckPlanFromReviews，文件锁迁移 .tasks.md.lock）均勾选 tasks.md 对应行；Wave 中断恢复与批量完成检测（detectExecuteBatchFinish）按 tasks.md 勾选态判定；batch 子代理协议「禁止勾选」对象为 tasks.md

### FR-05: verify 对照 tasks.md
覆盖决策：D-001@v1
Given verify 阶段检查任务完成状态
When 读取 tasks.md
Then 对照结果与实际完成一致（勾选来源=execute 按 review gate 写入），不再对照僵尸骨架误报

### FR-06: quick 机制零回归
覆盖决策：D-002@v1
Given quick 会话关联该变更
When quick --done 勾选 ql-xxx 行、或触发自动归档全勾判定（complete-handlers.js:983）
Then 行为与改造前完全一致；跨仓聚合（shared.js 坑7 兼扫分支）契约测试回归通过

### FR-07: 机器消费面全量迁移
覆盖决策：D-003@v1
Given 新契约生效
When 以下消费点读/写任务注册表
Then 全部以 tasks.md 为唯一源（Wave 结构仍取 plan.md ID 引用）：gates.js 三道门（extractTaskIdsFromPlan/isCurrentWaveAllNoDepsVerify/enforceReviewJsonGate）、task-review.js 完成度、progress.js readPlanCheckboxStatus+alignExecuteToPlan（doctor --align 语义保持）、doctor-diagnostics.js D5、taskcard.js 任务名、contract-matrix.js parseTaskDependencies 方式2（depends_on 新家=tasks.md 行内）、run/prompt.js knowledge 匹配、plan.js parseTaskCount/parseTaskNames、五阶段提示词（含 archive）

## 非功能需求
- 兼容性：无旧格式兼容层；三个旧格式变更均已归档（独立审查核实），无活跃存量负担
- 可回退：git revert 单提交回退（提示词+校验器+消费点+测试同仓原子改动）
- 可测试：契约为纯文本解析，九类用例全覆盖（合法/悬空/覆盖缺失/断档/旧格式指路/勾选驱动续跑/机器勾选器/ql-xxx 保留/跨仓聚合回归）

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02, FR-03, FR-04, FR-05 | 真相存放=方案A（用户选定） |
| D-002@v1 | FR-01, FR-06 | 写回保留非 task-XX 行（Grill G1） |
| D-003@v1 | FR-07 | depends_on 标注新家=tasks.md 行内（独立审查补录） |
