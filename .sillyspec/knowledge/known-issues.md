---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Known Issues

## sqljs-wasm-only

项目使用 `sql.js`（WASM SQLite），不依赖 native SQLite binding。这意味着：
- 无需系统级 SQLite 安装
- WASM 加载有初始开销（首次约 100-200ms）
- 不支持 SQLite 的某些 native 扩展（如 FTS5）

## Sub Package Isolation

`packages/dashboard/` 是独立 Vue 3 子包，使用 Vite 构建。与 CLI 核心松耦合，仅通过共享 `sillyspec.db` 数据库文件交互。不要在 CLI 核心中直接引用 dashboard 子包的模块。

## Hook Import Restriction

`src/hooks/worktree-guard.js` 会被测试直接以 ESM 导入。不要在 hook 中引入 `package.json` 未声明的外部包；简单本地配置解析优先使用项目内已有实现或标准库，否则 `npm test` 会在导入阶段失败。

参见 `uncategorized.md` 中的 ql-20260604-001-7a4c。

## Propose 死代码

`src/stages/propose.js` 的 `definition` 标注 `@deprecated` 且**未在 `stageRegistry` 注册**，文件头注释明确「保留备用」。新增功能不要复用 propose，也不要误判它是活跃阶段（`sillyspec run propose` 不可用）。

## 平台审核占位

`src/sync.js:406`/`:411` 的平台 approve/reject 流程是**占位实现，未真正可用**。接入平台变更审核功能前需先补全这两处。

## 无 Build/Lint 框架

sillyspec 纯源码分发（package.json 无 `build` script，无打包器）。无 eslint/prettier/biome，语法检查靠自定义 `test/check-syntax.mjs`。不要假设 `npm run build` 可用；CI/工具链改造时需注意无标准 lint。

## Worktree Apply 三道坎（多会话归档实战，2026-09-11 cross-change-decision-guard 三连撞）

**现象**：execute worktree 完成后 `sillyspec worktree apply` 连撞三道阻断——①文件清单校验拦「变更文件不在 design 清单也不在 review changedFiles」；②`--merge` 被「未跟踪工作树文件会被合并覆盖」拒绝启动；③合并真冲突留在主仓。

**根因**：① task review.json 的 changedFiles 声明 `.sillyspec/` 路径时被 `collectReviewDeclaredFiles` 交付物过滤器（worktree-apply.js，`.sillyspec/` 前缀不进 allow）排除——声明面与过滤面口径错位，模块文档类交付物两头不靠；② execute 启动时 baseline checkpoint 会把主仓**未跟踪**文件（含崩溃转储等垃圾）快照进分支，apply --merge 要求主仓无同名未跟踪文件；③ 多会话对同一 changelog 追加（同位置各加一行）必然文本冲突。

**护栏**：① 交付物文件写进 design.md §文件变更清单（清单是 apply 的第二真相源）；② apply 前删主仓未跟踪垃圾文件（或 `git clean` 谨慎核对后）；③ changelog 冲突双行保留（双方条目都是有效历史）。

**证据**：49be5c0 归档链（design 补 `_module-map.yaml` 行解①、rm bash.exe.stackdump 解②、runtime.changelog 双行保留解③）；`--skip-overlap` 不跳过「已提交推进」类重叠，只能 --merge。

## ql-ID 双占用（分配竞态，坑 ql-id-double-occupancy）

quick 启动预留的 ql-ID 写入 guard.json 后，QUICKLOG 条目可被并行 git 操作回滚丢失——分配端 scanExisting 看不见已预留的序号/后缀 → 并行会话复用同一 ID（实证 2026-09-13 ql-20260913-007-1351、历史 ql-20260604-001-7a4c 同款）。护栏三层（2026-09-14 修复）：分配时 maxSeq 并入他者活跃会话 guard 预留 + 盘上容错扫描；--done 落最终 ID 前校验——盘上同 ID ≥2 条硬拦（不猜归属），他者 guard 仍预留同 ID 则本会话换新号完成；最终 ID 回写 guard + 条目丢失原 ID 补建自愈。详见 docs/sillyspec/quick-sync-block-filenotes-and-quicklog-mixed-commit.md；回归 test/quicklog-ql-id-race.test.mjs。

## quick 单活跃变更无条件自动关联（坑 quick-single-change-auto-link）

quick 启动未带 --linked-changes 时，库里恰好一个活跃变更会被无条件自动关联（resolveQuickLinkedChanges `return [activeChanges[0]]`，2026-07-02 单用户流假设）——多 agent 仓库里唯一活跃变更常是他者会话遗留：挂载污染 tasks.md，且 --done 僵尸清理通道（closeQuickLinkedChanges）可把他者变更当僵尸误归档。修复（2026-09-14）：单候选也跑双信号打分（脏文件×design 清单 / 任务描述×proposal），score>0 才自动关联+提示+autoLinked 溯源（guard.linkedChangesAuto）；归档闸对仅被自动关联的变更 skip（机器猜测非协作声明不触发破坏性归档）。显式 --linked-changes 关联不受影响。详见 docs/sillyspec/quick-sync-block-filenotes-and-quicklog-mixed-commit.md；回归 test/quick-single-change-auto-link.test.mjs。

## default 空目录物化 + explore --done 拒绝提示缺自身出口（坑 default-empty-dir-materialized / explore-done-change-default-hint，2026-09-14 用户反馈）

**现象**：①辅助阶段（explore 等）不带 --change 启动时进度挂 DB `default` 变更行，但 `initChange` 会顺手物化 `changes/default/` 空目录——next.js 对它报「变更目录为空→清理该空目录」误导、resolveChangeNameAuto 目录计数被搅动、spec 树上行空目录（本仓实证 09-11 建目录零文件）。②多活跃变更库（多 agent 常态）里 `explore --done` 无 --change 被防幻影守卫拒绝，报错 ③ 只提示 brainstorm 新建路径，不提示进度就在 default 行（用户实证要靠 --status 才摸出来）。

**修复（2026-09-14）**：①initChange 对 default 同 quick-<hex8> 系统键待遇停建目录；②目录停建后辅助阶段续跑锚定显式化——resolveAuxiliaryDefaultAffinity（default 行在途本阶段 → 锚回），done-like 守卫加 !progress 前置；③守卫报错补 explore 分支（default 在活跃列表 → 提示 --change default）。另同批修复 explore --done 的墓碑 409 回执刷屏（change_deleted 变更级噪音闸，见 sync 模块卡）。回归 test/default-no-dir-and-affinity.test.mjs + test/sync-change-deleted-noise.test.mjs。

## hook 依赖必须显式存在

`src/hooks/worktree-guard.js` 会被测试直接以 ESM 导入。不要在 hook 中引入 `package.json` 未声明的外部包；简单本地配置解析优先使用项目内已有实现或标准库，否则 `npm test` 会在导入阶段失败。

## parseSimpleYaml 缩进判断必须用原始 line 而非 trimmed

`src/sync.js` 的 `parseSimpleYaml` 判断「行是否为缩进子段」时必须用原始 `line.startsWith(' ')`，不能用 `trimmed.startsWith(' ')`——trimmed 已 `.trim()` 去掉前导空格，`startsWith(' ')` 恒为 false，导致所有缩进子段（如 `platform:` 下的 `url`/`token`/`last_connected`）被误判为 root 行，section 恒解析为空 `{}`。后果：`SyncManager._getPlatform()` 返回 `{}`，`sync`/`syncDocuments`/`checkApproval`/`approve`/`reject` 的 `platform.url` 为 undefined，所有平台请求必失败。机器接口 v1 变更（2026-07-09，task-05）修复此 pre-existing bug。建议归类到 known-issues.md 或 patterns.md（配置解析）。

## Windows 下 process.exit 触发 UV_HANDLE_CLOSING assertion 覆盖退出码

CLI 命令用 `process.exit(exitCode)` 强制退出时，若事件循环仍有未关闭的异步 handle（如 ProgressManager 的 sql.js db、dynamic import 残留），Windows 上会触发 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`（src/win/async.c），把正确的 exitCode 覆盖成 127，破坏 daemon 依赖的退出码契约（0/1/2）。解法：用 `process.exitCode = exitCode` + `break`/return 让进程自然排空退出（与 sync.js approve/reject 一致风格）。机器接口 v1 的 gate/derive 路由（src/index.js task-03）踩此坑并修复。建议归类到 known-issues.md（平台特定坑）。

## progress.quickGuard 在 db 零持久化，quick --done 跨进程收尾失效

`progress.quickGuard`（baseline + linkedChanges + allowedFiles）是 JS 对象，但 `_write`（`src/progress.js`）只持久化 `data.stages` / `data.batchProgress`，**不持久化顶层 quickGuard**。read 也不还原。导致 quick `--done`（独立进程）read 出的 progress 无 quickGuard → completeStep 的收尾块（`auditQuickCompletion` + session 目录清理）`if (progress.quickGuard)` 恒 falsy 不执行 → session 目录残留成僵尸。这是既有架构限制（单文件 quick-guard.json 时代同样失效），非 Bug2 引入。修法：completeStep 改从 session 目录的 guard.json 读 guard 驱动收尾（不依赖 DB progress.quickGuard）。建议归类到 known-issues.md。

## quick 的 --change 被复用为 linkedChanges，非 changeName

`src/run/command.js:616-654` quick 阶段把 `--change` 解析为 `linkedChanges`（关联变更），并把 changeName 清成 null。这与 design 常规假设"`--change` 指定 changeName"在 quick 语义不成立。Bug2 task-02 修复：`--change quick-<uuid8>`（单值匹配 sessionId 正则）识别为 sessionId 作 changeName，多值或非 sessionId 形态仍走 linkedChanges（向后兼容）。写 design/需求时要记得 quick 的 --change 是"关联变更"，不是"指定会话"。

## _resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir') 该命令返回相对 .git

`src/worktree.js:421` 的 `_resolveMainRepoRoot` 用 `existsSync(commonDir)` 校验 `git rev-parse --git-common-dir` 返回值，但该命令返回**相对路径 `.git`**（非绝对）。`existsSync('.git')` 相对 `process.cwd()`——生产时 cwd=主仓库解析正确；但**测试时 process.cwd=测试运行目录**（如 sillyspec 主仓库根或 test/），worktreeBase 会解析到运行目录的 `.sillyspec/.runtime/worktrees` 而非临时仓库 d。后果：`new WorktreeManager({cwd:d}).getMeta('tc')` 在错误 worktreeBase 找 meta.json → 返回 null → applyWorktree 报"worktree not found: tc"。解法（测试侧，已采）：worktree 测试 `process.chdir(d)` 让解析落在临时仓库；根治（未采）：`_resolveMainRepoRoot` 应 `resolve(this.cwd, commonDir)` 把相对 .git 锚定到 this.cwd。execute-worktree-platform-gaps 变更 task-07（worktree-apply-merge-fallback 测试）踩此坑。**附带发现**：worktree-native-overlay test1 用 `console.assert`（条件假只打印不抛错）+ 无条件 `console.log('✅')`，掩盖了同一问题——实际 `_resolveMainRepoRoot(d)` 在测试环境返回非 d 也显示通过。建议归类到 known-issues.md（测试构造坑）/ patterns.md（worktree-isolation）。

## spec-dir.test.mjs 全量套件 Windows 罕见进程级崩溃（flaky）

`test/spec-dir.test.mjs` 在全量套件下**罕见**进程级崩溃：run-tests.mjs 报 `spec-dir.test.mjs exited with code N`，但 spec-dir 自身**无内部断言汇总**（断言 ❌ 型失败会有 `✅ 通过:N ❌ 失败:M` 汇总；进程崩溃无）。隔离单跑恒过（38/38）。实证复现率 ~13%（15 次跑 2 次）。**排除的根因**：① execSync 10s timeout——子进程常态 <1s（scan/brainstorm/plan/verify/quick 全测过），全量负载下不会从 <1s 涨到 >10s；② Test 5 不带 --spec-dir 撞 home .sillyspec——Test 5 init 后 projectDir 自带 .sillyspec，scan `--dir projectDir` 命中本地不上溯。**疑似根因**（未稳定抓 stderr 证实）：CLI 子进程罕见非0退出（sillyspec.db 锁 / home 指针 `.sillyspec-platform.json` 竞态 / fs 句柄），`run()` 未 try-catch → spec-dir 进程裸崩。**已采处置**（非根因治愈）：`run()` 加失败诊断（打印 cmd+stderr）+ 1 次重试吸收偶发崩溃 + timeout 10s→30s。**待办**：若未来复现且重试仍失败，错误信息会含 exit code + stderr，届时可定位真因根治。建议归类到 known-issues.md（测试 flaky）。

## task 卡 frontmatter 列表项含半角「冒号+空格」会炸 jsYaml 静默吞掉契约字段

task 卡 frontmatter 的列表标量中出现 `X: `（半角冒号+空格，如「剥 NEW: 前缀」）会让 jsYaml 把该项误判为 mapping entry 抛「bad indentation of a mapping entry」；parseTaskContracts 对解析失败 catch 后返回空 provides/expects_from——表象是 plan-postcheck 报「consumer 期望的字段未被 provider 承诺」，真实根因在 provider 卡的 YAML 非法。规避：frontmatter 列表项内避免半角冒号+空格（用中文冒号、去空格或给整项加单引号）；调试时用 jsYaml.load 单独解析可疑卡的 frontmatter 定位。（来源：2026-09-06-ir-stage-p3a task-03 前置排查，plan Step5 实证拦截）

## JS 正则转义全角括号会静默失配（V8 行为）

在 JS 正则里写 `\）` 或 `\（`（转义全角括号）不报错但永不匹配预期文本——V8 对非 ASCII 字符的冗余转义处理与 ASCII 不同，正则应裸写全角括号 `）`。排查特征：断言「理应命中」的中文文本匹配静默返回 null。（来源：2026-09-07-ir-stage-p3b task-05 E3 组实证）

## 2026-09-10 平台通道活体发现的两个平台侧缺口（待平台仓修复，sillyspec 侧兜底已就绪）

- **worker 结论不落 artifacts**：mission 77470369（read_only PI worker，13min completed）get_worker_result 返 artifacts:[]，完整审查结论只在 get_run_logs 的 [ASSISTANT] 流。sillyspec 侧行为正确（completed-no-artifact → 人工核对指引兜底，不崩不静默）。平台侧修法：终态时把最终 assistant 消息/结构化段落为 kind=summary artifact。已列平台侧提示词 P0-1。
- **配额池不独立**：本地 agent 子代理与平台 worker（pi-coding-agent）同吃账号级池（429/1308 同锁两边，15:30-18:31 全通道瘫痪实证）——「本地耗尽→平台兜底」价值主张需平台 worker 支持独立 provider/key 才成立。已列平台侧提示词 P0-2。
- 附带实证：平台独立 worker 抓到了归档 task-04.md frontmatter YAML 缩进缺陷（主代理自审与 CLI 门禁均漏过）——独立审查通道有效性的直接证据。
- **存量债（2026-09-10 全量体检）**：归档 task 卡 16 张 frontmatter YAML 严格解析失败（mapping values/缩进类，跨 2026-07-06-execute-deps-gate-deadlock、2026-08-08-progress-db-concurrency、2026-08-15-docs-signals-o12、2026-08-16-scan-diff-command、2026-08-19-reopen-and-execute-batch-guard、2026-09-08-docs-fix-capability、2026-09-08-ir-verify-facts、2026-09-09-plan-derived 共 8 个历史变更）——CLI 自有解析宽容故流程无阻，属归档态化妆品债；触发点是平台独立 worker 用严格 YAML 解析审查时暴露。批量治理候选：写一次性修复脚本（dedent 列表后误缩进的键）+ taskcard 骨架生成时 YAML 校验。

## 2026-09-11 平台侧 artifacts 代报竞态（真变更场景实测暴露，短任务躲过）

- mission c4731a06（真变更 brainstorm 审查，~3 分钟）：worker 终态落库 10:21:11，最终 [ASSISTANT] 消息 10:22:06 才到日志——daemon 终态后代报立即执行，此刻 result 空白被门控③拦 → artifacts:[]。此前 v2/v3 短验证任务（<90s）终消息先于终态到达，恰好躲过竞态——「修复已验证」的结论被长任务推翻。另：终消息 override 标记 uuid（a30cd81a…）与 thinking 段 uuid（699c18e8…）不一致，事件流配对也需平台侧核查。
- 修法建议（平台侧）：代报延迟重试（终态后短窗内轮询 result 非空白再报，或对空白 result 定长重试 N 次）；根治是 worker_done 工具自报通道（结构化提交不受消息时序影响）。
- sillyspec 侧：completed-no-artifact 兜底路径正确触发（记录保留+人工核对指引）；结论可从 get_run_logs 尾部人工捞回。

## bash-heredoc-truncation（2026-09-12 双会话实证）

本机 bash 通道对**长 heredoc**（大段内嵌脚本/文档经 `cat << 'EOF' > file` 落盘）发生静默截断——文件尾部丢失、无报错（pi 会话与本仓会话同款现象）。特征：截断点不稳定、重跑可变。

**规避**：长内容一律改用 **Write 工具直接落盘**（不经 shell 通道，无长度截断面）；bash heredoc 仅用于短段（< 数十行）。需要 bash 执行的脚本先 Write 落 .mjs/.sh 再 `node <file>` 引用，不内嵌。

## execute prompt 指引的 wt-commit 是幽灵命令（runWtCommit 未接线 dispatch）

execute Wave prompt（src/stages/execute.js 调度要求段）指示 agent 用 `sillyspec wt-commit --change <名> -- <文件>` 串行提交，且 index.js:324? 的 worktree-cwd 守卫还专门豁免了 wt-commit 命令名——但 CLI dispatch 根本没有 `case 'wt-commit'`：src/wt-commit.js 的 `runWtCommit` 自 bd1cb91 引入以来无任何调用点（孤儿模块）。实际跑会报「未知命令: wt-commit」并打帮助。规避：主代理作为唯一提交者时，在 worktree 内手工 `git add -- <显式路径> && git commit`（串行无竞态，等价安全）；根治需给 index.js 补 dispatch 接线。（来源：2026-09-14-knowledge-loop-close execute W1，task-01 review notes 记档）

**已根治**（ql-20260914-016-8786，2026-09-14）：index.js 补 wt-commit dispatch case（--change/-m/--pathspec-from-file/-- pathspec 解析 + worktree cwd 推断 changeName）+ help 注册；新增 test/wt-commit-dispatch.test.mjs 5 断言锁三面（接通/参数面/豁免补强——原 worktree-cwd-guard 断言「未知命令也算过」的弱口已收紧为鬼命令回归哨兵）。

## worktree 隔离期跨仓命令锚定错位（guard 无路径感知，待立项）

三仓项目（EHS 形态：主仓 + sub-grid-security/spdemo 兄弟仓）execute 期在 worktree 内跑跨仓测试命令 `cd ../sub-grid-security && npx eslint` 有两重坑：①**锚点错位**——`../` 相对 worktree 根解析到 `.sillyspec/.runtime/worktrees/` 而非主仓侧真实兄弟仓，命令跑错地方或直接失败；②**审批摩擦**——worktree-guard 的 isSingleCommandReadonly 是命令名白名单制（READONLY_COMMANDS + local.yaml worktreeHook.readonlyCommands 扩展），不解析 cd 目标路径、不感知 repos 注册表，`cd` 不在白名单 → 整条复合命令进人工审批。

**修法建议（需完整流程立项，hook 语义变更勿 quick 赶工）**：guard 增加路径感知——复合命令中 `cd ../<name>`/`cd <相对>` 目标 resolve 后命中 local.yaml repos 注册仓根者：a) stderr 留痕提示锚点应为主仓侧真实路径；b) 测试/lint 类命令（npm test/npx eslint/node --test 等）在注册仓内放行+留痕；c) 写类命令维持拦截。同族症状参照：worktree-deps 侧 `../sub-grid-security` 越界误报已在 368c7e2 按 repos 注册根分类修复，guard 侧未动。（来源：2026-09-15 EHS 生产 depsModules 实证 + 2026-09-16 分析定性）

## QUICKLOG 多会话条目交织（提交需手工剥离并行条目，待立项）

QUICKLOG 是多会话共享追加的单文件；某会话提交时 `git add` 整文件会夹带并行会话未完成条目（违反显式 pathspec 隔离纪律），只能"备份 → python 剥离并行条目 → commit pathspec → 恢复"四步舞。实证频次：2026-09-15/16 单个会话 6 次；e97251d（"QUICKLOG 与并行会话条目同文件未暂存，随其会话提交"）、42cef77（"以本变更暂存 blob 提交"）各自处理过同款。根因：单文件追加形态 × git 暂存按文件粒度 = 条目级归属无文件边界。

**修法建议（中等完整流程变更，写入方/读取方/归档方全动）**：QUICKLOG 条目文件化——每 ql-ID 独立 sidecar 文件（`quicklog/entries/<ql-id>.md`），主文件退化为聚合渲染产物（命令重建或追加渲染）；提交按 sidecar 文件收编零剥离。可行性佐证：patches sidecar（`quicklog/patches/<ql>.json/.patch` 范围快照冻结件）已证明 per-ql 文件形态运转正常。注意轮转文件（QUICKLOG-qinyi-<日期>.md）也要一并纳入方案。（来源：2026-09-16 本会话 6 次剥离舞步 + 历史提交注记）
