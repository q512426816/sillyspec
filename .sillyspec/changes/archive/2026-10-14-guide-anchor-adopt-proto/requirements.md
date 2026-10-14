---
author: flow-machine-draft
created_at: 2026-10-14T01:42:48.352Z
---
# 需求规格（Requirements）— 2026-10-14-guide-anchor-adopt-proto

## 功能需求

### FR-01: outputStep 尾部指引全文锚行（必须）

`src/run/prompt.js` 的 `outputStep` 渲染，在首见与复入两个分支的输出**末尾**必须各打一行锚：指引静态全文落盘路径（step-guides 文件）。锚行必须满足：①位置在 outputStep 打印序列的最后（后续 harness 截断保尾时必然幸存）；②含完整可 Read 的文件路径；③`SILLYSPEC_STEP_GUIDE=0`（guide 关闭）时零新增输出——确定性测试面不变；④`--json` 劫持态（jsonHijacked）不打印。

#### 场景：主路径——长输出被截断

Given 某步渲染含长动态注入段（模块欠账/知识命中等），CLI stdout 超出 harness 工具结果上限被尾部截断
When agent 只收到末尾若干行
Then 末尾含「指引全文落盘：<step-guides 文件绝对路径>」锚行，agent Read 该文件即拿回完整步骤规则（分级/生成要求等决策关键节）。

#### 场景：回归——guide 关闭

Given `SILLYSPEC_STEP_GUIDE=0`
When outputStep 渲染
Then 输出与改动前逐字一致（无锚行）。

### FR-02: flow adopt 与 resume 尾部重列变更原型（必须）

`src/flow.js`：①adopt 路径（头脑风暴收编）的尾部「材料路径清单」必须追加变更目录内 prototype HTML 清单（中部「🖼️ 原型在场」行之后，尾部再列一次路径——截断不丢指针）；②resume 简报对变更目录含 `prototype-*.html` 的变更，必须在尾部材料清单后补原型必看行。无原型时两处零新增输出。

#### 场景：主路径——收编输出被截断

Given 头脑风暴产出 prototype-x.html 后 `flow start --change <名>` 收编，输出被截断只剩尾部
Then 尾部材料清单含原型路径与「实现前必看」提示，agent 不丢对照基准。

#### 场景：主路径——会话恢复

Given 收编变更含原型，会话切换后重跑 `flow start --change <名>`（恢复简报）
Then 恢复简报尾部同样列出原型路径。

#### 场景：回归——无原型变更

Given 变更目录无 prototype HTML
When adopt/resume 渲染
Then 输出与改动前一致（零新增行）。

### FR-03: 测试锁三处锚行且全绿（必须）

新增测试必须断言：①outputStep 首见与复入渲染末尾均含 step-guides 路径锚行且为最后输出行之一；②`SILLYSPEC_STEP_GUIDE=0` 时输出与基线一致（锚行缺席）；③adopt 尾部含原型路径行、resume 简报对含原型变更补尾部行、无原型时零新增。收口前 `npm test` 必须全绿、`npm run lint` 必须绿。

#### 场景：主路径

Given 改动落盘
When 跑新增测试与全量测试
Then 断言全过、既有测试零失败、lint 零错误。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/guide-anchor-adopt-proto.test.mjs「outputStep 首见/复入尾部锚行 + guide 关闭零输出」
FR-02: test/guide-anchor-adopt-proto.test.mjs「adopt/resume 尾部重列原型 + 无原型零新增」
FR-03: test/guide-anchor-adopt-proto.test.mjs（本文件即覆盖载体；全绿由收口实测对账保证）
