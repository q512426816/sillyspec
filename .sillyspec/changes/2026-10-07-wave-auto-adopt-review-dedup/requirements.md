---
author: flow-machine-draft
created_at: 2026-10-06T23:09:36.897Z
---
# 需求规格（Requirements）— 2026-10-07-wave-auto-adopt-review-dedup

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: plan postcheck：仅 Wave 形态错误（同 Wave 共享/非法 Wave 号/伪并行串行链）时自动重排复验通过（输出含自动重排公告，plan.md/tasks.md W 列已被 adoptPlanWaves 更新）；重排后仍有错则报新错误并说明已自动重排；混有非 Wave 类错误时不自动重排（行为=现状）

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: plan.auto_adopt_waves: false 时零自动重排（报错现状 + adopt-waves 指路），config-schema 注册该键且 renderExample 含 token

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: renderReviewerTaskbook：changeDir 有既有 review.json 时任务书含前轮 findings 列表（severity+title）与去重引导语；无 review.json 时任务书与现状逐字一致

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-04: Design Grill 步骤 prompt 含前轮发现去重引导（对既有 review 语义无损）

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-05: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core

- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-02: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-03: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-04: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）
FR-05: （待填——哪个测试文件/用例覆盖这条 FR；无测试面写「不适用：理由」）

### FR-07: 实测门失败面增量重跑（task-07 追加，方案 1 并入）：前轮失败后下轮只跑「失败批测试文件 ∪ 自失败基线以来变更文件」的三源推断面，未触碰绿面复用；verify: test_rerun: full 恒全子集（现状）

verify --done 的 dynamic-subset 档必须在前轮实测失败后把失败批测试文件（按 TAP not ok 块 location 路径归因，pytest FAILED 行兜底，归因不出保守全记批文件）与当时 git HEAD 落 ledger；下轮增量面 = 失败批 ∪ 自 HEAD 以来变更文件，严格小于全量面时只跑增量面（mode=incremental-rerun 且 reason 披露口径），增量绿后清账回全子集基线；local.yaml verify: test_rerun: full 或 env SILLYSPEC_TEST_RERUN=full 必须恒全子集（现状行为），test_strategy: full/skip 不受影响。

#### 场景：修复轮增量

Given 全子集首跑 1/4 测试文件失败并落账 / When 修复该文件后重跑 verify --done / Then mode=incremental-rerun、命令面不含未触碰测试文件、绿过门且 ledger 清账（下轮回全子集基线）。

#### 场景：保守档

Given local.yaml 配 verify: test_rerun: full / When 同场景重跑 / Then 仍全子集模式（dynamic-subset，不走增量）。
