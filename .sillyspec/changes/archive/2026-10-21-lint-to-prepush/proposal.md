---
author: flow-machine-draft
created_at: 2026-10-21T12:14:13.558Z
---
# 提案书（Proposal）— 2026-10-21-lint-to-prepush

## 动机

任务原话转写：收口 lint 移交 pre-push/CI 门
用户选定 A 案：flow done 收口不再跑 lint。依据：.husky/pre-push 已每次推送跑 npm run lint + docs gate（2026-10-16 全量测试已移交 CI），收口侧 50.6s 全仓 lint 对变更面零感知、是同命令第二遍。做法：local.yaml commands.lint 标 unavailable（CLI 既有标记，收口跳过并留痕理由，src 零改动）；AGENTS.md 与 templates/agents-instruction.md 规则 4 措辞同步补 unavailable 语义（两文件规则 4 被测试逐字钉着，必须同改，测试 KEY 句随之更新）；CLAUDE.md 旧文案 lint 句同步。

成功标准：
- local.yaml 标 unavailable 后 flow done 收口 lint 子步 skipped 且理由可见
- .husky/pre-push 零改动（仍跑 npm run lint + docs gate）
- AGENTS.md 与模板规则 4 保持逐字一致且措辞含 unavailable 跳过语义，test-runner-failed-face.test.mjs ③ 更新后绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. local.yaml 标 unavailable 后 flow done 收口 lint 子步 skipped 且理由可见
2. .husky/pre-push 零改动（仍跑 npm run lint + docs gate）
3. AGENTS.md 与模板规则 4 保持逐字一致且措辞含 unavailable 跳过语义，test-runner-failed-face.test.mjs ③ 更新后绿

## 成功标准（可验证）

1. local.yaml 标 unavailable 后 flow done 收口 lint 子步 skipped 且理由可见
2. .husky/pre-push 零改动（仍跑 npm run lint + docs gate）
3. AGENTS.md 与模板规则 4 保持逐字一致且措辞含 unavailable 跳过语义，test-runner-failed-face.test.mjs ③ 更新后绿
