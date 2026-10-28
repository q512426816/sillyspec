---
author: flow-machine-draft
created_at: 2026-10-28T06:03:11.596Z
---
# 设计记录（Design Record）— 2026-10-28-overlap-route

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

同 target-file 并行的冲突处理，落地侧机器已经厚实（worktree apply 的 `apply --3way` 三方合并、`main-repo.lock` 全仓串行锁、guard 相交预检三态、base 漂移 re-anchor）——缺的是**事前信号**：干活期没有任何面检测「两个活跃变更声明了同一文件」，重叠拖到落地才撞见，错失把后到者分流进 worktree 的窗口。本变更补这一段：新模块 `src/overlap-detect.js` 用声明加载单一源（foreign-declared.js 的 `loadOwnDeclaredSet` 补导出复用——design §6 清单 ∪ task 卡 allowed_paths/target_files）构建文件→变更集反查表，≥2 变更声明的文件即重叠；消费面三个：`detectDeclaredOverlaps` API、`sillyspec overlap` 仓级查询动词（含分流与落地序列指引文案）、`flow verify-drafts` 通过分支的 advisory 钩子（当前变更与他人相交时一行路由提示）。

选反查表而非两两配对：N 变更 N×N 对比退化成 O(总声明数) 的 map 构建，且天然给出「文件 ← 变更集」的呈现形态；own 声明集的加载逻辑不重写（单一源防口径漂移——quick guard 形态/解析失败空集等行为与既有 oracle 一致）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/foreign-declared.js`：`loadOwnDeclaredSet` 补 `export`（函数体零改动，纯可见性）。
- 新模块 `src/overlap-detect.js` 导出 `detectDeclaredOverlaps({cwd, specBase})` → `Array<{file: string, changes: string[]}>`（file 正斜杠归一、changes 排序、按 file 排序）。
- 新 CLI 动词：`sillyspec overlap`（无参，仓级查询，恒 exit 0）。
- `src/flow.js` cmdFlowVerifyDrafts：人类渲染通过分支追加重叠 advisory（fail-open 静默；--json 分支不加字段——json 消费者按判定面契约零变化）。
- 无既有函数签名变更；无文件格式变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

  成立——重叠检测是瞬时快照（每次调用重建反查表），不依赖事件顺序；变更中途补声明后下一次查询自然反映（verify-drafts 每次重跑重查）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

  只读查询无共享写面；与并行的 design.md 写入竞态时读到旧半态最多漏报一次（advisory 面可接受，下一次查询收敛），loadOwnDeclaredSet 内部已有 try/catch 空集兜底。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

  安全——零持久状态（无缓存无落盘）；变更归档（目录移入 archive/）后自动退出反查表，无需清理。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

  不会——枚举与加载都锚定传入 specBase（各仓各自 .sillyspec）；worktree 会话的 spec 读写本就锚回主仓（specDriftAnchor 既有口径），重叠判定与 worktree 形态不冲突（worktree 里的变更声明照常参与，正是分流协议想要的视野）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是声明源噪声：未归档旧变更的陈旧 design 声明会喂活假重叠（既有坑 baseline-overlay-cross-change-contamination 同源现象）——advisory 定位容忍（提示而非阻断），文案里给「确认对方变更已死可归档后消音」出口；若实测噪声大，后续可加活跃度过滤（DB last_active 阈值），本版不做（先看真实使用密度）。

放弃的方案：① 重叠检测做成批准门硬阻断——把「路由建议」升格为「禁行」，违反「不是禁止是分流」的设计意图，且陈旧声明会制造假禁行；② 用 collectForeignDeclaredFiles 逐变更查他侧声明——N 次全量扫描 + own-priority 语义（双方声明归 own）恰好把重叠面藏掉，方向相反；③ 落地序列新做调度器——既有 main-repo.lock + apply --3way + guard 预检已覆盖序列与合并，重做是重复建设，本变更只在指引文案里把既有机器串成协议叙事。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | src/overlap-detect.js | detectDeclaredOverlaps：活跃变更枚举 + 声明反查表 + ≥2 检出 |
| 修改 | src/foreign-declared.js | loadOwnDeclaredSet 补 export（函数体零改动） |
| 修改 | src/index.js | 注册 sillyspec overlap 动词 + 用法行 + topCommands |
| 修改 | src/flow.js | cmdFlowVerifyDrafts 人类渲染通过分支追加重叠路由 advisory（fail-open） |
| 新增 | test/overlap-detect.test.mjs | 检出/归档退出/动词/verify-drafts 钩子/零回归用例 |
