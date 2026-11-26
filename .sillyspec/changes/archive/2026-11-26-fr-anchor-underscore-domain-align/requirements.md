---
author: flow-machine-draft
created_at: 2026-11-26T01:27:58.575Z
---
# 需求规格（Requirements）— 2026-11-26-fr-anchor-underscore-domain-align

## 功能需求

### FR-01: FR-<含下划线域>-NNN 绑定行归档提升不再被拒：FR-tool_gateway-001 形态过 ANCHOR_RE 校验并成功 upsert 进 knowledge/fr/ 机器子块（测试先行红转绿）

- 测试绑定行的 FR 全局锚校验（ANCHOR_RE）必须接受含下划线的域名形态（`FR-<域含下划线>-NNN`，如 FR-tool_gateway-001），归档提升对这类行必须完成 upsert 进 knowledge/fr/ 机器子块；禁止再以「绑定行 anchor 非法」拒收发号侧产出的合法形态。

#### 场景：主路径

- Given：测试绑定行 anchor 为 FR-tool_gateway-001（发号域取自模块 id tool_gateway）
- When：normalizeRow 校验该行、upsertFrBindings 以该锚提升进含 `## FR-tool_gateway-001 ` 节头的知识文件
- Then：校验通过（不抛「anchor 非法」），机器子块成功写入绑定行

### FR-02: 对齐后词表两侧同源：FR_SECTION_RE / FR_GLOBAL_ID_RE / frEntryExists 标题扫描 / knowledge-graph FR 节解析均接受含下划线域，知识文件重读不丢带下划线的 FR 节

- FR 节头解析（FR_SECTION_RE）、全局 id 校验（FR_GLOBAL_ID_RE）、退役理由令牌与索引节头扫描（fr-index 内另两处）、frEntryExists 标题扫描（test-bindings 内两处）、knowledge-graph FR 节头与承接引用扫描的域字符类必须与发号域形态一致（全部接受下划线）；知识文件重读时 FR-<域含下划线>-NNN 节必须被正常解析与计数，禁止静默丢节。

#### 场景：主路径

- Given：知识文件含 `## FR-tool_gateway-001 标题` 节头
- When：FR_SECTION_RE 解析该文件、frEntryExists/knowledge-graph 扫描该节
- Then：节被识别（id=FR-tool_gateway-001），重读/幂等面不丢节

### FR-03: 既有不带下划线域与 ql- 形态零回归（既有相关测试全绿）

- 不带下划线域（连字符/纯字母）、FR-NN、ql-<id>、null 各既有锚形态的行为必须保持不变；fr-index、knowledge-graph、test-bindings 相关既有测试与全仓 lint 必须全绿。

#### 场景：主路径

- Given：既有测试集（fr-index.test.mjs、fr-index-l2.test.mjs、knowledge-graph.test.mjs 等）
- When：词表补下划线后全量跑相关测试与 lint
- Then：全部通过，无行为漂移

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/fr-anchor-underscore.test.mjs「ANCHOR_RE 与 normalizeRow 接受含下划线域锚，upsertFrBindings 成功写入机器子块」
FR-02: test/fr-anchor-underscore.test.mjs「FR_SECTION_RE/FR_GLOBAL_ID_RE/标题扫描/knowledge-graph 解析含下划线域节头，重读不丢节」
FR-03: test/fr-anchor-underscore.test.mjs「既有形态零回归：连字符域/FR-NN/ql/null 照常，既有非法形态仍拒」
