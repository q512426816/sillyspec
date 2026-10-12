---
author: flow-machine-draft
created_at: 2026-10-12T07:55:11.956Z
---
# 需求规格（Requirements）— 2026-10-12-thin-module-gate-and-feed

## 功能需求

### FR-01: 门三态：未登记目录在场裸跑 flow done 退出码 1 且不归档；登记后重跑通过；--accept-unmapped 放行且 change-patch.json 含 acceptedUnmappedDirs 计数；module_gate_ignore 命中目录不触发门；模块图缺席（绿地无图）不触发门

- 必须：模块图在场且交付面存在未登记目录（module_gate_ignore 前缀排除后非空）时，flow done 中断于 patch 子步（exit 1，change 不归档），输出登记与 --accept-unmapped 两条出路；必须支持登记后重跑通过；--accept-unmapped 放行时 change-patch.json meta.acceptedUnmappedDirs 记录缺口目录数；忽略项命中目录、模块图缺席两种形态必须不触发门；禁止在 patch 子步标记完成后重触发门（幂等续跑）。

#### 场景：主路径

Given 仓内 _module-map.yaml 只登记 src/core，变更交付 src/newdir/a.js / When 裸跑 flow done / Then exit 1 @ patch、change 仍 active、输出含未登记目录 src/newdir 与 --accept-unmapped 指引。
Given 同上，登记 src/newdir 后重跑 / Then 门不再阻断，收口归档正常。
Given 同上，带 --accept-unmapped 重跑 / Then 收口完成且 change-patch.json meta 含 acceptedUnmappedDirs: 1。
Given local.yaml module_gate_ignore 含 src/newdir / When 裸跑 flow done / Then 门不触发。
Given 仓内无任何 _module-map.yaml（绿地） / When 裸跑 flow done / Then 门不触发（reconcileModuleDocs 空面短路）。

### FR-02: 回写：命中模块的卡/sidecar 追加「| 日期 | 变更名 | 摘要 |」行；已拆卡（sidecar 在场）追加 sidecar 不动卡；重跑同变更名不重复追加；无卡无节跳过不报错；回写文件在归档后处于已暂存态

- 必须：flow done distill 子步对交付面命中的每个模块，在 sidecar（在场优先）或卡内「## 变更索引」节追加一行本变更条目（表格/列表形态按目标既有形态自适应）；必须幂等（目标文本已含变更名即跳过）；无卡且无 sidecar 的命中模块必须静默跳过不报错；回写过的文件在归档完成后必须处于 git 已暂存态（文件级 pathspec）。

#### 场景：主路径

Given 模块 m1 卡含「## 变更索引」表格节、模块 m2 已拆卡（m2.changelog.md 在场）/ When flow done 收口 / Then m1 卡节尾多一行「| <日期> | <变更名> | <摘要> |」、m2 sidecar 尾多一行、m2 卡逐字不变。
Given 同一变更名重跑回写（断点续跑形态）/ Then 两目标均不再追加（变更名去重）。
Given 模块 m3 命中但卡缺失（docMissing）/ When flow done 收口 / Then 跳过 m3、无异常退出。
Given 收口归档完成后 / When git status --porcelain / Then 回写文件处于已暂存（非 untracked/未暂存修改）态。

### FR-03: 注入：触碰命中且卡 behind>0 的模块在 flow start 注入面出现欠账事实行；空债/无图零输出；注入异常不阻断 start

- 必须：flow start 知识注入面对触碰面命中的模块输出 docs-debt behind 事实行（仅 behind>0 或卡从未提交的模块，cap 5 行）；空债/无模块图/触碰面为空时必须零输出；注入计算任何异常必须 fail-open 不阻断 start。

#### 场景：主路径

Given 模块 m1 卡落后源码 ≥1 提交且 --input 语料含 m1 paths 下文件 / When flow start / Then 注入面出现「模块卡欠账」块含 m1 与 behind 事实。
Given 命中模块卡与源码同步（behind=0）/ When flow start / Then 无欠账块。
Given renderThinDocsDebt 抛异常（构造坏 map）/ When flow start / Then start 正常完成（fail-open）。

### FR-04: 既有 flow/归档相关测试全绿，新增测试覆盖上述三档

- 必须：新增测试文件覆盖 FR-01~03 全部场景；本变更触及面的既有测试（flow/flow-parity/archive 链）必须全绿；禁止为通过测试修改既有测试的断言语义。

#### 场景：主路径

Given 实现完成 / When 运行新增测试与 flow/归档相关既有测试 / Then 全部通过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-module-gate-and-feed.test.mjs「FR-01 门三态：裸跑阻断@patch 不归档 / 登记后重跑通过 / --accept-unmapped 留痕 / ignore 命中不触发 / 绿地无图不触发」
FR-02: test/thin-module-gate-and-feed.test.mjs「FR-02 变更索引回写：表格节追加 / sidecar 优先不动卡 / 幂等去重 / 无卡跳过 / 归档后已暂存」+ test/thin-module-gate-and-feed.test.mjs「FR-02 单元：appendChangeIndexEntries 目标判定与格式自适应」
FR-03: test/thin-module-gate-and-feed.test.mjs「FR-03 注入：behind 事实行 / 空债零输出 / fail-open」
FR-04: test/thin-module-gate-and-feed.test.mjs「FR-04 既有面回归：flow done 收口链在无门触发场景零行为变化」
