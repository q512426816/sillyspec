---
author: flow-machine-draft
created_at: 2026-10-13T07:49:56.024Z
---
# 需求规格（Requirements）— 2026-10-13-flow-diff-cmd

## 功能需求

### FR-01: flow diff --change <归档名> 渲染归档件逐文件 +N/-M 与 totals（含 verdict 列），--json 输出同构结构

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: flow diff --change <活跃名> 实时计算：已提交交付面（baseline..HEAD 经 filterCommittedFace 冻结面口径）+ 未提交交付面（工作树 vs HEAD，untracked 按行数、二进制 null）+ 合计

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 变更不存在 → exit 1 且修复路径一次给全；无 git 基线 → 显式提示 exit 0；变更名走既有白名单校验

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: 只读零副作用：不 pull/不写盘/不改 flow-state（与 scan diff 同纪律）

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 既有回归零改动全绿；flow 族 usage 行补 diff

- - 系统 MUST 达成该条标准行为（协议夹具行为句）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-diff-cmd.test.mjs「归档态：读 scopeAudit 渲染逐文件 +N/-M 与 totals（含 verdict），--json 同构」
FR-02: test/flow-diff-cmd.test.mjs「活跃态：提交面+dirty 面双段渲染，untracked 计行数，治理件剔除断言」
FR-03: test/flow-diff-cmd.test.mjs「变更不存在 exit 1 一次给全 + 无基线 exit 0 + 非法名白名单拒收」
FR-04: test/flow-diff-cmd.test.mjs「只读零副作用：调用前后 flow-state/工作树/git status 字节不变」
FR-05: test/flow-protocol.test.mjs 等既有 flow 族回归零改动全绿（usage 行含 diff 断言在 flow-diff-cmd 内）
