---
author: qinyi
created_at: 2026-08-13 09:30:00
---

# Tasks：module-impact 分阶段生成

## Wave 1：plan 阶段首版生成 + validator

- [ ] task-01: plan.js review_plan 步骤 prompt 注入生成 module-impact.md 首版指引（复用 archive extract-module-impact 核心文本，注释同源；含无 _module-map.yaml 降级语义）
- [ ] task-02: stage-contract-spec.js 新增 `plan.module-impact.exists`（error, condition scale≠small, root=change）
- [ ] task-03: stage-contract.js validatePlanOutputs 加 design.md scale 读取链路，`evaluateRules('plan', { changeDir, scale })`

## Wave 2：后续阶段更新 + archive 终审

- [ ] task-04: execute.js Wave 步骤 prompt 加「主代理 Wave 后汇总更新 module-impact.md」指引
- [ ] task-05: verify.js「输出验证报告」步骤 prompt 加核对 module-impact.md 指引
- [ ] task-06: archive.js extract-module-impact 步骤改写为最终确认（prompt 改；若改名配 migratedFrom）

## Wave 3：文档 + 提示词 + skills 同步

- [ ] task-07: docs/sillyspec/file-lifecycle.md 记录 module-impact.md 在 plan(large) 生成 + archive 终审（更新 updated_at）
- [ ] task-08: 跑 `node docs/prompt/_extract.mjs` 再生 _extracted.json + 同步 docs/prompt/plan.md/execute.md/verify.md/archive.md
- [ ] task-09: .claude/skills/ 对应 skill 同步 module-impact 要点

## Wave 4：受影响测试修复

- [ ] task-10: 修受影响测试（archive 相关：run-complete-step-archive / archive-cli-git-add / archive-idempotent-selfheal / archive-sync-module-docs-wait；plan validator 相关）+ 跑全量 npm test
