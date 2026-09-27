## FR-core-engine-001 稳定 FR id 发号与幂等索引
变更：2026-09-18-fr-index-l1
状态：active
摘要：幂等重放；域兜底
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 变更归档（noAI 步）且其 requirements.md 含 FR 块（`### FR-NN: 标题`）；When indexRequirements 执行（域=design 文件清单剥 NEW: 前缀×_module-map，unmapped 兜底）；Then 新 FR 按域计数器 max+1 发全局 id `FR-<域>-NNN` 并写入 knowledge/fr/<域>.md（条目含来源变更/状态 active/摘
- 场景：幂等重放 — Given 同一变更的 indexRequirements 连续执行两次；Then 第二次 written/superseded 均空，索引文件零漂移
- 场景：域兜底 — Given 文件清单无可匹配模块；Then 条目落 knowledge/fr/unmapped.md（可见可迁移，同 decisions 先例）
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-01
最近确认：aae25a4

## FR-core-engine-002 承接取代链与写作期注入
变更：2026-09-18-fr-index-l1
状态：active
摘要：取代链完整
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given requirements.md FR 块含 `承接: FR-<域>-NNN[, ...]` 行（brainstorm step8 注入清单供引用） brains；When 归档索引执行 step8 prompt 渲染；Then 旧条目状态翻 superseded + superseded_by=新 id + 链注记；承接 id 不存在→warn 留痕不阻断；未引用旧 FR 的删除/修改
- 场景：取代链完整 — Given change B 承接引用 change A 归档发的 FR-x-001；When B 归档；Then FR-x-001 状态 superseded、superseded_by=本次新号、摘要链注记在场
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-02
最近确认：aae25a4

## FR-core-engine-003 四类观察指标事件流
变更：2026-09-18-fr-index-l1
状态：active
摘要：本变更自举采样
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 三机制在位（step8 注入/step8 软门/归档承接——护栏②：任一被移除对应指标恒零即实验失真）+删除缺口探针；When 各机制动作发生；Then knowledge-hits.jsonl 落 fr-inject（条数+域）/fr-supersede（from/to/change）/fr-duplicate
- 场景：本变更自举采样 — Given 本变更自身归档（首个 epoch 样本）；Then fr-superseded 与 fr-unreferenced 各至少一条真实事件落盘（verify 读回）
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-03
最近确认：aae25a4

## FR-core-engine-004 D14 第四检查与覆盖面边界
变更：2026-09-18-fr-index-l1
状态：active
摘要：自举被抓即机制工作
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given doctor archive_integrity 重扫；When 归档日期前缀 ≥ FR_INDEX_EPOCH（2026-09-18）且非 quick/scale:small 豁免面；Then 变更名须在 fr 索引「来源变更」字段在场；其 requirements 含承接行则旧条目 superseded 须已标；违者 warning offender
- 场景：自举被抓即机制工作 — Given 本变更归档时索引写入失败；When D14 重扫；Then 本变更作为 offender 出现（R-05 活证）
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-04
最近确认：aae25a4

## FR-core-engine-005 三轴客观定价引擎
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：span 封顶防「单测档改半个仓」；agent 自报只升不降
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given `src/ceremony-tier.js` 的 `computeCeremonyTier` 接收 blast（detectChangeRisk 输出+显式声明；When 任一分量达到更高档；Then `ceremony_tier = max(blast, span, friction)` 取封顶，档位 ∈ S0/S1/S2/S3（映射既有五档：doc-onl
- 场景：span 封顶防「单测档改半个仓」 — Given detectChangeRisk 判 unit-sufficient（blast=S1）但声明文件数≥8 或模块跨度≥3 或命中 QUICK_RISK_PATH；When 定价；Then tier ≥ S2（span 分量封顶生效），reasons 含 span 命中明细
- 场景：agent 自报只升不降 — Given agent 声明 needs_human_review 或显式 risk_level 升档；When 定价；Then 按升档执行且留痕；任何自报不产生降档（降档唯一通道=D-004 留理由+收口复核）
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-01
最近确认：7c7a85c

## FR-core-engine-006 接管 review-tier 与 plan_level 降级编排化
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：任务②同款不再全价
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given classifyReviewTier 现行「planLevel 三分支+文件数≤3 启发式」；When 本变更落地后；Then 评审档由 computeCeremonyTier 决定（旧文件数规则降为 S0/S1 内部断路器保兼容）；plan 阶段 plan_level 输出仅为编排标签
- 场景：任务②同款不再全价 — Given risk=unit-sufficient、span 未超阈、无摩擦记录的变更；When 进入 brainstorm Step7 审查与 plan 审查；Then 按档位化菜单执行轻仪（S1），不因「计划写得完整」进入 independent×2
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-02
最近确认：7c7a85c

## FR-core-engine-007 收口双跑对账（预价信声明，结算信事实）
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：懒 agent 低报被收口抓获
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given verify --done 与 archive confirm 两出口可取实际 diff 文件集（resolveReconcileActualFiles 单点现；When 收口；Then 用实际 diff 重跑 blast+span 得事实档；声明档<事实档 → 硬 flag（verify errors / archive 阻断警告）+ 记摩擦账
- 场景：懒 agent 低报被收口抓获 — Given design 声明面未提风险关键词（blast 判 S1）但实际 diff 命中 auth/migration 路径（事实档 S2+）；When verify --done 双跑；Then mismatch=error 硬 flag，摩擦账留档，次单预价按事实面
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-03
最近确认：7c7a85c

## FR-core-engine-008 friction 阶段门升档与影子期
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：影子产物不污染主线
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 四阶段完成门（gate 评估点）读 friction-ledger 累计账；When gate_rollback/review_rejected 超阈；Then tier = min(S3, tier+1) 只升不降，迁移记录写 .runtime/ceremony-tier-<change>.json（withFileL
- 场景：影子产物不污染主线 — Given 影子重评审 verdict=fail 落盘；When 主线 gate 经 getLatestStageReviewRunId 找评审产物；Then 不命中影子命名空间（stage-reviews-shadow/ 隔离），主线不受影子 verdict 阻断
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-04
最近确认：7c7a85c

## FR-core-engine-009 probe8 diff 源替换
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
待复核：2026-09-27-ui-visual-guidance
场景正文：
- 场景：默认场景 — Given worktree 可用 worktree 缺失（in-place） git 全失败 design 清单有但 diff 无的路径；When collectProbe8DiffFiles 取数 取数 取数 渲染
全文：.sillyspec/changes/archive/2026-09-18-probe8-direct-compare/requirements.md#FR-01
最近确认：

## FR-core-engine-010 代码级字段直比
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
待复核：2026-09-27-ui-visual-guidance
场景正文：
- 场景：默认场景 — Given .js/.ts/.jsx/.tsx 前端文件 .vue / .wxml .java Controller 前端字段 ∉ backendAllFields（全仓并；Then formData./payload. 字段名 + 请求调用 8 行窗口内 DTO 字面量键 + name 属性 v-model/prop / value绑定/d
全文：.sillyspec/changes/archive/2026-09-18-probe8-direct-compare/requirements.md#FR-02
最近确认：

## FR-core-engine-011 骨架渲染与 advisory 档
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
待复核：2026-09-27-ui-visual-guidance
场景正文：
- 场景：默认场景 — Given probe8 渲染 文件含 probe8-skip（前端或后端） 非 Java 后端文件；When direct-compare 子段 提取 提取；Then 命中统计行+逐条明细行（文件:行号+说明）；全部 advisory 不阻断；渲染行不误中 verify-postcheck PROBE8 系锚点 跳过+计数 n
全文：.sillyspec/changes/archive/2026-09-18-probe8-direct-compare/requirements.md#FR-03
最近确认：

## FR-core-engine-012 三槽预填引擎
变更：2026-09-18-artifact-prefill
状态：active
摘要：核对改写
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given src/prefill.js 三纯函数（清单←target_files 并集/决策表←D-xxx 清单/ids←FR+D 抽取）；When 生成器或 refresh 调用；Then 白名单槽落预填值+来源行内注「(预填：核对后删本注)」；槽外一律不碰；无源文件时空槽+提示行（骨架行为不变）
- 场景：核对改写 — Given task 卡 target_files 已声明六文件；When prefill-refresh 运行；Then design 清单槽出六行（NEW: 保形）带注——agent 核对删注即确认
全文：.sillyspec/changes/archive/2026-09-18-artifact-prefill/requirements.md#FR-01
最近确认：6786025

## FR-core-engine-013 refresh 重放与已确认保护
变更：2026-09-18-artifact-prefill
状态：active
摘要：人工保护
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given sillyspec prefill-refresh --change <名>；When 槽内预填注在场；Then 重放预填（幂等）；注已删=已确认→跳过不覆盖人工内容
- 场景：人工保护 — Given 决策追踪表某行被 agent 改写且注已删；When refresh；Then 该槽跳过（confirmed 计数）
全文：.sillyspec/changes/archive/2026-09-18-artifact-prefill/requirements.md#FR-02
最近确认：6786025

## FR-core-engine-014 门禁梯度与对表
变更：2026-09-18-artifact-prefill
状态：active
摘要：注清零校验
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given --done 门（brainstorm/plan）与归档前校验；When 白名单槽含未删注；Then --done advisory 提示；归档前 error 阻断（注清零=确认完成）；本变更对表数据（请求/上下文/摩擦 vs 基线 172/249k/9）落 b
- 场景：注清零校验 — Given 归档前 design 清单槽仍有预填注；When verify 探针；Then error——预填未确认
全文：.sillyspec/changes/archive/2026-09-18-artifact-prefill/requirements.md#FR-03
最近确认：6786025

## FR-core-engine-015 covered-service 判定形态满足覆盖等式
变更：2026-09-19-api-matrix-service-coverage
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given verify-result.md 接口验证覆盖矩阵中某端点行判定为 covered-service 且证据列含真实测试锚点（`.test.` / file:li；When verify `--done` 门禁执行 judgeApiCoverageMatrix；Then 该行计入覆盖分子（covered+covered-service == 有效分母时放行），不触发移交联动（partial/uncovered 专用）与 PASS
全文：.sillyspec/changes/archive/2026-09-19-api-matrix-service-coverage/requirements.md#FR-01
最近确认：7438d34

## FR-core-engine-016 测试锚点硬约束与八面文案同源
变更：2026-09-19-api-matrix-service-coverage
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 某端点行判定为 covered-service 而证据列缺测试锚点；When verify 门禁执行；Then error 阻断（与 non-testable 缺理由同 fail-closed 级）；且骨架/指引/模板/门禁错误文案/anchor-check/--init
全文：.sillyspec/changes/archive/2026-09-19-api-matrix-service-coverage/requirements.md#FR-02
最近确认：7438d34

## FR-core-engine-017 四阶段评审材料包契约
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 各阶段评审派发（Grill 首轮/plan 审/execute QA/再审）；When prompt 组装；Then 必读清单段替换为材料包注入（grill-first={designDigest,fileList,crossPoints[≤5],snippets[]}；pla
全文：.sillyspec/changes/archive/2026-09-19-review-material-pack/requirements.md#FR-01
最近确认：7438d34

## FR-core-engine-018 再审唯一材料化＋基准面语义
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 再审派发（同阶段上一轮 findings 在场）；When {PRIOR_REVIEW_FACTS} 渲染；Then 复审基线段为排他语（本轮唯一基准面）＋上一轮 findings＋对应修复 diff；四阶段评审者首项自检「材料包是否足以逐条作答；不足→cannot_verif
全文：.sillyspec/changes/archive/2026-09-19-review-material-pack/requirements.md#FR-02
最近确认：7438d34

## FR-core-engine-019 机械验收钉
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 阶段 prompt 模板；When 回归测试执行；Then grep 断言无「必须读取完整」「素材宁可多读」两原语（全仓命中均在改写面内）；包组装 helper 四阶段形态单测；排他语在场断言。
全文：.sillyspec/changes/archive/2026-09-19-review-material-pack/requirements.md#FR-03
最近确认：7438d34

## FR-core-engine-020 CLI 机械注入接线
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 三阶段评审派发（Grill 首轮/plan 审/execute QA）且 step prompt 含 {REVIEW_TIER}/{REVIEW_MATERIA；When prompt.js tier 注入链渲染；Then {REVIEW_MATERIALS} 被装配结果填充（brainstorm→grill-first、plan→plan-review、execute→execu
全文：.sillyspec/changes/archive/2026-09-19-review-material-cli-wiring/requirements.md#FR-01
最近确认：33fca7f

## FR-core-engine-021 混合组包边界
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 装配函数 assembleStageReviewMaterials；When CLI 半边素材收集；Then grill-first={designDigest（章节行号索引+背景/设计目标节）, fileList（design.md 文件变更清单表路径列）}；plan
全文：.sillyspec/changes/archive/2026-09-19-review-material-cli-wiring/requirements.md#FR-02
最近确认：33fca7f

## FR-core-engine-022 验收钉
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 回归测试执行；When test/review-material-pack.test.mjs 跑；Then 既有组一（两原语绝迹）/组二（包形态+joins≥2+两槽互斥）/组三（排他语）零改动保持绿；新增组四：装配函数三形态非空断言（fixture）＋接线源码钉（主
全文：.sillyspec/changes/archive/2026-09-19-review-material-cli-wiring/requirements.md#FR-03
最近确认：33fca7f

## FR-core-engine-023 span_risk 声明段与装载器
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given `_module-map.yaml` 顶层含 `span_risk:` 字符串数组段；When `loadSpanRiskPatterns({specBase, project})` / `loadSpanRiskPatternsAllProjects({；Then 返回编译产物 `[{pattern, re}]`（token 转义后编译为现行同款边界锚定正则：前界 `(?:^|[/_-])`、后界 `(?=[/._-]|$
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-01
最近确认：c796534

## FR-core-engine-024 定价消费面切换（ceremony span 轴）
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given computeCeremonyTier 收到 opts.spanRiskPatterns（声明表编译产物）；When 声明文件命中任一 token；Then span ≥ S2 且 reasons 记 `span=S2（风险路径命中 <token>：<files>）`；opts.spanRiskPatterns 缺省
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-02
最近确认：c796534

## FR-core-engine-025 quick 画像消费面切换
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given computeGateProfile 收到 opts.riskTable（声明表编译产物）；When 非文档文件命中任一 token；Then riskHits 记 `{pattern, file}`、判级 L2、checks.runtimeEvidence='required'；riskTable 缺
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-03
最近确认：c796534

## FR-core-engine-026 硬退役与自举
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 本变更合入；Then QUICK_RISK_PATH_PATTERNS 定义/导出/引用全仓零残留；本仓 map 携带 `[migrate, migration, migration
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-04
最近确认：c796534

## FR-core-engine-027 回归钉
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 测试套件；When 全量跑；Then 编译等价性钉（六域展开 token 集 vs 旧正则，代表性路径集含 author/booking/lockfile 反例，命中面逐字节相同）绿；modules
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-05
最近确认：c796534

## FR-core-engine-028 依据决策机读链
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given requirements.md 含决策覆盖矩阵（D-xxx@vN → FR-NN 映射）；When 归档 indexRequirements 执行；Then 条目含「依据决策：」行、digest 条目含 decisions 数组；无矩阵/无命中省略行且不阻断
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-01
最近确认：4222a90b

## FR-core-engine-029 模块卡指针显式化
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 任一 knowledge/fr/<域>.md 文件写入/更新；When 文件头 blockquote 落盘；Then 含「模块卡：modules/<域>.md」一行
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-02
最近确认：4222a90b

## FR-core-engine-030 GWT 场景正文入库
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given requirements.md 含 Given/When/Then 行；When 归档 indexRequirements 执行；Then 条目含「场景正文：」块（每场景一行，各段截 80 字，≤5 场景）
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-03
最近确认：4222a90b

## FR-core-engine-031 存量回填
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
待复核：2026-09-27-redomain
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given knowledge/fr 存在 active 条目缺场景正文，且其来源变更归档目录 requirements.md 在场；When sillyspec fr-backfill 执行；Then 按标题匹配补齐正文（幂等：已有正文的条目跳过；匹配失败警告不阻断）
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-04
最近确认：4222a90b

## FR-core-engine-032 跨仓条目按仓真实对账
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 多仓变更（design 清单含跨仓子段/`cross-repo:` 前缀条目，repoKey 已在 local.yaml repos 注册）且变更已进入 exe；When computeChangeScopeAudit 运行；Then 跨仓行携带真实 `verdict`（planned/unplanned/untouched 三态，按该仓 actual × 声明面差集）、`additions/
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-01
最近确认：50c29406

## FR-core-engine-033 锚点分级
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given collectRepoActual 对某跨仓仓采集；When 依次判定锚点；Then 按优先级取首个可得档：①reviews-range（execute-runs task review 的 base..head 区间文件集并集，有 diffPa
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-02
最近确认：50c29406

## FR-core-engine-034 --json 契约仓库维度（第一交付物，additive）
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given `scope-audit --change <c> --json`；When 计划侧含跨仓条目且非预执行形态；Then 信封新增 `repos: [{key, repoPath, anchor, totals{files,additions,deletions,planned,u
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-03
最近确认：50c29406

## FR-core-engine-035 预执行与降级形态
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 变更未进入 execute（主仓三信号全无+四类证据全缺）或某跨仓仓 degraded；When computeChangeScopeAudit 运行；Then 预执行形态跨仓行保持清单视图（untouched+crossRepo 标注，不调内核——B/C 档 status 会捕该仓他人脏文件）；degraded 仓跨仓
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-04
最近确认：50c29406

## FR-core-engine-036 文本表与 --file
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given renderScopeAuditTable / getFileDiff 消费含跨仓行的结果；When 渲染/查询；Then 跨仓行 label 为真实三态带仓标（如「✓ 计划内 [sub-grid-security]」，degraded 仓保留 ⊘）；表尾出 per-repo 汇总行
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-05
最近确认：50c29406

## FR-core-engine-037 快照与冻结语义
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given execute --done 落快照 / 查询面读快照；When 结果对象含跨仓真实行与 repos[]；Then 新快照自动冻结（落盘链零改动）；查询面跨仓照快照回放（settled 回放 return 增量透传 snap.repos，旧快照无键不输出）；settled n
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-06
最近确认：50c29406

## FR-core-engine-038 共享内核单一真相源
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given scope-audit 与 verify-postcheck 两消费方；When 跨仓 per-repo 采集；Then 均消费 collectRepoActual 共享内核（仓解析/路径归一/大小写折叠/porcelain 解析/锚点分级单点实现，行数采集留调用方）；reconc
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-07
最近确认：50c29406

## FR-core-engine-039 buildDepsBatches 的 py 运行器推断保留 cd <dir> &
变更：2026-09-25-deps-cwd-prefix
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then buildDepsBatches 的 py 运行器推断保留 cd <dir> && 前缀（首个 pytest 段含链前缀整体提取），且批次内文件路径按该 dir
全文：.sillyspec/changes/archive/2026-09-25-deps-cwd-prefix/requirements.md#FR-01
最近确认：3ab70d08d737b30b488d80e17a1e1288f27a3bd5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-deps-cwd-prefix:flow:FR-01
  tests: test/deps-cwd-prefix.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-deps-cwd-prefix
  status: active

## FR-core-engine-040 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 p
变更：2026-09-25-deps-cwd-prefix
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then 无 cd 前缀的模块命令行为不变（裸 pytest 段提取）；无命中模块兜底 python -m pytest 不变
全文：.sillyspec/changes/archive/2026-09-25-deps-cwd-prefix/requirements.md#FR-02
最近确认：3ab70d08d737b30b488d80e17a1e1288f27a3bd5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-deps-cwd-prefix:flow:FR-02
  tests: test/deps-cwd-prefix.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-deps-cwd-prefix
  status: active

## FR-core-engine-041 buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定
变更：2026-09-25-deps-cwd-prefix
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then buildDepsBatches 导出并新增单测：带 cd 前缀的命令与路径重定基/裸命令不变/兜底三态
全文：.sillyspec/changes/archive/2026-09-25-deps-cwd-prefix/requirements.md#FR-03
最近确认：3ab70d08d737b30b488d80e17a1e1288f27a3bd5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-deps-cwd-prefix:flow:FR-03
  tests: test/deps-cwd-prefix.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-deps-cwd-prefix
  status: active

## FR-core-engine-042 flow 系与 test:core 全绿
变更：2026-09-25-deps-cwd-prefix
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then flow 系与 test:core 全绿
全文：.sillyspec/changes/archive/2026-09-25-deps-cwd-prefix/requirements.md#FR-04
最近确认：3ab70d08d737b30b488d80e17a1e1288f27a3bd5

## FR-core-engine-043 命中源空回退（module 策略）
变更：2026-09-26-thin-gate-module-source
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 全部改动已提交（thin「先提交再收口」的常态，git diff HEAD 为空）且调用方传入 restrictFiles（会话清单，与快照 overlay 同
全文：.sillyspec/changes/archive/2026-09-26-thin-gate-module-source/requirements.md#FR-01
最近确认：68be9c9edfb43a60e41299015658005435ab9e10

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-gate-module-source:flow:FR-01
  tests: test/verify-gate-restrict-source.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-gate-module-source
  status: active

## FR-core-engine-044 无清单维持 skip 语义（回归保护）
变更：2026-09-26-thin-gate-module-source
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 同仓但调用方未传 restrictFiles，When 模块选择源为空，Then 维持 module-zero-hit-skip：status=skipped、
全文：.sillyspec/changes/archive/2026-09-26-thin-gate-module-source/requirements.md#FR-02
最近确认：68be9c9edfb43a60e41299015658005435ab9e10

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-gate-module-source:flow:FR-02
  tests: test/verify-gate-restrict-source.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-gate-module-source
  status: active

## FR-core-engine-045 deps-auto 缺省收窄分支同款回退
变更：2026-09-26-thin-gate-module-source
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 未配置 test_strategy 的仓、改动已全部提交、restrictFiles 含测试文件，When runVerifyTestCheck 走 deps-
全文：.sillyspec/changes/archive/2026-09-26-thin-gate-module-source/requirements.md#FR-03
最近确认：68be9c9edfb43a60e41299015658005435ab9e10

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-thin-gate-module-source:flow:FR-03
  tests: test/verify-gate-restrict-source.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-thin-gate-module-source
  status: active

## FR-core-engine-046 全量测试与 lint 绿
变更：2026-09-26-thin-gate-module-source
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 本变更合入后，When 执行 npm test（全量）与 npm run lint，Then 全部通过。
全文：.sillyspec/changes/archive/2026-09-26-thin-gate-module-source/requirements.md#FR-04
最近确认：68be9c9edfb43a60e41299015658005435ab9e10

## FR-core-engine-047 JSX 卷运行器推断
变更：2026-09-26-residual-runner-parity
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given .tsx/.jsx 用 node --test 直跑恒败（node 原生不支持 JSX）；When js 卷分拣出 JSX 文件并从命中命令串推断 vitest/jest（与 py 侧 pytest 推断同法） 有运行器则 deps(auto-jsx) 批（v
全文：.sillyspec/changes/archive/2026-09-26-residual-runner-parity/requirements.md#FR-01
最近确认：0c507e2ebe90ac31d847cd319669d4a9b13a3f91

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-residual-runner-parity:flow:FR-01
  tests: test/residual-runner-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-residual-runner-parity
  status: active

## FR-core-engine-048 无运行器整批 skip
变更：2026-09-26-residual-runner-parity
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 命中命令串提不出 vitest/jest；When deps(auto-jsx-skip)（command null） 两消费点不跑不拦、warn+skipped 留痕（漏测可见非静默，转项目运行器执行）
全文：.sillyspec/changes/archive/2026-09-26-residual-runner-parity/requirements.md#FR-02
最近确认：0c507e2ebe90ac31d847cd319669d4a9b13a3f91

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-residual-runner-parity:flow:FR-02
  tests: test/residual-runner-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-residual-runner-parity
  status: active

## FR-core-engine-049 原生批零变化
变更：2026-09-26-residual-runner-parity
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given .ts/.js node 原生可跑（既有行为）；When 分拣后照旧 node --test；Then deps-cwd-prefix ④钉复验通过
全文：.sillyspec/changes/archive/2026-09-26-residual-runner-parity/requirements.md#FR-03
最近确认：0c507e2ebe90ac31d847cd319669d4a9b13a3f91

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-residual-runner-parity:flow:FR-03
  tests: test/deps-cwd-prefix.test.mjs | test/residual-runner-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-residual-runner-parity
  status: active

## FR-core-engine-050 B1 meta 分支锚点第三候选
变更：2026-09-26-reconcile-source-isolation
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 非约定命名分支（如实验分支 r18/sf-full）使 sillyspec/<change> 与审计 tag 均落空；When 扫 worktrees meta 按 changeName 键匹配取 meta.branch（rev-parse 验证 ref 在场） diffRef 命中该分
全文：.sillyspec/changes/archive/2026-09-26-reconcile-source-isolation/requirements.md#FR-01
最近确认：3eb3bfbff3b9962ef5430bd6c75ea299bfda9df5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-reconcile-source-isolation:flow:FR-01
  tests: test/reconcile-source-isolation.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-reconcile-source-isolation
  status: active

## FR-core-engine-051 死锁诊断
变更：2026-09-26-reconcile-source-isolation
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given post-apply 形态 actual 源全空（典型「主仓被并行会话推进」——提交/暂存被他人裸提交扫走）；When parallelAdvanceHint 在场并经 notes 带出 提示含形态说明/明禁暂存物化自救/安全出路（登记分支锚定或按 AGENTS 规则 18 对账
全文：.sillyspec/changes/archive/2026-09-26-reconcile-source-isolation/requirements.md#FR-02
最近确认：3eb3bfbff3b9962ef5430bd6c75ea299bfda9df5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-reconcile-source-isolation:flow:FR-02
  tests: test/reconcile-source-isolation.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-reconcile-source-isolation
  status: active

## FR-core-engine-052 不误报
变更：2026-09-26-reconcile-source-isolation
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 有文件面（porcelain 有行）或有锚定源（diff/apply-pathspec）；When 诊断条件不满足；Then 无 hint；既有源与形态 A 零变化（61 用例零回归）
全文：.sillyspec/changes/archive/2026-09-26-reconcile-source-isolation/requirements.md#FR-03
最近确认：3eb3bfbff3b9962ef5430bd6c75ea299bfda9df5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-reconcile-source-isolation:flow:FR-03
  tests: test/reconcile-source-isolation.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-reconcile-source-isolation
  status: active

## FR-core-engine-053 新增 tests redomain 子命令：--from <域> --to <域> [--ancho
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 迁移 相关模块就绪；When 新增 tests redomain 子命令：--from <域> --to <域> [--anchor <FR-id>]，干跑缺省列出将迁移条目，--write；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-01
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-01
  tests: test/redomain.test.mjs「⑤ CLI 端到端」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-054 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-02
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-02
  tests: test/redomain.test.mjs「② 单条迁移」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-055 前缀与域不符属历史痕迹，文档说明）
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 前缀与域不符属历史痕迹，文档说明）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-03
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

## FR-core-engine-056 段切割用 splitKnowledgeSections
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 段切割用 splitKnowledgeSections；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-04
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-04
  tests: test/redomain.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-057 joinKnowledgeFile 单源
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When joinKnowledgeFile 单源；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-05
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-05
  tests: test/redomain.test.mjs「②」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-058 目标域文件缺席则按 loadDomainSections 同款头新建
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 目标域文件缺席；Then 按 loadDomainSections 同款头新建
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-06
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-06
  tests: test/redomain.test.mjs「③ 目标新建路径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-059 目标域无 INDEX 路由行则经 syncIndexRoutingLines 补
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 目标域无 INDEX 路由行；Then 经 syncIndexRoutingLines 补
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-07
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-07
  tests: test/redomain.test.mjs「③」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-060 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 迁移 相关模块就绪；When 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-08
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-08
  tests: test/redomain.test.mjs「③」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-061 anchor 模式精确单条
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When anchor 模式精确单条；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-09
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-09
  tests: test/redomain.test.mjs「①②」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-062 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 / 迁移 / 幂等 相关模块就绪；When 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-10
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-redomain:flow:FR-10
  tests: test/redomain.test.mjs「④ 防线」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-redomain
  status: active

## FR-core-engine-063 全仓测试绿
变更：2026-09-27-redomain
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全仓测试绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-11
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

## FR-core-engine-064 buildFrozenPatch 的 diff 采集失败必须判采集失败（fail-closed），不得落 patchStatus ok 的伪完整 patch（评审 P1 清偿）
变更：2026-09-27-thin-module-scope-persist
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 冻结 patch 生成时 `git diff <baseRef>` 执行失败（如 core.bare 误写、git 环境异常）；When buildFrozenPatch 被调用；Then 返回 null（调用方 patchStatus=failed 留痕），patch 正文不得只含 untracked 自拼 hunk 而缺全部 tracked 改
全文：.sillyspec/changes/archive/2026-09-27-thin-module-scope-persist/requirements.md#FR-05
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-thin-module-scope-persist:flow:FR-05
  tests: test/flow-parity.test.mjs | test/scope-audit.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-thin-module-scope-persist
  status: active

## FR-core-engine-065 flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块
变更：2026-09-27-thin-module-scope-persist
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块 id/命中文件数/文档相对路径/文档是否随变更更新，及未登；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-thin-module-scope-persist/requirements.md#FR-01
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-thin-module-scope-persist:flow:FR-01
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-thin-module-scope-persist
  status: active

## FR-core-engine-066 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）
变更：2026-09-27-thin-module-scope-persist
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-thin-module-scope-persist/requirements.md#FR-02
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-thin-module-scope-persist:flow:FR-02
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-thin-module-scope-persist
  status: active

## FR-core-engine-067 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口
变更：2026-09-27-thin-module-scope-persist
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-thin-module-scope-persist/requirements.md#FR-03
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-thin-module-scope-persist:flow:FR-03
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-thin-module-scope-persist
  status: active

## FR-core-engine-068 有测试锁定结构化落盘行为与向后兼容行为
变更：2026-09-27-thin-module-scope-persist
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 有测试锁定结构化落盘行为与向后兼容行为；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-thin-module-scope-persist/requirements.md#FR-04
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-thin-module-scope-persist:flow:FR-04
  tests: test/flow-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-thin-module-scope-persist
  status: active
