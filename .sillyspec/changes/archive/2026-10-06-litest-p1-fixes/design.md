---
author: flow-machine-draft
created_at: 2026-10-05T17:20:04.275Z
---
# 设计记录（Design Record）— 2026-10-06-litest-p1-fixes

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

轻量变更实测（2026-10-06-agent-log-detect-hint）暴露的四个 P1 缺口，各取最小修法：① 文档行号漂移——platform-interface-map.md 13+1 处锚（complete-handlers 锚因本变更自身插码二次漂移，终态 2681）逐条对照源码 grep 更新，不做裸名→全路径形态改写（多候选机制可命中，最小 diff）；② 日常拦截缺口——doc-ref-check.test.mjs（~100ms 快测）追加进 test:core 清单尾部；③ 评审误伤——PRIMITIVE_RE 的 `\bcursor\b` 收窄为 `\.cursor\(|\bnext_cursor\b`：本仓 cursor 是 harness 名（grep 实证纯名词/赋值/字段形态均有既有命中，赋值形态收窄仍误伤），只有 DB-API 方法调用与分页协议词是真实游标物证且本仓零出现；④ 归档提交拆半——收尾聚合暂存面打印一笔到位命令，聚合用 `--name-status`（R 行两路径，--name-only 折叠丢源侧——这是本变更实现期自己踩到并修正的点）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- flow-review.js：PRIMITIVE_RE 常量内部收窄（模块未导出该常量，无签名变化）；行为变化=patch 含 cursor 纯名词不再触发原语评审、db.cursor()/next_cursor 仍触发。
- complete-handlers.js 归档收尾：新增输出行（一笔到位 commit 命令提示，advisory 不阻断）；无函数签名变化。
- package.json：scripts.test:core 追加 test/doc-ref-check.test.mjs。
- platform-interface-map.md：14 处行号锚更新，无内容改写。
- 测试：flow-review.test.mjs 增 cursor 两向用例；archive-cli-git-add.test.mjs Case 1 增命令提示两断言。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：三项代码改动均为调用时无状态判定——PRIMITIVE_RE 是正则常量；归档提示读一次性 git diff --cached 快照；doc-ref-check/test:core 是静态配置与只读校验，均无事件序列假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

归档提示读取 git diff --cached 时若并行会话正在暂存，快照可能含他侧条目——提示行前缀过滤（本变更目录/knowledge/docs 四前缀）已将夹带面收窄到归档语义路径，且输出只是 advisory 提示、明确要求 agent 核对后执行；命令由人/agent 按核对执行，不自动 commit。PRIMITIVE_RE 与 test:core 无共享态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：提示打印失败走 catch 静默（advisory 不阻断归档）；归档幂等重入时暂存区为空 → mineStaged 空 → 不打印，无半态残留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

归档提示的 cwd 是归档执行目录（change 归属仓），git diff --cached 是仓级暂存区；并行变更的归档面因前缀按 changeName 过滤不串台（与既有 minePaths 探测同口径）。PRIMITIVE_RE 是 CLI 全局常量，与仓无关。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：① cursor 收窄漏报——若未来代码引入非 db.cursor() 形态的真游标（如 cursor.execute 独立出现），RE 不命中。权衡：该形态必先有 conn.cursor() 创建点（Python DB-API 惯例），`.cursor(` 已锚定；next_cursor 覆盖主流分页协议。漏报面远小于原误报面（本仓每个提及 cursor harness 的 patch 都误触发）。② 行号锚会随源码演进再漂移——这是 doc-ref-check 机制的设计预期（漂移即红），test:core 纳入后漂移在日常工作流被拦，不再是沉积债。
试过放弃：cursor 收窄为「赋值/字段形态 `\bcursor\b\s*[=:]`」——grep 实证本仓 docs-check.js/quicklog.js/init.js 有 8+ 处循环变量 `cursor =` 命中，误伤面仍大，放弃；归档聚合用 `--name-only`——实现期测试即暴露 rename 折叠丢源侧路径（部分提交语义下源文件不会被删），改 `--name-status`。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | docs/sillyspec/platform-interface-map.md | 14 处行号锚更新到当前源码（13 基线 + 1 本变更自漂移） |
| 修改 | package.json | test:core 追加 test/doc-ref-check.test.mjs |
| 修改 | src/flow-review.js | PRIMITIVE_RE cursor 收窄为用法形态 |
| 修改 | src/run/complete-handlers.js | 归档收尾打印一笔到位 commit 命令（--name-status 聚合 rename 两侧） |
| 修改 | test/flow-review.test.mjs | cursor 收窄两向回归用例 |
| 修改 | test/archive-cli-git-add.test.mjs | Case 1 增命令提示断言（命令存在 + pathspec 两侧齐备） |
