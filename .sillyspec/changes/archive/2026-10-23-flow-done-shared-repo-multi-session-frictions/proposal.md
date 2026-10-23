---
author: flow-machine-draft
created_at: 2026-10-23T15:19:42.030Z
---
# 提案书（Proposal）— 2026-10-23-flow-done-shared-repo-multi-session-frictions

## 动机

任务原话转写：flow done 归档提交未落库守卫与回归锚

倒推收编（代码已先写好，工作区在途三文件）：flow done 归档子步曾实证「打印提交命令≠落库」半态——共享仓暂存区竞态下命令没人执行/被抢跑，归档目录全 staged 但 HEAD 树无归档路径，pull/清理即丢归档。本变更 = archiveLandedInHeadTree 落库判定（纯函数）+ 归档提交提示按落地态分流（未落库升级 stderr 🚨+幂等可执行命令+后果说明；已落库语义不变）+ 配套回归用例 + platform-interface-map 行号引用同步。今日三个变更收口实战均依赖该守卫工作。成功标准来自已验证达标的行为转写。

成功标准：
- 归档面 staged（A/R）但 HEAD 树无本变更 archive 路径时，提示走 stderr 🚨 并附幂等命令与不执行后果；已落库时走 stdout 语义不变
- archiveLandedInHeadTree 纯函数三态有测试锚（落地/未落地/-changeName 后缀兼容形态）
- 既有 archive-commit-suggest-race 套件绿；doc-ref-check 行号引用绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 归档面 staged（A/R）但 HEAD 树无本变更 archive 路径时，提示走 stderr 🚨 并附幂等命令与不执行后果；已落库时走 stdout 语义不变
2. archiveLandedInHeadTree 纯函数三态有测试锚（落地/未落地/-changeName 后缀兼容形态）
3. 既有 archive-commit-suggest-race 套件绿；doc-ref-check 行号引用绿

## 成功标准（可验证）

1. 归档面 staged（A/R）但 HEAD 树无本变更 archive 路径时，提示走 stderr 🚨 并附幂等命令与不执行后果；已落库时走 stdout 语义不变
2. archiveLandedInHeadTree 纯函数三态有测试锚（落地/未落地/-changeName 后缀兼容形态）
3. 既有 archive-commit-suggest-race 套件绿；doc-ref-check 行号引用绿
