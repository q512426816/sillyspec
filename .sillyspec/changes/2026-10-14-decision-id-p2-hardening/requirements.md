---
author: flow-machine-draft
created_at: 2026-10-14T13:59:04.188Z
---
# 需求规格（Requirements）— 2026-10-14-decision-id-p2-hardening

## 功能需求

### FR-01: 「来源：」legacy 兼容读：knowledge-match（parseDecisionFile）、decision-distill（splitKnowledgeSections）、docs-check（parseDecisionEntries）三解析器 MUST 支持来源行兜底——「变更：」优先、「来源：」仅在变更行缺失时生效；decision-distill 侧 legacy 段（带来源行）从此参与同变更匹配（重蒸馏收敛为在位更新而非重复追加），无任何限定行的纯 legacy 段仍不互认

- 三个决策解析器 MUST 支持来源行兜底：条目含「变更：」行时以变更行为准（无条件覆盖）；仅含「来源：」行时 MUST 以来源值作 change 限定（现存 20 行 legacy 条目在检索去重键/图谱节点/decision-touch 面可见）；decision-distill 的 splitKnowledgeSections 读出来源后，带来源行的 legacy 段 MUST 参与同变更同号匹配（重蒸馏在位更新，不重复追加）；无任何限定行的纯 legacy 段 MUST 维持不互认（只共存不误删）。

#### 场景：来源兜底解析

Given 域文件条目仅含「来源：2026-01-01-alpha」行
When 任一解析器读取
Then change=2026-01-01-alpha（机器可见）

#### 场景：distill 在位更新收敛

Given 知识域文件存在带「来源：2026-01-01-alpha」的 legacy D-001@v1 段
When 重蒸馏 change 2026-01-01-alpha 的 D-001@v2
Then legacy 段被在位更新为「变更：」形态，不产生重复段

#### 场景：变更优先

Given 条目同时含「变更：」与「来源：」行（理论形态）
When 解析
Then change 取「变更：」值

### FR-02: 折叠修复：同文件同号双 legacy（无任何限定行）MUST 不再互折叠（2 条隐身条目复现）；多条路由行指向同一域文件仍不产生重复解析

- knowledge-match 去重 MUST 修复两处：①多条路由行指向同一域文件时 MUST 只解析一次（完全重复不放大）；②同文件同号且无任何限定行的 legacy 条目 MUST 不互折叠（各自可见——backend.md:158 与 unmapped.md:584 两条 implemented 条目复现）；带 change 的条目沿用 file+id+change 键去重。

#### 场景：双 legacy 同号共存

Given 同域文件两个 D-001@v1 条目均无变更/来源行
When parseDecisionEntries
Then 两条均返回（不再先到遮蔽）

#### 场景：路由行重复不放大

Given INDEX 两条路由行指向同一域文件
When parseDecisionEntries
Then 条目数与单路由一致

### FR-03: docs-check 豁免键域限定：新键形态 decisions.<域>/<id>[.<kind>]（规则级精确/条目级伞形）MUST 生效；裸键形态保留兼容

- isDecisionExempt MUST 支持域限定键：规则级 decisions.<域>/<id>.<kind> 精确命中、条目级 decisions.<域>/<id> 伞形命中；裸键 decisions.<id>[.<kind>] MUST 保留兼容（消费仓既有配置不失效）；runDecisionRules 调用侧 MUST 传入条目所在域。

#### 场景：域限定键命中与他域不豁免

Given known_failures 含 decisions/core-engine/D-001@v1.anchor
When 豁免匹配 core-engine 域 D-001@v1 的 anchor 规则与他域同号条目
Then 前者豁免、后者不豁免

### FR-04: 已回应判据收紧：complete.js 防复潮「已回应」判定 MUST 从文件级共现收紧为行级共现（命中 id 与域名词或变更名出现在同一行）——自身同号+常见词不再静默吞他变更命中；真实回应形态（unmapped.md D-001@v1 同行）仍被识别

- complete.js knowledge-gate「已回应不重弹」判定 MUST 收紧为行级共现：命中 id 与（域名词或命中条目变更名）出现在 decisions.md 同一行才视为已回应；文件级共现（id 在一行、域名在另一行）MUST 不再抑制回显。

#### 场景：误吞清偿

Given 本变更 decisions.md 含自身 D-001@v1 行、他处另一行含「unmapped」词、命中为他变更 unmapped 域 D-001@v1
When knowledge-gate 判定
Then 命中照常回显（不再被吞）

#### 场景：真实回应仍识别

Given decisions.md 某行同时含「unmapped.md」与「D-001@v1」（小白鼠回应形态）
When 判定
Then 抑制（不重弹）

### FR-05: 注入文案引用契约：{DECISION_HITS} 与轻量道防复潮段头 MUST 含跨变更引用形态指引（变更名#D-xxx@vN，同号不同变更互不相干）

- {DECISION_HITS} 段头（src/run/prompt.js）与轻量道防复潮段头（src/flow.js）MUST 各含一句跨变更引用形态指引：引用/复潮他变更条目须带变更名限定（形如 变更名#D-xxx@vN——同号不同变更互不相干）。

#### 场景：指引在场

Given 两处段头渲染文本
Then 均含「变更名#D-xxx@vN」字样

### FR-06: 新增/更新测试跑绿；全量测试 + lint 绿

- 新增/更新测试 MUST 覆盖 FR-01~FR-05 断言；全量测试与 lint 零失败由收口实测门承担（fail-closed）。

#### 场景：收口实测

Given 交付提交完成
When flow done 实测门运行
Then 全量测试零失败且 lint 零 hard fail

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/decision-id-p2-hardening.test.mjs「① 来源兜底：三解析器读出来源行、变更优先、distill 在位更新收敛」
FR-02: test/decision-id-p2-hardening.test.mjs「② 折叠修复：双 legacy 同号共存 + 路由行重复单解析」
FR-03: test/decision-id-p2-hardening.test.mjs「③ 豁免键域限定：decisions.<域>/<id>[.<kind>] 命中、裸键兼容、他域同号不豁免」
FR-04: test/knowledge-gate-denoise.test.mjs「③ 门已回应静默：decisions 正文含 id＋域共现 → 不再回显；未回应照常回显」
FR-05: test/decision-id-p2-hardening.test.mjs「⑤ 引用契约接线钉：两处段头含 变更名#D-xxx@vN」
FR-06: 不适用：收口实测门承担（CLI 亲测全量测试与 lint 零失败，不在测试绑定面重复）
