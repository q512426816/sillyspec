---
author: flow-machine-draft
created_at: 2026-10-06T11:43:21.792Z
---
# 设计记录（Design Record）— 2026-10-06-fr-priority-overlap

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

2026-10-06-fr-regress-cap-drop 给 buildDepsBatches 建了优先面豁免，但 runModuleSubset 传的 priorityFiles=frLinked（与 deps 无重叠的「新增」子集）——与 import 依赖面重叠的绑定文件拿不到优先权仍被帽弃（2026-10-06-resume-title 收口实测：64 绑定弃 14）。修法单点：调用侧优先面改传全量 fr.files（fr 缺失/空数组回退 frLinked 现状零变化）；depsAll 并集去重构造不动（重叠文件只计一次的语义照旧）。runModuleSubset 抽出 export 供直测（buildDepsBatches 同款先例——需真跑 fixture 测试文件，不宜经 runVerifyTestCheck 全链）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `runModuleSubset({cwd, specBase, changeName, hits, knownFailures, changedFiles, frPre})`：新增导出（内部函数变 export，签名零变化）；行为变化单一方向——与 deps 重叠的 FR 绑定文件获得优先权不再被帽弃。
- 披露标签 `deps(js N)` 的 N 由此含重叠绑定文件（此前被算进弃置数）。CLI 命令面、DB schema、文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——纯组卷参数面修改，无时序依赖；fr.files 与 deps 都是调用前完成的快照集。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   无新增写面；组卷纯内存计算，执行批并发语义（超时护栏/known_failures）不变。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   无状态迁移；fr 缺失（索引损坏）走既有 fail-open（frLinked=[]），行为与现状一致，中断无半态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   优先面判定输入（fr.files/deps/changedFiles）由调用方按变更归属收窄，路径归一化口径不变。不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：优先面扩大（全量绑定文件含重叠）进一步放大执行批尺寸——与 fr-regress-cap-drop 已裁决的边界同族（TEST_TIMEOUT_MS 兜底、绑定面是知识库声明面有治理），增量只是重叠子集（本仓实测 14 个），可忽略。放弃的方案：① 在 buildDepsBatches 内部把 priorityFiles 语义改为「并集口径」——调用方语义应显式，函数不该猜调用者意图；② 去重时把 frLinked 换成 fr.files 并顺带删 added 计算——frReport 的 addedCount（新增并入 N）是既有披露口径，动了会漂移控制台文案语义。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/verify-postcheck.js | runModuleSubset 优先面传全量 fr.files + 新增导出 |
| 新增 | test/fr-priority-overlap.test.mjs | FR-01~03 直测（重叠 fixture 真跑 + 无索引现状钉） |
| 修改 | package.json | test:core 清单收录新测试 |
