---
author: qinyi
created_at: 2026-08-15 23:08:00
change: 2026-08-15-docs-signals-o12
plan_level: full
---

# 计划（Plan）

## Wave 1

- [x] task-01: O-1 shared.js docSyncHint 归属（matchFilesToModules 动态 import docs-debt.js + parseModuleMapSimple 直读 map；auditQuickCompletion 加可选 specBase 参数，handleQuickStageCompletion 透传）【FR-001/FR-002】

## Wave 2

- [x] task-02: O-1 quick-audit.js modules 行渲染（三态外尾部，modules 非空追加"涉及模块：…"）【FR-001】
- [x] task-03: O-2 docs-debt.js facts 内联（debtEntries 循环内 runDocsCheck 单文档，守卫 docGitPath&&docGitRoot，每模块上限 3 条，异常降级）【FR-003】
- [x] task-04: F-1 index.js BARE_FLAGS=['--suggest']/PAIRED_FLAGS=['--paths'] + 未知 flag exit 2 + 💡 行 flag 门控【FR-004/FR-005】

## Wave 3

- [x] task-05: 测试三件（audit-quick D-8 场景升级 modules 断言；docs-debt.test O-2 内联场景；docs-check-cli.test.mjs 新增 CLI 子进程三场景）【FR-001~005】

## Wave 4

- [x] task-06: file-lifecycle.md quick/execute 行为同步【FR-006 收口】

## 全局验收标准

- npm test 全量绿 + lint + docs check 全仓绿【FR-006】
- 实测：本仓 quick 冒烟 hint 含模块行；docs check --suggest 识别；--foo exit 2【FR-001/004/005】
