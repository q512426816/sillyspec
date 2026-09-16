---
author: qinyi
created_at: 2026-09-16 12:23:00
---

# 决策记录（Decisions）

## D-001@v1: 跨层契约探针采用「design 契约枢纽 + advisory」路线（否决 task 卡契约类型化 / 双管组合）
- **type**: architecture
- **status**: confirmed
- **source**: user（brainstorm Step 4 方案选择轮，用户选方案A）
- **question**: 跨层契约一致性检查的实现路线——verify 探针（design 契约为枢纽）vs task 卡契约字段类型化 vs 两者组合？
- **answer**: 方案A：verify 探针族新增「跨层契约一致性」档，以 design.md 接口定义/数据模型契约字段表为对齐枢纽——前端改动文件的对象字面量载荷键 ⊄ 契约字段 → WARNING；后端实体/DTO 声明字段 ⊅ 契约字段 → WARNING。advisory 不阻断（probe5/probe7 先例：误报面未知先放行，跑出实证再升硬门）。
- **evidence**: 2026-09-15 wp EHS 会话实证——4/5 个 P1（RpForm 三处字段错位 localOrgId/leaderUserId/punishedDutyUserId、小程序漏发 reportOrgId）全部在 design 契约可查面内，方案 B（task 卡契约类型化）对这批案例零覆盖（错位全在组件内部字段，不在 provides/expects_from 面）且给全部 task 卡新增书写负担。
- **impacts**: verify-probes.js 新增探针；verify-result.md 骨架新增对应机械预填段；不动既有探针语义。

## D-002@v1: 扩展现有探针8（ed540c6）增补契约枢纽维度，否决新建探针9并存与废弃（supersedes D-001@v1 的"新增独立探针"形态，保留其"design 契约枢纽+advisory"核心思想）
- **type**: architecture
- **status**: confirmed
- **source**: user（plan 独立审查发现撞车后用户选择"扩展现有探针8"）
- **question**: plan 审查 fail 项——凌晨 ed540c6 已落地同编号探针8「载荷字段契约对账」（前后端直接比对+SQL NOT NULL 路线，EHS 四案例基本覆盖），与本变更 D-001（design 契约枢纽新探针）撞车，如何处置？
- **answer**: 不新建探针9、不废弃——在现有探针8 上增补它盖不住的两维度：①契约外载荷键（sourceShdId↔safelyHiddenId 无词法关系，只有契约表能揭示映射归属）②必填漏发（diff 无 SQL DDL 时 NOT NULL 路径失效，design required 字段仍可查）。单探针头单 advisory 族。
- **evidence**: ed540c6（2026-09-16 01:08，quick ql-20260916-007-5e1a，EHS 二次独立复核驱动）；plan-review-2026-09-16-122643 fail 清单第 1 项；用户 2026-09-16 方向裁决。
- **impacts**: 变更定位从"新增探针8"改为"扩展现有探针8"；文件清单变更为 verify-probes.js + verify-postcheck.js（一致性抽查补 probe8 维度，ed540c6 未接线）+ 新测试文件；既有探针8 直接比对语义不动。
