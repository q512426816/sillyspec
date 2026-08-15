---
id: task-02
title: parseModuleMapSimple CRLF 归一
title_zh: parseModuleMapSimple CRLF 归一
author: qinyi
created_at: 2026-08-15 21:16:00
priority: P0
depends_on: []
blocks: [task-04]
allowed_paths:
  - src/modules.js
repo: main
goal: >
  parseModuleMapSimple 入口把 content 归一化 \r\n→\n（一行），修复 CRLF map 整体解析为空的 bug
  （本仓 map 即 CRLF，loadModuleContextIndex 现状返回 {}）。行为扩散（模块注入激活）记录在
  file-lifecycle（task-05）。
implementation:
  - 函数入口 content = content.replace(/\r\n/g, '\n')
  - 既有测试全量跑确认无回归
acceptance:
  - 本仓实测 loadModuleContextIndex 返回 ≥9 模块
verify:
  - npm test
constraints:
  - 不改解析正则本身（入口归一即可）
---

## 验收标准

- FR-003：本仓 loadModuleContextIndex 非空
