---
author: flow-machine-draft
created_at: 2026-10-06T16:13:04.411Z
---
# 需求规格（Requirements）— 2026-10-07-wave-auto-adopt-review-dedup

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: plan postcheck：仅 Wave 形态错误（同 Wave 共享/非法 Wave 号/伪并行串行链）时自动重排复验通过（输出含自动重排公告，plan.md/tasks.md W 列已被 adoptPlanWaves 更新）；重排后仍有错则报新错误并说明已自动重排；混有非 Wave 类错误时不自动重排（行为=现状）

plan postcheck 的失败统一收口点必须且只在「唯一失败组为蓝图一致性且其错误全为 Wave 形态类」时自动跑 plan-adopt-waves 重排并整体复跑一次（预算 1 次防环）；伪并行串行链 error 点必须同款挂钩；混有非 Wave 类错误时禁止自动重排（两族错误都按现状报出）。

#### 场景：拓扑可分离的同 Wave 冲突

Given task-02 depends_on task-01 且两卡同改 src/shared.js 被手排进同一 Wave / When plan postcheck / When 自动重排复跑 / Then postcheck 整体通过、plan.md 中两任务分波、输出含自动重排公告。

#### 场景：混合错误不重排

Given 同 Wave 冲突 + task-02 缺 title_zh / When plan postcheck / Then 不自动重排，两族错误均报出（title_zh 与 Wave 冲突）。

### FR-02: plan.auto_adopt_waves: false 时零自动重排（报错现状 + adopt-waves 指路），config-schema 注册该键且 renderExample 含 token

local.yaml plan.auto_adopt_waves: false 时必须零自动重排（冲突 error 照抛、plan.md 原样）；该键必须在 config-schema 注册且 renderExample 输出含其首末段 token；缺省必须为 true（自动）。

#### 场景：关闭档

Given local.yaml 配 plan.auto_adopt_waves: false 与拓扑可分离冲突形态 / When plan postcheck / Then 冲突 error 照抛、plan.md 未被改写。

### FR-03: renderReviewerTaskbook：changeDir 有既有 review.json 时任务书含前轮 findings 列表（severity+title）与去重引导语；无 review.json 时任务书与现状逐字一致

复审任务书在 changeDir 存在含 findings 的 review.json 时必须注入前轮清单（severity+title 逐条，≤20 条）与「已报项只验修复与回归、重点找新增问题、勿整轮重报」优先级引导；无 review.json 或无 findings 时任务书必须与现状逐字一致；本轮 head 标注不受前轮 review.json 影响。

#### 场景：复审注入

Given changeDir 有前轮 FAIL 的 review.json（2 条 findings）/ When renderReviewerTaskbook / Then 任务书含前轮段、逐条 findings、复审优先级引导，head 照抄本轮值。

### FR-04: Design Grill 步骤 prompt 含前轮发现去重引导（对既有 review 语义无损）

Design Grill 复审轮的 {PRIOR_REVIEW_FACTS} 前轮事实注入必须保持既有行为零回归（本变更不得触碰该渲染链路）；既有机制（review-material-pack 的 PRIOR_REVIEW_FACTS/re-review）核查在位、禁止重造平行机制。

#### 场景：既有机制核查

Given Grill 复审轮 / When prompt 渲染 / When {PRIOR_REVIEW_FACTS} 注入 / Then 前轮事实段照常在场（既有机制零回归——本变更未触碰该链路，验证面为全量回归测试通过）。

### FR-05: （并入 FR-01-04 的组合验证）既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

新增两个测试文件（test/wave-auto-adopt.test.mjs、test/test-incremental-rerun.test.mjs）必须收录进 package.json 的 test:core 清单；收口时 test:core 必须全绿（309 用例 0 失败）且 npm run lint 必须 0 报错。

#### 场景：主路径

Given 本变更全部实现合入 / When npm run test:core 与 npm run lint / Then 均零失败退出（CLI 冒烟另证：4 任务伪并行 fixture 自动合并、集成链路失败→修复→增量绿）。

### FR-06: 评审档位撤销说明（记录性条目，无代码面）

本条为记录性裁决：评审档位禁止新增 self 档（review-tier S0/S1→self 与 flow-review 五路证据定档已存在，再加 self 档破坏 1/4 抽样校准）；「--done --answer 补 wait」必须视为已修复项（complete.js requiresWait 门现行自动补全 waitAnswer）；「--step 意图断言」必须作为并发安全设计保留。测试面：不适用（记录性条目，验证面为 design 风险节在档）。

#### 场景：撤销留痕

Given 收口评审 / When 核对 design 与 requirements / Then 撤销三项与理由在档（设计文档「风险与死路」与本条）。

### FR-07: 实测门失败面增量重跑（task-07 追加，方案 1 并入）：前轮失败后下轮只跑「失败批测试文件 ∪ 自失败基线以来变更文件」的三源推断面，未触碰绿面复用；verify: test_rerun: full 恒全子集（现状）

verify --done 的 dynamic-subset 档必须在前轮实测失败后把失败批测试文件（按 TAP not ok 块 location 路径归因，pytest FAILED 行兜底，归因不出保守全记批文件）与当时 git HEAD 落 ledger；下轮增量面 = 失败批 ∪ 自 HEAD 以来变更文件，严格小于全量面时只跑增量面（mode=incremental-rerun 且 reason 披露口径），增量绿后清账回全子集基线；local.yaml verify: test_rerun: full 或 env SILLYSPEC_TEST_RERUN=full 必须恒全子集（现状行为），test_strategy: full/skip 不受影响。

#### 场景：修复轮增量

Given 全子集首跑 1/4 测试文件失败并落账 / When 修复该文件后重跑 verify --done / Then mode=incremental-rerun、命令面不含未触碰测试文件、绿过门且 ledger 清账（下轮回全子集基线）。

#### 场景：保守档

Given local.yaml 配 verify: test_rerun: full / When 同场景重跑 / Then 仍全子集模式（dynamic-subset，不走增量）。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/wave-auto-adopt.test.mjs「WA1 同 Wave 冲突且拓扑可分离 → 自动重排后 postcheck 通过」「WA2 伪并行碎片（4 独立任务手排四波，≥2 可合并对）→ 自动合并后通过」「WA4 混有非 Wave 类错误 → 不自动重排」
FR-02: test/wave-auto-adopt.test.mjs「WA3 auto_adopt_waves: false → 零自动重排（冲突照报）」（renderExample token 由 test/config-schema.test.mjs 全量套件防漂耦合断言覆盖）
FR-03: test/wave-auto-adopt.test.mjs「RB1 复审任务书含前轮 findings；首评任务书与现状一致」
FR-04: 不适用：既有机制核查面——{PRIOR_REVIEW_FACTS} 接线属 review-material-pack 既有链路，本变更零触碰，由全量 test:core 既有用例（knowledge-inject/guidance-output-neutrality 等）回归覆盖
FR-05: test/wave-auto-adopt.test.mjs「WA1-WA4/RB1 全绿」（连同全量 test:core 309 用例 0 失败 + lint 0 报错，见变更提交链 23e4fe6b）
FR-06: 不适用：记录性条目无测试面——撤销裁决留痕在 design 风险节与本条
FR-07: test/test-incremental-rerun.test.mjs「IR1 computeIncrementalFace 纯函数三态」「IR2 集成主链路：全子集失败→修复→增量绿→ledger 清账」「IR3 verify: test_rerun: full → 恒全子集（现状行为）」「IR4 ledger 读写 fail-soft + 首跑前 ledger 读不到」
