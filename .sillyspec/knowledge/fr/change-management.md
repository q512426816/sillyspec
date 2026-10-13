---
author: sillyspec-fr-index
created_at: 2026-09-27T13:23:17.271Z
---

# FR 索引 — change-management

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/change-management.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-change-management-001 变更出生阶段 brainstorm
变更：2026-09-27-change-birth-stage-brainstorm
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个 SillySpec 项目库；When 任意路径新建变更行（progress.js initChange / _readOrInit 兜底建行 / db.js DDL 默认值）；Then changes.current_stage 出生值为 'brainstorm'（起步就是头脑风暴——scan 是 auxiliary 从不是主流程起点；disp
全文：.sillyspec/changes/archive/2026-09-27-change-birth-stage-brainstorm/requirements.md#FR-01
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-change-birth-stage-brainstorm:flow:FR-01
  tests: test/change-birth-stage-brainstorm.test.mjs「--- 1. 出生阶段 = brainstorm ---」 | test/progress-get-change-stage.test.mjs「getChangeStage：未注册 → null；注册 → scan/active…」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-change-birth-stage-brainstorm
  status: active

## FR-change-management-002 存量出生默认行迁移
变更：2026-09-27-change-birth-stage-brainstorm
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 存量库存在旧出生默认行（active + current_stage='scan'，且 stages.scan='pending' 或根本没有 stages.s；When DB_SCHEMA_VERSION 7→8 戳失效触发 _createSchema 重跑；Then 该类行 current_stage 改写为 'brainstorm' 且 last_local_modified_ts 刷新（防平台 pull 静默导回旧值）
全文：.sillyspec/changes/archive/2026-09-27-change-birth-stage-brainstorm/requirements.md#FR-02
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-change-birth-stage-brainstorm:flow:FR-02
  tests: test/change-birth-stage-brainstorm.test.mjs「--- 3. 存量迁移：三类行各得其所 ---」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-change-birth-stage-brainstorm
  status: active

## FR-change-management-003 真在跑 scan 的行不动
变更：2026-09-27-change-birth-stage-brainstorm
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 存量行的 scan 阶段状态为 in-progress（setStage('scan') 置位，真在跑项目扫描）；When v8 迁移执行；Then 该类行 current_stage 保持 'scan' 不被改写
全文：.sillyspec/changes/archive/2026-09-27-change-birth-stage-brainstorm/requirements.md#FR-03
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-change-birth-stage-brainstorm:flow:FR-03
  tests: test/change-birth-stage-brainstorm.test.mjs「--- 3. 存量迁移」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-change-birth-stage-brainstorm
  status: active

## FR-change-management-004 已跑完/已归档/主流程行不动
变更：2026-09-27-change-birth-stage-brainstorm
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 存量行 stages.scan='completed'（已跑完的辅助容器）、status='archived'（历史行）、或 current_stage 非 s；When v8 迁移执行；Then 该类行一律不受迁移影响
全文：.sillyspec/changes/archive/2026-09-27-change-birth-stage-brainstorm/requirements.md#FR-04
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-change-birth-stage-brainstorm:flow:FR-04
  tests: test/change-birth-stage-brainstorm.test.mjs「--- 3. 存量迁移」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-change-birth-stage-brainstorm
  status: active

## FR-change-management-005 迁移幂等可重入 + 版本四处一致
变更：2026-09-27-change-birth-stage-brainstorm
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 迁移已执行过的库；When 再次触发 _createSchema（删戳/再失配）；Then 改写值与脏度戳均不变（条件不再命中）；DB_SCHEMA_VERSION / project DDL DEFAULT / shared.js CURRENT_V
全文：.sillyspec/changes/archive/2026-09-27-change-birth-stage-brainstorm/requirements.md#FR-05
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-change-birth-stage-brainstorm:flow:FR-05
  tests: test/change-birth-stage-brainstorm.test.mjs「--- 4. 幂等：迁移重跑零效果 ---」 | test/platform-sync-schema.test.mjs「--- 1. 版本号四处一致（v8 bump）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-change-birth-stage-brainstorm
  status: active

## FR-change-management-006 阶段转换契约出生未入门态
变更：2026-09-27-change-birth-stage-brainstorm
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更 current_stage='brainstorm' 且 brainstorm 阶段 pending/无 stages 行（出生未入门态）；When run 任意主流程阶段或 archive（thin/quick 归档、backfill、complete-step 直 run 路径）；Then 转换放行（等价旧 scan auxiliary 出生语义）；真在 brainstorm 中（in-progress/completed）→ archive 仍拒
全文：.sillyspec/changes/archive/2026-09-27-change-birth-stage-brainstorm/requirements.md#FR-06
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-change-birth-stage-brainstorm:flow:FR-06
  tests: test/archive-delta.test.mjs | test/change-birth-stage-brainstorm.test.mjs「--- 5. checkTransition：出生未入门态」 | test/run-complete-step-archive.test.mjs | test/run-complete-step-execute-batch.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-change-birth-stage-brainstorm
  status: active

## FR-change-management-007 design 清单用段头「## <注册key> 仓变更」（可含编号前缀与括号备注后缀）时 parseFileChangeListDetailed 解析出该段条目且带 repo 标注——节不再被 h2 段头截断，段头前主仓条目照常解析
变更：2026-10-13-h2-repo-heading-parse
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-h2-repo-heading-parse/requirements.md#FR-01
最近确认：726c3a45aca84000a79a93cf66a68d4500b7d363

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-h2-repo-heading-parse:flow:测试绑定FR-01
  tests: test/change-list-repo-heading.test.mjs「h2 段头解析出条目带 repo（含编号前缀/括号备注）+ 段头前主仓条目照常」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-h2-repo-heading-parse
  status: active

## FR-change-management-008 段头 key 未注册（含 main）时条目归主仓（repo=null，fail-closed 同既有口径）；非段头的 ## 章节标题仍截断「文件变更清单」节（既有行为零回归）
变更：2026-10-13-h2-repo-heading-parse
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-h2-repo-heading-parse/requirements.md#FR-02
最近确认：726c3a45aca84000a79a93cf66a68d4500b7d363

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-h2-repo-heading-parse:flow:测试绑定FR-02
  tests: test/change-list-repo-heading.test.mjs「未注册 key（含 main）归主仓 + 非段头 ## 章节仍截断节」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-h2-repo-heading-parse
  status: active

## FR-change-management-009 「### <key> 子段」与「cross-repo:<key>: 前缀」两既有形态行为不变（cross-repo-patch-freeze 既有断言全绿）
变更：2026-10-13-h2-repo-heading-parse
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-h2-repo-heading-parse/requirements.md#FR-03
最近确认：726c3a45aca84000a79a93cf66a68d4500b7d363

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-h2-repo-heading-parse:flow:测试绑定FR-03
  tests: test/cross-repo-patch-freeze.test.mjs「既有 ### 子段/cross-repo: 前缀断言全绿（零改动回归锚）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-h2-repo-heading-parse
  status: active

## FR-change-management-010 REPO_SECTION_HEADER_RE 单一源：定义上移 change-list.js 导出、plan-postcheck 改 import 同一符号（design-coverage/design-facts 既有断言零改动全绿）
变更：2026-10-13-h2-repo-heading-parse
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-h2-repo-heading-parse/requirements.md#FR-04
最近确认：726c3a45aca84000a79a93cf66a68d4500b7d363

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-h2-repo-heading-parse:flow:测试绑定FR-04
  tests: test/change-list-repo-heading.test.mjs「FR-04 单一源守卫：定义唯一在 change-list，plan-postcheck 仅 import」 | test/design-coverage.test.mjs | test/design-facts.test.mjs「RE 上移后 plan-postcheck 消费面零改动全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-h2-repo-heading-parse
  status: active

## FR-change-management-011 thin 空面 e2e：空冻结面 + 清单用「## libx 仓变更」段头 → 走纯跨仓规范标注路径（advisory 不阻断），不再误触未标注阻断
变更：2026-10-13-h2-repo-heading-parse
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-h2-repo-heading-parse/requirements.md#FR-05
最近确认：726c3a45aca84000a79a93cf66a68d4500b7d363

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-h2-repo-heading-parse:flow:测试绑定FR-05
  tests: test/thin-empty-face-crosscheck.test.mjs「空面 + ## libx 仓变更 段头 → 纯跨仓标注 advisory 不阻断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-h2-repo-heading-parse
  status: active
