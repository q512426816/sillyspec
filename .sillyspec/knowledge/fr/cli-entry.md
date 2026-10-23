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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」
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
  tests: test/sentinel-unified-evidence.test.mjs「⑥ 零提交不豁免」
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
  tests: test/sentinel-unified-evidence.test.mjs「⑦ 锚定验证读取器（篡改检出/按无基线从严）」
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
  tests: test/sentinel-unified-evidence.test.mjs「①②③④」 | test/sentinel-wiring.test.mjs「形态 A/A2/B/B2/C」
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
  tests: test/sentinel-unified-evidence.test.mjs「⑥⑦」
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
状态：superseded
superseded_by：FR-core-engine-142
取代链：FR-cli-entry-234 ← FR-core-engine-142（2026-10-08-knowledge-graph 承接）
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-knowledge-vector-recall/requirements.md#FR-06
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69

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
  status: superseded

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

## FR-cli-entry-344 src/flow.js 的 flow 用法行包含 flow status --change <名> 子命令提示
变更：2026-10-05-flow-help-status
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flow-help-status/requirements.md#FR-01
最近确认：8d31a9e964a58dbd37e6bc7fc6ccc93e3c92d75b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-help-status:flow:测试绑定FR-01
  tests: test/flow-help-status.test.mjs「用法行列出 flow status 子命令」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-help-status
  status: active

## FR-cli-entry-345 测试断言用法行包含 flow status 提示
变更：2026-10-05-flow-help-status
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flow-help-status/requirements.md#FR-02
最近确认：8d31a9e964a58dbd37e6bc7fc6ccc93e3c92d75b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-help-status:flow:测试绑定FR-02
  tests: test/flow-help-status.test.mjs「用法行列出 flow status 子命令」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-help-status
  status: active

## FR-cli-entry-346 相关测试全部通过
变更：2026-10-05-flow-help-status
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flow-help-status/requirements.md#FR-03
最近确认：8d31a9e964a58dbd37e6bc7fc6ccc93e3c92d75b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-help-status:flow:测试绑定FR-03
  tests: test/flow-help-status.test.mjs「用法行保留 start/done 与 --input 格式教学」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-help-status
  status: active

## FR-cli-entry-347 已归档他侧交付（窗口内全部提交属他侧变更名）不再报未归因，改报「他侧归因（提交事实）」信息行并注明 patch 冻结面同口径剔除
变更：2026-10-05-hunk-gate-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-hunk-gate-commit-attribution/requirements.md#FR-01
最近确认：72c50c924f82444521924e13a75859db8a17ec3b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-hunk-gate-commit-attribution:flow:测试绑定FR-01
  tests: test/hunk-gate-commit-attribution.test.mjs「① 他侧归因改判：他侧后缀交付不报未归因（信息行 + 不计 ok 面）；② 裸提交维持」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-hunk-gate-commit-attribution
  status: active

## FR-cli-entry-348 他侧归因文件不计入 ok 阻断面（gate=error 不再因此拦）；裸提交/本变更名提交的文件维持未归因原判定
变更：2026-10-05-hunk-gate-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-hunk-gate-commit-attribution/requirements.md#FR-02
最近确认：72c50c924f82444521924e13a75859db8a17ec3b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-hunk-gate-commit-attribution:flow:测试绑定FR-02
  tests: test/hunk-gate-commit-attribution.test.mjs「③ 他侧归因不阻 ok（清零行与他侧归因并存）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-hunk-gate-commit-attribution
  status: active

## FR-cli-entry-349 归属切分不可得（非 git/无基线/git 失败）时保持原口径全量未归因（fail-closed 不放宽）
变更：2026-10-05-hunk-gate-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-hunk-gate-commit-attribution/requirements.md#FR-03
最近确认：72c50c924f82444521924e13a75859db8a17ec3b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-hunk-gate-commit-attribution:flow:测试绑定FR-03
  tests: test/hunk-gate-commit-attribution.test.mjs「④ 切分不可得退化：归属失败（非法基线 → null）保持全量未归因不放宽」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-hunk-gate-commit-attribution
  status: active

## FR-cli-entry-350 单测覆盖：他侧归因改判/裸提交维持/切分不可得退化三形态
变更：2026-10-05-hunk-gate-commit-attribution
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-hunk-gate-commit-attribution/requirements.md#FR-04
最近确认：72c50c924f82444521924e13a75859db8a17ec3b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-hunk-gate-commit-attribution:flow:测试绑定FR-04
  tests: test/hunk-gate-commit-attribution.test.mjs「① + ③ + ④ 三形态齐备」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-hunk-gate-commit-attribution
  status: active

## FR-cli-entry-351 src 全仓 7 处分号内联教学形态零残留，各教学处给出含「成功标准：」独立行与「- <可验证标准>」条目行的可照抄多行实例
变更：2026-10-05-input-teach-copyable
状态：active
摘要：主路径；缩进容忍
全文：.sillyspec/changes/archive/2026-10-05-input-teach-copyable/requirements.md#FR-01
最近确认：0e463ef9124e8455cd4d534ad7254ec42e464404

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-copyable:flow:测试绑定FR-01
  tests: test/input-teach-copyable.test.mjs「分号内联教学形态零残留」 | test/input-teach-copyable.test.mjs「各教学处带可照抄实例」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-copyable
  status: active

## FR-cli-entry-352 design 模板教学措辞显式说明问题行原样保留（勿删勿改勿替换）、答案另起一行写在问题行下方
变更：2026-10-05-input-teach-copyable
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-copyable/requirements.md#FR-02
最近确认：0e463ef9124e8455cd4d534ad7254ec42e464404

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-copyable:flow:测试绑定FR-02
  tests: test/input-teach-copyable.test.mjs「design 模板锚教学防替换措辞」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-copyable
  status: active

## FR-cli-entry-353 测试锁定：分号形态零残留断言 + 教学实例组成部分在场断言 + 实例核心形态喂 extractSuccessCriteria 提取大于等于 1 条断言
变更：2026-10-05-input-teach-copyable
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-copyable/requirements.md#FR-03
最近确认：0e463ef9124e8455cd4d534ad7254ec42e464404

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-copyable:flow:测试绑定FR-03
  tests: test/input-teach-copyable.test.mjs「教学实例核心形态可提取成功标准」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-copyable
  status: active

## FR-cli-entry-354 相关测试全部通过（含 input-format-copy 教学点断言同步更新）
变更：2026-10-05-input-teach-copyable
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-copyable/requirements.md#FR-04
最近确认：0e463ef9124e8455cd4d534ad7254ec42e464404

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-copyable:flow:测试绑定FR-04
  tests: test/input-format-copy.test.mjs「教学点断言同步（锁新实例形态）」 | test/input-teach-copyable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-copyable
  status: active

## FR-cli-entry-355 flow done 归档子步补暂存未跟踪的归档新目录（文件级 pathspec，限本变更 archive/<me>/），归档后仍有未暂存的 distill 产物（knowledge 路径）时打印待提交清单提示
变更：2026-10-05-flow-tail-polish
状态：active
摘要：主路径；降级兜底
全文：.sillyspec/changes/archive/2026-10-05-flow-tail-polish/requirements.md#FR-01
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-tail-polish:flow:测试绑定FR-01
  tests: test/flow-tail-polish.test.mjs「归档补暂存含未跟踪归档目录 + knowledge 待办清单提示（源码级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-tail-polish
  status: active

## FR-cli-entry-356 实测面对账文案注明「并集去重」语义（子集数=deps+FR 绑定分量并集去重后的值）
变更：2026-10-05-flow-tail-polish
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flow-tail-polish/requirements.md#FR-02
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-tail-polish:flow:测试绑定FR-02
  tests: test/flow-tail-polish.test.mjs「实测面对账文案含并集去重语义（源码级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-tail-polish
  status: active

## FR-cli-entry-357 重入 flow start 知识 digest 回填 input（flow-state 存 input 优先、proposal 动机转写回退），重入简报保持注入与抽查确认指引可见
变更：2026-10-05-flow-tail-polish
状态：active
摘要：主路径；回退
全文：.sillyspec/changes/archive/2026-10-05-flow-tail-polish/requirements.md#FR-03
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-tail-polish:flow:测试绑定FR-03
  tests: test/flow-tail-polish.test.mjs「重入 digest 回填 input：flow-state 优先 proposal 回退（行为级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-tail-polish
  status: active

## FR-cli-entry-358 flow status 查不存在的变更改非零 exit（exit 1）且输出保留「变更不存在」文案，查在场变更仍 exit 0，测试锁定两形态
变更：2026-10-05-flow-tail-polish
状态：active
摘要：主路径；在场
全文：.sillyspec/changes/archive/2026-10-05-flow-tail-polish/requirements.md#FR-04
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-tail-polish:flow:测试绑定FR-04
  tests: test/flow-tail-polish.test.mjs「flow status 不存在 exit 1 / 在场 exit 0（行为级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-tail-polish
  status: active

## FR-cli-entry-359 相关测试全部通过
变更：2026-10-05-flow-tail-polish
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-flow-tail-polish/requirements.md#FR-05
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-flow-tail-polish:flow:测试绑定FR-05
  tests: test/flow-protocol.test.mjs | test/flow-tail-polish.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-flow-tail-polish
  status: active

## FR-cli-entry-360 node --test test/doc-ref-check.test.mjs 全绿（13 处失效清零）
变更：2026-10-06-litest-p1-fixes
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-litest-p1-fixes/requirements.md#FR-01
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-litest-p1-fixes:flow:测试绑定FR-01
  tests: test/doc-ref-check.test.mjs「platform-interface-map.md 93 处引用全通过（关键词断言含）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-litest-p1-fixes
  status: active

## FR-cli-entry-361 doc-ref-check.test.mjs 列入 test:core 且 npm run test:core 含其执行
变更：2026-10-06-litest-p1-fixes
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-litest-p1-fixes/requirements.md#FR-02
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-litest-p1-fixes:flow:测试绑定FR-02
  tests: test/doc-ref-check.test.mjs「test:core 清单驻留断言（本测试不在 scripts.test:core 即 exit 1——防移出日常拦截面）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-litest-p1-fixes
  status: active

## FR-cli-entry-362 PRIMITIVE_RE 收窄后：含 cursor 纯名词的 patch 文本不再触发评审；DB 游标用法形态（cursor=/next_cursor:/conn.cursor()）仍触发；新增回归测试覆盖两向
变更：2026-10-06-litest-p1-fixes
状态：active
摘要：纯名词不触发（实测复现）；用法形态仍触发
全文：.sillyspec/changes/archive/2026-10-06-litest-p1-fixes/requirements.md#FR-03
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-litest-p1-fixes:flow:测试绑定FR-03
  tests: test/flow-review.test.mjs「① 定档矩阵——cursor 收窄两向：纯名词/harness 名不触发 + db.cursor()/next_cursor 用法形态仍触发」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-litest-p1-fixes
  status: active

## FR-cli-entry-363 归档收尾输出含可执行的一笔到位 git commit 命令（源侧+归档侧+knowledge pathspec 完整）；既有归档测试无回归
变更：2026-10-06-litest-p1-fixes
状态：active
摘要：主路径（归档后提示）
全文：.sillyspec/changes/archive/2026-10-06-litest-p1-fixes/requirements.md#FR-04
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-litest-p1-fixes:flow:测试绑定FR-04
  tests: test/archive-cli-git-add.test.mjs「Case 1 确认归档后 archive/ + docs/ 已 staged——归档收尾打印一笔到位 commit 命令 + pathspec 含源侧删除与归档侧路径（rename 两半齐备）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-litest-p1-fixes
  status: active

## FR-cli-entry-364 npm test 改动面无回归 + lint 绿
变更：2026-10-06-litest-p1-fixes
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-litest-p1-fixes/requirements.md#FR-05
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-litest-p1-fixes:flow:测试绑定FR-05
  tests: test/run-tests.mjs「全量套件改动面无回归 + lint（check-syntax 882 文件）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-litest-p1-fixes
  status: active

## FR-cli-entry-365 评审任务书标注评审对象 HEAD（sha 印在任务书）且 review.json schema 含 reviewedAgainst 字段（评审员照抄）；validateReviewJson 对该字段可选校验（缺省兼容旧产物，存在须为 7-40 hex）
变更：2026-10-06-review-anchor-and-negation
状态：active
摘要：任务书印锚
全文：.sillyspec/changes/archive/2026-10-06-review-anchor-and-negation/requirements.md#FR-01
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-review-anchor-and-negation:flow:测试绑定FR-01
  tests: test/flow-review.test.mjs「② 评审任务书——head 传入印 sha + reviewedAgainst 照抄指引 / head 缺省引导自填」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-review-anchor-and-negation
  status: active

## FR-cli-entry-366 漂移隔离前比对：reviewedAgainst 命中当前 HEAD（前缀口径）→ 保留 review.json 不隔离不重置 review 子步标记，日志说明保留原因；未锚定/读失败 → 现行隔离行为不变
变更：2026-10-06-review-anchor-and-negation
状态：active
摘要：锚定保留（实测竞态复现，2026-10-06-litest-p1-fixes 收口实证）
全文：.sillyspec/changes/archive/2026-10-06-review-anchor-and-negation/requirements.md#FR-02
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-review-anchor-and-negation:flow:测试绑定FR-02
  tests: test/flow-protocol.test.mjs | test/flow-review.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-review-anchor-and-negation
  status: active

## FR-cli-entry-367 比对逻辑提炼为可单测纯函数（flow-review.js 导出），flow.js 仅接线
变更：2026-10-06-review-anchor-and-negation
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-review-anchor-and-negation/requirements.md#FR-03
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-review-anchor-and-negation:flow:测试绑定FR-03
  tests: test/flow-review.test.mjs「⑦ 评审对象锚定——全等/双向前缀命中 true、异 sha/缺省/坏 JSON/非 hex/文件缺失/head 空 false」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-review-anchor-and-negation
  status: active

## FR-cli-entry-368 NEGATED_CROSSTALK_RE 补「不串台」整词：design 作答「…过滤不串台」不再一票升级；「不排除串台」风险自认形态保留一票升级
变更：2026-10-06-review-anchor-and-negation
状态：active
摘要：整词消解；风险自认保留
全文：.sillyspec/changes/archive/2026-10-06-review-anchor-and-negation/requirements.md#FR-04
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-review-anchor-and-negation:flow:测试绑定FR-04
  tests: test/flow-review.test.mjs「④ 否定语境消解——不串台（整词）不升级 + ⑥ 非否定语境保留——不排除串台（风险自认，整词反向）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-review-anchor-and-negation
  status: active

## FR-cli-entry-369 新增回归测试覆盖上述两向；npm test 改动面无回归 + lint 绿
变更：2026-10-06-review-anchor-and-negation
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-review-anchor-and-negation/requirements.md#FR-05
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-review-anchor-and-negation:flow:测试绑定FR-05
  tests: test/flow-review.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-review-anchor-and-negation
  status: active

## FR-cli-entry-370 flow status --change <存在的活跃变更> --json 输出合法 JSON，含 change/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps 字段
变更：2026-10-06-flow-status-json
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-flow-status-json/requirements.md#FR-01
最近确认：e751e152e63cf842c15237779705e29b87ab9124

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-flow-status-json:flow:测试绑定FR-01
  tests: test/flow-status-json.test.mjs「活跃变更 --json 九字段齐备且与人类路径同源」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-flow-status-json
  status: active

## FR-cli-entry-371 变更不存在与已归档两种形态下 --json 亦输出结构化 JSON（带对应状态标记）且进程退出码与现有人类可读路径一致
变更：2026-10-06-flow-status-json
状态：active
摘要：三形态退出码与标记
全文：.sillyspec/changes/archive/2026-10-06-flow-status-json/requirements.md#FR-02
最近确认：e751e152e63cf842c15237779705e29b87ab9124

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-flow-status-json:flow:测试绑定FR-02
  tests: test/flow-status-json.test.mjs「不存在 exit 1 / 已归档与目录在场无 state exit 0——与人类路径一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-flow-status-json
  status: active

## FR-cli-entry-372 新增单元测试覆盖上述三种形态并纳入 test:core，全部跑绿
变更：2026-10-06-flow-status-json
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-flow-status-json/requirements.md#FR-03
最近确认：e751e152e63cf842c15237779705e29b87ab9124

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-flow-status-json:flow:测试绑定FR-03
  tests: test/flow-status-json.test.mjs「test:core 清单驻留断言 + 人类可读回归行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-flow-status-json
  status: active

## FR-cli-entry-373 归档建议命令的 src 侧 pathspec 仅含 HEAD 树在册路径（转瞬即逝的源侧 A 条目不进命令）；dst 侧为单条归档目录 pathspec；正常形态下打印命令可原样执行成功（exit 0）
变更：2026-10-06-archive-cmd-race-and-brief
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-archive-cmd-race-and-brief/requirements.md#FR-01
最近确认：ade6768faef8810e2127a2b7590f2d892a5f466c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-cmd-race-and-brief:flow:测试绑定FR-01
  tests: test/archive-commit-suggest-race.test.mjs「resolveArchiveCommitPathspecs 构成（HEAD 锚 src/目录 dst/共享面在场判定）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-archive-cmd-race-and-brief
  status: active

## FR-cli-entry-374 竞态注入形态（源侧幽灵 A 条目进暂存区后消失）下，打印命令仍可执行成功且提交面不含幽灵路径
变更：2026-10-06-archive-cmd-race-and-brief
状态：active
摘要：竞态注入
全文：.sillyspec/changes/archive/2026-10-06-archive-cmd-race-and-brief/requirements.md#FR-02
最近确认：ade6768faef8810e2127a2b7590f2d892a5f466c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-cmd-race-and-brief:flow:测试绑定FR-02
  tests: test/archive-commit-suggest-race.test.mjs「竞态注入：幽灵 A 条目被丢弃且命令仍可执行/瞬时条目提示在场」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-archive-cmd-race-and-brief
  status: active

## FR-cli-entry-375 flow done 首轮中断简报的「待办」不再包含本轮已完成/已跳过的子步（与重入后口径一致）
变更：2026-10-06-archive-cmd-race-and-brief
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-archive-cmd-race-and-brief/requirements.md#FR-03
最近确认：ade6768faef8810e2127a2b7590f2d892a5f466c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-cmd-race-and-brief:flow:测试绑定FR-03
  tests: test/flow-done-fail-brief.test.mjs「remainingSubstepsAtFail 并集口径（历史 done + 本轮 doneList + failed 剔除）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-archive-cmd-race-and-brief
  status: active

## FR-cli-entry-376 新增单元测试覆盖上述三点并纳入 test:core，test:core 全绿
变更：2026-10-06-archive-cmd-race-and-brief
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-archive-cmd-race-and-brief/requirements.md#FR-04
最近确认：ade6768faef8810e2127a2b7590f2d892a5f466c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-cmd-race-and-brief:flow:测试绑定FR-04
  tests: test/archive-commit-suggest-race.test.mjs「test:core 清单驻留断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-archive-cmd-race-and-brief
  status: active

## FR-cli-entry-377 DB 登记过 title 的活跃变更，flow status 人类输出包含「标题：<title>」行
变更：2026-10-06-flow-status-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 临时仓的进度库以 initChange/updateChangeMeta 登记了变更 X 的 title="中文标题"；When 执行 flow status --change X（不带 --json）；Then 输出首行为「📋 X」且下一非空行为「   标题：中文标题」
全文：.sillyspec/changes/archive/2026-10-06-flow-status-title/requirements.md#FR-01
最近确认：0d7576c8d969d19ca20b4c561ad9c5e815c8f305

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-flow-status-title:flow:测试绑定FR-01
  tests: test/flow-status-title.test.mjs「人类输出显示标题行（登记 title 时）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-flow-status-title
  status: active

## FR-cli-entry-378 flow status --json 输出增加 title 字段（无记录时为 null）
变更：2026-10-06-flow-status-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 变更 X 活跃且 title 已登记；When 执行 flow status --change X --json；Then stdout 单行 JSON 解析后 title === 登记值，且既有九字段全部在场
全文：.sillyspec/changes/archive/2026-10-06-flow-status-title/requirements.md#FR-02
最近确认：0d7576c8d969d19ca20b4c561ad9c5e815c8f305

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-flow-status-title:flow:测试绑定FR-02
  tests: test/flow-status-title.test.mjs「--json 输出 title 字段（有值与 null 两态）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-flow-status-title
  status: active

## FR-cli-entry-379 无 DB 或无 title 时输出与现状一致（不新增标题行，json 里 title=null）
变更：2026-10-06-flow-status-title
状态：active
摘要：无 DB
场景正文：
- 场景：无 DB — Given 临时仓只有变更目录（无 sillyspec.db）；When 执行 flow status --change X；Then 输出不含「标题：」行，且磁盘上仍无 sillyspec.db 被 status 新建
全文：.sillyspec/changes/archive/2026-10-06-flow-status-title/requirements.md#FR-03
最近确认：0d7576c8d969d19ca20b4c561ad9c5e815c8f305

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-flow-status-title:flow:测试绑定FR-03
  tests: test/flow-status-title.test.mjs「无 DB/无 title 不新增标题行且不新建 DB」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-flow-status-title
  status: active

## FR-cli-entry-380 DB 登记过非空 title 的活跃变更重入 flow start，恢复简报在「🔁 flow start 恢复简报（重入）」行后显示「- 标题：<title>」行，文本与进度库登记值逐字一致
变更：2026-10-06-resume-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 临时仓的活跃变更 X（flow-state 在场）且进度库登记 title="中文标题"；When 重入执行 flow start --change X（不带 --input）；Then 输出含「🔁 flow start 恢复简报（重入）」行，其后出现「- 标题：中文标题」行且先于「- 做到哪」行
全文：.sillyspec/changes/archive/2026-10-06-resume-title/requirements.md#FR-01
最近确认：86a88f5c2c0f24dc9992636cacb7933a0aa5e222

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-title:flow:测试绑定FR-01
  tests: test/flow-resume-title.test.mjs「恢复简报显示标题行（登记 title 时）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-title
  status: active

## FR-cli-entry-381 无 DB/无 title 时恢复简报与现状逐字一致（不新增标题行）
变更：2026-10-06-resume-title
状态：active
摘要：无 DB
场景正文：
- 场景：无 DB — Given 临时仓的活跃变更 X（无 sillyspec.db）；When 重入执行 flow start --change X；Then 恢复简报不含「标题：」行（读取器只读性由 flow-status-title 回归钉住）
全文：.sillyspec/changes/archive/2026-10-06-resume-title/requirements.md#FR-02
最近确认：86a88f5c2c0f24dc9992636cacb7933a0aa5e222

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-title:flow:测试绑定FR-02
  tests: test/flow-resume-title.test.mjs「无 DB 不新增标题行且不新建 DB」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-title
  status: active

## FR-cli-entry-382 标题读取复用 getChangeTitle 单源（不另开读取路径）
变更：2026-10-06-resume-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given flow.js 恢复路径代码；When 静态审查；Then 标题来源唯一（getChangeTitle 调用），无第二读取实现
全文：.sillyspec/changes/archive/2026-10-06-resume-title/requirements.md#FR-03
最近确认：86a88f5c2c0f24dc9992636cacb7933a0aa5e222

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-title:flow:测试绑定FR-03
  tests: test/flow-resume-title.test.mjs「读取单源（getChangeTitle 调用面静态断言）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-title
  status: active

## FR-cli-entry-383 resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（重入知识面 ⊇ fresh 知识面）
变更：2026-10-06-resume-domain-flip
状态：active
摘要：重入早于干活（复现面）
全文：.sillyspec/changes/archive/2026-10-06-resume-domain-flip/requirements.md#FR-01
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-domain-flip:flow:测试绑定FR-01
  tests: test/resume-domain-flip.test.mjs「② 重入早于干活：垃圾未跟踪目录不劫持触达域、input 域恢复注入」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-domain-flip
  status: active

## FR-cli-entry-384 未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取成员最大 mtime，walk 带安全帽；stat 失败/超帽/无出生时戳保守保留）时不再进入路由面——判据是时间不是路径形态，不建路径白名单
变更：2026-10-06-resume-domain-flip
状态：active
摘要：他侧遗留垃圾；干活期新写的未跟踪文件
全文：.sillyspec/changes/archive/2026-10-06-resume-domain-flip/requirements.md#FR-02
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-domain-flip:flow:测试绑定FR-02
  tests: test/resume-domain-flip.test.mjs「① filterPreChangeUntracked 过滤判据各分支」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-domain-flip
  status: active

## FR-cli-entry-385 变更出生时刻取进度库 changes.created_at（best-effort：无 DB/无行不过滤，行为同现状）
变更：2026-10-06-resume-domain-flip
状态：active
摘要：无 DB 的存量变更
全文：.sillyspec/changes/archive/2026-10-06-resume-domain-flip/requirements.md#FR-03
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-domain-flip:flow:测试绑定FR-03
  tests: test/resume-domain-flip.test.mjs「① filterPreChangeUntracked 过滤判据各分支」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-domain-flip
  status: active

## FR-cli-entry-386 fr-rot-precision ⑥ 的源码级钉（resume 复用 changedFilesSinceBaseline）保持绿
变更：2026-10-06-resume-domain-flip
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-resume-domain-flip/requirements.md#FR-04
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-domain-flip:flow:测试绑定FR-04
  tests: test/resume-domain-flip.test.mjs「③ 源码钉：resume 路由面包裹 filterPreChangeUntracked 并并集 input 路由面（⑥ 调用形态不变）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-domain-flip
  status: active

## FR-cli-entry-387 新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、input 域恢复注入）
变更：2026-10-06-resume-domain-flip
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-resume-domain-flip/requirements.md#FR-05
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-domain-flip:flow:测试绑定FR-05
  tests: test/resume-domain-flip.test.mjs「① filterPreChangeUntracked 过滤判据各分支」 | test/resume-domain-flip.test.mjs「② 重入早于干活：垃圾未跟踪目录不劫持触达域、input 域恢复注入」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-domain-flip
  status: active

## FR-cli-entry-388 npm run test:core 全绿
变更：2026-10-06-resume-domain-flip
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-resume-domain-flip/requirements.md#FR-06
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-resume-domain-flip:flow:测试绑定FR-06
  tests: test/resume-domain-flip.test.mjs「test:core 亲测全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-resume-domain-flip
  status: active

## FR-cli-entry-389 工件文件零指令行
变更：2026-10-07-thin-tasks-v3
状态：active
摘要：新变革起草
场景正文：
- 场景：新变革起草 — Given flow start --input 含 4 条成功标准；When 机器起草落盘；Then tasks.md 无任何 `>` 开头行；requirements.md/design.md 无文件级 `>` 指导块（FR 占位「（待撰写…）」槽保留——那是
全文：.sillyspec/changes/archive/2026-10-07-thin-tasks-v3/requirements.md#FR-01
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-thin-tasks-v3:flow:测试绑定FR-01
  tests: test/flow-draft.test.mjs「① draftAll v2 形态——零 > 指导块断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-thin-tasks-v3
  status: active

## FR-cli-entry-390 哨兵统一证据判据（镜像豁免与收口代勾移除）
变更：2026-10-07-thin-tasks-v3
状态：active
摘要：全勾但镜像行零 token
场景正文：
- 场景：全勾但镜像行零 token — Given tasks.md 四行全部勾选、区间提交无任何 task-NN token、无 review.json；When flow done 哨兵判定；Then status=fake 拒收（不再因「与机器稿逐字相同」豁免）
全文：.sillyspec/changes/archive/2026-10-07-thin-tasks-v3/requirements.md#FR-02
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-thin-tasks-v3:flow:测试绑定FR-02
  tests: test/sentinel-unified-evidence.test.mjs「镜像零证据全勾→fake（豁免移除）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-thin-tasks-v3
  status: active

## FR-cli-entry-391 task tick 精确事件与节奏门去重
变更：2026-10-07-thin-tasks-v3
状态：active
摘要：一条命令内连续两 tick
场景正文：
- 场景：一条命令内连续两 tick — Given tasks.md 4 格未勾，agent 在 1 秒内连续执行 task tick task-01、task tick task-02（watcher 3s 轮；When flow done 节奏门读取事件流；Then CLI 两条 0→1、1→2 事件在场，采样 0→2 被去重，无单拍跳 ≥2 判定，不拒收
全文：.sillyspec/changes/archive/2026-10-07-thin-tasks-v3/requirements.md#FR-03
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-thin-tasks-v3:flow:测试绑定FR-03
  tests: test/task-tick.test.mjs「tick 事件直写+节奏门去重」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-thin-tasks-v3
  status: active

## FR-cli-entry-392 协议提示面更新为工作分解契约
变更：2026-10-07-thin-tasks-v3
状态：active
摘要：收口漂移判定
场景正文：
- 场景：收口漂移判定 — Given agent 将 tasks.md 全部改写为实现步骤（成功标准原文不在 tasks.md 出现）；When flow done artifacts 校验；Then 无 tasks 相关 advisory（requirements FR 标题锚在场即不漂移）
全文：.sillyspec/changes/archive/2026-10-07-thin-tasks-v3/requirements.md#FR-04
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-thin-tasks-v3:flow:测试绑定FR-04
  tests: test/thin-docs-v2.test.mjs「tasks 零镜像 advisory/工作队列非空门」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-thin-tasks-v3
  status: active

## FR-cli-entry-393 测试面同步新契约
变更：2026-10-07-thin-tasks-v3
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-10-07-thin-tasks-v3/requirements.md#FR-05
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-thin-tasks-v3:flow:测试绑定FR-05
  tests: test/run-tests.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-thin-tasks-v3
  status: active

## FR-cli-entry-394 勾选时点判定按 tasks.md 首次提交锚定
变更：2026-10-07-tick-timing-first-commit
状态：active
摘要：渐进提交形态不再误报；真一把勾照旧警告
场景正文：
- 场景：渐进提交形态不再误报 — Given agent 每任务提交时一并 pathspec 提交 tasks.md（历史 0→1→2 渐进勾选），窗口最后一笔提交触碰 tasks.md；When flow done 时点判定；Then 无「一把勾模式」警告（untracked 分支亦不触发）
- 场景：真一把勾照旧警告 — Given tasks.md 的唯一一笔提交就是窗口最后一笔提交；When flow done 时点判定；Then 出「首次 git 提交 == 收口最后提交（一把勾模式）」警告
全文：.sillyspec/changes/archive/2026-10-07-tick-timing-first-commit/requirements.md#FR-01
最近确认：0a843cdd7f5c87bbb361ab4d7b59d5270752b5e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-tick-timing-first-commit:flow:测试绑定FR-01
  tests: test/tick-loop-nudge.test.mjs「④ 哨兵时点判定钉（首提锚定/一把勾 warn/untracked warn/fail-soft）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-tick-timing-first-commit
  status: active

## FR-cli-entry-395 测试钉同步新口径
变更：2026-10-07-tick-timing-first-commit
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-10-07-tick-timing-first-commit/requirements.md#FR-02
最近确认：0a843cdd7f5c87bbb361ab4d7b59d5270752b5e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-tick-timing-first-commit:flow:测试绑定FR-02
  tests: test/run-tests.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-tick-timing-first-commit
  status: active

## FR-cli-entry-396 flow done 全勾硬门（openspec all_done 对齐）
变更：2026-10-07-allticked-gate-docs-resync
状态：active
摘要：懒路径零勾
场景正文：
- 场景：懒路径零勾 — Given tasks.md 2 条任务零勾、区间有交付提交但无 token；When flow done；Then 拒收（任务未全勾（0/2）），change 保持 active 断点续
全文：.sillyspec/changes/archive/2026-10-07-allticked-gate-docs-resync/requirements.md#FR-01
最近确认：bf7c122935343fcb176cc50aece2ceb99fcb072c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-allticked-gate-docs-resync:flow:测试绑定FR-01
  tests: test/task-tick.test.mjs「⑤a 不勾+有交付 → 拒收」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-allticked-gate-docs-resync
  status: active

## FR-cli-entry-397 task tick 触发工件重推
变更：2026-10-07-allticked-gate-docs-resync
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-10-07-allticked-gate-docs-resync/requirements.md#FR-02
最近确认：bf7c122935343fcb176cc50aece2ceb99fcb072c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-allticked-gate-docs-resync:flow:测试绑定FR-02
  tests: test/task-tick.test.mjs「⑥b 重推接线钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-allticked-gate-docs-resync
  status: active

## FR-cli-entry-398 watcher 工件内容变更重推（防抖）
变更：2026-10-07-allticked-gate-docs-resync
状态：active
摘要：Edit 勾格/中途重写任务面
场景正文：
- 场景：Edit 勾格/中途重写任务面 — Given watcher 在跑，agent 用 Edit 改写 tasks.md；When 下一轮采样产出 file-update(tasks.md)；Then 10s 冷却窗外即触发 spec-sync 文档重推——平台不再停留 start 时点快照
全文：.sillyspec/changes/archive/2026-10-07-allticked-gate-docs-resync/requirements.md#FR-03
最近确认：bf7c122935343fcb176cc50aece2ceb99fcb072c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-allticked-gate-docs-resync:flow:测试绑定FR-03
  tests: test/task-tick.test.mjs「⑥a shouldResyncDocs 纯函数」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-allticked-gate-docs-resync
  status: active

## FR-cli-entry-399 flow done（thin）收尾后变更目录四件齐备：change.patch/change-patch.json（既有语义不变——files 含治理工件目录、totals 口径不变）+ scope-audit.json/scope-audit.patch（新增：三态行含 verdict、baseAnchor=baseline、closedBy=flow done）
变更：2026-10-07-unify-close-trace
状态：active
摘要：thin 收尾四件齐备
全文：.sillyspec/changes/archive/2026-10-07-unify-close-trace/requirements.md#FR-01
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-unify-close-trace:flow:测试绑定FR-01
  tests: test/close-trace-unified.test.mjs「thin CLI e2e：flow done 后四件齐备，快照 rows 三态、治理工件不进 rows」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-unify-close-trace
  status: active

## FR-cli-entry-400 execute --done（heavy）收尾后同样四件齐备：scope-audit.json/patch（既有语义不变）+ change-patch.json/change.patch（新增：files=主仓实改行投影、baseline=快照锚、head=当点 HEAD）
变更：2026-10-07-unify-close-trace
状态：active
摘要：heavy 收尾四件齐备
全文：.sillyspec/changes/archive/2026-10-07-unify-close-trace/requirements.md#FR-02
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-unify-close-trace:flow:测试绑定FR-02
  tests: test/close-trace-unified.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-unify-close-trace
  status: active

## FR-cli-entry-401 同一次收尾的四件 sha256 同锚：change.patch 与 scope-audit.patch 字节一致，两份 json 的 patchSha256 相同
变更：2026-10-07-unify-close-trace
状态：active
摘要：同锚与失败留痕
全文：.sillyspec/changes/archive/2026-10-07-unify-close-trace/requirements.md#FR-03
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-unify-close-trace:flow:测试绑定FR-03
  tests: test/close-trace-unified.test.mjs「同锚断言：change.patch≡scope-audit.patch、两 json patchSha256 相等；failed 双标」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-unify-close-trace
  status: active

## FR-cli-entry-402 读面双路径验证：新 thin 归档查 scope-audit 走快照记录态（note 标 flow done 时点，不再误标 execute --done）；重跑 flow done（漂移重冻结）不自嵌入（scope-audit.json/patch 进排除面）
变更：2026-10-07-unify-close-trace
状态：active
摘要：新 thin 归档查询与重跑
全文：.sillyspec/changes/archive/2026-10-07-unify-close-trace/requirements.md#FR-04
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-unify-close-trace:flow:测试绑定FR-04
  tests: test/close-trace-unified.test.mjs「round-trip：writer 产物 → computeChangeScopeAudit 快照回放 note=closedBy；重冻结不自嵌入」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-unify-close-trace
  status: active

## FR-cli-entry-403 全量测试绿（含新增 writer 单测/round-trip/双通道 CLI 夹具）；既有断言零改动（flow-protocol 归档双件断言原样）
变更：2026-10-07-unify-close-trace
状态：active
摘要：全量门
全文：.sillyspec/changes/archive/2026-10-07-unify-close-trace/requirements.md#FR-05
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-unify-close-trace:flow:测试绑定FR-05
  tests: test/run-tests.mjs「全量套件跑绿，既有断言零改动」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-unify-close-trace
  status: active

## FR-cli-entry-404 全角/半角/混合括号与 thin 前缀形态的变更名提交都能被 parseChangeNamesFromSubject 解析；detectPatchDrift 对全角括号交付提交正确判 drifted
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
状态：active
摘要：全角惯例提交
全文：.sillyspec/changes/archive/2026-10-08-thin-done-dirty-gate-and-paren-attribution/requirements.md#FR-01
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-thin-done-dirty-gate-and-paren-attribution:flow:测试绑定FR-01
  tests: test/thin-done-dirty-gate.test.mjs「detectPatchDrift 全角括号提交判 drifted」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-thin-done-dirty-gate-and-paren-attribution
  status: active

## FR-cli-entry-405 flow done 在 dirtyWarned>0 且无显式处置时停在 patch 子步（exit 1、半态可重入、不归档）；--freeze-dirty 并入照旧；新增 --accept-dirty-gap 显式接受缺口（缺口数随 change-patch.json 留痕）
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
状态：active
摘要：三态门与目录折叠
全文：.sillyspec/changes/archive/2026-10-08-thin-done-dirty-gate-and-paren-attribution/requirements.md#FR-02
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-thin-done-dirty-gate-and-paren-attribution:flow:测试绑定FR-02
  tests: test/thin-done-dirty-gate.test.mjs「dirty 门三态：裸跑阻断（exit 1 @ patch 不归档）/--freeze-dirty 并入/--accept-dirty-gap 留痕完成」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-thin-done-dirty-gate-and-paren-attribution
  status: active

## FR-cli-entry-406 提交后重跑：patch 子步重跑自动并入已提交 src（漂移/全量冻结路径均可）
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
状态：active
摘要：阻断→提交→重跑
全文：.sillyspec/changes/archive/2026-10-08-thin-done-dirty-gate-and-paren-attribution/requirements.md#FR-03
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-thin-done-dirty-gate-and-paren-attribution:flow:测试绑定FR-03
  tests: test/thin-done-dirty-gate.test.mjs「阻断→提交（全角括号）→重跑：冻结面含 src」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-thin-done-dirty-gate-and-paren-attribution
  status: active

## FR-cli-entry-407 全量测试绿；flow-protocol ⑥b 的旧行为断言按新门语义更新（行为变更是本变更目的，非迁就）
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
状态：active
摘要：全量门
全文：.sillyspec/changes/archive/2026-10-08-thin-done-dirty-gate-and-paren-attribution/requirements.md#FR-04
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-thin-done-dirty-gate-and-paren-attribution:flow:测试绑定FR-04
  tests: test/run-tests.mjs「全量套件跑绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-thin-done-dirty-gate-and-paren-attribution
  status: active

## FR-cli-entry-408 不做归档态 --refreeze 入口（阻断门从源头消除坏状态；存量坏归档由各仓协议重入处理，后续如需另开变更——设计留档）
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
状态：active
摘要：范围声明
全文：.sillyspec/changes/archive/2026-10-08-thin-done-dirty-gate-and-paren-attribution/requirements.md#FR-05
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450

## FR-cli-entry-409 动态测试推断不把套件编排器（run-tests.mjs）收进执行面——FR 绑定指向它时转 loud skip
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
状态：active
摘要：FR 绑定指向套件入口
全文：.sillyspec/changes/archive/2026-10-08-thin-done-dirty-gate-and-paren-attribution/requirements.md#FR-06
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-thin-done-dirty-gate-and-paren-attribution:flow:测试绑定FR-06
  tests: test/thin-done-dirty-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-thin-done-dirty-gate-and-paren-attribution
  status: active

## FR-cli-entry-410 .zcode 在场 → detectTools 发现 zcode；skillToolDirs 含 zcode→.zcode/skills 映射（--tool zcode 技能可落）
变更：2026-10-09-zcode-skills-sentinel-shorthand
状态：active
摘要：.zcode 项目技能同步
全文：.sillyspec/changes/archive/2026-10-09-zcode-skills-sentinel-shorthand/requirements.md#FR-01
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-zcode-skills-sentinel-shorthand:flow:测试绑定FR-01
  tests: test/init-zcode-skills.test.mjs「① .zcode 在场 → zcode 进发现列表」 | test/init-zcode-skills.test.mjs「② skillToolDirs 含 zcode 映射（源级钉）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-zcode-skills-sentinel-shorthand
  status: active

## FR-cli-entry-411 连写组三形态（斜杠/顿号/逗号+空格）展开后任务全有完成证据；补零归一；task-010/版本串三连数字不误切；既有独立 token 行为零变化
变更：2026-10-09-zcode-skills-sentinel-shorthand
状态：active
摘要：连写组一次交付多任务
全文：.sillyspec/changes/archive/2026-10-09-zcode-skills-sentinel-shorthand/requirements.md#FR-02
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-zcode-skills-sentinel-shorthand:flow:测试绑定FR-02
  tests: test/sentinel-token-shorthand.test.mjs「① 连写组三形态展开：三任务全有证据（不再误拒）」 | test/sentinel-token-shorthand.test.mjs「② expandTaskShorthand 纯函数：补零/边界/非连写零变化」 | test/sentinel-token-shorthand.test.mjs「③ 前瞻边界：task-01 不证 task-010；未勾全不误判」 | test/sentinel-token-shorthand.test.mjs「④ 既有独立 token 行为零变化」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-zcode-skills-sentinel-shorthand
  status: active

## FR-cli-entry-412 既有六工具信号（claude/cursor/openclaw/codex/gemini/opencode）发现零变化
变更：2026-10-09-zcode-skills-sentinel-shorthand
状态：active
摘要：六信号回归
全文：.sillyspec/changes/archive/2026-10-09-zcode-skills-sentinel-shorthand/requirements.md#FR-03
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-zcode-skills-sentinel-shorthand:flow:测试绑定FR-03
  tests: test/init-zcode-skills.test.mjs「③ 既有六信号发现零变化」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-zcode-skills-sentinel-shorthand
  status: active

## FR-cli-entry-413 三个新技能随 .claude/skills 源分发，init 同步可达
变更：2026-10-09-zcode-skills-sentinel-shorthand
状态：active
摘要：CLI 升级刷新技能
全文：.sillyspec/changes/archive/2026-10-09-zcode-skills-sentinel-shorthand/requirements.md#FR-04
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67

## FR-cli-entry-414 新增两测试文件（7 用例）+ lint 全绿
变更：2026-10-09-zcode-skills-sentinel-shorthand
状态：active
摘要：收口实测
全文：.sillyspec/changes/archive/2026-10-09-zcode-skills-sentinel-shorthand/requirements.md#FR-05
最近确认：016968bd0934f80bd16955b92803cdee7fcdda67

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-zcode-skills-sentinel-shorthand:flow:测试绑定FR-05
  tests: test/init-zcode-skills.test.mjs「①-③ 全绿」 | test/sentinel-token-shorthand.test.mjs「①-④ 全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-zcode-skills-sentinel-shorthand
  status: active

## FR-cli-entry-415 fourpiece-init 生成的 proposal.md/requirements.md/decisions.md 骨架 created_at 为本地墙钟（datetime.js nowWallClock，YYYY-MM-DD HH:mm:ss，与 taskcard/design-init 同口径）
变更：2026-10-09-fourpiece-created-at-local
状态：active
摘要：非 UTC 时区生成
全文：.sillyspec/changes/archive/2026-10-09-fourpiece-created-at-local/requirements.md#FR-01
最近确认：ba0b5d1bf243b717af3a8ac13de70afa5a799d9a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-fourpiece-created-at-local:flow:测试绑定FR-01
  tests: test/fourpiece-init.test.mjs「fourpiece-init：created_at 为本地墙钟（坑 taskcard-created-at-utc 同族回归锁）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-fourpiece-created-at-local
  status: active

## FR-cli-entry-416 新增回归测试：生成前后本地墙钟窗断言三件骨架 created_at 全落窗内（UTC 写入在非 UTC 时区必偏移出窗）
变更：2026-10-09-fourpiece-created-at-local
状态：active
摘要：UTC 写入回归被拦
全文：.sillyspec/changes/archive/2026-10-09-fourpiece-created-at-local/requirements.md#FR-02
最近确认：ba0b5d1bf243b717af3a8ac13de70afa5a799d9a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-fourpiece-created-at-local:flow:测试绑定FR-02
  tests: test/fourpiece-init.test.mjs「fourpiece-init：created_at 为本地墙钟（坑 taskcard-created-at-utc 同族回归锁）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-fourpiece-created-at-local
  status: active

## FR-cli-entry-417 既有 fourpiece-init 测试面全绿
变更：2026-10-09-fourpiece-created-at-local
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-fourpiece-created-at-local/requirements.md#FR-03
最近确认：ba0b5d1bf243b717af3a8ac13de70afa5a799d9a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-fourpiece-created-at-local:flow:测试绑定FR-03
  tests: test/fourpiece-init.test.mjs「fourpiece-init：三件骨架生成 + frontmatter/章节齐 + 幂等不覆盖」 | test/skeleton-provenance.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-fourpiece-created-at-local
  status: active

## FR-cli-entry-418 thin（flow done）与 heavy（execute --done）两条通道收口后落盘恰好 change.patch + change-patch.json 两件，JSON 含完整 scopeAudit 面
变更：2026-10-09-close-trace-single-set
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-close-trace-single-set/requirements.md#FR-01
最近确认：e0a193430426463421f1973427882ae2fe0ebefb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-close-trace-single-set:flow:测试绑定FR-01
  tests: test/close-trace-unified.test.mjs「thin/heavy CLI e2e 落盘两件」 | test/close-trace-unified.test.mjs「writer ok-state 写恰好两件 + scopeAudit 子对象」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-close-trace-single-set
  status: active

## FR-cli-entry-419 旧形态归档（四件套/thin 双件/heavy 双件）读链全部不回退：scope-audit 表回放、--file 冻结切片、FR 覆盖、知识图谱交付边、漂移检测照常工作
变更：2026-10-09-close-trace-single-set
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-close-trace-single-set/requirements.md#FR-02
最近确认：e0a193430426463421f1973427882ae2fe0ebefb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-close-trace-single-set:flow:测试绑定FR-02
  tests: test/scope-audit-thin-patch-replay.test.mjs | test/scope-audit.test.mjs「A-F01 篡改检测：patch 被改 → getFileDiff 报 sha256 不匹配拒绝出 diff」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-close-trace-single-set
  status: active

## FR-cli-entry-420 平台 assets 端点与前端文件预览对新形态可读，旧归档不白屏
变更：2026-10-09-close-trace-single-set
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-close-trace-single-set/requirements.md#FR-03
最近确认：e0a193430426463421f1973427882ae2fe0ebefb

## FR-cli-entry-421 相关测试全绿（close-trace-unified、scope-audit 全家、flow-protocol 等）
变更：2026-10-09-close-trace-single-set
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-close-trace-single-set/requirements.md#FR-04
最近确认：e0a193430426463421f1973427882ae2fe0ebefb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-close-trace-single-set:flow:测试绑定FR-04
  tests: test/close-trace-unified.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-close-trace-single-set
  status: active

## FR-cli-entry-422 brainstorm 方案选择步新增指令：用户选定后落选方案各记一条 rejected 条目（question 复用取舍问句、否决理由=当轮劣势与成本、复潮条件=劣势消解/成本反转前提）
变更：2026-10-09-rejected-write-side
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-rejected-write-side/requirements.md#FR-01
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336

## FR-cli-entry-423 brainstorm 对账步把放弃方案列入漏网补记之列（未记 rejected 的此时补记）
变更：2026-10-09-rejected-write-side
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-rejected-write-side/requirements.md#FR-02
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336

## FR-cli-entry-424 flow 收割提示行（flow.js 槽4 console.log）与 /sillyspec:flow skill 均定性收割稿为底稿：槽4 作答含放弃方案的，收口前拆成 rejected 条目
变更：2026-10-09-rejected-write-side
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-rejected-write-side/requirements.md#FR-03
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336

## FR-cli-entry-425 docs/prompt 镜像经 _extract/_sync/_verify 流水线全绿（brainstorm.md fence 与 src 逐字一致）
变更：2026-10-09-rejected-write-side
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-rejected-write-side/requirements.md#FR-04
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336

## FR-cli-entry-426 CLI 入口统一硬拦：非豁免命令在祖先链+平台指针+--spec-dir 均未命中 .sillyspec 的目录运行 → exit 2，文案含当前目录、git root（如有）、三条修复指引（cd 回项目根 / 先 init / --spec-dir 显式指定）
变更：2026-10-10-cli-uninit-cwd-gate
状态：active
摘要：未初始化 git 仓跑 flow；未初始化裸目录跑 task
全文：.sillyspec/changes/archive/2026-10-10-cli-uninit-cwd-gate/requirements.md#FR-01
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cli-uninit-cwd-gate:flow:测试绑定FR-01
  tests: test/uninit-cwd-gate.test.mjs「git 仓未初始化 → 文案给出 git root 锚点」 | test/uninit-cwd-gate.test.mjs「未初始化 git 仓 → block + gitRoot 指向仓根」 | test/uninit-cwd-gate.test.mjs「未初始化目录跑 flow → exit 2 + 硬拦文案（含修复三选一指引）」 | test/uninit-cwd-gate.test.mjs「未初始化非 git 目录 → block 且 gitRoot=null」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cli-uninit-cwd-gate
  status: active

## FR-cli-entry-427 豁免命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log——按设计可在未初始化目录运行或有自身 fail-closed）行为不变
变更：2026-10-10-cli-uninit-cwd-gate
状态：active
摘要：status 在未初始化目录
全文：.sillyspec/changes/archive/2026-10-10-cli-uninit-cwd-gate/requirements.md#FR-02
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cli-uninit-cwd-gate:flow:测试绑定FR-02
  tests: test/uninit-cwd-gate.test.mjs「豁免命令行为不变：status 在未初始化目录不触拦」 | test/uninit-cwd-gate.test.mjs「豁免命令（init/scan/doctor/status/wt-commit 等）任意目录 → exempt」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cli-uninit-cwd-gate
  status: active

## FR-cli-entry-428 子目录命中祖先链 → 放行且 dir 重锚定 spec 根：裸 join(dir,'.sillyspec') 调用点（如 task）子目录运行与根目录行为一致
变更：2026-10-10-cli-uninit-cwd-gate
状态：active
摘要：子目录跑非豁免命令
全文：.sillyspec/changes/archive/2026-10-10-cli-uninit-cwd-gate/requirements.md#FR-03
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cli-uninit-cwd-gate:flow:测试绑定FR-03
  tests: test/uninit-cwd-gate.test.mjs「已初始化根 / 其任意子目录 → pass + anchor=spec 根父目录」 | test/uninit-cwd-gate.test.mjs「已初始化根的子目录跑非豁免命令 → 放行 + 重锚定到项目根」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cli-uninit-cwd-gate
  status: active

## FR-cli-entry-429 平台模式（pointer/接管声明/--workspace-id/--runtime-root）与 --spec-dir 显式不受影响
变更：2026-10-10-cli-uninit-cwd-gate
状态：active
摘要：平台 pointer 项目跑非豁免命令；平台模式首扫（无 pointer 新目录）
全文：.sillyspec/changes/archive/2026-10-10-cli-uninit-cwd-gate/requirements.md#FR-04
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cli-uninit-cwd-gate:flow:测试绑定FR-04
  tests: test/uninit-cwd-gate.test.mjs「--spec-dir 显式指定 → 不拦」 | test/uninit-cwd-gate.test.mjs「--spec-root 平台首扫 flag → 不拦」 | test/uninit-cwd-gate.test.mjs「linked worktree（兄弟路径）主仓有 .sillyspec → pass 且 anchor=null」 | test/uninit-cwd-gate.test.mjs「平台 pointer / 接管声明在 dir → skip」 | test/uninit-cwd-gate.test.mjs「平台 pointer 在 cwd 的项目 → 不因缺本地 .sillyspec 被拦」 | test/uninit-cwd-gate.test.mjs「显式 --spec-dir / 平台 flag → skip」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cli-uninit-cwd-gate
  status: active

## FR-cli-entry-430 新增测试覆盖以上各面，相关回归全绿
变更：2026-10-10-cli-uninit-cwd-gate
状态：active
摘要：全量回归
全文：.sillyspec/changes/archive/2026-10-10-cli-uninit-cwd-gate/requirements.md#FR-05
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cli-uninit-cwd-gate:flow:测试绑定FR-05
  tests: test/run-tests.mjs | test/uninit-cwd-gate.test.mjs「非豁免命令清单抽样」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cli-uninit-cwd-gate
  status: active

## FR-cli-entry-431 治理面等价漂移必须保留评审结论
变更：2026-10-10-drift-review-governance-keep
状态：active
摘要：评审后治理文件修复不再触发重评（用户实证循环的解）
全文：.sillyspec/changes/archive/2026-10-10-drift-review-governance-keep/requirements.md#FR-01
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-drift-review-governance-keep:flow:测试绑定FR-01
  tests: test/flowdone-disposition-drift.test.mjs「③ e2e：治理面等价漂移——评审保留 + 自动重冻结 + 不重评直接归档」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-drift-review-governance-keep
  status: active

## FR-cli-entry-432 交付面/承诺面漂移必须维持隔离语义
变更：2026-10-10-drift-review-governance-keep
状态：active
摘要：既有回归不破（2026-10-05-disposition-refreeze-drift）
全文：.sillyspec/changes/archive/2026-10-10-drift-review-governance-keep/requirements.md#FR-02
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-drift-review-governance-keep:flow:测试绑定FR-02
  tests: test/flowdone-disposition-drift.test.mjs「① detectPatchDrift 归属三形态（扩展：文件面字段）」 | test/flowdone-disposition-drift.test.mjs「② e2e：处置重入隔离链路（既有回归）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-drift-review-governance-keep
  status: active

## FR-cli-entry-433 隔离后重评任务书必须保留复审语义
变更：2026-10-10-drift-review-governance-keep
状态：active
摘要：隔离不再丢失复审上下文
全文：.sillyspec/changes/archive/2026-10-10-drift-review-governance-keep/requirements.md#FR-03
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-drift-review-governance-keep:flow:测试绑定FR-03
  tests: test/flow-review.test.mjs「② 评审任务书：superseded 隔离件回退注入前轮 findings」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-drift-review-governance-keep
  status: active

## FR-cli-entry-434 评审 PASS 带 P2/P3 findings 时收口必须打印处置提示
变更：2026-10-10-drift-review-governance-keep
状态：active
摘要：提示在场
全文：.sillyspec/changes/archive/2026-10-10-drift-review-governance-keep/requirements.md#FR-04
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-drift-review-governance-keep:flow:测试绑定FR-04
  tests: test/flowdone-disposition-drift.test.mjs「③ e2e：治理面等价漂移（断言处置提示在场）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-drift-review-governance-keep
  status: active

## FR-cli-entry-435 上述判定与 fallback 必须有测试覆盖，触及 src 的实测全绿
变更：2026-10-10-drift-review-governance-keep
状态：active
摘要：收口实测
全文：.sillyspec/changes/archive/2026-10-10-drift-review-governance-keep/requirements.md#FR-05
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-drift-review-governance-keep:flow:测试绑定FR-05
  tests: test/flow-review.test.mjs | test/flowdone-disposition-drift.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-drift-review-governance-keep
  status: active

## FR-cli-entry-436 跨仓 diff 正文收口冻结（repos[].patch）
变更：2026-10-10-cross-repo-patch-freeze
状态：active
摘要：跨仓已提交改动冻结；跨仓未提交改动冻结（C 档）
全文：.sillyspec/changes/archive/2026-10-10-cross-repo-patch-freeze/requirements.md#FR-01
最近确认：becd7a9c24abb735c295a05c467176ddea5241de

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cross-repo-patch-freeze:flow:测试绑定FR-01
  tests: test/cross-repo-patch-freeze.test.mjs「跨仓已提交/未提交改动 patch 冻结 + sha256 锚」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cross-repo-patch-freeze
  status: active

## FR-cli-entry-437 patch 采集 fail-soft 不阻断
变更：2026-10-10-cross-repo-patch-freeze
状态：active
摘要：跨仓 diff 失败
全文：.sillyspec/changes/archive/2026-10-10-cross-repo-patch-freeze/requirements.md#FR-02
最近确认：becd7a9c24abb735c295a05c467176ddea5241de

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cross-repo-patch-freeze:flow:测试绑定FR-02
  tests: test/cross-repo-patch-freeze.test.mjs「diff 失败 fail-soft patch=null 主仓面照常」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cross-repo-patch-freeze
  status: active

## FR-cli-entry-438 轻量道跨仓行真实三态
变更：2026-10-10-cross-repo-patch-freeze
状态：active
摘要：跨仓实改不再谎报；降级仓诚实留痕
全文：.sillyspec/changes/archive/2026-10-10-cross-repo-patch-freeze/requirements.md#FR-03
最近确认：becd7a9c24abb735c295a05c467176ddea5241de

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cross-repo-patch-freeze:flow:测试绑定FR-03
  tests: test/cross-repo-patch-freeze.test.mjs「实改真实三态 + 降级仓诚实留痕 + 异常退 ⊘」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cross-repo-patch-freeze
  status: active

## FR-cli-entry-439 heavy/thin 同源单一实现
变更：2026-10-10-cross-repo-patch-freeze
状态：active
摘要：同源消费
全文：.sillyspec/changes/archive/2026-10-10-cross-repo-patch-freeze/requirements.md#FR-04
最近确认：becd7a9c24abb735c295a05c467176ddea5241de

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cross-repo-patch-freeze:flow:测试绑定FR-04
  tests: test/cross-repo-patch-freeze.test.mjs「reconcileCrossRepoPlan 结构契约（两通道同源断言同函数）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cross-repo-patch-freeze
  status: active

## FR-cli-entry-440 顶级面与单套纪律零回归
变更：2026-10-10-cross-repo-patch-freeze
状态：active
摘要：单仓变更零行为
全文：.sillyspec/changes/archive/2026-10-10-cross-repo-patch-freeze/requirements.md#FR-05
最近确认：becd7a9c24abb735c295a05c467176ddea5241de

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-cross-repo-patch-freeze:flow:测试绑定FR-05
  tests: test/close-trace-unified.test.mjs | test/cross-repo-patch-freeze.test.mjs「无跨仓声明零行为」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-cross-repo-patch-freeze
  status: active

## FR-cli-entry-441 读方与平台消费面兼容
变更：2026-10-10-cross-repo-patch-freeze
状态：active
摘要：旧读方面对增量键
全文：.sillyspec/changes/archive/2026-10-10-cross-repo-patch-freeze/requirements.md#FR-06
最近确认：becd7a9c24abb735c295a05c467176ddea5241de

## FR-cli-entry-442 flow start 新建横幅在书写面细则之前渲染「🚫 收口拒收红线」块，首条为 design 四问文本/FR 标题锚逐字钉死不许改写（改写即拒收），源码仍含「勿改写」子串（batch-tick-gate 回归兼容）
变更：2026-10-11-flow-start-redline-frontload
状态：active
摘要：红线块先于书写面细则
全文：.sillyspec/changes/archive/2026-10-11-flow-start-redline-frontload/requirements.md#FR-01
最近确认：db203e71fbe2b756cf9e52de7fce4ae25144270e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-11-flow-start-redline-frontload:flow:测试绑定FR-01
  tests: test/flow-redline-frontload.test.mjs「① 新建横幅：红线块先于书写面细则且首条钉死勿改写」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-11-flow-start-redline-frontload
  status: active

## FR-cli-entry-443 flow start 重入恢复简报含一行红线重申（钉死规则 + task-NN token 形态）
变更：2026-10-11-flow-start-redline-frontload
状态：active
摘要：重入简报红线行
全文：.sillyspec/changes/archive/2026-10-11-flow-start-redline-frontload/requirements.md#FR-02
最近确认：db203e71fbe2b756cf9e52de7fce4ae25144270e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-11-flow-start-redline-frontload:flow:测试绑定FR-02
  tests: test/flow-redline-frontload.test.mjs「② 重入恢复简报：红线重申行在场」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-11-flow-start-redline-frontload
  status: active

## FR-cli-entry-444 flow done 哨兵假完成拒收文案写明合法 token 形态（逐个列出或 /、，连写；task-01..task-05 区间写法不认）
变更：2026-10-11-flow-start-redline-frontload
状态：active
摘要：拒收文案自释格式
全文：.sillyspec/changes/archive/2026-10-11-flow-start-redline-frontload/requirements.md#FR-03
最近确认：db203e71fbe2b756cf9e52de7fce4ae25144270e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-11-flow-start-redline-frontload:flow:测试绑定FR-03
  tests: test/flow-redline-frontload.test.mjs「③ 哨兵假完成拒收文案：写明 token 合法形态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-11-flow-start-redline-frontload
  status: active

## FR-cli-entry-445 新增回归测试钉上述三处文案；全量测试零失败
变更：2026-10-11-flow-start-redline-frontload
状态：active
摘要：文案回归钉住
全文：.sillyspec/changes/archive/2026-10-11-flow-start-redline-frontload/requirements.md#FR-04
最近确认：db203e71fbe2b756cf9e52de7fce4ae25144270e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-11-flow-start-redline-frontload:flow:测试绑定FR-04
  tests: test/flow-redline-frontload.test.mjs「④ 三处文案回归同文件钉住」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-11-flow-start-redline-frontload
  status: active

## FR-cli-entry-446 classifyReviewNeed 对「四问全 n/a：…」「边界并发四问：不适用…」「均不适用…」「n/a：…」「N/A」开头且其余信号不命中的轻量 design 判豁免（exemptEvidence 含「自述不适用」类证据）
变更：2026-10-12-review-na-variant
状态：active
摘要：变体整声明豁免
全文：.sillyspec/changes/archive/2026-10-12-review-na-variant/requirements.md#FR-01
最近确认：17ad14e17bdc5de869d5269814fe94865783eb3e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-review-na-variant:flow:测试绑定FR-01
  tests: test/flow-review.test.mjs「盲维不适用变体：整声明开头不误升级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-review-na-variant
  status: active

## FR-cli-entry-447 逐问混合形态（任一问带实质内容，如「1. 乱序：n/a。2. 并发写：存在竞态…」）仍判需评审
变更：2026-10-12-review-na-variant
状态：active
摘要：逐问形态不豁免
全文：.sillyspec/changes/archive/2026-10-12-review-na-variant/requirements.md#FR-02
最近确认：17ad14e17bdc5de869d5269814fe94865783eb3e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-review-na-variant:flow:测试绑定FR-02
  tests: test/flow-review.test.mjs「盲维不适用变体：逐问混合形态仍升级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-review-na-variant
  status: active

## FR-cli-entry-448 回归：既有「不适用：…」口径不变仍豁免；实质作答仍升级；v1 槽3 分支与 v2 节分支同口径
变更：2026-10-12-review-na-variant
状态：active
摘要：口径不回归
全文：.sillyspec/changes/archive/2026-10-12-review-na-variant/requirements.md#FR-03
最近确认：17ad14e17bdc5de869d5269814fe94865783eb3e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-review-na-variant:flow:测试绑定FR-03
  tests: test/flow-review.test.mjs「盲维不适用变体：既有口径回归（v1/v2 同源）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-review-na-variant
  status: active

## FR-cli-entry-449 新用例先红后绿；全量测试零失败
变更：2026-10-12-review-na-variant
状态：active
摘要：全量绿
全文：.sillyspec/changes/archive/2026-10-12-review-na-variant/requirements.md#FR-04
最近确认：17ad14e17bdc5de869d5269814fe94865783eb3e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-review-na-variant:flow:测试绑定FR-04
  tests: test/run-tests.mjs「全量零失败」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-review-na-variant
  status: active

## FR-cli-entry-450 门三态：未登记目录在场裸跑 flow done 退出码 1 且不归档；登记后重跑通过；--accept-unmapped 放行且 change-patch.json 含 acceptedUnmappedDirs 计数；module_gate_ignore 命中目录不触发门；模块图缺席（绿地无图）不触发门
变更：2026-10-12-thin-module-gate-and-feed
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 仓内 _module-map.yaml 只登记 src/core，变更交付 src/newdir/a.js / When 裸跑 flow done / Then
全文：.sillyspec/changes/archive/2026-10-12-thin-module-gate-and-feed/requirements.md#FR-01
最近确认：ae3188a755843f723f58b21177afb86b4f2c9400

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thin-module-gate-and-feed:flow:测试绑定FR-01
  tests: test/thin-module-gate-and-feed.test.mjs「FR-01 门三态：裸跑阻断@patch / 登记后重跑通过 / --accept-unmapped 留痕 / ignore 命中不触发 / 绿地无图不触发」 | test/thin-module-gate-and-feed.test.mjs「单元 evaluateModuleGate：忽略前缀过滤 / 无图短路 / 空面不拦」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thin-module-gate-and-feed
  status: active

## FR-cli-entry-451 回写：命中模块的卡/sidecar 追加「| 日期 | 变更名 | 摘要 |」行；已拆卡（sidecar 在场）追加 sidecar 不动卡；重跑同变更名不重复追加；无卡无节跳过不报错；回写文件在归档后处于已暂存态
变更：2026-10-12-thin-module-gate-and-feed
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — 
全文：.sillyspec/changes/archive/2026-10-12-thin-module-gate-and-feed/requirements.md#FR-02
最近确认：ae3188a755843f723f58b21177afb86b4f2c9400

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thin-module-gate-and-feed:flow:测试绑定FR-02
  tests: test/thin-module-gate-and-feed.test.mjs「FR-02 变更索引回写：命中模块卡追加行 + 归档后已暂存 / sidecar 场景不写回卡」 | test/thin-module-gate-and-feed.test.mjs「单元 appendChangeIndexEntries：表格节追加 / sidecar 优先不动卡 / 幂等去重 / 无节跳过」 | test/thin-module-gate-and-feed.test.mjs「单元 deriveRecordedChangeIndexTargets：sidecar 反查优先 / 卡内反查 / 未记录零返回（断点续跑推导——评审 P3 清偿）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thin-module-gate-and-feed
  status: active

## FR-cli-entry-452 注入：触碰命中且卡 behind>0 的模块在 flow start 注入面出现欠账事实行；空债/无图零输出；注入异常不阻断 start
变更：2026-10-12-thin-module-gate-and-feed
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 模块 m1 卡落后源码 ≥1 提交且 --input 语料含 m1 paths 下文件 / When flow start / Then 注入面出现「模块卡欠账
全文：.sillyspec/changes/archive/2026-10-12-thin-module-gate-and-feed/requirements.md#FR-03
最近确认：ae3188a755843f723f58b21177afb86b4f2c9400

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thin-module-gate-and-feed:flow:测试绑定FR-03
  tests: test/thin-module-gate-and-feed.test.mjs「FR-03 注入：behind>0 出欠账事实行 / 空债零输出」 | test/thin-module-gate-and-feed.test.mjs「单元 renderThinDocsDebt：无图零输出 / 坏路径零输出（fail-open 不抛）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thin-module-gate-and-feed
  status: active

## FR-cli-entry-453 既有 flow/归档相关测试全绿，新增测试覆盖上述三档
变更：2026-10-12-thin-module-gate-and-feed
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 实现完成 / When 运行新增测试与 flow/归档相关既有测试 / Then 全部通过。
全文：.sillyspec/changes/archive/2026-10-12-thin-module-gate-and-feed/requirements.md#FR-04
最近确认：ae3188a755843f723f58b21177afb86b4f2c9400

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thin-module-gate-and-feed:flow:测试绑定FR-04
  tests: test/thin-module-gate-and-feed.test.mjs「FR-04 既有面回归：flow done 收口链在无门触发场景零行为变化」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thin-module-gate-and-feed
  status: active

## FR-cli-entry-454 flow approve 新增两种显式 attest 通道：--user-confirmed（agent 转述用户已确认）/ --self-approved（agent 自批如实声明）；无 flag 默认路径行为不变（零破坏）但按 unattested 留痕并打印警示
变更：2026-10-12-approve-channel-attest
状态：active
摘要：主路径；互斥校验
场景正文：
- 场景：主路径 — Given 在途变更存在；When 分别运行 `flow approve`（无 flag）/ `--user-confirmed` / `--self-approved`；
- 场景：互斥校验 — When 同时给 `--user-confirmed --self-approved`；Then exit 2，flow-state 不变。
全文：.sillyspec/changes/archive/2026-10-12-approve-channel-attest/requirements.md#FR-01
最近确认：b371dd96323c62c61baacd9a24c6e2d0ee6f2906

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-approve-channel-attest:flow:测试绑定FR-01
  tests: test/approve-channel-attest.test.mjs「三通道留痕与互斥校验」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-approve-channel-attest
  status: active

## FR-cli-entry-455 flow-state 新增 spec_approved_channel / spec_attested_by 字段，flow done 收口输出回显 channel（agent-self 与 unattested 醒目标注）
变更：2026-10-12-approve-channel-attest
状态：active
摘要：收口回显
场景正文：
- 场景：收口回显 — Given 变更以 `--self-approved` 批准且其余门全过；When `flow done`；Then 输出含 channel=agent-self 的 ⚠️
全文：.sillyspec/changes/archive/2026-10-12-approve-channel-attest/requirements.md#FR-02
最近确认：b371dd96323c62c61baacd9a24c6e2d0ee6f2906

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-approve-channel-attest:flow:测试绑定FR-02
  tests: test/approve-channel-attest.test.mjs「approveChannelOf 单元——flow done 回显与遥测同源取值（三态/legacy 归一/autopilot）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-approve-channel-attest
  status: active

## FR-cli-entry-456 新增 flow reject --reason <文本>：写 spec_rejected/spec_rejected_at/spec_rejected_reason 并撤销既有 spec_approved；存在 spec_rejected 记录时，approve 不带显式 attest flag 直接拒绝执行（exit 2，提示拒绝后派生授权须 --user-confirmed 或 --self-approved 显式再确认）
变更：2026-10-12-approve-channel-attest
状态：active
摘要：拒绝撤销；显式再确认
场景正文：
- 场景：拒绝撤销 — Given 变更已 approve；When `flow reject --reason 方案不对`；Then exit 0，`spec_approved` 变 false
- 场景：显式再确认 — Given 上例拒绝态；When `flow approve --user-confirmed`；Then exit 0，`spec_approved: true`、`sp
全文：.sillyspec/changes/archive/2026-10-12-approve-channel-attest/requirements.md#FR-03
最近确认：b371dd96323c62c61baacd9a24c6e2d0ee6f2906

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-approve-channel-attest:flow:测试绑定FR-03
  tests: test/approve-channel-attest.test.mjs「reject 撤销与拒后派生授权硬拦」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-approve-channel-attest
  status: active

## FR-cli-entry-457 新增单测覆盖：三通道留痕字段 / reject 撤销 / reject 后无 flag 拒绝 / reject 后显式通道放行 / 既有无 flag 路径回归
变更：2026-10-12-approve-channel-attest
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When `node --test test/approve-channel-attest.test.mjs test/flow-protocol.test.mjs te
全文：.sillyspec/changes/archive/2026-10-12-approve-channel-attest/requirements.md#FR-04
最近确认：b371dd96323c62c61baacd9a24c6e2d0ee6f2906

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-approve-channel-attest:flow:测试绑定FR-04
  tests: test/approve-channel-attest.test.mjs「五态全绿 + 既有族回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-approve-channel-attest
  status: active

## FR-cli-entry-458 task tick 新增 --evidence <文本>（自由文本，@file 前缀读文件内容，读取帽 8KB/条目数不限语义不变）：翻格同时把证据追加到 changes/<名>/task-evidence.jsonl（ts/task/evidence/source 四键 JSONL，UTF-8 追加写）；watcher task-done 事件附 evidence 字段（best-effort）；回显一行证据登记提示。无 --evidence 行为与现状逐字一致（零回归）；@file 读取失败 fail-soft 转文本原样登记并告警
变更：2026-10-12-tick-evidence-multi-anchor
状态：active
摘要：三态
场景正文：
- 场景：三态 — Given 在途变更；When 分别 `task tick --evidence "构建 exit 0，日志 /tmp/x.log"` / `--evidence "@/t
全文：.sillyspec/changes/archive/2026-10-12-tick-evidence-multi-anchor/requirements.md#FR-01
最近确认：a419a26ba02829a7db49aa24a956eec4376cf69d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-tick-evidence-multi-anchor:flow:测试绑定FR-01
  tests: test/tick-evidence-multi-anchor.test.mjs「evidence 三态（文本/@file/读取失败 fail-soft）+ 零回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-tick-evidence-multi-anchor
  status: active

## FR-cli-entry-459 review.json 契约 reviewedAgainst 扩展双形态：字符串（既有，7-40 hex，零破坏）或对象 {workspace: sha, repos: {<key>: sha}}——对象形态 workspace 必填 7-40 hex，repos 各值 7-40 hex，仓键开放（local.yaml repos 注册表键空间，不枚举）；validateReviewJson 双形态校验；reviewAnchoredToHead 对象形态取 workspace 锚参与漂移判定（缺 workspace 判 false fail-safe）
变更：2026-10-12-tick-evidence-multi-anchor
状态：active
摘要：校验矩阵
场景正文：
- 场景：校验矩阵 — Given review.json reviewedAgainst 分别为：合法字符串 sha / 合法对象（workspace+2 repos）/ 对象缺 workspa
全文：.sillyspec/changes/archive/2026-10-12-tick-evidence-multi-anchor/requirements.md#FR-02
最近确认：a419a26ba02829a7db49aa24a956eec4376cf69d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-tick-evidence-multi-anchor:flow:测试绑定FR-02
  tests: test/tick-evidence-multi-anchor.test.mjs「reviewedAgainst 双形态校验矩阵 + 对象锚定判定」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-tick-evidence-multi-anchor
  status: active

## FR-cli-entry-460 renderReviewerTaskbook 在变更带跨仓面（change-patch.json 含 repos 键）时，产物 schema 的 reviewedAgainst 行印双形态说明（对象形态优先，附各仓 rev-parse HEAD 提示）；单仓变更维持现状逐字一致
变更：2026-10-12-tick-evidence-multi-anchor
状态：active
摘要：双态
场景正文：
- 场景：双态 — Given change-patch.json 含 repos:{subgrid,spdemo}；When renderReviewerTaskbook；Then sche
全文：.sillyspec/changes/archive/2026-10-12-tick-evidence-multi-anchor/requirements.md#FR-03
最近确认：a419a26ba02829a7db49aa24a956eec4376cf69d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-tick-evidence-multi-anchor:flow:测试绑定FR-03
  tests: test/tick-evidence-multi-anchor.test.mjs「任务书跨仓双形态提示在场 / 单仓零变化」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-tick-evidence-multi-anchor
  status: active

## FR-cli-entry-461 新增单测：evidence 三态（文本/@file/失败 fail-soft）+ 双形态 reviewedAgainst 校验矩阵（合法字符串/合法对象/混合坏值各拒）+ 对象锚定判定 + 任务书跨仓双形态提示在场/单仓零变化 + 既有回归（task-tick/flow-review）
变更：2026-10-12-tick-evidence-multi-anchor
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When `node --test test/tick-evidence-multi-anchor.test.mjs test/task-tick.test.mjs te
全文：.sillyspec/changes/archive/2026-10-12-tick-evidence-multi-anchor/requirements.md#FR-04
最近确认：a419a26ba02829a7db49aa24a956eec4376cf69d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-tick-evidence-multi-anchor:flow:测试绑定FR-04
  tests: test/tick-evidence-multi-anchor.test.mjs「全量用例 + task-tick/flow-review 回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-tick-evidence-multi-anchor
  status: active

## FR-cli-entry-462 deps 门控阻断输出一次给全（run/gates.js 主仓与跨仓两分支）：depsStatus/depsError 尾部/meta.json 路径三要素齐 + 正规逃生口行（worktree doctor --fix 与 run execute 重供给）+ 明示「勿手改 meta.json（doctor 以实态校正）」——报错即自足，无需二跑定位
变更：2026-10-12-cli-friction-signal
状态：active
摘要：跨仓阻断自足
场景正文：
- 场景：跨仓阻断自足 — Given 跨仓 worktree meta depsStatus=failed、depsError='npm ci failed (…)长文本'；When run exe
全文：.sillyspec/changes/archive/2026-10-12-cli-friction-signal/requirements.md#FR-01
最近确认：e37ff367b5c14bf269bb19ff43059377cf1d0ffd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-cli-friction-signal:flow:测试绑定FR-01
  tests: test/cli-friction-signal.test.mjs「deps 阻断两分支文案一次给全（源锚钉死——同 input-format-copy 文案先例；既有 e2e 夹具走 worktreeGone 分支够不着本文案行，纯文案面以源锚为判定面）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-cli-friction-signal
  status: active

## FR-cli-entry-463 哨兵拒收文案（flow.js detectFakeCheckCompletion 拒收处）声明证据扫描面：工作区仓 git log baseline..HEAD + change 目录内 review.json；跨仓交付指引一行（跨仓提交不在扫描面，须在本仓提交消息带 task-NN 或产 review.json）
变更：2026-10-12-cli-friction-signal
状态：active
摘要：扫描面自释
场景正文：
- 场景：扫描面自释 — Given 全勾零证据拒收触发；When 读 stderr；Then 含扫描面声明行与跨仓指引行，且既有 token 形态说明行原样在场。
全文：.sillyspec/changes/archive/2026-10-12-cli-friction-signal/requirements.md#FR-02
最近确认：e37ff367b5c14bf269bb19ff43059377cf1d0ffd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-cli-friction-signal:flow:测试绑定FR-02
  tests: test/cli-friction-signal.test.mjs「哨兵拒收扫描面+跨仓指引两行源锚在场（含既有 token 行原样锚）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-cli-friction-signal
  status: active

## FR-cli-entry-464 register-repo 写跨仓标记：registerRepoInLocalYaml 成功后 best-effort 向 <仓根>/.git/sillyspec-crossrepo.json 写 {workspace,key,registeredAt}（.git 内零工作区污染；写失败仅告警不影响注册）；resolveUninitCwdGate block 态读标记，index.js 未初始化门文案追加精确指路（「此仓已登记为工作区 <路径> 的跨仓「<key>」——请回该工作区运行或 --dir 指定」）；无标记时文案与现状逐字一致
变更：2026-10-12-cli-friction-signal
状态：active
摘要：子仓精确指路；无标记零变化
场景正文：
- 场景：子仓精确指路 — Given 仓 R 已 register-repo（标记在场）且 R 内无 .sillyspec；When 在 R 内跑非豁免命令；Then exit 2 且 stderr
- 场景：无标记零变化 — Given 无标记的未初始化目录；When 同；Then stderr 与改动前逐字一致（仅既有四行文案）。
全文：.sillyspec/changes/archive/2026-10-12-cli-friction-signal/requirements.md#FR-03
最近确认：e37ff367b5c14bf269bb19ff43059377cf1d0ffd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-cli-friction-signal:flow:测试绑定FR-03
  tests: test/cli-friction-signal.test.mjs「标记写入幂等 + uninit 门精确指路/无标记零变化（CLI 级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-cli-friction-signal
  status: active

## FR-cli-entry-465 新增单测：deps 阻断输出三要素断言（现有 harness 夹具族）/ 哨兵文案扫描面行 / 标记写入与幂等 / 带标记 uninit 门精确指路 / 无标记零变化
变更：2026-10-12-cli-friction-signal
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When `node --test test/cli-friction-signal.test.mjs test/uninit-cwd-gate.test.mjs tes
全文：.sillyspec/changes/archive/2026-10-12-cli-friction-signal/requirements.md#FR-04
最近确认：e37ff367b5c14bf269bb19ff43059377cf1d0ffd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-cli-friction-signal:flow:测试绑定FR-04
  tests: test/cli-friction-signal.test.mjs「全量用例 + uninit/local-register/deps-diagnostic 回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-cli-friction-signal
  status: active

## FR-cli-entry-466 新渲染函数 renderStageReviewerTaskbook（stage-review.js，避 import 环）：角色（干净上下文独立评审员）+ 评审对象主文档 + REVIEW_CHECKLISTS[stage] 检查单（逐条 pass/gap/fail）+ 项目评审探针（assembleProbeLinesForScope scope=thick，未配置零注入）+ 请求预算硬帽 12 次 + 只读纪律 + 产物路径（含 docHash 占位与 --refresh-hash 代填指引）+ 完成后动作（重跑 run <stage> --done）
变更：2026-10-12-thick-taskbook-cli
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given stage=brainstorm、probeLines 两条；When renderStageReviewerTaskbook；Then 输出含检查单全部条目（
全文：.sillyspec/changes/archive/2026-10-12-thick-taskbook-cli/requirements.md#FR-01
最近确认：374baba5b0cb866d66773b6dbfb2a07900e03478

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thick-taskbook-cli:flow:测试绑定FR-01
  tests: test/thick-taskbook-cli.test.mjs「renderStageReviewerTaskbook 渲染面（检查单/探针双态/预算/产物/完成动作/契约单源）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thick-taskbook-cli
  status: active

## FR-cli-entry-467 接线出口一：printStageReviewResult 失败路径——仅当失败原因是「缺少 stage review.json」（tier=independent 未产）时，在既有提示后打印完整任务书（其他失败原因如 docHash 失配不打印，防噪音）
变更：2026-10-12-thick-taskbook-cli
状态：active
摘要：条件性双态
场景正文：
- 场景：条件性双态 — When printStageReviewResult 收到「缺少 execute 阶段 stage review.json」错误 + 完整 context；Then s
全文：.sillyspec/changes/archive/2026-10-12-thick-taskbook-cli/requirements.md#FR-02
最近确认：374baba5b0cb866d66773b6dbfb2a07900e03478

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thick-taskbook-cli:flow:测试绑定FR-02
  tests: test/thick-taskbook-cli.test.mjs「门失败条件性打印（缺件打印/docHash 失配不打印）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thick-taskbook-cli
  status: active

## FR-cli-entry-468 接线出口二：register-stage-review 生成骨架成功时打印同款任务书（派发前获取点，免撞门）
变更：2026-10-12-thick-taskbook-cli
状态：active
摘要：骨架生成打印
场景正文：
- 场景：骨架生成打印 — Given 变更含 design.md；When `register-stage-review --change <名> --stage brainstorm`（非 --j
全文：.sillyspec/changes/archive/2026-10-12-thick-taskbook-cli/requirements.md#FR-03
最近确认：374baba5b0cb866d66773b6dbfb2a07900e03478

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thick-taskbook-cli:flow:测试绑定FR-03
  tests: test/thick-taskbook-cli.test.mjs「register-stage-review 骨架打印 / --refresh-hash 不打印（CLI 级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thick-taskbook-cli
  status: active

## FR-cli-entry-469 平台通道（review-dispatch/buildReviewerTaskBook）零变化；步骤指引模板零触碰
变更：2026-10-12-thick-taskbook-cli
状态：active
摘要：零变化
场景正文：
- 场景：零变化 — When 对照 git diff；Then review-dispatch.js 与 src/stages/ 零改动。
全文：.sillyspec/changes/archive/2026-10-12-thick-taskbook-cli/requirements.md#FR-04
最近确认：374baba5b0cb866d66773b6dbfb2a07900e03478

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thick-taskbook-cli:flow:测试绑定FR-04
  tests: test/thick-taskbook-cli.test.mjs「review-dispatch 与 stages 模板零变化（git diff 面断言由评审核——测试面以 review-dispatch 回归族全绿替代）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thick-taskbook-cli
  status: active

## FR-cli-entry-470 新增单测：渲染面（检查单/探针注入与未配置零注入/预算行/产物路径/完成后动作）+ 门失败打印条件性（缺 review.json 打印/docHash 失配不打印）+ register-stage-review 出口打印（骨架打印/--refresh-hash 不打印）+ 既有 stage-review 回归族全绿
变更：2026-10-12-thick-taskbook-cli
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When `node --test test/thick-taskbook-cli.test.mjs test/stage-review-gate-echo.test.m
全文：.sillyspec/changes/archive/2026-10-12-thick-taskbook-cli/requirements.md#FR-05
最近确认：374baba5b0cb866d66773b6dbfb2a07900e03478

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-thick-taskbook-cli:flow:测试绑定FR-05
  tests: test/thick-taskbook-cli.test.mjs「全量用例 + 四族回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-thick-taskbook-cli
  status: active

## FR-cli-entry-471 flow start 主横幅（src/flow.js ~809-816 任务面段）与 resume/adopt 横幅（~537-538）各追加一行任务拟法指引：收口/推送/发布类动作不单列 task（协议本身承担，成功标准照写 requirements）；若确需单列，勾选前先有消息预埋 task-NN token 的交付提交（回执类证据写进提交消息）
变更：2026-10-12-closeout-task-guidance
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given flow start / resume 渲染；When 读任务面段；Then 含「任务拟法」行且语义含三要素（不单列/协议承担、成功标准归 requiremen
全文：.sillyspec/changes/archive/2026-10-12-closeout-task-guidance/requirements.md#FR-01
最近确认：f522dc81a26584861ee3432671c4c0cf272fac3b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-closeout-task-guidance:flow:测试绑定FR-01
  tests: test/flow-tick-prototype.test.mjs「横幅含任务拟法行（新增断言随本变更加入该族或新用例）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-closeout-task-guidance
  status: active

## FR-cli-entry-472 既有横幅行零改动（追加新行，钉死测试子串「任务面归你」等不受影响）
变更：2026-10-12-closeout-task-guidance
状态：active
摘要：零回归
场景正文：
- 场景：零回归 — When node --test test/flow-tick-prototype.test.mjs test/thin-workunits.test.mjs test/
全文：.sillyspec/changes/archive/2026-10-12-closeout-task-guidance/requirements.md#FR-02
最近确认：f522dc81a26584861ee3432671c4c0cf272fac3b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-closeout-task-guidance:flow:测试绑定FR-02
  tests: test/flow-tick-prototype.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-closeout-task-guidance
  status: active

## FR-cli-entry-473 design 四问问题行漂移（节标题在场）时 flow done 工件校验不再拒收：机器按 ledger 锚逐字回填问题行并出 advisory 留痕，重跑校验通过
变更：2026-10-13-design-question-autorepair
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 已作答的 v2 变更 design.md 中某问题行被整文件重写改述（节标题与作答保留）；When flow done 工件校验（verifyThinDocsV2）执行；Then design.md 中该问题行已被锚内原文逐字替换/插入，violations 不含「问题文本被改写」，repairs 含对应留痕条目，重跑校验 violati
全文：.sillyspec/changes/archive/2026-10-13-design-question-autorepair/requirements.md#FR-01
最近确认：43290f5cc74d6762f4739c021c16e58b944c640f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-design-question-autorepair:flow:测试绑定FR-01
  tests: test/thin-docs-v2.test.mjs「① 四问单一源：起草含常量逐字；问题被改写 → 机器按锚回填（不再拒收，repairs 留痕）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-design-question-autorepair
  status: active

## FR-cli-entry-474 回填零数据丢失：改述行按字符 bigram 相似度定位（阈值以上）插入锚原文于其上方，定位不到时插在节首，绝不删除/改写 agent 书写的任何行
变更：2026-10-13-design-question-autorepair
状态：active
摘要：高相似改述上方插入；低相似/删除改述节首插入
场景正文：
- 场景：高相似改述上方插入 — Given 节内问题行被轻度改述（如插入/替换个别词，bigram 相似度 ≥0.5）；When 回填执行；Then 锚原文插入改述行上方（原文与改述相邻），节内所有既有行字节不变（含改述行与答案行）
- 场景：低相似/删除改述节首插入 — Given 节内问题行被删除或改述到相似度 <0.5；When 回填执行；Then 锚原文插入节标题之后，原节内所有行保留在场，无任何行被删除
全文：.sillyspec/changes/archive/2026-10-13-design-question-autorepair/requirements.md#FR-02
最近确认：43290f5cc74d6762f4739c021c16e58b944c640f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-design-question-autorepair:flow:测试绑定FR-02
  tests: test/thin-docs-v2.test.mjs「⑦ 问题行机器回填：相似定位上方插入/未定位节首插入/重跑幂等（零二次改写零留痕）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-design-question-autorepair
  status: active

## FR-cli-entry-475 仍拒收的场景（节被删/节未作答/回填后仍缺）文案带锚内问题完整原文，不再 30 字截断
变更：2026-10-13-design-question-autorepair
状态：active
摘要：节被删拒收文案
场景正文：
- 场景：节被删拒收文案 — Given design.md 某节整体被删（标题缺失）；When verifyThinDocsV2 执行；Then violations 含该节被删条目且内嵌该节全部问题的完整原文（可整段照抄恢复）
全文：.sillyspec/changes/archive/2026-10-13-design-question-autorepair/requirements.md#FR-03
最近确认：43290f5cc74d6762f4739c021c16e58b944c640f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-design-question-autorepair:flow:测试绑定FR-03
  tests: test/thin-docs-v2.test.mjs「④ 结构破坏拒收面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-design-question-autorepair
  status: active

## FR-cli-entry-476 回填幂等：对已恢复文件重跑 verifyThinDocsV2 零二次改写、零新增 advisory
变更：2026-10-13-design-question-autorepair
状态：active
摘要：重跑幂等
场景正文：
- 场景：重跑幂等 — Given 一次校验已完成回填并通过；When 再次调用 verifyThinDocsV2；Then design.md 字节不变，返回值 repairs/advisories 均为空
全文：.sillyspec/changes/archive/2026-10-13-design-question-autorepair/requirements.md#FR-04
最近确认：43290f5cc74d6762f4739c021c16e58b944c640f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-design-question-autorepair:flow:测试绑定FR-04
  tests: test/thin-docs-v2.test.mjs「⑦ 问题行机器回填：…重跑幂等」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-design-question-autorepair
  status: active

## FR-cli-entry-477 空冻结面 + design 声明清单非空（剔除 .sillyspec/ 前缀与已带 repo 标注条目后仍有未标注条目）时 flow done patch 子步阻断收口（exit 1 不归档），文案一次给全三处置路径；跨仓嫌疑条目点名三种正确写法（段头/子段/cross-repo: 前缀）
变更：2026-10-13-thin-empty-face-crosscheck
状态：active
摘要：跨仓前缀形态命中阻断（实证形态复现）
场景正文：
- 场景：跨仓前缀形态命中阻断（实证形态复现） — Given thin 变更实现代码交付在 local.yaml 注册仓（主仓仅治理件提交、冻结面为空），design 文件变更清单裸写「仓目录名/路径」前缀形态；When flow done 执行 patch 子步；Then exit 1、change 保持 active，文案含「声明」「冻结面为空」矛盾点名、该条目（首段命中注册仓）与三种正确写法（段头「## <注册key> 仓变更
全文：.sillyspec/changes/archive/2026-10-13-thin-empty-face-crosscheck/requirements.md#FR-01
最近确认：e907173ef87e25c230dd64584e709887d8a44437

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-empty-face-crosscheck:flow:测试绑定FR-01
  tests: test/thin-empty-face-crosscheck.test.mjs「空面+声明清单未标注条目 → 阻断三处置」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-empty-face-crosscheck
  status: active

## FR-cli-entry-478 planEntries 解析与「疑似跨仓声明未按规范标注」告警在空冻结面也执行；嫌疑判定放宽为「路径主仓不存在即点名」（首段命中注册仓的额外标注 key）——非空冻结面分支行为零回归（既有测试全绿）
变更：2026-10-13-thin-empty-face-crosscheck
状态：active
摘要：仓根相对路径盲区（放宽判定）
场景正文：
- 场景：仓根相对路径盲区（放宽判定） — Given 空冻结面 + design 清单写仓根相对路径（首段不命中注册仓别名，如 src/routes/…）；When flow done 执行 patch 子步；Then 该条目按「主仓不存在」进嫌疑面被点名（不再因首段不命中而漏报），阻断与三处置文案同 FR-01
全文：.sillyspec/changes/archive/2026-10-13-thin-empty-face-crosscheck/requirements.md#FR-02
最近确认：e907173ef87e25c230dd64584e709887d8a44437

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-empty-face-crosscheck:flow:测试绑定FR-02
  tests: test/thin-empty-face-crosscheck.test.mjs「仓根相对路径盲区放宽点名」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-empty-face-crosscheck
  status: active

## FR-cli-entry-479 --accept-empty-face 显式签收放行并留痕（flow-state accept_empty_face 持久化，重跑不再阻断）；清单全部规范标注（e.repo）的纯跨仓空面不阻断，出空面跨仓冻结缺口 advisory
变更：2026-10-13-thin-empty-face-crosscheck
状态：active
摘要：签收留痕与免重拦
场景正文：
- 场景：签收留痕与免重拦 — Given 空面门阻断后带 --accept-empty-face 重跑；Then 放行并在 flow-state 落 accept_empty_face；随后不带 flag 再跑 flow done（如评审修正后重入）不再被空面门拦
全文：.sillyspec/changes/archive/2026-10-13-thin-empty-face-crosscheck/requirements.md#FR-03
最近确认：e907173ef87e25c230dd64584e709887d8a44437

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-empty-face-crosscheck:flow:测试绑定FR-03
  tests: test/thin-empty-face-crosscheck.test.mjs「--accept-empty-face 签收留痕免重拦」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-empty-face-crosscheck
  status: active

## FR-cli-entry-480 flow start 横幅在 local.yaml repos 注册非空时输出一行跨仓清单写法提示；注册为空时横幅输出逐字节不变
变更：2026-10-13-thin-empty-face-crosscheck
状态：active
摘要：两态横幅
场景正文：
- 场景：两态横幅 — Given local.yaml 注册 1+ 仓 → 横幅含跨仓写法行；Given 无注册仓 → 横幅与旧版逐字节一致
全文：.sillyspec/changes/archive/2026-10-13-thin-empty-face-crosscheck/requirements.md#FR-04
最近确认：e907173ef87e25c230dd64584e709887d8a44437

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-empty-face-crosscheck:flow:测试绑定FR-04
  tests: test/thin-empty-face-crosscheck.test.mjs「flow start 横幅两态：注册仓非空出跨仓行/为空逐字节一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-empty-face-crosscheck
  status: active

## FR-cli-entry-481 治理面-only 零声明清单的空面变更行为不变（空面跳过提示照旧，close-trace-freeze-integrity FR-01 ② 既有断言全绿）
变更：2026-10-13-thin-empty-face-crosscheck
状态：active
摘要：回归锚
场景正文：
- 场景：回归锚 — Given 工件-only 面（无交付面改动、无声明清单）变更收口；Then 行为与 3.32.7 完全一致（空面提示、归档成功、无 patch 两件）
全文：.sillyspec/changes/archive/2026-10-13-thin-empty-face-crosscheck/requirements.md#FR-05
最近确认：e907173ef87e25c230dd64584e709887d8a44437

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-empty-face-crosscheck:flow:测试绑定FR-05
  tests: test/close-trace-freeze-integrity.test.mjs「工件-only 面输出空面提示不落 patch」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-empty-face-crosscheck
  status: active

## FR-cli-entry-482 单拍多格勾选且哨兵证据完备（status=complete，每格已勾任务均有 token 提交/review.json）时 flow done 降级 advisory 放行并留痕 flow-state batch_ticked，无需 --allow-batch-tick
变更：2026-10-13-batchtick-evidence-domain-hint
状态：active
摘要：证据完备一把勾（反馈实证形态）
场景正文：
- 场景：证据完备一把勾（反馈实证形态） — Given 三任务各有 token 交付提交，agent 一次 Edit 翻三格（watcher 观测单拍跳 0→3），未带 --allow-batch-tick；When flow done 执行；Then 不拒收（advisory 提示节奏信号面失真），flow-state 含 batch_ticked: true，收口继续走完
全文：.sillyspec/changes/archive/2026-10-13-batchtick-evidence-domain-hint/requirements.md#FR-01
最近确认：e93f66eb01d66c3d1d8539a69180994542a4cf43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-batchtick-evidence-domain-hint:flow:测试绑定FR-01
  tests: test/batch-tick-gate.test.mjs「②d evidenceComplete 降级态（纯函数+接线钉）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-batchtick-evidence-domain-hint
  status: active

## FR-cli-entry-483 证据不完备的单拍保持硬拒；--allow-batch-tick 旁路、哨兵面未知 fail-open、机器代勾解释整跳三态语义与优先序不变
变更：2026-10-13-batchtick-evidence-domain-hint
状态：active
摘要：零证据一把勾
场景正文：
- 场景：零证据一把勾 — Given 任务全勾但 baseline..HEAD 提交零 task token 且无 review.json；When flow done 执行；Then 勾选证据哨兵先拒（假完成主张）；事件流门对 status≠complete 仍 reject
全文：.sillyspec/changes/archive/2026-10-13-batchtick-evidence-domain-hint/requirements.md#FR-02
最近确认：e93f66eb01d66c3d1d8539a69180994542a4cf43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-batchtick-evidence-domain-hint:flow:测试绑定FR-02
  tests: test/batch-tick-gate.test.mjs「②b 决策纯函数行为级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-batchtick-evidence-domain-hint
  status: active

## FR-cli-entry-484 flow start 对 --input 提及路径输出模块域预判行：命中已登记模块点名 FR 将落 fr/<域>；未命中点名将落伪域 auto-<段>（与 distill 分段投票同源实现）并给登记指引
变更：2026-10-13-batchtick-evidence-domain-hint
状态：active
摘要：命中与未命中双态
场景正文：
- 场景：命中与未命中双态 — Given 模块图登记 mod1 覆盖 src/foo/，input 提及 src/foo/a.js 与 src/other/b.js；When flow start 执行；Then 输出含 fr/mod1 命中点名与 auto-other 未命中点名＋登记指引
全文：.sillyspec/changes/archive/2026-10-13-batchtick-evidence-domain-hint/requirements.md#FR-03
最近确认：e93f66eb01d66c3d1d8539a69180994542a4cf43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-batchtick-evidence-domain-hint:flow:测试绑定FR-03
  tests: test/batch-tick-gate.test.mjs「④ flow start 域预判：命中点名/未命中伪域+指引」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-batchtick-evidence-domain-hint
  status: active

## FR-cli-entry-485 --input 未提及路径时 flow start 输出零新增行（逐字节不变）；绿地路径经 flow start 绿地草案自动建图后预判照常输出（草案域点名）
变更：2026-10-13-batchtick-evidence-domain-hint
状态：active
摘要：零路径；绿地/零路径
场景正文：
- 场景：零路径 — Given 模块图在场但 --input 为纯文字无路径提及；When flow start 执行；Then 输出不含域预判段
- 场景：绿地/零路径 — Given 无 _module-map.yaml 的仓（或 input 无路径提及）；When flow start 执行；Then 输出不含域预判段
全文：.sillyspec/changes/archive/2026-10-13-batchtick-evidence-domain-hint/requirements.md#FR-04
最近确认：e93f66eb01d66c3d1d8539a69180994542a4cf43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-batchtick-evidence-domain-hint:flow:测试绑定FR-04
  tests: test/batch-tick-gate.test.mjs「④ …绿地与零路径零新增行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-batchtick-evidence-domain-hint
  status: active

## FR-cli-entry-486 既有回归全绿：batch-tick-gate/sentinel-wiring 既有断言零改动通过；flow done distill 域路由与收口模块门行为零改动
变更：2026-10-13-batchtick-evidence-domain-hint
状态：active
摘要：回归锚
场景正文：
- 场景：回归锚 — Given 既有测试套件；When 全量跑；Then batch-tick-gate/sentinel-wiring 相关断言全绿，distill 路由产物与本变更前一致
全文：.sillyspec/changes/archive/2026-10-13-batchtick-evidence-domain-hint/requirements.md#FR-05
最近确认：e93f66eb01d66c3d1d8539a69180994542a4cf43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-batchtick-evidence-domain-hint:flow:测试绑定FR-05
  tests: test/batch-tick-gate.test.mjs/sentinel-wiring.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-batchtick-evidence-domain-hint
  status: active

## FR-cli-entry-487 serializeForSync 对 tier=thin 且 changes 行 status=active 的变更，上行 current_stage 投影为 thin（readFlowState 单一源上移叶子模块 flow-state.js，flow.js re-export 保持既有引用面）
变更：2026-10-13-thin-sync-stage
状态：active
摘要：thin 活跃变更推送；flow-state 缺失或损坏
全文：.sillyspec/changes/archive/2026-10-13-thin-sync-stage/requirements.md#FR-01
最近确认：dff0cbf5a6dbac070f5063f88afa083760a7c241

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-sync-stage:flow:测试绑定FR-01
  tests: test/platform-sync-thin-stage.test.mjs「thin 活跃变更上行 current_stage 投影为 thin；flow-state 缺失不覆写」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-sync-stage
  status: active

## FR-cli-entry-488 归档（status=archived）、升厚（tier=thick）、无 flow-state 的变更上行 stage 不受影响（现状回归）
变更：2026-10-13-thin-sync-stage
状态：active
摘要：归档 thin 变更；升厚变更
全文：.sillyspec/changes/archive/2026-10-13-thin-sync-stage/requirements.md#FR-02
最近确认：dff0cbf5a6dbac070f5063f88afa083760a7c241

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-sync-stage:flow:测试绑定FR-02
  tests: test/platform-sync-thin-stage.test.mjs「归档/升厚/无 flow-state 三形态上行 stage 不受影响」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-sync-stage
  status: active

## FR-cli-entry-489 新增测试覆盖 thin active 覆写、归档不覆写、升厚不覆写、无 flow-state 不覆写四形态；相关既有套件零回归
变更：2026-10-13-thin-sync-stage
状态：active
摘要：四形态断言
全文：.sillyspec/changes/archive/2026-10-13-thin-sync-stage/requirements.md#FR-03
最近确认：dff0cbf5a6dbac070f5063f88afa083760a7c241

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-thin-sync-stage:flow:测试绑定FR-03
  tests: test/platform-sync-thin-stage.test.mjs「四形态全覆盖」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-thin-sync-stage
  status: active

## FR-cli-entry-490 flow diff --change <归档名> 渲染归档件逐文件 +N/-M 与 totals（含 verdict 列），--json 输出同构结构
变更：2026-10-13-flow-diff-cmd
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-flow-diff-cmd/requirements.md#FR-01
最近确认：0f4b572c0526a679ce9e347112ca0ff0f3669b99

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-flow-diff-cmd:flow:测试绑定FR-01
  tests: test/flow-diff-cmd.test.mjs「归档态：读 scopeAudit 渲染逐文件 +N/-M 与 totals（含 verdict），--json 同构」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-flow-diff-cmd
  status: active

## FR-cli-entry-491 flow diff --change <活跃名> 实时计算：已提交交付面（baseline..HEAD 经 filterCommittedFace 冻结面口径）+ 未提交交付面（工作树 vs HEAD，untracked 按行数、二进制 null）+ 合计
变更：2026-10-13-flow-diff-cmd
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-flow-diff-cmd/requirements.md#FR-02
最近确认：0f4b572c0526a679ce9e347112ca0ff0f3669b99

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-flow-diff-cmd:flow:测试绑定FR-02
  tests: test/flow-diff-cmd.test.mjs「活跃态：提交面+dirty 面双段渲染，untracked 计行数，治理件剔除断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-flow-diff-cmd
  status: active

## FR-cli-entry-492 变更不存在 → exit 1 且修复路径一次给全；无 git 基线 → 显式提示 exit 0；变更名走既有白名单校验
变更：2026-10-13-flow-diff-cmd
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-flow-diff-cmd/requirements.md#FR-03
最近确认：0f4b572c0526a679ce9e347112ca0ff0f3669b99

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-flow-diff-cmd:flow:测试绑定FR-03
  tests: test/flow-diff-cmd.test.mjs「变更不存在 exit 1 一次给全 + 无基线 exit 0 + 非法名白名单拒收」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-flow-diff-cmd
  status: active

## FR-cli-entry-493 只读零副作用：不 pull/不写盘/不改 flow-state（与 scan diff 同纪律）
变更：2026-10-13-flow-diff-cmd
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-flow-diff-cmd/requirements.md#FR-04
最近确认：0f4b572c0526a679ce9e347112ca0ff0f3669b99

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-flow-diff-cmd:flow:测试绑定FR-04
  tests: test/flow-diff-cmd.test.mjs「只读零副作用：调用前后 flow-state/工作树/git status 字节不变」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-flow-diff-cmd
  status: active

## FR-cli-entry-494 既有回归零改动全绿；flow 族 usage 行补 diff
变更：2026-10-13-flow-diff-cmd
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-flow-diff-cmd/requirements.md#FR-05
最近确认：0f4b572c0526a679ce9e347112ca0ff0f3669b99

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-flow-diff-cmd:flow:测试绑定FR-05
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-flow-diff-cmd
  status: active

## FR-cli-entry-495 前置行行尾出现未闭合全角左括号时「成功标准：」节标题不被并入，条目正常提取、flow start 清晰度门不再误拒
变更：2026-10-13-extract-head-guard
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-extract-head-guard/requirements.md#FR-01
最近确认：e68f8119af1846cf4bff961364c9ef7207d455d5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-extract-head-guard:flow:测试绑定FR-01
  tests: test/draft-continuation.test.mjs「①d 节标题合并守卫：动机行尾未闭合左括号不再吞成功标准并雪崩」 | test/draft-continuation.test.mjs「①e 守卫等价面：验收标准 同受守卫」 | test/flow-draft.test.mjs | test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-extract-head-guard
  status: active

## FR-cli-entry-496 续行合并既有语义零回归：括号跨行并回、悬空冒号并回、markdown 标题、分号斜杠不拆四项既有断言零改动全绿
变更：2026-10-13-extract-head-guard
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-extract-head-guard/requirements.md#FR-02
最近确认：e68f8119af1846cf4bff961364c9ef7207d455d5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-extract-head-guard:flow:测试绑定FR-02
  tests: test/draft-continuation.test.mjs「①d 节标题合并守卫：动机行尾未闭合左括号不再吞成功标准并雪崩」 | test/draft-continuation.test.mjs「①e 守卫等价面：验收标准 同受守卫」 | test/flow-draft.test.mjs | test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-extract-head-guard
  status: active

## FR-cli-entry-497 验收标准 等价节标题同样受守卫；守卫只影响当前行是节标题的合并判定，不改 needsContinuationMerge 本体
变更：2026-10-13-extract-head-guard
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-13-extract-head-guard/requirements.md#FR-03
最近确认：e68f8119af1846cf4bff961364c9ef7207d455d5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-extract-head-guard:flow:测试绑定FR-03
  tests: test/draft-continuation.test.mjs「①d 节标题合并守卫：动机行尾未闭合左括号不再吞成功标准并雪崩」 | test/draft-continuation.test.mjs「①e 守卫等价面：验收标准 同受守卫」 | test/flow-draft.test.mjs | test/fr-compound-split.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-extract-head-guard
  status: active

## FR-cli-entry-498 --turbo --thick 同给时 start 不再输出「收口自动跳过实测与重仪式门」承诺，改输出档位如实文案（thick 起步走全量仪式）；--turbo 且 thin 时承诺文案照旧
变更：2026-10-14-turbo-guide-tier-copy
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 用户以 `--turbo --thick` 起变更；When flow start 渲染极速指引行；Then 输出档位如实文案（全量仪式），无跳过承诺
全文：.sillyspec/changes/archive/2026-10-14-turbo-guide-tier-copy/requirements.md#FR-01
最近确认：2b2273b809fa7f86479547fc6c4d8001cb1f2cfc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-turbo-guide-tier-copy:flow:测试绑定FR-01
  tests: test/turbo-mode-scope.test.mjs「② --turbo --thick 同给：指引文案随档位收窄」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-turbo-guide-tier-copy
  status: active

## FR-cli-entry-499 turbo done 输出含 ui 探针跳过留痕行；带未提交交付缺口时 turbo 降 advisory 放行（exit 0）而非 turbo 同场景阻断（exit≠0 三选一）
变更：2026-10-14-turbo-guide-tier-copy
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given turbo 变更交付面留有未提交文件；When flow done 执行 patch 冻结；Then 降 advisory 放行留痕并完成收口；非 turbo 对照组同场景阻断
全文：.sillyspec/changes/archive/2026-10-14-turbo-guide-tier-copy/requirements.md#FR-02
最近确认：2b2273b809fa7f86479547fc6c4d8001cb1f2cfc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-turbo-guide-tier-copy:flow:测试绑定FR-02
  tests: test/turbo-mode-done-skip.test.mjs「① ui 探针跳过留痕行／③ dirty 降 advisory 行为对照」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-turbo-guide-tier-copy
  status: active

## FR-cli-entry-500 flow-state turbo 值损坏（非布尔 true）时 done 走非 turbo 全量路径；flow-state.yaml 整体损坏时 done exit 2 报「无 flow-state」并指路
变更：2026-10-14-turbo-guide-tier-copy
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given flow-state 被外部篡改（turbo 值损坏 / 文件损坏）；When flow done 读态；Then 值损坏走全量路径完成收口；文件损坏拒绝并指路
全文：.sillyspec/changes/archive/2026-10-14-turbo-guide-tier-copy/requirements.md#FR-03
最近确认：2b2273b809fa7f86479547fc6c4d8001cb1f2cfc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-turbo-guide-tier-copy:flow:测试绑定FR-03
  tests: test/turbo-mode-scope.test.mjs「④ turbo 值损坏 fail-soft／⑤ flow-state.yaml 整体损坏 fail-loud」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-turbo-guide-tier-copy
  status: active

## FR-cli-entry-501 新增断言全绿 + 全量测试核心套回归零失败
变更：2026-10-14-turbo-guide-tier-copy
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更交付面（src/flow.js 指引行 + 四件测试）；When 跑 node --test 四件与 npm run test:core；Then 全绿
全文：.sillyspec/changes/archive/2026-10-14-turbo-guide-tier-copy/requirements.md#FR-04
最近确认：2b2273b809fa7f86479547fc6c4d8001cb1f2cfc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-turbo-guide-tier-copy:flow:测试绑定FR-04
  tests: test/turbo-mode-scope.test.mjs「全文件 5 用例 + npm run test:core 325/325（收口实测对账承载）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-turbo-guide-tier-copy
  status: active

## FR-cli-entry-502 outputStep 尾部指引全文锚行（必须）
变更：2026-10-14-guide-anchor-adopt-proto
状态：active
摘要：主路径——长输出被截断；回归——guide 关闭
场景正文：
- 场景：主路径——长输出被截断 — Given 某步渲染含长动态注入段（模块欠账/知识命中等），CLI stdout 超出 harness 工具结果上限被尾部截断；When agent 只收到末尾若干行；Then 末尾含「指引全文落盘：<step-guides 文件绝对路径>」锚行，agent Read 该文件即拿回完整步骤规则（分级/生成要求等决策关键节）。
- 场景：回归——guide 关闭 — Given `SILLYSPEC_STEP_GUIDE=0`；When outputStep 渲染；Then 输出与改动前逐字一致（无锚行）。
全文：.sillyspec/changes/archive/2026-10-14-guide-anchor-adopt-proto/requirements.md#FR-01
最近确认：324af7c235bd27534ba9d47004c45f332c8228a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-guide-anchor-adopt-proto:flow:测试绑定FR-01
  tests: test/guide-anchor-adopt-proto.test.mjs「outputStep 首见/复入尾部锚行 + guide 关闭零输出」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-guide-anchor-adopt-proto
  status: active

## FR-cli-entry-503 flow adopt 与 resume 尾部重列变更原型（必须）
变更：2026-10-14-guide-anchor-adopt-proto
状态：active
摘要：主路径——收编输出被截断；主路径——会话恢复；回归——无原型变更
场景正文：
- 场景：主路径——收编输出被截断 — Given 头脑风暴产出 prototype-x.html 后 `flow start --change <名>` 收编，输出被截断只剩尾部；Then 尾部材料清单含原型路径与「实现前必看」提示，agent 不丢对照基准。
- 场景：主路径——会话恢复 — Given 收编变更含原型，会话切换后重跑 `flow start --change <名>`（恢复简报）；Then 恢复简报尾部同样列出原型路径。
- 场景：回归——无原型变更 — Given 变更目录无 prototype HTML；When adopt/resume 渲染；Then 输出与改动前一致（零新增行）。
全文：.sillyspec/changes/archive/2026-10-14-guide-anchor-adopt-proto/requirements.md#FR-02
最近确认：324af7c235bd27534ba9d47004c45f332c8228a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-guide-anchor-adopt-proto:flow:测试绑定FR-02
  tests: test/guide-anchor-adopt-proto.test.mjs「adopt/resume 尾部重列原型 + 无原型零新增」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-guide-anchor-adopt-proto
  status: active

## FR-cli-entry-504 测试锁三处锚行且全绿（必须）
变更：2026-10-14-guide-anchor-adopt-proto
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When 跑新增测试与全量测试；Then 断言全过、既有测试零失败、lint 零错误。
全文：.sillyspec/changes/archive/2026-10-14-guide-anchor-adopt-proto/requirements.md#FR-03
最近确认：324af7c235bd27534ba9d47004c45f332c8228a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-guide-anchor-adopt-proto:flow:测试绑定FR-03
  tests: test/guide-anchor-adopt-proto.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-guide-anchor-adopt-proto
  status: active

## FR-cli-entry-505 冻结件存在性复查优先于子步状态
变更：2026-10-14-patch-refreeze-missing-artifact
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-patch-refreeze-missing-artifact/requirements.md#FR-01
最近确认：fddef8885d69c6d7ab2bcc209d84de66ac4c56e5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-patch-refreeze-missing-artifact:flow:测试绑定FR-01
  tests: test/flowdone-disposition-drift.test.mjs「④ e2e：冻结件缺失重入——存在性复查触发自动重冻结 + anchored 评审保留 + 直接归档」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-patch-refreeze-missing-artifact
  status: active

## FR-cli-entry-506 缺件重冻结的 review 处置规则
变更：2026-10-14-patch-refreeze-missing-artifact
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-patch-refreeze-missing-artifact/requirements.md#FR-02
最近确认：fddef8885d69c6d7ab2bcc209d84de66ac4c56e5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-patch-refreeze-missing-artifact:flow:测试绑定FR-02
  tests: test/flowdone-disposition-drift.test.mjs「④ …」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-patch-refreeze-missing-artifact
  status: active

## FR-cli-entry-507 e2e 回归用例
变更：2026-10-14-patch-refreeze-missing-artifact
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-patch-refreeze-missing-artifact/requirements.md#FR-03
最近确认：fddef8885d69c6d7ab2bcc209d84de66ac4c56e5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-patch-refreeze-missing-artifact:flow:测试绑定FR-03
  tests: test/flowdone-disposition-drift.test.mjs「④/⑤」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-patch-refreeze-missing-artifact
  status: active

## FR-cli-entry-508 全量门禁
变更：2026-10-14-patch-refreeze-missing-artifact
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-patch-refreeze-missing-artifact/requirements.md#FR-04
最近确认：fddef8885d69c6d7ab2bcc209d84de66ac4c56e5

## FR-cli-entry-509 库层入参归一化
变更：2026-10-14-redomain-domain-arg-normalize
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-redomain-domain-arg-normalize/requirements.md#FR-01
最近确认：970b33d44a67cb667d6335f9a96c81af5daeae45

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-redomain-domain-arg-normalize:flow:测试绑定FR-01
  tests: test/redomain.test.mjs「⑥ 入参归一化：fr/ 前缀与 .md 后缀形态与裸名等价；剥空拒绝；幂等」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-redomain-domain-arg-normalize
  status: active

## FR-cli-entry-510 CLI 口径统一
变更：2026-10-14-redomain-domain-arg-normalize
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-redomain-domain-arg-normalize/requirements.md#FR-02
最近确认：970b33d44a67cb667d6335f9a96c81af5daeae45

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-redomain-domain-arg-normalize:flow:测试绑定FR-02
  tests: test/redomain.test.mjs「⑦ CLI --from fr/ 前缀端到端：干跑/--write 与裸名等价且回显裸域名」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-redomain-domain-arg-normalize
  status: active

## FR-cli-entry-511 两种形态等价
变更：2026-10-14-redomain-domain-arg-normalize
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-redomain-domain-arg-normalize/requirements.md#FR-03
最近确认：970b33d44a67cb667d6335f9a96c81af5daeae45

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-redomain-domain-arg-normalize:flow:测试绑定FR-03
  tests: test/redomain.test.mjs「⑦ CLI --from fr/ 前缀端到端：干跑/--write 与裸名等价且回显裸域名」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-redomain-domain-arg-normalize
  status: active

## FR-cli-entry-512 测试覆盖
变更：2026-10-14-redomain-domain-arg-normalize
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-redomain-domain-arg-normalize/requirements.md#FR-04
最近确认：970b33d44a67cb667d6335f9a96c81af5daeae45

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-redomain-domain-arg-normalize:flow:测试绑定FR-04
  tests: test/redomain.test.mjs「⑥ 入参归一化：fr/ 前缀与 .md 后缀形态与裸名等价；剥空拒绝；幂等」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-redomain-domain-arg-normalize
  status: active

## FR-cli-entry-513 全量门禁
变更：2026-10-14-redomain-domain-arg-normalize
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-14-redomain-domain-arg-normalize/requirements.md#FR-05
最近确认：970b33d44a67cb667d6335f9a96c81af5daeae45

## FR-cli-entry-514 task tick 翻格成功后在变更目录落带时间戳的勾选留痕（task-ticks.jsonl，随归档进 git 跨机可读），timeline 任务面优先显示该精确时刻（不带 ≈），侧车缺行再退事件流推断（≈），再退「?」——观测盲窗里的 CLI tick 不再丢勾选时刻
变更：2026-10-14-timeline-ticktime-anchor-scope
状态：active
摘要：CLI tick 留痕且时间线精确显示；侧车缺行回退推断、链断回退 ?
场景正文：
- 场景：CLI tick 留痕且时间线精确显示 — Given 变更目录存在 tasks.md 且 task-01 未勾选；When 执行 `sillyspec task tick --task task-01` 翻格成功
- 场景：侧车缺行回退推断、链断回退 ? — Given 侧车无 task-02 行且事件流含可衔接的 task-done 计数链；When 渲染任务面；Then task-02 显示 ≈推断时刻；若计数链推断也不可用则显示「?」并保留既有缺时刻注记
全文：.sillyspec/changes/archive/2026-10-14-timeline-ticktime-anchor-scope/requirements.md#FR-01
最近确认：2d20d34ca97cbaf55f1400be294ab8ab94fcad81

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-timeline-ticktime-anchor-scope:flow:测试绑定FR-01
  tests: test/watcher-timeline.test.mjs「renderTimeline：侧车精确时刻优先（无 ≈），缺行回退推断 ≈，双盲回退 ?」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-timeline-ticktime-anchor-scope
  status: active

## FR-cli-entry-515 提交锚按变更名收敛：提交全消息不含本变更名的提交不参与该变更任务行的锚定（litellm-retire 案例回归：6c490325f/ab87d6adb 含 task-01/04/05 token 但消息属他变更，不得锚到 deploy-release-notes 任务行）；事件时间轴 commit 行展示面不变
变更：2026-10-14-timeline-ticktime-anchor-scope
状态：active
摘要：他变更提交含同 token 不误锚；本变更提交正常锚定
场景正文：
- 场景：他变更提交含同 token 不误锚 — Given 事件流观测到提交 6c490325f（消息含 task-01 token 但全文不含「2026-10-14-deploy-release-notes」）；When 以 change=2026-10-14-deploy-release-notes 渲染任务面；Then task-01 行不得锚定 6c490325f，显示「无提交锚⚠️」
- 场景：本变更提交正常锚定 — Given 事件流观测到某提交消息全文同时含变更名与 task-05 token；When 渲染该变更任务面；Then task-05 行锚定该提交短 hash（既有锚定形态不变）
全文：.sillyspec/changes/archive/2026-10-14-timeline-ticktime-anchor-scope/requirements.md#FR-02
最近确认：2d20d34ca97cbaf55f1400be294ab8ab94fcad81

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-timeline-ticktime-anchor-scope:flow:测试绑定FR-02
  tests: test/watcher-timeline.test.mjs「renderTimeline：跨变更误锚回归——他变更提交含同 token 不锚定（litellm-retire 案例形态）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-timeline-ticktime-anchor-scope
  status: active

## FR-cli-entry-516 幂等重勾零追加、侧车写失败不阻断翻格、已有测试全绿 + lint 绿
变更：2026-10-14-timeline-ticktime-anchor-scope
状态：active
摘要：幂等重勾零追加；侧车写失败不阻断
场景正文：
- 场景：幂等重勾零追加 — Given task-01 已勾选且侧车已有其留痕行；When 再次执行 `task tick task-01`；Then 侧车文件内容不变（零追加），exit 0 回显幂等
- 场景：侧车写失败不阻断 — Given 侧车路径不可写（目录被占/权限拒绝）；When 执行 `task tick task-01` 翻格；Then tasks.md 照常翻格、exit 0，仅输出写失败告警
全文：.sillyspec/changes/archive/2026-10-14-timeline-ticktime-anchor-scope/requirements.md#FR-03
最近确认：2d20d34ca97cbaf55f1400be294ab8ab94fcad81

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-timeline-ticktime-anchor-scope:flow:测试绑定FR-03
  tests: test/task-tick.test.mjs「侧车写失败仅告警不阻断翻格（目录占位 EISDIR 形态）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-timeline-ticktime-anchor-scope
  status: active

## FR-cli-entry-517 新增纯函数 detectTickBurst（src/sentinel-assertions.js）：tickLog（{ts,task} 集）同任务取最早、坏行跳过、按时戳排序后按相邻间隔窗口（缺省 60s，参数可覆写）分簇，最大簇 size>=2 即产出与事件流同形的 batchTick 记录（from/to=CLI 勾序计数，detail 标注「侧车突发」）；不足两格/空输入返回 null（fail-open）
变更：2026-10-14-tick-burst-sidecar-gate
状态：active
摘要：快连点检出；渐进零误报；混合形态取最大簇
场景正文：
- 场景：快连点检出 — Given 5 条 tickLog 行时戳全部落在 10 秒内；When detectTickBurst 执行（缺省窗口）；Then 返回 {from:0,to:5,source:'tick-burst'}，detail 含「侧车突发 5 格」
- 场景：渐进零误报 — Given 3 条 tickLog 行相邻间隔均大于窗口；When detectTickBurst 执行；Then 返回 null
- 场景：混合形态取最大簇 — Given 2 格渐进勾选后又 3 格快连收尾；When detectTickBurst 执行；Then 返回最大簇 {from:2,to:5}
全文：.sillyspec/changes/archive/2026-10-14-tick-burst-sidecar-gate/requirements.md#FR-01
最近确认：7f2643b1db53b8dd28fee111c372f517f7698931

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-tick-burst-sidecar-gate:flow:测试绑定FR-01
  tests: test/batch-tick-gate.test.mjs「②f detectTickBurst 纯函数：快连点/渐进/混合/坏行/同任务取最早/窗口覆写」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-tick-burst-sidecar-gate
  status: active

## FR-cli-entry-518 flow done 节奏门接线：事件流检测为空时回退读侧车（changeDir/task-ticks.jsonl 经 parseTickLog）做突发检测；事件流结果优先、不双重报告；检出走既有 resolveBatchTickAction 裁决（证据完备 advisory+flow-state batch_ticked 留痕；零证据维持硬拒）；侧车缺失/不可读按无证据静默
变更：2026-10-14-tick-burst-sidecar-gate
状态：active
摘要：CLI 快连点（证据完备）检出；侧车缺失静默
场景正文：
- 场景：CLI 快连点（证据完备）检出 — Given 变更任务全勾、每格有 token 提交证据、事件流无多格跳（CLI 单格精确跳被去重）、侧车 3 行时戳 5 秒内；When flow done 收口；Then 节奏 advisory 提示（含「侧车突发」）+ flow-state batch_ticked 留痕 + 收口继续（放行）
- 场景：侧车缺失静默 — Given 变更目录无 task-ticks.jsonl 且事件流无可检出跳；When flow done 收口；Then 节奏门零输出（行为与改动前一致）
全文：.sillyspec/changes/archive/2026-10-14-tick-burst-sidecar-gate/requirements.md#FR-02
最近确认：7f2643b1db53b8dd28fee111c372f517f7698931

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-tick-burst-sidecar-gate:flow:测试绑定FR-02
  tests: test/batch-tick-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-tick-burst-sidecar-gate
  status: active

## FR-cli-entry-519 渐进勾选（相邻间隔超窗）零误报；用归档 watcher 事件流的 CLI task-done 时戳回测：近期 CLI 快连点形态变更可被检出
变更：2026-10-14-tick-burst-sidecar-gate
状态：active
摘要：渐进 e2e 零告警
场景正文：
- 场景：渐进 e2e 零告警 — Given 变更侧车 3 行时戳相邻间隔均超窗、证据完备；When flow done 收口；Then 无勾选节奏告警（不误伤渐进勾选）
全文：.sillyspec/changes/archive/2026-10-14-tick-burst-sidecar-gate/requirements.md#FR-03
最近确认：7f2643b1db53b8dd28fee111c372f517f7698931

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-tick-burst-sidecar-gate:flow:测试绑定FR-03
  tests: test/batch-tick-gate.test.mjs「②f detectTickBurst 纯函数：快连点/渐进/混合/坏行/同任务取最早/窗口覆写」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-tick-burst-sidecar-gate
  status: active

## FR-cli-entry-520 新增/更新测试跑绿；全量测试 + lint 绿
变更：2026-10-14-tick-burst-sidecar-gate
状态：active
摘要：收口实测
场景正文：
- 场景：收口实测 — Given 交付提交完成；When flow done 实测门运行；Then 全量测试零失败且 lint 零 hard fail，否则整单 FAIL
全文：.sillyspec/changes/archive/2026-10-14-tick-burst-sidecar-gate/requirements.md#FR-04
最近确认：7f2643b1db53b8dd28fee111c372f517f7698931

## FR-cli-entry-521 轻量道 flow start 知识命中时 .runtime/knowledge-hits.jsonl 落 type:inject 事件，change/query 字段与既有事件同形，快道/thick 路径行为零变化
变更：2026-10-15-thin-inject-telemetry
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-thin-inject-telemetry/requirements.md#FR-01
最近确认：a493aef1a10075cf8a5c882afca8ab84b5d464bd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-thin-inject-telemetry:flow:测试绑定FR-01
  tests: test/thin-inject-telemetry.test.mjs「① thin 命中落盘：事件同形 + 分级字段」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-thin-inject-telemetry
  status: active

## FR-cli-entry-522 遥测事件带分级字段：injectedFiles（正文实际注入的文件）与 mentionedFiles（仅 Sources 行提及的文件）分离，knowledge stats 命中矩阵口径不回归
变更：2026-10-15-thin-inject-telemetry
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-thin-inject-telemetry/requirements.md#FR-02
最近确认：a493aef1a10075cf8a5c882afca8ab84b5d464bd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-thin-inject-telemetry:flow:测试绑定FR-02
  tests: test/thin-inject-telemetry.test.mjs「① thin 命中落盘：事件同形 + 分级字段」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-thin-inject-telemetry
  status: active

## FR-cli-entry-523 未命中（matched:false 且零 quicklog）不落盘（与既有口径一致）；遥测写失败不阻断注入本体（fail-soft 既有契约）
变更：2026-10-15-thin-inject-telemetry
状态：active
摘要：主路径（未命中零落盘）；fail-soft
全文：.sillyspec/changes/archive/2026-10-15-thin-inject-telemetry/requirements.md#FR-03
最近确认：a493aef1a10075cf8a5c882afca8ab84b5d464bd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-thin-inject-telemetry:flow:测试绑定FR-03
  tests: test/thin-inject-telemetry.test.mjs「② 未命中零落盘」 | test/thin-inject-telemetry.test.mjs「③ 遥测写失败 fail-soft：注入本体不受阻」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-thin-inject-telemetry
  status: active

## FR-cli-entry-524 新增测试覆盖 thin 命中落盘/未命中零落盘/fail-soft 三态，全量测试与 lint 绿
变更：2026-10-15-thin-inject-telemetry
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-thin-inject-telemetry/requirements.md#FR-04
最近确认：a493aef1a10075cf8a5c882afca8ab84b5d464bd

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-thin-inject-telemetry:flow:测试绑定FR-04
  tests: test/knowledge-inject.test.mjs | test/thin-inject-telemetry.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-thin-inject-telemetry
  status: active

## FR-cli-entry-525 thinKnowledgeQuery 四态单测绿（有标记留动机/中文冒号同判/无标记全文/动机空白退全 input）
变更：2026-10-15-thin-query-slim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-thin-query-slim/requirements.md#FR-01
最近确认：1246ce8ffac6e88d42319c01d5d3ac7de0c6d754

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-thin-query-slim:flow:测试绑定FR-01
  tests: test/thin-query-slim.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-thin-query-slim
  status: active

## FR-cli-entry-526 flow start 遥测 query 字段=瘦身串；既有注入面测试零回归
变更：2026-10-15-thin-query-slim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-thin-query-slim/requirements.md#FR-02
最近确认：1246ce8ffac6e88d42319c01d5d3ac7de0c6d754

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-thin-query-slim:flow:测试绑定FR-02
  tests: test/knowledge-inject.test.mjs | test/thin-inject-telemetry.test.mjs「① thin 命中落盘」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-thin-query-slim
  status: active

## FR-cli-entry-527 INDEX 词表补齐后 knowledge validate ok:true，检索 score 提升留档回执
变更：2026-10-15-thin-query-slim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-thin-query-slim/requirements.md#FR-03
最近确认：1246ce8ffac6e88d42319c01d5d3ac7de0c6d754

## FR-cli-entry-528 收割生成的 D-001 标题不含「槽4/收割」等机制词，直接说明内容（设计期风险与放弃方案）与底稿性质
变更：2026-10-15-harvest-title-clarify
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-harvest-title-clarify/requirements.md#FR-01
最近确认：ca4632b278f118f62ed0717db6659a2128493e55

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-harvest-title-clarify:flow:测试绑定FR-01
  tests: test/slot4-distill-fix.test.mjs「③ 收割条目标题自解释（无机制词+frontmatter 出处保留）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-harvest-title-clarify
  status: active

## FR-cli-entry-529 机器合成出处仍可追溯（frontmatter author: flow-machine-draft 保留）
变更：2026-10-15-harvest-title-clarify
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-harvest-title-clarify/requirements.md#FR-02
最近确认：ca4632b278f118f62ed0717db6659a2128493e55

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-harvest-title-clarify:flow:测试绑定FR-02
  tests: test/slot4-distill-fix.test.mjs「③ 收割条目标题自解释（无机制词+frontmatter 出处保留）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-harvest-title-clarify
  status: active

## FR-cli-entry-530 测试补新标题断言并跑绿；历史归档件与存量 knowledge 不回改
变更：2026-10-15-harvest-title-clarify
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-harvest-title-clarify/requirements.md#FR-03
最近确认：ca4632b278f118f62ed0717db6659a2128493e55

## FR-cli-entry-531 detectTickTiming 纯函数：时戳分散→spread；挤尾窗且变更存活≥10×跨度→concentrated；单格/无观测/无锚各有态，缺锚 fail-open
变更：2026-10-17-tick-timing-source
状态：active
摘要：判定序与阈值
场景正文：
- 场景：判定序与阈值 — Given 侧车时戳清单与变更存活时长；When 调用 detectTickTiming；Then 按 no-ticks → single → spread（跨度超窗——超窗即铁证无需存活锚）→ no-anchor（缺锚 fail-open）→ concent
全文：.sillyspec/changes/archive/2026-10-17-tick-timing-source/requirements.md#FR-01
最近确认：77f2b2ef9acf74cbfd0ce7afaf75bdbf2a82d417

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-tick-timing-source:flow:测试绑定FR-01
  tests: test/tick-timing-source.test.mjs「detectTickTiming 判定序与阈值（含覆写/快变更放行）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-tick-timing-source
  status: active

## FR-cli-entry-532 压扁形态回归：侧车时戳分散的变更在 git 历史被压扁后 flow done 不再出一把勾警告（结构性误报消除）
变更：2026-10-17-tick-timing-source
状态：active
摘要：压扁形态不再误报；末尾集中仍提醒
场景正文：
- 场景：压扁形态不再误报 — Given 变更侧车含 ≥2 格分散时戳（跨度 > 120s）且 tasks.md 仅有收口时点一次 git 提交（压扁形态）；When flow done；Then 无「一把勾」警告，输出「边干边勾确认（判据=task-ticks 侧车墙钟时戳，不受 git 压扁影响）」确认行
- 场景：末尾集中仍提醒 — Given 变更侧车时戳集中在 ≤120s 窗内且变更存活 ≥10×跨度；When flow done；Then 输出「勾选时点：N 格勾选时戳集中在 …s 短窗内（末尾集中勾选形态）」advisory，流程放行不被阻断
全文：.sillyspec/changes/archive/2026-10-17-tick-timing-source/requirements.md#FR-02
最近确认：77f2b2ef9acf74cbfd0ce7afaf75bdbf2a82d417

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-tick-timing-source:flow:测试绑定FR-02
  tests: test/tick-timing-source.test.mjs「flow done 时点判定换源——压扁形态回归与末尾集中 advisory」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-tick-timing-source
  status: active

## FR-cli-entry-533 task tick 翻格成功回显含可抄提交命令（消息模板带 task-NN、pathspec 含 tasks.md 与 task-ticks.jsonl）
变更：2026-10-17-tick-timing-source
状态：active
摘要：回显与提醒
场景正文：
- 场景：回显与提醒 — Given git 仓内在途变更，task-01 已勾、tasks.md 零 git 提交；When task tick --task task-02；Then 回显含 `git commit -m "<本任务交付概括> (task-02)"` 且 pathspec 含 tasks.md 与 task-ticks.jso
全文：.sillyspec/changes/archive/2026-10-17-tick-timing-source/requirements.md#FR-03
最近确认：77f2b2ef9acf74cbfd0ce7afaf75bdbf2a82d417

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-tick-timing-source:flow:测试绑定FR-03
  tests: test/task-tick.test.mjs「tick 回显提交命令模板与未入库提醒」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-tick-timing-source
  status: active

## FR-cli-entry-534 横幅/教学/拒收文案明确勾选修改与任务交付同一提交入库口径
变更：2026-10-17-tick-timing-source
状态：active
摘要：文案口径一致
场景正文：
- 场景：文案口径一致 — Given 任意 thin 变更执行 flow start / task 未全勾触发拒收；When 读取横幅与拒收输出；Then 三处文案均含「pathspec 带上本变更 tasks.md（同一提交入库）」口径与 task tick 现成命令指引
全文：.sillyspec/changes/archive/2026-10-17-tick-timing-source/requirements.md#FR-04
最近确认：77f2b2ef9acf74cbfd0ce7afaf75bdbf2a82d417

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-tick-timing-source:flow:测试绑定FR-04
  tests: test/tick-timing-source.test.mjs「教学文案口径断言（横幅/收编教学/拒收行）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-tick-timing-source
  status: active

## FR-cli-entry-535 syncSpecTree 返回携带 ok 契约（成功/合法态 true、通道失败 false、未决冲突无 ok=fail-closed 未确认），单测钉两种可达路径
变更：2026-10-17-archive-terminal-sync-strict
状态：active
摘要：主路径；平台不可达
场景正文：
- 场景：主路径 — Given 无 platform 配置（本地合法态）；When 调用 syncSpecTree；Then 返回 `{synced:0, ok:true}`（单测钉板）
- 场景：平台不可达 — Given platform 指向无服务端口；When 调用 syncSpecTree；Then 走清单异常分支返回 `ok:false`（单测钉板）
全文：.sillyspec/changes/archive/2026-10-17-archive-terminal-sync-strict/requirements.md#FR-01
最近确认：eb09c73c76d3ca457fde4b2bd74a482544ed9d74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-archive-terminal-sync-strict:flow:测试绑定FR-01
  tests: test/terminal-sync-strict.test.mjs「syncSpecTree 未连接平台 → ok:true（本地合法状态，非通道失败）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-archive-terminal-sync-strict
  status: active

## FR-cli-entry-536 triggerSyncTerminalStrict 状态机单测：非终态委托、未连接静默、终态 treeOk 判定、冲突让位、预算熔断按未确认处置、失败告警含自救命令且 exitCode=1，全绿
变更：2026-10-17-archive-terminal-sync-strict
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 注入 changeStatus/syncImpl 的七种状态组合；When 调用 triggerSyncTerminalStrict；Then 九条用例全绿（委托/静默/确认/告警+退出码/冲突让位/熔断/quick 委托/ok 契约两件）
全文：.sillyspec/changes/archive/2026-10-17-archive-terminal-sync-strict/requirements.md#FR-02
最近确认：eb09c73c76d3ca457fde4b2bd74a482544ed9d74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-archive-terminal-sync-strict:flow:测试绑定FR-02
  tests: test/terminal-sync-strict.test.mjs「终态 + 无 treeOk（未确认）→ 🚨 告警 + 自救命令 + exitCode=1」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-archive-terminal-sync-strict
  status: active

## FR-cli-entry-537 受影响面既有测试零回归（platform-sync 两件 + archive-chain + change-delete + run-complete-step-archive + flow-done-fail-brief）
变更：2026-10-17-archive-terminal-sync-strict
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When node --test 六文件；Then fail=0
全文：.sillyspec/changes/archive/2026-10-17-archive-terminal-sync-strict/requirements.md#FR-03
最近确认：eb09c73c76d3ca457fde4b2bd74a482544ed9d74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-archive-terminal-sync-strict:flow:测试绑定FR-03
  tests: test/archive-chain.test.mjs | test/change-delete.test.mjs | test/flow-done-fail-brief.test.mjs | test/platform-sync-schema.test.mjs | test/platform-sync-serialization.test.mjs | test/run-complete-step-archive.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-archive-terminal-sync-strict
  status: active

## FR-cli-entry-538 语法门（node test/check-syntax.mjs）通过；dogfood flow done 真实走一遍新强校验路径（平台健康时静默 confirmed）
变更：2026-10-17-archive-terminal-sync-strict
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When sillyspec flow done --change 2026-10-17-archive-terminal-sync-strict；Then 收尾同步静默完成（无 🚨 行）、命令退出码不受污染
全文：.sillyspec/changes/archive/2026-10-17-archive-terminal-sync-strict/requirements.md#FR-04
最近确认：eb09c73c76d3ca457fde4b2bd74a482544ed9d74

## FR-cli-entry-539 approve 硬校验：v2 轨复用 verifyThinDocsV2（须加 repair 只读开关——现状有 design.md 问题行回填写副作用，approve 不得写文件）、v1 轨复用 verifyDesignRecordFilled；design 四节空/FR 待撰写/绑定待填时 approve exit 1 并给修复指引；作答齐备时照常批准
变更：2026-10-19-approve-gate-tick-nudge
状态：active
摘要：空文档过批被拒；齐备放行
场景正文：
- 场景：空文档过批被拒 — Given v2 变更 design 四节未答（骨架）/requirements FR 仍「（待撰写」，When flow approve，Then exit 1、无 sp
- 场景：齐备放行 — Given v2 变更四节已答+FR 行为句+绑定行齐，When flow approve --user-confirmed，Then exit 0、spec_approv
全文：.sillyspec/changes/archive/2026-10-19-approve-gate-tick-nudge/requirements.md#FR-01
最近确认：811130f031f306c084caabad239605d0d9a35303

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-approve-gate-tick-nudge:flow:测试绑定FR-01
  tests: test/approve-gate-tick.test.mjs「approve 硬拒（空文档/未答绑定）与齐备放行、approve 只读（design.md 字节不变）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-approve-gate-tick-nudge
  status: active

## FR-cli-entry-540 豁免与降级：adopted_from=brainstorm 豁免 design 四节（以 brainstorm design 为准，与 done 门同口径）；draft-ledger 缺失时 fail-open 放行（跨机/存量场景）；verifyThinDocsV2 校验通过但存在 advisory 时不阻断批准
变更：2026-10-19-approve-gate-tick-nudge
状态：active
摘要：brainstorm 收编豁免；ledger 缺失降级
场景正文：
- 场景：brainstorm 收编豁免 — Given adopted 变更 design 四节为空（以 brainstorm design 为准），When flow approve，Then 不因四节空拒收（绑定
- 场景：ledger 缺失降级 — Given 变更目录无 draft-ledger（.runtime 机本位不在此机），When flow approve，Then 放行并在输出含降级标注。
全文：.sillyspec/changes/archive/2026-10-19-approve-gate-tick-nudge/requirements.md#FR-02
最近确认：811130f031f306c084caabad239605d0d9a35303

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-approve-gate-tick-nudge:flow:测试绑定FR-02
  tests: test/approve-gate-tick.test.mjs「brainstorm 豁免与 ledger 缺失 fail-open 降级标注」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-approve-gate-tick-nudge
  status: active

## FR-cli-entry-541 共享判定上移：status 内联的「design 四节已答」判定（v1 槽/v2 节双格式）抽为可复用导出，status 与 tick 同源调用，行为零变化
变更：2026-10-19-approve-gate-tick-nudge
状态：active
摘要：重构零变化
场景正文：
- 场景：重构零变化 — Given 同一 fixture，When 重构前后各跑 flow status（人类面与 --json），Then 输出逐字一致。
全文：.sillyspec/changes/archive/2026-10-19-approve-gate-tick-nudge/requirements.md#FR-03
最近确认：811130f031f306c084caabad239605d0d9a35303

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-approve-gate-tick-nudge:flow:测试绑定FR-03
  tests: test/approve-gate-tick.test.mjs「status 重构前后输出逐字一致（快照对比）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-approve-gate-tick-nudge
  status: active

## FR-cli-entry-542 task tick 提醒：勾选回显在（design 四节未答 或 未批准且非 autopilot）时附一行「先补 spec 面/先过断点①」警示，advisory 不阻断勾选、不改变回显既有行
变更：2026-10-19-approve-gate-tick-nudge
状态：active
摘要：未答先勾给警示；齐备静默
场景正文：
- 场景：未答先勾给警示 — Given v2 变更 design 未答、未批准，When task tick --task task-01，Then 勾选成功（exit 0）且回显末尾含 spec 面
- 场景：齐备静默 — Given 四节已答+已批准，When task tick，Then 回显与现状逐字一致（零新增行）。
全文：.sillyspec/changes/archive/2026-10-19-approve-gate-tick-nudge/requirements.md#FR-04
最近确认：811130f031f306c084caabad239605d0d9a35303

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-approve-gate-tick-nudge:flow:测试绑定FR-04
  tests: test/approve-gate-tick.test.mjs「tick 警示触发与齐备静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-approve-gate-tick-nudge
  status: active

## FR-cli-entry-543 测试：approve 硬拒/放行/brainstorm 豁免/repair 只读（approve 后 design.md 字节不变）/ledger 缺失放行/tick 提醒触发与静默各就位，既有 flow-status/task-tick/approve 相关测试零回归
变更：2026-10-19-approve-gate-tick-nudge
状态：active
摘要：全量回归
场景正文：
- 场景：全量回归 — Given 本变更合入，When 跑既有相关测试与新增测试，Then 零失败。
全文：.sillyspec/changes/archive/2026-10-19-approve-gate-tick-nudge/requirements.md#FR-05
最近确认：811130f031f306c084caabad239605d0d9a35303

## FR-cli-entry-544 评审任务书预消化材料包注入
变更：2026-10-19-thin-review-material-pack
状态：active
摘要：主路径；跨仓 JSON 冻结面
全文：.sillyspec/changes/archive/2026-10-19-thin-review-material-pack/requirements.md#FR-01
最近确认：e70ea3004aabbd1b8d4a664fece5cedc3af94556

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-material-pack:flow:测试绑定FR-01
  tests: test/flow-review-pack.test.mjs「注入形态——材料可得时任务书含预消化段（FR 表逐条对应+patch 摘要行数与文件数一致+基准面语义行）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-material-pack
  status: active

## FR-cli-entry-545 纯机械抽取与体积帽
变更：2026-10-19-thin-review-material-pack
状态：active
摘要：大 patch 截断
全文：.sillyspec/changes/archive/2026-10-19-thin-review-material-pack/requirements.md#FR-02
最近确认：e70ea3004aabbd1b8d4a664fece5cedc3af94556

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-material-pack:flow:测试绑定FR-02
  tests: test/flow-review-pack.test.mjs「帽截断——超限材料截断并注记；确定性——同输入同输出」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-material-pack
  status: active

## FR-cli-entry-546 零注入逐字一致
变更：2026-10-19-thin-review-material-pack
状态：active
摘要：既有调用方零感知
全文：.sillyspec/changes/archive/2026-10-19-thin-review-material-pack/requirements.md#FR-03
最近确认：e70ea3004aabbd1b8d4a664fece5cedc3af94556

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-material-pack:flow:测试绑定FR-03
  tests: test/flow-review-pack.test.mjs「零注入一致——缺件/未传参时渲染产物与现状逐字一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-material-pack
  status: active

## FR-cli-entry-547 三态测试全绿
变更：2026-10-19-thin-review-material-pack
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-19-thin-review-material-pack/requirements.md#FR-04
最近确认：e70ea3004aabbd1b8d4a664fece5cedc3af94556

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-material-pack:flow:测试绑定FR-04
  tests: test/flow-review-pack.test.mjs | test/flow-review.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-material-pack
  status: active

## FR-cli-entry-548 主仓冻结面为空且 design 清单含规范跨仓标注时，跑跨仓对账并落 change-patch.json（scopeAudit.repos[] 含 patch 正文与 patchSha256），不写 change.patch；各仓均无交付时仍按空面跳过
变更：2026-10-19-thin-empty-face-cross-repo-freeze
状态：active
摘要：空面跨仓有交付；跨仓无交付
全文：.sillyspec/changes/archive/2026-10-19-thin-empty-face-cross-repo-freeze/requirements.md#FR-01
最近确认：ca1d202d5c03b283ba9b11e27b41e14df10d1cb3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-empty-face-cross-repo-freeze:flow:测试绑定FR-01
  tests: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-empty-face-cross-repo-freeze
  status: active

## FR-cli-entry-549 冻结件存在性复查把「change-patch.json 内 repos 有 patch」视为完整，重入不误报「冻结件缺失」
变更：2026-10-19-thin-empty-face-cross-repo-freeze
状态：active
摘要：JSON-only 留档重入；两缺/坏 JSON
全文：.sillyspec/changes/archive/2026-10-19-thin-empty-face-cross-repo-freeze/requirements.md#FR-02
最近确认：ca1d202d5c03b283ba9b11e27b41e14df10d1cb3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-empty-face-cross-repo-freeze:flow:测试绑定FR-02
  tests: test/close-trace-freeze-integrity.test.mjs「inspectFreezeArtifacts：JSON-only 跨仓冻结判完整，两缺/坏 JSON 判缺件」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-empty-face-cross-repo-freeze
  status: active

## FR-cli-entry-550 verify-result 回执对跨仓冻结构给出明确表述，不再写「无冻结件」
变更：2026-10-19-thin-empty-face-cross-repo-freeze
状态：active
摘要：跨仓冻结回执
全文：.sillyspec/changes/archive/2026-10-19-thin-empty-face-cross-repo-freeze/requirements.md#FR-03
最近确认：ca1d202d5c03b283ba9b11e27b41e14df10d1cb3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-empty-face-cross-repo-freeze:flow:测试绑定FR-03
  tests: test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-empty-face-cross-repo-freeze
  status: active

## FR-cli-entry-551 既有 thin-empty-face-crosscheck / cross-repo-baseline-anchor / close-trace-freeze-integrity 测试全绿，并新增空面跨仓冻结用例
变更：2026-10-19-thin-empty-face-cross-repo-freeze
状态：active
摘要：回归面
全文：.sillyspec/changes/archive/2026-10-19-thin-empty-face-cross-repo-freeze/requirements.md#FR-04
最近确认：ca1d202d5c03b283ba9b11e27b41e14df10d1cb3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-empty-face-cross-repo-freeze:flow:测试绑定FR-04
  tests: test/cross-repo-baseline-anchor.test.mjs | test/cross-repo-patch-freeze.test.mjs | test/thin-empty-face-crosscheck.test.mjs「空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-empty-face-cross-repo-freeze
  status: active

## FR-cli-entry-552 无跨仓规范标注且 local.yaml 注册仓非空时，收口探测各注册仓窗口（cross_baselines..工作树），有交付改动即点名仓键/文件数并给出规范标注三选一指引
变更：2026-10-19-undeclared-cross-repo-probe
状态：active
摘要：命中未标注跨仓交付
全文：.sillyspec/changes/archive/2026-10-19-undeclared-cross-repo-probe/requirements.md#FR-01
最近确认：4d377821eec89934dbd5a81b4b62d548e2b45639

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-undeclared-cross-repo-probe:flow:测试绑定FR-01
  tests: test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓有交付 → 窗口探测点名（advisory 不阻断）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-undeclared-cross-repo-probe
  status: active

## FR-cli-entry-553 探测为 advisory 不阻断；纯文档变更/单仓工作区/跨仓窗口零改动时零输出
变更：2026-10-19-undeclared-cross-repo-probe
状态：active
摘要：零改动
全文：.sillyspec/changes/archive/2026-10-19-undeclared-cross-repo-probe/requirements.md#FR-02
最近确认：4d377821eec89934dbd5a81b4b62d548e2b45639

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-undeclared-cross-repo-probe:flow:测试绑定FR-02
  tests: test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓零改动 → 探测零输出」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-undeclared-cross-repo-probe
  status: active

## FR-cli-entry-554 新增用例覆盖命中与零触发两态，既有空面门/跨仓冻结测试全绿
变更：2026-10-19-undeclared-cross-repo-probe
状态：active
摘要：验证面
全文：.sillyspec/changes/archive/2026-10-19-undeclared-cross-repo-probe/requirements.md#FR-03
最近确认：4d377821eec89934dbd5a81b4b62d548e2b45639

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-undeclared-cross-repo-probe:flow:测试绑定FR-03
  tests: test/cross-repo-baseline-anchor.test.mjs | test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓有交付 → 窗口探测点名（advisory 不阻断）」 | test/thin-empty-face-crosscheck.test.mjs「无清单段 + 注册跨仓零改动 → 探测零输出」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-undeclared-cross-repo-probe
  status: active

## FR-cli-entry-555 filterCommittedFace 剔除 .claude/.codex/.gemini/.opencode/.zcode/.cursor 目录与 CLAUDE.md；AGENTS.md 等项目指令文件保留为交付面
变更：2026-10-19-freeze-filter-tool-scaffold
状态：active
摘要：模板剔除；项目指令保留
全文：.sillyspec/changes/archive/2026-10-19-freeze-filter-tool-scaffold/requirements.md#FR-01
最近确认：71b3ff3ebc87ef51ed667b31b66c4ce92e15e638

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-freeze-filter-tool-scaffold:flow:测试绑定FR-01
  tests: test/filter-committed-face.test.mjs「isToolGovernancePath 只认工具注入面（AGENTS.md 返回 false）」 | test/filter-committed-face.test.mjs「工具治理模板剔除，项目指令文件保留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-freeze-filter-tool-scaffold
  status: active

## FR-cli-entry-556 新增单测与 e2e 覆盖模板剔除、正常源码保留两态，既有冻结/空面/跨仓测试全绿
变更：2026-10-19-freeze-filter-tool-scaffold
状态：active
摘要：验证面
全文：.sillyspec/changes/archive/2026-10-19-freeze-filter-tool-scaffold/requirements.md#FR-02
最近确认：71b3ff3ebc87ef51ed667b31b66c4ce92e15e638

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-freeze-filter-tool-scaffold:flow:测试绑定FR-02
  tests: test/filter-committed-face.test.mjs「反斜杠工具模板同样剔除」 | test/thin-empty-face-crosscheck.test.mjs「e2e：.claude/ 与 CLAUDE.md 剔除，正常源码保留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-freeze-filter-tool-scaffold
  status: active

## FR-cli-entry-557 归档 patch 的 files[]/change.patch 不再出现工具治理模板
变更：2026-10-19-freeze-filter-tool-scaffold
状态：active
摘要：归档双面
全文：.sillyspec/changes/archive/2026-10-19-freeze-filter-tool-scaffold/requirements.md#FR-03
最近确认：71b3ff3ebc87ef51ed667b31b66c4ce92e15e638

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-freeze-filter-tool-scaffold:flow:测试绑定FR-03
  tests: test/thin-empty-face-crosscheck.test.mjs「e2e：.claude/ 与 CLAUDE.md 剔除，正常源码保留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-freeze-filter-tool-scaffold
  status: active

## FR-cli-entry-558 任务书头部与派发横幅含「原样复制给子代理——检查单生产权在 CLI，勿自行改写增删」指令（对齐厚道措辞）
变更：2026-10-19-thin-review-dispatch-verbatim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-19-thin-review-dispatch-verbatim/requirements.md#FR-01
最近确认：324e09669383e34f8a66581a230ae7bba97dae08

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-dispatch-verbatim:flow:测试绑定FR-01
  tests: test/flow-review-pack.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-dispatch-verbatim
  status: active

## FR-cli-entry-559 材料包在冻结面可得时含归属切分段：声明内（design 清单∩冻结面）/声明外（冻结面−design 清单）/他侧归因（splitOwnVsForeignDiffFiles 单源），声明外标注「并行混入候选，抽查即可勿逐文件考古」
变更：2026-10-19-thin-review-dispatch-verbatim
状态：active
摘要：平台仓混入形态（实测样本）；声明面完整
全文：.sillyspec/changes/archive/2026-10-19-thin-review-dispatch-verbatim/requirements.md#FR-02
最近确认：324e09669383e34f8a66581a230ae7bba97dae08

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-dispatch-verbatim:flow:测试绑定FR-02
  tests: test/flow-review-pack.test.mjs「归属切分——三分类注入形态 + 声明外『抽查即可』标注 + 他侧归因带 owner」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-dispatch-verbatim
  status: active

## FR-cli-entry-560 归属核算 fail-soft（git 失败/缺件零注入该子段，FR 表与文件摘要不受影响）；整体体积帽 12000 不变
变更：2026-10-19-thin-review-dispatch-verbatim
状态：active
摘要：git 不可用
全文：.sillyspec/changes/archive/2026-10-19-thin-review-dispatch-verbatim/requirements.md#FR-03
最近确认：324e09669383e34f8a66581a230ae7bba97dae08

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-dispatch-verbatim:flow:测试绑定FR-03
  tests: test/flow-review-pack.test.mjs「fail-soft——归属源失败零注入子段、FR 表与摘要不受影响；体积帽 12000 不变」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-dispatch-verbatim
  status: active

## FR-cli-entry-561 新增测试覆盖指令在场/归属切分注入/fail-soft 零注入/他侧归因形态；既有 flow-review 回归全绿
变更：2026-10-19-thin-review-dispatch-verbatim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-19-thin-review-dispatch-verbatim/requirements.md#FR-04
最近确认：324e09669383e34f8a66581a230ae7bba97dae08

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-review-dispatch-verbatim:flow:测试绑定FR-04
  tests: test/flow-review-pack.test.mjs | test/flow-review.test.mjs | test/review-probes.test.mjs | test/tick-evidence-multi-anchor.test.mjs | test/wave-auto-adopt.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-review-dispatch-verbatim
  status: active

## FR-cli-entry-562 flow start 横幅含执行期用户决策落盘纪律行（含 decisions add 命令样例与承诺面同步提示）
变更：2026-10-20-thin-user-decision-record
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 一个全新轻量变更执行 `flow start`；When 横幅渲染完成；Then stdout 含 /decisions add/ 与 /承诺面|design\/tasks/ 的纪律行，且恢复重入时简报不含该行
全文：.sillyspec/changes/archive/2026-10-20-thin-user-decision-record/requirements.md#FR-01
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-thin-user-decision-record:flow:测试绑定FR-01
  tests: test/thin-user-decision-record.test.mjs「① 横幅纪律行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-thin-user-decision-record
  status: active

## FR-cli-entry-563 断点②行含汇报对账半句（执行期用户决策随汇报对账，无则说明无）
变更：2026-10-20-thin-user-decision-record
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 全新轻量变更 flow start 横幅；When 三断点纪律段渲染；Then 断点②行可匹配 /执行断点/ 且含 /对账|decisions/ 的对账半句
全文：.sillyspec/changes/archive/2026-10-20-thin-user-decision-record/requirements.md#FR-02
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-thin-user-decision-record:flow:测试绑定FR-02
  tests: test/thin-user-decision-record.test.mjs「② 断点②对账半句」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-thin-user-decision-record
  status: active

## FR-cli-entry-564 task tick 回显在 decisions.md 缺席时附落盘提示行，decisions.md 在场时零新增行（条件 gating，纯提示不阻断不改 exit code）
变更：2026-10-20-thin-user-decision-record
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 在途轻量变更且无 decisions.md；When `task tick` 成功翻格 同变更创建 decisions.md 后再 tick；Then stdout 含 /decisions add/ 提示行且 exit 0 stdout 不含该提示行且既有回显不变
全文：.sillyspec/changes/archive/2026-10-20-thin-user-decision-record/requirements.md#FR-03
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-thin-user-decision-record:flow:测试绑定FR-03
  tests: test/thin-user-decision-record.test.mjs「③ tick 条件提示」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-thin-user-decision-record
  status: active

## FR-cli-entry-565 新增测试套件覆盖以上三面且全绿；既有 approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 套件零回归
变更：2026-10-20-thin-user-decision-record
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更交付完成；When `node --test` 跑新套件与四既有套件；Then 全部 pass、零 fail
全文：.sillyspec/changes/archive/2026-10-20-thin-user-decision-record/requirements.md#FR-04
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-thin-user-decision-record:flow:测试绑定FR-04
  tests: test/thin-user-decision-record.test.mjs「④ 既有套件零回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-thin-user-decision-record
  status: active

## FR-cli-entry-566 评审任务书复跑口径节（必须）
变更：2026-10-21-review-rerun-scope
状态：active
摘要：主路径——评审员读任务书
场景正文：
- 场景：主路径——评审员读任务书 — Given 评审子代理收到任务书；When 执行检查单第 1 条（测试真存在且断言该行为）；Then 按变更测试面合并复跑+回执抽验，不跑全量。
全文：.sillyspec/changes/archive/2026-10-21-review-rerun-scope/requirements.md#FR-01
最近确认：ecc9d4b66c9eddfb87670f0b7dfc0b82170ecd2f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-rerun-scope:flow:测试绑定FR-01
  tests: test/review-rerun-scope.test.mjs「任务书复跑口径五要素锚」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-rerun-scope
  status: active

## FR-cli-entry-567 材料包 ledger 测试回执子源（必须）
变更：2026-10-21-review-rerun-scope
状态：active
摘要：主路径——收口评审带回执；边界——回执缺席
场景正文：
- 场景：主路径——收口评审带回执 — Given ledger 刚实测完（verify-runs 有本变更 test-result.json）；When review 子步渲染任务书+材料包；Then 包内含回执行，评审员抽验复核而非重跑。
- 场景：边界——回执缺席 — Given verify-runs 无匹配（首次/被清理）；Then 包零回执行，口径节仍指引按变更测试面复跑。
全文：.sillyspec/changes/archive/2026-10-21-review-rerun-scope/requirements.md#FR-02
最近确认：ecc9d4b66c9eddfb87670f0b7dfc0b82170ecd2f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-rerun-scope:flow:测试绑定FR-02
  tests: test/review-rerun-scope.test.mjs「回执扫描取最新+装配在场/缺席」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-rerun-scope
  status: active

## FR-cli-entry-568 测试覆盖与 scoped 自验（必须）
变更：2026-10-21-review-rerun-scope
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When node --test 新测试 + 受影响面 + lint；Then 全过零失败。
全文：.sillyspec/changes/archive/2026-10-21-review-rerun-scope/requirements.md#FR-03
最近确认：ecc9d4b66c9eddfb87670f0b7dfc0b82170ecd2f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-rerun-scope:flow:测试绑定FR-03
  tests: test/review-rerun-scope.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-rerun-scope
  status: active

## FR-cli-entry-569 worker 把 review JSON 放 answer 正文（artifacts 空/不可解析）时，--status 能经第三通道回收落盘 review.json（channel=platform 落款不变）
变更：2026-10-21-review-dispatch-answer-salvage
状态：active
摘要：answer 正文回收（dsh 实证形态）；向后兼容
全文：.sillyspec/changes/archive/2026-10-21-review-dispatch-answer-salvage/requirements.md#FR-01
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-dispatch-answer-salvage:flow:测试绑定FR-01
  tests: test/review-dispatch.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-dispatch-answer-salvage
  status: active

## FR-cli-entry-570 getWorkerResult 返回值含 answer 原文且既有消费方零回归（既有测试全绿）
变更：2026-10-21-review-dispatch-answer-salvage
状态：active
摘要：answer 透传；既有消费方零回归
全文：.sillyspec/changes/archive/2026-10-21-review-dispatch-answer-salvage/requirements.md#FR-02
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-dispatch-answer-salvage:flow:测试绑定FR-02
  tests: test/sillyhub-mcp-platform-fixes.test.mjs「getWorkerResult 增返 answer/result 原文（answer 优先 / result 兜底 / 双缺 null / unavailable answer:null / 既有断言同步新 shape）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-dispatch-answer-salvage
  status: active

## FR-cli-entry-571 completed-no-artifact 文案含 --salvage/--from 两步指引、不含「--kill 降级」
变更：2026-10-21-review-dispatch-answer-salvage
状态：active
摘要：失败指引改写
全文：.sillyspec/changes/archive/2026-10-21-review-dispatch-answer-salvage/requirements.md#FR-03
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-dispatch-answer-salvage:flow:测试绑定FR-03
  tests: test/review-dispatch.test.mjs「completed-no-artifact 文案：含 --salvage/--from 两步指引、不含 --kill、含降级兜底」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-dispatch-answer-salvage
  status: active

## FR-cli-entry-572 --status --salvage 落盘 worker-answer.md 于 stage-reviews run 目录
变更：2026-10-21-review-dispatch-answer-salvage
状态：active
摘要：salvage 兜底；正常回收也留原文
全文：.sillyspec/changes/archive/2026-10-21-review-dispatch-answer-salvage/requirements.md#FR-04
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-dispatch-answer-salvage:flow:测试绑定FR-04
  tests: test/review-dispatch.test.mjs「--salvage：worker-answer.md 落盘 run 目录 + salvagePath/--from 指引；正常回收路径亦留原文」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-dispatch-answer-salvage
  status: active

## FR-cli-entry-573 任务书含 json 块指引；新增+受影响测试全绿 + lint 绿
变更：2026-10-21-review-dispatch-answer-salvage
状态：active
摘要：任务书双出口
全文：.sillyspec/changes/archive/2026-10-21-review-dispatch-answer-salvage/requirements.md#FR-05
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-review-dispatch-answer-salvage:flow:测试绑定FR-05
  tests: test/review-dispatch.test.mjs「任务书产出段含 ```json 块兜底指引（既有 artifacts 指引不丢）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-review-dispatch-answer-salvage
  status: active

## FR-cli-entry-574 三读侧 YAML 双引号反转义对称（必须）
变更：2026-10-21-known-failures-unescape
状态：active
摘要：round-trip；三读侧一致
全文：.sillyspec/changes/archive/2026-10-21-known-failures-unescape/requirements.md#FR-01
最近确认：ea05501b7c2b0060d8542a2933d0209a25bcfe19

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-known-failures-unescape:flow:测试绑定FR-01
  tests: test/known-failures-unescape.test.mjs「round-trip：含反斜杠锚定模式 add→三读侧解析原样→judgeTapOutput 豁免命中」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-known-failures-unescape
  status: active

## FR-cli-entry-575 CLI remove 诚实文案 + 原样键匹配（必须）
变更：2026-10-21-known-failures-unescape
状态：active
摘要：remove 全命中；remove 部分未命中
全文：.sillyspec/changes/archive/2026-10-21-known-failures-unescape/requirements.md#FR-02
最近确认：ea05501b7c2b0060d8542a2933d0209a25bcfe19

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-known-failures-unescape:flow:测试绑定FR-02
  tests: test/known-failures-unescape.test.mjs「remove 诚实文案：全命中无未命中括注 / 部分未命中仅注记未命中键 + 原样键匹配」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-known-failures-unescape
  status: active

## FR-cli-entry-576 测试与既有面（必须）
变更：2026-10-21-known-failures-unescape
状态：active
摘要：测试面
全文：.sillyspec/changes/archive/2026-10-21-known-failures-unescape/requirements.md#FR-03
最近确认：ea05501b7c2b0060d8542a2933d0209a25bcfe19

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-known-failures-unescape:flow:测试绑定FR-03
  tests: test/known-failures-unescape.test.mjs「回归面：config-known-failures / verify-postcheck-known-failures / doctor-local-yaml 复跑 0 失败」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-known-failures-unescape
  status: active

## FR-cli-entry-577 flow verify-drafts 只读自查（与批准门同判定同源）
变更：2026-10-23-flow-verify-drafts
状态：active
摘要：骨架未答自查；答齐通过
场景正文：
- 场景：骨架未答自查 — Given flow start 后 v2 骨架未作答（design 四节空、FR 待撰写、绑定待填）；When 运行 `flow verify-drafts --chan
- 场景：答齐通过 — Given 四节/FR 行为句/绑定行全部答齐；When 运行同命令；Then exit 0、输出通过行与批准指引、零写盘。
全文：.sillyspec/changes/archive/2026-10-23-flow-verify-drafts/requirements.md#FR-01
最近确认：79f8808bb65338c6012af930f10b798f32f9e9ba

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-verify-drafts:flow:测试绑定FR-01
  tests: test/flow-verify-drafts.test.mjs「①骨架未答 exit1 全列+零写盘」 | test/flow-verify-drafts.test.mjs「②答齐 exit0 通过行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-verify-drafts
  status: active

## FR-cli-entry-578 --json 结构化输出与人类渲染同判定同退出码
变更：2026-10-23-flow-verify-drafts
状态：active
摘要：fail 态 JSON
场景正文：
- 场景：fail 态 JSON — Given 骨架未答；When 运行 `flow verify-drafts --change <名> --json`；Then stdout 为可解析单对象、violat
全文：.sillyspec/changes/archive/2026-10-23-flow-verify-drafts/requirements.md#FR-02
最近确认：79f8808bb65338c6012af930f10b798f32f9e9ba

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-verify-drafts:flow:测试绑定FR-02
  tests: test/flow-verify-drafts.test.mjs「③--json 同判定同退出码」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-verify-drafts
  status: active

## FR-cli-entry-579 错误路径与 approve 零变化
变更：2026-10-23-flow-verify-drafts
状态：active
摘要：变更缺失
场景正文：
- 场景：变更缺失 — Given 指定变更目录不存在；When 运行 verify-drafts；Then exit 2、文案指向 flow start。
全文：.sillyspec/changes/archive/2026-10-23-flow-verify-drafts/requirements.md#FR-03
最近确认：79f8808bb65338c6012af930f10b798f32f9e9ba

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-verify-drafts:flow:测试绑定FR-03
  tests: test/approve-gate-tick.test.mjs「①-③ approve 回归锚零改动全绿」 | test/flow-verify-drafts.test.mjs「④missing/非法 exit2」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-verify-drafts
  status: active

## FR-cli-entry-580 flow start 横幅断点① 增起草自查指引
变更：2026-10-23-flow-verify-drafts
状态：active
摘要：横幅指引行
场景正文：
- 场景：横幅指引行 — Given 全新 flow start 渲染；Then 断点① 块输出含 `flow verify-drafts` 字样的自查指引行。
全文：.sillyspec/changes/archive/2026-10-23-flow-verify-drafts/requirements.md#FR-04
最近确认：79f8808bb65338c6012af930f10b798f32f9e9ba

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-verify-drafts:flow:测试绑定FR-04
  tests: test/flow-verify-drafts.test.mjs「⑤start 横幅断点①含自查指引行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-verify-drafts
  status: active

## FR-cli-entry-581 实测门前只读收口预检（fail-together 一次报全）
变更：2026-10-23-flow-done-preflight
状态：active
摘要：dirty 命中预检拦截；处置旗标镜像放行
场景正文：
- 场景：dirty 命中预检拦截 — Given 共享主仓存在未提交交付文件（collectFreezeFiles dirtyWarned 非空）且未带处置旗标；When 运行 flow done；Then 在
- 场景：处置旗标镜像放行 — 
全文：.sillyspec/changes/archive/2026-10-23-flow-done-preflight/requirements.md#FR-01
最近确认：32b0e919913c1c6f2a09017400bee7525e860ab6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-done-preflight:flow:测试绑定FR-01
  tests: test/flow-done-preflight.test.mjs「①dirty 命中实测未启动+一次报全」 | test/flow-done-preflight.test.mjs「②--accept-dirty-gap 镜像放行完成收口」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-done-preflight
  status: active

## FR-cli-entry-582 预检与权威门同判定同源、全过静默
变更：2026-10-23-flow-done-preflight
状态：active
摘要：断点续不误拦；turbo 镜像
场景正文：
- 场景：断点续不误拦 — Given 首轮 dirty 拦截后带处置旗标重跑通过且 patch 子步完成；When 后续重跑（无旗标）；Then 预检因 patch 子步已 done 跳过 dirt
- 场景：turbo 镜像 — Given turbo 在场且 dirty 缺口在场；When 预检运行；Then 不产 dirty-gap finding（权威门 turbo 路径同款降 advisor
全文：.sillyspec/changes/archive/2026-10-23-flow-done-preflight/requirements.md#FR-02
最近确认：32b0e919913c1c6f2a09017400bee7525e860ab6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-done-preflight:flow:测试绑定FR-02
  tests: test/flow-done-preflight.test.mjs「③unit 镜像守卫（patchDone/turbo/freezeDirty 不拦）」 | test/flow-done-preflight.test.mjs「④干净面全过预检静默」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-done-preflight
  status: active

## FR-cli-entry-583 处置后重走既有断点续语义
变更：2026-10-23-flow-done-preflight
状态：active
摘要：处置后放行
场景正文：
- 场景：处置后放行 — Given 预检拦 dirty 后重跑带 --accept-dirty-gap；Then 预检通过、实测照常启动、收口完成且 change-patch.json 留痕 ac
全文：.sillyspec/changes/archive/2026-10-23-flow-done-preflight/requirements.md#FR-03
最近确认：32b0e919913c1c6f2a09017400bee7525e860ab6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-done-preflight:flow:测试绑定FR-03
  tests: test/flow-done-preflight.test.mjs「②--accept-dirty-gap 镜像放行完成收口」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-done-preflight
  status: active

## FR-cli-entry-584 e2e+unit 测试锁行为
变更：2026-10-23-flow-done-preflight
状态：active
摘要：测试矩阵
场景正文：
- 场景：测试矩阵 — Given temp 仓与直调各场景；When 分别执行；Then 断言如上各自成立。
全文：.sillyspec/changes/archive/2026-10-23-flow-done-preflight/requirements.md#FR-04
最近确认：32b0e919913c1c6f2a09017400bee7525e860ab6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-flow-done-preflight:flow:测试绑定FR-04
  tests: test/flow-done-preflight.test.mjs「①-④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-flow-done-preflight
  status: active

## FR-cli-entry-585 dirty_gate_ignore 配置键与单一源剔除
变更：2026-10-23-dirty-gate-ignore
状态：active
摘要：配置命中剔除；unit 返回
场景正文：
- 场景：配置命中剔除 — 
- 场景：unit 返回 — Given 直调 collectFreezeFiles 且 dirty 面含命中与未命中文件；Then dirtyWarned 只含未命中文件、dirtyIgnored 只
全文：.sillyspec/changes/archive/2026-10-23-dirty-gate-ignore/requirements.md#FR-01
最近确认：932698f0db4294d0492efd7610a1f6aac2bb7a2e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-dirty-gate-ignore:flow:测试绑定FR-01
  tests: test/dirty-gate-ignore.test.mjs「②配置命中剔除+完成收口+留痕行」 | test/dirty-gate-ignore.test.mjs「④unit dirtyIgnored/dirtyWarned 切分」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-dirty-gate-ignore
  status: active

## FR-cli-entry-586 三态 fail-soft 零回归
变更：2026-10-23-dirty-gate-ignore
状态：active
摘要：未配置零回归
场景正文：
- 场景：未配置零回归 — Given 残渣文件在场但未配置 dirty_gate_ignore；When 运行 flow done；Then 照常阻断（既有文案原样），无剔除留痕行。
全文：.sillyspec/changes/archive/2026-10-23-dirty-gate-ignore/requirements.md#FR-02
最近确认：932698f0db4294d0492efd7610a1f6aac2bb7a2e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-dirty-gate-ignore:flow:测试绑定FR-02
  tests: test/dirty-gate-ignore.test.mjs「①未配置照常阻断（零回归锚）」 | test/dirty-gate-ignore.test.mjs「③前缀不命中照常阻断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-dirty-gate-ignore
  status: active

## FR-cli-entry-587 预检同源继承与文案同步
变更：2026-10-23-dirty-gate-ignore
状态：active
摘要：预检继承
场景正文：
- 场景：预检继承 — Given 配置命中残渣且 dirty 面仅残渣；When 运行 flow done；Then 预检零 finding（实测照常启动），权威门留 ℹ️ 剔除行后完成。
全文：.sillyspec/changes/archive/2026-10-23-dirty-gate-ignore/requirements.md#FR-03
最近确认：932698f0db4294d0492efd7610a1f6aac2bb7a2e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-dirty-gate-ignore:flow:测试绑定FR-03
  tests: test/dirty-gate-ignore.test.mjs「②配置命中剔除+完成收口+留痕行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-dirty-gate-ignore
  status: active

## FR-cli-entry-588 测试矩阵
变更：2026-10-23-dirty-gate-ignore
状态：active
摘要：四态
场景正文：
- 场景：四态 — Given temp 仓与直调各场景；When 分别执行；Then 断言各自成立。
全文：.sillyspec/changes/archive/2026-10-23-dirty-gate-ignore/requirements.md#FR-04
最近确认：932698f0db4294d0492efd7610a1f6aac2bb7a2e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-dirty-gate-ignore:flow:测试绑定FR-04
  tests: test/dirty-gate-ignore.test.mjs「①-④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-dirty-gate-ignore
  status: active

## FR-cli-entry-589 turbo docs-auto 常设授权档与自动降档
变更：2026-10-23-turbo-docs-auto
状态：active
摘要：纯文档面自动降档；旗标档不变
场景正文：
- 场景：纯文档面自动降档 — Given local.yaml 配 turbo: docs-auto，变更交付面仅文档（docs/note.md，盲维四问实质作答——无本档必评）；When 运行 flo
- 场景：旗标档不变 — Given --turbo 旗标档（st.turbo=true）；When 运行 flow done；Then 行为与改动前逐字一致（turboSource=flag，re
全文：.sillyspec/changes/archive/2026-10-23-turbo-docs-auto/requirements.md#FR-01
最近确认：6df7e3d814ae3a9eab2395d7a61660aaba9f60e8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-turbo-docs-auto:flow:测试绑定FR-01
  tests: test/turbo-docs-auto.test.mjs「①配置+纯文档面→完成无任务书+授权源行」 | test/turbo-docs-auto.test.mjs「④旗标档 reason 原样」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-turbo-docs-auto
  status: active

## FR-cli-entry-590 fail-closed 面判定与零回归
变更：2026-10-23-turbo-docs-auto
状态：active
摘要：含代码面不降档；未配置零回归
场景正文：
- 场景：含代码面不降档 — Given 配置在场但交付面含 src/work.js；When 运行 flow done；Then 不降档：评审照常定档（盲维实质作答→任务书 exit 1）、无 tur
- 场景：未配置零回归 — Given 同纯文档面但未配置键；When 运行 flow done；Then 评审照常定档（任务书 exit 1）——豁免来自配置而非面本身。
全文：.sillyspec/changes/archive/2026-10-23-turbo-docs-auto/requirements.md#FR-02
最近确认：6df7e3d814ae3a9eab2395d7a61660aaba9f60e8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-turbo-docs-auto:flow:测试绑定FR-02
  tests: test/turbo-docs-auto.test.mjs「②同面未配置→任务书照常」 | test/turbo-docs-auto.test.mjs「③配置+src 面→不降档任务书照常」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-turbo-docs-auto
  status: active

## FR-cli-entry-591 授权源可观测
变更：2026-10-23-turbo-docs-auto
状态：active
摘要：reason 区分授权源
场景正文：
- 场景：reason 区分授权源 — Given docs-auto 降档收口；Then gate reason 含 `local.yaml turbo: docs-auto` 且不含 `用户显式触发`。
全文：.sillyspec/changes/archive/2026-10-23-turbo-docs-auto/requirements.md#FR-03
最近确认：6df7e3d814ae3a9eab2395d7a61660aaba9f60e8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-turbo-docs-auto:flow:测试绑定FR-03
  tests: test/turbo-docs-auto.test.mjs「①配置+纯文档面→完成无任务书+授权源行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-turbo-docs-auto
  status: active

## FR-cli-entry-592 测试矩阵
变更：2026-10-23-turbo-docs-auto
状态：active
摘要：四态
场景正文：
- 场景：四态 — Given temp 仓与直调各场景；When 分别执行；Then 断言各自成立。
全文：.sillyspec/changes/archive/2026-10-23-turbo-docs-auto/requirements.md#FR-04
最近确认：6df7e3d814ae3a9eab2395d7a61660aaba9f60e8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-turbo-docs-auto:flow:测试绑定FR-04
  tests: test/turbo-docs-auto.test.mjs「①-④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-turbo-docs-auto
  status: active

## FR-cli-entry-593 review_inline_wait 配置键与平台单调用派发
变更：2026-10-23-review-inline-dispatch
状态：active
摘要：单调用回收
场景正文：
- 场景：单调用回收 — 
全文：.sillyspec/changes/archive/2026-10-23-review-inline-dispatch/requirements.md#FR-01
最近确认：07565eb7366003febf78168fba95f31a271bb708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-review-inline-dispatch:flow:测试绑定FR-01
  tests: test/review-inline-dispatch.test.mjs「①fake client 成功单调用回收（落盘+reviewer+同源登记消费）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-review-inline-dispatch
  status: active

## FR-cli-entry-594 回退面零损失（任何失败回退现状任务书面）
变更：2026-10-23-review-inline-dispatch
状态：active
摘要：键未配置零回归；超时回退
场景正文：
- 场景：键未配置零回归 — Given 键未配置；When 必评变更收口；Then 行为与改动前逐字一致（任务书+exit 1，无 inline 尝试行）。
- 场景：超时回退 — Given 键=5 且平台 5s 未完成；When 收口；Then 打印一行超时留痕（含 missionId 指引）后任务书面照常 exit 1。
全文：.sillyspec/changes/archive/2026-10-23-review-inline-dispatch/requirements.md#FR-02
最近确认：07565eb7366003febf78168fba95f31a271bb708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-review-inline-dispatch:flow:测试绑定FR-02
  tests: test/review-inline-dispatch.test.mjs「②probe 不可用回退」 | test/review-inline-dispatch.test.mjs「③超时回退」 | test/review-inline-dispatch.test.mjs「⑤e2e 键未配置零回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-review-inline-dispatch
  status: active

## FR-cli-entry-595 提取与登记单一源
变更：2026-10-23-review-inline-dispatch
状态：active
摘要：同源登记
场景正文：
- 场景：同源登记 — Given inline 回收 verdict=FAIL+P1；Then 走既有 FAIL 拦截分支（不许归档），与子代理路径同判定。
全文：.sillyspec/changes/archive/2026-10-23-review-inline-dispatch/requirements.md#FR-03
最近确认：07565eb7366003febf78168fba95f31a271bb708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-review-inline-dispatch:flow:测试绑定FR-03
  tests: test/review-inline-dispatch.test.mjs「④坏 JSON 回退（validateReviewJson 同一源拒收）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-review-inline-dispatch
  status: active

## FR-cli-entry-596 测试矩阵
变更：2026-10-23-review-inline-dispatch
状态：active
摘要：矩阵
场景正文：
- 场景：矩阵 — Given fake client 与 temp 仓各场景；When 分别执行；Then 断言各自成立。
全文：.sillyspec/changes/archive/2026-10-23-review-inline-dispatch/requirements.md#FR-04
最近确认：07565eb7366003febf78168fba95f31a271bb708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-review-inline-dispatch:flow:测试绑定FR-04
  tests: test/review-inline-dispatch.test.mjs「①-⑤＋readFlowConfig 键三态 unit」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-review-inline-dispatch
  status: active

## FR-cli-entry-597 readFrRegressCap 语义 v2（缺省翻转）
变更：2026-10-23-fr-regress-default-off
状态：active
摘要：缺省即 off；all 显式恢复旧行为
场景正文：
- 场景：缺省即 off — Given temp 仓 local.yaml 无 fr_regress_cap 键且 FR 索引非空；When 组面；Then FR 层零文件进实测面、披露行在场（0/N
- 场景：all 显式恢复旧行为 — Given 键=all；When 组面；Then FR 绑定面全部进实测面（旧行为），无帽披露行。
全文：.sillyspec/changes/archive/2026-10-23-fr-regress-default-off/requirements.md#FR-01
最近确认：5949a4e473957a99c378b9684da1f0e7d1b8871b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-fr-regress-default-off:flow:测试绑定FR-01
  tests: test/fr-regress-cap.test.mjs「②readFrRegressCap v2 五态（缺省 0/all null/N/off/坏值）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-fr-regress-default-off
  status: active

## FR-cli-entry-598 披露与教学面反映新缺省
变更：2026-10-23-fr-regress-default-off
状态：active
摘要：文案如实
场景正文：
- 场景：文案如实 — Given 缺省 off 且 FR 索引非空；When 收口组面；Then 信息行描述为「本变更测试 ∪ import 依赖（FR 关联回归层缺省不跑…）」而非宣称含 FR
全文：.sillyspec/changes/archive/2026-10-23-fr-regress-default-off/requirements.md#FR-02
最近确认：5949a4e473957a99c378b9684da1f0e7d1b8871b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-fr-regress-default-off:flow:测试绑定FR-02
  tests: test/dynamic-test-inference.test.mjs「缺省 dynamic-empty reason 如实（评审 P1 修复锚）」 | test/fr-regress-cap.test.mjs「③本仓缺省断言与消费点单一源锚（披露行开启指引文案锚）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-fr-regress-default-off
  status: active

## FR-cli-entry-599 既有面适配与本仓配置收敛
变更：2026-10-23-fr-regress-default-off
状态：active
摘要：夹具适配
场景正文：
- 场景：夹具适配 — Given fr-priority-overlap 夹具显式 all；When 跑套件；Then 旧断言（fr 标签/优先面）原样通过。
全文：.sillyspec/changes/archive/2026-10-23-fr-regress-default-off/requirements.md#FR-03
最近确认：5949a4e473957a99c378b9684da1f0e7d1b8871b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-fr-regress-default-off:flow:测试绑定FR-03
  tests: test/fr-priority-overlap.test.mjs「夹具显式 all 旧断言原样绿」 | test/fr-regress-cap.test.mjs「③本仓键缺席断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-fr-regress-default-off
  status: active

## FR-cli-entry-600 测试矩阵
变更：2026-10-23-fr-regress-default-off
状态：active
摘要：矩阵
场景正文：
- 场景：矩阵 — Given 直调与文本锚各形态；When 分别执行；Then 断言各自成立。
全文：.sillyspec/changes/archive/2026-10-23-fr-regress-default-off/requirements.md#FR-04
最近确认：5949a4e473957a99c378b9684da1f0e7d1b8871b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-fr-regress-default-off:flow:测试绑定FR-04
  tests: test/dynamic-test-inference.test.mjs「两相 E2E」 | test/fr-regress-cap.test.mjs「①②③」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-fr-regress-default-off
  status: active

## FR-cli-entry-601 知识文件 section 支持作用域标记（scope: always / scope: repo / scope: module:域[,域]，HTML 注释形态；标记置于 heading 后、本节内有效；无标记=关键词现状不注入）；collectScopedKnowledge(knowledgeRoot) 解析 top-level knowledge/*.md（INDEX.md 除外）产出 always/repo/modules{域:[条目]}，条目含 file#heading 标识与首行摘要（≤80 字）
变更：2026-10-23-knowledge-scope-inject
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-23-knowledge-scope-inject/requirements.md#FR-01
最近确认：e27c3af6f1acf04b7151592483a1f327eff2c2a8

## FR-cli-entry-602 flowKnowledgeDigest 注入：always+repo 每次调用恒注入（≤5 条+溢出计数行，块头之后 FR 段之前）；module 作用域条目仅当 domains（resolveTouchedDomains 同源）命中该域时注入；关键词/否决决策/FR 段零改动；解析读取 fail-soft 空态零输出（缺省零回归）
变更：2026-10-23-knowledge-scope-inject
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-23-knowledge-scope-inject/requirements.md#FR-02
最近确认：e27c3af6f1acf04b7151592483a1f327eff2c2a8

## FR-cli-entry-603 工具内置中立性行每变更恒注入（规约 00：不枚举开放世界/不锁死语言框架——CLI 自有分类（批类别/路径集合），新增语言只加探测适配）——消费仓无需任何配置即获得
变更：2026-10-23-knowledge-scope-inject
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-23-knowledge-scope-inject/requirements.md#FR-03
最近确认：e27c3af6f1acf04b7151592483a1f327eff2c2a8

## FR-cli-entry-604 测试：collectScopedKnowledge 三态（always/repo/module 解析、无标记不产出、坏文件 fail-soft）＋flowKnowledgeDigest 集成（恒注入条目+内置行在场；无 scoped 条目输出与改动前逐字一致）＋既有 knowledge 族套件回归绿
变更：2026-10-23-knowledge-scope-inject
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-23-knowledge-scope-inject/requirements.md#FR-04
最近确认：e27c3af6f1acf04b7151592483a1f327eff2c2a8

## FR-cli-entry-605 push-cli 新增「区间含已推送提交拒绝」「merge commit 拒绝」两个真仓守卫用例并绿
变更：2026-10-23-push-review-debt
状态：active
摘要：区间含已推送提交；区间含 merge commit
全文：.sillyspec/changes/archive/2026-10-23-push-review-debt/requirements.md#FR-01
最近确认：05de635886c0f34b498cba3e63255deea4601504

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-push-review-debt:flow:测试绑定FR-01
  tests: test/push-cli.test.mjs「守卫：区间含 merge commit 拒绝」 | test/push-cli.test.mjs「守卫：区间含已推送提交拒绝」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-push-review-debt
  status: active

## FR-cli-entry-606 tag 指向压扁区间时计划输出 warning；全无签名提交时不产生签名 warning；签名检测逻辑有纯函数测试锚
变更：2026-10-23-push-review-debt
状态：active
摘要：tag 落在压扁区间；全无签名
全文：.sillyspec/changes/archive/2026-10-23-push-review-debt/requirements.md#FR-02
最近确认：05de635886c0f34b498cba3e63255deea4601504

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-push-review-debt:flow:测试绑定FR-02
  tests: test/push-cli.test.mjs「tag 落压扁区间告警与无签名零误报」 | test/push-plan.test.mjs「签名标记解析纯函数」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-push-review-debt
  status: active

## FR-cli-entry-607 pre-push hook 失败时 human 模式实时透传 hook 输出（报错一次给全），--json 模式错误信息含 stderr；git-helper 注释与实现对齐
变更：2026-10-23-push-review-debt
状态：active
摘要：hook 失败
全文：.sillyspec/changes/archive/2026-10-23-push-review-debt/requirements.md#FR-03
最近确认：05de635886c0f34b498cba3e63255deea4601504

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-push-review-debt:flow:测试绑定FR-03
  tests: test/push-cli.test.mjs「pre-push hook 失败：human 透传与 json 含 stderr」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-push-review-debt
  status: active

## FR-cli-entry-608 lint 绿、变更面测试绿
变更：2026-10-23-push-review-debt
状态：active
摘要：验收
全文：.sillyspec/changes/archive/2026-10-23-push-review-debt/requirements.md#FR-04
最近确认：05de635886c0f34b498cba3e63255deea4601504

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-23-push-review-debt:flow:测试绑定FR-04
  tests: test/push-cli.test.mjs「守卫：区间含已推送提交拒绝」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-23-push-review-debt
  status: active
