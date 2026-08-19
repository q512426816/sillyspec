---
author: qinyi
created_at: 2026-08-18T22:20:00+08:00
updated_at: 2026-08-18T22:25:00+08:00
plan_level: light
change: 2026-08-18-platform-map-auto-anchors
---

# 轻量计划（Light Plan）：docs check --fix 零侵入自动重锚

## 来源

brainstorm revision 2 用户裁决方案 A：给 `docs check` 加 `--fix`，按现有 `suggestLines` token 搜索结果自动改写失效行号。零源码侵入、零文档改造。design.md §5.1/§5.2，D-002@v2。

## 范围

- `src/docs-check.js`：失效引用修复分类 + `applyFixes` 写回
- `src/index.js`：docs check 子命令 `--fix` / `--dry-run` flag（路由锚点 index.js:581-647）
- `test/docs-check-fix.test.mjs`：六场景测试
- 文档同步：docs-consistency 模块卡、file-lifecycle.md
- 实测对象：docs/sillyspec/platform-interface-map.md（临时漂移后还原）

## Tasks

### Wave 1

- [x] task-01: runDocsCheck 失效引用分类为 fixable/needs-manual（inv.fix 字段；多候选文件 token 唯一性校验，非唯一降级）（覆盖：FR-02, D-002@v2）

### Wave 2（依赖 Wave 1；与 task-01 共享 src/docs-check.js，须串行）

- [x] task-02: applyFixes 纯函数——docLine 降序定点替换、dryRun 不写盘、CRLF 保持（覆盖：FR-01, FR-05, D-003@v2）

### Wave 3（依赖 Wave 2）

- [x] task-03: docs check 路由透传 --fix/--dry-run，输出修复报告，exit code 语义（全修→0 / 剩 needs-manual→1）（覆盖：FR-04, D-004@v1, D-006@v1）

### Wave 4（依赖 Wave 3）

- [x] task-04: test/docs-check-fix.test.mjs 六场景——单命中自动改/多命中不动/零命中报告/dry-run 不写盘/CRLF 保持/同行多引用（覆盖：FR-01~FR-05）

### Wave 5（依赖 Wave 4）

- [x] task-05: 真实漂移实测——人为挪 sync.js 一行 → --fix --dry-run 预览 → --fix 修复 → doc-ref-check 通过 → 还原（覆盖：FR-01）

### Wave 6（依赖 Wave 5）

- [x] task-06: 文档同步——docs-consistency 模块卡「四件全部只读」表述修正 + file-lifecycle.md docs check 命令描述（覆盖：D-004@v1，另覆盖 FR-03 多命中保守行为已由 task-01 分类+task-04 场景②承接）

## 验收

- 单命中失效引用 `--fix` 后行号 = token 当前所在行，`node test/doc-ref-check.test.mjs` 通过
- 多命中引用不被自动修改，候选列表报告（D-006@v1）
- `--fix --dry-run` 零写盘
- 无 `--fix` 时 CLI 行为与现状逐字节一致（D-004@v1）
- CRLF 文档修复后行结束符不变；同行多引用均正确替换
- `npm test` + `npm run lint` 全量通过
- 模块卡 updated_at 更新且只读表述与写路径一致

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | （流程边界：本次进入落地，plan/execute 正常执行） | — |
| D-002@v2 | task-01, task-02 | 验收第 1 条 |
| D-003@v2 | task-02 | 文档保持标准 file:line（无占位符出现） |
| D-004@v1 | task-03, task-06 | 验收第 4 条 |
| D-005@v1 | task-01~task-04 | 零新依赖、零新脚本文件 |
| D-006@v1 | task-01, task-03 | 验收第 2 条 |
