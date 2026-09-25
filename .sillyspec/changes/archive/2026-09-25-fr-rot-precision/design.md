---
author: flow-machine-draft
created_at: 2026-09-25T11:32:34.898Z
---
# 设计记录（Design Record）— 2026-09-25-fr-rot-precision

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
rot 打标从域级全标收紧为文件面交集三分判据（strong/unknown/skip），两轮评审修正稿落地。核心底座：fr-index.js 新增 frCoverageFiles（归档 design 交付表剥反引号 ∪ change-patch.json files，统一剔 .sillyspec/）+ readActiveFrDigest 新增 bindings 字段（测试绑定为第三源）+ 交付表正则抽公共 deliverableFilesFromDesignText。上层：rotSuspectFlow 三分判据（遥测 count=strong 防 knowledge-stats 污染）、frDupGateFlow 取最高重叠对+场景名、阈值常量公共化、resume 复用 changedFilesSinceBaseline、cleanupStaleReviewMarks 存量治理（200 条标记按交集重算，评审模拟 keep 72/删 128）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
fr-index.js 新导出：frCoverageFiles({archiveRoot,changeName})→string[]、deliverableFilesFromDesignText(text)→string[]、cleanupStaleReviewMarks({specBase,archiveRoot})→{removed,kept,skipped,files,byRef}、常量 FR_TITLE_OVERLAP_THRESHOLD=0.6。readActiveFrDigest 返回新增 bindings 字段（纯增量）。flow.js：rotSuspectFlow 返回改 {strong,unknown,skip,marked,warn,warnInfo}（遥测 count 语义=strong）；frDupGateFlow 命中行含 overlap/scenarios。stage-contract.js 与 flow.js 的 0.6 改常量 import（行为零变化）。resume 注入 filesOverride 改 changedFilesSinceBaseline 口径。协议调用数不变（恒 2）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：coverage 是归档时点快照（change-patch/design 均冻结件），后续变更不改写归档——迟到无影响；unknown 的 ref（如 recent-quick）永远无归档，恒走删除侧稳定。
2. 并发写：cleanupStaleReviewMarks 原子写 + 写前重读快照比对——盘上被并行会话改写的文件跳过（幂等重跑消化）；rot 打标沿 markFrNeedsReview 既有 keep-latest 幂等；frCoverageFiles/covCache 纯读。
3. 切换/中断：清理幂等可重跑（重跑 removed=0）；三分判据纯函数面（rot 每次收口重算）；中断重入不产生半态（原子写保证文件级完整）。
4. 作用域：specBase/archiveRoot 显式传参（--spec-dir 外置根同口径）；测试夹具临时目录验证隔离；quick 侧钩子（run/shared.js）不在本变更范围——存量 quick 会话再收口会重打 recent-quick，已明示为已知边界（cleanup 幂等可再跑消化）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=判别力天花板：评审实测基线（131 条→strong 83/unknown 8/skip 40；存量 keep 72/删 128）——src/flow.js 等高耦合文件的历史 coverage 命中率极高，域级通胀收敛为「文件级通胀」，这是 FR 覆盖面记录粒度（文件）的数据模型限制，判据无法再细；后续若要更准需 hunk/符号级 coverage（记为方向）。次风险=3 个早期 thin 归档无 change-patch.json 导致 8 条恒 unknown（宁漏勿滥可接受，unknownSources 遥测带来源名可后续补录）。死路①：hunk 级判据（parse patch 文本按函数归属）——解析复杂度与归档件形态耦合，弃；死路②：quick 侧钩子同步收紧——quick 退役中，为其扩面反向投资，弃（重打残留由 cleanup 幂等重跑消化）。
