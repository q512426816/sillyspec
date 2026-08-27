---
author: qinyi
created_at: 2026-08-13 10:56:25
---

# SillySpec 工具驾驭 troubleshooting（agent 踩坑参考）

dogfood 实战中反复出现的工具使用坑 + 根因 + 解法。新 agent 接手前扫一遍，避免重蹈。每条都标了根因（不止给解法——知根因才能举一反三）。

---

## 1. Stage Review marker runId 格式（review- 前缀，CLI 自动生成）

**症状**：agent 手写 stage-review marker，runId 格式猜错（填 `exec-` ID 或裸时间戳），被 CLI 忽略、退回目录扫描兜底（不阻断但不整洁）。用户连续两次踩。

**根因**：runId/marker 本就由 CLI 自动生成写入，**agent 不该手算**：
- `src/run/prompt.js` review step 渲染时 `generateStageReviewRunId`（`review-` 前缀）+ 写 marker + echo 完整目录路径（"勿手拼 runId"）。
- 撞 gate 报"缺 review.json"时 `src/run/gates.js` 也自动 generate + 写 marker；`printStageReviewResult`（`src/stage-review.js`）FAILED 时 echo 完整 review.json 路径（含 runId）。

**解法**：
- review step 用 prompt 注入的 `{STAGE_REVIEW_RUN_ID}` + echo 的目录，直接派独立子代理把 review.json 写到该路径。
- 撞 gate 看 gate echo 的路径（含 runId），直接写，**勿手算 runId、勿手写 marker**。
- 卡住用 `sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute>` 一步生成 run 目录 + review.json 骨架 + marker + docHash 自算。
- 关联记忆：`[[sillyspec-execute-stage-review-marker]]`

---

## 2. docHash 漂移（design 改一字就要重算 sha256 + 续审）

**症状**：design.md 改后，stage review.json 的 docHash 对不上，gate 判伪造 fail-closed 阻断。改 PG 镜像那轮重跑了一遍审查。

**根因**：docHash 是 fail-closed 保真机制——review.json 的 `docHash` 必须等于 `reviewedFiles[0]`（主审查文档）当前 sha256。design 改了 sha256 必变，旧 docHash 失效。

**解法**：
- design 改后用 `sillyspec register-stage-review --change <名> --stage <stage>` 重算 docHash + 写 review.json 骨架（自动算 sha256），免手算。
- 或重跑审查子代理（独立上下文）产出新 review.json。
- 这是双刃剑：保真但费时，本质是 design 一致性代价——别为了省事跳过。

---

## 3. 子代理撞主模型 5h 限额（429 中断）

**症状**：opus 子代理（stage review / plan TaskCard）批量并发时撞 5h 限额，429 直接中断没产出。

**根因**：主模型（opus）5h 滚动限额，并发子代理突发消耗触发。

**解法**：子代理降级 `model: sonnet`（足够做 review/TaskCard，避开 opus 限额）。分批 ≤4 并发 + 降并发重试。CLI 层解不了（模型限额）。关联记忆：`[[sillyspec-plan-taskcard-parallel-529]]`

---

## 4. requiresWait 两段式（--wait/--continue + AskUserQuestion）

**症状**：requiresWait 步骤的 --wait/--continue 两段式 + AskUserQuestion 协调繁琐，容易绕错。

**根因**：wait 是用户决策点机制——步骤 `--wait` 暂停等用户决策，用户 AskUserQuestion 收集决策后，`--continue --answer` 中继恢复推进。

**解法**：`--wait` 暂停后用 AskUserQuestion 收用户决策，再 `sillyspec run <stage> --continue --answer "<决策>" --change <id>` 恢复。`--answer` 是中继（把 AskUserQuestion 答案喂回 CLI），不是绕过 wait。

---

## 5. _module-map.yaml schema_version=1 警告刷屏（已止血，根因待修）

**症状**：`_module-map.yaml schema_version=1（期望 2）` 警告每步渲染 prompt 刷屏。

**根因（双源）**：
- **生成端**：scan prompt 模板（`src/stages/scan.js:284/316`）仍写 `schema_version: 1`（旧），而 `modules rebuild`（`src/modules.js:121`）已写 v2。新 scan 永远产 v1。
- **读端**：`src/run/prompt.js loadModuleContextIndex` 对 `sv[1] !== '2'` 每步 warn（无去重 → 刷屏）。但读端 `buildModuleContextInjection` 已 v1/v2 双兼容（`data.paths || data.core_files`），v1 解析正常，warn 是过激噪声。

**解法（已止血 2026-08-13）**：读端 v1 warn 已去掉（`prompt.js loadModuleContextIndex`），仅缺 schema_version（真 malformed）才 warn。v1 不再刷屏。

**根因待修（建议单独 quick）**：scan prompt 模板升 v2——`scan.js` 的 `schema_version: 1` → `2` + 字段块对齐 modules.js 的 v2 字段集输出（`core_files/role/risk_level/verify_commands/related_docs`，见 src/modules.js 输出段）（`role/core_files/test_files/risk_level/verify_commands/related_docs` + 保留 `paths/depends_on/used_by/needs_review/review_reasons`）。改后新 scan 产 v2，与 modules rebuild 两个 writer 一致。注意改 scan.js prompt 要同步 `docs/prompt/scan.md`（规则19 提示词文档同步）。

---

## 6. QUICKLOG 轮转归档（提交时带上）

**症状**：QUICKLOG-<user>.md 超 500 行自动轮转出 QUICKLOG-<user>-<日期>.md（git 跟踪新文件），--done 静默生成，提交时容易漏（旧 ql 条目只在本地）。

**解法（已修 2026-08-13）**：`quicklog.js rotateIfNeeded` 轮转后 echo "已轮转 <user>.md → <archive>.md（提交时带上归档）"。提交 quick 时 pathspec 含轮转归档文件。关联记忆：`[[sillyspec-quicklog-is-tracked]]`

---

## 7. home 下长出平行 .sillyspec（读路径建库 + 向上解析无守卫，已根治）

**症状**：`~/.sillyspec/` 莫名出现整套进度库（sillyspec.db + 430+ quick change + quicklog），且持续被更新。

**根因（两层叠加）**：
- **读路径建库**：`ProgressManager._ensureDB` 在 db 不存在时 `db.init()` 建库落盘，除 gate/derive（machine-interface.js 只读契约守卫）外，`progress show`/`status`/quick 守卫等命令读到哪建到哪。
- **向上解析撞 home**：smoke 测试在 home 下临时目录跑 CLI 种下 `~/.sillyspec` 后，任何 home 子目录跑命令，`resolveSpecDir` 向上查找都会命中它——污染自我延续。

**解法（已修 2026-08-15）**：
- `resolveSpecDir`（`src/run/shared.js`）加 home 拒绝守卫：向上遍历时跳过 `os.homedir()` 一层，home 下 `.sillyspec` 恒不命中，回退 `cwd/.sillyspec`。
- 双源收敛：progress.js 里的同名拷贝删除，re-export run/shared.js 单一真相源。
- 存量清理：`~/.sillyspec` 整目录备份后删除（备份在 `~/.sillyspec-backup-20260815/`）。
- 测试：`test/spec-dir-home-guard.test.mjs`（8 断言，含 e2e：home 存在 .sillyspec 时子目录跑 CLI 不写 home 库）。
- 关联记忆：`[[sillyspec-cwd-correction-home-collision]]`

---

## 8. `run quick --help` 误开会话（--help 被静默吞，已修）

**症状**：`sillyspec run quick --help` 查询帮助却误开 quick 会话：新增 quick-sessions 目录 + QUICKLOG 骨架条目；`-h` 更是被当未知参数 exit 2。

**根因**：`--help` 在 runCommand 的 knownFlags 白名单里但**没有任何短路逻辑**，被静默吞掉后继续走 cwd 纠正 → 会话创建 → QUICKLOG 落盘。查询意图产生了写副作用。

**解法（已修 2026-08-15）**：runCommand 在 flag 校验通过后、任何副作用之前检测 `--help/-h` 短路，打印 stage 用法帮助（printStageUsage）退出 0；`-h` 补进 knownFlags。未知 flag 校验不变（`--halp` 仍 exit 2）。测试：`test/run-help-shortcircuit.test.mjs`（15 断言，含副作用零容忍：不增会话/不增 ql 条目）。

---

## 9. quick --done 审计把并行会话的删除算成本会话（双重误判，2026-08-16 实证）

**症状**：`run quick --done` 被 BLOCKED，报「危险文件变更 + 删除文件 + 本次改动文档含 1 处失效引用」——三项全因同一个非本会话文件：`.sillyspec/plans/2026-04-05-dashboard.md` 的删除暂存（并行/历史残留操作留下的）。

**根因**：审计 changedFiles 读 `git status` 全量。他人删除的 `.md` 文件被收进本会话 mdChanged，文件已不在盘 → docsCheckHint 记「文档不存在」1 处失效——**假失效**：逐文件复算（排除该删除后）真失效 0 处。这是「quick 并发批危险前缀误判」的变体：不只 DANGEROUS_PATTERNS 前缀误判，删除的 .md 还会经 docsCheckHint 链产生第二重假信号。

**处置（当次绕行）**：确认删除合法（plans 目录 3871a9a 已整体移除、HEAD 里该文件确实待删）后 `git restore <file>` 恢复文件消除工作区脏 → --done 通过 → 提交后再重新表达删除意图（让删除走它自己的会话/流程）。**勿用 `--allow-delete` 解锁**——那会把他人删除夹带进本 quick 的 QUICKLOG 归属。

**改进方向（已修，ql-20260816-007-0558 / 6d15d9a）**：mdChanged 排除 deletedFiles——删除的 .md 不进 docsCheckHint，删除语义归 --allow-delete 管；测试 DC-5 锁定（audit-quick-completion.test.mjs）。

**关联记忆**：`[[sillyspec-quick-concurrent-dangerous-prefix]]`

---

## 10. 并发状态分裂三坑（execute run 目录静默缺失 / apply --merge baseline 冲突 / 活文档引用漂移，2026-08-16 闭环）

**症状（三坑各自反复出现）**：
1. execute 启动后 marker `current-execute-run-id-<change>` 已写但 `execute-runs/<runId>/tasks/` 目录不存在（exec-182944 / exec-211357 两度实证）——目录只随 review.json 写入创建；archive 完成度扫描兜底误用上个变更的空 run，review 错配。
2. `worktree apply --merge` 撞并行会话：baseline checkpoint 含主仓旧文件，merge 到已推进的 main 时整文件冲突，需手动 cp/hunk 拆救。
3. 并行会话每次改 command.js/index.js，platform-interface-map.md 的 file:line 引用漂移失效（一次 12 处）——「谁污染谁治理」在并发下无人执行。

**根因**：1) marker 写入与目录创建非原子且失败静默（`try{...}catch{}`）；2) baseline 与 main 各自前进，merge 前无预对齐；3) 活文档无自动化提示，漂移只能事后 docs check 发现。

**修复（change 2026-08-16-state-split-fixes，D-001/D-002@v1）**：
1. 四处 marker 写入点（stage.js 主点 + gates.js/prompt.js/task-review.js 补写点）统一「mkdir `execute-runs/<runId>/tasks` 先于 marker」+ 分层 fail（stage throw / gates fail-closed / prompt 降级留痕 / task-review 去静默保 fail-open）。测试 execute-run-dir-fail-loud.test.mjs 33 断言。
2. `applyByMerge` merge 前预对齐：`git diff baseHash..baselineCommit` 已提交口径 ∩ main 已推进 ∖ 分支已变更 ∖ 工作区 dirty → checkout main 版 + commit「sillyspec: align baseline files to main (pre-merge, N files)」；失败降级原 merge 路径。测试 worktree-merge-baseline-align.test.mjs。
3. quick 审计 docsCheckHint 扩展 `livingDocDrift`：改动活文档（缺省 platform-interface-map.md，`local.yaml docs-check.living-docs` 可追加不覆盖）引用的源码文件时即时提示漂移风险（advisory 不阻断）。测试 docs-living-drift-hint.test.mjs。**〔2026-08-18 精度对齐，ql-20260818-009-9443〕**原「被引用即提示」路径级口径在行号锚未真断时误报（实测 advisory 报漂移、docs check 417/417 全过）；升级为复用 `runDocsCheck` 分层真校验（存在 + 行界 + 关键词窗口），只报「真失效且指向本次改动文件」的引用（`drift.invalid` 逐条带 doc:line/ref/reason），全过零输出——与 docs check 结论同源。`matchLivingDocRefs` 降为预过滤（无引用命中跳过整档校验）。

**关联记忆**：`[[sillyspec-execute-done-auto-draft-pitfall]]`、`[[sillyspec-worktree-patch-apply-conflict]]`、`[[sillyspec-local-yaml-paths-override-semantics]]`

---

## 11. archive module-impact 检查失败打印裸 [object Object]（2026-08-19 实证）

**症状**：`run archive --done`（extract-module-impact 步）输出 `❌ module-impact.md 检查失败 └─ [object Object]`，错误内容完全不可读，只能去读 `.sillyspec/.runtime/workflow-runs/<ts>-archive-impact-<project>-fail.json` 才知道真实原因（本次是 contains_sections 章节名不匹配）。

**根因**：archive-impact workflow 的检查结果渲染路径把 checks 数组里的 fail 对象直接字符串化（`detail` 有值但外层对象未展开），`String(errorObj)` 得 `[object Object]`。

**解法（agent 侧）**：见裸 `[object Object]` 直接读同目录 workflow-runs 的 fail.json，`checks[].type/detail` 有完整失败原因；修完后重跑 `--done` 即可（步骤状态仍会推进，fail 只留痕不阻断状态机，但归档产物要干净就别留）。

**〔2026-08-19 已修 ql-20260819-006-d2d7〕**：渲染改为 `f.message ?? JSON.stringify(f)`（complete-handlers.js，message 是 failures 条目的人类可读 detail）；回归测试 test/archive-impact-failure-readable.test.mjs（章节缺失 → 明细含「缺少章节」无 `[object Object]`；合规 → 通过）。

## 12. plan 生成 module-impact 章节名与 archive-impact 契约不同源（2026-08-19 实证）

**症状**：plan 阶段生成的 module-impact.md 首版用「## 影响矩阵」「## 更新结果」章节名，verify 的 advisory 核对也接受；到 archive 的 extract-module-impact 步被 contains_sections 硬拦——期望「## 模块影响矩阵」「## 未匹配文件」。同一文档两套期望，agent 先过 verify 再被 archive 拦，返工重排章节。

**根因**：plan 模板与 `archive-impact.yaml` 的 contains_sections 期望各自维护，无单一事实源；verify 的核对只看语义不看章节名（更宽容），archive 是机械校验（更严格），严格侧契约没有回灌到生成侧。

**解法（agent 侧）**：写 module-impact.md 直接用 archive 契约的章节名（`## 模块影响矩阵` + `## 未匹配文件`），「## 更新结果」表可以共存（archive 只查存在性，不查多余章节）。

**〔2026-08-19 已修 ql-20260819-007-d4f0〕**：plan 审查计划步 prompt 章节标题逐字钉死（「## 模块影响矩阵」「## 未匹配文件」，附变体警告）；新增三方同源回归测试 test/plan-module-impact-sections.test.mjs——解析 templates/workflows/archive-impact.yaml 的 contains_sections，断言 plan prompt + archive 降级补写 prompt 均含期望章节名 + 分发模板与 dogfood 活副本逐字节一致，任一侧漂移即测试失败。

**关联记忆**：`[[sillyspec-doc-consistency-debt]]`（ enforcement 全在 design↔代码、模板漂移同类债）

## 13. 工具驾驭三坑：review.json 手工回填 / --answer 提示滞后 / base_ts 冲突再现（2026-08-19 闭环）

**症状（用户实测三条）**：
1. worktree cleanup 后 7 个已实现 task 的 review.json 报缺失，被迫手工回填——实际是 marker 链断裂后完成度扫描错拿了别的 run（或空 run），真实 review 一直都在。
2. archive step3（requiresWait）标 `--wait` 后习惯性 `--done`，报错此刻才知道要 `--answer`；且旧逻辑普通 `--done` 会静默跳过 waiting 步骤推进后续步骤。
3. 平台同步 base_ts 冲突反复出现：同机多进程（CLI+daemon）并发 push 互相撞 409 落冲突文件；resolve --keep-local 后忘了手动 push，期间他人再推 → 又 409 的循环。

**根因**：
1. run 目录 `execute-runs/<runId>/` 不带变更身份，change→run 唯一链接是 `current-execute-run-id-<change>` marker；cleanup/归档清理/并行误删后链断，fallback 盲取 mtime 最新 → 跨变更错配。且 cannot_verify 自动草稿与真实 pass 混在「已通过」里不可见，掩盖「未真正复核」。
2. `completeStep` 的 currentIdx 选择排除 waiting，普通 `--done` 无守卫；wait/waiting 相关提示散落在撞错后的报错里，未前置到标记/暂停时刻。
3. push 成功后的 base_ts 回填写在本机共享 DB；并发 B 进程持旧 base_ts 撞 A 刚推完的 409，一律落冲突文件等人工 resolve——赢者其实是自己人。keep-local 推进 base_ts 后停在「请手动 push」，忘推即复发。

**修复（2026-08-19，change 三处根治）**：
1. **change 归属戳**：marker 三个写入点（stage.js 主点 + gates.js/task-review.js 补写点）同步写 `execute-runs/<runId>/change` 戳；`resolveExecuteRunForChange`（task-review.js）marker→戳→覆盖度启发三级归属，archive 完成度报告不再错配；无法归属时报告明示「定位失败」而非「review 全缺」。cannot_verify 草稿在完成度报告单列计数，archive step1 判定规则要求先兑现 verify requiredEvidence 再放行。测试 execute-run-change-stamp.test.mjs（20 断言）。
2. **--answer 前置**：waiting 未解时普通 `--done` fail-closed 拒绝（`--done --answer` 坑1 路径不受影响），报错直接给两条出路；`--wait` 标记时刻即打印 requiresWait 语义（`--continue --answer` 后回待执行、仍需 `--done` 收尾 / `--done --answer` 一步完成）；「阶段暂停」消息附恢复命令；`_getNextSuggestion` 对 waiting 阶段建议 `--continue --answer`。测试 run-wait-frontload.test.mjs（13 断言）。
3. **base_ts 自愈**：push 409 先 fresh 重读 DB base_ts，已 ≥ 平台回执 ts（本机并发已回填）→ 刷新重试一次自愈、不落冲突文件；外来推送不满足条件自然走原冲突路径（fail-closed）。resolve --keep-local 后自动重推本地闭环，重推被拒时软提示不落新文件（保持「keep-local 清冲突文件」生命周期契约，下次常规 sync 按新 base 重新判定）；成功回填的 base_ts 写入加重试（共享 SQLite WAL 并发窗口）。测试 platform-sync-self-heal.test.mjs（15 断言）。

**关联记忆**：`[[sillyspec-worktree-cleanup-marker-chain]]`、`[[sillyspec-platform-sync-base-ts-silent-conflict]]`

## 14. quick 末步四字段模板展示滞后（2026-08-20 已修）

**症状**：quick step3 `--done` 的 `--output` 四字段（需求/根因/方案/结果）结构校验第一次拦截 agent 时才见到可照抄模板——模板其实写在 step3 prompt 中段，但 step3 prompt 很长（task-08 同因：长 prompt 易被 tail 截断/被忽略），agent 直接 `--done` 就撞拦截，白费一轮往返。

**根因**：硬校验的契约模板只存在于两处滞后位置——step3 长 prompt（渲染时易被淹没）与拦截报错（已撞墙）。推进到末步的转换时刻（step2 `--done` 输出尾部）没有短块预告。

**解法（已修）**：`completeStep` 单步推进路径（complete.js printNext 块尾、task-08 锚定行之后）：`stageName === 'quick'` 且 `nextPendingIdx` 是末步时，输出 📌 预告块——四字段模板逐行 + 可照抄完整命令（含 `--change`）+ 「缺任一项被拒、补全重跑不丢进度」+ 可选 `--file-notes` 提示。非末步推进不出预告；拦截路径保留兜底。测试 quick-laststep-fourfields-preview.test.mjs（14 断言）。

## 15. 三坑：install 白名单拒 monorepo 链式 / doctor --fix 误删活跃分支 / verify-postcheck CRLF（2026-08-20 闭环）

**症状（三坑各自实证）**：
1. monorepo 的 `commands.install: "cd web && pnpm install"` 类链式命令被「包管理器前缀白名单 + shell 元字符门」整条拒绝（`&&` 是元字符）→ depsStatus=failed → execute deps 门控卡死，改单命令对需要 post-install build 的 monorepo 不可行（无自愈路径）。
2. 全局 `worktree doctor --fix` 误删并行会话活跃分支：第5步孤儿分支判定只看本地 meta 目录注册表，与变更活跃态权威注册表（进度库 changes 表）数据源不一致——并行会话的变更（meta 已清 / in-place / 平台模式 meta 在别处）分支被当孤儿删掉。
3. Windows 仓 local.yaml 为 CRLF 时，verify-postcheck 手写行扫描器的逐行正则（`.` 不匹配 `\r`、`$` 要求真串尾）失配：`extractModules` 恒返回 null（modules 映射失效 → test_strategy:module 永远回退全量 → 600s 默认超时必炸，verify 从未真正跑过 module 子集）；`extractKnownFailures` 块式只捕获第一条豁免。

**根因**：
1. 白名单/元字符门按「整条命令」判定，未考虑 `&&` 链式与 `cd <子目录>` 段——安全目标（不经 shell 执行白名单包管理器命令）与命令形态（链式）被耦合在同一正则里。
2. 判定数据源单一（meta 注册表），未交叉核对进度库活跃变更；「无 meta」≠「无人在用」。
3. 手写 yaml 行扫描器假设 LF；Windows 编辑器/工具写出的 CRLF 让 `$` 锚定正则整条失配，且失败方式是静默降级（null → 回退全量）而非报错。

**修复（2026-08-20）**：
1. `tryInstall`（worktree-deps.js）按 `&&` 拆段逐段校验执行：每段独立过白名单 + 元字符门（拆分后残余单 `&`/`|`/`;` 仍被拦）、段内允许 `cd <相对子路径>`（resolve 后必须在 worktree 根内防越界）、argv 数组执行不经 shell、任一段失败即停（&& 语义）；`||`/管道/`;`/空段仍拒。白名单先于元字符的判定顺序保留（`curl|sh` 报非白名单）。测试 worktree-install-chain.test.mjs（9 断言）。
2. `doctor()` 改 async，删分支前交叉核对进度库活跃变更（先探 DB 文件存在再实例化，避免坑7 读路径建库）：分支名 ∈ 活跃变更 → 报 active-branch（fixable:false）保留 + 人工确认指引；进度库读失败 → 保守不自动删；无库/非活跃 → 原孤儿删除行为零回归（git-only 工作流不受影响）。测试 worktree-doctor-active-branch.test.mjs（11 断言）。
3. `normalizeLineEndings`（verify-postcheck.js）在 `extractModules`/`extractKnownFailures` 解析入口归一 `\r\n`/`\r` → `\n`；modules.js `showModuleStatus` 的行拆分同步改 `split(/\r?\n/)`。测试 verify-postcheck-crlf.test.mjs（12 断言，CRLF/LF/CR 三态输出一致 + module-subset 链路恢复）。

**关联记忆**：`[[sillyspec-worktree-install-whitelist-monorepo-chain]]`、`[[sillyspec-doctor-fix-orphan-branch-parallel-active]]`、`[[sillyspec-verify-modules-crlf-blanket-fallback]]`

## 16. 四坑：execute 步骤表漂移 / doctor align 绕过 review 门 / modules 引号值转义 / taskcard 反引号（2026-08-20 闭环）

**症状（用户实测，详见产品仓 docs/sillyspec/2026-08-20-execute-step-table-drift-and-gate-bypass.md）**：
1. plan.md 中途改 Wave 数后 execute 步骤表漂移——17/12 步数交替报错但仍可推进（门控/prompt 施加到错误步骤）。
2. worktree 清理后用 `doctor --align-execute-progress --confirm` 恢复，execute 的 Stage Review Gate 与 Task Review Gate 被整体绕过（本次靠 15 份 task review + verify 全程补足覆盖）。
3. local.yaml modules 块解析间歇失败回退全量（12 分钟 vs 应有 2 分钟，且引发一次超时误判；与坑 15-③ CRLF 同根因，另发现次生坑：引号值转义）。
4. CLI 生成的任务卡 title 带反引号（`` ` `` 是 YAML 保留指示符）炸 frontmatter 解析，契约字段静默丢失（plan postcheck 兜住）。

**根因**：
1. execute 步骤由 plan.md 动态构建，DB 快照启动时播种；入口 `ensureStageSteps` 有按名重播种但**完全静默**，且同一命令进程内 plan 再变时 completeStep 的 def 与 DB 错位无守卫。
2. `alignExecuteToPlan`（progress.js）显式「绕过 completeStep 推导」直写 completed，只查 checkbox 全勾 + 零变更核验，review 审计零覆盖——而 worktree 清理后的恢复场景恰是最需要审计的时刻。
3. CRLF 主因坑 15-③ 已修；次生坑：`extractModules` 的 `parseFlowValue` 剥外层引号后不解开内层 `\"` 转义——modules 的 test 命令常含嵌套引号（`node -e "…"`），解析结果残留字面反斜杠命令直接坏。
4. `buildTaskcardSkeleton`（taskcard.js）title/title_zh/author 裸插值进 frontmatter，自由文本无 YAML 安全序列化。

**修复（2026-08-20）**：
1. `ensureStageSteps` 漂移重播种显式化（⚠️ 告警含 旧→新 步数 + 按名保留说明）；`completeStep` 新增 def↔DB 步数一致性守卫——错位即 fail-closed 中止本次 --done（防错位门控/推进），重跑自愈（入口重播种）。测试 execute-step-drift-guard.test.mjs（14 断言）。
2. 新增 `enforceAlignExecuteReviewGate`（gates.js）：doctor align 的 --confirm 落盘前跑同源只读校验——Stage Review（tier=independent 须有有效 execute stage review，tier=self 放行）+ Task Review（review.json 齐备且 verdict 非 fail；runId 只读解析不 generate）；任一不过拒绝 align 并给 register-stage-review/补 review 指引；dry-run 不拦（保持只读）。测试 align-execute-review-gate.test.mjs（12 断言）。
3. `parseFlowValue`（verify-postcheck.js）双引号值剥壳后解 `\"`/`\\` 转义、单引号值解 `''`；e2e 测试 verify-crlf-module-subset-e2e.test.mjs 用 CRLF 配置 + 嵌套引号模块命令证明真跑 module 子集（marker 落盘、全量与未命中模块均未执行）。
4. `yamlScalar`（taskcard.js）对 title/title_zh/author 统一单引号包裹 + `'` 双写转义；测试 taskcard-yaml-escape.test.mjs（20 断言，js-yaml round-trip + 契约 9 字段不丢 + e2e）。

**关联记忆**：`[[sillyspec-execute-step-table-drift]]`、`[[sillyspec-doctor-align-bypass-review-gate]]`、`[[sillyspec-taskcard-title-backtick-yaml]]`

## 17. 三坑：ruff format × CRLF stash 死循环 / docHash 手工联动 / task review 草稿漏 task（2026-08-21 闭环）

**症状（用户实测）**：
1. pre-commit 的 ruff format 在 Windows CRLF 仓与 hook 的 stash 机制死循环：hook stash 工作区 → format 产生行尾 diff → 恢复 stash 后工作区又脏 → 下一轮提交再触发，需手动预跑 `ruff format` 落定格式再提交。
2. 改一版 design 后，brainstorm/execute（都锚 design.md）+ plan 的 stage review docHash 要手工重算 2-3 次，容易漏——Stage Review Gate 报「docHash 不匹配」才补。
3. CLI 自动补写的 task review 草稿漏个别 task（task-08/task-10 两次都缺），--done 撞 Task Review Gate 后只能从零手写 review.json。

**根因**：
1. ruff format 对 CRLF 文件统一改写行尾，hook 的 stash/restore 循环里格式化产物与工作区互相制造 diff（工具组合行为，CLI 侧无 hook 管理面——落点为 workaround 文档化）。
2. docHash 重算是纯机械劳动（sha256 一次 hash），但 register-stage-review 单次只处理一个 stage，改版联动要跑 2-3 次命令；且刷新已有 review 的 hash 无专用模式（只能重生成骨架丢结论，或手改 JSON）。
3. generateTaskReviewDrafts 对「allowed_paths 未命中 diff」的 task 静默跳过（skipped++）——task-08/task-10 的改动与他人同文件/路径不匹配时归属为空，草稿缺席。跳过的本意是防空 diff 伪造，但 emptyDiff 伪造判定看的是真实 git diff 而非 review.changedFiles，空归属草稿并不触发它。

**修复/处置（2026-08-21）**：
1. （workaround 文档化）Windows CRLF 仓 + ruff format pre-commit：提交前先手动 `ruff format .` 落定格式（或给 hook 配行尾容忍：`ruff format --line-ending=auto` / pyproject `[tool.ruff] line-ending = "auto"`，或 pre-commit 加 `--skip` stash 的 hook 顺序调整）。死循环机理：hook stash 工作区 → format 重写行尾 → restore 后 stash pop 冲突/再脏 → 下轮再 format。落定一次后后续提交稳定。
2. register-stage-review 新增 `--refresh-hash`（就地刷新既有 review 的 docHash：保留 verdict/checklist/requiredEvidence，reviewerNotes 追加刷新记录提示人工确认结论续用；不换 run 目录不重定向 marker）与 `--all`（一条命令处理 brainstorm/plan/execute：有 review 刷 hash、无 review 生成骨架）。改版 design 后一条 `register-stage-review --change <名> --all` 完成全部联动。测试 register-stage-review-refresh.test.mjs（18 断言）。
3. generateTaskReviewDrafts 改全量对账：空归属 task 也生成「无归属草稿」（cannot_verify + changedFiles: [] + requiredEvidence 明示「allowed_paths 未命中 diff，需人工确认实际改动，确属未实现则回 fail」），返回值带 noAttribution 计数、--done 输出区分提示。安全性：空 changedFiles 不触发 emptyDiff 伪造误判（该判定看真实 git diff），shouldAutoCheckTask 零 diff 守卫保证不自动勾选，verify 阶段仍兑现 requiredEvidence——草稿从「漏了让 agent 从零写」变成「给了骨架让 agent 升级 verdict」。测试 task-review-draft.test.mjs 更新（23 断言全过）。

**关联记忆**：`[[sillyspec-ruff-crlf-precommit-loop]]`、`[[sillyspec-stage-review-dochash-manual-resync]]`、`[[sillyspec-task-review-draft-skip-leak]]`

## 18. quick 会话的文件路径规则提示误导纯代码 quick（2026-08-21 已修）

**症状（ql-20260821-011 实证）**：纯代码 quick（无 spec 文档产出）每步都被注入「**所有变更文件必须写入 `.sillyspec/changes/quick-xxx/` 目录下**」——quick 会话按设计无实体变更目录（progress.js initChange 对 quick-<hex8> 跳过建目录）、代码改动本来就该写源码目录，反复提示一个用不到的目录是误导。

**根因**：outputStep 的路径规则注入（prompt.js）只按 `changeName` 存在与否分流，未区分 quick 会话 ID（quick-<hex8>）与普通变更名——普通变更的「变更文件集中在 changes/<名>/」铁律被套用到无目录语义的 quick 会话。

**解法（已修）**：按 QUICK_SID_RE（shared.js 导出，与 command.js/progress.js 同源）分流——quick 会话改述条件化：「纯代码改动直接写源码目录，无目录限制。仅当本 quick 需要落 spec 文档（复杂任务建议升级完整流程）时才写 changes/<id>/；QUICKLOG/tasks.md 由 CLI 接管不要手建」；普通变更的原硬规则原样保留。测试 quick-prompt-path-rule.test.mjs（6 断言，quick/普通双路径）。

**关联记忆**：`[[sillyspec-quick-path-rule-misleading]]`

## 19. 三坑：建议命令缺 --change / baseline 裹挟跨变更 spec 文档 / 草稿归属漏未提交改动（2026-08-21 闭环）

**症状（用户实测）**：
1. 阶段完结后 `--wait` 登记不上（报「未找到进度数据」）——full 级执行前确认门只能靠 AskUserQuestion 补位。
2. execute 建仓时把 39 个主仓未提交文件全量 checkpoint 进 worktree baseline，跨变更文件（ROADMAP、他变更 spec 文档）混入需人工隔离。
3. per-task review 草稿的 git-diff 归属对「未 commit 的 worktree 改动」全判空，9/9 草稿靠主代理手写升级。

**根因**：
1. 完成输出的下一步建议命令（`_getNextSuggestion` + complete.js 各分支硬编码）不带 `--change`；多活跃变更仓 `pm.read(cwd, null)` 无法自动定位 → 照抄执行即「未找到进度数据」，且报错不列候选无法自愈。
2. `_overlayBaseline` 全量吸收 staged/unstaged/untracked——spec 文档（`.sillyspec/`）不参与 worktree 构建（execute 的 spec 读写经 specDriftAnchor 锚回主仓），裹挟纯属误伤。
3. 归属集只取 `git diff base..HEAD`（commit diff），而子代理默认不 commit（execute 复盘 a 事实）；真实改动全在 working-tree。次生根因：`parsePorcelainFiles` 吃默认 trim 过的 status 输出，`' M file'` 被削成 `'M file'` 后 `slice(3)` 咬掉路径首字符（'eature.js'）——此存量 bug 同样影响 verifyReviewGitEvidence 的未提交对账（相交比对误判「完全不相交」）。

**修复（2026-08-21）**：
1. `_getNextSuggestion` 全分支（revising/stale/waiting/进行中/可开始）在 progress 带 `currentChange` 时附加 `--change <名>`（无则裸命令，存量断言零回归）；complete.js 的 verify 提示同步补；「未找到进度数据」报错列出全部活跃变更候选。测试 suggestion-change-flag.test.mjs（12 断言）。
2. `_overlayBaseline` 三源（staged/unstaged patch + untracked 复制）统一 pathspec `:(exclude).sillyspec` 排除，被隔离文件显式打印（🧹 清单）保持可见；代码文件照常 overlay。测试 baseline-overlay-isolation.test.mjs 前半（5 断言）。
3. `generateTaskReviewDrafts` 归属集并入 worktree `status --porcelain` 文件（过滤 .sillyspec/，按 allowed_paths 正常路径归属；review.head 仍为 HEAD commit，与 evidence 校验的「commit diff 空 + working-tree 有改动不判伪造」口径一致）；`runGit` 透传 opts，两处 status 调用 `trim:false`（git-helper 已有该开关与坑注释）。测试 baseline-overlay-isolation.test.mjs 后半（5 断言）。

**关联记忆**：`[[sillyspec-suggestion-command-missing-change]]`、`[[sillyspec-baseline-overlay-cross-change-contamination]]`、`[[sillyspec-draft-attribution-uncommitted-worktree]]`

## 20. 手动归档绕行 → 自愈/幽灵清理只翻 status，平台渲染成「进度丢失」（2026-08-21 闭环）

**症状（产品仓实证，docs/sillyspec/2026-08-21-manual-archive-desync-status-only.md）**：手动 mv 目录 + git commit 绕过 `run archive --done --confirm` 后，CLI 自愈/doctor 幽灵清理路径补记归档——只改 `changes.status='archived'` 一个字段，留下「已归档 + current_stage 停在 execute + 归档 0/5 步」的自相矛盾终态并推送平台；平台照实展示，详情页就成了「进度丢失」（数据本身都在）。

**根因**：`unregisterChange`（唯一归档状态 writer）只翻 status；`archiveChangeDirectory` 自愈分支与 `doctor --cleanup-ghosts` 都直接调它/裸 SQL——补记路径没有「终态一致」的概念。工具对绕行无法硬闸（用户总能 mv），能做的是任何写出 archived 的路径都产出一致终态。

**修复（2026-08-21）**：
1. `unregisterChange(cwd, name, { archiveStepNames })`（change-registry）：opts 给定时同事务收尾——`current_stage='archive'` + `stages.archive=completed`（ON CONFLICT upsert）+ 步骤行全 completed（缺行按 stageRegistry 定义补种，平台按步骤数展示完成度，零行会显示 0/5）。步骤名经 `pm.archiveStepNamesForArchive()`（progress.js，取 stageRegistry 单一真相，stages/* 不反向依赖 progress.js 无环）。
2. 接线三个归档出口：`archiveChangeDirectory` 正常路径 + 自愈路径（源目录已在 archive/）、quick 轻量自动归档——全部传 archiveStepNames；quick 会话注销（无 archive 阶段语义）保持 status-only。
3. `cleanupGhostChanges`（doctor）：幽灵分型——`changes/archive/<名>/` 有实体证据（含 plan.md）= 手动归档型，收尾完整终态并在结果中列 `finalized`；目录真丢失型保持 status-only（收尾=宣称归档完成属伪造，保持可逆原语义）。

**流程纪律（不变）**：归档必须走 `sillyspec run archive --done --confirm`；手动搬目录必留半拉子状态——现在工具侧至少保证补记后的终态一致，不再把矛盾体推给平台。测试 archive-terminal-consistency.test.mjs（14 断言：收尾参数/自愈路径/ghost 分型/旧调用零回归）。

**关联记忆**：`[[sillyspec-manual-archive-desync-status-only]]`

## 21. 三坑：apply 后提交误扫 / 他者半归档残留无提示 / review 引用分支只能手动保留（2026-08-21 闭环）

**症状（用户实测）**：
1. apply 提示「N 个无关未提交文件已放行」做对了，但 agent 随后 `git add frontend/` 目录级操作仍把无关文件扫进暂存，得手工剔除。
2. 归档时暂存区里「他者半归档」的 R 残留（他变更手动 mv + git add 留下的 rename 记录）没有识别和提示——git status 看到它一度误判要为本变更做第二次提交。
3. worktree cleanup 因 review.json 引用保留分支的提示贴心，但只能手动保留——115 个 review 的 base/head 悬空风险让分支永远删不掉。

**根因**：
1. apply 成功输出只列变更文件清单，不给可复用的精确提交 pathspec——agent 自然退回目录级 `git add`。
2. 归档的 CLI 下沉 git add 只管本变更目标目录，不探测暂存区里已有的他者 rename 残留，agent 靠 git status 肉眼判断归属性。
3. 审计保护只能「保留分支 ref」一种形态——分支 ref 是唯一能保 commit 可达的入口，删了就 dangling。

**修复（2026-08-21）**：
1. apply 成功落盘 `.sillyspec/.runtime/apply-pathspec-<change>.txt`（patch 文件集排序去重），CLI 输出给两种可照抄命令：≤30 文件给 `git add -- <全清单>`，长清单给 `git add --pathspec-from-file=<文件>`；checkOnly 不产出（只读语义）。测试 worktree-apply-pathspec.test.mjs（7 断言，含 --pathspec-from-file 精确暂存验证）。
2. `archiveChangeDirectory` 归档提交前探测 `git status --porcelain`（trim:false 防坑 19 的 trim 削路径）：`R  changes/<他人>/… → changes/archive/<他人>/…` 的已暂存 rename 报「他者半归档残留」warn（点名归属变更，明示无需为其做第二次提交，不 stage 不动）；本变更的未暂存源侧移动（` D changes/<me>/…` + 未跟踪 archive/<me>/…）自动补 `git add -A` 让归档成单次原子提交。
3. cleanup 删分支前若被 review.json 引用 → 打 `sillyspec-audit/<branch>` 轻量 tag 锚定分支 tip（commit 经 tag 保持可达、gc 安全、ref 前缀独立于 sillyspec/* 分支族不被 doctor 孤儿扫描误伤），随后正常删分支；tag 创建失败回退保留分支（宁保留勿丢审计链）。测试 worktree-cleanup-guard.test.mjs ⑦ 用例更新（30 断言全过）。

**关联记忆**：`[[sillyspec-apply-commit-pathspec-sweep]]`、`[[sillyspec-archive-other-residual-rename]]`、`[[sillyspec-cleanup-branch-review-anchor-tag]]`

## 22. 四坑：provision 假 installed / 验证 task 零 diff 误杀 / Wave 漏识别 / taskcard 逐卡裁决（2026-08-21 闭环）

**症状（用户实证）**：
1. `worktree doctor --fix` 报「re-provisioned: installed」但 node_modules junction 实际没建（Windows 静默失败），只能 PowerShell 手动补 New-Item -ItemType Junction。
2. 验证型 task（task-10/11）无代码 diff 是本质属性，review gate 的 emptyDiff 判伪造 + changedFiles∩diff 校验必误杀，只能引用验证区间手工披露绕过。
3. plan 6 个 Wave 只解析出 5 个 Wave 步，末两个 task 静默落入「运行测试」验收步，靠批量完成兜住才没出事。
4. task 卡骨架字段（depends_on/priority 等）与 design 声明冲突，主代理逐卡裁决转录。

**根因**：
1. tryInstall 信任 cmd.exe 垫片的退出码——PATH 解析/杀毒拦截存在「退出 0 却啥都没装」的静默失败面；无落盘后实物校验。
2. emptyDiff 伪造判定只有一个 low_risk 豁免通道，没有「纯验证任务」的合法零 diff 语义。
3. Wave 标题正则 `/^#+\s*Wave\s+(\d+)/` 要求 Wave+空格——"Wave6" 等变体被静默丢；部分识别 + 部分漏时既有的 0.8 检查（要求「无任何显式 Wave」才触发）不覆盖。
4. taskcard 只从注册表带编号/标题，行内注解 `(depends_on: task-01,02)` 明明已结构化却不反填，--set 批量注入通道缺失。

**修复（2026-08-21）**：
1. provisionDeps 结果后验证（仅 nodejs——python 产物是 .venv 不校验 node_modules）：installed/linked 状态要求 node_modules 实存，缺了判 failed 并给 PowerShell junction 手动兜底命令——deps 门控据此阻断而非 execute 中途才炸。
2. 纯验证 task 零 diff 通道：task 卡 frontmatter 声明 `task_type: verification`（或 `verification_only: true`）→ emptyDiff 不判伪造转 warning；requiredEvidence 为空仍拦（声明不能替代披露）；无归属草稿提示带上该通道说明。
3. Wave 解析正则宽容化（空格可选收容 "Wave6"）；`parseWavesFromPlan` 运行时对 wave-like 未识别行（波次/W+数字）逐个点名 warn；`validatePlanForExecute` 新增检查 0.9——部分识别 + 部分漏识别 → plan --done 直接阻断列漏网标题。
4. taskcard 改用 parseTaskRegistry（带行内注解）：`depends_on` 自动反填进骨架 frontmatter；CLI 新增 `--set key=value`（可重复，yamlScalar 转义 + 白名单键）批量注入 design 提炼值。

测试 dogfood-four-fixes.test.mjs（17 断言）；install-guard/chain 测试 fixture 补建 node_modules（后验证契约下无害命令需模拟 install 产物）。**关联记忆**：`[[sillyspec-provision-silent-fake-installed]]`、`[[sillyspec-verification-task-zero-diff]]`、`[[sillyspec-wave-heading-undercount]]`、`[[sillyspec-taskcard-design-field-conflicts]]`

## 23. 四坑：parity 扫描噪音 / module 0 命中未提交改动 / junction 假成功第②层 / 模板元数据头滞后（2026-08-21 闭环）

**症状（用户实证）**：
1. 探针 5（API 契约对账）扫进 .claude/worktrees/agent-* 陈旧检出与 build 产物，872 条前端调用全噪音。
2. frontend/** 变更明明映射 frontend 模块却 0 命中直接跳过（module 测试对账空转）。
3. worktree doctor 的 node_modules junction 在 Windows 静默失败报成功，会话内手动补 junction。
4. author/created_at 元数据校验在产物写完之后才提醒，事后返工补头。

**根因**：
1. scanFrontendApiCalls/scanBackendEndpoints 的排除清单过窄（仅 node_modules/.next/dist/__tests__），agent 隔离检出（.claude/worktrees）、各类构建产物目录、压缩文件全被当源码扫。
2. module 命中集只取 base..HEAD commit diff——子代理默认不 commit（常态），frontend 改动全在 working-tree → 0 命中 → zero-hit 跳过（与草稿归属同族根因）。
3. 上一轮已加 provision 后验证（第①层），但 tryLink 自身在 mklink/ln 退出码 0 后不复核链接落盘——cmd.exe 垫片链的静默失败在第②层放行。
4. 模块卡等 agent 产出模板不带元数据头；author/created_at 铁律只在首步注入，agent 照模板写完才被 gate 提醒。

**修复（2026-08-21）**：
1. 两侧扫描排除清单对齐扩充：.claude/.vscode/.idea/.cursor/.git、dist/build/out/.next/.nuxt/.output/.turbo/.parcel-cache/coverage、.venv/venv/target/__pycache__、.sillyspec/.worktrees；文件级排除 .d.ts 与 *.min.* / *.bundle.*。
2. resolveVerifyChangedFiles 新增 opt-in includeWorkingTree：worktree status --porcelain 文件（排除 .sillyspec/）并入命中集；runVerifyTestCheck 与 module-impact 命中判定启用（generateTaskReviewDrafts 维持自有并入点）。
3. tryLink 创建后 lstat+existsSync 实物复核——假成功判失败走 install 兜底，与 provision 后验证构成双层防线。
4. 模块卡模板 frontmatter 带真值占位符 author: <git-user> / created_at: <now-datetime>（outputStep 每步无条件替换的既有机制），照抄即过元数据校验；docs/prompt/archive.md 镜像同步。

测试 verify-feedback-fixes.test.mjs（9 断言）。**关联记忆**：`[[sillyspec-parity-scan-stale-dirs]]`、`[[sillyspec-module-subset-zero-hit-uncommitted]]`、`[[sillyspec-skeleton-metadata-header-late]]`

## 24. 三坑：归档尾声 sync 噪音 / 孤儿 worktree 物理目录 / progress show 停留旧阶段（2026-08-21 闭环）

**症状（用户实证）**：
1. archive 后 CLI sync 尾声连打「变更目录不存在/变更不存在」warn + 异常——注销后正常时序观感像出错。
2. worktree cleanup 因 meta 已注销跳过，物理目录若没被 apply 顺手清掉就成孤儿（这次侥幸）。
3. progress show 归档后仍显示「验证确认」——DB current_stage 与展示不同步。

**根因**：
1. sync()/syncDocuments() 的目录检查不识别归档态——目录已移 archive/ 是归档的正常结果，warn 措辞全是「不存在」类错误口吻。
2. archiveWorktreeCleanup 对 getMeta()==null 直接 return——meta 被先行流程（apply 自动 cleanup/doctor）注销后，残留物理目录无人管。
3. unregisterChange 终态一致化在 DB 写了 current_stage='archive'，但 completeStep 持有的是命令开始时的旧 progress 快照，后续 _write 把旧值覆盖回去（上轮 manual-archive 修复在标准流程被回写抵消）。

**修复（2026-08-21）**：
1. sync() 归档终态探测（changes/archive/ 实体 或 DB status='archived'，node:sqlite 只读直查）：命中降为一行 info「变更已归档，继续从 DB 推送最终状态」；链内 syncDocuments 经 _suppressDocsMissingWarn 旗标降 debug（独立手动 sync-docs 保留 warn 不静默）。
2. archiveWorktreeCleanup 无 meta 时不再 return：force 幂等清理（cleanup 对全不存在返回 skipped 零副作用），清掉孤儿输出「🧹 归档清理孤儿 worktree 残留」。
3. handleArchiveConfirmStep 在 archiveChangeDirectory 成功后同步内存快照 progress.currentStage='archive'——后续 _write 持久化的是终态而非旧值；progress show 归档后正确显示（变更非活跃时「没有活跃的变更」）。

测试 archive-tail-consistency.test.mjs（9 断言）。**关联记忆**：`[[sillyspec-post-archive-sync-noise]]`、`[[sillyspec-archive-cleanup-orphan-physical-dir]]`、`[[sillyspec-archive-progress-show-stale]]`

## 25. 三坑：未落仓虚警 / 归档变更 worktree 误供给 / verify 服务进程泄漏（2026-08-21 闭环）

**症状（用户实证）**：
1. doctor「未落主仓交付」虚警——M 文件与 main 逐字节一致仍算「未落仓」（护栏姿态对但降噪不足）。
2. 已归档变更的 worktree 被 doctor 当活跃任务 re-provision（给死目录装依赖）。
3. verify「真实启动验证」起的服务无回收机制（uvicorn 漏挂一天多）。

**根因**：
1. hasUnappliedChanges 的 HEAD-only 判定（原注释明示「不查 main 工作区未提交副本（防误删）」）——apply 后副本在工作区未 commit 是常态形态，保护意图应是「内容未落地」而非「HEAD 没有该 blob」。
2. doctor 的 deps 检查只看 worktreeBase 目录 + meta，不查变更归档态。
3. 服务进程由 agent 手起，CLI 无登记无回收钩子。

**修复（2026-08-21）**：
1. hasUnappliedChanges 第三层降噪：pending 集合逐文件比对 main 工作区副本（readFileSync 逐字节）——一致即剔除（删 worktree 无损）；分叉/无副本仍保守保留（护栏面不缩）。
2. doctor deps 检查前归档态闸（changes/archive/ 实体 或 DB status='archived'）：命中报 worktree-archived-change，fix 走 cleanup（内建 hasUnappliedChanges 护栏仍在）而非 _doctorReprovision；活跃变更供给路径零回归。
3. verify prompt 新增服务进程登记契约：长驻服务 PID 逐行登记 {SPEC_ROOT}/.runtime/verify-services.pids（deployment-critical 门控下未登记的真实启动证据视为不完整）；verify --done 收尾 gates 读文件逐 PID SIGTERM + 清文件（ESRCH 静默、失败给 taskkill/kill -9 指引不阻断）。

测试 doctor-verify-feedback.test.mjs（11 断言，含真实子进程 e2e 回收）；worktree-cleanup-guard ④ 按新契约重锚 + 分叉保护面新变体。**关联记忆**：`[[sillyspec-unapplied-false-positive-workspace-copy]]`、`[[sillyspec-doctor-reprovision-archived-change]]`、`[[sillyspec-verify-service-process-leak]]`

## 26. 坑 22-① 复发：monorepo 子包假 installed（2026-08-22 闭环）

**症状（复发实证）**：pnpm monorepo（frontend/daemon 子包）worktree 缺 node_modules，doctor 供给后仍标 installed、目录仍缺——Wave 1 daemon 测试挂，只能手补。

**根因（坑 22 后验证的漏网）**：hasDeclaredDeps 只查 worktree **根** package.json——pnpm workspace 根的 dependencies 常为空（依赖在子包，根只有 workspaces 字段）→ 校验整体跳过 → 子包 node_modules 全缺也报 installed。坑 22 修的是「根无依赖的空项目不误杀」，但没料到 monorepo 根也长这样。

**修复**：校验目标集扩展 = 根 + local.yaml modules 块声明的含 package.json 子模块；installed 状态下其中【声明了依赖】的目录逐一要求 node_modules 存在（pnpm/npm/yarn workspace 安装都会给子包建，合法契约；无依赖声明的空壳不校验防误杀）。缺失 → failed + depsError 点名缺失子包（相对路径）+ workspace install/junction 兜底指引——deps gate 据此阻断，错误可见而非测试中途才炸。

测试 provision-monorepo-verify.test.mjs（6 断言：假 installed 识破点名 / 真安装放行 / 空壳零误杀 / 单包旧契约零回归）。**关联记忆**：`[[sillyspec-provision-monorepo-subpackage-fake-installed]]`

## 27. 四坑（全程总结批）：junction 丢失强装依赖 / apply ENOBUFS / 字面证据误拦 / 跨变更冲突无预警（2026-08-22 闭环）

**症状（用户全程总结实证）**：
1. worktree doctor 报 installed 但 junction 未建（静默失败，已记知识库）。
2. apply 的 spawnSync ENOBUFS（大 diff 缓冲区溢出），只能 git merge 绕行。
3. verify gate 字面关键词对账被表述差异误拦——证据第一轮就齐，三轮才过。
4. execute 期间与并行变更的冲突靠人工发现（工具层无变更间冲突预警）。

**根因**：
1. doctor reprovision 对 missing/failed 一律 force install——junction 丢失场景的对症动作是重建链接，install 路径慢且静默失败面大（坑 26 已让假 installed 显式化，但修复路径仍绕远）。
2. GIT_MAX_BUFFER 32MB 对超大 binary patch 不够；apply 无 ENOBUFS 降级路径。
3. checkIntegrationEvidence 只认窄字面词集（端到端/real startup 等），agent 自然表述（拉起/实际请求/日志摘录）不含字面词即拦；且无结构化信号通道。
4. 无任何机制比对多活跃变更的改动文件集。

**修复（2026-08-22）**：
1. _doctorReprovision 按触发分流（relinkFirst）：missing/failed → 非 force 跑 provisionDeps（解链后 tryLink 直接重建 junction，lockfile 漂移自动落 install）；stale/main-drift 维持 force 重装。
2. GIT_MAX_BUFFER 32→256MB；applyWorktree catch 识别 ENOBUFS → 自动 applyByMerge 降级（既有 --merge 语义），不再需手动绕行。
3. 双通道：VERIFICATION_NEEDS literals 扩同义（拉起/已启动/联调/日志摘录/PID 已登记等）+ CLI 回执——verify 服务回收器落 verify-services.receipt.json，stage-contract 读回执注入 checkIntegrationEvidence 匹配（真实起过服务且 CLI 回收过 = 结构化证据，不依赖措辞）；无证据仍拦（底线不松）。
4. execute 启动时跨变更冲突预警：本变更 diff（含 worktree 未提交）与其他活跃变更 diff 求交集，advisory warn 对端变更名 + 重叠文件 + 锚点更新/串行化 apply 提示。

测试 final-four-fixes.test.mjs（17 断言）。**关联记忆**：`[[sillyspec-doctor-reprovision-junction-missing]]`、`[[sillyspec-apply-spawnsync-enobufs]]`、`[[sillyspec-verify-literal-evidence-mismatch]]`、`[[sillyspec-cross-change-conflict-no-warning]]`

## 28. 两坑：module 匹配对 monorepo 布局失灵 / dev server 端口竞争误判（2026-08-22 闭环）

**症状（用户实证）**：
1. test_strategy:module 下 0 命中直接跳过实测（靠第一次跑过的记录兜底）——模块匹配对纯 frontend 变更失灵，为何 0 命中完全黑箱。
2. CLI 全量对账与用户自留 dev server 的资源竞争无任何提示——端口冲突导致的测试失败差点误报成代码 FAIL。

**根因**：
1. pickHitModules 只做严格前缀匹配（modules 配 frontend/ 只认 frontend/ 开头的 diff 路径）——pnpm monorepo 常见 packages/frontend 布局全落空；0 命中输出不含 modules 配置与 diff 对照，无从排查。
2. runOneModule/runFullCommand 起测前不看端口占用，失败输出不做 EADDRINUSE 语义鉴别——资源竞争与代码失败同形。

**修复（2026-08-22）**：
1. pickHitModules 双层匹配：严格前缀优先；全严格 0 命中才启用段匹配兜底（diff 路径任一段 == 模块 path 首段，packages/frontend/src/x → 命中 frontend；段精确防 frontend-guide 误蹭），命中 warn「建议对齐 path 配置」；0 命中输出诊断（modules 配置 path 清单 + diff 文件样例前 5）。
2. 实测前 warnPortRaceBeforeRun：提取命令端口（--port=N/--port N/PORT=N）→ spawnSync 试连占用 → warn「疑似自留 dev server，失败可能是资源竞争非代码问题」；失败输出含 EADDRINUSE 时 reason 追加鉴别提示（停服务重跑再定论）；runModuleSubset 顶层 reason 透传失败模块的鉴别明细。

测试 module-match-portrace.test.mjs（11 断言，含真实端口占用 e2e）。**关联记忆**：`[[sillyspec-module-path-layout-mismatch]]`、`[[sillyspec-verify-devserver-port-race]]`

## 29. 三坑：head 真实 commit 契约后知 / changedFiles 注记后缀误判不相交 / 文档债拖到 verify 才拦（2026-08-22 闭环）

**症状（用户实证，中断续跑批）**：
1. review.head 必须是真实 commit（此前无此要求）——撞门才知道。
2. changedFiles 带注记后缀（src/a.js（新增））判「完全不相交」；agent 用正则修还贪婪吞了 (dashboard) 路径段，两轮才对。
3. module-impact pending 死信门在 verify 才拦（上次也拦）——文档债拖到 verify 末尾才暴露。

**根因**：
1. 伪 hash 报错只说「疑似伪造」，不给操作序列（commit 后取 HEAD）；契约无前置提示点。
2. changedFiles 匹配的 normalize 只剥 ./ 前缀——尾部注记直接参与比对必不相交；而修复它用正则剥容易贪婪（教训：改 review 元数据用结构化重建别用正则剥——工具侧应容忍注记，让路径匹配只看路径）。
3. extractPendingDocSyncRows 只在 verify gate 硬拦——execute 收尾零提示。

**修复（2026-08-22）**：
1. 伪 hash 报错给可执行指引：worktree 内 git add -A && git commit 后取 git rev-parse HEAD 作 head（base 用 task 卡锡点/基线），不填分支名/伪 hash/working-tree 描述。
2. normalize 结构化剥尾部注记：全/半角括号注记（[（(][^（()）]*[)）]$ 锚定尾部，中段路径段如 packages/(dashboard)/ 不动）、空格后的 // 与 # 注释；注记想写就放 reviewerNotes。报错文案同步明示「changedFiles 必须纯路径」。
3. execute --done 收尾 gate（Task Review Gate 之前）advisory 提示 pending 死信清单 + 「verify 阶段会硬拦」预告——当场清债，verify 硬拦不变。

测试 review-meta-execute-debt.test.mjs（11 断言）。**关联记忆**：`[[sillyspec-review-head-real-commit-late]]`、`[[sillyspec-changedfiles-annotation-suffix-mismatch]]`、`[[sillyspec-module-impact-debt-late-warn]]`

## 30. 两坑：--file-notes 非末步静默丢 / --files 追加不解锁危险拦截（2026-08-22 闭环）

**症状（用户实证）**：
1. step2 的 --done 传 --file-notes 被静默忽略（只随 step3 生效）——文档有说明但 CLI 不提示，白传一轮。
2. 改的三个模块文档被边界审计判「危险文件」拦截，追加 --files 边界并不解锁，必须 --force-baseline——「追加边界」与「解锁拦截」是两套开关，交互上易误解前者能解决后者。

**根因**：
1. --file-notes 经 per-process setter 注入 quicklog.js，CLI 短进程结束即丢——step2 进程的注入活不到 step3 收尾；解析点无任何提示。
2. --files 语义是「哪些文件计入本会话的归属口径」，不改变危险判定；DANGEROUS/.sillyspec 判定的放行开关唯 --force-baseline——两套正交开关在 BLOCKED 输出里未区分说明。

**修复（2026-08-22）**：
1. runCommand 在 ensureStageSteps 后判定（progress 已就绪）：quick + 带了 --file-notes + 非「唯一 pending 的末步 --done」→ warn「本次不会生效，CLI 短进程注入即丢，请在末步 --done 连同 --output 一起传」；末步（消费点）不提示。
2. printQuickAuditReview BLOCKED 分支：reasons 含「危险文件变更」时追加明示「追加 --files 边界不会解锁受保护/危险文件的拦截（两套开关——--files 只声明哪些文件计入本会话，不改变危险判定）。改这类文件必须 --force-baseline」。

测试 quick-filenotes-audit-hints.test.mjs（10 断言，含 step2 提醒/末步不提醒/危险拦截两套开关 e2e）。**关联记忆**：`[[sillyspec-quick-file-notes-nonfinal-ignored]]`、`[[sillyspec-files-flag-not-unlock-protected]]`

## 31. 两坑：关联变更遗留误拦 / tasks.md 追加行落「提案书（Proposal）」占位（2026-08-22 闭环）

**症状（用户实证）**：
1. 边界审计把关联变更目录里上个 session 的遗留脏文件当越界拦截（并发场景区分不了「他者遗留」与「本次偷改」），只能 --force-baseline 解锁。
2. CLI 往关联变更 tasks.md 追加的行落成占位「提案书（Proposal）」而非 ql 标题。

**根因**：
1. 关联变更目录下的文件不在 isQuickMetadata 豁免（豁免只覆盖非关联变更），quick 启动后出现的他者遗留不在本会话 baseline → 落「危险文件」blocked。quick 无法区分遗留与偷改。
2. deriveTitleFromLinkedChange 的破折号剥取对「提案书（Proposal）：冒号形态」/无后缀纯模板标题失败 → 整串前缀落进 desc。

**修复（2026-08-22）**：
1. auditQuickCompletion 关联变更遗留放行：命中关联变更目录前缀的文件完全剔除出本会话归属（changedFiles/newFiles/deletedFiles 退栈）——不触发危险/新增/越界三道门，输出 🧹 遗留清单提示（归关联变更自己的流程管，确系本会话改动用 --files 声明）。非关联 .sillyspec/ 仍 blocked（保护面零回归）。注：untracked 关联目录被 porcelain 折叠成目录 token、baseline 目录前缀天然放行（等效快照），leftover 分支覆盖的是已跟踪文件被修改的形态。
2. deriveTitleFromLinkedChange 固定前缀显式剥（提案书（Proposal）/设计文档（Design）/Proposal/Design + 全/半角冒号与破折号分隔形态）；剥完为空（纯模板标题）继续找下一文档；tasks.md 追加行与 QUICKLOG 条目标题同源语义化。

测试 quick-leftover-title.test.mjs（12 断言，含已跟踪遗留 e2e 放行+提示、untracked 折叠天然放行、非关联仍拦、三形态标题剥取 e2e）。**关联记忆**：`[[sillyspec-linked-change-leftover-false-block]]`、`[[sillyspec-linked-task-placeholder-title]]`

## 32. 三坑：TaskCard body 章节返工 / design 组合单元格对账过严 / 并发宽严不一致无说明（2026-08-22 闭环）

**症状（用户实证）**：
1. plan postcheck 的 TaskCard frontmatter 契约（id/title_zh/goal 等字段式）在生成步骤模板里没有明示——第一版按 body 章节写直接三组校验全挂，返工一轮。
2. design 文件清单的"组合路径单元格"（"router.py + service.py"一行两文件）字面匹配不识别，逼文档写法服务校验器。
3. quick 同文件并发只 warn 不阻断、plan 阶段硬拦——宽严不一致容易误判边界。

**根因**：
1. 生成 prompt 有模板和字段清单但缺「形态」警示——frontmatter YAML vs body 章节这一关键区别靠 agent 自悟。
2. 表格单元格提取只 normalize 不拆分——组合写法整串当单路径，字面匹配对账必不过。
3. 两阶段宽严差异是设计使然（quick 无并行子代理最坏 git 可分离；plan 并行覆盖不可恢复）但提示里不说，agent 以 quick 宽松推断 plan 边界。

**修复（2026-08-22）**：
1. 生成器 prompt 开头加「⚠️ 格式形态（第一眼必读）」：契约字段全在 frontmatter（YAML 键值对）不是 body 章节，goal 是 `goal: >` 多行标量，写成 body 章节三组校验全挂——先跑骨架命令再 Edit，骨架即正确形态。
2. splitCombinedPaths：单元格按 + 、 ／ | ; ； 拆分，每 token 独立过 looksLikePath（自由文本滤掉）入表；单路径零变化。
3. 双向明示：quick 同文件并发提示附「边界说明」段（quick 轻量最坏后果 git 可分离故只提示；plan 硬拦因并行覆盖不可恢复）；plan 同 Wave 冲突报错附同款说明——勿以 quick 宽松推断 plan 边界。

测试 plan-feedback-three.test.mjs（11 断言）。**关联记忆**：`[[sillyspec-taskcard-body-section-rework]]`、`[[sillyspec-design-combined-cell-mismatch]]`、`[[sillyspec-concurrent-policy-inconsistency]]`

## 33. 三坑：探针5基线失配全量误报 / 子代理未 commit 纯新增文件 apply 炸 / pull 部署噪声落冲突（2026-08-23 闭环）

**症状（用户实证）**：
1. 探针 5 endpoints 基线失配全量误报（存量基线与 verify 时实际代码不一致）。
2. apply 对「子代理未 commit 的纯新增文件」走 patch --3way 报 "does not exist in index" 炸——先在 worktree commit 再 apply 才顺。
3. 平台进度同步 409/pull 冲突不自愈需手动 resolve——并行会话部署扰动（内容相同的重推）触发。

**根因**：
1. endpoints 基线是 execute 时落的存量 artifacts；verify 时主仓已被并行会话/部署推进，前端调用（当前代码）对不上旧端点集 → missingBackend 全量误报；存量过期端点反向误报 unusedBackend。
2. 未 commit 的新文件不在 base commit 也不在 index——patch 生成侧的 git diff --cached 取不到内容；且派发提示只要求写 review 勾 checkbox，未明确要求 commit。
3. pull 冲突判定只看时间戳（本地脏 + 平台 ts 更新）——部署噪声重推（内容一致仅 ts 推进）被当真分歧落 sync-conflict 文件。

**修复（2026-08-23）**：
1. verifyApiParity 现算端点并入：scanBackendEndpoints(scanRoot) 现算当前代码端点 ∪ 存量 artifacts 做 missingBackend 比对（现算主导、存量补充跨仓/已删代码）；unusedBackend 收窄到现算端点（存量过期端点不再误报）。真缺失（前端调用了后端没有的端点）仍报——底线不松。
2. Wave prompt 调度要求第 4 条首项加「在 worktree 内 git add -A && git commit」——点明不 commit 的后果（纯新增文件 apply --3way 炸）与附带收益（review head 真实锚点）。
3. pull 内容一致自愈：判冲突前比对平台 JSON 与本地 serializeForSync 六表内容（忽略时间戳/同步元数据列），一致 → 跳过 import + base_ts 推进到平台 ts（与 resolve --keep-local 同语义自动闭环，不落冲突文件）；内容实质差异 → 真冲突维持原判。与既有的 push 409 自竞态自愈、keep-local 自动重推构成三层自愈网。

测试 final-verify-feedback.test.mjs（9 断言）。**关联记忆**：`[[sillyspec-probe5-endpoint-baseline-stale]]`、`[[sillyspec-subagent-uncommitted-newfile-apply3way]]`、`[[sillyspec-pull-deploy-noise-conflict]]`

## 34. 五坑：状态机矛盾 / autoCheck 写 worktree / 子模块漏链 / 探针5口径 / 共享主仓竞态（2026-08-23 闭环）

**症状（用户实证）**：
1. execute step15 --done 报「没有待完成的步骤」而 status 显示 15 步未完成——状态机自相矛盾，靠 verify 启动碰运气自愈。
2. 自动勾选写进已清理的 worktree 导致主仓 tasks.md 丢勾，需手动补。
3. worktree 依赖供给 Windows 下漏链 frontend node_modules（手动 mklink /J 恢复）。
4. 探针 5 用「全仓前端调用 × 本变更局部登记」口径，143 个 missing 全是误报噪音。
5. 并行会话共享主仓工作区/共享部署库的竞态（文件被清、alembic 被推进、staged 混入）。

**根因**：
1. completeStep 的 currentIdx==-1 分支只处理 stale，不覆盖「无 pending 但 status 非 completed」的并发半写矛盾态。
2. autoCheckPlanFromReviews 的 changeDir 解析未走 specDriftAnchor（runtimeRoot 走了、change 路径没走）——drift 场景下勾选写进 worktree 副本，cleanup 即丢。
3. linkOneDir 报 linked 后无实物核验（与根 link 的双层核验不对称）。
4. 前端调用扫描全仓但端点登记是本变更局部——口径不对齐。
5. 无任何共享环境变更感知。

**修复（2026-08-23）**：
1. completeStep 矛盾态分支：无 pending/waiting/stale 且 status≠completed → ensureStageSteps 重播种自愈（继续完成管线）；失败给 reset/doctor 精确指引。
2. autoCheckPlanFromReviews 的 changeDir 改 specDriftAnchor > specRoot > cwd（与 runtimeRoot 同范式）。
3. modules 子模块 link 后验证：linked 状态逐一核验 wt/<mp>/node_modules 实存，缺失降 failed + junction 兜底指引。
4. verifyApiParity 前端调用收窄：changeName 给定时按本变更 diff 文件（worktree meta 锚点 + 未提交并入，与 resolveVerifyChangedFiles 同口径）过滤调用；无 changeName（CLI contractScan）保持全仓；summary 标注 scope。
5. execute/verify 启动时共享主仓竞态 advisory：主仓未提交文件中非本变更的（并行会话工作/部署产物）→ warn「提交用精确 pathspec，交接物异常先确认是否他者所为」。

测试 fullflow-feedback-five.test.mjs（11 断言）。**关联记忆**：`[[sillyspec-execute-status-machine-contradiction]]`、`[[sillyspec-autocheck-worktree-tasks-lost]]`、`[[sillyspec-modules-submodule-link-verify]]`、`[[sillyspec-probe5-fullrepo-frontend-noise]]`、`[[sillyspec-parallel-shared-main-race]]`

## 35. 两坑：并行会话已声明文件误拦 / 四字段模板防线后置（2026-08-23 闭环）

**症状（用户实证）**：
1. 多 agent 并发时，quick --done 边界审计把并行会话窗口内改的未提交文件（如 daemon/router.py）判成本 quick 的危险变更直接 BLOCK，只能 --force-baseline 无差别逃生。
2. 结果摘要四字段（需求/根因/方案/结果）硬校验第一次提交必然打回——模板到 --done 被拦才第一次见到（预告藏在 step3 长 prompt 中段 + step2 --done 输出尾行，agent 到收尾时已淡忘）。

**根因**：
1. 审计窗口 = step1 baseline 快照 → --done 时 git status 的 diff；并行会话在**本会话启动后**改的文件不在 baseline → 算进本会话窗口 → 命中危险清单（src/run/、package.json 等）或 .sillyspec/ 判定 → blocked。归属信息其实存在（他者会话 guard.json 的 allowedFiles 显式声明），审计没消费。
2. step2 --done 推进到末步时的四字段预告（quick-step3-four-fields-late 第一层修复）只是 CLI 输出尾部一行，到 step3 --done 时隔了大量工作上下文已被淡忘；且「结果：验证情况（测试数/lint/typecheck）」的素材在 step2 产生，到 step3 才知道要收集为时已晚。打回文案只给 --output 旧形式模板，照抄仍可能踩嵌套全角冒号拆分坑（四参数形式正是为消灭它而生）。

**修复（2026-08-23）**：
1. 他者会话声明豁免（声明即归属的他向版本）：--done 审计枚举 quick-sessions 下其他 active 会话的**显式声明**（guard.allowedFiles，--files 传入），命中文件完全退栈归该会话审计（危险/删除/新增/越界/baseline 全部门跳过）+ 🔗 软警告可见放行（逐文件列归属会话；点明无需 --force-baseline，确系本会话改动用 --files 追加声明，僵尸会话 --cancel 清理）。边界：只信显式声明（他者 baselineFiles 是快照非所有权不作豁免）；本会话重叠声明不豁免（同文件并发归本会话审计）；超 7 天僵尸会话声明失效（与 doctor GHOST_EMPTY_DIR_STALE_MS 同口径）；折叠目录 token（`?? daemon/`）前缀双向匹配、同目录有本会话声明时不退栈（fail-closed 防目录内混文件漏放）；采集 fail-open（异常回到无豁免现状）。未被声明文件照旧拦截（保护面零回归）。
2. 四字段防线前移三层：① step2 prompt 内加「末步预告」段——四字段硬校验在实现阶段即告知，且点明「结果：验证情况」素材在本步产生、实现摘要当场记下具体验证数据（测试数/lint 告警数），step3 直接引用；② 缺 --output 拦截文案补推荐四参数形式（--req/--cause/--solution/--result，CLI 自动合成）；③ 四标签校验失败打回文案同样补四参数——打回后第二次照抄四参数不再踩旧形式嵌套全角冒号坑。既有 step2 --done 推进预告保留不动。

测试 quick-foreign-session-declared.test.mjs（36 断言：豁免判定 8 形态 / 采集枚举·排除·僵尸·容错·runtimeRoot / 软警告渲染 / CLI e2e 注入链路 + 无声明对照仍拦）、quick-laststep-fourfields-preview.test.mjs 扩展（+8 断言：打回文案四参数 / 缺 --output 文案 / step2 prompt 预告渲染）。**关联记忆**：`[[sillyspec-foreign-session-declared-false-block]]`、`[[sillyspec-quick-step3-four-fields-late]]`

## 36. 五坑：doctor 假 re-provisioned / apply 并发互踩+整批跳过 / push 409 内容一致自愈失效（sort TypeError）/ 409 横幅刷屏 / created_at UTC（2026-08-23 闭环）

**症状（用户实证）**：
1. `worktree doctor --fix` 报 re-provisioned 但实际没建 node_modules 链接（手工 junction 绕过）。
2. apply 在主仓有并行在途变更时只会整批跳过并留下混合状态（rescue 手动 cp 后主仓半批未提交 + worktree 半批 + 清理被阻）；且并行会话间无互斥——两个会话同时操作 main 互相清文件，只能靠人判断收手。
3. 平台同步 409 冲突需手动 resolve，报错较吓人（双线横幅 +「已卡死不会自愈」每步自动同步重复刷屏）。
4. taskcard 骨架 created_at 是 UTC（01:39），子代理两次手工改。

**根因**：
1. tryLink 的 preexisting 分支把 worktree node_modules 的**真实目录**（install 半途中断残留）当「已有依赖」返回 ok → 根快路径标 depsStatus=linked，链接没建且后验证 existsSync 对空/残目录照样过；叠加两条静默路径：子模块 mismatch/skipped 只写 depsModules 零消费（doctor 报成功而子模块无链接无提示）、_doctorReprovision 在 depsStatus≠failed 时删 meta.depsError（4b05567 的子模块验证错误被抹）且无条件 ok:true（failed 也进 fixed 打 ✅）。另有 broken junction（existsSync false 但目录项占位）mklink 撞名死锁。
2. 主仓 main 工作区是共享临界区（rollbackApply 的 checkout HEAD / applyByMerge 的 merge / 成功后 cleanup 都直接改主仓），apply 链零互斥；overlap 拦截只能整批短路，rescue 手动 cp 是唯一部分应用路径但无闭环。
3. **pull 侧内容一致自愈（坑 33-③）从未真正生效**：_progressContentEquals 的 `Object.entries(v).sort()` 用默认比较器（把 [key,value] 元素转字符串），serializeForSync 输出的 project 字段是 null-prototype 对象（不可转原始值）→ sort 抛 TypeError 被 catch 吞成恒 false——部署噪声全部落真冲突人工 resolve；push 409 侧则根本没有内容比对（pull 有 _progressContentEquals 而 push 无）。冲突落文件后 sync() 不检查既有冲突文件 → 每步 triggerSync 再 409 再刷全幅横幅。
4. taskcard/scan 文档头/scan updated_at（<now-iso-datetime>）/module-map generated_at 四处人读字段用 toISOString() 落 UTC（机器可读处用 ISO 是惯例不是坑）。

**修复（2026-08-23）**：
1. tryLink preexisting 分支 lstat 区分：指向 main 的 link 幂等✓ / 指向别处的 link 尊重不 clobber / **真实目录 → ok:false+preexistingDir**（根快路径降级 install 真重建说真话；linkOneDir 视为子模块本地安装 installed 保留，不误报 failed）；mklink 前清 broken junction（lstat 是 link 而 existsSync false → rmdir 后重建）；checkDepsFreshness 补 2b——meta.depsModules 中 linked 子模块逐一核验实存，缺失 → missing → doctor --fix relinkFirst 自愈闭环；provisionDeps 把 mismatch 子模块摘要进 depsError（可见但不降级，不卡 execute deps 门）；_doctorReprovision 三改：全量干净才清旧 depsError、msg 拼上错误、failed/有错 → ok:false 落 unfixable（CLI 不打 ✅）。
2. apply 主仓互斥锁 withMainApplyLock（复用 quicklog withFileLock + content 写 {pid,changeName,startedAt} 供报错展示；O_EXCL + 10min stale 偷锁 + 60s 等待；手动 apply 与 assess 自动 apply 两入口包裹，checkOnly 只读不加锁；抢不到 → fail-closed 报错含持有者/删锁指引）；`--skip-overlap` 显式 opt-in 部分应用：重叠文件从 changedFiles/deletedFiles/hashMismatchFiles 剔除（记 skippedOverlapFiles + warning），非重叠子集正常 apply，step8 改非 force——hasUnappliedChanges 护栏（主仓工作区逐字节降噪层）拦住 cleanup，跳过文件安全留 worktree；全部重叠 → 明确报「无可应用子集」；拦截文案补 --skip-overlap 出路（替代 rescue cp）。
3. _progressContentEquals 的 sort 改按 key 字符串比较（不转 value）——pull/push 两侧内容一致自愈真正生效；push 409 补内容一致自愈（409 回执 platform_progress vs 本地六表过同一比对，一致 → 跳过推送 + base_ts 推进到平台 ts + 单行 reason，不落冲突文件）；sync() 开头冲突降噪（已有 sync-conflict 文件且非 fromResolve → 单行提示 + 跳过推送，不再重复 409/横幅；resolve 后文件删除即恢复）；push/pull 横幅措辞「已卡死不会自愈」→「已暂停，等待人工 resolve」。
4. 新增 src/datetime.js 的 nowWallClock()（本地墙钟 YYYY-MM-DD HH:mm:ss，手工拼接零 locale 依赖），四处替换（taskcard created_at / scan-fix-headers created_at / <now-iso-datetime> 占位符值——名字带 iso 是历史遗留，注释说明 / _module-map generated_at）；created_at 是纯文档字段（postcheck/gates 不读格式）改值零破坏。

测试 worktree-deps-fakelink.test.mjs（8 断言：真实目录残留非假 linked / 子模块 installed 真话 / broken junction 重建 / checkDepsFreshness 子模块 missing 自愈闭环）、worktree-apply-mutex-skipoverlap.test.mjs（19 断言：--skip-overlap 部分应用+worktree 保留 / 全部重叠报错 / 无 flag 零回归 / 锁被占 fail-closed 含持有者 / 正常路径透传+释放）、platform-sync-self-heal.test.mjs 扩展（+7 断言：push 409 内容一致自愈 / 冲突文件单行降噪不刷横幅）、datetime-wallclock.test.mjs（5 断言）、taskcard.test.mjs C1 补本地墙钟断言；platform-sync-silent-death 横幅措辞断言同步更新。**关联记忆**：`[[sillyspec-provision-preexisting-dir-fake-linked]]`、`[[sillyspec-main-apply-no-mutex]]`、`[[sillyspec-apply-overlap-all-or-nothing]]`、`[[sillyspec-content-equals-sort-typeerror]]`、`[[sillyspec-push-409-foreign-noise]]`、`[[sillyspec-sync-conflict-banner-spam]]`、`[[sillyspec-taskcard-created-at-utc]]`

## 37. 四坑：--merge 冲突即 abort / 已 merge 分支误判未落地 / archive 子确认碎 / verify 对账误伤+跨会话杀进程（2026-08-23 闭环）

**症状（用户实证）**：
1. `worktree apply --merge` 遇冲突直接 abort 不给手工解决的机会（要自己重新 git merge，冲突现场与上下文全丢）。
2. `worktree cleanup` 的「未落地」判定比较文件内容而非合并可达性——分支已 merge 后主仓后续又改同批文件 → 逐字节不等 → 误判需 --force（用户用 git branch --merged 自证）。
3. archive 模块文档同步的子确认门（requiresWait 三段式）与用户已确认的整个 archive 流程重复，交互碎。
4. verify 实测对账撞并行会话在途 WIP 误伤本变更判定（可复验归因但阻断已发生）；且多会话并发工具互斥缺位（上批只覆盖了 apply）。

**根因**：
1. applyByMerge 的 catch 无条件 `git merge --abort`；且「主仓 dirty 拒绝启动（无 MERGE_HEAD）」与「真冲突」混为一谈都报「冲突请手动解决」。
2. hasUnappliedChanges 判「已在 main」的口径是内容比对（worktree diff vs main HEAD + 工作区逐字节）——merge 后主仓演进必然逐字节不等；全函数无一处查 merge-base/祖先关系。
3. sync-module-docs 的 requiresWait 硬门与 verify 文档同步阻断门、归档移动前死信校验、「确认归档 --confirm」四层确认语义重叠；硬门防的是「漏确认」而 --done --answer 一步可绕，安全增益有限、交互成本实高（brainstorm-auto 先例注释即「requiresWait 逼 AI 伪造 --answer」）。
4. verify 服务 PID 单文件 `verify-services.pids` 无归属——A 会话 --done kill 文件里全部 PID，把 B 正在收集 Runtime Evidence 的服务一并杀掉（receipt 单份还会被后写覆盖）；对账四处（无 meta 回退的 module diff / 删除对账 / probe6 / probe5 回退）直接取主仓 HEAD diff 无归属过滤——并行 WIP 全量混入（误命中他者模块跑他者测试 / 他者删除产出未声明删除误报）；cleanup/archive 收尾与 apply 一样改主仓但无互斥。

**修复（2026-08-23）**：
1. applyByMerge 加 keepConflicts 参数并导出：**显式 --merge 冲突保留 merge-in-progress 现场** + 手工解决指引（编辑 → git add → git commit；或 git merge --abort 放弃）+ worktree/分支保留；ENOBUFS 自动降级路径显式传 false 维持 abort（无人善后）；catch 先验 MERGE_HEAD 区分「未启动（dirty 拒绝，指引 commit/stash/--skip-overlap）」与「真冲突（保留现场）」——原实现混报。
2. hasUnappliedChanges 插合并可达性短路（四条件全真才短路、任一拿不准落回原逐字节逻辑 fail-open）：meta.branch 存在 + worktree HEAD===分支 tip + 工作区干净 + `merge-base(branch,HEAD)===tip`（tip 是 HEAD 祖先 = 全部交付已在主仓历史；不用 --is-ancestor——gitQuiet 无法区分 exit 1 与失败）→ hasChanges:false。修复一处四调用方受益（cleanup 拦截/doctor/归档保留判定/--skip-overlap 收尾）；cherry-pick 落地（tip 非祖先）走原路径零回归。
3. sync-module-docs 降级 conditionalWait（brainstorm-auto 同款）：常规同步（无 needs_review/未映射/标记缺失）直接写入 + diff 摘要进 --output 后 --done；异常才 --wait 请裁决（选项沿用确认写入/跳过同步）。用户确认收敛到「确认归档 --confirm」一处；坑 4 的「无机会写入」不回归（写入动作由 prompt 约定在 --done 前）。
4. ① 服务 PID 按变更分片 `verify-services-<change>.pids`（prompt 指引/reapVerifyServices 只回收本变更 + 兼容旧单文件；receipt 同名分片、stage-contract 优先读分片兼容旧名）；② 对账归属过滤——新零环模块 foreign-declared.js 的 collectForeignDeclaredFiles/splitOwnVsForeignDiffFiles（口径同坑 35：其他 quick 会话 guard.allowedFiles + 其他变更 design §6 清单；**无主文件保留参与判定 fail-closed**），接入四处（resolveMainChangedFiles 无 meta 回退 / runVerifyDeletionCheck / probe6 / _resolveDiffFilesForParity 无 meta 回退）+ 实测失败归因提示（testCheck failed 且主仓 dirty 命中他者声明 → 提示复验归因）；③ withMainApplyLock 泛化 withMainRepoLock（锁文件 main-repo.lock + purpose 字段 + env 覆盖等待时长 + process exit 钩子防 archive guard exit(1) 漏锁），新纳入 worktree cleanup CLI 入口、execute 收尾自动 cleanup（锁超时降级保留 worktree 不阻断完成）、archiveChangeDirectory（归档收尾）；verify 长耗时实测不上锁（靠归属过滤与归因提示治误伤）。

测试 worktree-apply-merge-fallback 重写场景 C/E + 新增 D（24 断言：真冲突保留现场 MERGE_HEAD/降级路径 abort/dirty 未启动区分指引）、worktree-has-unapplied-changes 新增 ⑱⑲（已 merge 后主仓演进 → false 走短路；未 merge 内容分叉 → true）+ 两条 reason 断言兼容短路文案（40 断言）、worktree-apply-relax-committed-advance 场景 2 按新语义更新（17 断言）、worktree-apply-mutex-skipoverlap 更新锁名/purpose + 新增 cleanup CLI 撞锁（22 断言）、archive-sync-module-docs-wait 按conditionalWait 重写（11 断言）、verify-concurrency-fixes 新增（18 断言：分片互不误杀 e2e 真子进程 / foreign 收集与切分 / 删除对账过滤集成）。**关联记忆**：`[[sillyspec-merge-conflict-abort-no-chance]]`、`[[sillyspec-cleanup-merged-branch-byte-false-positive]]`、`[[sillyspec-archive-subconfirm-redundant]]`、`[[sillyspec-verify-pids-cross-session-kill]]`、`[[sillyspec-verify-reconcile-foreign-wip]]`、`[[sillyspec-main-repo-no-mutex]]`

## 38. 三坑：register-repo CRLF 假成功死循环 / 幽灵目录 junction 穿透 / 派生产物旧基线覆盖（2026-08-23 闭环）

**症状（用户实证，跨仓流程批）**：
1. Windows 下 `local register-repo` 后跨仓注册「死循环」——命令报 ✅ 已注册，execute 仍报「未在 repos: 段注册」，只能手工把 local.yaml 转单行 LF 解开。
2. worktree apply 后目录残留（幽灵），人工清理 `rm -rf` 会穿透 node_modules junction 删掉主仓 node_modules（user-inputs 两次事故实录），只能人工小心防。
3. 多 agent 并发时，worktree 旧基线生成的 api-types 被 apply 落地，把并行变更已合入主仓的新枚举刷掉，一次 build 红——gen:types 必须在合并后基线重跑，工具此前零提示。

**根因**：
1. 写侧（registerRepoInLocalYaml）本身归一 LF，真凶是**幂等跳过不落盘**：外部（agent Write 工具/Windows 编辑器）写入的 CRLF 文件在内存归一后比对相等 → return 不写盘 → 磁盘永不治愈但 CLI 报 ✅；解析侧 parseRepoRegistry 是同文件唯一没做入口 LF 归一的函数（`(.*)$` 的 `.` 不匹配 `\r`）→ 条目全失配返回空 Map → MultiRepoContext fail-closed 报「未注册」→ agent 按报错指引再跑 register-repo → 死循环。
2. apply step8 **丢弃 cleanup 返回值**——`partial`（目录残留）静默成功，用户误以为干净；解链逻辑三处复制粘贴且不覆盖幽灵路径（create 幽灵强删裸 rmSync、doctor ghost-dir-with-files 无警示）也**不覆盖 modules 子模块 junction**（meta.depsModules 的 wt/&lt;module&gt;/node_modules）；Git Bash rm -rf / npm ci / git worktree remove 均跟随 junction 穿透。
3. apply step3.5 早已算出 hashMismatchFiles（变更文件在 worktree 基线后主仓有新提交），但默认 --3way 路径对它**完全静默**（只在 rescue 分类/merge 冲突时冒头）——语义级覆盖（旧内容文本可合 → 3way 静默成功）零提示；verify 的归因提示口径是「他者未提交 WIP 混入」，与此形态（本变更旧基线产物覆盖他者**已提交**内容）两侧都不匹配。

**修复（2026-08-23）**：
1. 双保险：parseRepoRegistry 入口 CRLF 归一（补齐同文件三兄弟函数的既有约定，一处修全链路）；registerRepoInLocalYaml 记 hadCr，幂等跳过分支在磁盘原文含 \r 时也落盘一次治愈——凡 register-repo 真跑过一次循环必然解开；LF 文件幂等仍零写入（既有断言零回归）。
2. worktree.js 新增共享 `unlinkNodeModulesLinks(worktreePath, meta, details)`（解根 + meta.depsModules 各子模块 node_modules，lstat/rmdir 失败 fail-loud 保持 worktree-junction-fail-loud 断言兼容）与 `safeRemoveWorktreeDir`（解链 + rmSync）；cleanup / _doctorReprovision / create 幽灵强删 / doctor ghost-dir --fix 四处统一换用（cleanup 由此新增子模块 junction 覆盖）；apply step8 消费 cleanup 返回值——partial/residual 推 warning 含安全手动指引（先 cmd /c rmdir 解链再删，勿 rm -rf）；doctor ghost-dir-with-files 加 junction 侦测警示（fixable 维持 false：内容不明不自动删）；cleanup CLI 补 partial 分支（此前打成「未找到」）。
3. apply step3.5 后消费 hashMismatchFiles：`∩ changedFiles` 非空 → warning 点名漂移文件 +「若含生成产物（api-types 等）apply 后在新基线重跑生成命令再验证」（checkOnly/assess 同带；纯 advisory 不阻断——生成器类变更的产物是合法交付，判断留给 agent）；verify 实测失败归因加第二判据：apply-pathspec 文件 ∩ 主仓最近 10 条提交 → 提示「若为生成产物先在新基线重跑生成命令再复验」。

测试 crossrepo-three-fixes.test.mjs（19 断言：CRLF 解析/幂等治愈闭环 / Windows 真 junction 根+子模块全解且假主仓内容完好 / safeRemoveWorktreeDir 穿透防护 / doctor ghost 警示 fixable:false / apply 派生产物漂移 warning e2e 真 3way 干净合形态）；worktree-junction-fail-loud（18）等既有回归零破坏。**关联记忆**：`[[sillyspec-register-repo-crlf-idempotent-loop]]`、`[[sillyspec-ghost-dir-junction-pierce]]`、`[[sillyspec-derived-artifact-stale-baseline]]`

## 39. 三坑：多行装饰器漏扫端点误报 / 探针1 worktree 路径盲区 / baseline checkpoint 夹带不透明 + FAIL 重验成本无预告（2026-08-24 闭环）

**症状（用户实证）**：
1. 探针 5 报 11 个存量 daemon 端点 missing——`endpoints.json` 与 live 扫描都漏了多行装饰器形态（`@router.get(
  "/path",
  response_model=…\)`，路径不在装饰器行）。
2. 探针 1 报 6 个 design 清单新文件「不存在」——verify 从主仓跑、apply 前新文件只在 worktree，`join(cwd, e.path)` 主仓单根解析直接跳过不扫。
3. baseline checkpoint 把主仓并行脏文件带进分支 diff，提交信息无清单，逐任务归因要人肉区分；FAIL 门控阻断时不预告「修复后 verify --done 仍会全量对账 commands.test」。

**根因**：
1. endpoint-extractor.js 三框架提取器全部逐行匹配——正则里 `\s*` 本可跨换行，但按行切片后永远失配（主形态与 split 式回退双双漏）。
2. verify-probes.js 探针 1/3 只按 cwd 解析路径，无 worktree 回退（探针 5 已有 _readWorktreeMeta 双根机制，探针 1/3 未复用）。
3. `_createBaselineCheckpoint` 只收 worktreePath/changeName，`_overlayBaseline` 算好的夹带清单没进提交信息；failMessage 只说「请修复后重新运行验证」，gates.js 的耗时预告逻辑没同步到阻断出口。

**修复（2026-08-24）**：
1. 三框架装饰器匹配改全文正则（`\s*` 跨换行，FastAPI 主形态/分散式/多行参数三态合一；行号=装饰器起始行）；Express 链式 `.route()` 维持逐行不扩面。
2. 探针 1/3 worktree 路径回退：`_readWorktreeMeta` 导出共用，主仓路径缺失且 gitDir≠cwd 时读 worktree 版本（probe1.worktreeHits 计数 + 渲染注明来源）；in-place（gitDir==cwd）零行为变化。
3. checkpoint 提交信息正文列夹带清单（封顶 30 行，与 meta.baselineFiles 同源，标注「主仓并行在途文件，逐任务归因时排除」）；failMessage 补重验成本预告（commands.test 全量对账、长套件数分钟、test_strategy: module 收窄指引），verify prompt 的 FAIL 出路行同步。

测试 contract-artifacts.test.mjs（三框架多行装饰器 +3 用例）、probe5-worktree-parity.test.mjs（探针1 回退 +4 断言）、baseline-overlay-isolation.test.mjs（checkpoint 信息 +4 断言）、stage-contract.test.mjs（FAIL 成本预告 +1）。**关联记忆**：`[[sillyspec-endpoint-multiline-decorator-miss]]`、`[[sillyspec-probe1-worktree-path-blind]]`、`[[sillyspec-baseline-checkpoint-opaque-carriage]]`、`[[sillyspec-fail-gate-reattest-cost-hint]]`

## 40. 三坑：主仓在途改动 apply 三路死锁 / stash pop 静默不落地 / review 未声明的执行期偏差拦 apply（2026-08-24 闭环）

**症状（用户实证）**：
1. worktree apply 对「主仓已有并行会话在途改动」无一等支持——EXCLUDE-DIRTY/MISMATCH 三连跳过后连 --merge 也被 git 拒绝启动，最后靠手工 stash→checkout→3-way 补丁完成。
2. 手工 stash pop 在含未跟踪文件的混合态下两次静默不落地，靠 stash SHA 兜底才没丢东西。
3. apply 用 design 清单比对 worktree diff，执行期有依据的越界文件（facade 转发/名单测试）被拦，只能在 design 补行才能过。

**根因**：
1. 默认路径被 4.5（重叠脏）/5a 拦截、--skip-overlap 全重叠「无可应用子集」、--merge 被 git 脏树拒绝——所有出口都只提示「先 commit/stash」，stash→3way→pop 流程未内置。
2. stash pop/apply 退出码语义复杂（部分恢复也非零/静默形态），人工操作无可校验闭环。
3. Gate1 allow set 只有 design §6 ∪ allowed_paths 两源，review.json changedFiles（已过 Task Review Gate git 证据交叉校验）不是输入。

**修复（2026-08-24）**：
1. `worktree apply --stash-dirty`：Gate1 后按 4.5 同口径探针，脏则 `stash push -u -- <pathspec 同款排除>`（范围与探针对齐——裸 push -u 会卷走排除项的未跟踪 spec 文件，恢复时与重建产物 already exists 互踩）；SHA 显著打印；apply 正常走；finally 两级恢复（apply --index 保暂存区优先 → 互斥时退普通 apply 内容保真+staged 扁平化明示 → 都失败保留条目 + SHA 大字兜底，绝不自动 drop）；drop 后核验栈顶防静默不落地；checkOnly 绝不 stash；全程主仓互斥锁内。五处拦截文案补 --stash-dirty 出路。
2. 恢复校验链（退出码 + 栈顶 SHA 对比 + 失败保留）即 ② 的工具化；手工指引文案同步提示「stash 后记下 SHA」。
3. `collectReviewDeclaredFiles`：最新 execute run 各 review.json changedFiles 按 repo 切片并入 allow set（跨仓不进 main；.sillyspec//meta.json 过滤）；仅靠 review 放行的文件记 reviewAdmittedFiles + 审计 warning；Gate1 报错给 review 声明/design 补行两条出路；assess Gate2 与「顺带修复」同等待遇豁免（降 warning 注明来源）。

测试 worktree-apply-stash-dirty.test.mjs（18 断言：非重叠干净恢复/staged 内容保真或诚实降级/重叠冲突标记+条目保留+SHA/干净零副作用/checkOnly 只读）、worktree-apply-review-allowlist.test.mjs（11 断言：声明放行+审计/无声明仍拦/跨仓切片/Gate2 豁免/运行时产物过滤）。**关联记忆**：`[[sillyspec-apply-main-dirty-no-first-class]]`、`[[sillyspec-stash-pop-silent-noop]]`、`[[sillyspec-apply-undeclared-deviation-block]]`

## 41. 两坑：同名分支冲突死锁+误导删分支 / brainstorm-auto 无模板骨架连环卡字面门（2026-08-24 闭环）

**症状（用户实证）**：
1. 「用户要求在指定分支上做」与 execute worktree 机制直接冲突——同名分支报错；execute 修复建议与 doctor --fix 都会导向删除该分支（用户自建分支被误删风险，用户未采用、走主检出+--done 兜底规避）。
2. 校验器字面匹配（文件变更清单标题 / Non-Goals 字面短语 / 生命周期豁免必须紧邻）对不熟悉惯例的 agent 是连环坑（plan 后检器反复卡七八轮）。

**根因**：
1. create() 遇既有同名分支只抛 Run cleanup first；ghost 目录清理里有无守卫 branch -D；stage.js 修复建议无条件推荐 git branch -D；doctor 无库场景孤儿照删——四处合力把「用户指定分支」变成死锁+误删链。
2. brainstorm-auto 的 design.md 规格只有一行散文，同一套字面校验器（brainstorm.design.* + lifecycle 紧邻豁免）打过去全是坑；豁免短语「紧邻」措辞只在报错文案里。

**修复（2026-08-24）**：
1. create() 同名分支 → 三选一决策菜单（删遗留/`--adopt-branch` 收编/换名）；`--adopt-branch` 检出既有分支为工作分支、分支 HEAD 作 baseline（存量不计交付）、meta.adoptedBranch 审计；ghost 清理只 prune 不删分支；execute 修复建议改为菜单指引；doctor 无库保守保留 + review 锚点复核；native-worktree force 不删用户分支。
2. brainstorm-auto design 规格扩为完整骨架（清单表/生命周期契约表+豁免短语字面示例/风险登记表/自审章节）；brainstorm 生命周期段补豁免短语示例 + 宽写法警示；骨架与校验器正则自洽有测试钉住（防模板-校验器漂移）。

测试 worktree-adopt-branch.test.mjs（19 断言）、worktree-doctor-active-branch.test.mjs（16，含无库保守+review 锚点两新例）、brainstorm-auto-skeleton.test.mjs（13，骨架×校验器自洽）。**关联记忆**：`[[sillyspec-worktree-user-branch-conflict]]`、`[[sillyspec-literal-template-trap]]`

## 42. 多会话单工作区混战（固有风险记录，2026-08-24 用户实证归档）

**症状**：并行会话共用同一主工作区时——分支被其他会话快进、多会话文件混编进同一次 diff、git 钩子的 stash 操作互相冲突。本次全流程最大的非技术消耗。

**根因**：多会话单工作区模式的固有竞态——sillyspec 的主仓互斥锁只覆盖 sillyspec 自身的写操作（apply/cleanup/archive/quick 收尾），不覆盖各会话 agent 的自由 git 操作（checkout/commit/stash）；git 工作区与 index 是进程间共享的单例状态。

**应对（有效实证）**：
- **hunk 级暂存**（`git add -p`）把本会话改动从混编工作区里精确分离——本次有效应对；
- quick 会话带 `--files` 声明（声明即归属，审计行隔离他者文件）；
- 能走 worktree 隔离的变更优先走完整流程（execute 自动 worktree）；
- 并行会话开工前先 commit 或 stash 存档本会话进度，减少共享态窗口。

**固有风险声明**：只要多会话共享单工作区，上述竞态无法在工具层根除（锁不能覆盖非工具操作）。规避优先级：worktree 隔离 > hunk 级分离 > 时序错峰。**关联记忆**：`[[sillyspec-multi-session-shared-workdir-race]]`

**补记（2026-08-25 用户实证升级形态）**：同日第三次被共享工作区坑到（暂存区混入、分支快进、HEAD 跳转三连），且升级为最高风险形态——并行会话不仅改文件，还直接改 git 状态：切分支、cherry-pick。stash/pop 保住了在途修复，但过程很脏（混合态、靠人肉记 SHA 兜底）。结论：hunk 分离/时序错峰只能缓解文件级混编，对 git 状态级互踩无解——**给每个活跃会话配独立 worktree 是唯一能同时隔离文件与 git 状态的手段**，优先级声明由此从建议升级为强推荐。

## 43. 三坑：跨变更归属排除警告刷屏 / 并行子代理 taskcard CLI 撞 SQLite 锁 / worktree editable-install 越界（2026-08-25 闭环）

**症状**：①execute/verify 期间反复出现「已排除 N 个并行会话声明的文件」类警告——并行会话 pathspec 重叠，且对方早已 apply+commit 的存量声明（design §6 清单不随 commit 失效、quick 会话目录残留）仍每轮刷警告，信息噪音大；②plan 生成 TaskCard 步骤并行 batch 子代理各自跑 `sillyspec taskcard` CLI，多进程并发撞进度库 SQLite 锁，用户改为主代理预生成骨架+子代理只 Edit 才稳；③`gen:types` 在 worktree 跑出主仓旧代码——worktree venv 的 editable install 指向主仓路径，此前靠 backend.md 注意事项人工记忆。

**修复（已闭环）**：
- ①`src/foreign-declared.js` 活性收敛（`filterStaleForeignDeclarations`）：声明只在「工作仍在途」时有效——quick 会话与无存活隔离 worktree 的变更按主仓 `git status --porcelain` 未提交集判定（已 commit 即收敛）；有存活隔离 worktree 的变更整份保留（WIP 主仓不可见）；事实源读不出一律保留（fail-closed）。四处警告调用点（verify-postcheck ×2 / verify-probes / contract-matrix）自动降噪，无需改动。
- ②骨架预生成内建：`taskcard.js` 新增 `ensureTaskcardSkeletons`（注册表声明缺卡即补、已存在跳过、幂等），`run/gates.js` plan gate 前主流程单进程调用（与 ensureDecisionDocHeader 同层幂等补齐范式）；`plan.js` 步骤 3 prompt 改为主 agent 先跑一次 `taskcard --all` 再派 batch，子代理 prompt 明示**禁止再跑 taskcard CLI**（缺卡报主 agent）；`templates/prompts/taskcard-rules.md` 同步。占位符硬拦不变——预生成只消灭 CLI 并发与格式错误，不替子代理产语义。
- ③`worktree-deps.js` 新增 `detectEditableInstallEscape`（路径型 .pth / PEP 660 finder MAPPING / direct_url.json editable 三痕迹，目标 resolve 后不在 worktree 内即越界），`worktree doctor` 对存活 worktree 报 `editable-install-escape`（fixable:false，指引 worktree 内 `uv sync` / `uv pip install -e .` 重装后重跑生成命令）。

## 44. 一坑：Git Bash(MSYS) 路径转换污染 quick prose 参数（2026-08-27 闭环）

**症状**：Windows Git Bash 下 `--req "/sessions 页整页滚动条修复…"` 落盘后 QUICKLOG 标题与「需求：」行变成 `E:/Software/Git/sessions 页整页滚动条修复…`——MSYS2 对以 `/` 开头的命令行参数做 POSIX→Windows 自动转换（`/sessions` → `<Git 安装目录>/sessions`），CLI 收到的已是污染串，无感写进 QUICKLOG 并推送平台「快速修复」列表。引号不救（MSYS 只看参数形态）；任何以 `/xxx` 开头的 `--req`/`--output`/`--input` 文案都会触发（页面路由类反馈是高频场景）。

**修复（已闭环）**：
- `src/run/command.js` 新增 `looksLikeMsysMangledPath` 纯函数嗅探（盘符绝对路径开头 + 紧随空白与中文正文的启发式，零误报优先）+ `warnMsysMangledFlag` 告警出口，在 `--output` / quick 四字段参数（`--req`/`--cause`/`--solution`/`--result`）/ `--input`（含 quick 位置参数描述）三处解析点接线：命中向 stderr 打告警（点名 flag + 值前缀 + 修复指引），**不阻断**——合法值确可能以盘符路径开头，由 agent 看告警后自查重发。
- 传参侧根治仍是 `MSYS_NO_PATHCONV=1` 前缀或去前导 `/` 改写表述（CLI 只能事后嗅探，转换发生在 shell 层、CLI 收到前）；纯英文正文 v1 检不出（启发式依赖中文正文字样）。

## 45. 一坑：verify 测试对账把含 failed 字样的通过行误判失败行（2026-08-28 闭环）

**症状**：`verify --done` 测试对账把 vitest **通过行**判为失败行——`PER_TEST_FAIL_RE` 的 `FAILED`/`error:`/`exception` 是子串匹配，通过行用例名恰含这些字样（如「✓ … 超时后 syncStatus=failed」「✓ … 服务端 failed 排队条目」）即命中。实测 2710 用例套件 382 个"失败行"中 378 假阳性：known_failures 无法逐条枚举几百条随机用例名而实质失效，verify 护栏又禁改测试源码，形成「修不了测试、豁免不生效」双卡（multi-agent-platform 仓实证，曾用 local.yaml 首条 `"✓"` 豁免条目硬分离真假集合）。

**修复（已闭环）**：
- `partitionFailures` 分类前剔除通过行：行首通过标记（`✓`/`√`/`✔` 前缀或 jest `PASS` 文件行）判定在剥 ANSI 色码后的行上做（TTY 捕获时标记可能被色码包裹）；返回保留原文行不变形。框架输出里通过行恒以通过标记开头、失败行恒以失败标记开头，行首判定即分离两类。
- `PER_TEST_FAIL_RE` 补 vitest 实际使用的 `×`（U+00D7）失败标记（原只有 jest/mocha 形态 ✕✗✘；漏检有 fail-safe 兜底但 remaining 精度差）。
- `SUMMARY_LINE_RE` 补 vitest 无冒号汇总行形态（`Test Files  N failed` / `Tests  N failed | M passed`），原只认 jest `Tests:` 冒号形态。
- 追加（真实输出实测后）：首轮修复只剔 ✓ 行仍余大量假阳性——vitest 控制台捕获噪声另三类一并剔除：`stdout|`/`stderr|` 捕获横幅行（横幅带用例名，名含 failed 字样即误判）、jsdom `Not implemented:` 环境警告行（`error:` 命中，正则须带 `i` 标志——实际输出大写 N）、`Failed Tests N` 分节头与 `ELIFECYCLE` 退出横幅归入汇总行。端到端实证（multi-agent-platform frontend 全量 2710 用例 4 真实失败）：失败行 382 → 15，7 条语义化豁免（3 文件名 + 2 套件名 + 2 错误类型）remaining=0。
- 使用方注意：升级本版 CLI 后，因本坑加的 `known_failures` workaround 条目（`"✓"`/`stderr`/`not implemented`/`Test Files`/`Tests`/`ELIFECYCLE`）应整体删除，换成真实预存债的语义化豁免（文件名/套件名/错误类型）。
