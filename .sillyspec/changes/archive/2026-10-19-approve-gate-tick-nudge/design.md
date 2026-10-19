---
author: flow-machine-draft
created_at: 2026-10-19T07:38:24.187Z
---
# 设计记录（Design Record）— 2026-10-19-approve-gate-tick-nudge

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

给 P1 落下的顺序正典补两个便宜机器门。第一件（approve 实门）：cmdFlowApprove 在写批准前先跑文档完整性校验——复用 flow done 已有的 verifyFlowDrafts/verifyThinDocsV2/verifyDesignRecordFilled 双轨校验，violations 非空即 exit 1；这使「批准」从橡皮章变成有内容的机器事实（批时文档必齐）。关键改动是给 verifyThinDocsV2 加 repair:false 只读开关（现状它对被改写的问题行有自动回填写盘副作用，approve 是批准面不是修复面，禁止写文件）。第二件（tick 现场提醒）：task tick 回显末尾在 spec 面未齐或未批准时附一行 advisory 警示——勾选是 agent「正在干活」的最高频时刻，这里提醒成本最低、时机最准。两件共用同一判定，故把 status 内联的「design 四节已答」双格式判定抽为共享导出，status/tick/approve 三面同源。

选复用而非新写校验，依据是 D 可行性报告（改动约 40-70 行、纯复用低风险）；选 advisory 而非硬拒 tick，依据是既有 B 模式（码先于变更）与「先勾后补文档」存量习惯——硬拒会误伤，警示不改行为。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- verifyThinDocsV2（src/flow-draft.js）：新增可选参数 { repair }（默认 true 保持 done 路径现状；approve 传 false 走只读分支，violations 照报但不写盘）——模块内部函数签名扩展，对外 CLI 无感。
- flow approve：行为变化——文档未齐时 exit 1 拒批（新增输出面：逐条违规+修复指引+「答齐后重跑」）；brainstorm 收编豁免四节；ledger 缺失 fail-open 放行并标注降级；齐备时成功面输出不变。
- task tick：回显条件性追加一行 spec 面警示（advisory）；既有行与静默路径逐字不变。
- flow status：内部改调共享判定函数，输出逐字不变（零行为变化，测试快照钉住）。
- 新共享导出（落 flow-draft.js，命名如 designSectionsFilled(text)）：v1 槽计数/v2 节判定双格式纯函数。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。approve 校验读的是批准时点的文件快照，文档后改不改不影响「批时已齐」这一机器事实；tick 警示只读当下状态，无时序假设。先码后答再批的形态（实证批量收口主形态）依然能通过 approve——这是声明的边界（见风险节），不假装能拦。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

approve 校验与落盘非原子，窄窗内他方改写文档理论上可造成「校验后文件又变」——与现状（无校验）相比严格更强，不引入新风险；flow-state 写仍走既有 writeFlowState 原子写。tick 警示读取 fail-soft（读失败静默，回显退化为现状）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。approve 拒批不写任何状态（spec_approved 缺席=未批，与从未跑过等价）；重跑补答后 approve 即过。tick 警示无状态。中断恢复走既有断点机制，无新增半态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

draft-ledger 在 .runtime 是机本位——跨机 approve 读不到 ledger 时 fail-open 放行并标注（不能因机器边界把合法批准卡死）；本变更不新增跨机数据面。多活跃变更各自 --change 隔离，判定函数读变更目录内文件，无串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是 approve 硬拒的误伤面：存量进行中变更（P1 之前建的）文档可能是旧骨架形态，被新门拒批会打断在途工作。对策：v1 轨走 verifyDesignRecordFilled 同口径、ledger 缺失 fail-open、brainstorm 豁免——三重降级保底；且拒批输出给全修复指引（一次给全，不靠二跑）。

- 放弃方案①：approve 校验加时序证据（spec_approved_at vs 首个 src 提交）——放弃理由：四路调查实证批量收口模式下 git 时间戳系统性说谎（批准恰在单提交前 12 秒 12/12「合规」假象），检查恒放行且 CLI 记录面无 src 编辑事件；完整时序只有 harness 层 PreToolUse 埋点可做，属独立决策的新工程。
- 放弃方案②：tick 硬拒（spec 面未齐禁止勾选）——放弃理由：B 模式（码先于 flow start 的倒推收尾）与既有「先勾后补文档」习惯会被误伤，且勾选证据链（token 提交）已由收口哨兵承担；advisory 达到提醒效果且零误伤。
- 放弃方案③：新写一套 approve 校验逻辑——放弃理由：done 门已有 verifyFlowDrafts 双轨校验与豁免口径（brainstorm/ledger），复用保证两面判定永远同源，新写必然漂移。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-draft.js | verifyThinDocsV2/verifyFlowDrafts 加 repair 只读开关（approve 轨违规照报不写盘） |
| 修改 | src/flow-review.js | 新增共享 designSectionsFilled（v1 槽/v2 节双格式，判据与 status 原内联逐字一致） |
| 修改 | src/flow.js | cmdFlowApprove 批准前双轨校验硬拒（brainstorm 豁免/ledger 缺失 fail-open 降级/advisory 不阻断）；status 改调共享判定（行为零变化） |
| 修改 | src/task-tick.js | 回显末尾条件警示（design 未答或未批准且非 autopilot → 一行 advisory，读失败静默） |
| 新增 | test/approve-gate-tick.test.mjs | FR-01~04 场景七例（硬拒/放行/只读/豁免/降级/共享判定/tick 警示与静默） |
