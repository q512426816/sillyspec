---
author: flow-machine-draft
created_at: 2026-10-23T02:41:14.198Z
---
# 提案书（Proposal）— 2026-10-23-release-3-33-5

## 动机

任务原话转写：发布 3.33.5 版本面（八变更收口）

动机与背景：本会话八个变更（verify-drafts 自查/收口预检 fail-together/dirty_gate_ignore/turbo docs-auto/评审平台单调用/fr_regress_cap/FR 回归层缺省关闭/config validate 与引导技能）已全部闭环归档，消费仓升级解锁需要版本面。两个 breaking 须在 release notes 明示：FR 关联回归层缺省不跑（fr_regress_cap: all 恢复）、缺省翻转类配置语义。同批本仓 local.yaml 配置清理（删除退役态 commands/空 known_failures/stage.burst/repos Temp 残留——纯本机文件不入包不入库）。用户显式指令：提交推送发布 npm 3.33.5——autopilot 直跑到底，--no-prestage 声明需求已含决策（用户原话即裁决）。

成功标准：
- package.json 与 package-lock.json version 同步 3.33.5；test/quick-retired.test.mjs R5 版本锚断言同步 3.33.5 且该套件跑绿
- npm run lint 过（pre-push 同款快速门）
- 提交推送 origin main（只带版本面与变更目录 pathspec，不夹带并行会话在途文件）；npm publish 发布 3.33.5 成功（或如实报告失败原因）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. package.json 与 package-lock.json version 同步 3.33.5；test/quick-retired.test.mjs R5 版本锚断言同步 3.33.5 且该套件跑绿
2. npm run lint 过（pre-push 同款快速门）
3. 提交推送 origin main（只带版本面与变更目录 pathspec，不夹带并行会话在途文件）；npm publish 发布 3.33.5 成功（或如实报告失败原因）

## 成功标准（可验证）

1. package.json 与 package-lock.json version 同步 3.33.5；test/quick-retired.test.mjs R5 版本锚断言同步 3.33.5 且该套件跑绿
2. npm run lint 过（pre-push 同款快速门）
3. 提交推送 origin main（只带版本面与变更目录 pathspec，不夹带并行会话在途文件）；npm publish 发布 3.33.5 成功（或如实报告失败原因）
