---
author: flow-machine-draft
created_at: 2026-10-09T00:27:19.171Z
---
# 需求规格（Requirements）— 2026-10-09-graph-docrefs-noise

## 功能需求

### FR-01: parseChangelogEntries 尾括号后缀剥除（（P2）类；仅当剥离后匹配日期/ql 形态才接受，防剥坏正常名）——changelog_danglings 归零

- parseChangelogEntries 名字归一必须剥离优先（先剥尾括号段再验日期/ql 形态，原样形态兜底）；变更名合法字符集不含括号，剥离优先必须安全。

#### 场景：后缀名

- Given 表格行「2026-09-10-review-dispatch（P2）」；When 解析；Then 产出 2026-09-10-review-dispatch（去后缀），归档目录存在性判定不再假悬空——真图 changelog_danglings 归零。

### FR-02: graphDangling 文档引用面（doc-refs/scan-refs）口径修正：裸文件名（无 /）不判悬空；跨仓前缀（顶级目录本仓不存在）单独计跨仓引用不计本仓悬空；doctor 文案注记两类构成

- graphDangling 对文档引用面（doc-refs/scan-refs）必须：裸文件名（无 /）不判悬空（短引用合法且多义不可盲连）；跨仓前缀（顶级目录本仓不存在）不计本仓悬空；结构面（强边）保持全判但必须带 crossRepo 标记供 doctor 分流（本仓点名样本、跨仓聚合计数）。

#### 场景：真图降噪

- Given 真图；When 复跑；Then doc/scan 悬空 1439→65（余为同顶级名歧义的跨仓相对路径与少量真失效引用，advisory 保留）；本仓强边悬空与跨仓计数分流呈现。

### FR-03: extractFilePaths/anchorFilePaths 剥后缀产物为空或纯数字时丢弃

- extractFilePaths/anchorFilePaths 剥 :line/:sym 与前导斜杠后的产物为空串/纯数字/裸点段时必须丢弃；repo:// URL 碎片（//sillyhub/...）剥后按跨仓口径处理。

#### 场景：噪声守卫

- Given 含 URL/glob/行号语料的文档；When 提取建边；Then 无空/数字/前导斜杠伪路径节点。

### FR-04: 降噪后真图复跑：doc/scan 悬空降到真实数（本仓存在性可判的带路径引用）；平台侧 64 缺卡清单钉进 doctor 输出（已有 graph-module-doc-gap）并对其中本仓可产内容的部分（backend 14 张——scan STRUCTURE 目录职责表在场）补定位级卡片，跨仓不可产的（frontend/daemon 等源码不在本仓）留 doctor advisory 不伪造

- 缺口实查（64 全仅缺 changelog 索引、卡全在）必须批量建 64 个 <module>.changelog.md 空索引（标准头+空表，沿 core-engine.changelog.md 形态）；建图守卫必须含 glob 路径跳过建边（module-files/deliverables）、tests 字段剥 #锚后缀、deliverables 剥尾部中文括号注记。

#### 场景：双归零

- Given 真图复跑；Then module_doc_gaps=0、changelog_danglings=0、本仓强边悬空 26→13（余为声明未落地的真历史欠账 advisory 点名）。

### FR-05: 全量测试与 lint 零回归

- 全量测试必须绿（test:core）、lint 必须零告警。

#### 场景：回归面

- Given 全部落盘；When 全量测试与 lint；Then 零失败零新告警。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「②坏行容忍：changelog 三态坏行与侧车缺省 fail-soft」（后缀剥除断言随同源 helper 钉）
FR-02: test/knowledge-graph.test.mjs「⑧summary 聚合」（跨仓双豁免钉：全假存在性下中桶归零 + 顶级在场时中桶计断言）
FR-03: test/knowledge-graph.test.mjs「①解析全形态」（提取守卫随建图断言面）
FR-04: 真图终验（module_doc_gaps=0 / changelog_danglings=0 / 本仓强边 13 advisory 点名）+ 64 个 changelog 文件 diff 自证
FR-05: test:core 325 全绿 + npm run lint 零告警（verify-runs 留档）
