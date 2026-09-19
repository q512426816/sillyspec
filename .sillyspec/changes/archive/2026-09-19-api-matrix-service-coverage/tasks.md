---
author: qinyi
created_at: 2026-09-19 06:20:15
---
# 任务清单（Tasks）

> 粗粒度拆解（plan 阶段细化为 task 卡）；Wave 划分与精确锚点见 design.md「总体方案」。

- [x] task-01: 判定层——src/stage-contract.js 白名单五枚举/matrixEvidenceMissing 联动/covered-service 测试锚点分支/记账分子并入+advisory/门禁文案四处
- [x] task-02: 骨架与指引文案——verify-probes.js（render 五选一+占位、probe7 注记 :1929/:1930）、stages/verify.js、templates/prompts/verify-probes.md、src/index.js :1212
- [x] task-03: 预检器——src/probe7-anchor-check.js :70/:72 认 covered-service
- [x] task-04: 测试——api-coverage-matrix.test.mjs 五组用例+断言同步、acceptance-matrix-probe.test.mjs :213、npm test 全量（depends_on: task-01,02,03）
