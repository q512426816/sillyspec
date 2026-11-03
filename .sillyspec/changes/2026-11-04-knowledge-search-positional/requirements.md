---
author: flow-machine-draft
created_at: 2026-11-03T16:19:02.103Z
---
# 需求规格（Requirements）— 2026-11-04-knowledge-search-positional

## 功能需求

### FR-01: sillyspec knowledge search "关键词"（位置参数形态）与 --query "关键词" 等效可用

- 必须：`sillyspec knowledge search "<关键词>"`（关键词作首个非 flag 位置参数）与 `--query "<关键词>"` 产生同一检索结果（同 query、同默认 limit、同输出载荷形态）。

#### 场景：主路径

- Given 本地知识库含可命中条目
- When `cmdSearch(dir, ['知识图谱'], {})`（位置参数，无任何 flag）
- Then 输出 ok:true、query 字段回显「知识图谱」、matches 非空——与 `cmdSearch(dir, ['--query', '知识图谱'], {})` 逐字段一致

#### 场景：位置参数与 --limit 混排

- When `['--limit', '2', '关键词']` 或 `['关键词', '--limit', '2']`
- Then 关键词取位置参数、limit 取 2（flag 值不被误认为查询词）

### FR-02: --query 显式形态保持兼容，两形态并存时 --query 优先

- 必须：`--query` 既有解析路径与语义保持不变；`--query` 与位置参数同时出现时以 `--query` 为准（显式压过推断）。

#### 场景：两形态并存

- When `cmdSearch(dir, ['位置词', '--query', '显式词'], {})`
- Then 实际查询词 = 「显式词」（--query 优先），位置词不生效

### FR-03: flag-as-value 防护语义保持（--query 后跟 flag 字面量仍按缺参处理）

- 必须：`--query` 后跟 `--` 开头的 flag 字面量时维持既有缺参判定；位置参数扫描永不拾取 `--` 开头的 token（查询词以 `--` 开头时只能走 `--query`）。

#### 场景：flag-as-value 既有坑

- When `cmdSearch(dir, ['--query', '--limit', '3'], {})`
- Then 判定缺参，输出 ok:false + error 含「--query is required」（不静默拿 `--limit` 当查询词，也不从残参里捡到位置词）

### FR-04: AGENTS.md 模板与 CLI help 的用法说明与实际行为一致

- 必须：主 CLI help（index.js knowledge 段）与 knowledge 子命令 help 展示的位置参数形态与实际行为一致；AGENTS.md 模板（templates/agents-instruction.md）既有 `search "<关键词>"` 写法经此变更后为真（模板文本不需改动即为可执行用法）。

#### 场景：help 面一致性

- When 检查 index.js knowledge help 行与 stages/knowledge.js 子命令 help 行
- Then 两处均含位置参数形态 `search "<关键词>"`（行为与文本一致，存量仓 AGENTS.md 写法直接变真）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-search-positional.test.mjs「T1 位置参数与 --query 等效」
FR-02: test/knowledge-search-positional.test.mjs「T2 两形态并存 --query 优先」
FR-03: test/knowledge-search-positional.test.mjs「T3 flag-as-value 防护保持」
FR-04: test/knowledge-search-positional.test.mjs「T4 help 面位置参数形态一致」
