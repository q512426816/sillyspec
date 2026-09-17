---
author: zcode-feedback-hardening
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-feedback-hardening
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条；幂等按 D-xxx@vN 判重。
     复潮条目沿用原决策编号 @vN+1 并注明 supersedes 源（decisions 路由规则）。 -->

## D-002@v2: 门禁快照供给链补命令面（supersedes 2026-09-16-friction5-hardening#D-002@v1 的「B 否决」）
- **问题**：D-002@v1 落地 `gate_snapshot.copy`（junction/复制主仓生成物）后，build-id 类坑仍复潮（用户 2026-09-17 驾驭小结负面①）：生成物在主仓侧缺失（fresh clone 未跑 postinstall）或过期（构建期产物随版本变）时 copy 面供给的是缺失/陈旧态，快照内全量 lint/test 环境性必挂——copy 面只搬「主仓现有态」，不能产出「本仓应然态」。
- **复潮依据**：D-002@v1 否决 B（快照内跑命令）的理由是「任意命令进临时目录执行慢且副作用不可控」——前提是命令面无界自动跑。本轮按用户明确建议（「工具侧在快照供给链补 postinstall」）收窄设计：命令面为 local.yaml 显式声明（`gate_snapshot.commands`，与 commands.install 同信任级：主仓 specBase 配置、agent 可写副本不采信）、逐条超时帽、fail-open、置位于 copy 面之前（命令产出的生成物是真实文件，copy 面见 dst 已存在即跳过——新鲜度优先且天然规避 junction 写穿透）。
- **选定**：A——`gate_snapshot.commands: string[]`，createGateSnapshot 在环境目录链接（envDirs 完整性预检）之后、applyGateSnapshotCopy 之前逐条执行（cwd=快照根，超时 300s/条与非零退出 warn 不作废快照）。B（package.json postinstall 自动探测执行）否决：隐式执行面比显式配置危险，且非 npm 生态无对应物；C（维持纯 copy）否决：本轮实证缺口。
- **影响**：gate-snapshot.js（parse 扩 commands 键 + 执行段）、config-schema.js 登记、troubleshooting/config 文档同步；未配置零行为变化。
- **故障面**：命令写 node_modules（活链接）穿透主仓依赖目录——config desc 与执行段 warn 明示「命令不得改写依赖目录」；命令慢拖慢每次门禁——超时帽 + 文档建议只放生成物命令。
- **退役判据**：若后续把生成物对账下沉为 commands.gen 硬门（prompt-control-debt exec-h 留账方向）统一收口，本命令面可并入彼处。

## D-005@v2: probe7 advisory 锚点口径对齐硬门三形态（supersedes 2026-09-16-friction5-hardening#D-005@v1 的「裸反引号不收」）
- **问题**：硬门（extractAcceptanceMatrixSlots）收三形态（`.test.` 文件名 / file:line / 反引号包裹），advisory（probe7-anchor-check）只收两形态——证据为反引号测试路径（无行号无 `.test.`）过硬门仍被 advisory 提示「审查会要求回补」，叠加预填说明措辞（「证据列给首命中 file:line 锚点**或人工核验提示**」——后半句对 covered 判定根本过不了硬门），agent 在 file:line 上来回找行号三轮才过门（用户 2026-09-17 驾驭小结负面②）。
- **复潮依据**：D-005@v1 保留 advisory 窄口径的理由是「增量价值——推动指向真实测试命中」。本轮实证表明该增量是纯摩擦：硬门已保证锚点存在，advisory 多要的行号在行号漂移/测试文件名即足够定位的场景没有正确性收益，只有「审查会要求回补」的话术压力驱动无效往返。
- **选定**：advisory 三形态与硬门完全同权（本地正则加第三形态 `/`[^`]+`/`，仍不 import stage-contract——维持零依赖单文件定位）；预填说明同步改写为「covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 文件名 / 反引号路径或测试名），行号可省——`.test.` 文件名或反引号路径足够；uncovered/non-testable 证据自由形态」。
- **影响**：probe7-anchor-check.js、verify-probes.js 预填说明、gates.js advisory 文案、verify 技能/文档镜像；advisory 仍不阻断。
- **故障面**：advisory 与硬门同权后 advisory 行数预期趋零——若未来硬门收紧新形态，两处需同步（头注释已互相锚定）。

## D-003@v1: 无显式 Wave 的 plan 统一为隐式串行执行（postcheck 硬拦降级）
- **问题**：plan 阶段宣称「light 级 plan.md 无任务区——execute 自动把注册表合成为单个隐式 Wave 串行执行」（stages/plan.js:199），execute.js parseWavesFromPlan 注释也写「单 Wave 串行执行」（:663），但 buildWavePrompt 对该隐式 Wave 下发的调度要求仍是「同一 Wave 的多个子代理必须并行启动」（:1330）——真实行为是全并行；plan-postcheck 按全并行口径把「无显式 Wave + 多 task 共享路径」硬拦（:594-599），用户被迫补 6 个 Wave 段（2026-09-17 驾驭小结负面③）。两处口径打架，且「被迫补 Wave」与轻量计划的定位相悖。
- **选项**：A 隐式 Wave 真串行——buildWavePrompt 对 `wave.implicit` 下发串行调度指令（单子代理逐个完成或逐个启动子代理等完成再下一个，禁并行），postcheck 无显式 Wave 的共享路径从 error 降为 warning；B 维持全并行，改 plan 阶段宣称与 postcheck 提示为「必须显式分 Wave」；C postcheck 自动按 depends_on 拓扑补 Wave 段（plan-adopt-waves 逻辑内联）。
- **选定**：A——串行是严格更安全的缺省（并行是显式声明的收益，不是缺省假设）；light 级「无任务区自动串行」的既有宣称成为真实行为，零格式负担；B 否决：把格式负担转嫁给所有轻量计划且与既有宣称矛盾；C 否决：静默改写 plan.md 与「plan 是 agent 产物、CLI 只校验」的分工相悖，且拓扑重排解决不了无依赖但共享文件的串行需求（topo 只看依赖不看文件重叠，friction5 D-004 同坑）。
- **影响**：execute.js buildWavePrompt（implicit 分支调度指令 + 头部标注）、parseWavesFromPlan 注释扶正、检查 0.8 错误文案重述（退化为串行、Wave 结构意图丢失）；plan-postcheck.js waveOfTask===null 分支 error→warning；plan.js:199 宣称不变（现为真）；test/plan-optimization.test.mjs Test 5f 期望随契约更新（error→warning 断言）。
- **故障面**：full 级 plan 漏写 Wave 段时从「plan --done 被拦」变为「静默串行执行（慢但安全）」——检查 0.8/0.9 已拦 wave-like 畸形标题，纯漏写以 warning 提示并行收益可补显式 Wave；无安全面劣化（串行不可能互相覆盖）。
- **退役判据**：若未来 execute 引入任务级依赖图调度（取代 Wave 粗粒度分组），隐式 Wave 语义整体退役。

## D-004@v1: verify 阶段 prompt 锚点措辞三形态化（task-04 边界扩容）
- type: consistency
- priority: P1
- status: accepted
- source: execute-w2-mirror-audit
- question: W2 镜像核对发现 src/stages/verify.js:163 阶段 prompt 写「covered/partial 附测试锚点（`.test.` 文件或 file:line）」两形态——与 D-005@v2 三形态口径同源漂移，且该文件不在任何 task allowed_paths（plan 期漏面）。
- answer: 扩 task-04 边界收口：src/stages/verify.js:163 措辞改三形态+行号可省；docs/prompt/verify.md 镜像 fence 手改同步（不跑 _extract.mjs——_extracted.json 正被并行会话 docs-bracket-reanchor 占用，避免 apply 面冲突；流水线刷新留其会话/后续统一跑）。
- normalized_requirement: verify 阶段 prompt 与预填说明/硬门/advisory 四处锚点口径同为三形态（file:line / `.test.` / 反引号），行号可省。
- impacts: [FR-02, FR-04, task-04]
- evidence: src/stages/verify.js:163、docs/prompt/verify.md:214、decisions.md D-005@v2
