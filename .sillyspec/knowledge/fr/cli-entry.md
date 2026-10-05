---
author: sillyspec-fr-index
created_at: 2026-09-22T12:40:09.727Z
---

# FR 索引 — cli-entry

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/cli-entry.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-cli-entry-001 flow done 全绿
变更：2026-09-22-thin-fr-distill-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试门实测通过+工件指纹校验通过
全文：.sillyspec/changes/archive/2026-09-22-thin-fr-distill-sync/requirements.md#FR-01
最近确认：38a25f17

## FR-cli-entry-002 flow start 为每个新变更机器起草 changes/<名>/design
变更：2026-09-24-thin-design-record
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 为每个新变更机器起草 changes/<名>/design.md：四节骨架（做法概述/接口契约/边界与并发盲维四问/风险与死路），机器段为
全文：.sillyspec/changes/archive/2026-09-24-thin-design-record/requirements.md#FR-01
最近确认：bd4f574726c2121743dd65e3e5f38f51f792c494

## FR-cli-entry-003 flow done 工件子步对 design.md 做指纹三态校验，且 AGEN
变更：2026-09-24-thin-design-record
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 工件子步对 design.md 做指纹三态校验，且 AGENT 槽空槽拒收（写不适用加理由视作已填）
全文：.sillyspec/changes/archive/2026-09-24-thin-design-record/requirements.md#FR-02
最近确认：bd4f574726c2121743dd65e3e5f38f51f792c494

## FR-cli-entry-004 新增测试覆盖骨架生成与空槽拒收两档用例，flow 系测试面全绿
变更：2026-09-24-thin-design-record
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖骨架生成与空槽拒收两档用例，flow 系测试面全绿
全文：.sillyspec/changes/archive/2026-09-24-thin-design-record/requirements.md#FR-03
最近确认：bd4f574726c2121743dd65e3e5f38f51f792c494

## FR-cli-entry-005 flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledg
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledger 合并不改既有段；criteria 来源优先从既有 proposal 成功标
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-01
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-006 flow done 的 ledger 门与 distill 的 delivera
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 的 ledger 门与 distill 的 deliverableFiles 都经并行会话归属切分（复用 splitOwnVsForeign
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-02
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-007 flow done ledger 子步收尾输出实测面对账行（test/lint
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done ledger 子步收尾输出实测面对账行（test/lint 命令、时长、结果文件路径）
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-03
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-008 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-04
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-009 flow done 新增 patch 子步（ledger 后 noAI）：bui
变更：2026-09-25-thin-patch-bindings
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 新增 patch 子步（ledger 后 noAI）：buildFrozenPatch 以 baseline 为基、归属收窄后的本变更文件面
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-bindings/requirements.md#FR-01
最近确认：2264c27134ed5da57a3193baf34f1026295ce0f2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-bindings:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-bindings
  status: active

## FR-cli-entry-010 requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flo
变更：2026-09-25-thin-patch-bindings
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then requirements 机器稿每条 FR 附「测试绑定」AGENT 槽；flow done artifacts 校验槽非空（不适用加理由=已答；零槽=骨架过旧
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-bindings/requirements.md#FR-02
最近确认：2264c27134ed5da57a3193baf34f1026295ce0f2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-bindings:flow:FR-02
  tests: test/flow-draft.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-bindings
  status: active

## FR-cli-entry-011 distill 在 indexRequirements 前从槽位提取绑定行落 t
变更：2026-09-25-thin-patch-bindings
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-bindings/requirements.md#FR-03
最近确认：2264c27134ed5da57a3193baf34f1026295ce0f2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-bindings:flow:FR-03
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-bindings
  status: active

## FR-cli-entry-012 新增测试覆盖三件，flow 系测试全绿
变更：2026-09-25-thin-patch-bindings
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖三件，flow 系测试全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-bindings/requirements.md#FR-04
最近确认：2264c27134ed5da57a3193baf34f1026295ce0f2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-bindings:flow:FR-04
  tests: test/flow-draft.test.mjs | test/flow-protocol.test.mjs | test/flow-route.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-bindings
  status: active

## FR-cli-entry-013 patch 面改为：baseline..HEAD 提交面（.sillyspec/
变更：2026-09-25-thin-patch-scope-fix
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then patch 面改为：baseline..HEAD 提交面（.sillyspec/ 下仅保留本变更目录）∪ 本变更目录全部工作树件（排除 change.patch
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-scope-fix/requirements.md#FR-01
最近确认：7b1dfd7dac919cbf93c81b266852bf398776d0ec

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-scope-fix:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-scope-fix
  status: active

## FR-cli-entry-014 flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.leng
变更：2026-09-25-thin-patch-scope-fix
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.length 动态（现在是七子步）
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-scope-fix/requirements.md#FR-02
最近确认：7b1dfd7dac919cbf93c81b266852bf398776d0ec

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-scope-fix:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-scope-fix
  status: active

## FR-cli-entry-015 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入
变更：2026-09-25-thin-patch-scope-fix
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入 patch）；flow 系测试全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-patch-scope-fix/requirements.md#FR-03
最近确认：7b1dfd7dac919cbf93c81b266852bf398776d0ec

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-patch-scope-fix:flow:FR-03
  tests: test/flow-draft.test.mjs | test/flow-protocol.test.mjs | test/flow-route.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-patch-scope-fix
  status: active

## FR-cli-entry-016 flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时
变更：2026-09-25-thin-brainstorm-prestage
状态：superseded
superseded_by：FR-cli-entry-198
取代链：FR-cli-entry-016 ← FR-cli-entry-198（2026-09-28-unclear-req-to-brainstorm 承接）
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时 exit 2 并给两选一（头脑风暴预段 / 补成功标准重跑）；重入与 adop
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-01
最近确认：cb6fc0a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-brainstorm-prestage:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-brainstorm-prestage
  status: superseded

## FR-cli-entry-017 adopt 收编：变更目录存在 brainstorm 产物（proposal/d
变更：2026-09-25-thin-brainstorm-prestage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then adopt 收编：变更目录存在 brainstorm 产物（proposal/design 在场）且无 flow-state 时，flow start 收编进薄
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-02
最近确认：82b3d9c1e86c166f8b7ba9fb2fdfe3721bd369fe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-brainstorm-prestage:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-brainstorm-prestage
  status: active

## FR-cli-entry-018 flow done 对 adopted 变更豁免 design 四节槽门（bra
变更：2026-09-25-thin-brainstorm-prestage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 对 adopted 变更豁免 design 四节槽门（brainstorm 设计更丰富，打印豁免说明）；绑定门不豁免
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-03
最近确认：82b3d9c1e86c166f8b7ba9fb2fdfe3721bd369fe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-brainstorm-prestage:flow:FR-03
  tests: test/flow-draft.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-brainstorm-prestage
  status: active

## FR-cli-entry-019 agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴
变更：2026-09-25-thin-brainstorm-prestage
状态：superseded
superseded_by：FR-cli-entry-198
取代链：FR-cli-entry-019 ← FR-cli-entry-198（2026-09-28-unclear-req-to-brainstorm 承接）
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-04
最近确认：cb6fc0a0

## FR-cli-entry-020 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
变更：2026-09-25-thin-brainstorm-prestage
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-05
最近确认：82b3d9c1e86c166f8b7ba9fb2fdfe3721bd369fe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-brainstorm-prestage:flow:FR-05
  tests: test/flow-draft.test.mjs | test/flow-protocol.test.mjs | test/flow-route.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-brainstorm-prestage
  status: active

## FR-cli-entry-021 flow done 新增 review 子步（patch 后）：定档→需评审且
变更：2026-09-25-thin-review-slice
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 新增 review 子步（patch 后）：定档→需评审且 review.json 缺失则打印评审任务书（材料包+盲维检查单+预算帽+只读纪
全文：.sillyspec/changes/archive/2026-09-25-thin-review-slice/requirements.md#FR-01
最近确认：ca7133a9411fab448f4e1e009b28dbbaa44f9f41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-review-slice:flow:FR-01
  tests: test/flow-protocol.test.mjs | test/flow-review.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-review-slice
  status: active

## FR-cli-entry-022 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈
变更：2026-09-25-thin-review-slice
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 定档函数三态：承诺词命中/盲维实质作答/diff 原语/editRatio 超阈任一即需评审；全部不命中且无声明才豁免；豁免变更 1/4 定额抽查采样
全文：.sillyspec/changes/archive/2026-09-25-thin-review-slice/requirements.md#FR-02
最近确认：ca7133a9411fab448f4e1e009b28dbbaa44f9f41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-review-slice:flow:FR-02
  tests: test/flow-review.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-review-slice
  status: active

## FR-cli-entry-023 flow start 支持 --review/--no-review 声明通道（
变更：2026-09-25-thin-review-slice
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 支持 --review/--no-review 声明通道（落 flow-state），简报预告定档机制
全文：.sillyspec/changes/archive/2026-09-25-thin-review-slice/requirements.md#FR-03
最近确认：ca7133a9411fab448f4e1e009b28dbbaa44f9f41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-review-slice:flow:FR-03
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-review-slice
  status: active

## FR-cli-entry-024 评审结果进 flow-telemetry（required/sampled/ve
变更：2026-09-25-thin-review-slice
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 评审结果进 flow-telemetry（required/sampled/verdict/发现数）
全文：.sillyspec/changes/archive/2026-09-25-thin-review-slice/requirements.md#FR-04
最近确认：ca7133a9411fab448f4e1e009b28dbbaa44f9f41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-review-slice:flow:FR-04
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-review-slice
  status: active

## FR-cli-entry-025 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flo
变更：2026-09-25-thin-review-slice
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试：定档矩阵/任务书渲染/schema 校验/P1 拦截/豁免路径；flow 系全绿且既有夹具零采样碰撞
全文：.sillyspec/changes/archive/2026-09-25-thin-review-slice/requirements.md#FR-05
最近确认：ca7133a9411fab448f4e1e009b28dbbaa44f9f41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-review-slice:flow:FR-05
  tests: test/stage-burst.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-review-slice
  status: active

## FR-cli-entry-026 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未
变更：2026-09-25-thin-upgrade-consent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 混跑回退写侧加升厚同意门：thin change 跑 run <stage> 未带 --upgrade-thick 时拒跑 exit 2 并指路（征得同意带 f
全文：.sillyspec/changes/archive/2026-09-25-thin-upgrade-consent/requirements.md#FR-01
最近确认：c80addc013fb9cd8c4277ebb94626e66c44b7d49

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-upgrade-consent:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-upgrade-consent
  status: active

## FR-cli-entry-027 flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照
变更：2026-09-25-thin-upgrade-consent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户，不再出现照办式表述）
全文：.sillyspec/changes/archive/2026-09-25-thin-upgrade-consent/requirements.md#FR-02
最近确认：c80addc013fb9cd8c4277ebb94626e66c44b7d49

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-upgrade-consent:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-upgrade-consent
  status: active

## FR-cli-entry-028 agents-instruction 规则同步（升厚需用户同意）
变更：2026-09-25-thin-upgrade-consent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction 规则同步（升厚需用户同意）
全文：.sillyspec/changes/archive/2026-09-25-thin-upgrade-consent/requirements.md#FR-03
最近确认：c80addc013fb9cd8c4277ebb94626e66c44b7d49

## FR-cli-entry-029 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
变更：2026-09-25-thin-upgrade-consent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-upgrade-consent/requirements.md#FR-04
最近确认：c80addc013fb9cd8c4277ebb94626e66c44b7d49

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-upgrade-consent:flow:FR-04
  tests: test/stage-burst.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-upgrade-consent
  status: active

## FR-cli-entry-030 flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列
变更：2026-09-25-thin-parity-assets
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列出模块与文档路径，模块代码变更而文档未动给强提示（advisory）
全文：.sillyspec/changes/archive/2026-09-25-thin-parity-assets/requirements.md#FR-01
最近确认：1d997c601a4a9f95cb43244d40dcd1bc446a7430

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-parity-assets:flow:FR-01
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-parity-assets
  status: active

## FR-cli-entry-031 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审
变更：2026-09-25-thin-parity-assets
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审/绑定/冻结 sha/基线区间），随归档留档
全文：.sillyspec/changes/archive/2026-09-25-thin-parity-assets/requirements.md#FR-02
最近确认：1d997c601a4a9f95cb43244d40dcd1bc446a7430

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-parity-assets:flow:FR-02
  tests: test/flow-parity.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-parity-assets
  status: active

## FR-cli-entry-032 distill 收割 design 槽4 实质作答合成 decisions.md
变更：2026-09-25-thin-parity-assets
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then distill 收割 design 槽4 实质作答合成 decisions.md（已有 decisions 不覆盖），随既有蒸馏链进 knowledge
全文：.sillyspec/changes/archive/2026-09-25-thin-parity-assets/requirements.md#FR-03
最近确认：1d997c601a4a9f95cb43244d40dcd1bc446a7430

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-parity-assets:flow:FR-03
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-parity-assets
  status: active

## FR-cli-entry-033 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑
变更：2026-09-25-thin-parity-assets
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑 skip 时回填评审结论
全文：.sillyspec/changes/archive/2026-09-25-thin-parity-assets/requirements.md#FR-04
最近确认：1d997c601a4a9f95cb43244d40dcd1bc446a7430

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-parity-assets:flow:FR-04
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-parity-assets
  status: active

## FR-cli-entry-034 新增测试四件；flow 系全绿
变更：2026-09-25-thin-parity-assets
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试四件；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-parity-assets/requirements.md#FR-05
最近确认：1d997c601a4a9f95cb43244d40dcd1bc446a7430

## FR-cli-entry-035 cmdFlow 的 specBase 改经 resolvePlatformSpe
变更：2026-09-25-thin-platform-args
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行
全文：.sillyspec/changes/archive/2026-09-25-thin-platform-args/requirements.md#FR-01
最近确认：f7ef9258f9f1df6260e12734370b162d48aa0234

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-platform-args:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-platform-args
  status: active

## FR-cli-entry-036 cmdFlowStart/Done 的 ProgressManager 全部以
变更：2026-09-25-thin-platform-args
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then cmdFlowStart/Done 的 ProgressManager 全部以 specDir=specBase 构造（DB 行、change 目录、归档链与工
全文：.sillyspec/changes/archive/2026-09-25-thin-platform-args/requirements.md#FR-02
最近确认：f7ef9258f9f1df6260e12734370b162d48aa0234

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-platform-args:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-platform-args
  status: active

## FR-cli-entry-037 flow start/done/amend-draft 变更名白名单校验（拒穿越
变更：2026-09-25-thin-platform-args
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start/done/amend-draft 变更名白名单校验（拒穿越/default/quick-hex/分隔符，exit 2 给合法格式）
全文：.sillyspec/changes/archive/2026-09-25-thin-platform-args/requirements.md#FR-03
最近确认：f7ef9258f9f1df6260e12734370b162d48aa0234

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-platform-args:flow:FR-03
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-platform-args
  status: active

## FR-cli-entry-038 清晰度门两选一文案补过门格式样例（独立节头行+列表行）
变更：2026-09-25-thin-platform-args
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 清晰度门两选一文案补过门格式样例（独立节头行+列表行）
全文：.sillyspec/changes/archive/2026-09-25-thin-platform-args/requirements.md#FR-04
最近确认：f7ef9258f9f1df6260e12734370b162d48aa0234

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-platform-args:flow:FR-04
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-platform-args
  status: active

## FR-cli-entry-039 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留
变更：2026-09-25-thin-platform-args
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留）、空目录预建放行、名称校验四态、指针恢复；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-platform-args/requirements.md#FR-05
最近确认：f7ef9258f9f1df6260e12734370b162d48aa0234

## FR-cli-entry-040 package.json 版本 3.29.6→3.30.0（AGENTS.md
变更：2026-09-25-thin-release-pack
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then package.json 版本 3.29.6→3.30.0（AGENTS.md 受管段版本差升级链解锁）
全文：.sillyspec/changes/archive/2026-09-25-thin-release-pack/requirements.md#FR-01
最近确认：a0ba25c12d8e23f99e4c530656aae68854c45617

## FR-cli-entry-041 flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收
变更：2026-09-25-thin-release-pack
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HE
全文：.sillyspec/changes/archive/2026-09-25-thin-release-pack/requirements.md#FR-02
最近确认：a0ba25c12d8e23f99e4c530656aae68854c45617

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-release-pack:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-release-pack
  status: active

## FR-cli-entry-042 verify-result 回执：实测面断点续跑后从 verify-runs 最
变更：2026-09-25-thin-release-pack
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then verify-result 回执：实测面断点续跑后从 verify-runs 最新 test-result.json 回读；HEAD 字段改名收口时 HEAD，
全文：.sillyspec/changes/archive/2026-09-25-thin-release-pack/requirements.md#FR-03
最近确认：a0ba25c12d8e23f99e4c530656aae68854c45617

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-release-pack:flow:FR-03
  tests: test/flow-parity.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-release-pack
  status: active

## FR-cli-entry-043 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
变更：2026-09-25-thin-release-pack
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-release-pack/requirements.md#FR-04
最近确认：a0ba25c12d8e23f99e4c530656aae68854c45617

## FR-cli-entry-044 flow start 删除复杂度预判块（classifyChange 关键词升厚
变更：2026-09-25-thin-precheck-removal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 删除复杂度预判块（classifyChange 关键词升厚建议不再出现在薄道简报——选道只剩形态信号：清晰度门管需求不明，升厚只留用户决策
全文：.sillyspec/changes/archive/2026-09-25-thin-precheck-removal/requirements.md#FR-01
最近确认：b4cfb50860532d62fdc3ee5c2185cf8c36d11252

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-precheck-removal:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-precheck-removal
  status: active

## FR-cli-entry-045 测试 ⑭ 反转：含迁移关键词的 input 不再出现任何升厚建议文案
变更：2026-09-25-thin-precheck-removal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试 ⑭ 反转：含迁移关键词的 input 不再出现任何升厚建议文案
全文：.sillyspec/changes/archive/2026-09-25-thin-precheck-removal/requirements.md#FR-02
最近确认：b4cfb50860532d62fdc3ee5c2185cf8c36d11252

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-precheck-removal:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-precheck-removal
  status: active

## FR-cli-entry-046 agents-instruction 规则 5 同步（选道不看技术关键词，风险面
变更：2026-09-25-thin-precheck-removal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction 规则 5 同步（选道不看技术关键词，风险面归收口评审证据判定）
全文：.sillyspec/changes/archive/2026-09-25-thin-precheck-removal/requirements.md#FR-03
最近确认：b4cfb50860532d62fdc3ee5c2185cf8c36d11252

## FR-cli-entry-047 flow 系全绿
变更：2026-09-25-thin-precheck-removal
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-precheck-removal/requirements.md#FR-04
最近确认：b4cfb50860532d62fdc3ee5c2185cf8c36d11252

## FR-cli-entry-048 run/complete.js 的 --done 链接入 detectFakeC
变更：2026-09-25-sentinel-wiring
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then run/complete.js 的 --done 链接入 detectFakeCheckCompletion：tasks.md 全勾但零完成证据（区间提交 su
全文：.sillyspec/changes/archive/2026-09-25-sentinel-wiring/requirements.md#FR-01
最近确认：2b5c087f8dde8981ca11fbdc24cc3c1c525ae4c3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-sentinel-wiring:flow:FR-01
  tests: test/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-sentinel-wiring
  status: active

## FR-cli-entry-049 轻量变更 flow done 的 artifacts 子步同判接入（change
变更：2026-09-25-sentinel-wiring
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then 轻量变更 flow done 的 artifacts 子步同判接入（changeDir 内 tasks.md 全勾零证据同拒）——两道收口同一哨兵
全文：.sillyspec/changes/archive/2026-09-25-sentinel-wiring/requirements.md#FR-02
最近确认：2b5c087f8dde8981ca11fbdc24cc3c1c525ae4c3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-sentinel-wiring:flow:FR-02
  tests: test/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-sentinel-wiring
  status: active

## FR-cli-entry-050 提交区间口径：quick 用 quick 基线区间提交、flow 用 basel
变更：2026-09-25-sentinel-wiring
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then 提交区间口径：quick 用 quick 基线区间提交、flow 用 baseline..HEAD（与既有归属收窄单源一致）
全文：.sillyspec/changes/archive/2026-09-25-sentinel-wiring/requirements.md#FR-03
最近确认：2b5c087f8dde8981ca11fbdc24cc3c1c525ae4c3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-sentinel-wiring:flow:FR-03
  tests: test/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-sentinel-wiring
  status: active

## FR-cli-entry-051 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 fl
变更：2026-09-25-sentinel-wiring
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then 新增集成测试：全勾零证据拒/全勾有提交证据放/非全勾放 三态（run 侧或 flow 侧至少一道 e2e）
全文：.sillyspec/changes/archive/2026-09-25-sentinel-wiring/requirements.md#FR-04
最近确认：2b5c087f8dde8981ca11fbdc24cc3c1c525ae4c3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-sentinel-wiring:flow:FR-04
  tests: test/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-sentinel-wiring
  status: active

## FR-cli-entry-052 flow 系与 test:core 全绿
变更：2026-09-25-sentinel-wiring
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then flow 系与 test:core 全绿
全文：.sillyspec/changes/archive/2026-09-25-sentinel-wiring/requirements.md#FR-05
最近确认：2b5c087f8dde8981ca11fbdc24cc3c1c525ae4c3

## FR-cli-entry-053 extractSuccessCriteria 增编号条目通道：正文存在三条以上编
变更：2026-09-25-thin-fr-quality
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-quality/requirements.md#FR-01
最近确认：716288a224048fda0dd7514aacfa058d974e0c57

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-quality:flow:FR-01
  tests: test/flow-draft.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-quality
  status: active

## FR-cli-entry-054 draftRequirements 的 GWT 模板字面换为需求语义（Given
变更：2026-09-25-thin-fr-quality
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then draftRequirements 的 GWT 模板字面换为需求语义（Given 平台按当前契约运行/When 本变更交付并运行/Then 条目），例外槽提示改
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-quality/requirements.md#FR-02
最近确认：716288a224048fda0dd7514aacfa058d974e0c57

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-quality:flow:FR-02
  tests: test/flow-draft.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-quality
  status: active

## FR-cli-entry-055 reconcileModuleDocs 增未覆盖目录检测：交付目录不在任何模块
变更：2026-09-25-thin-fr-quality
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then reconcileModuleDocs 增未覆盖目录检测：交付目录不在任何模块 paths 下时点名提示『FR 将落伪域，建议登记模块卡』（advisory）
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-quality/requirements.md#FR-03
最近确认：716288a224048fda0dd7514aacfa058d974e0c57

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-quality:flow:FR-03
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-quality
  status: active

## FR-cli-entry-056 新增测试三件；flow 系全绿
变更：2026-09-25-thin-fr-quality
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then 新增测试三件；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-quality/requirements.md#FR-04
最近确认：716288a224048fda0dd7514aacfa058d974e0c57

## FR-cli-entry-057 patch 冻结面双修：flow start 简报钉死交付代码先提交再 done
变更：2026-09-25-thin-r16-patches
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then patch 冻结面双修：flow start 简报钉死交付代码先提交再 done；会话专属 worktree 判定下未提交 dirty 交付面一并入冻结，共享主
全文：.sillyspec/changes/archive/2026-09-25-thin-r16-patches/requirements.md#FR-01
最近确认：3a2020e4b658fd3f1ac05363536abea551f12db7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-r16-patches:flow:FR-01
  tests: test/flow-parity.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-r16-patches
  status: active

## FR-cli-entry-058 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与
变更：2026-09-25-thin-r16-patches
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then 评审任务书检查单加披露边界显式裁决条款：每条声明的设计边界/取舍必须写明可接受与否与理由，未裁决视为未审，不可接受边界按发现分级上报
全文：.sillyspec/changes/archive/2026-09-25-thin-r16-patches/requirements.md#FR-02
最近确认：3a2020e4b658fd3f1ac05363536abea551f12db7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-r16-patches:flow:FR-02
  tests: test/flow-review.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-r16-patches
  status: active

## FR-cli-entry-059 ledger 子步断点续跑 skip 时从 verify-runs 最近 tes
变更：2026-09-25-thin-r16-patches
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then ledger 子步断点续跑 skip 时从 verify-runs 最近 test-result 回填实测面摘要（回执不失忆）
全文：.sillyspec/changes/archive/2026-09-25-thin-r16-patches/requirements.md#FR-03
最近确认：3a2020e4b658fd3f1ac05363536abea551f12db7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-r16-patches:flow:FR-03
  tests: test/flow-parity.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-r16-patches
  status: active

## FR-cli-entry-060 新增测试覆盖三件；flow 系全绿
变更：2026-09-25-thin-r16-patches
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then 新增测试覆盖三件；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-r16-patches/requirements.md#FR-04
最近确认：3a2020e4b658fd3f1ac05363536abea551f12db7

## FR-cli-entry-061 FR 区 agent 直写架构
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 轻量变更的 requirements 需 agent 填写行为语义；When flow start 生成骨架后 agent 直接书写；Then FR 质量由 agent 保证、不走 amend、不触发 edit_ratio
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-01
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

## FR-cli-entry-062 draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-01
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-agent-writable:flow:FR-01
  tests: test/fr-agent-writable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-agent-writable
  status: active

## FR-cli-entry-063 amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then amendFlowDraft：撤掉 requirements-frs 的特殊处理（FR 不再是机器段，无 amend 需求）
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-02
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-agent-writable:flow:FR-02
  tests: test/fr-agent-writable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-agent-writable
  status: active

## FR-cli-entry-064 flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then flow done 校验：FR 区非空（agent 填了）+ 绑定槽非空（现有行为不变）
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-03
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-agent-writable:flow:FR-03
  tests: test/fr-agent-writable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-agent-writable
  status: active

## FR-cli-entry-065 adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽，不受影响
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then adopt 路径兼容：brainstorm 的 requirements 是 agent 手写——ensureBindingSlots 按实际 FR 编号追加槽
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-04
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-agent-writable:flow:FR-04
  tests: test/fr-agent-writable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-agent-writable
  status: active

## FR-cli-entry-066 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then 测试：骨架形态（FR 区为 AGENT 槽含参考注释）/agent 填写后 flow done 通过/空白拒收 三面
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-05
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-agent-writable:flow:FR-05
  tests: test/fr-agent-writable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-agent-writable
  status: active

## FR-cli-entry-067 --freeze-dirty 显式声明入冻
变更：2026-09-25-thin-freeze-git-hygiene
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 共享主仓存在本变更的未提交交付文件；When flow done --freeze-dirty；Then 非他侧声明的 dirty 交付文件全归本变更并入冻结面（exclusiveFrom='flag' 标签区分）
全文：.sillyspec/changes/archive/2026-09-25-thin-freeze-git-hygiene/requirements.md#FR-01
最近确认：dc281c3659ee9d34d2151dc3a90f8b866fe31cce

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-freeze-git-hygiene:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-freeze-git-hygiene
  status: active

## FR-cli-entry-068 共享主仓 dirty 警告三选一
变更：2026-09-25-thin-freeze-git-hygiene
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When flow done 时共享主仓有未提交交付文件且未声明；Then 警告点名三选一（接受缺口 / --freeze-dirty 重跑 / 专属 worktree），简报同步冻结面规则说明
全文：.sillyspec/changes/archive/2026-09-25-thin-freeze-git-hygiene/requirements.md#FR-02
最近确认：dc281c3659ee9d34d2151dc3a90f8b866fe31cce

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-freeze-git-hygiene:flow:FR-02
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-freeze-git-hygiene
  status: active

## FR-cli-entry-069 归档后 git 压扁指引
变更：2026-09-25-thin-freeze-git-hygiene
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — When flow done 归档完成且 head 不等于 baseline；Then 打印 reset --soft <baseline> 压扁为单提交指引，注明审计真相在 change.patch sha 锚定不依赖历史形态
全文：.sillyspec/changes/archive/2026-09-25-thin-freeze-git-hygiene/requirements.md#FR-03
最近确认：dc281c3659ee9d34d2151dc3a90f8b866fe31cce

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-freeze-git-hygiene:flow:FR-03
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-freeze-git-hygiene
  status: active

## FR-cli-entry-070 测试覆盖
变更：2026-09-25-thin-freeze-git-hygiene
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 上述三件行为；When 跑 flow 系测试；Then flag 入冻/三选一文案/压扁指引均有断言且全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-freeze-git-hygiene/requirements.md#FR-04
最近确认：dc281c3659ee9d34d2151dc3a90f8b866fe31cce

## FR-cli-entry-071 轻量变更三断点可控性
变更：2026-09-25-flow-checkpoints
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 轻量变更 2 调用协议；When agent 执行任务；Then 用户在三个断点可以看到进度并确认
全文：.sillyspec/changes/archive/2026-09-25-flow-checkpoints/requirements.md#FR-01
最近确认：6db77d5e6faedf28270ba6a0ded9814542e21b74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-flow-checkpoints:flow:FR-01
  tests: test/flow-checkpoints.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-flow-checkpoints
  status: active

## FR-cli-entry-072 合取标准拆分为独立 FR
变更：2026-09-25-fr-compound-split
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成功标准条目内含「A/B」或「A；B」的合取标准；When extractSuccessCriteria 收集节内条目；Then 合取标准拆为独立条目（分号恒拆；斜杠仅在非路径形态拆）
全文：.sillyspec/changes/archive/2026-09-25-fr-compound-split/requirements.md#FR-01
最近确认：65a025c9a2ff843897cb56df2208faf1bed150c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-compound-split:flow:FR-01
  tests: test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-compound-split
  status: active

## FR-cli-entry-073 路径形态不拆
变更：2026-09-25-fr-compound-split
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 条目含扩展名点或多处斜杠（src/flow.js、backend/app/x.py 形态）；When 复合拆分判定；Then 条目完整保留不被斜杠误劈
全文：.sillyspec/changes/archive/2026-09-25-fr-compound-split/requirements.md#FR-02
最近确认：65a025c9a2ff843897cb56df2208faf1bed150c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-compound-split:flow:FR-02
  tests: test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-compound-split
  status: active

## FR-cli-entry-074 拆后条目进入参考摘录
变更：2026-09-25-fr-compound-split
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成功标准为「后端端点可访问/鉴权生效」与「前端正常渲染」；When flow start 起草 requirements；Then 参考摘录呈现 FR-01 后端端点可访问、FR-02 鉴权生效、FR-03 前端正常渲染三行
全文：.sillyspec/changes/archive/2026-09-25-fr-compound-split/requirements.md#FR-03
最近确认：65a025c9a2ff843897cb56df2208faf1bed150c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-compound-split:flow:FR-03
  tests: test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-compound-split
  status: active

## FR-cli-entry-075 勾选纪律与产物必读
变更：2026-09-25-flow-tick-prototype
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 轻量变更执行期；When fresh 或 adopt 路径启动；Then 简报含勾选纪律、adopt 列产物必读清单、status 显勾选进度
全文：.sillyspec/changes/archive/2026-09-25-flow-tick-prototype/requirements.md#FR-01
最近确认：c43b9825fcaf591a3abb0d8bbd7ac4dd782581aa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-flow-tick-prototype:flow:FR-01
  tests: test/flow-tick-prototype.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-flow-tick-prototype
  status: active

## FR-cli-entry-076 第 3 条附注改为轻量变更默认快道口径
变更：2026-09-25-agents-lightweight-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本仓 AGENTS.md 第 3 条附注仍称 `flow start/done` 薄协议为实验通道（local.yaml `flow.mode: thin` 显；When 按模板 templates/agents-instruction.md 规则 5 口径同步该附注；Then 附注不再含「实验通道」「不作默认」表述，改述为轻量变更默认快道（`flow.mode` 缺省即 thin，显式 `mode: legacy` 回旧道），并补轻量
全文：.sillyspec/changes/archive/2026-09-25-agents-lightweight-sync/requirements.md#FR-01
最近确认：5a9f7867815373339b590f08e3a0c622eba41051

## FR-cli-entry-077 选道与倒推 B 模式改指轻量变更
变更：2026-09-25-agents-lightweight-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 第 4/6/7 条把小修复、选道判据、倒推 B 收尾指向退役中的 quick 道；When 同步模板规则 3/8/9 口径；Then 第 4 条小修复走 `flow start --input` → `flow done` 两调用；第 6 条选道按流程形态判（明确→轻量 / 不明→brains
全文：.sillyspec/changes/archive/2026-09-25-agents-lightweight-sync/requirements.md#FR-02
最近确认：5a9f7867815373339b590f08e3a0c622eba41051

## FR-cli-entry-078 quicklog 落盘条目补存量通道括注
变更：2026-09-25-agents-lightweight-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 第 15 条 quicklog 结构化落盘规则未标注通道定位；When 补存量通道括注；Then 明确「存量通道——新工作不再产生 quicklog 条目，轻量变更以变更级归档取代；仅收尾存量 quick 会话时适用」
全文：.sillyspec/changes/archive/2026-09-25-agents-lightweight-sync/requirements.md#FR-03
最近确认：5a9f7867815373339b590f08e3a0c622eba41051

## FR-cli-entry-079 其余条目零改动
变更：2026-09-25-agents-lightweight-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given AGENTS.md 其余条目（头注释与第 1-2、5、8-14、16-19 条，含本仓专属 git 纪律与会话身份条目）与本口径同步无关；When 修正仅限第 3/4/6/7/15 条；Then 其余条目逐字不动，以 `git diff -- AGENTS.md` 变更范围核对为证
全文：.sillyspec/changes/archive/2026-09-25-agents-lightweight-sync/requirements.md#FR-04
最近确认：5a9f7867815373339b590f08e3a0c622eba41051

## FR-cli-entry-080 机器段哈希勾选态归一
变更：2026-09-25-thin-done-gate-calibration
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow start 生成的 tasks.md 含 `- [ ] task-NN` 机器段且 tasks-rows 指纹在 draft-ledger 在案；When agent 按横幅纪律把任务行勾选为 `- [x] task-NN`（不改任务文本、不跑 amend-draft）；Then flow done 工件校验对 tasks-rows 验证通过（勾选态不参与「被改写」判定）；改任务文本或增删行仍判内容失配拒收
全文：.sillyspec/changes/archive/2026-09-25-thin-done-gate-calibration/requirements.md#FR-01
最近确认：d8c60ebc68a68a2364ad0e17ca8fbb202de53caa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-done-gate-calibration:flow:FR-01
  tests: test/machine-draft.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-done-gate-calibration
  status: active

## FR-cli-entry-081 收口哨兵证据取整条提交消息
变更：2026-09-25-thin-done-gate-calibration
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given tasks.md 全勾且区间某提交的标题行不含 task-NN、正文含完整 token；When flow done 或 quick 收口哨兵取证；Then 该任务计为有完成证据、不拒收；零证据拒收时文案写明「提交标题或正文带 task-NN」
全文：.sillyspec/changes/archive/2026-09-25-thin-done-gate-calibration/requirements.md#FR-02
最近确认：d8c60ebc68a68a2364ad0e17ca8fbb202de53caa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-done-gate-calibration:flow:FR-02
  tests: test/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-done-gate-calibration
  status: active

## FR-cli-entry-082 回归用例钉住新契约
变更：2026-09-25-thin-done-gate-calibration
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given machine-draft 三件套与哨兵接线测试面；When 套件执行；Then 「勾选后指纹仍匹配」「提交正文含 task-NN 过哨兵」两例在场（夹具不再借 amend-draft 绕指纹门），相关套件全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-done-gate-calibration/requirements.md#FR-03
最近确认：d8c60ebc68a68a2364ad0e17ca8fbb202de53caa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-done-gate-calibration:flow:FR-03
  tests: test/machine-draft.test.mjs | test/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-done-gate-calibration
  status: active

## FR-cli-entry-083 勾选/指纹/CRLF/恢复四件修复
变更：2026-09-25-feedback-fixes
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台狗粮实证反馈；When 逐条判定修复；Then 勾选自由、CRLF 兼容、报错可恢复
全文：.sillyspec/changes/archive/2026-09-25-feedback-fixes/requirements.md#FR-01
最近确认：e2678d8e7ccab1f1df59750e3d3c898acf390bcf

## FR-cli-entry-084 flow start 三路径知识注入段
变更：2026-09-25-thin-fr-inject-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 轻量道 fresh 不经 brainstorm，{FR_INDEX_DIGEST}/{DECISION_HITS} 注入面缺失；When flow start 简报（fresh/resume/adopt 三路径）尾部追加 flowKnowledgeDigest 段（触达域 active FR——待
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-inject-parity/requirements.md#FR-01
最近确认：5f05ee9fede74c0ebebc559666d0635238da936a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-inject-parity:flow:FR-01
  tests: test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-inject-parity
  status: active

## FR-cli-entry-085 注入段不污染材料清单稳定前缀
变更：2026-09-25-thin-fr-inject-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 材料路径清单是稳定前缀（缓存最优）；When 注入段为动态内容（域随语料变）；Then 注入段独立成块追加在材料清单之后；端到端断言「材料路径清单」出现位置先于「🧠 知识注入」
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-inject-parity/requirements.md#FR-02
最近确认：5f05ee9fede74c0ebebc559666d0635238da936a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-inject-parity:flow:FR-02
  tests: test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-inject-parity
  status: active

## FR-cli-entry-086 flow done 收口 fr-rot-suspect 检测
变更：2026-09-25-thin-fr-inject-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given quick 退役后 fr-rot-suspect 钩子（quick-done 侧独有）悬空；When flow done ledger 子步实测门通过后按归属文件面（attributedChangedFiles）→ 模块域 → active FR 检测；Then 记 fr-rot-suspect 遥测（source=flow-done）+ markFrNeedsReview 待复核标记（下次知识注入带 ⚠️，承接翻链清除
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-inject-parity/requirements.md#FR-03
最近确认：5f05ee9fede74c0ebebc559666d0635238da936a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-inject-parity:flow:FR-03
  tests: test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-inject-parity
  status: active

## FR-cli-entry-087 flow done distill 前 FR 重复嫌疑软门
变更：2026-09-25-thin-fr-inject-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 轻量 FR distill 直写索引，无与既有 active 条目的对账时机；When distill 子步 indexRequirements 之前跑 frDupGateFlow（新 FR 无承接 × 同域 active 标题 bigram ≥0；Then 命中给 advisory warning（双出路：承接行或改标题）+ fr-duplicate-warning 遥测；承接行在场豁免；不阻断 distill
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-inject-parity/requirements.md#FR-04
最近确认：5f05ee9fede74c0ebebc559666d0635238da936a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-inject-parity:flow:FR-04
  tests: test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-inject-parity
  status: active

## FR-cli-entry-088 测试覆盖与既有套件零回归
变更：2026-09-25-thin-fr-inject-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 新增三面逻辑（注入/rot/软门）；When 跑 test/thin-fr-inject-parity.test.mjs（5 用例：域路由命中+待复核优先+否决命中/空态折叠一行/rot 打标+遥测+非触达；Then 5/5 绿；flow 族既有六套件（checkpoints/draft/parity/protocol/review/route）41 用例全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-inject-parity/requirements.md#FR-05
最近确认：5f05ee9fede74c0ebebc559666d0635238da936a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-fr-inject-parity:flow:FR-05
  tests: test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-fr-inject-parity
  status: active

## FR-cli-entry-089 哨兵证据扩展+冻结面归属修复
变更：2026-09-25-sentinel-evidence-freeze
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台狗粮五负面逐条收口；When ②证据面扩全消息 ⑤冻结面修复三件；Then 全部负面有解无遗留
全文：.sillyspec/changes/archive/2026-09-25-sentinel-evidence-freeze/requirements.md#FR-01
最近确认：9d15795d8befee8e4c362a2ee1168fe3ad427b74

## FR-cli-entry-090 frCoverageFiles 三源并集
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given rot 打标需要 FR 覆盖文件集，单源（design 交付表）对 thin 归档覆盖率 0；When fr-index.js 新增导出 frCoverageFiles（归档 design.md 交付表剥反引号 ∪ change-patch.json files，；Then thin 归档 27/30 可从 change-patch.json 补位；反引号交付条目（实测 29.4%）剥壳后可匹配
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-01
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-01
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-091 readActiveFrDigest 新增 bindings 字段
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given rot coverage 第三源是条目测试绑定的 test 文件；When readActiveFrDigest 解析「测试绑定：」子块（锚定子块防正文误匹配，多文件 | 分隔）；Then 返回对象新增 bindings: string[]，纯增量——既有消费方（prompt.js 注入渲染等）零影响
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-02
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: manual:muuslbda:test/fr-index.test.mjs
  tests: test/fr-index.test.mjs
  reason: spec
  state: active
  discovery: agent
  confirmed_by: agent
  confirmed_at: 15821c904c3545325d4e7aa9a30f0d643222396e
  source_change: manual
  status: active

## FR-cli-entry-092 交付表解析抽公共
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given design 表格行正则只存在于 resolveTouchedDomains 内部（两处复用会复制漂移）；When 抽为导出 deliverableFilesFromDesignText（含反引号剥壳）；Then resolveTouchedDomains 改调用（反引号条目现在能命中模块域——原失明面改良）；frCoverageFiles 同源使用
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-03
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-03
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-093 rotSuspectFlow 三分判据
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 域级全标产生 ⚠️ 通胀（本仓实测一次 88 条，keep-latest 每收口全量刷新）；When coverage（来源变更文件面 ∪ bindings）与本次归属文件面单向匹配；Then 交集非空→strong 打标；coverage 空→unknown 不打标（遥测单列，宁漏勿滥——漏标只损失注入排序优先级）；非空无交集→skip；遥测 cou
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-04
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-04
  tests: test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-094 匹配口径单向
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given changed 恒为文件级路径、coverage 含目录形态；When 判定用「相等 || changed.startsWith(cov 补 / 结尾)」；Then 口径单侧定义，目录条目按前缀含
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-05
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-05
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-095 dup 软门最高重叠对 + 场景名
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 侧取首个过阈者与 brainstorm 软门（取最高）微差，且命中提示缺场景上下文；When frDupGateFlow 改取最高重叠对并附 active 条目场景名（过滤（无场景名）占位）；Then 多命中时指认最相近条目；agent 改写承接可直接对照场景（OpenSpec MODIFIED 整块拷贝语义的轻量等价）
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-06
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-06
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-096 阈值常量公共化
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 0.6 在 flow.js 与 stage-contract.js 各写一份（最小漂移面）；When fr-index.js 导出 FR_TITLE_OVERLAP_THRESHOLD，两处改 import；Then 文本钉（限两文件）断言无裸 >= 0.6 且常量 import 在场（verify-probes.js 的第三处 0.6 是另一语义不纳入）
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-07
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-07
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-097 resume 域路由口径
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 裸 git diff 双提交区间漏干活期未提交文件且不带 .sillyspec 剔除；When resume 注入改用 changedFilesSinceBaseline（含 untracked/dirty、剔 .sillyspec，与收口口径同源）；Then 干活中途 resume 也有域路由依据；文本钉防回潮
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-08
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-08
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-098 cleanupStaleReviewMarks 并发安全
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 存量 200 条标记（recent-quick 112 + sentinel 88）多为通胀产物，且域文件被多会话共享；When 清理函数原子写（writeAtomicSync）+ 写前重读比对快照 + 幂等可重跑；Then 盘上被并行改写的文件跳过不覆盖（重跑消化）；superseded 条目不碰
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-09
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-09
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-099 清理判据泛化
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given quick 永不归档（ref 无文件面），逐 ref 特判是特例；When 判据统一为 keep iff coverage(FR 来源变更)∪bindings 与 coverage(ref 变更) 有文件面交集（任一侧空→删）；Then 自然覆盖 quick 侧 112 条 recent-quick 与带 changeName 的 quick ref；与运行时 unknown 不打标口径一致
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-10
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-10
  tests: test/fr-rot-precision.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-100 清理时序
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 清理早于代码合入会被旧判据重标；When 清理执行于代码合入后（本变更内先提交 src 再跑清理）；Then 治理产物与判据同版生效
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-11
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

## FR-cli-entry-101 测试覆盖
变更：2026-09-25-fr-rot-precision
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 新逻辑六面（三源/bindings/抽公共/三分/常量/清理）；When test/fr-rot-precision.test.mjs 六用例 + 改写 thin-fr-inject-parity 测试②（fixture 补归档件+绑；Then 11/11 绿；flow 族+fr-index+decision 底座+contract 面共 116 用例全绿
全文：.sillyspec/changes/archive/2026-09-25-fr-rot-precision/requirements.md#FR-12
最近确认：4f391b8ff8c71c8f75e587a30b22a31c09cc6baf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-rot-precision:flow:FR-12
  tests: test/fr-rot-precision.test.mjs | test/thin-fr-inject-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-rot-precision
  status: active

## FR-cli-entry-102 flow.mode 缺省 thin 现状声明（承接 FR-runtime-020）
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given local.yaml 无 flow 配置（2026-09-25-thin-default-flip 后实现现状）；When readFlowConfig(specBase)；Then mode === 'thin'（缺省即轻量道）；显式 mode: legacy 回旧道——旧条目 FR-runtime-020（依据 D-010@v2）所述「缺
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-01
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-01
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-103 patchText null=采集失败改判需评审
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow.js patch 子步 fail-soft 失败时 catch 传 patchText=null（有真实交付但 patch 恰好失败）；When classifyReviewNeed 收到 null；Then 不进「无交付 diff（纯治理面变更）」豁免证据，改判 reasons「交付 diff 不可得——豁免证据不成立，需评审」（防线虚焊修复）
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-02
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-02
  tests: test/fr-governance-sweep.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-104 空 patch=真无交付 diff 豁免照旧
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given patchText 为空字符串（真无交付 diff，纯治理面变更）；When classifyReviewNeed 收到空串；Then 豁免证据「无交付 diff（纯治理面变更）」照旧成立——两种 null 来源（null/空）分径互不干扰
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-03
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-03
  tests: test/fr-governance-sweep.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-105 resume 声明通道落盘
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given --review/--no-review 对在途变更（resume 重入 start）静默失效（只打恢复简报即 return，不落 review_force）；When resume 时带声明 flag；Then writeFlowState 落盘 review_force 并打印回执——与新变更（fresh）/adopt 两路口径一致；未带 flag（null）不覆盖既
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-04
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-04
  tests: test/fr-governance-sweep.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-106 status 归档检测精确匹配
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 归档目录名恒等 change 名（archiveDestDirName 恒等返回）；When flow status 检测变更是否已归档；Then readdirSync 比对用全等（e === change）——查询 flow-check 不再误命中 flow-checkpoints
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-05
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-05
  tests: test/fr-governance-sweep.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-107 flow-review 头注释如实陈述豁免优先序
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 头注释宣称「承诺词一票升级，任何信号压不住」与实现矛盾（--no-review 声明通道先判直接豁免）；When 读者依头注释理解定档优先序；Then 注释补「唯⑤声明通道 --no-review 显式豁免除外；实现即此优先序」——注释与实现一致
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-06
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-06
  tests: test/fr-governance-sweep.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-108 测试覆盖
变更：2026-09-25-fr-governance-sweep
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更四个行为面（分径×2/resume 声明/精确匹配）；When 跑 test/fr-governance-sweep.test.mjs（4 用例：null 需评审+空豁免分径、resume --review e2e 落盘断言；Then 4/4 绿；flow-review 既有 3 用例与 flow 族套件零回归
全文：.sillyspec/changes/archive/2026-09-25-fr-governance-sweep/requirements.md#FR-07
最近确认：ba8068438a34437daead41adeccb72009c174423

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-governance-sweep:flow:FR-07
  tests: test/flow-review.test.mjs | test/fr-governance-sweep.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-governance-sweep
  status: active

## FR-cli-entry-109 双死路 flag 登记
变更：2026-09-25-cli-protocol-trust
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given CLI 报错指引指向未登记 flag（--same-session 消费于 runStage 逃生口、--force 消费于 quick cancel）；When 两 flag 登记 knownFlags；Then 照报错指引重跑可执行不再 exit 2
全文：.sillyspec/changes/archive/2026-09-25-cli-protocol-trust/requirements.md#FR-01
最近确认：35567c4125f349361a5e82d717eb82d45b4517d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-cli-protocol-trust:flow:FR-01
  tests: test/flag-contract.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-cli-protocol-trust
  status: active

## FR-cli-entry-110 flag 一致性钉
变更：2026-09-25-cli-protocol-trust
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flag 消费/声明漂移类缺陷反复发生（历史三次自修+本次两实例）；When test/flag-contract 静态扫描三种消费形态 vs 白名单；Then 任何被消费未声明的 flag 测试红（整类灭绝钉）
全文：.sillyspec/changes/archive/2026-09-25-cli-protocol-trust/requirements.md#FR-02
最近确认：35567c4125f349361a5e82d717eb82d45b4517d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-cli-protocol-trust:flow:FR-02
  tests: test/flag-contract.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-cli-protocol-trust
  status: active

## FR-cli-entry-111 摘录续行合并与渲染放宽
变更：2026-09-25-cli-protocol-trust
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 括号换行的单条标准被行级切分拆成碎片、tasks 行 60 字硬切半词；When extractSuccessCriteria 前置续行合并 + clipTaskText 句界感知截断 + 碎片特征警告 括号未闭合条目并回成单条、截断带句读+
全文：.sillyspec/changes/archive/2026-09-25-cli-protocol-trust/requirements.md#FR-03
最近确认：35567c4125f349361a5e82d717eb82d45b4517d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-cli-protocol-trust:flow:FR-03
  tests: test/draft-continuation.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-cli-protocol-trust
  status: active

## FR-cli-entry-112 verify 批量对齐前补亲测
变更：2026-09-25-cli-protocol-trust
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 批量乐观对齐跳过 noAI 亲测步致 PASS 封顶拒四步绕行；When 对齐面含 verifyRunQualityScan 步先跑 executeVerifyQualityScan（幂等，失败弃批量）；Then 批量不省任何门承诺恢复；亲测失败保持单步推进无新死路
全文：.sillyspec/changes/archive/2026-09-25-cli-protocol-trust/requirements.md#FR-04
最近确认：35567c4125f349361a5e82d717eb82d45b4517d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-cli-protocol-trust:flow:FR-04
  tests: test/run-complete-noai-done-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-cli-protocol-trust
  status: active

## FR-cli-entry-113 归档链 knowledge 侧窄化 add
变更：2026-09-25-cli-protocol-trust
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given distill 产物（fr 域/decisions/INDEX）untracked 漏提交；When archiveNarrowedGitAdd 按 status 窄化逐文件 add knowledge 面；Then 归档链暂存面覆盖蒸馏产物（fail-soft）
全文：.sillyspec/changes/archive/2026-09-25-cli-protocol-trust/requirements.md#FR-05
最近确认：35567c4125f349361a5e82d717eb82d45b4517d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-cli-protocol-trust:flow:FR-05
  tests: test/archive-chain.test.mjs | test/archive-cli-git-add.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-cli-protocol-trust
  status: active

## FR-cli-entry-114 他侧声明时效+skipped 标因+触发收敛+声明面自证
变更：2026-09-25-platform-feedback-batch2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台狗粮第二轮反馈；When B/C/D/E 四件修复；Then 陈旧声明不抢文件、跳过有因、触发不误报、声明面有自证
全文：.sillyspec/changes/archive/2026-09-25-platform-feedback-batch2/requirements.md#FR-01
最近确认：7d35a99483a946889b3edad1f25b9687a29ef304

## FR-cli-entry-115 绿地模块图草案起草
变更：2026-09-25-greenfield-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 无模块图仓 FR 域路由全落伪域/unmapped（R17 两臂实证）；When flow start 检测模块图缺席且 --input 有路径语料 机器起草初始 _module-map.yaml（目录段聚合、draft 标识、不含 blas
全文：.sillyspec/changes/archive/2026-09-25-greenfield-bootstrap/requirements.md#FR-01
最近确认：2cd087deedfbbb965377c4172a160a57b4ef264f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-greenfield-bootstrap:flow:FR-01
  tests: test/greenfield-bootstrap.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-greenfield-bootstrap
  status: active

## FR-cli-entry-116 archive 侧域路由供清单
变更：2026-09-25-greenfield-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given archive 侧 indexRequirements 不传 deliverableFiles（R17 臂3 落 unmapped 直接成因）；When 两调用点（archive-distill/complete-handlers）供 design 表∪apply-manifest 文件面；Then 全泛化段 design 单源形态落 auto-* 伪域而非 unmapped（与轻量道口径对齐）
全文：.sillyspec/changes/archive/2026-09-25-greenfield-bootstrap/requirements.md#FR-02
最近确认：2cd087deedfbbb965377c4172a160a57b4ef264f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-greenfield-bootstrap:flow:FR-02
  tests: test/greenfield-bootstrap.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-greenfield-bootstrap
  status: active

## FR-cli-entry-117 伪域升级提醒与 unmapped 超阈告警
变更：2026-09-25-greenfield-bootstrap
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 落伪域时升级路径只在文件头注释（无人看）、unmapped 720 条堆积无信号；When indexRequirements 尾部输出；Then 落 auto-*/unmapped 提示补模块卡路径；unmapped>50 告警配治理指引（不阻断）
全文：.sillyspec/changes/archive/2026-09-25-greenfield-bootstrap/requirements.md#FR-03
最近确认：2cd087deedfbbb965377c4172a160a57b4ef264f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-greenfield-bootstrap:flow:FR-03
  tests: test/greenfield-bootstrap.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-greenfield-bootstrap
  status: active

## FR-cli-entry-118 工作单元聚类
变更：2026-09-26-thin-workunits
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given thin 的 tasks.md 是验收标准逐条镜像，勾选判定时刻只在收口（R18-thin 15 条一把全勾实证）；When >5 条标准时 groupCriteriaToUnits 按域关键词聚类为工作单元（后端/前端/端到端/文档+未命中并入） 单元数少于标准数且每标准恰好覆盖一次
全文：.sillyspec/changes/archive/2026-09-26-thin-workunits/requirements.md#FR-01
最近确认：221a7a6cb60926352cc4a39b2741ec1850908abe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-workunits:flow:FR-01
  tests: test/thin-workunits.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-workunits
  status: active

## FR-cli-entry-119 单元行渲染
变更：2026-09-26-thin-workunits
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 单元行是进度信号与验收锚的载体；When draftTasks 渲染 task-NN: <域标签>——<摘要>等（覆盖标准 i,j,k） 行经 clipTaskText 长度管控；≤5 条标准保持逐条原
全文：.sillyspec/changes/archive/2026-09-26-thin-workunits/requirements.md#FR-02
最近确认：221a7a6cb60926352cc4a39b2741ec1850908abe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-workunits:flow:FR-02
  tests: test/thin-workunits.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-workunits
  status: active

## FR-cli-entry-120 勾选纪律文案同步
变更：2026-09-26-thin-workunits
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 旧「完成一条勾一条」语义与单元形态错配；When fresh/adopt 简报与 done advisory 三处文案更新 文案为「完成一个工作单元（该域实现+测试绿）即勾」且旧文案清除（文本钉）
全文：.sillyspec/changes/archive/2026-09-26-thin-workunits/requirements.md#FR-03
最近确认：221a7a6cb60926352cc4a39b2741ec1850908abe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-workunits:flow:FR-03
  tests: test/flow-tick-prototype.test.mjs | test/thin-workunits.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-workunits
  status: active

## FR-cli-entry-121 向下兼容
变更：2026-09-26-thin-workunits
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 在途变更的 tasks.md 为旧逐条形态；When 本变更不重写已存在工件；Then 旧形态照常收口（哨兵/指纹语义不变）；thick 任务卡面不动
全文：.sillyspec/changes/archive/2026-09-26-thin-workunits/requirements.md#FR-04
最近确认：221a7a6cb60926352cc4a39b2741ec1850908abe

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-workunits:flow:FR-04
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-workunits
  status: active

## FR-cli-entry-122 聚类器回退
变更：2026-09-26-thin-agent-tasks
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given WORK_UNIT_BUCKETS 域枚举无法穷举开放世界任务形态（用户否决）；When 删除 groupCriteriaToUnits/WORK_UNIT_BUCKETS，draftTasks 恢复逐条标准预填 源码零残留（回退钉）
全文：.sillyspec/changes/archive/2026-09-26-thin-agent-tasks/requirements.md#FR-01
最近确认：7b2bab89c0d80490d3e736521d56e24440a7fb00

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-agent-tasks:flow:FR-01
  tests: test/thin-workunits.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-agent-tasks
  status: active

## FR-cli-entry-123 覆写语义指引
变更：2026-09-26-thin-agent-tasks
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任务面是 agent 的实现计划（机器预填只是零冷启动兜底）；When fresh/adopt 简报与 advisory 三处文案改为「预填草稿可按实际实现路径覆写（保持 task-NN 行形态）」 tasks.md 头注释声明计划
全文：.sillyspec/changes/archive/2026-09-26-thin-agent-tasks/requirements.md#FR-02
最近确认：7b2bab89c0d80490d3e736521d56e24440a7fb00

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-agent-tasks:flow:FR-02
  tests: test/flow-tick-prototype.test.mjs | test/thin-workunits.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-agent-tasks
  status: active

## FR-cli-entry-124 教训决策落档
变更：2026-09-26-thin-agent-tasks
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本会话第三次犯「枚举开放世界」同款错误；When design 槽4 写成显式决策记录（三次实例+正确模式：开放分类归 agent，机器锚定封闭面） distill 蒸馏进 knowledge/decision
全文：.sillyspec/changes/archive/2026-09-26-thin-agent-tasks/requirements.md#FR-03
最近确认：7b2bab89c0d80490d3e736521d56e24440a7fb00

## FR-cli-entry-125 verify 门 restrictFiles 接线
变更：2026-09-26-verify-gate-restrictfiles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given verify 测试对账门未传 restrictFiles（quick 门传了），变更全提交后同形下 0 命中可能假 skip；When 门调用传入 resolveVerifyChangedFiles（includeWorkingTree，同 lint scope 口径）且空清单不传 解析异常 f
全文：.sillyspec/changes/archive/2026-09-26-verify-gate-restrictfiles/requirements.md#FR-01
最近确认：bf1d0f2db9ee166f83ef1cce9f4c8cdc07c1a715

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-verify-gate-restrictfiles:flow:FR-01
  tests: test/verify-gate-restrictfiles.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-verify-gate-restrictfiles
  status: active

## FR-cli-entry-126 verify 渲染长会话税提示
变更：2026-09-26-verify-gate-restrictfiles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given R18 实证 verify 段轮均上下文为 brainstorm 段 3-4 倍（长会话税）；When verify 步骤说明书首部渲染提示；Then 跨阶段会话得到「新开会话跑 verify 续跑」建议（上下文重置降轮均）
全文：.sillyspec/changes/archive/2026-09-26-verify-gate-restrictfiles/requirements.md#FR-02
最近确认：bf1d0f2db9ee166f83ef1cce9f4c8cdc07c1a715

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-verify-gate-restrictfiles:flow:FR-02
  tests: test/verify-gate-restrictfiles.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-verify-gate-restrictfiles
  status: active

## FR-cli-entry-127 收割条目字段补齐
变更：2026-09-26-slot4-distill-fix
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 槽4 收割条目缺类型/状态字段且正文用非白名单标签，蒸馏永不入选（断链实证）；When 收割模板补  +  + 正文改 收割→蒸馏全链入选并落 knowledge/decisions（教训文本随条目落盘）
全文：.sillyspec/changes/archive/2026-09-26-slot4-distill-fix/requirements.md#FR-01
最近确认：5d81f5526cee5f3d2da8a9ffd7443e5273cd34a5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-slot4-distill-fix:flow:FR-01
  tests: test/slot4-distill-fix.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-slot4-distill-fix
  status: active

## FR-cli-entry-128 旧格式行为回归
变更：2026-09-26-slot4-distill-fix
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 无状态裸条目（非收割来源）不该因本修复混入选；When 蒸馏对无状态条目维持不入选
全文：.sillyspec/changes/archive/2026-09-26-slot4-distill-fix/requirements.md#FR-02
最近确认：5d81f5526cee5f3d2da8a9ffd7443e5273cd34a5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-slot4-distill-fix:flow:FR-02
  tests: test/slot4-distill-fix.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-slot4-distill-fix
  status: active

## FR-cli-entry-129 教训补录与注入面验证
变更：2026-09-26-slot4-distill-fix
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given thin-agent-tasks 的枚举教训断链未入库；When 按新格式重放蒸馏补录 + INDEX 路由 matchKnowledge 三组关键词（枚举开放世界/任务面覆写/分类表）实测命中
全文：.sillyspec/changes/archive/2026-09-26-slot4-distill-fix/requirements.md#FR-03
最近确认：5d81f5526cee5f3d2da8a9ffd7443e5273cd34a5

## FR-cli-entry-130 勾选节奏 advisory 输出
变更：2026-09-26-thin-check-cadence
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更收口（flow done ledger 子步）时 watcher 事件流存在 task-done 事件单拍跳 ≥2 格；When 收口执行到 ledger 子步「任务勾选缺失」advisory 之后；Then console.warn 输出勾选节奏 advisory（引用跳格 detail 与事件时刻、规范动作指引），不阻断收口
全文：.sillyspec/changes/archive/2026-09-26-thin-check-cadence/requirements.md#FR-01
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-check-cadence:flow:FR-01
  tests: test/sentinel-rules.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-check-cadence
  status: active

## FR-cli-entry-131 观测旁路缺席静默
变更：2026-09-26-thin-check-cadence
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given watcher 事件流文件缺失、无 task-done 事件、或读取过程抛异常；When 收口执行同一位置；Then 静默跳过（无输出、异常不外泄、收口照常推进）
全文：.sillyspec/changes/archive/2026-09-26-thin-check-cadence/requirements.md#FR-02
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-check-cadence:flow:FR-02
  tests: test/sentinel-rules.test.mjs | test/watcher-alerts.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-check-cadence
  status: active

## FR-cli-entry-132 逐格勾选不告警
变更：2026-09-26-thin-check-cadence
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 事件流中全部 task-done 单拍跳格均 <2（含单任务变更 0→1）；When 收口执行同一位置；Then 不输出勾选节奏 advisory
全文：.sillyspec/changes/archive/2026-09-26-thin-check-cadence/requirements.md#FR-03
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-check-cadence:flow:FR-03
  tests: test/sentinel-rules.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-check-cadence
  status: active

## FR-cli-entry-133 跳格检测纯函数与单测
变更：2026-09-26-thin-check-cadence
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given detectBatchCheckCadence(events) 为无副作用纯函数；When 输入多格跳/逐格/无事件/坏 detail 的事件清单；Then 返回最大跳格记录（含 from/to/detail/ts）或 null，行为由 test/sentinel-rules.test.mjs 新增用例钉住
全文：.sillyspec/changes/archive/2026-09-26-thin-check-cadence/requirements.md#FR-04
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-check-cadence:flow:FR-04
  tests: test/sentinel-rules.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-check-cadence
  status: active

## FR-cli-entry-134 套件实测全绿
变更：2026-09-26-thin-check-cadence
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更触及 src/ 与 test/；When 运行 npm run test:core 与 npm run lint；Then 全部通过
全文：.sillyspec/changes/archive/2026-09-26-thin-check-cadence/requirements.md#FR-05
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e

## FR-cli-entry-135 status 勾选提醒
变更：2026-09-26-tick-loop-nudge
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 起点简报的勾选指令几小时后失效（R19 实证一把勾）；When flow status 在②执行阶段且勾选滞后且区间有提交 提醒行在场（边干边勾+勿攒收口）；①阶段或勾齐时不刷
全文：.sillyspec/changes/archive/2026-09-26-tick-loop-nudge/requirements.md#FR-01
最近确认：195b55fe72328025bfe6636a5bd7bdba7da5e9b3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-tick-loop-nudge:flow:FR-01
  tests: test/tick-loop-nudge.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-tick-loop-nudge
  status: active

## FR-cli-entry-136 tasks.md 头部纪律行
变更：2026-09-26-tick-loop-nudge
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任务面常驻工件是第二注入通道；When draftTasks 渲染头部含边干边勾纪律+完成判定语义（实现到位+测试跑绿即勾）+pathspec 提交要求
全文：.sillyspec/changes/archive/2026-09-26-tick-loop-nudge/requirements.md#FR-02
最近确认：195b55fe72328025bfe6636a5bd7bdba7da5e9b3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-tick-loop-nudge:flow:FR-02
  tests: test/tick-loop-nudge.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-tick-loop-nudge
  status: active

## FR-cli-entry-137 简报交付纪律补丁
变更：2026-09-26-tick-loop-nudge
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given R19 发现 tasks.md untracked 直至归档；When 交付纪律行明示 tasks.md 一并 pathspec 提交 理由（勾选证据进 git 历史）与 status 提醒的交叉引用在场
全文：.sillyspec/changes/archive/2026-09-26-tick-loop-nudge/requirements.md#FR-03
最近确认：195b55fe72328025bfe6636a5bd7bdba7da5e9b3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-tick-loop-nudge:flow:FR-03
  tests: test/tick-loop-nudge.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-tick-loop-nudge
  status: active

## FR-cli-entry-138 哨兵时点判定
变更：2026-09-26-tick-loop-nudge
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一把勾模式（tasks.md 首次提交==最后提交）或 untracked 形态；When 哨兵 complete 分支（token 证据齐）放行时 warn 行为提醒各一（不阻断，fail-soft）
全文：.sillyspec/changes/archive/2026-09-26-tick-loop-nudge/requirements.md#FR-04
最近确认：195b55fe72328025bfe6636a5bd7bdba7da5e9b3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-tick-loop-nudge:flow:FR-04
  tests: test/tick-loop-nudge.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-tick-loop-nudge
  status: active

## FR-cli-entry-139 合成时间线输出
变更：2026-09-26-watcher-timeline
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个变更存在 watcher 事件流与 tasks.md（活跃或归档）；When 执行 sillyspec watcher timeline --change <名>
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline/requirements.md#FR-01
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline:flow:FR-01
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline
  status: active

## FR-cli-entry-140 归档与活跃双态渲染
变更：2026-09-26-watcher-timeline
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更目录在 .sillyspec/changes/<名>/（活跃）或 .sillyspec/changes/archive/<名>/（归档）；When 执行同命令；Then 双路径探测均能取到 tasks.md 渲染；两处都在时以活跃目录为准
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline/requirements.md#FR-02
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95

## FR-cli-entry-141 降级渲染 fail-open
变更：2026-09-26-watcher-timeline
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 事件流缺失、tasks.md 缺失、或提交 hash 在当前仓不可解析；When 执行同命令；Then 不抛错：缺事件流时给出指引退码 2；缺任务面时时间轴照渲并标注「任务面缺失」；hash 失联时只显 hash 并标注「subject 不可解析」
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline/requirements.md#FR-03
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline:flow:FR-03
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline
  status: active

## FR-cli-entry-142 勾选时刻推断的诚实标注
变更：2026-09-26-watcher-timeline
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 事件流 task-done 只记计数不记任务 id；When 渲染任务面表格；Then 勾选时刻按翻格顺序推断（0→2 拍赋前两个任务），表头显式标注「≈ 顺序推断」，计数链断裂（from≠上一 to）时该段标「推断不可用」
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline/requirements.md#FR-04
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline:flow:FR-04
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline
  status: active

## FR-cli-entry-143 纯函数与单元测试
变更：2026-09-26-watcher-timeline
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given parseTaskLines / inferFlipTimes / resolveCommitAnchors / renderTimeline 为无副作用纯函数；When 输入合法/缺失/坏行/断裂计数链的合成数据；Then 行为由 test/watcher-timeline.test.mjs 用例钉住
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline/requirements.md#FR-05
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-watcher-timeline:flow:FR-05
  tests: test/watcher-timeline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-watcher-timeline
  status: active

## FR-cli-entry-144 套件实测全绿
变更：2026-09-26-watcher-timeline
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更触及 src/ 与 test/；When 运行 npm run test:core 与 npm run lint；Then 全部通过
全文：.sillyspec/changes/archive/2026-09-26-watcher-timeline/requirements.md#FR-06
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95

## FR-cli-entry-145 绑定槽路径邻接用例锚提取保真（四形态）
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-01
最近确认：3d39f6337998662fb497e633079ac4986287460c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-binding-anchor-fidelity:flow:FR-01
  tests: test/flow-draft-binding-extract.test.mjs#①
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-binding-anchor-fidelity
  status: active

## FR-cli-entry-146 描述文字不误捕（降级语义）
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-02
最近确认：3d39f6337998662fb497e633079ac4986287460c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-binding-anchor-fidelity:flow:FR-02
  tests: test/flow-draft-binding-extract.test.mjs#①
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-binding-anchor-fidelity
  status: active

## FR-cli-entry-147 裸文件名/路径段解析项目相对全路径
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-03
最近确认：3d39f6337998662fb497e633079ac4986287460c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-binding-anchor-fidelity:flow:FR-03
  tests: test/flow-draft-binding-extract.test.mjs#②
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-binding-anchor-fidelity
  status: active

## FR-cli-entry-148 歧义与未命中原样保留
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-04
最近确认：3d39f6337998662fb497e633079ac4986287460c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-binding-anchor-fidelity:flow:FR-04
  tests: test/flow-draft-binding-extract.test.mjs#②
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-binding-anchor-fidelity
  status: active

## FR-cli-entry-149 文件面消费点统一剥锚
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-05
最近确认：3d39f6337998662fb497e633079ac4986287460c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-binding-anchor-fidelity:flow:FR-05
  tests: test/flow-draft-binding-extract.test.mjs#④ | test/flow-draft-binding-extract.test.mjs#⑥ | test/flow-draft-binding-extract.test.mjs#⑦
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-binding-anchor-fidelity
  status: active

## FR-cli-entry-150 书写约定收紧
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-06
最近确认：3d39f6337998662fb497e633079ac4986287460c

## FR-cli-entry-151 回归与门禁
变更：2026-09-26-binding-anchor-fidelity
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-26-binding-anchor-fidelity/requirements.md#FR-07
最近确认：3d39f6337998662fb497e633079ac4986287460c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-binding-anchor-fidelity:flow:FR-07
  tests: test/flow-draft-binding-extract.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-binding-anchor-fidelity
  status: active

## FR-cli-entry-152 GWT 骨架预填
变更：2026-09-26-governance-autopilot
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 成功标准列表；When draftRequirements 调 draftGwtSkeleton 逐条生成 Given/When/Then FR 区含完整 GWT 块（非空槽）且头部说
全文：.sillyspec/changes/archive/2026-09-26-governance-autopilot/requirements.md#FR-01
最近确认：aff28f38a27d65a84221c73c68fb15f91ca65865

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-governance-autopilot:flow:FR-01
  tests: test/governance-autopilot.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-governance-autopilot
  status: active

## FR-cli-entry-153 自动勾选
变更：2026-09-26-governance-autopilot
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given tasks.md 有未勾条目且区间提交含 task-NN token；When flow done 哨兵检查前解析 token 并代勾 有证据但未勾的条目被自动勾选（_autoTicked>0 时 console.log）；已勾的不重复操作
全文：.sillyspec/changes/archive/2026-09-26-governance-autopilot/requirements.md#FR-02
最近确认：aff28f38a27d65a84221c73c68fb15f91ca65865

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-governance-autopilot:flow:FR-02
  tests: test/governance-autopilot.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-governance-autopilot
  status: active

## FR-cli-entry-154 自动绑定补全
变更：2026-09-26-governance-autopilot
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 绑定槽为空且 verify-runs 有测试结果；When flow done 绑定校验前读 test-result.json 提取测试文件路径 空槽被自动补全（agent 可覆盖）；无测试结果时 fail-soft 放
全文：.sillyspec/changes/archive/2026-09-26-governance-autopilot/requirements.md#FR-03
最近确认：aff28f38a27d65a84221c73c68fb15f91ca65865

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-governance-autopilot:flow:FR-03
  tests: test/governance-autopilot.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-governance-autopilot
  status: active

## FR-cli-entry-155 向后兼容
变更：2026-09-26-governance-autopilot
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已有 agent 填写的内容（FR/绑定/勾选）；When 三条自动机制运行；Then 已有内容不被覆盖（tick 只代勾未勾的、bind 只填空槽、GWT 只在起草时生成）
全文：.sillyspec/changes/archive/2026-09-26-governance-autopilot/requirements.md#FR-04
最近确认：aff28f38a27d65a84221c73c68fb15f91ca65865

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-governance-autopilot:flow:FR-04
  tests: test/flow-draft.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-governance-autopilot
  status: active

## FR-cli-entry-156 execute --done 自动勾选
变更：2026-09-26-full-autopilot-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given execute 阶段 --done 时 tasks.md 有未勾条目且近 20 提交含 task-NN token；When complete.js execute 完成路径解析 token 并代勾 有证据但未勾的条目被自动勾选；已勾不重复操作
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-01
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-full-autopilot-parity:flow:FR-01
  tests: test/run-complete-noai-done-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-full-autopilot-parity
  status: active

## FR-cli-entry-157 verify --done 自动绑定
变更：2026-09-26-full-autopilot-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given verify 阶段测试门已跑（test-result.json 在场）且 requirements.md 有空绑定槽；When gates.js verify 测试门后从测试结果提取文件路径补全空槽 空槽被自动补全（agent 可覆盖）；无测试结果 fail-soft
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-02
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

## FR-cli-entry-158 向后兼容与边界
变更：2026-09-26-full-autopilot-parity
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已有 agent 填写/勾选的内容；When 两条自动机制运行；Then 不覆盖；auto-bind 在复用分支（ledger-reuse/scan-reuse）不触发；GWT 预填不迁移（来源不同）
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-03
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

## FR-cli-entry-159 verify --done 自动绑定：verify 阶段收口测试门之后（test-result.js
变更：2026-09-26-full-autopilot-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When verify --done 自动绑定：verify 阶段收口测试门之后（test-result.json 已生成），从测试结果自动补全空绑定槽——与 thin；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-02
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-full-autopilot-parity:flow:FR-02
  tests: test/governance-autopilot.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-full-autopilot-parity
  status: active

## FR-cli-entry-160 GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文
变更：2026-09-26-full-autopilot-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 迁移 相关模块就绪；When GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——brainstorm 步骤 8 已有 design 可；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-03
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-full-autopilot-parity:flow:FR-03
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-full-autopilot-parity
  status: active

## FR-cli-entry-161 两条均向后兼容（已有内容不覆盖）
变更：2026-09-26-full-autopilot-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 两条均向后兼容（已有内容不覆盖）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-04
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

## FR-cli-entry-162 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件
变更：2026-09-26-full-autopilot-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件零回归；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-full-autopilot-parity/requirements.md#FR-05
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733

## FR-cli-entry-163 readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - ro
变更：2026-09-27-confirm-on-use
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - row: 块的 confirmed_by≠agent 行）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-01
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-confirm-on-use:flow:FR-01
  tests: test/confirm-on-use.test.mjs「① readEntryUnconfirmed」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-confirm-on-use
  status: active

## FR-cli-entry-164 知识注入面：未确认条目带 ⚪N未确认 标记
变更：2026-09-27-confirm-on-use
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 知识注入面：未确认条目带 ⚪N未确认 标记；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-02
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-confirm-on-use:flow:FR-02
  tests: test/confirm-on-use.test.mjs「②③ 注入面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-confirm-on-use
  status: active

## FR-cli-entry-165 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符则收口前 sillyspec te
变更：2026-09-27-confirm-on-use
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符；Then 收口前 sillyspec tests confirm --anchor <id> --evidence <真实测试路径>，不符留给 knowledge dig
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-03
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-confirm-on-use:flow:FR-03
  tests: test/confirm-on-use.test.mjs「④ CLI tests --confirm」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-confirm-on-use
  status: active

## FR-cli-entry-166 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解
变更：2026-09-27-confirm-on-use
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解析为真实文件，机械防橡皮图章）；Then 该条目全部 candidate 机器行翻 active（confirmed_by=agent, confirmed_at=HEAD）
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-04
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: manual:muuslbo7:test/confirm-on-use.test.mjs
  tests: test/confirm-on-use.test.mjs
  reason: spec
  state: active
  discovery: agent
  confirmed_by: agent
  confirmed_at: 15821c904c3545325d4e7aa9a30f0d643222396e
  source_change: manual
  status: active

## FR-cli-entry-167 已是 active 幂等提示
变更：2026-09-27-confirm-on-use
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 幂等 相关模块就绪；When 已是 active 幂等提示；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-05
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-confirm-on-use:flow:FR-05
  tests: test/confirm-on-use.test.mjs「④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-confirm-on-use
  status: active

## FR-cli-entry-168 无绑定行
变更：2026-09-27-confirm-on-use
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 无绑定行；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-06
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-confirm-on-use:flow:FR-06
  tests: test/confirm-on-use.test.mjs「④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-confirm-on-use
  status: active

## FR-cli-entry-169 证据不可解析拒绝 exit 1
变更：2026-09-27-confirm-on-use
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 证据不可解析拒绝 exit 1；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-07
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: manual:muuslbz6:test/confirm-on-use.test.mjs
  tests: test/confirm-on-use.test.mjs
  reason: spec
  state: active
  discovery: agent
  confirmed_by: agent
  confirmed_at: 15821c904c3545325d4e7aa9a30f0d643222396e
  source_change: manual
  status: active

## FR-cli-entry-170 全仓测试绿
变更：2026-09-27-confirm-on-use
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全仓测试绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-confirm-on-use/requirements.md#FR-08
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3

## FR-cli-entry-171 patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood
变更：2026-09-27-tool-debt-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood 模块卡不再漏），过滤逻辑抽为 flow-parity 导出；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-tool-debt-cleanup/requirements.md#FR-01
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-tool-debt-cleanup:flow:FR-01
  tests: test/filter-committed-face.test.mjs「.sillyspec/docs/ 交付文档保留（模块卡不再漏出审计 patch）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-tool-debt-cleanup
  status: active

## FR-cli-entry-172 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）
变更：2026-09-27-tool-debt-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-tool-debt-cleanup/requirements.md#FR-02
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306

## FR-cli-entry-173 _module-map.yaml 的 cli-entry paths 登记 ui-visual.js
变更：2026-09-27-tool-debt-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When _module-map.yaml 的 cli-entry paths 登记 ui-visual.js 与 hunk-attribution.js；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-tool-debt-cleanup/requirements.md#FR-03
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306

## FR-cli-entry-174 test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消
变更：2026-09-27-tool-debt-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消费保留），check-syntax 本仓侧清零；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-tool-debt-cleanup/requirements.md#FR-04
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306

## FR-cli-entry-175 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）
变更：2026-09-27-tool-debt-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-tool-debt-cleanup/requirements.md#FR-05
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-tool-debt-cleanup:flow:FR-05
  tests: test/filter-committed-face.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-tool-debt-cleanup
  status: active

## FR-cli-entry-176 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）
变更：2026-09-27-tool-debt-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-tool-debt-cleanup/requirements.md#FR-06
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-tool-debt-cleanup:flow:FR-06
  tests: test/filter-committed-face.test.mjs「非 .sillyspec 交付全留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-tool-debt-cleanup
  status: active

## FR-cli-entry-177 归档链（runArchiveChain，flow done 与 run archive 双入口共用）
变更：2026-09-28-archive-timeline-bake
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 归档链（runArchiveChain，flow done 与 run archive 双入口共用）在目录搬移成功后、窄化 git add 前，写 archiv；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-archive-timeline-bake/requirements.md#FR-01
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-archive-timeline-bake:flow:FR-01
  tests: test/archive-timeline-bake.test.mjs「bakeArchiveTimeline：fixture 端到端双落盘，副本与源字节一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-archive-timeline-bake
  status: active

## FR-cli-entry-178 烤制失败 fail-open（一行警告，不阻断归档）
变更：2026-09-28-archive-timeline-bake
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 烤制失败 fail-open（一行警告，不阻断归档）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-archive-timeline-bake/requirements.md#FR-02
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-archive-timeline-bake:flow:FR-02
  tests: test/archive-timeline-bake.test.mjs「bakeArchiveTimeline：无事件流跳过，零文件产出带原因」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-archive-timeline-bake
  status: active

## FR-cli-entry-179 本机 .runtime 无事件流时，sillyspec watcher timeline --cha
变更：2026-09-28-archive-timeline-bake
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 本机 .runtime 无事件流时，sillyspec watcher timeline --change <已归档变更> 自动回退读归档包内 watcher-；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-archive-timeline-bake/requirements.md#FR-03
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-archive-timeline-bake:flow:FR-03
  tests: test/archive-timeline-bake.test.mjs「readWatcherEvents：path 直读归档副本，坏行容忍计数，path 优先于 runtimeRoot」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-archive-timeline-bake
  status: active

## FR-cli-entry-180 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 g
变更：2026-09-28-archive-timeline-bake
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 git；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-archive-timeline-bake/requirements.md#FR-04
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-archive-timeline-bake:flow:FR-04
  tests: test/archive-timeline-bake.test.mjs「bakeArchiveTimeline：事件副本超帽只烤 timeline.md，头注记「尺寸超帽」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-archive-timeline-bake
  status: active

## FR-cli-entry-181 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态
变更：2026-09-28-archive-timeline-bake
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-archive-timeline-bake/requirements.md#FR-05
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-archive-timeline-bake:flow:FR-05
  tests: test/archive-timeline-bake.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-archive-timeline-bake
  status: active

## FR-cli-entry-182 全量 npm test 与 npm run lint 绿
变更：2026-09-28-archive-timeline-bake
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 全量 npm test 与 npm run lint 绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-archive-timeline-bake/requirements.md#FR-06
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7

## FR-cli-entry-183 .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交
变更：roadmap-copy-purge
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/roadmap-copy-purge/requirements.md#FR-01
最近确认：6d467b738d6c732f7076e3f65283a57ba78053a8

## FR-cli-entry-184 CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段
变更：roadmap-copy-purge
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段 cat 带 2>/dev/null 自失活、stages/a；Then ）不触发重建
全文：.sillyspec/changes/archive/roadmap-copy-purge/requirements.md#FR-02
最近确认：6d467b738d6c732f7076e3f65283a57ba78053a8

## FR-cli-entry-185 纯 doc 删除，收口实测自动跳过代码面
变更：roadmap-copy-purge
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 纯 doc 删除，收口实测自动跳过代码面；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/roadmap-copy-purge/requirements.md#FR-03
最近确认：6d467b738d6c732f7076e3f65283a57ba78053a8

## FR-cli-entry-186 flow start --change friction-signal-hint（净新建、无日期前缀
变更：2026-09-28-flow-date-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow start --change friction-signal-hint（净新建、无日期前缀）exit 2 且报错含 YYYY-MM-DD-<简短描述>；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-flow-date-gate/requirements.md#FR-01
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-flow-date-gate:flow:FR-01
  tests: test/change-name-date-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-flow-date-gate
  status: active

## FR-cli-entry-187 flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
变更：2026-09-28-flow-date-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-flow-date-gate/requirements.md#FR-02
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-flow-date-gate:flow:FR-02
  tests: test/change-name-date-gate.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-flow-date-gate
  status: active

## FR-cli-entry-188 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉
变更：2026-09-28-flow-date-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-flow-date-gate/requirements.md#FR-03
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-flow-date-gate:flow:FR-03
  tests: test/change-name-date-gate.test.mjs | test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-flow-date-gate
  status: active

## FR-cli-entry-189 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-D
变更：2026-09-28-flow-date-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-DD-flow-<hex> 形态）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-flow-date-gate/requirements.md#FR-04
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-flow-date-gate:flow:FR-04
  tests: test/change-name-date-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-flow-date-gate
  status: active

## FR-cli-entry-190 既有 flow 族测试全部适配通过（test+lint 双绿）
变更：2026-09-28-flow-date-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有 flow 族测试全部适配通过（test+lint 双绿）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-flow-date-gate/requirements.md#FR-05
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-flow-date-gate:flow:FR-05
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-flow-date-gate
  status: active

## FR-cli-entry-191 摘录器斜杠拆分收窄：仅当拆分后每一段都含谓词词元（访问、生效、校验、通过等行为动词词表）才拆
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 摘录器斜杠拆分收窄：仅当拆分后每一段都含谓词词元（访问、生效、校验、通过等行为动词词表）才拆；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-01
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-split-guard-and-gate-report:flow:FR-01
  tests: test/fr-compound-split.test.mjs「①b 谓词资格收窄」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-split-guard-and-gate-report
  status: active

## FR-cli-entry-192 成对短名词（节点与边、页面 UI、warn 错误 off 等）保持整条
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 成对短名词（节点与边、页面 UI、warn 错误 off 等）保持整条；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-02
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-split-guard-and-gate-report:flow:FR-02
  tests: test/fr-compound-split.test.mjs「①b 谓词资格收窄」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-split-guard-and-gate-report
  status: active

## FR-cli-entry-193 分号拆分与路径形态守卫行为不变
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 分号拆分与路径形态守卫行为不变；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-03
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-split-guard-and-gate-report:flow:FR-03
  tests: test/fr-compound-split.test.mjs「① 复合拆分：斜杠与分号形态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-split-guard-and-gate-report
  status: active

## FR-cli-entry-194 门 FAIL 三件套透传：失败行样本（前五条）、结果 JSON 全路径、可直接粘贴重放的批命令，在测
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 门 FAIL 三件套透传：失败行样本（前五条）、结果 JSON 全路径、可直接粘贴重放的批命令，在测试门 FAIL 输出处一并打印；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-04
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

## FR-cli-entry-195 快照证据回拷：快照模式测试门 FAIL 时，快照内 verify-runs 结果目录回拷主仓 run
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 快照证据回拷：快照模式测试门 FAIL 时，快照内 verify-runs 结果目录回拷主仓 runtime 后再清理，排障证据不再蒸发；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-05
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

## FR-cli-entry-196 既有 fr-compound-split 测试扩展锁定新边界：谓词双侧拆分保留、名词对不拆、路径与分
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有 fr-compound-split 测试扩展锁定新边界：谓词双侧拆分保留、名词对不拆、路径与分号行为不变；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-06
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-split-guard-and-gate-report:flow:FR-06
  tests: test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-split-guard-and-gate-report
  status: active

## FR-cli-entry-197 同文件他会话在途改动零夹带（flow-draft 与 quick-audit 提交前逐 hunk 核
变更：2026-09-28-split-guard-and-gate-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 同文件他会话在途改动零夹带（flow-draft 与 quick-audit 提交前逐 hunk 核对）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-split-guard-and-gate-report/requirements.md#FR-07
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4

## FR-cli-entry-198 前门选道盘问重述
变更：2026-09-28-unclear-req-to-brainstorm
状态：active
摘要：默认场景；模板选道表改写
依据决策：D-001@v1、D-002@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given agent 对全新变更执行 `sillyspec flow start --change <名> --input "<需求>"` 且通过既有格式门；When 变更创建成功输出渲染；Then 输出 MUST 含固定自检段：「对本需求，你还有没有必须问用户才能动手的问题？」并给出两条出路指引——有→`sillyspec run brainstorm -
- 场景：模板选道表改写 — Given templates/agents-instruction.md 随版本 bump 刷新；Then 选道表第 1 行 MUST 为前提式表述（自检通过才走轻量道），第 2 行负面信号 MUST 标注为「举例」身份（明示举例非机制），速查行 MUST NOT 再
全文：.sillyspec/changes/archive/2026-09-28-unclear-req-to-brainstorm/requirements.md#FR-01
最近确认：cb6fc0a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-unclear-req-to-brainstorm:task-03:acc-0-918e58c9
  tests: test/flow-clarity-probe.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-03:acc-1-6150fd62
  tests: test/flow-clarity-probe.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-03:acc-2-6b130814
  tests: test/flow-clarity-probe.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-03:acc-3-361c974e
  tests: test/flow-clarity-probe.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active

## FR-cli-entry-199 后门事后闭环（疑似该走预段未走）
变更：2026-09-28-unclear-req-to-brainstorm
状态：active
摘要：默认场景；下次 start 点名提示
依据决策：D-001@v1、D-002@v1、D-003@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given 轻量变更执行 `sillyspec flow done --change <名>` 收口；When 收口完成后计算封闭面指标（design.md 终稿 vs 机器起草首版重写比、tasks.md 终稿 vs 机器预填稿改写率、收口评审盲维命中数、实测失败次数—；Then 任一指标超阈（重写比 >50%、改写率 >60%、盲维 ≥2、实测失败 ≥2，阈值常量可调）时 MUST 将「疑似该走预段未走」标记连同指标与变更名落 `.si
- 场景：下次 start 点名提示 — Given 本仓存在 hindsight 标记；When 下一次全新变更 `flow start` 渲染；Then 输出 MUST 点名提示（含上个变更名与形态计数，措辞用「疑似」非定罪，提示可无视不阻断） 无标记或文件缺失时 flow start 输出 MUST 与现状完全
全文：.sillyspec/changes/archive/2026-09-28-unclear-req-to-brainstorm/requirements.md#FR-02
最近确认：cb6fc0a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-unclear-req-to-brainstorm:task-01:acc-0-ef81dbf6
  tests: test/route-hindsight.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-01:acc-1-2bbfe66c
  tests: test/route-hindsight.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-01:acc-2-6fcea681
  tests: test/route-hindsight.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-01:acc-3-95eecc1a
  tests: test/route-hindsight.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active

## FR-cli-entry-200 设计时点知识检索面
变更：2026-09-28-unclear-req-to-brainstorm
状态：active
摘要：默认场景；方案步 --done 门自动检索
依据决策：D-002@v1、D-004@v1、D-005@v1
场景正文：
- 场景：默认场景 — Given agent 在 brainstorm 阶段方案步/设计步工作；When 阅读步骤指引；Then 指引 MUST 含固定动作：落盘方案/决策前，把方案引入的机制词跑 `sillyspec knowledge search --query "<机制词>"`，命
- 场景：方案步 --done 门自动检索 — Given 方案步 `--done` 携带 --output 且 decisions.md 自上轮新增条目；When 门校验执行；Then CLI MUST 对 --output 与新增条目标题/question 拼串自动跑既有知识检索匹配器，命中时 MUST 在收口输出回显命中摘要（条目 id＋标
全文：.sillyspec/changes/archive/2026-09-28-unclear-req-to-brainstorm/requirements.md#FR-03
最近确认：cb6fc0a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-unclear-req-to-brainstorm:task-04:acc-0-8d801f40
  tests: test/design-knowledge-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-04:acc-1-5b114c1f
  tests: test/design-knowledge-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-04:acc-2-e8350fb5
  tests: test/design-knowledge-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active
- row: 2026-09-28-unclear-req-to-brainstorm:task-04:acc-3-967e266f
  tests: test/design-knowledge-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-unclear-req-to-brainstorm
  status: active

## FR-cli-entry-201 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHi
变更：2026-09-28-knowledge-inject-ranking
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHits 前 5，且 flow start 知识注入段与 kno；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-inject-ranking/requirements.md#FR-01
最近确认：b7699f92412bdcacf115d11395fc72920162195c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-inject-ranking:flow:FR-01
  tests: test/design-knowledge-check.test.mjs「①-b 死路注记回显」 | test/knowledge-inject-ranking.test.mjs「排序与死路面」 | test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-inject-ranking
  status: active

## FR-cli-entry-202 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染
变更：2026-09-28-knowledge-inject-ranking
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-inject-ranking/requirements.md#FR-02
最近确认：b7699f92412bdcacf115d11395fc72920162195c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-inject-ranking:flow:FR-02
  tests: test/design-knowledge-check.test.mjs「①-b 死路注记回显」 | test/knowledge-inject-ranking.test.mjs「排序与死路面」 | test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-inject-ranking
  status: active

## FR-cli-entry-203 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在
变更：2026-09-28-knowledge-inject-ranking
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-inject-ranking/requirements.md#FR-03
最近确认：b7699f92412bdcacf115d11395fc72920162195c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-inject-ranking:flow:FR-03
  tests: test/design-knowledge-check.test.mjs「①-b 死路注记回显」 | test/knowledge-inject-ranking.test.mjs「排序与死路面」 | test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-inject-ranking
  status: active

## FR-cli-entry-204 新增真实库钉子测试（枚举词表查询→目标条目必进前 5）
变更：2026-09-28-knowledge-inject-ranking
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 新增真实库钉子测试（枚举词表查询；Then 目标条目必进前 5）
全文：.sillyspec/changes/archive/2026-09-28-knowledge-inject-ranking/requirements.md#FR-04
最近确认：b7699f92412bdcacf115d11395fc72920162195c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-inject-ranking:flow:FR-04
  tests: test/design-knowledge-check.test.mjs「①-b 死路注记回显」 | test/knowledge-inject-ranking.test.mjs「排序与死路面」 | test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-inject-ranking
  status: active

## FR-cli-entry-205 既有测试与 npm run test:core 全绿
变更：2026-09-28-knowledge-inject-ranking
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有测试与 npm run test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-inject-ranking/requirements.md#FR-05
最近确认：b7699f92412bdcacf115d11395fc72920162195c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-inject-ranking:flow:FR-05
  tests: test/design-knowledge-check.test.mjs「①-b 死路注记回显」 | test/knowledge-inject-ranking.test.mjs「排序与死路面」 | test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-inject-ranking
  status: active

## FR-cli-entry-206 detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hin
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hindsight-baseline 快照）逐字相同的勾选行＝镜像；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-01
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-01
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-207 无基线快照时 fail-safe 维持现行判据（全部要求证据）
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 无基线快照时 fail-safe 维持现行判据（全部要求证据）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-02
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-02
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-208 flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-03
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-03
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-209 覆写任务无证据仍拒收（假勾选守卫不弱化）
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 覆写任务无证据仍拒收（假勾选守卫不弱化）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-04
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-04
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-210 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-05
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-05
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-211 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-06
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-06
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-212 真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-07
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-07
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-213 npm test 与 test:core 全绿
变更：2026-09-28-sentinel-mirror-waiver
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When npm test 与 test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-mirror-waiver/requirements.md#FR-08
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-mirror-waiver:flow:FR-08
  tests: test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-mirror-waiver
  status: active

## FR-cli-entry-214 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）
变更：2026-09-28-sentinel-waiver-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 镜像豁免仅在区间提交非空时生效——零提交＋镜像全勾仍拒收（空转变更不许过门）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-01
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-waiver-hardening:flow:FR-01
  tests: test/sentinel-mirror-waiver.test.mjs「⑥ 零提交不豁免」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-waiver-hardening
  status: active

## FR-cli-entry-215 flow-state 锚定基线文件 sha256（start/adopt 快照时点）
变更：2026-09-28-sentinel-waiver-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow-state 锚定基线文件 sha256（start/adopt 快照时点）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-02
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-waiver-hardening:flow:FR-02
  tests: test/sentinel-mirror-waiver.test.mjs「⑦ 锚定验证读取器（篡改检出/按无基线从严）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-waiver-hardening
  status: active

## FR-cli-entry-216 flow done 校验哈希不符→按无基线从严＋篡改告警文案
变更：2026-09-28-sentinel-waiver-hardening
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow done 校验哈希不符；Then 按无基线从严＋篡改告警文案
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-03
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-waiver-hardening:flow:FR-03
  tests: test/sentinel-mirror-waiver.test.mjs「①②③④」 | test/sentinel-wiring.test.mjs「形态 A/A2/B/B2/C」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-waiver-hardening
  status: active

## FR-cli-entry-217 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归
变更：2026-09-28-sentinel-waiver-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 混合面（镜像＋覆写带 token）、重编号从严、CRLF 归一等已验行为零回归；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-04
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-waiver-hardening:flow:FR-04
  tests: test/sentinel-wiring.test.mjs「① 形态 A/A2」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-waiver-hardening
  status: active

## FR-cli-entry-218 单测覆盖零提交从严/篡改从严/哈希锚定
变更：2026-09-28-sentinel-waiver-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 单测覆盖零提交从严/篡改从严/哈希锚定；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-05
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-sentinel-waiver-hardening:flow:FR-05
  tests: test/sentinel-mirror-waiver.test.mjs「⑥⑦」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-sentinel-waiver-hardening
  status: active

## FR-cli-entry-219 live 复测 A 与 C 双通过（零提交形态与基线篡改形态均被拒收）
变更：2026-09-28-sentinel-waiver-hardening
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 修复后的 CLI；When 实弹复测角度 A（镜像全勾且区间零提交）与角度 C（篡改基线伪装镜像）；Then 两者均被哨兵断言拒收（角度 C 另有哈希不符告警行）
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-06
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

## FR-cli-entry-220 npm test 与 test:core 全绿
变更：2026-09-28-sentinel-waiver-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When npm test 与 test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-sentinel-waiver-hardening/requirements.md#FR-07
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8

## FR-cli-entry-221 matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-01
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-01
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-222 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 或 deathPath 才弹，空标题零分 rejected；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-02
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-02
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-223 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-03
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-03
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-224 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.m
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.md D-001@v1 形态）的命中在后续 --done 回显；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-04
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-04
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-225 未回应命中照常弹
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 未回应命中照常弹；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-05
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-05
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-226 无命中
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 无命中；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-06
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-06
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-227 全静默时输出与现状一致
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 全静默时输出与现状一致；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-07
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-07
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-228 既有知识面测试回归全绿，test:core 全绿
变更：2026-09-28-knowledge-gate-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有知识面测试回归全绿，test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-gate-denoise/requirements.md#FR-08
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-gate-denoise:flow:FR-08
  tests: test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-gate-denoise
  status: active

## FR-cli-entry-229 检索分层：路由 tag 命中 →（零命中）平台向量召回 → 本地词片复现窗口 → 空
变更：2026-09-29-knowledge-vector-recall
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 检索分层：路由 tag 命中；Then （零命中）平台向量召回
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-01
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-01
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-230 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deat
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deathPath/回显资格全部本地解析（文件是真相源）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-02
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-02
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-231 端点契约 POST /api/spec/knowledge/vector-search（Bearer
变更：2026-09-29-knowledge-vector-recall
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 端点 / api 相关模块就绪；When 端点契约 POST /api/spec/knowledge/vector-search（Bearer token，query+limit；Then results[{spec_path,anchor,score}]）
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-03
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-03
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-232 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-04
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-04
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-233 local.yaml knowledge.vector_search: off 可关
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When local.yaml knowledge.vector_search: off 可关；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-05
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-05
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-234 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/kn
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-06
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-06
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-235 既有同步 matchKnowledge 行为零变化（其他调用方不动）
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 既有同步 matchKnowledge 行为零变化（其他调用方不动）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-07
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-07
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-236 mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面 + 真实库锚点映射正确；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-08
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-08
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-237 既有测试与 test:core 全绿
变更：2026-09-29-knowledge-vector-recall
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有测试与 test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-09
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-knowledge-vector-recall:flow:FR-09
  tests: test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-knowledge-vector-recall
  status: active

## FR-cli-entry-238 changes.title 三段链路闭合（start 写入 --title>input 首行>名兜底
变更：2026-09-29-title-and-agents-slim
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When changes.title 三段链路闭合（start 写入 --title>input 首行>名兜底、resume/adopt 补写、serializeForS；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-title-and-agents-slim/requirements.md#FR-01
最近确认：263542670c49870b8376c23395b5d1e58f7cd4b9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-title-and-agents-slim:flow:FR-01
  tests: test/change-title-backfill.test.mjs | test/change-title-flow.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-title-and-agents-slim
  status: active

## FR-cli-entry-239 AGENTS.md 移出操作教学（轻量变更节并入选道、速查压缩为恢复查看三行），模板 templat
变更：2026-09-29-title-and-agents-slim
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When AGENTS.md 移出操作教学（轻量变更节并入选道、速查压缩为恢复查看三行），模板 templates/agents-instruction.md 同步，模板；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-title-and-agents-slim/requirements.md#FR-02
最近确认：263542670c49870b8376c23395b5d1e58f7cd4b9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-title-and-agents-slim:flow:FR-02
  tests: test/init-agents-injection.test.mjs | test/quick-retired.test.mjs「R5 模板/仓库 AGENTS.md」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-title-and-agents-slim
  status: active

## FR-cli-entry-240 标题约定落 sillyspec-flow skill 并修正 commands.test 退役过期行
变更：2026-09-29-title-and-agents-slim
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 标题约定落 sillyspec-flow skill 并修正 commands.test 退役过期行；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-title-and-agents-slim/requirements.md#FR-03
最近确认：263542670c49870b8376c23395b5d1e58f7cd4b9

## FR-cli-entry-241 {FR_INDEX_DIGEST} 注入收敛——滤 unmapped、top-8 截断、尾部指针行
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-01
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-01
  tests: test/fr-inject-cap.test.mjs「① unmapped-only 专属空态」 | test/fr-inject-cap.test.mjs「①b 混合交付」 | test/fr-inject-cap.test.mjs「② 大域截断≤8+指针行+blockquote 保留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-242 rot 持久标记层拆除——两处写入点与标记设施从 src 消失
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-02
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-02
  tests: test/quick-asset-tail.test.mjs「1a/1b 导出移除钉」 | test/thin-fr-inject-parity.test.mjs「② rotSuspectFlow 三分判据+遥测 count=strong+不落盘」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-243 readActiveFrDigest 条目不再携带 needsReview 字段，注入排序回到索引序
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-03
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-03
  tests: test/quick-asset-tail.test.mjs「6/6b needsReview 字段拆除钉」 | test/thin-fr-inject-parity.test.mjs「① flowKnowledgeDigest 索引序、无 ⚠️」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-244 knowledge/fr/*.md 现存「待复核：」行全部剥除
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-04
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

## FR-cli-entry-245 knowledge-digest 移除 rot 计数告警臂
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-05
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-05
  tests: test/knowledge-digest.test.mjs「① 三信号阈值：totals 无 rot 键」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-246 stage-contract brainstorm --done 重复软门补 unmapped 过滤
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-06
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-06
  tests: test/fr-index.test.mjs「10e 软门真域夹具透出」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-247 fr-inject 遥测（digest 源）保持全量 count 并新增截断披露字段
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-07
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-07
  tests: test/fr-inject-cap.test.mjs「② 大域截断遥测全量口径 count=12/rendered=8/truncated=4」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-248 测试门与套件零回归
变更：2026-09-29-rot-retire-inject-cap
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-rot-retire-inject-cap/requirements.md#FR-08
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-rot-retire-inject-cap:flow:FR-08
  tests: test/fr-index.test.mjs「11a/11b/11c 注入渲染端到端」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-rot-retire-inject-cap
  status: active

## FR-cli-entry-249 ②执行阶段 status 心跳——下一任务指针 + 进度 + 循环协议指引
变更：2026-09-29-flow-task-heartbeat
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-flow-task-heartbeat/requirements.md#FR-01
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-task-heartbeat:flow:FR-01
  tests: test/flow-status-heartbeat.test.mjs「① ②执行阶段：下一任务指针 + 进度 + 循环协议指引」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-task-heartbeat
  status: active

## FR-cli-entry-250 全勾态心跳改指 flow done
变更：2026-09-29-flow-task-heartbeat
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-flow-task-heartbeat/requirements.md#FR-02
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-task-heartbeat:flow:FR-02
  tests: test/flow-status-heartbeat.test.mjs「② 全勾：心跳改指 flow done」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-task-heartbeat
  status: active

## FR-cli-entry-251 ①spec 阶段不刷心跳
变更：2026-09-29-flow-task-heartbeat
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-flow-task-heartbeat/requirements.md#FR-03
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-task-heartbeat:flow:FR-03
  tests: test/flow-status-heartbeat.test.mjs「③ ①阶段（spec 槽未填）：不刷心跳」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-task-heartbeat
  status: active

## FR-cli-entry-252 协议文案三处同步
变更：2026-09-29-flow-task-heartbeat
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-flow-task-heartbeat/requirements.md#FR-04
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-task-heartbeat:flow:FR-04
  tests: test/flow-status-heartbeat.test.mjs「④ 协议文案三处同步钉」 | test/tick-loop-nudge.test.mjs「③ 简报交付纪律」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-task-heartbeat
  status: active

## FR-cli-entry-253 逐 task 证据哨兵行为零变化
变更：2026-09-29-flow-task-heartbeat
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-flow-task-heartbeat/requirements.md#FR-05
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-task-heartbeat:flow:FR-05
  tests: test/tick-loop-nudge.test.mjs「④ 哨兵时点判定钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-task-heartbeat
  status: active

## FR-cli-entry-254 测试全绿
变更：2026-09-29-flow-task-heartbeat
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-flow-task-heartbeat/requirements.md#FR-06
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06

## FR-cli-entry-255 SKILL.md ②节勾选行改为心跳循环口径（做一件→勾一格→重跑 flow status 取下一个
变更：2026-09-29-flow-skill-heartbeat-doc
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When SKILL.md ②节勾选行改为心跳循环口径（做一件；Then 勾一格
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-heartbeat-doc/requirements.md#FR-01
最近确认：94d357e5ab2e7d4816a091db0e580cb0b72e2a0a

## FR-cli-entry-256 全勾后 flow done）
变更：2026-09-29-flow-skill-heartbeat-doc
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 全勾后 flow done）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-heartbeat-doc/requirements.md#FR-02
最近确认：94d357e5ab2e7d4816a091db0e580cb0b72e2a0a

## FR-cli-entry-257 SKILL.md 边界节中断恢复行补节拍器语义（②执行阶段 status 给下一任务指针与进度）
变更：2026-09-29-flow-skill-heartbeat-doc
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When SKILL.md 边界节中断恢复行补节拍器语义（②执行阶段 status 给下一任务指针与进度）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-heartbeat-doc/requirements.md#FR-03
最近确认：94d357e5ab2e7d4816a091db0e580cb0b72e2a0a

## FR-cli-entry-258 其余内容零改动
变更：2026-09-29-flow-skill-heartbeat-doc
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 其余内容零改动；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-heartbeat-doc/requirements.md#FR-04
最近确认：94d357e5ab2e7d4816a091db0e580cb0b72e2a0a

## FR-cli-entry-259 flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行
变更：2026-09-29-heartbeat-d007-incontext
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行五处文案改为「以 tasks.md 为进度源：做一件；Then 勾一格
全文：.sillyspec/changes/archive/2026-09-29-heartbeat-d007-incontext/requirements.md#FR-01
最近确认：02a7dca978ae5ec8cdaf59cd38bb3cdcbc7c73d2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-heartbeat-d007-incontext:flow:FR-01
  tests: test/flow-status-heartbeat.test.mjs「① …自愿语义钉（D-007 纠偏）」 | test/flow-status-heartbeat.test.mjs「④ …旧口径负向钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-heartbeat-d007-incontext
  status: active

## FR-cli-entry-260 flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow
变更：2026-09-29-heartbeat-d007-incontext
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow status」类指引；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-heartbeat-d007-incontext/requirements.md#FR-02
最近确认：02a7dca978ae5ec8cdaf59cd38bb3cdcbc7c73d2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-heartbeat-d007-incontext:flow:FR-02
  tests: test/flow-status-heartbeat.test.mjs「④ …AGENTS.md 不得携带勾选纪律细节（瘦身钉）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-heartbeat-d007-incontext
  status: active

## FR-cli-entry-261 status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文
变更：2026-09-29-heartbeat-d007-incontext
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文案改口径；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-heartbeat-d007-incontext/requirements.md#FR-03
最近确认：02a7dca978ae5ec8cdaf59cd38bb3cdcbc7c73d2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-heartbeat-d007-incontext:flow:FR-03
  tests: test/flow-status-heartbeat.test.mjs | test/tick-loop-nudge.test.mjs「③」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-heartbeat-d007-incontext
  status: active

## FR-cli-entry-262 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flo
变更：2026-09-29-heartbeat-d007-incontext
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flow 系与 test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-heartbeat-d007-incontext/requirements.md#FR-04
最近确认：02a7dca978ae5ec8cdaf59cd38bb3cdcbc7c73d2

## FR-cli-entry-263 注入 digest 两档排序——TierA 覆盖命中优先、TierB 按来源变更日期新→旧
变更：2026-10-03-fr-inject-relevance-rank
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 厚道 buildFrIndexDigestSection（src/run/prompt.js）与轻量道 flowKnowledgeDigest（src/flow；When 渲染注入清单；Then 排序两档：TierA=覆盖命中条目（判定与 activeFrCoverageHits/测试门同口径：来源变更交付面 ∪ 绑定 tests，与本次触碰文件单向匹配
全文：.sillyspec/changes/archive/2026-10-03-fr-inject-relevance-rank/requirements.md#FR-01
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-inject-relevance-rank:flow:FR-01
  tests: test/fr-inject-cap.test.mjs「⑥ 日期新者优先」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-inject-relevance-rank
  status: active

## FR-cli-entry-264 覆盖命中的老条目必进注入面
变更：2026-10-03-fr-inject-relevance-rank
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 域内 active >8 条、其中某条来源变更的覆盖面与本次触碰文件有交集、该条按旧排序永居前 8 之外（缺陷实证：文件序前 8=每域最老 8 条）；When 渲染注入清单；Then 该条出现在注入清单内且带 🎯 标注（新增测试用例实证）；无覆盖命中时行为退化为纯 TierB 排序，注入条数与既有断言不回归
全文：.sillyspec/changes/archive/2026-10-03-fr-inject-relevance-rank/requirements.md#FR-02
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-inject-relevance-rank:flow:FR-02
  tests: test/fr-inject-cap.test.mjs「⑤ 覆盖命中进注入」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-inject-relevance-rank
  status: active

## FR-cli-entry-265 FR 标题不再 50 字符硬截断
变更：2026-10-03-fr-inject-relevance-rank
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow-draft 机器预填 success criterion 长度超过 50 字符（实证：平台仓 FR-components-shared-038 残句「；When draftGwtSkeleton 生成 `### FR-NN: 标题` 行；Then 标题保留全文不截断（Given/When/Then 行的 80 字符帽维持不变）
全文：.sillyspec/changes/archive/2026-10-03-fr-inject-relevance-rank/requirements.md#FR-03
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-inject-relevance-rank:flow:FR-03
  tests: test/flow-draft.test.mjs「长标题不截断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-inject-relevance-rank
  status: active

## FR-cli-entry-266 When/Then 切分改括号深度感知——括号内分隔符不切
变更：2026-10-03-fr-inject-relevance-rank
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given success criterion 含括号内箭头（实证：「changes→变更中心」被当 When/Then 分隔符，骨架错位）；When draftGwtSkeleton 按 /[→➜]|则|使得/ 切分 When/Then；Then 仅括号深度 0 处的分隔符生效；括号内的 →/➜/则/使得 不触发切分（无有效切分点时 When=全文、Then=占位句，维持既有兜底）
全文：.sillyspec/changes/archive/2026-10-03-fr-inject-relevance-rank/requirements.md#FR-04
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-inject-relevance-rank:flow:FR-04
  tests: test/flow-draft.test.mjs「括号内箭头不切分」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-inject-relevance-rank
  status: active

## FR-cli-entry-267 域 ≤8 条时注入内容不回归
变更：2026-10-03-fr-inject-relevance-rank
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 触达域 active 条目 ≤8 条（无截断面）；When 两档排序接入后渲染注入清单；Then 条目集合与既有测试断言完全一致（仅允许顺序按新排序调整）；unmapped 过滤/空态文案/遥测既有字段（count/rendered/truncated/un
全文：.sillyspec/changes/archive/2026-10-03-fr-inject-relevance-rank/requirements.md#FR-05
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-inject-relevance-rank:flow:FR-05
  tests: test/fr-inject-cap.test.mjs「④ 小域无截断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-inject-relevance-rank
  status: active

## FR-cli-entry-268 遥测披露排断面
变更：2026-10-03-fr-inject-relevance-rank
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 注入渲染发生截断或存在覆盖命中；When fr-inject 遥测事件落盘；Then 新增 tierA 字段披露本次注入面覆盖命中数（既有字段零改动）；轻量道 summary.frCount 口径不变
全文：.sillyspec/changes/archive/2026-10-03-fr-inject-relevance-rank/requirements.md#FR-06
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-inject-relevance-rank:flow:FR-06
  tests: test/fr-inject-cap.test.mjs「② 大域截断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-inject-relevance-rank
  status: active

## FR-cli-entry-269 纯骨架识别与标记——索引条目落「骨架：thin」行
变更：2026-10-03-fr-skeleton-gate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 归档索引处理变更 requirements.md 的 FR 块、其全部场景体（scenarioBodies）的 Then 均为机器预填占位句「行为符合本条标准描；When indexRequirements/renderFrLines 把条目写入 knowledge/fr/<域>.md；Then 条目带「骨架：thin」标记行（状态行之后）；任一场景体有实质 Then → 不标（保守判据，宁漏勿误杀）；无场景体 → 不标
全文：.sillyspec/changes/archive/2026-10-03-fr-skeleton-gate/requirements.md#FR-01
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-skeleton-gate:flow:FR-01
  tests: test/fr-skeleton-gate.test.mjs「② 索引标记」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-skeleton-gate
  status: active

## FR-cli-entry-270 存量回填幂等
变更：2026-10-03-fr-skeleton-gate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given knowledge/fr 存量条目中存在未标记的纯骨架（场景正文行的 Then 全为占位句）；When 执行 markSkeletonThin(knowledgeRoot)（全域扫描）；Then 纯骨架条目补「骨架：thin」行并返回标记清单；已有标记/非骨架条目零变更；二次执行零变更（幂等）
全文：.sillyspec/changes/archive/2026-10-03-fr-skeleton-gate/requirements.md#FR-02
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-skeleton-gate:flow:FR-02
  tests: test/fr-skeleton-gate.test.mjs「③ 存量回填幂等」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-skeleton-gate
  status: active

## FR-cli-entry-271 注入面排除骨架条目（TierA 覆盖命中例外）
变更：2026-10-03-fr-skeleton-gate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 触达域 active 条目中混有骨架与非骨架条目；When buildFrIndexDigestSection（厚道）与 flowKnowledgeDigest（轻量道）渲染注入清单；Then 骨架条目不占注入席位（指针行披露「纯骨架 N 条不注入」）；TierA 覆盖命中的骨架条目仍注入且带 🎯（它可能是该文件唯一行为痕迹）；纯非骨架场景的注入行为
全文：.sillyspec/changes/archive/2026-10-03-fr-skeleton-gate/requirements.md#FR-03
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-skeleton-gate:flow:FR-03
  tests: test/fr-inject-cap.test.mjs | test/fr-skeleton-gate.test.mjs「④ 注入排除+TierA 例外」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-skeleton-gate
  status: active

## FR-cli-entry-272 digest 解析披露骨架位
变更：2026-10-03-fr-skeleton-gate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 知识条目带「骨架：thin」行；When readActiveFrDigest 读取该域；Then 返回条目 skeleton=true（纯增量字段）；查重门/rot suspect/测试绑定面的消费不受影响（不滤不改口径）
全文：.sillyspec/changes/archive/2026-10-03-fr-skeleton-gate/requirements.md#FR-04
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-skeleton-gate:flow:FR-04
  tests: test/fr-skeleton-gate.test.mjs「① 判据单元 + ⑤ digest flag」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-skeleton-gate
  status: active

## FR-cli-entry-273 平台仓存量回填完成
变更：2026-10-03-fr-skeleton-gate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given multi-agent-platform 仓 knowledge/fr 存量骨架条目（9 月大批量薄道产物）；When 用本变更实现的 markSkeletonThin 对该仓执行回填；Then 回填完成且标记数量披露（操作随变更留档）
全文：.sillyspec/changes/archive/2026-10-03-fr-skeleton-gate/requirements.md#FR-05
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e

## FR-cli-entry-274 rot-suspect 事件携带 FR id 清单
变更：2026-10-03-fr-governance-telemetry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow done 收口的 fr-rot-suspect 遥测事件（覆盖命中的 strong 条目集）；When appendKnowledgeHit 落盘事件；Then 负载含 frIds（strong 条目全局 id，帽 20 条——防单事件膨胀）；既有字段（domains/strong/unknown/skip/count/
全文：.sillyspec/changes/archive/2026-10-03-fr-governance-telemetry/requirements.md#FR-01
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-governance-telemetry:flow:FR-01
  tests: test/fr-governance-telemetry.test.mjs「① rot-suspect 事件带 frIds 帽 20」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-governance-telemetry
  status: active

## FR-cli-entry-275 unreferenced 事件携带 FR id 清单
变更：2026-10-03-fr-governance-telemetry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given indexRequirements 的 unreferenced 探针产出触达域未被本次承接引用的 active 条目；When archive-distill 落盘 fr-unreferenced 事件；Then 负载含 ids（该域未引用条目全局 id，帽 20 条）；既有字段（change/domain/count）零改动
全文：.sillyspec/changes/archive/2026-10-03-fr-governance-telemetry/requirements.md#FR-02
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-governance-telemetry:flow:FR-02
  tests: test/fr-governance-telemetry.test.mjs「② unreferenced 探针带 ids」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-governance-telemetry
  status: active

## FR-cli-entry-276 存量事件向后兼容
变更：2026-10-03-fr-governance-telemetry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given knowledge-hits.jsonl 存量事件（无 frIds/ids 字段）；When knowledge-stats 解析；Then 零破坏——无字段事件不进 id 聚合，域级/事件级既有读数不变
全文：.sillyspec/changes/archive/2026-10-03-fr-governance-telemetry/requirements.md#FR-03
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-governance-telemetry:flow:FR-03
  tests: test/fr-governance-telemetry.test.mjs「③ 存量无字段事件兼容」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-governance-telemetry
  status: active

## FR-cli-entry-277 knowledge stats 裁决候选视图
变更：2026-10-03-fr-governance-telemetry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given knowledge-hits 中 rot-suspect/unreferenced 事件带 id 清单、knowledge/fr 索引在场；When buildFrIndexStats 聚合 + cmdKnowledgeStats 渲染
全文：.sillyspec/changes/archive/2026-10-03-fr-governance-telemetry/requirements.md#FR-04
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-fr-governance-telemetry:flow:FR-04
  tests: test/fr-governance-telemetry.test.mjs「④ 裁决候选视图」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-fr-governance-telemetry
  status: active

## FR-cli-entry-278 unmapped 停车场治理执行
变更：2026-10-03-fr-governance-telemetry
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本仓 knowledge/fr/unmapped.md 存量 723 条（40% 死库存——比对面已排除）；When planRedomain 干跑评估机械可迁面 → 可迁者 redomainFrEntries --write 迁移（ID 不换号）；Then 迁移数量与残余数量披露；不可迁残余在 unmapped.md 头注显式「检索面-only」声明（承认死库存不伪装活跃）
全文：.sillyspec/changes/archive/2026-10-03-fr-governance-telemetry/requirements.md#FR-05
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa

## FR-cli-entry-279 splitGwtSeparator 直测三态——导出获得消费方
变更：2026-10-03-splitgwt-direct-test
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow-draft.js 导出的 splitGwtSeparator（批次1 新增，括号深度感知 When/Then 分隔扫描）；When test/flow-draft.test.mjs 以 import 消费该导出并直测；Then 三态断言全绿：括号内分隔符（→/嵌词则）不切返回 null；括号外 →/则/使得 切分返回两段（首个深度 0 分隔符生效、后续括号内容原样保留）；空输入返回 n
全文：.sillyspec/changes/archive/2026-10-03-splitgwt-direct-test/requirements.md#FR-01
最近确认：b1bd40888408db06043d6fd6352cb1343ac3a6e9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-splitgwt-direct-test:flow:FR-01
  tests: test/flow-draft.test.mjs「⑧ splitGwtSeparator 直测：括号深度感知三态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-splitgwt-direct-test
  status: active

## FR-cli-entry-280 pre-push lint 门「未引用导出」清单归零
变更：2026-10-03-splitgwt-direct-test
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 22e-b 死导出裁决的 lint 检查（src+test 其余文件零引用的导出拦截）；When splitGwtSeparator 有测试消费方后重跑 pre-push lint 门不再拦截 push，「未引用导出」清单不含该符号
全文：.sillyspec/changes/archive/2026-10-03-splitgwt-direct-test/requirements.md#FR-02
最近确认：b1bd40888408db06043d6fd6352cb1343ac3a6e9

## FR-cli-entry-281 platform-interface-map.md 行号锚与工作区实态对齐——失效引用归零
变更：2026-10-03-doc-anchor-refresh
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given docs/sillyspec/platform-interface-map.md 四处 src/index.js 行号锚（4145/4097/3910/4007；When 机械刷新锚点到当前符号位（4151 pullList / 4103 collectStatus / 3916 probeSillyHub / 4013 POIN；Then doc-ref-check 失效引用清单 4/93 → 0/93（关键词断言保留不降级——不加 ? 跳过位）
全文：.sillyspec/changes/archive/2026-10-03-doc-anchor-refresh/requirements.md#FR-01
最近确认：e366c3aa66c0c3aae4cd8ee267cd90ed8ca581c2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-doc-anchor-refresh:flow:FR-01
  tests: test/doc-ref-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-doc-anchor-refresh
  status: active

## FR-cli-entry-282 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输出已勾进度 N/M 与下一待办任务指针，未知 task-NN 报错并列可选 id
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 幂等 相关模块就绪；When 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-01
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-01
  tests: test/task-tick.test.mjs「①a 翻格保字节」 | test/task-tick.test.mjs「①b 幂等」 | test/task-tick.test.mjs「①c 未知 id」 | test/task-tick.test.mjs「③a task tick：翻格+进度回显+下一任务指针」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-283 flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md（进度源唯一），并给出 tick 动词用法
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-02
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-02
  tests: test/batch-tick-gate.test.mjs「③ A 层文案钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-284 tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-03
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-03
  tests: test/batch-tick-gate.test.mjs「③ A 层文案钉」 | test/tick-loop-nudge.test.mjs「② tasks.md 头部纪律行钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-285 AGENTS.md 核心规则新增边干边勾常驻条目（init 模板源如在场则同步）
变更：2026-10-03-voluntary-task-tick
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When AGENTS.md 核心规；Then 新增边干边勾常驻条目（init 模板源如在场则同步）
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-04
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

## FR-cli-entry-286 flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-05
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-05
  tests: test/flow-tick-prototype.test.mjs「④ 勾选缺失 advisory」 | test/task-tick.test.mjs「⑤ 认领未勾完（覆写面）→ advisory 不代勾不阻断；零提交也显形」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-287 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-06
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-06
  tests: test/task-tick.test.mjs「④ 镜像未认领+有交付 → 机器代勾全部镜像行（不阻断、留痕、归档件全勾）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-288 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 / 幂等 相关模块就绪；When 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-07
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-07
  tests: test/task-tick.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-289 既有测试回归绿
变更：2026-10-03-voluntary-task-tick
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有测试回归绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-10-03-voluntary-task-tick/requirements.md#FR-08
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-03-voluntary-task-tick:flow:FR-08
  tests: test/task-tick.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-03-voluntary-task-tick
  status: active

## FR-cli-entry-290 flow start 起草的四件文档为纯 markdown 零 MACHINE-DRAFT 指纹标记零 AGENT 槽注释
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow start 对新变更执行 draftAll 起草（draft ledger schemaVersion=2 轨）；When proposal/requirements/design/tasks 四件落盘；Then 四件为纯 markdown 正文——零 `<!-- MACHINE-DRAFT:` 指纹标记、零 `<!--AGENT:` 槽注释（正文提及这些词不算）；防篡改
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-01
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-01
  tests: test/flow-draft.test.mjs「① draftAll v2 形态（纯 markdown 零标记+ledger v2 锚）+任务卡分岔」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-291 requirements FR 骨架改为 SHALL 正文加 Scenario WHEN THEN 句式且不再机器预填 GWT 场景体
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 新起草的 requirements.md（v2 轨）；When 起草器生成 FR 块；Then 每条 = `### FR-NN: <成功标准原文>` 标题锚 + 一行待撰写指引（agent 撰写带强度词的行为句：必须/禁止/SHOULD/SHOULD NO
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-02
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-02
  tests: test/flow-draft.test.mjs「⑦b GWT 骨架预填退役」 | test/fr-agent-writable.test.mjs「① 骨架形态」 | test/fr-agent-writable.test.mjs「③ 行为句未撰写→拒收」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-292 成功标准摘录不再做复合拆分与编号劫持与 80 字截断变形
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given --input 含成功标准节条目、正文编号条目、分号/斜杠复合句、超 80 字符长句；When extractSuccessCriteria 摘录；Then 只有成功标准节条目（与无节时列表行）入选——正文编号条目不劫持；分号/斜杠复合条目整条保留不拆；长条目全文进 FR 标题锚与 tasks 镜像行（clipTas
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-03
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-03
  tests: test/flow-draft.test.mjs「⑦a 长标准不截断」 | test/flow-draft.test.mjs「⑬ 编号条目不劫持」 | test/fr-compound-split.test.mjs「①②③」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-293 design 四问文本与 flow done 门禁判据由单一源常量同源供给
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given DESIGN_QUESTIONS 常量（flow-draft.js 导出）；When 起草器写 design.md 与验收端 verifyThinDocsV2 校验；Then 两端消费同一常量（验收读 ledger.anchor.designQuestions，缺省回落常量本体）；四问原文被改写 → 拒收「问题文本被改写」；flow-
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-04
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-04
  tests: test/thin-docs-v2.test.mjs「① 四问单一源：起草含常量逐字；问题被改写→拒收」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-294 起草锚点存入 draft ledger 机器态且 flow done 做文档与锚对比输出漂移 advisory
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given draft ledger schemaVersion=2 的 anchor（criteria 数组+四问文本）；When flow done 工件校验；Then requirements FR 标题锚缺失锚内成功标准原文（子串语义——整段改写才算漂移，轻改写保留原文不误报）→ 输出「门柱漂移 advisory」不阻断；t
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-05
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-05
  tests: test/thin-docs-v2.test.mjs「② 门柱漂移 advisory」 | test/thin-docs-v2.test.mjs「④ 结构破坏拒收面」 | test/thin-docs-v2.test.mjs「⑤ adopted 豁免」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-295 flow start 支持 autopilot 声明且新增 flow approve 子命令记录 spec 断点用户批准
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 轻量变更在 spec 断点（agent 填完 FR+design 后动工前）；When 用户运行 `sillyspec flow approve --change <名>`（或 flow start 声明 `--autopilot`）；Then flow-state 落 {spec_approved:true, spec_approved_at, spec_approved_by}（approve 留痕
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-06
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-06
  tests: test/flow-draft.test.mjs「⑥ 轻量跑道 e2e（v2）：spec 断点机器门」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-296 未声明 autopilot 的变更在 flow done 因缺批准证据拒收
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given v2 起草变更（ledger schemaVersion=2）既无 spec_approved 也无 autopilot；When flow done artifacts 子步；Then 拒收（exit 非零）并指引两出路：用户跑 flow approve / 用户显式 --autopilot 重入声明；v1 在途变更（ledger 无 sche
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-07
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-07
  tests: test/flow-draft.test.mjs「⑥」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-297 tasks.md 保留成功标准镜像任务锚并显式允许 agent 追加细化行
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 新起草的 tasks.md（v2 轨）；When 起草器生成任务面；Then 镜像行 = 成功标准逐条全文本 checkbox 行（不截断）+ 头注明示「镜像行勿删（任务锚）、细化行可追加（task-NN 编号顺延）」；agent 追加细
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-08
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-08
  tests: test/flow-draft.test.mjs「⑦a」 | test/thin-docs-v2.test.mjs「③ tasks 镜像+细化行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-298 存量指纹 ledger 在途变更走旧校验双轨不受影响
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 在途变更持有 v1 draft ledger（schemaVersion 缺省）与 MACHINE-DRAFT 指纹文档；When 升级后的 CLI 执行 redraftMissingArtifacts / verifyFlowDrafts / verifyRequirementBindin；Then redraft 按本变更 ledger 代别选 v1 指纹稿补件（不混代）；verifyFlowDrafts 走 verifyMarkers 三态（schema
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-09
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-09
  tests: test/flow-draft.test.mjs「③④ v1 指纹三态拒收与 AGENT 槽放行」 | test/flow-draft.test.mjs「⑤ amend 留痕」 | test/flow-draft.test.mjs「⑧b 双轨：v1 在途 ledger 补件走指纹稿」 | test/flow-draft.test.mjs「⑩ v1 槽位门回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-299 新增聚焦测试覆盖上述行为且既有测试回归绿
变更：2026-10-04-thin-docs-v2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更交付的 src 改动（flow-draft/flow/flow-review/flow-parity）；When 全量测试套与 lint 跑；Then 聚焦面全绿：v2 起草形态/摘录保真/锚对比拒收与 advisory/断点门双 e2e（approve 拒收→批准放行、autopilot 豁免）/双轨回归（v
全文：.sillyspec/changes/archive/2026-10-04-thin-docs-v2/requirements.md#FR-10
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-thin-docs-v2:flow:FR-10
  tests: test/check-syntax.mjs | test/flow-draft.test.mjs | test/run-tests.mjs | test/thin-docs-v2.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-thin-docs-v2
  status: active

## FR-cli-entry-300 FR 行为句强度词判定词表纳入 SHOULD（含 SHOULD NOT 形态）——只写 SHOULD 唯一强度句不再误拒收并有回归锁定
变更：2026-10-04-strength-should
状态：active
摘要：SHOULD 唯一强度句
场景正文：
- 场景：SHOULD 唯一强度句 — Given requirements 某条 FR 正文只含一句「系统 SHOULD …」强度句；When flow done 执行 verifyThinDocsV2；Then 该 FR 不因词表缺漏被误拒收（fail-closed 缺口闭合）
全文：.sillyspec/changes/archive/2026-10-04-strength-should/requirements.md#FR-01
最近确认：fca510ac262707025522f6858ff543ad56de4799

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-strength-should:flow:测试绑定FR-01
  tests: test/thin-docs-v2.test.mjs「⑥ 强度词表含 SHOULD/SHOULD NOT」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-strength-should
  status: active

## FR-cli-entry-301 flow approve 对不存在变更 exit 2 的行为补测试断言锁定
变更：2026-10-04-strength-should
状态：active
摘要：变更未建先批
场景正文：
- 场景：变更未建先批 — Given changes/<名> 目录不存在；When 用户运行 flow approve --change <名>；Then exit 2 且 stderr 指明「变更不存在（approve 在 flow start 之后运行）」
全文：.sillyspec/changes/archive/2026-10-04-strength-should/requirements.md#FR-02
最近确认：fca510ac262707025522f6858ff543ad56de4799

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-strength-should:flow:测试绑定FR-02
  tests: test/flow-draft.test.mjs「⑥c flow approve 对不存在变更 exit 2」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-strength-should
  status: active

## FR-cli-entry-302 既有测试回归绿且 lint 零死导出
变更：2026-10-04-strength-should
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-04-strength-should/requirements.md#FR-03
最近确认：fca510ac262707025522f6858ff543ad56de4799

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-strength-should:flow:测试绑定FR-03
  tests: test/check-syntax.mjs | test/flow-draft.test.mjs | test/thin-docs-v2.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-strength-should
  status: active

## FR-cli-entry-303 platform-interface-map 的 triggerPull 行号锚刷新为 4234（窗口同时覆盖 HEAD 4232 与工作树 4235），doc-ref-check 93/93 全绿
变更：2026-10-04-anchor-triggerpull
状态：active
摘要：doc-ref-check 全量校验
场景正文：
- 场景：doc-ref-check 全量校验 — Given platform-interface-map 刷新后的 93 处行号锚；When doc-ref-check 校验；Then 93/93 全绿（窗口命中且关键词在场）
全文：.sillyspec/changes/archive/2026-10-04-anchor-triggerpull/requirements.md#FR-01
最近确认：c172c36ae2f3bba93853424276a0b7d255b74fd2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-anchor-triggerpull:flow:测试绑定FR-01
  tests: test/doc-ref-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-anchor-triggerpull
  status: active

## FR-cli-entry-304 FR 行为句强度词判定对英文 SHALL MUST SHALL NOT SHOULD 与中文必须禁用同构——句中任意位置命中即视为已撰写
变更：2026-10-05-wordpos
状态：active
摘要：句中英文强度句
场景正文：
- 场景：句中英文强度句 — Given 某条 FR 正文写「本变更 MUST …」或「边界场景 SHOULD …」（强度词不在行首）；When flow done 执行 verifyThinDocsV2；Then 该 FR 不因位置锚定被误拒收（行首「- 系统 MUST」旧形态继续放行）
全文：.sillyspec/changes/archive/2026-10-05-wordpos/requirements.md#FR-01
最近确认：1793e02b038ff67e1b2610b0aee4a70bcf485bb5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-wordpos:flow:测试绑定FR-01
  tests: test/thin-docs-v2.test.mjs「⑥ 强度词表含 SHOULD/SHOULD NOT 且中英位置同构」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-wordpos
  status: active

## FR-cli-entry-305 待撰写占位行仍被拒收——占位句自带的词表字样不算已撰写
变更：2026-10-05-wordpos
状态：active
摘要：占位句词表字样
场景正文：
- 场景：占位句词表字样 — Given 某条 FR 正文仍是「（待撰写：…必须/禁止/SHOULD/可以）」占位行；When flow done 执行 verifyThinDocsV2；Then 该 FR 因 pending 前缀被拒收（本判据放宽不构成绕过面）
全文：.sillyspec/changes/archive/2026-10-05-wordpos/requirements.md#FR-02
最近确认：1793e02b038ff67e1b2610b0aee4a70bcf485bb5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-wordpos:flow:测试绑定FR-02
  tests: test/thin-docs-v2.test.mjs「⑥」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-wordpos
  status: active

## FR-cli-entry-306 既有测试回归绿且 lint 零死导出
变更：2026-10-05-wordpos
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-wordpos/requirements.md#FR-03
最近确认：1793e02b038ff67e1b2610b0aee4a70bcf485bb5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-wordpos:flow:测试绑定FR-03
  tests: test/check-syntax.mjs | test/flow-draft.test.mjs | test/thin-docs-v2.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-wordpos
  status: active

## FR-cli-entry-307 knowledge stats/classify/inbox 三子命令的 --json 判定必须兼读 opts.json（全局旗标正道）与 args.includes('--json')（直调兜底），经 index.js 真实调度的 --json 输出结构化 JSON
变更：2026-10-05-dogfood-audit-fixes
状态：active
摘要：真实 CLI 调度；直调兜底不回归
全文：.sillyspec/changes/archive/2026-10-05-dogfood-audit-fixes/requirements.md#FR-01
最近确认：cb8fddc71b66e78c840ed6120653136904a3df0f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-dogfood-audit-fixes:flow:测试绑定FR-01
  tests: test/knowledge-inbox.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-dogfood-audit-fixes
  status: active

## FR-cli-entry-308 flow start 起草的 design.md 模板「文件变更清单」指引必须改为独立章节写法，与 parseFileChangeList 解析面一致（照新指引书写不再触发夹带嫌疑误报）
变更：2026-10-05-dogfood-audit-fixes
状态：active
摘要：照新指引书写可被解析
全文：.sillyspec/changes/archive/2026-10-05-dogfood-audit-fixes/requirements.md#FR-02
最近确认：cb8fddc71b66e78c840ed6120653136904a3df0f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-dogfood-audit-fixes:flow:测试绑定FR-02
  tests: test/flow-draft.test.mjs「design 模板文件变更清单指引=独立章节写法」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-dogfood-audit-fixes
  status: active

## FR-cli-entry-309 单测覆盖：三子命令 opts.json 路径断言各至少一条；stats 加经 stages/knowledge.js cmdKnowledge 调度入口的端到端 JSON 断言；模板文案新指引在场
变更：2026-10-05-dogfood-audit-fixes
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-dogfood-audit-fixes/requirements.md#FR-03
最近确认：cb8fddc71b66e78c840ed6120653136904a3df0f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-dogfood-audit-fixes:flow:测试绑定FR-03
  tests: test/knowledge-stats.test.mjs「Test 9 断言面收口（三子命令+入口+模板同变更覆盖）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-dogfood-audit-fixes
  status: active

## FR-cli-entry-310 design 作答含「无串台面/不会串台/杜绝串台」时不再因承诺词升级（其余信号不受影响）
变更：2026-10-05-review-promise-negation
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-promise-negation/requirements.md#FR-01
最近确认：905397ef044a86511a22cc1321fe3d529b74e97f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-promise-negation:flow:测试绑定FR-01
  tests: test/flow-review.test.mjs「否定语境消解：无串台面/不会串台/杜绝串台不再一票升级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-promise-negation
  status: active

## FR-cli-entry-311 input/requirements 里非否定「串台」仍一票升级（漏报防护不放松）
变更：2026-10-05-review-promise-negation
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-promise-negation/requirements.md#FR-02
最近确认：905397ef044a86511a22cc1321fe3d529b74e97f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-promise-negation:flow:测试绑定FR-02
  tests: test/flow-review.test.mjs「用户原话口径：requirements 非否定串台仍一票升级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-promise-negation
  status: active

## FR-cli-entry-312 design 作答里「解决串台问题」等非否定语境仍升级
变更：2026-10-05-review-promise-negation
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-promise-negation/requirements.md#FR-03
最近确认：905397ef044a86511a22cc1321fe3d529b74e97f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-promise-negation:flow:测试绑定FR-03
  tests: test/flow-review.test.mjs「非否定语境保留：解决串台/仍存在串台照常升级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-promise-negation
  status: active

## FR-cli-entry-313 新增/扩展测试锁定上述三面，全量测试绿
变更：2026-10-05-review-promise-negation
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-promise-negation/requirements.md#FR-04
最近确认：905397ef044a86511a22cc1321fe3d529b74e97f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-promise-negation:flow:测试绑定FR-04
  tests: test/flow-review.test.mjs「三面断言 + 既有定档矩阵零回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-promise-negation
  status: active

## FR-cli-entry-314 集成场景（临时 git 仓双变更混窗）：他侧提交的交付文件不进本变更 patch 冻结面与 attributedChangedFiles，FR 域不再触达他侧文件的域
变更：2026-10-05-diff-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-diff-commit-attribution/requirements.md#FR-01
最近确认：45588742ca2f30629a406720cbb28aa270418ceb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-diff-commit-attribution:flow:测试绑定FR-01
  tests: test/commit-attribution-split.test.mjs「混窗集成：他侧提交文件出冻结面与 own 面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-diff-commit-attribution
  status: active

## FR-cli-entry-315 本变更提交的文件（含被无后缀裸提交触碰过的）归属不变
变更：2026-10-05-diff-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-diff-commit-attribution/requirements.md#FR-02
最近确认：45588742ca2f30629a406720cbb28aa270418ceb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-diff-commit-attribution:flow:测试绑定FR-02
  tests: test/commit-attribution-split.test.mjs「保守保留：本变更名/裸提交/声明文件不误剔」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-diff-commit-attribution
  status: active

## FR-cli-entry-316 声明面优先级、7 天陈旧规则、非 git 仓与 git 失败的行为均维持现状
变更：2026-10-05-diff-commit-attribution
状态：active
摘要：降级面
全文：.sillyspec/changes/archive/2026-10-05-diff-commit-attribution/requirements.md#FR-03
最近确认：45588742ca2f30629a406720cbb28aa270418ceb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-diff-commit-attribution:flow:测试绑定FR-03
  tests: test/commit-attribution-split.test.mjs「降级现状：非 git 仓与无 baseline 行为不变」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-diff-commit-attribution
  status: active

## FR-cli-entry-317 新增测试锁定上述三面，全量测试绿
变更：2026-10-05-diff-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-diff-commit-attribution/requirements.md#FR-04
最近确认：45588742ca2f30629a406720cbb28aa270418ceb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-diff-commit-attribution:flow:测试绑定FR-04
  tests: test/commit-attribution-split.test.mjs「三面断言齐全 + 解析纯函数单测」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-diff-commit-attribution
  status: active

## FR-cli-entry-318 detectUiTouch 词表必须移除后端高频通用词（渲染/组件/样式）；CLI 变更描述含「渲染输出/组件/输出样式」等后端通用语必须零命中；既有正例（页面/前端/UI/视觉/tsx 扩展名）检测能力必须不变
变更：2026-10-05-uivisual-word-narrow
状态：active
摘要：CLI 变更描述零误触；真 UI 变更不回归
全文：.sillyspec/changes/archive/2026-10-05-uivisual-word-narrow/requirements.md#FR-01
最近确认：d0b5ebb26fe50faf2965f96fd845259506ebdc30

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-uivisual-word-narrow:flow:测试绑定FR-01
  tests: test/ui-visual-guidance.test.mjs「反例扩充：渲染输出/组件/输出样式后端通用语零命中＋既有五正例回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-uivisual-word-narrow
  status: active

## FR-cli-entry-319 flow start 起草的 design.md 模板指引必须含锚行防呆提示（四问/FR 标题锚从模板原样复制勿手打）
变更：2026-10-05-uivisual-word-narrow
状态：active
摘要：新起草变更可见防呆
全文：.sillyspec/changes/archive/2026-10-05-uivisual-word-narrow/requirements.md#FR-02
最近确认：d0b5ebb26fe50faf2965f96fd845259506ebdc30

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-uivisual-word-narrow:flow:测试绑定FR-02
  tests: test/flow-draft.test.mjs「模板锚行防呆文案在场断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-uivisual-word-narrow
  status: active

## FR-cli-entry-320 单测覆盖：新误伤反例（渲染/组件/样式后端语）至少三条 + 既有正例回归 + 模板文案断言
变更：2026-10-05-uivisual-word-narrow
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-uivisual-word-narrow/requirements.md#FR-03
最近确认：d0b5ebb26fe50faf2965f96fd845259506ebdc30

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-uivisual-word-narrow:flow:测试绑定FR-03
  tests: test/ui-visual-guidance.test.mjs「正反例同文件收口覆盖（含 flow-draft 断言合计）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-uivisual-word-narrow
  status: active

## FR-cli-entry-321 后端/机制讨论语境的「降级」（探针档位讨论、性能降级等）与远处视觉词同行共现必须不再触发降级判定；2026-10-05-uivisual-word-narrow 的真实误伤 design 句作反例
变更：2026-10-05-visual-downgrade-narrow
状态：active
摘要：元层误伤句（2026-10-05-uivisual-word-narrow 实测原文）；后端降级语境
全文：.sillyspec/changes/archive/2026-10-05-visual-downgrade-narrow/requirements.md#FR-01
最近确认：546720ea4ed1a70809e69a82b342f3e4bcda12c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-visual-downgrade-narrow:flow:测试绑定FR-01
  tests: test/ui-visual-guidance.test.mjs「元层误伤句与后端降级语境反例：downgradeDeclared=false」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-visual-downgrade-narrow
  status: active

## FR-cli-entry-322 既有降级正例（视觉收敛降级形态、样式统一级形态）检测能力必须不变；带用户裁决留痕放行路径不变
变更：2026-10-05-visual-downgrade-narrow
状态：active
摘要：既有正例回归
全文：.sillyspec/changes/archive/2026-10-05-visual-downgrade-narrow/requirements.md#FR-02
最近确认：546720ea4ed1a70809e69a82b342f3e4bcda12c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-visual-downgrade-narrow:flow:测试绑定FR-02
  tests: test/ui-visual-guidance.test.mjs「既有降级正例（视觉收敛降级/样式统一级）与裁决放行回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-visual-downgrade-narrow
  status: active

## FR-cli-entry-323 单测覆盖：元层误伤反例（真实误伤句）+ 后端降级同行反例 + 既有两正例回归 + 跨行不误配回归
变更：2026-10-05-visual-downgrade-narrow
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-visual-downgrade-narrow/requirements.md#FR-03
最近确认：546720ea4ed1a70809e69a82b342f3e4bcda12c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-visual-downgrade-narrow:flow:测试绑定FR-03
  tests: test/ui-visual-guidance.test.mjs「反例+正例+跨行回归同文件收口」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-visual-downgrade-narrow
  status: active

## FR-cli-entry-324 flow done lint 门 FAIL 时输出 lint 件套：命令、输出尾部（后15行）、失败文件（前10）、结果文件路径（与 test 三件套同构）
变更：2026-10-05-flowdone-lintfail-output
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flowdone-lintfail-output/requirements.md#FR-01
最近确认：0830851ef51549bb1cd5e35006403f2165d144b9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flowdone-lintfail-output:flow:测试绑定FR-01
  tests: test/flowdone-lint-fail-output.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flowdone-lintfail-output
  status: active

## FR-cli-entry-325 lint 结果持久化：并入 test-result.json（modules 并列 lint 节）；test 无结果文件而 lint 实跑时独立落盘（kind:lint）；skipped 不落
变更：2026-10-05-flowdone-lintfail-output
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flowdone-lintfail-output/requirements.md#FR-02
最近确认：0830851ef51549bb1cd5e35006403f2165d144b9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flowdone-lintfail-output:flow:测试绑定FR-02
  tests: test/flowdone-lint-fail-output.test.mjs「① persistLintResult 三态：并入 / 独立落盘 / skipped 不落」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flowdone-lintfail-output
  status: active

## FR-cli-entry-326 quick-audit failed 提升到 try 外，快照 FAIL 回拷（P6b）与 resultPath 重映射真实生效
变更：2026-10-05-flowdone-lintfail-output
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flowdone-lintfail-output/requirements.md#FR-03
最近确认：0830851ef51549bb1cd5e35006403f2165d144b9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flowdone-lintfail-output:flow:测试绑定FR-03
  tests: test/flowdone-lint-fail-output.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flowdone-lintfail-output
  status: active

## FR-cli-entry-327 e2e 单测锁定全链路：lint 门 FAIL 输出件套 + test-result.json 含 lint 节（含 persistLintResult 三态单测）
变更：2026-10-05-flowdone-lintfail-output
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flowdone-lintfail-output/requirements.md#FR-04
最近确认：0830851ef51549bb1cd5e35006403f2165d144b9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flowdone-lintfail-output:flow:测试绑定FR-04
  tests: test/flowdone-lint-fail-output.test.mjs「① + ② 双件齐备（fixture 快照）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flowdone-lintfail-output
  status: active

## FR-cli-entry-328 tests --redomain --by-change 预览与落盘同口径：只列该变更条目，计数带「（仅「变更：X」）」标注
变更：2026-10-05-redomain-preview-bychange
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-redomain-preview-bychange/requirements.md#FR-01
最近确认：4eedf8e6ace5f2f63e346672f7d198e055cdb863

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-redomain-preview-bychange:flow:测试绑定FR-01
  tests: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ CLI 预览与落盘同口径：--by-change 干跑只列分批子集」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-redomain-preview-bychange
  status: active

## FR-cli-entry-329 他变更条目不进预览清单
变更：2026-10-05-redomain-preview-bychange
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-redomain-preview-bychange/requirements.md#FR-02
最近确认：4eedf8e6ace5f2f63e346672f7d198e055cdb863

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-redomain-preview-bychange:flow:测试绑定FR-02
  tests: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ 他变更条目不进预览清单」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-redomain-preview-bychange
  status: active

## FR-cli-entry-330 CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排除项）
变更：2026-10-05-redomain-preview-bychange
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-redomain-preview-bychange/requirements.md#FR-03
最近确认：4eedf8e6ace5f2f63e346672f7d198e055cdb863

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-redomain-preview-bychange:flow:测试绑定FR-03
  tests: test/fr-domain-guard-and-redomain-bychange.test.mjs「⑥ CLI 级单测（execFileSync 真实 CLI 路径）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-redomain-preview-bychange
  status: active

## FR-cli-entry-331 冻结后窗口内出现本变更名后缀交付提交时，重跑 flow done 检出漂移：输出审计时点漂移警告并自动重冻结（change.patch 含处置提交面，无需手动 --refreeze）
变更：2026-10-05-disposition-refreeze-drift
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-disposition-refreeze-drift/requirements.md#FR-01
最近确认：1d1e9fc5c249a43c245f2692e569091449c6e403

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-disposition-refreeze-drift:flow:测试绑定FR-01
  tests: test/flowdone-disposition-drift.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-disposition-refreeze-drift
  status: active

## FR-cli-entry-332 review 已有结论（review.json 在场）时漂移触发隔离：旧件改名 review.json.superseded 留档，review 子步标记重置，本次重新定档/重评
变更：2026-10-05-disposition-refreeze-drift
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-disposition-refreeze-drift/requirements.md#FR-02
最近确认：1d1e9fc5c249a43c245f2692e569091449c6e403

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-disposition-refreeze-drift:flow:测试绑定FR-02
  tests: test/flowdone-disposition-drift.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-disposition-refreeze-drift
  status: active

## FR-cli-entry-333 窗口内仅他侧提交或无新提交时不触发（幂等跳过行为不变；归属判定按提交 message 变更名后缀）
变更：2026-10-05-disposition-refreeze-drift
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-disposition-refreeze-drift/requirements.md#FR-03
最近确认：1d1e9fc5c249a43c245f2692e569091449c6e403

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-disposition-refreeze-drift:flow:测试绑定FR-03
  tests: test/flowdone-disposition-drift.test.mjs「① detectPatchDrift 归属三形态：本变更后缀触发 / 他侧与裸提交不触发」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-disposition-refreeze-drift
  status: active

## FR-cli-entry-334 单测覆盖归属判定三形态（本变更后缀触发/他侧后缀不触发/裸提交不触发）+ e2e 锁定处置重入链路（漂移警告+重冻结+隔离+重评任务书再现）
变更：2026-10-05-disposition-refreeze-drift
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-disposition-refreeze-drift/requirements.md#FR-04
最近确认：1d1e9fc5c249a43c245f2692e569091449c6e403

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-disposition-refreeze-drift:flow:测试绑定FR-04
  tests: test/flowdone-disposition-drift.test.mjs「① + ② 双件齐备（含锚==HEAD/锚缺失边界）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-disposition-refreeze-drift
  status: active

## FR-cli-entry-335 flow start 抽查提示教的命令形态与实现一致：sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>（flag 形态）
变更：2026-10-05-tests-confirm-hint
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-tests-confirm-hint/requirements.md#FR-01
最近确认：4e4aa7d58299154c82c9fe863a5ee191795fb5f1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-tests-confirm-hint:flow:测试绑定FR-01
  tests: test/tests-confirm-hint-syntax.test.mjs「① 抽查提示含 flag 形态 tests --confirm --anchor」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-tests-confirm-hint
  status: active

## FR-cli-entry-336 全仓不再有「tests confirm 」（子命令形态）的提示残留
变更：2026-10-05-tests-confirm-hint
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-tests-confirm-hint/requirements.md#FR-02
最近确认：4e4aa7d58299154c82c9fe863a5ee191795fb5f1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-tests-confirm-hint:flow:测试绑定FR-02
  tests: test/tests-confirm-hint-syntax.test.mjs「② 全仓 src 无「tests confirm 」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-tests-confirm-hint
  status: active

## FR-cli-entry-337 单测锁定提示语形态（防回漂）
变更：2026-10-05-tests-confirm-hint
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-tests-confirm-hint/requirements.md#FR-03
最近确认：4e4aa7d58299154c82c9fe863a5ee191795fb5f1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-tests-confirm-hint:flow:测试绑定FR-03
  tests: test/tests-confirm-hint-syntax.test.mjs「① + ② 双断言齐备」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-tests-confirm-hint
  status: active

## FR-cli-entry-338 4 处教学点全部带过门格式（独立一行『成功标准：』+ 每行一条『- 可验证标准』的教学形态）；紧凑内联旧形态零残留
变更：2026-10-05-input-format-copy
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-format-copy/requirements.md#FR-01
最近确认：979e624889e8bfeebaa9a2904da64763bb438620

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-format-copy:flow:测试绑定FR-01
  tests: test/input-format-copy.test.mjs「① 紧凑内联旧形态零残留 + ② 4 处教学点均带独立一行『成功标准：』教学」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-format-copy
  status: active

## FR-cli-entry-339 quick 会话的 --input "<一句话任务描述>"（另一语义门）与 run --done --input "用户原话" 不受影响
变更：2026-10-05-input-format-copy
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-format-copy/requirements.md#FR-02
最近确认：979e624889e8bfeebaa9a2904da64763bb438620

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-format-copy:flow:测试绑定FR-02
  tests: test/input-format-copy.test.mjs「③ 另一语义门的 --input 不受影响」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-format-copy
  status: active

## FR-cli-entry-340 源级回归测试锁定：flow start 教学行不再出现无格式/紧凑内联形态
变更：2026-10-05-input-format-copy
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-format-copy/requirements.md#FR-03
最近确认：979e624889e8bfeebaa9a2904da64763bb438620

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-format-copy:flow:测试绑定FR-03
  tests: test/input-format-copy.test.mjs「① + ② + ③ 三组断言齐备」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-format-copy
  status: active

## FR-cli-entry-341 tests 用法行含 --bind/--unbind 语义说明（追加新行不替换旧行 / 按 --row-id 或 --tests 删行）
变更：2026-10-05-bind-unbind-help
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-bind-unbind-help/requirements.md#FR-01
最近确认：e0d2fe4eb987a2ada4d328d6faee428defbb4f9e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-bind-unbind-help:flow:测试绑定FR-01
  tests: test/bind-unbind-help.test.mjs「① 用法行含 --bind/--unbind 语义说明」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-bind-unbind-help
  status: active

## FR-cli-entry-342 语义说明与实现一致（bind 行构造 append 语义、unbind 删行 id 来源两口径）
变更：2026-10-05-bind-unbind-help
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-bind-unbind-help/requirements.md#FR-02
最近确认：e0d2fe4eb987a2ada4d328d6faee428defbb4f9e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-bind-unbind-help:flow:测试绑定FR-02
  tests: test/bind-unbind-help.test.mjs「② 语义与实现一致锚（append 构造 + 删行 id 两口径）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-bind-unbind-help
  status: active

## FR-cli-entry-343 源级回归测试锁定用法行语义文本在场
变更：2026-10-05-bind-unbind-help
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-bind-unbind-help/requirements.md#FR-03
最近确认：e0d2fe4eb987a2ada4d328d6faee428defbb4f9e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-bind-unbind-help:flow:测试绑定FR-03
  tests: test/bind-unbind-help.test.mjs「① + ② 双断言齐备」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-bind-unbind-help
  status: active
