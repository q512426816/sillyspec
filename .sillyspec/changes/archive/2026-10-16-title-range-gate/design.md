---
author: flow-machine-draft
created_at: 2026-10-16T13:44:13.048Z
---
# 设计记录（Design Record）— 2026-10-16-title-range-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

变更①（2026-10-16-short-change-title）落了提炼口径后，标题仍可能 <10 字（短首行原样过、动机首句短）或退变更名兜底（fresh 无 --input）。用户硬性要求：title 建议 ~20 字、10-30 字之内（必须），可强制 agent 命名。

改法：quicklog.js 新增 `isValidChangeTitle(title)`（去首尾空白后字符数 ∈ [10,30]）。flow.js fresh 启动在**任何状态写入之前**做硬门：titleFlag 或提炼首行不在区间（含无 --input 的变更名兜底形态）→ console.error 一次给全（当前值/字数/要求/两条修复路径）+ exit(2)——命名时刻强制，被拒启动零半态。平台 writer 预建空目录（proceedFreshEmptyDir）豁免硬门（自动派发无 agent 对话面），仅 ⚠️ 留痕。显式 --title 在 fresh/resume 均校验（超界 exit 2，参数面最易修正）。adopt/resume 补写是既成事实延续，硬断会让在途变更不可恢复——超界打 ⚠️ 强提示不阻断。顺带清偿变更①评审 P3：hardCut 软提示文案改「6..30 字内无可用自然标点截点」口径。过门格式指引（templates/agents-instruction.md + 本仓 AGENTS.md）同步 10-30 要求；既有 e2e 夹具首行 <10 字的按新契约延长（断言不动）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/quicklog.js` 新增导出 `isValidChangeTitle(title)` → boolean（10-30 字判定，去首尾空白后计数）。
- `flow start` 全新启动新增拒绝退出码 2（标题不合区间/兜底/显式 --title 超界）；报错文案含修复路径（cli-copy-selfsufficient 探针口径：状态/原因/修复一次给全）。
- `flow start` 平台 writer 形态行为不变（exit 0）+ 新增一行 ⚠️；adopt/resume 新增 ⚠️ 提示行（不阻断）。
- CLI 参数零新增；run 完整流程 initChange 与 deriveTitleFromLinkedChange 不加门（完整流程标题由 proposal 落盘后钩子刷新，aux 自动化面不可断）——本门只管 agent 命名时刻（轻量道 fresh）。
- 模板/指引文案更新：templates/agents-instruction.md、AGENTS.md 过门格式行。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/quicklog.js | 新增 isValidChangeTitle / resolveStartTitle / shortTitleRejectMessage / shortTitleRangeWarnLine / SHORT_TITLE_HARDCUT_HINT |
| 改 | src/flow.js | fresh 硬门（写入前 exit 2）+ 平台 writer 豁免 ⚠️ + resume --title 校验 + adopt/resume 超界强提示 + hardCut 文案单源化 |
| 改 | src/index.js | 教学面同步 10-30 硬区间口径（--input 可照抄实例起行） |
| 改 | src/run/command.js | 教学面同步 10-30 硬区间口径（--input 可照抄实例起行） |
| 改 | src/run/stage.js | 教学面同步 10-30 硬区间口径（--input 可照抄实例起行） |
| 改 | src/stages/brainstorm.js | 教学面同步 10-30 硬区间口径（--input 可照抄实例起行） |
| 改 | src/hooks/worktree-guard.js | 教学面同步 10-30 硬区间口径（--input 可照抄实例起行） |
| 改 | AGENTS.md | 过门格式/教学面 10-30 要求同步 |
| 改 | templates/agents-instruction.md | 过门格式/教学面 10-30 要求同步 |
| 改 | CLAUDE.md | 过门格式/教学面 10-30 要求同步 |
| 改 | assets/command-cards/flow.md | 过门格式/教学面 10-30 要求同步 |
| 改 | .claude/skills/sillyspec-flow/SKILL.md | 过门格式/教学面 10-30 要求同步 |
| 增 | test/title-range-gate.test.mjs | 区间判定/策略矩阵/报错与提示文案单测 + 4 例真实子进程 e2e（拒启零半态/合规落库/--title 超界/平台豁免） |
| 改 | test/batch-tick-gate.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/change-list-paren-strip.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/change-name-date-gate.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/change-title-flow.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/close-trace-freeze-integrity.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/close-trace-unified.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/cross-repo-baseline-anchor.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-agent-log-report.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-checkpoints.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-clarity-probe.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-diff-cmd.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-done-carry-suspect-advisory.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-help-status.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-protocol.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-redline-frontload.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-route.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-tail-polish.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flow-tick-prototype.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/flowdone-disposition-drift.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/fr-governance-sweep.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/guide-anchor-adopt-proto.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/input-format-copy.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/input-teach-copyable.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/prestage-consent-gate.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/sentinel-wiring.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/task-tick.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/thin-empty-face-crosscheck.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/thin-module-gate-and-feed.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/thin-upgrade-stage-reset.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/turbo-mode-done-keep.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/turbo-mode-done-skip.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/turbo-mode-scope.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |
| 改 | test/turbo-mode-start.test.mjs | 夹具随契约更新：flow start 首行 <10 字延长至合区间或教学断言对齐新口径（断言语义不动） |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。门是启动时点对当次入参的纯判定，无跨事件状态；resume 迟到补写维持首写者胜（不覆盖既有 title），乱序重入最坏=多打一行 ⚠️。被拒 fresh 未写任何状态，重入即全新判定。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   门在 initChange 之前，被拒路径零写入（无并发面）；放行路径写入语义与改动前完全一致（initChange 幂等同值）。两会话并发同名 start：一方被拒不写、另一方正常写，无新竞态。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。拒绝发生在任何 mkdir/DB 写/watcher spawn 之前（门位置在 initChange 与 writeFlowState 之前）；adopt/resume 仅新增 console 输出不改写路径，中断语义不变。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。门只看本进程入参（input/titleFlag/proceedFreshEmptyDir），落库仍只写本 cwd 进度库；跨仓基线锚、平台推送路径不触及。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：既有 e2e 夹具首行 <10 字的 91 处（36 文件，扫描脚本清点）会撞门——属旧契约夹具，逐一延长首行至合区间（断言不动）；漏网的由全量回归暴露后补齐。
- 放弃方案①：flow done 收口时才拦标题——拦截时点晚（工件/测试全做完才发现没命名），且 done 面夹具更多；命名时刻（fresh start）拦截成本最低。
- 放弃方案②：adopt/resume 也硬断——adopt 断点后变更已收编（flow-state 已写），硬断制造不可恢复半态；定级为 ⚠️ 强提示 + --title 修复通道（重入即改）。
- 放弃方案③：给硬门加 env/flag 逃生阀——「必须」语义被逃生阀掏空，平台 writer 形态豁免已覆盖唯一无 agent 的自动化面，不再留旁路。
