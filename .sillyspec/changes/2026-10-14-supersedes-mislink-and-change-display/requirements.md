---
author: flow-machine-draft
created_at: 2026-10-14T10:36:52.243Z
---
# 需求规格（Requirements）— 2026-10-14-supersedes-mislink-and-change-display

## 功能需求

### FR-01: supersedes 边只在同变更内解析（含双 legacy 无「变更：」行的同源匹配）；同变更无目标时不建边，不再回退他变更同号条目；用与审计同口径脚本复核，33 条误连归零

- 知识图谱 supersedes 边解析 MUST 限定在同变更内：仅当同域文件存在 id 相同且「变更：」行一致（含双方均无该行的 legacy 同源）的目标条目时才建边；同变更无目标时 MUST NOT 建边，禁止回退到同文件他变更的同号条目（D 号是变更内局部序号，跨变更同号互不相干；v2 蒸馏落地时同变更 v1 段已被就地替换，此时无目标即无边）。

#### 场景：同变更（含双 legacy）建边

Given 同域文件含同变更的 D-005@v2 与 D-005@v1 两条，且另有一对双方均无「变更：」行的 legacy 同号新旧条目
When 构建知识图谱
Then 两条 supersedes 边均建立（v2 → v1，同变更限定）

#### 场景：跨变更同号不建边

Given 同域文件含 D-001@v2（变更 A，supersedes：D-001@v1）与 D-001@v1（变更 B，与 A 无关）
When 构建知识图谱
Then 不建任何指向 D-001@v1（变更 B）的 supersedes 边（旧「同变更优先、再退同文件首个」回退已除）

### FR-02: 四处决策展示行渲染变更名限定（change 在场显示变更名；缺失时稳定降级形态「变更未记录」不编造）；同号条目在展示面即可区分

- 决策展示行 MUST 携带变更名限定：{DECISION_HITS}（src/run/prompt.js）、轻量道防复潮注入（src/flow.js）、knowledge-gate 回显（src/run/complete.js）、decision-touch 事实行（src/docs-debt.js）四处渲染的每条决策行，change 在场时 MUST 渲染「变更 <名>」限定词，change 缺失（legacy 无「变更：」行）时 MUST 渲染固定降级词「变更未记录」——禁止留空、禁止编造变更名；限定词经共享纯函数 decisionChangeQualifier（src/knowledge-match.js）单一实现，四处不得各写一份。

#### 场景：同号条目在场区分

Given 两个 D-001@v1 分属不同变更且同被命中
When 渲染任一展示面
Then 两条展示行各含自己的「变更 <名>」限定，可直接区分

#### 场景：legacy 缺变更行降级

Given 命中条目无「变更：」行
When 渲染展示面
Then 该行渲染「变更未记录」（不编造、不省略）

### FR-03: 新增/更新测试跑绿；全量测试 + lint 绿

- 本变更新增/更新测试 MUST 覆盖 FR-01 的「同变更建边/跨变更不建边」两态与 FR-02 的「变更名在场/缺失降级」两态；全量测试与 lint 的零失败由收口实测门承担（CLI 亲测，fail-closed）。

#### 场景：收口实测

Given 交付提交完成
When flow done 实测门运行
Then 全量测试零失败且 lint 零 hard fail，否则整单 FAIL

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「①解析全形态：节点边数与本体落位（含同号跨变更不折叠/不落盘）」
FR-01: test/knowledge-graph.test.mjs「①解析：supersedes 只认同变更——同变更（含双 legacy）建边、跨变更同号不建边」
FR-02: test/decision-touch.test.mjs「变更名限定：change 在场渲染「变更 <名>」，缺失渲染「变更未记录」」
FR-02: test/thin-fr-inject-parity.test.mjs「① flowKnowledgeDigest：域路由命中 active FR（索引序、无 ⚠️）+ 否决决策命中」
FR-02: test/design-knowledge-check.test.mjs「① 命中场景：--output 含机制词 → warn 回显 rejected 条目＋evidence 提示，不阻断」
FR-02: test/decision-change-qualifier.test.mjs「接线钉：{DECISION_HITS} 渲染使用 decisionChangeQualifier」
FR-03: 不适用：收口实测门承担（CLI 亲测全量测试与 lint 零失败，不在测试绑定面重复）
