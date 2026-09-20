---
author: sillyspec-fr-index
created_at: 2026-09-20T15:18:10.810Z
---

# FR 索引 — stages

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/stages.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-stages-001 单一 frontmatter 解析源
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given task 卡内容（任意形态：无 frontmatter / 合法 / 非法 YAML）；When plan-postcheck 与 verify-probes 解析其 frontmatter；Then 两者消费同一实现（src/taskcard-frontmatter.js），提取与 jsYaml 解析行为一致（CRLF 容错）
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-01
最近确认：2a9e4a5f

## FR-stages-002 plan 门禁硬校验（fail-closed）
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
依据决策：D-001@v2
场景正文：
- 场景：默认场景 — Given task 卡 frontmatter 非法 YAML（jsYaml 抛错）；When validatePlanFeasibility 运行（plan 门单点拦截，D-001@v2——先于契约校验同 pass）；Then 返回 ok=false，errors 含 `frontmatter 非法 YAML（<file>:<行>:<列> <message>）`（行=js-yaml m
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-02
最近确认：2a9e4a5f

## FR-stages-003 探针 7 如实文案
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given task 卡 frontmatter 非法 YAML；When 探针 7 构建+渲染；Then 输出 `- ⚠️ frontmatter 非法 YAML（...）` 行而非「卡无 acceptance——防御，plan-postcheck 已拦」；真无 a
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-03
最近确认：2a9e4a5f

## FR-stages-004 零回归
变更：2026-09-20-taskcard-yaml-hardgate
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 合法 task 卡（有/无 provides、expects_from、acceptance 字段）；When 全链路（parseTaskContracts / validateCrossTaskContracts / parseTaskAcceptance / 探针 7；Then 行为与现状一致（parseTaskContracts 仅 additive 新增 yamlError 键）
全文：.sillyspec/changes/archive/2026-09-20-taskcard-yaml-hardgate/requirements.md#FR-04
最近确认：2a9e4a5f
