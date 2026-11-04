---
author: flow-machine-draft
created_at: 2026-11-04T07:07:30.059Z
---
# 需求规格（Requirements）— 2026-11-04-fence-aware-task-rows

## 功能需求

### FR-01: 围栏内 task-N: 行不计入任务集（tick/进度/下一任务指针均不受影响），真实行翻格字节级不受损（含 CRLF 保留）

- src/task-tick.js 的任务行收集与翻格替换必须跳过 Markdown 代码围栏内的行（``` 与 ~~~ 开合，含行首 ≤3 空格缩进与开栏信息串）：围栏内 task-N: 行不得计入任务集（进度 N/M、下一任务指针、可选 id 清单均不得出现），也不得被翻格替换触碰；围栏外真实任务行的翻格必须只改该行 checkbox 态字符，其余字节（含 CRLF 换行）逐字保留。

#### 场景：主路径

- Given tasks.md 含成对 ``` 围栏且栏内出现 `- [ ] task-99: 示例行`，When 解析任务集与勾选 task-01，Then 任务集只有围栏外真实行，勾选只翻 task-01 所在行。
- Given tasks.md 以 CRLF 换行，When 翻格成功，Then 除目标行 checkbox 字符外全部字节与原文件一致。

### FR-02: 未闭合围栏给出告警且 fail-safe（开栏后不计行），不崩溃不误报

- tasks.md 存在未闭合围栏时，解析必须按「开栏即入栏直到文件尾」处理（其后任务行不计入任务集）且不得抛错崩溃；task tick 必须输出一行 advisory 告警指出存在未闭合围栏及起始行号，不阻断翻格与收口。

#### 场景：主路径

- Given tasks.md 第 3 行起一个 ``` 无闭合，When task tick 真实行，Then 翻格成功、围栏后示例行不进任务集、输出含行号的未闭合告警、exit 0。

### FR-03: 新增单测覆盖上述边界，既有回归面全绿

- 本变更必须新增单测覆盖：成对围栏过滤、未闭合围栏 fail-safe、CRLF 字节保留、翻格只动 checkbox 态字符；落地后既有测试面（收口推断面）必须全部通过。

#### 场景：主路径

- Given 本变更实现落地，When 跑新增单测与收口实测面，Then 零失败零超时。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/md-fence-task-rows.test.mjs「围栏内任务行不计数且不误翻格」
FR-02: test/md-fence-task-rows.test.mjs「未闭合围栏 fail-safe 告警与行号」
FR-03: test/md-fence-task-rows.test.mjs「CRLF 字节级保留」＋收口 CLI 推断实测面（fail-closed）
