---
author: flow-machine-draft
created_at: 2026-10-20T01:05:01.366Z
---
# 提案书（Proposal）— 2026-10-20-known-failures-c-recycle

## 动机

任务原话转写：node:test 豁免 C 组按约回收

动机与背景：坑 verify-gate-worktree-crossrepo-three-defects 缺陷三处置（2026-09-23）约定「sillyspec 仓 known_failures C 段窄豁免（工具修复后删）随下一次 sillyspec 发版生效后删除」——TAP 摘要级判定已落地且随多版发布（cross-repo-tap-summary 3/3 绿）；judgeWithKnownFailures 在 exitCode===0 时直接返回 passed 不扫行（verify-postcheck.js:1206），node:test fixture 噪音豁免仅剩 exit≠0 且真失败场景的行级归因装饰作用，按约回收（吞真风险面同步收紧）。

成功标准：
- known-failures.yaml 删除 node:test banner/结果行组与 fixture token 组及待审计组
- 保留非 node:test 家族：D 组门内嵌套与 task-done 用例 CLI 预期错误文案同族
- 既有判定相关测试套件零回归

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. known-failures.yaml 删除 node:test banner/结果行组与 fixture token 组及待审计组
2. 保留非 node:test 家族：D 组门内嵌套与 task-done 用例 CLI 预期错误文案同族
3. 既有判定相关测试套件零回归

## 成功标准（可验证）

1. known-failures.yaml 删除 node:test banner/结果行组与 fixture token 组及待审计组
2. 保留非 node:test 家族：D 组门内嵌套与 task-done 用例 CLI 预期错误文案同族
3. 既有判定相关测试套件零回归
