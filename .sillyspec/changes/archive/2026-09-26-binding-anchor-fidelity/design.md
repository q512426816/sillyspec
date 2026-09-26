---
author: flow-machine-draft
created_at: 2026-09-26T07:53:32.794Z
---
# 设计记录（Design Record）— 2026-09-26-binding-anchor-fidelity

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
- 提取侧（src/flow-draft.js extractRequirementBindings）：路径 token 仍全局定位（兼容散文引用），新增「邻接用例锚捕获」——路径后紧邻窗口（到下一路径 token 或行尾）里识别四形态用例锚（「…」＋可选 组/用例 后缀、#…、::…、> …），「：」后视为描述不捕；tests 条目从纯路径扩为「路径＋锚」。
- 路径解析：裸文件名/路径段先按仓根存在性直取，不存在则仓内扫描（排除 node_modules/.git/.sillyspec 等）做后缀/基名唯一命中解析成项目相对全路径；无唯一命中原样保留（dangling 面自然暴露）。仓根从 changeDir 上两级推导，失效回退 cwd。
- 消费侧（src/test-bindings.js 新导出 testAnchorFile 统一剥锚）：resolveTraceResidual（残差实测文件面）、resolveTestFileOwners（watcher 归属匹配）、fr-index covHit 与 flow.js rotSuspectFlow 的覆盖集、index.js --unbind 的 tests 匹配，共 5 处按文件路径取值点全部走剥锚；展示面（test-trace.json、FR 机器子块、tests 视图）保持完整锚点不剥。
## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- extractRequirementBindings 产出的 row.tests 条目语义扩展：`<项目相对路径>` 或 `<路径><用例锚>`（test/foo.test.mjs「X」组 / test/foo.test.mjs#x / test/foo.test.mjs::x / test/foo.test.mjs > x）——存书写原形（只摘不译），「不适用」跳过、非测试路径过滤、去重排序等既有不变量不变。
- 新导出 testAnchorFile(entry) → string：剥用例锚取文件路径（无锚原样返回）；需要文件路径的消费方统一走它。
- test-trace.json 的 tests 数组、knowledge/fr 机器子块 `tests:` 行（| 分隔）自此可携带锚点——旧纯路径条目双向兼容（testAnchorFile 幂等）。
- 书写面契约：绑定槽模板（flow-draft.js 两处）与 flow 收口指引文案收紧为「项目相对全路径＋用例名」。
## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：路径与用例锚的配对以「路径后紧邻、到下一路径 token 为界」的窗口判定——多文件同行时窗口切分确定；用例名写在路径前等非邻接形态不捕获（邻接是明确书写约定，宁漏勿误，漏捕只降级回文件级）。
2. 并发写：提取只发生在 flow done distill 单点；test-trace 写入与 FR 子块 upsert 既有幂等；本变更不引入新写点与时序。
3. 切换/生命周期：仓内扫描索引是单次提取调用内的闭包缓存，无跨调用/跨进程状态；中断重入后 extractRequirementBindings 幂等重放同一 requirements.md。
4. 作用域：仓根推导自 changeDir 目录结构（<root>/.sillyspec/changes/<名>），主仓/worktree 同构；推导失效回退 process.cwd()。跨仓条目（repoKey: 前缀）不在本路径面，不串台；同名文件跨仓歧义时唯一命中规则天然不解析。
## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
- 最大风险＝锚点后缀漏进文件面消费（残差实测会拿不存在路径去跑、watcher 归属匹配失联、rot 覆盖误判 skip）——已 grep 全量枚举 `.tests` 消费点逐一适配，新测试对每个消费点各钉一条回归。
- 次风险＝裸名解析误绑（basename 在仓内多处出现）——仅唯一命中才解析，零命中/多命中原样保留，dangling 校验自然暴露。
- 死路：用例锚做独立字段（cases:）——test-trace schema、FR 机器子块、md 解析三处格式连动且存量数据双形态并存，复杂度不成比例，弃。
- 死路：回写历史归档 test-trace 补锚——归档是冻结审计面不回写；新变更提取即生效，旧数据维持文件级（诚实），弃。