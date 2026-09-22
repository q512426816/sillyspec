---
author: zcode-r7-surgery
created_at: 2026-09-22 10:52:00
plan_level: full
---
# 实现计划（Plan）— 2026-09-22-r7-protocol-surgery

## 目标
协议手术四件：watcher 观测层 / flow 2-调用协议（thin|legacy）/ 全件机器起草+指纹守卫 /
编辑距离路由+失败升厚。协议形状属性：必需交互=2、工件回填轮=0、观测解耦、写入仅例外裁决。

## 任务分解（Wave 排布）

> 用户裁定收口（2026-09-22，D-006）：反仪式变更不预付任务卡协议税——7 卡/4 Wave。
> 测试与实现同卡；module-map/回归绿并入实现卡；终验发枪清单归 verify 阶段。
> Wave=调度单位（plan-adopt-waves 按 depends_on 拓扑定排，机械调度以本段 Wave 分组为
> 唯一真相）；切片=设计边界（不与 Wave 一一对齐）：切片一 watcher=task-01；切片二
> 归档链+协议=task-02/03；切片三 机器起草=task-04/05；切片四 路由=task-06；工具修正
> plan 反细拆=task-07。任务详情见 tasks.md 与 tasks/task-NN.md 卡。

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-04
- task-07

## Wave 2（依赖前序 Wave）
- task-03

## Wave 3（依赖前序 Wave）
- task-05

## Wave 4（依赖前序 Wave）
- task-06

## 依赖关系
调度序 Wave1→2→3→4（plan.md Wave 段为唯一调度真相）。Wave 1 内四任务两两文件正交可
并行：task-01（src/watcher.js+src/run/command.js+test/watcher.test.mjs+module-map）、
task-02（src/run/complete-handlers.js+test/archive-chain.test.mjs）、task-04
（src/machine-draft.js+src/verify-draft.js+test/machine-draft.test.mjs）、task-07
（src/stages/plan.js）。跨任务契约：task-03 expects task-02（runArchiveChain.skipPlanCheck）；
task-05 expects task-04（wrapSection/verifyMarkers/amendDraft 三契约）。同文件跨 Wave
递进（串行安全）：flow.js∈task-03(W2)→task-05(W3)→task-06(W4)；flow-draft.js∈
task-05(W3)→task-06(W4)；module-map∈task-01(W1)→task-05(W3)。

## 红线对照（每 Wave 收尾自查）
fail-closed 判定语义零改动（只复用 runQuickTestLintGate/consultTestLedger）；P2 口径不动；
allowed_paths 不动；所有权接线照抄 claim/assert；DB schema 零迁移；第 3 批四件只消费。

## 验收口径
四组新测试全绿+既有族回归全绿+lint 绿；协议四钉逐条 harness 可验；module-map 录入；
烟测（30min 级）task done 使用数/--draft 槽填充形态/RERUN 拒绝数三指标；终验发枪清单
归 verify 阶段落盘（三桶 Δ≤20M/当量 ≤1.3 达标 ≤1.2 拉伸/墙钟 ~90min）。
