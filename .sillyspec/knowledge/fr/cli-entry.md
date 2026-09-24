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
