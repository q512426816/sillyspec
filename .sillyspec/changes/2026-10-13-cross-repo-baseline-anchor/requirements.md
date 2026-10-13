---
author: flow-machine-draft
created_at: 2026-10-13T15:09:24.834Z
---
# 需求规格（Requirements）— 2026-10-13-cross-repo-baseline-anchor

## 功能需求

### FR-01: flow start 在注册仓可达时把各仓 HEAD 记入 flow-state cross_baselines（首写者胜：重入不刷新；仓不可达/非 git fail-soft 跳过该仓不阻断 start）

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 收口对账 3c 档生效：跨仓多笔交付（两笔提交）全部进对账面（多提交盲区消除）；anchor.source 为 flow-start-baseline

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: token 归因：窗口内不含变更名的外来提交被剔除（不出现在 rows）；零 token 命中回退全窗口（外来文件可见为 unplanned）

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: 基线 sha 在跨仓不可达（rev-parse --verify 失败）回退既有 B 档；既有 A/B'/B/C 档行为零回归（cross-repo 既有测试零改动全绿）

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: e2e：注册跨仓的变更两笔交付+untracked 收口，scopeAudit 跨仓行覆盖全部交付文件、repos[] 锚点为 flow-start-baseline

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/cross-repo-baseline-anchor.test.mjs「start 记 cross_baselines（首写者胜+fail-soft）」
FR-02: test/cross-repo-baseline-anchor.test.mjs「两笔交付全进对账面+anchor=flow-start-baseline」
FR-03: test/cross-repo-baseline-anchor.test.mjs「外来提交 token 剔除/零命中回退全窗口 unplanned 可见」
FR-04: test/cross-repo-baseline-anchor.test.mjs「既有档位零回归（cross-repo 既有测试零改动全绿）」
FR-05: test/cross-repo-baseline-anchor.test.mjs「e2e 注册跨仓两笔+untracked 收口 scopeAudit 全覆盖」
