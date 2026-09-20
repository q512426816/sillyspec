## FR-core-engine-001 稳定 FR id 发号与幂等索引
变更：2026-09-18-fr-index-l1
状态：active
摘要：幂等重放；域兜底
场景正文：
- 场景：默认场景 — Given 变更归档（noAI 步）且其 requirements.md 含 FR 块（`### FR-NN: 标题`）；When indexRequirements 执行（域=design 文件清单剥 NEW: 前缀×_module-map，unmapped 兜底）；Then 新 FR 按域计数器 max+1 发全局 id `FR-<域>-NNN` 并写入 knowledge/fr/<域>.md（条目含来源变更/状态 active/摘
- 场景：幂等重放 — Given 同一变更的 indexRequirements 连续执行两次；Then 第二次 written/superseded 均空，索引文件零漂移
- 场景：域兜底 — Given 文件清单无可匹配模块；Then 条目落 knowledge/fr/unmapped.md（可见可迁移，同 decisions 先例）
最近确认：aae25a4

## FR-core-engine-002 承接取代链与写作期注入
变更：2026-09-18-fr-index-l1
状态：active
摘要：取代链完整
场景正文：
- 场景：默认场景 — Given requirements.md FR 块含 `承接: FR-<域>-NNN[, ...]` 行（brainstorm step8 注入清单供引用） brains；When 归档索引执行 step8 prompt 渲染；Then 旧条目状态翻 superseded + superseded_by=新 id + 链注记；承接 id 不存在→warn 留痕不阻断；未引用旧 FR 的删除/修改
- 场景：取代链完整 — Given change B 承接引用 change A 归档发的 FR-x-001；When B 归档；Then FR-x-001 状态 superseded、superseded_by=本次新号、摘要链注记在场
最近确认：aae25a4

## FR-core-engine-003 四类观察指标事件流
变更：2026-09-18-fr-index-l1
状态：active
摘要：本变更自举采样
场景正文：
- 场景：默认场景 — Given 三机制在位（step8 注入/step8 软门/归档承接——护栏②：任一被移除对应指标恒零即实验失真）+删除缺口探针；When 各机制动作发生；Then knowledge-hits.jsonl 落 fr-inject（条数+域）/fr-supersede（from/to/change）/fr-duplicate
- 场景：本变更自举采样 — Given 本变更自身归档（首个 epoch 样本）；Then fr-superseded 与 fr-unreferenced 各至少一条真实事件落盘（verify 读回）
最近确认：aae25a4

## FR-core-engine-004 D14 第四检查与覆盖面边界
变更：2026-09-18-fr-index-l1
状态：active
摘要：自举被抓即机制工作
场景正文：
- 场景：默认场景 — Given doctor archive_integrity 重扫；When 归档日期前缀 ≥ FR_INDEX_EPOCH（2026-09-18）且非 quick/scale:small 豁免面；Then 变更名须在 fr 索引「来源变更」字段在场；其 requirements 含承接行则旧条目 superseded 须已标；违者 warning offender
- 场景：自举被抓即机制工作 — Given 本变更归档时索引写入失败；When D14 重扫；Then 本变更作为 offender 出现（R-05 活证）
最近确认：aae25a4

## FR-core-engine-005 三轴客观定价引擎
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：span 封顶防「单测档改半个仓」；agent 自报只升不降
场景正文：
- 场景：默认场景 — Given `src/ceremony-tier.js` 的 `computeCeremonyTier` 接收 blast（detectChangeRisk 输出+显式声明；When 任一分量达到更高档；Then `ceremony_tier = max(blast, span, friction)` 取封顶，档位 ∈ S0/S1/S2/S3（映射既有五档：doc-onl
- 场景：span 封顶防「单测档改半个仓」 — Given detectChangeRisk 判 unit-sufficient（blast=S1）但声明文件数≥8 或模块跨度≥3 或命中 QUICK_RISK_PATH；When 定价；Then tier ≥ S2（span 分量封顶生效），reasons 含 span 命中明细
- 场景：agent 自报只升不降 — Given agent 声明 needs_human_review 或显式 risk_level 升档；When 定价；Then 按升档执行且留痕；任何自报不产生降档（降档唯一通道=D-004 留理由+收口复核）
最近确认：7c7a85c

## FR-core-engine-006 接管 review-tier 与 plan_level 降级编排化
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：任务②同款不再全价
场景正文：
- 场景：默认场景 — Given classifyReviewTier 现行「planLevel 三分支+文件数≤3 启发式」；When 本变更落地后；Then 评审档由 computeCeremonyTier 决定（旧文件数规则降为 S0/S1 内部断路器保兼容）；plan 阶段 plan_level 输出仅为编排标签
- 场景：任务②同款不再全价 — Given risk=unit-sufficient、span 未超阈、无摩擦记录的变更；When 进入 brainstorm Step7 审查与 plan 审查；Then 按档位化菜单执行轻仪（S1），不因「计划写得完整」进入 independent×2
最近确认：7c7a85c

## FR-core-engine-007 收口双跑对账（预价信声明，结算信事实）
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：懒 agent 低报被收口抓获
场景正文：
- 场景：默认场景 — Given verify --done 与 archive confirm 两出口可取实际 diff 文件集（resolveReconcileActualFiles 单点现；When 收口；Then 用实际 diff 重跑 blast+span 得事实档；声明档<事实档 → 硬 flag（verify errors / archive 阻断警告）+ 记摩擦账
- 场景：懒 agent 低报被收口抓获 — Given design 声明面未提风险关键词（blast 判 S1）但实际 diff 命中 auth/migration 路径（事实档 S2+）；When verify --done 双跑；Then mismatch=error 硬 flag，摩擦账留档，次单预价按事实面
最近确认：7c7a85c

## FR-core-engine-008 friction 阶段门升档与影子期
变更：2026-09-18-ceremony-risk-pricing
状态：active
摘要：影子产物不污染主线
场景正文：
- 场景：默认场景 — Given 四阶段完成门（gate 评估点）读 friction-ledger 累计账；When gate_rollback/review_rejected 超阈；Then tier = min(S3, tier+1) 只升不降，迁移记录写 .runtime/ceremony-tier-<change>.json（withFileL
- 场景：影子产物不污染主线 — Given 影子重评审 verdict=fail 落盘；When 主线 gate 经 getLatestStageReviewRunId 找评审产物；Then 不命中影子命名空间（stage-reviews-shadow/ 隔离），主线不受影子 verdict 阻断
最近确认：7c7a85c

## FR-core-engine-009 probe8 diff 源替换
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given worktree 可用 worktree 缺失（in-place） git 全失败 design 清单有但 diff 无的路径；When collectProbe8DiffFiles 取数 取数 取数 渲染
最近确认：

## FR-core-engine-010 代码级字段直比
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given .js/.ts/.jsx/.tsx 前端文件 .vue / .wxml .java Controller 前端字段 ∉ backendAllFields（全仓并；Then formData./payload. 字段名 + 请求调用 8 行窗口内 DTO 字面量键 + name 属性 v-model/prop / value绑定/d
最近确认：

## FR-core-engine-011 骨架渲染与 advisory 档
变更：2026-09-18-probe8-direct-compare
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given probe8 渲染 文件含 probe8-skip（前端或后端） 非 Java 后端文件；When direct-compare 子段 提取 提取；Then 命中统计行+逐条明细行（文件:行号+说明）；全部 advisory 不阻断；渲染行不误中 verify-postcheck PROBE8 系锚点 跳过+计数 n
最近确认：

## FR-core-engine-012 三槽预填引擎
变更：2026-09-18-artifact-prefill
状态：active
摘要：核对改写
场景正文：
- 场景：默认场景 — Given src/prefill.js 三纯函数（清单←target_files 并集/决策表←D-xxx 清单/ids←FR+D 抽取）；When 生成器或 refresh 调用；Then 白名单槽落预填值+来源行内注「(预填：核对后删本注)」；槽外一律不碰；无源文件时空槽+提示行（骨架行为不变）
- 场景：核对改写 — Given task 卡 target_files 已声明六文件；When prefill-refresh 运行；Then design 清单槽出六行（NEW: 保形）带注——agent 核对删注即确认
最近确认：6786025

## FR-core-engine-013 refresh 重放与已确认保护
变更：2026-09-18-artifact-prefill
状态：active
摘要：人工保护
场景正文：
- 场景：默认场景 — Given sillyspec prefill-refresh --change <名>；When 槽内预填注在场；Then 重放预填（幂等）；注已删=已确认→跳过不覆盖人工内容
- 场景：人工保护 — Given 决策追踪表某行被 agent 改写且注已删；When refresh；Then 该槽跳过（confirmed 计数）
最近确认：6786025

## FR-core-engine-014 门禁梯度与对表
变更：2026-09-18-artifact-prefill
状态：active
摘要：注清零校验
场景正文：
- 场景：默认场景 — Given --done 门（brainstorm/plan）与归档前校验；When 白名单槽含未删注；Then --done advisory 提示；归档前 error 阻断（注清零=确认完成）；本变更对表数据（请求/上下文/摩擦 vs 基线 172/249k/9）落 b
- 场景：注清零校验 — Given 归档前 design 清单槽仍有预填注；When verify 探针；Then error——预填未确认
最近确认：6786025

## FR-core-engine-015 covered-service 判定形态满足覆盖等式
变更：2026-09-19-api-matrix-service-coverage
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given verify-result.md 接口验证覆盖矩阵中某端点行判定为 covered-service 且证据列含真实测试锚点（`.test.` / file:li；When verify `--done` 门禁执行 judgeApiCoverageMatrix；Then 该行计入覆盖分子（covered+covered-service == 有效分母时放行），不触发移交联动（partial/uncovered 专用）与 PASS
最近确认：7438d34

## FR-core-engine-016 测试锚点硬约束与八面文案同源
变更：2026-09-19-api-matrix-service-coverage
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 某端点行判定为 covered-service 而证据列缺测试锚点；When verify 门禁执行；Then error 阻断（与 non-testable 缺理由同 fail-closed 级）；且骨架/指引/模板/门禁错误文案/anchor-check/--init
最近确认：7438d34

## FR-core-engine-017 四阶段评审材料包契约
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 各阶段评审派发（Grill 首轮/plan 审/execute QA/再审）；When prompt 组装；Then 必读清单段替换为材料包注入（grill-first={designDigest,fileList,crossPoints[≤5],snippets[]}；pla
最近确认：7438d34

## FR-core-engine-018 再审唯一材料化＋基准面语义
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 再审派发（同阶段上一轮 findings 在场）；When {PRIOR_REVIEW_FACTS} 渲染；Then 复审基线段为排他语（本轮唯一基准面）＋上一轮 findings＋对应修复 diff；四阶段评审者首项自检「材料包是否足以逐条作答；不足→cannot_verif
最近确认：7438d34

## FR-core-engine-019 机械验收钉
变更：2026-09-19-review-material-pack
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 阶段 prompt 模板；When 回归测试执行；Then grep 断言无「必须读取完整」「素材宁可多读」两原语（全仓命中均在改写面内）；包组装 helper 四阶段形态单测；排他语在场断言。
最近确认：7438d34

## FR-core-engine-020 CLI 机械注入接线
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 三阶段评审派发（Grill 首轮/plan 审/execute QA）且 step prompt 含 {REVIEW_TIER}/{REVIEW_MATERIA；When prompt.js tier 注入链渲染；Then {REVIEW_MATERIALS} 被装配结果填充（brainstorm→grill-first、plan→plan-review、execute→execu
最近确认：33fca7f

## FR-core-engine-021 混合组包边界
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 装配函数 assembleStageReviewMaterials；When CLI 半边素材收集；Then grill-first={designDigest（章节行号索引+背景/设计目标节）, fileList（design.md 文件变更清单表路径列）}；plan
最近确认：33fca7f

## FR-core-engine-022 验收钉
变更：2026-09-19-review-material-cli-wiring
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 回归测试执行；When test/review-material-pack.test.mjs 跑；Then 既有组一（两原语绝迹）/组二（包形态+joins≥2+两槽互斥）/组三（排他语）零改动保持绿；新增组四：装配函数三形态非空断言（fixture）＋接线源码钉（主
最近确认：33fca7f

## FR-core-engine-023 span_risk 声明段与装载器
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given `_module-map.yaml` 顶层含 `span_risk:` 字符串数组段；When `loadSpanRiskPatterns({specBase, project})` / `loadSpanRiskPatternsAllProjects({；Then 返回编译产物 `[{pattern, re}]`（token 转义后编译为现行同款边界锚定正则：前界 `(?:^|[/_-])`、后界 `(?=[/._-]|$
最近确认：c796534

## FR-core-engine-024 定价消费面切换（ceremony span 轴）
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given computeCeremonyTier 收到 opts.spanRiskPatterns（声明表编译产物）；When 声明文件命中任一 token；Then span ≥ S2 且 reasons 记 `span=S2（风险路径命中 <token>：<files>）`；opts.spanRiskPatterns 缺省
最近确认：c796534

## FR-core-engine-025 quick 画像消费面切换
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given computeGateProfile 收到 opts.riskTable（声明表编译产物）；When 非文档文件命中任一 token；Then riskHits 记 `{pattern, file}`、判级 L2、checks.runtimeEvidence='required'；riskTable 缺
最近确认：c796534

## FR-core-engine-026 硬退役与自举
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 本变更合入；Then QUICK_RISK_PATH_PATTERNS 定义/导出/引用全仓零残留；本仓 map 携带 `[migrate, migration, migration
最近确认：c796534

## FR-core-engine-027 回归钉
变更：2026-09-19-span-risk-pattern-migration
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 测试套件；When 全量跑；Then 编译等价性钉（六域展开 token 集 vs 旧正则，代表性路径集含 author/booking/lockfile 反例，命中面逐字节相同）绿；modules
最近确认：c796534

## FR-core-engine-028 依据决策机读链
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given requirements.md 含决策覆盖矩阵（D-xxx@vN → FR-NN 映射）；When 归档 indexRequirements 执行；Then 条目含「依据决策：」行、digest 条目含 decisions 数组；无矩阵/无命中省略行且不阻断
最近确认：4222a90b

## FR-core-engine-029 模块卡指针显式化
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 任一 knowledge/fr/<域>.md 文件写入/更新；When 文件头 blockquote 落盘；Then 含「模块卡：modules/<域>.md」一行
最近确认：4222a90b

## FR-core-engine-030 GWT 场景正文入库
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given requirements.md 含 Given/When/Then 行；When 归档 indexRequirements 执行；Then 条目含「场景正文：」块（每场景一行，各段截 80 字，≤5 场景）
最近确认：4222a90b

## FR-core-engine-031 存量回填
变更：2026-09-20-fr-index-l2
状态：active
摘要：默认场景
依据决策：D-003@v2
场景正文：
- 场景：默认场景 — Given knowledge/fr 存在 active 条目缺场景正文，且其来源变更归档目录 requirements.md 在场；When sillyspec fr-backfill 执行；Then 按标题匹配补齐正文（幂等：已有正文的条目跳过；匹配失败警告不阻断）
最近确认：4222a90b
