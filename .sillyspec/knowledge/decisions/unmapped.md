# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-001@v1 : 本变更范围 = IR 提案 P3a，不含 P3b/c/d
状态：implemented
变更：2026-09-06-ir-stage-p3a
锚点：未记录
最近确认：11aa319
理由：仅 P3a（种子稿第 6 节）：plan 侧 task 卡 target_files 声明 + execute 侧机器对账（scope creep 检出）。P3b（verify 结论表）、P3c（design facts）、P3d（archive delta 回灌）各自独立变更立项。

## D-001@v1 : P3b 范围 = verify 结论表机器半边 + 探针一致性抽查 + claims 三层标注
状态：implemented
变更：2026-09-07-ir-stage-p3b
锚点：未记录
最近确认：6d72aca
理由：种子稿 §4 三点全部落地：①验证结论表的机器半边（CLI 全权生成 verify-facts.json：探针命令行+首跑关键指标快照）②探针复跑抽查（verify gate 重跑对比防篡改）③claims 三层分级标注（确定性检查/可复跑探针/人工判断）。不做 verify.facts.yaml 的 agent 半边（agent 手写 IR 是已知前科风险，判断层保持 verify-result.md 散文）。

## D-001@v1 quick ownFiles 须并入 baselineFiles
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：否。`review.changedFiles`（shared.js:1313? push）在 shared.js:1313? `if (isBaselineFile(file)) continue` 处排除了 baseline 文件——而多 agent 脏工作树起 quick 时，baselineFiles 正是本会话预存改动。仅用 changedFiles 会把自身预存文件误报为他者（§1 core 场景直接失效）。

## D-002@v1 execute ownFiles 源优先级链 + in-place 噪音决策
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：不可接受「空」。in-place 模式（`meta.mode==='in-place-fallback'`，gates.js:744 / complete-handlers.js:744）下主仓 git status 含本会话 src/ 交付文件，空 ownFiles 会把自身交付全报他者。worktree 模式下主仓看不见交付文件，空 ownFiles 无害。

## D-004@v1 detectConcurrentChanges 强制 safeGit trim:false
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-005@v1 「活跃变更目录」术语澄清
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-007@v1 verify/archive --done 排除理由
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-003@v1 quick 钩子 review=null brownfield 兜底
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：complete-handlers.js:1305 `let review = null`，仅 `if(guard)` 内赋值。brownfield 无 guard 时 review=null → `review.changedFiles` 抛 TypeError。design §5 只给 execute「取不到则空」兜底，quick 缺。

## D-006@v1 措辞「写操作前预检」vs 实际「完成时报告」
状态：implemented
变更：2026-08-08-concurrent-write-preflight
锚点：未记录
最近确认：a69021cc85e6d19af0893fd5d74fe833ba61cea8
理由：

## D-004@v1 verify 阶段 prompt 锚点措辞三形态化（task-04 边界扩容）
状态：implemented
变更：2026-09-17-feedback-hardening
锚点：未记录
最近确认：60e90c1
理由：扩 task-04 边界收口：src/stages/verify.js:163 措辞改三形态+行号可省；docs/prompt/verify.md 镜像 fence 手改同步（不跑 _extract.mjs——_extracted.json 正被并行会话 docs-bracket-reanchor 占用，避免 apply 面冲突；流水线刷新留其会话/后续统一跑）。

## D-001@v1 方括号段=完整括号对并列形态，不做字符类放宽
状态：implemented
变更：2026-09-17-docs-bracket-reanchor
锚点：未记录
最近确认：3ec09b3
理由：文件段展开循环迭代体并列第三种段形态 `\[类+\]`（与圆括号段同位同权），不把 `[`/`]` 加进普通段字符类。
故障面：散文形如「arr[0] 点 js 行 12」从残段提取变全量提取（Grill CC-10 实测 invalid 计数 1→1 不变，无净增面）
退役判据：引用锚迁移到结构化解析器（非正则）时本形态随 REF_RE 一并退役

## D-002@v1 陈旧基线自动重锚（已实测不劣于远端即落盘），守卫拦 checkOpts 一次性覆盖
状态：implemented
变更：2026-09-17-docs-bracket-reanchor
锚点：未记录
最近确认：3ec09b3
理由：自动重锚——writeBaseline(current) + 消息披露重锚前后值与依据；守卫拦 checkOpts 四键（paths/skip/keywordAssert/crossRepoRoots）任一显式传入（一次性异口径不写盘），不拦 local.yaml 持久口径（measure 与 current 同读该配置，读写自洽）。
故障面：并行会话同时重锚 last-write-wins（双方写的都是已验证不劣于远端的值，无害）；--against 模式落盘提交树计数与工作区瞬差（与 --init-baseline --against 既有语义一致）
退役判据：基线机制整体退役（docs gate 换语义）时随 gate 一并退役

## D-003@v1 docs-fix-capability D-001「gate --delta-only 不做」非复潮声明
状态：implemented
变更：2026-09-17-docs-bracket-reanchor
锚点：未记录
最近确认：3ec09b3
理由：非复潮——本变更不是 delta-only 门（拦增量/放存量的门语义不变），是陈旧分支的落盘动作；用户实证（基线 404 < 远端 414 提示反复出现）即该留账等候的「第二次批量事件」。

## D-001@v2 PASS 资格事实面封顶——blocking 级口径与 facts 锚定输入（supersedes D-001@v1 的条件②与输入形态）
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：D-001@v1 两处需修正：①条件②「handover 有效行>0」一刀切会训练 agent **漏报移交项保 PASS**（防滥用只防「NOTES 洗 PASS」防不了「少写」）；②validator 内嵌四个 reader 各自解析 MD 会长成第二个 god-check，且条件③的「apply 文件集」在 verify 时点不存在（verify 先于 apply，manifest 未落盘）——时序 bug。
故障面：同 v1（事实误判假红）+ severity 钻空面（见 D-005@v2 应对）。
退役判据：同 v1（CONDITIONAL 档或批次 C smoke 统一判定面）。

## D-002@v1 risk_level 显式豁免洞分层封死 + 集成回执口径收紧
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：stage-contract.js:646-652——design frontmatter 显式声明 risk_level 后，PASS WITH NOTES 完全绕过集成证据门（「explicit + NOTES 视为对残留项的诚实声明」）。同时 EHS 实证暴露回执口径漏洞：mvn compile + JUnitCore 纯单测的三条 log 通过了集成回执四条件校验——**单测/编译类回执被当成集成实测**。
故障面：「跨层调用证据」的机械判定可能假阴（如集成脚本名不带关键词）——判定表用「回执命令来源」而非日志内容猜测，见 D-006。
退役判据：smoke 金路径落地（批次 C）后，「集成实测已跑」改由 smoke 回执判定，本条口径表并入彼处。

## D-003@v1 probe7 partial/uncovered 联动 handover——存在性门槛起步
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：validateAcceptanceMatrix（stage-contract.js:833-880）只拦 unfilled/缺锚点；partial/uncovered 是合法填值不进任何阻断——FR「部分实现」静默带过（EHS：FR-01/12/13/15 四条 partial 出门）。
故障面：handover 成为万能逃生门——由 D-005 互锁与 archive 注入约束。
退役判据：逐行关联 advisory 攒满一轮实证且假红率可接受后升硬门。

## D-004@v1 Runtime Evidence「不涉及」纳入事实面 + 提示语补降级路径
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：verify-result「## Runtime Evidence [层：人工判断]」（verify-probes.js:1900）允许 agent 自声明「服务端点不涉及（服务未启动）」——integration-critical 变更的运行时缺口以诚实申报形态蒸发（EHS 实证）。
故障面：「不涉及」行文识别过宽误伤纯库类变更——判定限定在判级 integration/deployment-critical 的变更内。
退役判据：批次 C smoke 回执落地后，端点行由 smoke 回执机械填充，人工声明面收敛。

## D-005@v2 handover severity 分层——防漏报与防滥用双面（supersedes D-005@v1 的类型一刀切口径）
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：D-001@v1 把「任何移交项在场」都当封顶条件，训练 agent 漏报移交项保 PASS（perverse incentive）——D-005@v1 的互锁只防「滥用 NOTES 洗 PASS」，防不了「少写」。
故障面：降级理由造假——抽查面核理由非空且含依据锚点；漏报（整行不写）由机器算的①③④事实条件独立兜住，钻空面有界。
退役判据：若 handover 升级为独立跟踪实体（批次 E 方向），severity 随迁。

## D-006@v1 「集成实测已跑」判定口径表
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：D-001/D-002 依赖「集成实测未跑」这一事实判定，但口径不定会两头翻车：过宽误伤（module 档跑过子集被当未跑）、过窄放过（compile+单测 log 被当集成——EHS 实证翻车点）。
故障面：「跨层调用」按命令来源判定的启发式可能漏标新形态命令——留 escape：变更可在 design frontmatter 声明等效验证先例（verify_precedents 同思想）。
退役判据：批次 C commands.smoke 落地后由 smoke 回执一票判定。

## D-007@v1 fix.sql 声明门（apply/archive-confirm 侧，零连库）
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：h1 缺陷修复配套的 `2026-09-15-rp-fix.sql`（先库后码同批部署）只是 verify-result 移交项 notes，无任何机器门——用户手测第一张保存即撞 `Field 'rp_number' doesn't have a default value`。
故障面：声明造假（写了「已执行」实际没执行）——本门定位是「防遗忘」非「防伪造」；连库实测档补齐后闭环。
退役判据：information_schema 实测档落地后降级为兜底。

## D-008@v1 配套四小修——把门的眼睛修好（与语义同批）
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：语义收紧了但门自身半盲会留半盲窗口：① test_strategy: skip 只短路主仓，跨仓仍无条件跑（fallback npm test 假败，EHS 打回一次）；② 跨仓 task 官方通道（手写+backfill --adopt）的 tasks.md checkbox 断链（writtenBy 白名单不含 adopt + 零 diff 守卫只看主仓 diff，complete.js:1072/1091）；③ probe7 测试文件内容读取只有 cwd→wtRoot 双根，跨仓测试文件命中恒空恒预填 partial（verify-probes.js:864-874）；④ design 清单无「## <repo> 仓变更」段头时仍按主仓根核，跨仓「修改」条目被逼 NEW: 前缀（design-facts.js:461-468 残留）。
故障面：skip 跨仓短路过宽会失明（跨仓有意义的空套件烟雾被跳过）——已按「自配 commands.test 仍跑」收窄。
退役判据：跨仓对账全面接入 worktree diff 后，②的 diff 源统一收口。

## D-011@v1 facts 锚定纯函数实现纪律 + 双源 fail-closed
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：封顶事实若由 validator 内嵌 reader 现解析 MD，批次 C 加条件要改 validator 本体，且与 checkProbeConsistency 的防篡改抽查不同源。
故障面：facts schema 加字段（additive）——verify-facts-schema 校验面同步登记，可选字段缺省不炸。
退役判据：facts 管线若整体重构为独立事实服务，本纪律并入彼处。

## D-012@v1 事实③ verify 时点源修正——声明面/diff 判定，apply 门兜底
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：D-001@v1 条件③用「apply 文件集」为源，但 verify 先于 apply 执行，apply manifest 在 verify 时点不存在——条件恒空转。
故障面：design 清单漏列 sql 文件 → verify 侧漏判——apply 兜底门按实际文件集拦截，双门互补。
退役判据：若 apply 前置到 verify 内（流程重构），verify 侧改读 manifest。

## D-013@v1 Wave 步骤完成度门——execute 逐 Wave --done 校验本 Wave 任务全勾
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：2026-09-17 本变更执行中实证：Wave 2 步骤在 task-02 未实现、checkbox 未勾、review 仍是 CLI 自动草稿（cannot_verify）的状态下被 `execute --done` 放行推进（review write 失败退出码被 shell 管道吞掉后 --done 落在下一 Wave 步）——现有防护（可选 `--step` 意图断言、60s 并发横幅）都拦不住「未完成 Wave 被标完成」。
故障面：①任务确实完成但 checkbox 通道断裂（跨仓 adopt 勾选断链正是 task-05 要修的）→ 门会把人拦在 --done——错误文案给两条出路（修勾选通道 / --reopen），且 task-05 落地后断链消失；②plan.md Wave 段解析失败 → fail-open warn 不误伤（与隐式 Wave 语义共存）。
退役判据：若 execute 迁移到任务级依赖图调度（逐任务推进取代 Wave 粗粒度），本门随 Wave 语义退役。

## D-010@v1 事实面封顶采用集中式 validator（方案 A）
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：用户选 A——新增 `validatePassEligibility`（与 validateAcceptanceMatrix 同构注册进 verify validators），四个事实条件（集成未跑/handover 在场/db 脚本未声明/矩阵 partial 无 handover）单点收口判定；事实输入由现成函数供给（parseHandoverRows、quality-scan 实测记录、probe7 矩阵槽、apply 文件集）；批次 C smoke 回执落地时加第五个事实条件即插即用。B 否决理由：同一事实两处判定口径漂移（EHS 复盘教训）；C 否决理由：结论枚举 breaking（槽行解析/facts/平台同步/存量变更兼容面），NOTES+handover 已能承载。
故障面：~~装配函数跨四事实源，某源取数失败（qualityScan 记录缺失/applyFileSet 为 null）时 fail-open 跳过该条件并注记~~（Grill X-06 追注：本条款已被 D-011 收窄——fail-open 仅限 producer 侧输入缺失；consumer 侧 facts 缺失走双源 fail-closed，以 design §1 口径为准）。
退役判据：若结论枚举重构出 CONDITIONAL 档或批次 C smoke 回执统一判定面落地，validator 收敛为单事实条件插位。

## D-009@v1 prompt/清单层实证口径升级（同批轻量落地）
状态：implemented
变更：2026-09-17-pass-cap-semantics
锚点：未记录
最近确认：f254733
理由：brainstorm 实证清单「角色 enname 存在」深度不够——EHS 的 RpLeader 等三角色 tenant_id=NULL，存在但按生产口径（tenant 过滤查询）解析不到人，联调时领导下拉全空；另需求入口（菜单一/菜单二）被解读为路由，design 漏了 sys_menu DML，grill 抓了页面组件缺失没抓菜单注册。
故障面：清单条目增多拉长审查——仅对命中条件（涉及角色/新页面）注入。
退役判据：若 brainstorm 探针化（自动核角色可解析性）落地，条目退役。

## D-001@v1 信封加法式可选 code，不升 schema_version 2
状态：implemented
变更：2026-09-17-mi-diagnostic-codes
锚点：未记录
最近确认：51225ae
理由：errors 是 string[]（中文散文），消费方要分支只能正则匹配散文；但 interface-contract.md 是冻结的 v1 对账基准，errors 升对象数组 {code,message} 属破坏性语义变更，需 SillyHub 协同改造。
故障面：codes 与 errors 的对应关系被消费方误读为逐下标映射——契约明示 codes 是去重聚合非 1:1；check.code 恒在场（含通过时）消除「有时无」的歧义。
退役判据：v2 升版（errors 对象化）落地时，codes[] 聚合键退役，check.code 并入对象元素。

## D-004@v1 码表单一源模块 + parity 双向测试
状态：implemented
变更：2026-09-17-mi-diagnostic-codes
锚点：未记录
最近确认：51225ae
理由：OpenSpec 的 agent-contract.md 靠人工审计保真（文档头 capstone audit，仓内无文档↔代码 parity 测试），码漂移只能等下次审计或集成方挂掉——这是它的已实证弱点。
故障面：码表膨胀失控——首期 10 码硬边界（D-002），二期扩面走变更流程追加。
退役判据：v2 码表结构重构时冻结表键值迁移，parity 测试同步改写。

## D-001@v1 commands.smoke 配置键——CLI 亲跑与 commands.test 同哲学
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：运行时验证需要真实执行冒烟脚本，执行主体是谁？agent 自报无核验（EHS 实证「集成证据自报告、CLI 只校验字面存在」的坑）；CLI 亲跑才与「不信口头」一致。
故障面：冒烟脚本起服慢拖累 verify——prompt 指引并行起服（脚本内部后台起+轮询，墙钟增量≈冒烟本体）；脚本挂死——CLI 亲跑超时帽（与 gate_snapshot.commands 同款 300s 先例）+ 失败即封顶信号。
退役判据：若未来 E2E 平台化（浏览器 Tier 2）统一接管运行时验证，smoke 键并入彼处。

## D-002@v1 facts.smokeRan 第五事实条件——初版封顶不 fail
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：「smoke 缺失」如何进入批次 A 的封顶？直接 fail 过狠（存量变更无 smoke 基建会全炸）；不进封顶则键形同虚设。
故障面：判级误伤（关键词误判 critical 的变更被要求 smoke）——既有显式 risk_level 降级逃生通道保留（unit-sufficient 不触发）。
退役判据：smoke 回执判定面稳定后升 fail 档（D-001@v1 退役判据同源）。

## D-003@v1 smoke 回执由 CLI 亲跑自动落盘——消灭 agent 手填伪造面
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：EHS 实证三条 compile+单测 log 混过回执四条件（批次 A 已用 sourceTag 堵口径）；但回执本身仍是 agent 手填路径——CLI 亲跑 smoke 的 log/mtime/exit 应机器落盘。
故障面：CLI 亲跑与 agent 后续补跑的回执并存——机器段只认 CLI 记录（sourceTag='cross-layer' 标记），agent 追加段单独标注来源。
退役判据：若回执槽整体重构为 facts-only，机器段并入 facts.smokeReceipt。

## D-004@v1 接口验证覆盖矩阵——表驱动行数 fail-closed + 用例锚点
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：冒烟「测什么」无依据物则退回 agent 自由发挥（EHS 复盘：单测有转移表可依所以扎实，接口层无依据物所以没人派生用例——P1 全长在这层）。
故障面：接口表写法千奇百怪解析不全 → 行数偏低漏覆盖——tolerant 解析 + 解析失败降级（D-005）；矩阵行与 probe7 行混淆——章节独立命名+骨架注释口径注记（同 probe3/probe7 并排先例）。
退役判据：若接口定义迁入结构化产物（design-frontmatter/api.yaml 类），矩阵预填源切换。

## D-005@v1 接口表 tolerant 解析 + 失败降级声明
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：design 接口定义表无 normative 格式（批次 A 复盘确认「探针 1 解析的是文件清单不是接口表」），强格式契约会打爆存量变更。
故障面：agent 声明行数造假（声明 0 端点躲矩阵）——与 fix.sql 声明门同理定位「防遗忘非防伪造」；判级 critical 变更声明零端点时 warning 提示复核。
退役判据：格式实证充分后升 normative（存量豁免窗口关闭）。

## D-006@v1 消费面维度——端点×消费端展开，payload 构造点为锚
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：EHS 实证 P1-1/P1-2 抓不到的根因之一是「按 design 字段名发载荷接口当然通」——消费面（前端实际发的形状）才是字段漂移的暴露面；且提取点必须是 payload 构造处（model save effect/表单 handleSubmit），services 封装层零字段名（批次 C 设计讨论实证纠偏）。
故障面：消费端归类错（文件面启发式）→ advisory 仅提示无阻断，假红无害。
退役判据：批次 B（probe8 代码级直比）落地后消费面维度由 probe8 机械覆盖，矩阵消费行退役。

## D-007@v1 表间交叉完备性校验（advisory）——治「表缺行」型缺陷
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：派生框架忠实继承 design 表的洞——EHS P1-4（submit 越权）大概率是权限矩阵缺 submit 行而非「格没人派生」；表自身完备性无机械检查。
故障面：权限矩阵段识别不准 → 误报/漏报 warning——advisory 无阻断，格式实证后收紧。
退役判据：权限矩阵结构化后升硬门。

## D-008@v1 smoke 脚本纪律进 prompt——表驱动派生 + 负向下界 + 并行起服
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：脚本断言无依据物会退回自由发挥；起服串行会把 110s 冷启全算进墙钟。
故障面：prompt 膨胀——纪律段仅在配置 commands.smoke 或判级 critical 时注入（命中条件注入，同 D-009 批次 A 条目形态）。
退役判据：冒烟模板脚手架化（sillyspec init 生成模板脚本）后纪律段指向模板。

## D-010@v1 方案 A——CLI 亲跑 + 矩阵行数 fail-closed
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：用户选 A——commands.smoke 由 CLI 亲跑（回执机器段落盘零伪造面）；接口矩阵行数对账 fail-closed（纯机械事实无假红面）；消费端行/表间完备性 advisory（语义关联后软）。B 否决理由：回执文本层伪造面（EHS compile log 混门实证）；C 否决理由：批次 A 已实证 advisory 无阻断力。
故障面：CLI 亲跑超时/挂死——300s 超时帽（gate_snapshot.commands 先例）+ 失败定性为封顶信号非崩溃；存量 critical 变更首跑被拦——handover 承载出路。
退役判据：执行面若平台化（SillyHub driver 统一跑命令），亲跑语义并入彼处。

## D-009@v1 非目标（批次 C 边界）
状态：implemented
变更：2026-09-17-api-coverage-smoke
锚点：未记录
最近确认：cbc712f
理由：范围蔓延风险——批次 C 是地板不是全家桶。

## D-001@v1 稳定 FR id 归档发号，幂等键=全局 id
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：FR-NN 是 change 局部编号（change A 的 FR-01 ≠ change B 的 FR-01），无跨 change 身份则索引/取代/召回全部无处着力。
故障面：域归属误判把 FR 发进错域文件——域解析复用 moduleIndex 同源（design 文件清单×_module-map），unmapped 兜底可见可迁移。
退役判据：L3 活规格树落地时全局 id 平移为树内条目 id，本索引降级为检索面。

## D-002@v1 取代靠显式承接引用，未声明删除 L1 无感知（只观察不门禁）
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：需求是活对象，后来 change 改掉/删掉某行为时旧条目需标记，否则索引腐烂成坟场（评审：无取代的索引就是坟场）。但「未声明的删除」检测是 L3 合并门禁领地。
故障面：承接行写错 id（域拼错/号不存在）→ 发号时校验：引用不存在=warn 留痕不阻断（typo 不该炸归档）。
退役判据：L3 合并门禁落地时承接升级为声明义务（undeclared deletion 拦截）。

## D-003@v1 存储镜像 decision-distill（knowledge/fr/ 域文件+INDEX 路由），零新树
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：L3 之前不该建活规格树（第三真相源冲突未裁决），但索引需要可注入可解析的落盘面。
故障面：与 decisions 域文件格式漂移——fr/ 子目录隔离 + 头注释钉契约；docs-check 覆盖面含 .sillyspec/docs 但 knowledge/ 是否在扫面按现行配置不动（不扩）。
退役判据：L3 落地时 fr/ 索引整体迁移进活规格树，路由行重指。

## D-004@v1 注入=brainstorm step8 定向 digest，superseded 默认藏
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：防「写重复 FR」的前提是写作期能看见现行 FR；全量索引注入会撑爆 prompt。
故障面：触达域解析错（design 清单漏写文件）→ digest 缺域——digest 末行注记「域解析自 design 文件清单，漏域先核对清单」自纠。
退役判据：L2 模块卡挂指针后 digest 与卡片契约摘要合流。

## D-006@v1 观察指标是验收面——三指标进 design 进 verify
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：L1 的战略价值=L3 证据发生器，指标若只是「以后看看」必然烂尾。
故障面：事件流无人读——本期 verify 实测读回+knowledge-stats 接入列为后续变更钩子。
退役判据：L3 裁决完成日，三指标完成历史使命归档进裁决文档。

## D-008@v1 证伪条款+指标可算性+删除缺口探针（审核三护栏）
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：三条护栏：①实验可能失败但「已有索引就不能不盖房」的沉没成本绑架无出口；②三指标中拦截/取代两项若无机制发生器，计数恒零实验失真；③L1 不许假装能拦漏删，但删除信号是 L3 裁决最缺的数据。
故障面：fr-unreferenced 噪音大（触达域≠全量行为变更）——本就是趋势信号非判定，遥测字段带 domain+count 供 L3 裁决时按域加权。
退役判据：L3 裁决日无论成败，四类事件+本条款一起归档进裁决文档。

## D-007@v1 D14 第四检查=epoch 分界加行，存量豁免走既有账本
状态：implemented
变更：2026-09-18-fr-index-l1
锚点：未记录
最近确认：aae25a4
理由：「归档 change 的 FR 索引条目在场+取代已标记」需要事后可查，但 93 份存量归档不回填（评审裁决不补历史）。
故障面：本变更自身归档即首个 epoch 后样本——索引写入失败会当场被 D14 新检查抓到（自举验证）。
退役判据：L3 活规格落地后此检查并入树完整性检查。

## D-001@v1 probe8 diff 源替换——design 清单声明面 → worktree diff 实际面
状态：implemented
变更：2026-09-18-probe8-direct-compare
锚点：未记录
最近确认：1fd78d4
理由：probe8 现读 design 文件清单（声明面）——design 清单漏写/路径写错时整条探针静默失明（EHS 实证 C-07：design 清单与实际交付面错位是常态）。
故障面：worktree 缺失/非 worktree 模式（in-place）→ fallback design 清单源（fail-open 注记模式）；跨仓 diff 双失败 → 探针跳过注记。
退役判据：若前后端元数据标准化（OpenAPI 生成等），直比面切换标准产物。

## D-002@v1 probe8 代码级字段直比——前端 payload 构造点字段集 vs 后端实体/DTO 字段集
状态：implemented
变更：2026-09-18-probe8-direct-compare
锚点：未记录
最近确认：1fd78d4
理由：现行 probe8 只对账 design 契约面声明的字段（agent 声明什么对什么），不碰代码——EHS P1-1（leaderUserId≠rpLeaderUserId）三处字段错位正是代码与代码的错位，声明面对账天然盲。
故障面：提取正则假阳/假阴（动态字段名 obj[key] 不可枚举）→ advisory 档不阻断+escape hatch；前端框架 DSL 差异（Vue/React/原生）→ 按文件后缀选匹配族+未识别后缀跳过注记。
退役判据：批次 C smoke 落地后运行时抓字段漂移（payload 从构造点导出），静态直比降为早期预警补充。

## D-003@v1 Controller 必填校验器提取——@NotNull/@NotBlank/@RequestParam(required) 三形态
状态：implemented
变更：2026-09-18-probe8-direct-compare
锚点：未记录
最近确认：1fd78d4
理由：后端「必填」面在 Controller/Service/DTO 三层分散（注解+显式校验+DB NOT NULL），probe8 需要机械可提取的必填集做漏发对账。
故障面：自定义校验框架不识别 → 必填集不完整（漏报侧，advisory 可接受）；校验调用误匹配（假阳）→ warning 多一条，escape hatch 兜底。
退役判据：若后端元数据标准产物（OpenAPI spec）可用，三形态提取退役。

## D-004@v1 advisory 档起步——硬门升格为后续独立决策
状态：implemented
变更：2026-09-18-probe8-direct-compare
锚点：未记录
最近确认：1fd78d4
理由：直比 warning 的假阳率未实证——升硬门（warning→error）需要一轮真实变更的攒证。
故障面：advisory 无阻断力（批次 A 已实证）——但直比本批定位「预警+攒证」，运行时兜底归批次 C smoke。
退役判据：一轮实证假阳率 < 5% 后升硬门（后续变更）。

## D-005@v1 非目标
状态：implemented
变更：2026-09-18-probe8-direct-compare
锚点：未记录
最近确认：1fd78d4
理由：

## D-006@v1 方案 A——probe8 内新增 direct-compare 子段
状态：implemented
变更：2026-09-18-probe8-direct-compare
锚点：未记录
最近确认：1fd78d4
理由：用户选 A——probe8 载荷字段契约对账探针内新增 direct-compare 子段（现有 design 契约面 advisory 保留，代码直比为并行新增维度）；extractFrontendPayloadFields/extractBackendRequiredFields 独立导出，未来升 probe10/plugin 只挪注册不改逻辑。B 否决：探针膨胀+碎片化；C 否决：当前 Java+JS 两族用不上插件接口（D-005 违背）。
故障面：probe8 文件膨胀——提取函数+对账逻辑独立区块注释锚定，膨胀可控。
退役判据：若直比面升独立探针（攒证后），提取函数整体迁出。
