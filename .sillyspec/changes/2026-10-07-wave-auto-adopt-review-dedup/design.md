---
author: flow-machine-draft
created_at: 2026-10-06T16:13:04.411Z
---
# 设计记录（Design Record）— 2026-10-07-wave-auto-adopt-review-dedup

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三件「把机械活从前移给 CLI」的修复：① Wave 形态错误自动重排——postmortem（provider-model-list）实测 Wave 返工链三轮（同 Wave 冲突→手工拆→非合法 Wave 号→伪并行串行链），而 adopt-waves 按 depends_on 拓扑重排是机械活。修法：executePlanPostcheck 拆为 executePlanPostcheckRun（带 autoAdoptBudget），失败收口点判定「唯一失败组=蓝图一致性且错误全为 Wave 形态」时自动跑 adoptPlanWaves 重排并整体复跑（预算 1 次防环）；伪并行守卫（assessWaveStructure error throw 点）同款挂钩。方向违规自动修复（既有 L2388 机制）不动。挂统一收口点而非 consistency 单点：混有 feasibility 等其他类错误时不重排（实测 WA4 形态——重排会掩盖真实问题上下文）。逃生键 plan.auto_adopt_waves: false（config-schema 注册 + renderExample token）。② 复审任务书前轮 findings——flow-review.js renderReviewerTaskbook 读 changeDir 既有 review.json，在场时注入 findings 清单与「已报项只验修复与回归，重点找新增——勿整轮重报」优先级引导（不禁止重报：二轮换视角有独立价值；挤占 12 次请求预算是实证痛点）；首评零注入（任务书逐字=现状）。Grill 复审侧既有 PRIOR_REVIEW_FACTS/re-review 机制（review-material-pack.js）核查在位不重造。③ 实测门失败面增量重跑（task-07，方案 1 并入）——失败轮把「失败批测试文件（TAP not ok 块 location 路径归因/pytest FAILED 行兜底/归因不出保守全记批文件）+ 当时 git HEAD」落稳定指针 ledger（.runtime/test-rerun-<change>.json）；下轮 dynamic-subset 分支算增量面=「自失败 HEAD 以来变更文件（diff∪untracked）∪ 前轮失败批文件」，严格小于全量面时只跑增量面（三源推断以增量输入重算，修复文件的 import 依赖与 FR 回归自然入面），mode=incremental-rerun 且 reason 披露；增量绿后清账（下轮自然回全子集基线）。批对象补发 files（buildDepsBatches 三批 push + runModuleSubset perModule 透传 + outputFull 内存态归因源）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新导出：verify-postcheck.js readTestRerunLedger/writeTestRerunLedger/computeIncrementalFace；runModuleSubset 结果新增 failedFiles 数组与批 perModule 的 files/outputFull（内存态）；buildDepsBatches 批对象新增 files。行为变更三处（均有回归钉住）：① plan postcheck 在「唯一失败组为纯 Wave 形态错误」时自动重排 plan.md/tasks.md 并复跑（config 缺省开，plan.auto_adopt_waves: false 关闭回现状报错）；② flow done 复审任务书在 review.json 已在场时多前轮 findings 段（首评逐字不变）；③ verify --done dynamic-subset 档在前轮失败后走增量面（mode=incremental-rerun；config verify: test_rerun: full 或 env SILLYSPEC_TEST_RERUN=full 恒全子集现状）。新增配置键两个（plan.auto_adopt_waves boolean / verify.test_rerun enum）+ renderExample token。无端点、无 schema、无既有配置键语义变化；test_strategy: full/skip 路径零触碰。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：无事件流。自动重排是同步单进程内「失败→重排→复跑」；ledger 写在每轮实测后（读-算-写同进程序）；增量面由当次读取的 ledger+git 现态计算，迟到旧 ledger 只会少增量（回全子集，安全方向）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

ledger 后写胜（同 change 并发 verify 罕见；错账最坏=下轮多跑/少跑一轮增量，回全子集兜底）。自动重排写 plan.md/tasks.md 与 agent 并发 Edit 竞争：后写胜（与 agent 手跑 adopt-waves 同语义），plan.md 有 git 兜底可恢复。outputFull 内存态无并发面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

自动重排中断于写盘前=零效果原报错在场；ledger 写失败 fail-soft（下轮退化全子集）；增量面计算失败（git 异常）listFilesSince 返回空贡献→增量面=失败批文件仍可增量。复跑预算 1 次防「重排→又失败→再重排」循环。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

ledger 按 change 名寻址（change 级隔离）；自动重排只动 changeDir 内 plan.md/tasks.md；增量面三源推断以 cwd 为根（worktree 内跑时 specBase 锚回主仓与既有口径同源）；taskbook 读本 changeDir 的 review.json。均无跨 change 共享态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：③增量重跑的假绿面——修复破坏了「增量面之外、基线绿面之内」的测试而未被发现。缓解链：增量面三源推断以修复文件为输入重算（import 依赖与 FR 关联回归自然入面）；失败批文件无条件入面；增量面≥全量面时回全子集；test_rerun: full 逃生；归因不出保守全记批文件（增量退化不误报）。残余接受：跨模块副作用破坏无 import 边文件的理论面——与「agent 手动只跑失败测试」的现行实践相比是严格改进。第二个风险：①自动重排改写 agent 手排 Wave——agent 的时序意图应编码在 depends_on（adopt 的输入）而非 Wave 手排；公告醒目 + config 逃生 + git 可恢复。试过但放弃：a) 增量后强制再跑全子集确认——passing 轮成本反升（增量+全量>全量），postmortem 的痛点是失败轮返工不是通过轮；b) 逐文件归因用 failureRemaining 行集——实证行集只含内层用例名不含文件名（node --test 文件作参数时顶层名=测试标题），改走 not ok 块 location 路径；c) Wave 错误在 consistency 单点挂自动重排——WA4 实证混有其他错误时会误触发，移到失败统一收口点判定。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/plan-postcheck.js | executePlanPostcheck 拆 Run+预算复跑；统一收口点自动重排判定；伪并行挂点；autoAdoptWavesEnabled |
| 修改 | src/flow-review.js | renderReviewerTaskbook 前轮 findings 注入 |
| 修改 | src/verify-postcheck.js | 增量重跑（ledger/归因/增量面/config）；批 files 下发；outputFull |
| 修改 | src/config-schema.js | plan.auto_adopt_waves + verify.test_rerun 注册与 example |
| 修改 | package.json | 两个新测试收录 test:core |
| 新增 | NEW:test/wave-auto-adopt.test.mjs | WA1-WA4 + RB1 |
| 新增 | NEW:test/test-incremental-rerun.test.mjs | IR1-IR4（集成主链路真跑） |

## 评审清偿与勘误（收口前补记）

- 评审 P2 清偿：增量守卫对比基线从「输入面文件数」改为「ledger.scopeFiles=基线实测测试文件集」（runModuleSubset 结果新增 scopeFiles 并入账）——原口径拿测试文件数对输入面数比较，级联失败（失败测试数≥输入面数）时增量永不触发，恰是动机场景失效；IR1 补级联用例钉住。
- 评审 P3 清偿：撤销三项（self 档不实施 / --answer 补 wait 视为已修复 / --step 断言保留）补记于本文件「风险与死路」在档；design 文件清单补 test/plan-wave-structure-guard.test.mjs（提交 1b941893 实改）。
- 「非法 Wave 号」无独立错误族：塌缩为伪并行族报出（退化安全），枚举 token 承接自成功标准原文。
