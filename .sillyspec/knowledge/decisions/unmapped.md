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
理由：complete-handlers.js:1262 `let review = null`，仅 `if(guard)` 内赋值。brownfield 无 guard 时 review=null → `review.changedFiles` 抛 TypeError。design §5 只给 execute「取不到则空」兜底，quick 缺。

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
故障面：散文形如 `arr[0].js:12` 从残段提取变全量提取（Grill CC-10 实测 invalid 计数 1→1 不变，无净增面）
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
