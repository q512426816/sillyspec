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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试门实测通过+工件指纹校验通过
全文：.sillyspec/changes/archive/2026-09-22-thin-fr-distill-sync/requirements.md#FR-01
最近确认：38a25f17

## FR-cli-entry-002 flow start 为每个新变更机器起草 changes/<名>/design
变更：2026-09-24-thin-design-record
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 为每个新变更机器起草 changes/<名>/design.md：四节骨架（做法概述/接口契约/边界与并发盲维四问/风险与死路），机器段为
全文：.sillyspec/changes/archive/2026-09-24-thin-design-record/requirements.md#FR-01
最近确认：bd4f574726c2121743dd65e3e5f38f51f792c494

## FR-cli-entry-003 flow done 工件子步对 design.md 做指纹三态校验，且 AGEN
变更：2026-09-24-thin-design-record
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 工件子步对 design.md 做指纹三态校验，且 AGENT 槽空槽拒收（写不适用加理由视作已填）
全文：.sillyspec/changes/archive/2026-09-24-thin-design-record/requirements.md#FR-02
最近确认：bd4f574726c2121743dd65e3e5f38f51f792c494

## FR-cli-entry-004 新增测试覆盖骨架生成与空槽拒收两档用例，flow 系测试面全绿
变更：2026-09-24-thin-design-record
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖骨架生成与空槽拒收两档用例，flow 系测试面全绿
全文：.sillyspec/changes/archive/2026-09-24-thin-design-record/requirements.md#FR-03
最近确认：bd4f574726c2121743dd65e3e5f38f51f792c494

## FR-cli-entry-005 flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledg
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledger 合并不改既有段；criteria 来源优先从既有 proposal 成功标
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-01
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-006 flow done 的 ledger 门与 distill 的 delivera
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done 的 ledger 门与 distill 的 deliverableFiles 都经并行会话归属切分（复用 splitOwnVsForeign
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-02
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-007 flow done ledger 子步收尾输出实测面对账行（test/lint
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow done ledger 子步收尾输出实测面对账行（test/lint 命令、时长、结果文件路径）
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-03
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-008 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
变更：2026-09-25-thin-dogfood-fixes
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-dogfood-fixes/requirements.md#FR-04
最近确认：654baef97fe80f4cdc317e009c7403fe8e159abf

## FR-cli-entry-009 flow done 新增 patch 子步（ledger 后 noAI）：bui
变更：2026-09-25-thin-patch-bindings
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 需求清晰度门：--input 缺失或成功标准提取 0 条时 exit 2 并给两选一（头脑风暴预段 / 补成功标准重跑）；重入与 adop
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-01
最近确认：82b3d9c1e86c166f8b7ba9fb2fdfe3721bd369fe

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
  status: active

## FR-cli-entry-017 adopt 收编：变更目录存在 brainstorm 产物（proposal/d
变更：2026-09-25-thin-brainstorm-prestage
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-04
最近确认：82b3d9c1e86c166f8b7ba9fb2fdfe3721bd369fe

## FR-cli-entry-020 新增测试覆盖清晰度门/adopt 收编/绑定槽追加；flow 系测试全绿
变更：2026-09-25-thin-brainstorm-prestage
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction 规则同步（升厚需用户同意）
全文：.sillyspec/changes/archive/2026-09-25-thin-upgrade-consent/requirements.md#FR-03
最近确认：c80addc013fb9cd8c4277ebb94626e66c44b7d49

## FR-cli-entry-029 测试：无 flag 拒跑/带 flag 放行留痕两态；flow 系全绿
变更：2026-09-25-thin-upgrade-consent
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试四件；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-parity-assets/requirements.md#FR-05
最近确认：1d997c601a4a9f95cb43244d40dcd1bc446a7430

## FR-cli-entry-035 cmdFlow 的 specBase 改经 resolvePlatformSpe
变更：2026-09-25-thin-platform-args
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留）、空目录预建放行、名称校验四态、指针恢复；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-platform-args/requirements.md#FR-05
最近确认：f7ef9258f9f1df6260e12734370b162d48aa0234

## FR-cli-entry-040 package.json 版本 3.29.6→3.30.0（AGENTS.md
变更：2026-09-25-thin-release-pack
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then package.json 版本 3.29.6→3.30.0（AGENTS.md 受管段版本差升级链解锁）
全文：.sillyspec/changes/archive/2026-09-25-thin-release-pack/requirements.md#FR-01
最近确认：a0ba25c12d8e23f99e4c530656aae68854c45617

## FR-cli-entry-041 flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收
变更：2026-09-25-thin-release-pack
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-release-pack/requirements.md#FR-04
最近确认：a0ba25c12d8e23f99e4c530656aae68854c45617

## FR-cli-entry-044 flow start 删除复杂度预判块（classifyChange 关键词升厚
变更：2026-09-25-thin-precheck-removal
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction 规则 5 同步（选道不看技术关键词，风险面归收口评审证据判定）
全文：.sillyspec/changes/archive/2026-09-25-thin-precheck-removal/requirements.md#FR-03
最近确认：b4cfb50860532d62fdc3ee5c2185cf8c36d11252

## FR-cli-entry-047 flow 系全绿
变更：2026-09-25-thin-precheck-removal
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-precheck-removal/requirements.md#FR-04
最近确认：b4cfb50860532d62fdc3ee5c2185cf8c36d11252

## FR-cli-entry-048 run/complete.js 的 --done 链接入 detectFakeC
变更：2026-09-25-sentinel-wiring
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then flow 系与 test:core 全绿
全文：.sillyspec/changes/archive/2026-09-25-sentinel-wiring/requirements.md#FR-05
最近确认：2b5c087f8dde8981ca11fbdc24cc3c1c525ae4c3

## FR-cli-entry-053 extractSuccessCriteria 增编号条目通道：正文存在三条以上编
变更：2026-09-25-thin-fr-quality
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then 新增测试三件；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-fr-quality/requirements.md#FR-04
最近确认：716288a224048fda0dd7514aacfa058d974e0c57

## FR-cli-entry-057 patch 冻结面双修：flow start 简报钉死交付代码先提交再 done
变更：2026-09-25-thin-r16-patches
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then 新增测试覆盖三件；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-r16-patches/requirements.md#FR-04
最近确认：3a2020e4b658fd3f1ac05363536abea551f12db7

## FR-cli-entry-061 FR 区 agent 直写架构
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
待复核：recent-quick
场景正文：
- 场景：默认场景 — Given 轻量变更的 requirements 需 agent 填写行为语义；When flow start 生成骨架后 agent 直接书写；Then FR 质量由 agent 保证、不走 amend、不触发 edit_ratio
全文：.sillyspec/changes/archive/2026-09-25-fr-agent-writable/requirements.md#FR-01
最近确认：401baa221bbc37b0a88ad29ab83289c14631e0ca

## FR-cli-entry-062 draftRequirements：FR 区从 MACHINE-DRAFT 指纹段改为 AGENT 槽（agent 直接书写）；input 提取的标准条目以注释形式放在槽内做参考（非约束，可采纳/改写/忽略）；绑定槽保持现有模式不变
变更：2026-09-25-fr-agent-writable
状态：active
摘要：默认场景
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
待复核：recent-quick
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
