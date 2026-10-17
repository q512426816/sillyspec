---
author: flow-machine-draft
created_at: 2026-10-17T06:34:32.358Z
---
# 提案书（Proposal）— 2026-10-17-strict-sync-signal-shape

## 动机

任务原话转写：终态强校验默认路径 signal 形状修复——套娃对象回归钉
动机：上一变更归档收尾 dogfood 当场触发强校验 🚨（安全网按设计工作）：raceWithAbort 向 op 传 {signal} 形状对象，默认 runSync 误再包一层 { signal: sig } 致 opts.signal 变套娃对象，syncSpecTree 的 AbortSignal.any 抛 TypeError，树通道恒假败（报错文本被安全网捕获留痕）。一行修复：默认路径原样透传 syncOpts；补默认路径回归单测（钉告警详情不含 AbortSignal 套娃痕迹）。自救命令已验证收敛上一变更半态（23 文件上行成功）。

成功标准：
- 默认同步路径（无 syncImpl 注入）回归单测绿：连接态 + 平台不可达时告警详情不含 AbortSignal 套娃 TypeError
- test/terminal-sync-strict.test.mjs 全绿（10 用例）
- dogfood 本变更 flow done 收尾强校验静默 confirmed（无 🚨 行、退出码干净）——修复后真实 E2E

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 默认同步路径（无 syncImpl 注入）回归单测绿：连接态 + 平台不可达时告警详情不含 AbortSignal 套娃 TypeError
2. test/terminal-sync-strict.test.mjs 全绿（10 用例）
3. dogfood 本变更 flow done 收尾强校验静默 confirmed（无 🚨 行、退出码干净）——修复后真实 E2E

## 成功标准（可验证）

1. 默认同步路径（无 syncImpl 注入）回归单测绿：连接态 + 平台不可达时告警详情不含 AbortSignal 套娃 TypeError
2. test/terminal-sync-strict.test.mjs 全绿（10 用例）
3. dogfood 本变更 flow done 收尾强校验静默 confirmed（无 🚨 行、退出码干净）——修复后真实 E2E
