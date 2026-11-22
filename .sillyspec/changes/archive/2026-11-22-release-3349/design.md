---
author: flow-machine-draft
created_at: 2026-11-22T16:59:06.946Z
---
# 设计记录（Design Record）— 2026-11-22-release-3349

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

发版单：package.json version 单字段 bump（3.34.8→3.34.9，patch 最小升级——用户指定），随后 npm publish。发布内容=已推送的 main 现状（词汇通道+优化三单，全部经各自变更实测门），本单零代码变更，故最小流程走完（bump→flow done→提交→推送→publish）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- package.json：version 字段 3.34.8→3.34.9（唯一改动）
- npm registry：sillyspec@3.34.9 新版本+latest dist-tag
- 函数/端点/命令/文件格式（本仓代码面）：无

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。发版基线=已推送的 a83768b3（远端确定性状态），bump 基于其上；若并行会话在 bump 后再合入提交，publish 的内容仍含它们（发布=本地树快照）——版本号语义不受影响，发布说明由 git 历史承载。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   package.json 是共享文件——本单 bump 前后以显式 pathspec 提交；若另一会话同时发版撞版本号，npm publish 会因版本已存在被 registry 拒绝（registry 幂等保护），失败如实报告不重试覆盖。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。bump 是单行文本改动可重入；publish 中断则 registry 状态为准（npm view 复核），未成功即重跑 publish 命令。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。发布以主仓 main 工作区为准（worktree 不参与 publish），npm registry 全局唯一。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：publish 后发现遗漏（如文件面 files 字段漏新文件）——缓解：发布前 `npm pack --dry-run` 抽查包内容面（含新增 src/knowledge-vocab.js）；异常则先 npm deprecate 或下版修复。
- 死路：minor 升级（3.35.0）——放弃：用户明确指定 3.34.9 最小升级；本次变更含新行为（词汇通道注入）但无破坏性接口变化，patch 语义可接受（版本策略由用户裁决）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | package.json | version 3.34.8→3.34.9 |
