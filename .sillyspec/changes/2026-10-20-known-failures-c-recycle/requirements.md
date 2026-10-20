---
author: flow-machine-draft
created_at: 2026-10-20T01:05:01.366Z
---
# 需求规格（Requirements）— 2026-10-20-known-failures-c-recycle

## 功能需求

### FR-01: known-failures.yaml 删除 node:test banner/结果行组与 fixture token 组及待审计组

本变更必须（MUST）从 `.sillyspec/known-failures.yaml` 删除以下三类条目：①node:test banner/结果行组（`^--- .*---$`、`^Running \d+`、`结果:`、`summary:`）；②fixture token 组（`jsonA=`、`jsonB=`、`配置: 8 进程`、`域差异双向 WARNING`、`WARNING 放行`、`Delta：交付文件`、`未实现标记`、`count-fail.js`、`Boom-counter`、`node exit1.js`、`deadbeef`、`❌ QUICKLOG 条目`、`^AssertionError \[ERR_ASSERTION\]: 回执实测面回填`）；③待审计组（`API parity check failed`、`JSON-RPC error`、`请求失败: fetch failed`、`usage: pytest`）。删除依据必须（MUST）成立：judgeWithKnownFailures 在 exitCode===0 时直接返回 passed 不扫行（src/verify-postcheck.js:1206），exit 码丢失场景已由 TAP 摘要级判定覆盖（2026-09-23 缺陷三修复，cross-repo-tap-summary 3/3 绿）——被删条目仅剩真失败（exit≠0 且摘要 fail>0）场景的行级归因装饰作用。

#### 场景：删后全绿套件照常通过

Given 套件 exitCode===0（全绿）
When 门禁判定
Then 直接 passed（不扫行，豁免清单不参与）——删除零影响

### FR-02: 保留非 node:test 家族：D 组门内嵌套与 task-done 用例 CLI 预期错误文案同族

本变更必须（MUST）保留以下非 node:test 家族条目不动：D 组门内嵌套（`^✖ ⑮ 承诺词必评全链`，2026-09-28-guidance-principles 实证）与 task-done 用例 CLI 预期错误文案同族（`[review.json] ❌ failed——已存在但 verdict 不一致`、`[wt-commit] ❌ failed——--pathspec-from-file`）。

#### 场景：保留面逐字节不变

Given 上述保留条目
When 本变更落盘
Then 三条条目与注释原样保留

### FR-03: 既有判定相关测试套件零回归

本变更后必须（MUST）复跑判定相关测试面全绿（cross-repo-tap-summary / verify-failure-ledger-noise / verify-artifact-triage 等已知失败豁免消费面）。

#### 场景：回归面

Given known-failures.yaml 变更后
When 复跑判定相关套件
Then 全绿（纯配置变更，源码零改动）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯配置删除（.sillyspec/known-failures.yaml 非测试面）——判据由 FR-03 回归面承载
FR-02: 不适用：纯配置保留面（同上）；保留条目在场由收口冻结面 diff 直接可见
FR-03: test/cross-repo-tap-summary.test.mjs + test/verify-failure-ledger-noise.test.mjs「判定面回归全绿」
