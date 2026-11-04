---
author: flow-machine-draft
created_at: 2026-11-04T07:07:30.059Z
---
# 任务注册表（Tasks）— 2026-11-04-fence-aware-task-rows

- [x] task-01: 先写测试 test/md-fence-task-rows.test.mjs（成对围栏过滤/未闭合 fail-safe/CRLF 字节保留/翻格只动 checkbox 态字符）
- [x] task-02: 新增 src/md-fence.js fenceScan util（CommonMark 实用子集：```/~~~ 开合、≤3 空格缩进、信息串、闭栏长度阈值）
- [x] task-03: task-tick.js 接线——collectRows 围栏过滤、翻格改行内替换保字节、tickTasksMd 返回 unclosedFence、CLI 输出未闭合告警
- [x] task-04: 新增测试与既有回归面全绿
