---
author: flow-machine-draft
created_at: 2026-10-15T01:48:23.560Z
---
# 需求规格（Requirements）— 2026-10-15-graph-dangling-crossrepo-split

## 功能需求

### FR-01: graph summary 输出 dangling_refs_local 与 breakdown.cross_repo，local + cross_repo = total 守恒（真图 2537 = 90 + 2447）

- graph summary 必须输出 dangling_refs_local 与 dangling_refs_breakdown.cross_repo 两个附加字段，且三者必须满足 local + cross_repo = dangling_refs 守恒；既有 dangling_refs 主计数与 strong/medium 守恒口径禁止变化。

#### 场景：主路径

- Given 真图构建完成，When graphSummary 求值，Then local(90) + cross_repo(2447) = dangling_refs(2537) 守恒成立。

### FR-02: knowledge graph dangling --local 只列本仓悬空，输出附 cross_repo 分流计数；跨仓条目带〔跨仓注记〕标注

- knowledge graph dangling --local 必须只列 crossRepo=false 的条目且 count 为本仓数；不带 --local 时跨仓条目输出必须带〔跨仓注记〕标注并附 cross_repo 分流计数。

#### 场景：主路径

- When 真图上执行 dangling --local，Then count=90 且输出附 cross_repo=2447。

### FR-03: 既有守恒测试（dangling_refs = strong + medium）零回归，新增分流守恒断言全绿

- 既有测试断言（dangling_refs = strong_anchors + medium_doc_refs 守恒、doctor 同源计数交叉断言）必须零失败；新增分流守恒断言必须全绿。

#### 场景：主路径

- When 运行 test/knowledge-graph.test.mjs 全文件，Then 全部断言零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「summary 守恒/分流」组（跨仓口径分流守恒断言）
FR-02: 不适用：CLI 子命令输出面由真图实测回执（count=90/cross=2447）验证——--local 过滤与 graphDangling 的 crossRepo 判定同源，fixture 双态断言已覆盖判定本体
FR-03: test/knowledge-graph.test.mjs（既有守恒组零回归 + 新增分流组）
