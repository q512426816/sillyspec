---
author: flow-machine-draft
created_at: 2026-10-14T13:26:29.480Z
---
# 需求规格（Requirements）— 2026-10-14-tick-burst-sidecar-gate

## 功能需求

### FR-01: 新增纯函数 detectTickBurst（src/sentinel-assertions.js）：tickLog（{ts,task} 集）同任务取最早、坏行跳过、按时戳排序后按相邻间隔窗口（缺省 60s，参数可覆写）分簇，最大簇 size>=2 即产出与事件流同形的 batchTick 记录（from/to=CLI 勾序计数，detail 标注「侧车突发」）；不足两格/空输入返回 null（fail-open）

- detectTickBurst MUST 满足：tickLog 同任务多行取最早时戳（幂等重勾防御）、task 形态非法或时戳非有限的行 MUST 跳过、按 ts 升序排序后按相邻间隔 <=windowMs（缺省 60_000，opts.windowMs 覆写）分簇；最大簇 size>=2 时 MUST 返回与事件流同形的 batchTick 记录（{from,to,detail,ts,source:'tick-burst'}，from/to 为 CLI 勾序计数、detail 含「侧车突发」标注），否则 MUST 返回 null（不足两格/空输入/全坏行均 fail-open）。

#### 场景：快连点检出

Given 5 条 tickLog 行时戳全部落在 10 秒内
When detectTickBurst 执行（缺省窗口）
Then 返回 {from:0,to:5,source:'tick-burst'}，detail 含「侧车突发 5 格」

#### 场景：渐进零误报

Given 3 条 tickLog 行相邻间隔均大于窗口
When detectTickBurst 执行
Then 返回 null

#### 场景：混合形态取最大簇

Given 2 格渐进勾选后又 3 格快连收尾
When detectTickBurst 执行
Then 返回最大簇 {from:2,to:5}

### FR-02: flow done 节奏门接线：事件流检测为空时回退读侧车（changeDir/task-ticks.jsonl 经 parseTickLog）做突发检测；事件流结果优先、不双重报告；检出走既有 resolveBatchTickAction 裁决（证据完备 advisory+flow-state batch_ticked 留痕；零证据维持硬拒）；侧车缺失/不可读按无证据静默

- flow done 节奏门 MUST 在事件流检测（detectBatchCheckCadence）结果为空时回退读变更目录 task-ticks.jsonl（经 timeline.js parseTickLog 解析）执行 detectTickBurst；事件流结果 MUST 优先（同一收口至多报告一个 batchTick）；侧车文件缺失/不可读 MUST 按无证据静默（fail-open）；检出结果 MUST 走既有 resolveBatchTickAction 裁决——证据完备降 advisory 并写 flow-state batch_ticked（档位维持 2026-10-13 语义，用户确认），零证据形态维持硬拒；拒收文案 MUST 来源感知（侧车时戳观测到 vs 事件流观测到）。

#### 场景：CLI 快连点（证据完备）检出

Given 变更任务全勾、每格有 token 提交证据、事件流无多格跳（CLI 单格精确跳被去重）、侧车 3 行时戳 5 秒内
When flow done 收口
Then 节奏 advisory 提示（含「侧车突发」）+ flow-state batch_ticked 留痕 + 收口继续（放行）

#### 场景：侧车缺失静默

Given 变更目录无 task-ticks.jsonl 且事件流无可检出跳
When flow done 收口
Then 节奏门零输出（行为与改动前一致）

### FR-03: 渐进勾选（相邻间隔超窗）零误报；用归档 watcher 事件流的 CLI task-done 时戳回测：近期 CLI 快连点形态变更可被检出

- 本变更 MUST 保证渐进勾选（相邻间隔超窗）零误报（纯函数与 e2e 两级断言）；MUST 用归档 watcher 事件流的 CLI task-done 时戳对真实历史做回测并留证：近期 CLI 快连点形态的变更可被检出（回测清单落提交消息/design，非稳定测试面）。

#### 场景：渐进 e2e 零告警

Given 变更侧车 3 行时戳相邻间隔均超窗、证据完备
When flow done 收口
Then 无勾选节奏告警（不误伤渐进勾选）

### FR-04: 新增/更新测试跑绿；全量测试 + lint 绿

- 新增/更新测试 MUST 覆盖 FR-01 的纯函数行为族与 FR-02 的接线/e2e 两态；全量测试与 lint 零失败由收口实测门承担（CLI 亲测，fail-closed）。

#### 场景：收口实测

Given 交付提交完成
When flow done 实测门运行
Then 全量测试零失败且 lint 零 hard fail，否则整单 FAIL

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/batch-tick-gate.test.mjs「②f detectTickBurst 纯函数：快连点/渐进/混合/坏行/同任务取最早/窗口覆写」
FR-02: test/batch-tick-gate.test.mjs「②g e2e：CLI 快连点侧车突发（证据完备）→ advisory 放行 + batch_ticked 留痕 + 归档完成；渐进侧车零告警」
FR-02: test/batch-tick-gate.test.mjs「②h 接线钉：节奏门回退侧车（flow.js 源码锚）」
FR-03: test/batch-tick-gate.test.mjs「②f detectTickBurst 纯函数：快连点/渐进/混合/坏行/同任务取最早/窗口覆写」
FR-04: 不适用：收口实测门承担（CLI 亲测全量测试与 lint 零失败，不在测试绑定面重复）
