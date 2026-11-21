---
author: qinyi
created_at: 2026-11-21 23:06:32
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机

实测门是 SillySpec 的亮点（收口亲自实测防作弊）也是当前最严重的缺陷：范围太大、经常跑半天，agent 被卡在收口。用户定性为最严重问题，要求治理。

## 关键问题

1. deps 命中口径为字符串 includes，枢纽模块单点改动命中面冲到配额帽，符号收敛失败即 fail-open 全保留（src/verify-postcheck.js:1248）。
2. 配额帽 CAP=30 只帽普通依赖，本变更自身测试豁免帽无限进面（src/verify-postcheck.js:3329）。
3. timeout 到期即失败阻断（src/verify-postcheck.js:78 缺省 600s），变更自身测试套件慢的仓把 agent 卡死在收口。

## 变更范围

收口实测门分层门化（方案 A 枢纽分层）：阻断面=本变更测试∪非枢纽依赖命中；间接面（枢纽命中+FR 层）收口只披露归 pre-push；构成披露行+ledger 留痕；时长护栏 degrade 缺省/block 逃生；gate_scope 逃生阀回旧行为。命中算法/批次调度/缓存指纹/pre-push 执行面零改动。

## 不在范围内（显式清单）

- 命中口径升级（AST/真 import 图）
- 批次并行、runner 并发 flag 缺省注入、缓存粒度下探
- 跨仓仓测试策略治理（跨仓恒 full 留后续）
- pre-push 执行面改动（间接面由既有全量门自然承接）

## 成功标准（可验证）

- 缺省（零配置）收口阻断面=本变更测试∪非枢纽依赖命中，间接面不执行且披露行+ledger 留痕可查证（FR-01/FR-02/FR-03）
- gate_scope: legacy + timeout_policy: block 组合下行为逐字对齐 2026-11-21 前现状（FR-05）
- 阻断面超预算转 degraded-timeout 留痕不阻断且 loud 披露；block 策略回超时阻断旧行为（FR-04）
- discoverModuleDependentTests 缺省返回形态与三个既有消费点行为零变化（FR-06）
- 专项测试全绿（归因/切线分类/披露行/两键三态/护栏两态/opt-in 零回归）
