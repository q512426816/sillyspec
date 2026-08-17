---
author: qinyi
created_at: 2026-08-17 08:45:00
---

# 任务清单（Tasks）

- [ ] task-01: `src/run/complete-handlers.js` 实现 `closeQuickLinkedChanges` 与 `isChangeTasksComplete` / `closeSingleQuickLinkedChange`
- [ ] task-02: `handleQuickStageCompletion` 在 quick --done 末尾接入 `closeQuickLinkedChanges`
- [ ] task-03: `src/stages/quick.js` step3 prompt 增加“关联变更全完成时 CLI 自动归档”说明
- [ ] task-04: 新增 `test/quick-close-linked-changes.test.mjs`：覆盖自动归档、未完成任务不误关、目标目录已存在幂等
- [ ] task-05: 文档同步：`docs/sillyspec/file-lifecycle.md` + `docs/prompt/quick.md` + `_extracted.json` + `.claude/skills/sillyspec-quick/SKILL.md`
- [ ] task-06: 跑 `npm test` + `npm run lint`，精修 QUICKLOG 并提交
