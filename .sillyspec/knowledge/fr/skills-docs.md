---
author: sillyspec-fr-index
created_at: 2026-10-15T01:21:44.811Z
---

# FR 索引 — skills-docs

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/skills-docs.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-skills-docs-001 矩阵锚点正则对称化：design接口表# 锚点路径字符类同时排除中文左右括号与半角括号，锚点后紧跟中文左括号注记不再吞字空指（测试断言捕获路径=声明路径）
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：中文左括号注记；既有分隔形态不回归
场景正文：
- 场景：中文左括号注记 — Given design.md 接口段解析面含 `GET /api/system-status`，矩阵证据列写 `design接口表#GET /api/system-sta
- 场景：既有分隔形态不回归 — Given 注记使用右括号收尾、中文逗号/句号/分号或空格分隔的既有写法 When 校验 Then 行为与现状一致（仍正常终止/命中）。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-01
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-01
  tests: test/pitfall-anchor-paren.test.mjs「中文左括号注记不再吞字空指／既有分隔形态不回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-002 空指报错附诊断：锚点未命中解析面时文案附 facts 实际解析到的端点集
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：空指诊断
场景正文：
- 场景：空指诊断 — Given 解析面含 2 个端点、锚点吞字不命中 When 校验 Then 报错文案含这两个端点字样。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-02
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-02
  tests: test/pitfall-anchor-paren.test.mjs「空指报错附解析面端点集」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-003 verify 收口纯文档门一次性全列：探针一致性/draft 篡改/ceremony 双跑三门并入 docGateFailures 收集汇总，不再逐门 fail-fast 连撞
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：三门同时不满足
场景正文：
- 场景：三门同时不满足 — Given 三门各自触发条件同时不满足 When verify --done Then 三门问题同轮全部列出后统一回滚（一轮往返见全部文档面问题，且不先跑实测门）。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-03
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-03
  tests: test/pitfall-gate-collect.test.mjs「三门同轮收集一次性全列」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-004 verify-probes --init 落 apiFace 键（与 --done backfill 同源同形），re-init 保留已回填固化键不再抹除
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：init 即含解析面；re-init 保回填
场景正文：
- 场景：init 即含解析面 — Given design.md 接口段已表格化 When verify-probes --init Then 落盘 facts 含 apiFace.endpoints。
- 场景：re-init 保回填 — Given facts 已含回填的 apiFace When 重跑 --init Then apiFace 键保留（值随本次结果刷新）。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-04
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-04
  tests: test/pitfall-facts-apiface.test.mjs「init 落 apiFace 键／re-init 保留回填键」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-005 对账零内容 diff 忽略：纯行尾差异文件（--ignore-cr-at-eol 对照判定）剔出 undeclared 面，软警告留痕
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：gen 重写行尾
场景正文：
- 场景：gen 重写行尾 — Given tracked 文件仅行尾被改写（porcelain M 但不在 --ignore-cr-at-eol 变更集）When 收口对账 Then 该文件不进 und
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-05
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-05
  tests: test/pitfall-reconcile-eol.test.mjs「纯行尾差异文件剔出对账面并留痕」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-006 stage-review 目录归一：裸 runId 目录与双前缀目录读侧容错命中，refresh-hash 对错位文件可用；三份 SKILL.md 口径统一
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：错位目录命中；refresh-hash 可用
场景正文：
- 场景：错位目录命中 — 
- 场景：refresh-hash 可用 — Given 同上错位 When register-stage-review --refresh-hash Then 定位到既有 review.json 完成重算，不再报「无
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-06
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-06
  tests: test/pitfall-stage-review-dir.test.mjs「错位目录容错命中／refresh-hash 对错位文件可用」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-007 execute 批量完成自动补 per-task review 草稿（机械生成幂等），批量完成复核循环与 archive 完成度判定不再全量缺失
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：批量完成不再全缺
场景正文：
- 场景：批量完成不再全缺 — Given tasks 全勾、代码证据非零、4 个 task 均无 review.json When execute --done 批量完成 Then 草稿自动补齐、复核循
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-07
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-07
  tests: test/pitfall-batch-review-backfill.test.mjs「批量完成前自动补 per-task 草稿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-008 自动勾选加实现事实锚：代勾改为提交 subject 含 task-NN 且 diff 与该卡 allowed_paths 交叠（无卡面时仅 subject token）才勾，正文散文提及不勾
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：正文提及不勾；subject 亦不交叠不勾
场景正文：
- 场景：正文提及不勾 — 
- 场景：subject 亦不交叠不勾 — 
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-08
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-08
  tests: test/pitfall-autotick-anchor.test.mjs「正文提及不勾／subject+allowed_paths 交叠才勾」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-009 决策模板骨架含 否决理由/复潮条件 字段行（标注 rejected 必填），distill needsWait 报错附可复制补丁样例
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：模板含字段；报错附样例
场景正文：
- 场景：模板含字段 — Given 渲染 brainstorm 注入模板/读取四件套模板 Then 骨架含两字段行且带 rejected 必填标注。
- 场景：报错附样例 — Given rejected 条目缺两字段 When distill Then 报错文案含「否决理由：」「复潮条件：」可粘贴补丁样例行。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-09
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-09
  tests: test/pitfall-rejected-fields.test.mjs「模板骨架含两字段行／distill 报错附补丁样例」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-010 探针矩阵归属测试文件列截断前 5+共 N 个折叠，单元格转义
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：82 文件截断
场景正文：
- 场景：82 文件截断 — Given 归属测试文件 82 个 When 渲染骨架 Then 单元格 ≤5 项 + 「共 82 个」计数，不再单格数千字符。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-10
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-10
  tests: test/pitfall-probe7-noise.test.mjs「82 文件截断为 5+计数」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-011 commit 建议 type 加权：QUICKLOG 在场不再硬推 fix，subject 已列条目不进 body 重复
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：归档提交不再误判 fix
场景正文：
- 场景：归档提交不再误判 fix — Given 暂存面含归档产物（含已勾 tasks.md）+ 并行会话 QUICKLOG 新条目（其文件不在变更集）When sillyspec commit 建议 Then
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-11
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-11
  tests: test/pitfall-commit-suggest.test.mjs「QUICKLOG 不在变更集不计入／归档 task 面 feat／body 去重」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-012 平台 409 回显折叠为一行摘要
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：409 单行
场景正文：
- 场景：409 单行 — Given 平台返回 409 + conflict JSON（含 platform_progress 大对象）When sync Then 输出单行 `→ 409 conf
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-12
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-pitfall-batch-clearance:flow:测试绑定FR-12
  tests: test/pitfall-sync-409.test.mjs「409 冲突折叠单行摘要」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-pitfall-batch-clearance
  status: active

## FR-skills-docs-013 全量测试与 lint 绿
变更：2026-10-15-pitfall-batch-clearance
状态：active
摘要：收口实测
场景正文：
- 场景：收口实测 — Given 全部实现落地 When 跑 `npm test` 与 lint Then 全绿退出码 0。
全文：.sillyspec/changes/archive/2026-10-15-pitfall-batch-clearance/requirements.md#FR-13
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7

## FR-auto-claude-008 .claude/skills/sillyspec-brainstorm/SKILL.md 含变更标题指引：一句中文概括、≤50 字、建议 ~20 字，并说明标题提取自 proposal/design 首行 H1
变更：2026-10-10-brainstorm-skill-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given brainstorm skill 存在于 `.claude/skills/sillyspec-brainstorm/SKILL.md` / When agent
全文：.sillyspec/changes/archive/2026-10-10-brainstorm-skill-title/requirements.md#FR-01
最近确认：730426594a32383ad7ab53f6d4f8e7e7c542f3ca

## FR-auto-claude-009 纯文档改动，不触 src/test
变更：2026-10-10-brainstorm-skill-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更提交面 / When `git show --name-only` 核对 / Then 仅含 skill 文档与变更目录路径，无 src/test 路径。
全文：.sillyspec/changes/archive/2026-10-10-brainstorm-skill-title/requirements.md#FR-02
最近确认：730426594a32383ad7ab53f6d4f8e7e7c542f3ca

## FR-auto-assets-001 CLAUDE.md、assets/command-cards/flow.md、run-quick.md 三处逐字可照抄分号形态清零，给出含「成功标准：」独立行与「- <可验证标准>」条目行的多行实例
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-01
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-01
  tests: test/input-teach-copyable.test.mjs「①b 非 src 教学面分号形态零残留（逐字三处）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-auto-assets-002 AGENTS.md 与 SKILL.md 两处描述式教学升级为可照抄实例；AGENTS.md 与模板源倒推行引号内联模糊形态改为引用过门格式的表述
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-02
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-02
  tests: test/input-teach-copyable.test.mjs「②b 非 src 教学面实例在场与模糊形态清零」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-auto-assets-003 零残留断言升级为 src 目录递归遍历，新增非 src 教学面零残留与实例在场断言
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-03
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-03
  tests: test/input-teach-copyable.test.mjs「① 分号内联教学形态零残留（src 递归遍历升级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-auto-assets-004 相关测试全部通过
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-04
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-04
  tests: test/input-format-copy.test.mjs「② 教学点均带可照抄多行实例」 | test/input-teach-copyable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-skills-docs-014 deriveChangeTitle 对「动机与背景：」独立段头行返回次行内容；「动机与背景：xxx」同行形态剥标签取 xxx；既有白名单剥离与成功标准截断行为不变
变更：2026-10-15-title-label-skip
状态：active
摘要：段头行跳过；既有行为回归
全文：.sillyspec/changes/archive/2026-10-15-title-label-skip/requirements.md#FR-01
最近确认：e182ccdba1e2b6a1ac4dbc45d3ead159e63a25f1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-title-label-skip:flow:测试绑定FR-01
  tests: test/change-title-flow.test.mjs「⑤ 段头行跳过与复合词剥离（动机与背景形态免疫）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-title-label-skip
  status: active

## FR-skills-docs-015 flow done 模块变更索引回写摘要与标题同源（复用 deriveChangeTitle 提取链），段头行不再入摘要
变更：2026-10-15-title-label-skip
状态：active
摘要：段头免疫回写
全文：.sillyspec/changes/archive/2026-10-15-title-label-skip/requirements.md#FR-02
最近确认：e182ccdba1e2b6a1ac4dbc45d3ead159e63a25f1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-title-label-skip:flow:测试绑定FR-02
  tests: test/motive-from-input.test.mjs「motiveFromInput：段头行免疫取次行/空提取回退变更名/与 deriveChangeTitle 同源」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-title-label-skip
  status: active

## FR-skills-docs-016 AGENTS.md/templates/SKILL/CLI 用法串的 --input 示例首行改为一句概括（消除段头诱导）
变更：2026-10-15-title-label-skip
状态：active
摘要：模板对齐
全文：.sillyspec/changes/archive/2026-10-15-title-label-skip/requirements.md#FR-03
最近确认：e182ccdba1e2b6a1ac4dbc45d3ead159e63a25f1

## FR-skills-docs-017 进度库 6 个「动机与背景：」title 与 stages.changelog.md 1 行摘要修复为真实概括
变更：2026-10-15-title-label-skip
状态：active
摘要：存量清偿
全文：.sillyspec/changes/archive/2026-10-15-title-label-skip/requirements.md#FR-04
最近确认：e182ccdba1e2b6a1ac4dbc45d3ead159e63a25f1

## FR-skills-docs-018 flow start 全新启动（非平台 writer 空目录）标题不在 10-30 字或变更名兜底时必须拒绝启动并给修复指引（--title 或首行 10-30 字概括）
变更：2026-10-16-title-range-gate
状态：active
摘要：首行过短被拒；合规则原样放行
场景正文：
- 场景：首行过短被拒 — Given --input 首行「任务」（2 字）；When flow start 全新启动；Then 必须 exit 2 且报错含当前值、字数、10-30 要求与 --title/首行两条修复路径；changes 表不得新增该变更行
- 场景：合规则原样放行 — Given --input 首行 10-30 字（如 18 字概括）；When flow start 全新启动；Then 必须正常启动，标题=提炼值，行为与改动前逐字一致（除标题行措辞更新外）
全文：.sillyspec/changes/archive/2026-10-16-title-range-gate/requirements.md#FR-01
最近确认：8889da0f7a38a5a133b103592fb6cb29f9acb99f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-title-range-gate:flow:测试绑定FR-01
  tests: test/title-range-gate.test.mjs「isTitleInRange 区间判定 + fresh 拒绝判定面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-title-range-gate
  status: active

## FR-skills-docs-019 显式 --title 在 fresh/resume 超出 10-30 必须拒绝；平台 writer 豁免硬门仅警告
变更：2026-10-16-title-range-gate
状态：active
摘要：--title 超长被拒；平台 writer 豁免
场景正文：
- 场景：--title 超长被拒 — Given --title 31 字；When flow start / resume；Then 必须 exit 2 且报错含字数与修复路径
- 场景：平台 writer 豁免 — Given 预建空变更目录（平台派发形态）且无 --input；When flow start；Then 必须照旧启动（exit 0），标题=变更名兜底且打 ⚠️ 警告行
全文：.sillyspec/changes/archive/2026-10-16-title-range-gate/requirements.md#FR-02
最近确认：8889da0f7a38a5a133b103592fb6cb29f9acb99f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-title-range-gate:flow:测试绑定FR-02
  tests: test/title-range-gate.test.mjs「显式 --title 校验与平台 writer 豁免判定」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-title-range-gate
  status: active

## FR-skills-docs-020 adopt 收编与 resume 补写不阻断但超界必须打强提示
变更：2026-10-16-title-range-gate
状态：active
摘要：adopt 超界强提示
场景正文：
- 场景：adopt 超界强提示 — Given 头脑风暴 proposal 语义标题 5 字；When flow start 收编；Then 必须正常收编（exit 0）且输出含 ⚠️ 与 --title 修复指引的提示行
全文：.sillyspec/changes/archive/2026-10-16-title-range-gate/requirements.md#FR-03
最近确认：8889da0f7a38a5a133b103592fb6cb29f9acb99f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-title-range-gate:flow:测试绑定FR-03
  tests: test/title-range-gate.test.mjs「adopt/resume 超界强提示判定面（不阻断）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-title-range-gate
  status: active

## FR-skills-docs-021 hardCut 软提示文案精度修正（评审 P3：判定是 6..30 内无可用截点）
变更：2026-10-16-title-range-gate
状态：active
摘要：文案与判定一致
场景正文：
- 场景：文案与判定一致 — Given hardCut=true（标点存在但全落在 6..30 区间外）；When flow start 落标题；Then 提示行措辞必须体现「6..30 字内无可用截点」口径
全文：.sillyspec/changes/archive/2026-10-16-title-range-gate/requirements.md#FR-04
最近确认：8889da0f7a38a5a133b103592fb6cb29f9acb99f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-title-range-gate:flow:测试绑定FR-04
  tests: test/title-range-gate.test.mjs「hardCut 软提示文案口径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-title-range-gate
  status: active

## FR-skills-docs-022 过门格式指引（AGENTS.md/templates）同步 10-30 要求；受影响 e2e 夹具按新契约修输入（断言不动）
变更：2026-10-16-title-range-gate
状态：active
摘要：夹具契约同步
场景正文：
- 场景：夹具契约同步 — Given 硬门落地后全量测试；When 全量跑毕；Then 零失败（夹具首行 <10 字的用例已延长至合区间，断言未弱化）
全文：.sillyspec/changes/archive/2026-10-16-title-range-gate/requirements.md#FR-05
最近确认：8889da0f7a38a5a133b103592fb6cb29f9acb99f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-title-range-gate:flow:测试绑定FR-05
  tests: test/title-range-gate.test.mjs「夹具契约回归（标题族测试全绿）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-title-range-gate
  status: active

## FR-skills-docs-023 正典顺序句在 flow start 横幅（【你要做的】与三断点纪律）、adopt 收编横幅、flow done 未批准拦截、flow approve 输出面一致落位；全仓「动码前后顺手作答」「写码前后顺手填」「干活时作答」类许可后补的措辞清零
变更：2026-10-19-thin-order-canon
状态：active
摘要：主路径（横幅顺序句）；未批准收口拦截；恢复简报带批准状态
场景正文：
- 场景：主路径（横幅顺序句） — Given 全新轻量变更 flow start，When 读取横幅，Then「【你要做的】」首句含「先答 spec 面」且顺序为 spec → 批准 → 动码；grep s
- 场景：未批准收口拦截 — Given 未批准变更运行 flow done，When 拦截输出，Then 文案含「批准是动码前置」语义并给出补批通道，autopilot 出口标注须用户显式授权。
- 场景：恢复简报带批准状态 — Given 未批准变更重跑 flow start 恢复，When 读取恢复简报，Then 含批准状态行；未批准时「下一步」指向补批而非「继续干活」。
全文：.sillyspec/changes/archive/2026-10-19-thin-order-canon/requirements.md#FR-01
最近确认：d8ff8bc2b9fda1b3e8d062c8f329c260b772edf5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-order-canon:flow:测试绑定FR-01
  tests: test/flow-order-canon.test.mjs「横幅/adopt/done/approve/恢复简报五面正典句一致与顺手措辞清零」
  reason: spec
  state: active
  discovery: machine
  confirmed_by: agent
  confirmed_at: 95031f4ca3d205a666d89d55723cfc35a77424b3
  source_change: 2026-10-19-thin-order-canon
  status: active

## FR-skills-docs-024 assets/command-cards/flow.md 与 .claude/skills/sillyspec-flow/SKILL.md 的生命周期改为「flow start → 补 spec 面 → 批准 → 干活 → flow done」，含 approve 环节
变更：2026-10-19-thin-order-canon
状态：active
摘要：生命周期一致
场景正文：
- 场景：生命周期一致 — Given 本变更合入后的两文件，When 读取步骤/生命周期段，Then 均含「批准」环节且顺序为 spec → 批准 → 干活；描述行不再以「直接干活（改代码写测试）」
全文：.sillyspec/changes/archive/2026-10-19-thin-order-canon/requirements.md#FR-02
最近确认：d8ff8bc2b9fda1b3e8d062c8f329c260b772edf5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-order-canon:flow:测试绑定FR-02
  tests: test/flow-order-canon.test.mjs「命令卡与 skill 生命周期含批准环节」
  reason: spec
  state: active
  discovery: machine
  confirmed_by: agent
  confirmed_at: 95031f4ca3d205a666d89d55723cfc35a77424b3
  source_change: 2026-10-19-thin-order-canon
  status: active

## FR-skills-docs-025 flow status：未批准且非 autopilot 时相位停在「① spec（→ 待用户批准）」并给提示，--json 增 specApproved 字段
变更：2026-10-19-thin-order-canon
状态：active
摘要：未批准；已批准
场景正文：
- 场景：未批准 — Given 未批准且非 autopilot 的变更，When flow status，Then 相位文本含「待用户批准」提示，JSON specApproved=false
- 场景：已批准 — Given flow approve 已运行的变更，When flow status，Then 相位进入执行段且含「已批准」标注，JSON specApproved=tru
全文：.sillyspec/changes/archive/2026-10-19-thin-order-canon/requirements.md#FR-03
最近确认：d8ff8bc2b9fda1b3e8d062c8f329c260b772edf5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-order-canon:flow:测试绑定FR-03
  tests: test/flow-order-canon.test.mjs「status 未批准相位停在 spec 与 specApproved 字段」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-order-canon
  status: active

## FR-skills-docs-026 templates/agents-instruction.md 选道行与规则 3 补轻量道顺序句，本仓 AGENTS.md/CLAUDE.md 同步，package.json 版本号提升使消费仓重跑 init 可取新资产
变更：2026-10-19-thin-order-canon
状态：active
摘要：模板与仓内一致
场景正文：
- 场景：模板与仓内一致 — Given 本变更合入后，When 比对模板与 AGENTS.md/CLAUDE.md 轻量道行，Then 三者顺序表述同义且均含批准环节；package.json ver
全文：.sillyspec/changes/archive/2026-10-19-thin-order-canon/requirements.md#FR-04
最近确认：d8ff8bc2b9fda1b3e8d062c8f329c260b772edf5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-thin-order-canon:flow:测试绑定FR-04
  tests: test/flow-order-canon.test.mjs「模板与本仓 AGENTS/CLAUDE 同步及版本提升」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-thin-order-canon
  status: active

## FR-skills-docs-027 既有测试锚（flow-checkpoints/flow-redline-frontload/flow-clarity-probe/governance-autopilot/tdd-scope-guidance 等）同步更新，全量测试绿
变更：2026-10-19-thin-order-canon
状态：active
摘要：全量回归
场景正文：
- 场景：全量回归 — Given 本变更全部合入，When 跑全量测试，Then 零失败。
全文：.sillyspec/changes/archive/2026-10-19-thin-order-canon/requirements.md#FR-05
最近确认：d8ff8bc2b9fda1b3e8d062c8f329c260b772edf5
