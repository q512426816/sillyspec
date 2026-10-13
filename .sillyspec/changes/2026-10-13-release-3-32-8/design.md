---
author: flow-machine-draft
created_at: 2026-10-13T05:20:01.442Z
---
# 设计记录（Design Record）— 2026-10-13-release-3-32-8

## 做法概述

照 3.32.1~3.32.7 惯例的纯发布变更，零代码交付，三步：①版本面（package.json=3.32.8 npm version 连带 lock + R5 锚同步，锚测试跑绿）；②推送（携带今日 cli-pit-fix-batch 交付与归档提交及版本面，pre-push lint+test+docs 三门放行）；③钉扎发布（腾讯 DoH 直连解析 registry.npmjs.org 真实 Cloudflare IP 刷新 /tmp/dns-pin-registry.cjs 的 PIN，NODE_OPTIONS --require 进程级注入，预核验通道存活后 publish，双核验 version 与 dist-tags.latest 均 3.32.8）。随版内容=今日已归档变更 2026-10-13-cli-pit-fix-batch（四例 CLI 摩擦坑修复）。

## 接口契约

无代码接口变化。对外交付物：npm registry 上的 sillyspec@3.32.8（tarball 内容=版本面提交时工作区快照）；package.json version 与 test/quick-retired.test.mjs R5 锚断言值两处同步为 3.32.8。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：发布序刚性（预核验→publish→双核验），npm registry 单调版本序保证 3.32.8 > 3.32.7；预核验读到污染数据（DNS 劫持面）由钉扎通道排除，钉扎失败即停不带病发布。
2. 并发写：版本面三文件（package.json/package-lock/R5 锚）单会话顺序改写，npm version 原子改 package.json；无并发写者（多会话纪律下本变更独占发版动作）。
3. 切换/生命周期：publish 失败重试幂等（同版本号二次 publish 被 registry 拒，改错需 npm deprecate 而非重发）；发布中断不留半态——registry 要么收下完整 tarball 要么没有 3.32.8。
4. 作用域：DNS 钉扎仅 NODE_OPTIONS --require 的进程级生效，零系统改动不串台其他进程；github.com 推送不经钉扎（3.32.4 实证其解析不受劫持影响）。

## 风险与死路

最大风险：钉扎 IP 失效（Cloudflare 池轮换，3.32.3 用 104.16.19.35 → 3.32.4 起 104.16.x.34 段）导致预核验假败——缓解为发布前 DoH 直连重解析刷新 PIN，预核验失败不发布。死路：系统级改 hosts 绕劫持——零系统改动纪律排除；npm mirror 镜像发布——非官方源不作发布通道。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | package.json | version 3.32.7 → 3.32.8 |
| 修改 | package-lock.json | 版本面连带同步（npm version） |
| 修改 | test/quick-retired.test.mjs | R5 版本锚断言同步 3.32.8 |
