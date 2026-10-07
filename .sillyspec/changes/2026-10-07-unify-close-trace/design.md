---
author: flow-machine-draft
created_at: 2026-10-07T15:27:48.775Z
---
# 设计记录（Design Record）— 2026-10-07-unify-close-trace

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

根因：thin（flow done）与 heavy（execute --done）两条通道收尾各写各的留痕文件——thin 只写 change.patch/change-patch.json（沉淀资产面），heavy 只写 scope-audit.json/scope-audit.patch（对账快照面），消费方（平台两张卡、scope-audit 读链）各认一份，导致每类变更恰好一张卡失真。第 2 层（读侧回退，2026-10-07-scope-audit-thin-patch-replay）已让旧归档对账明细恢复真实；本变更做第 3 层写统一：新变更两条通道收尾即两套齐备，读侧回退退化为存量兜底。

方案：flow-parity.js（thin/heavy 对等性的家）新增共用 `writeCloseTraceArtifacts({ changeDir, change, baseline, head, files, metaTotals, patchText, savedAt, snapObj, meta })`——一次写四件（patch 双份同字节、两 json 共享同一 sha256/patchStatus，LF 归一口径与既有同式），返回 { patchStatus, patchSha256 }。配套纯函数 `buildThinSnapshotRows({ ownFiles, stats, planEntries })`（thin 侧三态行构造：filterDeliverableFiles × pathMatches，与 scope-audit 主链路同语义）。接线两处：flow.js flow done 的留档块（替换原手写两件落盘，补排除面）；run/complete.js printExecuteScopeAudit（替换原快照落盘，沉淀面=主仓实改行投影）。scope-audit.js 快照回放 note 按 `snap.closedBy || 'execute --done'` 标通道（additive 键，旧快照默认）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- flow-parity.js 新导出：`writeCloseTraceArtifacts`（写侧四件统一）与 `buildThinSnapshotRows`（thin 三态行纯函数）——既有导出零变化。
- flow.js flow done：change.patch/change-patch.json 键结构与口径不变（files/totals/note/moduleScope/baseline/head/patchSha256/patchStatus 照旧）；新增 scope-audit.json/scope-audit.patch 落盘；ownFiles 与 dirFilesForPatch 排除面追加 scope-audit.json/scope-audit.patch；console 行保留「变更 patch 留档」前缀（flow-protocol 正则断言兼容）。
- run/complete.js printExecuteScopeAudit：scope-audit.json/patch 形态不变（note/closedBy=fail-soft/归档竞态判定照旧，closedBy='execute --done' 为增量键）；新增 change-patch.json/change.patch（files=主仓实改行投影：planned+unplanned 非 crossRepo 行）；空 patchText 从旧「ok+空文件」收口为 failed（双套同标）。
- scope-audit.js：仅快照回放 note 的通道标签插值（closedBy 缺省 'execute --done'），读取链与回放语义零变化。
- CLI 命令签名零变化；--json 契约零变化（快照回放本就原样透传）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立：写函数入参全部来自收尾时点已算好的内存值（patchText/snapObj/stats），无跨事件状态；四件由单函数同步顺序写（patch 双份→两 json），不构成部分可观测的中间态消费面——读侧要么读到旧四件要么读到新四件，json 与 patch 的 sha 锚在函数内一次计算，不存在「两 json 各自算 hash 不一致」的时序窗口。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   两通道收尾点天然互斥（同一变更不会同时走 flow done 与 execute --done）；重入形态（漂移重冻结/处置重跑）是串行重跑，写函数整组覆盖四件。writeFileSync 直写非原子（沿既有两写点现状，上轮评审 P3 已如实入档）：最坏窗口读到半份 json——读侧 readScopeSnapshot/readChangePatchMeta 均 catch 回退下一链路，不出伪数据。多会话并发对**不同**变更各写各目录，无共享文件面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   写函数无跨调用状态（纯入参→落盘）；中断在四件写一半的窗口，重跑收尾整组覆盖自愈（幂等重冻结既有语义）；归档竞态（目录已被并行归档移动）沿 printExecuteScopeAudit 既有 active→archive 目录判定，写函数只接收已解析的 changeDir。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   四件全部落在变更目录（changes/<名>/ 或归档侧），按 changeDir 定位不跨变更；thin 快照行只含主仓 face（filterDeliverableFiles），heavy 沉淀面投影显式排除 crossRepo 行——跨仓行不进本仓 patch/meta，各仓归属不串台。closedBy 只标通道名，无环境耦合。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：两写点行为收口的回归面——thin 侧 console 字样/键序、heavy 侧「空 patch 当 ok」形态变化可能碰隐性消费者。缓解：thin 侧键结构与输出前缀逐字保留（flow-protocol 断言钉住）；heavy 空 patch 形态经全量套件与 e2e 验证；快照新增 closedBy 为 additive 键，旧快照读侧缺省兼容。放弃的方案：① 只做读侧不写统一（第 2 层已做）——新变更永远靠回退兜底，两卡不对称长期存在；② heavy 侧沉淀面在 archive --confirm 才写——语义上更「终态」，但需在归档点重建采集上下文（worktree/分支已清），且与快照时点（execute --done）不一致会造成两套留痕时点漂移，不如同点同锚；③ scope-audit.json 里引用 change.patch 路径省一份 patch 文件——读侧（getFileDiff/平台）认死 scope-audit.patch 文件名，省字节收益小于读面改动风险（同字节 git blob 本去重，零仓容成本）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-parity.js | 新导出 writeCloseTraceArtifacts（四件统一写、sha 同锚）与 buildThinSnapshotRows（thin 三态行纯函数） |
| 修改 | src/flow.js | flow done 留档块改走共用写函数（补 scope-audit 两件）；冻结面排除面追加 scope-audit.json/patch；console 行保前缀 |
| 修改 | src/run/complete.js | printExecuteScopeAudit 改走共用写函数（补 change-patch 两件，主仓实改行投影；空 patch 收口 failed） |
| 修改 | src/scope-audit.js | 快照回放 note 通道标签按 closedBy 插值（缺省 execute --done） |
| 新增 | test/close-trace-unified.test.mjs | writer 单测（四件/同锚/failed）+ buildThinSnapshotRows + 写读 round-trip + thin CLI e2e + 重冻结不自嵌入 |
