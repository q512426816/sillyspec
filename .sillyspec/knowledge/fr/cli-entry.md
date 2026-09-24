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
状态：active
摘要：默认场景
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
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction.md 模板核心规则改为薄流程主推+头脑风暴预段+完整流程保留；SKILL.md 快速开始补薄流程入口
全文：.sillyspec/changes/archive/2026-09-25-thin-brainstorm-prestage/requirements.md#FR-04
最近确认：82b3d9c1e86c166f8b7ba9fb2fdfe3721bd369fe

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
