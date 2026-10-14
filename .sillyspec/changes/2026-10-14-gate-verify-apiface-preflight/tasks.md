---
author: flow-machine-draft
created_at: 2026-10-14T05:35:20.439Z
---
# 任务注册表（Tasks）— 2026-10-14-gate-verify-apiface-preflight

- [ ] task-01: 写第 9 组测试（test/api-coverage-matrix.test.mjs）：空指复现（现状口径）→ 注入命中 → 注入优先于过期 facts → helper 同形同源/缺文件 fail-soft——验证：node --test test/api-coverage-matrix.test.mjs（9 组先红：注入用例因未实现而挂）
- [ ] task-02: src/verify-probes.js 导出 computeApiFaceFromDesign（endpoints/declared/writeEndpoints 与 backfill 落盘同形同源），backfill apiFace 段重构复用——验证：node --test test/api-coverage-matrix.test.mjs（9c 绿 + 既有 8d/7b 不回归）
- [ ] task-03: src/stage-contract.js validateApiCoverageMatrix 支持 context.apiFaceLive 覆写 facts.apiFace 作 parseSet——验证：node --test test/api-coverage-matrix.test.mjs（9/9b 绿）
- [ ] task-04: src/machine-interface.js runGate verify 段与 derive artifacts 段 fail-soft 注入（动态 import，零落盘）——验证：node --check src/machine-interface.js + node --test test/api-coverage-matrix.test.mjs 全绿
- [ ] task-05: 全量回归 + lint——验证：项目测试命令（package.json test）零失败 + lint 绿
