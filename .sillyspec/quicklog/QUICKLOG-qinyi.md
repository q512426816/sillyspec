
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
