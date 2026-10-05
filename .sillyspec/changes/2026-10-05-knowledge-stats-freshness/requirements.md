---
author: flow-machine-draft
created_at: 2026-10-05T00:39:14.310Z
---
# 需求规格（Requirements）— 2026-10-05-knowledge-stats-freshness

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: knowledge stats --json 输出新增 lastEventAt 字段（全量流 max(at) 的 ISO 字符串；无任何遥测记录时为 null）

`knowledge stats --json` 的顶层输出必须包含 `lastEventAt` 字段：取值 = 全量遥测流（.runtime/knowledge-hits.jsonl，不施加 --since-days 窗口过滤）中所有可解析 `at` 的最大值，按该记录 `at` 原样 ISO 字符串返回；无任何有效遥测记录时必须为 `null`。at 缺失或不可解析的记录禁止参与取最大值。

#### 场景：多记录乱序取最新

- Given: hits.jsonl 含三条记录，at 分别为 5 天前、1 天前、3 天前（乱序落盘）
- When: 以 `--json` 调用 cmdKnowledgeStats
- Then: `lastEventAt` 等于 1 天前那条记录的 `at` 原样字符串

#### 场景：空流为 null

- Given: hits.jsonl 缺失（或无任何含可解析 at 的有效记录）
- When: 以 `--json` 调用 cmdKnowledgeStats
- Then: `lastEventAt` 为 `null`

### FR-02: 人类可读模式在遥测计数行展示数据截至日期（有遥测时）；无遥测时不展示该读数

人类可读模式下，当 `lastEventAt` 非 null 时，遥测计数行必须追加「数据截至 <YYYY-MM-DD>」读数（日期取 lastEventAt 前 10 字符）；`lastEventAt` 为 null 时禁止展示该读数。

#### 场景：有遥测

- Given: hits.jsonl 至少一条含可解析 at 的记录
- When: 以人类可读模式调用 cmdKnowledgeStats
- Then: 输出含「数据截至 <日期>」且与「遥测计数」同行

#### 场景：无遥测

- Given: hits.jsonl 缺失
- When: 以人类可读模式调用 cmdKnowledgeStats
- Then: 输出不含「数据截至」

### FR-03: 单测覆盖三种情形：多记录取最新 at、单记录、无遥测为 null

本变更必须以自动化单测覆盖 lastEventAt 的三种情形（多记录乱序取最新 at、单记录、无遥测为 null），并覆盖人类可读模式含/不含「数据截至」读数两个分支。

#### 场景：主路径

- Given: test/knowledge-stats.test.mjs 的临时 fixture 目录
- When: 跑 `node --test test/knowledge-stats.test.mjs`（或项目测试入口）
- Then: lastEventAt 相关断言全部通过

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-stats.test.mjs「Test 8: lastEventAt 新鲜度聚合——多记录乱序取最新 / 单记录 / 无遥测 null」
FR-02: test/knowledge-stats.test.mjs「Test 8: 人类可读数据截至读数——有遥测展示 / 无遥测不展示」
FR-03: test/knowledge-stats.test.mjs「Test 8: lastEventAt 三情形全断言（同用例组收口）」
