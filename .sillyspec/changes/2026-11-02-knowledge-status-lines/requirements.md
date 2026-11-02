---
author: flow-machine-draft
created_at: 2026-11-02T12:30:00.000Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-status-lines

## 功能需求

### FR-01: 状态行：本仓 known-issues.md 53 条 heading 全部标注一行「- 状态：现行|已修复|已解决|已退役|观察|债务」（固定六值词表），放首段说明之后；heading/标题词/INDEX 全不动；判据=emoji+标题词+正文语义启发式，先出建议清单再落盘

本仓 known-issues.md 的全部条目 heading（53 条，含 5 条未路由条照标——数据完整性优先）必须各加一行「- 状态：<词表值>」，词表固定六值（现行/已修复/已解决/已退役/观察/债务）；状态行必须放条目首段说明之后（不紧贴 heading）；heading、标题词、INDEX 全不动；标注判据为 emoji+标题词+正文语义启发式，必须先输出建议清单（heading→建议状态→判据）人工复核后再落盘。

#### 场景：词表约束

Given 某条建议状态不在六值词表
When 落盘
Then 拒绝写入（词表外值必须人工改判）

### FR-02: 平台 48 条：只出建议清单（heading→建议状态→判据）不写入

平台仓 known-issues 的条目必须只读生成建议清单（含判据），禁止写入平台仓任何文件。

#### 场景：跨仓零写

Given 平台 known-issues.md
When 生成建议
When 输出清单文件；平台仓文件 hash 前后一致

### FR-03: decisions/unmapped 头注加一行「本池条目为检索面-only 停车场（语义等价 draft/exclude）」自描述（不加字段行）

decisions/unmapped.md 头注必须加一行自描述（检索面-only 停车场语义）；禁止修改任何条目的「状态：」字段行（docs-check 机械解析契约 + producer=decision-distill 勿手改）。

#### 场景：字段行不动

Given 条目已有「状态：implemented」字段行
When 本变更
Then 该行原样保留（仅头注加行）

### FR-04: fr/unmapped 头注「残余 625 条」修正为实际（2 条）并更新治理注记

fr/unmapped.md 头注的残余计数必须修正为当前实际（段头实测），治理注记同步更新（2026-11-02-knowledge-redomain-map 裁剪 208 条后）。

#### 场景：数字与实测一致

Given fr/unmapped.md 当前段头数为 2
When 修正头注
Then 注记数字 = 2

### FR-05: 验收：knowledge validate 零新增告警 + docs-check 零回归 + eval 六探针五面零回归 + 既有 knowledge-rank-denoise 测试绿（isResolvedRoute 不变性）

验收必须全绿：knowledge validate 零新增告警（重点 anchor_drift/broken_reference）、docs-check 零回归、eval 六探针 GREEN 五面零回归、既有 knowledge-rank-denoise 测试绿（isResolvedRoute 行为不变性守护）。

#### 场景：isResolvedRoute 不变

Given 状态行落盘后
When 跑 test/knowledge-rank-denoise.test.mjs 与 eval
Then 全绿零回归（读取逻辑只看 INDEX，正文状态行零行为影响）

### FR-06: 测试：不适用——纯数据标注（验收靠 validate/docs-check/eval 零回归）

本变更为纯数据标注，禁止为纯文档行新增编写测试；验收必须依靠 validate/docs-check/eval 零回归与既有测试全绿。

#### 场景：不适用留痕

Given AGENTS.md 规则「纯配置/文档不写测试」
When spec 填写
Then 测试绑定记「不适用：理由」

## 测试绑定（每条 FR 至少一行——「FR-NN: test/路径「用例名」」；空行/待填在 flow done 拒收）

FR-01: 不适用：纯数据标注（known-issues 正文行，验收=validate/eval 零回归）
FR-02: 不适用：平台只读清单（零写入断言内嵌脚本）
FR-03: 不适用：头注一行自描述（无行为面）
FR-04: 不适用：头注数字修正（无行为面）
FR-05: test/knowledge-rank-denoise.test.mjs「isResolvedRoute 不变性」（既有测试零回归即验收）
FR-06: 不适用：本条即不适用声明自身
