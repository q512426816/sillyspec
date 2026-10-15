---
author: flow-machine-draft
created_at: 2026-10-15T09:13:21.067Z
---
# 需求规格（Requirements）— 2026-10-15-jsx-batch-cmd-chunk

## 功能需求

### FR-01: chunkByCommandLength 按「前缀+参数拼接总长」分块，maxLen 缺省 6000，单块保持原批名（零回归），多块命名 deps(auto-js|jsx:N/M)

- buildDepsBatches 必须按「命令前缀 + 参数拼接总长」对 deps(auto-js) 与 deps(auto-jsx) 批分块（maxLen 缺省 6000）；拼接总长未超限时禁止改变批名与命令（单块零回归）；超限时必须产出 deps(auto-js|jsx:N/M) 多块且跨块 count 守恒。

#### 场景：主路径

Given 优先面含 200 个 tsx 依赖测试（参数总长 ~12k）；When buildDepsBatches 组卷；Then ≥2 个 deps(auto-jsx:N/M) 批、count 总和=200、单块命令长度贴近 6000 上限。: 三件套零回归：test/dynamic-test-inference.test.mjs、test/dynamic-deps-comment-edge.test.mjs、test/residual-runner-parity.test.mjs 全绿

- 既有组卷行为必须零回归：test/dynamic-test-inference.test.mjs、test/dynamic-deps-comment-edge.test.mjs、test/residual-runner-parity.test.mjs 三件套全绿（实跑 12+8+5 通过）。

#### 场景：主路径

Given 分块补丁在场；When 运行三件套；Then 25/25 通过、零失败。: flow done 实测门（npm test + npm run lint）通过

- flow done 收口实测门（npm test + npm run lint）必须通过——触及 src/test 的改动由 CLI 亲自实测收口。

#### 场景：主路径

Given 本变更触及 src/verify-postcheck.js 与 test/；When flow done；Then npm test 与 npm run lint 全绿放行。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/dynamic-batch-chunk.test.mjs「单块零回归：拼接总长 < maxLen 时恰一个 deps(auto-jsx) 批，命令与旧拼接逐字一致」
FR-01: test/dynamic-batch-chunk.test.mjs「多块分块：拼接总长超 maxLen → deps(auto-jsx:1/N..N/N)，count 守恒且每块命令不超上限」
FR-01: test/dynamic-batch-chunk.test.mjs「js 原生批同款分块：deps(auto-js:1/N) 且 tap 标记保留」
FR-02: test/dynamic-test-inference.test.mjs（三件套零回归——实跑 12 通过；同套件覆盖组卷既有行为面）
FR-02: test/dynamic-deps-comment-edge.test.mjs（三件套零回归——实跑 8 通过）
FR-02: test/residual-runner-parity.test.mjs（三件套零回归——实跑 5 通过）
FR-03: 不适用：CLI 收口实测门本身（npm test 含本文件三用例即为承载）
