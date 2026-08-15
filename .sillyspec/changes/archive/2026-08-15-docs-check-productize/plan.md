---
author: qinyi
created_at: 2026-08-15 16:15:00
change: 2026-08-15-docs-check-productize
plan_level: full
---

# 计划（Plan）

## Wave 1

- [x] task-01: 抽离校验核心 src/docs-check.js（collectDocRefs/validateRefLine/候选解析三段回退/关键词断言 looksLikeCodeSymbol/手写 glob walker，纯函数 + runDocsCheck IO 入口）【FR-004/FR-005/FR-006 基础】

## Wave 2

- [x] task-02: CLI 注册 docs check 子命令（src/index.js，--paths/--json/exit code 0-1-2 三档）【FR-001/FR-002/FR-003】
- [x] task-03: config-schema.js 加 docs-check 配置段（paths/skip/keywordAssert）+ renderExample 同步【FR-004】

## Wave 3

- [x] task-04: 新增 test/docs-check.test.mjs 单测（FR-006：引用提取/行号边界/候选回退/glob walker；FR-002 注入 fixture exit 1）【FR-002/FR-003/FR-006】
- [x] task-05: 迁移 test/doc-ref-check.test.mjs 调 runDocsCheck（两层全开，检测力不降级）【FR-005】

## Wave 4

- [x] task-06: 文档同步（file-lifecycle.md 新命令生命周期 / interface-contract.md CLI 契约 / doc-consistency-debt.md D-6 销账 / SKILL 可用性）【FR-001 收口】

## 全局验收标准

- npm test 全量绿（含迁移后 doc-ref-check 两层全开）+ npm run lint 绿【FR-005】
- `node bin/sillyspec.js docs check` 本仓实跑：全绿 exit 0；--json 结构正确【FR-001/FR-003】
- 注入非法引用 fixture 实测 exit 1（task-04 单测覆盖，不污染真仓库）【FR-002】
- local.yaml docs-check.paths 缺省与 --paths 覆盖行为核对【FR-004】
- 集成冒烟：npm test 后跑 `node bin/sillyspec.js docs check --json | head`，确认 total > 0 且 ok=true【FR-001】
