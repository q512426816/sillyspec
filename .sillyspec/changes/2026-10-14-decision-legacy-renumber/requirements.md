---
author: flow-machine-draft
created_at: 2026-10-14T15:33:12.787Z
---
# 需求规格（Requirements）— 2026-10-14-decision-legacy-renumber

## 功能需求

### FR-01: 迁移 CLI（sillyspec knowledge renumber）：--dry-run 输出迁移计划（总号数/fanout 收敛组数/无变更条目数/各域号段起点），--apply 执行重写——legacy 节段标题改 D-<域>-NNN@vN（域=所在文件名；fanout 组=同变更同号跨文件副本取字母序首文件域、全组同号；无变更行条目逐节独立发号不分组）、「原编号：<旧号>」插入变更行后（无变更行则状态行后）、其余行逐字节保留、节段次序不变；epoch 形态节段零触碰；各域发号从全域既有 epoch 号 max+1 起

- `sillyspec knowledge renumber` MUST 提供两档：--dry-run 输出迁移计划（各域号段起点、总迁移号数、fanout 收敛组数、无变更条目计数、零触碰 epoch 节段数），--apply 执行重写。重写规则：legacy 节段（局部号标题且无原编号字段）标题 MUST 改为 `D-<域>-NNN@vN`（域=所在文件名去 .md；同变更同号跨文件副本为 fanout 组——取字母序首文件域、全组共用一号；无变更行的条目逐节独立发号不分组）；`原编号：<旧局部号>` MUST 插入变更行后（无变更行则状态行后）；节段其余行与次序 MUST 逐字节保留；epoch 形态节段（全局号标题或已有原编号）MUST 零触碰；各域发号 MUST 从全域既有 epoch 号 max+1 起、批内递增。

#### 场景：dry-run 计划对账

Given 真实知识库（701 legacy 节段、75 fanout 组、1 epoch 节段）
When knowledge renumber --dry-run
Then 计划输出迁移号数 597（701−179 副本+75 组号）、epoch 零触碰、各域起点=该域既有 epoch max+1

#### 场景：fanout 单一身份

Given 同变更同号条目分布于 alpha.md 与 beta.md
When --apply
Then 两副本标题同为 D-alpha-NNN@vN（字母序首文件域），原编号均为旧局部号

### FR-02: 幂等与安全：--apply 重跑零变化（原编号在场的节段不再迁移）；计划与重写分离为纯函数；真实库执行走 dry-run 先行（计划数与实测底数对账 701→≈597）

- 迁移核心 MUST 为纯函数（计划计算 planRenumber 与重写 applyRenumberPlan 分离，零 fs 副作用、可单测）；--apply 重跑 MUST 零变化（判定面=节段有原编号字段或全局号标题即不再迁移）；真实库执行 MUST dry-run 先行且计划数与底数对账（701 legacy → 597 号）；重写 MUST 走原子写。

#### 场景：重跑幂等

Given 已 --apply 的知识库
When 再次 --apply
Then 全部文件零字节变化，退出码 0

### FR-03: 兼容：docs-check isDecisionExempt 认原编号（消费仓旧裸键 decisions.D-002@vN 迁移后仍命中）；迁移后 parseDecisionEntries 全节段可见、graph 构建正常、doctor 计数=节段总数

- isDecisionExempt MUST 扩展：豁免键匹配同时认条目当前 id 与原编号（消费仓既有 decisions.D-002@vN 裸键在条目迁移为全局号后仍命中——docs-check 解析器 MUST 读入原编号字段）；真实库迁移后 parseDecisionEntries 可见条目数 MUST 等于节段总数（701+epoch）、buildKnowledgeGraph 正常构建、doctor 决策计数=节段总数。

#### 场景：旧裸键仍命中

Given known_failures 含 decisions.D-002@v1，条目已迁移为 D-core-014@v1（原编号：D-002@v1）
When isDecisionExempt
Then 命中豁免

### FR-04: 平台迁移：真实库 apply 后 platform sync 推送 spec 树；向量检索验证（查询探针核对锚点形态或如实记录重建窗口降级）

- 真实库 apply 后 MUST 执行 platform sync 推送 spec 树（知识文件全量上平台）；向量检索 MUST 做验证探针：查询返回的锚点形态与本地迁移后条目可对上，或如实记录平台重建索引窗口内的降级（查询走既有 vector-search 契约，等值匹配语义已备）。

#### 场景：平台推送

Given 迁移已 apply 且已提交
When platform sync
Then 推送成功回执；向量探针结果（锚点命中或降级窗口注记）留档提交消息

### FR-05: 新增/更新测试跑绿；全量测试 + lint 绿

- 新增/更新测试 MUST 覆盖 FR-01~FR-03 断言；全量测试与 lint 零失败由收口实测门承担（fail-closed）。

#### 场景：收口实测

Given 交付提交完成
When flow done 实测门运行
Then 全量测试零失败且 lint 零 hard fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decision-legacy-renumber.test.mjs「① 计划与重写：fanout 同号/无变更独立发号/原编号插行/其余字节保留/epoch 零触碰/域起点 max+1」
FR-02: test/decision-legacy-renumber.test.mjs「② 幂等与纯函数：重跑零变化、真实库副本 dry-run 对账 701→597」
FR-03: test/decision-legacy-renumber.test.mjs「③ 兼容：isDecisionExempt 认原编号、迁移后全节段可见/图构建」
FR-04: test/decision-legacy-renumber.test.mjs「④ CLI 接线钉：knowledge renumber 两档 + 真实库演练由提交流程承担」
FR-05: 不适用：收口实测门承担（CLI 亲测全量测试与 lint 零失败，不在测试绑定面重复）
