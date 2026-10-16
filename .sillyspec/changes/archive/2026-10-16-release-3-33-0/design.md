---
author: flow-machine-draft
created_at: 2026-10-16T02:58:13.947Z
---
# 设计记录（Design Record）— 2026-10-16-release-3-33-0

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

照 3.32.1~3.32.10 惯例的纯发布变更，代码零新增交付，五步：①漂移欠账收编（test/lint-ownership-failfast.test.mjs 3e 断言随已归档变更 lint-triage-path-unify 实态改钉——gates.js 判定已迁 lint-ownership.js helper，旧字面量锚在 HEAD 必红，先行提交保证发布面全量绿可复现）；②版本面（package.json=3.33.0 npm version 连带 lock + R5 锚同步，锚测试跑绿）；③推送（携带本地积压提交——dcb62728 四坑收口、4c3168cc/df5d65e4 测试防漂移——pre-push 本地门放行；121a33ee 起全量测试由 CI 执行，红灯阻断口径不变）；③.5 CI 门基建修复（121a33ee CI 首跑即灭：test/docs-gate 两 job 死于缺 js-yaml——工作流「零三方依赖无 install 步」假设只对测试框架成立，被测 CLI 本体 import 7 个运行时依赖；两 job 补 npm ci，推送后三 job 全绿回执作为 publish 前置全量信号，禁止无全量信号 publish）；④发布（直连通道预核验存活后 publish，劫持复发时降级钉扎通道：腾讯 DoH 直连解析真实 Cloudflare IP 刷新 PIN、NODE_OPTIONS --require 进程级注入；传播后双核验 version 与 dist-tags.latest 均 3.33.0）。随版内容=三笔已提交件加漂移修复与 CI 门修复，无在途半态收编。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化。对外交付物：npm registry 上的 sillyspec@3.33.0（tarball 内容=版本面提交时工作区快照）；package.json version 与 test/quick-retired.test.mjs R5 锚断言值两处同步为 3.33.0。FR-04 仅测试断言锚改钉（钉已提交实态），非行为变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

发布序刚性（预核验→publish→双核验），npm registry 单调版本序保证 3.33.0 > 3.32.10；CDN 传播延迟期内核验可能读到旧值，以传播后重试双核验兜底；push 单向序保证远端不含未提交半态；CI job 与本地 push 异步，CI 红灯属迟到反馈——回滚口径为 revert + 补丁版，不撤回已发 tarball。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

版本面三文件（package.json/package-lock/R5 锚）与漂移修复件单会话顺序改写，npm version 原子改 package.json；多会话纪律下本变更独占发版动作（--session 留痕），共享工作区的他会在途件（decision-anchor-backfill 归档清理删除、quicklog/）不进本变更提交面——显式 pathspec 隔离。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

publish 失败重试幂等（同版本号二次 publish 被 registry 拒，改错需 npm deprecate 而非重发）；发布中断不留半态——registry 要么收下完整 tarball 要么没有 3.33.0；flow 中断走 flow start 恢复简报断点续跑（本变更已经历一次重入：autopilot 声明补录）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

钉扎通道（如启用）仅 NODE_OPTIONS --require 的进程级生效，零系统改动不串台其他进程；github.com 推送不经钉扎（3.32.4 实证其解析不受劫持影响）；本仓注册 repos 仅 1 个，无跨仓面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：registry 通道不稳定（历史 DNS 劫持，3.32.4~3.32.9 走钉扎、3.32.10 直连恢复）导致预核验假败或 publish 失败——缓解为发布前 npm view 预核验，失败即降级钉扎通道（腾讯 DoH 重解析刷新 PIN），预核验失败不发布。次风险：CI Linux test job 修复 install 后首跑真实暴露 ~16 例存量平台债（resolvePlacementRoot 的 `D:/quoted` Windows 盘符 fixture、stderr 字节一致内嵌非确定时长等，跨 ~10 套件，本地 Windows 全绿）——定性为 121a33ee CI 引入首次揭示的存量测试面平台债，非本版回归（本版触碰面仅测试断言锚/版本面/CI install，零产品代码），另案清偿不阻断本版，publish 全量口径与既往十版同（本地 Windows 全量绿）。死路：系统级改 hosts 绕劫持——零系统改动纪律排除；npm mirror 镜像发布——非官方源不作发布通道；跳过漂移修复直接推——HEAD 全量红欠账带病上线，bisect 与后续全量门全被污染，排除；把 16 例 Linux 平台债塞进本版清偿——范围失控（平台移植非发布），排除。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | test/lint-ownership-failfast.test.mjs | 3e 断言随 lint-triage-path-unify 实态改钉 helper（task-01，工作区已有修复落定） |
| 修改 | package.json | version 3.32.10 → 3.33.0 |
| 修改 | package-lock.json | 版本面连带同步（npm version） |
| 修改 | test/quick-retired.test.mjs | R5 版本锚断言同步 3.33.0 |
| 修改 | .github/workflows/ci.yml | test/docs-gate 两 job 补 npm ci install 步（CI 首跑缺 js-yaml 全灭，task-05）——发布全量门基建修复 |
