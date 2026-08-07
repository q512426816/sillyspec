
### [2026-05-13] 修复 ProjectOverview.vue resetLayout 重复声明
- author: qinyi
- created_at: 2026-05-13T09:59:00Z
**问题**：Vue 编译错误 "Identifier 'resetLayout' has already been declared"
**原因**：第 40 行从 useLayout 解构 resetLayout，第 51 行又定义同名函数
**修复**：删除解构声明，保留本地函数（含确认对话框）
**文件**：packages/dashboard/src/components/ProjectOverview.vue


### [2026-05-13] 修复 dashboard 项目扫描数据格式不一致
- author: qinyi
- created_at: 2026-05-13T10:15:00Z
**问题**：dashboard 显示"0 个项目"
**原因**：watcher.js 发送的项目数据缺少 overview 字段，与 server/index.js 的 projects:init 格式不一致
**修复**：watcher.js 添加 parseProjectOverview 导入和调用，所有发送的数据现在包含 state 和 overview
**文件**：packages/dashboard/server/watcher.js

## ql-20260604-001-7a4c | 2026-06-04 16:47:41 | 对齐文件生命周期文档与工具实现
状态：已完成
文件：src/stages/brainstorm.js, src/stages/propose.js, src/stages/scan.js, src/run.js, src/progress.js, src/hooks/worktree-guard.js, test/*.mjs, docs/sillyspec/file-lifecycle*.md, .sillyspec/docs/sillyspec/modules/{stages,runtime}.md
结果：修复阶段步骤丢失、local.yaml 口径、archive confirm、sync/approval 参数接线和 worktree guard 登记校验；更新生命周期文档与剩余差异清单；新增回归测试并通过 lint/test。

## ql-20260617-002-b8d2 | 2026-06-17 11:28:01 | 默认执行 Design Grill 并引入决策版本
状态：已完成
文件：src/stages/brainstorm.js, src/stages/plan.js, src/stages/verify.js, src/stage-contract.js, test/stage-contract.test.mjs, test/stage-definitions.test.mjs
结果：Design Grill 改为设计后的默认交叉审查步骤，支持显式跳过与小型单模块豁免；decisions.md 引入 D-xxx@vN 版本链和 supersedes 机制；plan/verify/stage-contract 按当前决策版本追踪覆盖，并阻断 P0/P1 未决项；npm run lint 与 npm test 通过。

## ql-20260617-003-c3d9 | 2026-06-17 13:32:42 | 收紧 Grill 流程语义与决策 ID 解析
状态：已完成
文件：src/stages/brainstorm.js, src/stage-contract.js, test/stage-contract.test.mjs, test/stage-definitions.test.mjs, .sillyspec/docs/sillyspec/modules/stages.md
结果：合并 Grill 触发判断和深度追问为可选的需求澄清 Grill，保留 Design Grill 作为设计后默认交叉审查；决策 ID 抽取改为结构化行解析；decision record 支持 heading 与 list/YAML 风格；新增误提取和 YAML 决策阻断回归测试；npm run lint 与 npm test 通过。

## ql-20260617-004-a91f | 2026-06-17 13:52:11 | 收紧缺省 priority 的未决决策阻断
状态：已完成
文件：src/stage-contract.js, test/stage-contract.test.mjs, .sillyspec/docs/sillyspec/modules/stages.md
结果：缺 priority 的 unresolved/blocking/blocker decision 默认按 P1 处理并阻断；错误信息标注 priority=missing->P1；新增 YAML accepted decision 追踪、缺 priority 阻断、brainstorm 普通正文 D-ID 过滤回归测试；npm run lint 与 npm test 通过。

## ql-20260617-001-9c4a | 2026-06-17 11:16:23 | 接入 Grill 深度追问与决策追踪链路
状态：已完成
文件：src/stages/brainstorm.js, src/stages/plan.js, src/stages/verify.js, src/stage-contract.js, test/stage-contract.test.mjs, test/stage-definitions.test.mjs
结果：新增 Grill 触发判断和深度追问步骤；规范链路支持 decisions.md/D-xxx；plan/task/verify 引入 FR/D 覆盖追踪；stage-contract 在 decisions.md 存在时校验 D/FR ID 传播；npm run lint 与 npm test 通过。

## ql-20260604-001-7a4c | 2026-06-04 16:47:41 | 对齐文件生命周期文档与工具实现
状态：已完成
文件：src/stages/brainstorm.js, src/stages/propose.js, src/stages/scan.js, src/run.js, src/progress.js, src/hooks/worktree-guard.js, test/*.mjs, docs/sillyspec/file-lifecycle*.md, .sillyspec/docs/sillyspec/modules/{stages,runtime}.md
结果：修复阶段步骤丢失、local.yaml 口径、archive confirm、sync/approval 参数接线和 worktree guard 登记校验；更新生命周期文档与剩余差异清单；新增回归测试并通过 lint/test。

## ql-20260703-001-a079 | 2026-07-03 10:10:20 | 修复 worktree 生命周期 7 个 bug
状态：已完成（代码并入 commit 4a5f596，与 --no-worktree 谎言修复混提；message 漏标 7 bug）
关联变更：（无）
文件：src/worktree.js, src/run.js（实际改动，已随 4a5f596 提交）；docs/sillyspec/file-lifecycle.md（待 doctor 工作提交后单独补 archive worktree 段落）
结果：Bug1(resetStage 清 execute worktree) Bug2(sleep 0.5 改跨平台 busy-wait) Bug3(幽灵清理补 prune+删分支) Bug5(cleanup 返回 residual + 新增 partial result) Bug6(archive 清 worktree，未 apply 变更保留警告) Bug7(doctor stale fixable 跟随 mode) 缺口3(in-place 模式也清 metaDir)。lint 通过；测试 3 个失败为 pre-existing（stash 对比验证零新增失败）。
剔除：Bug4(BLOCKED 时保留 worktree 是正确设计，apply 成功会自动 cleanup) 缺口1(崩溃恢复范围大，单列) 缺口2(doctor 两套分叉，pre-existing 进行中)。
注意：本会话期间改动被提交到 4a5f596，commit message 只描述 --no-worktree 谎言修复，未提 7 bug；同一 commit 还混入 worktree-guard.js / worktree-isolation.md 改动。代码归属以本条目为准。

## ql-20260713-001-3e46 | 2026-07-13 13:12:51 | 修复 design/plan 契约校验两处正则误判（文件清单编号前缀 + 生命周期假豁免）
状态：已完成
关联变更：（无）
文件：src/change-list.js, src/stage-contract.js, test/design-coverage.test.mjs, test/stage-contract.test.mjs, .sillyspec/docs/sillyspec/modules/change-management.md
结果：(1) src/change-list.js:74 FILE_LIST_SECTION_RE 加可选编号前缀 `(?:\d+[.)]\s*)?`——`## 6. 文件变更清单` 不再让 parseFileChangeList 返回空、plan Step4 postcheck 不再硬阻断。(2) src/stage-contract.js validateBrainstormOutputs 的 declaresNotApplicable：去掉裸单字「无」/「na」与 40 字符宽窗口，改为要求明确多字否定短语且与「生命周期(契约)/lifecycle(contract)」紧邻（分隔符强制）——正常 design 不再被误判「已豁免」，合法豁免仍生效。回归测试：design-coverage 加编号章节单元+覆盖对账两层；stage-contract 加 3 个 lifecycle 用例。node 预验 22 用例全符预期；npm test 全套 50 文件 0 失败；npm run lint 通过。同步更新 change-management 模块文档。

## ql-20260713-002-7628 | 2026-07-13 15:07:23 | 修复 quick 守卫两缺陷：baseline 漏捕 .sillyspec/ untracked + --done 忽略 force/allow flag
状态：已完成
关联变更：（无）
文件：src/run.js, test/quick-baseline-dirty-worktree.test.mjs, .sillyspec/docs/sillyspec/modules/core-engine.md
结果：Fix A：run.js baseline 录入去掉 `.sillyspec/` 粗过滤（line ~1967），预存 untracked `.sillyspec/changes/` 现进 baseline、audit 经 baselineFilesSet 排除；quick 自身元数据本由 audit 侧 isQuickMetadata 精确豁免，不需粗过滤。Fix B：`--done` 的 `--force-baseline`/`--allow-new` 经 completeStep 选项并入 guard（调用点 1695 + 解构 2617 + 审计调用 2993 取或），原只传 `{isConfirm}` 致 flag 静默无效；并修正审计复审误导文案。回归：quick-baseline-dirty-worktree 加场景 8（预存 untracked → safe）+ 场景 9（对照：本次新建仍 blocked，守卫未弱化）。合并语义 5 用例 + 全套 npm test 50 文件 0 失败 + lint 通过。同步 core-engine 模块文档。注：本会话 step 1 已声明 --force-baseline（动 src/run.js DANGEROUS 文件）；后续会话可改在 --done 传 flag（Fix B 生效）。

## ql-20260722-001-25e4 | 2026-07-22 14:39:37 | (quick 任务)
状态：已完成
关联变更：（无）
文件：src/run.js

结果：validateChangeExists 新增于 stage-contract.js（plan/execute/verify/archive 阶段强制 changes/<name> 存在，quick sessionId/brainstorm 等豁免）；runCommand 在 pm.read/initChange 之前调用校验（关键：initChange 会先建 changes/ 目录）；test/change-exists-validation.test.mjs 16/16 通过；端到端验证 plan --change ghost 报错且不建目录。模块文档跳过（无 _module-map）。

## ql-20260802-001-b6d8 | 2026-08-02 01:36:46 | init 为 Claude Code 生成 CLAUDE.md（版本感知三态四分支注入）
状态：已完成
关联变更：2026-08-02-init-claude-md
文件：
- src/init.js（新增 export function injectClaudeInstructions(projectDir)：版本感知三态四分支——不存在写完整模板+顶部版本注释 / 存在无标记追加受管段 / 同版本跳过 / 异版本追加态 replace START..END 块·完整态仅 stderr 提示；doInstall 三工具注入循环后加 if(tools.includes('claude')) 调用点，claude 不进 INSTRUCTION_TOOLS）
- templates/claude-instruction.md（新建：从 sillyspec 自身 CLAUDE.md 提炼的 17 条通用核心规则，去 dogfood/npm/multi-agent/规则14·18·19/文件生命周期段/提示词同步段/汇报格式段/爸爸~爸爸~，正文不含版本注释）
- test/init-claude-injection.test.mjs（新建：5 组 27 断言——无文件写全文 / 追加受管段 / 同版本跳过 mtime 不变 / 异版本追加态块刷新块外保留 / 异版本完整态不覆盖+stderr / CRLF 兼容）

结果：需求：sillyspec init 对 claude 只检测+复制 skills，不生成 CLAUDE.md（codex/gemini/opencode 都有指引文件），需补齐。根因：claude 不在 INSTRUCTION_TOOLS，缺独立 FULL 模板注入函数。方案：①新增 templates/claude-instruction.md（17 条通用核心规则，去 dogfood/npm/multi-agent/规则14·18·19/文件生命周期段/提示词同步段/汇报格式段/爸爸~爸爸~，正文无版本注释）；②src/init.js 加 export function injectClaudeInstructions(projectDir)，版本取 getVersion()，三态四分支（不存在→写完整模板+顶部版本注释；存在无 <!-- SillySpec v 标记→追加受管段；同版本→跳过；异版本→追加态 replace START..END 块/完整态仅 stderr 提示），doInstall 加 if(tools.includes('claude')) 调用，claude 不进 INSTRUCTION_TOOLS；③新增 test/init-claude-injection.test.mjs 5 组 27 断言含 CRLF。结果：npm run lint 全过(66 文件)；npm test 全量 106/106（首次 spec-dir Windows 已知 flaky 隔离跑+重跑全过，非回归）；新测试 27/27；改动 templates/claude-instruction.md(新)+src/init.js(改)+test/init-claude-injection.test.mjs(新)，不动 stages/run.js/progress.js 故 file-lifecycle.md/docs/prompt 无需同步。

## ql-20260802-002-36ae | 2026-08-02 13:00:43 | spec-dir.test.mjs 全量套件 Windows flaky 防御（run 加 retry+诊断+timeout）
状态：已完成
关联变更：（无）
文件：
- test/spec-dir.test.mjs（run() 加偶发崩溃防御：execSync 失败打印 cmd+stderr 诊断 + 1 次重试吸收罕见偶发非0退出 + timeout 10s→30s 留余量；重试仍失败抛清晰错误保留确定性失败定位）

结果：需求：spec-dir.test.mjs 全量套件下罕见进程级崩溃（run-tests 报 exited 无内部断言汇总），隔离单跑恒过，flaky 偶发误判回归。根因：实证复现率~13%（15次2次），进程级崩溃=未捕获异常；timeout 假设排除（子进程<1s），home 碰撞排除（Test5 projectDir 自带.sillyspec）；疑似 CLI 子进程罕见非0退出（db锁/指针竞态），flaky 罕见无法稳定抓 stderr 证实。方案：test/spec-dir.test.mjs 的 run() 加偶发崩溃防御——execSync 失败打印 cmd+stderr 诊断再重试一次（吸收偶发降flaky率，重试仍失败抛清晰错误保留定位），timeout 10s→30s。坦诚：非根因治愈，是 retry吸收+诊断增强；根因待未来重试仍失败时按 stderr 定位。结果：spec-dir 单跑38/38；lint过(66文件)；连跑全量4次 spec-dir 全过(retry未触发兜底就位)；flaky坑已记 knowledge/uncategorized.md。改1文件 test/spec-dir.test.mjs。

## ql-20260802-003-752e | 2026-08-02 13:38:20 | quick --done 完成推荐改推「提交」，不再盲推 scan 回头路
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（阶段完成推荐加 quick 专属 else-if 分支，对齐 brainstorm 先例：完成后推「提交本次改动/继续 run <stage>」不推 scan，注释说明 quick 是收尾阶段、走 _getNextSuggestion 会因 scan 首位永未完成误推回头路；不动全局 _getNextSuggestion）
- test/quick-cli-managed-e2e.test.mjs（step3 --done 保存 captureStdout 返回值，加断言「含提交、不含 run scan」守护）

结果：需求：quick --done 完成后 CLI 盲推 sillyspec run scan（scan 是 STAGE_ORDER 首位辅助阶段永未完成），但 quick 是收尾阶段该提交，推 scan 是回头路/无关，误导 agent。根因：complete.js 阶段完成推荐里 brainstorm/archive/verify/execute/plan 有专属分支，quick 走 else 分支调 _getNextSuggestion → 命中首位 scan。方案：对齐 brainstorm 先例（line351-361 同为避推 scan 而设专属分支），给 quick 加 else-if 分支，完成后推「提交本次改动/继续 run <stage>」不推 scan，不动全局 _getNextSuggestion 零回归。结果：src/run/complete.js 加 quick 专属分支 + 注释；test/quick-cli-managed-e2e.test.mjs step3 --done 加断言「含提交、不含 run scan」；e2e 单跑 15/15 新断言 PASS；lint 过；全量 npm test 106/106 无回归。改 2 文件 complete.js+quick-cli-managed-e2e.test.mjs。

## ql-20260802-004-456b | 2026-08-02 13:44:04 | QUICKLOG/tasks.md 标题占位符修复（启动从关联变更回退 + 翻完成按需求刷新）
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（新增导出 deriveTitleFromLinkedChange 读关联变更 proposal/design 首个 # 标题去前缀 + 内部 extractTitleFromResult 从 --output 提「需求：」摘要；flipEntryInContent 翻完成时按需求摘要刷新标题行，覆盖启动占位）
- src/run/stage.js（import deriveTitleFromLinkedChange + allocateQuicklogEntry 前 desc 空 && linkedChanges 非空时回退 deriveTitle，避免启动落 (quick 任务)）
- test/quicklog-cli-managed.test.mjs（加验收 2c：deriveTitle 三场景 proposal/design/无文档 + flipEntry 刷新标题，7 断言）

结果：需求：quick 启动不带 --input 时 QUICKLOG 条目与关联 tasks.md 标题落 (quick 任务) 占位符，必须 --done 后手动精修。根因：stage.js:243 description=taskDescription(=inputText)，空则 quicklog.js sanitizeDesc 回退 (quick 任务)，CLI 启动时拿不到语义标题。方案：①quicklog.js 新增 deriveTitleFromLinkedChange(读关联变更 proposal/design 标题去前缀)+extractTitleFromResult(从--output提需求摘要)；②flipEntryInContent 翻完成按需求摘要刷新标题；③stage.js 启动 desc 空&&有 linkedChanges 时回退 deriveTitle。结果：优先级 --output需求>proposal标题>占位；quicklog-cli-managed 验收2c 7断言全过(deriveTitle三场景+刷新标题)；单跑67/67；lint过；全量106/106无回归。改3文件。

## ql-20260802-005-5240 | 2026-08-02 22:13:29 | 修 brainstorm-wait-and-review-path-pitfalls.md 两个真 bug
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（坑1：新增导出 resolveWaitingStepWithAnswer(steps,doneAnswer,nowStr)——把首个 status==='waiting' 步骤拉回 pending+补 waitAnswer+记一轮 waitAnswers+清 waiting 字段；completeStep currentIdx 选择后接入：doneAnswer 且存在 waiting 时调用、currentIdx 指向被解步骤、主流程 requiresWait 门控见 waitAnswer 已置→不阻断→正常 completed；对齐 continueStep requiresWait 回 pending 语义；仅 --answer 触发，普通 --done 零行为变化）
- src/stage-review.js（坑3：renderReviewJsonContract tier=self 分支提示改非承诺式——保留 tier=self 标记，注明基于此刻 design.md 快照、gate 以 --done 时刻 design.md 重判、design 扩大到>3 文件升级 independent 硬要求 review.json、以 gate 实际校验为准；不再硬承诺「无需产出」）
- test/wait-done-answer-resolves-waiting.test.mjs（新建：28 断言——resolveWaitingStepWithAnswer 4 场景单元[waiting 解掉/无 waiting/无 answer/多 waiting 仅解首个] + completeStep 端到端解 brainstorm 已 waiting 的 requiresWait 步骤[step5 waiting→completed、不报等待用户输入、不越权推进后续] + 坑3 文案含 TOCTOU 警告校验）
- test/stage-review-contract.test.mjs（line46 断言更新：旧 md.includes('无需产出') 锁的是坑3 bug 本身，改为校验新契约「tier=self + 提 gate 以 --done 重判 + 可能升级 independent」）

需求：修 brainstorm-wait-and-review-path-pitfalls.md 两个真 bug。坑1：--done --answer 落到已 --wait 暂停的 requiresWait 步骤时，completeStep currentIdx=findIndex(pending||in-progress) 排除 waiting，跳过该步骤、--answer 静默丢失、步骤永久卡 WAITING、末步报'Step N 等待用户输入'无法 finish。坑3：stage-review.js renderReviewJsonContract tier=self 分支硬承诺'无需产出 review.json'，但 gate 以 --done 时刻 design.md 重判可升级 independent 硬要 review.json（TOCTOU）。坑2 已被 d20fc63 修，跳过。
根因：坑1=状态机 currentIdx 选择谓词遗漏 waiting；坑3=tier 在 prompt 早算（design.md 未补全→fileCount=0→self）/gate 晚算（design.md 完整→>3→independent）快照不一致。
方案：坑1 新增导出 resolveWaitingStepWithAnswer(steps,doneAnswer,nowStr)——把首个 waiting 步骤拉回 pending+补 waitAnswer+记一轮 waitAnswers+清 waiting 字段；completeStep currentIdx 后接入，主流程 requiresWait 门控见 waitAnswer 已置→不阻断→completed（对齐 continueStep 回 pending 语义；仅 --answer 触发，普通 --done 零变化）。坑3 软化 tier=self 提示为非承诺式（保留 tier=self 标记+注明基于此刻 design.md 快照+gate 以 --done 重判+design 扩大升级 independent+以 gate 实际校验为准）。
结果：新增 test/wait-done-answer-resolves-waiting.test.mjs 28 断言全过（helper 4 场景+completeStep 端到端+坑3 文案）；更新 test/stage-review-contract.test.mjs line46 锁新契约；全量 node test/run-tests.mjs REAL_EXIT=0 通过 107 失败 0；npm run lint 66 文件过。改 2 源+2 测试，docs/prompt/file-lifecycle 均无需同步。

## ql-20260802-006-4af1 | 2026-08-02 22:41:50 | quicklog appendTaskCheckbox 不再 fabricate 幻影 change 目录
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（appendTaskCheckbox：删 mkdirSync 硬造目录，加 existsSync(dir) 守卫，关联目录不存在直接 return 不写 tasks.md）
- test/quicklog-cli-managed.test.mjs（验收1/验收2 预建真实 change-a/change-b 目录；新增验收1b 验证笔误变更名不 fabricate 目录、关联仍记 QUICKLOG）
- test/quick-cli-managed-e2e.test.mjs（端到端预建 2026-07-06-kanban-better-board 目录，对齐 linkedChanges 须预存契约）

需求：quick --linked-changes 指向笔误/未建变更时不应凭空 fabricate 出幻影 change 目录（历史坑 quick-change-phantom：误传 --change <名> 致 step3 边界审计 BLOCK「危险文件变更 .sillyspec/changes/<名>/」，得手动 rm 幻影目录）。
根因：appendTaskCheckbox（src/quicklog.js:226）对不存在的关联变更目录硬调 mkdirSync，把 linkedChanges「关联标签」当成「真变更目录」造 tasks.md 桩；而关联标签本应由 allocateQuicklogEntry 独立记入 QUICKLOG「关联变更：」行，与目录是否存在无关。越界 fabricate 污染 .sillyspec/changes/ → 边界审计自造自拦。
方案：appendTaskCheckbox 加 existsSync(dir) 守卫——目录不存在直接 return，不写 tasks.md、不建目录；关联标签的 QUICKLOG 行写入路径（allocateQuicklogEntry line 330）独立于本函数，不受影响。测试侧：原断言依赖 mkdirSync 造目录，故改为在 setup 阶段预建真实 change 目录（反映「linkedChanges 须预存」的正确契约），并新增验收1b 显式验证 fabricate 不再发生。
结果：全量测试 107 通过 / 失败 0，lint 干净，零回归；审计 SAFE（本轮新增 3 业务文件）。

## ql-20260803-001-9c4e | 2026-08-03 14:24:57 | 修 reopen --done 步骤状态不同步（回填 stale→completed）
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（阶段完成分支新增 stale 回填：nextPendingIdx===-1 且无 waiting 时把剩余 stale 置 completed 并落盘，消除 6/8 与阶段已完成矛盾）
- src/progress/stage-machine.js（completeStage SQL 扩为 status IN ('pending', 'stale')，stale 一并回填）
- test/revision-v1.test.mjs（新增 Case 11：reopen from-step 3 → completeStage --force → 含 stale 全部 completed）
- test/run-complete-step-brainstorm.test.mjs（新增集成测试：reopen from-step 6 → --done 末步 → stale 7/8 回填、无"状态不同步"警告）

需求：--reopen --from-step N 后 --done 致步骤状态不同步（6/8 与阶段已完成矛盾、误报"状态不同步"警告）。
根因：completeStep 阶段完成分支只找 pending/in-progress，遗漏 stale；stage.js:141-148 已把 stale 视为可执行，但 complete.js 的 currentIdx/nextPendingIdx 排除 stale，导致 --done 完成后剩余 stale 被跳过、阶段被误标 completed。
方案：complete.js 阶段完成分支把剩余 stale 同步置 completed 并落盘；stage-machine.js completeStage SQL 扩为 status IN ('pending', 'stale')；补两个回归测试（ProgressManager 层 + completeStep 集成层）。
结果：npm test 全过（107 基础 + 新增 12 + 26 相关测试零失败）、lint 过（66 文件）、git 已暂存 4 文件 + 模块文档已同步、quick 边界审计 SAFE。

## ql-20260803-002-eff0 | 2026-08-03 14:54:44 | 修 archive step3 sync-module-docs 不写模块文档（加 requiresWait）
状态：已完成
关联变更：（无）
文件：
- src/stages/archive.js（sync-module-docs 步骤加 requiresWait:true，--continue 确认后回到本步由 agent 写模块卡片，修 verify-archive-flow-pitfalls 坑4）
- docs/prompt/archive.md（Step 3 等待配置行从「无（可直接 --done）」改为 requiresWait）
- docs/prompt/_extracted.json（重新提取，sync-module-docs 元数据含 requiresWait:true）
- test/archive-sync-module-docs-wait.test.mjs（新建：requiresWait 定义 + --continue 回 pending + --done 被拒/--answer 推进）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引追加 ql-ID）

需求：archive step3 sync-module-docs 用 --continue --answer "确认写入" 后 CLI 直接标 completed 推进，agent 无机会按 module-impact.md 写模块卡片（verify-archive-flow-pitfalls 坑4）。
根因：该步骤缺 requiresWait，continueStep 的 shouldReturnToCurrentStep=false（complete.js:719），确认后不回到步骤、写入完全依赖 agent 自觉。
方案：给 sync-module-docs 加 requiresWait:true，使 --continue 确认后回到本步（pending）由 agent 写卡片，--done --answer 可一步完成；同步 docs/prompt/archive.md 等待配置 + _extracted.json + stages 模块文档。
结果：新测试 archive-sync-module-docs-wait.test.mjs 9/9 过（requiresWait 定义 + --continue 回 pending + --done 被拒/--answer 推进），npm test 108 全过，lint 过（66 文件），quick 边界审计 SAFE。

## ql-20260803-003-8dd5 | 2026-08-03 15:20:54 | progress repair 按 review.json 客观产出自动修 execute pending step（不再一律 manual）
状态：已完成
关联变更：（无）
文件：
- src/progress/consistency-doctor.js（新增 Fix e：execute completed stage 有 pending/stale/in-progress step，且 summarizeTaskCompletion 客观源可用（source=review.json、pending=0）时把脱钩 step 自动标 completed——action=align_execute_steps_to_reviews；否则回落 Manual a 保守不动，不碰非 execute 阶段）
- test/revision-v1.test.mjs（新增 Case 12：review.json 全 pass → 自动修、2 pending→completed、不归 manual；Case 13：review.json 缺失 → 仍归 manual 保守）

需求：progress repair 对「execute completed stage 有 pending step，但 task 实际 review.json 客观产出已全通过」仍保守归 manual，不按实际产出自动修（verify-archive-flow-pitfalls 坑1+坑5）。
根因：repairConsistency 的 Manual a 对 completed stage 内 pending/stale/in-progress step 一律报 manual，无「按 review.json 客观产出判定」分支，execute 状态脱钩（plan 加 Wave / execute Wave step 未走 --done）无自动收敛路径。
方案：consistency-doctor.js 新增 Fix e——仅当 stageName=execute、changeName 有效、summary.source=review.json 且 pending=0（所有 task verdict 通过）时，把脱钩 step 自动标 completed（align_execute_steps_to_reviews），否则回落 Manual a 保守不动；Manual a 对已自动修的 execute 不重复 push；执行异常 catch 回落 manual。
结果：Case 12（review 全 pass → 自动修）/Case 13（review 缺失 → 仍 manual）通过；npm test 108/108 无回归；lint 66 文件过；quick 边界审计 SAFE。

## ql-20260804-001-64e5 | 2026-08-04 13:11:22 | 登记复盘新观察：Grill fail 后复审边界未定义（P4.3a）+ docHash 手算摩擦复发旁注（P6.1b）
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/prompt-control-debt.md（P4.3 下加 P4.3a 子项 / P6.1b 下加复发记录子项 / 推进记录表加 2026-08-04 行 / frontmatter updated_at 刷新；doc-only 不动源码）

需求：把一次 SillySpec 使用复盘里 4 条改进点中真正需登记的两条固化进控制层债务清单——c 的新角度（Grill fail 后复审边界未定义）+ b 的 docHash 手算摩擦复发。
根因：复盘 a/b/c/d 四条——a（自审不卡真实性）= P3.1 done-by-design（自审故意只做机械格式检查，语义交 Grill；这次 Grill 正好抓到假核实，机制按设计工作，非缺陷）；d（过时注释）属目标项目非本仓；剩下 c 的新角度与 b 的复发债单未记，需固化为可追溯条目供后续复评，避免重复造轮子。
方案：仅改 docs/sillyspec/prompt-control-debt.md（doc-only）——① P4.3 下新增子项 P4.3a（Grill fail 后复审回路未定义，grep brainstorm.js 实证 fail/cannot_verify 后回路为空；裁决随 P4.3 维持 defer，因「修正后够不够好」是语义软判定推 sillyhub，附诚实标注缓解留 follow-up）；② P6.1b 下加复发记录子项（2026-08-04 手算 sha256 易错，不推翻 defer，记 2 次摩擦供复评）；③ 推进记录表加 2026-08-04 行；④ frontmatter updated_at 刷新。
结果：npm run lint 66 文件 0 错通过；doc-only 不触及 src/test 故未跑 npm test（套件不受影响）；git diff 确认仅目标文件改动 + CLI 接管的 QUICKLOG 骨架；quick 边界审计 SAFE。

## ql-20260804-002-28c6 | 2026-08-04 13:29:19 | 登记 plan+quick 复盘 7 条：4 新债（TaskCard 行数 / plan→scan 回头路 / QUICKLOG 落盘 / lint doc 空转）+ 3 裁决否决
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/prompt-control-debt.md（新增「2026-08-04 复盘增补」整节：4 新债 plan-b/plan-c/quick-①/quick-② + 3 裁决 plan-a⊘/plan-d=P4.3a/quick-③，每条带源码实证；P4.3a 追加 plan 命中证据；推进记录表加行；总结加 batch bullet；updated_at 刷新）
- docs/troubleshooting.md（CRLF 条目处置段加一行 autocrlf 轻度症状交叉引用；quick-③ 同根不另立条目）

需求：把 plan+quick 阶段使用复盘的 7 条改进点核实后批量登记进债务清单/troubleshooting（先查债单 + 源码实证，不重复提议已决策项）。
根因：7 条逐条核实——plan-a（TaskCard 格式不一）源码 plan.js:370-408 已有完整逐字示例，非债务；plan-d（独立审查单次）= 上条 P4.3a 且 stage 通用；quick-③（autocrlf 噪音）= troubleshooting CRLF 条目方向 A 同根轻度症状——3 条已决/已覆盖。余 4 条真新债：plan-b（20-40 行纯 persuasion + postcheck 不校验 title_zh → 静默丢字段）、plan-c（complete.js:421-422 plan→scan 回头路仅修 brainstorm/quick，plan/execute/verify 漏）、quick-①（QUICKLOG 四段 --output 落盘成单行双层「结果：」前缀）、quick-②（lint 对 doc-only 空转）。
方案：doc-only 改两文件。prompt-control-debt.md 新增整节（每条带源码实证 + 裁决：4 新债 ⏭/🐛 留 follow-up、3 裁决 ⊘ 否决）+ P4.3a 追加 plan 证据 + 推进记录表行 + 总结 bullet + updated_at；troubleshooting.md CRLF 条目加 autocrlf 交叉引用。
结果：npm run lint 66 文件 0 错；doc-only 不触及 src/test 故未跑 npm test；git diff 确认仅 2 声明文件改动；quick 边界审计 SAFE（注：prompt-control-debt.md 因属前序 baseline 被算作累计暂存，CLI 骨架漏列该文件，本精修已补）。

## ql-20260804-003-e439 | 2026-08-04 14:27:59 | 解决复盘 4 新债：plan-postcheck title_zh 硬校验 + scan 回头路根因修 + quicklog 四字段归一 + lint doc 空转精细化
状态：已完成
关联变更：（无）
文件：
- CLAUDE.md（quick-②：规则 8 精细化——触及 src/test 才必跑 lint/test，纯 doc/配置改动可跳过）
- templates/claude-instruction.md（quick-②：同规则 8 镜像同步）
- docs/sillyspec/prompt-control-debt.md（4 新债标已解决 + 推进记录 + 总结更新）
- src/stages/plan-postcheck.js（plan-b：frontmatter 加 title_zh 完整性硬校验，缺则 error）
- src/progress/stage-machine.js（plan-c：_getNextSuggestion 跳过 scan + upstream 排除 scan，根因修 plan→scan 回头路）
- src/quicklog.js（quick-①：flipEntryInContent 单行四字段归一为多行，消除双层「结果：」前缀）
- test/next-suggestion.test.mjs（plan-c 回归用例：brainstorm completed → 应推 plan 而非 scan）
- test/plan-optimization.test.mjs（Test13 缺 title_zh 失败 + Test10 fixture 补 title_zh + total 12→13）
- test/plan-postcheck-crlf.test.mjs（LF_BODY / inlineBody 补 title_zh，真缺字段场景仍报错）
- test/quicklog-cli-managed.test.mjs（验收 2d：单行四字段 → 4 行、无「结果：需求：」双层前缀）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引追加 plan-b 条目）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引追加 plan-c/quick-① 条目）

需求：把 prompt-control-debt 2026-08-04 复盘 4 项新债（plan-b TaskCard 行数逼丢字段 / plan-c plan→scan 回头路 / quick-① QUICKLOG 四段落盘粗糙 / quick-② lint 对 doc 空转）从登记升级为已解决并登记进进度库。

根因：4 项均为复盘实证的真实摩擦——plan 子代理压行数静默丢 title_zh；scan 永未完成且居 STAGE_ORDER 首位、upstream 空恒就绪导致误推回头路；quick step3 --done 四字段被 CLI 原样塞单行、产生双层「结果：」前缀；lint 只扫 JS 对 doc 改动零信息。

方案：plan-postcheck.js 加 title_zh 完整性硬校验（enforcement）；stage-machine.js _getNextSuggestion 跳过 scan 且 upstream 排除 scan（根因修）；quicklog.js flipEntryInContent 单行四字段归一为多行；CLAUDE.md+claude-instruction.md 规则 8 精细化（触及 src/test 才必跑 lint/test）；补 4 处回归测试 + 债单状态与模块变更索引标已解决。

结果：npm test 108/0、npm run lint 66 文件 0 错；4 处回归全过——next-suggestion 9/9（含 plan-c 用例）、quicklog-cli-managed 74/0（含 2d 单行四字段）、plan-optimization 13/0（含 Test13 缺 title_zh）、plan-postcheck-crlf 10/10（fixture 补 title_zh）。

## ql-20260804-004-3a24 | 2026-08-04 15:02:33 | 修 quicklog 单行四字段落盘字段误拆：按序+字段边界双级扫描，正文引用标签字样不再误断行
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（splitSingleLineFields 双级扫描：字段边界严格扫描 isFieldBoundary/findBoundaryLabel + 顺序扫描兜底 scanFields；flipEntryInContent 单行归一分支改调它）
- test/quicklog-cli-managed.test.mjs（新增验收 2e 字段标签引用不误拆 + 2f 根因内嵌正则含四标签仍正确分段）
- docs/sillyspec/prompt-control-debt.md（quick-① 条目加 follow-up 备注）

需求：修 quicklog 单行四字段落盘的字段标签误拆边界——字段正文引用标签字样不再被误断行。

根因：quick-① 首修用 split(/(?=需求：|根因：|方案：|结果：)/) 在正文任意位置切，QUICKLOG 精修时实证根因里写「双层「结果：」前缀」被误切产生伪行；本次登记本 quick 又实证根因内嵌正则（含四标签）时，引用的「方案：」先于真实方案标签、被顺序扫描误当真实标签→分段错乱（CLI 落盘即现场）。

方案：quicklog.js 单行四字段归一改为 splitSingleLineFields 双级扫描——先按字段边界严格扫描（真实标签=串首/前导空白/句末标点。；！？，引用字样因前导「/|( 非边界字符而跳过）；严格失败退回顺序扫描兜底；缺标签返回 null 落单行兜底（--done 契约仍拦缺字段）。补回归 2e/2f（改前红改后绿）。

结果：quicklog-cli-managed 82/0（含 2e/2f 8 断言）、全量 npm test 108 文件 0 失败、npm run lint 66 文件 0 错。

## ql-20260804-005-83d8 | 2026-08-04 16:04:26 | execute 复盘 3 债（Task Review 对账 / Stage Review marker / apply 口径）修复登记
状态：已完成
关联变更：（无）
文件：
- src/task-review.js（verifyReviewGitEvidence 新增 parsePorcelainFiles 解析 git status --porcelain，working-tree 未提交改动并入 diffFiles 后再交叉比对）
- src/stage-review.js（getLatestStageReviewRunId marker ^review- 前缀校验 + fallback 按 review.json reviewedFiles[0] 归属变更过滤 fail-closed）
- src/worktree-apply.js（新增 resolveApplyAllowSet = design §6 ∪ 全部 task allowed_paths，applyWorktree 改用它）
- test/agent-gate-hardening.test.mjs（新增未 commit 时 changedFiles 与 working-tree 有交集 → ok 回归用例）
- test/stage-review.test.mjs（新增 marker exec- 前缀忽略 + cross-change fallback 过滤回归用例）
- test/worktree-allow-list-violations.test.mjs（新增 resolveApplyAllowSet union 回归用例 ⑦）
- docs/sillyspec/prompt-control-debt.md（2026-08-04 execute 复盘增补 3 债登记 + 推进记录行 + Q-④ 重跑 run 误建空会话观察）

需求：execute 复盘 3 债（Task Review 对账 / Stage Review marker / apply 口径）修复登记
根因：(a)子代理未 commit 时 base..head diff 为空、changedFiles 交叉比对必判不相交伪造；(b)marker 缺格式校验+fallback 扫描跨变更串台；(c)apply 只认 design §6、plan allowed_paths 已含测试/产物文件却过不去
方案：(a)verifyReviewGitEvidence 新增 parsePorcelainFiles 解析 git status --porcelain，working-tree 改动并入 diffFiles 后再交叉比对，未 commit 不再误判伪造；(b)getLatestStageReviewRunId 校验 marker ^review- 前缀（exec- 忽略+warn+退回扫描）、fallback 按 review.json reviewedFiles[0] 归属变更过滤、无归属 fail-closed null；(c)新增 resolveApplyAllowSet = design §6 ∪ 全部 task allowed_paths，applyWorktree 改用它，越界文件仍拦
结果：agent-gate-hardening 30/0、stage-review 56/0、worktree-allow-list 7/0、全量 npm test 108 文件 0 失败、npm run lint 66 文件 0 错

## ql-20260804-006-2582 | 2026-08-04 16:22:48 | verify 复盘 3 负面点处置——关键词判级误判 / 测试重复跑 198s×2 / CLI 对账静默无进度
状态：已完成
关联变更：（无）
文件：
- src/stages/verify.js（b：step6「运行测试和质量扫描」prompt 减法——不重复手动跑全量测试统一交 CLI 对账 + 首段💡说明同步）
- src/run/gates.js（c：verify 对账调用前加「⏳ 同步对账请等待」预告，放调用点不污染 machine-interface --json）
- docs/prompt/verify.md（b：按 _extracted.json 同步 step6 + 进度确认首段两处 prompt 原文）
- docs/prompt/_extracted.json（b：重提取产物）
- docs/sillyspec/file-lifecycle.md（b：verify 阶段行补「step 不重复手动跑全量测试」）
- docs/sillyspec/prompt-control-debt.md（verify 复盘增补 section：a 评估保留 / b、c 修复 + 推进记录行）

需求：verify 复盘 3 负面点处置——关键词判级误判 / 测试重复跑 198s×2 / CLI 对账静默无进度
根因：(a)detectChangeRisk 是机械字面匹配不认否定语境（design 写不改 daemon 仍判 critical），但 frontmatter risk_level 显式豁免已实现且 prompt 已告知，非缺陷；(b)verify step6 要求 agent 手动跑测试 + CLI --done 又对账跑一遍（按变更命中模块），同一命令耗时翻倍；(c)CLI 对账 execSync 同步阻塞 198s 期间 stdout 全静默，agent 以为卡死
方案：(a)评估保留——已实现显式豁免，不改；(b)verify.js「运行测试和质量扫描」step prompt 减法：不重复手动跑全量测试（统一交 CLI 对账执行一次），step 只做 lint/静态 + 可选冒烟；同步首段说明 + docs/prompt 重提取 + file-lifecycle 补句；(c)gates.js verify 对账前加 ⏳ 进度预告（放调用点，machine-interface --json 不被污染）
结果：run-complete-step-verify 17/0、stage-definitions 全过、verify-postcheck-module 33/0、全量 npm test 108 文件 0 失败、npm run lint 66 文件 0 错

## ql-20260804-007-617f | 2026-08-04 16:52:46 | 全流程复盘 3 重点处置——集成层测试盲区 / Task Review base..head 对账坑 / 429 中断无 checkpoint 续跑
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（①b：全局验收标准模板加「集成敏感 task 建议加集成冒烟验收——组件单测全绿 ≠ 集成正确」条）
- src/stages/execute.js（③：buildWavePrompt 加「### 中断续跑」段——已勾选 - [x] task 跳过不重跑、status+run execute 回 Wave step 续跑、不重置）
- templates/prompts/verify-probes.md（①a：探针 3 加第 4 条集成盲区提示——测试文件存在 ≠ 集成正确，路由/layout 敏感 task 检查集成冒烟覆盖）
- docs/prompt/plan.md（同步：全局验收标准加集成冒烟条）
- docs/prompt/execute.md（同步：Wave 1 完整 prompt 加中断续跑段）
- docs/prompt/_extracted.json（重提取产物）
- docs/sillyspec/file-lifecycle.md（plan/execute 阶段行补句：集成冒烟引导 + 中断续跑引导）
- docs/sillyspec/prompt-control-debt.md（全流程复盘 section：a persuasion 补强 / b=exec-a 已修复 / c prompt 引导续跑 + 推进记录行）

需求：全流程复盘 3 重点处置——集成层测试盲区 / Task Review base..head 对账坑 / 429 中断无 checkpoint 续跑
根因：(a)verify 探针 3 只查测试文件存在不查集成覆盖，组件单测全绿但 layout 守卫重定向只有部署+浏览器暴露；(b)子代理不 commit 时 base..head diff 空被判伪造（= 已修的 exec-a 复述）；(c)execute checkpoint 是 Wave 级 step + plan.md checkbox 隐式 task 级，429 中断后机制可续跑但 prompt 无引导，agent 误以为只能重置
方案：(a)persuasion 补强——探针 3 加集成盲区提示 + plan 全局验收标准加集成冒烟条（CLI 无法替 agent 判断集成层是否测到位，推 agent/人类）；(b)评估=exec-a 已修复，登记确认；(c)prompt 引导续跑——execute Wave prompt 加中断续跑段（已勾选 task 跳过、status+run execute 续跑、不重置）；否决 task 级 checkpoint 机制（checkbox 已隐式持久化，工程大收益边际）
结果：stage-definitions/plan-postcheck-crlf(10/0)/plan-execute-contract(56/0)/verify-postcheck-module(33/0)/execute-batch(18/0) 全过、全量 npm test 108 文件 0 失败、npm run lint 66 文件 0 错

## ql-20260805-001-fa67 | 2026-08-05 11:48:24 | 根治 spec-dir.test.mjs 全量套件下偶发进程级崩溃（Windows flaky）
状态：已完成
关联变更：（无）
文件：
- test/spec-dir.test.mjs（根治代 retry 缓解：新增 ISO_HOME 隔离目录 + run() 给所有 CLI 子进程注入 HOME/USERPROFILE env 指向独立 tmp，不读写真实 home 指针；retry 兜底保留；注释更新为根因=home 指针污染非 db 锁）

需求：根治 spec-dir.test.mjs 全量套件下偶发进程级崩溃（Windows flaky）。
根因：CLI 子进程 resolveSpecDir 上溯定位，偶发读到被其他测试污染的 ~/.sillyspec-platform.json 指针 → drift/崩溃（home 指针跨测试污染竞态）。
方案：所有 CLI 子进程注入隔离 HOME/USERPROFILE（独立 tmp），不读写真实 home 指针；retry 保留为兜底。
结果：spec-dir 38/0、全量 npm test 3 轮 0 失败、retry 警告不再触发、lint 66 文件 0 错。

## ql-20260805-002-1ee8 | 2026-08-05 11:59:17 | execute 完成后手动补的 task（reopen/直接实现）缺 review.json
状态：已完成
关联变更：（无）
文件：
- src/index.js（新增 case 'backfill-reviews'：复用 generateTaskReviewDrafts 薄包装；--change 解析缺失 exit2、--spec-dir 透传 platformOpts.specRoot、--json 结构化输出、非 json 分级打印 generated/skipped/unattributed/reason/executeRunId；printUsage 加帮助行 + topCommands 注册）
- test/backfill-reviews.test.mjs（新建：5 组 22 断言——无 --change exit2 路由 / 补写 cannot_verify 草稿 changedFiles 命中 / 幂等不覆盖 agent 升级的 pass / --json 可解析 command=backfill-reviews / 无 tasks 目录 reason 容错）

需求：execute 完成后手动补的 task（reopen/直接实现）缺 review.json，archive step1 客观完成度（真相源=review.json verdict）判缺阻断归档，手工拼 JSON 是唯一路径。
根因：generateTaskReviewDrafts 草稿兜底机制已存在但只在 execute --done 触发，完成后手动补 task 无独立触发点。
方案：薄包装暴露为顶层命令 sillyspec backfill-reviews --change <name>，复用 generateTaskReviewDrafts（幂等、fail-open），据 git diff base..head+working-tree 按 task allowed_paths 归属生成 cannot_verify 草稿，agent 复核升级 pass/fail；--spec-dir 透传、--json 结构化、缺数据如实打印 reason 不报错。
结果：backfill-reviews 22/0（路由/补写/幂等/--json/容错）、全量 npm test 109 文件 0 失败、lint 66 文件 0 错。

## ql-20260805-003-c420 | 2026-08-05 14:10:18 | QUICKLOG 多条目间距——完成中间条目时结果块与下一条目标题间补空行
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（flipEntryInContent 结果块插入位置：从 endIdx 往前跳过本条目尾部空行、在最后一个非空行之后插入；并兜底在结果块与下一个 ## 标题间无空行时补一个空行）
- test/quicklog-cli-managed.test.mjs（新增验收 2g：allocate A/B 后 complete A，断言结果块末行与 B 标题间有空行 + 结果块紧贴 A 的「文件：」行）
- .sillyspec/quicklog/QUICKLOG-qinyi.md（批量补全历史条目间粘连的空行分隔，仅加空行不改内容）
需求：多条目 QUICKLOG 里完成中间条目（其后还跟着更新的条目）时，结果块紧贴下一条目标题（无空行分隔），用户要求条目间有空行。
根因：flipEntryInContent 在 endIdx（下一个 ## 标题行）前 splice 插入结果行，但本条目自带尾空行 → 结果块落到尾空行之后、紧贴下一条目标题，且被空行从本条目「文件：」行隔开，视觉上像属于下一条目。
方案：结果块改为从 endIdx 往前跳过本条目尾部空行、在最后一个非空行之后插入（归本条目、紧贴文件行），并兜底在结果块与下一个 ## 标题间无空行时补一个空行；历史 QUICKLOG 主文件批量补全条目间空行（只插入空行，不改任何条目内容）。
结果：npm test 全量 109/0 通过、npm run lint 66 文件通过；新增验收 2g（多条目间距）由红转绿（单跑 84/0）。

## ql-20260806-001-3e12 | 2026-08-06 06:24:24 | 工具驾驭复盘3条反馈修复（design 字段数据流引导 / related_tests 测试断言判据 / review.json 拼错提示）
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（A：§267 文件变更清单补「字段数据流标注」引导段——producer→consumer + 每跳归一化点，参照 §7.5 生命周期契约表写法）
- src/stages/plan.js（B：§326 审查清单 / §407 TaskCard 模板示例 / §431 字段说明 / §474 一致性自查——related_tests 触发判据由「源文件是否共享」改为「既有测试断言是否失效」）
- src/spec-dir-typo.js（C 新建：detectSpecDirTypo + levenshtein，编辑距离 ≤2 检测 .sillyspec 拼写变体如 .silyspec/.sillyspc）
- src/stage-review.js（C：validateStageReview missing 分支调 detectSpecDirTypo 给「路径疑似拼错」提示；import 中立模块避开 stage-review↔task-review 循环依赖）
- test/spec-dir-typo.test.mjs（C 新建：5 用例——少 l / 漏 e 变体命中、无变体返回 null、距离 >2 不误报、空入参 fail-safe）
- docs/prompt/_extracted.json（重跑 _extract.mjs 刷新 brainstorm/plan 提取镜像）
- docs/prompt/brainstorm.md、docs/prompt/plan.md（A/B 文案逐字替换与源码一致）
- .sillyspec/docs/sillyspec/modules/stages.md（人工备注 ql-20260806-001-3e12 + updated_at 2026-08-06）
需求：修复 sillyhub 项目工具驾驭复盘 3 条新反馈（A design §6 字段数据流引导 / B related_tests 触发判据 / C review.json 拼错提示），与已归档的 5 问题（db5d160）不重叠，债单此前无登记。
根因：A——brainstorm §6 文件变更清单仅三列表，对「新增字段如何流到消费端」零引导，到 execute 才发现 dormant（RS-3/RS-4 类，design 阶段就该画清）；B——plan related_tests 判据写死「改共享/被多 task 依赖源文件」，漏按钮文案等单文件场景（task-13 改文案必改测试断言却没进 allowed_paths，子代理被锁死）；C——review.json missing 时无拼错线索，用户手误 .sillyspec→.silyspec 靠 mv+rm 修复。
方案：A——brainstorm.js §267 补「字段数据流标注」引导段（producer→consumer + 每跳归一化点）；B——plan.js 4 处判据由「源文件共享」改「既有测试断言失效」（覆盖 UI 文案/常量/枚举/签名）；C——新建 src/spec-dir-typo.js（detectSpecDirTypo: levenshtein ≤2）+ stage-review.js missing 分支调用，放中立模块避循环依赖。
结果：9 文件已 git add 暂存（待用户统一 commit）；npm test 全量 115/0、lint 68 files 0 错、spec-dir-typo 单测 5/5（少 l/漏 e/距离>2/空入参覆盖）；文档同步——重跑 _extract.mjs + docs/prompt/brainstorm.md+plan.md 逐字替换 + stages.md ql 备注。

## ql-20260806-002-c4dd | 2026-08-06 08:54:23 | 工具驾驭复盘第二批：execute 加 format 引导 + worktree-deps python 分支（exec-e/f 修复，exec-d 让出并行全流程）
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（exec-e：buildWavePrompt 调度要求 item4 + acceptanceSteps「运行测试」步 operation3 加"既跑 lint check 也跑 formatter"引导；exec-f：「确认 worktree 路径」步加工具链预告）
- src/worktree-deps.js（exec-f：detectProjectType 加 python 识别 pyproject.toml/requirements.txt；inferInstallCommand 加 uv sync/pip install -r 分支；两函数 export 供单测）
- test/worktree-deps-python.test.mjs（新建：python 分支纯单元测 7 断言——pyproject/uv.lock/requirements/nodejs优先/空目录/userInstall/local.yaml type）
- docs/prompt/execute.md（exec-e/f：3 处 prompt 逐字同步源码——运行测试步 format、调度要求 format、确认 worktree 步工具链预告）
- docs/prompt/_extracted.json（重跑 _extract.mjs 刷新 execute 提取镜像）
- docs/sillyspec/file-lifecycle.md（execute 阶段行补 format 引导 + 工具链预告两句）
- docs/sillyspec/prompt-control-debt.md（2026-08-06 第二批复盘 section：exec-e/f 修复 + exec-d 让出 + exec-g/h defer + exec-i 否决 + 推进记录 + 总结）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引追加 exec-e/f 条目）
- .sillyspec/docs/sillyspec/modules/worktree.md（变更索引追加 exec-f python 分支条目）
需求：修工具驾驭复盘第二批 5 个负面点中 2 个不重叠缺口——exec-e Wave 子代理只跑 lint check 没 format（到 commit 被 consumer pre-commit hook 拦）；exec-f worktree 内 python 工具链不供给（worktree-deps 无 python 分支→python 项目根误判 generic→n/a→ruff/pre-commit 二进制不供给）。exec-d（stage-review marker 死锁，用户#1痛点）已实现 register-stage-review 命令但因与并行全流程 2026-08-06-sillyspec-self-tooling-fixes 坑1 撞车让出。
根因：exec-e src/stages/execute.js buildWavePrompt 调度要求 + acceptanceSteps「运行测试」步通篇无 format 引导（只"不要频繁编译"），子代理必然只 check 不 format；exec-f src/worktree-deps.js detectProjectType/inferInstallCommand 只识别 maven/gradle/nodejs/generic，python 项目根落 generic→installCmd=null→depsStatus=n/a→二进制不供给。
方案：exec-e execute.js 两处加"既跑 lint check 也跑 formatter（ruff format/prettier --write/black），不要只 check"引导（buildWavePrompt 调度要求 item4 + acceptanceSteps 运行测试步）；exec-f worktree-deps detectProjectType 加 python（pyproject.toml/requirements.txt）+ inferInstallCommand 加 uv sync（pyproject/uv.lock）/pip install -r requirements.txt（纯 requirements），execute 确认 worktree 路径步加工具链预告（先 --version 确认，缺则 uv tool install/uv sync）；导出 detectProjectType/inferInstallCommand 加纯单元测（不真跑 uv，避 flaky）。
结果：npm test 116/0（去掉 exec-d revert 的 register 测试后；worktree-deps-python 7 断言新增）、lint 68 文件 0 错；同步 docs/prompt（execute.md 3 处 + _extracted.json 重提取）+ file-lifecycle execute 行 + debt doc（exec-e/f ✅、exec-d ⏭ 让出存设计、exec-g/h ⏭ defer、exec-i ⊘ consumer 否决）+ stages/worktree 模块文档变更索引；exec-d 实现（register-stage-review 命令 + 34 测试 + gate 报错指向 + skill/file-lifecycle 注记）完整备份仓外 C:/Users/qinyi/AppData/Local/Temp/sillyspec-exec-d-backup-20260806/ 供并行全流程坑1 采纳或参考。

## ql-20260806-003-df7e | 2026-08-06 16:17:01 | execute-runs-isolation 两遗留 gap 补齐（machine-interface 统一 resolveRuntimeRoot + producer 侧 e2e 硬证）
状态：已完成
关联变更：（无）
文件：
- src/machine-interface.js（runGate:184/runDerive:402 旧公式 runtimeRoot||join(specRoot,'.runtime') → resolveRuntimeRoot({runtimeRoot,specDriftAnchor},specRoot)；两函数签名扩 specDriftAnchor 入参 + jsdoc；加 import resolveRuntimeRoot，旧公式 0 残留）
- test/worktree-execute-spec-drift.test.mjs（场景 A 追加 producer 侧 e2e 硬证 AC-A7..A13：预置 in-place-fallback meta 跳过 wm.create、getStageSteps(specBase=null) 探测 acceptance index 推进 progress、真实 execute step 断言双 marker 落主仓 .runtime 且副本无）
- .sillyspec/docs/sillyspec/modules/machine-interface.md（runGate/runDerive 签名扩 specDriftAnchor + 注意事项补 runtimeRoot 三级解析语义）
需求：execute-runs-isolation（change bcdbd6d 已归档）的两个遗留 gap 补闭环——① machine-interface.js:184/402 的 runtimeRoot 旧公式统一改调 resolveRuntimeRoot（对齐 contract-matrix 调用方 drift 锚定语义，确认 drift 场景 contract-artifacts/marker 落主仓）；② 补 producer 侧 e2e 硬证（drift 场景跑真实 execute step，断言 execute-runs/stage-reviews marker 落主仓 .runtime 而非 worktree 副本）。
根因：bcdbd6d 只统一了 run/* 模块 13 处 runtimeRoot 解析站点，machine-interface 的两处 task-reviews 段（runGate/runDerive）漏改仍用旧公式；producer 侧 e2e 用 --status 只读路径（renderPrompt 未触发 marker 落盘），grep specDriftAnchor 0 命中，specDriftAnchor 真实锚定落点无硬证。
方案：① machine-interface.js 加 import resolveRuntimeRoot；runGate/runDerive 各扩 specDriftAnchor 入参（向后兼容，未传则 resolveRuntimeRoot 第三级本地兜底，行为同旧公式），两处旧公式统一改调 resolveRuntimeRoot({runtimeRoot,specDriftAnchor},specRoot)，调用方职责是 drift 场景传 anchor。② worktree-execute-spec-drift 场景 A 追加真实 execute step：预置 in-place-fallback worktree meta（depsStatus='n/a'，跳过 wm.create——临时 fixture 非 git 仓库 wm.create 必败）；用 getStageSteps('execute', wtRoot, progress, null) 探测 acceptance step（{REVIEW_TIER}）真实 index（与 runStage 真实渲染 defSteps 同参同构，避开幻影 wave step 偏移，不硬编码魔法数字）；推进 progress 到 acceptance 后跑真实 execute step（renderPrompt 触发 {EXECUTE_RUN_ID}+{STAGE_REVIEW_RUN_ID} 两处 marker 落盘），断言 execute marker + stage review marker 均落主仓 .runtime、副本 .runtime 无任何 marker。
结果：machine-interface 102/102、worktree-execute-spec-drift 16/16（新增 AC-A7..A13 全过）、全量 npm test exit 0、lint 68 文件 0 错；同步 machine-interface.md 模块文档（签名扩 specDriftAnchor + 注意事项补 resolveRuntimeRoot 三级解析语义）。producer 侧 e2e 硬证补齐，specDriftAnchor 锚定落点（execute marker + stage review marker 落主仓）有真实断言覆盖。

## ql-20260807-001-a260 | 2026-08-07 08:36:49 | gate/derive 顶层命令在 worktree cwd 下补 spec drift 锚定
状态：已完成
关联变更：（无）
文件：
- src/index.js（gate/derive case 未显式 --spec-dir 时 detectWorktreeSpecDrift(resolveSpecDir(dir)) 命中即向 runGate/runDerive 传 specDriftAnchor=wt.mainSpecBase；顶部 import 补 resolveSpecDir/detectWorktreeSpecDrift；对齐 command.js drift 守卫条件 !specDir + machine-interface 已扩展入参）
- test/gate-derive-spec-drift.test.mjs（新建 e2e，3 场景 13 断言：derive task-reviews drift+anchor 读主仓 marker / --spec-dir 副本负对照读副本 marker / gate execute task-reviews check 读主仓；抓手=validateTaskReviews 缺 review error 文本含 executeRunId，暴露所读 marker 的 runId）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（关键逻辑增补「gate/derive 顶层命令 drift 锚定」段 + 底部新建变更索引追加 ql-20260807-001-a260）
需求：gate/derive 顶层命令在 worktree cwd 下补 spec drift 锚定，使 execute/task-reviews marker 读主仓 .runtime，不读随 cleanup 消失的副本。
根因：gate/derive 是顶层命令不经 runCommand，command.js 的 drift 守卫（detectWorktreeSpecDrift 设 specDriftAnchor，只覆盖 plan/execute/verify/archive）不触发，worktree cwd 下 runGate/runDerive 的 resolveRuntimeRoot 走本地兜底读副本 marker。
方案：src/index.js gate/derive case 在未显式 --spec-dir 时调 detectWorktreeSpecDrift(resolveSpecDir(dir))，命中即向 runGate/runDerive 传 specDriftAnchor=wt.mainSpecBase（对齐 machine-interface 已扩展入参 + command.js 守卫条件 !specDir）；新增 test/gate-derive-spec-drift.test.mjs 3 场景 e2e（derive drift+anchor 读主仓 / --spec-dir 副本负对照读副本 / gate execute task-reviews 读主仓，抓手=validateTaskReviews 缺 review error 文本含 executeRunId）。
结果：新测试 13/13 通过；npm test exit 0 无回归（runner 自动发现新测试）；npm run lint 通过；同步 cli-entry.md 关键逻辑增补段 + 变更索引。

## ql-20260807-002-cc15 | 2026-08-07 09:00:42 | 修复 sss.md 报告的 4 个 P0 提示词/源码一致性缺陷（verify探针advisory降级 / review-tier≤5→≤3 / archive伪命令 / doctor悬空else-fi）
状态：已完成
关联变更：（无）
文件：
- src/stages/verify.js（P0-1：verify-result.md 格式"代码删除对账"由"CLI 独立复核"改 advisory 措辞）
- templates/prompts/verify-probes.md（P0-1：探针5 API parity / 探针6 代码删除 由"FAIL blocker/谎报无效"降级为 advisory——CLI 仅 warn 不阻断，是否 FAIL 由 agent 诚实判定）
- src/stages/archive.js（P0-3：删 extract-module-impact step10 跑不通的伪 workflow 命令 node -e ".../* 注释 */..."）
- src/stages/doctor.js（P0-4：删 Worktree 隔离检查段末尾悬空 else/fi——gate-status.json 的 if 头缺失只剩 else/echo/fi）
- docs/prompt/{README,plan,execute,brainstorm,propose}.md（P0-2：{REVIEW_TIER_REASON} 占位符说明示例 ≤5→≤3，源码阈值 SELF_REVIEW_FILE_THRESHOLD=3）
- docs/prompt/{verify,archive,doctor}.md（镜像同步源码 prompt 改动）
- docs/prompt/_extracted.json（重跑 node docs/prompt/_extract.mjs 刷新）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引追加本 ql-ID）
需求：根据 docs/sss.md 提示词驾驭力分析报告，修复其识别的 4 个 P0 级提示词/源码一致性缺陷（会误导 agent 产生错误行为）。
根因：4 项断言经源码亲验全部属实——①verify 探针5/6：源码 verify-postcheck.js:711/734/742/844/853 与 run/gates.js:222 注释明确 advisory 不阻断，但 verify-probes.md 模板写成 FAIL blocker/谎报无效；②review-tier：源码 SELF_REVIEW_FILE_THRESHOLD=3，但 docs/prompt 5 处占位符说明示例写 ≤5；③archive step2：node -e 命令体只有注释无代码；④doctor step0：gate-status.json 的 if 头缺失只剩悬空 else/fi。
方案：P0-1 措辞降级为 advisory（不动源码——advisory 是设计意图，硬阻断会误伤已commit无锚点场景；改 verify-probes.md 探针5/6 + verify.js:218）；P0-2 docs/prompt 5 处 ≤5→≤3（源码不动）；P0-3 删 archive step10 伪命令；P0-4 删 doctor 悬空 else/fi；同步 docs/prompt/{verify,archive,doctor}.md 镜像 + 重跑 _extract.mjs + stages.md 变更索引。
结果：npm run lint ✅ 68 files 通过；npm test ✅ EXIT=0 所有测试文件 失败:0；改 15 文件（src/stages×3 + verify-probes.md + docs/prompt×9 + quicklog + stages.md）。
