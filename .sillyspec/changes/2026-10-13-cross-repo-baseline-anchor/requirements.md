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

FR-01: test/cross-repo-baseline-anchor.test.mjs「e2e：start 记基线（首写者胜）…anchor=flow-start-baseline」（首写者胜断言在场；fail-soft=fixture 注册 deadkey 不可达路径，start 成功且「跨仓基线锚：1 个注册仓」即部分记录语义）
FR-02: 同上用例（impl.txt/fix.txt/brand-new.txt 全进 scopeAudit rows 断言）
FR-03: test/cross-repo-baseline-anchor.test.mjs「回退面：零 token 命中 → 全窗口（外来可见）；基线 sha 不可达 → 回退 B 档」（foreign.txt unplanned 断言；head~1-window 断言）
FR-04: 既有回归锚外置——test/cross-repo-patch-freeze.test.mjs 等 cross-repo 族零改动全绿（git show 交付 diff 可证零改）
FR-05: 同 FR-01/02 用例（archive change-patch.json 实读断言）
