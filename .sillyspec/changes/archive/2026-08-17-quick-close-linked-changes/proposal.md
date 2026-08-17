---
author: qinyi
created_at: 2026-08-17 08:45:00
---

# 提案书（Proposal）

## 动机

SillySpec quick 阶段被设计为“轻量逃生通道”：当变更被评估为 small 规模时，可直接执行，跳过完整流程。但当前 quick --done 完成后，只注销了 quick 自己的会话行（`quick-<hex>`），对 `guard.linkedChanges` 中关联的真实变更完全不处理，导致这些变更长期停在 `status='active'`，目录仍留在 `changes/`，平台变更中心里出现“已完成但未归档”的僵尸变更。

## 关键问题

1. quick --done 收尾（`src/run/complete-handlers.js` 的 `handleQuickStageCompletion`）只对 `quick-<hex>` sessionId 调用 `unregisterChange`，不处理 `linkedChanges`。
2. 关联真实变更的 `tasks.md` 中，quick 追加的 task 已被勾选，但变更 `status` 仍为 active，目录仍留在 `changes/`。
3. 用户不得不手动发现、手动跑 archive 来关闭这类 quick 闭环的变更，违背 quick“轻量且闭环”的设计初衷。

## 变更范围

- `src/run/complete-handlers.js`：新增并导出 `closeQuickLinkedChanges` 函数，在 quick 完成路径调用。
- `src/stages/quick.js`：step3 prompt 增加“关联变更自动归档”说明。
- `test/quick-close-linked-changes.test.mjs`：覆盖自动归档、未完成任务不误关、目录已存在幂等。
- 文档同步：`docs/sillyspec/file-lifecycle.md`、`docs/prompt/quick.md`、`.claude/skills/sillyspec-quick/SKILL.md`。

## 不在范围内

- 不改造完整 archive 阶段本身：quick 场景通常无 `plan.md` / `module-impact.md`，不能复用 `archiveChangeDirectory` 的硬校验。
- 不改变无 `linkedChanges` 的 quick 行为。
- 不新增 DB schema 或配置项。
- 不处理变更目录存在但 `tasks.md` 缺失的边界（保守不自动归档）。

## 成功标准（可验证）

- 关联变更 `tasks.md` 全勾选时，quick --done 后该变更 `changes.status = archived` 且目录移到 `changes/archive/<date>-<desc>/`。
- 关联变更仍有未完成任务时，quick --done 后保持 active 并打印提示。
- 无 `linkedChanges` 的 quick 行为零回归。
- `npm test` 全绿 + `npm run lint` 全绿。
