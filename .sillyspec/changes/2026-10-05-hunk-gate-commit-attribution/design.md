---
author: flow-machine-draft
created_at: 2026-10-05T15:02:23.631Z
---
# 设计记录（Design Record）— 2026-10-05-hunk-gate-commit-attribution

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

收口在 runHunkAttributionGate（src/hunk-attribution.js）的未归因判定：对声明面外的交付文件补提交事实归属切分——commitAttributionForChange(cwd, specBase, changeName, baselineCommit)+isForeignByCommit（与 patch 冻结 filterCommittedFace 完全同源同参数），窗口内全部提交均属他侧变更名的文件从「未归因」改判「他侧归因（提交事实）」新类（ℹ️ 信息行、不参与 ok 阻断面），裸提交/本变更名提交触碰的文件保持未归因原口径（isForeignByCommit 的 unknown/own 守卫天然覆盖）。根因：collectForeignDeclarations 只扫活跃变更声明面（排 archive/），归档他侧交付落窗口时误报（F-4 实证：已归档 546720ea 交付被指引为「在途交付须 pathspec 隔离」）。渲染汇总行加第三计数，清零行条件不含他侧归因（该类即归属清晰）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

runHunkAttributionGate 返回对象新增 foreignByCommit 数组（{file, owners[]}）；unattributed 语义收窄（他侧提交事实文件移出）；ok 计算不变（=unattributed×0 且 contended×0）——他侧归因文件不再影响 ok（含 gate=error 档阻断）。renderHunkAttributionLines 汇总行加「他侧归因（提交事实）N」计数与 ℹ️ 信息行。CLI 无参数面变化；patch 冻结/probes 接线零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——切分输入是 baseline..HEAD 的既成提交事实（不可变窗口），判定单次同步执行；窗口内新提交只会让下轮判定更新，无累积序依赖。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   判定纯只读（git log/声明面文件读取）；并发提交落在窗口内按下轮快照判——与他侧/裸提交同径处理，无竞态写面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——判定无状态不落盘；切分失败（null）即整体退原口径全量未归因，中断重跑幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：commitAttributionForChange 锚调用方 cwd 与显式 baselineCommit（与 patch 冻结同参同锚），不读跨仓数据；他侧变更名取自提交 message 字面后缀，多实例各自窗口各自判。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：提交 message 后缀被伪造（本变更交付冒他侧名）→ 误判他侧归因放过未声明文件——但该伪造同时会骗过 patch 冻结的同一口径（filterCommittedFace 先于此门存在且已裁决：按提交事实归属是已发生的提交事实不是声明抢文件，sentinel-evidence-freeze⑤ 界定），本变更只是让两消费点口径一致，不新增伪造面。放弃的方案：① collectForeignDeclarations 扩扫 archive/ 声明面——用陈旧声明做意图归属正是 sentinel-evidence-freeze⑤ 否决的形态，且 archive 清单庞大性能面差；② 未归因警告文案改软——保留误报数据只软化措辞，治标。均已弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/hunk-attribution.js | 未归因判定补提交事实切分：foreignByCommit 新类（ℹ️ 信息行、不阻 ok）+ 渲染汇总三计数 |
| 新增 | test/hunk-gate-commit-attribution.test.mjs | 他侧改判/裸提交维持/不阻 ok/切分不可得退化四断言组 |
