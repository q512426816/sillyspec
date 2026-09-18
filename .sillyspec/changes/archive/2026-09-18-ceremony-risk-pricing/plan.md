---
author: qinyi
created_at: 2026-09-18 14:35:00
generated_by: agent
change: 2026-09-18-ceremony-risk-pricing
plan_level: full
---

# 实现计划（Plan）

> 任务真相源：tasks.md（本文件为 Wave 编排与执行指引；checkbox 状态以 tasks.md 为准——task-truth-unify 契约）。

## 全局硬约束（跨 task 逐字有效）

1. friction 分量只读 friction-ledger 持久累计账，禁读 friction-tally（consumeFrictionHint 读后删+verify 收尾清零——次序依赖禁入，Grill 缺口①）。
2. 影子期重评审一律落 `stage-reviews-shadow/` 独立命名空间，主线 gate 的 getLatestStageReviewRunId 不得命中（Grill 缺口③/R-06）。
3. classifyReviewTier 返回 `{tier, ceremonyTier}` 双字段过渡，三消费方（gates.js:242/:1015、prompt.js:1075、stage-review.js:570）逐一核对不破。
4. 档位状态文件读写必须 withFileLock + 原子写（多会话并发保「只升不降」不变量）。
5. L1 机械门（探针/矩阵/docs-check/代码证据）一行不动——本变更只调 LLM 仪式档位，不动任何门的存在性。

## Wave 1：定价引擎地基

- task-01

**执行指引**：落 `NEW:src/ceremony-tier.js`——CEREMONY_TIERS 序/RISK_TO_TIER 五档映射/computeCeremonyTier 三轴取封顶（blast=输入 riskDetection.level+显式声明规则；span=声明文件数≥8 ∨ 模块跨度≥3 ∨ QUICK_RISK_PATH_PATTERNS 命中 → ≥S2；friction=ledger 累计 gate_rollback/review_rejected 超阈 → 升一档封顶 S3；reasons 逐分量留痕）/escalateByFriction/reconcileDualRun（声明档<事实档 → mismatch error）。显式声明：升档永远尊重；降档须 reason 且标记 explicitDowngradeAccepted 待收口复核。零依赖纯函数模块（只 import 常量）。**计划评审补遗：frictionCounts 须容忍 ledger 三键超集透传（friction-ledger.js:39/:89-101 含 verify_run_failed，引擎只消费两键不拒收第三键）。**

## Wave 2：三消费面接线（并行无共享文件）

- task-02
- task-03
- task-04

**执行指引**：task-02 review-tier.js 委托——classifyReviewTier 内调 computeCeremonyTier，旧「文件数≤3」降为 S0/S1 内部断路器；返回双字段且**保留现返回的 reason/fileCount 字段**（gates.js:1031 消费 tier.reason，计划评审补遗）；grep 三消费方核对。task-03 gates.js 阶段门升档——四完成门（:1011-1094 结构）读 friction-ledger（按 change 过滤累计），escalateByFriction 后迁移记录写 `.runtime/ceremony-tier-<change>.json`（withFileLock+原子写，文件含 tier/components/reasons/transitions[]）；**读档无文件则先落初始档（开跑定价事件，design 生命周期表首行——计划评审发现①原无主认领）；连带测试预告：stage-completion-atomicity / noai-completion-gate / run-complete-step-validator-rollback / doctor-verify-feedback / concurrent-preflight-hooks / taskcard-ensure-skeletons 六组可能受动，定向回归**。task-04 双跑两出口——verify-postcheck.js（--done 链）与 complete-handlers.js（archive confirm）调 reconcileDualRun：实际 diff 取 resolveReconcileActualFiles（:2549 单点），声明档从 .runtime/ceremony-tier-<change>.json 读；mismatch → verify errors 硬 flag / archive 阻断警告 + 摩擦账 + 事实面预价种子 `.runtime/ceremony-fact-seed-<session>.json`。

## Wave 3：prompt 面与配置

- task-05

**执行指引**：stages/plan.js——plan_level 输出改编排标签语义（wave/并行/模板厚度），加「仪式按 risk 计价，plan_level 仅编排」文案与 CLI 强制轻仪留痕路径；stages/brainstorm.js Step7——Grill 档位化菜单渲染（S3 两轮/S2 一轮独立/S1 CLI 清单+定向探针抽查/S0 CLI 清单，自审仅带 degraded 戳兜底）；run/prompt.js {REVIEW_TIER} 注入段（:1070-1088）随档位化改写；config-schema.js 登记 ceremony.force_tier / ceremony.shadow + local.yaml.example。docs/prompt 镜像三步流水线同步（plan.md/brainstorm.md/_extracted.json）。

## Wave 4：影子期与 doctor

- task-06

**执行指引**：影子派发框架——S0/S1 档在轻仪主线外后台派发重仪式（agent-tool 通道复用），产物落 `stage-reviews-shadow/<change>-<stage>-<ts>/review.json`，只记账不阻断；**隔离面双通道（计划评审补遗③）：目录隔离之外，marker 写入通道同步隔离——getLatestStageReviewRunId 优先读 current-stage-review-run-id-* marker 而非目录扫描（stage-review.js:377-390），影子派发不得写主线 marker**；doctor-diagnostics.js 新维度「影子对照」读两侧 catch 差异出报告；local.yaml ceremony.shadow 开关（on 首期默认）+ 转正判据（N=10 轻档变更且轻仪漏检=0 或均 advisory）。连带测试预告：task-05 触发 {REVIEW_TIER} 的 worktree-execute-spec-drift.test.mjs 及约 20 个 plan_level 文案测试（计划评审发现②，定向回归）。

## Wave 5：测试与全量验收

- task-07

**执行指引**：`NEW:test/ceremony-tier.test.mjs`——三轴取封顶矩阵/映射表逐档/escalateByFriction 只升不降+封顶/reconcileDualRun 错配注入（声明 S1 事实 S2 → error）/显式升降规则（升尊重/降须理由）/影子命名空间隔离（getLatestStageReviewRunId 不命中断言）/并发锁（模拟交错写不回退档位）；test/stage-review.test.mjs 增量钉 classifyReviewTier 委托行为（旧规则兼容：无 risk 输入 → 缺省 S2）。全量 npm test + lint 绿收口。

## 风险与回退

- R-01 轻仪漏检：双跑收口（task-04）+影子期（task-06）+L1 全开（约束5）三层兜底。
- R-02 阈值：span/friction 阈值常量集中 ceremony-tier.js 顶部，plan 期用 friction-ledger 历史回放标定（执行时先跑回放脚本定值再写常量）。
- R-03 镜像测试红：task-05 三步流水线同批次落盘。
- 回退路径：review-tier.js 委托一处 if 摘除即回旧规则；ceremony-tier 文件纯派生可删；local.yaml ceremony.force_tier: S3 强制全重（过渡逃生阀）。
- Wave 拓扑预对齐：01 / 02,03,04 / 05 / 06 / 07（05 仅依赖 02；06 依赖 03+05；07 收口全依赖）——同 Wave 并行契约下无共享文件（02=review-tier、03=gates+runtime、04=verify/archive 出口、05=prompt 面）。
