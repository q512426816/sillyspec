---
author: qinyi
created_at: 2026-09-09T01:05:00+08:00
change: 2026-09-09-plan-derived
---

# 决策记录（Decisions）

## D-001@v1: Wave 派生化 = plan --done 自动归一（方案 A，用户路线图授权）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 消灭 Wave 手排 vs depends_on 双写漂移——postcheck 硬拦等 agent 改 / --done 自动 adopt 归一 / 只留命令?
- answer: 自动归一（autoReanchorDocRefs 同款先例）：validateBlueprintConsistency 检出 Wave/拓扑不一致时，--done 自动调 plan-adopt-waves 同源逻辑重排（幂等），复跑校验；仅「同 Wave 文件面重叠」等安全冲突仍硬拦（topo 只看依赖看不见重叠，adopt 自带防误删）。方案 B（维持硬拦+命令）保留噪音面；C（execute 期容错）治标。
- normalized_requirement: plan --done 时 Wave 段与 depends_on 拓扑不一致 → CLI 自动重排归一（同源 adoptWaves），不要求 agent 手改；安全冲突除外。
- impacts: [FR-01, task-01]
- evidence: 路线图三轮定稿（本会话评审轮）+「完成剩余的任务全流程」全量授权；autoReanchorDocRefs 先例（complete-handlers ql-20260908-008）。
- 模块域：stages

## D-002@v1: 任务总表 W 列随 Wave 派生同步（不再手抄）
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: plan.md 任务总表 W 列重抄 Wave 是已证双写源——总表整行派生 or 仅 W 列随 adopt 同步？
- answer: 仅 W 列随 adopt 同步（现成 best-effort 已做）；总表其余列（任务名/优先级/依赖/覆盖）保留人写（语义层）——全表派生收益低且锁死排版弹性。
- normalized_requirement: 自动归一时 W 列同步重写；总表其余列不机器改写。
- impacts: [FR-01]
- evidence: plan.js:264 注释自认双写漂移；adopt W 列同步已实现。
- 模块域：stages

## D-003@v1: plan_level 客观复核 = 第二把尺子 warn（不剥夺 agent 裁量）
- type: boundary
- priority: P1
- status: accepted
- source: user
- question: plan_level（none/light/full）纯 agent 自判，light 即免独立审查——CLI 是否接管？
- answer: 复核不接管：--done 时 CLI 用客观信号（design 文件清单数 + 目标 diff 规模）与声明档位比对，不一致 → warning 透出（agent 可豁免说明）。plan_level 是语义判断（跨模块耦合度等），客观信号只是锚点。
- normalized_requirement: 不一致仅 warning 不阻断；信号阈值（>8 文件或跨 3+ 模块建议 full）写进提示文案。
- impacts: [FR-03]
- evidence: 轮次经济学 §3.3「第二把尺子」定稿；review-tier.js 现状 none/light→self 映射。
- 模块域：stages

## D-004@v1: execute 解析口径不动（消费侧零变更）
- type: boundary
- priority: P2
- status: accepted
- source: user
- question: Wave 派生化是否连带改 execute 的 Wave 解析（buildExecuteSteps）？
- answer: 不动。execute 消费「显式 `## Wave N` 段」（parseTaskWavesFromPlan 同源），归一化后段仍在原格式——渲染层变更对消费层透明。
- normalized_requirement: buildExecuteSteps/parseTaskWavesFromPlan 零改动。
- impacts: []
- evidence: plan-postcheck:564 注释（Wave 口径=显式段）。
- 模块域：stages
