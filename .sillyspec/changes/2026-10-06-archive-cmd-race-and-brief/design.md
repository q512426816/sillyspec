---
author: flow-machine-draft
created_at: 2026-10-06T05:44:41.765Z
---
# 设计记录（Design Record）— 2026-10-06-archive-cmd-race-and-brief

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

缺陷①（归档建议命令竞态）：把 pathspec 构成从「照抄 `git diff --cached --name-status` 单元格」改为「按稳定性分级」——src 侧锚定不可变的 HEAD 树（`git ls-tree -r --name-only HEAD` 在册才入列，rename 的 src 恒在 HEAD、转瞬即逝的 A 条目恒不在，天然滤掉竞态幽灵）；dst 侧收拢为本变更专属归档目录单条 pathspec（目录在场即匹配，逐文件罗列的条目级抖动无感）；knowledge/docs 共享面按「HEAD 在册 ∨ 工作区在场」收，丢弃项显式提示。构成逻辑抽成纯函数 resolveArchiveCommitPathspecs（输入=staged name-status 文本 + HEAD 树清单 + 在场判定函数），runArchiveChain 只喂 git 读数。缺陷②（中断简报陈旧读）：待办计算抽成纯函数 remainingSubstepsAtFail（历史盘上 done ∪ 本轮 doneList − failed），消除对运行头快照 st 的陈旧依赖。选纯函数抽取是因为两处缺陷都是「计算口径」问题，纯函数可被单测直接钉住，不需要驱动重型归档链。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出 resolveArchiveCommitPathspecs({ changeName, stagedNameStatus, headTreeFiles, existsFn })→{ pathspecs, dropped }（src/run/complete-handlers.js，纯函数）与 remainingSubstepsAtFail({ snapshotSubsteps, doneList, failed })（src/flow.js，纯函数）。runArchiveChain 建议块行为变化：命令构成按上述分级；丢弃瞬时条目时多一行 ⚠️ 提示；建议块固定附一行 fallback 指引（pathspec 不匹配时以 git diff --cached --name-only 重核替换）。cmdFlowDone 中断简报「待办」行口径修正（不再列本轮已完成子步）。无命令行参数面变化、无文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

构成函数输入是两个瞬时快照（staged name-status、HEAD 树）+ 在场探测；HEAD 不可变保证 src 侧判定与到达顺序无关；staged 快照的乱序行不影响 Set 语义。成立。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

这正是本变更要加固的场景：兄弟会话在打印→执行窗口改暂存区——src 侧 HEAD 锚不受影响；dst 侧目录 pathspec 只要求目录在场（归档目录本变更专属，无他者写入面）；共享 knowledge 面的残余竞态由丢弃提示 + fallback 指引兜底（无法在打印时消除未来窗口的变更，只能让失败可恢复）。函数自身无写行为。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

两函数均纯计算无副作用；中断简报修正只改读取口径（历史 done 来自盘上 flow-state，本轮 doneList 来自内存），重入幂等——重入时历史 done 已含上轮标记，两种读法收敛同值。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

pathspec 过滤前缀仍以本变更名收窄（changes/<名>/、archive/<名>/），knowledge 面沿既有共享整文件惯例；HEAD 树读取锚定当前仓，worktree 场景下 HEAD 即各 worktree 自己的 HEAD，不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：knowledge/docs 共享面仍有残余竞态（打印→执行窗口内新文件被并行移走）——HEAD 锚不适用于「本轮蒸馏新产、HEAD 尚不在册」的 A 条目，只能以在场判定收窄 + fallback 指引兜底；发生概率低（蒸馏产物刚由本链写盘）。试过放弃：① 打印时逐条目 `git ls-files` 校验——校验的是同一瞬态 index，幽灵当场在册照样通过，治标不治本；② 建议裸 `git commit`（无 pathspec）——违反 AGENTS.md 规则 11（共享暂存区会卷入他会话条目），且把「执行时暂存区又变」的窗口风险放大成全量面。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/run/complete-handlers.js | 建议块重构：新增导出纯函数 resolveArchiveCommitPathspecs，runArchiveChain 按 HEAD 锚/目录 dst/共享面在场三级构成命令 + 丢弃提示 + fallback 指引 |
| 修改 | src/flow.js | 新增导出纯函数 remainingSubstepsAtFail；reportMidFail 待办口径修正（历史 done ∪ 本轮 doneList − failed） |
| 新增 | test/archive-commit-suggest-race.test.mjs | 纯函数构成钉 + runArchiveChain 真链两形态（正常执行 exit 0 / 竞态注入丢弃幽灵仍可执行）+ test:core 驻留断言 |
| 新增 | test/flow-done-fail-brief.test.mjs | remainingSubstepsAtFail 口径钉（首轮与重入两形态） |
| 修改 | package.json | test:core 登记两个新测试文件 |
