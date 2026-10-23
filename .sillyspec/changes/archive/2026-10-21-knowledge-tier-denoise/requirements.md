---
author: flow-machine-draft
created_at: 2026-10-21T03:59:03.755Z
---
# 需求规格（Requirements）— 2026-10-21-knowledge-tier-denoise

## 功能需求

### FR-01: 知识检索三路核心对 unmapped 停车场文件零返回

- 必须（对齐 FR 面 2026-09-29-rot-retire-inject-cap 既有 unmapped 过滤口径）：检索核心三条路径——INDEX 路由命中（matchByRouting）、查询词片回退（fallbackByQueryShingles）、平台向量召回结果解析（buildResultFromPlatform）——对 `decisions/unmapped.md` 与 `fr/unmapped.md` 停车场文件零返回：entries 命中清单与 decisionHits 防复潮面均不含停车场文件条目；`knowledge search` 回显在停车场条目被过滤且结果为零时披露一行过滤事实（保人工可见性）。

#### 场景：路由命中停车场行不注入

- Given INDEX.md Decisions 段含 `- unmapped|decision|决策|… → decisions/unmapped.md` 行且查询词命中其关键词
- When matchByRouting 以该查询执行
- Then matched entries 不含 decisions/unmapped.md（fr/unmapped.md 同理），decisionHits 不含该文件任何条目

#### 场景：词片回退跳过停车场

- Given 路由零命中、查询词片在 decisions/unmapped.md 条目文本落在复现窗口内
- When fallbackByQueryShingles 执行
- Then 返回结果的 entries 与 decisionHits 均不含 decisions/unmapped.md

#### 场景：向量召回候选被丢弃

- Given 平台 vector-search 返回 spec_path=knowledge/decisions/unmapped.md 的候选
- When buildResultFromPlatform 解析候选
- Then 该候选被丢弃，其余非停车场候选照常解析

#### 场景：search 披露行

- Given 查询只命中停车场文件（过滤后结果为空）
- When knowledge search 以该查询执行
- Then 回显含一行「停车场文件已过滤（decisions/fr unmapped）——按需直查文件」事实披露

### FR-02: INDEX 路由行根除全体域共享泛词

- 必须：INDEX 路由行维护（syncIndexRoutingLines）不再生成含共享泛词的路由行——decisions 面 `decision|决策`、FR 面 `FR|需求|承接` 从 makeLine 模板删除；存量行由 sync 幂等剥离这些泛词（域名与其余人工扩充关键词保留，行不删除）；本仓 INDEX.md 执行一次同步清偿后 Decisions/FR 段不再存在共享泛词。路由命中不再因共享泛词命中全体域（席位由 INDEX 行序抽签的病根消除）。

#### 场景：新域行零泛词

- Given 新域 `foo` 决策文件落盘
- When syncIndexRoutingLines 维护 INDEX
- Then 补行形态为 `- foo → [decisions/foo.md](decisions/foo.md)`（无共享泛词）

#### 场景：存量行幂等剥离

- Given INDEX 存量行 `- core-engine|decision|决策 → [decisions/core-engine.md](…)`
- When syncIndexRoutingLines 执行（任意 distill/归档触发）
- Then 行归一为 `- core-engine → …`；人工扩充关键词（如 unmapped 行的 `知识图谱|影响面`）原样保留；重复执行零漂移

#### 场景：泛词查询不再全池命中

- Given 查询串含「决策」「decision」「需求」或「承接」但不含任何域名
- When matchByRouting 执行
- Then 不再因共享泛词命中全体 decisions/fr 路由行（命中集与查询语义实际相关的域对应）

### FR-03: 热路径扫描跨进程缓存（quicklog 伪条目 + knowledge-graph）

- 必须：quicklog flow 归档伪条目扫描（parseFlowArchiveEntries）与 knowledge-graph 构建（buildKnowledgeGraph）具备跨进程缓存（落 `.sillyspec/.runtime/cache/`，平台上传与 git 均排除面）：同指纹二次调用零全量重扫（不逐归档目录读 proposal.md／不逐变更读 design.md+change-patch.json）；指纹覆盖输入面并随变化失效，另设 TTL 与缓存版本键；缓存损坏/缺席 fail-open 全量重建不抛错。

#### 场景：二次调用命中缓存

- Given 缓存在场且输入面未变
- When 再次调用解析/构建
- Then 返回与全量重建逐字段等价的结果，且不发生逐目录/逐变更文件读（缓存命中路径可被测试断言）

#### 场景：归档新增触发失效

- Given 缓存在场
- When changes/archive 新增归档目录
- Then 指纹失配 → 全量重建，结果含新目录

#### 场景：坏缓存 fail-open

- Given 缓存 JSON 损坏或版本键不匹配
- When 调用
- Then 丢弃缓存全量重建，不抛错

### FR-04: unmapped 存量机器清偿（复用 redomain 原语的批量通道 + 本仓执行）

- 必须：提供 unmapped 存量批量清偿机器通道（复用 redomainDecisionEntries/FR 侧迁移原语，段字节整体搬运不裸删）：decisions 条目按其「文件：」锚经修复后的模块路径匹配器（2026-10-15-module-path-glob-match）推断目标域；fr 条目按来源变更覆盖面（归档 design 交付表∪change-patch）推断；dry-run 先行报告、apply 幂等、目标域同 id 同变更冲突跳过不覆盖；迁不动的留在 unmapped 并留痕（停车场注记 + 残量计数报告留档变更目录）。本仓执行清偿后 fr/unmapped.md 与 decisions/unmapped.md 条目数降至有界残量（剩余=不可机器推断且逐条留痕）。

#### 场景：可推断条目迁移

- Given unmapped 条目「文件：」锚命中模块 X 的 paths
- When apply 执行
- Then 条目段整体迁至对应域文件（id/机器行零改写），源文件条目数减少，INDEX 路由行同步维护

#### 场景：迁不动留痕

- Given 条目无「文件：」锚或锚不命中任何模块
- When apply 执行
- Then 条目留在 unmapped，清偿报告列明残量与不可推断原因

#### 场景：幂等重跑

- Given 同批已 apply 过
- When 再次 apply
- Then 0 条迁移、零漂移

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-tier-denoise.test.mjs「unmapped 停车场三路零返回（路由命中/词片回退/向量候选）+ search 披露行」
FR-02: test/knowledge-tier-denoise.test.mjs「路由行共享泛词剥离：新行零泛词/存量幂等剥离/人工关键词保留/泛词查询不再全池命中」
FR-03: test/knowledge-hotpath-cache.test.mjs「quicklog 伪条目与 graph 构建缓存：命中等价/归档新增失效/坏缓存 fail-open」
FR-04: test/redomain-unmapped-bulk.test.mjs「unmapped 批量清偿：文件锚推断迁移/无锚留痕/冲突跳过/幂等重跑」
FR-05: 不适用：零回归是收口实测面（FR-01~04 新增测试 + 受影响既有测试随契约更新 + lint），由 CLI 收口亲测承载，无独立新增单测
