---
author: qinyi
created_at: 2026-09-07T22:55:00+08:00
---

# 决策记录（Decisions）

## D-001@v1: 严格模式判别子 = 变更创建时间戳闸门（IR_STRICT_SINCE），不动存量
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 「新变更默认强制」如何与存量变更豁免区分？
- answer: 时间戳闸门——db changes.created_at ≥ IR_STRICT_SINCE（常量 '2026-09-07'，constants.js 单一事实源）的变更进严格模式；早于闸门的变更保持既有存量豁免（skip/WARNING）零变化。备选「plan.md/tasks 结构指纹」被否：存量变更重跑 plan 会被误伤，且指纹随流程演进漂移；时间戳是 db 内现成字段、确定性可复核。change-registry 暴露 getChangeCreatedAt（新增只读访问器，listChanges 同表）。
- normalized_requirement: 严格模式判定只依赖 changes.created_at 与 IR_STRICT_SINCE 常量比较；存量（< 闸门）豁免语义零变化
- impacts: [FR-01, FR-02]
- 模块域: runtime, progress
- evidence: src/db.js changes 表 created_at TEXT NOT NULL；P3b 判别子现状（verify-postcheck.js checkProbeConsistency D-003）；P3a 存量零红（reconcileTargetFiles skip 分支）

## D-002@v1: P3b 收紧——严格模式变更探针子节全缺 = ERROR
- type: behavior
- priority: P0
- status: accepted
- source: user
- question: 严格模式下 verify-result.md 无「#### 探针」子节的语义？
- answer: ERROR 阻断（信封 code probe_prefill_missing_strict），报错指引跑 `sillyspec verify-probes --init` 生成九章节骨架后重跑 --done。既有「verify-facts.json 在场而子节全缺」分支（疑似删预填段）在任何模式下都是 ERROR 不变。存量旧格式报告 skip 分支加注「严格模式闸门前变更」判定来源。
- normalized_requirement: created_at ≥ IR_STRICT_SINCE 且子节全缺 → ERROR + 可执行指引；存量 skip 语义不变
- impacts: [FR-01]
- 模块域: runtime
- evidence: checkProbeConsistency 判别子（verify-postcheck.js，finish('skipped', … '存量旧格式报告')）；种子稿 P3b「存量兼容设计，但新变更也适用该豁免」缺口

## D-003@v1: P3a 收紧——严格模式变更整变更零声明 = ERROR（部分声明仍 WARNING）
- type: behavior
- priority: P0
- status: accepted
- source: user
- question: 严格模式下 target_files 声明豁免收到多紧？
- answer: 分两档（Grill 审查后判据修订）：①主仓卡全部零声明（noDeclarationCount > 0 且 == cardCount - 跨仓卡数）→ ERROR（信封 target_files_all_missing_strict），指引逐卡 Edit 填 target_files（taskcard 骨架已预置字段，taskcard.js 占位先例）——跨仓卡不参与计数也不充当豁免（防「塞一张跨仓卡让全部主仓卡免检」绕过）；②部分主仓卡未声明 → 维持现状 WARNING（灰度：部分声明说明 agent 已理解契约，漏卡提示即可）。全跨仓卡 skip 维持（跨仓对账口径另有归属）。
- normalized_requirement: 零声明=ERROR 仅严格模式生效；部分声明/全跨仓语义不变
- impacts: [FR-01]
- 模块域: runtime
- evidence: reconcileTargetFiles 存量零红 skip 分支（verify-postcheck.js，「全部卡无声明 / 全部跨仓 → WARNING 语义跳过」）；gates.js verify 块接线 :677

## D-004@v1: design.md 文件清单行级核验挂 brainstorm 末步 gate
- type: architecture
- priority: P0
- status: accepted
- source: docs
- question: design 清单幻觉路径核验的挂点与语义？
- answer: design-facts.js 新增 validateDesignFileList 纯函数：parseFileChangeListDetailed 逐条目核验——路径存在（cwd 相对，对齐 collectDocRefs 层1 口径）或显式 NEW: 前缀 → 通过；不存在且无前缀 = ERROR（design_file_ref_invalid，与 validateTargetFiles 幻灵路径 ERROR 同语义）；清单段缺失 = WARNING（small 变更可无清单）。挂点=complete.js 决策模块域核验同点位（brainstorm 末步 --done，fail-closed），与 P3c 三件套同构。
- normalized_requirement: ERROR 仅「清单内不存在的路径且无 NEW: 前缀」；清单缺失/解析失败 WARNING 不阻断
- impacts: [FR-02]
- 模块域: docs-consistency, runtime
- evidence: design-facts.js:219 已用 parseFileChangeListDetailed 取实改面（WARNING 对照）；validateTargetFiles ERROR 先例（plan-postcheck.js:1060）

## D-005@v1: delta 手动补跑 project 从 progress.project 取值
- type: bugfix
- priority: P1
- status: accepted
- source: docs
- question: `sillyspec delta --change` 手动补跑为何拿不到模块归属？
- answer: index.js delta case 硬编码 project:null → loadModuleMap 降级（报告恒「无 module-map」注记）。修复：读 progress.project（ProgressManager 同源），有值即传；null 兜底不变（无项目名场景仍降级）。归档自动路径（progress.project 有值）与手动补跑自此同口径，「口径互补」注释随之退役。
- normalized_requirement: delta 命令与归档自动路径模块归属同源；无 project 时降级注记不变
- impacts: [FR-03]
- 模块域: cli-entry, runtime
- evidence: index.js delta case（project: null 注释）；archive-delta.js buildDeltaReport({project}) → collectDeltaSources → loadModuleMap(specRoot, project)

## D-006@v1: delta→增量 scan 回灌最小形态 = sidecar + scan 启动 advisory（不做模块级增量刷新）
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: 种子稿 P3d 回灌①「下一轮 scan 只刷新 delta 涉及模块」做到多深？
- answer: 最小形态两件：①delta 生成时落 sidecar `.runtime/last-delta.json`（change/affectedModules/affectedFiles/updatedAt，模块清单从 module-map 归属取）；②scan 启动（scanResumeCheck noAI 动作或 scan-diff）读取 sidecar，输出 advisory「上次归档变更涉及模块 X/Y——本轮 scan 优先核对」。不做 scan facts/文档的模块级增量刷新：涉及 scan 生成侧（子代理按模块拆分）与 staleRefs 基线联动，独立 change 评估。
- normalized_requirement: sidecar schema 固定四字段；advisory 不阻断不改变 scan 步骤结构
- impacts: [FR-03]
- 模块域: runtime, stages
- evidence: 种子稿 §5 回灌①；scanResumeCheck noAI 动作（scan-profile.js:321）

## D-007@v1: acceptsFix 最小形态 = docs check --fix 试跑回执 + 引用类诊断 supportedFixes 可执行化
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: archify 机制 4（supportedFixes 机器验证）落到什么形态？
- answer: 不建通用 acceptsFix 框架——落两个可复用件：①`docs check --fix` 执行后输出「修复回执」：修复前失效数 → 自动重锚数 → 修复后失效数（applyFixes 前后各跑一次 collectInvalidDocRefs，差值即机器证明——「建议被证明能消除诊断」的最小闭环）；②docs gate / postcheck 的引用失效类诊断 supportedFixes 升级为可直接执行的命令形态（`sillyspec docs check --paths <file> --fix`），agent 逐字执行即可。通用化（诊断信封五字段全量 + acceptsFix 试跑器）待两件用稳后独立立项。
- normalized_requirement: 回执输出在 --fix 路径内；supportedFixes 条目必须是可逐字执行的 CLI 命令
- impacts: [FR-04]
- 模块域: docs-consistency, cli-entry
- evidence: docs-check.js applyFixes:599/classifyFix（唯一写回面）；scan-postcheck.js supportedFixes 既有文案形态（'sillyspec scan-fix-headers' 等已可执行先例）
