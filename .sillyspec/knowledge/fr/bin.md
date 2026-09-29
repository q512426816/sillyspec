## FR-bin-001 blast 轴项目化——声明面解析 + 词表退役 + evidence 位独立
变更：2026-09-19-ceremony-pricing-five-cuts
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 项目在 `_module-map.yaml` 顶层 blast 段按路径前缀声明 { tier: S0~S3, evidence?: true }，变更文件面（；When resolveChangeRisk / resolveBlastSurfaces 判级；Then tier = 命中最高档（未命中 S1）；evidenceRequired = 任一命中条目带 evidence:true；`local.yaml ceremo
全文：.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/requirements.md#FR-01
最近确认：7438d34

## FR-bin-002 完成门声明追赶重定价（无摩擦可降、摩擦地板不退）
变更：2026-09-19-ceremony-pricing-five-cuts
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 档位文件在场的变更，声明面已更新（后补 risk_level / blast 声明变化 / 文件清单增长）；When 任意阶段完成门执行 escalateCeremonyTierAtGate；Then 先按当前声明面重算（输入=declaredFiles×声明面+explicit）并应用 applyDeclarationCatchUp 三分支（transiti
全文：.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/requirements.md#FR-02
最近确认：7438d34

## FR-bin-003 span 解析认「## 文件变更清单」标题
变更：2026-09-19-ceremony-pricing-five-cuts
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given design.md 文件变更清单使用无编号标题（含带括注变体）；When readDesignOwnFiles 解析；Then 清单行正确计入（≥8 文件 → span S2）；`## 6.` 旧数字标题行为不变；任何 `^##\s` 标题关闭清单段。
全文：.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/requirements.md#FR-03
最近确认：7438d34

## FR-bin-004 双跑高报 warn 只记账不阻断
变更：2026-09-19-ceremony-pricing-five-cuts
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given verify --done / archive confirm 双跑对账，声明档高于事实档；When runCeremonyDualRunCheck 执行（事实面=actual.files × 声明面，零内容扫描）；Then severity 'warn'：无 violation、verify 不回滚、archive 不阻断、不记 gate_rollback、notes 披露；低报（
全文：.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/requirements.md#FR-04
最近确认：7438d34

## FR-bin-005 删除面收敛与本变更自指走位
变更：2026-09-19-ceremony-pricing-five-cuts
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given detectChangeRisk 删除与八消费点翻新；When 全量测试与门禁执行；Then 消费点/测试/文案删除面收敛（含 stages/verify.js 教学段、quick-gate-profile.test 判级组、verify-conclus
全文：.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/requirements.md#FR-05
最近确认：7438d34
