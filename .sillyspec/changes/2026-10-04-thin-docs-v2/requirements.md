---
author: flow-machine-draft
created_at: 2026-10-04T14:45:41.742Z
---
# 需求规格（Requirements）— 2026-10-04-thin-docs-v2

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: flow start 起草的四件文档为纯 markdown 零 MACHINE-DRAFT 指纹标记零 AGENT 槽注释
Given flow start 对新变更执行 draftAll 起草（draft ledger schemaVersion=2 轨）
When proposal/requirements/design/tasks 四件落盘
Then 四件为纯 markdown 正文——零 `<!-- MACHINE-DRAFT:` 指纹标记、零 `<!--AGENT:` 槽注释（正文提及这些词不算）；防篡改锚点（criteria 原文+四问文本+首版全文）只存 .runtime 的 draft-ledger 机器态

### FR-02: requirements FR 骨架改为 SHALL 正文加 Scenario WHEN THEN 句式且不再机器预填 GWT 场景体
Given 新起草的 requirements.md（v2 轨）
When 起草器生成 FR 块
Then 每条 = `### FR-NN: <成功标准原文>` 标题锚 + 一行待撰写指引（agent 撰写带强度词的行为句：必须/禁止/SHOULD/SHOULD NOT/MUST）+ 场景块指引（`#### 场景：名` + Given/When/Then 行——收敛厚道既有形态，归档索引零改动）；起草器不生成任何 Given/When/Then 预填行与「行为符合本条标准描述」占位句；FR 正文缺强度词或待撰写占位在场 → flow done verifyThinDocsV2 拒收

### FR-03: 成功标准摘录不再做复合拆分与编号劫持与 80 字截断变形
Given --input 含成功标准节条目、正文编号条目、分号/斜杠复合句、超 80 字符长句
When extractSuccessCriteria 摘录
Then 只有成功标准节条目（与无节时列表行）入选——正文编号条目不劫持；分号/斜杠复合条目整条保留不拆；长条目全文进 FR 标题锚与 tasks 镜像行（clipTaskText 截断对镜像行退役）

### FR-04: design 四问文本与 flow done 门禁判据由单一源常量同源供给
Given DESIGN_QUESTIONS 常量（flow-draft.js 导出）
When 起草器写 design.md 与验收端 verifyThinDocsV2 校验
Then 两端消费同一常量（验收读 ledger.anchor.designQuestions，缺省回落常量本体）；四问原文被改写 → 拒收「问题文本被改写」；flow-review 承诺词扫描按同源常量剥离问题行（v2 无指纹段可剥——防模板自污染误升级评审）

### FR-05: 起草锚点存入 draft ledger 机器态且 flow done 做文档与锚对比输出漂移 advisory
Given draft ledger schemaVersion=2 的 anchor（criteria 数组+四问文本）
When flow done 工件校验
Then requirements FR 标题锚缺失锚内成功标准原文（子串语义——整段改写才算漂移，轻改写保留原文不误报）→ 输出「门柱漂移 advisory」不阻断；tasks 镜像行缺失同判 advisory；结构破坏（design 节被删/问题被改/requirements 缺失/绑定行空）→ violations 拒收

### FR-06: flow start 支持 autopilot 声明且新增 flow approve 子命令记录 spec 断点用户批准
Given 轻量变更在 spec 断点（agent 填完 FR+design 后动工前）
When 用户运行 `sillyspec flow approve --change <名>`（或 flow start 声明 `--autopilot`）
Then flow-state 落 {spec_approved:true, spec_approved_at, spec_approved_by}（approve 留痕谁在何时批）或 {autopilot:true}（显式豁免留痕）；approve 对不存在变更 exit 2

### FR-07: 未声明 autopilot 的变更在 flow done 因缺批准证据拒收
Given v2 起草变更（ledger schemaVersion=2）既无 spec_approved 也无 autopilot
When flow done artifacts 子步
Then 拒收（exit 非零）并指引两出路：用户跑 flow approve / 用户显式 --autopilot 重入声明；v1 在途变更（ledger 无 schemaVersion 字段）不适用本门（双轨豁免——FR-09）

### FR-08: tasks.md 保留成功标准镜像任务锚并显式允许 agent 追加细化行
Given 新起草的 tasks.md（v2 轨）
When 起草器生成任务面
Then 镜像行 = 成功标准逐条全文本 checkbox 行（不截断）+ 头注明示「镜像行勿删（任务锚）、细化行可追加（task-NN 编号顺延）」；agent 追加细化行零违规；镜像行整删 → 漂移 advisory（非拒收）；tasks.md 整删/零任务行 → 拒收；既有勾选哨兵治理（tick 幂等/区间提交 token 证据/代勾留痕）对新行形态继续生效

### FR-09: 存量指纹 ledger 在途变更走旧校验双轨不受影响
Given 在途变更持有 v1 draft ledger（schemaVersion 缺省）与 MACHINE-DRAFT 指纹文档
When 升级后的 CLI 执行 redraftMissingArtifacts / verifyFlowDrafts / verifyRequirementBindings / extractRequirementBindings / ensureBindingSlots / flow-review 承诺词扫描 / flow-parity 槽4 收割
Then redraft 按本变更 ledger 代别选 v1 指纹稿补件（不混代）；verifyFlowDrafts 走 verifyMarkers 三态（schema 回执=1）；绑定槽位门与提取走 AGENT 槽形态；design 四节空槽走 verifyDesignRecordFilled 原门；断点门对 v1 不适用

### FR-10: 新增聚焦测试覆盖上述行为且既有测试回归绿
Given 本变更交付的 src 改动（flow-draft/flow/flow-review/flow-parity）
When 全量测试套与 lint 跑
Then 聚焦面全绿：v2 起草形态/摘录保真/锚对比拒收与 advisory/断点门双 e2e（approve 拒收→批准放行、autopilot 豁免）/双轨回归（v1 指纹三态+amend+补件）；受行为变更影响的四个既有测试文件按新语义更新（复合拆分→不拆、编号劫持→不劫持、GWT 预填→标题锚）；其余既有测试零回归

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「① draftAll v2 形态（纯 markdown 零标记+ledger v2 锚）+任务卡分岔」——四件真标记语法检测（MACHINE-DRAFT/AGENT 双零断言）+ledger schemaVersion=2 与 anchor/files 断言

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「⑦b GWT 骨架预填退役」+ test/fr-agent-writable.test.mjs「① 骨架形态」「③ 行为句未撰写→拒收」——零机器 GWT 行/零占位 Then/待撰写缺强度词拒收

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-compound-split.test.mjs「①②③」（不拆三态+整条入锚）+ test/flow-draft.test.mjs「⑬ 编号条目不劫持」「⑦a 长标准不截断」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/thin-docs-v2.test.mjs「① 四问单一源：起草含常量逐字；问题被改写→拒收」

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/thin-docs-v2.test.mjs「② 门柱漂移 advisory」「④ 结构破坏拒收面」「⑤ adopted 豁免」

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「⑥ 轻量跑道 e2e（v2）：spec 断点机器门」（flow approve 留痕断言）+「⑥b autopilot 豁免」（flow-state autopilot:true 断言）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「⑥」——未批准 done 非零退出+「spec 断点未批准」文案断言；批准后零退出

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/thin-docs-v2.test.mjs「③ tasks 镜像+细化行」（追加零违规/镜像删 advisory）+ test/flow-draft.test.mjs「⑦a」（镜像行全文断言）

<!--AGENT:测试绑定FR-09 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs「⑧b 双轨：v1 在途 ledger 补件走指纹稿」「③④ v1 指纹三态拒收与 AGENT 槽放行」「⑤ amend 留痕」「⑩ v1 槽位门回归」

<!--AGENT:测试绑定FR-10 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/thin-docs-v2.test.mjs（全 5 用例）+ test/flow-draft.test.mjs（全 15 用例含双 e2e）+ 全量 node test/run-tests.mjs 回归 + test/check-syntax.mjs lint（收口由 CLI 实测门亲自复跑）
