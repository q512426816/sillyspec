---
author: flow-machine-draft
created_at: 2026-10-22T17:10:34.488Z
---
# 需求规格（Requirements）— 2026-10-23-flow-done-preflight

## 功能需求

### FR-01: 实测门前只读收口预检（fail-together 一次报全）

- flow done 必须在实测门（runQuickTestLintGate）之前运行只读收口预检：dirty-gap 预判（与 patch 子步同源判定链 filterCommittedFace+collectFreezeFiles，只读不落盘）＋独占 worktree 孤儿面预判（scanOrphanFace 只读）——命中任一阻断条件时必须把全部条件与处置出路一次打印后 exit 1，实测禁止启动，禁止写任何子步完成标记（批准后实现期裁剪：review.json schema 预验经三路分析不做——见 design 放弃项）。

#### 场景：dirty 命中预检拦截

Given 共享主仓存在未提交交付文件（collectFreezeFiles dirtyWarned 非空）且未带处置旗标；When 运行 flow done；Then 在实测门之前输出全部阻断条件（缺口清单+三选一处置）后 exit 1，输出无「开始 test+lint 实测」与「实测面对账」行（实测未启动），flow-state 无 ledger/patch 完成标记。

#### 场景：处置旗标镜像放行

Given 同上缺口但重跑带 --accept-dirty-gap；When 运行 flow done；Then 预检不拦、实测照常启动，patch 子步权威门复核并留痕 acceptedDirtyGap。

### FR-02: 预检与权威门同判定同源、全过静默

- 预检必须镜像 patch 子步的旗标语义（turbo 下 dirty 缺口降 advisory 不拦、--freeze-dirty/--accept-dirty-gap/--accept-orphan-face 在场即不拦）与守卫（baseline 缺席跳过 dirty/orphan 预判、patch 子步已 done 跳过 dirty/orphan 预判）——预检禁止放行任何权威门会拦的面、禁止拦截任何权威门会放行的面；全部通过时必须零额外输出、既有 8 子步与标记零变化；预检内部异常必须 fail-safe 静默放行（权威门仍在原子步原序原判定）。

#### 场景：断点续不误拦

Given 首轮 dirty 拦截后带处置旗标重跑通过且 patch 子步完成；When 后续重跑（无旗标）；Then 预检因 patch 子步已 done 跳过 dirty 预判，不重复拦截。

#### 场景：turbo 镜像

Given turbo 在场且 dirty 缺口在场；When 预检运行；Then 不产 dirty-gap finding（权威门 turbo 路径同款降 advisory）。

### FR-03: 处置后重走既有断点续语义

- 预检拦截后的处置（提交文件 / --freeze-dirty / --accept-dirty-gap / --accept-orphan-face）必须走既有断点续语义：已完成子步幂等跳过，patch 权威门照常复核同源判定并留痕。

#### 场景：处置后放行

Given 预检拦 dirty 后重跑带 --accept-dirty-gap；Then 预检通过、实测照常启动、收口完成且 change-patch.json 留痕 acceptedDirtyGap。

### FR-04: e2e+unit 测试锁行为

- 新增测试必须覆盖：dirty 命中（实测未启动+一次报全+零子步标记）、--accept-dirty-gap 放行完成收口、干净面全过预检静默（输出与既有形态一致），以及 unit 直调镜像守卫（patch done/turbo/--freeze-dirty 三态不产 finding）。

#### 场景：测试矩阵

Given temp 仓与直调各场景；When 分别执行；Then 断言如上各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-done-preflight.test.mjs「①dirty 命中实测未启动+一次报全」「②--accept-dirty-gap 镜像放行完成收口」
FR-02: test/flow-done-preflight.test.mjs「③unit 镜像守卫（patchDone/turbo/freezeDirty 不拦）」「④干净面全过预检静默」
FR-03: test/flow-done-preflight.test.mjs「②--accept-dirty-gap 镜像放行完成收口」
FR-04: test/flow-done-preflight.test.mjs「①-④」
