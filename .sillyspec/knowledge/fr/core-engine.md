## FR-core-engine-001 稳定 FR id 发号与幂等索引
变更：2026-09-18-fr-index-l1
状态：active
摘要：幂等重放；域兜底
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
场景正文：
- 场景：默认场景 — Given requirements.md FR 块含 `承接: FR-<域>-NNN[, ...]` 行（brainstorm step8 注入清单供引用） brains；When 归档索引执行 step8 prompt 渲染；Then 旧条目状态翻 superseded + superseded_by=新 id + 链注记；承接 id 不存在→warn 留痕不阻断；未引用旧 FR 的删除/修改
- 场景：取代链完整 — Given change B 承接引用 change A 归档发的 FR-x-001；When B 归档；Then FR-x-001 状态 superseded、superseded_by=本次新号、摘要链注记在场
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-02
最近确认：aae25a4

## FR-core-engine-003 四类观察指标事件流
变更：2026-09-18-fr-index-l1
状态：active
摘要：本变更自举采样
场景正文：
- 场景：默认场景 — Given 三机制在位（step8 注入/step8 软门/归档承接——护栏②：任一被移除对应指标恒零即实验失真）+删除缺口探针；When 各机制动作发生；Then knowledge-hits.jsonl 落 fr-inject（条数+域）/fr-supersede（from/to/change）/fr-duplicate
- 场景：本变更自举采样 — Given 本变更自身归档（首个 epoch 样本）；Then fr-superseded 与 fr-unreferenced 各至少一条真实事件落盘（verify 读回）
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-03
最近确认：aae25a4

## FR-core-engine-004 D14 第四检查与覆盖面边界
变更：2026-09-18-fr-index-l1
状态：active
摘要：自举被抓即机制工作
场景正文：
- 场景：默认场景 — Given doctor archive_integrity 重扫；When 归档日期前缀 ≥ FR_INDEX_EPOCH（2026-09-18）且非 quick/scale:small 豁免面；Then 变更名须在 fr 索引「来源变更」字段在场；其 requirements 含承接行则旧条目 superseded 须已标；违者 warning offender
- 场景：自举被抓即机制工作 — Given 本变更归档时索引写入失败；When D14 重扫；Then 本变更作为 offender 出现（R-05 活证）
全文：.sillyspec/changes/archive/2026-09-18-fr-index-l1/requirements.md#FR-04
最近确认：aae25a4

## FR-core-engine-005 三轴客观定价引擎
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：span 封顶防「单测档改半个仓」；agent 自报只升不降
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
场景正文：
- 场景：默认场景 — Given classifyReviewTier 现行「planLevel 三分支+文件数≤3 启发式」；When 本变更落地后；Then 评审档由 computeCeremonyTier 决定（旧文件数规则降为 S0/S1 内部断路器保兼容）；plan 阶段 plan_level 输出仅为编排标签
- 场景：任务②同款不再全价 — Given risk=unit-sufficient、span 未超阈、无摩擦记录的变更；When 进入 brainstorm Step7 审查与 plan 审查；Then 按档位化菜单执行轻仪（S1），不因「计划写得完整」进入 independent×2
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-02
最近确认：7c7a85c

## FR-core-engine-007 收口双跑对账（预价信声明，结算信事实）
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：懒 agent 低报被收口抓获
场景正文：
- 场景：默认场景 — Given verify --done 与 archive confirm 两出口可取实际 diff 文件集（resolveReconcileActualFiles 单点现；When 收口；Then 用实际 diff 重跑 blast+span 得事实档；声明档<事实档 → 硬 flag（verify errors / archive 阻断警告）+ 记摩擦账
- 场景：懒 agent 低报被收口抓获 — Given design 声明面未提风险关键词（blast 判 S1）但实际 diff 命中 auth/migration 路径（事实档 S2+）；When verify --done 双跑；Then mismatch=error 硬 flag，摩擦账留档，次单预价按事实面
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-03
最近确认：7c7a85c

## FR-core-engine-008 friction 阶段门升档与影子期
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：影子产物不污染主线
场景正文：
- 场景：默认场景 — Given 四阶段完成门（gate 评估点）读 friction-ledger 累计账；When gate_rollback/review_rejected 超阈；Then tier = min(S3, tier+1) 只升不降，迁移记录写 .runtime/ceremony-tier-<change>.json（withFileL
- 场景：影子产物不污染主线 — Given 影子重评审 verdict=fail 落盘；When 主线 gate 经 getLatestStageReviewRunId 找评审产物；Then 不命中影子命名空间（stage-reviews-shadow/ 隔离），主线不受影子 verdict 阻断
全文：.sillyspec/changes/archive/2026-09-18-ceremony-risk-pricing/requirements.md#FR-04
最近确认：7c7a85c

## FR-core-engine-009 probe8 diff 源替换
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given worktree 可用 worktree 缺失（in-place） git 全失败 design 清单有但 diff 无的路径；When collectProbe8DiffFiles 取数 取数 取数 渲染
全文：.sillyspec/changes/archive/2026-09-18-probe8-direct-compare/requirements.md#FR-01
最近确认：

## FR-core-engine-010 代码级字段直比
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given .js/.ts/.jsx/.tsx 前端文件 .vue / .wxml .java Controller 前端字段 ∉ backendAllFields（全仓并；Then formData./payload. 字段名 + 请求调用 8 行窗口内 DTO 字面量键 + name 属性 v-model/prop / value绑定/d
全文：.sillyspec/changes/archive/2026-09-18-probe8-direct-compare/requirements.md#FR-02
最近确认：

## FR-core-engine-011 骨架渲染与 advisory 档
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given probe8 渲染 文件含 probe8-skip（前端或后端） 非 Java 后端文件；When direct-compare 子段 提取 提取；Then 命中统计行+逐条明细行（文件:行号+说明）；全部 advisory 不阻断；渲染行不误中 verify-postcheck PROBE8 系锚点 跳过+计数 n
全文：.sillyspec/changes/archive/2026-09-18-probe8-direct-compare/requirements.md#FR-03
最近确认：

## FR-core-engine-012 三槽预填引擎
变更：2026-09-18-artifact-prefill
状态：active
摘要：核对改写
场景正文：
- 场景：默认场景 — Given src/prefill.js 三纯函数（清单←target_files 并集/决策表←D-xxx 清单/ids←FR+D 抽取）；When 生成器或 refresh 调用；Then 白名单槽落预填值+来源行内注「(预填：核对后删本注)」；槽外一律不碰；无源文件时空槽+提示行（骨架行为不变）
- 场景：核对改写 — Given task 卡 target_files 已声明六文件；When prefill-refresh 运行；Then design 清单槽出六行（NEW: 保形）带注——agent 核对删注即确认
全文：.sillyspec/changes/archive/2026-09-18-artifact-prefill/requirements.md#FR-01
最近确认：6786025

## FR-core-engine-013 refresh 重放与已确认保护
变更：2026-09-18-artifact-prefill
状态：active
摘要：人工保护
场景正文：
- 场景：默认场景 — Given sillyspec prefill-refresh --change <名>；When 槽内预填注在场；Then 重放预填（幂等）；注已删=已确认→跳过不覆盖人工内容
- 场景：人工保护 — Given 决策追踪表某行被 agent 改写且注已删；When refresh；Then 该槽跳过（confirmed 计数）
全文：.sillyspec/changes/archive/2026-09-18-artifact-prefill/requirements.md#FR-02
最近确认：6786025

## FR-core-engine-014 门禁梯度与对表
变更：2026-09-18-artifact-prefill
状态：active
摘要：注清零校验
场景正文：
- 场景：默认场景 — Given --done 门（brainstorm/plan）与归档前校验；When 白名单槽含未删注；Then --done advisory 提示；归档前 error 阻断（注清零=确认完成）；本变更对表数据（请求/上下文/摩擦 vs 基线 172/249k/9）落 b
- 场景：注清零校验 — Given 归档前 design 清单槽仍有预填注；When verify 探针；Then error——预填未确认
全文：.sillyspec/changes/archive/2026-09-18-artifact-prefill/requirements.md#FR-03
最近确认：6786025

## FR-core-engine-015 covered-service 判定形态满足覆盖等式
变更：2026-09-19-api-matrix-service-coverage
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given verify-result.md 接口验证覆盖矩阵中某端点行判定为 covered-service 且证据列含真实测试锚点（`.test.` / file:li；When verify `--done` 门禁执行 judgeApiCoverageMatrix；Then 该行计入覆盖分子（covered+covered-service == 有效分母时放行），不触发移交联动（partial/uncovered 专用）与 PASS
全文：.sillyspec/changes/archive/2026-09-19-api-matrix-service-coverage/requirements.md#FR-01
最近确认：7438d34

## FR-core-engine-016 测试锚点硬约束与八面文案同源
变更：2026-09-19-api-matrix-service-coverage
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 某端点行判定为 covered-service 而证据列缺测试锚点；When verify 门禁执行；Then error 阻断（与 non-testable 缺理由同 fail-closed 级）；且骨架/指引/模板/门禁错误文案/anchor-check/--init
全文：.sillyspec/changes/archive/2026-09-19-api-matrix-service-coverage/requirements.md#FR-02
最近确认：7438d34

## FR-core-engine-017 四阶段评审材料包契约
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 各阶段评审派发（Grill 首轮/plan 审/execute QA/再审）；When prompt 组装；Then 必读清单段替换为材料包注入（grill-first={designDigest,fileList,crossPoints[≤5],snippets[]}；pla
全文：.sillyspec/changes/archive/2026-09-19-review-material-pack/requirements.md#FR-01
最近确认：7438d34

## FR-core-engine-018 再审唯一材料化＋基准面语义
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 再审派发（同阶段上一轮 findings 在场）；When {PRIOR_REVIEW_FACTS} 渲染；Then 复审基线段为排他语（本轮唯一基准面）＋上一轮 findings＋对应修复 diff；四阶段评审者首项自检「材料包是否足以逐条作答；不足→cannot_verif
全文：.sillyspec/changes/archive/2026-09-19-review-material-pack/requirements.md#FR-02
最近确认：7438d34

## FR-core-engine-019 机械验收钉
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 阶段 prompt 模板；When 回归测试执行；Then grep 断言无「必须读取完整」「素材宁可多读」两原语（全仓命中均在改写面内）；包组装 helper 四阶段形态单测；排他语在场断言。
全文：.sillyspec/changes/archive/2026-09-19-review-material-pack/requirements.md#FR-03
最近确认：7438d34

## FR-core-engine-020 CLI 机械注入接线
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 三阶段评审派发（Grill 首轮/plan 审/execute QA）且 step prompt 含 {REVIEW_TIER}/{REVIEW_MATERIA；When prompt.js tier 注入链渲染；Then {REVIEW_MATERIALS} 被装配结果填充（brainstorm→grill-first、plan→plan-review、execute→execu
全文：.sillyspec/changes/archive/2026-09-19-review-material-cli-wiring/requirements.md#FR-01
最近确认：33fca7f

## FR-core-engine-021 混合组包边界
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 装配函数 assembleStageReviewMaterials；When CLI 半边素材收集；Then grill-first={designDigest（章节行号索引+背景/设计目标节）, fileList（design.md 文件变更清单表路径列）}；plan
全文：.sillyspec/changes/archive/2026-09-19-review-material-cli-wiring/requirements.md#FR-02
最近确认：33fca7f

## FR-core-engine-022 验收钉
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 回归测试执行；When test/review-material-pack.test.mjs 跑；Then 既有组一（两原语绝迹）/组二（包形态+joins≥2+两槽互斥）/组三（排他语）零改动保持绿；新增组四：装配函数三形态非空断言（fixture）＋接线源码钉（主
全文：.sillyspec/changes/archive/2026-09-19-review-material-cli-wiring/requirements.md#FR-03
最近确认：33fca7f

## FR-core-engine-023 span_risk 声明段与装载器
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given `_module-map.yaml` 顶层含 `span_risk:` 字符串数组段；When `loadSpanRiskPatterns({specBase, project})` / `loadSpanRiskPatternsAllProjects({；Then 返回编译产物 `[{pattern, re}]`（token 转义后编译为现行同款边界锚定正则：前界 `(?:^|[/_-])`、后界 `(?=[/._-]|$
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-01
最近确认：c796534

## FR-core-engine-024 定价消费面切换（ceremony span 轴）
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given computeCeremonyTier 收到 opts.spanRiskPatterns（声明表编译产物）；When 声明文件命中任一 token；Then span ≥ S2 且 reasons 记 `span=S2（风险路径命中 <token>：<files>）`；opts.spanRiskPatterns 缺省
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-02
最近确认：c796534

## FR-core-engine-025 quick 画像消费面切换
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given computeGateProfile 收到 opts.riskTable（声明表编译产物）；When 非文档文件命中任一 token；Then riskHits 记 `{pattern, file}`、判级 L2、checks.runtimeEvidence='required'；riskTable 缺
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-03
最近确认：c796534

## FR-core-engine-026 硬退役与自举
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 本变更合入；Then QUICK_RISK_PATH_PATTERNS 定义/导出/引用全仓零残留；本仓 map 携带 `[migrate, migration, migration
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-04
最近确认：c796534

## FR-core-engine-027 回归钉
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 测试套件；When 全量跑；Then 编译等价性钉（六域展开 token 集 vs 旧正则，代表性路径集含 author/booking/lockfile 反例，命中面逐字节相同）绿；modules
全文：.sillyspec/changes/archive/2026-09-19-span-risk-pattern-migration/requirements.md#FR-05
最近确认：c796534

## FR-core-engine-028 依据决策机读链
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given requirements.md 含决策覆盖矩阵（D-xxx@vN → FR-NN 映射）；When 归档 indexRequirements 执行；Then 条目含「依据决策：」行、digest 条目含 decisions 数组；无矩阵/无命中省略行且不阻断
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-01
最近确认：4222a90b

## FR-core-engine-029 模块卡指针显式化
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 任一 knowledge/fr/<域>.md 文件写入/更新；When 文件头 blockquote 落盘；Then 含「模块卡：modules/<域>.md」一行
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-02
最近确认：4222a90b

## FR-core-engine-030 GWT 场景正文入库
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given requirements.md 含 Given/When/Then 行；When 归档 indexRequirements 执行；Then 条目含「场景正文：」块（每场景一行，各段截 80 字，≤5 场景）
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-03
最近确认：4222a90b

## FR-core-engine-031 存量回填
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given knowledge/fr 存在 active 条目缺场景正文，且其来源变更归档目录 requirements.md 在场；When sillyspec fr-backfill 执行；Then 按标题匹配补齐正文（幂等：已有正文的条目跳过；匹配失败警告不阻断）
全文：.sillyspec/changes/archive/2026-09-20-fr-index-l2/requirements.md#FR-04
最近确认：4222a90b

## FR-core-engine-032 跨仓条目按仓真实对账
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 多仓变更（design 清单含跨仓子段/`cross-repo:` 前缀条目，repoKey 已在 local.yaml repos 注册）且变更已进入 exe；When computeChangeScopeAudit 运行；Then 跨仓行携带真实 `verdict`（planned/unplanned/untouched 三态，按该仓 actual × 声明面差集）、`additions/
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-01
最近确认：50c29406

## FR-core-engine-033 锚点分级
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given collectRepoActual 对某跨仓仓采集；When 依次判定锚点；Then 按优先级取首个可得档：①reviews-range（execute-runs task review 的 base..head 区间文件集并集，有 diffPa
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-02
最近确认：50c29406

## FR-core-engine-034 --json 契约仓库维度（第一交付物，additive）
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given `scope-audit --change <c> --json`；When 计划侧含跨仓条目且非预执行形态；Then 信封新增 `repos: [{key, repoPath, anchor, totals{files,additions,deletions,planned,u
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-03
最近确认：50c29406

## FR-core-engine-035 预执行与降级形态
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更未进入 execute（主仓三信号全无+四类证据全缺）或某跨仓仓 degraded；When computeChangeScopeAudit 运行；Then 预执行形态跨仓行保持清单视图（untouched+crossRepo 标注，不调内核——B/C 档 status 会捕该仓他人脏文件）；degraded 仓跨仓
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-04
最近确认：50c29406

## FR-core-engine-036 文本表与 --file
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given renderScopeAuditTable / getFileDiff 消费含跨仓行的结果；When 渲染/查询；Then 跨仓行 label 为真实三态带仓标（如「✓ 计划内 [sub-grid-security]」，degraded 仓保留 ⊘）；表尾出 per-repo 汇总行
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-05
最近确认：50c29406

## FR-core-engine-037 快照与冻结语义
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given execute --done 落快照 / 查询面读快照；When 结果对象含跨仓真实行与 repos[]；Then 新快照自动冻结（落盘链零改动）；查询面跨仓照快照回放（settled 回放 return 增量透传 snap.repos，旧快照无键不输出）；settled n
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-06
最近确认：50c29406

## FR-core-engine-038 共享内核单一真相源
变更：2026-09-20-scope-audit-cross-repo
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given scope-audit 与 verify-postcheck 两消费方；When 跨仓 per-repo 采集；Then 均消费 collectRepoActual 共享内核（仓解析/路径归一/大小写折叠/porcelain 解析/锚点分级单点实现，行数采集留调用方）；reconc
全文：.sillyspec/changes/archive/2026-09-20-scope-audit-cross-repo/requirements.md#FR-07
最近确认：50c29406

## FR-core-engine-039 buildDepsBatches 的 py 运行器推断保留 cd <dir> &
变更：2026-09-25-deps-cwd-prefix
状态：active
摘要：默认场景
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
场景正文：
- 场景：默认场景 — Given flow 轻量跑道在跑；When flow done 裁决执行；Then flow 系与 test:core 全绿
全文：.sillyspec/changes/archive/2026-09-25-deps-cwd-prefix/requirements.md#FR-04
最近确认：3ab70d08d737b30b488d80e17a1e1288f27a3bd5

## FR-core-engine-043 命中源空回退（module 策略）
变更：2026-09-26-thin-gate-module-source
状态：active
摘要：默认场景
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
场景正文：
- 场景：默认场景 — Given 本变更合入后，When 执行 npm test（全量）与 npm run lint，Then 全部通过。
全文：.sillyspec/changes/archive/2026-09-26-thin-gate-module-source/requirements.md#FR-04
最近确认：68be9c9edfb43a60e41299015658005435ab9e10

## FR-core-engine-047 JSX 卷运行器推断
变更：2026-09-26-residual-runner-parity
状态：active
摘要：默认场景
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
骨架：thin
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
骨架：thin
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
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 前缀与域不符属历史痕迹，文档说明）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-redomain/requirements.md#FR-03
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5

## FR-core-engine-056 段切割用 splitKnowledgeSections
变更：2026-09-27-redomain
状态：active
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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

## FR-core-engine-069 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正则匹配整行（trim 后），无锚定者维持子串（跨
变更：2026-09-28-known-failures-hardening
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正；Then 匹配整行（trim 后），无锚定者维持子串（跨仓向后兼容）
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-01
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-known-failures-hardening:flow:FR-01
  tests: test/verify-postcheck-known-failures.test.mjs「锚定式豁免硬行（✖）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-known-failures-hardening
  status: active

## FR-core-engine-070 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tes
变更：2026-09-28-known-failures-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tests、行首 AssertionError 等形态）只能被锚定；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-02
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-known-failures-hardening:flow:FR-02
  tests: test/verify-postcheck-known-failures.test.mjs「M1: 裸 --- 不再吞 go --- FAIL: 行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-known-failures-hardening
  status: active

## FR-core-engine-071 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免
变更：2026-09-28-known-failures-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免（先例 redlines.yaml），loader 合并读取；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-03
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-known-failures-hardening:flow:FR-03
  tests: test/verify-postcheck-known-failures.test.mjs「合并装载: 入库文件解析 24 条」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-known-failures-hardening
  status: active

## FR-core-engine-072 既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告
变更：2026-09-28-known-failures-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告落地后删；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-04
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-known-failures-hardening:flow:FR-04
  tests: test/verify-postcheck-known-failures.test.mjs「裁判: 裸子串命中披露收敛提示」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-known-failures-hardening
  status: active

## FR-core-engine-073 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示
变更：2026-09-28-known-failures-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-05
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-known-failures-hardening:flow:FR-05
  tests: test/verify-postcheck-known-failures.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-known-failures-hardening
  status: active

## FR-core-engine-074 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go
变更：2026-09-28-known-failures-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go FAIL 行不被吞四个关键行为；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-06
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

## FR-core-engine-075 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）
变更：2026-09-28-known-failures-hardening
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-known-failures-hardening/requirements.md#FR-07
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d

## FR-core-engine-076 deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、t
变更：2026-09-28-tap-judge
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、tap 到 stdout 机读），judgeTapOutput；Then 零断裂
全文：.sillyspec/changes/archive/2026-09-28-tap-judge/requirements.md#FR-01
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-tap-judge:flow:FR-01
  tests: test/tap-judge.test.mjs「TAP 失败：锚定式豁免 1 条 + 未豁免 1 条 → failed 且 remaining 精确到用例行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-tap-judge
  status: active

## FR-core-engine-077 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、
变更：2026-09-28-tap-judge
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、裸子串、泛用停用语义与既有完全一致）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-tap-judge/requirements.md#FR-02
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-tap-judge:flow:FR-02
  tests: test/verify-postcheck-known-failures.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-tap-judge
  status: active

## FR-core-engine-078 P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT
变更：2026-09-28-tap-judge
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT（父级 node:test 进程 env 泄漏致内层 nod；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-tap-judge/requirements.md#FR-03
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-tap-judge:flow:FR-03
  tests: test/tap-judge.test.mjs「集成」用例
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-tap-judge
  status: active

## FR-core-engine-079 local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）
变更：2026-09-28-tap-judge
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-tap-judge/requirements.md#FR-04
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0

## FR-core-engine-080 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）
变更：2026-09-28-tap-judge
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-tap-judge/requirements.md#FR-05
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-tap-judge:flow:FR-05
  tests: test/tap-judge.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-tap-judge
  status: active

## FR-core-engine-081 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入 snap.gateRun）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-01
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-watcher-signal-widen:flow:FR-01
  tests: test/watcher.test.mjs「watcher-signal-widen: gate-run 与 config-change 事件」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-watcher-signal-widen
  status: active

## FR-core-engine-082 specBase local.yaml mtime 事实（snap.localConfig，内容不上
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When specBase local.yaml mtime 事实（snap.localConfig，内容不上行只留痕）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-02
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-watcher-signal-widen:flow:FR-02
  tests: test/watcher.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-watcher-signal-widen
  status: active

## FR-core-engine-083 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivity
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivityAt）与 config-change（本地配置有变更事实）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-03
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-watcher-signal-widen:flow:FR-03
  tests: test/watcher.test.mjs「watcher-signal-widen: 假勾选 pending 消解路径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-watcher-signal-widen
  status: active

## FR-core-engine-084 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-04
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

## FR-core-engine-085 后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared 事件并清 pending（时间线可见消解）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-05
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-watcher-signal-widen:flow:FR-05
  tests: test/watcher.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-watcher-signal-widen
  status: active

## FR-core-engine-086 runCrossRepoFullTest 与 runFullCommand 两处 execSync
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When runCrossRepoFullTest 与 runFullCommand 两处 execSync 剥离 NODE_TEST_CONTEXT（与 runOneM；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-06
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

## FR-core-engine-087 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗
变更：2026-09-28-watcher-signal-widen
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗单点共用；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-watcher-signal-widen/requirements.md#FR-07
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543

## FR-core-engine-088 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条
变更：2026-09-28-knowledge-reason-overlap
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条目进 decisionHits 前 5；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-reason-overlap/requirements.md#FR-01
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-reason-overlap:flow:FR-01
  tests: test/knowledge-inject-ranking.test.mjs | test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-reason-overlap
  status: active

## FR-core-engine-089 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶
变更：2026-09-28-knowledge-reason-overlap
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-reason-overlap/requirements.md#FR-02
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-reason-overlap:flow:FR-02
  tests: test/knowledge-inject-ranking.test.mjs | test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-reason-overlap
  status: active

## FR-core-engine-090 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目
变更：2026-09-28-knowledge-reason-overlap
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-reason-overlap/requirements.md#FR-03
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-reason-overlap:flow:FR-03
  tests: test/knowledge-inject-ranking.test.mjs | test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-reason-overlap
  status: active

## FR-core-engine-091 测试钉住近义/主场景/精度三面
变更：2026-09-28-knowledge-reason-overlap
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 测试钉住近义/主场景/精度三面；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-reason-overlap/requirements.md#FR-04
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-reason-overlap:flow:FR-04
  tests: test/knowledge-inject-ranking.test.mjs | test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-reason-overlap
  status: active

## FR-core-engine-092 npm run test:core 全绿
变更：2026-09-28-knowledge-reason-overlap
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When npm run test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-reason-overlap/requirements.md#FR-05
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-reason-overlap:flow:FR-05
  tests: test/knowledge-inject-ranking.test.mjs | test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-reason-overlap
  status: active

## FR-core-engine-093 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分
变更：2026-09-28-knowledge-score-denoise
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分为零；Then 零分平局
全文：.sillyspec/changes/archive/2026-09-28-knowledge-score-denoise/requirements.md#FR-01
最近确认：decac02868444a405fbbbe613a5599cb0eb00e66

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-score-denoise:flow:FR-01
  tests: test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-score-denoise
  status: active

## FR-core-engine-094 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归
变更：2026-09-28-knowledge-score-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-score-denoise/requirements.md#FR-02
最近确认：decac02868444a405fbbbe613a5599cb0eb00e66

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-score-denoise:flow:FR-02
  tests: test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-score-denoise
  status: active

## FR-core-engine-095 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶
变更：2026-09-28-knowledge-score-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-score-denoise/requirements.md#FR-03
最近确认：decac02868444a405fbbbe613a5599cb0eb00e66

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-score-denoise:flow:FR-03
  tests: test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-score-denoise
  status: active

## FR-core-engine-096 npm test 全量与 test:core 全绿
变更：2026-09-28-knowledge-score-denoise
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When npm test 全量与 test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-28-knowledge-score-denoise/requirements.md#FR-04
最近确认：decac02868444a405fbbbe613a5599cb0eb00e66

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-knowledge-score-denoise:flow:FR-04
  tests: test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-knowledge-score-denoise
  status: active

## FR-core-engine-097 SKILL.md 41 行改为「以 tasks.md 为进度源：做一件→勾一格→继续下一条
变更：2026-09-29-flow-skill-d007-doc
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When SKILL.md 41 行改为「以 tasks.md 为进度源：做一件；Then 勾一格
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-d007-doc/requirements.md#FR-01
最近确认：34c04d9dd9249f261f837cf8072516cae83b3ba2

## FR-core-engine-098 flow status 自愿查看/恢复面（D-007）」口径
变更：2026-09-29-flow-skill-d007-doc
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow status 自愿查看/恢复面（D-007）」口径；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-d007-doc/requirements.md#FR-02
最近确认：34c04d9dd9249f261f837cf8072516cae83b3ba2

## FR-core-engine-099 SKILL.md 54 行「节拍器」措辞改自愿查看语义
变更：2026-09-29-flow-skill-d007-doc
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When SKILL.md 54 行「节拍器」措辞改自愿查看语义；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-d007-doc/requirements.md#FR-03
最近确认：34c04d9dd9249f261f837cf8072516cae83b3ba2

## FR-core-engine-100 其余零改动
变更：2026-09-29-flow-skill-d007-doc
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 其余零改动；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-skill-d007-doc/requirements.md#FR-04
最近确认：34c04d9dd9249f261f837cf8072516cae83b3ba2

## FR-core-engine-101 B4 救赎窗口的 git log 裸计数改为 -n 形态，救赎 note 路径恢复生效且既有 D7 断言转绿
变更：2026-10-04-log-window-arity
状态：active
摘要：分支窗口救赎
场景正文：
- 场景：分支窗口救赎 — Given 主干非 main 命名的仓、变更分支上有 per-task 提交、工作树干净；When reconcileTargetFiles 对账；Then 声明文件经分支 log 窗口命中救赎，notes 含「对账救赎」且未声明文件不误救
全文：.sillyspec/changes/archive/2026-10-04-log-window-arity/requirements.md#FR-01
最近确认：902c07f2bed907e230808d359c78068279008bd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-log-window-arity:flow:测试绑定FR-01
  tests: test/plan-target-files.test.mjs「D7 分支锚定救赎」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-log-window-arity
  status: active

## FR-core-engine-102 既有测试回归绿且 lint 零死导出
变更：2026-10-04-log-window-arity
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-04-log-window-arity/requirements.md#FR-02
最近确认：902c07f2bed907e230808d359c78068279008bd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-04-log-window-arity:flow:测试绑定FR-02
  tests: test/check-syntax.mjs | test/plan-target-files.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-04-log-window-arity
  status: active

## FR-core-engine-103 knowledge stats --json 输出新增 lastEventAt 字段（全量流 max(at) 的 ISO 字符串；无任何遥测记录时为 null）
变更：2026-10-05-knowledge-stats-freshness
状态：active
摘要：多记录乱序取最新；空流为 null
全文：.sillyspec/changes/archive/2026-10-05-knowledge-stats-freshness/requirements.md#FR-01
最近确认：d47d4ee37d52454e11d847f138c36bb8873a0481

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-knowledge-stats-freshness:flow:测试绑定FR-01
  tests: test/knowledge-stats.test.mjs「Test 8: lastEventAt 新鲜度聚合——多记录乱序取最新 / 单记录 / 无遥测 null」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-knowledge-stats-freshness
  status: active

## FR-core-engine-104 人类可读模式在遥测计数行展示数据截至日期（有遥测时）；无遥测时不展示该读数
变更：2026-10-05-knowledge-stats-freshness
状态：active
摘要：有遥测；无遥测
全文：.sillyspec/changes/archive/2026-10-05-knowledge-stats-freshness/requirements.md#FR-02
最近确认：d47d4ee37d52454e11d847f138c36bb8873a0481

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-knowledge-stats-freshness:flow:测试绑定FR-02
  tests: test/knowledge-stats.test.mjs「Test 8: 人类可读数据截至读数——有遥测展示 / 无遥测不展示」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-knowledge-stats-freshness
  status: active

## FR-core-engine-105 单测覆盖三种情形：多记录取最新 at、单记录、无遥测为 null
变更：2026-10-05-knowledge-stats-freshness
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-knowledge-stats-freshness/requirements.md#FR-03
最近确认：d47d4ee37d52454e11d847f138c36bb8873a0481

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-knowledge-stats-freshness:flow:测试绑定FR-03
  tests: test/knowledge-stats.test.mjs「Test 8: lastEventAt 三情形全断言（同用例组收口）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-knowledge-stats-freshness
  status: active

## FR-core-engine-109 collectReviewDeclaredFiles 对 resolver 回退拿到的无戳 run 返回空声明面（不再挂无关 run 的 changedFiles）
变更：2026-10-05-review-declared-unstamped-gate
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-declared-unstamped-gate/requirements.md#FR-01
最近确认：a26821acd8caefeee88ae1031526b8564d124a74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-declared-unstamped-gate:flow:测试绑定FR-01
  tests: test/review-declared-unstamped-gate.test.mjs「无戳 run（回退形态）声明面为空」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-declared-unstamped-gate
  status: active

## FR-core-engine-110 戳等值命中（run 归属本变更）时声明收集行为不变
变更：2026-10-05-review-declared-unstamped-gate
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-declared-unstamped-gate/requirements.md#FR-02
最近确认：a26821acd8caefeee88ae1031526b8564d124a74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-declared-unstamped-gate:flow:测试绑定FR-02
  tests: test/review-declared-unstamped-gate.test.mjs「带戳等值 run 收集行为不变（切片+产物过滤）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-declared-unstamped-gate
  status: active

## FR-core-engine-111 resolver 其他消费方（task-done/cross-repo-reconcile）语义零变化（门控只在 collectReviewDeclaredFiles 内）
变更：2026-10-05-review-declared-unstamped-gate
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-declared-unstamped-gate/requirements.md#FR-03
最近确认：a26821acd8caefeee88ae1031526b8564d124a74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-declared-unstamped-gate:flow:测试绑定FR-03
  tests: test/review-declared-unstamped-gate.test.mjs「resolver 回退语义不变（无主 run 仍被解析返回）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-declared-unstamped-gate
  status: active

## FR-core-engine-112 单测覆盖：无戳 run 空声明/带戳等值收集正常/带戳他变更+无戳并存仍空三形态
变更：2026-10-05-review-declared-unstamped-gate
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-review-declared-unstamped-gate/requirements.md#FR-04
最近确认：a26821acd8caefeee88ae1031526b8564d124a74

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-review-declared-unstamped-gate:flow:测试绑定FR-04
  tests: test/review-declared-unstamped-gate.test.mjs「带戳他变更+无戳并存仍空（三形态齐备）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-review-declared-unstamped-gate
  status: active

## FR-core-engine-113 datetime.js 新增 toWallClock(input)：接受 Date 实例 / epoch 毫秒数 / 可被 Date 解析的时间字符串三类输入，统一输出本地时区 YYYY-MM-DD HH:mm:ss（与 nowWallClock 同形）；无效输入（NaN 时刻/不可解析字符串）抛 TypeError 且信息含输入的字符串形式
变更：2026-10-06-wallclock-entry
状态：active
摘要：主路径；无效输入
全文：.sillyspec/changes/archive/2026-10-06-wallclock-entry/requirements.md#FR-01
最近确认：9946796884354bfe0a55318aeb740575d61f4127

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-wallclock-entry:flow:测试绑定FR-01
  tests: test/datetime-wallclock.test.mjs「toWallClock 三类输入与无效输入」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-wallclock-entry
  status: active

## FR-core-engine-114 scan-facts.js 的 generatedAt 改走 toWallClock，scan facts markdown 头行呈现本地墙钟人读形
变更：2026-10-06-wallclock-entry
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-wallclock-entry/requirements.md#FR-02
最近确认：9946796884354bfe0a55318aeb740575d61f4127

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-wallclock-entry:flow:测试绑定FR-02
  tests: test/scan-facts.test.mjs「generatedAt 本地墙钟形回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-wallclock-entry
  status: active

## FR-core-engine-115 测试覆盖：三类输入正确（含时区不偏移断言）、无效输入抛错、scan-facts generatedAt 新形状回归
变更：2026-10-06-wallclock-entry
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-wallclock-entry/requirements.md#FR-03
最近确认：9946796884354bfe0a55318aeb740575d61f4127

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-wallclock-entry:flow:测试绑定FR-03
  tests: test/datetime-wallclock.test.mjs「toWallClock 三类输入与无效输入」 | test/scan-facts.test.mjs「generatedAt 本地墙钟形回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-wallclock-entry
  status: active

## FR-core-engine-116 priorityFiles ∪ 变更自身测试文件不再被 CAP 弃置：优先面整跑（组内序保持优先前缀+字母序），帽只界普通 import 依赖（fill 剩余席位）
变更：2026-10-06-fr-regress-cap-drop
状态：active
摘要：优先面超帽；优先面未满帽
场景正文：
- 场景：优先面超帽 — Given js 组 40 个优先文件 + 20 个普通依赖（jsCap=30）；When buildDepsBatches 组卷；Then 实跑 40（全部优先文件），普通依赖 0 席、dropped=20，无任何优先文件被弃
- 场景：优先面未满帽 — Given js 组 5 个优先文件 + 40 个普通依赖（jsCap=30）；When buildDepsBatches 组卷；Then 实跑 30（5 优先 + 25 普通按字母序），dropped=15（全部普通依赖）
全文：.sillyspec/changes/archive/2026-10-06-fr-regress-cap-drop/requirements.md#FR-01
最近确认：dee59107324624cc525f561ac2e42bb1a7a21cd6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-regress-cap-drop:flow:测试绑定FR-01
  tests: test/fr-regress-cap-drop.test.mjs「优先面超帽整跑+未满帽填余」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-regress-cap-drop
  status: active

## FR-core-engine-117 批对象披露计数分列：count=实跑总数、dropped 只计普通依赖弃置、新增优先面计数；控制台「超帽弃」文案只对普通依赖成立，优先面计数在场
变更：2026-10-06-fr-regress-cap-drop
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given FR 关联回归并入 63 个绑定文件（超 30 帽）；When runModuleSubset 组卷执行；Then 日志含优先面计数与「超帽弃 N 普通依赖」，全部 63 个绑定文件进入执行命令
全文：.sillyspec/changes/archive/2026-10-06-fr-regress-cap-drop/requirements.md#FR-02
最近确认：dee59107324624cc525f561ac2e42bb1a7a21cd6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-regress-cap-drop:flow:测试绑定FR-02
  tests: test/fr-regress-cap-drop.test.mjs「批计数分列与控制台披露」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-regress-cap-drop
  status: active

## FR-core-engine-118 既有分组/运行器推断行为不变：.py/tsx/jsx 组、pytest/vitest 推断、e2e 目录过滤、cd 重定基照旧（回归测试钉住）
变更：2026-10-06-fr-regress-cap-drop
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 既有 test/dynamic-test-inference.test.mjs、test/residual-runner-parity.test.mjs、tes；When 应用本变更后重跑；Then 上述测试全部照旧通过
全文：.sillyspec/changes/archive/2026-10-06-fr-regress-cap-drop/requirements.md#FR-03
最近确认：dee59107324624cc525f561ac2e42bb1a7a21cd6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-regress-cap-drop:flow:测试绑定FR-03
  tests: test/dynamic-test-inference.test.mjs「既有 runner 结构推断回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-regress-cap-drop
  status: active

## FR-core-engine-119 直测覆盖三种配额形态：优先面超帽（普通依赖零席位）、优先面未满帽（普通填余）、py/js 混组优先豁免
变更：2026-10-06-fr-regress-cap-drop
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 构造 3+2+40 个测试文件的三组 fixture；When 直测 buildDepsBatches；Then 三种形态的选择结果与计数断言全绿
全文：.sillyspec/changes/archive/2026-10-06-fr-regress-cap-drop/requirements.md#FR-04
最近确认：dee59107324624cc525f561ac2e42bb1a7a21cd6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-regress-cap-drop:flow:测试绑定FR-04
  tests: test/fr-regress-cap-drop.test.mjs「py/js 混组优先豁免」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-regress-cap-drop
  status: active

## FR-core-engine-120 runModuleSubset 的 priorityFiles 传全量 FR 绑定文件（fr.files），与 deps 重叠的绑定文件不再被帽弃（fixture：绑定文件同时在 import 依赖面内、字母序最末，修复后必入执行批）
变更：2026-10-06-fr-priority-overlap
状态：active
摘要：重叠绑定
场景正文：
- 场景：重叠绑定 — When 调 runModuleSubset（changedFiles=[src/lib.js]）；Then 执行批命令包含 test/zz-bound.test.mjs（修复前字母序最末被 30 帽弃置）
全文：.sillyspec/changes/archive/2026-10-06-fr-priority-overlap/requirements.md#FR-01
最近确认：7f921a670bb4e9e4504acb8d5a6863f260db62df

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-priority-overlap:flow:测试绑定FR-01
  tests: test/fr-priority-overlap.test.mjs「① 重叠形态：绑定文件 ∈ deps 且字母序最末 → 必入执行批（修复前被 30 帽弃置）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-priority-overlap
  status: active

## FR-core-engine-121 并集去重与批计数语义不变（depsAll 构造照旧；披露标签如实反映实跑数）
变更：2026-10-06-fr-priority-overlap
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 重叠 fixture；When runModuleSubset 执行；Then 披露标签如实反映实跑与绑定面：帽内时 deps(js N) 的 N=帽值（绑定文件占帽内席位而非加帽）、优先面超帽时 N>帽值；绑定文件禁止被计入弃置数；fr(
全文：.sillyspec/changes/archive/2026-10-06-fr-priority-overlap/requirements.md#FR-02
最近确认：7f921a670bb4e9e4504acb8d5a6863f260db62df

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-priority-overlap:flow:测试绑定FR-02
  tests: test/fr-priority-overlap.test.mjs「① 重叠形态（标签 deps(js30)+fr(1) 如实断言）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-priority-overlap
  status: active

## FR-core-engine-122 直测覆盖重叠形态（绑定文件 ∈ deps）：修复后该文件在执行命令中；无 FR 索引/零绑定时行为与现状一致
变更：2026-10-06-fr-priority-overlap
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given ①② 两组 fixture；When 直测 runModuleSubset；Then 两组断言全绿
全文：.sillyspec/changes/archive/2026-10-06-fr-priority-overlap/requirements.md#FR-03
最近确认：7f921a670bb4e9e4504acb8d5a6863f260db62df

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-fr-priority-overlap:flow:测试绑定FR-03
  tests: test/fr-priority-overlap.test.mjs「① 重叠形态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-fr-priority-overlap
  status: active

## FR-core-engine-123 src/datetime.js 提供 timeAgo(input) 公共导出：接受 Date/epoch 毫秒/时间字符串（解析面与 toWallClock 同构），无效输入抛 TypeError 且 message 含输入字符串形式
变更：2026-10-06-datetime-timeago
状态：active
摘要：无效输入
全文：.sillyspec/changes/archive/2026-10-06-datetime-timeago/requirements.md#FR-01
最近确认：c886ad61490707995a4a33279c7a4c01ac9cded7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-datetime-timeago:flow:测试绑定FR-01
  tests: test/datetime-timeago.test.mjs「三类输入面（Date / epoch 毫秒 / 时间字符串）与注入时钟」 | test/datetime-timeago.test.mjs「无效输入抛 TypeError 且 message 含输入字符串形式」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-datetime-timeago
  status: active

## FR-core-engine-124 输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小时前 / N 天前（负差与未来时间按刚刚处理）
变更：2026-10-06-datetime-timeago
状态：active
摘要：档位边界
全文：.sillyspec/changes/archive/2026-10-06-datetime-timeago/requirements.md#FR-02
最近确认：c886ad61490707995a4a33279c7a4c01ac9cded7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-datetime-timeago:flow:测试绑定FR-02
  tests: test/datetime-timeago.test.mjs「timeAgo 档位形状与 stage-machine 现状逐字一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-datetime-timeago
  status: active

## FR-core-engine-125 stage-machine._timeAgo 改为委托 datetime.timeAgo（行为不变），模块内不再手写分钟/小时/天换算
变更：2026-10-06-datetime-timeago
状态：active
摘要：解析失败回退
全文：.sillyspec/changes/archive/2026-10-06-datetime-timeago/requirements.md#FR-03
最近确认：c886ad61490707995a4a33279c7a4c01ac9cded7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-datetime-timeago:flow:测试绑定FR-03
  tests: test/datetime-timeago.test.mjs「stage-machine._timeAgo 委托 datetime.timeAgo 且解析失败回退原串」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-datetime-timeago
  status: active

## FR-core-engine-126 新增回归测试覆盖各档位与无效输入，npm run test:core 全绿
变更：2026-10-06-datetime-timeago
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-datetime-timeago/requirements.md#FR-04
最近确认：c886ad61490707995a4a33279c7a4c01ac9cded7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-datetime-timeago:flow:测试绑定FR-04
  tests: test/datetime-timeago.test.mjs「收录 test:core 全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-datetime-timeago
  status: active

## FR-core-engine-127 裸 status 在多活跃（≥2）时列出全部活跃变更名并提示 --change 指定查看，不再出现「未找到进度数据」
变更：2026-10-06-status-multi-active-list
状态：active
摘要：多活跃主路径；活跃行含目录缺失的幽灵
全文：.sillyspec/changes/archive/2026-10-06-status-multi-active-list/requirements.md#FR-01
最近确认：9e0a8c4df213f6b3a1dfb2b66a9f2714e30bafc6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-status-multi-active-list:flow:测试绑定FR-01
  tests: test/status-multi-active-list.test.mjs「②幽灵行标注本地无目录」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-status-multi-active-list
  status: active

## FR-core-engine-128 零活跃或库不存在时维持既有空态引导文案（不回归）
变更：2026-10-06-status-multi-active-list
状态：active
摘要：零活跃；库不在场
全文：.sillyspec/changes/archive/2026-10-06-status-multi-active-list/requirements.md#FR-02
最近确认：9e0a8c4df213f6b3a1dfb2b66a9f2714e30bafc6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-status-multi-active-list:flow:测试绑定FR-02
  tests: test/status-multi-active-list.test.mjs「⑥库丢失后写路径可恢复」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-status-multi-active-list
  status: active

## FR-core-engine-129 只读短路语义不变：不 initChange、不新建 sillyspec.db（库不在场时）、exit 0
变更：2026-10-06-status-multi-active-list
状态：active
摘要：库不在场零副作用
全文：.sillyspec/changes/archive/2026-10-06-status-multi-active-list/requirements.md#FR-03
最近确认：9e0a8c4df213f6b3a1dfb2b66a9f2714e30bafc6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-status-multi-active-list:flow:测试绑定FR-03
  tests: test/status-multi-active-list.test.mjs「⑤多活跃分支只读零落盘（不新增 changes 目录）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-status-multi-active-list
  status: active

## FR-core-engine-130 归档 thin 变更（无 scope-audit.json、有 change-patch.json）跑 scope-audit：计划内文件显示「✓ 计划内」+ 冻结时点真实行数，不再恒「计划未动 0/0」；行数自冻结 patch 按段统计（binary/new/deleted 三档对齐既有口径）
变更：2026-10-07-scope-audit-thin-patch-replay
状态：active
摘要：归档 thin 变更查询；patch 采集失败留痕形态
全文：.sillyspec/changes/archive/2026-10-07-scope-audit-thin-patch-replay/requirements.md#FR-01
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-scope-audit-thin-patch-replay:flow:测试绑定FR-01
  tests: test/scope-audit-thin-patch-replay.test.mjs「patchStatus=failed：文件集回放 + 行数 null 档不出伪数据」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-scope-audit-thin-patch-replay
  status: active

## FR-core-engine-131 冻结语义：主仓后续演进（新文件/再修改）不进回放表；基点取 meta.baseline；--file 单文件 diff 走冻结 patch 切片（sha256 校验同 A-F01）
变更：2026-10-07-scope-audit-thin-patch-replay
状态：active
摘要：冻结后主仓演进；--file 冻结切片与篡改检测
全文：.sillyspec/changes/archive/2026-10-07-scope-audit-thin-patch-replay/requirements.md#FR-02
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-scope-audit-thin-patch-replay:flow:测试绑定FR-02
  tests: test/scope-audit-thin-patch-replay.test.mjs「冻结语义：后续演进不进表 + baseAnchor=meta.baseline + --file 冻结切片与 sha256 篡改拒绝」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-scope-audit-thin-patch-replay
  status: active

## FR-core-engine-132 既有行为不回归：execute 快照在时快照优先；快照与 change-patch 双缺的归档仍走开放区间兜底+漂移警告（既有断言绿）
变更：2026-10-07-scope-audit-thin-patch-replay
状态：active
摘要：快照优先级；双缺兜底不回归
全文：.sillyspec/changes/archive/2026-10-07-scope-audit-thin-patch-replay/requirements.md#FR-03
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-scope-audit-thin-patch-replay:flow:测试绑定FR-03
  tests: test/scope-audit-thin-patch-replay.test.mjs「优先级：快照在时快照优先；双缺走开放区间兜底（既有断言口径）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-scope-audit-thin-patch-replay
  status: active

## FR-core-engine-133 multi-agent-platform 旧归档 2026-10-07-taskboard-tasks-md 实测：三个计划内文件（backend/app/modules/task/parser.py 等）显示计划内
变更：2026-10-07-scope-audit-thin-patch-replay
状态：active
摘要：旧归档立即受益
全文：.sillyspec/changes/archive/2026-10-07-scope-audit-thin-patch-replay/requirements.md#FR-04
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05

## FR-core-engine-134 全量测试绿（含新增回放夹具测试）
变更：2026-10-07-scope-audit-thin-patch-replay
状态：active
摘要：全量门
全文：.sillyspec/changes/archive/2026-10-07-scope-audit-thin-patch-replay/requirements.md#FR-05
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-scope-audit-thin-patch-replay:flow:测试绑定FR-05
  tests: test/run-tests.mjs「全量套件（723 既有 + 新增）跑绿，既有断言零改动」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-scope-audit-thin-patch-replay
  status: active

## FR-core-engine-135 --fr-only 在场时输出仅含 FR 索引段
变更：2026-10-08-knowledge-stats-fr-only
状态：active
摘要：人类模式过滤；JSON 模式过滤
场景正文：
- 场景：人类模式过滤 — Given 本仓有 FR 索引和知识命中数据；When `sillyspec knowledge stats --fr-only`；Then 输出包含「FR 索引实验」标题但不包含「命中矩阵」或「conventions」相关段落
- 场景：JSON 模式过滤 — Given 同上；When `sillyspec knowledge stats --fr-only --json`；Then `data` 对象有 `frIndex` 键且无 `matrix` 键
全文：.sillyspec/changes/archive/2026-10-08-knowledge-stats-fr-only/requirements.md#FR-01
最近确认：920137ffb776865a0f44eb31da0ce8c9c0abcdb1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-stats-fr-only:flow:测试绑定FR-01
  tests: test/knowledge-stats-fr-only.test.mjs「--fr-only 人类模式仅含 FR 索引段」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-stats-fr-only
  status: active

## FR-core-engine-136 不带 flag 行为零变化
变更：2026-10-08-knowledge-stats-fr-only
状态：active
摘要：默认路径回归
场景正文：
- 场景：默认路径回归 — Given 未传 --fr-only；When `sillyspec knowledge stats` 或 `sillyspec knowledge stats --json`；Then 输出与改动前完全一致
全文：.sillyspec/changes/archive/2026-10-08-knowledge-stats-fr-only/requirements.md#FR-02
最近确认：920137ffb776865a0f44eb31da0ce8c9c0abcdb1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-stats-fr-only:flow:测试绑定FR-02
  tests: test/knowledge-stats-fr-only.test.mjs「不带 flag 行为零变化（字节一致）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-stats-fr-only
  status: active

## FR-core-engine-137 --json + --fr-only 组合 envelope 不变
变更：2026-10-08-knowledge-stats-fr-only
状态：active
摘要：envelope 完整性
场景正文：
- 场景：envelope 完整性 — Given --json 模式；When 加 --fr-only；Then 顶层键集不变（schema_version/ok 等），data.frIndex 在场
全文：.sillyspec/changes/archive/2026-10-08-knowledge-stats-fr-only/requirements.md#FR-03
最近确认：920137ffb776865a0f44eb31da0ce8c9c0abcdb1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-stats-fr-only:flow:测试绑定FR-03
  tests: test/knowledge-stats-fr-only.test.mjs「--json --fr-only envelope 不变仅过滤 data」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-stats-fr-only
  status: active

## FR-core-engine-138 测试覆盖三态
变更：2026-10-08-knowledge-stats-fr-only
状态：active
摘要：三态全绿
场景正文：
- 场景：三态全绿 — Given 测试套件；When 跑 knowledge-stats 相关测试；Then 三种形态断言全过
全文：.sillyspec/changes/archive/2026-10-08-knowledge-stats-fr-only/requirements.md#FR-04
最近确认：920137ffb776865a0f44eb31da0ce8c9c0abcdb1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-stats-fr-only:flow:测试绑定FR-04
  tests: test/knowledge-stats-fr-only.test.mjs「三态全覆盖」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-stats-fr-only
  status: active

## FR-core-engine-139 图引擎按本体契约解析九面知识为内存派生图
变更：2026-10-08-knowledge-graph
状态：active
摘要：全形态解析；坏行容忍
全文：.sillyspec/changes/archive/2026-10-08-knowledge-graph/requirements.md#FR-01
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-graph:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「②坏行容忍：changelog 三态坏行与侧车缺省 fail-soft」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-graph
  status: active

## FR-core-engine-140 knowledge graph 查询面五子命令（文本与 --json 双出口）
变更：2026-10-08-knowledge-graph
状态：active
摘要：impact 强边闭包；边型筛选
全文：.sillyspec/changes/archive/2026-10-08-knowledge-graph/requirements.md#FR-02
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-graph:flow:测试绑定FR-02
  tests: test/knowledge-graph.test.mjs「④CLI 分发：knowledge graph 子命令 --json/--edges 热测」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-graph
  status: active

## FR-core-engine-141 doctor 六项图完整性检查（全 warning 不阻断）
变更：2026-10-08-knowledge-graph
状态：active
摘要：断链命中；干净面零告警
全文：.sillyspec/changes/archive/2026-10-08-knowledge-graph/requirements.md#FR-03
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-graph:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「⑤doctor 六检查：断链命中与干净面零告警」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-graph
  status: active

## FR-core-engine-142 matchKnowledgeHybrid 新增 scope 遍历召回层（防复潮保底）
变更：2026-10-08-knowledge-graph
状态：active
摘要：无 scope 与现状逐字节等价；保底命中；封顶
全文：.sillyspec/changes/archive/2026-10-08-knowledge-graph/requirements.md#FR-04
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-knowledge-graph:flow:测试绑定FR-04
  tests: test/knowledge-graph.test.mjs「⑦消费方透传：flow touched 传递与 complete 锚点提取」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-knowledge-graph
  status: active

## FR-core-engine-143 sillyspec knowledge graph summary --json 输出 ok:true + stats 全字段（本仓真实数据：nodes≈4628/edges≈8173 量级，byType/byEdge 分布与 doctor 图完整性检查通过的 nodeCount/edgeCount 一致，四计数与 doctor 六检查同源同值）
变更：2026-10-08-graph-summary-nodes
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given buildFixture 九面全形态 specRoot / When graphSummary(g) / Then nodes/edges 等于 g.stats
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-nodes/requirements.md#FR-01
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-nodes:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-nodes
  status: active

## FR-core-engine-144 clusters 每簇带 key/label/count/representatives（≤5 个 GraphNodeRef），FR 最大簇的 representatives 是度数最高节点（可用图查询验证其真实邻边多）
变更：2026-10-08-graph-summary-nodes
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given fixture 含 fr:core-engine 簇（belongs-module 域）与 decision:core-engine 簇（域文件名） / Whe
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-nodes/requirements.md#FR-02
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-nodes:flow:测试绑定FR-02
  tests: test/knowledge-graph.test.mjs「⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-nodes
  status: active

## FR-core-engine-145 sillyspec knowledge graph nodes --search knowledge --json 返回 id/label 含 knowledge 的节点列表（count≤20），--limit 可调（钳 1-50）
变更：2026-10-08-graph-summary-nodes
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given fixture / When graphNodesSearch(g, 'FR-CORE-ENGINE-001', 10) 与 label 中文包含「第一个需求」
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-nodes/requirements.md#FR-03
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-nodes:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「⑨nodes 搜索 + CLI 分发 summary/nodes：包含匹配/大小写/limit 钳/usage 错」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-nodes
  status: active

## FR-core-engine-146 nodes --search 空串/缺省返回 usage 错误不崩
变更：2026-10-08-graph-summary-nodes
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given fixture / When cmdKnowledgeGraph(root, ['nodes']) / Then ok:false 且 error.code==
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-nodes/requirements.md#FR-04
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-nodes:flow:测试绑定FR-04
  tests: test/knowledge-graph.test.mjs「⑨nodes 搜索 + CLI 分发 summary/nodes：包含匹配/大小写/limit 钳/usage 错」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-nodes
  status: active

## FR-core-engine-147 现有五子命令回归全绿；新增两子命令进 usage 行
变更：2026-10-08-graph-summary-nodes
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 既有 ④CLI 分发用例 / When 回归 / Then 全绿且 usage 文案含七子命令。
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-nodes/requirements.md#FR-05
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-nodes:flow:测试绑定FR-05
  tests: test/knowledge-graph.test.mjs「④CLI 分发：knowledge graph 子命令 --json/--edges 热测」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-nodes
  status: active

## FR-core-engine-148 lint/test 与仓内惯例一致
变更：2026-10-08-graph-summary-nodes
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 仓内 lint/test 命令 / When 跑 / Then 零失败。
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-nodes/requirements.md#FR-06
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-nodes:flow:测试绑定FR-06
  tests: test/check-syntax.mjs | test/knowledge-graph.test.mjs「⑧summary 聚合 + ⑨nodes 搜索」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-nodes
  status: active

## FR-core-engine-149 判定逻辑抽共享 helper（graphModuleDocGaps/graphChangelogDanglings 落 knowledge-graph.js 单一源），doctor 六检查消费 helper（删内联副本），summary 四计数消费 helper——「一处定义两处消费」注释成真
变更：2026-10-08-graph-summary-consistency
状态：active
摘要：单一源对账
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-consistency/requirements.md#FR-01
最近确认：78cb671e6f0c7a5f0027bcabf27d41ab46b1205b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-consistency:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「⑩doctor↔summary 同源交叉断言：脏 fixture 上四计数逐值相等（单一源契约钉，2026-10-08-graph-summary-consistency）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-consistency
  status: active

## FR-core-engine-150 summary 增 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（不动 dangling_refs 既有语义——平台消费面兼容）
变更：2026-10-08-graph-summary-consistency
状态：active
摘要：分桶守恒
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-consistency/requirements.md#FR-02
最近确认：78cb671e6f0c7a5f0027bcabf27d41ab46b1205b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-consistency:flow:测试绑定FR-02
  tests: test/knowledge-graph.test.mjs「⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-consistency
  status: active

## FR-core-engine-151 测试补齐：module_doc_gaps 正值断言（mini-fixture 无卡模块）、changelog_danglings 双 existsFn 态断言、doctor↔summary 四计数交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值相等）
变更：2026-10-08-graph-summary-consistency
状态：active
摘要：脏面对账
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-consistency/requirements.md#FR-03
最近确认：78cb671e6f0c7a5f0027bcabf27d41ab46b1205b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-consistency:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「⑧summary 聚合」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-consistency
  status: active

## FR-core-engine-152 既有图测试 9 组 + doctor 回归全绿，lint 零告警
变更：2026-10-08-graph-summary-consistency
状态：active
摘要：回归面
全文：.sillyspec/changes/archive/2026-10-08-graph-summary-consistency/requirements.md#FR-04
最近确认：78cb671e6f0c7a5f0027bcabf27d41ab46b1205b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-graph-summary-consistency:flow:测试绑定FR-04
  tests: test/knowledge-graph.test.mjs「十组全绿面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-graph-summary-consistency
  status: active

## FR-core-engine-153 sillyspec knowledge graph dump --layout --json 输出 ok:true + nodes 数=summary nodes 数 + 坐标全整数
变更：2026-10-09-graph-dump-layout
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-graph-dump-layout/requirements.md#FR-01
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-dump-layout:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-dump-layout
  status: active

## FR-core-engine-154 连续两次调用 JSON 逐字节一致（确定性）
变更：2026-10-09-graph-dump-layout
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-graph-dump-layout/requirements.md#FR-02
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-dump-layout:flow:测试绑定FR-02
  tests: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-dump-layout
  status: active

## FR-core-engine-155 dump 不带 --layout 回 layout_required usage 错不崩
变更：2026-10-09-graph-dump-layout
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-graph-dump-layout/requirements.md#FR-03
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-dump-layout:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-dump-layout
  status: active

## FR-core-engine-156 USAGE 行与 stages available 收编 dump
变更：2026-10-09-graph-dump-layout
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-graph-dump-layout/requirements.md#FR-04
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685

## FR-core-engine-157 同簇节点抽样距离小于跨簇抽样（粗分组视觉成立）
变更：2026-10-09-graph-dump-layout
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-graph-dump-layout/requirements.md#FR-05
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-dump-layout:flow:测试绑定FR-05
  tests: test/knowledge-graph.test.mjs「⑩dump --layout：形状/确定性/layout 必带/粗分组视觉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-dump-layout
  status: active

## FR-core-engine-158 既有 11 用例零回归；lint 零问题
变更：2026-10-09-graph-dump-layout
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-graph-dump-layout/requirements.md#FR-06
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-dump-layout:flow:测试绑定FR-06
  tests: test/check-syntax.mjs | test/knowledge-graph.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-dump-layout
  status: active

## FR-core-engine-159 knowledge-graph.js 新导出 impactFromDecisionsMd(graph, decisionsMd)：键=锚点：路径 ∪ 模块域：模块 id（剥 NEW: 前缀，未入图跳过）→ 逐键 graphImpact → rejectedReachable 去重合并，条目带 viaImpact 标记（parseDecisionEntries 原生形态，消费方零重解析）
变更：2026-10-09-brainstorm-impact-antirevival
状态：active
摘要：双键命中；模块键经交付面可达
全文：.sillyspec/changes/archive/2026-10-09-brainstorm-impact-antirevival/requirements.md#FR-01
最近确认：9baab96fea518c5de08e6106909100fb7c5d65ce

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-brainstorm-impact-antirevival:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「⑫impactFromDecisionsMd：锚点+模块域双结构键 → graphImpact 可达集（2026-10-09-brainstorm-impact-antirevival）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-brainstorm-impact-antirevival
  status: active

## FR-core-engine-160 complete.js 方案步 gate：词面命中（含既有零分不弹过滤）之后并入 impact 可达集——viaImpact 条目绕过 score>0 门槛（结构可达即防复潮先验，与死路同待遇），与词面命中按 file+id+change 去重，过既有已回应不重弹过滤，渲染带 impact 可达注记；图构建 fail-soft
变更：2026-10-09-brainstorm-impact-antirevival
状态：active
摘要：保底进场；fail-soft
全文：.sillyspec/changes/archive/2026-10-09-brainstorm-impact-antirevival/requirements.md#FR-02
最近确认：9baab96fea518c5de08e6106909100fb7c5d65ce

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-brainstorm-impact-antirevival:flow:测试绑定FR-02
  tests: test/knowledge-gate-denoise.test.mjs「（词面过滤与已回应不重弹既有回归面——impact 并入复用同一管线，3 用例全绿）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-brainstorm-impact-antirevival
  status: active

## FR-core-engine-161 测试：⑪ impactFromDecisionsMd 单元面（fixture 锚点+模块域双键命中 rejected 条目 / NEW: 前缀剥除 / 未知模块跳过 / 空文本零返回）+ gate 合并去重路径
变更：2026-10-09-brainstorm-impact-antirevival
状态：active
摘要：回归钉
全文：.sillyspec/changes/archive/2026-10-09-brainstorm-impact-antirevival/requirements.md#FR-03
最近确认：9baab96fea518c5de08e6106909100fb7c5d65ce

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-brainstorm-impact-antirevival:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「⑫impactFromDecisionsMd」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-brainstorm-impact-antirevival
  status: active

## FR-core-engine-162 全量测试与 lint 零回归；D-004 纪律保持（键全部来自 decisions.md 机器校验字段，不解析自由文本）
变更：2026-10-09-brainstorm-impact-antirevival
状态：active
摘要：纪律面
全文：.sillyspec/changes/archive/2026-10-09-brainstorm-impact-antirevival/requirements.md#FR-04
最近确认：9baab96fea518c5de08e6106909100fb7c5d65ce

## FR-core-engine-163 detectArchiveIntegrity 增 thin 协议归档判别（flow-state.yaml 在场 → plan.md 在场性要求豁免，注记归档形态）；任务未勾检查不豁免（thin 也要全勾）；厚道（无 flow-state.yaml）plan.md 要求不变
变更：2026-10-09-archive-integrity-thin-aware
状态：active
摘要：thin 豁免
全文：.sillyspec/changes/archive/2026-10-09-archive-integrity-thin-aware/requirements.md#FR-01
最近确认：2edde8bd4addf24e870503ff287d587447203d68

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-archive-integrity-thin-aware:flow:测试绑定FR-01
  tests: test/doctor-archive-integrity.test.mjs「14a thin 归档无 plan.md → pass（flow-state.yaml 在场豁免）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-archive-integrity-thin-aware
  status: active

## FR-core-engine-164 测试新增：thin 归档无 plan.md → pass；thin 归档任务未勾 → 仍报（豁免不洗白）
变更：2026-10-09-archive-integrity-thin-aware
状态：active
摘要：豁免不洗白
全文：.sillyspec/changes/archive/2026-10-09-archive-integrity-thin-aware/requirements.md#FR-02
最近确认：2edde8bd4addf24e870503ff287d587447203d68

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-archive-integrity-thin-aware:flow:测试绑定FR-02
  tests: test/doctor-archive-integrity.test.mjs「14b thin 任务未勾 → 仍报（豁免不洗白完成面）」 | test/doctor-archive-integrity.test.mjs「15a-c thin 勾选契约 epoch 三断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-archive-integrity-thin-aware
  status: active

## FR-core-engine-165 豁免账本补录剩余历史形态条目（双无远古/quick 形态/纯提案 spike/未勾三份）——本变更即裁决流程（账本纪律：入账须走变更流程）
变更：2026-10-09-archive-integrity-thin-aware
状态：active
摘要：清账终态
全文：.sillyspec/changes/archive/2026-10-09-archive-integrity-thin-aware/requirements.md#FR-03
最近确认：2edde8bd4addf24e870503ff287d587447203d68

## FR-core-engine-166 真图终验：doctor archive_integrity offenders 归零（或仅剩未来新账）；全量测试与 lint 零回归
变更：2026-10-09-archive-integrity-thin-aware
状态：active
摘要：回归面
全文：.sillyspec/changes/archive/2026-10-09-archive-integrity-thin-aware/requirements.md#FR-04
最近确认：2edde8bd4addf24e870503ff287d587447203d68

## FR-core-engine-167 parseChangelogEntries 尾括号后缀剥除（（P2）类；仅当剥离后匹配日期/ql 形态才接受，防剥坏正常名）——changelog_danglings 归零
变更：2026-10-09-graph-docrefs-noise
状态：active
摘要：后缀名
全文：.sillyspec/changes/archive/2026-10-09-graph-docrefs-noise/requirements.md#FR-01
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-docrefs-noise:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「②坏行容忍：changelog 三态坏行与侧车缺省 fail-soft」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-docrefs-noise
  status: active

## FR-core-engine-168 graphDangling 文档引用面（doc-refs/scan-refs）口径修正：裸文件名（无 /）不判悬空；跨仓前缀（顶级目录本仓不存在）单独计跨仓引用不计本仓悬空；doctor 文案注记两类构成
变更：2026-10-09-graph-docrefs-noise
状态：active
摘要：真图降噪
全文：.sillyspec/changes/archive/2026-10-09-graph-docrefs-noise/requirements.md#FR-02
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-docrefs-noise:flow:测试绑定FR-02
  tests: test/knowledge-graph.test.mjs「⑧summary 聚合」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-docrefs-noise
  status: active

## FR-core-engine-169 extractFilePaths/anchorFilePaths 剥后缀产物为空或纯数字时丢弃
变更：2026-10-09-graph-docrefs-noise
状态：active
摘要：噪声守卫
全文：.sillyspec/changes/archive/2026-10-09-graph-docrefs-noise/requirements.md#FR-03
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-graph-docrefs-noise:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「①解析全形态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-graph-docrefs-noise
  status: active

## FR-core-engine-170 降噪后真图复跑：doc/scan 悬空降到真实数（本仓存在性可判的带路径引用）；平台侧 64 缺卡清单钉进 doctor 输出（已有 graph-module-doc-gap）并对其中本仓可产内容的部分（backend 14 张——scan STRUCTURE 目录职责表在场）补定位级卡片，跨仓不可产的（frontend/daemon 等源码不在本仓）留 doctor advisory 不伪造
变更：2026-10-09-graph-docrefs-noise
状态：active
摘要：双归零
全文：.sillyspec/changes/archive/2026-10-09-graph-docrefs-noise/requirements.md#FR-04
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04

## FR-core-engine-171 全量测试与 lint 零回归
变更：2026-10-09-graph-docrefs-noise
状态：active
摘要：回归面
全文：.sillyspec/changes/archive/2026-10-09-graph-docrefs-noise/requirements.md#FR-05
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04

## FR-core-engine-172 isTestFilePath 锚定口径统一：isProbe7TestPath 不再把 spec-sync.ts / respec.ts 等无测试后缀锚定的源码判为测试路径；.test./.spec. 后缀与 tests?/ 目录、test_*.py/*_test.py 照常命中（run-sillyspec-init.test.ts 仍 true）
变更：2026-10-10-dyn-subset-nontest-runner-face
状态：active
摘要：源码文件名含 spec 字样不误判；合法测试形态照常命中
全文：.sillyspec/changes/archive/2026-10-10-dyn-subset-nontest-runner-face/requirements.md#FR-01
最近确认：58257512ae9f8a51f1ef0636897351b3ea7f8356

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-dyn-subset-nontest-runner-face:flow:测试绑定FR-01
  tests: test/probe7-testpath-anchor.test.mjs「合法测试形态照常命中」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-dyn-subset-nontest-runner-face
  status: active

## FR-core-engine-173 buildDepsBatches 执行侧兜底：非测试形态的 js/py 文件不进 node --test / pytest 执行批，改 skip 批 loud 披露（复用 run-tests.mjs skip 先例，不静默丢弃）
变更：2026-10-10-dyn-subset-nontest-runner-face
状态：active
摘要：FR 绑定面混入源码不进执行批；正常测试文件组卷不受影响
全文：.sillyspec/changes/archive/2026-10-10-dyn-subset-nontest-runner-face/requirements.md#FR-02
最近确认：58257512ae9f8a51f1ef0636897351b3ea7f8356

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-dyn-subset-nontest-runner-face:flow:测试绑定FR-02
  tests: test/dynamic-test-inference.test.mjs「buildDepsBatches：非测试形态文件拆 skip 批不进 node --test / pytest 执行批」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-dyn-subset-nontest-runner-face
  status: active

## FR-core-engine-174 新增钉行为测试 + 既有测试面全绿（收口实测门本变更自证）
变更：2026-10-10-dyn-subset-nontest-runner-face
状态：active
摘要：收口实测门自证
全文：.sillyspec/changes/archive/2026-10-10-dyn-subset-nontest-runner-face/requirements.md#FR-03
最近确认：58257512ae9f8a51f1ef0636897351b3ea7f8356

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-dyn-subset-nontest-runner-face:flow:测试绑定FR-03
  tests: test/probe7-testpath-anchor.test.mjs「isProbe7TestPath 边界表全量」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-dyn-subset-nontest-runner-face
  status: active
