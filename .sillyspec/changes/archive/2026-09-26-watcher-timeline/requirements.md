---
author: flow-machine-draft
created_at: 2026-09-26T07:13:30.152Z
---
# 需求规格（Requirements）— 2026-09-26-watcher-timeline

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 合成时间线输出
Given 一个变更存在 watcher 事件流与 tasks.md（活跃或归档）
When 执行 sillyspec watcher timeline --change <名>
Then 输出三段合成时间线：事件时间轴（诞生锚+工件/勾选/提交/告警/归档事件，本地时间到秒）、任务面表格（task-NN × tasks.md 描述行 × 勾选拍 × 提交锚 hash）、墙钟统计（复用 aggregateStageTiming 聚合）

### FR-02: 归档与活跃双态渲染
Given 变更目录在 .sillyspec/changes/<名>/（活跃）或 .sillyspec/changes/archive/<名>/（归档）
When 执行同命令
Then 双路径探测均能取到 tasks.md 渲染；两处都在时以活跃目录为准

### FR-03: 降级渲染 fail-open
Given 事件流缺失、tasks.md 缺失、或提交 hash 在当前仓不可解析
When 执行同命令
Then 不抛错：缺事件流时给出指引退码 2；缺任务面时时间轴照渲并标注「任务面缺失」；hash 失联时只显 hash 并标注「subject 不可解析」

### FR-04: 勾选时刻推断的诚实标注
Given 事件流 task-done 只记计数不记任务 id
When 渲染任务面表格
Then 勾选时刻按翻格顺序推断（0→2 拍赋前两个任务），表头显式标注「≈ 顺序推断」，计数链断裂（from≠上一 to）时该段标「推断不可用」

### FR-05: 纯函数与单元测试
Given parseTaskLines / inferFlipTimes / resolveCommitAnchors / renderTimeline 为无副作用纯函数（git 经注入面）
When 输入合法/缺失/坏行/断裂计数链的合成数据
Then 行为由 test/watcher-timeline.test.mjs 用例钉住

### FR-06: 套件实测全绿
Given 本变更触及 src/ 与 test/
When 运行 npm run test:core 与 npm run lint
Then 全部通过
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: sillyspec watcher timeline --change <名> 输出合成时间线：事件时间轴（工件/勾选/提交/告警/归档）+ 任务面表格（task-NN × tasks.md 描述行 × 提交锚）+ 墙钟统计
FR-02: 归档变更与活跃变更都能渲染（change 目录双路径探测 active
FR-03: archive）
FR-04: 事件流缺失
FR-05: 任务面缺失时降级渲染不抛错（fail-open，缺哪块标注哪块）
FR-06: 任务勾选时刻按翻格顺序推断并显式标注推断语义（事件流只记计数不记 id——诚实面）
FR-07: 合成逻辑为纯函数（解析/推断/锚定/渲染）并有单元测试
FR-08: npm run test:core 与 npm run lint 实测全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs「renderTimeline」用例组：三段齐备时输出含时间轴行/任务行/统计行（渲染判定面）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：双路径探测是 index.js 接线层 I/O（changeDir 解析传参），纯函数接收已解析路径；路径探测无独立逻辑分支可断言（join 两次 existsSync 二选一），由 FR-01 渲染面与 CLI 手动实测覆盖（收口前真实归档变更跑通为证）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs：任务面缺失标注、hash 失联只显 hash、坏行事件容错用例

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs「inferFlipTimes」用例组：0→2/2→5 顺序赋值、0→1 逐拍、计数链断裂标不可用

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs 全文件（parseTaskLines 勾选行/未勾行/无 id 行；resolveCommitAnchors 注入 git 替身）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：套件本身即验证——commands.test/lint 亲测是收口门执行动作

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录切分重复槽——对应本变更 FR-05（纯函数与单元测试），绑定见上（test/watcher-timeline.test.mjs 全文件）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录切分重复槽——对应本变更 FR-06（套件实测全绿），绑定见上（收口门亲测）
