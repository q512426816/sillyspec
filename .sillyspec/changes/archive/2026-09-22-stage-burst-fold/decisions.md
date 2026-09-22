---
author: qinyi
created_at: 2026-09-22 15:56:14
generated_by: sillyspec-fourpiece-init
change: 2026-09-22-stage-burst-fold
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001@v1: burst 缺省 OFF，本仓 local.yaml 自举开启
- type: boundary
- priority: P0
- status: accepted
- 模块域: runtime
- source: user
- question: stage burst 是否随本变更翻为全量默认？
- answer: 不翻。缺省 OFF（未配置即单步模式，既有行为零变化）；本仓 `.sillyspec/local.yaml` 手动加 `stage: burst: true` 自举 dogfood；env `SILLYSPEC_STAGE_BURST=1` 强制开 / `=0` 强制关（逃生阀）。全量默认翻转（测试面迁移）验收后另立变更。
- normalized_requirement: readStageBurst 在 local.yaml 无 stage.burst 且 env 未设时返回 false；env =0 优先级高于配置 true；env =1 优先级高于配置 false/缺省。
- impacts: [FR-1, FR-2, task-01, verify-3, verify-4]
- evidence: round5/prompt-stage-burst.md §1（任务书）；round5/flip-3.31.0-proposal.md §十.4（默认翻转拆分先例）
- 故障面: 用户误配 `burst: false` 之外的非法值按 false 处理（宽容缺省，不报错）。
- 退役判据: 全量翻转变更落地后本配置读取保留（env 阀仍有效），local.yaml 自举行可删。

## D-002@v1: burst 渲染复用 outputStep 逐个打印，不改渲染器本体
- type: architecture
- priority: P0
- status: superseded
- source: user
- question: burst 一次性下发说明书是否新写聚合渲染器？
- answer: 不新写。runStage burst 分支顺序对剩余非 completed/skipped 步逐个调既有 `outputStep(stageName, i, defSteps, cwd, changeName, progress.project, platformOpts, null, collectStageWaitHistory(progress, stageName))`（src/run/prompt.js:805 签名照旧）。persona/铁律等"首个 agent 可见步一次建立"注入（src/run/prompt.js:827-835 firstRenderableIdx）在首步打印时自然生效、后续步不重印——与逐次调用的累计观感一致。尾部加 burst 提示行。
- normalized_requirement: burst 渲染零新增渲染函数；每步输出与单步模式调用该步时 outputStep 的输出逐字节一致（除 CLI 横幅/空行分隔）。
- impacts: [FR-1, task-02, verify-1]
- evidence: src/run/prompt.js:805-835；src/run/stage.js:657（单步渲染调用形）
- 故障面: 每步 triggerStepStartSync（src/run/prompt.js:841-846）fire-and-forget 平台推送会连发 N 次——best-effort+8s 熔断契约不变，量级可接受。
- 退役判据: 无（结构决策）。

## D-003@v1: burst done = completeStepBurst 循环调 completeStep，不改 completeStep 本体
- type: architecture
- priority: P0
- status: superseded
- source: user
- question: 完成侧怎么折叠才能保住全部守卫语义？
- answer: 新增包装 `completeStepBurst`（export 自 src/run/complete.js，与 completeStep 同文件）：循环调既有 `completeStep(pm, progress, stageName, cwd, null, null, { ...options, printNext: false, outputText 覆写为 null })`。每轮完成后 `progress = pm.read(cwd, changeName)` 重读、重算 pending（pending/in-progress/blocked 谓词与 completeStep 内部一致，complete.js:165）；无 pending → 退出循环并透传末轮返回值；pm.read 返 null（并发归档）→ 报错 exitCode=1（对齐 src/run/command.js:2078-2084 BUG-05 语义）。循环上限 50 轮，超限报错防死循环。completeStep 全部守卫（WAIT 硬校验/waiting 前置/requiresWait 门控/意图断言/门禁/并发防护）在循环里逐轮原样生效——失败 process.exit 即 burst 天然断点，agent 修复后重跑 --done 幂等续推。
- normalized_requirement: completeStep 函数本体零 diff；burst 路径下每步推进经过与单步模式完全相同的守卫代码路径。
- impacts: [FR-2, task-03, verify-2]
- evidence: src/run/complete.js:134-345（守卫链）；round5/prompt-stage-burst.md §2
- 故障面: 循环内 completeStep 抛非退出异常（如动态 import 失败）→ 进程崩溃，进度停在已完成步（幂等可续）；50 轮上限误报仅当单阶段步数>50（现最大 execute 动态步，防御值足够）。
- 退役判据: 无（结构决策）。

## D-004@v1: burst 循环内 --answer 单次消费（防双 requiresWait 步错配答案）
- type: architecture
- priority: P0
- status: superseded
- source: code
- question: completeStepBurst 每轮透传 options.doneAnswer 会怎样？
- answer: 会错配。brainstorm 有两个 requiresWait 步（步4「提出 2-3 种方案」等待用户选择方案、步5「分段展示设计」等待确认设计，src/stages/brainstorm.js:202/228，waitReason 不同不触发 B4 归一化去重 src/run/complete.js:327-336）；completeStep 的 requiresWait 门控（src/run/complete.js:322-345）见 options.doneAnswer 即自动补 waitAnswer——循环透传会把步4的答案文本错填给步5的确认记录。规则：doneAnswer 至多消费一次——每轮 completeStep 返回后重读 progress，若本轮完成步的 waitAnswer === doneAnswer 则后续轮次从 options 剥离 doneAnswer；未消费（本轮步无 requiresWait）则保留给后续轮。后续 requiresWait 步无答案时 completeStep exit(1)「必须先等待用户输入」= 自然断点，agent 问用户后重跑 --done --answer（新答案对新步）。
- normalized_requirement: 同一 --answer 文本至多写入一个步骤的 waitAnswer；跨两个 requiresWait 步的 burst 收口需要两次 --done --answer 调用。
- impacts: [FR-2, task-03, verify-2]
- evidence: src/stages/brainstorm.js:199-231；src/run/complete.js:322-345（requiresWait 硬门控 + doneAnswer 自动补全）
- 故障面: 用户答案文本恰好等于前置步已记录的 waitAnswer → 提前剥离，后续 requiresWait 步走断点重答（fail-safe 方向，不错配）。
- 退役判据: 无（正确性决策）。

## D-005@v1: --step 意图断言仅 burst 首轮生效
- type: architecture
- priority: P1
- status: accepted
- 模块域: runtime
- source: code
- question: burst 循环第二轮起 --step 断言必然 mismatch（当前步已推进）怎么办？
- answer: 断言只在第一轮透传（防读旧进度的并发错位，首轮 mismatch 照常 exit）；第二轮起从 options 剥离 stepAssert。burst 本身就是「一次收口全部剩余步」的显式声明，后续轮次无需重复断言。
- normalized_requirement: burst --done --step X：X 匹配首个待完成步则全循环执行；不匹配则首轮 exit(1) 指引核对（与单步一致）。
- impacts: [FR-2, task-03]
- evidence: src/run/complete.js:201-217（意图断言）
- 故障面: 无新增（首轮语义与单步完全一致）。
- 退役判据: 无。

## D-006@v1: burst 作用域 = brainstorm/plan/execute 三主阶段
- type: boundary
- priority: P0
- status: accepted
- 模块域: runtime
- source: user
- question: burst 是否应用于全部阶段？
- answer: 否。渲染与完成两侧的 burst 分支均以 `stageName ∈ {brainstorm, plan, execute}` 为门。排除理由：① verify/archive 任务书明确不动（--init --draft 与就绪度已压到 1-2 次调用）；② quick 末步四字段硬契约（validateQuickResult）与 P0-2 事实合成不兼容（src/run/complete.js:222-224 已把 quick 列为合成豁免），burst 每轮传 null 会在 quick 末步炸校验；③ scan/doctor/explore 辅助阶段不在本轮验收面。
- normalized_requirement: burst 开启时对 verify/archive/quick/scan/doctor/explore 的渲染与 --done 行为与 burst 关闭时逐字节一致。
- impacts: [FR-1, FR-2, task-02, task-03, verify-3]
- evidence: round5/prompt-stage-burst.md §4；src/run/complete.js:222-224
- 故障面: 无（白名单门控，未列阶段走原路径）。
- 退役判据: 后续若要把 burst 推广到 verify/archive，改白名单即可（quick 永远除外）。

## D-007@v1: readStageBurst 走 readLocalYamlRaw + js-yaml 读 stage.burst
- type: architecture
- priority: P1
- status: accepted
- 模块域: runtime
- source: code
- question: 嵌套配置 stage.burst 怎么读？
- answer: 放 src/run/shared.js export `readStageBurst(cwd)`：复用既有 `readLocalYamlRaw(cwd)`（src/run/shared.js:1938-1946）+ js-yaml 动态 import 读 `doc?.stage?.burst === true`——与 resolveLivingDocs 读 `docs-check.living-docs` 同款范式（src/run/shared.js:1331-1340），绕开 parseSimpleYaml 缩进坑（known-issues 实证）。env 覆写：`SILLYSPEC_STAGE_BURST=0` → false / `=1` → true，优先于配置；坏 YAML/读失败 → false。锚定 cwd 而非 specBase：burst 是仓库本地开发偏好（与 resolveLivingDocs 同锚定），不随平台/worktree specRoot 漂移。
- normalized_requirement: readStageBurst 为纯读取函数（读文件+读 env），无副作用，可单测；local.yaml `stage:\n  burst: true` → true；env 两值覆写生效。
- impacts: [FR-1, task-01, verify-4]
- evidence: src/run/shared.js:1331-1340（resolveLivingDocs 范式）；src/run/shared.js:1938-1946（readLocalYamlRaw）
- 故障面: js-yaml 动态 import 失败 → false（fail-safe 回缺省）。
- 退役判据: 无。

## D-008@v1: burst 渲染侧 noAI 自动完成抽取 stage.js 分发为共用助手
- type: architecture
- priority: P1
- status: accepted
- 模块域: runtime
- source: code
- question: 任务书说"照抄 noAI 处理块"——第三份 _cliAction 分发副本可接受吗？
- answer: 不可接受，改为抽取。把 src/run/stage.js:592-629 的 _cliAction if-链抽为 stage.js 内局部助手 `executeNoAiCliAction({ cliAction, stageName, stepName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile })`，常规单步路径（stage.js noAI 分支）与 burst 渲染循环共同调用——单一事实源防三分叉。complete.js:437-472 的平行副本**不动**（"不改 completeStep 本体"承诺；该副本本就以"与 stage.js 对齐"注释维持平行维护，本轮不扩面）。
- normalized_requirement: 抽取后单步 noAI 路径行为零变化（同一 if-链、同一入参语义）；burst 渲染循环对 noAI 步执行同一助手。
- impacts: [FR-1, task-02, verify-1, verify-3]
- evidence: src/run/stage.js:592-629；src/run/complete.js:437-472（平行副本，保持不动）
- 故障面: 新增 _cliAction 只登记 stage.js 助手会在 complete.js 副本报"未知 _cliAction"——既有平行维护约束，非本轮新增。
- 退役判据: 无。

## D-009@v1: agent 整体 --output 横幅打印，不落步记录
- type: boundary
- priority: P1
- status: accepted
- 模块域: runtime
- source: code
- question: burst 一次 --done 带的整体 --output 摘要记到哪？
- answer: completeStepBurst 开打一行横幅（`📦 burst 收口摘要：<outputText>` 或省略时跳过），循环每轮 outputText 传 null 由 P0-2 事实合成（src/run/complete.js:224-227）逐步生成。不把整体摘要挂到末步 output——语义错归属（末步会记录与自身无关的整体叙述，污染步骤审计面）。
- normalized_requirement: burst 路径下每步的 progress output 均为 CLI 合成事实摘要；整体 --output 仅终端横幅可见。
- impacts: [FR-2, task-03]
- evidence: src/run/complete.js:219-227（P0-2 合成）
- 故障面: 无持久化的整体语义摘要——语义说明进 decisions.md/proposal.md（本就有），步骤 output 面保持纯事实。
- 退役判据: 无。

## D-010@v1: flow.mode 缺省翻回 legacy
- type: compatibility
- priority: P0
- status: superseded
- source: user
- question: flow 族薄流程缺省档位？
- answer: readFlowConfig 缺省 'thin' → 'legacy'（src/flow.js:66 `let mode = m ? m[1] : 'legacy'` 与 :76 catch 回退两处 + :62 docstring 注释同步）。用户裁定：flow 族保留为实验通道，薄道默认不再对 run 族用户敞开。连带修 test/flow-protocol.test.mjs 各 fixture local.yaml 补 `flow:\n  mode: thin`（缺省变更后 ①②③⑥ 会挂，逐 fixture 补配置行，断言本体不动）。除缺省翻转外 flow 族零改动。
- normalized_requirement: 无 flow 配置时 readFlowConfig().mode === 'legacy'；显式配置 thin/legacy 照旧生效；flow-protocol 全绿。
- impacts: [FR-3, task-04, verify-5]
- evidence: src/flow.js:62-78；round5/prompt-stage-burst.md §3
- 故障面: 依赖缺省 thin 的既有用户升级后 flow start 走厚道——行为翻转即本轮意图（用户裁定），AGENTS.md 已改推薄流程为 flow.mode: legacy 回滚通道的表述不变。
- 退役判据: 薄道转正时再翻回。

## D-011@v1: 方案选择 = A（burst 交互折叠）
- type: architecture
- priority: P0
- status: accepted
- 模块域: runtime, cli-entry
- source: user
- question: 三案（A burst 交互折叠 / B completeStep 本体批量参数 / C 薄流程转正）选哪个？
- answer: 用户选 A（任务书冻结版）：渲染侧剩余步逐个调既有 outputStep + completeStepBurst 循环调 completeStep(printNext:false)，completeStep 本体零 diff；缺省 OFF 本仓自举。用户同时授权全程免询问（后续 requiresWait 决策点按任务书冻结口径自决并如实记录）。
- normalized_requirement: 实现严格按 D-002/D-003/D-004/D-005/D-006/D-008/D-009 执行；B/C 路径不进入实现。
- impacts: [FR-1, FR-2, task-01, task-02, task-03, verify-1, verify-2]
- evidence: 用户会话回答「A 后续不用询问我，做完全部流程」（2026-09-22 方案选择轮）
- 故障面: 无（方案选择记录）。
- 退役判据: 无。

## D-002@v2: burst 渲染输出一致判据改「首访渲染形」
- type: definition
- priority: P2
- status: accepted
- 模块域: runtime
- supersedes: D-002@v1
- source: design-grill
- question: v1 判据「每步输出与单步模式逐字节一致」可达吗？
- answer: 不可达（Grill P2 附注）：requiresWait 步被 --answer 恢复后，单步模式重渲染时 collectStageWaitHistory 已带 waitAnswer 记录而 burst 首渲染时为空——文本面结构性不同。判据改为「首访渲染形一致」：前置 waitAnswer 状态相同的前提下，burst 逐个 outputStep 的输出与单步模式调用该步时一致。核心架构面（复用 outputStep、渲染器零改动）v1 不变。
- normalized_requirement: burst 渲染对同一首访状态（无前置 waitAnswer）的每步输出与单步模式一致；等价性验收以 gate 判定与 progress 态为准，不卡 requiresWait 后续步的文本逐字节。
- impacts: [FR-2, task-02, verify-1]
- evidence: src/run/prompt.js:569（collectStageWaitHistory 读等待史）；Grill 首轮 review X-1 附注
- 故障面: 无（判据口径修正）。
- 退役判据: 无。

## D-003@v2: completeStepBurst 补尾随 stale 拉回 + auto 路径跳过预合成
- type: architecture
- priority: P0
- status: accepted
- 模块域: runtime
- supersedes: D-003@v1
- source: design-grill
- question: v1 循环设计在 --reopen 中途开 burst 时的尾随 stale 步怎么办？
- answer: Grill P1-1：runStage 只拉回 currentIdx（首个非 completed/skipped）的 stale/blocked（src/run/stage.js:264-269），completeStep 谓词不含 stale（src/run/complete.js:165）——尾随 stale 步会被 burst 渲染打印说明书但 done 循环永不完成，退化为单步阶梯，破等价性目标。修正：completeStepBurst 每轮调 completeStep 前对首个非 completed/skipped 步做同语义 stale→pending 拉回（burst 新代码内，不触 completeStep 本体）。附带：auto 路径 burst 分支跳过 command.js:2064-2070 的 --output 预合成（防横幅重复）。v1 核心面（循环+printNext:false+completeStep 零 diff+50 轮上限+幂等断点）不变。
- normalized_requirement: burst 渲染打印说明书的步集合 = done 循环可完成的步集合（含尾随 stale 拉回后）；auto 路径 burst 下横幅只打一次。
- impacts: [FR-3, task-03, verify-2]
- evidence: src/run/stage.js:264-269（单步拉回）；src/run/complete.js:165（谓词）；Grill 首轮 review P1-1
- 故障面: 拉回写库失败 → 该轮 completeStep 落到其后的 pending 步（不卡死，重跑续）；与单步模式同故障语义。
- 退役判据: 无。

## D-004@v2: --answer 消费检测改轮前后 waitAnswer 快照比对
- type: architecture
- priority: P0
- status: accepted
- 模块域: runtime
- supersedes: D-004@v1
- source: design-grill
- question: v1 的「轮前记录目标步索引、轮后查该步 waitAnswer」检测在 waiting 解析重定向下会漏吗？
- answer: 会（Grill P2 附注）：--done --answer 落在已 waiting 步时 resolveWaitingStepWithAnswer 重定向 currentIdx（src/run/complete.js:190-193），实际完成的步 ≠ 轮前首个 pending 索引，固定索引检测漏判 → answer 未剥离 → 错配风险回归。修正：轮前快照全部步 waitAnswer、轮后比对，任一步 waitAnswer 新变为 === doneAnswer 即视为已消费并剥离。v1 核心面（单次消费语义、防双 requiresWait 错配）不变。
- normalized_requirement: 同一 --answer 文本至多写入一个步骤的 waitAnswer（检测与重定向无关）；跨两个 requiresWait 步的 burst 收口需要两次 --done --answer。
- impacts: [FR-3, task-03, verify-2]
- evidence: src/run/complete.js:190-193（waiting 重定向）；Grill 首轮 review X-2 附注
- 故障面: 同 v1（文本巧合提前剥离，fail-safe 方向）。
- 退役判据: 无。

## D-010@v2: flow 翻转测试面完整枚举 + config-schema 文案
- type: compatibility
- priority: P0
- status: accepted
- 模块域: cli-entry
- supersedes: D-010@v1
- source: design-grill
- question: v1 的「flow-protocol fixtures 补配置行」枚举完整吗？
- answer: 不完整（Grill P1-2）：调用 flow start/done 且依赖缺省 thin 的测试共三个文件——test/flow-protocol.test.mjs（makeRepo 缺省造法，受影响 ①②③⑤⑥ 五测，任务书原估 ①②③⑥ 漏 ⑤）、test/flow-route.test.mjs（:68 断言 flow start exit 0）、test/flow-draft.test.mjs（⑥ 真 CLI harness）。test/fr-index.test.mjs 核实不受影响（纯单测直调 indexRequirements，不经 flow start/done——本会话亲自核实）。另补 src/config-schema.js:170 flow.mode desc「thin（缺省）」→「legacy（缺省）」文案同步与 src/flow.js:18/:62/:124 三处文案。v1 核心面（缺省翻 legacy、断言本体不动）不变。
- normalized_requirement: 翻转后 flow-protocol/flow-route/flow-draft 全绿（fixtures 补 flow: mode: thin）；fr-index 零改动零回归；config-schema desc 与实现一致。
- impacts: [FR-5, task-04, verify-5]
- evidence: Grill 首轮 review P1-2；本会话核实 grep（test/fr-index.test.mjs 无 cli flow 调用）
- 故障面: 同 v1（未配置用户走厚档=intentional）。
- 退役判据: 薄道转正时再翻回。

## D-012@v1: STAGE_BURST_STAGES 白名单常量单一事实源落 shared.js（执行期裁决）
- type: architecture
- priority: P2
- status: accepted
- source: code
- question: 白名单常量放哪？（design 初稿 stage.js 局部；task-03 发现 command.js 两处分发门也需要）
- answer: 放 src/run/shared.js export（readStageBurst 旁）：渲染门（stage.js renderStageBurst）与完成门（command.js 两处 --done 分发）共用同一常量，防两处字面量漂移。执行期越界披露：该裁决使 task-03 提交含 stage.js import 行切换与 shared.js 常量 export（两文件原属 task-01/02 的 allowed_paths）——非破坏性、可逆、不推翻任何 D，属主代理直写模式歧义裁决条款范围。
- normalized_requirement: stage.js 与 command.js 均从 shared.js import STAGE_BURST_STAGES；两处门判定一致。
- impacts: [FR-02, FR-06, task-02, task-03]
- evidence: src/run/shared.js（STAGE_BURST_STAGES export）；src/run/stage.js import 行；src/run/command.js 两处分发门
- 模块域: runtime
- 故障面: 无（常量单一源）。
- 退役判据: 无。
