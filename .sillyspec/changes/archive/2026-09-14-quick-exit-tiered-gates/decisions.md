---
author: qinyi
created_at: 2026-09-14 01:28:15
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-quick-exit-tiered-gates
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 选道判据从文件数改为"有无落盘设计决策"
- type: architecture
- priority: P0
- status: accepted
- 模块域：setup
- source: user
- question: quick/full 车道选择的判据应该是什么？
- answer: 现行「≤3 文件且范围明确走 quick」中文件数是唯一可核验项、成了事实主判据；实证（sillyhub quicklog 交叉表）显示它量错维度——跨 2-3 模块×≤3 文件的改动文档同步率仅 24%，而单模块×4-6 文件反而 74%。改为语义判据：入口只回答"本次改动有没有需要落盘的设计决策"，有则走完整流程；AGENTS.md 判规模条款与 init 模板同步改写。
- normalized_requirement: AGENTS.md 第 6 条及 init 生成模板的选道规则不再以文件数为主判据；文件数降级为出口门禁绊线之一
- impacts: [FR-1, task-规则面]
- evidence: sillyhub quicklog 统计（对话 2026-09-14，交叉表复现两轮）；doc-consistency-debt.md §六"CLI 算事实"原则

## D-002@v1: quick 出口分级门禁（L0/L1/L2 机械画像），不新增第三条车道
- type: architecture
- priority: P0
- status: accepted
- 模块域：core-engine, runtime
- source: user
- question: 中间规模改动如何治理——新车道还是升级现有 quick 出口？
- answer: 不新增 mid 车道（自选车道会被激励扭曲绕过：95% 超限 quick 本就是 agent 自选、独立完成绕过 full 仪式；新车道=新状态机+新 prompt 面，违背纯减法原则）。改为 quick --done 出口按 CLI 侧机械信号自动升级：L0=现状 test/lint 实测门；L1（跨≥2 模块 或 ≥4 文件）=+每文件注记非空+测试增量检查；L2（跨≥4 模块 或 风险特征命中）=+模块文档认领或显式 --no-docs 豁免留痕+运行时证据要求。判定输入用 CLI 自算 changedFiles×module-map，不用 --files 自声明（37.1% 超限条目存在未声明脏文件）。
- normalized_requirement: 门禁分级判定全部在 quick --done 时由 CLI 计算（路径前缀聚类算模块跨度、文件数、风险特征表命中），agent 无法自选降级；L1/L2 检查项挂现有 audit 链路，零新增 prompt
- impacts: [FR-2, FR-3, task-信号层, task-门禁接线]
- evidence: sillyhub quicklog 统计（94.8% 独立 quick；跨4+模块同步率 16-25% 塌陷区）；prompt-control-debt.md 改进原则 1"纯减法优先"

## D-003@v1: 新门禁 advisory 起步，稳定后另立变更升 blocking
- type: compatibility
- priority: P1
- status: accepted
- 模块域：core-engine
- source: docs
- question: L1/L2 门禁从第一天就阻断，还是先观察？
- answer: 沿用 docs-consistency D-003 先例（docs-check 决策规则 advisory 起步，稳定后升 error）：L1/L2 起步 advisory（warn 打印+quicklog reasons 落账），dogfood 一个稳定周期后另立小变更升级阻断。避免 sillyhub 等存量大流量仓升级即被新门禁卡死。
- normalized_requirement: 门禁分级结果以警告+审计留痕形式输出，不阻断 --done；升级 blocking 需另立变更显式决策
- impacts: [FR-3]
- evidence: knowledge/decisions/docs-consistency.md D-003@v1 先例

## D-004@v1: 风险特征命中表扩展 detectChangeRisk，命中要求运行时证据而非人工确认
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: "1 文件的权限/计费改动"这类语义风险如何被机械门捕获？命中后如何处置？
- answer: 复用并扩展现有 detectChangeRisk()（change-risk-profile.js，verify --done 已在用、扫关键词判 integration/deployment-critical）：扩展为 quick 侧扫描 changedFiles 路径模式+diff 关键词（auth/permission/billing/migration/锁/调度等）。命中处置=要求运行时证据（照 verify 的 integration-critical 门禁做法，机械可查），不引入 quick 没有的人类等待态；人工确认作为后续备选项另议。
- normalized_requirement: 风险命中表以 change-risk-profile.js 为单一数据源扩展；quick --done 命中时要求 verify 式 Runtime Evidence 佐证
- impacts: [FR-2, task-信号层]
- evidence: src/change-risk-profile.js detectChangeRisk 既有机制；prompt-control-debt.md P4.1 记录；对话 2026-09-14 用户确认"先要证据不等人"

## D-005@v1: 未声明脏文件触发归属确认，不挂文档对账
- type: boundary
- priority: P1
- status: accepted
- 模块域：runtime
- source: user
- question: 审计发现未声明脏文件时应该触发什么检查？
- answer: 未声明脏文件是归属问题（可能是并行会话改动或漏申报，审计行自述两种可能），不是文档同步问题——挂文档对账会罚错人。触发归属确认（要求声明/剔除归属），与 L2 文档认领门分离。
- normalized_requirement: 未声明脏文件信号走归属确认路径，不进入文档认领检查
- impacts: [FR-3]
- evidence: sillyhub quicklog 审计行原文（"并行会话改动或本会话漏声明"）；对话 2026-09-14 两轮评审收敛

## D-006@v1: 门禁切分点数字以真实模块图谱重算为准
- type: boundary
- priority: P2
- status: accepted
- 模块域：core-engine
- source: code
- question: 跨度/文件数阈值（≥2/≥4 模块、≥4 文件）取什么值？
- answer: 交叉表两套启发式模块映射下格子数字不稳定（同一格 n=8 vs n=38），但交互模式稳定。阈值初值按本轮统计取（L1: 跨≥2 或 ≥4 文件；L2: 跨≥4 或风险命中），design 期用 _module-map.yaml 真实图谱重算 sillyhub 数据校准，作为本变更第一个实证任务。
- normalized_requirement: 阈值常量集中在单一配置点，design 期以真实 module-map 重算的交叉表校准后定稿
- impacts: [FR-2, task-校准]
- evidence: 对话 2026-09-14 交叉表复现（启发式映射 vs 复核方映射格子样本差异）

## D-007@v1: 实现形态选方案 B——独立纯函数信号模块 quick-gate-profile
- type: architecture
- priority: P0
- status: accepted
- 模块域：core-engine
- source: user
- question: 分级门禁的实现载体选哪个方案（A 内联审计链 / B 独立信号模块 / C 配置化 gate 引擎）？
- answer: 用户选方案 B（2026-09-14 对话轮，单字确认"b"）：新建纯函数信号模块（暂名 src/quick-gate-profile.js，命名 design 期可调），输入 changedFiles + _module-map.yaml + 风险特征表 → 输出画像 {模块跨度, 模块清单, 文件数, 风险命中, 门禁级别}；scope-audit.js 的 auditQuickCompletion 只调用不内联。拒绝 A（信号计算锁死 quick 链路、verify 侧将来无法复用、难单测）；拒绝 C（单消费场景 YAGNI、新配置面=新误判面、违背纯减法原则）。
- normalized_requirement: 分级判定逻辑全部位于独立纯函数模块（无 IO 副作用，module-map 数据由调用方传入）；audit 链路仅消费画像结果；阈值常量集中于该模块单一配置点
- impacts: [FR-2, FR-3, task-信号层, task-门禁接线]
- evidence: 方案选择轮次（2026-09-14，brainstorm Step4 --wait/--continue）；docs-debt.js 纯函数+注入点先例（decisions/docs-consistency.md D-001@v1）

## D-008@v1: scope-audit 命令增强为门禁画像独立出口（表格 + --json，可重放）
- type: architecture
- priority: P1
- status: accepted
- 模块域：core-engine, cli-entry
- source: user
- question: 分级门禁画像如何独立消费与历史重放？
- answer: 用户 2026-09-14 指定（设计确认轮顺带需求）：现有 `sillyspec scope-audit --change <变更名或quick会话id>` 增强为画像出口——表格与 `--json` 两条出口均含 gate 画像（文件数/模块跨度/模块清单/风险命中/门禁级别）与 L1/L2 advisory 发现；利用该命令既有的 quick 会话（quick-<8hex>）与归档变更重放能力，历史会话可回溯审计。与 D-006 校准任务打通：`--json` 批量重放 sillyhub 历史会话即真实图谱交叉表。维持命令 advisory 只读定位，不设门禁。
- normalized_requirement: computeChangeScopeAudit 结果并入 gateProfile 字段（quick-gate-profile 纯函数复用，不重复实现）；renderScopeAuditTable 与 --json 出口同步画像；对 quick 会话/归档变更的重放路径不回归
- impacts: [FR-4, task-门禁接线, task-校准]
- evidence: 用户 2026-09-14 设计确认轮原话"顺带增强这个能力"+命令语法；src/index.js:1304-1378 现有 scope-audit 命令面

## D-004@v2: 风险命中 v1 收敛为路径模式，diff 关键词维度延后
- type: architecture
- priority: P1
- status: accepted
- 模块域：core-engine
- source: code
- question: quick 侧风险命中能否覆盖 diff 关键词维度？
- answer: Design Grill 独立审查（2026-09-14 brainstorm-review-2026-09-14-093804）阻断 2：quick 审计链无 diff 文本入参（changedFiles 是路径清单），引入 diff 扫描需加 git 子进程（违背零子进程承诺）且 scope-audit 冻结重放态只有 rows 路径、diff 维度不可重放。收敛：v1 风险命中=路径模式 only（确定性、可重放、零子进程），覆盖 auth/permission/billing/migration/锁/调度主要踩坑域；diff 关键词维度出现真实需求时另立变更。运行时证据要求与人工确认排除条款不变。
- normalized_requirement: computeGateProfile 的 riskHits 仅含路径模式命中 {pattern, file}；不引入 diff 文本入参与 git 子进程；冻结重放态与实时态画像字段一致
- impacts: [FR-2, task-信号层]
- evidence: Grill review.json 阻断 2（run/shared.js changedFiles 为路径清单；scope-audit.js:787-805 冻结记录仅 rows）；supersedes: D-004@v1

## D-009@v1: 门禁阈值支持 local.yaml quick-gate 段覆写，缺省=校准默认值
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: 触发阈值（L1/L2 切分点）能否按项目配置？
- answer: 用户 2026-09-14（execute Step2 期追加）：THRESHOLDS 四键（l1_span/l1_files/l2_span/l2_files_degraded）经 local.yaml quick-gate 段覆写，未配置时用代码内默认值（即 task-05 校准定稿值）。与 D-007 否决的「配置化 gate 引擎」边界不同——不引入规则表达式/检查项配置面，仅四个数值键；默认值仍集中 quick-gate-profile.js 单点，config-schema.js 按「local.yaml 键单一数据源」惯例登记四 optional 键。
- normalized_requirement: quick-gate-profile.js 导出 resolveGateThresholds(config) 纯函数（local.yaml quick-gate 段 × 默认值合并）；computeGateProfile 经 opts.thresholds 接受已合并阈值；config-schema.js 新增 quick-gate 段四 optional 键 + local.yaml.example 注释示例；未配置该段时画像输出与纯默认值完全一致
- impacts: [FR-02, FR-05]
- evidence: 用户 2026-09-14 对话轮原话「触发阈值最好可以在 local.yaml 里配置，不配置就使用我们核对过的默认值」；D-007@v1 否决理由边界辨析
- 模块域：core-engine, setup
