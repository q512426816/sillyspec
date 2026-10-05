---
author: flow-machine-draft
created_at: 2026-10-05T12:03:05.695Z
---
# 设计记录（Design Record）— 2026-10-05-review-declared-unstamped-gate

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

门控收口在 collectReviewDeclaredFiles（src/worktree-apply.js）内：resolveLatestExecuteRunIdWithTasks 返回 runId 后补一道归属戳校验（readExecuteRunChangeStamp(runtimeRoot, runId) !== changeName 即返回空 Map）。review.json changedFiles 是 reviewer 对该 run 实际改动的经验证陈述（verifyReviewGitEvidence 曾对真实 diff 交叉核验），信任不跨 run 迁移——无戳 run 无法证明归属本变更，挂其声明只会产误导性「越权声明」误报（实证：14 个无关历史文件）。不改 resolver 本体：其无主回退服务 task-done 写回定位等 marker 漂移恢复场景，语义另有锁定——门控只在声明收集口收紧，消费面单一、爆炸半径最小。D-003 相交过滤（不相交剔除出放行面）保持不变——本变更是把误挂消灭在收集源头，让「review 声明了越权文件」报告行只在真有本变更 review 声明越权时出现。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

collectReviewDeclaredFiles(projectRoot, changeName, opts) 返回语义收窄：resolver 回退拿到的无戳 run（戳缺失或戳≠changeName）返回空 Map（原行为：挂该 run 全部 review changedFiles）；戳等值命中时行为不变。task-review.js 的 readExecuteRunChangeStamp 加 export（函数体零改动）——新增导出面供 worktree-apply.js 消费（该方向 import 既有，无环）。resolveLatestExecuteRunIdWithTasks 及其全部其他消费方（task-done/cross-repo-reconcile）语义零变化。CLI 层无签名变化；apply 预检输出：无关历史声明的「review 声明了越权文件」warning 消失，真实越权声明 warning 不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——门控是单次同步读（戳文件读一次即判定），无累积状态；戳文件在 run 创建时一次性写入，run 归属不随时间漂移，迟到到达的 review.json 只影响已空门控的收集量（无戳恒空）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   归属戳是 run 创建时原子写定、此后只读的事实文件（无重写路径）；读到半写戳时 readExecuteRunChangeStamp 既有 catch 返 null → 按无戳门控为空——fail 方向是少收集声明（收紧 apply），不是误放行。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——门控无状态不落盘；本变更 run 真丢戳的恢复场景下声明面为空只是收紧（apply violations 报清单，补 design 清单/任务卡 allowed_paths 后重跑即过），不产生半态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：门控判的是「run 戳 == 本变更名」的等值事实，runtimeRoot 由调用方解析（平台模式指针/本地），跨仓切片（review.repo）逻辑在门控之后原样执行，多实例各自读各自 execute-runs。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：本变更的 run 在极端场景（戳文件被误删/worktree cleanup 先清了 run 戳）真丢戳——声明面静默为空，apply 对 review 声明过的越界文件改报「不在 design 清单」violation，出路从「review 声明自动放行」变成「补 design 声明」——收紧方向可恢复（fail-closed），且该场景本身意味着 run 元数据已损坏，静默信任其声明才是风险面。放弃的方案：① 改 resolver 语义（无戳回退整体删除）——影响 task-done/cross-repo-reconcile 等全部消费方的 marker 漂移恢复路径，锁定面外；② 只改 warning 文案区分无戳来源——保留误挂数据只软化措辞，治标不治本。均已弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/worktree-apply.js | collectReviewDeclaredFiles 补归属戳门控：无戳/戳不等值 run 返回空 Map |
| 修改 | src/task-review.js | readExecuteRunChangeStamp 加 export（函数体零改动） |
| 新增 | test/review-declared-unstamped-gate.test.mjs | 无戳空声明/带戳等值收集/带戳他变更+无戳并存三形态单测 |
