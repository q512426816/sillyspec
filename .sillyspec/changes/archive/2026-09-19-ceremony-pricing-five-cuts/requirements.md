---
author: qinyi
created_at: 2026-09-19 07:45:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

> revision 1：随 D-001@v2 重定范围改写——FR-01 从「枚举继承」改为「blast 轴项目化」，FR-05 从「hunk 口径」改为「删除面收敛+自指走位」。

## 角色
| 角色 | 说明 |
|---|---|
| 项目维护者 | 在 _module-map.yaml 顶层 blast 段声明危险面（进 git）；可选 local.yaml 逐机升档 |
| 定价引擎（CLI） | resolveBlastSurfaces / computeCeremonyTier / applyDeclarationCatchUp 定价链 |
| 证据门（CLI） | requiredVerification 由 evidence 位直出（checkIntegrationEvidence 判据不变） |
| 双跑收口（CLI） | runCeremonyDualRunCheck（事实面=文件名×声明面，零内容扫描） |

## 功能需求

### FR-01: blast 轴项目化——声明面解析 + 词表退役 + evidence 位独立
Given 项目在 `_module-map.yaml` 顶层 blast 段按路径前缀声明 { tier: S0~S3, evidence?: true }，变更文件面（声明面或实际 diff）命中声明前缀
When resolveChangeRisk / resolveBlastSurfaces 判级
Then tier = 命中最高档（未命中 S1）；evidenceRequired = 任一命中条目带 evidence:true；`local.yaml ceremony.blast_surfaces` 只升不降（逐文件 max，不承载 evidence）；**frontmatter risk_level 只压 tier、不豁免 evidenceRequired**；词表/否定抑制/枚举继承/detectChangeRisk 散文扫描从 src 删除且 `grep detectChangeRisk(` src/test 清零；--force rebuild 写盘后 blast 段原样在场（回归钉）；map 段缺失 → 空表不缺省不拦截。

### FR-02: 完成门声明追赶重定价（无摩擦可降、摩擦地板不退）
Given 档位文件在场的变更，声明面已更新（后补 risk_level / blast 声明变化 / 文件清单增长）
When 任意阶段完成门执行 escalateCeremonyTierAtGate
Then 先按当前声明面重算（输入=declaredFiles×声明面+explicit）并应用 applyDeclarationCatchUp 三分支（transitions 空且未超阈→整档换可升可降；空且超阈→整档换不设地板、同锁 escalate 即时 +1；非空→max(重算档, transitions 最高 to)），再跑既有摩擦升档；重定价记 reasons「声明追赶重定价」不记 transitions；事件文案区分初始定价与追赶。

### FR-03: span 解析认「## 文件变更清单」标题
Given design.md 文件变更清单使用无编号标题（含带括注变体）
When readDesignOwnFiles 解析
Then 清单行正确计入（≥8 文件 → span S2）；`## 6.` 旧数字标题行为不变；任何 `^##\s` 标题关闭清单段。

### FR-04: 双跑高报 warn 只记账不阻断
Given verify --done / archive confirm 双跑对账，声明档高于事实档
When runCeremonyDualRunCheck 执行（事实面=actual.files × 声明面，零内容扫描）
Then severity 'warn'：无 violation、verify 不回滚、archive 不阻断、不记 gate_rollback、notes 披露；低报（fact > declared）维持 error 硬拦逐字不变。

### FR-05: 删除面收敛与本变更自指走位
Given detectChangeRisk 删除与八消费点翻新
When 全量测试与门禁执行
Then 消费点/测试/文案删除面收敛（含 stages/verify.js 教学段、quick-gate-profile.test 判级组、verify-conclusion-slot.test、stage-contract-spec 注释）；本变更自身在新架构下：blast=门禁判定文件 S2、span≥8 → S2、双跑事实面=声明档 S2 零 mismatch。

## 非功能需求
- 兼容性：存量 map 无 blast 段 → S1 起步（禁回退词表）；存量 frontmatter 五级词经 RISK_TO_TIER 兼容；api-matrix 同类面 = S2。
- 平台：路径匹配复用 matchModuleForFile 语义（POSIX 归一，Windows/macOS/Linux 无差）；零新正则族。

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v2 | FR-01~05 | 四件事编队 |
| D-003@v1 | FR-02 | 追赶/地板三分支 |
| D-004@v1 | FR-03 | 标题双形态+段关闭 |
| D-005@v1 | FR-04 | 高报 warn |
| D-008@v1→v2 | FR-01, FR-05 | 声明面机制+词表退役（v2 修正 rebuild 回插） |
| D-009@v1 | FR-01 | evidence 位独立不被 explicit 豁免 |
| D-010@v1 | FR-01, FR-05 | 自举声明表口径 |
| D-011@v1 | — | QUICK_RISK_PATH_PATTERNS 登记（非目标侧） |
| D-007@v2 | — | 已归档变更不追溯（零动作） |
