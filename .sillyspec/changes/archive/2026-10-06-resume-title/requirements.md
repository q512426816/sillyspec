---
author: flow-machine-draft
created_at: 2026-10-06T11:32:00.197Z
---
# 需求规格（Requirements）— 2026-10-06-resume-title

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: DB 登记过非空 title 的活跃变更重入 flow start，恢复简报在「🔁 flow start 恢复简报（重入）」行后显示「- 标题：<title>」行，文本与进度库登记值逐字一致

活跃变更重入 `sillyspec flow start --change <名>` 时，恢复简报必须在头两行（标题行与分隔线）之后、首条「做到哪」之前显示「- 标题：<title>」一行；标题文本必须与进度库 changes.title 登记值逐字一致。

#### 场景：主路径

Given 临时仓的活跃变更 X（flow-state 在场）且进度库登记 title="中文标题"
When 重入执行 flow start --change X（不带 --input）
Then 输出含「🔁 flow start 恢复简报（重入）」行，其后出现「- 标题：中文标题」行且先于「- 做到哪」行

### FR-02: 无 DB/无 title 时恢复简报与现状逐字一致（不新增标题行）

进度库文件缺失或行上 title 为空/NULL 时：恢复简报必须禁止新增任何标题行（与现状输出逐字一致）；标题读取必须沿用只读容错语义（读取器自身不建库——该性质由 test/flow-status-title.test.mjs ③ 钉住；恢复路径既有 title 补写块的建库副作用是存量行为，非本变更面）。

#### 场景：无 DB

Given 临时仓的活跃变更 X（无 sillyspec.db）
When 重入执行 flow start --change X
Then 恢复简报不含「标题：」行（读取器只读性由 flow-status-title 回归钉住）

### FR-03: 标题读取复用 getChangeTitle 单源（不另开读取路径）

恢复简报的标题读取必须复用 ProgressManager.getChangeTitle（2026-10-06-flow-status-title 建立的唯一只读访问器），禁止在 flow.js 内另开 SQL/直读读取路径；读取失败按无标题渲染（best-effort 不阻断恢复简报）。

#### 场景：主路径

Given flow.js 恢复路径代码
When 静态审查
Then 标题来源唯一（getChangeTitle 调用），无第二读取实现

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-resume-title.test.mjs「恢复简报显示标题行（登记 title 时）」
FR-02: test/flow-resume-title.test.mjs「无 DB 不新增标题行且不新建 DB」
FR-03: test/flow-resume-title.test.mjs「读取单源（getChangeTitle 调用面静态断言）」
