---
author: qinyi
created_at: 2026-06-04 16:55:00
---

# 未分类知识

> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。

## ql-20260604-001-7a4c | hook 依赖必须显式存在

`src/hooks/worktree-guard.js` 会被测试直接以 ESM 导入。不要在 hook 中引入 `package.json` 未声明的外部包；简单本地配置解析优先使用项目内已有实现或标准库，否则 `npm test` 会在导入阶段失败。

## ql-20260709-001-m1i1 | parseSimpleYaml 缩进判断必须用原始 line 而非 trimmed

`src/sync.js` 的 `parseSimpleYaml` 判断「行是否为缩进子段」时必须用原始 `line.startsWith(' ')`，不能用 `trimmed.startsWith(' ')`——trimmed 已 `.trim()` 去掉前导空格，`startsWith(' ')` 恒为 false，导致所有缩进子段（如 `platform:` 下的 `url`/`token`/`last_connected`）被误判为 root 行，section 恒解析为空 `{}`。后果：`SyncManager._getPlatform()` 返回 `{}`，`sync`/`syncDocuments`/`checkApproval`/`approve`/`reject` 的 `platform.url` 为 undefined，所有平台请求必失败。机器接口 v1 变更（2026-07-09，task-05）修复此 pre-existing bug。建议归类到 known-issues.md 或 patterns.md（配置解析）。

## ql-20260709-002-a7c3 | Windows 下 process.exit 触发 UV_HANDLE_CLOSING assertion 覆盖退出码

CLI 命令用 `process.exit(exitCode)` 强制退出时，若事件循环仍有未关闭的异步 handle（如 ProgressManager 的 sql.js db、dynamic import 残留），Windows 上会触发 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`（src/win/async.c），把正确的 exitCode 覆盖成 127，破坏 daemon 依赖的退出码契约（0/1/2）。解法：用 `process.exitCode = exitCode` + `break`/return 让进程自然排空退出（与 sync.js approve/reject 一致风格）。机器接口 v1 的 gate/derive 路由（src/index.js task-03）踩此坑并修复。建议归类到 known-issues.md（平台特定坑）。

## ql-20260709-003-d5e9 | validateTaskReviews 真实签名是单 opts 解构，非 (changeDir, {gitDir})

`src/task-review.js` 的 `validateTaskReviews(opts)` 是**单个 opts 对象解构** `{ planContent, runtimeRoot, executeRunId, allowCannotVerify=true, changeDir=null, gitDir=null }`，返回 `{ ok, errors, warnings, requiredEvidence }`。task 蓝图/文档常误写为 `validateTaskReviews(changeDir, {gitDir})`。聚合调用（如 gate/derive）需自行组装：planContent 读 `changes/<c>/plan.md`、runtimeRoot = specBase/.runtime（或平台 runtimeRoot）、executeRunId 从 `<runtimeRoot>/current-execute-run-id-<changeName>` 读、gitDir 优先 WorktreeManager.getMeta().worktreePath（校验 mode!=='in-place-fallback'）。现成范式见 `src/run.js:3223-3249` 与 `src/machine-interface.js` runGate/runDerive。建议归类到 patterns.md（task-review 调用范式）。

## ql-20260710-001-f1a2 | progress.quickGuard 在 db 零持久化，quick --done 跨进程收尾失效

`progress.quickGuard`（baseline + linkedChanges + allowedFiles）是 JS 对象，但 `_write`（`src/progress.js`）只持久化 `data.stages` / `data.batchProgress`，**不持久化顶层 quickGuard**。read 也不还原。导致 quick `--done`（独立进程）read 出的 progress 无 quickGuard → completeStep 的收尾块（`auditQuickCompletion` + session 目录清理）`if (progress.quickGuard)` 恒 falsy 不执行 → session 目录残留成僵尸。这是既有架构限制（单文件 quick-guard.json 时代同样失效），非 Bug2 引入。修法：completeStep 改从 session 目录的 guard.json 读 guard 驱动收尾（不依赖 DB progress.quickGuard）。建议归类到 known-issues.md。

## ql-20260710-002-b3c4 | quick 的 --change 被复用为 linkedChanges，非 changeName

`src/run.js:1373` quick 阶段把 `--change` 解析为 `linkedChanges`（关联变更），并把 changeName 清成 null。这与 design 常规假设"`--change` 指定 changeName"在 quick 语义不成立。Bug2 task-02 修复：`--change quick-<uuid8>`（单值匹配 sessionId 正则）识别为 sessionId 作 changeName，多值或非 sessionId 形态仍走 linkedChanges（向后兼容）。写 design/需求时要记得 quick 的 --change 是"关联变更"，不是"指定会话"。

## ql-20260710-003-d5e6 | crypto.randomUUID 全局是 Node 19+，Node 18 需 import

`crypto.randomUUID()` 作为全局是 Node 19+ 才有；Node 18 需 `import { randomUUID } from 'crypto'`。本项目 `engines: node>=18`，故 Bug2 task-01 从 `node:crypto` import（而非用全局）。仍零新增依赖（node 内置模块）。建议归类到 conventions.md（Node 版本兼容）。

## ql-20260711-001-e5f3 | _resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir') 该命令返回相对 .git

`src/worktree.js:153-172` 的 `_resolveMainRepoRoot` 用 `existsSync(commonDir)` 校验 `git rev-parse --git-common-dir` 返回值，但该命令返回**相对路径 `.git`**（非绝对）。`existsSync('.git')` 相对 `process.cwd()`——生产时 cwd=主仓库解析正确；但**测试时 process.cwd=测试运行目录**（如 sillyspec 主仓库根或 test/），worktreeBase 会解析到运行目录的 `.sillyspec/.runtime/worktrees` 而非临时仓库 d。后果：`new WorktreeManager({cwd:d}).getMeta('tc')` 在错误 worktreeBase 找 meta.json → 返回 null → applyWorktree 报"worktree not found: tc"。解法（测试侧，已采）：worktree 测试 `process.chdir(d)` 让解析落在临时仓库；根治（未采）：`_resolveMainRepoRoot` 应 `resolve(this.cwd, commonDir)` 把相对 .git 锚定到 this.cwd。execute-worktree-platform-gaps 变更 task-07（worktree-apply-merge-fallback 测试）踩此坑。**附带发现**：worktree-native-overlay test1 用 `console.assert`（条件假只打印不抛错）+ 无条件 `console.log('✅')`，掩盖了同一问题——实际 `_resolveMainRepoRoot(d)` 在测试环境返回非 d 也显示通过。建议归类到 known-issues.md（测试构造坑）/ patterns.md（worktree-isolation）。

## ql-20260802-002-36ae | spec-dir.test.mjs 全量套件 Windows 罕见进程级崩溃（flaky）

`test/spec-dir.test.mjs` 在全量套件下**罕见**进程级崩溃：run-tests.mjs 报 `spec-dir.test.mjs exited with code N`，但 spec-dir 自身**无内部断言汇总**（断言 ❌ 型失败会有 `✅ 通过:N ❌ 失败:M` 汇总；进程崩溃无）。隔离单跑恒过（38/38）。实证复现率 ~13%（15 次跑 2 次）。**排除的根因**：① execSync 10s timeout——子进程常态 <1s（scan/brainstorm/plan/verify/quick 全测过），全量负载下不会从 <1s 涨到 >10s；② Test 5 不带 --spec-dir 撞 home .sillyspec——Test 5 init 后 projectDir 自带 .sillyspec，scan `--dir projectDir` 命中本地不上溯。**疑似根因**（未稳定抓 stderr 证实）：CLI 子进程罕见非0退出（sillyspec.db 锁 / home 指针 `.sillyspec-platform.json` 竞态 / fs 句柄），`run()` 未 try-catch → spec-dir 进程裸崩。**已采处置**（非根因治愈）：`run()` 加失败诊断（打印 cmd+stderr）+ 1 次重试吸收偶发崩溃 + timeout 10s→30s。**待办**：若未来复现且重试仍失败，错误信息会含 exit code + stderr，届时可定位真因根治。建议归类到 known-issues.md（测试 flaky）。

## task 卡 frontmatter 列表项含半角「冒号+空格」会炸 jsYaml 静默吞掉契约字段
task 卡 frontmatter 的列表标量中出现 `X: `（半角冒号+空格，如「剥 NEW: 前缀」）会让 jsYaml 把该项误判为 mapping entry 抛「bad indentation of a mapping entry」；parseTaskContracts 对解析失败 catch 后返回空 provides/expects_from——表象是 plan-postcheck 报「consumer 期望的字段未被 provider 承诺」，真实根因在 provider 卡的 YAML 非法。规避：frontmatter 列表项内避免半角冒号+空格（用中文冒号、去空格或给整项加单引号）；调试时用 jsYaml.load 单独解析可疑卡的 frontmatter 定位。（来源：2026-09-06-ir-stage-p3a task-03 前置排查，plan Step5 实证拦截）

## plan-postcheck 与 worktree-apply 存在既有依赖边，反向复用 filterDeliverableFiles 会成环
worktree-apply.js:21 已 `import { parseAllowedPaths } from './stages/plan-postcheck.js'`——因此 plan-postcheck 侧不能反向 import worktree-apply 的 filterDeliverableFiles（ESM 循环）。需要在 plan-postcheck 内做「流程产物过滤」时，硬编码同口径清单（.sillyspec/changes|.runtime|quicklog + meta.json，保留 .sillyspec/docs/）并注释锚定来源，不引依赖。同类需求先 grep 双向 import 边再决定复用还是同口径复制。（来源：2026-09-06-ir-stage-p3a task-03）

## JS 正则转义全角括号会静默失配（V8 行为）
在 JS 正则里写 `\）` 或 `\（`（转义全角括号）不报错但永不匹配预期文本——V8 对非 ASCII 字符的冗余转义处理与 ASCII 不同，正则应裸写全角括号 `）`。排查特征：断言「理应命中」的中文文本匹配静默返回 null。（来源：2026-09-07-ir-stage-p3b task-05 E3 组实证）

## 新增写入方不得无中生有建判别器依赖的文件
gates 侧 backfill（verify-facts 回填）曾对无 facts 的存量变更凭空创建 verify-facts.json，而 checkProbeConsistency 存在「有 facts 无探针子节 → error」判别——凭空建文件把相邻判别器对存量变更的 skip 误升 error（e2e run-complete-step-verify 抓出）。规则：给既有判别器生态新增写入方时，必须枚举所有「以文件存在性为输入」的判别器并核对创建语义；底稿类文件的创建应收敛到单一入口（如 verify-probes --init），回填只固化既有文件。（2026-09-08-ir-verify-facts）

## 双维度报同一漂移信号时后加维度须豁免
checkProbeConsistency 增 facts 基线对比维度后，probe6 在 HEAD 前移场景与既有 md 锚点维度重复报同一漂移（一条信号两条告警）。规则：给既有检测新增第二维度时，识别「同一根因产生多路信号」的场景并在后加维度里豁免（HEAD-advance 时 facts 侧 probe6 不报，漂移由 md 锚点维度单报）。（2026-09-08-ir-verify-facts）

## 2026-09-10 平台通道活体发现的两个平台侧缺口（待平台仓修复，sillyspec 侧兜底已就绪）

- **worker 结论不落 artifacts**：mission 77470369（read_only PI worker，13min completed）get_worker_result 返 artifacts:[]，完整审查结论只在 get_run_logs 的 [ASSISTANT] 流。sillyspec 侧行为正确（completed-no-artifact → 人工核对指引兜底，不崩不静默）。平台侧修法：终态时把最终 assistant 消息/结构化段落为 kind=summary artifact。已列平台侧提示词 P0-1。
- **配额池不独立**：本地 agent 子代理与平台 worker（pi-coding-agent）同吃账号级池（429/1308 同锁两边，15:30-18:31 全通道瘫痪实证）——「本地耗尽→平台兜底」价值主张需平台 worker 支持独立 provider/key 才成立。已列平台侧提示词 P0-2。
- 附带实证：平台独立 worker 抓到了归档 task-04.md frontmatter YAML 缩进缺陷（主代理自审与 CLI 门禁均漏过）——独立审查通道有效性的直接证据。
- **存量债（2026-09-10 全量体检）**：归档 task 卡 16 张 frontmatter YAML 严格解析失败（mapping values/缩进类，跨 2026-07-06-execute-deps-gate-deadlock、2026-08-08-progress-db-concurrency、2026-08-15-docs-signals-o12、2026-08-16-scan-diff-command、2026-08-19-reopen-and-execute-batch-guard、2026-09-08-docs-fix-capability、2026-09-08-ir-verify-facts、2026-09-09-plan-derived 共 8 个历史变更）——CLI 自有解析宽容故流程无阻，属归档态化妆品债；触发点是平台独立 worker 用严格 YAML 解析审查时暴露。批量治理候选：写一次性修复脚本（dedent 列表后误缩进的键）+ taskcard 骨架生成时 YAML 校验。
