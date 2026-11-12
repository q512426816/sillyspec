---
author: flow-machine-draft
created_at: 2026-11-12T07:48:34.506Z
---
# 需求规格（Requirements）— 2026-11-12-knowledge-recall-gap-observe

## 功能需求

### FR-01: docs/troubleshooting.md 新增条目「意图查询无法召回历史裁决」，含症状、根因、诊断、处置四段

- `docs/troubleshooting.md` 必须新增一条独立的一级标题条目「意图查询无法召回历史裁决」，其下必须且必须仅按既有形态包含 `### 症状` / `### 根因` / `### 诊断` / `### 处置` 四个二级段落。

#### 场景：主路径

Given 打开 `docs/troubleshooting.md`
When 扫描一级标题并定位到该条目
Then 条目存在，且包含症状、根因、诊断、处置四个二级段落

### FR-02: 条目以本次 L3 裁决未被召回为实证，指明召回机制（knowledge-scope / 注入面）的缺口位置

- 条目必须（a）以 2026-11-12 本会话为实证，写明「先给出建议、事后 grep 才发现 D-001@v1 冻结裁决」的具体经过与指向路径；（b）必须把缺口定位在召回机制面（意图查询无法反向命中历史决策），而非 `knowledge search` 的存储或索引面。

#### 场景：主路径

Given 读该条目的症状与根因段
When 核对实证与缺口定位
Then 能定位到 `2026-10-15-fr-chain-l3-adjudication` 的 D-001@v1，且缺口描述指向「意图查询 → 历史裁决」的召回缺口而非存储缺失

### FR-03: 文档头部 updated_at 更新为 2026-11-12

- `docs/troubleshooting.md` 的 frontmatter `updated_at` 必须更新为 `2026-11-12`。

#### 场景：主路径

Given 打开 `docs/troubleshooting.md`
When 读取 frontmatter
Then `updated_at` 字段值为 `2026-11-12`

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯文档条目追加，无逻辑分支；验收靠人工核对条目结构与四段齐全
FR-02: 不适用：纯文档内容要求，验收靠人工核对实证路径与缺口定位是否指向裁决条目与召回面
FR-03: 不适用：frontmatter 字段值更新，无逻辑分支；验收靠人工读头部
