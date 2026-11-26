---
author: flow-machine-draft
created_at: 2026-11-11T04:55:01.365Z
---
# 任务注册表（Tasks）— 2026-11-11-deps-hub-symbol-narrow

- [x] task-01: 新建 src/deps-symbol-narrow.js 纯函数 extractTouchedExports（export 声明 span×diff hunk 交集 + 差异行导出名词法）与 namedImportEvidence（hit/miss/unknown 三态），配单测跑绿（test/deps-symbol-narrow.test.mjs）
- [x] task-02: discoverModuleDependentTests 接线两阶段判定（touchedExportSymbols/hubMinDependents 参数；命中数>阈值文件经 namedImportEvidence 裁决 miss 出面），fixture 测试覆盖 FR-01 收敛/FR-02 保持/FR-03 fail-open 三态/FR-04 参数缺省零回归
- [x] task-03: collectTouchedExportSymbols 收集器（flow-state baseline_commit 直锚 + 脏面∪提交面 diff + untracked 全触达，失败返回 null）+ 三调用点接线（verify-postcheck.js:2490/:3811、index.js:1078，fail-soft 回落）
- [x] task-04: 既有 deps 推断相关测试零改动回归跑绿（dynamic-test-inference / dynamic-deps-comment-edge / deps-cwd-prefix / verify-deps-auto-default / deps-batch-runner-flags）
