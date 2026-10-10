---
author: flow-machine-draft
created_at: 2026-10-10T07:28:13.220Z
---
# 提案书（Proposal）— 2026-10-10-dyn-subset-nontest-runner-face

## 动机

任务原话转写：平台侧（multi-agent-platform，2026-10-10-repo-native-no-platform-markers 收口）实证：动态测试子集把 TS 源码 sillyhub-daemon/src/spec-sync.ts 归入 deps(auto-js) 批用 node --test 直跑，ERR_MODULE_NOT_FOUND 假败阻断收口，被迫 known_failures 锚定豁免绕过（坑 docs/sillyspec/verify-dynamic-subset-node-test-ts-source.md）。

根因三道防线全破（已重放实证）：① 生产侧 verify-probes isProbe7TestPath 的 /spec/i 裸子串匹配——文件名任何位置含 spec 字样即判测试路径，2026-10-09-workspace-init-skill-gate task-01 卡 allowed_paths 里的源码 spec-sync.ts 被误绑进 FR 测试绑定行（discovery: machine）；② FR 关联回归读侧（collectFrLinkedTests→runModuleSubset）对绑定文件无测试形态校验；③ buildDepsBatches 对非测试形态文件无兜底——非 .py、非 tsx/jsx、内容不 import vitest/jest 即进 jsNative 批 node --test 直跑（node --test 语义文件即测试，源码必败；pytest 批同理 0 collected exit 5 假败）。

成功标准：
- isTestFilePath 锚定口径统一：isProbe7TestPath 不再把 spec-sync.ts / respec.ts 等无测试后缀锚定的源码判为测试路径；.test./.spec. 后缀与 tests?/ 目录、test_*.py/*_test.py 照常命中（run-sillyspec-init.test.ts 仍 true）
- buildDepsBatches 执行侧兜底：非测试形态的 js/py 文件不进 node --test / pytest 执行批，改 skip 批 loud 披露（复用 run-tests.mjs skip 先例，不静默丢弃）
- 新增钉行为测试 + 既有测试面全绿（收口实测门本变更自证）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. isTestFilePath 锚定口径统一：isProbe7TestPath 不再把 spec-sync.ts / respec.ts 等无测试后缀锚定的源码判为测试路径；.test./.spec. 后缀与 tests?/ 目录、test_*.py/*_test.py 照常命中（run-sillyspec-init.test.ts 仍 true）
2. buildDepsBatches 执行侧兜底：非测试形态的 js/py 文件不进 node --test / pytest 执行批，改 skip 批 loud 披露（复用 run-tests.mjs skip 先例，不静默丢弃）
3. 新增钉行为测试 + 既有测试面全绿（收口实测门本变更自证）

## 成功标准（可验证）

1. isTestFilePath 锚定口径统一：isProbe7TestPath 不再把 spec-sync.ts / respec.ts 等无测试后缀锚定的源码判为测试路径；.test./.spec. 后缀与 tests?/ 目录、test_*.py/*_test.py 照常命中（run-sillyspec-init.test.ts 仍 true）
2. buildDepsBatches 执行侧兜底：非测试形态的 js/py 文件不进 node --test / pytest 执行批，改 skip 批 loud 披露（复用 run-tests.mjs skip 先例，不静默丢弃）
3. 新增钉行为测试 + 既有测试面全绿（收口实测门本变更自证）
