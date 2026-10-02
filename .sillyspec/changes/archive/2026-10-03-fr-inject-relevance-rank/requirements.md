---
author: flow-machine-draft
created_at: 2026-10-02T16:04:16.302Z
---
# 需求规格（Requirements）— 2026-10-03-fr-inject-relevance-rank

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 注入 digest 两档排序——TierA 覆盖命中优先、TierB 按来源变更日期新→旧
Given 厚道 buildFrIndexDigestSection（src/run/prompt.js）与轻量道 flowKnowledgeDigest（src/flow.js）两条 FR 注入面、触达域内 active 条目数超过注入帽
When 渲染注入清单
Then 排序两档：TierA=覆盖命中条目（判定与 activeFrCoverageHits/测试门同口径：来源变更交付面 ∪ 绑定 tests，与本次触碰文件单向匹配）置前并带 🎯 标注；TierB=其余条目按来源变更日期新→旧（无日期者居尾，同档 tie-break 全局 id 升序）；注入帽（8）与「+N 条见」指针行语义不变

### FR-02: 覆盖命中的老条目必进注入面
Given 域内 active >8 条、其中某条来源变更的覆盖面与本次触碰文件有交集、该条按旧排序永居前 8 之外（缺陷实证：文件序前 8=每域最老 8 条）
When 渲染注入清单
Then 该条出现在注入清单内且带 🎯 标注（新增测试用例实证）；无覆盖命中时行为退化为纯 TierB 排序，注入条数与既有断言不回归

### FR-03: FR 标题不再 50 字符硬截断
Given flow-draft 机器预填 success criterion 长度超过 50 字符（实证：平台仓 FR-components-shared-038 残句「…专业术语除」）
When draftGwtSkeleton 生成 `### FR-NN: 标题` 行
Then 标题保留全文不截断（Given/When/Then 行的 80 字符帽维持不变）

### FR-04: When/Then 切分改括号深度感知——括号内分隔符不切
Given success criterion 含括号内箭头（实证：「changes→变更中心」被当 When/Then 分隔符，骨架错位）
When draftGwtSkeleton 按 /[→➜]|则|使得/ 切分 When/Then
Then 仅括号深度 0 处的分隔符生效；括号内的 →/➜/则/使得 不触发切分（无有效切分点时 When=全文、Then=占位句，维持既有兜底）

### FR-05: 域 ≤8 条时注入内容不回归
Given 触达域 active 条目 ≤8 条（无截断面）
When 两档排序接入后渲染注入清单
Then 条目集合与既有测试断言完全一致（仅允许顺序按新排序调整）；unmapped 过滤/空态文案/遥测既有字段（count/rendered/truncated/unmappedFiltered）口径不变

### FR-06: 遥测披露排断面
Given 注入渲染发生截断或存在覆盖命中
When fr-inject 遥测事件落盘
Then 新增 tierA 字段披露本次注入面覆盖命中数（既有字段零改动）；轻量道 summary.frCount 口径不变

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-inject-cap.test.mjs「⑥ 日期新者优先」——12 条两日期组无覆盖命中时渲染新日期组 8 条、老日期组进「+N」截断面

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-inject-cap.test.mjs「⑤ 覆盖命中进注入」——归档源变更 change-patch.json 覆盖 src/cli/old.js、变更 design 触碰同文件时，最老的 FR-cli-003 仍进注入面且带 🎯；遥测 tierA=1

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「长标题不截断」——60+ 字符 criterion 生成 requirements.md 后 `### FR-01:` 行含全文

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「括号内箭头不切分」——criterion 含「（changes→变更中心 等）」时 When 行含完整括号内容、Then 行为占位句；括号外 → 仍切分（既有语义保留）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-inject-cap.test.mjs「④ 小域无截断」既有断言 + 新增「⑦ 轻量道排序接入」——flowKnowledgeDigest 直测：≤8 条域注入行集合不变、>8 条含覆盖命中条目带 🎯

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-inject-cap.test.mjs「② 大域截断」遥测断言（count/rendered/truncated/unmappedFiltered 既有字段零回归）+「⑤ 覆盖命中进注入」tierA 新字段断言
