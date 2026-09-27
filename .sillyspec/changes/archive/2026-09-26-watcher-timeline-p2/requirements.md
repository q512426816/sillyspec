---
author: flow-machine-draft
created_at: 2026-09-26T07:28:26.622Z
---
# 需求规格（Requirements）— 2026-09-26-watcher-timeline-p2

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 断裂语义收窄
Given 事件流翻格计数中段不衔接（某拍 from 不等于游标）
When inferFlipTimes 判定
Then 标 broken 且该拍起不再赋值；计数链完整但未覆盖全部任务（尾部未勾）不标 broken

### FR-02: 已勾缺时刻的渲染层标注
Given tasks.md 某任务已勾但推断时刻为 null（观测盲窗/水位丢失）
When renderTimeline 渲染任务面
Then 该任务行时刻列显示 ?，表下注记「已勾任务缺推断时刻」；不再以笼统断裂注覆盖此形态

### FR-03: 逐阶段墙钟输出
Given 事件流含带 stage 的事件
When renderTimeline 渲染统计段
Then 输出「阶段墙钟」行——复用 watcher 的 aggregateStageTiming 聚合，每阶段 first→last 差按时/分格式化

### FR-04: 双路径探测用例
Given loadChangeTasks 为活跃>归档双路径探测函数
When tmpdir 下构造活跃/归档/双缺失三种盘面
Then 活跃优先、归档回退、双缺失返回 null——由 test/watcher-timeline.test.mjs 新用例钉住（修正主变更 FR-02 豁免理由失实）

### FR-05: 套件实测全绿
Given 本变更触及 src/ 与 test/
When 运行 npm run test:core 与 npm run lint
Then 全部通过
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: inferFlipTimes 仅在中段计数不衔接时标 broken，尾部未覆盖不再误标，配套用例更新
FR-02: renderTimeline 输出逐阶段墙钟（复用 watcher 的 aggregateStageTiming），已勾任务缺推断时刻时单独标注而非笼统断裂注
FR-03: loadChangeTasks 获 tmpdir 用例：活跃优先于归档、归档回退、双缺失返回 null
FR-04: npm run test:core 与 npm run lint 实测全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs「inferFlipTimes」组：中段断裂标 broken、尾部未覆盖不标（旧用例期望改写即清偿加钉）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs「renderTimeline」组：已勾任务缺时刻显示 ? 与专门注记行

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs：渲染输出含「阶段墙钟」行与阶段名

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/watcher-timeline.test.mjs「loadChangeTasks」组：tmpdir 三盘面用例

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：套件本身即验证——commands.test/lint 亲测是收口门执行动作
