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
