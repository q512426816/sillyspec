---
author: flow-machine-draft
created_at: 2026-10-23T15:19:42.030Z
---
# 设计记录（Design Record）— 2026-10-23-flow-done-shared-repo-multi-session-frictions

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

flow done 归档子步此前只打印提交命令——共享仓多会话/后台同步会在「打印→执行」窗口瞬改暂存区，命令没人执行或被并行会话抢跑时呈「归档目录全 staged + flow done 报成功」半态，下一次 pull/清理即丢归档（当日实证）。本变更在打印前增加落库判定：新增纯函数 `archiveLandedInHeadTree`（HEAD 树 ls-tree 喂入，判 `.sillyspec/changes/archive/` 下本变更目录首段，含 `-<name>` 历史形态兼容），未落库把提示升级为 stderr 🚨 + 幂等可执行命令 + 后果说明；已落库保持 stdout 原语义。配套回归用例与 platform-interface-map 行号同步。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/run/complete-handlers.js`：新增导出 `archiveLandedInHeadTree({ headTreeFiles, changeName })`（纯函数）；`runArchiveChain` 归档提交提示段按落地态分流 stderr/stdout。CLI 命令面无签名变化。
- `test/archive-commit-suggest-race.test.mjs`：新增三态判定用例与真链两态用例。
- `docs/sillyspec/platform-interface-map.md`：`complete-handlers.js` 行号引用随实现增行同步。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 判定以「打印时点的 HEAD 树快照」为准，打印→执行窗口的并发改动由提示文案自带「重核暂存面」指引兜底；判定本身只在快照内计算，无时序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 提示是只读面；真正提交仍由 agent/用户执行且 pathspec 限定本变更面。两会话同时归档不同变更时，各自的 HEAD 树判定独立成立；同变更并发归档由既有主仓锁与所有权护栏拦。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 判定失败不改变任何状态（不 mv、不 add、不 commit），归档目录留在原地可重入；🚨 后果说明告知不执行的丢失路径。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 判定锚定当前 cwd 的 HEAD 树与本变更目录名；跨仓归档件在各自仓的归档链处理，不进本判定。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：误报——HEAD 树已含归档却判未落库，重复提示噪音。缓解：目录首段精确匹配 + `-<name>` 后缀兼容形态入测试锚。
- 死路 1：让 CLI 直接代执行归档提交——共享暂存区多会话下自动 git commit 是历史重灾区（AGENTS 提交纪律），打印 + 升级提示留给确认权在人。
- 死路 2：改用 exit 1 硬拦未落库——幂等重入路径上「已打印待执行」是合法中间态，硬拦会打断断点续；stderr 升级 + 后果说明是披露不是阻断。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | `src/run/complete-handlers.js` | `archiveLandedInHeadTree` 纯函数 + 归档提交提示落地态分流 |
| 修改 | `test/archive-commit-suggest-race.test.mjs` | 三态判定 + 真链两态用例 |
| 修改 | `docs/sillyspec/platform-interface-map.md` | complete-handlers 行号引用同步 |
