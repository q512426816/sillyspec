---
author: flow-machine-draft
created_at: 2026-10-10T07:28:13.220Z
---
# 需求规格（Requirements）— 2026-10-10-dyn-subset-nontest-runner-face

## 功能需求

### FR-01: isTestFilePath 锚定口径统一：isProbe7TestPath 不再把 spec-sync.ts / respec.ts 等无测试后缀锚定的源码判为测试路径；.test./.spec. 后缀与 tests?/ 目录、test_*.py/*_test.py 照常命中（run-sillyspec-init.test.ts 仍 true）

探针 7 的测试路径判定（isProbe7TestPath）必须使用后缀/目录锚定口径：文件名命中 `\.(test|spec)\.[cm]?(js|jsx|ts|tsx)` 后缀、路径命中 `(^|/)tests?/` 目录前缀、或 Python 侧 `test_*.py` / `*_test.py` 形态才算测试路径；禁止裸子串匹配（旧 `/spec/i.test(name)` 把文件名任何位置含 "spec" 字样的源码——如 `spec-sync.ts`、`respec.ts`——误判为测试路径并写进 FR 机器绑定行）。

#### 场景：源码文件名含 spec 字样不误判

- Given 任务卡 allowed_paths 同时声明源码 `sillyhub-daemon/src/spec-sync.ts` 与测试 `sillyhub-daemon/tests/run-sillyspec-init.test.ts`
- When verify 探针 7 构建验收×测试归属矩阵
- Then `spec-sync.ts` 不计入 testFiles（不落 trace 绑定行），`run-sillyspec-init.test.ts` 照常计入

#### 场景：合法测试形态照常命中

- Given 路径 `frontend/src/components/card.test.tsx`、`backend/app/tests/test_claim.py`、`tests/util.spec.mjs`
- When isProbe7TestPath 判定
- Then 均判 true（收紧不伤正常预填面）

### FR-02: buildDepsBatches 执行侧兜底：非测试形态的 js/py 文件不进 node --test / pytest 执行批，改 skip 批 loud 披露（复用 run-tests.mjs skip 先例，不静默丢弃）

动态子集组卷（buildDepsBatches）必须对进入执行批的文件做测试形态校验：非测试形态的 js/ts 文件禁止排进 `node --test` 批（node --test 语义「文件即测试」，源码直跑必败），非 `test_*.py`/`*_test.py` 的 py 文件禁止排进 pytest 批（0 collected exit 5 假败）；被拦文件必须以 skip 批点名披露（不静默丢弃、不拦门），让「FR 绑定面混入非测试文件」可见可治理。

#### 场景：FR 绑定面混入源码不进执行批

- Given FR 关联回归把绑定文件 `sillyhub-daemon/src/spec-sync.ts`（源码，存量脏绑定）并入 deps 面
- When buildDepsBatches 组卷
- Then jsNative（node --test）批不含该文件；出现非测试形态 skip 批点名披露该文件；实测门不为它失败

#### 场景：正常测试文件组卷不受影响

- Given deps 面为 `a.test.ts`、`test_x.py` 等测试形态文件
- When buildDepsBatches 组卷
- Then 批组成与现状一致（jsNative / py 批照旧、计数口径不变）

### FR-03: 新增钉行为测试 + 既有测试面全绿（收口实测门本变更自证）

本变更必须以直测钉住两处新行为：isProbe7TestPath 锚定口径（误判样本 false / 合法样本 true 边界表）与 buildDepsBatches 非测试形态拆批（skip 批在场 + 执行批不含）；且既有测试面（verify-probes / verify-postcheck / dynamic-test-inference / residual-runner-parity 等）必须全绿——修复不得改变其他消费面行为。

#### 场景：收口实测门自证

- Given 本变更触及 src/verify-probes.js 与 src/verify-postcheck.js
- When flow done 收口实测
- Then 动态子集实测面（本变更测试 ∪ FR 关联回归 ∪ import 依赖）全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/probe7-testpath-anchor.test.mjs「源码文件名含 spec 字样不误判」
FR-01: test/probe7-testpath-anchor.test.mjs「合法测试形态照常命中」
FR-02: test/dynamic-test-inference.test.mjs「buildDepsBatches：非测试形态文件拆 skip 批不进 node --test / pytest 执行批」
FR-03: test/probe7-testpath-anchor.test.mjs「isProbe7TestPath 边界表全量」
