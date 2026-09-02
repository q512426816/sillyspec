
## ql-20260827-001-643a | 2026-08-27 23:56:54 | quick prose 参数 MSYS 路径转换污染嗅探告警
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（MSYS 嗅探纯函数+告警出口+三处解析点接线）
- test/quick-msys-path-sniff.test.mjs（纯函数 7 例+CLI 冒烟 5 例）
- docs/sillyspec/troubleshooting.md（第 44 条坑记录）
- docs/sillyspec/platform-interface-map.md（docs check --fix 行号重锚）
- docs/sillyspec/prompt-control-debt.md（docs check --fix 行号重锚）
- docs/sillyspec/architecture-4a.md（docs check --fix 行号重锚）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（docs check --fix 行号重锚）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引补 ql-20260827-001-643a）
需求：quick prose 参数 MSYS 路径转换污染嗅探告警
根因：Git Bash(MSYS2) 把以 / 开头的参数展开成 <Git 安装目录>/… 后才传入 CLI，--req "/sessions 页修复" 无感落盘成 "E:/Software/Git/sessions 页修复" 并推送平台列表（坑 quick-req-msys-path-mangling）
方案：command.js 新增 looksLikeMsysMangledPath 纯函数（盘符路径开头+紧随空白中文正文启发式）+ warnMsysMangledFlag 出口，接线 --output/四字段/--input 三处解析点，命中 stderr 告警不阻断
结果：npm test 321 文件 0 失败（新增 12 断言）；lint 428 文件通过；docs check 509/509 全绿（--fix 重锚 16 处行号漂移）

## ql-20260828-001-b050 | 2026-08-28 01:54:28 | verify 测试对账通过行误判修复——known_failures 假阳性淹没
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（通过行剔除+× 标记+vitest 汇总行识别）
- test/verify-postcheck-known-failures.test.mjs（4 组回归断言）
- docs/sillyspec/troubleshooting.md（第 45 条坑记录）
- docs/sillyspec/prompt-control-debt.md（docs check --fix 行号重锚）
- .sillyspec/docs/sillyspec/modules/core-engine.md（变更索引补 ql-20260828-001-b050）
需求：verify 测试对账通过行误判修复——known_failures 假阳性淹没
根因：PER_TEST_FAIL_RE 的 FAILED/error:/exception 是子串匹配，vitest 通过行用例名恰含这些字样（如「超时后 syncStatus=failed」带 ✓ 前缀）即被误判失败行——2710 用例套件 382 个失败行中 378 假阳性，known_failures 无法逐条枚举而实质失效，verify 护栏又禁改测试源码形成双卡（multi-agent-platform 仓实证）
方案：partitionFailures 分类前按行首通过标记（✓/√/✔/PASS，剥 ANSI 色码后判定）剔除通过行，返回保留原文；PER_TEST_FAIL_RE 补 vitest × 失败标记；SUMMARY_LINE_RE 补 vitest 无冒号汇总行
结果：npm test 321 文件 0 失败（新增 4 组回归 33 断言全绿）；lint 428 文件通过；docs check 509/509 全绿

## ql-20260828-002-b3fa | 2026-08-28 02:06:22 | verify 对账补修：vitest 控制台捕获噪声行剔除
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（4 类噪声行剔除）
- test/verify-postcheck-known-failures.test.mjs（噪声 fixture 回归）
- docs/sillyspec/prompt-control-debt.md（行号重锚）
需求：verify 对账补修：vitest 控制台捕获噪声行剔除
根因：首轮修复（f2a3965）只剔了 ✓ 通过行，真实全量输出实测仍余 373 行假阳性——155 条 stderr|捕获横幅（用例名含 failed 字样）+ 218 条 jsdom Not implemented 环境警告（error: 命中）
方案：CONSOLE_CAPTURE_RE 剔 stdout/stderr|横幅行；ENV_NOISE_RE 剔 Not implemented: 警告（i 标志修大写 N 失配）；SUMMARY_LINE_RE 增 Failed Tests 分节头与 ELIFECYCLE 退出横幅；补噪声 fixture 回归
结果：真实输出端到端：2710 用例套件失败行 382→15，7 条语义化豁免 remaining=0；npm test 321 文件 0 失败（34 断言）；lint 通过；docs check 509/509

## ql-20260828-003-3bf7 | 2026-08-28 07:38:48 | 用户实证三负面反馈工具化——known_failures 列表内注释截断（连续踩两次）/ 平台同步破坏本地两形态（删整个 changes 目录、覆盖回旧版）/ …
状态：已完成
关联变更：（无）
文件：src/verify-postcheck.js（extractKnownFailures 块式正则放行注释行/空行——列表内注释截断捕获链致注释后豁免项静默丢失；行尾注释剥离改空白前置判；引号值原样保留）, src/spec-sync.js（computeSpecOps 加 changes/ 整删守卫；filterStaleUpdates 旧副本回推守卫 + .runtime/spec-sync-last-success.json 时间锚——本地未改动而服务器已前进的 update 不回推）, src/run/gates.js（filterStaleBaselineOverlap——归因提示②重叠集只留 dirty 且非他者声明文件，全滤空则整体静默）, test/verify-postcheck-known-failures.test.mjs（+7 断言：注释/空行/引号#形态）, test/platform-spec-sync-incremental.test.mjs（+场景6整删护栏/7纯函数/8端到端回拨mtime）, test/verify-concurrency-fixes.test.mjs（+5 断言：51文件全他者声明场景复原）, docs 重锚5文件（docs check --fix 10处）
需求：用户实证三负面反馈工具化——known_failures 列表内注释截断（连续踩两次）/ 平台同步破坏本地两形态（删整个 changes 目录、覆盖回旧版）/ 归因提示②51文件重叠误导 gen:types 重跑
根因：①块式正则要求块内连续列表项，注释/空行打断捕获链，注释后项丢失→清单残缺假红；②共享平台工作空间下错锚/滞后本地的破坏性 ops（整删 changes/、旧副本回推）无护栏直发服务器，再经同步链落地回各端；③归因提示②只看 apply-pathspec ∩ 近期提交，并行在途/刚收尾文件虚高重叠集且每轮误导重跑生成命令
方案：①块定义吸收注释行/空行（提取侧本只认 - 项行）+ 行尾注释空白前置判 + 引号值保留；②computeSpecOps 加 changes/ 整删 fail-closed 守卫 + filterStaleUpdates（mtime 早于上次同步+1s 且服务器 hash 变 → 拦 update，重存后重推为强制出口）；③归因提示②过滤——重叠文件须当前对 HEAD 有改动（未提交时旧基线覆盖必然物理在场）且非他者声明集（归提示①），空集静默
结果：npm test 全绿（新增/扩展三测试文件）+ lint + docs check 509/509（10处漂移 --fix 重锚）；CRLF+注释+引号# 现场烟测通过

## ql-20260828-004-82be | 2026-08-28 07:38:49 | 用户实证四负面反馈工具化——merge 空转需手工补救 / 探针5单 task 产物对账 150 条假 missing / cleanup 后 --done 被…
状态：已完成
关联变更：（无）
文件：src/worktree-apply.js（autoCommitWorktreeWip——applyByMerge merge 前把未提交交付物 pathspec commit 到分支，衔接子代理不 commit 的形态）, src/contract-matrix.js（_resolveDiffFilesForParity 兜底链补第三级 apply-pathspec，diff 空时不回退全仓）, src/index.js（endpoints extract --all-tasks 聚合模式——逐 task 卡提取各自落产物，与探针5聚合读侧对齐；与 --task/--dir/--files 互斥）, src/verify-postcheck.js（printVerifyParityCheck scope=full-repo 时打口径错配告警）, src/run/complete-handlers.js（execute 正当清理回执 execute-cleanup-<change>.json）, src/run/gates.js（deps 门凭据放行：apply-pathspec/execute-cleanup 二选一凭据在 → 放行不逼 doctor 对齐；plan 门 facade 预检接线）, src/facade-hint.js（新——direct import/同目录聚合≥2 启发式亮透传候选，advisory）, src/stages/execute.js + templates/prompts/verify-probes.md + .claude SKILL + docs/prompt 镜像（--all-tasks 文案四同步）, test/apply-merge-wip-autocommit.test.mjs（新5断言）/ test/probe5-pathspec-fallback.test.mjs（新9断言）/ test/facade-hint.test.mjs（新11断言）/ test/enforce-deps-gate-diagnostic.test.mjs（+C1-C3）
需求：用户实证四负面反馈工具化——merge 空转需手工补救 / 探针5单 task 产物对账 150 条假 missing / cleanup 后 --done 被 deps 门拦逼 doctor 对齐 / facade 透传文件两轮手工补 allowed_paths
根因：①--merge 路径只看已提交而子代理默认不 commit，分支 tip 只有 baseline checkpoint → merge 空转零落地；②apply+commit/cleanup 后主仓 diff 为空 → 前端调用回退全仓 × 局部端点集 = 口径错配噪音；③deps 门把 cleanup 后的「无 meta」当「依赖未就绪」拦——cleanup 是流程自己的正当收尾；④plan 生成无调用链分析，透传必经文件只能执行期撞 Gate1 后回补
方案：①merge 前 autoCommitWorktreeWip（pathspec commit 不扫入无关 staged，--no-verify，失败降级 warning）；②兜底链补 apply-pathspec 级 + endpoints --all-tasks 聚合 + full-repo 口径告警 + 模板/SKILL/镜像四同步；③execute-cleanup 回执 + deps 门查 apply-pathspec/execute-cleanup 凭据放行（无凭据仍阻断不放水）；④plan 门 facade 预检（启发式 advisory：直接引用 allowed 模块 + 同目录聚合≥2 形态）
结果：npm test 全绿 + lint 432 文件 + docs check 509/509（19处漂移 --fix 重锚）；四修复各有回归测试（5+9+11+3 断言）

## ql-20260828-005-56b5 | 2026-08-28 08:11:49 | 用户实证两负面反馈工具化——同 main 两个活跃会话暂存区互相污染无防护（本轮竞态事故根因
状态：已完成
关联变更：（无）
文件：src/commit-suggest.js（collectStagedArea——git diff --cached --name-only 快照 + ownFiles 差集他者暂存告警）, src/index.js（sillyspec commit 打暂存区快照段；worktree apply 成功路径对 commitPathspec 做他者暂存差集告警 + pathspec 级 commit 双出口）, src/decision-distill.js（条目加「变更：<name>」限定行；幂等键 号→号+变更；同号匹配/版本守卫/旧段清除/跨文件清理全部限定同变更；legacy 无变更行段只共存不误删）, src/docs-check.js（extractKnownFailureKeys 同步 verify-known-failures-comment-line-truncation 修复——两处口径互指契约对齐）, test/commit-suggest.test.mjs（+collectStagedArea 6 断言）, test/decision-distill-cross-change.test.mjs（新 13 断言：共存/同变更版本演进/幂等/legacy）
需求：用户实证两负面反馈工具化——同 main 两个活跃会话暂存区互相污染无防护（本轮竞态事故根因，建议 commit 提示带 git diff --cached --name-only 快照）；决策提炼按 ID 全局幂等致跨变更同号决策（两个 D-002）在 knowledge 里互相 supersede（条目缺变更名限定）
根因：①git 暂存区是仓级单例，同 main 双会话物理共享，A 的 commit 恰好提交 B 已暂存文件——工具的 commit 提示只有工作区视角（status/diff stat）无暂存区视角，污染不可见；②D-xxx 编号是变更内局部序号，提炼落库键只用 号@版本，跨变更同号天然碰撞，后归档者整段替换先归档者
方案：①commit-suggest 新增 collectStagedArea（快照 + ownFiles 差集），接线两处——sillyspec commit 输出暂存区快照段（明示 git commit 将恰好含这些文件），worktree apply 成功路径对 commitPathspec 做差集告警（推荐 pathspec 级 commit 不动他者暂存 / 或 restore --staged）；②decision-distill 条目加「变更：」字段行（消费方 knowledge-match/docs-check 只认标签，增量安全），幂等键改 号+变更，supersede/清除/跨文件清理全部同变更内生效
结果：npm test 325 文件 0 失败（新增 19 断言）+ lint + docs check 509/509（6 处 index.js 行号漂移 --fix 重锚）；CLI 烟测暂存区快照段输出正确；顺手同步 docs-check 的 known_failures 解析副本的注释截断修复（与 verify-postcheck 口径互指契约）

## ql-20260828-006-4e49 | 2026-08-28 08:42:19 | 用户实证瑕疵——scan 类文档（ARCHITECTURE/CONCERNS）属受保护基线、--files 声明了照样拦必须 --force-baseline
状态：已完成
关联变更：（无）
文件：src/run/shared.js（QUICK_DANGEROUS_PATTERNS 提升模块级 + predictProtectedQuickFiles 纯函数——与 auditQuickCompletion 危险门逐字同口径：isQuickMetadata 豁免 + 关联变更目录退栈 + 危险清单前缀/精确匹配）, src/run/stage.js（quick 起步 step1 与恢复追加 --files 两处预告打印——点名具体文件 + --force-baseline 出路 + 两套开关明示）, test/quick-protected-preview.test.mjs（新 10 断言：纯函数 6 口径 + e2e 起步预告）
需求：用户实证瑕疵——scan 类文档（ARCHITECTURE/CONCERNS）属受保护基线、--files 声明了照样拦必须 --force-baseline，设计合理但提示太晚：要等 --done 审计轮才发现，白跑一轮往返；建议 step1 即告知哪些声明文件会触发基线拦截
根因：拦截判定只在 --done 审计时执行（auditQuickCompletion 危险门），起步时的 --files 解析处无同口径预判——step1 prompt 只有通用文案（预判要改核心文件请带 --force-baseline），不点名本次声明里的具体命中文件
方案：危险清单提升为模块级单一真相源（审计门与预告共用），新增 predictProtectedQuickFiles 纯函数（.sillyspec/ 非元数据非关联目录 + 危险清单，forceBaseline 已带则无预告），接线 quick 起步与恢复追加两处——预告明示「--files 只声明归属不解锁拦截」与 --force-baseline 出路
结果：npm test 326 文件 0 失败（新增 10 断言）+ lint + docs gate 全绿（1 处行号漂移 --fix 重锚）；e2e 验证 step1 输出点名 scan 文件并给出口。子目录锚定（瑕疵②）为正面实证无需改动

## ql-20260831-001-ad9d | 2026-08-31 11:55:50 | verify 捕获块内容行误判失败行（744→41）+ endpoints 挂载前缀假 missing（探针5 对齐）+ troubleshooting 46/…
状态：已完成
关联变更：（无）
文件：src/verify-postcheck.js, src/endpoint-extractor.js, src/contract-matrix.js, src/verify-probes.js, test/verify-postcheck-known-failures.test.mjs, test/contract-artifacts.test.mjs, test/probe5-mount-prefix.test.mjs, docs/sillyspec/troubleshooting.md
需求：verify 捕获块内容行误判失败行（744→41）+ endpoints 挂载前缀假 missing（探针5 对齐）+ troubleshooting 46/47
根因：坑45 修复只剔 vitest 捕获横幅行本身，横幅下方内容行（挂通过用例的结构化日志）无跨行状态仍被逐行子串匹配——v3.27.12 实证升级治不了；挂载点前缀（main.py include_router/app.use）与 router 文件分离，静态提取系统性欠前缀
方案：partitionFailures 改单遍捕获块状态机（横幅开块/报表行结束/空行不结束/块内全剔，×FAIL 报表行恒检出 fail-safe 不变）；endpoint-extractor 新增 extractMountPrefixes/scanMountPrefixes，diffApiParity 增 mountPrefixes 前缀对齐（原始路径恒首位、最长优先），verifyApiParity/探针5/contract scan 接线并在 summary/报告披露对齐数；troubleshooting.md 补 46/47 条（根因/修复/使用方注意含 local.yaml 33→15 收缩指引）
结果：全量 npm test exit 0（4759 PASS，含新增 3 测试文件 15 断言组）+ lint 通过（446 文件 0 未引用导出）；daemon 全量 9681 行实跑对比：旧 744 失败行 → 新 41（全为真实 Windows 既有失败详情），multi-agent-platform local.yaml 豁免收缩清单 15 条实证写入注释；探针5 端到端用例（对齐/真缺失/全路径仓/渲染披露）全绿

## ql-20260902-001-8f3a | 2026-09-02 09:05:00 | 用户实证三负面反馈工具化——conditionalWait 步骤 --continue 假完成（--done 落错步）/ pytest warnings summary 误判失败行（真实守卫失败被淹没）/ per-task review 与统一 commit 模式冲突
状态：已完成
关联变更：（无）
文件：src/run/complete.js, src/verify-postcheck.js, src/task-review.js, src/stages/execute.js, src/index.js, test/plan-continue-conditional-wait.test.mjs, test/verify-postcheck-known-failures.test.mjs, test/task-review-diffpaths.test.mjs, test/contract-artifacts.test.mjs, docs/sillyspec/troubleshooting.md, docs/sillyspec/prompt-control-debt.md, docs/sillyspec/finished/self-audit-2026-08-07.md
需求：修复 2026-09-01-session-group-chat dogfood 三个负面反馈：①--continue 后 --done 把后续步骤回填 completed（step 4 生成 TaskCard 假完成，需 --reopen 重做浪费一轮）；②verify 实测 PER_TEST_FAIL_RE 把 DeprecationWarning 块当失败行，真实失败（1 个守卫测试）被噪音淹没需人工分模块定位；③per-task review 要求 base..head diff 与主代理统一 commit 模式天然冲突，只能靠 changedFiles 归属说明
根因：①waitStep 提示对 requiresWait/conditionalWait 同文承诺「--continue 后回待执行」，但 continueStep 的 shouldReturnToCurrentStep 谓词漏了 conditionalWait——审查计划被 --answer 直接收尾，agent 备好的 --done 落到下一步（user-inputs.md 实证 --continue 后 2 秒假完成，plan rev1 --reopen 重做）；②pytest warnings summary 归因行路径含 exception 子串（starlette _exception_handler.py 全家桶标配）命中 /exception/i，坑 45/46 的 vitest 捕获块状态机管不到 pytest 形态；③review 证据校验只认整区间 diff，schema 无「路径限定切片」字段，统一 commit 下 10 个 task 共用同一对 base..head 任务边界不可机器验证
方案：①shouldReturnToCurrentStep 并入 conditionalWait（对齐提示语义；受影响=plan/审查计划、brainstorm/Design Grill、scan 两步，均「答案后完成动作再 --done」语义；--done --answer 一步式不受影响）；②partitionFailures 两层剔——warnings summary 区段头→下一 pytest 区段头整段剔 + 行级兜底（归因/分组/Node 警告行+同上下文 id/源码展示行，兼容 … 截断前缀），真实失败信号（E 行/AssertionError 归因/short summary FAILED）恒保留 fail-safe 不变；③review.json 新增可选 diffPaths（=task 卡 allowed_paths）——evidence 的 emptyDiff/交叉比对收窄到 git diff base..head -- diffPaths 切片，adopt/草稿自动代填（仅有归属切片时带），execute 契约补「base/head 两种取法」段
结果：全量 npm test 338 文件 0 失败（新增 3 测试文件：plan-continue 14 断言 / diffpaths 21 断言 / known-failures 新增 3 用例组）+ lint 通过（448 文件 0 未引用导出）+ docs gate 0 失效（--fix 重锚 13 处，含 WIP 遗留 2 处）；实测 agent 模块截断 tail 2 行（1 假 1 真）→ 1 行真实 FAILED；顺手修 WIP 遗留 flaky：contract-artifacts scanMountPrefixes 用例共享 tmpDir 并发踩踏改独立目录；troubleshooting.md 补 48/49/50 条

## ql-20260902-002-7f5f | 2026-09-02 11:07:00 | progress show --json 全局状态总览出口（跨 agent 单一状态源 P0-1）
状态：已完成
关联变更：（无）
文件：src/machine-interface.js, src/progress.js, src/index.js
需求：progress show --json 全局状态总览出口（跨 agent 单一状态源 P0-1）
根因：SillyHub 面板与跨 agent 需要机器可读全局状态；现状 gate/derive 仅单变更粒度、dump 是单变更视角（daemon 轮询），多变更总览无 JSON 出口，两套账本导致并发互不知情
方案：StageMachine 新增 overview(cwd) 只读纯数据方法（与 show 汇总同源），facade 转出；machine-interface 新增 runStatusOverview 封装 envelope（DB 不存在 fail-closed exit 2、ghost 升 warnings）；index.js progress show --json 接线 + help 文案；machine-interface.test.mjs 组10 十五断言；修复 platform-interface-map.md 8 处行号漂移；同步 machine-interface/progress 模块卡。--force-baseline 理由：progress.js/stage-machine.js 属受保护核心文件，本次为只读方法新增（overview 不写 DB），全量测试 338/0 验证通过
结果：machine-interface.test.mjs 121/0（新增 15 断言全过）；全量 npm test 338/0；npm run lint 448 文件 0 告警；doc-ref-check 84 引用全过；真实仓 progress show --json 正确输出 4 活跃变更含 ghost/stall
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/platform-interface-map.md, src/progress/stage-machine.js, test/machine-interface.test.mjs

## ql-20260902-003-277a | 2026-09-02 15:31:39 | quick --done 内置 test+lint 硬门禁（规则 8 下沉为 CLI 卡点
状态：已完成
关联变更：（无）
文件：
- src/run/quick-audit.js（新增 runQuickTestLintGate/printQuickTestLintGate）
- src/run/complete-handlers.js（边界审计后接线门禁）
- src/config-schema.js（commands.test/lint readers 登记）
- test/quick-test-gate.test.mjs（新增 8 组 21 断言）
- docs/sillyspec/platform-interface-map.md（修 1448→1464 行号漂移）
- .sillyspec/docs/sillyspec/modules/runtime.md（quick-audit 职责+P0-2 条目）
- .sillyspec/local.yaml（gitignore 本机文件补 commands 段（不进库））
需求：quick --done 内置 test+lint 硬门禁（规则 8 下沉为 CLI 卡点，跨 agent 工单 P0-2）
根因：CLAUDE.md 规则 8「触及 src/test 先跑 test+lint」全靠 agent 自律，跳过无痕迹无阻断；verify 阶段已有 runVerifyTestCheck/runVerifyLintCheck 实测引擎而 quick 收尾路径无同款门禁
方案：quick-audit.js 新增 runQuickTestLintGate（动态 import verify-postcheck 复用实测引擎；env 逃生门/空清单/doc-only 跳过、触及 src/test 才实测、未配置命令降级不阻断）+ printQuickTestLintGate；complete-handlers.js 边界审计后接线，fail 回 pending+exit 1；config-schema readers 登记；新增 test/quick-test-gate.test.mjs 21 断言；修 platform-interface-map 行号漂移；runtime.md 同步；本仓 local.yaml 补 commands 启用自监管
结果：quick-test-gate 21/0；全量 npm test 339/0；lint 449 文件 0 告警；doc-ref-check 84 引用全过；本次 --done 已被门禁实测通过（dogfood 自证）

## ql-20260902-004-0661 | 2026-09-02 17:04:35 | resolveEffectiveDir worktree 主仓自动锚定（治 quick 新会话分裂进度库
状态：已完成
关联变更：（无）
文件：
- src/index.js（resolveEffectiveDir 第四层锚定 + dirname import）
- test/worktree-auto-anchor.test.mjs（新增 4 场景 11 断言）
- docs/sillyspec/platform-interface-map.md（修复 8 处 index.js 行号漂移）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（变更索引 + updated_at）
需求：resolveEffectiveDir worktree 主仓自动锚定（治 quick 新会话分裂进度库，P1-1）
根因：resolveEffectiveDir 两级解析在 linked worktree 内全 miss（toplevel 返回 worktree 自身、.sillyspec gitignore 无副本）→ 返回 worktree cwd 新建分裂库；既有 D-03 守卫只覆盖有副本、quick drift 守卫只覆盖有 guard，新会话两者均拦不住
方案：补第四层：detectIsolation 同源判据（git-dir≠common-dir 且非 submodule）→ common-dir 绝对化取父目录主仓根 → 有 .sillyspec 则 warn+锚定，否则行为不变；优于 --root 显式参数（零参数零习惯成本覆盖全部命令入口）；新增 worktree-auto-anchor.test.mjs 11 断言（真实 git worktree fixture）；修复 platform-interface-map 8 处行号漂移；同步 cli-entry.md
结果：worktree-auto-anchor 11/0；全量 npm test 340/0；lint 450 文件 0 告警；doc-ref-check 84 引用全过

## ql-20260902-005-3298 | 2026-09-02 18:31:07 | P2-2：sync-conflict 标红透出 + doctor file-lifecycle 文档欠账自动检查
状态：已完成
关联变更：（无）
文件：
- src/progress/stage-machine.js（overview pending_conflicts + _listPendingConflicts + show 标红）
- src/machine-interface.js（冲突升 warnings）
- src/doctor-diagnostics.js（D8 lifecycle_doc_staleness 维度）
- test/machine-interface.test.mjs（组10f 5 断言）
- test/doctor-lifecycle-doc.test.mjs（新增 5 场景 10 断言）
- .sillyspec/docs/sillyspec/modules/core-engine.md（D8 设计决策）
- .sillyspec/docs/sillyspec/modules/progress.md（overview 冲突透出）
- .sillyspec/docs/sillyspec/modules/machine-interface.md（pending_conflicts 契约）
需求：P2-2：sync-conflict 标红透出 + doctor file-lifecycle 文档欠账自动检查
根因：① 未决同步冲突只 platform status 可见，progress 总览/JSON 均不透出，agent 撞上才发现（冲突可见性缺口）；② CLAUDE.md file-lifecycle 检查清单是人工 checklist，docs-debt 只算模块卡、file-lifecycle.md 本身无 staleness 检查
方案：① overview 加 pending_conflicts（_listPendingConflicts fs-only 同源扫描）+ show 变更级 🔴 标红 + runStatusOverview 冲突升 warnings；② doctor 新增 D8 lifecycle_doc_staleness：git %ct 比较文档 vs 六个生命周期敏感路径，落后 WARNING + safe_action，降级语义不误报；测试 +15 断言（含 Windows env 踩坑修复）；同步 core-engine/progress/machine-interface 三张模块卡
结果：machine-interface 126/0（新增5）、doctor-lifecycle-doc 10/0（新增10）、全量 npm test 341/0、lint 451 文件 0 告警
