---
author: flow-machine-draft
created_at: 2026-10-12T14:53:07.330Z
---
# 需求规格（Requirements）— 2026-10-12-verify-handover-hint

## 功能需求

### FR-01: stage-contract.js 覆盖不足报错（约 1305 行）：「不适用端点改 non-testable 并写一句理由」处扩展点名移交场景（构建回执+移交去向写法、该行不计入分母）

- 覆盖不足报错的 non-testable 指引处**必须**扩展点名运行验证移交场景：构建级验证已过、运行冒烟移交部署后执行——理由写构建回执+移交去向，该行不计入有效分母。既有报错前缀与钉死测试断言的子串（「接口验证覆盖矩阵覆盖不足」「non-testable」）**禁止**变化。

#### 场景：主路径

Given 矩阵覆盖不足报错触发；When 读 errors；Then non-testable 指引句含「移交」场景写法（构建回执/移交去向/不计入分母三要素至少两项）。

### FR-02: stage-contract.js 证据缺失报错（约 985 行）：修复句的 non-testable 理由处补同一场景括注

- 证据缺失报错的修复句「或 non-testable 理由」处**必须**补移交场景括注（运行验证移交适用：构建回执+移交去向）。钉死子串（`.test.` / file:line / non-testable）**禁止**变化。

#### 场景：主路径

When 证据缺失报错触发；Then 修复句含移交场景括注。

### FR-03: verify-probes.js 矩阵骨架口径注记：枚举说明后补 non-testable 移交场景适用句（预填前 agent 可见）

- renderApiCoverageMatrixLines 的口径注记**必须**在枚举说明后追加一句：non-testable 适用于运行验证移交场景（构建级验证已过、冒烟移交部署后——证据写构建回执与移交去向，行不计入有效分母）。无测试逐字钉死该注释行（已核：测试夹具用自占位注释）。

#### 场景：主路径

When 矩阵骨架渲染；Then 口径注记含移交场景句。

### FR-04: 三处均为纯文案追加：门判定/白名单/算式/锚点校验零变化；既有钉死测试断言的子串全部保留

- 三处改动**必须**为纯文案追加/括注：MATRIX_VERDICT_WHITELIST、分子分母算式、锚点校验、退出码**禁止**任何变化；矩阵相关回归族（api-coverage-matrix、acceptance-matrix-gate、acceptance-matrix-probe、verify-probes、contract-matrix、stage-contract）**必须**全绿。

#### 场景：零判定变化

When 对照 git diff；Then 仅三处字符串追加，无逻辑行改动；六族回归全绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/api-coverage-matrix.test.mjs「覆盖不足报错回归（含新场景句后既有断言全绿）」
FR-02: test/acceptance-matrix-gate.test.mjs「证据缺失报错三口径指引回归（钉死子串保留）」
FR-03: test/verify-probes.test.mjs「矩阵骨架渲染回归（口径注记在场）」
FR-04: test/api-coverage-matrix.test.mjs 等「六族回归全绿 = 零判定变化的行为级证据」
