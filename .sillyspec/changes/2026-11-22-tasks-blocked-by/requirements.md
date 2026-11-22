---
author: flow-machine-draft
created_at: 2026-11-22T16:37:40.035Z
---
# 需求规格（Requirements）— 2026-11-22-tasks-blocked-by

> 来源：mattpocock 链路实测沉淀（retro-report.md 链路对照表拆票行——5 票带阻塞边并行时 frontier 加派是阻塞边的直接收益；to-tickets/implement-spec 阻塞边思想的轻量形态）。

## 功能需求

### FR-01: tasks.md 任务行支持可选阻塞标注：- [ ] task-NN: 描述 [blocked-by: task-MM/task-KK]（多值斜杠分隔），无标注行为零变化

- collectRows 解析**必须**支持任务行描述段尾部的可选标注 `[blocked-by: task-MM/task-KK]`（多值以 `/` 分隔，值容许裸数字自动归一为 task-NN 形态），解析结果以 `blockedBy` 数组挂在行对象上；标注**必须**从回显 desc 中剥出（desc 保留描述本体）。
- 无标注行**必须**零变化（blockedBy 为空数组，解析/翻格/回显与现状逐字节一致）；标注格式不合法（如 `[blocked-by:]` 空值）**必须**按普通文本处理并 console.warn 一次。

#### 场景：主路径（标注解析）
Given 行 `- [ ] task-02: Wave 级旁路 [blocked-by: task-01]` / When collectRows 解析 / Then blockedBy=['task-01']，desc='Wave 级旁路'。

#### 场景：无标注零变化
Given 既有无标注 tasks.md / When 解析与翻格 / Then 行为与现状一致（既有测试零修改即绿）。

### FR-02: task tick 勾选被阻塞任务（blocked-by 列表中有未勾任务）时给出明确警告留痕（提示被谁阻塞），不阻断勾选（轻量软门）

- tick 目标任务的 blockedBy 列表中存在未勾任务时，tickTasksMd 返回**必须**含 `blockedWarning` 字段（列出全部未勾阻塞者 id）；runTaskTick **必须**以 console.warn 输出「⚠️ 被 task-XX 阻塞（未勾）——已勾选但顺序存疑，确认前置完成」类留痕；翻格**必须**照常执行（软门不阻断、exit code 不变）。
- blockedBy 全部已勾或目标无标注时**必须**零警告（零噪音）。

#### 场景：软门警告
Given task-02 blocked-by task-01 且 task-01 未勾 / When task tick task-02 / Then 翻格成功+warn 含「task-01」，exit 0。

#### 场景：解锁后零警告
Given task-01 已勾 / When task tick task-02 / Then 无 blockedWarning。

### FR-03: task tick/flow status 的下一任务指针优先指向未被阻塞的最小号任务（frontier 语义）

- next 指针计算**必须**frontier 化：优先返回「blockedBy 全部已勾或无标注」的未勾任务中的最小号；若所有未勾任务均被未勾任务阻塞，**必须**返回最小号未勾任务并在 next 对象上带 `blockedBy` 信息（回显标注「（等 task-XX…）」）。
- 无标注场景**必须**与现状一致（第一个未勾行——既有回显测试零修改即绿）。

#### 场景：frontier 指针
Given task-01 已勾、task-02 blocked-by task-03（未勾）、task-03 无标注 / When tick 后计算 next / Then next=task-03（跳过被阻塞的 task-02）。

#### 场景：全阻塞回退
Given 未勾任务全部被未勾任务互相阻塞 / When 计算 next / Then 返回最小号未勾+blockedBy 注记。

### FR-04: 既有 tasks.md（无 blocked-by）解析与勾选行为零回归；新增单测覆盖标注解析/警告/指针三面并跑绿

- 新增 `test/task-tick-blocked-by.test.mjs` **必须**覆盖：标注解析（单值/多值斜杠/裸数字归一/不合法 warn）、软门警告（阻塞 warn/解锁零 warn/不阻断翻格）、frontier 指针（跳过被阻塞/全阻塞回退/无标注现状一致）；既有 task tick 族测试（approve-gate-tick/batch-tick-gate 等）**必须**零修改即绿。

#### 场景：单测全绿
Given 全部新用例与既有 tick 族 / When 运行 / Then 全绿 exit 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例」`；空行/待填在 flow done 拒收）

FR-01: test/task-tick-blocked-by.test.mjs「标注解析（单值/多值/裸数字/不合法 warn）」
FR-02: test/task-tick-blocked-by.test.mjs「软门警告与不阻断翻格」
FR-03: test/task-tick-blocked-by.test.mjs「frontier 指针（跳过/回退/现状一致）」
FR-04: test/task-tick-blocked-by.test.mjs「全量绿」+ 既有 test/approve-gate-tick.test.mjs「零修改即绿（回归线）」
