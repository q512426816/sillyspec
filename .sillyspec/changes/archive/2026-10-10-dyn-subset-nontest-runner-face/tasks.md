---
author: flow-machine-draft
created_at: 2026-10-10T07:28:13.220Z
---
# 任务注册表（Tasks）— 2026-10-10-dyn-subset-nontest-runner-face

- [x] task-01: 收紧 isProbe7TestPath（src/verify-probes.js:1765）为锚定口径——`(^|/)tests?/` 目录前缀 ∪ `\.(test|spec)\.[cm]?(js|jsx|ts|tsx)$` 后缀 ∪ `test_*.py`/`*_test.py`；函数导出供直测。验证：node --test test/probe7-testpath-anchor.test.mjs 绿（spec-sync.ts false、run-sillyspec-init.test.ts true）
- [x] task-02: buildDepsBatches（src/verify-postcheck.js）非测试形态拆批——jsRun/pyRun 过滤非测试形态进 `deps(auto-nontest-skip)` skip 批（command null、files 点名、reason 披露），jsNative/py 执行批不含被拆文件。验证：node --test test/dynamic-test-inference.test.mjs 新增用例绿
- [x] task-03: 新增 test/probe7-testpath-anchor.test.mjs 边界表（误判样本：spec-sync.ts/respec.ts/spec_sync-utils.ts；合法样本：.test.tsx/test_x.py/tests/ 目录/.spec.mjs）+ dynamic-test-inference 增拆批用例。验证：两文件绿
- [x] task-04: 既有测试面回归（verify-probes / verify-postcheck / module-subset / residual-runner-parity / thin-done-dirty-gate / fr-regress-cap-drop / deps-cwd-prefix 等 buildDepsBatches 与探针 7 消费面）。验证：全绿，无消费面行为漂移
- [x] task-05: 显式 pathspec 提交交付文件（src 2 件 + test 2 件 + tasks.md），flow done 收口（实测门自证）
