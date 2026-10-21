# 决策知识 — cli-entry

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-cli-entry-002@v1 : 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
状态：implemented
变更：2026-09-07-ir-stage-p3c
原编号：D-003@v1
锚点：未记录
最近确认：6c3509b
理由：方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。

## D-cli-entry-003@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-001@v1
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-cli-entry-004@v1 : 方案A——独立 CLI + archive 步骤自动生成双入口
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-002@v1
锚点：未记录
最近确认：f4db7c9
理由：预授权抉择：sillyspec delta --change <名> 独立命令（幂等可复跑）+ archive「确认归档」步自动调用（产物随归档目录保存）。四源聚合：reconcile-result.json（最新 verify-runs 取）+ verify-facts.json + module-map 归属推导 + decisions.md 条目（distill 口径当前版本）。md 输出（Before=变更前模块状态摘要/Delta=文件×模块×差集/After=建议动作）。

## D-cli-entry-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
原编号：D-001@v1
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。

## D-cli-entry-005@v1 : 架构 = 纯函数单一真相 + 独立命令随时查 + 阶段点薄注入
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-003@v1
锚点：未记录
最近确认：3f22d6b
理由：用户提议「独立一个参数或者命令去展示，可以随时查看」。三层：computeChangeScopeAudit 纯函数（单一真相）；sillyspec scope-audit 命令（人类可读 + --json）；execute --done / verify --done / archive --confirm 三处薄注入调同一函数。对齐 verify-probes / module-impact 已验证的「纯函数 + 命令 + 阶段集成」三层模式。

## D-cli-entry-007@v1 scope-audit 命令增强为门禁画像独立出口（表格 + --json，可重放）
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-008@v1
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14 指定（设计确认轮顺带需求）：现有 `sillyspec scope-audit --change <变更名或quick会话id>` 增强为画像出口——表格与 `--json` 两条出口均含 gate 画像（文件数/模块跨度/模块清单/风险命中/门禁级别）与 L1/L2 advisory 发现；利用该命令既有的 quick 会话（quick-<8hex>）与归档变更重放能力，历史会话可回溯审计。与 D-006 校准任务打通：`--json` 批量重放 sillyhub 历史会话即真实图谱交叉表。维持命令 advisory 只读定位，不设门禁。

## D-cli-entry-008@v1 入口形态=`sillyspec scan refresh` 子命令（CLI 算差异+门控+出工单，agent 手术编辑，--done 盖章）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-002@v1
锚点：未记录
最近确认：318e80c
理由：独立子命令 `sillyspec scan refresh`（与 `scan diff` 同族旁路，不动 scan 主流程 11 步注册表）。两拍交互：①refresh（只读）= 算受影响文档集 + 门控 + 渲染手术工单（每文档：过时引用清单 + 相关 diff hunks + commit messages + 编辑纪律）；agent 按工单定点编辑文档正文。②`scan refresh --done` = stamp bump 盖章（只推进本次核对过的文档的 source_commit/updated_at，generator 标 scan-refresh）+ 跑 postcheck + 记录刷新审计。依据：D-7 落地记录明确刷新形态为「agent 按清单定点补」；仓库哲学 CLI 预咀嚼事实、agent 从发现降级为解读；scan diff 已是该模式的只读半边。用户在 2026-09-14 对话轮对「落地形态」建议回复「干」= 预授权。

## D-change-management-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-002@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-cli-entry-006@v1 change 所有权+心跳——owner_session 列 + 活跃会话拒绝 + --takeover
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-001@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏①：changes 表加 owner_session 列（v6 迁移，四处版本号同步 bump——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version）；run/<stage> 与 quick 启动时写 owner（会话标识=sessionId 或 pid@host，首次创建者获得，已有值不覆盖）；每次 CLI 写操作已刷新 last_active（现成心跳）；apply/cleanup/archive/归档内置 apply 前查所有权——owner 非本会话且 last_active 在活跃窗（15 分钟，可配）内 → 拒绝并列出 owner/最后活跃，--takeover 显式接管（重写 owner+留痕）；owner 停活跃（窗口外）→ 放行并提示接管完成。

## D-cli-entry-009@v1 方案选择 = A（burst 交互折叠）
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-011@v1
锚点：未记录
最近确认：9f9450d0
理由：用户选 A（任务书冻结版）：渲染侧剩余步逐个调既有 outputStep + completeStepBurst 循环调 completeStep(printNext:false)，completeStep 本体零 diff；缺省 OFF 本仓自举。用户同时授权全程免询问（后续 requiresWait 决策点按任务书冻结口径自决并如实记录）。
故障面：无（方案选择记录）。
退役判据：无。

## D-cli-entry-011@v2 flow 翻转测试面完整枚举 + config-schema 文案
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-010@v2
锚点：未记录
最近确认：9f9450d0
理由：不完整（Grill P1-2）：调用 flow start/done 且依赖缺省 thin 的测试共三个文件——test/flow-protocol.test.mjs（makeRepo 缺省造法，受影响 ①②③⑤⑥ 五测，任务书原估 ①②③⑥ 漏 ⑤）、test/flow-route.test.mjs（:68 断言 flow start exit 0）、test/flow-draft.test.mjs（⑥ 真 CLI harness）。test/fr-index.test.mjs 核实不受影响（纯单测直调 indexRequirements，不经 flow start/done——本会话亲自核实）。另补 src/config-schema.js:170 flow.mode desc「thin（缺省）」→「legacy（缺省）」文案同步与 src/flow.js:18/:62/:124 三处文案。v1 核心面（缺省翻 legacy、断言本体不动）不变。
supersedes：D-010@v1
故障面：同 v1（未配置用户走厚档=intentional）。
退役判据：薄道转正时再翻回。

## D-cli-entry-010@v1 收口范围=方案B（读面闭环+遍历召回接线）
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-001@v1
锚点：未记录
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：用户选方案B：读面闭环（本体表 + knowledge-graph.js 派生图 + knowledge graph 子命令 + doctor 图完整性检查）+ matchKnowledgeHybrid 新增 scope 遍历召回层与防复潮保底；平台侧 graph-search 端点与 stats 图维度指标不在本变更范围

## D-unmapped-150@v1 枚举开放世界是错误方向（任务面归还 agent）
状态：implemented
变更：2026-09-26-thin-agent-tasks
原编号：D-001@v1
锚点：未记录
最近确认：replay2
理由：决策记录（本会话第三次同款错误，升格为显式教训防再犯）：用枚举/关键词表穷举开放世界是错误方向——①R17 评审否决「完整标点收尾自检」（标点形态枚举不全）；②复合拆分劈碎「；」分隔的枚举词表（狗粮实证）；③本变更回退 WORK_UNIT_BUCKETS 域分类表（用户指出：任务单元形态不可穷举）。正确模式：开放世界的分类/计划归 agent（人有上下文），机器只锚定可枚举的封闭面（验收标准文本、字段格式契约）。风险=假勾退化（自写自勾可写巨型任务骗进度）——接受：哨兵证据重心本在提交面+测试门（任务面降级为进度信号）；追溯锚在 requirements FR 区不依赖任务面。死路：枚举更多桶/更多关键词——穷举错误不因规模变小而变对，弃。

## D-unmapped-152@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-slot4-distill-fix
原编号：D-001@v1
锚点：未记录
最近确认：5d81f5526cee5f3d2da8a9ffd7443e5273cd34a5
理由：最大风险=补录样本的域路由落 unmapped（治理类变更无模块域）——接受：unmapped 域已有 INDEX 路由行兜底，教训按关键词可命中（三组关键词实测命中）；后续若 unmapped 治理可迁移。死路：回溯批量补录全部历史断链条目——归档件是冻结审计面不回写，历史教训按需逐条重放（幂等），弃。

## D-unmapped-157@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-thin-check-cadence
原编号：D-001@v1
锚点：未记录
最近确认：d18d7c784b06ea4844483bdc6d8b8bec9ca0516e
理由：最大风险=误报施压：两个任务真同时完成（一次提交带两个 task token）后一拍勾两格会被提示——接受（advisory 不阻断，且同拍双完成本就应分两次勾，提示方向正确）。放弃的方案：①收口硬门拒收一把全勾——节奏是习惯非造假主张，硬门会把合法快速变更拦死，与「任务勾选缺失」同为 advisory 的既有裁决一致；②加「贴近收口时刻」时间窗过滤——引入窗口参数且窗口内外行为不一致，简化为「任意单拍 ≥2 格」单一判据；③顺手改 watcher per-change 锁修观测盲区——超出本变更范围（本变更只解决「有观测时的行为矫正」，盲区另立变更）。

## D-unmapped-158@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-tick-loop-nudge
原编号：D-001@v1
锚点：未记录
最近确认：195b55fe72328025bfe6636a5bd7bdba7da5e9b3
理由：最大风险=提醒噪音化（agent 频繁 status 每次都刷同一行）——限定②阶段+滞后+有提交三条件，①阶段/勾齐后静默；R20 重跑可观测行为是否迁移。死路：把一把勾改成阻断（哨兵拒收）——token 证据已验全勾为真（R19 实证勾选滞后≠假勾），阻断只制造 amend 循环（R18 同款摩擦），弃；死路：CLI 侧自动勾（据 wt-commit 事件反推）——自动勾消解 agent 的 ownership（OS 实证自拆清单边勾是自然行为），且反推映射脆，弃。

## D-unmapped-159@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-watcher-timeline
原编号：D-001@v1
锚点：未记录
最近确认：bc7b8a77942378298c34d2199e2624a47a9afd95
理由：最大风险=推断面的诚实性：勾选时刻是顺序推断（事件不记 id）、描述行继承机器稿 60 字截断、提交锚依赖仓内 hash 可达（合并重定基后失联降级只显 hash）。对策是显式标注：表头「≈」+ 尾注列数据源与盲区（观测起点≠诞生时刻、单飞锁盲窗）——宁可标注粗糙也不冒充精确。放弃的方案：①改 watcher 事件流带 checkedTasks id 明细——改写入面格式是侵入性变更，且历史流已定格无法回填，收益仅推断精度；②从 DB progress 库取阶段时间——thin 变更状态不落 DB（红线），无数据可取；③agent 干活时自述留痕——协议负担，违背 thin 立身之本（那是完整流程 --output 的能力面）。

## D-unmapped-161@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-binding-anchor-fidelity
原编号：D-001@v1
锚点：未记录
最近确认：3d39f6337998662fb497e633079ac4986287460c
理由：- 最大风险＝锚点后缀漏进文件面消费（残差实测会拿不存在路径去跑、watcher 归属匹配失联、rot 覆盖误判 skip）——已 grep 全量枚举 `.tests` 消费点逐一适配，新测试对每个消费点各钉一条回归。 - 次风险＝裸名解析误绑（basename 在仓内多处出现）——仅唯一命中才解析，零命中/多命中原样保留，dangling 校验自然暴露。 - 死路：用例锚做独立字段（cases:）——test-trace schema、FR 机器子块、md 解析三处格式连动且存量数据双形态并存，复杂度不成比例，弃。 - 死路：回写历史归档 test-trace 补锚——归档是冻结审计面不回写；新变更提取即生效，旧数据维持文件级（诚实），弃。

## D-unmapped-162@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-governance-autopilot
原编号：D-001@v1
锚点：未记录
最近确认：aff28f38a27d65a84221c73c68fb15f91ca65865
理由：最大风险=GWT 骨架语义不准（关键词启发式的 Given 可能错域、箭头拆分的 When/Then 可能断错）——骨架标注「可编辑覆盖」，agent 修正错骨架比从零写省力（一次 Edit vs 三次）；索引进 knowledge/fr 的骨架质量依赖 agent 覆盖意愿（不覆盖时入库的是骨架不是精写——比空着不进库好，但不如精写——权衡接受）。死路：完全取消 agent 填写（纯机器 FR 入库）——索引质量退化为机械摘录，知识复利面受损；保留 agent 可覆盖是正确分界。

## D-unmapped-166@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-ui-visual-guidance
原编号：D-001@v1
锚点：未记录
最近确认：4f85905373507953789367b59bb41792eb0e5431
理由：最大风险：关键词启发式误判（非 UI 变更被注入须知/警告——噪音；或 UI 变更漏检——门没响）。对冲：双源检测（input 词表 + 声明文件面扩展名），默认档仅 warn（误判成本一行警告），正反例单测锁定词表。试过放弃：① 收口强制截图对账（用户否决——太麻烦且最后才卡死没意义，改为过程引导+在场性对账）；② CLI 内置浏览器截图（放弃——CLI 保持零浏览器依赖，截图由执行会话浏览器能力承担，CLI 只验痕迹）。

## D-unmapped-168@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-hunk-attribution-gate
原编号：D-001@v1
锚点：未记录
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c
理由：最大风险：竞争检测的假阳/假阴——他变更声明面与提交面相交但实际各行其事（假阳：一行警告可接受）或他会话在途改动根本没立变更/没写清单（假阴：残留信号与既有文件级 advisory 兜底，无法根治——hunk 归属的语义判断终究要人，门的目标是把静默混合变成显式中断）。试过放弃：① 轻量道默认挂会话 worktree（用户否决——合并税过重，仓内 wt-parallel-commit-race 等坑史为证）；② hunk 语义归属（机器无法判定行归属，改为「竞争文件显式暴露+人核」的诚实口径）。

## D-unmapped-170@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-confirm-on-use
原编号：D-001@v1
锚点：未记录
最近确认：8cc2e201f6aac92a375593b47222eea24adf12a3
理由：最大风险：橡皮图章——agent 全点确认。缓解三层：抽查式（注入至多点名 2 条）、证据机械校验（必须盘上真实测试文件，口头相符不收）、confirm 只翻绑定状态不改内容（错翻的代价=绑定行显示 active，门禁消费 candidate/active 无行为差异——宁多跑语义不变，长期准确性靠 digest 坏绑定卡兜）。次风险：upsertFrBindingsRaw 不走 agent 行保护（权威重写）——但行集来自 readFrBindings 全行读（含 agent 行原样回写），只改 confirmed_by/state 两字段，无删除面。放弃方案：FR 条目级 confirmed 状态（新机器字段）——绑定状态机已够用，条目级标题/域问题归 digest 信号与人工裁决，不为此发明第二套状态。

## D-unmapped-171@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-tool-debt-cleanup
原编号：D-001@v1
锚点：未记录
最近确认：9e4572e98afff1120e2670b5b099ac0e800b9306
理由：最大风险：.sillyspec/docs/ 全保留可能把他会话在途的 docs WIP 冻进本变更 patch——对冲：docs 面提交前归属由既有夹带嫌疑 advisory 与 hunk 归属门（昨日变更）覆盖；本变更实测区间内 docs 提交均为本变更模块卡。放弃方案：只保留 modules/ 子目录（更窄）——放弃，scan/CONVENTIONS 等 docs 同为交付物，窄口径会再造下一个漏。

## D-unmapped-175@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-thin-module-scope-persist
原编号：D-001@v1
锚点：未记录
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf
理由：最大风险：平台把 advisory 数据当强承诺——`modules: []` 不等于「无影响」（可能是模块图未登记，未登记面要看 `uncoveredDirs`），展示侧应按「已知影响面」标注而非断言。缓解：键语义已在接口契约固定，`uncoveredDirs` 与 `modules` 并列落盘正是为了让「未登记」显式可见。 试过放弃：① 另立 module-scope.json 单独工件——放弃：change-patch.json 已是平台在读的冻结事实件（files/sha 都在那），多一个文件多一份生命周期与一致性成本；② 把结构化结果渲染进 verify-result.md——放弃：那是人读回执，机器消费面不应与人读面耦合；③ 只加落盘不修旧对账缺陷——放弃：实测旧实现命中恒 0（modules: 包层不进 + 多项目读错图），不修则落盘恒空数组，FR-01 形同虚设——四缺陷修复随本变更交付并各有限定测试锁定。

## D-unmapped-179@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-guidance-principles
原编号：D-001@v1
锚点：未记录
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7
理由：最大风险：brainstorm 语料在 proposal 尚未生成的早期步骤可能只有变更名——变更名含 UI 词（如 apple-style 不含）则漏注入；对冲：方案对比步执行时 proposal 通常已落盘，且 flow start 注入兜底另一入口。放弃方案：①静态红线扫源码（用户指出误伤探测代码、示教 example 与历史注释，改为输出断言）；②local.yaml commands.prototype 配置位（用户指出多前端项目多生态仓不成立，仓自身 modules.*.test 退役史为证——改为就近发现原则文案）。

## D-unmapped-187@v1 知识注入只锚变更入口，设计时点新关键词零检索面——工具引导缺位
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-004@v1
锚点：未记录
最近确认：cb6fc0a0
理由：用户归因（采纳）：不是 agent 个人失误，是工具引导不到位——不然知识库没意义了。结构性缺口三处：① 自动注入只锚「变更入口」——轻量道按 input/FR/changed-files 关键词路由（src/flow.js:137），否决决策注入同源；brainstorm Step2 按 INDEX 路由行＋decisionHits（src/knowledge-match.js:6）；② 设计时点（方案步/设计步/decisions.md 落盘）新产生的机制词（枚举/词表——入口时刻不存在）没有任何强制检索面，knowledge search 在引导协议里零接线；③ AGENTS.md 速查行「命中知识 CLI 会自动注入 prompt，勿自行重复检索」反向劝退主动检索
故障面：--done 门自动检索的误命中（决策条目措辞与库内条目关键词偶然重叠）→ 回显噪音让 agent 习惯性无视所有命中（狼来了效应）——v1 只 warn 不阻断即为此留退路；检索查询串拼装质量差（标题短词）会放大命中噪音
退役判据：若归档遥测显示命中回显绝大多数未被 evidence 回应且未引发实际复潮拦截（信号无行为后果），说明该面无效——退化为纯指引面（去掉机器检索）或直接删除

## D-unmapped-188@v1 执行期裁决——testFailures 数据源从「flow-state substeps」改读 verify-runs 记录面
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-006@v1
锚点：未记录
最近确认：cb6fc0a0
理由：改读 .runtime/verify-runs/<ts>/test-result.json 既有记录面：按目录内 JSON 的 change 字段归属本变更（与归档回收 pruneArchivedChangeRuntime 同源口径），status='failed' 枚举计数——每次失败收口尝试各落一条（writeRunResult 既有落点）。同为既有记录面、同为封闭面计数（D-003 禁区不破），且天然支持多次失败累计；decisions 条目无时间戳，D-007 同理降级

## D-unmapped-189@v1 执行期裁决——--done 门检索查询串含 decisions.md 全部当前条目（非「自上次 --done 新增」）
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-007@v1
锚点：未记录
最近确认：cb6fc0a0
理由：v1 查询串=--output 全文＋decisions.md 当前全部条目的「D-xxx 标题+question」拼串。命中面是超集（旧条目命中也会回显），由三层降噪兜底：① v1 恒 warn 不阻断（D-004 故障面自留退路）② rejected 条目优先展示（防复潮信号最相关）③ commands.knowledge-gate: off 可整体关。若归档遥测显示噪音占主导，按 D-004 退役判据收窄

## D-unmapped-190@v1 方案选择——Ⅱ 事后闭环主（前门弱盘问＋事后强信号）
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-005@v1
锚点：未记录
最近确认：cb6fc0a0
理由：用户选 Ⅱ。要点：需求清晰度是谱值且只能事后证伪——事前任何硬判定都是布尔处置（用户两次推进否决词表与声明硬门）；前门只做盘问重述（自检问题从「需求清晰吗」换成「还有没有必须问用户才能动手的问题」，不阻断不设新节），强信号放事后：归档时封闭面指标（design 重写比/tasks 改写率/盲维命中/返工次数——diff 比例与计数，非词表）判「疑似该走预段未走」落库，下次 flow start 渲染点名提示，形成每仓自我校准回路。FR-03（设计时点知识检索面，D-004）随行收进本变更
故障面：事后指标误标（用户中途合法改需求被记为「疑似该走预段未走」）→ 下次 start 提示成为噪音，agent 学会无视——「疑似」措辞与可无视设计是减压阀但也是衰减路径；指标快照时机错误（如 design 首快照取在收口后）会让重写比恒 0
退役判据：若遥测显示被标记变更的下一变更仍高频复现同形态（提示未改变选道行为），说明闭环无效——考虑退回纯指引或升为硬门（届时重新过方案轮）

## D-unmapped-191@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-inject-ranking
原编号：D-001@v1
锚点：未记录
最近确认：b7699f92412bdcacf115d11395fc72920162195c
理由：风险：① 长查询稀释重叠率（frTitleOverlap 并集含查询全长）——同查询内相对排序仍成立，跨查询不可比（仅用于排序非阈值判定）；② 「死路：」字面标记依赖蒸馏书写惯例——未按此惯例写的教训条目仍不进防复潮面（覆盖率问题，宁缺毋滥）；③ id 数字 bigram 微量串扰（如 2026-09-28 与 D-009@v1 共享 "09"）——分数远低于标题实词重叠，排序不受扰（测试②钉住）。死路=为 implemented 条目引入 rejected 语义提升——若知识库大量误标死路会造成防复潮面噪音，退役判据=回显噪音投诉或命中条目与主题长期无关。

## D-unmapped-203@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-task-heartbeat
原编号：D-001@v1
锚点：未记录
最近确认：ad6c3fe347b2da0650ee45ccf142129590ab8b06
理由：最大风险：心跳仍被 agent 无视（不轮询 status 直接干完）——与 openspec 同款的软约束边界，诚实披露：openspec 的剧本约束同样不强制（其 skill 文本也只是指令）；缓解=三处协议文案钉死+AGENTS.md 常驻面+哨兵硬门兜底真伪。弃案1：把「逐个勾」升为 flow done 时序硬门（勾选时刻与证据时刻配对核验）——误伤合法场景（一提交携带多 task token 是规范动作，时序配对会把正常批量提交判假）；逐 task 证据哨兵已存在故不再加码。弃案2：新增独立 flow next 子命令——与 status 职责重叠，AGENTS.md/恢复简报已统一指 status，多一个入口徒增记忆面。

## D-unmapped-205@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-heartbeat-d007-incontext
原编号：D-001@v1
锚点：未记录
最近确认：02a7dca978ae5ec8cdaf59cd38bb3cdcbc7c73d2
理由：最大风险：文案改口径后 agent 又回到「一把勾」旧行为——防线分层不变：tasks.md 头部+简报两个恰时面钉纪律、哨兵逐 task 硬门、watcher 人判；心跳渲染在自愿调用时仍给指针。弃案：保留 AGENTS.md 纪律行——每会话注入成本恒定发生，且恢复/简报面已覆盖，属非必要（用户裁决：非必要不放 AGENTS.md）。

## D-unmapped-208@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-flow-agent-log-report
原编号：D-001@v1
锚点：未记录
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d
理由：最大风险：平台慢时 push 拖延协议面首屏。缓解：PUSH_TIMEOUT_MS=5s 硬上限 + 无平台配置即跳过 + 失败静默留底（与 run 族同语义，run --status 已付同代价）。放弃的方案：①挂 cmdFlowStart/cmdFlowDone 尾部（对齐 triggerSync 位置）——需改两个大函数、start 尾部有 --json 纯 JSON 输出面会被登记日志污染；②挂 index.js 分发层——change 未解析，auto 生成的 start 名拿不到，change_key 归属会缺。

## D-unmapped-209@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-batch-tick-gate
原编号：D-001@v1
锚点：未记录
最近确认：79ea50cc7bbe0eee041650277633780416e309a0
理由：最大风险：误拒合法场景——三层防护（镜像-only 静默、哨兵面未知降级 advisory、--allow-batch-tick 逃生门留痕）；观测旁路事件格式漂移 → detectBatchCheckCadence 解析失配按无证据静默（既有 fail-open）。弃案：逐 task 证据时刻配对（勾选拍与提交拍顺序核验）——git 提交时序与文件编辑时序不可严格配对（一提交多 token 是规范形态），误伤面大；单拍跳幅是唯一机械可靠的一把勾特征。

## D-unmapped-215@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-fr-inject-relevance-rank
原编号：D-001@v1
锚点：未记录
最近确认：7588907995ff021d4c5193dda1459f5bde3e7b24
理由：最大风险：注入顺序变化改变 agent 看到的规格面，理论上可能让依赖「最老 8 条」心智的既有流程预期漂移——已用既有断言全绿对冲（fr-inject-cap ②④ 零回归，⑤⑥⑦ 新口径实证）。试过放弃的方案：① 给 readActiveFrDigest 加全局排序参数——污染两个非排序消费方（dup 门要全量、rot 要原序统计），放弃；② TierB 按「最近确认」commit 日期排——需批量 git log 查 hash 日期，I/O 重且 hash 可能不在本仓历史（平台仓实测抽样 3/3 查不到），改用来源变更名内嵌日期前缀（零 I/O）。splitGwtSeparator 已知残留：括号外的「则」嵌在词内（如「原则」）仍会切分——既有语义保留（不在本变更验收面），带护栏方案需要分词，成本不成比例。

## D-unmapped-216@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-fr-skeleton-gate
原编号：D-001@v1
锚点：未记录
最近确认：9b2ae73d2220a87e54de071f78fe895a10d2316e
理由：最大风险：误杀——agent 手写的真实需求恰巧以「行为符合本条标准描述」收尾会被判骨架而消失于注入面。对冲：该占位句是 flow-draft 专属字面量（design 槽指引要求 agent 写实质断言）；误杀后果有限（条目仍在索引/绑定/rot 面，TierA 命中时仍注入）；判据要求「全部」场景体命中才标。声明边界：①批次1 之前的切分错位条目（Then=箭头后半截，如平台 FR-components-shared-038 场景行）不满足占位句判据 → 不标不滤（漏放，不误杀——保守侧）；②骨架条目的「摘要：默认场景」行照旧（注入面排除以 skeleton flag 为准，非摘要文本）；③unmapped 停车场同样回填（一致性，反正在比对面之外）。试过放弃：在 flow-draft 起草端直接不生成骨架（消灭源头）——但骨架消灭的是空槽冷启动痛点（R20 实证 agent 手写 +12 轮 Edit），改起草端会回退那个决策；正确位置是消费端按信息量过滤。

## D-unmapped-220@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-voluntary-task-tick
原编号：D-001@v1
锚点：未记录
最近确认：2ba5c0fc4c96985342635795a99e2b4f6bed1936
理由：最大风险：代勾被误读为「机器替 agent 撒谎」（勾了 agent 没勾的格）。边界已钉死：仅镜像未认领面（与机器稿逐字相同=agent 从未认领该任务面）且有交付证据才代勾，时间线/输出显式标注「收口代勾」来源；agent 已覆写任务面（认领过）绝不代勾——那是真漏账，走 advisory。次风险：存量在途变更（本变更之前 start 的）flow-state 无 mirror_autotick 键——重入走原判据（向后兼容零迁移）。 死路（已试弃）：① done 门硬拒收未认领面（用户裁决否——打回重做循环，agent 应对是补票行为而非纪律）；② per-task 时序配对硬门（2026-09-29-flow-task-heartbeat 弃案1 沿用否决——误伤一提交多 token 合法场景）；③ 中途强制心跳协议调用（违 D-007 thin 两调用形状）。

## D-unmapped-221@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-thin-docs-v2
原编号：D-001@v1
锚点：未记录
最近确认：f7087a0942e83a9212ce1e0279f78ceec86747e4
理由：最大风险：approve 可被同机 agent 自己跑（CLI 无法区分键入者）——门的价值是仪式+留痕（谁/何时批）+评审抽查+平台侧核对，非绝对防伪；实证代批泛滥时的升级路径是把 approve 挂平台人工确认通道。次风险：v2 的 FR 质量从机器兜底退回 agent 撰写+强度词门——占位句/腰斩消失但烂行为句仍可能过门（强度词在句≠语义好），对冲是评审抽查与归档 FR 索引面。试过放弃：①在途 v1 变更全量迁移 v2（否决——改写 agent 正在作答的文档破坏书写面信任，双轨成本更低）；②openspec 式 WHEN/THEN bullet 场景行（否决——fr-index 归档解析认 Given/When/Then 行形态，收敛厚道格式零索引改动）；③断点门做成 advisory（否决——advisory 断点在 0/12 勾选事故已实证无牙，护栏#2 零 prompt 劝说）。

## D-unmapped-222@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-strength-should
原编号：D-001@v1
锚点：未记录
最近确认：fca510ac262707025522f6858ff543ad56de4799
理由：最大风险：无——一行词表扩展语义单调（只放宽不收紧，既有 MUST/SHALL 行为零变化）。试过放弃：把强度词判据改成逐词分立数组+注释文档化（否决——单一正则即单一真源，拆分徒增镜像面）。

## D-unmapped-225@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-wordpos
原编号：D-001@v1
锚点：未记录
最近确认：1793e02b038ff67e1b2610b0aee4a70bcf485bb5
理由：最大风险：放宽位置带来假放行——正文 merely 提及 MUST（如引用他人语句）即算已撰写；对冲=占位句由 pending 检查独立拦、评审抽查面兜底，且中文 必须 本就任意命中（风险面对称存在非新增）。试过放弃：要求英文强度词必须在句中动词位（否决——语义判定超出正则职责，宁同构勿复杂）。

## D-unmapped-229@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-review-promise-negation
原编号：D-001@v1
锚点：未记录
最近确认：905397ef044a86511a22cc1321fe3d529b74e97f
理由：最大风险：否定前缀清单覆盖不全——作答写「不存在串台」「绝无串台」等清单外否定式仍会误升级（保守方向：多评一次，成本面而非漏报面；后缀否定如「串台为零」暂不覆盖，理由：中文技术作答主流是前缀否定，后缀形态罕见，为它加规则的正则复杂度不划算）。放弃的方案：①把「串台」整个移出 PROMISE_RE——「保证不串台」是真实交付承诺，直接漏报，不可接受；②检测命中后在 reasons 组装处按上下文豁免——要在信号组装层开特例洞，且豁免逻辑与词表分离两处维护，弃。

## D-unmapped-231@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-diff-commit-attribution
原编号：D-001@v1
锚点：未记录
最近确认：45588742ca2f30629a406720cbb28aa270418ceb
理由：最大风险：提交 message 未携带变更名后缀的裸提交会污染归属（用户手提交 `fix: typo` 触碰过他侧文件 → 该文件判 unknown → 保留 own → 漏剔）——fail-closed 方向（多冻不错杀），与现状等价不劣化；文档化于 FR-02。放弃的方案：①扫 archive/ 下变更的声明清单参与 foreignMap——历史变更清单永久抢文件，恰是否决决策 sentinel-evidence-freeze⑤ 防的形态，且 7 天陈旧规则对已归档目录语义混乱；②按提交作者 email 归属——多会话共用同一 git 身份（本仓两实测会话同 user），作者维度无区分度；③改 flow.js 调用点显式传 baseline——该文件并行会话在途，整文件提交会夹带他侧未提交改动（规则 11），故全部改为函数内自取。

## D-unmapped-233@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-uivisual-word-narrow
原编号：D-001@v1
锚点：未记录
最近确认：d0b5ebb26fe50faf2965f96fd845259506ebdc30
理由：最大风险：误漏——真 UI 变更的 input 恰好只含「渲染/组件/样式」而无其他信号且文件面无前端扩展名（如纯设计讨论期）。缓解：flow start 须知本就是 advisory 非门禁（漏渲染只少一段提示），且 detectUiTouchInPaths 扩展名兜底覆盖绝大多数真 UI 交付；探针 12 的 error 档（降级无裁决）不依赖词表触发条件的变化。 试过放弃：① 双信号分层（input 命中 ∧ 文件面/多词佐证）——纯文案改版真 UI 变更会漏，且把简单启发式复杂化；② 全词表保留+对 CLI 仓加白名单——按仓配置引入 per-repo 维护面，与「仓中立」模块承诺冲突。

## D-unmapped-234@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-visual-downgrade-narrow
原编号：D-001@v1
锚点：未记录
最近确认：546720ea4ed1a70809e69a82b342f3e4bcda12c5
理由：最大风险：窗口值选错——真降级声明写法超出 6 字窗口（如「视觉层面做了大幅的收缩式降级」= 视觉+7 字+降级）会漏判；漏判方向是 fail-open（少拦一次 error），而该形态本就极小众（正例标定留了余量），且 error 档之外缺证据面仍有 gate 兜底。 试过放弃：① 语义排除（行含「探针/检测/词表」跳过）——讨论形态不可枚举，且引入语义判定制违 D-003 封闭面；② 删除 partial token——既有正例「FR-04 partial：」依赖它，伤正例。

## D-unmapped-238@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-flowdone-lintfail-output
原编号：D-001@v1
锚点：未记录
最近确认：0830851ef51549bb1cd5e35006403f2165d144b9
理由：最大风险：读改写 test-result.json 的并入分支在结果文件损坏时静默退独立落盘——同变更可能留下两份结果文件（原损坏件+独立 lint 件），消费端按 kind 字段区分；显式 best-effort 边界已在 JSDoc 声明。倒推收尾特有风险：接手非本会话原创的代码，语义理解偏差——已逐行核对 diff 与既有 test 三件套同构性并实跑其自带 e2e 锁定。放弃的方案：① 在 runVerifyLintCheck 内直接落盘——该函数被多路径复用（verify/quick/flow），落盘时机与归属 change 名在调用方才知道，写入层错位；② 改 tally 记全量输出——tally 是计数器不是存储，扩容错位。均已弃。

## D-unmapped-239@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-redomain-preview-bychange
原编号：D-001@v1
锚点：未记录
最近确认：4eedf8e6ace5f2f63e346672f7d198e055cdb863
理由：最大风险：byChangeD 为空字符串时 `byChangeD || null` 归 null——与既有落盘分支同款归一（非新行为），无新增面。倒推收尾特有风险：接手代码语义理解偏差——diff 仅一行透传 + 一行文案，已逐行核对并实跑其自带 CLI 单测。放弃的方案：无（更深的重构——如把预览/落盘共用一条参数组装路径——超出坑修复面，不动）。

## D-unmapped-240@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-disposition-refreeze-drift
原编号：D-001@v1
锚点：未记录
最近确认：1d1e9fc5c249a43c245f2692e569091449c6e403
理由：最大风险：治理件后补提交（如评审任务书后 agent 修改 design.md 并提交）也带本变更后缀 → 触发重冻结+重评——多一次评审循环的成本换审计面始终对齐最新提交事实，方向正确但循环可能多一轮；重评后无新提交即不再触发，无死循环面（判据窗口每轮前移）。放弃的方案：① 只警告不自动重冻结（弱形态）——警告会被忽略，归档件仍停在旧时点，治标不治本；② 按 review.json 的 reviewedAt 时间戳对比提交时间——时钟不可比（本地钟漂移），且 review.json 可手写，锚点不可靠；head 锚是 git 自身事实。均已弃。

## D-unmapped-241@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-tests-confirm-hint
原编号：D-001@v1
锚点：未记录
最近确认：4e4aa7d58299154c82c9fe863a5ee191795fb5f1
理由：最大风险：提示语与实现将来再度漂移（实现改形态而提示没跟）——已加源级回归测试锁定形态一致性，漂移即测试红。放弃的方案：index.js 兼容子命令形态（解析 tests 后首个位置参数 confirm）——双形态长期并存扩大漂移面，且与既有 fail 文案（教 flag 形态）冲突。已弃。

## D-unmapped-242@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-input-format-copy
原编号：D-001@v1
锚点：未记录
最近确认：979e624889e8bfeebaa9a2904da64763bb438620
理由：最大风险：教学形态将来再与实现漂移（实现改格式教学没跟）——源级回归锁定紧凑内联旧形态零残留与新形态在场，漂移即测试红。放弃的方案：让清晰度门宽松兼容内联形态（「成功标准：」行内也提取）——弱化过门格式（独立行是可解析性锚），且 AGENTS.md 已教严格形态，改门等于迁就错误教学。已弃。

## D-unmapped-243@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-bind-unbind-help
原编号：D-001@v1
锚点：未记录
最近确认：e0d2fe4eb987a2ada4d328d6faee428defbb4f9e
理由：最大风险：语义短注将来与实现漂移（bind 改替换语义等）——回归测试带实现一致性锚（锚源文本随实现改而红，提示同步文案）。放弃的方案：把语义写进模块文档而非用法行——用户在 CLI 报错现场最需要语义，文档是第二落点；两处都写扩大漂移面，取现场单点。已弃。

## D-unmapped-244@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-flow-help-status
原编号：D-001@v1
锚点：未记录
最近确认：8d31a9e964a58dbd37e6bc7fc6ccc93e3c92d75b
理由：风险：用法行进一步变长（终端窄时折行观感下降）——接受，与既有单行长风格一致。试过但放弃：把 status 提示拆成第二行独立输出——放弃理由：exit(2) 前多行 stderr 无既有先例，且既有测试按单行 includes 断言，拆行增加断言面无收益。

## D-unmapped-245@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-hunk-gate-commit-attribution
原编号：D-001@v1
锚点：未记录
最近确认：72c50c924f82444521924e13a75859db8a17ec3b
理由：最大风险：提交 message 后缀被伪造（本变更交付冒他侧名）→ 误判他侧归因放过未声明文件——但该伪造同时会骗过 patch 冻结的同一口径（filterCommittedFace 先于此门存在且已裁决：按提交事实归属是已发生的提交事实不是声明抢文件，sentinel-evidence-freeze⑤ 界定），本变更只是让两消费点口径一致，不新增伪造面。放弃的方案：① collectForeignDeclarations 扩扫 archive/ 声明面——用陈旧声明做意图归属正是 sentinel-evidence-freeze⑤ 否决的形态，且 archive 清单庞大性能面差；② 未归因警告文案改软——保留误报数据只软化措辞，治标。均已弃。

## D-unmapped-246@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-input-teach-copyable
原编号：D-001@v1
锚点：未记录
最近确认：0e463ef9124e8455cd4d534ad7254ec42e464404
理由：风险：多行教学使部分命令输出变长（worktree-guard 拦截提示从 ~9 行变 ~11 行）；terminal 折行下实例可能视觉粘连——接受，实例行保持短行、缩进区分。另一风险：教学实例字面与本变更测试断言耦合，未来改教学须同步测试——这正是断言的目的（锁可照抄性），可接受。试过但放弃：改 extractSuccessCriteria 使分号内联形态也过门——放弃理由：内联形态无法区分「动机句」与「标准条目」，放宽会把动机文本误收为标准，门语义受损；教学侧给实例是更小且语义正确的修复面。

## D-unmapped-248@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-flow-tail-polish
原编号：D-001@v1
锚点：test/machine-interface.test.mjs:420
最近确认：3f99da145cefec337e3ab86afb72f13f17a7314e
理由：风险：exit 0→1 是行为变化，依赖旧语义（用 exit 0 判断"查询完成"）的脚本会翻——接受，脚本按惯例以非零为异态，旧行为无法区分不存在才是隐患；test/machine-interface.test.mjs:420 的 exit 2 断言属 gate execute 域（用法错）不受影响。归档窄化 add 修复后 knowledge 自动入暂存恢复——既有设计已裁决该权衡（文件级 status 窄化非目录级，追加型共享面整文件提交与惯例一致）；兜底层（narrowed add 失败时）才降级为提示不自动暂存。试过但放弃：knowledge 兜底层也自动补暂存——放弃理由：降级场景下无法确认 narrowed add 失败原因，人核后提交更稳（AGENTS.md 规则 11 同因）；再试过：flow-state 不加字段、纯 proposal 回退——放弃理由：proposal 转写含「（未提供 --input）」占位与人工改写风险，state 直存是更可靠的原始面。

## D-unmapped-250@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-litest-p1-fixes
原编号：D-001@v1
锚点：未记录
最近确认：c201930f1fd64e106bbb76006cef12a7dbc2e5e3
理由：最大风险：① cursor 收窄漏报——若未来代码引入非 db.cursor() 形态的真游标（如 cursor.execute 独立出现），RE 不命中。权衡：该形态必先有 conn.cursor() 创建点（Python DB-API 惯例），`.cursor(` 已锚定；next_cursor 覆盖主流分页协议。漏报面远小于原误报面（本仓每个提及 cursor harness 的 patch 都误触发）。② 行号锚会随源码演进再漂移——这是 doc-ref-check 机制的设计预期（漂移即红），test:core 纳入后漂移在日常工作流被拦，不再是沉积债。 试过放弃：cursor 收窄为「赋值/字段形态 `\bcursor\b\s*[=:]`」——grep 实证本仓 docs-check.js/quicklog.js/init.js 有 8+ 处循环变量 `cursor =` 命中，误伤面仍大，放弃；归档聚合用 `--name-only`——实现期测试即暴露 rename 折叠丢源侧路径（部分提交语义下源文件不会被删），改 `--name-status`。

## D-unmapped-251@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-review-anchor-and-negation
原编号：D-001@v1
锚点：未记录
最近确认：8305cab70fbd5bfc821cb5fc12d3cd8713838280
理由：最大风险：① reviewedAgainst 伪造（评审员乱填 sha 绕过隔离）——信任层级与 verdict 同级（评审产物本就信任子代理如实填写，schema 校验形态不校验真伪；且填错 sha 的后果是多留一份过期评审，后续 review 子步 validate/P1 判定仍在，防线不单点依赖锚定）。② HEAD 短 sha 前缀碰撞（7 位起）——理论存在但与 git 自身缩写语义一致，碰撞后果同①不致命。 试过放弃：把裸「不」加进 NEGATED_CROSSTALK_RE 前缀词表——「不[0-8字]串台」会把「不排除串台」「不可能没有串台」等风险自认/双重否定误消解（⑥ 用例即反向锁定），放弃，取三字整词精确匹配。

## D-unmapped-252@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-flow-status-json
原编号：D-001@v1
锚点：未记录
最近确认：e751e152e63cf842c15237779705e29b87ab9124
理由：最大风险：事实/渲染分离时改坏现有人类可读输出（heartbeat 等测试逐字钉渲染行）。对策：人类可读路径保留原渲染字符串本身，仅把渲染数组里的内联计算换成同语义的预计算变量（正则与语义逐字不变），并用测试钉住不带 --json 的关键行。试过放弃：对渲染文本做「文本→JSON 反解」包装层——放弃，文本是给人看的不是契约，反解正是本变更要消灭的 fragile 匹配。

## D-unmapped-253@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-archive-cmd-race-and-brief
原编号：D-001@v1
锚点：未记录
最近确认：ade6768faef8810e2127a2b7590f2d892a5f466c
理由：最大风险：knowledge/docs 共享面仍有残余竞态（打印→执行窗口内新文件被并行移走）——HEAD 锚不适用于「本轮蒸馏新产、HEAD 尚不在册」的 A 条目，只能以在场判定收窄 + fallback 指引兜底；发生概率低（蒸馏产物刚由本链写盘）。试过放弃：① 打印时逐条目 `git ls-files` 校验——校验的是同一瞬态 index，幽灵当场在册照样通过，治标不治本；② 建议裸 `git commit`（无 pathspec）——违反 AGENTS.md 规则 11（共享暂存区会卷入他会话条目），且把「执行时暂存区又变」的窗口风险放大成全量面。

## D-unmapped-260@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-resume-title
原编号：D-001@v1
锚点：未记录
最近确认：86a88f5c2c0f24dc9992636cacb7933a0aa5e222
理由：最大风险：恢复路径在测试里跑 cmdFlow start 会拉起 watcher/补起草等副作用——测试须以 SILLYSPEC_WATCHER=0 逃生阀与临时仓隔离（既有 watcher 测试同款），否则测试环境噪声。放弃的方案：① 在 flow-state.yaml 冗余存 title（双源漂移，DB 已是权威源）；② 恢复简报改为直接复用 flow status 的渲染函数（两版面文案/结构不同，强行共用会把 status 的阶段推断耦合进恢复面，超出本变更范围）。

## D-unmapped-263@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-resume-domain-flip
原编号：D-001@v1
锚点：未记录
最近确认：0abe84727a51666483b538a2f4515a7c25865e1f
理由：最大风险：mtime 不可信场景误剔——工具保留旧 mtime（cp -p / 归档解包）落进未跟踪区且恰在本变更期间成为交付面。对称面：收口冻结面（collectFreezeFiles）不做此过滤，未提交交付仍走「无法归属警告/--freeze-dirty」既有出口，路由面少一个域只是 advisory 注入变窄，不丢审计事实。clock skew：出生时刻与 mtime 同机同时钟，无跨机比较。 试过放弃①：按路径形态过滤（排除 .claude/ 等目录）——开放世界枚举，写死目录清单必漏新形态，违反本变更自己的成功标准，放弃。 试过放弃②：fresh 时把 porcelain 未跟踪面快照进 flow-state、重入时对照差集——状态面翻倍且 flow-state 并入 patch 冻结件的口径要跟着改；快照后文件被本会话编辑的差集判定仍要回退到 mtime，多一层状态没有多一层判据，放弃。 试过放弃③：在 changedFilesSinceBaseline 内部加过滤参数——fr-rot-precision ⑥ 源码钉断言调用形态 `changedFilesSinceBaseline(cwd, st.baseline_commit)`，改签名要么破坏钉要么连带改三个消费面（resume 路由/dirty 计数/收口测试门），收口测试门语义不该被路由面需求带着动，放弃，改在调用侧包裹。

## D-unmapped-267@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-flow-friction-batch3
原编号：D-001@v1
锚点：未记录
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e
理由：最大风险：②的建议可能「答非所问」——basename 全等命中只覆盖「缺目录前缀/移动了位置」这类幻觉（postmortem 实证主力形态），对完全虚构的文件名无效（此时无建议段，回到现状）；BFS 8000 上限在大仓深目录下可能截断扫描漏掉真候选——建议是锦上添花，截断只意味着少一条提示不误报。第二个风险：④把「批量跳过」合法化可能被滥用为「一键清债不思考」——reason 是必填审计面的弱化（可选参数）；缓解：CLI 输出明示「reason 是审计面请确认真实」+ verify 门只认文件不认命令，agent 仍可手写。试过但放弃：a) 把 stage-review 检查并进默认档 error 语义——那会让 gate 默认档 FAIL 而 --done 才是执法点，两道门抢执法权造成新分裂（informational 是唯一不破口径的位置）；b) suggestClosePaths 用模糊匹配（编辑距离/前缀）——误建议比无建议更害（agent 照抄错路径再撞一轮门），basename 全等是零误报下限；c) visual-evidence 在 execute 收口硬拦——执法点在 verify 是分级门设计（ui_visual_gate 配置），execute 只该提醒不该抢。

## D-unmapped-268@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-wave-auto-adopt-review-dedup
原编号：D-001@v1
锚点：未记录
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8
理由：最大风险：③增量重跑的假绿面——修复破坏了「增量面之外、基线绿面之内」的测试而未被发现。缓解链：增量面三源推断以修复文件为输入重算（import 依赖与 FR 关联回归自然入面）；失败批文件无条件入面；增量面≥全量面时回全子集；test_rerun: full 逃生；归因不出保守全记批文件（增量退化不误报）。残余接受：跨模块副作用破坏无 import 边文件的理论面——与「agent 手动只跑失败测试」的现行实践相比是严格改进。第二个风险：①自动重排改写 agent 手排 Wave——agent 的时序意图应编码在 depends_on（adopt 的输入）而非 Wave 手排；公告醒目 + config 逃生 + git 可恢复。试过但放弃：a) 增量后强制再跑全子集确认——passing 轮成本反升（增量+全量>全量），postmortem 的痛点是失败轮返工不是通过轮；b) 逐文件归因用 failureRemaining 行集——实证行集只含内层用例名不含文件名（node --test 文件作参数时顶层名=测试标题），改走 not ok 块 location 路径；c) Wave 错误在 consistency 单点挂自动重排——WA4 实证混有其他错误时会误触发，移到失败统一收口点判定。撤销三项（记录裁决）：评审档位新增 self 档不实施（档位机器已存在，self 档破坏 1/4 抽样校准）；「--done --answer 补 wait」视为已修复（complete.js requiresWait 门现行自动补全）；「--step 意图断言」作为并发安全设计保留。

## D-unmapped-269@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-thin-tasks-v3
原编号：D-001@v1
锚点：未记录
最近确认：9ec6d3ec65b64a88e641bba8a3409ed6580f2c29
理由：最大风险：移除镜像豁免后，存量在途变更（tasks.md=镜像面、agent 已一把勾、区间提交无 token）在升级后收口会从放行变拒收——属预期收紧（假完成主张本就该拦），出口是补 token 提交或 --allow-batch-tick。次风险：agentic 行为对文案变化的适应性——横幅契约若仍埋在长输出里，逐格勾依旧靠自愿；本变更不动 D-007（中间零必需交互），接受该边界（节奏门+哨兵统一判据已把「一把勾」的账算清）。试过放弃：watcher 轮询间隔调小/开 fs.watch——治标（合并概率下降不归零）且 watcher 进程面改动大；放弃。另试过：tasks.md 由 agent 在 spec 断点必写（机器不再预填）——违反「工件回填轮=0」哲学且断点无机器门可验「写没写」，放弃，保留机器种子+自由改写。

## D-unmapped-270@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-tick-timing-first-commit
原编号：D-001@v1
锚点：未记录
最近确认：0a843cdd7f5c87bbb361ab4d7b59d5270752b5e6
理由：最大风险：超大 history 下 --reverse 全量列举的耗时（路径限定后通常个位数提交，实际无感）。试过放弃：`git rev-list | tail -1`——需二次管道/字符串处理且 rev-list 无 --format；放弃。

## D-unmapped-271@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-allticked-gate-docs-resync
原编号：D-001@v1
锚点：未记录
最近确认：bf7c122935343fcb176cc50aece2ceb99fcb072c
理由：最大风险：全勾硬门对存量在途变更的收紧（未勾收口从放行变拒收）——出口明确（补 token 提交+tick 或改写任务面），且与证据门同哲学；次风险：tick 触发的后台同步在网络差时堆积——bg-sync 单飞锁+合并天然防堆积。试过放弃：时序门（tick 时 token 提交须已存在，先证后勾）——用户裁定参考 openspec：openspec 无任何时序/证据审计，完成状态机（全勾才收口）+自愿循环指令即是其全部机制，我们已有证据门加全勾门已强于它，时序门属过度强制，放弃。

## D-unmapped-274@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-unify-close-trace
原编号：D-001@v1
锚点：未记录
最近确认：4366f8b36d046f344f3d798a52f80a62fddb9271
理由：最大风险：两写点行为收口的回归面——thin 侧 console 字样/键序、heavy 侧「空 patch 当 ok」形态变化可能碰隐性消费者。缓解：thin 侧键结构与输出前缀逐字保留（flow-protocol 断言钉住）；heavy 空 patch 形态经全量套件与 e2e 验证；快照新增 closedBy 为 additive 键，旧快照读侧缺省兼容。放弃的方案：① 只做读侧不写统一（第 2 层已做）——新变更永远靠回退兜底，两卡不对称长期存在；② heavy 侧沉淀面在 archive --confirm 才写——语义上更「终态」，但需在归档点重建采集上下文（worktree/分支已清），且与快照时点（execute --done）不一致会造成两套留痕时点漂移，不如同点同锚；③ scope-audit.json 里引用 change.patch 路径省一份 patch 文件——读侧（getFileDiff/平台）认死 scope-audit.patch 文件名，省字节收益小于读面改动风险（同字节 git blob 本去重，零仓容成本）。

## D-unmapped-276@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-thin-done-dirty-gate-and-paren-attribution
原编号：D-001@v1
锚点：未记录
最近确认：e6dd2adac5bfb1bb563bc0e367e8918d270ba450
理由：最大风险：阻断门改变既有收口习惯——依赖「警告后继续」的自动化/脚本会开始拿到 exit 1。缓解：exit 语义=半态可重入（与 review 中断一致，CLI 文化内既有形态）；--accept-dirty-gap 一 flag 恢复旧行为且留痕；flow-protocol ⑥b 同步更新锁定新语义。放弃的方案：① 归档态 `flow done --refreeze` 重入口——治存量不治源头，且对终态归档件开重写面（review/快照/sha 锚一致性要另设计），阻断门落地后坏状态不再产生，存量用已验证的协议重入修法，留档后续可选；② dirty 警告时自动 --freeze-dirty——把「无法归属」静默升级成「全归属」，跨变更审计双计风险（他侧在途文件误入冻），违背归属保守原则；③ 提交信息解析支持任意前缀文本（不限 thin）——误匹配面扩大无实测形态支撑，收窄为 thin 前缀 + 附注。

## D-unmapped-290@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-fourpiece-created-at-local
原编号：D-001@v1
锚点：未记录
最近确认：ba0b5d1bf243b717af3a8ac13de70afa5a799d9a
理由：最大风险：存量已写 UTC 的 `created_at` 不自愈（如 2026-10-09-workspace-init-skill-gate 的 requirements/proposal 02:04:06），时间线对旧变更仍显示旧错值——接受：历史工件不改写，变更事实以 watcher 事件流为准，新变更起生效。试过放弃：①读取端按 UTC 解析无时区裸形状——无法区分「本地墙钟约定值」与「UTC 误写值」，猜错方向比不猜更糟；②created_at 显式带时区偏移（+08:00）——与 datetime.js 立的「YYYY-MM-DD HH:mm:ss 形状」约定冲突，牵动 CLI/平台全部读取面，超出本修范围。

## D-unmapped-292@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-close-trace-single-set
原编号：D-001@v1
锚点：未记录
最近确认：e0a193430426463421f1973427882ae2fe0ebefb
理由：最大风险：读侧兼容链遗漏某个旧形态消费点导致回放退化（如 --file 切片漏了旧 heavy 形态）——对策：三类存量形态各自钉兼容测试 + 收口全量回归（732 文件全绿）。放弃方案①（scope-audit 命名幸存）：CLI 5 个模块 + 平台 3 处读取 + 约 14 个测试文件全要改名换路径，改动面大一圈，无对应收益。放弃方案②（一次性迁移存量 247 归档）：重写历史冻结记录风险高，且平台镜像服务其他仓的旧归档不受本仓迁移控制，回退链反正删不掉——用户已确认不动存量。放弃方案③（全新命名 close-trace.*）：所有读方（含平台）全部改名，存量归档 100% 走回退链，纯增 churn。

## D-unmapped-305@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-cli-uninit-cwd-gate
原编号：D-001@v1
锚点：未记录
最近确认：a6f775c7fcb4644b32cfe3745d3a3c50ce7b958e
理由：最大风险：豁免清单漏项/多项——漏项误拦合法命令（agent 被 exit 2 打断），多项放走本该拦的命令（回到静默错答）。缓解：清单每项注释豁免依据，测试抽样锁定两侧（豁免面与非豁免面各一组断言），后续增删走清单单一真相源。次风险：重锚定改变个别命令对 cwd 的隐式依赖（相对路径参数按 cwd 解析的命令）——全量套件回归无此类失败，锚定提示行让差异可见。已试并放弃：① 判据用「cwd 本身含 .sillyspec」——拦掉设计支持的子目录运行（ancestorSpecDirs 注释明证），误伤面大；② 拦 init（已初始化目录禁 init）——重跑 init 是模板/skills 升级路径（AGENTS.md「重跑 init 同版本不更新」），拦截打断升级；③ 逐命令补「未初始化」检查——散点维护、报错时机晚且文案不一，正是要治的根因；④ 门内重写祖先遍历——丢 home/tmp/.runtime 守卫会复辟 2026-09-27-spec-sync-413 等已修复坑，改为复用 resolveSpecDir。

## D-unmapped-308@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-drift-review-governance-keep
原编号：D-001@v1
锚点：未记录
最近确认：e59a8adefb2882f670abeca3b7ff088baaf0dcdd
理由：最大风险：豁免边界被人当作后门——治理面等价保留后，理论上可把代码改动伪装进 `.sillyspec/**`（如改 `.sillyspec/docs/` 下的代码生成模板影响行为）。缓解：该面本就是治理面（冻结件既有口径），评审任务书材料含工作区实态核对指引；风险敞口与既有「裸提交不触发漂移」的保守留白同级，可接受。试过放弃的方案：① 按「评审 verdict=PASS 才豁免」加限定——FAIL 评审本就未消费、隔离无损失，加限定徒增状态耦合，放弃；② 承诺面措辞级修改（P2 文字修正）也豁免——工具无法廉价区分措辞与实质（改弱承诺），宁可多评一轮复审（前轮 findings 注入后成本已降），放弃；③ 自动重冻结后把新 patch 哈希回写进 review.json——评审员产物由工具改写破坏独立性留痕语义，放弃。

## D-unmapped-316@v1 跨仓对账集成段收敛单一导出函数，轻量道接入真实三态
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
原编号：D-002@v1
锚点：src/flow-parity.js:buildThinSnapshotRows
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：内联段抽导出 `reconcileCrossRepoPlan`（scope-audit.js），heavy 改调用行为等价、thin（flow.js done 路径）同源接入；复用 collectRepoActual 共享内核（2026-09-20「单一真相源」哲学延续），跨仓行升级真实三态，降级仓诚实 ⊘+degradedReason。
故障面：轻量道新增跨仓 git 调用拉长 flow done 时延（R-03，仅有跨仓声明触发 + GIT_TIMEOUT 兜底 + fail-soft 不阻断）
退役判据：跨仓对账内核升级（如 A 档锡点全量覆盖轻量道）时随内核自然演进，本函数仅组装层

## D-unmapped-321@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-11-flow-start-redline-frontload
原编号：D-001@v1
锚点：未记录
最近确认：db203e71fbe2b756cf9e52de7fce4ae25144270e
理由：最大风险=横幅膨胀稀释注意力（现约 60 行，红线块若展开成段会更没人读）——用 3 行编号红线并同步压缩下方重复表述对冲（实测渲染行净 +2，已在增量可控范围；评审 P3 核正初稿「净行数不增」的误记）。死路：曾考虑让 `expandTaskShorthand`（sentinel-assertions.js）直接支持「task-01..task-05」区间展开——放弃：那是放宽反假完成收口门的判据语义，属门设计变更；用户实证报错清楚改起来快，痛点在知晓时点不在判据本身，前置告知即可不动门。

## D-unmapped-325@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-close-trace-freeze-integrity
原编号：D-001@v1
锚点：未记录
最近确认：98192cfeaf00d568f693974ecb80fbced370c125
理由：最大风险：FR-01 是行为口径变更，存量读方若依赖 files[] 里的工件路径会静默变面——已核读方（fr-index/knowledge-graph/平台 assets.py）只消费顶级字段与交付行，scopeAudit.rows 口径本就不含工件；filter-committed-face 等四个测试文件钉旧行为需同步口径（测试对齐依据=本设计接口契约节）。放弃的方案：①thin 侧改为「工件保留但 totals 分列」——冗余不除、哨兵仍哑，弃；②FR-02 用 `rev-list --branches` 扫全分支——linked worktree 共享分支命名空间，主仓 main 分支推进会污染独占树判定（假阳阻断），改用本 worktree HEAD reflog；③FR-03 在 apply 内同步等待 agent 提交后回写——apply 无提交职责（pathspec 交给 agent），时序不可控，改多点幂等回写。

## D-unmapped-326@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-thin-module-gate-and-feed
原编号：D-001@v1
锚点：src/flow.js
最近确认：ae3188a755843f723f58b21177afb86b4f2c9400
理由：最大风险：门的误报面——存量仓里合法未登记目录多（根级脚本、配置目录），首轮 done 会频繁撞门。缓解：module_gate_ignore 一次性配置 + --accept-unmapped 签收不丢数据（缺口数留痕），遥测可见放行频率，可据此再调默认。次风险：回写的格式自适应误判（卡内混合形态）——只动「## 变更索引」节内/ sidecar 尾部，节外逐字保留，与 splitChangelog 同款行级防线。 已知边界（评审 P3 披露）：共享主仓并行会话在基线之后对同文件（src/flow.js）的提交 hunk 会混入 change.patch 冻结面——冻结 diff 是文件级（baseRef..HEAD × 文件清单），无法做 hunk 级归属切分（未提交面的归属收窄已由 quick --files 声明机制处理，提交面共享文件是残留盲区）。审计以显式 pathspec 提交清单为准。断点续跑路径（distill 已 done 后归档失败重入）的 extraDocs 由 deriveRecordedChangeIndexTargets 从卡/sidecar 反查含变更名的目标文件（幂等事实），不依赖目录级回退兜底。 放弃方案①：给 docTouched=false（命中模块但卡未更新）也上门——放弃：源码活跃≠卡错，代理信号不配阈值（docs-gate 既有裁决，误报训练忽略报警），维持 advisory。 放弃方案②：自动改写模块卡语义段（CLI 生成契约摘要）——放弃：语义解释含 LLM 判断增量，与「CLI 算事实、agent/人写语义」的分工冲突；机械动作只碰变更索引表格。 放弃方案③：module-map 登记也走棘轮基线（docs gate 同款）——放弃：棘轮适合「存量治理、拦增量」的计数面；登记是逐变更直接信号（文件在、图没认），无需基线间接层。

## D-unmapped-327@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-approve-channel-attest
原编号：D-001@v1
锚点：未记录
最近确认：b371dd96323c62c61baacd9a24c6e2d0ee6f2906
理由：最大风险：留痕仍非防伪——同机 agent 可以谎报 `--user-confirmed`。接受：CLI 无法验证人机，价值在必留痕 + 通道可区分 + 评审抽查兜底（与 --by 诚实边界一致）；强凭据属平台层课题（CLI 直连用户问询通道），不与本变更耦合。 试过但放弃：① approve 默认拒绝（无 flag 不放行）——破坏全部既有调用方与平台脚本，收益不成比例，且无 flag 路径已按 unattested 醒目警示；② 批准时 inquirer 交互确认——agent 环境恒非 TTY，等价于默认拒绝同款破坏；③ channel 用自由文本——机器判读与遥测聚合需要封闭三态，自由文本留给 reason 才是对的分工。

## D-unmapped-328@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-review-probe-injection
原编号：D-001@v1
锚点：未记录
最近确认：e12fa207aec9cc34ae981eb1ffaf02ff3e6aa9eb
理由：最大风险：命令行源（command）在任务书渲染路径同步执行——恶意/误配命令可拖慢渲染或产出注入文本。缓解：超时 10s + 输出帽 2KB/20 行 + fail-soft + provenance 留痕；local.yaml 本就是逐机可信配置面（与 commands.test/lint 同信任级），不新增信任边界。 试过但放弃：① CLI 内置常用探针库（启动冒烟/类名冲突 grep 等）——违反开放世界红线（内置清单永远追不上项目特有面，且天然带语言倾向），只配示例进 config-schema desc 不进运行时；② 探针产物缓存复用——渲染频率低（每评审一次），缓存引入失效复杂度不值；③ 允许探针声明 severity/FR 映射等元数据——YAGNI，第一版只要清单行，元数据等真实需求出现再加。

## D-unmapped-329@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-tick-evidence-multi-anchor
原编号：D-001@v1
锚点：token/review.json
最近确认：a419a26ba02829a7db49aa24a956eec4376cf69d
理由：最大风险：证据文本自由（≤8KB）可能被塞入超长噪声或敏感内容进归档件。缓解：8KB 帽 + 自愿面定位（不进门禁，无激励灌水）；敏感面与 change.patch 同级暴露（仓库本身私有）。 试过但放弃：① evidence 接入收口哨兵作为替代证据源——改变哨兵判据语义（token/review.json 双源是 L0 硬门），混入自愿补录会稀释假完成拦截强度，明确不做（留待真实需求再立项）；② 锚对象做全仓逐键锚定判定（任一仓漂移即隔离评审）——跨仓 HEAD 由评审环境决定，主仓 CLI 无法可靠 rev-parse 外仓（路径注册逐机不同），判定面收敛在 workspace 锚 fail-safe；③ evidence 强制格式（URL/sha/路径枚举）——开放世界红线，自由文本+@file 引用已够。

## D-unmapped-330@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-cli-friction-signal
原编号：D-001@v1
锚点：未记录
最近确认：e37ff367b5c14bf269bb19ff43059377cf1d0ffd
理由：最大风险：标记的 workspace 是绝对路径快照，工作区移动/换机后过期。缓解：指路行与通用三出路并存（非替换）、registeredAt 留时点可判新旧；doctor 未来可加标记体检（本变更不做——YAGNI）。 试过但放弃：① uninit 门直接扫盘搜所有工作区的 local.yaml repos 反查——跨目录全盘扫描成本高且无索引，标记方案把索引放到被指物一侧，O(1) 读取；② 把标记写进工作树并建议 gitignore——污染目标仓工作树（用户仓不该被工具塞未跟踪文件），.git/ 内零污染是硬约束；③ deps 阻断自动执行 doctor --fix——门不应有副作用自愈（掩盖环境问题），只指路不代跑。

## D-unmapped-332@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-thick-taskbook-cli
原编号：D-001@v1
锚点：未记录
最近确认：374baba5b0cb866d66773b6dbfb2a07900e03478
理由：最大风险：任务书内嵌 renderReviewJsonContract 全文（含面向主代理的通道优先序段）——评审员视角读到达人指引略错位。接受：单源胜过第二套摘要（契约漂移的代价大于文案错位；通道段落对评审员无害——其通道已由派发方决定）。诚实边界：任务书仍由主代理复制转发，理论上可被篡改——与 thin 任务书同界（CLI 单源降低手写 leading 概率，不防恶意篡改；强凭据属平台层课题）。 试过但放弃：①改 stages/*.js 步骤指引模板内嵌任务书——模板被指纹测试钉死且三阶段重复维护，打印出口纯增面零回归；②新子命令 `review taskbook`——两个既有出口（撞门后/骨架生成时）已覆盖全部获取时机，新命令徒增维护面；③任务书内嵌前轮 findings 注入（thin 有）——厚档复审链由 register-stage-review --refresh-hash 与 docHash 机制承担，v1 不做（YAGNI，留待真实复审痛点出现）。

## D-unmapped-335@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-closeout-task-guidance
原编号：D-001@v1
锚点：未记录
最近确认：f522dc81a26584861ee3432671c4c0cf272fac3b
理由：答：最大风险：指引是软约束，agent 仍可能把成功标准搬进任务清单——接受：三日三次中两次本可靠预埋 token 消解（纪律面），指引放在任务拟法卡点是最低成本的最大覆盖；复发信号明确（哨兵再次拦收 token 缺失型任务），届时再评估机制面（且方向是 P5 收口代执行消解自指，非免检标记）。试过放弃：①[收口] 免检标记——自声明逃生口+验证时点无事实（详见做法概述）；②task-evidence.jsonl 进哨兵证据面——自由文本自声明弱于提交事实，维持缓议；③哨兵挪到归档提交之后——重排子步序换取边角场景，复杂度不值。

## D-unmapped-336@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-design-question-autorepair
原编号：D-001@v1
锚点：未记录
最近确认：43290f5cc74d6762f4739c021c16e58b944c640f
理由：最大风险：相似度定位误判（把引用问题原文的作答行当改述行）。独立评审 P1 实证了替换式回填的这一数据丢失面，已按其裁决改为**纯插入**——回填代码路径不存在任何删除/覆写行的语句，「绝不删除」是结构不变量而非阈值假设；定位阈值 0.5 只影响插入位置（改述行上方 vs 节首），不影响内容保全。测试 ⑦c 钉死 P1 场景（引用行相似度 1.0 仍不被销毁）。次要风险：插入位置与改述行相邻造成阅读上的近重复——留给 agent/评审在 advisory 留痕下自然清理，机器不做删除决策。试过放弃的方案：①把提示加回模板文件（10-05 的修法，10-07 thin-tasks-v3 已删）——实证会话里原文 3 秒前刚读过仍被改述，散文提示对生成模式滑误无效；②锚对比放宽为模糊匹配——防篡改语义丢失（软问题会被静默放过）；③整文件机器重生成 design——等于替 agent 重写书写面，违背 v2「书写面归 agent」契约；④替换式回填（本变更初版）——评审 P1 证伪，见上。均否。

## D-unmapped-337@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-thin-empty-face-crosscheck
原编号：D-001@v1
锚点：未记录
最近确认：e907173ef87e25c230dd64584e709887d8a44437
理由：最大风险：误伤合法空面形态。三处防误伤设计——①剔除 .sillyspec/ 治理条目与 e.repo 已标注条目后才判「声明非空」；②纯跨仓规范标注空面降为 advisory；③签收留痕持久化（重跑不重复拦）。次风险：嫌疑判定放宽（主仓不存在即点名）在非空面分支也生效后，路径笔误（声明了不存在的路径但冻结面非空）会从「快照行计划未动」升级为告警点名——是增益不是回归（计划未动行本来就不可见地躺在快照里）。试过放弃的方案：①空面分支内做完整跨仓冻结+留档（重构 writeCloseTraceArtifacts 对空 ownFiles 的适配）——本变更面膨胀且 close-trace-freeze-integrity 的「空面不落伪完整 patch」设计承诺会被触碰，留纯跨仓空面为 advisory 点名+后续变更；②per-run flag 不落盘（与 --accept-dirty-gap 同款）——评审多轮重跑必重复阻断，选 flow-state 持久化；③把防呆告警同时升格为非空面阻断——非空面已有快照「计划未动」可见对账，告警足矣，阻断面保持最小。均否。

## D-unmapped-338@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-batchtick-evidence-domain-hint
原编号：D-001@v1
锚点：未记录
最近确认：e93f66eb01d66c3d1d8539a69180994542a4cf43
理由：最大风险：降级被对抗利用——agent 学会「一把勾+事后补 token」绕节奏纪律。评估：token 证据是提交哈希锚定的客观面（不是自声明），「事后补 token」意味着真做交付提交，证据语义未失真；损失的只有平台时间线 per-task 时点信号，advisory+flow-state 留痕使该损失审计可见。0/12 事故形态（零证据一把勾）不走降级路径（status≠complete 保持硬拒+哨兵独立拦截）。次风险：域预判误导——input 提及路径与实际交付面不一致时预判落空；缓解：预判行明示「以收口实际交付文件路由为准」，不设门不锁域。试过放弃的方案：①事件流门完全退役只留 git 时点检查——证据完备判定依赖哨兵先行，事件流门仍是零证据形态的节奏牙齿，退役扩大打击面；②起草时把预判域写进 draft-ledger 锚供 distill 消费——input 路径过时预测会覆盖实际文件路由（更糟），预判只做提示；③横幅预判做成硬门（未登记即拦）——绿地/探索性变更会被误拦，与模块门「绿地无图不拦」语义冲突。均否。

## D-unmapped-344@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-flow-diff-cmd
原编号：D-001@v1
锚点：未记录
最近确认：0f4b572c0526a679ce9e347112ca0ff0f3669b99
理由：最大风险：活跃态与归档态数字对不上造成困惑——活跃实时算含未提交 dirty 面，归档件只含冻结时点面，收口前后同命令数字必然不同。缓解：输出显式标 mode（active/archived）与 state（committed/dirty），dirty 面单列不混入合计口径歧义（合计含 dirty 并注明）。次风险：untracked 大文件按行数统计的 IO——单文件读行数成本可忽略，排除目录级扫描（只 stat porcelain 列出的文件）。试过放弃的方案：①复用 worktree diff 的通道——那是 worktree 元数据驱动的另一族（需 --base 手给），变更名直查语义不符；②活跃态也走冻结件（flow done 时预写轻量 json）——给只读查询加写面违背最小侵入，且收口前就要维护第二份真相源；③顺带做「计划外」verdict 对账（活跃态比 design 声明面）——有价值但属收口门职责（夹带嫌疑 advisory 已有），查询口不越权，留后续。均否。

## D-unmapped-346@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-extract-head-guard
原编号：D-001@v1
锚点：未记录
最近确认：e68f8119af1846cf4bff961364c9ef7207d455d5
理由：最大风险：守卫误伤——某条标准/内容行恰好整行形如节标题（如裸行「需求」）。此类行在受控输入里极罕见，且语义上它就是节切换意图（提取循环对节标题行的后续处理与守卫前独立成行时一致）。缓解：draft-continuation 既有 4 用例（括号跨行并回/悬空冒号并回/## 标题/分号斜杠不拆）+ 新增守卫用例全绿钉死。试过放弃的方案：①修 needsContinuationMerge 去括号判定——破 R17 括号跨行并回（动机换行拆条的原始修复），方向反了；②只在节检测正则上放宽（允许前缀污染）——吞并仍发生，条目行依旧被并成一行，治标不治本；③对 0 条提取的报错加特判提示——体验补丁不治病灶。均否。

## D-unmapped-353@v1 极速模式触发权=仅用户显式触发
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-001@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：不能。仅用户显式表达极速意图（「极速/别验证/只要 spec 和代码」类原话）时 agent 才触发；agent 不得自行启用。

## D-unmapped-354@v1 极速跳过面=实测面+重仪式门，spec 面与 distill 必留
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-002@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：跳过=test+lint 实测（runQuickTestLintGate）、hunk 归属门、dirty 收口阻断门（降 advisory 留痕）、ui 视觉探针门、评审子步（凭用户声明豁免留痕）。必留=spec 文档结构校验（verifyThinDocsV2）、tasks 全勾门、ledger 门、distill（决策+FR 索引+模块回写）、archive。distill 判为核心：纯机械文件操作毫秒级、非验证而是知识复利进料口（knowledge search 自动注入未来 prompt + FR 索引支撑动态测试面推断）。

## D-unmapped-355@v1 双层承载——提示词面触发语义，CLI 侧 flag 硬承载
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-003@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：提示词与 CLI 分层：提示词面（AGENTS.md 选道表/flow 命令卡）负责让 agent 理解何时、如何请求极速并转达用户意图；CLI 侧 `flow start --turbo` flag 落 flow-state 留痕（声明即过），`flow done` 读态生效跳过面。纯提示词无法跳过 CLI 硬门，纯 CLI flag 无触发语义——两层缺一不可。
故障面：用户口头说极速但 agent 忘带 --turbo → 门照拦（fail-closed 可接受，提示语指路 flag）
退役判据：若实测极速模式使用率趋零或频繁误触发（遥测面），收回 flag 改纯提示词约定

## D-unmapped-356@v1 作用域=薄道+头脑风暴预段，厚道零改动
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-004@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：仅薄道（flow start/done）与头脑风暴预段（brainstorm 轻量跑通道+单轮合并问询+一次收口）；完整五阶段厚道明确不做极速版。

## D-unmapped-357@v1 方案取舍——选 A（--turbo flag + flow-state 留痕）
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-005@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：方案 A。flow start --turbo 落 flow-state 留痕（声明即过）+ flow done 读态按 D-002 跳过面早退逐项 skipped 留痕 + 提示词面（AGENTS.md 选道行/命令卡）同步教触发判据（禁 agent 自启）。理由：唯一同时满足提示词触发语义、跳过验证仪式、仅薄道、预段也极速四条原始需求且留痕可审计的形态。
故障面：用户口头说极速但 agent 忘带 --turbo → 门照拦（fail-closed 可接受，提示语指路 flag）
退役判据：实测极速使用率趋零或频繁误触发（遥测面），收回 flag 改纯提示词约定

## D-unmapped-358@v1 审计冻结件（change.patch/change-patch.json）极速模式保留
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-006@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：保留。生成是纯 git 机械操作（毫秒-秒级，无 agent 往返）；它们是 distill 模块对账回写（change-patch.json files[] 喂模块卡回写/extraDocs 推导）的单一时点数据源 + 归档审计件。极速跳的是「验证」不是「证据」。

## D-unmapped-359@v1 turbo 跳过面以 tier!=='thick' 为前提（升厚即失效）
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-007@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：不生效。turbo 读态判定为 `turbo === true && st.tier !== 'thick'`——升厚即恢复全量仪式，turbo 残留不短路厚档；`--turbo --thick` 同给同理（留痕但不生效）。

## D-unmapped-360@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-turbo-guide-tier-copy
原编号：D-001@v1
锚点：未记录
最近确认：2b2273b809fa7f86479547fc6c4d8001cb1f2cfc
理由：文案分支写错致 thin 承诺行漂移——scope 测试②双断言锚定（无承诺+如实行在场）。

## D-unmapped-361@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-tdd-scope-guidance
原编号：D-001@v1
锚点：src/flow.js
最近确认：87c99da612c0fb3a7299c1e7e3e0be5820972fe1
理由：最大风险：措辞过宽导致 agent 把「样式不写」误推到「前端不写」——用一句话判据收口判断，行为契约层明示组件/API 皆然。试过放弃：改 src/flow.js 测试门逻辑（按层机器豁免测试面）——放弃，层归属需人判，机器判会误伤（quick-audit 既有「0 测试改动」advisory 已覆盖提示职责）；本变更只动引导不动门。

## D-unmapped-363@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-guide-anchor-adopt-proto
原编号：D-001@v1
锚点：未记录
最近确认：324af7c235bd27534ba9d47004c45f332c8228a0
理由：- 风险1：锚行/原型行增 stdout 字节，可能碰既有字节精确断言测试。对策：guide 关闭零输出的口径保住确定性族；其余测试跑全量验证，若有个别 exact 断言碎则按新输出更新（属预期契约变化，非掩盖）。 - 风险2：锚行打在 outputStep 末尾但 complete.js 的「🚀 advanced」行在其后——锚行仍在尾部窗口内（实证 msg53 末 1896 字符含 🚀 行与其前 ~1800 字符），两行相距 1 行必同幸存。 - 死路：考虑过把决策关键节（分级/生成要求）复制到每步输出尾部——放弃：段落级复制让每步输出膨胀数百字节且节内容随步骤变化维护面大；一行路径锚以 ~120 字节拿到同等恢复能力，guide 文件才是全文唯一真相源。

## D-unmapped-364@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-patch-refreeze-missing-artifact
原编号：D-001@v1
锚点：未记录
最近确认：fddef8885d69c6d7ab2bcc209d84de66ac4c56e5
理由：最大风险：缺件重冻锚定当前 HEAD，若窗口内存在本变更后缀提交但冻结件已缺，漂移无法检测（旧冻结 head 不可知）→ review 未锚定时隔离重评兜底（宁可多评），review 已锚定时结论对当前面有效——两条路都收敛到「审计件与评审对象一致」。放弃方案 A（catch 分支里对 ENOENT 特判重冻）：json 损坏（非 ENOENT）同样产「归档无冻结件」，但「在场即信任」与「缺失即重建」混在一个 catch 里语义含糊；显式前置存在性检查意图更清晰、可单测。放弃方案 B（artifacts/ledger 等其它子步一并做存在性复查）：本次缺陷实证面只有 patch 冻结件，其它子步产物（如 ledger 回执）有各自回填机制，一刀切扩面会放大回归风险——留作后续按同模式逐子步治理。

## D-unmapped-365@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-redomain-domain-arg-normalize
原编号：D-001@v1
锚点：未记录
最近确认：970b33d44a67cb667d6335f9a96c81af5daeae45
理由：最大风险：真实域名以 `fr/` 开头被误剥——由作用域分析排除（裸名不含 `/`）。放弃方案 A（只改 `fr-index.js` 提示语为裸域名）：手工输入仍会带前缀（记忆惯性 + 历史文档/提示语已发出的前缀形态），且修的是提示不是根因；放弃方案 B（只在 CLI 端做字符串处理不进库）：平台「一键迁移」等未来调用方绕过 CLI 直接调库时缺口复现，库层防御缺失。

## D-unmapped-369@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-timeline-ticktime-anchor-scope
原编号：D-001@v1
锚点：未记录
最近确认：2d20d34ca97cbaf55f1400be294ab8ab94fcad81
理由：- 最大风险：显示形态变化破坏既有测试断言——侧车在场才去 ≈ 前缀，纯推断路径保持 ≈ 原形态，既有断言（≈HH:MM:SS、?、未勾）零改动；侧车时刻与推断时刻同时在场时必须显侧车（测试钉住优先级）。 - 死路（放弃）：tasks.md frontmatter 落 ticked 映射——tasks.md 被 machine-draft 生成/agent 手工编辑多方覆写，frontmatter 键易在重生成时丢失，且把时间戳塞进人读文档加剧本复杂度；侧车 append-only 不参与覆写竞争。 - 死路（放弃）：watcher 快照存 per-task 行状态以捕获直接 Edit 翻格的任务 id——需改快照/水位格式并顾跨版本兼容，且对观测盲窗（本次事故主因）无效；CLI 留痕是零盲窗的事实源，Edit 翻格仍走推断降级（诚实面不编时间）。 - 死路（放弃）：按 commit diff 路径补强 sameChange——见做法概述②，注入面波及过大，边际收益。

## D-unmapped-371@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-tick-burst-sidecar-gate
原编号：D-001@v1
锚点：未记录
最近确认：7f2643b1db53b8dd28fee111c372f517f7698931
理由：- 最大风险：误报合法近距勾选（两个真实完成相隔 <60s 的任务单元连点）——后果止于 advisory 提示 + flow-state 留痕（用户确认档位，不阻断）；窗口取 60s 保守值：实测快连点形态 span 279ms–29s，渐进勾选间隔通常分钟级，两侧留有余量。 - 死路（放弃）：在事件流侧修判据（对 CLI 精确事件也做时距分析）——事件流是 .runtime 机本位 + 观测盲窗（deploy-release-notes 实证 0 条 task-done），检测面先天缺失；侧车才是跨机事实源。 - 死路（放弃）：检出即恢复证据完备硬拒——重演 2026-10-13 之前的误伤/摩擦循环（用户未选该档，先留痕攒数据）。

## D-unmapped-380@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-thin-inject-telemetry
原编号：D-001@v1
锚点：未记录
最近确认：a493aef1a10075cf8a5c882afca8ab84b5d464bd
理由：最大风险：遥测双写膨胀——thin start 高频重入（每次 start/resume 都落一条）可能推高事件量。评估：单条 <2KB、既有 8698 行量级下不构成问题，且「注入发生了」本就是事实记录；若未来需要去重，消费端按 (change,query,at窗口) 聚合即可，不在本变更范围。放弃的方案：①在 knowledge-stats 读数时反推 thin 命中（无法还原、纯猜测）；②给 thin 面也注入正文再记 injectedFiles（改变注入形态，超出遥测导线范围——thin 面按需 Read 是 2026-09-28-knowledge-inject-ranking 定下的口径）；③同步写 hits 改异步队列（引入落盘时序复杂度，违背 R-04 简单 fail-soft 先例）。

## D-unmapped-384@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-thin-query-slim
原编号：D-001@v1
锚点：未记录
最近确认：1246ce8ffac6e88d42319c01d5d3ac7de0c6d754
理由：最大风险：动机段写得空泛而成功标准里藏着真正该匹配的领域词——漏匹配。评估：动机段按过门格式必然描述问题域（改动对象+背景），领域词密度天然高于判据段；且 scope 遍历层（touched 文件）与 FR 域注入不依赖该查询，兜底面仍在。次风险：「成功标准：」字样出现在动机正文中间造成提前截断——接受：该串本身是过门格式标记，出现在动机里即格式噪音。放弃方案：①查询按 sentence 切分打权重（过度工程，词面匹配器吃不起）；②INDEX 全量词表审计（2378 条 FR 域逐域补词——值一次独立数据清偿，不在本变更）；③改 queryShingles 展示（bigram tag 是信号面非缺陷，动了破坏 fallback 可解释性）。

## D-unmapped-389@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-harvest-title-clarify
原编号：D-001@v1
锚点：未记录
最近确认：ca4632b278f118f62ed0717db6659a2128493e55
理由：答：最大风险——标题换文案后按旧标题字面检索的存量习惯断链。对策：全仓 grep 实证旧标题字面仅生成端一处 + 测试头注释一处，无读侧匹配面；design 节标题「风险与死路」保留，按节名检索的习惯不受影响。 死路（放弃）：保留「收割」字样改写为「（design 风险节收割底稿）」——放弃：用户明言别扭的正是机制词，「收割」对非流程实现者仍是黑话；出处信息 frontmatter 已承载，标题重复承载是噪音。 死路（放弃）：顺带回改归档件与存量 knowledge 的旧标题——放弃：归档件是冻结审计面、knowledge 是既成蒸馏事实，回改破坏历史原样；旧标题语义可查证（本变更 decisions 即词典），无读侧故障不值得动历史。

## D-unmapped-390@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-title-label-skip
原编号：D-001@v1
锚点：未记录
最近确认：e182ccdba1e2b6a1ac4dbc45d3ead159e63a25f1
理由：答：最大风险——通用标签行跳过正则误伤「本身以冒号结尾的合法标题」（≤12 字无冒号后内容）。评估：一行若除冒号外无任何内容，作标题无信息量，跳过后回退次行/变更名仍可辨识；白名单显式词（动机与背景）不受影响。次风险——存量 6 行 title 修复写错概括：真实概括取自各变更归档件 changelog 行/做法概述（非臆造），修复回执逐行留 before/after。 死路（放弃）：仅扩白名单不加密钥式通用跳行——放弃：白名单是打地鼠，「变更背景：」「详细说明：」等变体还会再踩，通用「短标签行」形态判定一次根治。 死路（放弃）：改 AGENTS.md 格式为 JSON/YAML 结构化输入——放弃：过门格式是轻量道低摩擦核心（引号内换行即用），结构化加重书写负担，违备选道设计初衷。 死路（放弃）：存量 6 行不修只防增量——放弃：平台面板/flow status 展示面持续可见 6 个无意义标题，修复成本一行 UPDATE 级，留着是持续噪音。

## D-unmapped-391@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-vector-switch-discoverability
原编号：D-001@v1
锚点：未记录
最近确认：992f1b2b689815094d437e49b50887fa69cfac19
理由：最大风险：提示疲劳——平台已连接的仓每次 search/零命中 start 都带一行。评估：两触点都是「未获得语义召回」的上下文（search 可能命中、flow 零命中行本就是空态提示行），且提示在用户开启开关后永久消失——自消失性使其天然有界。次风险：平台未部署端点的仓开了开关 → 每次检索白打一轮 404——已有死信短路（进程级一次），成本可忽略。放弃方案：①只在 init 时打一次性提示（新项目 init 时平台多半未连接，提示语境错误）；②写进 AGENTS.md 模板（init 生成面已由 local.yaml.example 覆盖，双文档漂移风险）；③把开关改回缺省开（语义检索是增量能力不是默认依赖，收紧决策不动）。

## D-unmapped-395@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-decision-redomain
原编号：D-001@v1
锚点：未记录
最近确认：d1015183e1d971efd8413546dec61e009ffe953f
理由：最大风险：决策段的「变更」行多源歧义（段内多变更行/无变更行）——parse 侧 last-wins 与 sectionMeta first-wins 曾对坏段判定分歧（gov-action 粘连段实证：批次表认 last、迁移过滤认 first → 无命中拒）——处置：迁移前数据修复坏段（补标题分拆），过滤器与批次生产同源化（first-wins 单一口径）。次风险：无变更行条目（6 条深链旧条目）判定靠主题人工——留痕裁决。放弃方案：①复用 redomain.js 加参数（段格式/冲突键/路由形态三处语义差异，硬塞参数化比孪生实现更易漂移）；②不删空壳保留 unmapped.md（空壳域污染域列表——fr 面既有防线语义，同款处置）；③批量重蒸馏迁移（源 decisions.md 已归档改不动，重放会覆盖 ID 体系）。

## D-unmapped-398@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-ui-proto-form-config
原编号：D-001@v1
锚点：未记录
最近确认：e5c97358455a9a91d268be95d4d7c48ef4c75e52
理由：- 风险1：local.yaml 手写 YAML 嵌套缩进错 → 解析失败被当未登记。对策：js-yaml fail-soft + 缺席与解析失败同态（registered:false）+ 强提醒文案会持续出现倒逼修复；不做 YAML 校验器（越界）。 - 风险2：repos override 匹配不到（触达路径未落 local.yaml repos 注册）→ 静默退仓级。对策：可接受降级（仓级兜底即用户登记的默认态），guidance 不额外告警（噪音大于收益）。 - 风险3：新行破坏字节级既有断言。对策：无参路径逐字不变已由 guidance-output-neutrality/ui-visual-guidance 既有测试锁定；新四态行禁生态命令词。 - 死路：考虑过把 form 校验做硬门（登记非法即拒收口）——放弃：local.yaml 是用户配置面不是变更产物，硬门会把配置笔误升级成流程阻断；警告+强提醒足够。

## D-unmapped-403@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-session-forensics
原编号：D-001@v1
锚点：未记录
最近确认：8862c672f137a6875d1d62af263a65ba8ededbb6
理由：- **最大风险：证据包与「真相」之间隔着 transcript 本体**——agent-session-log 只登记路径，真正的模型 I/O 在各 harness 的日志文件里，格式因 harness 而异（claude jsonl/codex rollout/zcode model-io）。CLI 不解析 transcript 内容（解析器是三套格式 × 持续演化的维护泥潭，且 agent-session-log 注释已实证 fail-closed 立场），解读交给任务书里的 agent——这是设计意图不是缺陷，但意味着 diagnose 的价值上限取决于执行任务书的 agent 是否真读文件。缓解：任务书首条纪律即「先读证据包列出的文件本体再下结论」+ path:line 铁律使空谈结论无处遁形（报告评审时一眼可见）。 - **次风险：六维度骨架被当成完备清单**——真因可能不在六个维度里（如需求本身就是错的）。缓解：任务书明示「维度是常见失事面骨架不是封闭清单，证据指向维度外时照报，报告章节允许增设」。 - **第三风险：登记文件的 schema 演化**（agent-session-log.json 由平台协议文档约束，`change_key` 是既有键；若未来登记面废弃该键，过滤面静默变空）。缓解：空清单与「零命中」在输出里显式区分于「源缺失」，doctor/协议演进时会经过登记面自身的测试面；残余风险可接受（取证命令 fail-soft 不阻断任何主流程）。 - **放弃的方案**： - *CLI 解析 transcript 自动出报告*：三 harness 格式 × 演化维护泥潭 + 语义判断错位（见上）；diagnosing-superpowers 本体也是 agent 读 transcript、不是工具解析。 - *进 run 状态机成为 diagnose 阶段*：取证是随时可调用的查询动作不是流程节点，进状态机会引入步骤态/门禁/进度上报面——收益为零成本为正。 - *报告写到 .runtime*：取证报告是要给人读、随变更归档留档的产物——落变更目录（归档时随 change.patch 一起冻结）。

## D-unmapped-416@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-title-range-gate
原编号：D-001@v1
锚点：未记录
最近确认：8889da0f7a38a5a133b103592fb6cb29f9acb99f
理由：- 最大风险：既有 e2e 夹具首行 <10 字的 91 处（36 文件，扫描脚本清点）会撞门——属旧契约夹具，逐一延长首行至合区间（断言不动）；漏网的由全量回归暴露后补齐。 - 放弃方案①：flow done 收口时才拦标题——拦截时点晚（工件/测试全做完才发现没命名），且 done 面夹具更多；命名时刻（fresh start）拦截成本最低。 - 放弃方案②：adopt/resume 也硬断——adopt 断点后变更已收编（flow-state 已写），硬断制造不可恢复半态；定级为 ⚠️ 强提示 + --title 修复通道（重入即改）。 - 放弃方案③：给硬门加 env/flag 逃生阀——「必须」语义被逃生阀掏空，平台 writer 形态豁免已覆盖唯一无 agent 的自动化面，不再留旁路。

## D-unmapped-417@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-17-tick-timing-source
原编号：D-001@v1
锚点：未记录
最近确认：77f2b2ef9acf74cbfd0ce7afaf75bdbf2a82d417
理由：最大风险：阈值启发式误报——120s 簇窗与 10× 存活比是经验值。缓解：快变更短跨度形态由存活比守卫放行（lifespan < 10×span → spread）；误报仅 advisory 一行不阻断。已知盲区（如实留痕）：agent 全程直接 Edit 的末尾逐格集中（无侧车、watcher 采样出多个单格跳）两类门都不报——时点判据只认侧车是防采样误报的刻意取舍，教学行引导走 task tick 后盲区自然收窄。 试过但放弃的方案：①判据换到「提交时戳与 tick 时戳交错分析」——提交时戳同为压扁受害者（reset --soft 后 recommit 改写 committer date），换汤不换药；②watcher 事件作时点判据兜底（侧车缺失时）——3s 采样的部分观测会把分散勾选采样成「尾窗两跳」，与采样合并跳系列坑同源，误报风险大于收益，弃；③保留 git 判据作双轨——双判据只要一条被压扁摧毁就复现误报，且「untracked 直至归档」在 tasks.md 不进交付 pathspec 的纪律下恒复现，整体退役。

## D-unmapped-418@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-17-archive-terminal-sync-strict
原编号：D-001@v1
锚点：未记录
最近确认：eb09c73c76d3ca457fde4b2bd74a482544ed9d74
理由：最大风险：exit 1 被上游 agent 误读为「归档失败」而重跑 flow done——告警文案首行明确「本地归档已完成」，且 flow done 重跑对已归档变更是幂等拒绝（不产生二次归档）；平台持续宕机时终态命令将稳定 exit 1（如实反映「一致性未达成」，胜过静默半态）。已试并放弃：①改 triggerSync 全局行为（17 调用点全部受累，非终态命令被拖入阻塞——违背 2026-09-20 后台化的既有决策）；②时间驱动 watchdog 兜底（跨平台常驻进程/计划任务面大，留坑档案远改档）；③仅告警不置退出码（agent 侧无重试信号，保底仍缺一环）。

## D-unmapped-423@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-approve-gate-tick-nudge
原编号：D-001@v1
锚点：未记录
最近确认：811130f031f306c084caabad239605d0d9a35303
理由：最大风险是 approve 硬拒的误伤面：存量进行中变更（P1 之前建的）文档可能是旧骨架形态，被新门拒批会打断在途工作。对策：v1 轨走 verifyDesignRecordFilled 同口径、ledger 缺失 fail-open、brainstorm 豁免——三重降级保底；且拒批输出给全修复指引（一次给全，不靠二跑）。 - 放弃方案①：approve 校验加时序证据（spec_approved_at vs 首个 src 提交）——放弃理由：四路调查实证批量收口模式下 git 时间戳系统性说谎（批准恰在单提交前 12 秒 12/12「合规」假象），检查恒放行且 CLI 记录面无 src 编辑事件；完整时序只有 harness 层 PreToolUse 埋点可做，属独立决策的新工程。 - 放弃方案②：tick 硬拒（spec 面未齐禁止勾选）——放弃理由：B 模式（码先于 flow start 的倒推收尾）与既有「先勾后补文档」习惯会被误伤，且勾选证据链（token 提交）已由收口哨兵承担；advisory 达到提醒效果且零误伤。 - 放弃方案③：新写一套 approve 校验逻辑——放弃理由：done 门已有 verifyFlowDrafts 双轨校验与豁免口径（brainstorm/ledger），复用保证两面判定永远同源，新写必然漂移。

## D-unmapped-424@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-thin-review-material-pack
原编号：D-001@v1
锚点：未记录
最近确认：e70ea3004aabbd1b8d4a664fece5cedc3af94556
理由：最大风险：评审员把包当证据用（锚定偏差）——靠段尾基准面语义行（包=定位索引、包外查证须列明、包不足 cannot_verify）与任务书既有「材料按需 Read」预算结构对冲。已知局限：收益不可机测（review.json 不记请求数），本变更不动 review.json schema，收益定性观察。已放弃方案：复用 review-material-pack.js 的 extractDiffSummary（从活 git 解 base，与护栏③冲突且引入 verify-postcheck 依赖面）；给 review.json 加 requestsUsed 字段（schema 变更，与本变更解耦另立）。

## D-unmapped-425@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-thin-empty-face-cross-repo-freeze
原编号：D-001@v1
锚点：src/flow.js
最近确认：ca1d202d5c03b283ba9b11e27b41e14df10d1cb3
理由：最大风险：JSON-only 形态对下游读方是新语义——若某读方仍假设「change.patch 必在场」会误判缺件；本次已同步改本仓存在性复查与 verify 回执，平台读侧由后续独立变更适配（消费 repos 元数据）。放弃方案：①把跨仓正文拼进 change.patch——混仓 diff 的 hunk 会按主仓路径解析，读方错位；②对「全规范跨仓标注+空面」直接阻断要求签收——该工作区跨仓交付是常态，阻断等于对常态路径收税，且不产生审计证据。 **已声明的边界（显式裁决面）**：冻结面归属是文件级而非 hunk 级——baseline..HEAD 中并行会话对同一文件的提交会以整文件 diff 混入本变更 change.patch（本仓本轮实证：2026-10-19-thin-order-canon 对 `src/flow.js` 的改动混入）。缓解：AGENTS.md 规则 11 的显式 pathspec 提交保证本变更自身提交只含自身 hunks；收口评审按 git log/show 核对归属。彻底修复（按归属提交逐笔生成 patch）会改变所有 thin 变更的冻结口径，需独立变更立项，不在本次范围。另：`change-patch.json` 损坏时即使 change.patch 在场也判缺件（元数据不可信 → 重冻结），JSON-only 重冻结会清理残留的旧 change.patch。

## D-unmapped-426@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-undeclared-cross-repo-probe
原编号：D-001@v1
锚点：未记录
最近确认：4d377821eec89934dbd5a81b4b62d548e2b45639
理由：最大风险：未提交面无法归属，并行会话在注册仓的 WIP 可能被点名为「本变更未标注交付」——故只做 advisory 且文案标注「疑似/人工确认」，不做阻断。放弃方案：①按文件类别判定「仅脚手架面」（类别表会随工具演进漂移、误伤合法 skill 变更，且生产实证的 `.codex/**` 不在旧分类集内）——改用真实窗口 diff 作证据；②升级为阻断+签收——跨仓交付是该工作区常态，阻断等于对常态路径收税，且探测本身可能受并行 WIP 干扰，宁 advisory。

## D-unmapped-427@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-freeze-filter-tool-scaffold
原编号：D-001@v1
锚点：未记录
最近确认：71b3ff3ebc87ef51ed667b31b66c4ce92e15e638
理由：最大风险：只改 `.claude/skills/**` 的合法 skill 变更将不再进入 change.patch（归档仍保留变更文档与 git 历史）——这是显式取舍：工具注入面不算业务交付，且此类变更常为 init 模板刷新，正是生产污染源。放弃方案：①按文件内容/类别智能判定——漂移且误伤合法 skill 编写；②把 `filterDeliverableFiles` 的 tool 档也硬剔——会影响 worktree apply 的交付语义，超出本次范围；③剔除 AGENTS.md——它是跨 harness 的项目指令，可能是真实交付（本仓 3.33.1 刷新即例），故保留。

## D-unmapped-429@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-thin-review-dispatch-verbatim
原编号：D-001@v1
锚点：未记录
最近确认：324e09669383e34f8a66581a230ae7bba97dae08
理由：最大风险：纪律行是文案不是强制——主会话仍可能改写（厚道同款指令也只能约束守规矩的模型）；对策是双通道（横幅+任务书）重复声明 + 材料包自含（即使改写，评审员仍有 FR 表/摘要/归属切分锚可对）。已知局限：归属切分的「声明外」类是候选提示非定论（评审员仍需抽查），只省「逐文件全量考古」不省「抽查」。已放弃方案：把任务书落盘文件让主会话传路径给子代理（改派发协议形态，动的是宿主行为面，CLI 管不到）；归属结果持久化进 change-patch.json 再读（引入新持久化字段与读写时序耦合，现算更简单且同源）。

## D-unmapped-432@v1 执行期用户决策落盘走提示级三触点纪律
状态：implemented
变更：2026-10-20-thin-user-decision-record
原编号：D-001@v1
锚点：未记录
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f
理由：提示级三触点：start 横幅纪律行＋断点②对账半句＋tick 条件提示（decisions.md 存在性 gating）。CLI 看不见会话，漏记是纯沉默面；漏记代价是防复潮资产价值漏损非正确性事故，按本仓分工原则（能验证据才上机器门，弱信号纯提示）提示级即正确档位

## D-unmapped-433@v1 收口机器门拦 decisions.md 缺席
状态：rejected
变更：2026-10-20-thin-user-decision-record
原编号：D-002@v1
锚点：未记录
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f
理由：是否在 flow done 加 decisions.md 缺席拦截门？
否决理由：漏记本身不可检测——门只能看见文件缺席、看不见漏记；缺席合法是轻量道懒创建刻意设计（槽4收割/decisions add 按内容触发），硬门误伤合法缺席且制造假安全感
复潮条件：机器获得会话侧信道或可验证的用户决策事件源（如平台审批事件回流）使漏记可检测时

## D-unmapped-437@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-distill-abnormal-upgrade-fix
原编号：D-001@v1
锚点：未记录
最近确认：d163bb94859ba54c2dfe0daa6f07a255d06ac7e1
理由：最大风险=存量行为翻转让在途变更意外升厚：needsWait 场景此前静默、现在真升厚，若有在途变更恰好带缺字段 rejected 条目，收口会突然走厚档仪式。自限：needsWait 场景本身是决策质量缺陷（字段必填契约早有），升厚留人工裁决正是协议声明过的意图；且本仓当前在途变更（仅本条）无该形态。放弃的方案：a) 只删 rejected 幽灵分支、needsWait 判定改为 `typeof === 'string'` 内联不提取——判定逻辑与返回值契约耦合，留在 flow.js 下次契约变化还会漂移，提取到产出方单一源同文件才闭环；b) needsWait 时阻断收口（exit 非零）——把「留人工裁决」做成硬阻断违背原设计语义（升厚后厚档流程本身就是人工裁决通道，archive 子步仍执行），且在途半态会卡死在 distill。

## D-unmapped-440@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-closeout-roundtrip-slim
原编号：D-001@v1
锚点：未记录
最近确认：b9465ed66e9234973861e4ee6f3ce6ea1b2f3c1c
理由：- 风险1：垃圾串碰巧含 ≥7 位 hex 词元（如分支名 f3182244fix）被误放行。对策：词元须独立（正则边界），且误放行后果有限——reviewedAgainst 仅作溯源锚不作门禁比对（实测今晚流程：校验器只查形态）；可接受。 - 风险2：文案指引被滥用于自己的未提交交付（走③逃避提交）。对策：指引句显式限定「非本变更交付面」，且①仍是首选项排序；阻断语义与缺口留痕（acceptDirtyGap 计数入档）不变；可接受。 - 死路：考虑过把注记直接写回文件归一化——放弃：校验器只读铁律（写回会破坏代理原稿审计面），内存归一化已满足消费方（telemetry/回填读取）需求。

## D-unmapped-441@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-review-rerun-scope
原编号：D-001@v1
锚点：未记录
最近确认：ecc9d4b66c9eddfb87670f0b7dfc0b82170ecd2f
理由：- 风险1：回执过期（ledger 后源码又变）——review 子步在 patch 冻结后、源码面已定；且口径节要求「抽验复核」非盲信回执；可接受。 - 风险2：口径节被派发缩编丢弃——任务书已含「原样复制」纪律行，口径节属于任务书本体；可接受。 - 死路：考虑过让 ledger 直接把回执写进 change 目录（评审员必读面）——放弃：verify-runs 已是既定留档位，复制第二份成双源；材料包注入即可达评审员。
