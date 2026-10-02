---
author: flow-machine-draft
created_at: 2026-10-02T16:34:26.304Z
---
# 需求规格（Requirements）— 2026-10-03-fr-skeleton-gate

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 纯骨架识别与标记——索引条目落「骨架：thin」行
Given 归档索引处理变更 requirements.md 的 FR 块、其全部场景体（scenarioBodies）的 Then 均为机器预填占位句「行为符合本条标准描述」（flow-draft 骨架未展开形态）
When indexRequirements/renderFrLines 把条目写入 knowledge/fr/<域>.md
Then 条目带「骨架：thin」标记行（状态行之后）；任一场景体有实质 Then → 不标（保守判据，宁漏勿误杀）；无场景体 → 不标

### FR-02: 存量回填幂等
Given knowledge/fr 存量条目中存在未标记的纯骨架（场景正文行的 Then 全为占位句）
When 执行 markSkeletonThin(knowledgeRoot)（全域扫描）
Then 纯骨架条目补「骨架：thin」行并返回标记清单；已有标记/非骨架条目零变更；二次执行零变更（幂等）

### FR-03: 注入面排除骨架条目（TierA 覆盖命中例外）
Given 触达域 active 条目中混有骨架与非骨架条目
When buildFrIndexDigestSection（厚道）与 flowKnowledgeDigest（轻量道）渲染注入清单
Then 骨架条目不占注入席位（指针行披露「纯骨架 N 条不注入」）；TierA 覆盖命中的骨架条目仍注入且带 🎯（它可能是该文件唯一行为痕迹）；纯非骨架场景的注入行为与批次1（2026-10-03-fr-inject-relevance-rank）完全一致

### FR-04: digest 解析披露骨架位
Given 知识条目带「骨架：thin」行
When readActiveFrDigest 读取该域
Then 返回条目 skeleton=true（纯增量字段）；查重门/rot suspect/测试绑定面的消费不受影响（不滤不改口径）

### FR-05: 平台仓存量回填完成
Given multi-agent-platform 仓 knowledge/fr 存量骨架条目（9 月大批量薄道产物）
When 用本变更实现的 markSkeletonThin 对该仓执行回填
Then 回填完成且标记数量披露（操作随变更留档）

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-skeleton-gate.test.mjs「② 索引标记」——占位 GWT 的 FR 入索引带「骨架：thin」、实质 Then 的 FR 不带、无场景体不带

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-skeleton-gate.test.mjs「③ 存量回填幂等」——2 纯骨架标记/1 实质/1 已标零变更；二次执行 marked=0

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-skeleton-gate.test.mjs「④ 注入排除+TierA 例外」（厚道 buildFrIndexDigestSection 与轻量道 flowKnowledgeDigest 双面）——骨架不进注入行、指针行披露、覆盖命中骨架带 🎯 在场；fr-inject-cap.test.mjs ①~⑦ 既有断言零回归（非骨架行为不变）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-skeleton-gate.test.mjs「① 判据单元 + ⑤ digest flag」——isThinSkeletonBodies 三态；readActiveFrDigest 对标记条目返回 skeleton=true

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：跨仓一次性操作（markSkeletonThin 对 multi-agent-platform knowledge 执行），回填数量随变更归档件留档（decisions/design 记录）；本仓回填由「③ 存量回填幂等」同款函数覆盖
