---
author: qinyi
created_at: 2026-08-10 12:11:46
---

# 任务清单（Tasks）

> 仅列任务名，细节在 plan 阶段展开。

- [ ] task-01: stage-review.js 新增 `registerStageReview()` 导出函数（fs import 加 writeFileSync + 加 resolveRuntimeRoot import；实现 §5.2 步骤 1-11）
- [ ] task-02: index.js 新增 `case 'register-stage-review'`（镜像 backfill-reviews，解析 --change/--stage/--from/--spec-dir/--json，try/catch + exit 1）
- [ ] task-03: 新增 test/stage-review-register.test.mjs（骨架字段全/docHash 正确/marker 写盘/自检过/--from adopt 保留 verdict 重算 hash/--from schema 不过 throw/非法 stage/空 changeName/主文档缺失/marker 已存在 warn/plan+execute 映射）
- [ ] task-04: npm test 全量 + npm run lint 全绿；检查 index.js 是否有集中命令清单需补登 register-stage-review
