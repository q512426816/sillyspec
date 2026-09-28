---
author: flow-machine-draft
created_at: 2026-09-28T16:25:52.579Z
---
# 需求规格（Requirements）— 2026-09-29-brainstorm-closure-gates

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: brainstorm --done 时 proposal.md 缺「成功标准」章节 → warnin
Given 系统就绪
When brainstorm --done 时 proposal.md 缺「成功标准」章节
Then warning（scale≠small 生效，small 豁免）

### FR-02: decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用
Given 系统就绪
When decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用该 D（裸号词边界匹配）
Then warning 逐条点名

### FR-03: design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/
Given 系统就绪
When design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）
Then warning，含闭合 token 不报

### FR-04: design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）
Given 系统就绪
When design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）
Then warning，显式「接受：理由」不报

### FR-05: proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待
Given 系统就绪
When proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待完善/待设计/待确认）
Then warning；design.md 恒查，proposal/requirements/tasks 三条与四件套存在性同条件（scale≠small 生效、small 豁免——与 FR-01 同款 condition）

### FR-06: design.md 残留「待确认」→ warning（决策追踪逐行改「已覆盖」后消除）
Given 系统就绪
When design.md 残留「待确认」
Then warning（决策追踪逐行改「已覆盖」后消除）

### FR-07: 新规则全部经 stage-contract-spec manifest 声明，事前契约与事后门同源
Given stage-contract-spec.js 已声明全部新规则
When 新规则全部经 BRAINSTORM_RULES manifest 声明（renderStageContract 事前契约自动覆盖、事前==事后同源），引擎纯 kind 优先（新增 literal-none），复杂判定 custom kind 留 validator
Then manifest 是新规则唯一声明点，引擎/validator/prompt 三消费方零改动吃到全部新规则

### FR-08: 本变更测试面全绿：新增闭环门测试文件，直接关联存量测试随契约更新后零回归
Given 测试 相关模块就绪
When 本变更测试面（brainstorm-closure-gates/stage-contract-spec/stage-contract/preflight-slimming/validator-rollback/wait-gates）全部 EXIT0；全量套 667/678 过，5 挂与本变更无关（3 个确定性挂在干净 HEAD 工作树复现实证为存量债，2 个满载并发假红单跑全过——证据见 tasks.md task-07）
Then 行为符合本条标准描述（评审 P3-4 勘误：原「全量测试通过」为超实表述，按实际证据面收窄）

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「proposal 缺成功标准 → warning／含成功标准不报／scale=small 豁免」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「D-001@v1 已引用 D-002@v1 未引用 → 仅点名 D-002／剩余风险行含裸号亦算归属」

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「自审存疑：无闭合 token → warning／含 D-xxx/R-xx/已解决不报／checklist 模板行（无冒号应用形态）不误报」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「design-init 骨架 R-01（待填应对策略）→ warning／已填应对不报／接受：理由显式接受不报」

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「tasks.md 独立成行 TODO/待完善 → warning／正常任务行不报」（四文件同款规则）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「决策追踪表待确认残留 → warning／改已覆盖后消除」

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/brainstorm-closure-gates.test.mjs「literal-none 纯 kind 引擎判定」＋test/stage-contract-spec.test.mjs「custom kind 引擎 skip」存量断言

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
npm test 全量（test/run-tests.mjs 聚合）——存量 stage-contract-spec.test.mjs「全齐 0 warning」fixture 按新契约更新（proposal 补成功标准）
