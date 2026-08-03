
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