---
author: flow-machine-draft
created_at: 2026-10-14T14:25:56.250Z
---
# 需求规格（Requirements）— 2026-10-14-decision-global-id-epoch

## 功能需求

### FR-01: 蒸馏写面发号：新蒸馏条目 MUST 落全局号标题 ## D-<发号域>-NNN@vN（发号域=resolveDomains 首域、sanitizeDomain 同口径；NNN=该域前缀全域扫描 max+1，只增不复用）+ 字段行「原编号：<局部号>」（位置在「变更：」后、「锚点：」前——不破「文件：紧跟锚点」既有测试红线）+ 既有「变更：」行

- decision-distill 蒸馏新条目（无同变更同号存量段）时 MUST 发全局号：标题 `## D-<域>-NNN@vN`（域=resolveDomains(entry)[0] 经 sanitizeDomain；NNN=decisions 全域扫描既有 `D-<域>-NNN` 前缀 max+1，三位补零、只增不复用）；字段 MUST 含「原编号：<局部号>」（紧跟「变更：」行之后、「锚点：」行之前）；legacy 形态段（无原编号）不补写、不改标题。

#### 场景：新条目发号

Given 全新知识库（或该域前缀 max=007）蒸馏 change X 的 D-011@v1（首域 core）
When distillIntoKnowledge
Then 落标题 `## D-core-008@v1` + 「变更：X」+「原编号：D-011@v1」

### FR-02: 幂等与单一身份：同变更同号（含版本演进 v1→v2）重蒸馏 MUST 复用已发号（匹配谓词=变更一致 且 号或原编号一致；在位更新标题版本、原编号随版本更新）；多域扇出 MUST 单一身份（同一全局号落多个域文件）；跨文件清理按同一扩展谓词

- 同变更重蒸馏 MUST 复用已发全局号（匹配谓词：段.变更==条目.变更 且 段.号==条目.局部号 或 段.原编号号段==条目.局部号）；版本演进 v1→v2 MUST 在位更新（同全局号、标题版本升 v2、原编号更新为 D-011@v2）；多域扇出条目 MUST 以同一全局号落全部目标域文件（单一身份——FR 侧「per-domain 发 N 个号违背单一身份」同款铁律）；跨文件清理谓词与匹配谓词同源扩展。

#### 场景：重蒸馏复用

Given change X 的 D-011@v1 已发 D-core-008@v1
When 重蒸馏 change X 的 D-011@v1（重放）与 D-011@v2（版本演进）
Then 重放零重复（同号只一段）；v2 在位承接 D-core-008@v2（原编号 D-011@v2），全局号不复用给他人

#### 场景：扇出单一身份

Given 条目解析域=[core, runtime]
When 蒸馏
Then core.md 与 runtime.md 各落一段且全局号相同

### FR-03: 存量零触碰：既有 legacy 形态条目（无原编号字段）MUST 不被无关蒸馏改写（真实库副本演练：蒸馏样例新条目后 legacy 节段逐字节不变）

- 既有 legacy 形态段（局部号标题、无原编号字段）MUST 不因无关条目的蒸馏被改写：真实知识库副本演练——蒸馏一个样例新条目后，其余全部节段文本逐字节不变（epoch 语义：存量不回填、不伪造历史）。

#### 场景：真实库副本演练

Given 真实知识库副本（700 legacy 节段快照）
When 蒸馏样例新条目（fresh change 目录）
Then 除新落段外全部节段与快照逐字节一致

### FR-04: 读面双形态：splitKnowledgeSections/knowledge-match（含 graph 消费）/docs-check parseDecisionEntries/doctor 计数正则 MUST 同时解析局部形态（D-011@v1）与全局形态（D-<域>-042@v1）；graph supersedes 同变更解析 MUST 支持经原编号匹配全局形态目标

- 四处读面 MUST 双形态解析：局部 `D-\d+@v\d+` 与全局 `D-<域>-\d+@v\d+`（域字符集 ASCII 与 CJK——sanitizeDomain 同口径，评审 P3 清偿）；knowledge-match 条目 MUST 读入「原编号：」字段；graph supersedes 同变更目标解析 MUST 支持 段.id==引用号 或 段.原编号==引用号（同变更限定语义不变——2026-10-14-supersedes-mislink-and-change-display 判据延续）。

#### 场景：双形态同库解析

Given 同域文件含局部形态段与全局形态段各一
When 四处读面解析
Then 两段均可见（id 各自形态），graph 节点均建立；全局段的 supersedes：D-011@v1 可经原编号解析到同变更全局段

### FR-05: 平台向量 anchor：新条目 anchor 即全局号（knowledge-vector 等值匹配语义不变；平台重建索引窗口内向量召回对新条目降级属可接受边界，代码注释如实注记）

- knowledge-vector 的 anchor 等值匹配（r.anchor===h.id）MUST 语义不变；新条目 anchor 即全局号；代码注释 MUST 如实注记平台重建索引窗口内向量召回对新形态条目降级的边界（本地词面回退不受影响）。

#### 场景：等值匹配

Given 平台召回条目 anchor=新条目全局号
When buildResultFromPlatform 匹配
Then 命中该条目（等值语义与局部形态时代一致）

### FR-06: 新增/更新测试跑绿；全量测试 + lint 绿

- 新增/更新测试 MUST 覆盖 FR-01~FR-05 断言（含受发号影响的既有测试面同步更新）；全量测试与 lint 零失败由收口实测门承担（fail-closed）。

#### 场景：收口实测

Given 交付提交完成
When flow done 实测门运行
Then 全量测试零失败且 lint 零 hard fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decision-global-id-epoch.test.mjs「① 发号与形态：全局号标题+原编号字段+域前缀 max+1 只增不复用」
FR-02: test/decision-global-id-epoch.test.mjs「② 幂等与单一身份：重蒸馏复用号、v2 在位承接、多域扇出同号、跨文件清理」
FR-03: test/decision-global-id-epoch.test.mjs「③ 存量零触碰：无关蒸馏后 legacy 节段逐字节不变（真实库副本演练）」
FR-04: test/decision-global-id-epoch.test.mjs「④ 读面双形态：三解析器+doctor 计数双形态 + graph supersedes 经原编号匹配」
FR-05: test/decision-global-id-epoch.test.mjs「⑤ 向量契约锚：等值匹配语义不变 + 平台窗口降级注记在场」
FR-06: 不适用：收口实测门承担（CLI 亲测全量测试与 lint 零失败，不在测试绑定面重复）
