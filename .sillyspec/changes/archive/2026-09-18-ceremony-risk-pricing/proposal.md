---
author: qinyi
created_at: 2026-09-18 06:12:08
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
双胞胎实验（2026-09-17 任务②）实证仪式强度定价错配：risk=unit-sufficient 的低风险变更支付了独立评审两轮+全量计划的全价（token 64M vs OpenSpec 同题 10.3M，4.7~6.3×），评审子代理占 52% 请求。用户钉死关键约束：agent 会偷懒，档位判定必须是客观计算，agent 自报只可升不可降。多轮评审收敛为「变更内自适应升档」方案。

## 关键问题
1. 两根轴抢方向盘：plan_level（agent 自报）驱动评审档与计划厚度，risk_level（CLI 判）只管 verify 证据，span 尺几乎不进价——低风险变更被按 agent 的自报全价收费。
2. 定价输入两个半是 agent 写的作业（design 文本/声明清单），缺收口对账——懒 agent 少写关键词即降价，无事实面兜底。
3. 轻仪直接放行无 catch 率数据，等于拿能力换速度的赌博（暗降风险）。

## 变更范围
- 新增 `src/ceremony-tier.js` 定价引擎：`ceremony_tier = max(blast, span, friction)`，S0-S3 四档映射既有五档 risk。
- 接管 review-tier：`classifyReviewTier` 委托引擎；plan_level 降级为编排标签（不再映射 independent）。
- 收口双跑：verify/archive 用实际 diff 重跑 blast+span，声明档<事实档 → 硬 flag+摩擦账+次单预价按事实面。
- friction 升档检查点钉四阶段完成门（读 friction-ledger 持久账，只升不降封顶 S3）。
- 影子期：S0/S1 轻档明轻暗重对照，catch 差异达标（doctor 维度报告）才转正。
- 档位→仪式菜单：S1 默认 CLI 清单核验+定向探针抽查（自审仅带戳兜底）。

## 不在范围内（显式清单）
- 不做跨会话 agent/会话信用分；不做归档后硬 reopen（D-006 防复潮）
- 不改 detectChangeRisk 判级算法本身（只消费其输出）
- 不做门禁前置、评审事实包、产物预填、wait 继承盖章（四杠杆零件，另立变更）
- 不动 verify 既有证据门全套（PASS 资格帽/smoke/api-matrix 照旧）

## 成功标准（可验证）
- 任务②同类（unit-sufficient）变更：请求数与 token 显著下降（影子期对照账可量化）
- L1 机械门拦截数守恒（不因轻仪下降——守恒校验）
- 双跑错配注入测试：声明 S1/事实 S2 场景被硬 flag（test/ceremony-tier.test.mjs 断言）
- 全量测试绿；classifyReviewTier 三个消费方（gates/prompt/stage-review）行为兼容
