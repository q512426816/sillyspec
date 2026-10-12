---
author: flow-machine-draft
created_at: 2026-10-12T07:55:11.956Z
---
# 设计记录（Design Record）— 2026-10-12-thin-module-gate-and-feed

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三档共用 reconcileModuleDocs 已算好的结构化事实（modules/uncoveredDirs/moduleMaps，flow done patch 子步时点口径，随 change-patch.json 落盘）——不新建计算面，只改变事实的消费方式。

一档（软门）：patch 子步算完 moduleScope 后、写收口留痕前，若模块图在场且交付面存在未登记目录（module_gate_ignore 忽略项前缀排除后仍非空），阻断收口（reportMidFail('patch') + exit 1），提示两条出路：登记 _module-map.yaml 后重跑 / --accept-unmapped 显式放行。放行时缺口数写入 change-patch.json meta.acceptedUnmappedDirs（镜像 acceptedDirtyGap 先例）。门在 distill 之前——indexRequirements 的域路由发生在 distill，拦在前面 FR 才不落伪域。选软门而非纯硬门：真有合法未登记目录（根级脚本/配置），误报硬拦会重蹈 docs-gate 注释训过的「误报训练忽略报警」；签收制让每次放行成为审计面可见决策，遥测攒数据后再议收紧。

二档（机械回写）：distill 子步对 moduleScope.modules 命中模块回写变更索引行。目标判定遵守 split-changelog 契约：sidecar（<module>.changelog.md）在场优先追加 sidecar 勿写回卡；否则卡内「## 变更索引」节（存在才动）；两者皆无跳过。行格式按目标既有形态自适应（表格「| 日期 | 变更名 | 摘要 |」/ 列表「- 变更名 | 摘要」）；变更名在场即跳过（幂等，防断点续跑双写）。零语义判断（日期/变更名/动机首行全是已知量），与 decision-distill 降 noAI 同性质。回写文件经 runArchiveChain 新增 extraDocs 通道随归档窄化精确入暂存（文件级 pathspec，不目录级）。patch 子步被跳过（断点续跑）时从 change-patch.json files[] 回读重算 moduleScope。

三档（提示前移）：flowKnowledgeDigest 里 touched 非空时，对 collectModuleMaps 各 project 调 computeDocsDebt（厚道 execute {DOCS_DEBT} 同源），命中模块 behind>0 或卡从未提交才出事实行（cap 5 行），fail-open。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- CLI：flow done 新增 flag `--accept-unmapped`（未登记目录软门显式放行；留痕 change-patch.json meta.acceptedUnmappedDirs）。
- local.yaml 新增可选键 `module_gate_ignore: a, b, c`（逗号分隔目录前缀；readFlowConfig 解析为 moduleGateIgnore 数组，缺省 []）。YAML 列表块形态不支持，只认单行逗号串。
- change-patch.json meta 新增可选键 acceptedUnmappedDirs（数字，--accept-unmapped 放行时在场）。
- 模块卡/变更索引 sidecar：flow done distill 追加一行变更条目（既有格式契约内，无新格式）。
- 内部签名：flow-parity.js 新增 evaluateModuleGate / appendChangeIndexEntries / renderThinDocsDebt 三个导出；runArchiveChain 与 archiveNarrowedGitAdd 新增可选参数 extraDocs（缺省 null 零行为变化）；cmdFlowDone 新增可选参数 acceptUnmapped（缺省 false 零行为变化）；flowKnowledgeDigest 输出 lines 追加欠账事实行（summary 不新增键）。
- flow start 输出面：注入段可能多一行「📚 模块卡欠账」块（空债零输出）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。门与回写都消费 done 时点单次计算的事实（ownFiles 冻结面 × 当刻模块图），乱序迟到的并行提交属下一变更的 done，各自时点口径，不串。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

门只读（模块图/冻结面），无并发写面。回写目标（卡/sidecar）是行级追加——多并行变更同时命中同模块时整文件读改写竞态窗口为毫秒级，最坏形态是后写者覆盖先写者的行，断点续跑幂等去重（变更名在场即跳过）保证不双写。归档窄化 add 用文件级 pathspec，不扫并行会话文件。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。门失败在 mark('patch') 之前——重入 done 从 patch 断点续，模块图登记后重算 moduleScope 门自然通过；--accept-unmapped 只在本轮生效（不留 flow-state，下次 done 若仍有缺口需再带）。回写在 mark('distill') 之前失败→重入重算，幂等去重兜底；distill 已 done 后归档失败→重入跳过 distill，extraDocs 从 change-patch.json 回读重算，归档照常入暂存。三档 fail-open 于注入与回写、fail-closed 于门——门是唯一新增阻断点且有显式逃生口。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。三档都锚 specBase（多项目经 collectModuleMaps 遍历 docs/<project>/modules/_module-map.yaml），worktree 场景门读主仓模块图（与 reconcileModuleDocs 同源，cwd 传主仓根）；平台模式（specBase 在仓外）computeDocsDebt 的 git 锚失败走既有「从未提交/欠账不可得」降级路径，不出假账。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：门的误报面——存量仓里合法未登记目录多（根级脚本、配置目录），首轮 done 会频繁撞门。缓解：module_gate_ignore 一次性配置 + --accept-unmapped 签收不丢数据（缺口数留痕），遥测可见放行频率，可据此再调默认。次风险：回写的格式自适应误判（卡内混合形态）——只动「## 变更索引」节内/ sidecar 尾部，节外逐字保留，与 splitChangelog 同款行级防线。

已知边界（评审 P3 披露）：共享主仓并行会话在基线之后对同文件（src/flow.js）的提交 hunk 会混入 change.patch 冻结面——冻结 diff 是文件级（baseRef..HEAD × 文件清单），无法做 hunk 级归属切分（未提交面的归属收窄已由 quick --files 声明机制处理，提交面共享文件是残留盲区）。审计以显式 pathspec 提交清单为准。断点续跑路径（distill 已 done 后归档失败重入）的 extraDocs 由 deriveRecordedChangeIndexTargets 从卡/sidecar 反查含变更名的目标文件（幂等事实），不依赖目录级回退兜底。

放弃方案①：给 docTouched=false（命中模块但卡未更新）也上门——放弃：源码活跃≠卡错，代理信号不配阈值（docs-gate 既有裁决，误报训练忽略报警），维持 advisory。
放弃方案②：自动改写模块卡语义段（CLI 生成契约摘要）——放弃：语义解释含 LLM 判断增量，与「CLI 算事实、agent/人写语义」的分工冲突；机械动作只碰变更索引表格。
放弃方案③：module-map 登记也走棘轮基线（docs gate 同款）——放弃：棘轮适合「存量治理、拦增量」的计数面；登记是逐变更直接信号（文件在、图没认），无需基线间接层。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-parity.js | 新增 evaluateModuleGate / appendChangeIndexEntries / renderThinDocsDebt 纯函数与半纯函数 |
| 修改 | src/flow.js | readFlowConfig 增 moduleGateIgnore；cmdFlowDone 门接线+acceptUnmapped+meta 留痕+回写接线+extraDocs 透传；flowKnowledgeDigest 欠账注入；flag 解析 |
| 修改 | src/run/complete-handlers.js | runArchiveChain/archiveNarrowedGitAdd 增可选 extraDocs 精确入暂存通道 |
| 新增 | test/thin-module-gate-and-feed.test.mjs | 三档 e2e/单元覆盖 |
