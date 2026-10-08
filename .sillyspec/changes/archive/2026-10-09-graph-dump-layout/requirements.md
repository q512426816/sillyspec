---
author: flow-machine-draft
created_at: 2026-10-08T16:45:36.392Z
---
# 需求规格（Requirements）— 2026-10-09-graph-dump-layout

## 功能需求

### FR-01: sillyspec knowledge graph dump --layout --json 输出 ok:true + nodes 数=summary nodes 数 + 坐标全整数

- `dump --layout --json` 必须输出 ok:true 且 nodes 数等于图节点总数、坐标全整数、stats 与 summary 同源；连续两次调用输出必须逐字节一致（确定性硬约束）；缺 --layout 必须回 layout_required usage 错，禁止抛未捕获异常。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: 连续两次调用 JSON 逐字节一致（确定性）

- `dump --layout --json` 必须输出 ok:true 且 nodes 数等于图节点总数、坐标全整数、stats 与 summary 同源；连续两次调用输出必须逐字节一致（确定性硬约束）；缺 --layout 必须回 layout_required usage 错，禁止抛未捕获异常。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: dump 不带 --layout 回 layout_required usage 错不崩

- `dump --layout --json` 必须输出 ok:true 且 nodes 数等于图节点总数、坐标全整数、stats 与 summary 同源；连续两次调用输出必须逐字节一致（确定性硬约束）；缺 --layout 必须回 layout_required usage 错，禁止抛未捕获异常。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: USAGE 行与 stages available 收编 dump

- `dump --layout --json` 必须输出 ok:true 且 nodes 数等于图节点总数、坐标全整数、stats 与 summary 同源；连续两次调用输出必须逐字节一致（确定性硬约束）；缺 --layout 必须回 layout_required usage 错，禁止抛未捕获异常。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 同簇节点抽样距离小于跨簇抽样（粗分组视觉成立）

- `dump --layout --json` 必须输出 ok:true 且 nodes 数等于图节点总数、坐标全整数、stats 与 summary 同源；连续两次调用输出必须逐字节一致（确定性硬约束）；缺 --layout 必须回 layout_required usage 错，禁止抛未捕获异常。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-06: 既有 11 用例零回归；lint 零问题

- `dump --layout --json` 必须输出 ok:true 且 nodes 数等于图节点总数、坐标全整数、stats 与 summary 同源；连续两次调用输出必须逐字节一致（确定性硬约束）；缺 --layout 必须回 layout_required usage 错，禁止抛未捕获异常。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」
FR-02: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」（两次 layoutFullGraph deepEqual；真图 sha256 双跑一致留档）
FR-03: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」（error.code 断言 layout_required）
FR-04: 不适用独立用例：USAGE 收编由 graph_usage 错误路径回显覆盖（④CLI 分发既有断言）
FR-05: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」（同簇 intra<跨簇 inter 抽样断言）
FR-06: test/knowledge-graph.test.mjs 全 11 用例零回归；lint=test/check-syntax.mjs（914 文件）
