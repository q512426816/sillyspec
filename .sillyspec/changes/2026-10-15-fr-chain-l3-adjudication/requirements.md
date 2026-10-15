---
author: flow-machine-draft
created_at: 2026-10-15T02:31:15.905Z
---
# 需求规格（Requirements）— 2026-10-15-fr-chain-l3-adjudication

## 功能需求

### FR-01: decisions.md 落 D-xxx@v1 裁决条目（引用四类遥测计数+条款原文依据，状态 implemented）

- 裁决条目必须落 decisions.md 且状态必须为 implemented，正文必须引用四类遥测计数（fr-inject/fr-supersede/fr-duplicate-warning/fr-unreferenced）与证伪条款原文依据，复潮条件必须在场。

#### 场景：主路径

- Given 本变更归档蒸馏，When 解析 decisions.md，Then D-001@v1 裁决条目全字段在场。

### FR-02: knowledge stats FR 实验区（--fr-only 与全量两渲染位）头行带已裁决注记，裁决候选块替换为冻结注记

- knowledge stats 两渲染位的头行必须带已裁决注记；裁决候选 Top-10 列表必须替换为冻结注记行（JSON 数据面 adjudicationCandidates 保留）。

#### 场景：主路径

- When knowledge stats --fr-only 输出，Then 头行含「已裁决（2026-10-15」且候选块为退役注记。

### FR-03: fr 检索/注入面零变化（fr-inject/域注入/绑定面不动）；既有 stats 测试零回归

- fr 检索/注入/绑定面代码必须零变更（本变更只动 knowledge-stats.js 渲染与 decisions.md）；既有 stats 相关测试必须零失败。

#### 场景：主路径

- When 跑 knowledge-fr-stats/fr-governance-telemetry/fr-governance-sweep 测试，Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：裁决文档为决策记录面——验收靠归档蒸馏（D-001@v1 入 knowledge/decisions）与 design 引用条款原文
FR-02: 不适用：渲染文案面——验收靠 knowledge stats --fr-only 实测输出留档（头行注记+候选退役注记在场）
FR-03: test/knowledge-fr-stats.test.mjs + test/fr-governance-telemetry.test.mjs + test/fr-governance-sweep.test.mjs（零回归）
