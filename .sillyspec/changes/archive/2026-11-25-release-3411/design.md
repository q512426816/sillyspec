---
author: flow-machine-draft
created_at: 2026-11-25T10:04:38.301Z
---
# 设计记录（Design Record）— 2026-11-25-release-3411

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

发版单只做版本面与发布，不改业务逻辑：用 `npm version patch --no-git-tag-version` 将 `package.json` 与 `package-lock.json` 从 3.34.10 升到 3.34.11（patch 最小升级，不产生 git tag，标签与历史由 `sillyspec push` 后的流程管理）；同步 `test/quick-retired.test.mjs` 的 R5 版本锚；跑 quick-retired 测试与 lint；提交并推送后 `npm publish`。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

CLI 行为零变化；仅发布物版本号从 3.34.10 变为 3.34.11。`package.json` / `package-lock.json` 的 `version` 字段与测试锚点变化，无 API/schema 变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   发版是一次性版本面操作，不依赖事件顺序；`npm version` 与提交/推送串行执行。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   版本面文件由本会话显式 pathspec 提交，不夹带并行会话在途文件；若并行会话同时改 package.json，以 `git status` 核对后串行处理（先落地者先发版）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   版本号只在本地落盘后才提交；发布失败不回滚版本号，重试幂等（npm 同版本重复 publish 会被拒绝，届时如实报告）。flow 半态可重入。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   只操作本仓版本面与本变更目录，不触碰关联仓与平台仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：npm 发布需要有效认证/OTP，认证失败会停在「已提交推送但未发布」半态；处置：如实报告失败原因，版本面保留，认证修复后重跑 `npm publish`（同版本未发布可重试）。

放弃的方案：手工改两个文件的版本号——易漏 package-lock 的 lockfileVersion 记录，改用 npm 官方命令。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | package.json | version 3.34.10→3.34.11 |
| 修改 | package-lock.json | version 同步 3.34.11 |
| 修改 | test/quick-retired.test.mjs | R5 版本锚同步 3.34.11 |
