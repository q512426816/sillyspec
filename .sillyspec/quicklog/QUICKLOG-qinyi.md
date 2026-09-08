
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

## ql-20260902-006-7535 | 2026-09-02 21:10:09 | show 总览补全局未决冲突段（P2-2 盲区
状态：已完成
关联变更：（无）
文件：
- src/progress/stage-machine.js（show 汇总全局冲突段）
- test/machine-interface.test.mjs（10f 补丁断言）
需求：show 总览补全局未决冲突段（P2-2 盲区，非活跃变更冲突漏显）
根因：逐变更行匹配漏掉挂在 ghost/非活跃变更上的冲突，huber 面板联调实证 11 条显示 0
方案：show 汇总段尾加全局冲突兜底段（pendingConflicts 全量，与 JSON 顶层 pending_conflicts 同口径）+ 10f 测试断言（≥2 活跃走汇总分支）
结果：machine-interface 127/0；multi-agent-platform 实跑 11 条正确显示

## ql-20260906-001-1f6b | 2026-09-06 00:01:16 | 修 archive 文档等待配置漂移 + 注入模板去 npm 硬编码
状态：已完成
关联变更：（无）
文件：
- docs/prompt/archive.md（Step3 元数据对齐源码 conditionalWait）
- templates/agents-instruction.md（规则8 改读 local.yaml 命令）
需求：修 archive 文档等待配置漂移 + 注入模板去 npm 硬编码
根因：①源码 2026-08-23 已把 sync-module-docs 改为 conditionalWait，_sync.mjs 只同步正文 fence 不同步手工元数据区，文档残留 requiresWait 与正文矛盾；②agents-instruction 模板会被 init 写入任意栈项目的 AGENTS.md，规则8硬编码 npm 命令对非 Node 项目是错误指令
方案：①archive.md Step3 等待配置块改为 conditionalWait/repeatableWait/maxWaitRounds=3/waitReason 对齐源码；②规则8改为优先读 .sillyspec/local.yaml 的 commands.test/commands.lint，未配置按项目栈给等价命令（npm / pytest+ruff 示例）
结果：node docs/prompt/_verify.mjs 通过；init-agents-injection 测试 52 断言全过 0 失败；改动仅 doc/模板未触 src/test

## ql-20260907-001-c129 | 2026-09-07 10:24:27 | spec-sync 间歇 aborted 异常治理——AbortError 分类文案 + 同步总熔断 env 可调
状态：已完成
关联变更：（无）
文件：
- src/spec-sync.js（describeSyncError 分类器 + 两处 catch 接线）
- src/run/shared.js（resolveSyncTotalTimeoutMs env 开关 + raceWithAbort 默认参数逐次求值）
- test/spec-sync-abort-classification.test.mjs（新增 16 断言回归）
- docs/sillyspec/platform-interface-map.md（shared.js 六处行号重锚 + §7 熔断条目新口径）
- docs/sillyspec/troubleshooting.md（条目 #54 aborted=熔断 登记）
需求：spec-sync 间歇 aborted 异常治理——AbortError 分类文案 + 同步总熔断 env 可调
根因：平台执行环境后端偶发 >8s 响应，run/shared.js 8s 同步总熔断（HUB-09）外部取消在飞 fetch，undici AbortError 英文原始串 This operation was aborted 被 spec-sync.js 两处 catch 用 err.message 原样拼进 warn，像未知异常引一轮排查；间歇触发、best-effort 语义无害但观感吓人（债 E22b defer 场景实证）
方案：spec-sync.js 新增 describeSyncError(err)（AbortError→总预算熔断让路人话 / TimeoutError→单请求超时 / 其余原样，口径同 sync.js fetchJson 先例），接线拉清单/同步两处 catch；run/shared.js 新增 resolveSyncTotalTimeoutMs()，SILLYSPEC_SYNC_TIMEOUT_MS 整数毫秒 [1000,120000] 非法回退 8s，raceWithAbort 默认参数改逐次求值 env 即时生效；platform-interface-map.md 六处 shared.js 行号重锚 + §7 熔断条目补口径；troubleshooting.md 追加条目 #54
结果：npm test 358/358 绿（含新测试 spec-sync-abort-classification 16 断言：分类单元 + 外部 abort 集成 warn 不露英文串 + env 合法性九宫格 + env=1000 熔断实测 1034ms 生效）；doc-ref-check 87 引用全通过；npm run lint 472 文件 0 告警、未引用导出 0 项
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/platform-interface-map.md, docs/sillyspec/troubleshooting.md, test/spec-sync-abort-classification.test.mjs

## ql-20260907-002-b9d4 | 2026-09-07 10:45:12 | ghost 判定排除 quick 会话行——overview/show 与 doctor D4 同源豁免
状态：已完成
关联变更：（无）
文件：
- src/progress/stage-machine.js（新增 _isGhostChange（QUICK_SID_RE 豁免 quick 行），show/overview 两处 dirMissing 同源换用）
- src/doctor-diagnostics.js（D4 ghostRows 排除 quick 行；cleanupGhostChanges 有意保留 quick 归档能力+现场注释）
- test/quick-ghost-exclusion.test.mjs（新建 4 用例——三判定豁免 + cleanup 保留归档契约）
- .sillyspec/docs/sillyspec/modules/machine-interface.md（ghost 语义补注 quick 豁免）
- .sillyspec/docs/sillyspec/modules/progress.changelog.md（补录本条）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（补录本条）
- docs/sillyspec/file-lifecycle.md（updated_at 重锚+批次注）
- docs/sillyspec/architecture-4a.md（docs check --fix 行号重锚 2 处（本改动漂移））
- docs/sillyspec/prompt-control-debt.md（docs check --fix 行号重锚（他会话在途漂移顺带））
- docs/sillyspec/review-2026-08-20-full-audit.md（docs check --fix 行号重锚（他会话在途漂移顺带））
需求：ghost 判定排除 quick 会话行——overview/show 与 doctor D4 同源豁免，cleanup 保留归档兜底
根因：initChange 对 quick-<hex8> 会话行特意不建 changes/ 实体目录（进度存 SQL），而 ghost 判定=DB active 且 changes/ 无目录、未排除 quick 行——进行中 quick 从写库起即误报 ghost，quick 收尾链中断（QUICKLOG 已完成、行未注销）则持久误报，面板观感「清了又长」（multi-agent-platform/docs/sillyspec/2026-09-07-quick-inflight-ghost-misjudge.md 实证）
方案：按该文档建议修法：stage-machine.js 新增模块级 _isGhostChange（QUICK_SID_RE 豁免 quick 行），show 汇总与 overview 两处 dirMissing 同源换用；doctor-diagnostics.js D4 ghostRows 过滤 quick 行（QUICK_SID_RE 入既有 run/shared.js import）；cleanupGhostChanges 有意不动——保留「QUICKLOG 已完成但 DB 行仍 active」收尾中断形态的归档兜底（现场注释钉住不对称设计）；machine-interface 模块卡 ghost 语义补注、progress/core-engine changelog 补录、file-lifecycle updated_at 重锚。--force-baseline 理由：stage-machine.js 属受保护核心文件，本次为 ghost 判定条件收窄（quick 行豁免），不改数据写路径，全量测试 359/0 + 新契约测试 4 用例验证；--allow-new：新增专项测试文件
结果：新增 test/quick-ghost-exclusion.test.mjs 4 用例（红态验证 3 败 1 过，修后全绿：overview envelope/show 渲染/D4 ghostRows 三判定豁免 + cleanup 保留归档契约）；全量 npm test 359 文件 0 失败；lint 473 文件 0 告警；docs check 550/550 全绿（--fix 重锚 4 处行号漂移）；真实仓实证 progress show --json quick 行 ghost=false、doctor D4 pass

## ql-20260907-003-3356 | 2026-09-07 21:09:03 | skills 文档降 token 批次——死入口 propose 重定向 + 手册/重复表瘦身
状态：已完成
关联变更：（无）
文件：
- .claude/skills/sillyspec-propose/SKILL.md（重定向薄壳（原 87 行全量死指令））
- .claude/skills/sillyspec-knowledge/SKILL.md（269→45 行）
- .claude/skills/sillyspec-workspace/SKILL.md（175→35 行）
- .claude/skills/sillyspec-resume/SKILL.md（70→25 行）
- .claude/skills/sillyspec-continue/SKILL.md（47→19 行）
- .claude/skills/sillyspec-state/SKILL.md（64→24 行）
- .claude/skills/sillyspec-brainstorm/SKILL.md（docHash 自动刷新一句）
- .claude/skills/sillyspec-plan/SKILL.md（同上）
- .claude/skills/sillyspec-execute/SKILL.md（同上）
需求：skills 文档降 token 批次——死入口 propose 重定向 + 手册/重复表瘦身
根因：多角度分析发现 skill 指令层大量机械冗余且存在死指令（run propose 报未知阶段、propose 教手算 sha256）；knowledge/workspace 手册化复写 CLI --help；resume/continue/state 保留 CLI 已内置的探测表与排版模板
方案：propose 重写为 brainstorm 重定向薄壳保触发词；knowledge 269→45 行 JSON 示例压速查表；workspace 175→35 行删 bash for-loop 与手写 yaml 兜底；resume/continue 删手工探测表留 sillyspec next；state 改 progress show 原样转述；brainstorm/plan/execute Stage Review Gate 段补 docHash gate 时自动刷新说明；删 verify-per-user 测试桩
结果：npm test 全绿（26 套件 359+40 断言组）+ lint 473 文件 0 告警；CLI 行为零改动（纯 skill 文档），npm test/lint 均通过

## ql-20260907-004-e44f | 2026-09-07 21:56:07 | 主流程 step1 进度确认 noAI 化——省三轮 agent 复述往返
状态：已完成
关联变更：（无）
文件：
- src/run/progress-confirm.js（新模块）
- src/run/prompt.js（firstRenderableIdx 五处注入锚）
- src/stages/brainstorm.js（step1 noAI）
- src/stages/execute.js（step1 noAI）
- src/stages/verify.js（step1 noAI）
- test/progress-confirm-noai.test.mjs（16 断言）
需求：主流程 step1 进度确认 noAI 化——省三轮 agent 复述往返
根因：分析报告 T2 梯队：step1 职责已全机械化（快照本就 CLI 注入/阶段路由由 run 落定/自动名检测是正则），agent 只在复述注入内容后 --done
方案：新 progressConfirm 动作（快照+阶段专属提示 console 直出）挂 brainstorm/execute/verify step1；noAI 双分发点接线；连带修 prompt.js 五处仅-step0-注入判定为首个可见步（否则 persona/护栏/契约/铁律/平台路径整段丢失）；PROGRESS_SNAPSHOT 占位符退役；文档同步（docs/prompt×3 + file-lifecycle）
结果：全量 27 套件 0 失败（新测试 progress-confirm-noai 16 断言全过；spec-dir Test4 与 blocked-recovery 修复后全绿）+ lint 475 文件 0 告警；三阶段步骤名/步骤数不变存量进度库兼容

## ql-20260907-005-6658 | 2026-09-07 22:01:57 | quick test/lint 门禁倒推 B 兜底——声明边界触及 src 必实测
状态：已完成
关联变更：（无）
文件：src/run/quick-audit.js, src/run/complete-handlers.js, test/quick-test-gate.test.mjs, templates/agents-instruction.md, CLAUDE.md
需求：quick test/lint 门禁倒推 B 兜底——声明边界触及 src 必实测
根因：倒推 B 模式（代码先行）的文件全部早于会话启动被基线吸收，审计 changedFiles 为空，门禁静默 skip——声明 --files 明确触及 src/test 却逃过实测（quick-f9138c2f 本日实证）；另规则 8 文案仍教 agent 手跑全套，未反映 2026-09-02 已落地的 CLI 实测门禁
方案：runQuickTestLintGate 增 declaredFiles 参数：changedFiles 空时回退 guard.allowedFiles 判定触及面（skip reason 标注口径来源）；complete-handlers 调用点透传；规则 8 文案双处更新（CLI 实测为卡点/预跑可选）
结果：quick-test-gate 25 断言全过（新增兜底两用例：触及 src 实测 pass / 纯 doc 仍 skip）+ audit-quick-completion 54 断言全过；lint 475 文件 0 告警

## ql-20260907-006-deff | 2026-09-07 22:15:05 | 机械事实注入三占位符——省高频 cat/git status/手数勾选往返
状态：已完成
关联变更：（无）
文件：
- src/run/prompt.js（三占位符替换块）
- src/stages/quick.js（GIT_DIRTY+LOCAL_COMMANDS）
- src/stages/verify.js（TASKS_CHECKBOX+LOCAL_COMMANDS×2）
- test/prompt-injection-gaps.test.mjs（13 断言）
需求：机械事实注入三占位符——省高频 cat/git status/手数勾选往返
根因：分析报告注入缺口项：local.yaml 读取在 5 阶段 7+ 处步骤重复发生；quick 收尾让 agent 重跑 git status；verify 逐项检查让 agent 手数 checkbox——全部 CLI 渲染时可确定性直出
方案：outputStep 增 LOCAL_COMMANDS/GIT_DIRTY/TASKS_CHECKBOX 三占位符（fail-soft 替换不留残留）；9 处 stage prompt 旧指令行替换为注入引用；修复 gitQuiet 返回形状误用（裸 string 非 value 对象）；docs/prompt 五 md + README 总表同步
结果：prompt-injection-gaps 新测试 13 断言全过；全量套件 0 失败 + lint 476 文件 0 告警
审计：📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档（涉及模块：core-engine）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/verify-postcheck.js

## ql-20260907-007-136f | 2026-09-07 22:38:39 | review write 命令式写入——task review.json 手拼 JSON 时代终结
状态：已完成
关联变更：（无）
文件：
- src/task-review.js（writeTaskReview）
- src/index.js（review write case+help）
- test/review-write.test.mjs（16 断言）
- .claude/skills/sillyspec-execute/SKILL.md（命令式首选指引）
需求：review write 命令式写入——task review.json 手拼 JSON 时代终结
根因：分析报告 T2-4：task 级 review.json 仍由 agent 手拼 JSON+手算 base/head+手建目录，schemaVersion/锡点/归属切片全是机械活（drafts/adopt 已证明 CLI 可代算），gate 拒后重写循环烧轮次
方案：writeTaskReview 纯函数 + CLI review write 子命令：verdict/notes/evidence 参数给，mechanics 全代算；防误写（已存在拒覆盖）与 fail-fast 指引（缺 evidence/空归属列 diff 候选）；execute skill 指引改命令式首选，手写降兼容路径
结果：review-write 新测试 16 断言全过（happy/拒覆盖+force/evidence/空归属+覆盖/schema 自检）；全量 27+ 套件 362 过 0 失败 + lint 477 文件 0 告警；doc-ref 9 处漂移自动重锚后全绿

## ql-20260907-008-d38c | 2026-09-07 22:48:45 | 完工复查批次——三遗漏修复 + scan 注入丢失意外修复实证
状态：已完成
关联变更：（无）
文件：src/stages/brainstorm-auto.js, src/run/prompt.js, src/task-review.js, test/prompt-injection-gaps.test.mjs, test/review-write.test.mjs, docs/prompt/brainstorm-auto.md, docs/prompt/_extracted.json, docs/sillyspec/file-lifecycle.md
需求：完工复查批次——三遗漏修复 + scan 注入丢失意外修复实证
根因：自查发现：brainstorm-auto 漏改（仍在教 agent cat local.yaml）；LOCAL_COMMANDS 注释声称剔除 unavailable 但实现没做；writeTaskReview 缺跨仓守卫（主仓锡点会被误配跨仓改动）；另实证 scan step1 自 2026-09-05 noAI 后铁律/契约一直静默丢失
方案：auto 档注入行补齐；unavailable 过滤实现（regex 兼容带注释）；跨仓前置拒绝+adopt 指引+死代码清理；scan 恢复实证写入 lifecycle 注记；补 2 测试用例 + brainstorm-auto.md 同步
结果：prompt-injection-gaps 15 断言 + review-write 17 断言全过；全量 362 过 0 失败 + lint 477 文件 0 告警；execute/scan 首渲染实测（noAI 自动执行 + persona/铁律落首可见步）

## ql-20260908-001-102b | 2026-09-08 07:05:09 | auto-driver 收尾三件——残留登记/标记裁决/E2E 实测全过
状态：已完成
关联变更：（无）
文件：docs/sillyspec/troubleshooting.md
需求：auto-driver 收尾三件——残留登记/标记裁决/E2E 实测全过
根因：上变更遗留观察项：归档转换拦截疑似 sync 回放；SS-META 四源公式落地的标记覆盖面待复查；driver 循环未端到端实测
方案：troubleshooting #56 完整登记（症状/排查进展/workaround/裁决）；E2E 走真实 auto 循环两步验证三要素
结果：E2E：零活跃建变更+SS-META 渲染+requiresUser 分叉+双命令同源全过；纯文档+验证零代码改动；npm test 不适用（docs only 规则 8 跳过）

## ql-20260908-002-3a55 | 2026-09-08 07:15:09 | currentStage 残留根因修复——--done 完成路径钉阶段
状态：已完成
关联变更：（无）
文件：src/run/complete.js, src/run/stage.js, test/stage-completion-currentstage.test.mjs, docs/sillyspec/troubleshooting.md
需求：currentStage 残留根因修复——--done 完成路径钉阶段
根因：#56 实证：verify 全 --done 完成后归档报 execute→archive；唯一写点在裸 run 入口，直达完成路径漏写
方案：三处完成持久化点统一 progress.currentStage = stageName（主阶段；complete.js ×2 + stage.js noAI）；辅助阶段不写与入口同语义；#56 根因订正（sync 误诊撤销）
结果：stage-completion-currentstage 4 断言全过（钉阶段/归档放行/辅助不写）；全量 369 过 0 失败 + lint 484 文件 0 告警

## ql-20260908-003-1ec5 | 2026-09-08 07:37:56 | auto 双轨步骤表互踩修复——auto 模式进度不再回 step1
状态：已完成
关联变更：（无）
文件：src/run/command.js, src/run/complete.js, test/auto-dualtrack-brainstorm.test.mjs, docs/sillyspec/platform-interface-map.md
需求：auto 双轨步骤表互踩修复——auto 模式进度不再回 step1
根因：真实需求走 /sillyspec:auto 的 E2E 实证：run auto --done 推进主模式 8 步表而渲染走 auto 4 步表，ensureAutoStage 判非 auto 表重种清零——进度永远回 step1；wait/continue 同踩
方案：ensureAutoStage auto 表早退 + getStageStepsAutoAware（complete 四处）；auto-dualtrack-brainstorm 3 断言锁行为
结果：dualtrack 3 断言全过；全量 370 过 0 失败 + lint 485 文件 0 告警；doc-ref 1 处漂移 --fix 自愈（回执第三次实战）；手工实测 Step 1/4 完成且表保持

## ql-20260908-004-cdac | 2026-09-08 16:18:59 | pre-import 快照写入侧滚动裁剪
状态：已完成
关联变更：（无）
文件：
- src/progress.js（新增 _pruneImportBaks 私有方法 + PRE_IMPORT_BAK_KEEP_DEFAULT/PRE_IMPORT_BAK_RE 常量；import() 内 copyFileSync 落 bak 后接线，try/catch fail-open）
- test/preimport-bak-rotation.test.mjs（新建：25 断言 5 组用例，锁死保留份数/时间序/侧车成对/相邻零误伤/并发护栏/fail-open 契约）
- docs/sillyspec/file-lifecycle.md（.runtime 表格行与 sillyspec.db 流程行两处口径补裁剪语义 + 头部 updated_at 追 2026-09-08 批次）
- docs/sillyspec/file-lifecycle/storage-and-state.md（Runtime 目录树补 pre-import 项 + 新增「pre-import 快照回收」专节，含为何修写入侧而非 GC 命令的取舍）
- .sillyspec/docs/sillyspec/modules/progress.md（关键逻辑新增一条 + updated_at 重锚；CLI 审计按 .sillyspec/ 规则未计入自动文件行，手工补录）
- .sillyspec/docs/sillyspec/modules/progress.changelog.md（变更索引追加 ql 条目；同上手工补录）
需求：pre-import 快照写入侧滚动裁剪
根因：ProgressManager.import() 每次 platform pull 或 resolve --take-platform 都 copyFileSync 一份全库快照 sillyspec.db.pre-import-<ts>.bak 并连带 -wal 侧车，写完从不回收，既无 TTL 也无份数上限；归档只清 runId marker 不管这条路径，init 的 cleanupRuntimeResidue 又是未知默认保留策略，于是按同步次数无限累积——实证 multi-agent-platform 仓 146 份 315MB、sillyspec 本仓 153 份 134MB，占两仓 .runtime 体积绝对大头（相邻 artifacts/stage-reviews/execute-runs/verify-runs 合计仅十几 MB）
方案：src/progress.js 新增 _pruneImportBaks(cwd keepPath) 在 import() 落 bak 后立即滚动裁剪，默认留最新 1 份（PRE_IMPORT_BAK_KEEP_DEFAULT，SILLYSPEC_PREIMPORT_BAK_KEEP 可覆盖、非法值与小于 1 钳回）；排序取文件名内嵌 ISO 时间戳字典序而非 statSync mtime（copy 与同步工具会改写 mtime）；被裁份连 .bak-wal 成对删而存活份侧车保留（缺侧车恢复会丢尾部已提交事务，即 BUG-18 连 wal 备份的原因）；本次 keepPath 显式排除永不裁作并发 import 互删护栏；单份删除失败 continue 不连坐；整体 try/catch fail-open 只 warn 不阻断 import 主流程。刻意修在写入侧而非新增 doctor --gc-runtime，靠人工记得跑 GC 等于没有回收。同步 file-lifecycle.md 两处口径与头部批次、storage-and-state.md 新增 pre-import 快照回收专节、progress 模块卡关键逻辑与 changelog sidecar
结果：新增 test/preimport-bak-rotation.test.mjs 25 断言全绿（默认留 1 份且侧车成对回收并断言存活份侧车保留、KEEP=3 按时间序保留最新几份、相邻文件零误伤含主 .bak 恢复链与 .corrupt-<ts> 救援副本与他者 .bak、非法 KEEP 降级与连续 import 幂等、不存在目录如实抛 ENOENT 而 import 不受影响）；全量 npm test 363 通过 10 失败，10 个失败逐一核验与本次无关——全部零 .import( 引用，单跑 8 个转绿属全量并发 12 互相污染，剩 archive-terminal-consistency 与 local-register 经 git stash 抽掉本次改动后基线同样 exit=1 属既有失败且改动已按 hash 校验完整恢复；npm run lint exit 0（489 文件 src 110 加 test 379，未引用导出 0 项）；止血按同源逻辑清理两仓陈旧快照共 297 份释放约 449MB，各留最新 1 份且主库完好

## ql-20260908-005-7549 | 2026-09-08 16:49:31 | 归档后按 change 精确回收 runtime 取证
状态：已完成
关联变更：（无）
文件：
- src/run/complete-handlers.js（pruneArchivedChangeRuntime + archiveWorktreeCleanup 接线在 worktree 早退前）
- src/change-delete.js（注释同步取证回收）
- test/archive-runtime-prune.test.mjs（32 断言五组契约）
- docs/sillyspec/file-lifecycle.md（.runtime 表与 quick 归档流补回收口径）
- docs/sillyspec/file-lifecycle/storage-and-state.md（新增归档取证回收专节）
- .sillyspec/docs/sillyspec/modules/runtime.md（关键逻辑一条）
- .sillyspec/docs/sillyspec/modules/runtime.changelog.md（ql 索引）
需求：归档后按 change 精确回收 runtime 取证
根因：archiveWorktreeCleanup 原先只清 runId marker，execute-runs/stage-reviews/verify-runs/apply-pathspec 归档后无人回收，按变更数无限累积；复制进 archive/evidence 会双写漂移且几乎不省盘。delta.md 已在归档移动前吃掉 reconcile 与 apply-pathspec
方案：新增 pruneArchivedChangeRuntime，在 marker 清完、worktree 无 meta 早退之前按 change 精确删四类产物：apply-pathspec 文件名全等、execute-runs 仅有戳全等、stage-reviews 按 reviewedFiles 的 changes 首段精确相等防 login 误伤日期前缀长名、verify-runs 仅当目录内 JSON 的 change 字段集合唯一命中。无戳/无字段/混变更 fail-closed 不猜删。不扩 endpoint-baselines 与 contract-artifacts。fail-open 不阻断归档
结果：新增 test/archive-runtime-prune.test.mjs 32 断言全绿（本变更回收/他变更保留、短名不误伤长名、fail-closed 不猜删、相邻权威文件零误伤、无 meta 早退仍回收）；既有 run-complete-step-archive 19/0 与 archive-tail-consistency 9/0 零回归；npm run lint exit 0（490 文件，未引用导出 0）

## ql-20260908-006-5f04 | 2026-09-08 16:59:50 | doctor --gc-unstamped-runs 清已归档无戳 execute-runs
状态：已完成
关联变更：（无）
文件：
- src/doctor-diagnostics.js（gcUnstampedExecuteRuns 交叉核验）
- src/index.js（doctor --gc-unstamped-runs 接线与 usage）
- test/doctor-gc-unstamped-runs.test.mjs（15 断言）
- docs/sillyspec/file-lifecycle.md（doctor 命令与 execute-runs 口径）
- docs/sillyspec/file-lifecycle/storage-and-state.md（存量无戳专节）
- .sillyspec/docs/sillyspec/modules/core-engine.md（doctor-diagnostics 写动作）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（ql 索引）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（doctor 旁路）
- .sillyspec/docs/sillyspec/modules/cli-entry.changelog.md（ql 索引）
- .sillyspec/docs/sillyspec/modules/runtime.md（无戳走 doctor）
- .sillyspec/docs/sillyspec/modules/runtime.changelog.md（交叉指针）
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（并发未跟踪 src 补录以免 lint 拦 --done）
需求：doctor --gc-unstamped-runs 清已归档无戳 execute-runs
根因：pruneArchivedChangeRuntime 故意不按 mtime 猜删无 change 戳的旧 execute-runs，归档热路径不能接启发式；存量只能旁路清扫
方案：doctor 新增 --gc-unstamped-runs（默认 dry-run，--confirm 才删）：reviewedFiles 的 changes 首段精确命中归档目录，或与唯一归档 tasks.md 的 task-NN 集合全等；命中活跃/歧义/有戳/无归属 skip；不进 archive 热路径
结果：新增 test/doctor-gc-unstamped-runs.test.mjs 15 断言全绿；既有 archive-runtime-prune 与 cleanup-ghosts 零回归；npm run lint exit 0（496 文件，未引用导出 0）
审计：⚖️ 归属切分：13 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/quicklog.js, src/run/complete.js, src/run/shared.js, src/run/stage.js, src/stage-review.js, src/stages/quick.js, src/verify-postcheck.js, src/workflow.js, test/doctor-gc-unstamped-runs.test.mjs, src/runtime-hygiene.js, test/quick-feedback-fileline-title.test.mjs, test/runtime-hygiene.test.mjs, test/sync-noise.test.mjs

## ql-20260908-007-0c2f | 2026-09-08 17:36:30 | 工具使用反馈四项改进：①QUICKLOG 文件行纳入模块卡与 changelog sidecar（收尾必改项不再手工补录）；②--req 标题不再截到首个标点…
状态：已完成
关联变更：（无）
文件：src/quicklog.js, src/run/shared.js, src/run/complete-handlers.js, src/run/complete.js, src/run/stage.js, src/stages/quick.js, src/sync.js, src/spec-sync.js, src/sync-noise.js（新建）, src/runtime-hygiene.js（新建）, src/workflow.js, src/doctor-diagnostics.js, src/stage-review.js, src/verify-postcheck.js, test/quick-feedback-fileline-title.test.mjs（新建）, test/sync-noise.test.mjs（新建）, test/runtime-hygiene.test.mjs（新建）, docs/sillyspec/file-lifecycle.md, docs/sillyspec/file-lifecycle/storage-and-state.md, docs/sillyspec/platform-interface-map.md（docs check --fix 重锚）, docs/sillyspec/prompt-control-debt.md（重锚）, docs/sillyspec/review-2026-08-20-full-audit.md（重锚）, .sillyspec/docs/sillyspec/modules/sync.md, .sillyspec/docs/sillyspec/modules/runtime.md, .sillyspec/docs/sillyspec/modules/runtime.changelog.md, .sillyspec/docs/sillyspec/modules/change-management.md, .sillyspec/docs/sillyspec/modules/change-management.changelog.md, .sillyspec/docs/sillyspec/modules/stages.md, .sillyspec/docs/sillyspec/modules/stages.changelog.md, .sillyspec/docs/sillyspec/modules/workflow.md, .sillyspec/docs/sillyspec/modules/core-engine.md, .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
需求：工具使用反馈四项改进：①QUICKLOG 文件行纳入模块卡与 changelog sidecar（收尾必改项不再手工补录）；②--req 标题不再截到首个标点；③平台 sillyhub 未就绪期 [sync]/[spec-sync] 噪音降噪；④.runtime 只写不回收路径系统性排查与回收
根因：① isQuickMetadata 单谓词兼任审计豁免面与文件行记录面，模块卡被整体滤掉；② extractTitleFromResult 旧口径截首标点迫使避开标点写标题；③ 每步自动同步对同一批连接类失败逐条命令重刷（fetchJson 404 warn + follower 集合每轮重算重报，基线快照锚 local-at-last-sync、POST 失败不落盘则永不收敛）；④ pre-import 之外还有一族时间戳命名写后无回收路径（artifacts 534 份/stage-reviews 84/execute-runs 48/verify-runs 31/workflow-runs 21），逐个发现不如系统性覆盖
方案：① run/shared.js 新增 isQuicklogFileLineNoise（记录面），complete-handlers 文件行过滤切换，审计豁免面 isQuickMetadata 不动；② extractTitleFromResult 原样保留标点、超 80 字才就近标点/空格断句，stages/quick.js prompt 口径同步；③ 新建 src/sync-noise.js 跨进程噪音闸（marker 窗口 10min：首报命令完整展示、后续进程静默、成功清闸打恢复行、SILLYSPEC_DEBUG_SYNC 全可见、409/4xx 业务态不走闸、connect health ping noMute、自动 pull 走 autoPull）+ spec-sync isFollowerSetChanged 集合去重 marker；④ 新建 src/runtime-hygiene.js pruneTimestampedEntries 写入侧滚动裁剪，与并行会话 ql-20260908-005/006 定界——变更归属类证据（execute-runs/stage-reviews/verify-runs）走归档精确回收不接 keep-N 启发式，无归属审计类（artifacts keep=100 mtime 序/workflow-runs keep=30/doctor-dumps keep=5）写入侧裁，SILLYSPEC_RUNTIME_KEEP 可覆盖
结果：新增 3 个测试文件全绿（quick-feedback-fileline-title 21 断言/sync-noise 19/runtime-hygiene 12）；全量 npm test 369 过 9 失败——8 个单跑全绿属全量并发 12 互相污染，local-register 经 HEAD 基线 worktree 验证为既有失败；npm run lint 496 文件 0 告警；docs check 经 --fix 重锚 30 处漂移后 0 失效；中途实证修掉自身引入的两处回归（噪音闸吞掉同轮第二条失败行 → 开窗进程感知；构造器 resolvePlatformSpecDir 副作用 warn → bindSyncNoiseFromCwd 零副作用绑定）；另排查中误用 junction+worktree remove 删空 node_modules，npm ci（allow-remote=all）完整恢复

## ql-20260908-008-6d1d | 2026-09-08 18:23:30 | 两轮使用反馈的六个负面项修复：--file-notes 与边界声明口径打架、活文档硬编码行号漂移、backfill --adopt 冲掉 review、平台模式…
状态：已完成
关联变更：（无）
文件：src/worktree.js, src/worktree-apply.js, src/task-review.js, src/verify-postcheck.js, src/docs-check.js, src/run/complete-handlers.js, src/run/gates.js, test/feedback-batch2-hardening.test.mjs（新建）, docs/sillyspec/platform-interface-map.md（docs check --fix 重锚 9 处）, .sillyspec/docs/sillyspec/modules/worktree.md, .sillyspec/docs/sillyspec/modules/worktree.changelog.md, .sillyspec/docs/sillyspec/modules/core-engine.md, .sillyspec/docs/sillyspec/modules/core-engine.changelog.md, .sillyspec/docs/sillyspec/modules/docs-consistency.md, .sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md, .sillyspec/docs/sillyspec/modules/runtime.md, .sillyspec/docs/sillyspec/modules/runtime.changelog.md
需求：两轮使用反馈的六个负面项修复：--file-notes 与边界声明口径打架、活文档硬编码行号漂移、backfill --adopt 冲掉 review、平台模式 apply allowlist 整批 BLOCKED、meta.json BOM 当损坏、target_files 对账字面差假红
根因：① fileNotes 只写 QUICKLOG 文件行不进 guard.allowedFiles，审计按另一口径判「超出+未声明」；② 行号漂移只能人工手跑 docs check --fix；③ adopt 在 allowed_paths 切片空时把 changedFiles 整字段覆写为空集；④ resolveApplyAllowSet/collectReviewDeclaredFiles 硬编码 projectRoot/.sillyspec，平台模式实体在 specRoot（sync.js BUG-01 同族）；⑤ parseJSON 不剥 ﻿，JSON.parse 对 BOM 首字符直接抛；⑥ 对账三类差集用字面 Set.has——声明侧手写大小写/尾部注记/前缀与 git 机器产出名不一致即落②类假红
方案：① complete-handlers quick 收尾把 --file-notes 路径经 mergeQuickBoundaryFiles 并入边界（与 --files 同语义，持久化回 guard.json）；② docs-check 新增 autoReanchorDocRefs（--fix 主链路编程化：fixable 命中→applyFixes→同口径回执），--done 检出失效即自动重锚+落审计行；③ adopt 切片空而原声明非空时保留原 changedFiles 并留 reason；④ allowlist 两函数加 specBase/runtimeRoot 参+平台指针静默回退，四处调用点接线；⑤ parseJSON 剥 BOM；⑥ 差集改 canonical pathKey（normalizeReviewChangedFile+win32/darwin 大小写折叠）
结果：新增 test/feedback-batch2-hardening.test.mjs 29 断言全绿（BOM 解析/adopt 保声明+mechanics 照常重算/allowlist 显式+指针+本地零回归三态/reconcile 归一命中+NEW 照拦/autoReanchor 检出-重锚-回执-幂等/quick E2E 无超出误拦+文件行一致）；全量 npm test 368 过 11 失败——9 个单跑全绿属并发污染、local-register 既有（上批 HEAD 基线已验）、doc-ref 为本批行号漂移经 --fix 自愈 9 处后 PASS；lint 497 文件 0 告警

## ql-20260908-009-c69e | 2026-09-08 21:31:24 | 落盘轮次经济学分析docs+09-05文末互指行
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/round-trip-economics-2026-09-08.md（轮次经济学分析主文）
- docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md（文末互引段）
需求：落盘轮次经济学分析docs+09-05文末互指行
根因：noAI/CLI下沉审计与09-05 IR方案需分工互指防止后来者只见一份；P3a/P3b已动工现状需盘点防brainstorm重复设计
方案：新增docs/sillyspec/round-trip-economics-2026-09-08.md（核心原则/分工表/已动工盘点/裁剪清单/三刀切分/风险防覆盖六节，不含实施设计）；archify-ir-stage-proposal-2026-09-05.md文末追加互引段
结果：纯doc改动测试自动跳过；两文件git diff核对无意外改动

## ql-20260908-010-8f3d | 2026-09-08 21:36:04 | plan --done CLI 自动生成 module-impact 首版（刀②）
状态：已完成
关联变更：（无）
文件：
- src/module-impact.js（sourceFiles/origin 双来源入口）
- src/stages/plan-postcheck.js（check 1e-0 首版生成）
- src/stages/plan.js（审查步 prompt 换 CLI 自动生成口径）
- test/plan-module-impact-autogen.test.mjs（新建 6 用例）
- test/plan-module-impact-sections.test.mjs（断言迁到生成器输出）
- docs/sillyspec/platform-interface-map.md（13 处行号重锚（继承 WIP 漂移））
- docs/prompt/plan.md + _extracted.json（镜像同步）
需求：plan --done CLI 自动生成 module-impact 首版（刀②）
根因：轮次经济学刀②：agent 手写首版是 archive contains_sections 硬拦返工根源（prompt 自认只能从 gate 报错反推格式），文件×模块归属是机械分类应归 CLI
方案：module-impact.js 加 sourceFiles+origin 声明来源入口（design 清单 main 段输入，代码未写无 diff 可取）；plan-postcheck 增 check 1e-0 generatePlanModuleImpactFirstVersion（已存在不覆盖、scale=small/无清单/无 map 降级 skipped 不阻断）；plan.js 审查步 prompt 换 CLI 自动生成口径+兜底说明；顺路修 platform-interface-map.md 13 处过期行号（src/run/shared.js 重构漂移，doc-ref-check 假红）+ docs/prompt 镜像同步 + stages/docs-consistency 模块卡与 sidecar
结果：plan-module-impact-autogen 6 用例全过；plan-module-impact-sections 17 断言全过；verify-probes/doc-ref-check 由红转绿；全量套件仅剩 11 个并行 flaky（单跑全过，非本次引入）；lint 见门禁输出
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/run/command.js, test/platform-temp-residue-heal.test.mjs

## ql-20260908-011-7d26 | 2026-09-08 21:50:08 | temp 残留平台声明治理——写侧守卫与双入口自愈降级
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（isTempResidueSpecRoot 纯函数 + writePlatformPointer 写侧守卫）
- src/progress.js（入口一声明分支 temp 残留自愈降级）
- src/run/command.js（入口二恢复链 temp 残留自愈降级）
- test/platform-temp-residue-heal.test.mjs（六场景（判定矩阵/写侧守卫/双入口自愈/双回归））
需求：temp 残留平台声明治理——写侧守卫与双入口自愈降级
根因：mktemp 临时 specRoot 的平台模式命令在真实项目根三写指针+声明，指针随后被清理，残留声明令双入口 fail-closed 全命令瘫痪；platform disconnect 会连带清 local.yaml platform 段，误伤要保留的平台连接（2026-09-08 multi-agent-platform 工作台「总览不可用」排障实证）
方案：run/shared.js 新增 isTempResidueSpecRoot 纯函数（specRoot 在系统 temp 且 cwd 不在 temp，套件隔离形态不受影响）并接入 writePlatformPointer 写侧守卫；progress.js 入口一与 run/command.js 入口二声明分支按同判定 warn+自动清理声明+按本地模式继续，不动 local.yaml；新增 test/platform-temp-residue-heal.test.mjs 六场景
结果：新测试 24/24、platform-managed-declaration 回归 27/27、lint 499 文件 0 告警、全量 npm test exit 0；真实污染仓库自愈后 progress show --json 正常、daemon sillyspec_status 采集恢复（跨两个采集周期零新增失败）

## ql-20260908-012-31e5 | 2026-09-08 22:00:40 | verify 结论枚举槽化+lint advisory 计数器（刀③）
状态：已完成
关联变更：（无）
文件：
- src/stage-contract.js（槽提取器+统一解析入口）
- src/verify-probes.js（骨架结论槽格式）
- src/verify-postcheck.js（lint 观察期计数器）
- src/stages/verify.js（Step4 纪律槽口径）
- test/verify-conclusion-slot.test.mjs（新建 7 用例）
- test/verify-probes-facts.test.mjs（C2/C3 断言块重写）
- docs/prompt/verify.md（镜像同步：结论纪律槽口径；_extract.mjs 重提）
需求：verify 结论枚举槽化+lint advisory 计数器（刀③）
根因：轮次经济学刀③：结论门靠标题关键词+400字符窗口判定（两次标题措辞劫持历史坑），且实证发现旧骨架占位符 <待填：PASS 或 FAIL> 含 PASS 字样被窗口正则误读成已填 PASS——宣称的 fail-closed 实际失效
方案：stage-contract 增 extractVerifyConclusionSlot（槽行行首锚定优先，占位未填返回空串真 fail-closed；无槽存量文件回退旧窗口扫描+迁移 warning；resolveVerifyConclusion 统一入口消除同输入双扫）；verify-probes 骨架结论改「结论枚举：<待填：三选一>」槽格式；verify.js Step4 纪律同步槽口径；runVerifyLintCheck 内嵌 recordVerifyLintTally 观察期计数（.runtime/verify-lint-tally.json，失败输出附累计 N/M）
结果：verify-conclusion-slot 7 用例全过；verify-probes-facts 150 断言全过（C2/C3 断言块按槽格式重写）；stage-contract/verify-probes/machine-interface/verify 族 9 个套件全绿；test 门禁见输出
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/prompt/verify.md

## ql-20260908-013-3eb1 | 2026-09-08 22:16:54 | quick step1 注入化：项目/约定/模块上下文 CLI 代读（刀①）
状态：已完成
关联变更：（无）
文件：
- src/run/prompt.js（digest 构建+占位符接线+模块注入扩展+readQuickGuardField）
- src/run/stage.js（quickGuard 落盘 taskDescription）
- src/stages/quick.js（step1 操作段注入化）
- test/quick-step1-injection.test.mjs（新建 5 用例）
需求：quick step1 注入化：项目/约定/模块上下文 CLI 代读（刀①）
根因：轮次经济学刀①：quick 是最高频路径，step1 让 agent cat projects/CONVENTIONS/module-map 六类文件再复述任务理解——CLI 已有全部数据（{LOCAL_COMMANDS}/{SCAN_FACTS} 注入先例），纯传话+读全文浪费 token 与轮次
方案：prompt.js 新增 buildQuickContextDigest（projects name/path/status 摘要+CONVENTIONS 开头 1200 字截断）与 {QUICK_CONTEXT_DIGEST} 占位符接线（fail-soft 同三件套）；模块上下文注入从 brainstorm/plan/execute 扩展到 quick 首步，匹配源取 guard.taskDescription（stage.js quickGuard 新落盘启动 --input）；quick.js step1 操作段删 cat 指令改注入消费，保留模糊提问出口+关联变更 design.md+knowledge 按需读；docs/prompt 镜像 _sync 全量对齐；runtime/stages 卡同步
结果：quick-step1-injection 5 用例全过；quick 族 7 个套件全绿（msys/空格分隔/files-resume/input-hint/path-rule/linked-guard/completion）；e2e 冒烟实证：step1 渲染含 runtime 模块上下文段+项目登记+CONVENTIONS 摘要，冒烟会话已 --cancel；test 门禁见输出

## ql-20260908-014-b598 | 2026-09-08 22:18:53 | runtime 阶段注入测试冒烟
状态：已取消
关联变更：quick-33876a4a
文件：（见实际改动）

## ql-20260909-001-05ce | 2026-09-09 04:13:26 | §7 债批五项：doctor 悬空声明/quick 会话过滤/空壳宽限/cancel 字段名/autoReanchor 扩展
状态：已完成
关联变更：（无）
文件：
- src/doctor-diagnostics.js（悬空声明检测）
- src/quick-recommend.js（会话过滤）
- src/run/shared.js（空壳宽限 10min）
- src/run/command.js（cancel 字段名修复）
- src/run/gates.js（verify 收尾 autoReanchor）
- test/quick-recommend-filter.test.mjs（新建 2 用例）
需求：§7 债批五项：doctor 悬空声明/quick 会话过滤/空壳宽限/cancel 字段名/autoReanchor 扩展
根因：轮次经济学 §7 实施期新发现——dogfood 实证的五个小缺陷（含一个真 bug：--cancel 读 .qlId 但 guard 写 .quicklogId 恒 undefined）
方案：①doctor 悬空声明检测：decl.specRoot 不存在 → 点名 disconnect 前置；②quick-recommend 过滤 quick-<hex8> 会话；③空壳探测 10 分钟宽限期；④--cancel 读 quicklogId 字段名修复；⑤autoReanchorDocRefs 挂 verify 收尾（md 来自 diff 三源，覆盖 archive 漂移面）
结果：quick-recommend-filter 2/2；doctor-diagnostics/quick-linked-guard 回归绿；lint 全过；test 门禁实测见输出

## ql-20260909-002-9920 | 2026-09-09 05:41:53 | 修 multi-agent-platform 实证的 verify --done target_files 对账误拦——当前变更声明并真实修改的共享文件被 fo…
状态：已完成
关联变更：（无）
文件：src/foreign-declared.js, test/foreign-own-priority.test.mjs（新建）, docs/sillyspec/platform-interface-map.md（docs check --fix 重锚 5 处）, .sillyspec/docs/sillyspec/modules/core-engine.md, .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
需求：修 multi-agent-platform 实证的 verify --done target_files 对账误拦——当前变更声明并真实修改的共享文件被 foreign 排除剔除后判「声明未做」假红
根因：splitOwnVsForeignDiffFiles 先查 foreignMap 再归 own，文件双方都声明时判 foreign（own 优先缺失）；叠加 collectForeignDeclaredFiles ② 段只看变更目录在不看进度库活性——未归档旧变更的陈旧 design 声明长期占位，其活性又被本变更自己的 dirty 反向喂活。缺陷文档 docs/sillyspec/verify-reconcile-own-file-foreign-false-positive.md（用户仓）三档建议中的 A
方案：splitOwnVsForeignDiffFiles 改 own 优先——新增 loadOwnDeclaredSet（quick 会话 = guard.allowedFiles；变更 = design §6 ∪ task allowed_paths ∪ target_files），own 集内文件永不判 foreign；仅他者声明的在途文件照旧剔除（语义不放松）；own 集读不出时空集退回旧行为。修在切分函数内，verify-postcheck ×2 / verify-probes / contract-matrix 四消费点自动受益
结果：新增 test/foreign-own-priority.test.mjs 10 断言全绿（用户场景端到端复现：双声明文件归 own + reconcile 不再 missing_declared 阻断；own 三源 design/allowed_paths/quick guard 各自生效；无 own 声明退回旧行为零回归）；既有 foreign-declared-stale-liveness / quick-foreign-session-declared / verify-concurrency-fixes 零回归；全量 npm test 389 过 0 失败；lint 508 文件 0 告警；docs check 5 处行号漂移 --fix 自愈后 0 失效
