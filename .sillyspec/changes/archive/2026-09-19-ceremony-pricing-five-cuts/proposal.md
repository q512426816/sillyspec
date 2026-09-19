---
author: qinyi
created_at: 2026-09-19 07:45:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

> revision 1：按用户 2026-09-19 深度审查重定范围（D-001@v2）——五刀中的刀 1/5 作废，新增 blast 轴项目化。

## 动机
2026-09-18-ceremony-risk-pricing 的定价公式成立，但 blast 轴输入源错误：detectChangeRisk 用硬编码全宇宙词表（SillySpec 自用域词汇、零项目配置、八消费点共用）对文档措辞与文件内容做机械匹配——「撞词≠危险」（api-matrix 免责句被打 integration-critical；换仓 HTTP session/lifecycle/entryPoint 全良性）、自指陷阱（门禁引擎自身源码与教学文案写满关键词，事实面全文件扫描打出 deployment-critical）、时序粘住（首定价早于 risk_level 后补、永不重算）。另有 span 解析器与模板脱节（数字标题 vs 无编号标题）、双跑高报静默两处旁支缺陷。

## 关键问题
1. blast 危险面信号的合法来源：必须是项目自己声明的路径/结构面，不是全宇宙共用词表。
2. 仪式档与证据门耦合在同一判级输出上——纯函数门禁改动会被要求拿 daemon 启动证据。
3. 显式声明通道是补丁且受首定时序惩罚；懒 agent 却能用它连证据门一起豁免。
4. span 声明文件面解析恒空；高报不可见。

## 变更范围
四件事（详见 design.md 五 Wave）：①blast 轴项目化——_module-map.yaml 顶层 blast 段（路径前缀→tier+evidence 位）主声明、local.yaml blast_surfaces 只升不降并入、未命中 S1、词表+否定抑制+枚举继承硬退役不留 legacy、resolveChangeRisk 新导出（explicit 只压 tier 不豁免 evidence）、--force rebuild 顶层段文本回插、本仓自举声明表交付；②完成门声明追赶重定价（无摩擦可降、摩擦地板不退）；③readDesignOwnFiles 标题双形态+段关闭；④reconcileDualRun 高报 warn 只记账。

## 不在范围内（显式清单）
- 价目表不动（档位集合/三轴 max 公式/阈值 8 与 2/force_tier 只升不降）；证据门判据不动（VERIFICATION_NEEDS/checkIntegrationEvidence/auditRuntimeReceipt 零改动，只换触发源）。
- QUICK_RISK_PATH_PATTERNS 不迁（D-011 登记，管道建好后另立变更）。
- 在途/已归档变更不追溯（api-matrix 按锁定 S3 跑完，D-007@v2）。
- 不做行级/符号级危险面、不做 scan 自动改价。

## 成功标准（可验证）
- FR-01~FR-05 验收通过（见 requirements.md revision 1）。
- 词表从定价与证据门默认路径删除，`grep detectChangeRisk(` src/test 清零。
- api-matrix 同类文件面（3×S2 门禁文件+5×S1）在新架构下 = S2。
- 本变更自身走位：声明追赶后档位 S2、双跑事实面（文件名×声明面）= 声明档。
- 全量 npm test + npm run lint 通过。
