---
author: qinyi
created_at: 2026-09-18 06:12:08
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 变更执行 agent | 被定价的执行者——一切自报只可升不可降，无档位操作面 |
| sillyspec 维护者 | 需要定价客观可审计（阈值可标定、迁移有记录、双跑有账） |
| SillyHub/面板消费方 | 需要档位与升档迁移可观测（progress/doctor 面） |

## 功能需求

### FR-01: 三轴客观定价引擎
覆盖决策：D-001, D-008
Given `src/ceremony-tier.js` 的 `computeCeremonyTier` 接收 blast（detectChangeRisk 输出+显式声明）、span（声明文件数/模块跨度/风险路径命中）、friction（friction-ledger 累计账的 gate_rollback/review_rejected）三分量
When 任一分量达到更高档
Then `ceremony_tier = max(blast, span, friction)` 取封顶，档位 ∈ S0/S1/S2/S3（映射既有五档：doc-only→S0 / unit-sufficient→S1 / contract-required→S2 / integration+deployment-critical→S3），返回 components 与 reasons 全程留痕

#### 场景：span 封顶防「单测档改半个仓」
Given detectChangeRisk 判 unit-sufficient（blast=S1）但声明文件数≥8 或模块跨度≥3 或命中 QUICK_RISK_PATH_PATTERNS
When 定价
Then tier ≥ S2（span 分量封顶生效），reasons 含 span 命中明细

#### 场景：agent 自报只升不降
Given agent 声明 needs_human_review 或显式 risk_level 升档
When 定价
Then 按升档执行且留痕；任何自报不产生降档（降档唯一通道=D-004 留理由+收口复核）

### FR-02: 接管 review-tier 与 plan_level 降级编排化
覆盖决策：D-002, D-005
Given classifyReviewTier 现行「planLevel 三分支+文件数≤3 启发式」
When 本变更落地后
Then 评审档由 computeCeremonyTier 决定（旧文件数规则降为 S0/S1 内部断路器保兼容）；plan 阶段 plan_level 输出仅为编排标签（wave/并行/模板厚度），prompt 明示「仪式按 risk 计价，plan_level 仅编排」，agent 报 full 但 price=S1 时 CLI 强制轻仪留审计痕；S1 档默认仪式=CLI 清单核验+定向探针抽查，agent 自审仅通道全不可用时带 degraded 戳兜底

#### 场景：任务②同款不再全价
Given risk=unit-sufficient、span 未超阈、无摩擦记录的变更
When 进入 brainstorm Step7 审查与 plan 审查
Then 按档位化菜单执行轻仪（S1），不因「计划写得完整」进入 independent×2

### FR-03: 收口双跑对账（预价信声明，结算信事实）
覆盖决策：D-003, D-004
Given verify --done 与 archive confirm 两出口可取实际 diff 文件集（resolveReconcileActualFiles 单点现成）
When 收口
Then 用实际 diff 重跑 blast+span 得事实档；声明档<事实档 → 硬 flag（verify errors / archive 阻断警告）+ 记摩擦账 + 写事实面预价种子到 .runtime，该会话下一 change 开跑价强制并入事实面；显式降档（risk_level 覆盖）被事实面支持则放行、不支持则 flag

#### 场景：懒 agent 低报被收口抓获
Given design 声明面未提风险关键词（blast 判 S1）但实际 diff 命中 auth/migration 路径（事实档 S2+）
When verify --done 双跑
Then mismatch=error 硬 flag，摩擦账留档，次单预价按事实面

### FR-04: friction 阶段门升档与影子期
覆盖决策：D-007, D-008
Given 四阶段完成门（gate 评估点）读 friction-ledger 累计账
When gate_rollback/review_rejected 超阈
Then tier = min(S3, tier+1) 只升不降，迁移记录写 .runtime/ceremony-tier-<change>.json（withFileLock+原子写）；S0/S1 轻档首期影子——明面轻仪走主线、后台重仪式落 stage-reviews-shadow/ 独立命名空间只记账不阻断主线 gate，doctor 新维度出 catch 差异报告，达标（N=10 且轻仪漏检=0 或均为 advisory 级）才转正

#### 场景：影子产物不污染主线
Given 影子重评审 verdict=fail 落盘
When 主线 gate 经 getLatestStageReviewRunId 找评审产物
Then 不命中影子命名空间（stage-reviews-shadow/ 隔离），主线不受影子 verdict 阻断

## 非功能需求
- 兼容性：旧变更无 risk 输入时 blast 缺省 S2（保守中档≈现状），不静默降级；local.yaml ceremony.force_tier 逃生阀；全量测试零回归
- 可审计：档位/迁移/双跑错配全部留痕可查（reasons/friction 账/doctor 报告）
- 并发安全：档位文件读写 withFileLock+原子写，「只升不降」不变量在多会话并发下成立

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 三轴取封顶定价接管 |
| D-002@v1 | FR-02 | plan_level 降级编排标签 |
| D-003@v1 | FR-03 | 收口双跑对账 |
| D-004@v1 | FR-03 | 降级通道保留+复核 |
| D-005@v1 | FR-02 | S1 默认 CLI 核验非自审 |
| D-006@v1 | 非目标清单 | 信用分/reopen 防复潮 |
| D-007@v1 | FR-04 | 影子期标定 |
| D-008@v1 | FR-01, FR-04 | 检查点钉阶段门只升不降 |
