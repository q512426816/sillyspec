---
author: flow-machine-draft
created_at: 2026-11-09T06:35:00.825Z
---
# 设计记录（Design Record）— 2026-11-09-archive-landing-visibility

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

生产实证（multi-agent-platform 仓 2026-11-09 三变更）：flow done 归档子步把「未落库 🚨 警告」打在输出中段，最后一行是「✅ flow done 完成」——尾部消费（agent tail / 人扫一眼）得到假成功，归档件滞留共享暂存区（并行 index 手术曾丢提交）。归档提交由 agent 手工执行是既有设计（共享仓竞态 + pre-commit hook 纪律，complete-handlers.js 注释论证），本变更不动它，补两处：

- **终态可见性**：flow.js 在终态成功行打印时独立重算落库状态（git ls-tree HEAD + archiveLandedInHeadTree），新增导出纯函数 `renderArchiveLandingEpilogue`（complete-handlers.js，落库→单行确认 / 未落库→🚨 尾块含 resolveArchiveCommitPathspecs 构成的幂等命令）作为输出最后内容；exit code 保持 0。
- **doctor 兜底**：doctor-diagnostics.js 新增只读检查项 `detectArchiveCommitResidue`——暂存区条目（src/dst 任一侧）落在 changes/<名>/ 或 changes/archive/<名>/ 且该名未落 HEAD → WARNING + safe_actions 修复命令；干净 PASSED、非仓 skipped。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- complete-handlers.js：新增导出 `renderArchiveLandingEpilogue({ landed, commitCommand })` → string（渲染纯函数，flow.js 消费）；既有 runArchiveChain 中段 🚨 行为保留不动（双保险）。
- flow.js：终态「✅ flow done 完成」行后调用重算 + 渲染并打印（归档子步 skip 的断点续跑轮同样生效）；退出码与子步判定零改动。
- doctor-diagnostics.js：新增导出 `detectArchiveCommitResidue(cwd)`（形状对齐既有 detect* 项），挂入 runDoctorDiagnostics dimensions 数组；doctor 输出多一个维度，JSON schema 形状不变（同 checks 结构）。
- 归档提交执行主体、命令构成、补暂存逻辑：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。终态重算在打印瞬间独立执行（不消费归档子步的中间变量），暂存区在「重算→打印」窗口被并行改写最坏导致状态瞬时失真（把已落库误报未落库或反之）——前者 agent 执行幂等命令无害（git 拒绝空提交或路径不匹配即发现），后者下一次 doctor 残留检查兜底。doctor 检查同理（只读快照语义）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   两处均为只读 git 查询（diff --cached / ls-tree），无写面；与并行会话的 add/commit 交错只影响读取快照新鲜度，不影响其正确性判定（按读取时刻判定）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。渲染是纯函数无副作用；doctor 检查只读；flow done 中断重跑（断点续）时终态重算幂等——已落库则只打确认行。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。两处都以 cwd 的 git 仓为界；doctor 检查按条目路径中的变更名归属，多变更残留各自点名（含他人半归档残留——正好补上 complete-handlers 里 othersResidual 只在归档时可见的缺口）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：终态重算的瞬时快照在共享仓高频竞争下偶发误报（把刚被并行会话提交完的态报成未落库）——误报面是「多打一个 🚨 尾块 + 一条幂等命令」，agent 执行时 git 自身会拒绝（nothing to commit / pathspec 不匹配），无害；漏报面由 doctor 残留检查兜底。

放弃的方案：A) 工具自动执行归档提交（含自动重试）——共享仓竞态下命令本身会 pathspec mismatch，pre-commit hook 失败工具无法自修（格式化），且违反「提交由 agent 显式 pathspec 掌握」的多会话纪律（本变更的动因分析已推翻该方向）；B) 未落库时 flow done exit≠0——exit≠0 已被 fail-closed 测试门占用（CLI 亲测失败=整单 FAIL），归档交接是设计内状态而非收口失败，混用会让上层自动化误判重跑整个收口。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/run/complete-handlers.js | 新增导出 renderArchiveLandingEpilogue（渲染纯函数） |
| 修改 | src/flow.js | 终态成功行后重算落库状态并打印尾块（含断点续跑轮） |
| 修改 | src/doctor-diagnostics.js | 新增 detectArchiveCommitResidue + 挂入 dimensions |
| 新增 | test/archive-landing-epilogue.test.mjs | FR-01 渲染两态 + FR-02 检查三态 |
