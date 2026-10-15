---
author: flow-machine-draft
created_at: 2026-10-15T02:13:55.145Z
---
# 设计记录（Design Record）— 2026-10-15-rot-coverage-git-source

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

效果评估实证：fr-rot-suspect 遥测 unknown 面长期卡死 6 个归档变更——thin 归档无 design 交付表、无 change-patch.json 文件清单，frCoverageFiles 两源皆空→覆盖不可判定→每次 flow done 反复进 unknownSources（本仓遥测尾部记录实证六来源反复出现）。修法：frCoverageFiles 增源3——`git log --all --name-only --pretty=format:COMMIT --grep <变更名>`（archiveRoot 为 cwd，子串匹配；变更名含日期前缀足够特异）文件集并入覆盖面，剔除 .sillyspec/ 前缀（与既有统一过滤契约一致）、剔 COMMIT 分隔行；execFileSync 失败（非 git 仓/无记录）fail-soft 按源缺处理。调用侧 partitionActiveByCoverage 的 covCache 每运行缓存，性能增量=每 unknown 变更一次 git log。实测六顽固化来源 4 个恢复（1~23 文件）转强命中/skip，2 个只触 .sillyspec 面按既有契约保持 unknown 诚实态。顺带导出 partitionActiveByCoverage（纯函数，测试消费正当需要）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/fr-index.js frCoverageFiles：返回面不变（string[]），来源 2→3（design 交付表/change-patch.json/git 历史）；`.sillyspec/` 过滤契约逐字不变。
- partitionActiveByCoverage 由模块私有改导出（签名不变）。
- 消费方（activeFrCoverageHits/rotSuspectFlow/rankFrDigestForInjection/collectFrLinkedTests）零签名变化——unknown 收敛是行为改善非契约变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——覆盖面为历史确定态（git log 只读），无时序依赖。
2. 并发写：零写盘；git log 只读与并行 CLI 会话共存（git 自身并发安全）。
3. 切换/生命周期：covCache 生命周期=单次调用链（activeFrCoverageHits/rank 各自新建），无跨运行残留；git 历史追加只增不改，幂等。
4. 作用域：--all 覆盖分支/worktree 提交——同名变更名跨分支重复提交极端场景会把多分支文件并集当覆盖面，评估可接受（变更名含日期+主题，重名概率趋零；宁可覆盖面略宽勿漏）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：--grep 子串误吸——变更名 A 是变更名 B 子串时 B 的文件被吸进 A 覆盖面。评估：变更名格式 `YYYY-MM-DD-主题`，互为前缀子串的场景是同日同名变体（罕见且语义相近），宁可宽勿漏；如需收紧可改 --grep "^<名>$" 正则锚定（regex 语义）留作后续。次风险：大仓 git log 全历史遍历的性能成本（每 unknown 变更一次、covCache 摊薄、64MB maxBuffer 上限）——本仓实测毫秒级，量级无忧。放弃方案：①往归档变更补写 change-patch.json（冻结件 sha256 锚定，篡改审计真相=红线）；②unknown 来源持久化豁免清单（补丁摞补丁，git 源把根因解了豁免无必要）；③只对 unknownSources 计数不列名（丢定位信息，收口 advisory 失去可操作性）。
