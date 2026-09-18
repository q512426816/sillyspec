---
author: qinyi
created_at: 2026-09-17 22:52:35
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 写作期 agent | brainstorm step8 写 requirements.md 时需要看见触达域现行 FR 并引用承接 |
| 归档管线 | archive noAI 步执行发号/翻链/索引写入（CLI 单一写入方） |
| L3 裁决者 | 20-30 change 后按四类遥测数据裁决活规格真源（含杀/冻出口） |
| doctor 消费方 | 事后重扫 epoch 后归档的索引完整性与取代完整性 |

## 功能需求

### FR-01: 稳定 FR id 发号与幂等索引
覆盖决策：D-001@v1, D-003@v1
Given 变更归档（noAI 步）且其 requirements.md 含 FR 块（`### FR-NN: 标题`）
When indexRequirements 执行（域=design 文件清单剥 NEW: 前缀×_module-map，unmapped 兜底）
Then 新 FR 按域计数器 max+1 发全局 id `FR-<域>-NNN` 并写入 knowledge/fr/<域>.md（条目含来源变更/状态 active/摘要=场景名列表/最近确认）；同变更重跑 no-op（幂等键=全局 id）；INDEX.md 路由行同步

#### 场景：幂等重放
Given 同一变更的 indexRequirements 连续执行两次
Then 第二次 written/superseded 均空，索引文件零漂移

#### 场景：域兜底
Given 文件清单无可匹配模块
Then 条目落 knowledge/fr/unmapped.md（可见可迁移，同 decisions 先例）

### FR-02: 承接取代链与写作期注入
覆盖决策：D-002@v1, D-004@v1, D-005@v1
Given requirements.md FR 块含 `承接: FR-<域>-NNN[, ...]` 行（brainstorm step8 注入清单供引用）
When 归档索引执行
Then 旧条目状态翻 superseded + superseded_by=新 id + 链注记；承接 id 不存在→warn 留痕不阻断；未引用旧 FR 的删除/修改零判定（D-002 边界）

Given brainstorm step8（变更名触及的域有 active 索引条目）
When step8 prompt 渲染
Then {FR_INDEX_DIGEST} 段注入触达域 active 清单（id+标题+来源变更+场景名，superseded 默认藏，无触达域/索引空→段不出现）；新 FR 标题与同域 active 标题 bigram 重叠 ≥0.6 且无承接→advisory warning（不阻断）+遥测

#### 场景：取代链完整
Given change B 承接引用 change A 归档发的 FR-x-001
When B 归档
Then FR-x-001 状态 superseded、superseded_by=本次新号、摘要链注记在场

### FR-03: 四类观察指标事件流
覆盖决策：D-006@v1, D-008@v1
Given 三机制在位（step8 注入/step8 软门/归档承接——护栏②：任一被移除对应指标恒零即实验失真）+删除缺口探针
When 各机制动作发生
Then knowledge-hits.jsonl 落 fr-inject（条数+域）/fr-supersede（from/to/change）/fr-duplicate-warning（标题对）/fr-unreferenced（domain+count，archive 输出带「观察信号，不算 L3 门禁」标注）四类事件；读回字段完整

#### 场景：本变更自举采样
Given 本变更自身归档（首个 epoch 样本）
Then fr-superseded 与 fr-unreferenced 各至少一条真实事件落盘（verify 读回）

### FR-04: D14 第四检查与覆盖面边界
覆盖决策：D-007@v1, D-008@v1
Given doctor archive_integrity 重扫
When 归档日期前缀 ≥ FR_INDEX_EPOCH（2026-09-18）且非 quick/scale:small 豁免面
Then 变更名须在 fr 索引「来源变更」字段在场；其 requirements 含承接行则旧条目 superseded 须已标；违者 warning offender（豁免走既有 archive-integrity-exempt.yaml 零新机制）；epoch 前归档零检查

#### 场景：自举被抓即机制工作
Given 本变更归档时索引写入失败
When D14 重扫
Then 本变更作为 offender 出现（R-05 活证）

## 非功能需求
- 兼容性：无 fr/ 目录的仓行为与现状一致；decision-distill decisions 侧行为零回归（既有测试钉死）；无 db schema 变更
- 纪律：CLI 单一写入方（索引只在归档 noAI 步写）；证伪条款入档（实验失败可杀/冻 L3）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 发号+幂等键 |
| D-002@v1 | FR-02 | 承接取代+删除不判 |
| D-003@v1 | FR-01 | 存储镜像 distill |
| D-004@v1 | FR-02 | step8 注入+superseded 藏 |
| D-005@v1 | FR-02 | advisory 重复检测 |
| D-006@v1 | FR-03 | 四指标进验收 |
| D-007@v1 | FR-04 | epoch 第四检查 |
| D-008@v1 | FR-03, FR-04 | 三护栏（证伪/可算性/探针） |
