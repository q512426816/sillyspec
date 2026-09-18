---
author: qinyi
created_at: 2026-09-18 14:03:06
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---
<!-- risk_level 覆盖说明：自动判级 integration-critical 系关键词误伤——「生命周期契约表」节的 lifecycle 命中，但该表描述的是变更内档位状态文件的迁移（ceremony-tier-<change>.json 纯派生数据），实际改动面（定价引擎纯函数/委托接线/prompt 渲染/测试）不触 daemon/session/启动入口，单测可证；daemon、session、lease 三词已被同句否定语境抑制（CLI 判级输出在案）。D-004 通道：降级留理由，收口双跑将以实际 diff 复核本声明。 -->

# 设计文档（Design）— 2026-09-18-ceremony-risk-pricing

## 背景

双胞胎实验（2026-09-17 任务②）实证了定价错配：risk_level=unit-sufficient 的低风险变更跑了独立评审两轮+全量计划，token 64M（OpenSpec 同题 10.3M，4.7~6.3×），其中评审子代理占 52% 请求。根因是两根轴抢方向盘：`plan_level`（agent 自报）驱动评审档与计划厚度、`risk_level`（CLI 判）只管 verify 证据要求、span 尺（quick-gate-profile）几乎不进价。用户钉死关键风险：**agent 会偷懒，档位判定必须是客观计算，一切 agent 自报只可升不可降**。多轮评审收敛为「变更内自适应升档」方案（三层保险的信用分/硬 reopen 被 D-006 显式拒绝）。

## 设计目标

1. 仪式强度（评审轮次/计划厚度/Grill 深度）由 `ceremony_tier = max(blast, span, friction)` 客观计算，接管 review-tier。
2. 低风险变更按 S0/S1 轻仪执行：任务②同类请求数与 token 显著下降。
3. L1 机械门（探针/矩阵/docs-check/代码证据）全档全开——能力底盘零削弱，拦截数守恒。
4. 收口双跑：预价信声明、结算信事实（实际 diff），懒 agent 的低报在收口被硬 flag。

## 非目标

- 不做跨会话 agent/会话信用分；不做归档后硬 reopen（D-006，防复潮）。
- 不改 `detectChangeRisk` 判级算法本身（只消费其输出做 S 档映射）。
- 四杠杆中的门禁前置、评审事实包、产物预填、wait 继承盖章——另立变更（本变更只做定价脊骨）。
- 不动 verify 既有证据门（PASS 资格帽/smoke/api-matrix 等照旧全量）。

## 拆分判断

定价引擎+接管+双跑+影子期是完整性单元：只上引擎不接管=空转；只接管不双跑=低报无对账；双跑无影子=轻仪放行是赌博。四杠杆零件依赖档位存在才有挂点，先脊骨后零件。

## 总体方案

**Phase 1 引擎（新模块 ceremony-tier.js）**：`computeCeremonyTier` 三分量取封顶——blast：`detectChangeRisk` 五档映射 S0(doc-only)/S1(unit-sufficient)/S2(contract-required)/S3(integration+deployment-critical)，`extractExplicitRiskLevel` 显式声明照旧参与（升档永远尊重、降档须理由）；span：模块数≥3 或声明文件数≥8 或命中 `QUICK_RISK_PATH_PATTERNS` → 至少 S2（复用 `computeGateProfile` 的 moduleIndex 输入；apply 过滤「改动⊆声明清单」是 span 少报的天然刹车，明示自洽）；friction：**阶段门读 friction-ledger 持久累计账**（不读 friction-tally——tally 有「消费即删」语义（friction-tally.js:220 consumeFrictionHint 读后删、verify 收尾清零），读它会在 verify 门产生隐式次序依赖；ledger 是只增账本无此问题），`gate_rollback`/`review_rejected` 超阈 → `min(S3, tier+1)`，只升不降，检查点钉四阶段完成门。

**Phase 2 接管与双跑**：`classifyReviewTier` 委托引擎（旧「design 文件数≤3 判 self」降级为 S0/S1 内部并列断路器保留兼容）；plan 阶段 `plan_level` 输出降级为编排标签（wave 拆分/并行/模板厚度），prompt 明示「仪式按 risk 计价，plan_level 仅编排」，agent 报 full 但 price=S1 时 CLI 强制轻仪留审计痕；brainstorm Step7（Design Grill）与 plan 审查按 tier 渲染——S3 两轮 Grill、S2 一轮独立、S1 CLI 清单核验+定向探针抽查、S0 CLI 清单核验，自审仅通道全不可用时带 degraded 戳兜底（沿用 self=降级态语义）。**双跑**：verify `--done` 与 archive confirm 两出口用实际 diff（scope-audit/apply-pathspec 文件集）重跑 blast+span，声明档<事实档 → 硬 flag（verify errors / archive 阻断警告）+ 记 friction 账 + 写「事实面预价种子」到 `.runtime`，该会话下一 change 的开跑价强制并入事实面。

**Phase 3 影子期**：S0/S1 轻档首期影子——明面轻仪走主线，后台静默派发重仪式（independent 评审）只记账不阻断；`.runtime` 落对照账（轻/重各自 catch 了什么），`sillyspec doctor` 新增维度读对照账出 catch 差异报告；攒 N=10 个轻档变更且「轻仪漏检=0 或漏检项均为 advisory 级」才转正（转正开关 local.yaml `ceremony.shadow: off`）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/ceremony-tier.js | 定价引擎：computeCeremonyTier / escalateByFriction / RISK_TO_TIER 映射 / span 阈值常量。producer=本模块，consumer=review-tier.js（评审档）、run/gates.js（阶段门升档）、verify-postcheck.js 与 complete-handlers.js（双跑）、stages prompt 渲染 |
| 修改 | src/review-tier.js | classifyReviewTier 委托 computeCeremonyTier；文件数≤3 规则降为 S0/S1 内部断路器；tier 消费方（stage-review renderReviewJsonContract）签名兼容 |
| 修改 | src/run/gates.js | 阶段完成门追加升档检查：读 friction-tally → escalateByFriction → 档位迁移写 .runtime/ceremony-tier-<change>.json（只升不降，封顶 S3） |
| 修改 | src/verify-postcheck.js | 双跑第一出口：实际 diff 重跑 blast+span，与开跑声明档比对，低报 → errors 硬 flag + 摩擦账 |
| 修改 | src/run/complete-handlers.js | 双跑第二出口（archive confirm）+ 事实面预价种子落 .runtime（次单预价用） |
| 修改 | src/stages/plan.js | plan_level 输出改编排标签语义；「CLI 强制轻仪留痕」文案；prompt 镜像 docs/prompt/plan.md 同步 |
| 修改 | src/stages/brainstorm.js | Step7 Grill 按 tier 渲染档位化指令（S3 两轮/S2 一轮/S1 CLI 清单+探针/S0 CLI 清单）；镜像同步 |
| 修改 | src/run/prompt.js | classifyReviewTier 第三消费面：{REVIEW_TIER} 注入段（:1070-1088）随 tier 档位化改写（Grill 评审补遗：清单原漏此文件） |
| 修改 | src/config-schema.js | 新键 ceremony.force_tier / ceremony.shadow 登记 LOCAL_YAML_SCHEMA + local.yaml.example（Grill 评审补遗：加键忘 example 触发既有耦合测试红） |
| 修改 | src/doctor-diagnostics.js | 新维度：影子期对照账 catch 差异报告 |
| 新增 | NEW:test/ceremony-tier.test.mjs | 引擎直测：三轴取封顶/映射表/升档只升不降/双跑错配判定/显式声明升降规则 |
| 修改 | test/stage-review.test.mjs | classifyReviewTier 委托后的行为钉死（旧规则兼容断言；Grill 确认 :242/:1015 消费面在此覆盖） |
| 修改 | docs/prompt/README.md | 占位符总表 {REVIEW_TIER} 行更新为委托定价语义（execute 收尾合理偏差补录：task-05 镜像面的延伸，评审建议主代理收口） |

数据流向：decisions/design（声明面）+ _module-map（span）+ friction-tally（过程）→ ceremony-tier.js 单点定价 → review-tier / gates / prompt 三消费面；实际 diff（scope-audit）→ 双跑结算 → 摩擦账 + 次单预价种子（闭环）。

## 接口定义

```js
// src/ceremony-tier.js
export const CEREMONY_TIERS = ['S0', 'S1', 'S2', 'S3']; // 只升不降的档位序
export const RISK_TO_TIER = { 'doc-only': 'S0', 'unit-sufficient': 'S1',
  'contract-required': 'S2', 'integration-critical': 'S3', 'deployment-critical': 'S3' };

export function computeCeremonyTier({ riskDetection,           // detectChangeRisk 输出 {level, triggers}
  explicitRiskLevel, declaredFiles, moduleIndex,               // span 输入（module-map 索引）
  frictionCounts })                                            // { gate_rollback, review_rejected }（读自 friction-ledger 累计账）
// → { tier: 'S0'|'S1'|'S2'|'S3', components: { blast, span, friction },
//     reasons: string[], explicitDowngradeAccepted: boolean }

export function escalateByFriction(currentTier, frictionCounts, thresholds)
// → { tier, escalated: boolean }  // min(S3, +1)，只升不降

export function reconcileDualRun({ declaredTier, factRiskDetection, factFiles, factModuleIndex })
// → { factTier, mismatch: boolean, severity: 'error'|'none' }  // 声明档<事实档 → error
```

档位→仪式菜单（消费侧映射，非引擎内）：S0=CLI 清单核验；S1=CLI 清单+定向探针抽查；S2=独立评审×1+完整 plan；S3=独立评审×2+Grill 两轮+全量 verify 证据。

## 生命周期契约表

本设计涉及变更内档位状态迁移（tier lifecycle，非 session/lease/daemon 面）：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| 开跑定价 | CLI（brainstorm 起步） | .runtime/ceremony-tier-<change>.json | tier/components/reasons | 无 → 初始档 |
| 阶段门升档 | run/gates.js（四阶段完成门） | 同上文件（追加迁移记录） | from/to/frictionCounts | tier → min(S3, tier+1)，只升不降 |
| 收口结算 | verify/archive 双跑出口 | 摩擦账 + 次单预价种子 | declaredTier/factTier/mismatch | 变更终态定格，不回改 |
| 档位文件并发写 | 阶段门（多会话并发） | .runtime/ceremony-tier-<change>.json | from/to | withFileLock + 原子写（复用仓内 .tasks.md.lock/writeAtomicSync 先例）保「只升不降」不变量；影子评审落 stage-reviews-shadow/ 独立命名空间，不被 getLatestStageReviewRunId 命中（Grill 评审 R-06 补遗） |

## 数据模型

无 sillyspec.db schema 变更。档位状态为 `.runtime/ceremony-tier-<change>.json` 单文件（结构如上表字段；与 friction-tally 同目录同生命周期，archive 时随 runtime 清理）。

## 兼容策略（brownfield 必填）

- 旧变更无 risk_detection 输入时：blast 缺省 S2（保守中档），行为近似现状（independent×1），不静默降级。
- 回退路径：删除 ceremony-tier 委托（review-tier 一处 if）即回旧文件数规则；档位文件是纯派生数据，删除无迁移。
- 逃生阀：local.yaml `ceremony.force_tier: S3`（仓库管理员可强制全重仪式，绕过定价——留给「就是不信这套」的过渡期）。
- 不改变：verify 证据门全套、PASS 资格帽、探针、docs-check、L1 机械门——本变更不动任何门的存在性，只动 LLM 仪式的档位。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 轻仪漏检（S0/S1 放行的变更藏重问题） | P1 | 双跑收口对账（低报硬 flag）+ 影子期明轻暗重 catch 对照达标才转正 + L1 机械门全档全开兜底 |
| R-02 | span/friction 阈值拍脑袋 | P2 | 上线前用 friction-ledger 历史变更回放标定（召回三问：真出事变更是否被低价放过/平安变更是否被高价/拦截数守恒）；阈值常量集中可调 |
| R-03 | prompt 面改动破坏既有镜像测试 | P2 | docs/prompt 三步流水线同步；brainstorm/plan 相关测试定向回归 |
| R-04 | 影子期 token 不降反升引发困惑 | P3 | doctor 对照账可视化差异；local.yaml 开关 + 转正判据公示 |
| R-05 | 旧消费方直接调 classifyReviewTier 拿旧语义 | P3 | 委托后返回结构保持 {tier:'self'|'independent', ceremonyTier:'S*'} 双字段过渡，grep 消费点逐一核对 |
| R-06 | 影子期重评审污染主线 gate（getLatestStageReviewRunId 命中影子 verdict=fail 产物硬阻断） | P2 | 影子评审落 stage-reviews-shadow/ 独立命名空间，主线 gate 不扫描；并发写档位文件用 withFileLock+原子写（Grill 评审补遗） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Phase 1 / 接口定义 computeCeremonyTier | 已落实 |
| D-002@v1 | 总体方案 Phase 2（plan_level 编排标签+强制轻仪留痕） | 已落实 |
| D-003@v1 | 总体方案 Phase 2 双跑 / verify-postcheck+complete-handlers 两出口 | 已落实 |
| D-004@v1 | Phase 1 blast 段（显式降级须理由+收口复核）/ R-01 应对 | 已落实 |
| D-005@v1 | Phase 2 档位→仪式菜单（S1=CLI 清单+探针，自审带戳兜底） | 已落实 |
| D-006@v1 | 非目标第一条 | 已落实 |
| D-007@v1 | 总体方案 Phase 3 影子期 / R-04 | 已落实 |
| D-008@v1 | 总体方案 Phase 1 friction 段（四阶段门检查点） / 生命周期契约表 | 已落实 |

无未解决决策；剩余风险挂账见 R-01~R-05。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 ~ D-008@v1 全入决策追踪）
- [x] 涉及生命周期关键词时含「生命周期契约表」（tier 状态迁移已列表）
- [x] UI 原型分级核对（纯 CLI 定价引擎，无前端文件，原型跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无存疑项；阈值数值留 plan 期标定，判据已定）
