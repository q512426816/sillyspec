---
author: qinyi
created_at: 2026-09-19 08:22:12
generated_by: sillyspec-fourpiece-init
change: 2026-09-19-span-risk-pattern-migration
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 范围与硬约束——六模式表迁项目声明，价目表/blast 段零改动
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: 本变更做什么、不做什么。QUICK_RISK_PATH_PATTERNS（src/change-risk-profile.js:36-43，auth/permission/billing/migration/lock/scheduling 六域路径模式，硬编码通用表）是判级/定价域最后一张全宇宙表，2026-09-19-ceremony-pricing-five-cuts D-011 登记的遗留（「管道有了再迁」——blast 声明面管道已落 main：src/blast-surface.js loadBlastDeclarations + run/gates.js:639 / review-tier.js:122 / verify-postcheck.js:3067 / verify-quality-scan.js:534 四处装载先例）。
- answer: 迁移=六模式表自硬编码改项目声明（形态在方案步定），两消费面（①ceremony-tier.js:218 span 轴命中→至少 S2；②quick-gate-profile.js:148 computeGateProfile 默认 riskTable 命中→L2+runtimeEvidence advisory）按方案期决策切换。硬约束（用户原话逐条）：**价目表不动**（三轴 max 公式、阈值 8/2、force_tier 只升不降）；**blast 声明面（blast 段）不动**——只迁 span 的路径模式；quick 画像消费面与定价消费面口径**可以分开迁也可以一起**（design 定）；risk_level 先行纪律（design frontmatter 首次定价前声明）。
- normalized_requirement: QUICK_RISK_PATH_PATTERNS 硬编码表退役为项目声明；三轴公式/阈值/force_tier 语义与既有回归钉零变化；_module-map.yaml blast 段（含其缺失现状）本变更零触碰；design.md frontmatter 在首次定价前携带 risk_level。
- impacts: [FR-01, FR-02, FR-03]
- 模块域: core-engine, runtime, docs-consistency
- evidence: 用户任务简报 2026-09-19；.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/decisions.md D-011@v1；src/change-risk-profile.js:36-43；src/ceremony-tier.js:218；src/quick-gate-profile.js:148
- 故障面: 迁移中匹配语义漂移（口径变化伪装成迁移）——以「同 token 集 ⇒ 逐字节同命中」等价性钉对冲（方案步定）。
- 退役判据: 若 span 轴整体改结构化输入（非路径模式），本机制随轴退役。

## D-003@v1: 方案 A——map 顶层 span_risk 段（token 扁平列表）+ 空缺省 + 双消费面同刀 + 硬退役
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 六模式表的声明形态与迁移口径。三候选：A _module-map.yaml 顶层新 span_risk 段（token 扁平字符串列表，装载编译为现行同款边界锚定正则）+ 无声明空表 + 两消费面（ceremony span 轴 / quick 画像 riskTable）同刀切换 + QUICK_RISK_PATH_PATTERNS 硬退役不留 legacy；B local.yaml 键（ceremony/quick-gate 段挂 patterns 键）；C 内置六域表保活为缺省种子，声明面只做覆盖。
- answer: 选 A（用户简报显式委托方案期定夺——原话「形态 brainstorm 定」「缺省行为、本仓自举表、两消费面切换、向后兼容（无声明项目）都在方案期落决策」；本条 agent 按委托选定，可 --reopen 否决）。理由：①与 blast 管道同构（D-008 先例：map 主声明进 git 可评审、modules rebuild --force 未知顶层段通用回插已覆盖 span_risk、装载容错立场「坏段跳过不拦截」现成）；②B 被等价问题显式否决过——local.yaml gitignore 每机一份当共享价目表（D-008 evidence 原文「local.yaml 当共享价目表」被否）；③C 与 blast「未配置禁止回退」（D-008）正面冲突且让全宇宙表活在缺省路径，违反知识库 conventions「判级/定价/门禁输入必须项目声明，禁全宇宙词表」口径真相源条目。覆盖决策：符合 D-001（价目表公式零改动）、不违 D-002（不触碰 blast 段）。
- normalized_requirement: _module-map.yaml 顶层 span_risk 段（token 字符串数组）为 span 路径模式唯一声明源；token 编译口径=现行正则逐字等价（前界 (^|[/_-])、后界 (?=[/._-]|$)、/i——同 token 集命中面逐字节相同，等价性有回归钉）；无声明/坏段 → 空表（span 模式维度关闭，不回退内置表）；两消费面同刀；QUICK_RISK_PATH_PATTERNS 导出删除。
- impacts: [FR-01, FR-02, FR-03]
- 模块域: core-engine, runtime, docs-consistency, setup
- evidence: 用户简报 2026-09-19（委托原话）；blast 先例 src/blast-surface.js（装载/容错/AllProjects 形态）；D-008@v1「未配置的项目禁止回退到旧词表」；knowledge/conventions.md「判级/定价/门禁输入必须项目声明」；modules.js 未知顶层段通用回插（D-008@v2）
- 故障面: ①无声明项目静默失去六域网（auth/billing 路径不再触发 span S2 / quick L2）——以 known-issues/文档登记 + 本仓自举表示范对冲，blast 迁移同款取舍；②token 写错（拼错/过宽）静默失配——token 为纯字面量可评审，装载数量进 reasons 审计。
- 退役判据: 若 span 轴改结构化输入或 pattern 声明并入 blast 段 schema 升版，本段形态随之退役。

## D-002@v1: 锚点事实修正——blast 30 前缀自举表未落 main（悬空提交 bbe30ab），本变更不修
- type: premise
- priority: P1
- status: accepted
- source: code
- question: 任务前提称「30 前缀自举表在案可参考形态」——main 实况如何？
- answer: 实证：main 的 .sillyspec/docs/sillyspec/modules/_module-map.yaml **无 blast 段**（grep ^blast: 零命中，281 行全为 modules 段）。自举表只存在于悬空提交 bbe30ab（task-01，git branch -a --contains 零分支包含——worktree 已删、分支已失）；上一变更归档走 --skip-apply（skip-apply.record.json 在案），7e8bb22 手工提交面只带回 map 3 行（blast-surface.js 路径登记）。管道（装载器/消费面/schema/回插机制/测试）确实已落 main——「管道已就位」成立，「表在案」不成立。处置：本变更不修（硬约束 blast 段不动）；登记 knowledge/known-issues；修复（自 bbe30ab 恢复 blast 段文本）留独立变更。参考形态自 bbe30ab 读取（S3+evidence 运行时域 17 前缀 + S2 门禁判定 13 前缀）。
- normalized_requirement: 本变更不触碰 blast 段（含不借道恢复）；known-issues 增条目记录悬空提交与恢复路径；方案文档引用 bbe30ab 为形态参考而非 main 现状。
- impacts: [FR-04]
- 模块域: docs-consistency
- evidence: git show bbe30ab:.sillyspec/docs/sillyspec/modules/_module-map.yaml（blast 段在）；git grep ^blast: main map（零命中）；.sillyspec/changes/archive/2026-09-19-ceremony-pricing-five-cuts/skip-apply.record.json；git branch --all --contains bbe30ab（空）
- 故障面: main 定价面 blast 轴当前全仓 S1 起步（无任何声明）——已知缺口由独立修复收口，本变更 span 轴不依赖 blast 段（互不耦合）。
- 退役判据: 独立恢复变更落地即 superseded。

## D-004@v1: 本仓自举表——定制而非照抄六域（migration 族 + scheduling 族含 dispatch）
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: 本仓 _module-map.yaml 的 span_risk 自举段声明哪些 token——照抄六域（auth/permission/billing/migration/lock/scheduling）还是定制？
- answer: 定制：migration 族（migrate/migration/migrations）+ scheduling 族（dispatch/scheduler/scheduling/cron/job/jobs），共 9 token。依据：①现行六域中 auth/permission/billing/lock 在本仓 src/ 零路径实体（grep 实证无 auth/billing/permission 命名文件；lock 无 lock 命名文件）——声明无实体的域是死配置，违反「项目自己的危险面自己声明」口径；②migration 族保住现行命中面（src/migrate.js、src/docs-migrate.js 今日即被 migrations?/migrate 命中——迁移工具/文档迁移是本仓真风险域）；③scheduling 族是本 dispatch/异步任务域的自 declaration（现行通用表 schedul(?:er|ing)|cron|jobs? 在本仓恰零命中，dispatch 词不在通用表——本仓按自身模块图补 declaration：src/dispatch/、src/review-dispatch.js），这是迁移的立意本身：声名面反映项目实况而非全宇宙猜测。行为面如实登记：本仓 dispatch 域文件自本变更起 span 命中→S2 / quick L2（比现行严）——这正是声明面该有的灵敏度。
- normalized_requirement: 本仓 map span_risk 段 = [migrate, migration, migrations, dispatch, scheduler, scheduling, cron, job, jobs]；不声明 auth/permission/billing/lock（无实体）；行为差异（dispatch 域新增命中）在 design 风险节登记。
- impacts: [FR-04]
- 模块域: docs-consistency
- evidence: 本会话 grep 实证（本仓 src 无 auth/billing/permission/lock 命名路径；src/migrate.js、src/docs-migrate.js、src/dispatch/、src/review-dispatch.js 在案）；现行表 change-risk-profile.js:36-43（schedul/cron/jobs 族本仓零命中、无 dispatch 词）
- 故障面: dispatch 域灵敏度上升带来的误伤面（纯文档性 dispatch 改动也被 quick L2 提示）——L2 是 advisory 不阻断；dispatch 域确属异步任务风险域，误伤面可接受。
- 退役判据: 本仓模块图重构使 dispatch/migration 域消亡时随 map 评审退役。

## D-005@v1: 执行期裁决——连带测试翻新面扩展两文件（Grill 枚举遗漏）+ design 阈值措辞修正
- type: compatibility
- priority: P1
- status: accepted
- source: agent
- question: task-04 全量实证净增 2 个确定性失败：test/scope-audit.test.mjs:1042（夹具 src/api/auth-check.js 期望 L2 风险命中）与 test/audit-quick-completion.test.mjs G-4（夹具 src/web/auth.js 同因级联）——两文件夹具依赖旧默认风险表，不在 design 文件清单与 Grill X-8 点名清单内（X-8 只 grep 了 quick-gate-profile/ceremony-tier 两测试文件）。另：design 非目标「阈值 8/2」措辞失准（代码实况 SPAN_FILES_THRESHOLD=8 / SPAN_MODULES_THRESHOLD=3 / FRICTION_ESCALATION_THRESHOLD=2——用户约束「阈值 8/2」实指 8 文件+2 摩擦）。
- answer: 扩翻新面：两测试文件补翻新（夹具 map 补 span_risk 段走真实装载路径——比注入更端到端），design 文件清单/任务卡 allowed_paths/tasks.md 同步扩面；阈值措辞全文修正为「阈值 8/3/2 三常量」（约束实质=三常量零改动，已满足且继续满足）。非破坏性：可逆、局部、不改 D-001~D-004 语义、不越变更边界（两文件属本变更行为契约的直接连带测试，FR-03 同类翻新义务）。
- normalized_requirement: test/scope-audit.test.mjs 与 test/audit-quick-completion.test.mjs 夹具补 span_risk 声明（或等效注入）后全量绿；design.md/plan.md 阈值表述=8/3/2 三常量零改动；文件清单含两测试文件。
- impacts: [FR-03, FR-05, task-03, task-04]
- 模块域: core-engine
- evidence: task-04 全量对照实证（基线 17 失败全环境性逐字相同、净增 2 失败定位两夹具用例；stash 法归属）；Grill X-8 清单范围（仅两测试文件 grep）
- 故障面: 夹具补段后夹具 map 与真实 map 演进脱节（token 变更夹具不跟）——夹具只钉本变更语义所需最小 token 集（auth 族），真实口径以仓 map 为准。
- 退役判据: 无（连带翻新属一次性收口）。
