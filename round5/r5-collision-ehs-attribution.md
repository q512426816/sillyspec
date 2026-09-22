# R5 对撞基线归因（2026-09-21 EHS 安全奖惩 · openspec vs sillyspec v3.29.5）

数据源：两个会话完整导出（full.json，导出时刻 11:31 本地）
- A 组 openspec：`会话导出_完整信息_20260921_033205.zip` → 4 runs / 2358 logs / 48 tasks
- B 组 sillyspec：`会话导出_完整信息_20260921_033149.zip` → 23 runs / 3333 logs / 57 tasks
- 同 runtime（2f0467a6）、同 provider、同任务书；00:52–01:37 daemon 宕机后同句"继续跑"恢复；03:29 同时 daemon_interrupted。有效赛段两边均 ≈112min。
- 复现脚本：本目录 cmp.mjs（文件产出/仓库分布）、cmp2.mjs（runs/CLI/git）、why2.mjs（A 阶段时间线）；full.json 需先从 zip 解压。

## 一、终局与硬账

| 维度 | A openspec | B sillyspec v3.29.5 |
|---|---|---|
| 中断时进度 | 实现+验证 100%，归档 3/5（写主 spec 第 3 个） | execute step 6/14，Wave2 三个子代理在飞 |
| 业务代码文件 | 55（后端24/网页19/小程序12） | 26（后端数据层13/网页骨架6/小程序骨架7，无 ServiceImpl/Controller/页面组件） |
| 流程工件 | 11（proposal+5 delta+design+tasks+3 主spec） | 30（含 15 TaskCard、2 阶段审查、module/symbol-impact） |
| E2E 证据 | verify-rp.py 场景 A/B/W/E/N + chainN，55/55 断言，含权限负例；clearHandler 缺陷修复重验；[COVTEST] 清理回查 | 无（verify 阶段未到） |
| token 总量 | 929K in / 303K out | 1.84M in / 572K out（≈2×，未完成） |
| git 提交 | 12 次，三仓全提交 | 5 次（task-01/05/10+修订） |

## 二、复跑后进入写码的时点（本轮最硬的一个数）

- **A：恢复后 7 分钟**（01:37:42 恢复 → 01:44:46 首个后端代码 Write）。design/tasks 薄写即开码，且 01:56 起边写边 mvn 编译（增量验证），三端代码交錯推进（后端 01:44–02:21、网页 02:05–02:51、小程序 02:26–02:50），02:55 部署，03:06–03:26 E2E+修复，03:26 归档。
- **B：恢复后 70 分钟**（01:37:25 恢复 → 02:47 Wave1 首个代码 Write）。分解：重定向+重派调研 3′ / 设计+brainstorm 收尾(含 Grill) 19′ / plan 阶段(plan.md+15 TaskCard+plan 独立审查+--done 摩擦) 31′ / execute 前 4 步+环境准备(node_modules 拷贝、mvn 离线编译、DB 权限绕行) 17′。
- 63 分钟差 ≈ 有效赛段 56%，直接决定完成度差距。

## 三、问题清单（喂 R5）

- **P1【新发现，R5 第 1 批未覆盖】前置关键路径过长**：状态机把写码硬门在 brainstorm 8 步 → plan 4 步+15 卡+独立审查 → execute 前 4 步的完整链条之后；任务输入（991 行需求书）已自含全部设计决策，流程不提供"输入已含决策 → 折叠管道"的通路（薄跑判定只存在于 brainstorm 第 3 步，未级联到后续阶段）。B-③ 并批优化 plan 的 token 结构，**不缩短这条墙钟关键路径**。R5 硬门"墙钟不劣化 ≤156min"隐含 B 拿满 156min；本轮实测 112min 赛段内 62% 花在前置——若赛段就是 112min，任何 token 优化都救不了完成度。
- **P2 交接冷启动重复推导（B-④ 材料包的新实证）**：task-03 子代理找 UrgentPlanApprove 样例、task-06 子代理查 request.js 的 queryEntity/search 签名——两者均已在 B 自己的三份调研报告里。每个实现子代理重建 100K+ 上下文（R4 已测轮均 148K）。
- **P3 轮次碎片**：B 23 轮（19 轮为后台通知轮）vs A 4 轮；B 派发即让位，每轮边界全量重发上下文。导出级 token 无法精确归因（见六），R4 db.model_usage（cache_creation/cache_read）是唯一可靠口径。
- **P4【新 bug】`--done` 刷新 TaskCard base_commit 致锚点漂移**：Wave1 收尾时 CLI 把 task-05 卡 base_commit 刷成当前 HEAD(bedaba59)，与手写 head 漂移，主代理花一整轮手修 review.json（03:16–03:18）。
- **P5 backfill-reviews 摩擦**：3 次调用才对齐（03:02–03:19）。
- **P6 execute 前 4 步串行占关键路径 17min**：环境准备（依赖/doctor/编译基线）可与 brainstorm/plan 并行或后移，无需阻塞写码。
- **P7 验证终端化（与 P1 同源的管道形状问题）**：执行验证（跑起来测）排在 14 步 execute 之末；本轮永远没跑到。对照组从写码后 12 分钟即开始增量编译、部署后 10 分钟开始 E2E——最便宜最强的证据最先获得；B 的预算耗在审查类弱证据上（Grill/plan review/task review 前置排满）。注：task-05 审查确实抓到真缺陷（RP_STATUS LABEL 与字典口径不符，D-016@v2），审查非纯装饰，但单位 token 的证据强度远低于 E2E。

- **P8【新量化】CLI 指令注入体积**：73 次 sillyspec 调用共注入 252KB ≈ 7.2 万 token 的指令/状态文本（单次最大 `run plan` 步骤指引 24KB）。这些文本进入上下文后随每轮重发，是「轮数 × 上下文」乘数的基数贡献者。指令文本中含**假规则**：「本步骤必须等待用户输入，不能直接 --done」——CLI 实际接受 `--answer` 放行（01:44:22 agent 自己记了 thinking 确认"CLI 接受了 --answer 所以放行了"）。说了不算的规则是纯噪音，还训练 agent 忽略指令文本。
- **P9【新实证】机械校验假阳性逼出工具源码考古**：plan `--done` 三连（02:27:51/02:27:55/02:29:57）才过。卡点①allowed_paths 校验「task-13 的 src/ehsRpPackage/pages/query/index.less 文件和父目录都不存在」——该文件是 execute 阶段才创建的新文件，plan 时必然不存在；卡点②构建命令校验按本仓 package.json 查（grep 线索 "命令不存在/resolvePkg"），而实验口径小程序构建走拷回主仓 E:\spdemo，命令不在本仓。agent 被迫 5 次 grep/sed 读 sillyspec 安装源码（config-schema.js/stage 相关）弄清校验逻辑 + 2 次 Edit 改卡满足校验。**验证拦的全是合法计划，漏掉零个真缺陷**，另耗 2.5min 墙钟。
- **P10 验证形态结论（含一处更正）**：更正——gate 并非"4 次全过"：02:07:44 `gate plan` 真拦 1 次（module-impact.md 缺失），agent 补写文件后 02:08:47 过。该拦截性质：**零产品缺陷，逼产一份文件**——验证对象是"文件存在性"而非"产品正确性"。成立的是 P8（说话太多）+ P9（验错对象）+ P7（强验证后置）。修阈值救不出时间，要修的是验证系统的**形状**：指令分层瘦身（首见全量/复现增量）、新文件/跨仓命令的存在性校验放行通道、执行验证前移。
- **P11【验尸】两道前置审查 0 真缺陷**：Design Grill（251s/10 读，pass/pass 无阻断）验的是"design 与需求逐边对照+文件锚点存在"——转写保真；plan review（129s/5 调用，pass/pass 10/10）验的是"Wave 段格式/checkbox 格式/文件清单对账/decisions 引用"——纯文件一致性。两道均异步派发、速度尚可（非最大出血点），但抓缺陷密度为零。本轮唯一被审查抓到的真缺陷（task-05 LABEL 口径，D-016@v2）来自 execute 阶段的 task review——而那个 review 实际是**主代理手工做的 diff 核对**（02:59:42 thinking：router.js diff ✓/枚举 ✓/namespace grep ✓，核对质量本身不差）。
- **P12【机制缺口】跨仓任务 `review write` 不支持**：CLI 对跨仓任务只落 `cannot_verify` 草稿，主代理被迫手写 review.json（schema/base/head/changedFiles/verdict 全套）+ `backfill-reviews --adopt` 收养（03:03–03:08）。审查仪式存在，自动化不支持实际仓库拓扑，人肉补仪式。
- **P13 plan 47min 的真实构成（修正"审查占大头"的直觉）**：TaskCard 填充派了 **3 个子代理批**（batch A 后端/B 网页端/C 小程序，02:08–02:27 ≈ 19min，15 张卡）为最大单项；其次 `--done` 机械校验假阳性 ≈ 2.5min（P9）、module-impact 补写 ≈ 2min（P10）、步骤指令阅读与步进往返。两道审查因异步反而不是大头。**结论：plan 阶段的出血是"工件生产 + 工件校验"这一对，验证逼着生产文件，生产了文件又要校验——统一后置不砍工件要求，只是把同一笔账挪到 verify 阶段记。**

## 四、R4 修复的生效证据（本轮无门禁流血）

- gate brainstorm 首过（01:59）、gate plan 两次内过、execute --done 一次过（03:17:19）；纯超时降档/归属鉴定等未成为阻塞项（对照 R4 的 227 门禁/34% 假拦时代）。
- Wave 并发帽 ≤3 被遵守（Wave1 = 3 个在飞代理：batch(task-01/02)+task-05+task-10）。
- 范围化 lint 生效（Node14 对 6 个变更文件跑 eslint）。
- **结论：R4 战线修复了门禁流血后，差距主体转移到管道形状本身（P1/P6/P7）+ 交接结构（P2/P3）**——这是 R5 第 1 批（B-③/④/⑥、C-1）之外的新归因。

## 五、公平性备注（防过度解读）

- daemon 同时截断两边：A 的领先真实，但幅度被截断放大——B 若拿满 156min 稳态预算，按 Wave1 实测节奏（21min/波）大概率可完成 Wave2/3，但 token 差与前置占比不会变。
- 模型混杂：A 主力 run 在 glm-5.3-flashx，B 在 glm-5.3/5.1；B 同期吞吐更高（1.84M vs 929K），速度非瓶颈，仅记录在案。
- B 侧亮点留痕：发现 pollute_rp_* 前缀被他组占用后改用 ehs_rp_* 避让；SQL 经审查后以 root 通路入 dev 库并回验；task-05 审查抓到 LABEL 口径真缺陷。
- A 组 E2E 清理时发现 forTest 于 09-20 批量插 sys_user_role 的跨组痕迹（B 组或预置），共享 dev 库的实验污染源之一，R5 复跑需注意。

## 六、方法论边界

- 导出 runs 的 token 字段为 SDK 会话级累计快照的分段差值，**含并发后台子代理消耗**（B 组 21 条 USAGE_NOTE、A 组 3 条证实）。"短 run 烧 484K"一类说法不可靠——本轮归因一律用墙钟时间戳、文件产出、CLI 调用序列三类硬证据；token 分解留给 R5 的 db.model_usage 口径。
- 2026-09-21 首轮快评中"brainstorm --done 六次失败"系误读：六次均为八步状态机正常步进（日志确认每次 advanced）。"484K 重定向税"已撤回，原因如上。

## 七、归因结论（核心本质）

**对照组把 ≈100% 有效预算花在任务固有的工作（写码+运行验证）上；sillyspec 把 62% 墙钟花在"把输入已含的决策重新表述为治理工件"+ 交接与重发上。完整流程的定价假设是"多主体接力、执行者不可信、需审查治理"；本任务的真实世界是"单会话、git 兜底、可执行验证"。固定治理成本 >> 任务固有成本时，流程输给裸跑——且输在墙钟关键路径（P1），不在 R5 第 1 批正在优化的 token 结构。**

## 八、方向判断（2026-09-21，回应"是不是方向错了"）

三根支柱的体检结果：
- **支柱①「agent 需要外部化状态才能保持连贯」——对单会话场景已失效**。A 组以一个连续上下文完成三仓 55 文件连贯交付（探索报告→薄设计→代码→E2E），零外部化状态。外部化只在多会话/多 agent 接力时必要——那是少数场景，不该决定默认定价。
- **支柱②「正确性靠审查前置保证」——排序反了**。本轮账本：文件一致性类验证（Grill/plan review/gate/机械校验）合计 0 真缺陷；执行类验证（增量编译+E2E+真 diff 核对）全部有产出。执行验证更便宜、更强、还能增量覆盖（截断下 graceful）。
- **支柱③「治理与可追溯」——价值真实但品类错位**。它是审计品不是工程必需品：客户要审计时是价值，客户要功能时是税。把审计品当所有大变更的默认配置，是定价错误不是产品错误。

额外两条硬伤证据：
- **工具不透明反向收费**：agent 两次读 sillyspec 安装源码考古（02:05 读 taskcard.js/plan.js 弄懂卡片机制、02:28 读 plan-postcheck.js/cmd-existence.js 弄懂校验规则）——工具自身的复杂度变成了任务的 meta 开销，A 组零此项。
- **空间浪费实锤**：实验 harness 已提供隔离 worktree，sillyspec 仍按多仓隔离默认再建嵌套 worktree 并 robocopy 全量 node_modules（GB 级）；同一任务叠了 4 层隔离（git 分支 + harness worktree + sillyspec worktree + [COVTEST] 纪律）。
- **可恢复性卖点未兑现**：daemon 同杀两边，A 靠持续小步提交（12 次）恢复成本≈0，B 的状态机恢复点（step 6/14）并未带来优势——**可恢复性来自小步提交纪律，不来自重流程**。

修正方向（不推翻骨架，推翻默认）：
1. **翻转默认**：从「全仪式默认 + 薄跑逃生舱」→「裸跑默认 + 风险触发的增量仪式」。选道判据从"变更多大"改为"输入里缺多少决策 × 爆炸半径 × 执行验证是否可得"。
2. **门卫→书记员**：常态只记录已发生的事（提交、决策、验证结果，零门禁成本），强制拦截收缩到防呆类（错键/静默失败，R4 实证 12 真拦的那类）。227 次门禁 5% 命中率的成本结构不可持续。
3. **执行验证前移织入**（P7 对策）：Wave 完成判据 = 编译过 + 冒烟过；verify 只留全量终审。
4. **隔离按需**：探测到目标已有 worktree/隔离分支则跳过自建；deps 用 junction/硬链接免拷贝；archive 后清 .runtime。

## 九、代码级核实与可行方案（2026-09-21 源码审计，回应"给出真实证据可行的"）

### 核实结论（会话证据 × 源码定位双确认）

- **N1 定价引擎没有"输入清晰度"轴**：`src/ceremony-tier.js:54-63` 三轴 = blast（危险面）/ span（`SPAN_FILES_THRESHOLD=8` 文件、`SPAN_MODULES_THRESHOLD=3` 模块）/ friction（摩擦史）。EHS 50+ 文件 → span 必然 S2 → 双独立审查。引擎只能加仪式，不能减。
- **N2 档位不折叠管道**：ceremony_tier 只控审查档（`src/stages/brainstorm.js:392-395`：S0/S1=self 清单核验，S2/S3=independent）；plan_level 只控模板厚度（`src/stages/plan.js:142-224`）。**步进机（brainstorm 8 步 + plan 4 步 + execute 14 步，会话实证 step 5/14、6/14）与 TaskCard 全量要求不受任何档位影响**——P1 的代码级根源。
- **N3 降价配置已存在但没人配**：`src/ceremony-config.js:26` readCeremonyPricingConfig 已支持 local.yaml `ceremony:` 段（default_tier / span 两阈值 / friction 阈值）。本实验未配置，吃保守默认（default S2）。
- **N4 P9 假阳性精确定位**：`src/stages/plan-postcheck.js:1341-1348` 存在性检查循环①不认 `NEW:` 前缀（parseAllowedPaths:70-98 不剥 NEW:，`taskcard.js:129` 却把 NEW: 定为合法格式——两个模块口径分裂）②用单一 projectRoot 检查所有路径，跨仓 task（spdemo）路径在 main 根下 100% 不存在 → 跨仓新建文件必假阳性。
- **N5 P4 base_commit 漂移精确定位**：`src/stages/execute.js:715-760` writeCommitAnchorToTaskCard 是"有则替换"语义；Wave 派发循环（:1125-1144）每次渲染都重跑 base 锡点写入。worktree 模式已知此坑用了 baseCommitHint 快照（:1126-1129 注释），**legacy 直写模式（register-repo 仓）用实时 HEAD 覆写既有锚点**——Wave --done 重渲染时锚点必漂移。
- **N6 worktree 无按需通道**：`src/local-register.js` 无 --no-worktree 选项；`src/worktree.js` 无 linked-worktree/非默认分支探测 → 已隔离环境再叠嵌套 worktree + robocopy 全量 node_modules。
- **N7 指令全量重印**：每次 `run <stage>` 全量重印步骤指引（会话实测单次 24KB、共 252KB），无指纹/增量/落盘引用机制。

### 可行方案（按 ROI 三批，红线兼容性逐条标注）

**第 1 批 · 修 bug（合计 <1 天，零语义风险）**
| # | 改动 | 落点 | 本轮实证收益 |
|---|---|---|---|
| F1 | base_commit 先写先得（卡内已有则跳过） | execute.js writeBaseCommitToTaskCard 调用处 +3 行 | 消灭 Wave 收尾锚点漂移与手工修 review.json 一轮 |
| F2 | 存在性检查认 NEW:（剥前缀 + isNew 跳过）+ 跨仓路径按 repo 键解析根 | plan-postcheck.js:1341 循环 ~10 行 | 消灭跨仓新建文件必假阳性 + 5 次工具源码考古 + 2 次改卡 |
| F3 | 校验失败文案附逃生通道（"新建文件加 NEW: 前缀"） | 各 postcheck 报错模板 | 消灭"读 sillyspec 源码弄懂校验"的 meta 开销 |

**第 2 批 · 接线与默认（中工作量，不动四道防线判定语义/状态机/schema）**
- F4 local.yaml ceremony 默认下发（init/local detect 写合理默认或 gate 时提示）——零新机制，ceremony-config.js 已支持。本轮若有 `span_files_threshold: 100`，Grill/plan review 降 self 档，省两轮独立审查。
- F5 薄跑结论级联：brainstorm 第 3 步薄跑判定（P0-3 已存在）结论落 change 元数据 → plan 模板自动选 light、TaskCard 仅对需派发任务生成。模板级改动。
- F6 执行验证前移：execute Wave --done 预检接入模块级快测（复用 quick --done 已有的实测机制 quick-gate-profile.js 同款）——Wave 完成 = 编译/冒烟过。属"排位"不属"判定语义"。
- F7 指令增量：run 渲染层加步骤指引指纹，同步骤重入只印头部 + 全文落盘路径。机械改动，省 100KB+/会话注入与重发基数。

**第 3 批 · 结构（需拍板）**
- F8 步进机分档折叠（轻档 brainstorm 3 步 / execute 6 步）——P1 主杠杆，唯一动管道形状的项。
- F9 worktree 按需：register-repo 加 --no-worktree 或自动探测已隔离（linked worktree / 非默认分支）跳过嵌套；deps 拷贝改 junction。

- **P15【核对】plan 阶段（31min）的下游消费账——大部分无增量价值，两条真实例外**：产物逐件追踪：①plan.md 119 行，独有决策仅 **spike-01**（AtSwipeAction 可行性前置验证，且排在 Wave2 前置、本轮未执行未兑现）；Wave 分组可由依赖机械推导；"接口契约已在 design.md 冻结"是 plan.md 自己的原文——并行化决策的真正出处是 design 不是 plan。②15 张 TaskCard：执行期子代理读卡 19 次（真实消费），但卡片正文大量是指向 design 的复述（task-01 卡 implementation 逐条写"对照 design.md「数据模型」"）；**真实增值字段 = allowed_paths/target_files（写入守卫+审查切片）与 acceptance 行**——后者本轮唯一兑现：task-05 审查用卡内 acceptance（"状态 00~99 共 11 项"）抓到 LABEL 真缺陷。③plan review 10/10 全 pass 零缺陷（P11）；④module-impact gate 逼产后零下游引用；⑤plan-postcheck 三连假阳性 2.5min（P9）。成本侧：卡片生产 19min（占 plan 阶段 61%，3 个子代理批）+ plan.md 9min + 审查/摩擦 ~5min。**结论：本轮 plan 的可实现价值 ≈ 任务清单 + 每任务 3 行 acceptance（主代理 5 分钟可写完）；31min 中约 26min 是仪式。设计契约已冻结时 plan 是 design 的导出物，不是新决策层——F5 薄跑级联的又一实证。边界：n=1、且仅适用于"design 已冻结契约"的任务形状；design 模糊、需真拆解取舍时 plan 仍有实值。**
- **P14【账务机制】导出 token 不含缓存读——真实差距被低估，且轮数就是缓存寿命**：A 大 run 640K in ÷ ~700 次工具调用 ≈ 915 tokens/次——对明显 50K+ 的上下文不可能，证明导出 input_tokens 只计新鲜/缓存写、不含缓存读。①A 的 2× 劣势只反映新鲜面；名义面（R4 口径 42.3M 量级）B 更惨。②轮数 = 上下文生命的单位：A 复跑后一条上下文活 112 分钟（每几秒一次调用，前缀缓存恒热，只有增量是新鲜钱）；B 的同一份"已知"在 23 条主上下文生命 + ~19 条子代理冷上下文里反复重付（跨轮等待 2-9 分钟大概率烤穿缓存 TTL → 下轮整段重付缓存写；子代理首轮冷启动全额缓存写 ×1.25 价；R4 实证 task-08 名义 8.6M 中新鲜仅 186K＝2%）。③根子在 sillyspec 自己的派发话术：brainstorm.js:407 起"run_in_background: true 派发后立即进入下一步/结束回合等通知"——该模式省墙钟的设计同时把主上下文拆成 23 段。**修法：派发后 in-turn 阻塞回收（TaskOutput 式）保持缓存热 + 直写模式减少子代理冷上下文 + C-1 返回契约压主上下文增速（延迟 compaction，compaction=整段缓存重写）。**



代码审计后修正：**"翻转默认"不需要新架构——定价引擎、档位体系、配置轴、薄跑判定、quick 流程、NEW: 通道、advisory 降档机制全部已建成**。缺的只有三样：①定价函数少"输入决策覆盖度"这根轴（N1）②步进机与工件要求不随档位折叠（N2）③四个具体 bug（N4/N5/N6/N7）。第 1+2 批合计约 3-5 天工作量，全部红线兼容；第 3 批才触及管道形状。验证方式：重放本轮卡点（base 刷新 / NEW 假阳性 / 24KB 注入应全部消失）+ R5 重跑对撞看 62% 前置占比变化。

## 十、第三数据点：sess_4fd1ee09（ZCode·sillyspec·scan-docs 运营面板，2026-09-21）——同流程小任务对照

任务形状：5 任务 4 波次 2 仓（vs EHS 15 任务 3 仓）。模型 GLM-5.3（rollout 确认，与对撞 B 主力同款；全程 token 不可得——rollout 仅滚动保留末 15 条且 usage 空）。

| 维度 | A·openspec(EHS) | B·sillyspec(EHS) | C·sillyspec(scan-docs) |
|---|---|---|---|
| 写码前路径 | 7′ | **70′** | **≈21′ 活跃**（design 01:28→卡填完 02:03，中间 14′ 用户/空窗） |
| TaskCard | 无 | 15 卡·**3 子代理批 19′**（>8 阈值触发） | 5 卡·**主代理直填 4′**（≤8 阈值直填规则） |
| 阶段审查捕获 | — | 0 真缺陷 | **3+ 真缺陷**（Grill：DTO 重名→9 类重定前缀+404→422 笔误；plan 审查：DTO 计数 8→9） |
| 执行验证 | E2E 55/55 | 未到达 | pytest 193 + vitest 20 + **mypy 抓 3 类型错** + CLI 埋点 3/3，verify 7/7 过 |
| 机械假阳性 | 无观察 | plan-postcheck ×3（P9） | **verify 侧新家族（P16）**：接口矩阵锚点格式反复、worktree 快照三缺陷（cwd 假阳性误回退/叠加未提交 quick 破快照/跨仓 node:test 噪音 58 行误计→5 轮豁免收窄）、task-04 head 锚点草稿值手修、Stage Review Gate 缺 execute review.json 逼补审查 |
| 终局 | 完成+归档 3/5 | step 6/14 | **全流程完成**（archive 待用户）+ 部署上线 |

三条新结论（C1/C2/C3 + P16）：

- **C1 卡片 >8 阈值是 B/C plan 成本差的主开关**（19′ vs 4′）——同一 CLI，仅因任务数跨阈值就走完全不同的生产路径。修法升级：直填设为默认，>8 时也优先主代理分批 Edit，子代理批仅显式请求。
- **C2 审查捕获率与"决策密度"正相关，与工件大小无关**——C 的 design 有真决策面（9 个 DTO 命名冲突、路由序、404/422），独立审查立刻有产出；B 的 design 是 991 行冻结需求的转写，同样的审查通道零产出。N1"输入清晰度轴"再获实证：定价应对决策密度计价，而非文件数。
- **P16【新】verify 侧机械假阳性族（P9 同族）**：锚点格式/快照 cwd 假阳性/叠加未提交 quick 破快照/跨仓测试噪音误计——全部"验文件不验产品"；C 在 verify 前段被阻 ~35+ 分钟（含 5 轮豁免收窄）。修法并入 F2/F3 家族：校验失败文案自解释 + 噪音归属鉴定（同 R4 lint 归属鉴定思路）+ 快照排除未提交 quick 叠加。
- 附带发现：C 收尾卫生问题——quick 变更与本变更叠加同 5 文件未提交、archive 未跑，多会话共享仓叠加态是真实风险（对齐 AGENTS.md 规则 14 隔离纪律）。

C 证明：任务形状适中（真实决策面 + ≤8 卡）时，sillyspec 全流程可在 ~2.5h 内走完且审查/类型检查皆有真捕获——流程不是坏的，是定价与任务形状错配（同 P1/F5 结论）。

## 十一、GSD 源码对照与修正方案（2026-09-21，源码浅克隆于 round5/_gsd，gsd-build/get-shit-done）

**纠错**：初判"GSD 串行 inline 是一等公民"不实——`execute-phase.md:11-18`：Claude Code 上 GSD 永远 spawn 子代理（串行=逐个 spawn 阻塞等待）；inline 仅是 Copilot（完成信号不可靠）/无 Agent 工具运行时的兜底。**GSD 没有主会话直跑模式——direct 模式是 A 组数据的结论，不是 GSD 的，方案中须显式标注此分歧。**

GSD 真正的承重墙一句：**编排者必须瘦（~10-15% 上下文）**（`execute-phase.md:514` "Pass paths only — keeps orchestrator context lean"）。全部机制服务此条：执行者新鲜上下文自读文件、PLAN 按"装得进执行者 ~50% 上下文"定大小（每 PLAN 2-3 任务）、状态放文件不放会话、派发阻塞不裂上下文。对照 B 组 = 最差象限：胖编排者（252KB 注入+全文报告）× task 粒度派发 × fire-and-forget。另一条被看轻的事实：**GSD 有阶段无步进状态机**（plan-phase = 一条命令派 researcher+planner+checker，分钟级；B 的 19′+31′ 是"阶段工作在主上下文做+步进门禁"的代价，非"有阶段"的代价）。

sillyspec 相对 GSD 抄丢/走样的五处（均对应本文 P 编号）：①阻塞回收（P14，GSD 对 Codex 显式禁 fire-and-forget："stop working... prevents wasted context"）；②PLAN 粒度 2-3 任务 vs task 粒度（交接次数减半以上）；③文件重叠运行时检查（spawn 前 files_modified 逐对比对→强制串行）④"plans are prompts, not documents"（action 写死具体值+verify 命令+grep 可验验收 vs 9 字段治理卡）；⑤状态单写者（executor 禁改 STATE，orchestrator 波后统一写——锚点漂移类 bug 在此架构下不存在）。可抄小件：safe_resume_gate（半完成态检测）、`[checkpoint]` 心跳行、上下文窗口自适应材料（<200K 只给路径）。

**修正方案（四柱，优先级重排过）**：①瘦编排者为前提（F7 指纹增量提进第 1 批；run 输出改指针；派发只传路径=B-④ GSD 同款）；②派发机制对齐 GSD（PLAN 粒度阻塞派发+重叠检查+状态单写者）；③direct 模式（A 组实证分歧项，plan frontmatter 开关，quick 执行模型上移）；④阶段机器软化（ceremony-tier 加决策密度轴 N1/C2 后，S0/S1 档步进门禁降 advisory——替代"3+2+3 折叠"，改动小一档）。预期：EHS 型写码前 70′→20-25′、token 2×→1.3-1.5×（叠 direct 1.1-1.3×）。

**已落地（本节写作同日，ql-20260921-005-eb19）**：第 0 批三修复——F1 锚点先写先得（execute.js keepExisting）、F2 存在性检查 NEW:/跨仓放行（plan-postcheck.js）、F3 文案逃生通道，新增 20 断言、全量 565/565+lint 过。R5 重跑验证判据：锚点漂移/假阳性三连/读源码考古三类卡点应消失。
