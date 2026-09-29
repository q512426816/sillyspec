---
author: flow-machine-draft
created_at: 2026-09-29T05:15:34.163Z
---
# 需求规格（Requirements）— 2026-09-29-rot-retire-inject-cap

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: {FR_INDEX_DIGEST} 注入收敛——滤 unmapped、top-8 截断、尾部指针行
- 场景：brainstorm step8 注入收敛 — Given 知识索引含大域与 unmapped 池；When 变更域路由结果含 unmapped 或某域 active 条目超 8 条；Then {FR_INDEX_DIGEST} 注入值不含 unmapped 条目、每域渲染条目 ≤8、超量时尾部有「+N 条见 knowledge/fr/…」指针行，且尾部承接指引 blockquote 不被截断
- 场景：unmapped-only 空态 — Given 变更域路由结果仅剩 unmapped（过滤后为空）；When digest 注入渲染；Then 给出指向 knowledge/fr/unmapped.md 的专属空态文案而非整池倾倒

### FR-02: rot 持久标记层拆除——两处写入点与标记设施从 src 消失
- 场景：写入面清零 — Given flow done 与 quick 审计两条链路原各有一处 markFrNeedsReview 调用；When 本变更交付后；Then markFrNeedsReview、cleanupStaleReviewMarks、FR_NEEDS_REVIEW_PREFIX 不再存在于 src，且无新增调用点
- 场景：保留项 — Given rotSuspectFlow 仍需在收口时提醒；When flow done 执行；Then 覆盖计算、console advisory、fr-rot-suspect 遥测（count=strong）行为不变，仅不再落盘标记

### FR-03: readActiveFrDigest 条目不再携带 needsReview 字段，注入排序回到索引序
- 场景：字段拆除 — Given flow start 注入与 brainstorm digest 原按 needsReview 置前排序；When 字段移除后；Then 两处消费点先拆（避免中间态读 undefined），注入条目按索引顺序渲染且无 ⚠️待复核 后缀

### FR-04: knowledge/fr/*.md 现存「待复核：」行全部剥除
- 场景：存量清零 — Given 九个域文件共 471 条「待复核：」行；When 一次性剥除落盘；Then grep -c '^待复核：' 对全部 fr/*.md 返回 0，且条目其余字段（场景/绑定/承接链）零损伤

### FR-05: knowledge-digest 移除 rot 计数告警臂
- 场景：信号消隐 — Given digest 原有「rot 待复核批量标记（>100）」warn 信号与底数行 rot 段；When 标记层拆除后；Then 该信号臂与底数 rot 段移除，inbox/pseudo/binding 三臂行为不变

### FR-06: stage-contract brainstorm --done 重复软门补 unmapped 过滤
- 场景：口径对齐 — Given 该软门原全量载入 unmapped 池做跨域标题比对；When 补过滤后；Then 与 frDupGateFlow 同口径（滤 unmapped），不再对 unmapped 池条目产出跨域疑似重复警告

### FR-07: fr-inject 遥测（digest 源）保持全量 count 并新增截断披露字段
- 场景：遥测加法 — Given digest 注入截断后 count 若随渲染缩水会破坏 L3 口径；When 落遥测；Then count 仍记全量条数，另加 rendered/truncated 与 unmapped 过滤披露字段

### FR-08: 测试门与套件零回归
- 场景：测试门不变 — Given collectFrLinkedTests 消费 activeFrCoverageHits；When 本变更交付后；Then 需求关联回归测试面行为零变化（既有测试全绿佐证）
- 场景：套件全绿 — Given 四个标记相关旧测试文件需适配、一个注入收敛新用例需新增；When 跑 flow 系与 test:core；Then 全绿

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-inject-cap.test.mjs「① unmapped-only 专属空态」「② 大域截断≤8+指针行+blockquote 保留」「①b 混合交付」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs「② rotSuspectFlow 三分判据+遥测 count=strong+不落盘」；test/quick-asset-tail.test.mjs「1a/1b 导出移除钉」

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/thin-fr-inject-parity.test.mjs「① flowKnowledgeDigest 索引序、无 ⚠️」；test/quick-asset-tail.test.mjs「6/6b needsReview 字段拆除钉」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：数据操作无自动化用例——收口亲测面 grep -c "^待复核：" .sillyspec/knowledge/fr/*.md 全零（本变更内已实测通过）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-digest.test.mjs「① 三信号阈值：totals 无 rot 键」

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-index.test.mjs「10e 软门真域夹具透出」（unmapped 比对面已消隐）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-inject-cap.test.mjs「② 大域截断遥测全量口径 count=12/rendered=8/truncated=4」

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-index.test.mjs「11a/11b/11c 注入渲染端到端」+ 全量 npm test（run-tests.mjs）


