---
author: flow-machine-draft
created_at: 2026-10-11T14:09:32.860Z
---
# 设计记录（Design Record）— 2026-10-11-release-3-32-5

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

答：发布变更（照 3.32.1~3.32.4 惯例三步：版本面 → 推送 → 钉扎发布）。版本面只动两处：package.json version 3.32.4→3.32.5（npm version --no-git-tag-version）与 test/quick-retired.test.mjs R5 锚同步——版本锚钉住「仓库自证版本面」，init 按版本差刷新存量 AGENTS.md 依赖它。发布走腾讯 DoH（1.12.12.12 直连 IP，不依赖被劫持域名解析）解析真实 Cloudflare IP 段 + NODE_OPTIONS --require 进程级钉扎（零系统改动），因 registry.npmjs.org 本地解析不可信（本次实测未钉扎解析得 141.193.154.210，非真实 Cloudflare 段）。随版内容为已收口归档的 2026-10-11-resurrect-guard-verify-hardening（归档幽灵复活双门 + verify 对账基点 merge-base 化 + 超时单位统一 + quick skill + docs 重锚）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

答：源码零改动（无函数/端点/格式变化）。对外可见变化=npm registry 上 sillyspec@3.32.5（latest tag），含 330 files；版本面文件 package.json 与 test/quick-retired.test.mjs 断言值同步 3.32.5。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

答：成立。npm registry 传播有延迟（文档口径数分钟），双核验前显式等待 180s 吸收；若传播未完成核验读旧值，重跑核验即可（幂等只读），不存在状态损坏面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

答：版本面文件（package.json/R5 锚）由本变更独占编辑，同提交原子落库；npm publish 对同名版本幂等拒绝（EPUBLISHCONFLICT）——同版本重复发布会被 registry 拒绝而非产生双版本，安全。git 推送走显式 pathspec（AGENTS.md 规则 11），不扫他会话暂存面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

答：安全。三步各有独立留痕（版本面提交 d4ff0584 / 推送回执 61198e87..d4ff0584 / publish 回执 shasum 762bd0f5），中断后重入按已留痕步骤幂等跳过；钉扎脚本为进程级（NODE_OPTIONS 仅当次命令生效），无残留状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

答：不会。版本面只触本仓两文件；npm 发布以 package.json name+version 全局唯一键锚定，钉扎仅影响本进程 DNS 解析不改全局；他人仓不受影响。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

答：最大风险：钉扎 IP 失效或 DoH 通道本身被劫持（腾讯 DoH 为当前唯一可信通道，阿里 DoH 已沦陷先例）——缓解：发布前预核验（钉扎 npm view 返回真实 latest=3.32.4）先行证明通道存活，预核验失败即停不带病发布；本次预核验通过、双核验读回 3.32.5 闭环。试过放弃的方案（3.32.4 同款）：①改 hosts 钉扎——动系统配置污染面大，放弃；②用未钉扎 npm view 做核验——劫持环境数据不可信，放弃；③跳过核验直接发布——违背 3.32.2 起的 latest 双核验惯例，放弃。
