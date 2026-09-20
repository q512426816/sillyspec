---
author: zcode-quick-asset-tail
created_at: 2026-09-20 19:52:00
---
# 任务注册表（Tasks）— 2026-09-20-quick-asset-tail

- [x] task-01: fr-index.js 扩展——markFrNeedsReview（跨域定位/幂等/行写入）+ readActiveFrDigest needsReview 透传 + indexRequirements 翻链 filter 清理待复核行 + prompt.js 注入 ⚠️ 标注
- [x] task-02: complete-handlers.js——distillLinkedChangeAssets（蒸馏编排+门禁判定+linkedChanges 过滤）+ liteArchiveChange（所有权 assert/命名/rename/unregister/findAlreadyArchivedDir 自愈） (depends_on: task-01)
- [x] task-03: 接线与机械件——shared.js 钩子#1 升级 needs_review 调用 + handleQuickStageCompletion 内蒸馏/changelog 追加/classify 提示 + 全链 fail-open (depends_on: task-02)
- [x] task-04: test/quick-asset-tail.test.mjs——蒸馏尾触发/跳过/幂等/自愈 + needs_review 写读清 + changelog/classify + 全量绿 (depends_on: task-01, task-02, task-03)
