---
author: flow-machine-draft
created_at: 2026-10-20T01:05:01.366Z
---
# 设计记录（Design Record）— 2026-10-20-known-failures-c-recycle

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

纯配置回收：`.sillyspec/known-failures.yaml` 删除 node:test 家族三类条目（banner/结果行组、fixture token 组、待审计组），保留 D 组与 task-done 同族。选直接删除而非保留观察：坑 verify-gate-worktree-crossrepo-three-defects 缺陷三处置（2026-09-23）本身写明该 C 段为「工具修复后删」的临时豁免——修复（runCrossRepoFullTest 的 TAP 摘要级判定：exit≠0 但输出含 `ℹ fail 0` + `ℹ pass N≥1` 判通过）已随 3.27.13+ 多版发布；且 judgeWithKnownFailures 在 exitCode===0 时直接返回 passed 不扫行（src/verify-postcheck.js:1206），全绿路径本就不消费豁免。被删条目仅剩「真失败（exit≠0 且摘要 fail>0）」场景的行级归因装饰作用，同时其裸子串有吞真失败行的风险（待审计组四条自带此注记）——删除是收紧方向。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

仅 `.sillyspec/known-failures.yaml` 条目面：known_failures 列表从 24 条减至 3 条（评审 F2 清偿：初稿「27 条」误引迁移源计数；实删 21 条=FR-01 枚举面，保留 `^✖ ⑮ 承诺词必评全链`、`[review.json] ❌ failed——已存在但 verdict 不一致`、`[wt-commit] ❌ failed——--pathspec-from-file`）。另 test/verify-postcheck-known-failures.test.mjs:462 的入库清单计数钉从 24 同步为 3（评审 F1 清偿：该套件是清单的直连消费测试，「纯配置非测试面」的初稿前提不成立）。源码零改动；无函数/端点/命令签名变化。行为面变化仅一处：真失败（exit≠0 且无 TAP 摘要覆盖）时行级归因不再豁免这些 fixture 文案——归因账更严（不改变 pass/fail 判定本身，exit 码与 TAP 摘要是判定源）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：纯静态配置清单变更，无事件序参与。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

known-failures.yaml 是本仓配置文件、变更窗口一次性写入；与他侧会话无共享写点（parallel session 不触该文件）。若极端并发覆盖，git 工作区冲突可见可恢复。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：单文件原子编辑，无中间态语义；中断最多留在未保存/未提交态，git 兜底。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

known-failures.yaml 是本仓（sillyspec）私有配置，消费方是本仓 verify 门与跨仓判定（跨仓判定读本清单的既有语义不变，只是条目减少）；不影响他仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：某测试套件 fixture 输出在真失败场景被行级正则计入失败行——但这只影响失败归因展示（哪些行算「失败行」），不影响 pass/fail 判定（exit 码 + TAP 摘要）；且待审计组条目本身注记「裸子串有吞真风险」，删除方向是收紧。放弃的方案：逐条等待「下次命中再锚定或删」——该约定已挂一个月（9-28 迁移至今），TAP 修复发版多轮无人命中，属拖延而非审慎；坑文原始约定就是修复后整段回收。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | .sillyspec/known-failures.yaml | 删 node:test 三组 24 条，保留 3 条（D 组 + task-done 同族） |
