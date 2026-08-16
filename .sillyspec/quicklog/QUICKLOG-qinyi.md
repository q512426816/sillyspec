
## ql-20260815-021-9886 | 2026-08-15 23:56:09 | 解决 multi-agent-platform 登记的坑6（plan-postcheck 隐性格式契约）与坑7（跨仓 repo 声明只扫 plan.md）
状态：已完成
关联变更：2026-08-15-planpostcheck-pit67
文件：
- src/stages/plan-postcheck.js（parseAllowedPaths/parseDependsOn 块正则 [ /t]* 化 + 入口 CRLF 归一 + executePlanPostcheck 六检查聚合输出）
src/run/shared.js（getOrCreateMultiRepoContext 兼扫 tasks/ 卡片 repo 声明——collectTaskCardReposFallback）
src/task-review.js（跨仓未解析 warning 文案补真实排查方向）
src/stage-contract.js（entry-point-wiring 复用 parseAllowedPaths，保留全文扫描宽松语义）
test/plan-postcheck-blocklist.test.mjs（新增 12 断言：顶格/缩进/inline/混合/反引号/CRLF/depends_on/聚合）
test/multi-repo-context-entry.test.mjs（坑7 两场景：tasks/ 卡片补扫 + 双源去重）
结果：暂存确认：模块文档已同步并暂存——stages.md + runtime.md（ql-20260815-021-9886 坑6/坑7 条目）。命中模块：stages（plan-postcheck.js）、runtime（run/shared.js、task-review.js）。需求：解决 multi-agent-platform 登记的坑6（plan-postcheck 隐性格式契约）与坑7（跨仓 repo 声明只扫 plan.md）。根因：块列表正则 \s* 贪婪吃换行致标准 YAML 顶格列表失配静默判缺字段；六检查串行 throw 一轮只露一类；aggregateDeclaredRepos 不读 tasks/ 独立卡片致跨仓仓不进 ctx 误报 review 伪造。方案：[ \t]* 正则化 + 解析器入口 CRLF 归一 + executePlanPostcheck 聚合输出 + collectTaskCardReposFallback 兼扫 tasks/ + task-review warning 文案指向真实排查方向 + stage-contract entry-point-wiring 复用 parseAllowedPaths 消同源漂移。结果：npm test 全量 207 文件 exit=0 零失败；lint 过；新增 12+2 断言回归测试全绿。--force-baseline 解锁 stage-contract.js（entry-point-wiring 解析漂移修复，改后全量回归绿）；--allow-new 解锁新测试文件。

## ql-20260816-001-8a1d | 2026-08-16 00:33:17 | 移除 wait 单选校验门（enforceWaitChoice）
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（删 enforceWaitChoice helper + requiresWait 门/解 waiting/--continue 三处调用）|src/stages/brainstorm.js、src/stages/brainstorm-auto.js（删 waitFreeAnswer 标记，waitOptions 保留仅展示）|test/wait-choice-enforcement.test.mjs（重写：锁自由文本放行+门保留新契约）|test/wait-done-answer-resolves-waiting.test.mjs（注释更新：单选强制已移除）|docs/sillyspec/file-lifecycle.md（单选强制条目改写为移除记录）|docs/sillyspec/platform-interface-map.md（complete.js 行号锚点 646/749/889→652/755/895 校准）|.sillyspec/docs/sillyspec/modules/runtime.md、stages.md（ql-20260814-007 条目补移除注记）|docs/prompt/_extracted.json（重提取产物，waitFreeAnswer 不入 prompt 文本）
需求：移除 wait 单选校验门（enforceWaitChoice）。
根因：字符串全等匹配区分不了人工/AI——AskUserQuestion 标签转述/人工 Other 自由填值被误拦，故意代答读报错抄选项即过，防不了对手只伤真人。
方案：删 enforceWaitChoice 函数与三条 --answer 路径调用点，删 brainstorm/brainstorm-auto waitFreeAnswer 标记；重写 wait-choice-enforcement.test.mjs 锁新契约（自由文本放行、requiresWait 门保留）3 用例；同步 file-lifecycle.md 移除记录、platform-interface-map.md 行号锚点校准、模块文档移除注记、_extract.mjs 重提取。
结果：npm test 全量 EXIT=0（含 11 断言新契约测试），npm run lint 295 文件通过，doc-ref-check 80 处引用全通过；用户在卡的 change（2026-08-15-change-step-visibility）waiting 步骤重试命令不再受单选拦截。

## ql-20260816-002-1506 | 2026-08-16 06:57:49 | 修 2026-08-16 复盘增补 neg-②——worktree 自建 .venv 缺 pytest 等 dev 工具时，回归子代理被迫回退主仓 venv 跑测试，环境不一致掩真 bug
状态：已完成
关联变更：debt-neg2-venv-toolchain
文件：
- src/stages/execute.js（「确认 worktree 路径」步第 4 条工具链预告补 python venv 场景：worktree .venv 缺 dev 工具时 worktree 内补装，明示勿回退主仓 venv）
- docs/prompt/_extracted.json（重提取产物）
- docs/prompt/execute.md（镜像逐字同步）
需求：修 2026-08-16 复盘增补 neg-②——worktree 自建 .venv 缺 pytest 等 dev 工具时，回归子代理被迫回退主仓 venv 跑测试，环境不一致掩真 bug
根因：execute「确认 worktree 路径」步工具链预告只讲工具二进制安装，没讲 python venv 场景的 worktree 内补装优先原则
方案：src/stages/execute.js 该步第 4 条补 python venv 场景提示（uv sync --group dev / uv pip install pytest，明示不要回退主仓 venv）；重跑 _extract.mjs 刷新 _extracted.json + docs/prompt/execute.md 镜像逐字同步
结果：npm test 全量 EXIT=0（818 断言通过）+ npm run lint 295 文件通过；改动已 git add 暂存（execute.js/_extracted.json/execute.md 三文件）

## ql-20260816-003-8a14 | 2026-08-16 07:20:00 | quick 的 --change 传不存在变更名当关联变更被静默接受
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（quick sessionId 特例后加关联变更存在性守卫：幻影名 exit 2 + 三条出路）
test/quick-linked-change-existence-guard.test.mjs（新增 5 用例 14 断言）
docs/sillyspec/platform-interface-map.md（守卫插入致行号漂移，doc-ref-check 抓到后校正 8 处落点）
结果：暂存确认：cli-entry 模块卡已同步并暂存（正文守卫段 + 变更索引 ql-20260816-003-8a14 条目）。命中模块：cli-entry（run/command.js）。需求：quick 的 --change 传不存在变更名当关联变更被静默接受，挂悬空关联污染图谱，--done 时 sessionId fallback 可能命中他者会话；2026-08-02 踩过 f70c9c3 只修建幻影目录后果，误用本身仍复发。根因：linkedChanges 装载后无存在性校验，「关联不存在的变更」无任何合法场景。方案：flag 装载层 fail-loud 守卫（existsSync 逐一校验 + exit 2 + 三条出路文案），只检 CLI 显式装载值（持久化复用/交互式/sessionId 特例不检）。结果：新增 5 用例 14 断言全绿；npm test 全量 208 文件 exit=0；lint 过；doc-ref-check 80 处全过（行号漂移已连带校正）。注：ql-20260816-003-8a14 条目被并发会话 cf9a8df 误判孤儿删除，已按 CLI 骨架格式手工重建后重跑本 --done。--force-baseline 解锁 command.js；--allow-new 解锁新测试文件。

## ql-20260816-004-9afb | 2026-08-16 11:31:24 | 清偿 30 处失效 file:line 引用（.sillyspec/docs 纳入 docs-check 范围）+ 接线 docs gate CLI 分支
状态：已完成
关联变更：（无）
文件：
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（run.js:NNNN 8 处重定位 W6 新落点 src/run/command.js:156 等 + perProject 展开点改指 complete-handlers.js:456）
- .sillyspec/docs/sillyspec/scan/CONCERNS.md（propose.js 已删/approve-reject 已实现/gate-status 已废除三条过时事实改写）
- .sillyspec/docs/sillyspec/scan/CONVENTIONS.md（惰性 require 段重写 W6 后现状 + init.js 资产注释行号 + parseInt 落点）
- .sillyspec/docs/sillyspec/modules/machine-interface.md、runtime.md、stages.md（6 处行号漂移：validateTaskReviews→task-review.js:377、completeStageGates→gates.js:601、unregisterChange→complete-handlers.js:337、marker 自生→gates.js:302-327、SPEC_ROOT 注入→prompt.js、detectChangeRisk→stage-contract.js:469-490）
- docs/sillyspec/architecture-4a.md、prompt-control-debt.md、platform-interface-map.md（complete.js 漂移 6 处 + interface-map index.js 漂移 6 处即修）
- src/index.js（docs gate CLI 分支接线：--init-baseline/--json，specBase 平台优先——docs-signals-o12 漏接，pre-push 第三道关此前恒 exit 0 形同虚设）
需求：scan/modules 产物游离 docs-check 缺省范围（docs/**）外，漂移静默积累（W6 barrel 重构后 run.js:NNNN 全超界 24 处）；docs gate CLI 分支缺失
根因：docs-signals-o12 落地只做了 docs-gate.js 模块 + pre-push 接线，漏 index.js case 分支；.sillyspec/docs 不在缺省 paths 是范围设计缺口（本仓已用 local.yaml paths 纳入，consumer 通用解法留债单裁决）
方案：30 处引用逐条重定位（--suggest 候选行号辅助）；local.yaml docs-check.paths 加 .sillyspec/docs/**/*.md；index.js 补 docs gate 分支
结果：docs check 321 处全通过（171 带关键词断言）；docs gate 0=基线 0 放行 exit 0；npm test 全量 EXIT=0；lint 295 文件过；--force-baseline 解锁 src/index.js

## ql-20260816-005-3d7f | 2026-08-16 13:12:02 | execute「加载上下文」步符号影响面产出核验：报告落盘 symbol-impact.md + CLI 结构硬门（plan 每 task 覆盖）
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（操作 11 改报告落盘要求「CLI 硬校验」+ 输出契约补「符号影响面结论摘要」）
- src/run/gates.js（新增 extractTaskIdsFromPlan / validateSymbolImpactReport 纯函数 + enforceSymbolImpactGate 硬门）
- src/run/complete.js（enforceReviewJsonGate 后挂载新门，仅「加载上下文」步 --done 触发）
- test/execute-symbol-impact-gate.test.mjs（新增：纯函数覆盖度 13 断言 + gate 集成放行/阻断 5 断言）
- docs/prompt/execute.md（镜像逐字同步 + 占位符清单补 {SPEC_ROOT}）
- docs/prompt/_extracted.json（_extract.mjs 再生成）
- docs/sillyspec/file-lifecycle.md（execute 行补 symbol-impact.md 落盘核验 + 行号漂移修正）
- docs/sillyspec/architecture-4a.md（gates.js 插入 67 行引发行号漂移，修正 5 处）
- docs/sillyspec/platform-interface-map.md（同源行号漂移修正 gates.js:179→246）
- docs/sillyspec/prompt-control-debt.md（gates.js/complete.js 行号漂移修正 8 处）
- .sillyspec/docs/sillyspec/modules/runtime.md（gates.js 行号漂移修正 2 处）
- .claude/skills/sillyspec-execute/SKILL.md（补「符号影响面报告硬门」一节，按对外纯净性规则不含内部路径/ql-ID）

需求：execute 前缀步「加载上下文」的符号影响面扫描（操作 11）是 persuasion-only——实测（2026-08-12 multi-agent-platform change）agent <1s 连发 4 次 --done 盖章跳过前缀 4 步，实质产出被一句「上下文在会话内」带过；用户 2026-08-16 要求补轻量产出核验。
根因：该步输出契约只写「上下文摘要」，与操作 11 要求的「报告：列出每个受影响符号、调用点位置」脱节——agent 写一句话即合规；且 execute 前缀 4 步无任何 gate（enforceDepsGate/enforceReviewJsonGate 只挂 Wave 步）。
方案：① 报告落盘 {SPEC_ROOT}/changes/<change>/symbol-impact.md，每 task 一行结论（含「无签名级变更」显式声明）；② gates.js 新增 enforceSymbolImpactGate 硬门挂该步 --done（validateSymbolImpactReport：文件存在 + plan.md 每 task-XX 覆盖，缺 → blocked exit 1）；③ execute.js prompt 操作 11 补「报告落盘（CLI 硬校验）」要求 + 输出契约对齐；④ 同步镜像/_extracted.json/file-lifecycle/SKILL；⑤ 连带清偿 gates.js 插入 67 行引发的 16 处文档 file:line 行号漂移（docs check 从 80→321 处全绿）。语义质量（调用点找没找全）仍归 agent，CLI 只核结构覆盖度——对齐债单「persuasion-only → 补最小硬门」原则。
结果：新增 test/execute-symbol-impact-gate.test.mjs 18 断言（纯函数覆盖度 13 + gate 集成放行/阻断 5）全过；npm test 全量 EXIT=0；lint 297 文件过；docs check 321 处引用全过。--force-baseline 解锁 src/run/*（危险前缀）；--allow-new 解锁新测试与镜像外文档。
## ql-20260816-006-1a06 | 2026-08-16 13:58:19 | docs-check 缺省扫描范围纳入 .sillyspec/docs/**/*.md
状态：已完成
关联变更：（无）
文件：
- src/docs-check.js（DEFAULT_DOC_PATHS 常量 + 两处硬编码替换）
- src/config-schema.js（docs-check.paths desc + renderExample 双 glob）
- test/docs-check.test.mjs（缺省范围回归用例）
- docs/sillyspec/interface-contract.md（§1.3 缺省范围）
- docs/sillyspec/file-lifecycle.md（docs check 档案缺省措辞）
- docs/sillyspec/doc-consistency-debt.md（§八待裁决项销账）
需求：docs-check 缺省扫描范围纳入 .sillyspec/docs/**/*.md，用户裁决不管新旧项目，scan/modules 产物文档失效就该暴露出来修，不靠显式 opt-in。
根因：缺省 paths 只有 docs/**/*.md，.sillyspec/docs 游离在外；债单原倾向 init 模板显式 opt-in，用户裁决推翻该倾向直接改缺省。
方案：src/docs-check.js 加 DEFAULT_DOC_PATHS 常量并替换两处硬编码；config-schema.js desc 与 renderExample 同步；本仓 local.yaml 删 paths 段只留 skip；回归测试锁定缺省含 .sillyspec/docs 且显式 paths 可收窄。
结果：npm test 全量绿 + lint 297 过 + docs check 321 全过 + docs gate 基线 0 放行；interface-contract.md/file-lifecycle.md/债单已同步销账。

## ql-20260816-007-0558 | 2026-08-16 14:43:04 | 修复 quick --done 把他人删除的 .md 算成本会话假失效（troubleshooting #9）
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（mdChanged 排除 deletedFiles（troubleshooting #9））
- src/run/quick-audit.js（docsCheckHint warn 补引用格式引导行）
- test/audit-quick-completion.test.mjs（DC-5 删除不假失效 + DC-4 格式断言）
- docs/sillyspec/self-audit-2026-08-16.md（六处失效锚修正（并行文档顺手清偿，untracked 新文件属并行会话））
需求：修复 quick --done 把他人删除的 .md 算成本会话假失效（troubleshooting #9），并给 docsCheckHint 补引用格式引导。
根因：auditQuickCompletion 的 mdChanged 取自 changedFiles（含 deletedFiles），删除的 .md 不在盘被 runDocsCheck 报「文档不存在」；且 docsCheckHint warn 只教修不教写。
方案：mdChanged 排除 deletedFiles（删除归 --allow-delete 管）；docsCheckHint warn 补一行 file.js:行号 + 反引号代码符号格式引导；测试 DC-5 锁定删除不假失效、DC-4 补格式断言。
结果：46/0 断言过 + npm test 全量绿 + lint 297 + docs check 361 全过 + gate 0；顺手清偿并行 session self-audit 文档六处失效锚（逐条亲验后修正）。--force-baseline 解锁 src/run/* 危险前缀（本次正当改动面）。

## ql-20260816-008-c809 | 2026-08-16 15:09:03 | 批次①一行修复组（self-audit A1/C12/D21d/C14）四项落库
状态：已完成
关联变更：（无）
文件：
- package.json（engines 抬 >=22.13.0）
- src/db-engine.js（注释 22.11→22.13）
- templates/claude-instruction.md（规则9删 resume 幽灵命令）
- src/stages/quick.js（删 QUICKLOG「gitignore」错句）
- src/index.js（auto 顶层别名补 case 路由）
- docs/prompt/quick.md（镜像同步）
- docs/sillyspec/architecture-4a.md（版本声明同步）
- README.md（版本声明同步）
- package-lock.json（engines 同步）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引追加）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（变更索引追加）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引追加）
- docs/sillyspec/prompt-control-debt.md（三批次裁决登记）
需求：批次①一行修复组（self-audit A1/C12/D21d/C14）四项落库。
根因：A1 engines 虚低致 Node22.11/22.12 全 CLI 崩，C12 模板 resume 幽灵命令每个 init 项目照跑 exit1，D21d quick.js QUICKLOG gitignore 错误声明与事实矛盾，C14 auto 别名 usage 列出但 switch 漏路由。
方案：engines 抬 >=22.13.0+db-engine 注释同步，模板规则9改 progress show+run stage 续跑，quick.js 删 gitignore 错句+docs/prompt 镜像同步，index.js 补 case auto 路由，连带同步版本声明文档与模块变更索引。
结果：npm test 209/0、lint 297 文件、docs-check 381 引用全通过，auto 路由实测与 run auto 行为一致。

## ql-20260816-009-fb44 | 2026-08-16 15:45:23 | scan-staleness 用 behind commit 数当文档过期/失真判据
状态：已完成
关联变更：（无）
文件：
- src/scan-staleness.js（status stale改needs-refresh+message语义修正）
- test/scan-staleness.test.mjs（断言同步3处）
- docs/sillyspec/doc-consistency-debt.md（第八节补登）
- docs/sillyspec/file-lifecycle.md（brainstorm注入语义同步）
- docs/sillyspec/design-docs-signals-integration.md（信号源表格语义同步）
需求：scan-staleness 用 behind commit 数当文档过期/失真判据，与 docs-gate 既定原则（behind 计数不参与判定）矛盾，需修正判定信号与文案语义。
根因：落后提交数不等于文档内容错误，本仓实测 404 commit/53 天后 platform 快照仍与当前结构一致，实证误报；文档失效应由 docs-check 直接信号判定。
方案：status stale 改 needs-refresh（语义为建议核对/重扫而非判文档错）；message 明示落后数不等于文档错误、失效由 docs check 判并保留刷新指引；fresh/unknown 文案与头注释同步；测试断言 3 处、debt 第八节补登、file-lifecycle 与 design-signals 旧语义描述同步。
结果：npm test 209/0 通过、lint 297 文件通过、docs check 381 引用全通过、scan-staleness 单测 9/9。

## ql-20260816-010-50bf | 2026-08-16 17:03:37 | 批次③ Windows 组两个 P0 功能损坏修复（self-audit A2/A3）
状态：已完成
关联变更：（无）
文件：
- src/workflow.js（A2 占位符 JSON 转义）
- packages/dashboard/server/index.js（A3 listen 前置）
- docs/sillyspec/prompt-control-debt.md（批次①②完成状态登记）
需求：批次③ Windows 组两个 P0 功能损坏修复（self-audit A2/A3）。
根因：A2 workflow.js 占位符替换把含反斜杠的 Windows 路径裸替换进 JSON 字面量再 parse 报 Bad escaped character 致 scan 质量门 fail-open；A3 dashboard 的 server.listen 排在同步全盘扫描后 Windows 实测 150s+ 假死。
方案：A2 加 embedValue（字符串 JSON 转义嵌入）；A3 listen 前置 + startWatcher setImmediate 延后。
结果：lint 298 文件 + 受影响测试 50 断言全过（workflow 三套 + 回归），workflow list 正常。

## ql-20260816-011-a79a | 2026-08-16 18:25:09 | D 组 plan 系 5 项 prompt 债修复（self-audit D15/D19/D21b/D21c/D21）
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（D15 表骨架+D19 清单分组+D21b 落盘锚点+D21 清注释）
- templates/prompts/taskcard-rules.md（D21c title_zh 语义）
- docs/prompt/plan.md（镜像同步+Step1 错挂修复）
- docs/prompt/_extracted.json（重提取）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引）
- docs/sillyspec/self-audit-2026-08-16.md + prompt-control-debt.md + scan/ARCHITECTURE.md（docs-check 行号漂移修正）
需求：D 组 plan 系 5 项 prompt 债修复（self-audit D15/D19/D21b/D21c/D21）。
根因：module-impact 表格式无上游定义 agent 只能从 gate 报错反推；三份字段清单并存互不一致；plan_level 靠对话记忆跨步传递 context 压缩即失忆；title/title_zh 无语义区分说明全量产物两字段逐字节相同；维护者代号/注释泄入 prompt。
方案：补表骨架+清单分组+落盘锚点+语义说明+清注释，重提取镜像同步，顺带修镜像 Step1 错挂漂移与 7 处 docs-check 行号漂移。
结果：lint 298 过、docs-check 381 引用全过、受影响测试全绿（plan-postcheck 55 断言 + include 35 + prompt 34）。

## ql-20260816-012-a975 | 2026-08-16 18:43:19 | D 组 verify 系 3 项 prompt 债修复（self-audit D16/D17/D21）
状态：已完成
关联变更：（无）
文件：
- src/stages/verify.js（D16 acceptance 对照+D17 模板通用化+D21 清注释）
- templates/prompts/verify-probes.md（D17 示例通用占位）
- docs/prompt/verify.md + _extracted.json（镜像同步）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引）
需求：D 组 verify 系 3 项 prompt 债修复（self-audit D16/D17/D21）。
根因：验收步要求 checkbox 但 TaskCard 协议 acceptance 在 frontmatter 正文无 checkbox；Runtime Evidence 模板整段 consumer（sillyhub）专有词硬编码进通用 prompt 且教堆关键词过字面 gate 自我拆台；旧 prompt 迁移史注释泄入。
方案：改 frontmatter 对照核验 + 模板通用化 + 清注释，镜像同步。
结果：lint 298 过、docs-check 381 全过、verify 系测试全绿。

## ql-20260816-013-00e8 | 2026-08-16 18:51:19 | D 组 scan/execute/brainstorm 系 3 项 prompt 债修复（self-audit D18/D21）
状态：已完成
关联变更：（无）
文件：
- src/stages/scan.js（D18 workflow 命令+D21 Step11 引用）
- src/stages/execute.js（D18 worktree meta 命令）
- src/stages/brainstorm.js（D21 step8 引用）
- docs/prompt/{scan,execute,brainstorm}.md + _extracted.json（镜像同步）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引）
需求：D 组 scan/execute/brainstorm 系 3 项 prompt 债修复（self-audit D18/D21）。
根因：node -e import('./src/...') 相对 cwd 解析，npm 分发到 consumer 项目必炸 ERR_MODULE_NOT_FOUND，同功能 CLI 子命令（workflow check / worktree meta）早已存在；数字 step 引用（step8/Step11）是 P6.4 name 引用裁决漏网，rename 即漂移。
方案：改指 CLI 子命令 + step name 引用，镜像同步。
结果：lint 298 过、docs-check 381 全过、全量 npm test 210/0。

## ql-20260816-014-4a60 | 2026-08-16 19:51:04 | D20 execute 指令强度通胀收敛（self-audit prompt#6）
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（D20 强度收敛）
- docs/prompt/execute.md + _extracted.json（镜像同步）
- test/dispatch/execute-dispatch-integration.test.mjs（标题断言同步）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引）
需求：D20 execute 指令强度通胀收敛（self-audit prompt#6）。
根因：装饰性「（必须严格遵守）」标题五处复用 + 单句双强度，强度信号退化噪音。
方案：纯减法去装饰缀 + 收敛双强度，保留全部承重 enforcement。
结果：必须 19→14、必须严格遵守 4→0；lint 298、docs-check 415、全量 npm test 210/0。

## ql-20260816-015-92f9 | 2026-08-16 21:01:14 | A4 gate/derive specBase 平台模式机器门控不可用（self-audit
状态：已完成
关联变更：（无）
文件：
- src/machine-interface.js（runGate/runDerive specRoot 统一）
- src/index.js（gate/derive resolvePlatformSpecDir 接线）
- test/machine-interface.test.mjs（场景 9 夹具修正）
- docs/sillyspec/platform-interface-map.md（6 处行号漂移）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（变更索引）
需求：A4 gate/derive specBase 平台模式机器门控不可用（self-audit，未纳入批次项 P0）。
根因：runGate/runDerive 的 pm 构造与 db 检查用 resolveSpecDir(cwd) 而 specRoot 用传入 specBase——同一 envelope 两套事实源，平台/--spec-dir 模式读本地孤儿库恒「无法核验」exit 2；index.js gate/derive 不读平台指针。
方案：machine-interface 两函数统一用 specRoot + index.js 用 resolvePlatformSpecDir 三合一接线。
结果：cwd/specDir 分离场景实测 gate 真实核验；machine-interface 101 断言全过 + 全量 210/0 + lint 298 + docs-check 415。

## ql-20260816-016-db7f | 2026-08-16 21:20:45 | B10 docs/progress 未知子命令 usage 后 exit 0 修复（未纳入批次项 CLI#4）
状态：已完成
关联变更：（无）
文件：
- src/index.js（B10 7 处 usage 错误改 exit 2）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（变更索引）
需求：B10 docs/progress 未知子命令 usage 后 exit 0 修复（未纳入批次项 CLI#4）。
根因：docs else 与 progress default/缺参 7 处 usage 打印后 break 退出 0——typo 静默成功，hook 拼错 fail-open；与 worktree/modules/runtime 家族 exit 2+didYouMean 口径分裂。
方案：统一改 process.exit(2)。
结果：实测 4 场景全 exit 2；全量 210/0 + lint 298 + docs-check 415。

## ql-20260816-017-b1ca | 2026-08-16 21:31:04 | B9 docs gate 未知 flag 静默吞 + --paths 未接线（未纳入批次项 CLI#2）
状态：已完成
关联变更：（无）
文件：
- src/index.js（B9 gate flag 白名单+paths 接线）
- docs/sillyspec/platform-interface-map.md（8 处引用漂移）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（变更索引）
需求：B9 docs gate 未知 flag 静默吞 + --paths 未接线（未纳入批次项 CLI#2）。
根因：gate 分支只解析 --init-baseline，未知 --xxx 不 exit 2（interface-contract §1.3b 宣称未实现）；--paths 被忽略（runDocsGate.checkOpts 已支持但不接线）。
方案：flag 白名单化（对齐 docs check）+ --paths 透传 + 位置参数拒绝。
结果：实测未知 flag/位置参数/--paths 缺值全 exit 2、--paths 生效；platform-interface-map 8 处引用漂移修正；全量 210/0 + lint 298 + docs-check 415 + doc-ref-check 80。

## ql-20260816-018-4eae | 2026-08-16 21:44:58 | B11 safeGit 未设 stdio 子进程 stderr 裸刷终端（未纳入批次项驾驭#6）
状态：已完成
关联变更：（无）
文件：
- src/git-helper.js（B11 stdio 配置）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引）
需求：B11 safeGit 未设 stdio 子进程 stderr 裸刷终端（未纳入批次项驾驭#6）。
根因：git-helper.js execFileSync 无 stdio 配置，git 失败 stderr 直接刷终端（实测确认）；同仓其他调用点均显式 stdio。
方案：safeGit 与 git 加 stdio:['ignore','pipe','pipe']。
结果：实测 fatal 不再裸刷；git-helper 14 用例 + 全量 210/0 + lint 298 + docs-check 415。

## ql-20260816-019-a3bb | 2026-08-16 21:51:04 | B11b docs 家族顶层 glob 边界（未纳入批次项 CLI#3）
状态：已完成
关联变更：（无）
文件：
- src/docs-check.js（B11b 形态 0+目录检测）
- .sillyspec/docs/sillyspec/modules/cli-entry.md（变更索引）
需求：B11b docs 家族顶层 glob 边界（未纳入批次项 CLI#3）。
根因：walkGlob 形态 2 把根级 **/*.md 误解析为字面目录 `**` 静默 0 命中全绿；目录字面量过 existsSync 后 readFileSync 撞 EISDIR 裸崩 exit 1（契约应 exit 2）。
方案：加形态 0 根级递归 + 形态 3 statSync 目录检测抛配置错误。
结果：**/*.md 真实命中 3081 引用、--paths docs exit 2、默认 415 无回归、全量 210/0。

## ql-20260816-020-12e1 | 2026-08-16 22:07:41 | C14b scan 中途劫持下一步建议（未纳入批次项上手#7）
状态：已完成
关联变更：（无）
文件：
- src/progress/stage-machine.js（C14b 第三循环排除 scan）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引）
需求：C14b scan 中途劫持下一步建议（未纳入批次项上手#7）。
根因：_getNextSuggestion 第三循环（in-progress 阶段找待办步）不排除 scan，而 scan auxiliary 恒处 STAGE_ORDER 首位，中途未完成即劫持「下一步」为 scan 掩盖主流程待办；第四循环 plan-c 已排除、第三循环漏补同根因。
方案：第三循环加 scan 排除。
结果：next-suggestion 9 断言全过 + 全量 211/0。
