---
author: flow-machine-draft
created_at: 2026-10-15T14:27:50.944Z
---
# 任务注册表（Tasks）— 2026-10-15-eval-probe2-orders-export

- [x] task-01: eval/tasks/005-orders-export/ 四件套在场：task.json（instruction 只命名 CSV 表头/过滤/输出契约，不提及五类陷阱）、files/data/orders.csv（BOM+CRLF+引号逗号+空行的固定 fixture，字节精确）、verify.mjs（期望硬编码 APAC 2200/2、EU 2284.5/3；out/summary.json 判分）、solution/bin/export-orders.mjs（参考解全对）
- [x] task-02: 判别力：naive 实现（index 列位、不剥 BOM/CRLF/引号）verify 必拒；参考解必过——仓库测试钉死（test/eval-probe2-orders.test.mjs）
- [x] task-03: node eval/run.mjs --dry-run 含 005 零报错跑通（005 奇数 → A 过 B 挂形态）
- [x] task-04: 变更自身测试面跑绿，lint 通过
