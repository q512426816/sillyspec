---
author: flow-machine-draft
created_at: 2026-10-15T10:34:31.849Z
---
# 提案书（Proposal）— 2026-10-15-lint-triage-path-unify

## 动机

任务原话转写：lint 归属降档共享 helper——接通 noAI 质量扫描路径，消同一失败两路径行为分叉

动机与背景：消费仓坑档案 docs/sillyspec/verify-lint-triage-path-divergence.md（2026-10-15-dsh-engine-acp verify 实证）：lint 硬门的「零交集存量债 → advisory 降档」只实现在 gates.js 的 --done 拦截面；verify step6「noAI 质量扫描」（verify-quality-scan.js :800/:820）只做 shouldBlockVerifyLint 二值判定直接 throw——mypy 3 处并行变更存量债（零交集）在 step6 硬拦，被迫 SILLYSPEC_VERIFY_LINT_GATE=advisory 逃生口收口，而同失败在 --done 路径会自动降档。

做法：新建 src/run/lint-ownership.js（lintOwnershipDowngrade 共享 helper，判定+文案单一来源，importer 可注入便测）；gates.js 原内联块换 helper 调用（行为/文案等价）；verify-quality-scan.js throw 前接线（仅 lint 单独失败时降档，testFailed 优先 throw）。

成功标准：
- lintOwnershipDowngrade 语义：pre-existing→true+降档 warning；owned/unattributable/鉴定链异常→false（保守硬拦）
- gates.js 与 verify-quality-scan.js 两路径同源接线（无复制粘贴分叉）
- 新增 test/lint-ownership-path.test.mjs 覆盖 helper 四态 + 两路径源级接线断言，全绿
- flow done 实测门（npm test + npm run lint）通过

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. lintOwnershipDowngrade 语义：pre-existing→true+降档 warning；owned/unattributable/鉴定链异常→false（保守硬拦）
2. gates.js 与 verify-quality-scan.js 两路径同源接线（无复制粘贴分叉）
3. 新增 test/lint-ownership-path.test.mjs 覆盖 helper 四态 + 两路径源级接线断言，全绿
4. flow done 实测门（npm test + npm run lint）通过

## 成功标准（可验证）

1. lintOwnershipDowngrade 语义：pre-existing→true+降档 warning；owned/unattributable/鉴定链异常→false（保守硬拦）
2. gates.js 与 verify-quality-scan.js 两路径同源接线（无复制粘贴分叉）
3. 新增 test/lint-ownership-path.test.mjs 覆盖 helper 四态 + 两路径源级接线断言，全绿
4. flow done 实测门（npm test + npm run lint）通过
