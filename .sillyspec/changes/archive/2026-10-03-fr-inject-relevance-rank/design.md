---
author: flow-machine-draft
created_at: 2026-10-02T16:04:16.302Z
---
# 设计记录（Design Record）— 2026-10-03-fr-inject-relevance-rank

## 文件变更清单
| 修改 | src/fr-index.js | 覆盖三分判定抽 partitionActiveByCoverage + 新增 rankFrDigestForInjection |
| 修改 | src/run/prompt.js | 厚道 buildFrIndexDigestSection 接入排序（🎯 标注 + 遥测 tierA） |
| 修改 | src/flow.js | 轻量道 flowKnowledgeDigest 接入排序（🎯 标注；抽查确认随 ranked 序） |
| 修改 | src/flow-draft.js | draftGwtSkeleton 标题去 50 字截断 + splitGwtSeparator 括号深度感知切分 |
| 修改 | test/fr-inject-cap.test.mjs | ⑤覆盖命中进注入 ⑥日期新者优先 ⑦轻量道直测 |
| 修改 | test/flow-draft.test.mjs | ⑦a 长标题不截断 ⑦b 括号内分隔符不切 |

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
复用既有覆盖命中口径做排序，零新推断：fr-index.js 把 activeFrCoverageHits 内部的「覆盖三分判定」循环抽为 partitionActiveByCoverage（判据逐字不变，rot/测试门/注入排序三消费方共用），其上新增导出 rankFrDigestForInjection——TierA=覆盖命中置前（与本次触碰文件有覆盖交集），TierB=其余按来源变更日期新→旧（YYYY-MM-DD 前缀，无日期居尾），同档 tie-break 全局 id 升序。两个注入口接入：厚道 buildFrIndexDigestSection（src/run/prompt.js，design 交付面作触碰文件）与轻量道 flowKnowledgeDigest（src/flow.js，input 路径或 design 交付面）。顺带修 flow-draft 机器预填两缺陷：FR 标题去 50 字符硬截断、When/Then 切分改括号深度感知（splitGwtSeparator）。选此方案因为它只加排序不改判定——注入是提示面（fail-open），风险最小而止血直接（旧缺陷：文件序前 8=每域最老 8 条恒占席）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出：fr-index.js rankFrDigestForInjection({archiveRoot, frs, changed, covCache}) → {ranked, tierAIds}；flow-draft.js splitGwtSeparator(criterion) → [when, then] | null。内部重构：partitionActiveByCoverage 自 activeFrCoverageHits 抽出（模块级私有，无对外签名变化；activeFrCoverageHits 返回结构不变）。消费面行为变化：注入清单顺序变化 + 命中条目带 🎯 标注 + fr-inject 遥测新增 tierA 字段（既有字段 count/rendered/truncated/unmappedFiltered 零改动）；文件格式无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：注入是每次渲染即时计算的纯读函数，无事件序依赖；tierAIds 由触碰文件面决定，同一变更内文件面只增不减，重算幂等。
2. 并发写：排序只读 knowledge/fr 与 archive（经 frCoverageFiles），无写面；与既有 rot/测试门读取同一数据面，写方仍是 CLI 单一写入方（indexRequirements），无新增竞态。
3. 切换/生命周期：无状态落盘（排序结果不持久化），会话中断/恢复零残留；失败路径 fail-soft——触碰面缺失时保持 readActiveFrDigest 文件序（既有行为）。
4. 作用域：rankFrDigestForInjection 以调用方传入的 archiveRoot 为界（specBase 派生），与 worktree 隔离边界一致，不跨仓读取；Windows 路径在入口统一 POSIX 归一。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：注入顺序变化改变 agent 看到的规格面，理论上可能让依赖「最老 8 条」心智的既有流程预期漂移——已用既有断言全绿对冲（fr-inject-cap ②④ 零回归，⑤⑥⑦ 新口径实证）。试过放弃的方案：① 给 readActiveFrDigest 加全局排序参数——污染两个非排序消费方（dup 门要全量、rot 要原序统计），放弃；② TierB 按「最近确认」commit 日期排——需批量 git log 查 hash 日期，I/O 重且 hash 可能不在本仓历史（平台仓实测抽样 3/3 查不到），改用来源变更名内嵌日期前缀（零 I/O）。splitGwtSeparator 已知残留：括号外的「则」嵌在词内（如「原则」）仍会切分——既有语义保留（不在本变更验收面），带护栏方案需要分词，成本不成比例。
