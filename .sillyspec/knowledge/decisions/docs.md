# 决策知识 — docs

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-unmapped-156@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-task-review-retire
原编号：D-001@v1
锚点：未记录
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5
理由：最大风险：手动勾选引入假勾面（agent 未做即勾/顺手全勾）。缓解：detectExecuteBatchFinish 内 checkExecuteCodeEvidence 代码证据核验仍在 execute 收口跑（勾了但无 base..HEAD diff 证据→批量完成不成立、阻塞暴露）+ verify 阶段测试对账门禁不变（实测失败阻断收口）+ verify 逐项检查任务步仍只读对照勾选态。放弃的方案：①只加豁免不退役——前置变更已做，R18 实证豁免后仍留 5/15 形式拦截摩擦且「可豁免的门」诱导表演；②连 task-review.js 模块一起删——放弃，历史归档 doctor/回放兼容读侧依赖其导出（validateTaskReviews 等），review write/backfill-reviews 命令仍引用；③保留 Task Review 门但只对 independent tier 生效——放弃，tier 分级在 Stage Review 层已有，任务粒度无独立评审者供给时该门只剩形式校验（R18 实证）。

## D-unmapped-211@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-docs-gate-zero
原编号：D-001@v1
锚点：未记录
最近确认：d4ecab684a9e2410bbb291531f63b130f756dbfc
理由：最大风险：repo:// 转换后本仓 docs gate 与 sillyhub 仓漂移耦合——hub 侧后续演进使已转换引用失效时，配置了映射的设备上本仓推送被 gate 拦。这是 ratchet 的设计内语义（279→0 的清偿本身证明引用当前全部有效；失效即可见即修），未配映射设备零影响。 弃案：① local.yaml skip 藏数——与「真欠账清零」相反，且 local.yaml 是 gitignored 机器配置不随仓传播，他设备失效数反弹；② doc_type: snapshot 豁免——这批是活文档（spec 主场文档），冻结语义失真且豁免面随文档新增不可控；③ 让 docs-check 支持裸路径跨仓自动解析——引入路径猜测歧义（本仓与目标仓存在大量同名 router.py/service.py，预演实测 service.py 86 候选/router.py 86 候选），repo:// 显式前缀正是为消歧而设的既有机制，不应绕过。

## D-unmapped-219@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-doc-anchor-refresh
原编号：D-001@v1
锚点：未记录
最近确认：e366c3aa66c0c3aae4cd8ee267cd90ed8ca581c2
理由：已知取舍：锚点对齐的是含并行 WIP 的工作区实态——若对方最终放弃该 WIP 回退，锚点将反向漂移 -6（届时再刷一次即可，doc-ref-check 会拦）。声明边界：这是对共享门禁的前向修复（钩子指引「修复问题后再提交」），非对并行会话工作的归属认领。

## D-unmapped-224@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-anchor-triggerpull
原编号：D-001@v1
锚点：未记录
最近确认：c172c36ae2f3bba93853424276a0b7d255b74fd2
理由：最大风险：锚在窗内但语义漂移（行号指向了别的 triggerPull 出现处）——已核对 4232/4235 均为「const { triggerPull } = await import」目标语句。试过放弃：锚 4232 精确贴 HEAD（否决——并行提交后工作树校验窗又一轮漂）。

## D-unmapped-256@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-archive-stage-claim
原编号：D-001@v1
锚点：未记录
最近确认：04fcb08208bc2ed0a411e8c9d69d1cbc35b75ecf
理由：最大风险：告警面打扰——add 失败从静默变告警，若失败高频（如持续锁竞争）会重复提示。可接受：假成功比告警贵（实测已付出一笔手工补提交）；告警自带兜底指引可执行。 放弃的方案：①让 safeGit 失败时抛错（改公共错误语义）——放弃，影响全部调用方，超本变更刀口；②失败时自动重试 add——放弃，锁竞争类失败的重试时序不可控（此前已实证 add 竞态即现即逝），诚实暴露 + 人工重跑更稳。

## D-unmapped-282@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-explore-knowledge-graph
原编号：D-001@v1
锚点：未记录
最近确认：16db850f0b8916acec0ecc26383b269a191fd0f3
理由：最大风险：旧项目无 knowledge graph 能力（sillyspec < 3.33 未装图命令）时 explore prompt 指引落空——agent 跑命令报 unknown subcommand 后自然回退 rg 考古（fail-soft，无阻断面）；后续 init 升级即补齐。接受：指引措辞是「优先」非「必须」。放弃的方案：把 graph 查询做成 explore 独立步骤（--wait 流程化）——弃，explore 的价值恰在无结构自由姿态，流程化会把思考伙伴变成向导机；在 CLI 侧为 explore 注入图预取数据（{GRAPH_FACTS} 占位符）——弃，探索话题不可预知，全量注入是浪费且复刻知识注入面已有的活。

## D-unmapped-285@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-explore-arsenal-map
原编号：D-001@v1
锚点：未记录
最近确认：61bf5923b9cb4e3826834ecfaceee0a09cb49622
理由：最大风险：映射行内塞多命令（关系面一行含 impact/neighbors/path/summary 四命令）信息密度高——单行过长可能被 agent 扫读跳过。缓解：行内用顿号分层（主命令 impact 打头、推理链与健康度退居从句）；钉子测试锚串保证四命令不丢。旧版 CLI（<3.33）项目跑新兵器命令报 unknown subcommand 自然回退 rg（fail-soft，与 graph 兵器同款既裁边界）。放弃的方案：兵器逐条加操作项（search/status 各一项）——弃，清单会回到 9 项且场景与兵器割裂；CLI 侧预取注入（{ARSENAL_FACTS} 类占位符）——弃，探索话题不可预知，全量预取浪费且复刻知识注入面。

## D-unmapped-299@v1 收割器机器自动拆 rejected 条目
状态：rejected
变更：2026-10-09-rejected-write-side
原编号：D-002@v1
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——拆条留在 agent 侧（D-001 路线）
否决理由：收割器是纯机械转写器，判不了「放弃方案」分界；槽4 模板问题文本每变更一字不差，照抄进条目零检索价值
复潮条件：槽4 作答先结构化（如模板化字段）使「放弃方案」出现可稳定解析的机械判据时可复潮

## D-unmapped-300@v1 distill 侧从 confirmed 散文解析死路自动拆条
状态：rejected
变更：2026-10-09-rejected-write-side
原编号：D-003@v1
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——语义判断后移到无 LLM 的层是更差的位置
否决理由：把语义判断后移到无 LLM 的纯函数层，散文「放弃方案①②③」形态解析脆弱，误拆漏拆都无兜底
复潮条件：decisions.md 作答全面结构化后（拆条在写侧完成成为前提），蒸馏层才有机械判据——彼时本方案反而无必要

## D-unmapped-301@v1 只修厚道不动轻量道
状态：rejected
变更：2026-10-09-rejected-write-side
原编号：D-004@v1
锚点：未记录
最近确认：201c1c14d7319d6b00ca9f305d4cf95eeb7d2336
理由：不采用——两道同修
否决理由：两道死路埋法同构（轻量收割模板必然埋散文），只修一半防复潮覆盖减半且 agent 行为指引不一致
复潮条件：轻量道废弃或槽4 收割机制下线时本裁定点自然消失

## D-unmapped-306@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-init-full-injection
原编号：D-001@v1
锚点：未记录
最近确认：ea9b0242d28e68b1eb7c5b070ee9b5c29a31326d
理由：最大风险：追加态受管块从 6 行变为全文（~45 行），升级整块替换时用户在块内编辑的改动会丢——标记已注明「勿手动编辑此段」，与原方案 R-04 同性质，只是受管面变大；块外用户内容仍字节保留。放弃方案：①继续小段追加（用户否决——agent 拿不到流程规则，注入形同虚设）；②gemini/opencode 改 @AGENTS.md 指针（两家对 @ 导入语法支持未验证，2026-08-02 变更已留注，不在本变更扩面）。

## D-unmapped-319@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-11-resurrect-guard-verify-hardening
原编号：D-001@v1
锚点：未记录
最近确认：9495da3e50a08a426fc6de415853ca534f1f984a
理由：答：最大风险是幽灵守卫误拦「归档后重开」的合法同名变更——用「库内有活跃行即放行」消解（test 用例②钉住）。fail-open 语义分两层：外层守卫异常 fail-open 不阻断正常流程；内层库列举失败按无活跃行处置（fail-closed 保守向，评审 P2-2 修正披露）——误拦合法重开的代价是重跑一次，漏放幽灵的代价是幽灵行推上平台，两害取其轻。死路（试过放弃）：doctor 侧建议 --align-execute-progress 给幽灵补戳——等于给幽灵态背书，放弃（只报不治 + 显式勿用警示）；对账锚直接用 HEAD 短路 mb==HEAD 形态——会把 in-place 主分支形态的 diff 面清空，放弃（三重守卫保守退旧区间，只窄不宽）。

## D-unmapped-324@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-cross-wt-ghost-cleanup
原编号：D-001@v1
锚点：未记录
最近确认：abb6f86c77aa42200d03f32edb82c31380d869f1
理由：最大风险：归档链新增跨仓兜底扩大了归档时的作用面——若 local.yaml 注册了路径失效的仓，归档会多出警告噪音（不阻断）。缓解：兜底对仓不可达/git 失败一律 fail-open 警告；清理对象仅限本变更名下可寻址的跨仓 worktree。 试过但放弃的方案： - 「归档链直接对 repos 各仓无条件 prune」——放弃：会把与 sillyspec 无关的用户自建 worktree 注册也纳入归档动作面，作用域过宽；收敛为只清本变更名下可寻址项 + doctor 提供全仓扫描（doctor 是显式诊断入口，作用面宽可接受，归档是热路径必须窄）。 - 「cleanupCrossWorktrees 里对 locked 条目自动 unlock 后强清」——放弃：locked 是用户显式保护（跨盘挂载场景防误删），自动解除违背保护意图；只提示，用户裁决。 - 「给 listCrossWorktreeMetas 增加无 meta 兜底枚举（目录已删也入列）」——放弃：迭代源三源都靠 meta/注册表键寻址，目录已删且键已回收时无锚可举；该形态只能从跨仓仓注册面反扫（doctor），与其在 cleanup 链加不可能完备的枚举，不如把 doctor 网做实。

## D-unmapped-331@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-fire-dogfood-retrospective
原编号：D-001@v1
锚点：未记录
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4
理由：最大风险：快照数据的时效性——仓内后续修复会让对照表中的「待立项」项过时。缓解：文末标注冻结时点；遗留项有明确归属（本仓待立项 vs 平台仓），过时是快照本性（R16 同款，已接受）。 试过但放弃：①把报告做成活文档（不 skip、持续追锚）——行号锚维护成本高且复盘数据本身是时点快照，与活文档语义矛盾；②数据全部内联进 knowledge 蒸馏——distill 面适合结论不适合校准数据表，报告 + 文末回溯指引更合适。

## D-unmapped-343@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-proto-reuse-register
原编号：D-001@v1
锚点：未记录
最近确认：1e191cfeb5a1d0b75177790172f07ea7386964e2
理由：- 风险1：agent 登记复用时复制了但改名不规范（保留中文原名）→ execute 不注入。对策：分级文本把命名写成硬要求 + design-facts 清单复核命名 + gates 软提醒兜底（目录无 prototype-*.html 即响）。 - 风险2：既有原型只覆盖部分 UI 面（如只覆盖 PC 无小程序）。裁决：覆盖面声明必须如实写，未覆盖部分仍按「必须生成」产出增量原型；变更目录本就允许多个 prototype-*.html 共存，execute 注入支持多文件。 - 死路：考虑过让 gates 硬校验 design.md 中「复用声明」的格式——放弃：复用声明是自由文本，硬校验只会催生占位应付，软提醒+自审清单已与「跳过原因」同等强度，够了。

## D-unmapped-348@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-proto-real-code
原编号：D-001@v1
锚点：未记录
最近确认：0c335da4c6c120874b3504d7b1cbaf6155067708
理由：- 风险1：真码要求抬高 brainstorm 产出成本，粗选场景被过度工程化。对策：明确手绘单文件在粗选/对比场景合法（explore 全程合法、brainstorm 粗选合法），只有定稿须真码。 - 风险2：无前端工程的项目（纯静态站）被误伤。对策：单文件 HTML 方言例外显式写明。 - 风险3：无 HTML 运行面的平台（小程序原生）无法满足。对策：降级声明+用户裁决留痕出路，与既有「UI 视觉证据」探针 error 门（ui-visual.js）同机制衔接，不新造门。 - 死路：考虑过在 gates.js 加「原型文件不含项目组件引用即 warn」的内容嗅探——放弃：嗅探需解析任意方言 HTML/JSX，误判面大且仓中立不可行；关键词同源测试已把两处规则源锁定，语义执法留给收口探针与独立评审。

## D-unmapped-351@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-autocreate-atomic-claim
原编号：D-001@v1
锚点：未记录
最近确认：567661aa06918db579ea7e0f2d25e9effa4462f8
理由：最大风险：db.js transaction 的 BUSY 重试若不整体重跑 fn（只重试语句），跨进程快照过期时守卫可能读到旧快照——已核对 db.js 注释「BUSY 重试收敛在 DB 层 transaction 封装」（重跑 fn），且单语句本身在写锁下排队，双重保险；真并发竞争测试（双进程同秒 spawn）确定性不足（胜负调度随机），不作为测试断言面，以单语句原子性+守卫行为单测为契约锚。 放弃的方案：①「先 initChange 再检查删行回滚」——回滚本身又与对方提交竞态，且留下已写 stages/目录的清理面；②「文件锁串行化自动建名」——引入新锁文件与清理生命周期，复杂度不成比例；③只修 command.js 顺序（先算名再 listChanges 再 initChange）——仍是两步，竞态窗口依旧。

## D-unmapped-362@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-scale-large-evidence
原编号：D-001@v1
锚点：未记录
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6
理由：最大风险：指引是软约束——agent 仍可能「自信地判错」（写出形式化的 Wave 证据话术而非真实并行分析），反判据只提高误判成本不根除。这是指引面的天然边界；硬面方案（如 CLI 校验 large 必须附 Wave 证据节、否则拒绝 --done）会引入新的 schema 门与存量不兼容，且「真并行/吃不下」本质是语义判断，机器校验只能查形不能查质——留作后续实证后再议。放弃的方案：① 把 large 判定从 agent 手里收走改纯机械规则（文件数/任务数轴）——2026-09-29-brainstorm-exit-thin-default 已实证文件数轴测错轴，复杂度/上下文轴必须留判断力；② 出口分叉处（complete.js）对 large 追问二次确认——收口时点已过设计期，追问只是把同一判断再问一遍，不增信息量。

## D-unmapped-366@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-brainstorm-auto-retire
原编号：D-001@v1
锚点：未记录
最近确认：b9b72ee1e85b0c5000a535974b2dc688013bebe3
理由：- 风险1：存量 auto 表在途变更被硬拦收不了口。对策：报错给两条出路（--reset 重种主模式 8 步表 / doctor 诊断）；auto 道为机器接口模式，存量面极小，明确报错优于数据丢失。 - 风险2：删测试文件（auto-dualtrack 等）被误读为「删测试保绿」。对策：删除的是被删功能的专属测试（测的就是 auto 表机制本身）；退役行为有新测试补位（FR-04），全量其余零失败。 - 死路：考虑过保留 4 步表定义仅为存量变更服务（不删文件只摘路由）——放弃：自动道盲区仍在、双轨机制仍在，删除不彻底等于没删；存量面用退役检测+指引承接足够。

## D-unmapped-396@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-brainstorm-interaction-refine
原编号：D-001@v1
锚点：未记录
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f
理由：- **最大风险：prompt 指令的遵循度不可机械验证**。本变更落的是"要求 agent 怎么做"，不是"CLI 拦不拦"。若 agent 不照做，测试仍会绿（测的是 prompt 产物面）。缓解：①措辞与既有铁律同风格（短、可判定、放决策点附近），避免被长文稀释；②七条要求里五条与已有机械面挂钩（决策落盘 API、review.json 的 reviewerNotes 会被 gate 读、Stage Review Gate 的阶段清单）——不照做会在后续门禁或评审中暴露。 - **次风险：与既有"一次只问一个"规则的表观冲突**。FR-03 允许 P1/P2 攒一轮问完，必须在 prompt 里显式写清分层（P0 逐轮、P1/P2 收尾一轮），否则 agent 会按错误的一侧执行。这是实现阶段要逐字核对的第一处。 - **第三风险：体积膨胀**。brainstorm 已经是仓内最长的阶段定义，加文本会推高每轮 token（该文件 567 行附近有"每轮全量回放是 token 膨胀主源"的历史教训）。缓解：四处新增合计控制在 60 行以内，且**不复制**四件套模板（仍由 CLI 落盘）。 - **既有测试回归面**：`test/brainstorm-exit-thin-default.test.mjs`、`test/brainstorm-plan-contract.test.mjs`、`test/prompt-placeholders.test.mjs` 可能对 brainstorm prompt 做字面断言。实现前先读这三支测试，确认新增文本不撞既有断言；若撞的是"整段等值"型断言则属测试面过紧、需按项目规范评估（不修改测试语义的前提下调整）。 - **放弃的方案**： - *用 review.json 新字段承载 builder 问题清单*：需要改 `validateStageReviewSchema` 与 gate 消费面，成本与风险均高于收益；reviewerNotes 是自由文本且已被 gate 读取，够用。 - *新增阶段级"逃逸口对照表"文件或独立步骤*：违反"不新增步骤"的变更边界，且对照表只服务一处步骤，阶段级文件会变成无人维护的死文档。 - *把分块回放做成 CLI 强制的输出模板（机械校验每轮必须含回放块）*：需要给步骤加输出结构校验，属状态机改动；且回放的"块"边界是语义判断，机械校验只会逼出占位式回放（合规但不解决问题）。 - **收口时已存在的无关失败（须如实声明，不属本变更回归）**：`test/doc-ref-check.test.mjs` 5 处失效锚（`docs/sillyspec/platform-interface-map.md:L137/139/140/142/200` 引用 `index.js:4563/4484/4436/4222/4320`）在本次改动前即存在——HEAD 版本 `src/index.js` 中 `triggerPull` 实际出现在 2932/2933/3166 等行，与文档锚定的行号窗口早已漂移；本变更未触及 `src/index.js`、`docs/sillyspec/platform-interface-map.md` 或任何锚目标。实测证据：单独运行该测试 5 处失效项均不含 `brainstorm`/`interaction-refine` 字样。 - **收口处置（清偿而非豁免）**：该失败被收口实测门计入本变更批面（89 文件并集含它）导致整单 FAIL，并触发自动升厚（tier=thick）。已按测试自带修复指引（"行号漂移 → 更新文档行号到当前源码"）同步 5 处锚 + 2 处同批次级锚（`shared.js:1120→1118`、`probe.js:133→137`），doc-ref-check 93/93 通过；根因如实记入本条并随修复同批提交，避免留成无人认领的红灯。

## D-unmapped-410@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-spec-sync-fail-alarm
原编号：D-001@v1
锚点：未记录
最近确认：fe09540bcda6e0ea2282ab7603293e2fd4b51e38
理由：最大风险：连接类抖动（网络闪断）也计入 streak，可能对偶发网络故障打出 🚨 造成「狼来了」——接受此取舍，因为 🚨 文案明确指向「平台文件树持续落后」的语义，偶发抖动在任一次成功后即清零，不会长期挂红。试过但放弃的方案：①把告警接到平台侧（webhook/站内信）——平台侧正是故障方，自己通知自己不可靠；②只在 4xx 业务态计数、连接类不计——连接类失败同样造成文件树落后半态（平台长时间不可达），漏报比误报代价高；③复用 sync-noise 静音窗——静音窗会吞掉升级告警本身，与目标相反。

## D-unmapped-421@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-init-drop-gemini-opencode
原编号：D-001@v1
锚点：未记录
最近确认：9a01342aa41bd725098f810dcf742c0d64562846
理由：最大风险：Gemini CLI 用户选中 gemini 后 AGENTS.md 不被其自动加载（该 CLI 现默认 GEMINI.md），规则「看得见但没生效」——缓解：file-lifecycle 明写边界与自行引用办法；相比继续生成 GEMINI.md，这是用户明确要求的取舍。放弃的方案：①连同 gemini/opencode 工具类型一起下线（初版方案）——用户澄清否决，类型要保留；②选中 gemini/opencode 时什么都不生成——工具类型变成空壳选项（gemini 无 skills 目录，选中即零产物），AGENTS.md 落点至少保留规则源与 opencode 的原生加载；③保留 injectInstructions 但改成写 AGENTS.md——绕一圈等价于方案②的扩用，徒留死代码。

## D-unmapped-434@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-cli-worktree-cwd-anchor
原编号：D-001@v1
锚点：未记录
最近确认：4e1a9d8b27367df8463445297e52dfc39e5dd5c6
理由：最大风险：锚定静默改变「agent 以为在 worktree 跑」的预期——缓解：警告恒输出（stderr 四行，含原 cwd 与锚定目标，agent 可见可纠偏）；逃生门整行照贴保留刻意独立实例路径。次风险：平台 daemon 在 worktree 模式下 spawn CLI 且 cwd=worktree（若存在此形态）被意外锚定——排查：wt-commit 已豁免（子代理 workdir 形态）；daemon 平台模式 specRoot 异位不经本守卫路径段。放弃的方案：①维持硬拦只加更多指引文案（生产实证指引已够清楚，痛点在来回本身）；②按 SILLYSPEC_SESSION_ID/env 锚定主仓（坑文提及的锚点族）——session env 是多会话共享值不标识仓根，路径结构锚点（mainRepoRoot）已完备，env 锚点对 worktree 场景无增益。

## D-unmapped-436@v1 存量 40+ 种散值 type 追溯清洗归档件
状态：rejected
变更：2026-10-20-decision-caliber-unify
原编号：D-002@v1
锚点：未记录
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71
理由：是否把历史手写散值条目（risk/term/premise/design 等）批量迁移为正典值？
否决理由：归档件是审计事实当时提名不追改（仓则）；散值条目本就解析保留不入选，清洗零收益且蒸馏行为难保零漂移，大面积改写归档件风险无限大
复潮条件：知识库检索对散值条目产生真实召回需求且可证明增量收益时（须先出干跑对照）
