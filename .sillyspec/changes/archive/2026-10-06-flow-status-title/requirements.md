---
author: flow-machine-draft
created_at: 2026-10-06T11:05:59.743Z
---
# 需求规格（Requirements）— 2026-10-06-flow-status-title

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: DB 登记过 title 的活跃变更，flow status 人类输出包含「标题：<title>」行

活跃变更的进度库（changes.title）登记了非空标题时，`sillyspec flow status --change <名>` 的人类可读输出必须紧随变更名行显示「   标题：<title>」一行；标题文本必须与进度库登记值逐字一致。

#### 场景：主路径

Given 临时仓的进度库以 initChange/updateChangeMeta 登记了变更 X 的 title="中文标题"
When 执行 flow status --change X（不带 --json）
Then 输出首行为「📋 X」且下一非空行为「   标题：中文标题」

### FR-02: flow status --json 输出增加 title 字段（无记录时为 null）

`flow status --json` 的单对象输出必须包含 `title` 字段：进度库登记了非空标题时为其逐字值，否则为 null；既有九字段必须原样保留。

#### 场景：主路径

Given 变更 X 活跃且 title 已登记
When 执行 flow status --change X --json
Then stdout 单行 JSON 解析后 title === 登记值，且既有九字段全部在场

### FR-03: 无 DB 或无 title 时输出与现状一致（不新增标题行，json 里 title=null）

进度库文件缺失、库中无该变更行、或行上 title 为空/NULL 时：人类输出必须禁止新增任何标题行（与现状逐字一致）；--json 输出的 title 必须为 null。查询路径必须禁止为只读 status 创建新的进度库文件（无 DB 不落 DB）。

#### 场景：无 DB

Given 临时仓只有变更目录（无 sillyspec.db）
When 执行 flow status --change X
Then 输出不含「标题：」行，且磁盘上仍无 sillyspec.db 被 status 新建

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-status-title.test.mjs「人类输出显示标题行（登记 title 时）」
FR-02: test/flow-status-title.test.mjs「--json 输出 title 字段（有值与 null 两态）」
FR-03: test/flow-status-title.test.mjs「无 DB/无 title 不新增标题行且不新建 DB」
