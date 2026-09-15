---
id: task-01
title: 'Overlay isolation of parallel-session declared files (`_overlayBaseline` triple-pass foreign exclusion + isolation print)'
title_zh: 'overlay 隔离并行会话声明文件（`_overlayBaseline` 三道 foreign 剔除 + 隔离打印）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-15 21:34:09
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - src/worktree.js
  - src/foreign-declared.js
target_files:
  - src/worktree.js
goal: >
  修坑①（execute 双真相）——`_overlayBaseline` 把并行会话显式声明的在途半成品（他 quick 会话
  guard.json allowedFiles / 他变更 design §6，own 优先）固化进 worktree 基线 checkpoint，坏语法
  文件链进 worktree 令测试无法收集。本 task 给 `_overlayBaseline` 接入既有 own/foreign oracle
  （splitOwnVsForeignDiffFiles），staged/unstaged/untracked 三道剔除 foreign 声明文件（worktree
  保留基线 HEAD 版本），隔离清单（文件←归属者）显式打印一行；未声明文件维持现行为，oracle
  失败 fail-open 退现状。
implementation:
  - src/worktree.js 顶部新增 import（splitOwnVsForeignDiffFiles，来自 ./foreign-declared.js）——已核实无循环依赖（foreign-declared.js 仅依赖 fs/path，且 contract-matrix/verify-probes/task-review 等 4 处已有同款 import 先例）
  - _overlayBaseline(mainCwd, worktreePath) 增第三参 changeName = null（src/worktree.js:1906，design 接口定义），JSDoc 同步更新；changeName 为 null/空串时跳过 foreign 切分（零回归面——存量测试直调路径）
  - 函数内一次计算 foreign 集：复用既有 stagedAll/unstagedAll 全量输出（:1922/:1948）加 ls-files --others --exclude-standard 的 untracked 清单，正斜杠归一后经 splitOwnVsForeignDiffFiles(mainCwd, changeName, files) 切分，收集 foreign 条目的 Map（文件→owners[]）；oracle 抛错按其契约返回原集（fail-open，不阻断 create）
  - staged 道（:1921-1944）与 unstaged 道（:1947-1968）：foreign 文件逐个生成 :(exclude)<path> 追加进既有 EXCLUDE_PATHSPEC 所在的 pathspec 数组（git() 数组传参字面安全，与 :(exclude).sillyspec 同机制），--name-only 与 --binary patch 两组调用同步收窄，files 清单只收 own
  - untracked 道（:1974-1987）：逐文件在 copyUntrackedEntry 前查 foreign 集（正斜杠归一比对），命中则跳过复制、不计入 files、不报错
  - 隔离打印：三道完成后统一打印一行（沿既有 🧹 .sillyspec 排除打印风格）——「文件←归属者」去重、截断展示（前 8 个 + 总数）；meta.baselineFiles 与 checkpoint message 只含 own 文件——同源既有链路自动跟随，勿另改 _createBaselineCheckpoint
  - 调用点传 changeName：create step 5.6（:725）与 in-place 路（:868）均在 name 作用域内，分别改为三参调用
  - 新增 NEW:test/worktree-dual-truth-gates.test.mjs（本 task 段）：①他变更 design §6 声明 + 他 quick guard.json allowedFiles 两组——staged/unstaged 形 worktree 内保持基线 HEAD 版本、untracked 形不进 worktree，三者均不进 meta.baselineFiles 与 checkpoint message，输出含「文件←归属者」隔离行；②零回归——无并行声明（foreign=[]）行为与现状一致；③changeName 缺省直调不做切分；④own 优先——双方声明的文件不被剔除
acceptance:
  - 'FR-01 GWT1：主仓有他者声明（他 quick guard.json allowedFiles 或他变更 design §6）且非本变更 own 声明的在途文件，create 后不进 worktree（untracked 形不存在）/worktree 保持基线 HEAD 版本（staged/unstaged 形），meta.baselineFiles 与 baseline checkpoint message 均不含该文件'
  - 'FR-01 GWT1：create 控制台输出隔离打印一行——列 foreign 文件与归属者（去重、截断）'
  - 'FR-01 GWT2：主仓无并行声明（foreign=[]）时 create 行为与现状完全一致（零回归）'
  - 'FR-01 GWT3：_overlayBaseline 不传 changeName 直调时不做 foreign 切分，行为与现状一致'
  - own 优先——本变更 own 声明集（design §6 / task 卡 allowed_paths/target_files / quick guard）命中的文件即使他者也声明，仍照常 overlay（不剔除）
  - oracle 异常 fail-open——splitOwnVsForeignDiffFiles 抛错时退回现状全量 overlay，create 不失败
  - test/baseline-overlay-isolation.test.mjs、test/worktree-overlay-eisdir.test.mjs、test/worktree-merge-baseline-align.test.mjs 与新增测试全绿
verify:
  - '本卡新增用例由 task-06 统一收口（test/worktree-dual-truth-gates.test.mjs 五组）'
  - node --test test/baseline-overlay-isolation.test.mjs test/worktree-overlay-eisdir.test.mjs test/worktree-merge-baseline-align.test.mjs
  - npm test && npm run lint （全量回归零红零告警，task-06 收口后全量跑）
constraints:
  - 勿动 _createBaselineCheckpoint 与 meta 写入链（baselineFiles/checkpoint message 同源自动跟随）；勿动 resolveVerifyChangedFiles；勿动 create step 5.8 deps 供给面（task-03 同文件串行在后，本卡不越界）
  - fail-open 契约——oracle 失败只退回不过滤现状，不得让 create 抛错中断
  - :(exclude) pathspec 只经 git() 数组传参拼装，禁 shell 字符串拼接
  - Windows 口径——与 foreign 集比对前反斜杠→正斜杠归一；diff --name-only 输出的 quotepath 非 ASCII 引号路径先按 unquoteGitPath 口径剥引号再归一比对，pathspec 追加用剥引号后的实际路径（数组传参）
  - Edit 前重读文件最新态（多 agent 并行，R-06）；保持 LF 行尾、frontmatter 闭合
related_tests:
  - test/baseline-overlay-isolation.test.mjs
  - test/worktree-overlay-eisdir.test.mjs
  - test/worktree-merge-baseline-align.test.mjs
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。
     ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
     一句话说明这个 task / 具体步骤 1 / 可验证的验收条件 1 / 边界约束 1）——占位符视同缺字段。
     target_files 格式（可选，对账用精确文件级意图声明，与 allowed_paths 语义不同）：
                    精确文件路径（仓根相对、正斜杠），当前不存在、将由本 task 新建的文件加
                    NEW: 前缀（如 NEW:src/foo.js）；禁 glob（src/**）、禁目录前缀（src/dir/）、
                    禁绝对路径；无明确文件级意图时保留 [] 占位行不动。
     可选字段按需插进上方 frontmatter（规则见 taskcard-rules）：
     repo:          仅跨仓 task 填（local.yaml repos: 注册的仓 key；缺省=main。allowed_paths 相对该仓根写，
                    禁止带仓库名前缀/绝对路径——review 对账按仓根相对路径匹配，带前缀永不命中）
     provides:      仅当本 task 给其他 task 提供接口/DTO/响应时填
     expects_from:  仅当本 task 消费其他 task 的契约时填
     related_tests: 仅当本 task 改动导致既有测试断言失效时填（测试路径须同时进 allowed_paths） -->
