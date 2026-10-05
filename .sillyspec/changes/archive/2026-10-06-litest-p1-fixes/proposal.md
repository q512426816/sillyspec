---
author: flow-machine-draft
created_at: 2026-10-05T17:20:04.275Z
---
# 提案书（Proposal）— 2026-10-06-litest-p1-fixes

## 动机

任务原话转写：轻量变更实测（2026-10-06-agent-log-detect-hint）暴露的 P1 缺口修复，四项：
① doc-ref-check 13 处引用失效（platform-interface-map.md 行号漂移 vs src/index.js、src/run/command.js、src/run/complete-handlers.js——主仓全量 npm test 预存红，stash 实证非新引入）→ 更新 13 处行号到当前源码。
② doc-ref-check.test.mjs 不在 package.json test:core 清单——日常开发入口绿而全量红，文档引用漂移无日常拦截 → 纳入 test:core。
③ 评审定档 PRIMITIVE_RE 的 \bcursor\b 误伤本仓 harness 名 cursor（实测：纯文案派生变更因测试断言 includes('cursor') 被判「交付 diff 含并发/游标/取消类原语」强制起子代理评审 40 万 token）→ 收窄为用法形态（cursor 赋值/字段/调用），纯名词不命中。
④ 归档收尾只暂存不提示提交命令，agent 按直觉 pathspec 提交把 rename 拆两半（实测实证：b112d738 漏源侧删除，补 2c8fd25c）→ 归档收尾聚合本变更暂存面并打印一笔到位 git commit 命令（两侧 pathspec 显式列出）。

成功标准：
- node --test test/doc-ref-check.test.mjs 全绿（13 处失效清零）
- doc-ref-check.test.mjs 列入 test:core 且 npm run test:core 含其执行
- PRIMITIVE_RE 收窄后：含 cursor 纯名词的 patch 文本不再触发评审；DB 游标用法形态（cursor=/next_cursor:/conn.cursor()）仍触发；新增回归测试覆盖两向
- 归档收尾输出含可执行的一笔到位 git commit 命令（源侧+归档侧+knowledge pathspec 完整）；既有归档测试无回归
- npm test 改动面无回归 + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. node --test test/doc-ref-check.test.mjs 全绿（13 处失效清零）
2. doc-ref-check.test.mjs 列入 test:core 且 npm run test:core 含其执行
3. PRIMITIVE_RE 收窄后：含 cursor 纯名词的 patch 文本不再触发评审；DB 游标用法形态（cursor=/next_cursor:/conn.cursor()）仍触发；新增回归测试覆盖两向
4. 归档收尾输出含可执行的一笔到位 git commit 命令（源侧+归档侧+knowledge pathspec 完整）；既有归档测试无回归
5. npm test 改动面无回归 + lint 绿

## 成功标准（可验证）

1. node --test test/doc-ref-check.test.mjs 全绿（13 处失效清零）
2. doc-ref-check.test.mjs 列入 test:core 且 npm run test:core 含其执行
3. PRIMITIVE_RE 收窄后：含 cursor 纯名词的 patch 文本不再触发评审；DB 游标用法形态（cursor=/next_cursor:/conn.cursor()）仍触发；新增回归测试覆盖两向
4. 归档收尾输出含可执行的一笔到位 git commit 命令（源侧+归档侧+knowledge pathspec 完整）；既有归档测试无回归
5. npm test 改动面无回归 + lint 绿
