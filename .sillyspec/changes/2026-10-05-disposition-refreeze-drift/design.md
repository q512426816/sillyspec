---
author: flow-machine-draft
created_at: 2026-10-05T13:20:44.274Z
---
# 设计记录（Design Record）— 2026-10-05-disposition-refreeze-drift

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

处置重入审计错位（主清单 P1）：评审发现处置涉及代码修改后重跑 flow done，patch 子步幂等跳过让 change.patch/review.json 停在处置前时点（2026-10-05-review-promise-negation 先例 905397ef；2026-10-05-flowdone-lintfail-output 收编活体复现——处置提交后不带 --refreeze 重跑则归档件缺处置面）。修法两层：① flow-parity.js 新增 detectPatchDrift——以 change-patch.json.head（冻结锚，既有字段零迁移）..HEAD 窗口内「本变更名后缀提交」为漂移判据（parseChangeNamesFromSubject 既成事实口径，与 filterCommittedFace 同源；他侧后缀/裸提交不触发，检测失败按无漂移 fail-safe 退现状行为）；② flow.js patch 跳过分支前置漂移检测——漂移即输出审计时点漂移警告、自动重冻结（落回既有冻结体，等价 --refreeze 免手动）、review.json 在场则隔离为 .superseded 留档、review 子步标记重置（盘写+内存快照同步——本函数后续子步判内存 st，只写盘不生效）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

flow-parity.js 新增导出 detectPatchDrift({cwd, change, freezeHead}) → {drifted, ownCommits, head}。flow done 行为变化：patch 已冻结且冻结锚..HEAD 有本变更后缀提交时，重跑自动重冻结 + review.json 改名 review.json.superseded-<时间戳> 留档（评审处置 P3：时间戳槽位防跨代覆盖）+ review 重新定档（重评任务书再现）；隔离失败时整体退回现状幂等跳过（fail-safe——漂移处理要么完整交付要么不动，指引人工处置）。无漂移（锚==HEAD/仅他侧或裸提交/锚缺失）时幂等跳过行为与现状逐字一致。change-patch.json 格式零变化（head 字段既有）。CLI 参数面无变化（--refreeze 人工口保留）。未测边界披露（评审 P3）：隔离失败退回路径与「隔离成功+盘写失败」双故障残留（下轮 backfill 按 exempt 误读）需 I/O 故障注入方可锁定，本变更为注释与边界披露不作注入重构。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——漂移判据是冻结锚..HEAD 的提交事实窗口（既成提交不可变），检测在 flow done 进程内单次同步执行；窗口内有本变更提交即漂移，与到达顺序无关。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   flow done 本会话串行；review.json 改名 renameSync 同目录原子。并发他侧提交落在窗口内但无本变更后缀 → 不触发（归属切分正确处理）；检测读 git 的瞬间快照即判据，无跨进程竞态面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——重冻结与隔离都在同一 flow done 运行内先于 review/archive 子步完成；中断重跑幂等（重冻结重复执行结果一致；隔离槽位带时间戳，多轮处置各占各槽不互踩，隔离失败则本轮整体退回现状幂等跳过——fail-safe 要么完整交付要么不动）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：漂移判据锚定本变更名（提交后缀字面等值），change-patch.json/changeDir 各变更目录各自隔离；detectPatchDrift 的 git 查询锚调用方 cwd，不读跨仓数据。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：治理件后补提交（如评审任务书后 agent 修改 design.md 并提交）也带本变更后缀 → 触发重冻结+重评——多一次评审循环的成本换审计面始终对齐最新提交事实，方向正确但循环可能多一轮；重评后无新提交即不再触发，无死循环面（判据窗口每轮前移）。放弃的方案：① 只警告不自动重冻结（弱形态）——警告会被忽略，归档件仍停在旧时点，治标不治本；② 按 review.json 的 reviewedAt 时间戳对比提交时间——时钟不可比（本地钟漂移），且 review.json 可手写，锚点不可靠；head 锚是 git 自身事实。均已弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-parity.js | 新增 export detectPatchDrift（冻结锚窗口本变更后缀提交检测） |
| 修改 | src/flow.js | patch 跳过分支前置漂移检测：警告+自动重冻结+review.json 隔离+review 标记重置（盘+内存） |
| 新增 | test/flowdone-disposition-drift.test.mjs | 归属三形态单测 + 处置重入 e2e（漂移警告/重冻结/隔离/任务书再现） |
