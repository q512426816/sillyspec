---
author: flow-machine-draft
created_at: 2026-10-12T15:10:24.425Z
---
# 设计记录（Design Record）— 2026-10-12-release-3-32-7

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

答：发布变更（照 3.32.1~3.32.6 惯例三步：版本面 → 推送 → 钉扎发布）。版本面只动两处：package.json version 3.32.6→3.32.7（npm version --no-git-tag-version，连带 package-lock.json）与 test/quick-retired.test.mjs R5 锚同步（断言 `pkg.version === '3.32.7'`）——版本锚钉住「仓库自证版本面」，init 按版本差刷新存量 AGENTS.md 依赖它。发布走腾讯 DoH（1.12.12.12 直连 IP）解析真实 Cloudflare IP 段 + NODE_OPTIONS --require 进程级钉扎（脚本 /tmp/dns-pin-registry.cjs，当前 PIN=104.16.0.34），因 registry.npmjs.org 本地解析不可信（历史实测停放/劫持 IP：103.73.220.77、141.193.154.210）。随版内容为今日已归档七变更（approve 通道化治理 / 评审探针注入 / tick 证据+跨仓锚 / 报错自足+子仓指路 / dogfood 复盘快照 / 厚档任务书 CLI 化 / verify 移交场景文案）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

答：本变更源码零改动（无函数/端点/格式变化）。对外可见变化=npm registry 上 sillyspec@3.32.7（latest tag）；版本面文件 package.json/package-lock.json 与 test/quick-retired.test.mjs 断言值同步 3.32.7。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   答：成立。npm registry 传播有延迟（文档口径数分钟），双核验前显式等待吸收；传播未完成核验读旧值时重跑核验即可（幂等只读）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   答：版本面文件由本变更独占编辑，同提交原子落库；npm publish 对同名版本幂等拒绝（EPUBLISHCONFLICT）；git 推送走显式 pathspec（AGENTS.md 规则 11）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   答：安全。三步各有独立留痕（版本面提交 sha / 推送回执 / publish 回执 shasum），中断后按已留痕步骤幂等跳过；钉扎为进程级（NODE_OPTIONS 仅当次命令生效）零残留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   答：不会。版本面只触本仓三文件；npm 发布以 name+version 全局唯一键锚定；钉扎仅影响本进程 DNS 解析不改全局。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

答：最大风险：钉扎 IP 失效或 DoH 通道本身被劫持——缓解：发布前预核验（钉扎 npm view 返回 latest=3.32.6）先行证明通道存活；IP 失效时经腾讯 DoH 重解析更新 PIN 后再核验，仍失败即停不带病发布。试过放弃（3.32.4~3.32.6 同款）：①改 hosts 钉扎——动系统配置，放弃；②未钉扎 npm view 核验——劫持环境数据不可信，放弃；③跳过核验直接发布——违背 3.32.2 起 latest 双核验惯例，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 改 | package.json | version 3.32.6→3.32.7 |
| 改 | package-lock.json | version 同步（npm version 连带） |
| 改 | test/quick-retired.test.mjs | R5 版本锚断言 3.32.6→3.32.7 |
