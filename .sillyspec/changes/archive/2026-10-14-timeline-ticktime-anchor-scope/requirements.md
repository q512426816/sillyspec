---
author: flow-machine-draft
created_at: 2026-10-14T08:05:40.487Z
---
# 需求规格（Requirements）— 2026-10-14-timeline-ticktime-anchor-scope

## 功能需求

### FR-01: task tick 翻格成功后在变更目录落带时间戳的勾选留痕（task-ticks.jsonl，随归档进 git 跨机可读），timeline 任务面优先显示该精确时刻（不带 ≈），侧车缺行再退事件流推断（≈），再退「?」——观测盲窗里的 CLI tick 不再丢勾选时刻

- 任务勾选时刻必须以显式留痕为最高优先源：`task tick` 翻格成功后系统 MUST 向变更目录 `task-ticks.jsonl` 追加一行含毫秒时间戳（ts）、归一任务 id（task）、来源标记（source:'task-tick'）的 JSON 留痕；`watcher timeline` 与归档烤制的任务面渲染 MUST 按三级降序取时刻——侧车精确时刻（HH:MM:SS，禁止带 ≈ 前缀）＞ 事件流计数链推断时刻（≈HH:MM:SS）＞「?」，降级次序不得颠倒。

#### 场景：CLI tick 留痕且时间线精确显示

Given 变更目录存在 tasks.md 且 task-01 未勾选
When 执行 `sillyspec task tick --task task-01` 翻格成功
Then task-ticks.jsonl 追加一行 `{ts, task:'task-01', source:'task-tick'}`；渲染任务面时 task-01 行显示该 ts 的 HH:MM:SS 且不带 ≈ 前缀

#### 场景：侧车缺行回退推断、链断回退 ?

Given 侧车无 task-02 行且事件流含可衔接的 task-done 计数链
When 渲染任务面
Then task-02 显示 ≈推断时刻；若计数链推断也不可用则显示「?」并保留既有缺时刻注记

### FR-02: 提交锚按变更名收敛：提交全消息不含本变更名的提交不参与该变更任务行的锚定（litellm-retire 案例回归：6c490325f/ab87d6adb 含 task-01/04/05 token 但消息属他变更，不得锚到 deploy-release-notes 任务行）；事件时间轴 commit 行展示面不变

- 提交锚定必须按变更名收敛：提交消息全文（含正文）不含本变更名的提交禁止参与该变更任何任务行的锚定；含变更名的提交按既有 task-NN token 规则锚定；事件时间轴的 commit 行展示 MUST 保持既有格式不受锚收敛影响；`resolveCommitAnchors` 未传变更名时 MUST 保持既有行为（向后兼容）。

#### 场景：他变更提交含同 token 不误锚

Given 事件流观测到提交 6c490325f（消息含 task-01 token 但全文不含「2026-10-14-deploy-release-notes」）
When 以 change=2026-10-14-deploy-release-notes 渲染任务面
Then task-01 行不得锚定 6c490325f，显示「无提交锚⚠️」

#### 场景：本变更提交正常锚定

Given 事件流观测到某提交消息全文同时含变更名与 task-05 token
When 渲染该变更任务面
Then task-05 行锚定该提交短 hash（既有锚定形态不变）

### FR-03: 幂等重勾零追加、侧车写失败不阻断翻格、已有测试全绿 + lint 绿

- 侧车写入必须不破坏翻格主流程：已勾再勾（already 幂等分支）禁止追加侧车行；侧车写失败 MUST 仅告警，翻格主流程（tasks.md 翻格、exit 0、事件直写既有语义）不受影响。「已有测试全绿 + lint 绿」由收口实测门承担（CLI 亲测全量与 lint），不在测试绑定面重复。

#### 场景：幂等重勾零追加

Given task-01 已勾选且侧车已有其留痕行
When 再次执行 `task tick task-01`
Then 侧车文件内容不变（零追加），exit 0 回显幂等

#### 场景：侧车写失败不阻断

Given 侧车路径不可写（目录被占/权限拒绝）
When 执行 `task tick task-01` 翻格
Then tasks.md 照常翻格、exit 0，仅输出写失败告警

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/task-tick.test.mjs「tick 侧车留痕：翻格追加 task-ticks.jsonl（ts+task+source）；幂等重勾零追加」
FR-01: test/watcher-timeline.test.mjs「renderTimeline：侧车精确时刻优先（无 ≈），缺行回退推断 ≈，双盲回退 ?」
FR-02: test/watcher-timeline.test.mjs「resolveCommitAnchors：change 参算 sameChange（全消息含正文）；缺省恒 true 向后兼容」
FR-02: test/watcher-timeline.test.mjs「renderTimeline：跨变更误锚回归——他变更提交含同 token 不锚定（litellm-retire 案例形态）」
FR-03: test/task-tick.test.mjs「侧车写失败仅告警不阻断翻格（目录占位 EISDIR 形态）」
