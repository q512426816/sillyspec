---
author: flow-machine-draft
created_at: 2026-10-08T01:03:04.661Z
---
# 设计记录（Design Record）— 2026-10-08-thin-done-dirty-gate-and-paren-attribution

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两个坑同一收尾链（记录：multi-agent-platform docs/sillyspec/thin-done-src-commit-order-and-attribution-paren.md）。坑二（归属只认半角括号）在单一真相源修：`parseChangeNamesFromSubject`（foreign-declared.js）正则改双括号收——`[（(]…[)）]` 开闭各自半/全角任意组合，括号内允许 `thin ` 前缀与名字后附注（`（thin <名>；quick）` 实测形态），变更名本体模式不放宽；buildCommitAttribution / detectPatchDrift / filterCommittedFace / splitOwnVsForeignDiffFiles 全部经此单点自动受益，零各自实现。

坑一（dirty 缺口静默归档）在 flow done 的 patch 子步加阻断门：dirtyWarned>0 且未显式处置（--freeze-dirty / 新增 --accept-dirty-gap）时 `reportMidFail('patch')` + exit 1——patch 子步不标 done，半态可重入；用户处置（提交 / --freeze-dirty / --accept-dirty-gap）后重跑，从断点续。这把「三选一」从不可达的事后选项变成收口前的强制选择，且复用既有子步断点机制（review 中断同款），零新状态机。--accept-dirty-gap 走 change-patch.json 增量键 acceptedDirtyGap 留痕（审计面可见，非只 console）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `parseChangeNamesFromSubject(subject)`：签名不变，匹配面放宽（全角/混合括号、thin 前缀、名字后附注）；既有半角匹配零回退（locked 用例钉住）。
- `cmdFlowDone` 新参数 `acceptDirtyGap = false`（CLI flag `--accept-dirty-gap`，:2070 hasFlag 解析处同款接线）；`--freeze-dirty` 行为零变化。
- flow done 行为变化（本变更目的）：dirtyWarned>0 无显式处置 → exit 1 停在 patch 子步（原先警告后继续归档）；exit 码语义与 review 中断同款（非零=半态可重入）。
- change-patch.json 增量键 `acceptedDirtyGap: <N>`（仅 --accept-dirty-gap 且有缺口时落）。
- 其余命令/模块零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立：门读的是收口时点的盘面事实（collectFreezeFiles 的 dirtyWarned），无跨事件状态；阻断不写任何冻结件（停在写之前），重跑看到的是最新盘面——迟到的提交在重跑时自然并入，不产生先后序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   门本身只读+exit；flow-state 子步标记写走既有 writeFlowState 路径（与 review 中断同款并发面，无新增）。多会话各自 change 隔离；dirtyWarned 的归属切分（splitOwnVsForeignDiffFiles）在共享主仓下已排除他侧声明文件——他会的 dirty 不会误触本变更的门。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   阻断点在 patch 子步标记 done 之前：中断/切换后重跑走全量冻结路径（非漂移路径），幂等重建；--accept-dirty-gap 是单次 flag 不落 state（重跑不带 flag 且仍有缺口会再次阻断——显式性保持，不会一次接受永久放行）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   门按 change 的 freeze 面判定；正则放宽只影响「提交信息里含日期前缀变更名」的归属解析，跨仓各仓独立跑各自的 git log。潜在误归属面：消息正文引用他变更名（如 "(参见 2026-09-01-x)"）本就属既有语义（半角同形），全角放宽不新增风险等级。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：阻断门改变既有收口习惯——依赖「警告后继续」的自动化/脚本会开始拿到 exit 1。缓解：exit 语义=半态可重入（与 review 中断一致，CLI 文化内既有形态）；--accept-dirty-gap 一 flag 恢复旧行为且留痕；flow-protocol ⑥b 同步更新锁定新语义。放弃的方案：① 归档态 `flow done --refreeze` 重入口——治存量不治源头，且对终态归档件开重写面（review/快照/sha 锚一致性要另设计），阻断门落地后坏状态不再产生，存量用已验证的协议重入修法，留档后续可选；② dirty 警告时自动 --freeze-dirty——把「无法归属」静默升级成「全归属」，跨变更审计双计风险（他侧在途文件误入冻），违背归属保守原则；③ 提交信息解析支持任意前缀文本（不限 thin）——误匹配面扩大无实测形态支撑，收窄为 thin 前缀 + 附注。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/foreign-declared.js | parseChangeNamesFromSubject 双括号收 + thin 前缀/附注兼容（单点修复） |
| 修改 | src/flow-parity.js | collectFreezeFiles dirty 采集加 --untracked-files=all（全新目录折叠 `dir/` token 致 --freeze-dirty 漏采目录内交付的实证修复，dg-freeze 夹具即回归钉） |
| 修改 | src/flow.js | patch 子步 dirty 阻断门（reportMidFail+exit 1）+ --accept-dirty-gap 参数与 acceptedDirtyGap 留痕（flag 解析在 flow.js cmdFlow :2070 hasFlag 处，index.js 零改动） |
| 新增 | test/thin-done-dirty-gate.test.mjs | drift 全角单测 + 门三态 e2e + 阻断→提交→重跑 e2e |
| 修改 | test/commit-attribution-split.test.mjs | 解析形态增量断言（全角/混合/thin 前缀/附注） |
| 修改 | test/flow-protocol.test.mjs | ⑥b wip-dirty 按新门语义（首次阻断 + --accept-dirty-gap 完成），冻结面断言保留 |
| 修改 | src/verify-postcheck.js | buildDepsBatches 套件编排器过滤（run-tests.mjs 剔出执行面转 loud skip 批；既有底部导出供直测）——收口实测门自埋雷排除：FR 绑定指向套件入口时递归全量假败 |
