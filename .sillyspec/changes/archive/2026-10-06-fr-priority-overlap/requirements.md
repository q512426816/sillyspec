---
author: flow-machine-draft
created_at: 2026-10-06T11:43:21.792Z
---
# 需求规格（Requirements）— 2026-10-06-fr-priority-overlap

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: runModuleSubset 的 priorityFiles 传全量 FR 绑定文件（fr.files），与 deps 重叠的绑定文件不再被帽弃（fixture：绑定文件同时在 import 依赖面内、字母序最末，修复后必入执行批）

runModuleSubset 调 buildDepsBatches 时 priorityFiles 必须传全量 FR 绑定文件（fr.files，不论与 deps 是否重叠）；与 import 依赖面重叠的绑定文件必须获得与新增绑定文件同级的优先权，禁止因「已在 deps 内」被降为普通依赖受帽弃置。

#### 场景：重叠绑定

Given fixture：src/lib.js 为变更源文件；test/zz-bound.test.mjs 同时是 FR 绑定文件与 import 依赖（imports src/lib.js，字母序最末）；另有 40 个普通依赖测试
When 调 runModuleSubset（changedFiles=[src/lib.js]）
Then 执行批命令包含 test/zz-bound.test.mjs（修复前字母序最末被 30 帽弃置）

### FR-02: 并集去重与批计数语义不变（depsAll 构造照旧；披露标签如实反映实跑数）

depsAll 的并集去重构造必须保持现状（[...new Set([...deps, ...frLinked])]——重叠文件只计一次）；披露标签（deps(js N) / fr(M)）必须如实反映实跑数与绑定面数；fr 为空/索引缺失时 depsAll 与批行为必须与现状逐字一致。

#### 场景：主路径

Given 重叠 fixture
When runModuleSubset 执行
Then 披露标签如实反映实跑与绑定面：帽内时 deps(js N) 的 N=帽值（绑定文件占帽内席位而非加帽）、优先面超帽时 N>帽值；绑定文件禁止被计入弃置数；fr(M)=绑定面文件数

### FR-03: 直测覆盖重叠形态（绑定文件 ∈ deps）：修复后该文件在执行命令中；无 FR 索引/零绑定时行为与现状一致

本变更必须自带直测：① 重叠形态——绑定文件同时在 import 依赖面内且字母序最末，修复后必须出现在执行批命令中且结果 passed；② 无 FR 索引/零绑定 fixture 的批行为与现状一致（纯字母序配额帽）。

#### 场景：主路径

Given ①② 两组 fixture
When 直测 runModuleSubset
Then 两组断言全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-priority-overlap.test.mjs「① 重叠形态：绑定文件 ∈ deps 且字母序最末 → 必入执行批（修复前被 30 帽弃置）」
FR-02: test/fr-priority-overlap.test.mjs「① 重叠形态（标签 deps(js30)+fr(1) 如实断言）」＋「② 无 FR 索引：纯字母序配额帽行为现状一致」
FR-03: test/fr-priority-overlap.test.mjs「① 重叠形态」＋「② 无 FR 索引」
