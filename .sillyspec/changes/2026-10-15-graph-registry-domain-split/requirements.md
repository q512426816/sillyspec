---
author: flow-machine-draft
created_at: 2026-10-15T02:40:39.717Z
---
# 需求规格（Requirements）— 2026-10-15-graph-registry-domain-split

## 功能需求

### FR-01: projects/ 登记仓名前缀（含大小写异形）归属登记仓簇；test 面归 _tests；无登记目录 fail-soft 原行为

- graphNodeDomain 对无 module-files 挂接的 file 节点必须按登记仓前缀归簇（projects/*.yaml 的 name 字段，最长前缀优先、大小写不敏感）；本仓 test/ 或 tests/ 前缀必须归 _tests 簇；projects 目录缺席/不可读时必须 fail-soft 且行为与改动前一致（全落 _unmapped）。

#### 场景：主路径

- Given 登记三仓含大小写异形（SillyHub 登记 vs sillyhub/ 路径），When 图聚簇，Then frontend/sillyhub-daemon/SillyHub 簇各 1、_tests 1、真无归属残留 _unmapped（测试①组）。

#### 场景：fail-soft

- Given 无 projects 目录，When 图聚簇，Then _unmapped 行为不变（测试②组）。

### FR-02: 真图 _unmapped 2183→761（frontend/backend/sillyhub-daemon/SillyHub 簇浮出），图谱既有 13 测试零回归

- 真图 summary 的 file:_unmapped 簇计数必须从 2183 量级降到 761 量级（跨仓前缀与 test 面分流），且 frontend/backend/sillyhub-daemon 登记簇在场；test/knowledge-graph.test.mjs 既有断言零失败。

#### 场景：主路径

- When 真图 graphSummary 求值，Then 簇分布如实分流（回执留档）；既有图测试零回归。

### FR-03: 新增四态归簇测试全绿；C5/D3 缓办裁决入 known-issues 且 validate 绿

- test/graph-registry-domain.test.mjs 必须覆盖登记前缀/大小写不敏感/_tests/真无归属/fail-soft 五面且全绿；known-issues.md 必须留痕 decisions/unmapped.md 拆分与 fr-unmapped 存量退休的缓办裁决（含重启条件）；knowledge validate 必须 ok:true。

#### 场景：主路径

- When 新测试文件与 validate 运行，Then 全绿/ok:true。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/graph-registry-domain.test.mjs「登记仓前缀/大小写不敏感/_tests/真无归属 四态归簇」「无 projects 目录 fail-soft：全落 _unmapped 行为不变」
FR-02: test/knowledge-graph.test.mjs（既有 13 组零回归）+ 真图 summary 实测回执（_unmapped=761）
FR-03: test/graph-registry-domain.test.mjs（全文件）+ knowledge validate ok:true CLI 回执
