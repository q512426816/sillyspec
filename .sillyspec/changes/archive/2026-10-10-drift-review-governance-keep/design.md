---
author: flow-machine-draft
created_at: 2026-10-10T04:59:37.307Z
---
# 设计记录（Design Record）— 2026-10-10-drift-review-governance-keep

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三处小改：① `detectPatchDrift`（flow-parity.js）在既有「窗口内本变更后缀提交」判定上加算文件面——`git log --name-only` 收集窗口内本变更提交触及的文件集，导出 `ownFiles`/`governanceOnly`（全部在 `.sillyspec/**` 下）/`touchedPromiseFace`（含本变更 requirements.md/design.md）三个向后兼容新字段；② flow.js 漂移分支在「锚定当前 HEAD 保留」与「隔离重评」之间插第三态——`governanceOnly && !touchedPromiseFace` 时保留 review.json 不隔离不重置标记，`driftRefreeze` 照旧置位（自动重冻结吸收治理面增量，审计件覆盖最新提交面的不变量不破）；③ `renderReviewerTaskbook`（flow-review.js）前轮 findings 读取回退——review.json 缺席时从字典序最新的 `review.json.superseded-*` 隔离件注入，隔离不再把「复审只验修复+回归」语义丢了。另在 flow.js 消费 PASS+P2/P3 处追加处置提示行。

选「文件面等价判定」而非「治理目录白名单」：评审结论的对象是交付面 diff，按提交实际触碰文件切（既成事实口径，与 filterCommittedFace 同哲学），不引入按目录声明的抢夺面；承诺面（requirements/design）虽在 `.sillyspec/**` 下但同为评审对象（FR↔实现三方一致的输入），显式排除在豁免外——评审后改弱承诺溜过去的洞不留给开。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

`detectPatchDrift` 返回对象新增 `ownFiles: string[]`、`governanceOnly: boolean`、`touchedPromiseFace: boolean` 三字段（内部函数，无 CLI/文件格式面）；`renderReviewerTaskbook` 前轮注入数据源增加 superseded 回退（输出文本形态不变，仅 review.json 缺席且隔离件在场时多出前轮 findings 段——与 review.json 在场时同形态）；flow done 收口输出新增两类行（治理面等价保留说明、P2/P3 处置提示）。无命令签名/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。判定基于既成提交事实（freezeHead..HEAD 窗口内提交的实际文件面），不依赖提交先后意图；锚定保留（reviewedAgainst=当前 HEAD）优先级高于治理面等价保留，两者判据独立不互斥——先锚定后等价的短路顺序保证「对着最新面做的评审」永远保留。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   与现状同面：漂移检测在 flow done 进程内同步执行，review.json 隔离/保留是单写者；并行会话后缀提交只影响归属判定输入（窗口内文件集），治理面等价判定对窗口内全部本变更提交取全称量词（任一交付文件即破豁免），不因提交顺序产生不同结论。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。保留分支零文件操作（不 rename 不重置），中断重跑幂等；重冻结路径与既有 driftRefreeze 完全同链。极端边界：own 提交存在但文件列表为空（如无 -m 展开的 merge 提交）→ governanceOnly=false → 回落隔离重评（fail-safe 宁可多评）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。窗口与文件面均在 cwd 单仓内采集；他侧后缀/裸提交不进 own 集（parseChangeNamesFromSubject 既有口径），其治理文件提交不影响本变更判定；`.sillyspec/**` 谓词对本变更 ownPrefix 外的治理路径同样计治理面（knowledge/docs 等共享面），但它们不参与承诺面排除——承诺面谓词精确匹配本变更目录两文件名。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：豁免边界被人当作后门——治理面等价保留后，理论上可把代码改动伪装进 `.sillyspec/**`（如改 `.sillyspec/docs/` 下的代码生成模板影响行为）。缓解：该面本就是治理面（冻结件既有口径），评审任务书材料含工作区实态核对指引；风险敞口与既有「裸提交不触发漂移」的保守留白同级，可接受。试过放弃的方案：① 按「评审 verdict=PASS 才豁免」加限定——FAIL 评审本就未消费、隔离无损失，加限定徒增状态耦合，放弃；② 承诺面措辞级修改（P2 文字修正）也豁免——工具无法廉价区分措辞与实质（改弱承诺），宁可多评一轮复审（前轮 findings 注入后成本已降），放弃；③ 自动重冻结后把新 patch 哈希回写进 review.json——评审员产物由工具改写破坏独立性留痕语义，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-parity.js | `detectPatchDrift` 加算 ownFiles/governanceOnly/touchedPromiseFace（--name-only 窗口采集 + JSDoc） |
| 修改 | src/flow.js | 漂移分支插治理面等价保留第三态；PASS+P2/P3 消费处追加处置提示 |
| 修改 | src/flow-review.js | `renderReviewerTaskbook` 前轮 findings 读取回退最新 superseded 隔离件（import 补 readdirSync） |
| 修改 | test/flowdone-disposition-drift.test.mjs | ① 扩展文件面字段断言 + 新增 ③ e2e 治理面等价保留场景 |
| 修改 | test/flow-review.test.mjs | 新增任务书 superseded 回退用例 |
