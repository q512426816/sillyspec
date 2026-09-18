---
author: qinyi
created_at: 2026-09-18 14:20:00
generated_by: agent
change: 2026-09-18-ceremony-risk-pricing
---

# 任务清单（Tasks）

- [x] task-01: 新建 src/ceremony-tier.js——CEREMONY_TIERS/RISK_TO_TIER 映射、computeCeremonyTier 三轴取封顶（blast/span/friction，reasons 留痕）、escalateByFriction（min(S3,+1) 只升不降）、reconcileDualRun（声明档 vs 事实档错配判定）；显式声明升档尊重/降档须理由入参
- [x] task-02: classifyReviewTier 委托引擎（review-tier.js）——旧文件数≤3 规则降为 S0/S1 内部断路器；返回 {tier, ceremonyTier} 双字段过渡；三消费方（gates.js:242/:1015、prompt.js:1075、stage-review.js:570 注释约定）逐一核对兼容 (depends_on: task-01)
- [x] task-03: 阶段门升档接线（run/gates.js + .runtime/ceremony-tier-<change>.json）——四阶段完成门读 friction-ledger 累计账（不读 tally 避消费即删次序依赖），超阈 escalateByFriction，迁移记录 withFileLock+原子写 (depends_on: task-01)
- [x] task-04: 收口双跑两出口（verify-postcheck.js + run/complete-handlers.js）——实际 diff（resolveReconcileActualFiles 单点）重跑 blast+span，声明档<事实档→verify errors 硬 flag+archive 阻断警告+摩擦账+事实面预价种子落 .runtime（次单开跑价并入） (depends_on: task-01)
- [x] task-05: prompt 面与配置（stages/plan.js + stages/brainstorm.js + run/prompt.js + config-schema.js）——plan_level 编排标签语义+「仪式按 risk 计价」文案+强制轻仪留痕；Grill 档位化菜单渲染（S3 两轮/S2 一轮/S1 CLI清单+探针/S0 CLI清单）；ceremony.force_tier/shadow 键+example；docs/prompt 镜像三步流水线同步 (depends_on: task-02)
- [x] task-06: 影子期与 doctor（stage-reviews-shadow/ 独立命名空间 + doctor-diagnostics 新维度 catch 差异报告 + local.yaml 转正开关）——影子派发只记账不阻断，getLatestStageReviewRunId 不扫描影子空间 (depends_on: task-03, task-05)
- [x] task-07: 测试与验收（NEW:test/ceremony-tier.test.mjs + 既有 review-tier/gates/prompt 测试兼容增量）——三轴封顶/映射表/只升不降/双跑错配注入（声明S1事实S2 被flag）/影子隔离/并发锁断言；全量 npm test + lint 绿 (depends_on: task-01, task-02, task-03, task-04, task-05, task-06)
