
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