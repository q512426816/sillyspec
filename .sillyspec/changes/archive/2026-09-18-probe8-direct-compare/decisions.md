---
author: zcode-pascap-batchB
created_at: 2026-09-18
generated_by: agent
change: 2026-09-18-probe8-direct-compare
---

# 决策记录（Decisions）

<!-- 背景（批次 B，防复发五层方案第二批）：批次 C（v3.28.12）已交付运行时地板（commands.smoke 亲跑+覆盖矩阵），
     批次 B 补静态直比面——probe8 载荷字段契约对账从 advisory+design 清单源升级为代码级直比+diff 源，
     机械拦「前端 payload 字段名 ≠ 后端实体/DTO 字段名」（EHS P1-1/P1-2/P1-6 三处字段错位的直接防线）。
     归档变更 2026-09-16-cross-layer-contract-probe 显式留白三个空位，本批全部兑现。 -->

## D-001@v1: probe8 diff 源替换——design 清单声明面 → worktree diff 实际面
- type: architecture
- status: accepted
- 问题: probe8 现读 design 文件清单（声明面）——design 清单漏写/路径写错时整条探针静默失明（EHS 实证 C-07：design 清单与实际交付面错位是常态）。
- 注记（Grill B-6/B-2 修正）：选定段原指名 resolveAttributionDiffFiles/reconcileCrossRepoDeclarations——design §1 已替换为 _readWorktreeMeta+gitQuiet 自建 / 全注册仓循环双源直采（import 环与声明触发问题），以 design 为权威。
- 选定: `runProbe8PayloadParity` 的文件源从 `parseFileChangeListDetailed(design)` 切换为 **worktree diff 实际面**（`resolveAttributionDiffFiles` 主仓 + `reconcileCrossRepoDeclarations` 双源跨仓——批次 A task-02 已验证的取数形态）；design 清单面降级为 advisory 注记（「design 清单有但 diff 无的路径」列出供复核，不参与对账）。
- alternatives: 双源并集（否决——design 幻觉路径会误报前端调用缺失）。
- normalized_requirement: probe8 前端/后端文件集取自 git diff 实际面；design 清单差集 advisory 注记。
- impacts: [FR-01]
- evidence: src/verify-probes.js:302-469（runProbe8PayloadParity 现源）、批次 A task-02 resolveAttributionDiffFiles/collectCrossRepoDiffRoots 先例、归档 cross-layer-contract-probe proposal 留白①
- 故障面: worktree 缺失/非 worktree 模式（in-place）→ fallback design 清单源（fail-open 注记模式）；跨仓 diff 双失败 → 探针跳过注记。
- 退役判据: 若前后端元数据标准化（OpenAPI 生成等），直比面切换标准产物。

## D-002@v1: probe8 代码级字段直比——前端 payload 构造点字段集 vs 后端实体/DTO 字段集
- type: architecture
- status: accepted
- 问题: 现行 probe8 只对账 design 契约面声明的字段（agent 声明什么对什么），不碰代码——EHS P1-1（leaderUserId≠rpLeaderUserId）三处字段错位正是代码与代码的错位，声明面对账天然盲。
- 注记：D-002 提及的 order.xxx 匹配族在 design §2 落地时收窄为 formData./payload./请求邻近窗口 DTO 键（Grill B-5 对齐现行先例防假阳）。
- 选定: 新增**代码级直比维度**（advisory 升级第一步，D-004 硬门为后续独立决策）：
  - **前端提取**：diff 文件面中 grep payload 构造点模式——`formData.xxx`/`payload.xxx`/`order.xxx`/DTO 字面量（`{xxx: yyy}` 键名）/表单 `name="xxx"` 属性——按文件类型（.js/.ts/.vue/.jsx/.wxml）选匹配族，产出 per-endpoint 字段名集（按调用 URL 关联端点）；
  - **后端提取**：Java 实体 `private Type fieldName;`（含 @TableField/@Column 注解映射）/DTO record/class 字段/Controller `@RequestParam`/`@PathVariable`/`@RequestBody` 类型字段——产出 per-endpoint 必填集与全字段集；
  - **对账**：前端发送集 ∩ 后端全字段集 = 匹配面；前端发送集中**不在后端全字段集**的字段 → warning「字段名漂移嫌疑」（EHS P1-1 形态：Jackson 静默丢弃）；后端**必填集**（@NotNull/@NotBlank/@RequestParam required/Controller 显式校验）中不在前端发送集 → warning「必填漏发嫌疑」（EHS P1-2 形态）。
  - escape hatch：文件级 `// probe8-skip` 注释（probe9 先例）——非 Java/JS 栈自动跳过注记。
- alternatives: 类型形状比对（否决——批次 B 范围外，先攒字段名实证）。
- normalized_requirement: 前后端字段集代码级对账产出两类 warning（漂移嫌疑/漏发嫌疑）；escape hatch 文件级豁免。
- impacts: [FR-02]
- evidence: EHS P1-1（RpForm.js:353/364/395 字段名≠实体名）/P1-2（rpAdd.js 不发 reportOrgId）/P1-6（reportOrgName NOT NULL 漏发）、归档 cross-layer-contract-probe 留白②
- 故障面: 提取正则假阳/假阴（动态字段名 obj[key] 不可枚举）→ advisory 档不阻断+escape hatch；前端框架 DSL 差异（Vue/React/原生）→ 按文件后缀选匹配族+未识别后缀跳过注记。
- 退役判据: 批次 C smoke 落地后运行时抓字段漂移（payload 从构造点导出），静态直比降为早期预警补充。

## D-003@v1: Controller 必填校验器提取——@NotNull/@NotBlank/@RequestParam(required) 三形态
- type: architecture
- status: accepted
- 问题: 后端「必填」面在 Controller/Service/DTO 三层分散（注解+显式校验+DB NOT NULL），probe8 需要机械可提取的必填集做漏发对账。
- 选定: 三形态正则提取（Java 栈）：①字段注解 `@NotNull|@NotBlank|@NotEmpty|@Email`（注解前/后紧邻字段声明）；②方法参数 `@RequestParam(required = true)`（缺省 true）+ `@PathVariable`；③Controller 显式校验调用（`StringBlankValidator`/`Valid.valid()`/`if (xxx == null) throw` 模式族——仓内常见框架 qmdp 先例宽收，宁多勿漏归 advisory）。三形态产出 per-endpoint requiredFields 集。
- alternatives: AST 级解析（否决——引入 javaparser 依赖违零依赖铁律，正则族+escape hatch 足够 advisory 档）。
- normalized_requirement: Java 栈 Controller/DTO 三形态必填集提取产出 requiredFields；非 Java 栈跳过注记。
- impacts: [FR-02]
- evidence: EHS P1-2（Controller validSaveRequest StringBlankValidator reportOrgId 必填）、归档留白②「Controller 校验器提取」
- 故障面: 自定义校验框架不识别 → 必填集不完整（漏报侧，advisory 可接受）；校验调用误匹配（假阳）→ warning 多一条，escape hatch 兜底。
- 退役判据: 若后端元数据标准产物（OpenAPI spec）可用，三形态提取退役。

## D-004@v1: advisory 档起步——硬门升格为后续独立决策
- type: boundary
- status: accepted
- 问题: 直比 warning 的假阳率未实证——升硬门（warning→error）需要一轮真实变更的攒证。
- 选定: 本批全部产出 advisory warning（不阻断 verify）；探针输出含命中统计（漂移嫌疑 N 条/漏发嫌疑 M 条/escape hatch K 文件）供后续批次评估升格。`probe8-direct-compare` 探针段骨架预填+口径注记（同 probe8 既有段格式）。
- impacts: [FR-03]
- evidence: 归档 cross-layer-contract-probe 留白③「不做硬门，升门是后续独立决策」
- 故障面: advisory 无阻断力（批次 A 已实证）——但直比本批定位「预警+攒证」，运行时兜底归批次 C smoke。
- 退役判据: 一轮实证假阳率 < 5% 后升硬门（后续变更）。

## D-005@v1: 非目标
- type: boundary
- status: accepted
- 选定: 不做类型形状比对（字段类型/嵌套 DTO）；不做前端框架特定 DSL 深度解析（Vue template/JSX 表达式级）；不做非 Java 后端提取（Go/Python/Node 后端——攒需求后扩展）；不做硬门升格（D-004）；不动 probe8 既有 design 契约面对账（代码直比为**新增维度**并行存在）。
- impacts: [边界]
- evidence: 归档 cross-layer-contract-probe proposal 留白清单

## D-006@v1: 方案 A——probe8 内新增 direct-compare 子段
- type: architecture
- status: accepted
- source: user
- question: 代码级直比的实现位置——A probe8 内新维度 / B 独立 probe10 / C 插件架构。
- answer: 用户选 A——probe8 载荷字段契约对账探针内新增 direct-compare 子段（现有 design 契约面 advisory 保留，代码直比为并行新增维度）；extractFrontendPayloadFields/extractBackendRequiredFields 独立导出，未来升 probe10/plugin 只挪注册不改逻辑。B 否决：探针膨胀+碎片化；C 否决：当前 Java+JS 两族用不上插件接口（D-005 违背）。
- evidence: 本会话批次 B 方案选择轮（2026-09-18，用户答复"a"）
- impacts: [FR-01, FR-02, FR-03]
- normalized_requirement: 代码直比落位 probe8 内 direct-compare 子段；提取函数独立导出。
- 故障面: probe8 文件膨胀——提取函数+对账逻辑独立区块注释锚定，膨胀可控。
- 退役判据: 若直比面升独立探针（攒证后），提取函数整体迁出。
