---
author: zcode-pascap-batchA
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-pass-cap-semantics
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条；幂等按 D-xxx@vN 判重。
     复潮条目沿用原决策编号 @vN+1 并注明 supersedes 源（decisions 路由规则）。

<!-- 背景（本变更动机，2026-09-15 EHS 生产会话复盘实证）：verify 结论 PASS WITH NOTES 出门时，
     集成测试未跑（环境阻断）、三端联调人工验收、fix.sql 未执行三个已知未验证区全在——被 NOTES
     语义吸收而非阻断；随后人工深查发现 5 个 P1（含「相关方支线三端均不可用」），用户实测又连续
     撞出 4 类逃逸。根因：已知未验证区没有阻断语义。本变更 = 防复发五层方案的批次 A（语义层 +
     配套门眼睛修复 + fix.sql 声明门）。 -->

## D-001@v1: PASS 资格事实面封顶——与 risk_level 解耦
- type: architecture
- status: accepted
- 问题: 现行证据门 `requiresEvidence = PASS || (NOTES && !explicit)`（stage-contract.js:649）只管「要不要集成证据」；「能不能写 PASS」没有任何事实面条件——集成未跑、handover 在场、db 脚本未执行、验收矩阵 partial，四类已知未验证区与 PASS 并存不报错（EHS 实证：三条 compile+单测 log 当集成回执放行，PASS WITH NOTES 出门，5 P1 逃逸）。
- 选定: 新增事实面封顶规则，与 risk_level **完全解耦**：结论=PASS 时校验四个事实条件**全部不成立**，任一成立 ⇒ error（指引：改写 PASS WITH NOTES + 补结构化 handover）：
  ① 集成实测未跑（判定口径见 D-006）；② verify-result 存在有效 handover 行；③ apply 文件集含未声明执行的 `db/*.sql`（见 D-007）；④ probe7 矩阵存在 partial/uncovered 行且 handover 零有效行（见 D-003）。
  「要不要集成证据」维持 risk_level 分层不变——explicit + unit-sufficient 降级的误伤逃生通道保留（见 D-002）。
- alternatives: B 裸拦 partial/uncovered（否决——有合法 handover 的变更被误伤拖死）；C 只加提示语（否决——EHS 实证 agent「如实填不涉及」照样出门，提示语无阻断力）。
- normalized_requirement: 结论=PASS ⇒ ①集成实测已跑 ②handover 零有效行 ③无未声明 db/*.sql ④矩阵无 partial/uncovered（或对应 handover 存在，见 D-003 口径）四条同时成立，否则 verify gate error。
- impacts: [FR-1, FR-3, verify-validator]
- evidence: stage-contract.js:612-691（结论分支与 requiresEvidence）、verify-probes.js:1618-1627（handover 解析现状 advisory）、EHS 会话导出复盘（2026-09-15，verify L3184/L3207-3220 移交项与 PASS 并存）
- 故障面: 事实条件误判把真实验证过的变更拦在 PASS 外——判定口径收窄在 D-006（module/evidence-auto 子集=跑过）；被拦时的出路是降级 NOTES（不算失败），摩擦可控。
- 退役判据: 若结论枚举未来重构出 CONDITIONAL 独立档位，本封顶并入彼处统一承载。

## D-002@v1: risk_level 显式豁免洞分层封死 + 集成回执口径收紧
- type: architecture
- status: accepted
- 问题: stage-contract.js:646-652——design frontmatter 显式声明 risk_level 后，PASS WITH NOTES 完全绕过集成证据门（「explicit + NOTES 视为对残留项的诚实声明」）。同时 EHS 实证暴露回执口径漏洞：mvn compile + JUnitCore 纯单测的三条 log 通过了集成回执四条件校验——**单测/编译类回执被当成集成实测**。
- 选定: ① explicit + 降级 unit-sufficient：维持不要求集成证据（关键词误伤逃生保留）；② explicit 且仍 integration/deployment-critical：NOTES 不再免证据，除非缺口由结构化 handover 行承载；③ 集成回执口径：回执内容属编译/纯单测（无跨层调用证据）不计入「集成实测已跑」（判定表见 D-006）。
- alternatives: 全封 explicit 豁免（否决——关键词误伤的 docs/prompt 类变更会被拖进集成证据要求）。
- normalized_requirement: explicit 且 level∈{integration-critical, deployment-critical} 时，NOTES 必须携带结构化 handover 或齐全集成证据，二选一；编译/单测回执不满足「集成实测已跑」。
- impacts: [FR-1, FR-2]
- evidence: stage-contract.js:646-652、change-risk-profile.js:398-429（auditRuntimeReceipt 四条件——只验 log 形态不验内容层次）
- 故障面: 「跨层调用证据」的机械判定可能假阴（如集成脚本名不带关键词）——判定表用「回执命令来源」而非日志内容猜测，见 D-006。
- 退役判据: smoke 金路径落地（批次 C）后，「集成实测已跑」改由 smoke 回执判定，本条口径表并入彼处。

## D-003@v1: probe7 partial/uncovered 联动 handover——存在性门槛起步
- type: consistency
- status: accepted
- 问题: validateAcceptanceMatrix（stage-contract.js:833-880）只拦 unfilled/缺锚点；partial/uncovered 是合法填值不进任何阻断——FR「部分实现」静默带过（EHS：FR-01/12/13/15 四条 partial 出门）。
- 选定: 矩阵存在 partial/uncovered 行：handover 零有效行 ⇒ error（「部分实现必须有移交去向」）；有 ⇒ 放行但 D-001 封顶 NOTES。**逐行关联**（验收项 ID ↔ handover 条目文本）第一版做 advisory 攒实证，不做硬门（措辞差异假红风险）。
- alternatives: 逐行强关联硬门（否决——handover 条目自由文本，正则关联假阴/假红不可控）。
- normalized_requirement: 矩阵含 partial/uncovered ⇒ 「## 移交项（结构化）」至少一行有效行，否则 verify gate error。
- impacts: [FR-1, FR-4]
- evidence: stage-contract.js:833-880、verify-probes.js:1569-1594（parseHandoverRows 已产出 facts.handover）
- 故障面: handover 成为万能逃生门——由 D-005 互锁与 archive 注入约束。
- 退役判据: 逐行关联 advisory 攒满一轮实证且假红率可接受后升硬门。

## D-004@v1: Runtime Evidence「不涉及」纳入事实面 + 提示语补降级路径
- type: consistency
- status: accepted
- 问题: verify-result「## Runtime Evidence [层：人工判断]」（verify-probes.js:1900）允许 agent 自声明「服务端点不涉及（服务未启动）」——integration-critical 变更的运行时缺口以诚实申报形态蒸发（EHS 实证）。
- 选定: ① integration/deployment-critical + Runtime Evidence 服务端点行=不涉及 + 无对应 handover ⇒ 计入 D-001 事实面封顶；② 骨架该节注释补降级路径提示：「服务起不来时：Controller 直调冒烟（mock 下游）/ 基础设施恢复后复跑固化用例——不要空填不涉及」。
- alternatives: 只加提示语（否决——无阻断力，D-001 已论证）。
- normalized_requirement: integration-critical 变更 Runtime Evidence 端点行不得以「不涉及」自声明免检，须真实回执或 handover 承载。
- impacts: [FR-1, FR-2, verify-prompt]
- evidence: verify-probes.js:1900（骨架渲染）、EHS 会话 verify-result Runtime Evidence「不涉及（服务实例未在本机启动）」行
- 故障面: 「不涉及」行文识别过宽误伤纯库类变更——判定限定在判级 integration/deployment-critical 的变更内。
- 退役判据: 批次 C smoke 回执落地后，端点行由 smoke 回执机械填充，人工声明面收敛。

## D-005@v1: handover 防滥用——db-script 互锁 + archive 确认注入
- type: architecture
- status: accepted
- 问题: D-001/D-003 以 handover 为封顶枢纽后，随手写一行 handover 即可 NOTES 出门——handover 会退化为新的万能 NOTES。
- 选定: ① 类型互锁：`db-script` 类 handover 行与 D-007 声明门互锁——写了 db-script handover = 承认未执行 ⇒ 触发封顶且 apply/--confirm 侧拦截；② archive Step 3 用户确认 prompt 注入 facts.handover 清单（移交项全貌在审批点可见，不阻断）。
- alternatives: handover 行强制 owner/期限字段（暂缓——字段膨胀，先用类型互锁 + 可见性兜住）。
- normalized_requirement: db-script 类 handover 与 fix.sql 声明互斥不可同真；archive --confirm 前用户可见全部 handover 条目。
- impacts: [FR-5, FR-6, archive-prompt]
- evidence: verify-probes.js:1569-1594（类型枚举 env-blocked/manual-acceptance/db-script/other 已在）、run/archive 阶段 Step3 确认点
- 故障面: archive 注入清单过长刷屏——条目数封顶渲染 + 完整清单指路 facts.json。
- 退役判据: handover 若未来升级为独立跟踪实体（复跑任务队列），互锁与注入并入彼处。

## D-006@v1: 「集成实测已跑」判定口径表
- type: architecture
- status: accepted
- 问题: D-001/D-002 依赖「集成实测未跑」这一事实判定，但口径不定会两头翻车：过宽误伤（module 档跑过子集被当未跑）、过窄放过（compile+单测 log 被当集成——EHS 实证翻车点）。
- 选定: 判定表（按证据来源，不做日志内容猜测）：
  - **已跑**：verify-quality-scan 实测记录（commands.test 实跑且 test_strategy∈{full, module, evidence-auto}）；回执槽 runtimeEvidence 中命令来源含跨层调用（起服务/HTTP/进程对进程）的条目；smoke 回执（批次 C 落地后）。
  - **未跑**：test_strategy=skip；无任何实测记录；回执仅 compile/lint/纯单测（JUnitCore 直跑单测类）来源。
  - **不算也不拦**：evidence-auto 降级 module 已跑子集 = 按 module 档算已跑。
- normalized_requirement: 「集成实测已跑」=存在 quality-scan 实测记录（skip 除外）或跨层回执条目；compile/lint/纯单测回执不构成。
- impacts: [FR-1, FR-2]
- evidence: src/run/verify-quality-scan.js:59-112（指纹与实测记录形态）、EHS 三条 log（compile.log/junit-engine.log/junit-regression.log）
- 故障面: 「跨层调用」按命令来源判定的启发式可能漏标新形态命令——留 escape：变更可在 design frontmatter 声明等效验证先例（verify_precedents 同思想）。
- 退役判据: 批次 C commands.smoke 落地后由 smoke 回执一票判定。

## D-007@v1: fix.sql 声明门（apply/archive-confirm 侧，零连库）
- type: architecture
- status: accepted
- 问题: h1 缺陷修复配套的 `2026-09-15-rp-fix.sql`（先库后码同批部署）只是 verify-result 移交项 notes，无任何机器门——用户手测第一张保存即撞 `Field 'rp_number' doesn't have a default value`。
- 选定: apply 文件集含 `db/*.sql`（fix/迁移脚本）时：要求 verify-result 回执/声明段含「已对目标库执行」条目（引用文件名），否则 apply 与 archive --confirm 阻断。纯文件集 + 文本声明对账，**不连库**（information_schema 实测为后续独立决策）。声明形态复用回执槽（log 路径可选——有则走四条件校验，无则至少声明行）。
- alternatives: 连库实测 information_schema（否决本批——local.yaml 无 database 配置段，新配置面+跨平台客户端属大工作量，留批次后续）。
- normalized_requirement: apply 集 ∩ db/*.sql ⊆ 已声明执行集，否则阻断。
- impacts: [FR-5, apply-gate, archive-gate]
- evidence: worktree-apply.js:1175 起（apply 尾声/manifest 写盘点）、EHS fix.sql 移交项逃逸实证
- 故障面: 声明造假（写了「已执行」实际没执行）——本门定位是「防遗忘」非「防伪造」；连库实测档补齐后闭环。
- 退役判据: information_schema 实测档落地后降级为兜底。

## D-008@v1: 配套四小修——把门的眼睛修好（与语义同批）
- type: consistency
- status: accepted
- 问题: 语义收紧了但门自身半盲会留半盲窗口：① test_strategy: skip 只短路主仓，跨仓仍无条件跑（fallback npm test 假败，EHS 打回一次）；② 跨仓 task 官方通道（手写+backfill --adopt）的 tasks.md checkbox 断链（writtenBy 白名单不含 adopt + 零 diff 守卫只看主仓 diff，complete.js:1072/1091）；③ probe7 测试文件内容读取只有 cwd→wtRoot 双根，跨仓测试文件命中恒空恒预填 partial（verify-probes.js:864-874）；④ design 清单无「## <repo> 仓变更」段头时仍按主仓根核，跨仓「修改」条目被逼 NEW: 前缀（design-facts.js:461-468 残留）。
- 选定: ① skip 语义：skip 短路主仓 + **无自配 commands.test 的跨仓**；跨仓自配了 test 的仍跑；跨仓 own local.yaml 提供单独 skip 通道；② adopt 勾选两层同修：isExplicitReviewWrite 白名单加 `adoptTaskReviewMechanics` + prefetchDiffFileSet 并跨仓 diff 源（复用 cross-repo-reconcile.js:94-106 双源）；③ buildAcceptanceHints 双根扩多根（含跨仓仓根）；④ design-facts 无段头时对含跨仓注册路径的清单行降 warning 提示补段头（不再逼 NEW:）。
- normalized_requirement: 四处各一句（skip 跨仓档位语义 / adopt 后勾选生效 / 跨仓测试内容可读 / 无段头不误逼 NEW:）。
- impacts: [FR-7, FR-8, FR-9, FR-10]
- evidence: verify-postcheck.js:1426/1445-1575、run/complete.js:1072/1091-1093/1013-1038、verify-probes.js:864-874、design-facts.js:449-486
- 故障面: skip 跨仓短路过宽会失明（跨仓有意义的空套件烟雾被跳过）——已按「自配 commands.test 仍跑」收窄。
- 退役判据: 跨仓对账全面接入 worktree diff 后，②的 diff 源统一收口。

## D-001@v2: PASS 资格事实面封顶——blocking 级口径与 facts 锚定输入（supersedes D-001@v1 的条件②与输入形态）
- type: architecture
- status: accepted
- source: user
- 问题: D-001@v1 两处需修正：①条件②「handover 有效行>0」一刀切会训练 agent **漏报移交项保 PASS**（防滥用只防「NOTES 洗 PASS」防不了「少写」）；②validator 内嵌四个 reader 各自解析 MD 会长成第二个 god-check，且条件③的「apply 文件集」在 verify 时点不存在（verify 先于 apply，manifest 未落盘）——时序 bug。
- 选定: 条件②改为「**blocking 级** handover 行>0」（severity 口径见 D-005@v2）；四个事实条件的生产全部走 facts 管线（producer 写 verify-facts.json，validator 退化为纯函数，见 D-011）；条件③ verify 时点源改 design 清单/worktree diff ∩ db/*.sql（见 D-012），apply 门退为兜底。
- normalized_requirement: 结论=PASS ⇒ ①集成实测已跑 ②blocking 级 handover 零行 ③无未声明 db/*.sql（verify 时点按声明面/diff 判）④矩阵无 partial/uncovered 或有移交去向——四条同时成立。
- impacts: [FR-1, FR-3, FR-4, verify-validator]
- evidence: 用户反馈轮（2026-09-17，D 形态与 G severity 建议）；本会话方案 A 选择轮
- 故障面: 同 v1（事实误判假红）+ severity 钻空面（见 D-005@v2 应对）。
- 退役判据: 同 v1（CONDITIONAL 档或批次 C smoke 统一判定面）。

## D-011@v1: facts 锚定纯函数实现纪律 + 双源 fail-closed
- type: architecture
- status: accepted
- source: user
- 问题: 封顶事实若由 validator 内嵌 reader 现解析 MD，批次 C 加条件要改 validator 本体，且与 checkProbeConsistency 的防篡改抽查不同源。
- 选定: 每个事实条件的 **producer** 把事实写进 verify-facts.json（先例：facts.handover、probe8 metrics）——`backfillFactsFromMdAndTests`（已接收 testCheckResult）写 facts.integrationRan/testExecuted，backfill 同段落写 facts.dbScriptDeclarations（MD 声明段解析）；validator（stage-contract）退化为纯函数 `eligible = conditions.every(...)` 消费 facts。**双源 fail-closed**：facts 快路径 + MD 锚点校验（并入 checkProbeConsistency 抽查面）；「管线本轮应写而 facts 缺失」= 篡改/故障 → 按条件触发处理拦下；「存量变更未跑过 --init 无 facts」→ 沿用 checkProbeConsistency 存量兼容 skip 口径，不误伤。
- normalized_requirement: 封顶事实唯一生产点 = facts 管线 producer；validator 零 MD 解析；facts 缺失区分「应写未写（拦）」与「存量未跑管线（兼容）」。
- impacts: [FR-1, verify-probes, verify-facts-schema]
- evidence: verify-probes.js:1596-1630（backfillFactsFromMdAndTests 形态——testCheckResult 入参已在）、checkProbeConsistency 存量兼容 skip 先例（verify-probes.js 头注释）
- 故障面: facts schema 加字段（additive）——verify-facts-schema 校验面同步登记，可选字段缺省不炸。
- 退役判据: facts 管线若整体重构为独立事实服务，本纪律并入彼处。

## D-012@v1: 事实③ verify 时点源修正——声明面/diff 判定，apply 门兜底
- type: architecture
- status: accepted
- source: agent（Grill 前自查）
- 问题: D-001@v1 条件③用「apply 文件集」为源，但 verify 先于 apply 执行，apply manifest 在 verify 时点不存在——条件恒空转。
- 选定: verify 时点事实③的文件集取 **design.md 文件清单（design-facts 已解析）∪ worktree changed files** ∩ `db/**/*.sql`，对账 `parseDbScriptDeclarations(verifyMd)`；worktree-apply 尾声与 archive --confirm 的声明门保留为**事后兜底**（覆盖 verify 之后新增 sql 文件的时序窗口，R-06 口径不变）。
- normalized_requirement: 事实③ verify 时点可判定（不依赖 apply 产物）；apply 门继续存在但定位为兜底。
- impacts: [FR-5, design-facts 复用]
- evidence: 流程时序（execute→verify→archive→apply）、worktree-apply.js manifest 写盘点 :1925
- 故障面: design 清单漏列 sql 文件 → verify 侧漏判——apply 兜底门按实际文件集拦截，双门互补。
- 退役判据: 若 apply 前置到 verify 内（流程重构），verify 侧改读 manifest。

## D-005@v2: handover severity 分层——防漏报与防滥用双面（supersedes D-005@v1 的类型一刀切口径）
- type: architecture
- status: accepted
- source: user
- 问题: D-001@v1 把「任何移交项在场」都当封顶条件，训练 agent 漏报移交项保 PASS（perverse incentive）——D-005@v1 的互锁只防「滥用 NOTES 洗 PASS」，防不了「少写」。
- 选定: 移交项表加 **severity 列**（blocking | advisory）：类型默认映射——db-script/env-blocked→blocking，manual-acceptance/other→advisory；agent 降级 blocking→advisory **必须带理由**（防「全标 advisory」钻空，理由进 checkProbeConsistency 抽查面）。封顶判定只数 blocking 行（D-001@v2 条件②）；advisory 行如实上报零惩罚、不触封顶、archive 注入可见（D-005①②互锁与注入语义不变）。`parseHandoverRows` 三列正则扩四列，**旧行缺省按类型映射**（存量三列表格零迁移兼容）。probe7 联动（D-003）口径不变：partial/uncovered 零 handover 行（任意级）仍 error——有 advisory 去向即合法，封顶与否由 blocking 决定。
- normalized_requirement: handover 行必含 severity（缺省按类型映射）；降级须理由；封顶只数 blocking。
- impacts: [FR-6, verify-probes 解析, 文档镜像]
- evidence: 用户反馈轮（2026-09-17 G 建议）；EHS 三移交项（集成复跑/联调/fix.sql）全属 blocking 级的实证——分层不削弱该案例
- 故障面: 降级理由造假——抽查面核理由非空且含依据锚点；漏报（整行不写）由机器算的①③④事实条件独立兜住，钻空面有界。
- 退役判据: 若 handover 升级为独立跟踪实体（批次 E 方向），severity 随迁。

## D-013@v1: Wave 步骤完成度门——execute 逐 Wave --done 校验本 Wave 任务全勾
- type: architecture
- status: accepted
- source: user
- question: 2026-09-17 本变更执行中实证：Wave 2 步骤在 task-02 未实现、checkbox 未勾、review 仍是 CLI 自动草稿（cannot_verify）的状态下被 `execute --done` 放行推进（review write 失败退出码被 shell 管道吞掉后 --done 落在下一 Wave 步）——现有防护（可选 `--step` 意图断言、60s 并发横幅）都拦不住「未完成 Wave 被标完成」。
- 选定: execute 阶段完成名为 `Wave N 执行` 的步骤时，**fail-closed 校验本 Wave 任务完成度**：先幂等跑 autoCheckPlanFromReviews（review pass 自动勾选），再解析 plan.md `## Wave N` 段的任务 ID，逐一核对 tasks.md checkbox——任一未勾 → error 列未勾清单 + 指引（补实现与 review write，或 `--reopen --from-step` 退回），exit 1 不推进。plan.md 无该 Wave 段（隐式 Wave/light 计划）→ warn 放行（fail-open，不破坏隐式串行语义）。落点：run/complete-handlers.js 新增 assertWaveTasksComplete（Wave 解析复用 stages/execute.js parseWavesFromPlan 动态 import），complete.js 标记 completed 前调用。
- 归并理由: 与 task-05 同改 run/complete.js——拆独立变更会跨变更撞 apply 面；且语义同族（「未完成不得标完成」是「未验证不得 PASS」的执行期孪生）。
- normalized_requirement: `Wave N 执行` 步骤 --done ⇒ plan.md Wave N 段内全部 task 的 tasks.md checkbox 已勾（经 autoCheck 幂等先行），否则 exit 1；无 Wave 段的计划 warn 放行。
- impacts: [FR-12, task-08]
- evidence: 本会话 2026-09-17 Wave2 越位实证（progress 显示 Wave 2 ✅ 而 task-02 checkbox 未勾）；src/run/complete.js:184-208（--step 可选断言）、:459-487（仅并发横幅）、:507（无条件标 completed）、:535-560（autoCheck 与批量检测在标完成后才跑）
- 故障面: ①任务确实完成但 checkbox 通道断裂（跨仓 adopt 勾选断链正是 task-05 要修的）→ 门会把人拦在 --done——错误文案给两条出路（修勾选通道 / --reopen），且 task-05 落地后断链消失；②plan.md Wave 段解析失败 → fail-open warn 不误伤（与隐式 Wave 语义共存）。
- 退役判据: 若 execute 迁移到任务级依赖图调度（逐任务推进取代 Wave 粗粒度），本门随 Wave 语义退役。

## D-010@v1: 事实面封顶采用集中式 validator（方案 A）
- type: architecture
- status: accepted
- source: user
- question: D-001 的事实面封顶在哪一层实现——A 集中式 validator / B 分散各产出点 / C 新增 CONDITIONAL 结论档。
- answer: 用户选 A——新增 `validatePassEligibility`（与 validateAcceptanceMatrix 同构注册进 verify validators），四个事实条件（集成未跑/handover 在场/db 脚本未声明/矩阵 partial 无 handover）单点收口判定；事实输入由现成函数供给（parseHandoverRows、quality-scan 实测记录、probe7 矩阵槽、apply 文件集）；批次 C smoke 回执落地时加第五个事实条件即插即用。B 否决理由：同一事实两处判定口径漂移（EHS 复盘教训）；C 否决理由：结论枚举 breaking（槽行解析/facts/平台同步/存量变更兼容面），NOTES+handover 已能承载。
- evidence: 本会话方案选择轮（2026-09-17，用户答复"A"）
- impacts: [FR-1, FR-3, FR-4, FR-5]
- normalized_requirement: 事实面封顶逻辑唯一落点 = stage-contract 层新 validator；四个事实源函数为只读输入，不在产出点各自拦截。
- 故障面: ~~装配函数跨四事实源，某源取数失败（qualityScan 记录缺失/applyFileSet 为 null）时 fail-open 跳过该条件并注记~~（Grill X-06 追注：本条款已被 D-011 收窄——fail-open 仅限 producer 侧输入缺失；consumer 侧 facts 缺失走双源 fail-closed，以 design §1 口径为准）。
- 退役判据: 若结论枚举重构出 CONDITIONAL 档或批次 C smoke 回执统一判定面落地，validator 收敛为单事实条件插位。

## D-009@v1: prompt/清单层实证口径升级（同批轻量落地）
- type: consistency
- status: accepted
- 问题: brainstorm 实证清单「角色 enname 存在」深度不够——EHS 的 RpLeader 等三角色 tenant_id=NULL，存在但按生产口径（tenant 过滤查询）解析不到人，联调时领导下拉全空；另需求入口（菜单一/菜单二）被解读为路由，design 漏了 sys_menu DML，grill 抓了页面组件缺失没抓菜单注册。
- 选定: ① 审查清单条目措辞升级：角色/字典类实证从「存在」升为「**以生产查询口径**可解析到目标结果」（如按 enname+tenant 查询返回非空用户）；② 新增交付完整性条目：「需求中的用户入口 × 菜单/注册 DML 对账」（有前端路由的变更必查菜单 SQL 是否在交付清单）。落点：brainstorm/verify 审查清单（stage-review-checklist.js / stage-contract-spec.js 提示文案）。
- normalized_requirement: 涉及角色/权限的变更，实证须以生产查询口径验证可解析性；含新页面的变更，菜单注册 DML 在文件清单或显式豁免。
- impacts: [FR-11]
- evidence: EHS brainstorm C-13（7 角色 enname 实证存在）vs 联调 tenant_id=NULL 翻车、EHS rp.sql 无 sys_menu DML（URL 直达兜底）
- 故障面: 清单条目增多拉长审查——仅对命中条件（涉及角色/新页面）注入。
- 退役判据: 若 brainstorm 探针化（自动核角色可解析性）落地，条目退役。
