
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

## ql-20260910-005-fb40 | 2026-09-10 12:41:09 | 平台侧 MCP 修复三遗留的消费侧落地：派发解析/成对凭据/daemon 在线探测
状态：已完成
关联变更：（无）
文件：
- src/sillyhub-mcp/client.js（dispatchWorker id 兜底解析 + getDaemonStatus 三态方法）
- src/sync.js（connect mcp-tokens 成对签发（gateway_url+token 覆盖写/失败降级旧口径））
- src/dispatch/probe.js（daemon 在线层（get_daemon_status false→daemon-offline，null fail-open）+ cwd 注入参数）
- test/dispatch/path-a-probe.test.mjs（CLEAN_CWD 隔离（修环境泄漏））
- test/dispatch/strategy.test.mjs（同款隔离）
- test/sillyhub-mcp-platform-fixes.test.mjs（4 组（id 解析/getDaemonStatus/probe 三态/connect 成对写））
- .sillyspec/docs/sillyspec/modules/sillyhub-mcp.md（模块卡同步）
- .sillyspec/docs/sillyspec/modules/sillyhub-mcp.changelog.md（sidecar 追加）
需求：平台侧 MCP 修复三遗留的消费侧落地：派发解析/成对凭据/daemon 在线探测
根因：平台侧 22cdf89d1 已修 gateway 暴露/成对签发/get_daemon_status 并留三遗留：dispatchWorker 解析只认 worker_id 但平台实返 id（派发成功 workerId=null 轮询全断）；旧 mcp 段写入按 url 同源假设致凭据三头分裂永不愈合；daemon 不在线只能真派发才发现（no_online_daemon 快速失败）
方案：client.js dispatchWorker 解析链补 id 兜底并新增 getDaemonStatus（isError/未配置→null fail-open）；sync.js connect 经 mcp-tokens API（scope=read+dispatch）取 gateway_url+token 成对覆盖写 mcp 段（陈旧段修复性覆盖，签发失败降级旧口径不覆盖手填段）；probe.js 连通后调 get_daemon_status——false→available false reason daemon-offline（不进负面缓存），true/null 透传 daemonOnline；另修既有测试环境泄漏（probeSillyHub 加 cwd 注入，dev 仓自身连平台时 no-config 用例读到真配置）
结果：test/sillyhub-mcp-platform-fixes.test.mjs 4 组全绿，dispatch 族回归 5 套与 lint 绿，远端活体冒烟 available true + 旧 token daemonOnline null（fail-open 实证）；sillyhub-mcp 模块卡与 sidecar 同步

## ql-20260910-006-2134 | 2026-09-10 13:03:10 | 成对签发消费侧 hotfix：client 端点双形态兼容（origin 拼 /mcp/ vs 完整端点不再叠加）
状态：已完成
关联变更：（无）
文件：
- src/sillyhub-mcp/client.js（_endpoint 双形态兼容（/mcp$ 尾不再叠加 /mcp/））
- test/sillyhub-mcp-platform-fixes.test.mjs（端点双形态 5 断言 + getDaemonStatus 未配置用例 cwd 隔离）
需求：成对签发消费侧 hotfix：client 端点双形态兼容（origin 拼 /mcp/ vs 完整端点不再叠加）
根因：connect 原样写 gateway_url（完整端点）进 mcp.url，而 client 历来按 origin 语义自拼 /mcp/ → /mcp/mcp/ 必 404（活体首跑实证）；平台侧 daemon local-yaml-writer 也写 origin+/mcp 形态，两种形态在野，任一单侧修都会破坏另一形态
方案：client 构造器端点解析改双形态：url 以 /mcp 结尾视为完整端点（补尾斜杠即用），否则视为 origin 拼 /mcp/；测试补端点 5 断言（origin/完整/尾斜杠/子路径/未配置）并修 getDaemonStatus 未配置用例的 cwd 隔离（仓自身 local.yaml 现为活配置，进程 cwd 会真发网）
结果：test/sillyhub-mcp-platform-fixes.test.mjs 5 组全绿，dispatch 族回归不变绿；活体验证全链路点亮：endpoint 归一 https://crrcdt.ppdmq.top/mcp/ + probeDaemon true + daemonOnline true（成对 token read scope 生效）

## ql-20260910-007-124c | 2026-09-10 13:57:19 | 修驾驭小结三负面：exec-run runId 同秒碰撞误写 review.json + verify-probes 平台镜像回显混乱 + module-imp…
状态：已完成
关联变更：2026-09-10-review-dispatch
文件：
- src/task-review.js（claimExecuteRunId 排他认领 + isValid 后缀双形态 + drafts/writeTaskReview 两补写点接线）
- src/run/stage.js（主写入点接 claim（保持 fail-loud 文案，行号+3 已补 platform-interface-map.md stage.js:226→221 锚点））
- src/run/gates.js（fallback 写入点接 claim（直穿外层 fail-closed））
- src/run/prompt.js（渲染降级写入点接 claim（catch 降级语义不变））
- src/verify-probes.js（formatPlatformPathNote + writeVerifyFacts opts.platformNote）
- src/index.js（verify-probes --init 三处回显 + facts 回传注记）
- src/module-impact.js（sourceFiles 剥 NEW: 前缀+去重）
- test/execute-run-id-collision.test.mjs（新增 5 断言组）
- test/verify-probes-platform-note.test.mjs（新增 3 用例）
- test/plan-module-impact-autogen.test.mjs（补 NEW: 表格形态用例）
- .sillyspec/docs/sillyspec/modules/core-engine.md（task-review 行补 claim + 新增 verify-probes 行）
- .sillyspec/docs/sillyspec/modules/runtime.md（marker 写入点行补排他认领）
- .sillyspec/docs/sillyspec/modules/docs-consistency.md（module-impact 行补 NEW: 剥离）
- docs/sillyspec/platform-interface-map.md（stage.js:226→221 行号漂移补偿）
需求：修驾驭小结三负面：exec-run runId 同秒碰撞误写 review.json + verify-probes 平台镜像回显混乱 + module-impact NEW: 前缀失配
根因：①generateExecuteRunId 秒级时间戳，并行会话同秒启动 execute 生成同一 runId，两变更 per-task review.json 落同一 execute-runs/<runId>/tasks/ 互相覆盖（用户两次实锤）；②平台模式 spec 根=hub 镜像，--init 回显镜像物理路径而产物经 daemon 同步落主仓，核对口径分裂显示混乱；③design 清单待建文件带 NEW: 前缀（表格 cell 解析器不剥），module-impact 归类比对漏剥前缀致 classifyFile 前缀匹配必失配、NEW 文件全落未匹配逼手动回填（pathMatches 比对侧早剥，此处漏同步）
方案：①task-review.js 新增 claimExecuteRunId：非递归 mkdir 排他认领 run 目录（EEXIST=碰撞→4位随机后缀重试），认领即含 tasks/，isValidExecuteRunId 双形态兼容（存量秒级+可选短后缀，注入/穿越仍拒）；接线 stage.js 主点/gates.js/prompt.js/task-review 两补写点共五处 generate 写入点，分层 fail 语义不变。②verify-probes.js 新增 formatPlatformPathNote（平台模式回显行尾补镜像根+主仓同步位置注记，本地零变化）+ writeVerifyFacts opts.platformNote；index.js --init 三处回显接线。③module-impact.js sourceFiles 归一化剥 NEW: + 去重
结果：新增测试 execute-run-id-collision 5/5、verify-probes-platform-note 3/3，plan-module-impact-autogen 补 NEW: 用例 7/7；回归 fail-loud/marker-drift/change-stamp/verify-probes 系全过；npm run lint 525 文件 0 hard fail；全量 npm test 403 过 2 挂均非本次（doc-ref 7 失效引用 HEAD 已存在实证 + sillyhub-mcp 并发 flake 单独跑 5/5、移除本变更新测试复跑仍挂）

## ql-20260910-008-6d84 | 2026-09-10 14:32:00 | 修驾驭小结第二批三负面：apply 归档取证自相矛盾 + exec-run 串台残余 + docs check 输出噪音
状态：已完成
关联变更：2026-09-10-review-dispatch
文件：
- src/worktree-apply.js（resolveActiveOrArchiveChangeDir 归档回退 + allowset/assess 接线）
- src/task-review.js（两 resolver fallback 排除有主 run）
- src/index.js（docs check 渲染降噪）
- test/apply-archive-docs-fallback.test.mjs（新增）
- test/execute-run-change-stamp.test.mjs（增 ⑪⑫）
- test/docs-check-output-noise.test.mjs（新增）
- docs/sillyspec/*.md+ARCHITECTURE.md（重锚 20 处）
- modules/*.md（worktree/core-engine/docs-consistency 更新）
需求：修驾驭小结第二批三负面：apply 归档取证自相矛盾 + exec-run 串台残余 + docs check 输出噪音
根因：①archive 对未 apply 的 worktree 有意保留期待归档后补 apply，归档却把变更目录 rename 到 changes/archive/，apply 读侧只认活跃路径 → 补 apply 时 allow 集恒空被 Gate1 整批误拦；②resolveLatestExecuteRunId/WithTasks 的 mtime fallback 仍拿走戳属他变更的 run，writeTaskReview 在 marker 缺失场景误写他变更 run（上批 claim 只治写侧同秒碰撞，这是读侧残余）；③docs check 硬失效与 advisory 混流、同行同引用重复与同名多处分悬空逐条刷屏
方案：①worktree-apply.js 新增 resolveActiveOrArchiveChangeDir（活跃缺 design.md 而归档在→回退读归档目录），resolveApplyAllowSet 与 assess 段豁免集统一接线，不动归档回收策略；②两 resolver 的 mtime fallback 排除有主 run（戳属他变更即跳过，全部有主→null；无 changeName 旧调用零回归）；③index.js docs check 渲染层折叠重复硬失效（×N）+ advisory 尾部分区 + 按名聚合，invalid 集与 exit code 不动；顺手重锚 7 份活文档 20 处行号漂移（docs check 520 全过、gate 基线 0 恢复绿）
结果：新增测试 4+1+2 断言组全绿（apply-archive-docs-fallback 4/4、docs-check-output-noise 1/1 含 exit 1 断言、change-stamp ⑪⑫ 25/25）；worktree-apply 回归 17/17、marker-drift/isolation/docs-check 系全绿；lint 527 文件 0 hard fail；全量 405 过 2 挂均他者在途（sillyhub-mcp flake 单独跑过、scope-audit 他者 AM 态）

## ql-20260910-009-a684 | 2026-09-10 15:20:00 | scope-audit 归档形态支持——已归档变更可查
状态：已完成
关联变更：（无）
文件：
- src/index.js（归档预检双目录 + usage 文案）
- src/scope-audit.js（resolveChangeDir/快照记录态/HEAD 兜底/排除面 note）
- test/scope-audit.test.mjs（新契约改写 + 归档两用例）
需求：scope-audit 归档形态支持——已归档变更可查
根因：上一变更交付的 scope-audit 预检只认活跃目录 changes/<名>，归档后目录移入 changes/archive/ 即 exit 1；且 post-apply 无锚点形态行数恒降级 —、他者声明退栈文件无声消失（计划内文件误显计划未动不可解释）
方案：index.js 预检双目录接受；scope-audit.js 目录解析兼容归档 + 归档且实时窗口空时读 execute 快照出记录态（快照缺失空表诚实说明）+ 无锚点行数按 HEAD 未提交窗口兜底 + 排除面计数 note 可见；测试按新契约改写并补归档两用例
结果：node --test 11/11；npm test 全量 0 失败（doc-ref 锚点 ±5 容差窗内）；dogfood 实测归档变更出三态全表+真实行数 +1370/-35
审计：⚖️ 归属切分：7 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md, docs/sillyspec/architecture-4a.md, docs/sillyspec/file-lifecycle.md, docs/sillyspec/prompt-control-debt.md, docs/sillyspec/sillyhub-path-a-contract.md, b2-core-engine.patch, b2-src_index.js.patch

## ql-20260910-010-d973 | 2026-09-10 18:54:03 | scope-audit baseAnchor 修复——审计 tag merge-base 锚
状态：已完成
关联变更：2026-09-10-review-dispatch
文件：
- src/verify-postcheck.js（形态 B diffRef 三级解析（分支→审计 tag→null））
- test/scope-audit.test.mjs（新增审计 tag 锚用例）
需求：scope-audit baseAnchor 修复——审计 tag merge-base 锚
根因：无，纯新增——apply+cleanup 删分支后形态 B 的 merge-base 源因分支 rev-parse 失败被静默省略，baseAnchor 恒 null，行数降级 HEAD 未提交窗口口径（不含已提交改动）；而 worktree.js:1065 早就打了 sillyspec-audit/<branch> 审计 tag，数据在却没用
方案：resolveReconcileActualFiles 形态 B diffRef 三级解析：分支 → sillyspec-audit/<分支全名> tag → null；merge-base 与 B1 diff 用 tag ref 照算，baseAnchor 恢复真值、文件集与行数恢复完整锚定口径
结果：node --test 12/12（新增 tag 锚用例+保留 HEAD 兜底用例双路径）；npm test 全量 0 失败；dogfood 实测本变更基点 3f22d6b 真锚、+2365/-101 完整行数

## ql-20260910-011-a479 | 2026-09-10 19:22:47 | P2 模块卡正文补账
状态：已完成
关联变更：（无）
文件：
- .sillyspec/docs/sillyspec/modules/dispatch.md（D-007 显式例外定位段 + review-dispatch 契约条目）
- .sillyspec/docs/sillyspec/modules/dispatch.changelog.md（sidecar 追加 P2 行）
- .sillyspec/docs/sillyspec/modules/core-engine.md（stage-review-checklist 条目 + 在途区分说明）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（sidecar 追加 P2 行）
需求：P2 模块卡正文补账
根因：archive step3 跳过致卡正文与 module-map 脱节
方案：dispatch.md 落 D-007 显式例外与防泛化护栏并补 runReviewDispatch 三条目；core-engine.md 补 checklist 单源条目与在途区分；双 sidecar 追加
结果：四文件落盘纯文档批次门禁自动跳过

## ql-20260910-012-e069 | 2026-09-10 20:15:32 | 修驾驭小结第三批三负面：exec run 并行覆写结构化隔离 + 平台 init 产物双写主仓 + verify 服务进程树击杀
状态：已完成
关联变更：（无）
文件：
- src/task-review.js（generateExecuteRunId(changeName) 哈希段 + isValid 0-2 段 + 两补写点传名）
- src/run/stage.js,src/run/gates.js,src/run/prompt.js（generate 写入点传 changeName）
- src/run/shared.js（mirrorPlatformArtifactToMainRepo）
- src/index.js（三产物镜像 + design-init 镜像接线）
- src/run/gates.js（killProcessTree + reapVerifyServices）
- src/stages/verify.js（prompt 登记叶子 PID 指引）
- test/*（collision/platform-note/concurrency/fail-loud 四文件）
- docs/sillyspec/platform-interface-map.md（6 处重锚）
- modules/core-engine.md,runtime.md（补记）
需求：修驾驭小结第三批三负面：exec run 并行覆写结构化隔离 + 平台 init 产物双写主仓 + verify 服务进程树击杀
根因：①两并行会话共用 exec run 目录互相覆写 review（task-01/02/03 被另一变更污染）——claim 排他认领只治同 ID 两主，不同变更同秒仍天生同 ID；②design-init/verify-probes --init 两次把产物写到 daemon specs 同步目录而非主仓 changeDir，单点依赖 spec-sync 回程兜底；③verify 收尾 PID 回收只杀登记的 shell 包装 PID，python 服务本体子进程成孤儿泄漏（坑 verify-service-process-leak）
方案：①generateExecuteRunId(changeName) 附 change 名 FNV-1a 6 位 hex 段（两变更同秒必不同 runId、同变更幂等、无参裸秒级兼容），isValidExecuteRunId 放宽 0-2 段后缀，五处 generate 写入点全接线；②run/shared.js 新增 mirrorPlatformArtifactToMainRepo（pointer 态 agent 本地跑时 design.md/verify-result.md/verify-facts.json 双写镜像主仓 changeDir；daemon 显式 --spec-dir、本地无 changeDir、路径同构跳过），design-init 与 verify-probes --init 接线；③reapVerifyServices 改 killProcessTree（win32 taskkill /PID /T /F；POSIX ps 递归枚举子进程），ESRCH/128 静默保留；verify prompt 补登记服务本体 PID 指引
结果：新增/扩展测试全绿（collision 9/9、platform-note 4/4、concurrency-fixes 28/28 含真实进程树实杀、fail-loud 锚同步后全过）；全量 npm test 409/409 全绿（含此前 flaky 两项）；lint 531 文件 0 hard fail；docs check 520 全过（index.js 漂移 6 处重锚）

## ql-20260910-013-6906 | 2026-09-10 20:46:35 | 修驾驭小结第四批三负面：模块文档 worktree 副本泄漏铁律 + 决策提炼扁平格式静默 0 条 + change_deleted 409 提示滞后
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（两处主仓铁律升格）
- src/decision-distill.js（双格式解析 + zeroWithContent + distill warn）
- src/sync.js（409 预期回执分流）
- test/execute-prompt-mainrepo-docs.test.mjs（扫描锁定）
- test/decision-distill-flat-list.test.mjs（5 用例）
- test/platform-tombstone-and-activity-report.test.mjs（X1-4b 用例）
- docs/sillyspec/platform-interface-map.md（sync.js 锚重锚）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（sync.js 锚重锚）
- .sillyspec/docs/sillyspec/modules/stages.md（铁律补记）
- .sillyspec/docs/sillyspec/modules/docs-consistency.md（双格式补记）
- .sillyspec/docs/sillyspec/modules/sync.md（409 分流补记）
需求：修驾驭小结第四批三负面：模块文档 worktree 副本泄漏铁律 + 决策提炼扁平格式静默 0 条 + change_deleted 409 提示滞后
根因：①task-13 子代理把模块文档写进 worktree 的 .sillyspec 副本而非主仓（原「只写主仓」规则埋在长 prompt 尾部一句带过未遵守），归档被迫 checkout 补救；②决策提炼器只认 ## 标题式条目，扁平列表格式 decisions.md 解析 0 条静默放行；③本地注销已由 CLI 完成（CLI 主动上行墓碑）撞平台 409 change_deleted，CLI 仍按「需排查」口吻 warn——提示语义滞后一个动作
方案：①execute.js 两处升格铁律（Wave prompt 欠账段原地重申 + 派发 prompt 注意段 ⚠️ 铁律：主仓 {SPEC_ROOT} 绝对路径、点破 checkout 副本随 cleanup 蒸发、子代理透传绝对路径）；②parseDecisions 兼容扁平列表式（行内 ｜ 字段白名单 + 缩进子项字段 + applyField 补中文别名），0 条含 D-xxx 形态 → zeroWithContent + distill 显式 warn；③sync.js 409 分流：本地墓碑态降 ℹ️ 预期回执（注销已完成无需动作），active 态维持 ⚠️
结果：新测试 execute-prompt-mainrepo-docs 2/2 + decision-distill-flat-list 5/5 + tombstone X1-4b（11/11）；distill 系回归 32/32；全量 npm test 410 文件仅 doc-ref 锚漂（我 sync.js 插入所致）已重锚 4 处，docs check 520 全过；lint 533 文件 0 hard fail

## ql-20260910-014-ad3b | 2026-09-10 21:08:55 | 修驾驭小结第五批三负面：daemon junction 锚与自指警告降频 + 探针 3 双根并集 + taskcard depends_on Wave 反填
状态：已完成
关联变更：（无）
文件：
- src/progress.js（ptr.specRoot realpath 规范化）
- src/run/shared.js（warnSelfRefPointerOnce 窗口 helper + writePlatformPointer 接线）
- src/run/command.js（恢复链 warn 接线）
- src/verify-probes.js（探针 3 双根并集）
- src/taskcard.js（parsePlanWaveDeps + depsFor 双来源）
- test/selfref-warn-window.test.mjs（新增 4 用例）
- test/verify-probes-probe3-dualroot.test.mjs（新增真实 worktree 用例）
- test/taskcard-depends-wave.test.mjs（新增 4 用例）
- docs/sillyspec/platform-interface-map.md（锚重锚）
- docs/sillyspec/prompt-control-debt.md（锚重锚）
- docs/sillyspec/architecture-4a.md（锚重锚）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（锚重锚）
- .sillyspec/docs/sillyspec/modules/runtime.md（第五批补记）
- .sillyspec/docs/sillyspec/modules/core-engine.md（探针 3 补记）
需求：修驾驭小结第五批三负面：daemon junction 锚与自指警告降频 + 探针 3 双根并集 + taskcard depends_on Wave 反填
根因：①pointer specRoot 为 daemon 写入的 junction 路径（读写同文件无害但路径呈现漂移、junction 随 daemon 蒸发），自指检测在两处每命令重复 warn；②探针 3「主仓目录缺失才回退 worktree」条件在「目录在主仓已存在而新测试 untracked 在 worktree」时不触发，5 条假 warning 逼人工消解；③骨架 depends_on 唯一来源 tasks.md 行内注解常被漏写，三批子代理均发现空，拓扑退化全 Wave 1
方案：①resolvePlatformSpecDir 对 ptr.specRoot realpath 规范化 + warnSelfRefPointerOnce 跨进程 10min 窗口降频两处自指 warn；②探针 3 改主仓 ∪ worktree 无条件双根并集（与探针 5 三根并集同族，in-place 零变化）；③cmdTaskcard depends_on 双来源（行内注解优先，缺失时 parsePlanWaveDeps 按 plan.md Wave 分组兜底：Wave N → Wave N-1 全部任务）
结果：新测试 9 用例全绿（selfref 4/4 含 Windows junction 实测、probe3 双根 1/1 真实 git worktree、taskcard Wave 4/4）；相邻回归全绿；lint 536 文件 0 hard fail；全量 npm test 414/414；锚漂 12 处已重锚、docs check 520 全过

## ql-20260910-019-f91b | 2026-09-10 23:03:10 | 修驾驭小结第六批三负面：taskcard --all 镜像双写主仓 + quick 门禁隔离快照 + apply EXCLUDE-DIRTY 自动三方合并
状态：已完成
关联变更：quick-ad3c0ebe
文件：
- src/run/shared.js（mirror ensureParentDir）
- src/index.js（taskcard case 镜像接线）
- src/run/gate-snapshot.js（新建快照 helper）
- src/run/quick-audit.js（门禁快照优先）
- src/worktree-apply.js（mergeDirtyOverlapThreeWay + 4.5 接线）
- test/taskcard-mirror-mainrepo.test.mjs（2 用例）
- test/quick-gate-snapshot.test.mjs（4 用例）
- test/apply-dirty-threeway.test.mjs（3 用例）
- docs/sillyspec/*.md+knowledge/*.md（锚重锚 13 处）
- modules/runtime.md,worktree.md（补记）
需求：修驾驭小结第六批三负面：taskcard --all 镜像双写主仓 + quick 门禁隔离快照 + apply EXCLUDE-DIRTY 自动三方合并
根因：①taskcard --all 经指针解析落 daemon 镜像根，spec-sync 回程前主仓无副本（两份副本窗口）；②门禁在主仓 cwd 实测，并行会话脏文件污染结果把无辜会话拦门（advisory 逃生口只是绕过不是修复）；③主仓脏改动与 worktree 交付不同区域的机器可合并场景也走人工 cp/patch（daemon.ts 实证）
方案：①mirrorPlatformArtifactToMainRepo 增 ensureParentDir + taskcard case pointer 态逐卡镜像；②run/gate-snapshot.js createGateSnapshot（HEAD worktree+会话文件 overlay+node_modules junction+local.yaml 复制），runQuickTestLintGate 快照优先、基建失败 fallback 主仓；③mergeDirtyOverlapThreeWay（git merge-file clean 才写回、mergedDirtyFiles 审计、冲突维持拦截），4.5 接线残余集分流
结果：新测试 9 用例全绿（mirror 2/2 含端到端、snapshot 4/4 含脏坏文件不拦门、threeway 3/3 真实 worktree）；apply 系回归 21/21；lint 545 文件 0 fail；全量 npm test 420/420；docs check 547 全过（漂移 13 处重锚含并行会话 knowledge 2 处）
审计：⚖️ 归属切分：9 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.claude/skills/sillyspec-archive/SKILL.md, .claude/skills/sillyspec-auto/SKILL.md, .claude/skills/sillyspec-verify/SKILL.md, src/docs-check.js, src/stages/archive.js, test/decisions-lifecycle.test.mjs, test/output-synthesis-and-gate-precheck.test.mjs, src/run/archive-distill.js, test/archive-distill-noai.test.mjs

## ql-20260910-024-d902 | 2026-09-10 23:44:32 | 坑文档化：pre-commit stash-restore 吞常规提交（三现）+ python replace 无 assert 静默流失入 troublesh…
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/troubleshooting.md（§57 两坑条目）
需求：坑文档化：pre-commit stash-restore 吞常规提交（三现）+ python replace 无 assert 静默流失入 troubleshooting §57
根因：①stash 栈是多会话共享全局可变状态，hook stash 期间他者会话插队致 restore 按引用 pop 到错误快照（三现；与 §17 同族，hook 在 sillyspec 管理面之外只能 workaround 文档化）；②str.replace 目标不匹配时静默 no-op，修正流失到复审才暴露（用户自流程已改，实践条沉淀防复潮）
方案：troubleshooting.md 追加 §57 两坑四段条目（症状/根因/workaround/关联）——workaround①=路径限定 git commit -- <pathspec>（三现验证唯一可靠，与 AGENTS 规则 18 显式 pathspec 同源互证）；workaround②=count-assert+grep 复核（fail-closed 同构）
结果：纯 doc 改动；docs check 548 处引用全通过（新增条目零新失效）；lint/test 门禁未触发（无 src/test 触及）
