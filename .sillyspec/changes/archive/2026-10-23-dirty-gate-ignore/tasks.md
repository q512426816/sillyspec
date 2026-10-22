---
author: flow-machine-draft
created_at: 2026-10-22T23:39:13.117Z
---
# 任务注册表（Tasks）— 2026-10-23-dirty-gate-ignore

- [x] task-01: collectFreezeFiles 内 fail-soft 读 dirty_gate_ignore + 前缀剔除 + 返回 dirtyIgnored——验证：unit 直调切分返回
- [x] task-02: patch 子步权威门 ℹ️ 留痕行 + 权威门/预检两处阻断文案增第④条出路（逐字同步）——验证：temp 仓跑命中态看留痕行
- [x] task-03: 新增 test/dirty-gate-ignore.test.mjs 四态矩阵全绿 + thin-done-dirty-gate/flow-done-preflight 既有面回归——验证：node --test 批跑
