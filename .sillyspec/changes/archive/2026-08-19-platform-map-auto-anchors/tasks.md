---
author: qinyi
created_at: 2026-08-18T15:00:00+08:00
updated_at: 2026-08-18T16:20:00+08:00
---

# 任务清单（Tasks）

- [ ] task-01: `src/docs-check.js` 新增 `applyFixes(projectRoot, fixes, opts)` 纯函数（按 docLine 定点替换，同行多引用从后往前）
- [ ] task-02: `runDocsCheck` 结果透出 fixable/needs-manual 分类（复用 suggest，多候选文件唯一性校验）
- [ ] task-03: `src/index.js` `docs check` 子命令路由透传 `--fix` / `--dry-run`，输出修复报告与 exit code 语义
- [ ] task-04: 新增 `test/docs-check-fix.test.mjs`（单命中自动改/多命中不动/零命中报告/dry-run 不写盘/CRLF 保持/同行多引用）
- [ ] task-05: 用 platform-interface-map.md 真实漂移场景实测一轮（人为挪一行 → --fix → doc-ref-check 通过）
- [ ] task-06: 更新 `.sillyspec/docs/sillyspec/modules/docs-consistency.md` 模块文档与 file-lifecycle.md 中 docs check 命令描述
