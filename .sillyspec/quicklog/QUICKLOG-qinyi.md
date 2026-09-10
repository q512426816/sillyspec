
## ql-20260909-004-f629 | 2026-09-09 06:15:01 | archive 三重核对机械化——CLI 代算 + prompt 注入
状态：已完成
关联变更：（无）
文件：
- src/archive-delta.js（audit）
- src/stages/archive.js（prompt 消费化）
- src/run/prompt.js（注入）
- test/archive-closeout-mech.test.mjs（4 用例）
需求：archive 三重核对机械化——CLI 代算 + prompt 注入
根因：轮次经济学 §3.1 archive 收口项：让 agent 手跑 git diff 逐文件比对是纯机械轮
方案：archive-delta auditModuleImpactAgainstDiff（三源 diff × 矩阵集合比对）；prompt.js {ARCHIVE_IMPACT_AUDIT} 注入；archive.js 步骤 prompt 消费化；卡+sidecar+镜像
结果：closeout-mech 4/4；archive-delta/prompt 族回归 3/3 绿；lint 过；_verify 0

## ql-20260909-005-9131 | 2026-09-09 09:52:47 | 审核修正批：lint 硬门 + 三重核对真接 map + 严格档结论槽必在 + 文档口径
状态：已完成
关联变更：（无）
文件：
- src/run/gates.js（硬门）
- src/verify-postcheck.js（决策函数）
- src/stage-contract.js（严格档槽）
- src/archive-delta.js（第三重）
- docs/sillyspec/file-lifecycle.md（十三维）
- docs/sillyspec/round-trip-economics-2026-09-08.md（指针）
- test/audit-fixes-batch.test.mjs（3 用例）
需求：审核修正批：lint 硬门 + 三重核对真接 map + 严格档结论槽必在 + 文档口径
根因：外部审核 3 P2 + 3 P3；lint 观察期数据已出（14 次 5 败全真阳性零误伤）
方案：shouldBlockVerifyLint 纯函数+gates 接线（advisory 逃生）；auditImpactModuleAttribution 第三重 map 归属；isIrStrictVerifyChange 严格档删槽 ERROR（存量回退保留）；lifecycle 十三维；经济学 quicklog 目录化；启发式注记
结果：audit-fixes-batch 3/3；回归 8 套件绿；docs 520 全过；lint 过
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/architecture-4a.md, docs/sillyspec/prompt-control-debt.md

## ql-20260909-006-52eb | 2026-09-09 09:59:27 | 刀批 2：design 自检删除 + 危险预检前移 + module-docs-sync
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（自检删除）
- src/run/stage.js（预检）
- src/module-impact.js（sync 函数）
- src/index.js（命令）
- test/knife-batch2.test.mjs（3 用例）
需求：刀批 2：design 自检删除 + 危险预检前移 + module-docs-sync
根因：轮次经济学未认领三刀：自检与门禁同款复刻/危险文件 --done 才拦/sidecar 两处手写
方案：Step6 操作 4 改门禁承担声明；会话创建点任务描述×脏文件启发式预检；syncModuleDocSidecars + CLI（幂等）
结果：knife-batch2 3/3；module-impact/quick 族 9 绿；lint 过；_verify 0

## ql-20260909-007-c720 | 2026-09-09 10:41:34 | lint 打印文案随门禁档位分支 + 经济学文补记 + 死参清理
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（分支+JSDoc）
- src/archive-delta.js（死参）
- docs/sillyspec/round-trip-economics-2026-09-08.md（补记）
- test/lint-print-branch.test.mjs（3 用例）
需求：lint 打印文案随门禁档位分支 + 经济学文补记 + 死参清理
根因：复核 P2 文案与 rollback 行为打架 / P3 文状态滞后
方案：printVerifyLintCheck 按 shouldBlockVerifyLint 分支（硬门已阻断+逃生 / advisory 保留旧措辞）；经济学文 §3 翻已收口 + §4b 补三行；死参移除
结果：lint-print-branch 3/3；回归 7 绿；lint 过

## ql-20260909-008-c8a9 | 2026-09-09 12:19:59 | 修复 12 个测试满载并发假红：套件 HOME 隔离改锚 suiteTmp 根 + config-cat passedHome 截断
状态：已完成
关联变更：（无）
文件：
- src/config-cat.js（resolveLocalYaml 补 passedHome 截断（经过 home 层后候选链整段截断））
- test/run-tests.mjs（套件 HOME/USERPROFILE 改锚 suiteTmp 本身 + 根级 .gitconfig 补放）
需求：修复 12 个测试满载并发假红：套件 HOME 隔离改锚 suiteTmp 根 + config-cat passedHome 截断
根因：套件 HOME 指向 suiteTmp/home 子目录而 fixture 在 TEMP 兄弟层，home 守卫（originBelowHome）恒不激活，CLI 向上遍历撞真实 home 的 ~/.sillyspec，写入被劫持到真实 home 造成 fixture ENOENT + 历届污染积累
方案：①run-tests.mjs HOME/USERPROFILE 改锚 suiteTmp 本身（fixture 恒在 fake home 子树，守卫全激活，passedHome 拦截 suiteTmp 之上一切层）+ suiteTmp 根补 .gitconfig；②config-cat.js resolveLocalYaml 补 passedHome 截断（与 resolveSpecDir e4f2855 同构，生产语义矩阵验证不变）；③备份后清理真实 home 历届测试污染（backup-20260909-121332，保留真实 local.yaml）
结果：满载裸跑（SILLYSPEC_TEST_RETRY_FLAKY=0）连跑 3 轮 397 文件全绿零失败（修复前同口径 12 文件稳定假红）；标准 npm test 全绿；npm run lint 516 文件通过；真实 home 三轮跑后零新污染

## ql-20260909-009-bb26 | 2026-09-09 13:52:59 | 平台凭据 env 通道注释纠偏——四处「daemon 注入通道」改为「预留通道、daemon 未实现注入」。根因…
状态：已完成
关联变更：（无）
文件：src/agent-session-log.js, src/run/shared.js, src/sync.js
需求：平台凭据 env 通道注释纠偏——四处「daemon 注入通道」改为「预留通道、daemon 未实现注入」。
根因：注释宣称凭据由 daemon 注入 env SILLYHUB_PLATFORM_URL/TOKEN 提供，但 daemon 仓全历史无此实现，排障方向被带偏。
方案：sync.js _getPlatform / run/shared.js triggerSync / agent-session-log.js 两处 docstring 统一改写并澄清平台模式回传主凭据实为 local.yaml platform 段；随注释增行平移 platform-interface-map.md 三锚与 prompt-control-debt.md 一锚。
结果：纯注释零逻辑变化；node --check 过；CLI 门禁 npm test 全绿 + lint 0 告警；docs check 行号锚归零（残余 2 条历史 change-name advisory 非阻断）。
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/platform-interface-map.md, docs/sillyspec/prompt-control-debt.md

## ql-20260910-001-7ae6 | 2026-09-10 09:00:54 | quick 收尾软归属：窗口内未声明同模块测试文件自动补入 QUICKLOG 文件行
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（matchSameModuleTestFiles stem 匹配 + auditQuickCompletion 计算 review.softTestFiles）
- src/quicklog.js（flipEntryInContent/completeQuicklogEntry 接 softFiles，文件行补软归属 bullet）
- src/run/complete-handlers.js（审计行拆 ⚖️ 真未知 / 🔍 软归属单列 + softFiles 透传）
- test/quicklog-soft-attribution.test.mjs（27 断言（纯函数/落盘/CLI 端到端））
- .sillyspec/docs/sillyspec/modules/change-management.md（模块卡同步软归属口径）
- .sillyspec/docs/sillyspec/modules/change-management.changelog.md（sidecar 追加 ql-20260910-001-7ae6）
- docs/sillyspec/platform-interface-map.md（complete-handlers 行号引用随插入漂移重锚 1674→1688）
需求：quick 收尾软归属：窗口内未声明同模块测试文件自动补入 QUICKLOG 文件行
根因：file-notes 括注只落声明文件，测试文件漏声明时审计行有提示但文件行不自动补齐，连续两批需手工核对（2026-09-10 用户反馈）
方案：matchSameModuleTestFiles（run/shared.js）按 stem 相等/前缀+分隔符匹配窗口内未声明测试文件，auditQuickCompletion 出 review.softTestFiles，flipEntryInContent 补入文件行 bullet 带软归属括注；审计行拆 ⚖️ 真未知与 🔍 软归属单列，硬归属口径声明即归属不变
结果：test/quicklog-soft-attribution.test.mjs 27 断言全绿，相关回归 6 套与 lint 绿，docs check 520 引用通过，change-management 模块卡与 sidecar 同步

## ql-20260910-002-9beb | 2026-09-10 09:15:48 | stage review 降级自审 CLI 侧配套：无 Agent 宿主 tier=independent 降级可见可追溯
状态：已完成
关联变更：（无）
文件：
- src/stage-review.js（isDegradedSelfReview 首行降级检测 + 契约/缺件报错/gate FAILED 提示带降级出口）
- src/run/gates.js（Stage Review Gate 放行时降级自审留 ⚠️ 审计行）
- test/stage-review-degraded-selfreview.test.mjs（13 断言（检测/报错出口/契约文档化））
- .sillyspec/docs/sillyspec/modules/core-engine.md（模块卡 stage-review 条目补降级配套）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（sidecar 追加 ql-20260910-002-9beb）
需求：stage review 降级自审 CLI 侧配套：无 Agent 宿主 tier=independent 降级可见可追溯
根因：PI agent 等宿主环境无 Agent tool，tier=independent 硬要求子代理时只能降级自审（2026-09-10 用户反馈①，三处）；prompt 降级条款已有（并行会话未提交改动），但 gate 静默放行降级 review、缺件报错无降级出口，事后审计无法区分降级与真子代理审查
方案：stage-review.js 新增 isDegradedSelfReview（reviewerNotes 首行降级 colon 约定检测，向后兼容不新增阻断），gates.js Stage Review Gate 放行时检测到降级标记留 ⚠️ 审计行；缺 review.json 报错与 gate FAILED 提示补降级出口指引，renderReviewJsonContract 契约文档化该约定
结果：test/stage-review-degraded-selfreview.test.mjs 13 断言全绿，stage-review 回归 8 套与 lint 绿，core-engine 模块卡与 sidecar 同步

## ql-20260910-003-2709 | 2026-09-10 09:34:54 | verify 证据核验时序两难与同步覆盖/夹带三坑修复
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（resolveVerifyChangedFiles worktree 并入补已提交口径（merge-base diff）+ trackVerifyResultRegression 高水位回退检测）
- src/task-review.js（草稿归属并入同款已提交补齐（口径与 verify-postcheck 同源））
- src/progress/change-registry.js（getStageStartedAt 只读访问器）
- src/progress.js（facade 委托 getStageStartedAt）
- src/run/gates.js（verifyStartAt 锚改 execute startedAt + 回退检测告警接线）
- src/run/complete.js（quick 完成提示加 pathspec 禁令）
- templates/agents-instruction.md（核心规则 18 目录级 git add 禁令）
- AGENTS.md（本仓同步规则 18）
- test/verify-window-regression.test.mjs（三段（worktree 已提交 diff / startedAt roundtrip / 回退检测））
- .sillyspec/docs/sillyspec/modules/core-engine.md（模块卡同步）
- .sillyspec/docs/sillyspec/modules/progress.md（模块卡同步）
需求：verify 证据核验时序两难与同步覆盖/夹带三坑修复
根因：PI 会话实证②：worktree 已提交改动对主仓 diff 与 status 双盲区致草稿 changedFiles 空，mtime 锚 execute 完成时刻把 execute 期间产的证据判旧，两核验互斥只能 missing+豁免收口；③ verify-result.md 被平台同步覆盖回旧版无告警；④ 目录级 git add 夹带并行会话文件甚至误删已提交文档（2026-09-10 用户反馈）
方案：②a 两处 worktree 并入点补 merge-base(主仓HEAD, worktreeHEAD)..worktreeHEAD 已提交 diff；②b getStageStartedAt 锚点放宽（gates started 优先 completed 兜底）；③ trackVerifyResultRegression 高水位指纹（hash+mtime）检出内容回退+mtime 倒流即告警（覆盖者在仓外，CLI 侧保证可见）；④ agents 模板核心规则 18 + 本仓 AGENTS.md + quick 完成提示三处禁目录级 git add
结果：test/verify-window-regression.test.mjs 3 断言组全绿（worktree 真实 git worktree 构造），回归 8 套与 lint 绿，core-engine/progress 模块卡与 sidecar 同步

## ql-20260910-004-b807 | 2026-09-10 10:40:12 | 独立审查通道优先序可配置（P1 垫底）：channel_priority 按用户配置序注入契约 + reviewer.channel 审计
状态：已完成
关联变更：2026-09-10-change-scope-audit
文件：
- src/stage-review.js（readReviewChannelPriority + classifyReviewerChannel + 契约通道段/reviewer 字段/骨架字段）
- src/run/prompt.js（契约注入显式传配置序（精确 cwd））
- src/run/gates.js（channel 审计分支（self ⚠️ / platform ℹ️ missionId / 其余静默））
- .sillyspec/local.yaml.example（review_dispatch.channel_priority 配置块）
- test/review-channel-priority.test.mjs（三段（配置语义/channel 识别/契约渲染））
- .sillyspec/docs/sillyspec/modules/core-engine.md（模块卡 stage-review 条目扩通道批次）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（sidecar 追加）
需求：独立审查通道优先序可配置（P1 垫底）：channel_priority 按用户配置序注入契约 + reviewer.channel 审计
根因：通道选择顺序是主观权衡（信本机子代理 vs 平台跨模型最大独立性），CLI 拍死任何固定序都会替用户做价值判断（2026-09-10 用户裁决）；PI 等「平台 MCP 可派独立审查但宿主无 Agent」的根治通道 review-dispatch 是 P2 架构级，先垫配置面与审计面
方案：stage-review.js 新增 readReviewChannelPriority（local.yaml review_dispatch.channel_priority：缺省现状序零回归/未知值忽略/self 恒隐式垫底）与 classifyReviewerChannel（结构化落款 > 首行降级约定兼容 > unspecified）；renderReviewJsonContract 在 tier=independent 头部按配置序渲染审查执行通道段（platform 标注 P2 未落地暂跳过，不引用不存在命令）+ reviewer 可选字段契约与示例；register-stage-review 骨架带 reviewer 占位；gates.js 按 channel 分支留痕（self ⚠️ / platform ℹ️ missionId）；prompt.js 契约注入显式传精确 cwd 读配置
结果：test/review-channel-priority.test.mjs 3 断言组全绿（配置语义 6 形态/channel 识别 9 形态/契约渲染），stage-review 回归 8 套与 lint 绿，core-engine 模块卡与 sidecar 同步
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/changes/2026-09-10-change-scope-audit/tasks/
