---
author: flow-machine-draft
created_at: 2026-09-27T12:42:47.563Z
---
# 需求规格（Requirements）— 2026-09-27-change-birth-stage-brainstorm

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 变更出生阶段 brainstorm
Given 一个 SillySpec 项目库
When 任意路径新建变更行（progress.js initChange / _readOrInit 兜底建行 / db.js DDL 默认值）
Then changes.current_stage 出生值为 'brainstorm'（起步就是头脑风暴——scan 是 auxiliary 从不是主流程起点；display 随之显示「🧠 需求探索」而非「🔍 代码扫描」）

### FR-02: 存量出生默认行迁移
Given 存量库存在旧出生默认行（active + current_stage='scan'，且 stages.scan='pending' 或根本没有 stages.scan 行——registerChange 出生的行不带 stages 行，均=从未真跑过 scan）
When DB_SCHEMA_VERSION 7→8 戳失效触发 _createSchema 重跑
Then 该类行 current_stage 改写为 'brainstorm' 且 last_local_modified_ts 刷新（防平台 pull 静默导回旧值）

### FR-03: 真在跑 scan 的行不动
Given 存量行的 scan 阶段状态为 in-progress（setStage('scan') 置位，真在跑项目扫描）
When v8 迁移执行
Then 该类行 current_stage 保持 'scan' 不被改写

### FR-04: 已跑完/已归档/主流程行不动
Given 存量行 stages.scan='completed'（已跑完的辅助容器）、status='archived'（历史行）、或 current_stage 非 scan（主流程行）
When v8 迁移执行
Then 该类行一律不受迁移影响

### FR-05: 迁移幂等可重入 + 版本四处一致
Given 迁移已执行过的库
When 再次触发 _createSchema（删戳/再失配）
Then 改写值与脏度戳均不变（条件不再命中）；DB_SCHEMA_VERSION / project DDL DEFAULT / shared.js CURRENT_VERSION / progress.js read()._version 四处一致为 8（_version 单一源 CURRENT_VERSION）

### FR-06: 阶段转换契约出生未入门态
Given 变更 current_stage='brainstorm' 且 brainstorm 阶段 pending/无 stages 行（出生未入门态）
When run 任意主流程阶段或 archive（thin/quick 归档、backfill、complete-step 直 run 路径）
Then 转换放行（等价旧 scan auxiliary 出生语义）；真在 brainstorm 中（in-progress/completed）→ archive 仍拒绝

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-birth-stage-brainstorm.test.mjs「--- 1. 出生阶段 = brainstorm ---」三断言 + 「--- 2. DDL 默认 current_stage = brainstorm ---」；test/progress-get-change-stage.test.mjs「getChangeStage：未注册 → null；注册 → scan/active…」注册默认断言

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-birth-stage-brainstorm.test.mjs「--- 3. 存量迁移：三类行各得其所 ---」born-scan-stale 行断言（改写 brainstorm + 脏度戳 toISOString 形态）+ born-no-stages 行断言（registerChange 无 stages 行形态，评审 P3-2 补面）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-birth-stage-brainstorm.test.mjs「--- 3. 存量迁移」scan-inflight 行断言（真在跑 scan 行不动）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-birth-stage-brainstorm.test.mjs「--- 3. 存量迁移」scan-done / born-scan-archived / plan-row 行断言

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-birth-stage-brainstorm.test.mjs「--- 4. 幂等：迁移重跑零效果 ---」；test/platform-sync-schema.test.mjs「--- 1. 版本号四处一致（v8 bump）」+「--- 5. progress.js read()._version === 8」

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-birth-stage-brainstorm.test.mjs「--- 5. checkTransition：出生未入门态」8 断言；存量回归面 test/archive-delta.test.mjs、test/run-complete-step-execute-batch.test.mjs、test/run-complete-step-archive.test.mjs 等 18 文件
