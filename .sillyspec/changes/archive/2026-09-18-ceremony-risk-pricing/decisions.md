---
author: qinyi
created_at: 2026-09-18 14:13:45
---

# 决策记录

## D-001@v1 仪式强度按风险定价：ceremony_tier=max(blast,span,friction) 接管 review-tier
- 类型：architecture
- 问题：评审/计划仪式按什么定价？现状 plan_level(agent自报)与 risk_level 两轴抢方向盘，任务②实证 unit-sufficient 付了 independent×2 全价
- 答案：三轴取封顶：blast=detectChangeRisk 五档映射 S0-S3 为主价；span=computeGateProfile 跨度(模块数/文件数/风险路径)为加价防「单测档改半个仓」；friction=本变更 gate_rollback/review_fail 阶段门检查只升一档封顶 S3。L1 机械门(探针/矩阵/docs-check/代码证据)全档永远全开——免赔额不进价目表。review-tier.js classifyReviewTier 的文件数≤3 规则被本引擎接管
- 锚点：双胞胎实验+三轮评审收敛，用户拍板

## D-002@v1 plan_level 降级为编排标签，不再映射 independent
- 类型：architecture
- 问题：plan_level 自报 full 但价格 S1 时听谁的？
- 答案：plan_level 只决定 wave 拆分/并行子代理/plan 模板厚度（工作量轴）；仪式档位一律由 ceremony_tier 决定（风险轴）。agent 自报 needs_human_review 只可作升档暗示永不作降档依据；CLI 强制轻仪时留审计痕「仪式按 risk 计价，plan_level 仅编排」
- 锚点：用户裁决：不能让 agent 自己判断档位，它会按简单的做

## D-003@v1 收口双跑对账：声明面 vs 实际 diff
- 类型：architecture
- 问题：定价输入两个半是 agent 写的作业（design 文本/声明清单），懒 agent 少写关键词即降价，怎么堵？
- 答案：verify/archive 收口时用实际 diff（scope-audit/apply-pathspec 现成）重跑 detectChangeRisk+span：声明档 < 事实档 → 硬 flag+记摩擦账+该会话下一 change 预价强制按事实面。diff 是唯一不可伪造物证，预价信声明，结算信事实
- 锚点：用户识别的关键风险+终版收敛

## D-004@v1 risk_level 显式降级通道保留但收口复核
- 问题：分类器误报真实存在（任务② server.js 误伤先例），降级要不要禁？
- 答案：保留：降级须写理由进 design/verify（既有纪律），且收口时 D-003 双跑复核——事实面支持则通过，不支持则 flag。升档声明永远尊重（人说更危险就听）。span 少报有天然刹车：execute apply 过滤强制改动⊆声明清单，动 undeclared 路径直接拦

## D-005@v1 S1 档默认 CLI 清单核验+探针抽查，自审为带戳兜底
- 问题：S1(unit-sufficient) 轻仪默认形态？自审对懒 agent 等于免检通道
- 答案：默认=CLI 清单核验(stage-review-checklist 机械项)+定向探针抽查，零 token 真客观；独立轻评为可选；agent 自审仅作通道全不可用时的降级兜底且带 degraded 戳（沿用通道优先级 self=降级态的既有语义）

## D-006@v1 明确不做：跨会话信用分与归档后硬 reopen
- 类型：architecture
- 问题：三层保险定价里的信用/再保险要不要做？
- 答案：不做（防复潮）：agent/会话可靠度分有刷分与冷启动问题；硬 reopen 破坏 archive=终态铁律。可留 CI advisory 抽样（D14 先例）。待影子数据积累后再议，本决策显式 supersedes 三层保险方案中的该两件
- 否决理由：刷分博弈面+归档终态铁律
- 复潮条件：影子期数据证明轻仪漏检率显著且无法用双跑兜住时

## D-007@v1 轻仪影子期：明轻暗重对照达标才转正
- 问题：轻仪 catch 率无数据，直接放行=暗降赌博？
- 答案：S0/S1 轻档上线首期影子运行：明面按轻仪走主线，后台静默跑重仪式只记账不阻断；攒 N 个变更对比两侧 catch 差异（轻漏了什么/值多少钱），达标才转正。影子期 token 不降反升，属花钱买标定

## D-008@v1 friction 升档检查点钉在阶段完成门
- 问题：「中途表现差加码」具体在哪个时刻升？
- 答案：只在四个阶段完成门（brainstorm→plan→execute→verify 的 gate 评估点）检查 friction-tally 决定下一阶段档位：gate_rollback/review_fail 超阈 → price=min(S3, price+1)，只升不降。friction 是滞后信号救不回已轻跑完的阶段，故只是抬底不是开跑价替代——开跑价正确性由 D-003 双跑兜底
