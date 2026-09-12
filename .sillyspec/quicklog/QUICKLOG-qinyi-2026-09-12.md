
## ql-20260911-005-a972 | 2026-09-11 00:50:39 | P2 批：next --apply 代跑 + coverage 存在性事实 + 路线图 P2 逐项裁决
状态：已完成
关联变更：（无）
文件：
- src/index.js（next --apply 分支）
- src/run/verify-quality-scan.js（coverage 三函数+动作接线）
- test/coverage-existence.test.mjs（3 用例）
- docs/sillyspec/noai-ir-roadmap.md（P2 逐项裁决）
- .sillyspec/docs/sillyspec/modules/stages.md（旧步骤引用改写）
需求：P2 批：next --apply 代跑 + coverage 存在性事实 + 路线图 P2 逐项裁决
根因：恢复链 next 只建议让 agent 当转述员；探针 3 只判测试文件存在，coverage 存在性是性价比最高的可机械化增量；P2 各项需逐项裁决落地/已满足/留待
方案：①next --apply：CLI 命令形态建议代跑（spawn 同 bin --dir 透传），非命令形态拒绝②coverage：显式 commands.coverage 配置触发（不解析任意 runner stdout），lcov SF 集×diff 交集，渲染只说「有覆盖记录」不说「已覆盖」（评审一裁决语义边界内建），noAI 质量扫描 lint 后采集并落指纹记录③路线图裁决：doctor 修复子命令与 IR dump artifacts 实证已满足；模块卡注入 brainstorm/plan 无路径源维持关键词；铁律8 需 provenance 设计留待；MCP Phase2-3 留待
结果：新测试 3/3 + 回归 6/6 + lint 0 死码 + docs check 547/547（stages.md 旧步骤引用随 P0-4 改写）

## ql-20260911-006-49b0 | 2026-09-11 07:35:59 | P2-c module-map 字段分离：rebuild --force 改 merge 语义
状态：已完成
关联变更：（无）
文件：
- src/modules.js（merge 语义生成段）
- src/stages/archive.js（三章节契约锚补回）
- test/modules-rebuild-merge.test.mjs（2 用例）
需求：P2-c module-map 字段分离：rebuild --force 改 merge 语义
根因：实例 map 文件头常年挂「勿跑 rebuild --force 会清空手动维护」警告——rebuild 实际清空 tags/main_symbols/depends_on/used_by/status/needs_review（旧版只保三个列表字段），人工标注与重建互斥
方案：merge 语义：existing 全字段优先（人工维护不丢）、卡片补缺（role 仅 existing 缺时取、doc 卡片在场时以卡片为准）、骨架默认垫底；dry-run 预览默认保留（重写仍刷 generated_at/排版）；三章节契约锚补回合并步 prompt
结果：新测试 2/2；module 族回归 18/18（含 plan-module-impact-sections 契约锚）

## ql-20260911-007-2be2 | 2026-09-11 07:41:57 | P2-d schema 普及：sillyspec validate 总命令 + 门禁快照 .sillyspec 盲区修复
状态：已完成
关联变更：（无）
文件：
- src/validate-artifacts.js（六类产物校验聚合）
- src/index.js（validate case）
- src/run/gate-snapshot.js（跳过面收窄（盲区修复））
- test/validate-artifacts.test.mjs,test/quick-gate-snapshot.test.mjs（契约测试）
需求：P2-d schema 普及：sillyspec validate 总命令 + 门禁快照 .sillyspec 盲区修复
根因：verify-facts 是唯一有真 validator 的产物；落地实证顺带抓到 gate-snapshot 一刀切跳过 .sillyspec/ 的盲区——声明过的 module-map 补录进不了快照，lint 恒误报（此前过关靠快照创建偶发失败回退主仓的假阴）
方案：validateChangeArtifacts 聚合既有校验器（facts/task reviews 按 marker 最新 run/stage reviews/module-map schema_version+canonical）+ 轻形状（required-evidence/endpoints），skip=未生成不算失败；CLI validate --change [--json] fail exit 1；gate-snapshot 跳过面收窄到 .runtime/与 quicklog/（local.yaml 仍走 cfg 段），声明的 tracked docs 正常 overlay
结果：新测试 3/3（validate-artifacts）+ 快照契约测试更新 4/4；lint 全绿

## ql-20260911-008-ed08 | 2026-09-11 07:48:58 | P2-d 补丁：快照契约测试夹具 mkdir 修复
状态：已完成
关联变更：（无）
文件：
- test/quick-gate-snapshot.test.mjs（夹具 mkdir 修复）
需求：P2-d 补丁：快照契约测试夹具 mkdir 修复
根因：新契约测试写 tracked doc 夹具时未建父目录 ENOENT
方案：夹具补 mkdirSync 三处；overlay 收窄行为本体已随 ql-20260911-007 落地并由 quick 门禁实证（隔离快照内 lint 通过）
结果：quick-gate-snapshot 4/4

## ql-20260911-009-f4f3 | 2026-09-11 07:52:07 | P2-e 铁律 8 收窄：CLI 骨架 provenance 戳（generated_by）
状态：已完成
关联变更：（无）
文件：
- src/design-facts.js,src/taskcard.js,src/index.js（三类骨架盖戳）
- src/run/prompt.js（铁律 8 收窄）
- test/skeleton-provenance.test.mjs（3 用例）
需求：P2-e 铁律 8 收窄：CLI 骨架 provenance 戳（generated_by）
根因：铁律 8 要求所有文档手填 author/created_at——但标准产物全有 CLI 骨架生成器且已预填元数据，手填要求只对「从零手写的补文档」有意义；缺 provenance 标记则「只认 CLI 戳」无从判定
方案：design-init/taskcard/fourpiece 三类骨架盖 generated_by: sillyspec-<命令> 戳（可审计出品方）；铁律收窄为骨架优先（勿删勿手拼 frontmatter），仅手写补文档才手填元数据；validateMetadata 现行为保持（provenance 戳为未来严格化依据）
结果：新测试 3/3；taskcard 族回归 10/10

## ql-20260911-010-f650 | 2026-09-11 07:56:55 | P2-f task 真源归一：CLI 唯一勾选者（review write 落盘即勾）
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（autoCheck 导出）
- src/index.js（review write 接线）
- src/stages/execute.js,src/stages/verify.js（prompt 单写者化）
- test/task-truth-unify.test.mjs（2 用例）
需求：P2-f task 真源归一：CLI 唯一勾选者（review write 落盘即勾）
根因：双路勾选（agent 手勾 + 机器勾，文件锁串行化）是漂移面：手勾漏勾/幻觉勾导致勾选≠完成的门禁失败；review.json 已 schema 化+git 证据校验，够格当唯一真源
方案：review write 命令落盘即触发 autoCheckPlanFromReviews 按 verdict 渲染 checkbox（导出复用同一函数，--done 兜底不变）；execute/verify prompt 全面改写为单写者声明（禁止手动勾选）；tasks.md 勾选从真相降为显示态；跨会话依赖 command.js（synthesizeStepOutput，ql-020 未提交批次）追加声明过隔离快照
结果：新测试 2/2；review-write/execute-run 回归通过

## ql-20260911-011-a0f5 | 2026-09-11 08:00:48 | P2-g MCP Phase 2：sillyspec mcp 最小 stdio server（四件只读 tools）
状态：已完成
关联变更：（无）
文件：
- src/mcp-server.js（新模块：MCP server）
- src/index.js（mcp case）
- test/mcp-server.test.mjs（2 用例）
- docs/sillyspec/noai-ir-roadmap.md（P2 终态更新）
需求：P2-g MCP Phase 2：sillyspec mcp 最小 stdio server（四件只读 tools）
根因：agent 靠 shell 调 CLI+解析人类可读文本——flag 幻觉与文本解析漂移是真实痛点（铁律专门有一条「不确定命令停下问用户」）；machine-interface envelope 与 next --json 是现成地基
方案：startMcpServer 行协议循环（initialize 回显/tools 能力、tools/list schema 化、tools/call 子进程 --json 隔离——stdout 纪律天然分离且不 import 重模块、notification 与非 JSON 行健壮忽略）；只读边界（Phase 2 不暴露状态推进）；sillyspec mcp 入口供 hosts 配置
结果：新测试 2/2（内存流协议五面 + CLI e2e）；lint 全绿；docs check 547/547

## ql-20260911-012-df94 | 2026-09-11 08:02:56 | P2 收尾：execute skill 勾选归 CLI 同步
状态：已完成
关联变更：（无）
文件：
- .claude/skills/sillyspec-execute/SKILL.md（勾选归 CLI 同步）
需求：P2 收尾：execute skill 勾选归 CLI 同步
根因：P2-f 改了 execute 阶段七处 prompt 为 CLI 唯一勾选者——skill 的 batch 协议说明还写着 checkbox 勾选归主 agent，行为契约需同步
方案：execute skill batch 说明改为：审查与 review.json 归主 agent，checkbox 勾选归 CLI（review write 落盘即按 verdict 自动勾选，禁止手动勾选）
结果：skill 文案与 stages/execute.js 一致；全量回归 127/127 + lint 全绿 + docs check 547/547

## ql-20260911-013-5dcf | 2026-09-11 10:25:00 | 修 verify 实测门结构性盲区：隔离快照定向跑本变更内容（--worktree 定向等价）+ 坑入 troubleshooting §58
状态：已完成
关联变更：friction-signal-hint
文件：
- src/run/gate-snapshot.js（sourceRoot + createVerifyGateSnapshot）
- src/run/gates.js（verify 块快照接线 + lint 归因提示）
- test/verify-gate-snapshot.test.mjs（3 用例）
- docs/sillyspec/troubleshooting.md（§58）
- .sillyspec/docs/sillyspec/modules/runtime.md（第八批补记）
- docs/sillyspec/architecture-4a.md,file-lifecycle.md,prompt-control-debt.md（gates.js 锚重锚）
需求：修 verify 实测门结构性盲区：隔离快照定向跑本变更内容（--worktree 定向等价）+ 坑入 troubleshooting §58
根因：verify 门跑 main 共享工作区，多会话并发任何人的 WIP 都能弄红无辜变更的门（第二次真实阻塞）；quick 门第六批已快照化，verify 是同根因残余；test 侧 renderVerifyTestAttribution 只是事后归因不是隔离
方案：gate-snapshot.js 增 sourceRoot overlay + createVerifyGateSnapshot（变更文件集 resolveVerifyChangedFiles + 他者显式声明剔除 + native worktree 定向源 + 变更文档随快照）；gates.js verify 块 test/lint 快照内跑（ENV 可关，基建失败 fallback 主仓），lint 阻断 fallback 路径补污染归属提示 + scope-audit 出口；troubleshooting §58 四段坑条
结果：verify-gate-snapshot 3/3（native 定向/in-place 声明剔除无主保留/fallback）；quick-gate-snapshot 回归 4/4；全量 npm test 432/432 全绿；lint 560 文件 0 hard fail；docs check 559 全过（漂移 4 锚重锚）
审计：⚖️ 归属切分：4 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/architecture-4a.md, docs/sillyspec/file-lifecycle.md, docs/sillyspec/prompt-control-debt.md, .sillyspec/changes/friction-signal-hint/symbol-impact.md

## ql-20260911-014-3e32 | 2026-09-11 10:46:40 | 修 docs gate 窗口关键词误伤：纯位置锚语法 file.js:line?（层 2 跳过、层 1 照校）
状态：已完成
关联变更：friction-signal-hint
文件：
- src/docs-check.js（REF_RE ? 捕获组 + kwSkip 三点 + 教学提示）
- test/docs-check-positional-anchor.test.mjs（4 用例）
- test/docs-check.test.mjs（deepEqual 补 kwSkip 字段）
- test/docs-check-fix.test.mjs（S7 strip 扩 POS_HINT）
- .sillyspec/docs/sillyspec/modules/docs-consistency.md（卡补记）
需求：修 docs gate 窗口关键词误伤：纯位置锚语法 file.js:line?（层 2 跳过、层 1 照校）
根因：层 2 把引用行全部反引号 token（OR）对锚点文件窗口断言——跨文件引用+反话论述（锚 A、token 全是 B 概念）必失败，唯一绕法删行号让引用退出核验，锚点信息丢失
方案：REF_RE 增第 5 捕获组 (?)?；collectDocRefs 解析 kwSkip；runDocsCheck 与 collectInvalidDocRefs（scan-postcheck 共用内核）两层 2 点 kwSkip 跳过断言、层 1 照校；层 2 失败 reason 尾附加 ? 教学提示（勿删行号）
结果：docs-check-positional-anchor 4/4；回归 55/55（deepEqual 补 kwSkip 字段 + S7 字节对照 strip 扩展契约演化后缀）；全量 npm test 433/433；lint 561 文件 0 fail；docs check 559 全过

## ql-20260911-015-55d5 | 2026-09-11 11:04:20 | scope-audit 快照优先放宽至 post-apply 收尾形态
状态：已完成
关联变更：2026-09-11-friction-signal-hint
文件：
- src/scope-audit.js（settled 条件+settleLabel+漂移警告 note）
- test/scope-audit.test.mjs（活跃收尾两用例）
需求：scope-audit 快照优先放宽至 post-apply 收尾形态
根因：无，纯新增——multi-agent-platform 实证 2026-09-04 活跃滞留变更（execute 已 apply 分支已删无快照）查询零提示走开放区间，741 文件刷屏无解释；快照机制上线前收尾的旧变更无冻结记录可退
方案：快照优先条件放宽：archived || post-apply；活跃收尾用「execute 已收尾」措辞；快照缺失时开放区间表尾加漂移警告（含旧变更冻结记录无法重建的如实告知）
结果：node --test 18/18（新增活跃收尾快照优先/无快照警告两用例）；npm test 全量无失败；真实场景 dogfood 741 文件表现在带完整警告；归档冻结行为无回归
审计：📝 文档欠账（D-8）：2 个源码文件改动未同步任何模块文档（涉及模块：core-engine）

## ql-20260911-016-8e13 | 2026-09-11 11:08:58 | 修驾驭两点：文档门失效只报计数不指名 + 审计拦截 flag 建议全家桶（归属问题被推危险文件豁免）
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（docsCheckHint invalidRefs 明细）
- src/run/quick-audit.js（逐条渲染 + BLOCKED 三分流点名）
- src/run/complete-handlers.js（审计注记明细 + 自引注释同步）
- src/run/stage.js（step1 脏文件点名）
- test/quick-audit-blocked-guidance.test.mjs（3 用例）
- test/audit-quick-completion.test.mjs（case 12 契约对齐）
- docs/sillyspec/platform-interface-map.md,prompt-control-debt.md（锚重锚）
需求：修驾驭两点：文档门失效只报计数不指名 + 审计拦截 flag 建议全家桶（归属问题被推危险文件豁免）
根因：①docsCheckHint 生产端只存 {invalid,total} 计数，两渲染点只打 N/M——用户四轮复现才定位一处预存债（应门禁输出直接带文件：行号）；②BLOCKED 渲染把危险/新增/超出 allowedFiles 三类混进一条咒语推 --force-baseline——allowedFiles 推断漏掉的实改文件（归属问题非危险）被迫用危险豁免解锁，语义过宽吓人
方案：①生产端 invalidRefs 明细（封顶 10+truncated 标记），quick-audit/complete-handlers 两渲染点逐条 [doc:line] ref → reason；②BLOCKED 按 reason 类别三分流点名：超出 allowedFiles → 点名文件+精确 --files 追加命令（明示非危险）；危险/baseline → --force-baseline 独占；新增 → --allow-new 独占；最小 flag 集拼装；step1 未带 --files 时点名 src/test 脏文件封顶 8 供当场确认归属
结果：quick-audit-blocked-guidance 3/3；audit-quick-completion 回归 55/55（case 12 断言对齐新契约）；全量 npm test 434/434；lint 562 文件 0 hard fail（门禁内 lint 挂项为并行会话 shared.js 在途导出 isDatedChangeName 骑行在同名文件 overlay——非本会话改动，SILLYSPEC_QUICK_TEST_GATE=skip 带审计逃生，主仓全量已另行验证）；docs check 559 全过
审计：📎 文档引用失效：14/87 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/platform-interface-map.md:3] shared.js:657 → 多候选全失败 → src/progress/shared.js: 行号超界（start=657 > 总行数 42）；范围 end=657 超界（总行数 42）；关键词缺失：期望任一「triggerSync / isPlatformMode 
审计：   ❌ [docs/sillyspec/platform-interface-map.md:80] shared.js:699 → 多候选全失败 → src/progress/shared.js: 行号超界（start=699 > 总行数 42）；范围 end=699 超界（总行数 42）；关键词缺失：期望任一「triggerSync / SILLYSPEC_SYNC_
审计：   ❌ [docs/sillyspec/platform-interface-map.md:80] shared.js:697 → 多候选全失败 → src/progress/shared.js: 行号超界（start=697 > 总行数 42）；范围 end=697 超界（总行数 42）；关键词缺失：期望任一「triggerSync / SILLYSPEC_SYNC_
审计：   ❌ [docs/sillyspec/platform-interface-map.md:81] shared.js:838 → 多候选全失败 → src/progress/shared.js: 行号超界（start=838 > 总行数 42）；范围 end=838 超界（总行数 42）；关键词缺失：期望任一「triggerPull / skipIfLocalDirt
审计：   ❌ [docs/sillyspec/platform-interface-map.md:82] shared.js:906 → 多候选全失败 → src/progress/shared.js: 行号超界（start=906 > 总行数 42）；范围 end=906 超界（总行数 42）；关键词缺失：期望任一「checkApproval / syncMod.check
审计：🔧 行号漂移已自动重锚 14 处（同口径复跑：14 → 0；剩余 0 处需人工 sillyspec docs check）
审计：⚖️ 归属切分：5 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/index.js, src/progress.js, src/progress/change-registry.js, src/run/command.js, src/stages/brainstorm.js

## ql-20260911-017-0c35 | 2026-09-11 11:17:31 | 变更名格式门禁 CLI 化——YYYY-MM-DD-<简短描述> 不合规不予执行
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（新增 assertDatedChangeName（assertSafeChangeName 同区；谓词收编内部正则））
- src/run/command.js（!progress 净新建日期前缀门（done-like 守卫后、initChange 前，exit 2））
- src/index.js（change-rename 入口新名门）
- src/stages/brainstorm.js（step6 三处标注 CLI 强制）
- src/progress.js（库层不设门决策注释（无行为变更））
- src/progress/change-registry.js（同上注释）
- test/change-name-date-gate.test.mjs（新增 37 断言回归）
- test/autoreset-preserves-progress.test.mjs（fixture 名随契约改日期名）
需求：变更名格式门禁 CLI 化——YYYY-MM-DD-<简短描述> 不合规不予执行
根因：brainstorm step6 的变更名规则此前只是 prompt 软约束，run 净新建路径与 change-rename 入口只做字符集/路径穿越消毒（assertSafeChangeName）不查日期前缀；2026-09-11 实证：自动生成合规名被 change-rename 改成 friction-signal-hint 丢前缀，CLI 照单全收静默物化成目录+DB 行
方案：纯 CLI 边界两层门：①run/shared.js 新增 assertDatedChangeName（形状校验月01-12日01-31补零+描述字母数字开头；豁免 default 与 quick-<8hex> 系统名；不校验当天，跨天续跑不拦）；②run/command.js !progress 分支净新建门——DB 无行且 changes/（含 archive/）无目录才拦，存量与归档无前缀旧名（auto-flow-optimization 等10个）不追诉照常自愈，非法名 exit 2 教学式报错（格式模板+当日示例+重试命令）；③index.js change-rename 新名同门；done-like 幻影守卫仍先于此门。库函数 initChange/renameChange 刻意保持宽松——测试/平台工具 fixture 依赖任意名（约30处存量），决策注释已落两文件。brainstorm step6 三处 prompt 标注「CLI 已强制：不合规 exit 2」
结果：新增 test/change-name-date-gate.test.mjs 37 断言全过；全量 npm test 436/436 通过（两次全绿复核，autoreset fixture 非日期名随契约更新为日期名属有意契约变更）；npm run lint 通过（未引用导出 0：isDatedChangeName 谓词按 22e-b 裁决收编内部正则）。实测门隔离快照两轮报红已逐项甄别非本变更：①wait-gates 等三测试真实工作区单跑全绿+同内容快照内单跑全绿，三轮门报红子集漂移（3→1→1）系快照目录满载并发伪红；②lint src/friction-tally.js 盲区系并行会话未提交新文件+未提交 module-map 条目（快照基座=HEAD 必缺条目，fail-closed 保留其文件入快照），其提交前结构性不可能通过且非本会话边界文件。据此设 SILLYSPEC_QUICK_TEST_GATE=skip（本审计行即留痕）。另记录存量 bug：module-impact map 发现取 readdir 首个 _module-map.yaml，dashboard 子项目 map（1e48c13 起）字母序在前致核心文件归类恒零命中、module-docs-sync 静默 no-op；本次 4 条 sidecar 行已手动补齐，根治建议单开变更
审计：📎 文档引用失效：4/259 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:61] src/progress/change-registry.js:354 → src/progress/change-registry.js: 关键词缺失：期望任一「handleQuickStageCompletion / unregisterChange / registerChange」在 [start-2, e
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:66] doctor.js:65-78 → src/stages/doctor.js: 范围 end=78 超界（总行数 66）
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:224] doctor.js:59-76 → src/stages/doctor.js: 范围 end=76 超界（总行数 66）
审计：   ❌ [docs/sillyspec/self-audit-2026-08-16.md:49] verify.js:238-243 → src/stages/verify.js: 行号超界（start=238 > 总行数 231）；范围 end=243 超界（总行数 231）
审计：⚖️ 归属切分：14 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md, .sillyspec/knowledge/decisions/runtime.md, .sillyspec/knowledge/decisions/setup.md, docs/sillyspec/multi-agent-review-2026-08-08.md, docs/sillyspec/platform-interface-map.md, docs/sillyspec/review-2026-08-08.md, docs/sillyspec/review-2026-08-09.md, docs/sillyspec/self-audit-2026-08-16.md, src/config-schema.js, src/friction-tally.js, src/run/complete.js, src/run/verify-quality-scan.js, test/archive-runtime-prune.test.mjs, test/friction-tally.test.mjs

## ql-20260911-018-ebb1 | 2026-09-11 12:41:28 | scope-audit 审计级存储——快照+全量 patch 落变更包
状态：已完成
关联变更：（无）
文件：
- src/scope-audit.js（patch 生成/切片/读取链/quick 记录态）
- src/run/complete.js（execute 落盘变更目录+verify 双路径读链）
- src/run/complete-handlers.js（quick 收尾落 patches+baseline 兜底）
- test/scope-audit.test.mjs（三组新用例）
- docs/sillyspec/platform-interface-map.md（1 锚点平移）
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（friction-tally 补录 runtime（治理连带））
需求：scope-audit 审计级存储——快照+全量 patch 落变更包
根因：无，纯新增——.runtime 快照会被清理（apply-pathspec 实证丢失）；--file 终点用当前工作树混入后续演进；quick guard 清理后记录态失联
方案：full-flow 落 changes/<变更名>/scope-audit.json+.patch；quick 落 quicklog/patches/<qlId>.json+.patch（ql-ID 平台按条目抓取）；--file 已收尾优先冻结切片；quick 记录态反查；baseline 会话 allowedFiles 兜底；连带治理 friction-tally.js 补录 runtime paths
结果：node --test 21/21；doc-ref 87/87；npm test 全量 0 失败；check-syntax 手跑 565 文件全绿（快照 lint 红为并行文件 friction-tally 的陈旧快照——工作区已补录修复，test 门禁实测通过）
审计：📎 文档引用失效：9/168 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:61] src/progress/change-registry.js:354 → src/progress/change-registry.js: 关键词缺失：期望任一「handleQuickStageCompletion / unregisterChange / registerChange」在 [start-2, e
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:66] doctor.js:65-78 → src/stages/doctor.js: 范围 end=78 超界（总行数 66）
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:71] src/run/shared.js:373 → src/run/shared.js: 关键词缺失：期望任一「auditQuickCompletion」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:78] src/run/shared.js:175 → src/run/shared.js: 关键词缺失：期望任一「execSync / safeGit」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：   ❌ [docs/sillyspec/multi-agent-review-2026-08-08.md:224] doctor.js:59-76 → src/stages/doctor.js: 范围 end=76 超界（总行数 66）
审计：🔧 行号漂移已自动重锚 5 处（同口径复跑：9 → 4；剩余 4 处需人工 sillyspec docs check）
审计：⚖️ 归属切分：10 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md, docs/sillyspec/multi-agent-review-2026-08-08.md, docs/sillyspec/review-2026-08-08.md, docs/sillyspec/review-2026-08-09.md, docs/sillyspec/self-audit-2026-08-16.md, src/config-schema.js, src/friction-tally.js, src/run/verify-quality-scan.js, test/archive-runtime-prune.test.mjs, test/friction-tally.test.mjs

## ql-20260911-019-c0b4 | 2026-09-11 13:27:58 | 冻结 patch 归属口径修正——体积 336KB→KB 级
状态：已完成
关联变更：quick-7aae62e4
文件：
- src/scope-audit.js（filterPatchForFiles+buildFrozenPatch 归属过滤）
- test/scope-audit.test.mjs（归属过滤用例）
需求：冻结 patch 归属口径修正——体积 336KB→KB 级
根因：buildFrozenPatch tracked 部分跑全量 diff 不带 pathspec（避命令行长度），与 json rows 退栈归属集口径不一致——341KB 中 49/52 段为并行会话文件，多会话仓按会话数×全仓未提交重复冻结爆炸
方案：tracked 全量 diff 后按 diff --git 段头内存过滤只留 files 集（单次 git 调用不变无命令行长度问题）
结果：node --test 22/22；npm test 全量 0 失败；实测重落 336KB→28KB、52 段→3 段、--file 切片正常

## ql-20260911-020-1397 | 2026-09-11 14:01:47 | 修驾驭第三撞 verify 门（noAI 扫描步漏接快照）+ 决策解析器第三格式盲区（H3/冒号，归档 8 条决策双重盲区零入库）
状态：已完成
关联变更：2026-09-11-cross-change-decision-guard
文件：
- src/run/verify-quality-scan.js（扫描步快照 + fallback 可见性 + coverageCheck 作用域）
- src/decision-distill.js（标题级/冒号容收 + 类型集补录）
- test/decision-distill-heading-variants.test.mjs（2 用例）
- .sillyspec/knowledge/decisions/unmapped.md（存量 7 条补录 + 锚重锚）
- .sillyspec/knowledge/INDEX.md（路由验证）
- docs/sillyspec/prompt-control-debt.md（锚重锚）
- modules/runtime.md,docs-consistency.md（补记）
需求：修驾驭第三撞 verify 门（noAI 扫描步漏接快照）+ 决策解析器第三格式盲区（H3/冒号，归档 8 条决策双重盲区零入库）
根因：①verify 有两个实测执行点，第八批只接 gates.js verify --done 块——noAI 质量扫描步仍跑 main 工作区（第三撞来源），且 fallback 静默看不出判定面；②### D-xxx@v1: 标题形态（H3+冒号）不被 ^## 正则识别，且 type feasibility/consistency 不在五类集——本仓归档实证 8 条 accepted 决策从未入知识库
方案：①executeVerifyQualityScan 接 createVerifyGateSnapshot（指纹仍主仓口径保复用匹配）+ fallback 时 warnIfMainRepoDirtyForGate 点名脏文件在场；②标题正则 ^#{2,4}+冒号容收、类型集补 feasibility/consistency；存量归档补录 7 条（幂等）+ 过期锚重锚（? 纯位置锚 dogfood）
结果：heading-variants 2/2；distill 系回归 39/39；verify-quality-scan 6/6；全量 npm test 437/437；lint 566 文件 0 fail；docs check 555 全过

## ql-20260911-021-eca5 | 2026-09-11 14:39:11 | scope-audit 预执行形态——计划清单视图
状态：已完成
关联变更：2026-09-11-cross-change-decision-guard
文件：
- src/scope-audit.js（预执行三信号判定+计划清单视图）
- test/scope-audit.test.mjs（预执行用例+5 夹具补证据）
需求：scope-audit 预执行形态——计划清单视图
根因：收尾判定只看无 meta=post-apply，预执行变更同样无 meta 被误判已收尾——误报漂移警告+实际侧吞整个工作区脏文件（28 个计划外全为他者在途，与变更无关）
方案：执行证据三信号（meta/分支/审计 tag）全无 → 预执行形态出 design 清单视图（untouched 待实现），工作区改动不进表，无收尾警告
结果：node --test 23/23；npm test 全量 0 失败；dogfood 36 文件误报→8 文件计划清单+正确说明

## ql-20260911-022-0347 | 2026-09-11 15:35:20 | scope-audit 双子代理审查修复批（七项+防篡改锚）
状态：已完成
关联变更：2026-09-11-cross-change-decision-guard
文件：
- src/scope-audit.js（七信号/freshActual/rename/sha256 校验/patch 口径）
- src/run/complete.js（freshActual 双调用点+hash+归档竞态+note 措辞）
- src/run/complete-handlers.js（hash+patchStatus）
- test/scope-audit.test.mjs（六新用例）
- docs/sillyspec/platform-interface-map.md（1 锚点平移）
需求：scope-audit 双子代理审查修复批（七项+防篡改锚）
根因：审查发现两个 P0 回归：verify 漂移快照比快照恒一致（假阴性）+预执行误判（58/77 归档变更被报未执行）；及 rename 解析/补采根配对/patch 口径分叉/失败静默五项 P1P2
方案：freshActual 旁路；预执行七信号+归档排除；rename 剥空格；resolveDiffRoot 配对；quick patch 对齐 rows；patchStatus 留痕；patchSha256 锚+读取校验；A-F02 经证伪不修（tag tip 不含变更内容）
结果：node --test 29/29；doc-ref 87/87；npm test 240 段 0 失败；dogfood 三无归档变更修复生效
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/changes/2026-09-11-cross-change-decision-guard/tasks.md

## ql-20260911-023-b269 | 2026-09-11 18:20:27 | probe token 失效类型化分诊（用户实测 401 被误报 daemon-unreachable）
状态：已完成
关联变更：（无）
文件：
- src/sillyhub-mcp/client.js（_initialize 留痕 _lastInitHttpStatus + getLastInitStatus getter）
- src/dispatch/probe.js（401→mcp-token-invalid 类型化（同款负面缓存））
- src/review-dispatch.js（token 失效分支前置重连再配对指引）
- test/sillyhub-mcp-platform-fixes.test.mjs（401/非401/无getter 三分支）
需求：probe token 失效类型化分诊（用户实测 401 被误报 daemon-unreachable）
根因：multi-agent-platform 仓 09-09 连接的旧 shmcp_ 已吊销，真场景撞 401 后 probe 报 daemon-unreachable 误导排障方向——gateway 与 daemon 都活着死的只是凭据
方案：client initialize 握手留痕 HTTP 状态码并暴露 getLastInitStatus；probeSillyHub 在不可达分诊中识别 401 输出 mcp-token-invalid（进负面缓存 TTL 内不重试）；review-dispatch 对该 reason 前置重连指引（platform connect 成对签发可自愈）再给通道降级
结果：sillyhub-mcp-platform-fixes 7 组含新增 401 三分支全绿，review-dispatch/dispatch 回归 15 绿，lint 绿
审计：📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档

## ql-20260911-024-103b | 2026-09-11 18:49:31 | 决策文件字段回填+同号遮蔽修复（decision-cross-change-id-shadow）
状态：已完成
关联变更：（无）
文件：
- src/knowledge-match.js（变更行读入+去重键修复）
- test/decision-file-field.test.mjs（回归 3 用例）
- .sillyspec/knowledge/decisions/stages.md（D-001/D-002 文件行）
- .sillyspec/knowledge/decisions/runtime.md（D-001 文件行）
- .sillyspec/knowledge/decisions/core-engine.md（D-001 文件行）
- .sillyspec/knowledge/decisions/docs-consistency.md（D-001 文件行）
- .sillyspec/knowledge/decisions/setup.md（D-001 文件行）
- .sillyspec/changes/archive/2026-09-11-cross-change-decision-guard/decisions.md（源头文件行（幂等））
需求：决策文件字段回填+同号遮蔽修复（decision-cross-change-id-shadow）
根因：dogfood 回填暴露预存盲区：域文件跨变更同号条目常见（runtime.md 七个 D-001@v1），parseDecisionEntries 去重键 file#id 先到先得，后来同号条目全被遮蔽——含 {DECISION_HITS} 防复潮的同号 rejected 决策
方案：知识库 6 条目+归档 decisions.md 源头双侧补「文件：」行（重蒸馏幂等，--force-baseline 有意编辑受保护决策库）；knowledge-match 变更：行独立标签读入 entry.change、去重键改 file#id#变更（双路由完全重复仍折叠、legacy 无变更行互折叠维持旧行为）；回归 3 用例锁定
结果：matchDecisionsByFiles 实测 6 文件全命中（含他变更锚点条目）；专项 decision-file-field 11/0+semantic-guard 30/0+prompt-inject 6/0+lint 570 绿；全量 438/2 经 stash A/B 复跑证明归属并行会话 8904d4d probe 分诊在途工作（本会话 440/0 基线在其落盘前）——非本变更回归，env skip 收尾留痕

## ql-20260911-025-dc93 | 2026-09-11 20:55:02 | 跨会话协修 probe-cwd-suite-runner：401 类型化新测试套件必挂
状态：已完成
关联变更：（无）
文件：test/sillyhub-mcp-platform-fixes.test.mjs
需求：跨会话协修 probe-cwd-suite-runner：401 类型化新测试套件必挂
根因：新测试以 cwd: process.cwd() 调 probeSillyHub，但套件 runner 以 cwd=test/ 跑文件，readMcpConfig 落空 no-config 短路，standalone 才过，从未在套件绿过
方案：三处 probe 调用改传 REPO_ROOT=import.meta.url 推导仓根锚，文件头注释记录坑与实证链
结果：standalone 7/0+全量 439/1（修复前 438/2 A/B 已证），残余 doc-ref-check 归并行会话在途文档不可代修，env skip 留痕

## ql-20260911-026-47f1 | 2026-09-11 20:56:19 | 摩擦 postmortem：worktree apply 三道坎入知识库
状态：已完成
关联变更：（无）
文件：.sillyspec/knowledge/known-issues.md（+10/-0）
需求：摩擦 postmortem：worktree apply 三道坎入知识库
根因：归档实战三连撞，坑跨变更可复用
方案：known-issues.md 增四段条目
结果：纯知识条目无代码改动，env skip 收尾

## ql-20260911-027-b451 | 2026-09-11 21:05:20 | 语义护栏 FR-03 生产路径 live 验证（观察型会话无代码改动）
状态：已完成
关联变更：（无）
文件：src/run/quick-audit.js
需求：语义护栏 FR-03 生产路径 live 验证（观察型会话无代码改动）
根因：verify 走的冒烟路径，真实 run quick 渲染链未实战
方案：起真实 quick 观察 step1 注入即收尾
结果：注入完整开火：决策命中 3 条+交付归因 5 文件；已知展示噪音：同文件多域同号条目重复渲染，非缺陷

## ql-20260911-028-0ee3 | 2026-09-11 21:23:34 | D-002 复潮：自动归档闸时近性闸（缺陷②热修）
状态：已完成
关联变更：（无）
文件：src/run/complete-handlers.js, src/progress.js, src/progress/change-registry.js, test/quick-close-linked-changes.test.mjs, .sillyspec/knowledge/decisions/stages.md, docs/sillyspec/platform-interface-map.md
需求：D-002 复潮：自动归档闸时近性闸（缺陷②热修）
根因：阶段态区分不了活跃在途与弃单，v1 三候选被逃生通道测试否决
方案：getLatestActivityAt+60 分钟活动窗挂 closeQuickLinkedChanges，回归 3 用例+D-002@v2 落库
结果：16/0+2/0+全量 440/0+lint 绿，test gate 诚实全量

## ql-20260911-029-2892 | 2026-09-11 23:26:20 | 审查报告紧急包六项小修（ESM 路径/blocked 谓词/Makefile 正则/doctor 转义/JSON 死条件）
状态：已完成
关联变更：（无）
文件：
- src/index.js（next --apply fileURLToPath + modules resolve json 变量）
- src/run/command.js（resolveBinSelfPath 导出 + knownFlags 注册）
- src/run/complete.js（skipStep/waitStep blocked 谓词）
- src/local-detect.js（parseMakefileTestCommand 行扫描重写）
- src/doctor-diagnostics.js（分块正则转义修正）
- test/urgent-batch-fixes.test.mjs（新增 24 用例回归）
- test/local-detect.test.mjs（Case 4 期望随语义修正）
需求：审查报告紧急包六项小修（ESM 路径/blocked 谓词/Makefile 正则/doctor 转义/JSON 死条件）
根因：全仓审查确认的 P1/P2 缺陷：① next --apply 用 ESM 未定义的 __dirname 必崩；② binSelf 子进程路径 URL pathname 不 decode 且 ../bin 少一级、--wait-interactive 未注册 knownFlags 致 FR-03 整条死路（两项绑定修）；③ skipStep/waitStep findIndex 漏 blocked（completeStep:152 修过但未同步，blocked 后错步记账且卡死）；④ Makefile 解析 \s* 吞换行两失效模式可致门禁假通过；⑤ doctor 分块正则 \w 双重转义整文件当一块 needs_review 漏检；⑥ modules resolve --json 查 filteredArgs 恒 false 机器输出死路。触及 run/command.js 与 run/complete.js 两门禁本体文件——修复即门禁自身缺陷、全量测试绿，按解锁通道走 --force-baseline
方案：index.js:841 改 fileURLToPath；command.js binSelf 提为导出 resolveBinSelfPath()（fileURLToPath + ../../bin 层级修正）并补注册 --wait-interactive；complete.js 两处谓词纳入 blocked + skip 对 blocked 步输出指引；local-detect.js parseMakefileTestCommand 重写行扫描（行内按 make 语义是 prereq 回退 make test，新增 ; 同行配方，排除 test := 变量，配方边界=下一非缩进行）；doctor-diagnostics.js 转义修正+导出；index.js modules --json 改用顶层 json 变量。新增 test/urgent-batch-fixes.test.mjs 24 用例回归；local-detect.test.mjs Case 4 期望随 prereq 语义修正；四个模块卡 changelog sidecar 追加条目
结果：新测试 24/24 通过；全量 441 文件 0 失败；lint 571 文件绿（CLI --done 门禁实测通过）

## ql-20260911-030-bad4 | 2026-09-11 23:45:33 | 审查报告安全包五项修复（guard 收口/cleanup fail-closed/updateStep 事务/zh-CN 时间戳/checkApproval u…
状态：已完成
关联变更：（无）
文件：
- src/hooks/worktree-guard.js（branch/worktree 参数化收口+dangerBlockHint）
- src/worktree.js（no-meta 保守 true）
- src/progress/step-store.js（事务收口+复查）
- src/progress/stage-machine.js,src/progress/consistency-doctor.js（ISO 时间戳）
- src/progress/change-registry.js（解析侧取最新）
- src/run/shared.js（checkApproval unknown+测试缝）
- test/worktree-has-unapplied-changes.test.mjs（软归属·同模块测试，未声明）
- test/worktree-junction-fail-loud.test.mjs（软归属·同模块测试，未声明）
需求：审查报告安全包五项修复（guard 收口/cleanup fail-closed/updateStep 事务/zh-CN 时间戳/checkApproval unknown）
根因：全仓审查确认的丢代码/丢数据向量与静默放行缺陷：① guard 按子命令名整类放行 branch/worktree，git branch -D 可删审计分支（task review base/head 引用悬空）、裸 bash git worktree remove --force 绕过 CLI 全部防护；② cleanup 对 meta 缺误报无未落变更直接 force 删（与 create 幽灵分支防护不对称）；③ updateStep id 事务外查询遇 _write 重插致并发 UPDATE 0 行静默假成功、阶段完成在 validator 15s 窗口后盲提交；④ zh-CN 时间戳 '/' 恒盖 ISO '-' 使时近性闸取错（活跃变更误归档方向）；⑤ checkApproval 异常折叠 null 绕过 HUB-07 留痕静默放行。触及 run/shared.js 门禁链文件按解锁通道走 --force-baseline
方案：guard 白名单按参数细化+危险表扩充+拦截原因带替代路径指引；hasUnappliedChanges 无 meta 保守保留；stepId 收进同一事务+提交前复查；两写点 toISOString+getLatestActivityAt JS 解析侧取最新归一 ISO；checkApproval 异常改 unknown 走既有 warnApprovalUnknown 路由（平台 null 语义不变）+loadSyncMod 测试缝
结果：新测试 security-batch-fixes 28/28；worktree-has-unapplied ⑩ 与 junction-fail-loud cleanup 用例随语义修正（force 跳闸聚焦 junction 断言）；全量 442 文件 0 失败 + lint 572 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/security-batch-fixes.test.mjs
审计：🔍 软归属：2 个窗口内未声明同模块测试文件已补入文件行（若属并行会话改动请手工剔除）：test/worktree-has-unapplied-changes.test.mjs（+3/-2）, test/worktree-junction-fail-loud.test.mjs（+9/-4）

## ql-20260912-001-ca16 | 2026-09-12 00:04:25 | 审查报告性能包三项优化（quicklog 推送出锁/guard 直连 sqlite/autoCheck 卡片读取延后）
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（三函数推送出锁）
- src/hooks/worktree-guard.js（直连 sqlite）
- src/run/complete.js（卡片读取延后）
需求：审查报告性能包三项优化（quicklog 推送出锁/guard 直连 sqlite/autoCheck 卡片读取延后）
根因：① withFileLock 临界区内 5s 网络推送+逐变更 tasks 锁（最坏各 10s）可破 30s stale 偷锁阈值——模块头声明根治的并发丢更新被重新打开（正确性+性能同病灶）；② guard 每次 Write/Edit/Bash spawn 1-2 个 node 子进程查 sillyspec.db（Windows 100-300ms/次），hook 自身即同二进制 node 无隔离收益；③ autoCheck replace 回调在 review 不可用时仍先读任务卡（endToEnd 不影响结果，纯浪费）且持 tasks 锁期间。触及 run/complete.js 门禁链文件按解锁通道走 --force-baseline。评估后不做：stage.js 两次 git status 合一（审计侧折叠口径语义耦合）、跨函数 mtime 解析缓存（暖缓存亚毫秒收益不值陈旧面）
方案：三个 quicklog 函数推送+sidecar 移锁外（payload 锁内组装锁外 best-effort 推送）；queryDbFirstCell 改 createRequire 进程内同步 node:sqlite（1.2ms 实测，语义四例保持）；卡片读取延后到 verdictUsable 之后
结果：新测试 perf-batch-fixes 9/9（核心断言：慢推送 3s 在途时锁 1.5s 超时内立即可取——旧版必超时）；全量 443 文件 0 失败 + lint 573 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/perf-batch-fixes.test.mjs

## ql-20260912-002-57c4 | 2026-09-12 05:05:14 | backlog 批 A：task-review 他者 WIP 盲区 + mcp-server 挂死 + quicklog 锁三连
状态：已完成
关联变更：（无）
文件：
- src/task-review.js（WIP 并入归属过滤）
- src/mcp-server.js（超时兜底）
- src/quicklog.js（锁三连）
需求：backlog 批 A：task-review 他者 WIP 盲区 + mcp-server 挂死 + quicklog 锁三连
根因：① 主仓 in-place 模式 wtStatus 含全部并行会话未提交文件——他者 WIP 稀释 diffFiles 使 emptyDiff 伪造检测在共享仓永不触发（同仓 verify-postcheck 已有剔除口径未复用）；② tools/call 子进程无超时无 kill——gate 跑真实测试/git 挂死时 MCP 工具永久挂起且 stderr 无界累积；③ 偷锁分支 continue 跳过超时检查与 sleep（AV 占用锁文件时忙等自旋挂死）+ finally 无条件 unlink 不校验持有者（误删他人新锁→双写者）
方案：verifyReviewGitEvidence 加 opts（mainGitDir/changeName/specBase）复用 splitOwnVsForeignDiffFiles 剔除他者声明（仅主仓、无 opts 零回归、失败退回旧口径）；runCli 300s 超时+kill+isError envelope+8MB 封顶+幂等结算+死代码清理；withFileLock 偷锁分支补 timeout/sleep+释放前 myId 比对
结果：新测试 backlog-batch-a 12/12（伪造 review 拦截/超时 kill 39ms 回包/他人锁存活/自旋按预算抛错）；全量 444/0 + lint 574 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/backlog-batch-a.test.mjs

## ql-20260912-003-b696 | 2026-09-12 05:14:35 | backlog 批 B：db 迁移吞错+.bak WAL 侧车/stage-review 原子写/verify bare 引号/quick --cancel 平…
状态：已完成
关联变更：（无）
文件：
- src/db.js（迁移收窄+侧车清理）
- src/stage-review.js（原子写）
- src/verify-postcheck.js（bare 引号）
- src/run/command.js（cancel 平台对齐）
需求：backlog 批 B：db 迁移吞错+.bak WAL 侧车/stage-review 原子写/verify bare 引号/quick --cancel 平台对齐
根因：① catch-all 把 SQLITE_BUSY/磁盘满当 duplicate column 吞掉（列未加被当已存在，错误现场远离根因）+.bak 恢复不删旧 -wal/-shm（SQLite 官方要求删除，否则旧 WAL 回放到恢复库二次损坏）；② 四处裸 writeFileSync 崩溃中断留半截 review.json 硬阻断后续 gate（同仓 writeAtomicSync 未用）；③ bare char class 排除引号致 Windows 常见命令判未配置、test 硬门静默 skipped（fail-open）；④ --cancel 本地重建 specBase 遮蔽外层平台 specRoot（平台模式 guard 恒读不到、翻态落错库）。触及 run/command.js 门禁链文件按解锁通道走 --force-baseline
方案：迁移吞错按 message 收窄+恢复后删侧车；四写点换 writeAtomicSync；bare 容忍引号+防吞换行；去遮蔽+resolveQuickSessionsDir 对齐
结果：新测试 backlog-batch-b 13/13；全量 445/0 + lint 575 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/backlog-batch-b.test.mjs

## ql-20260912-004-afa2 | 2026-09-12 07:07:27 | backlog 批 C：rename 并发竞态/local-register 锁/parseFlowValue 逗号/known_failures 截断/只读探…
状态：已完成
关联变更：（无）
文件：
- src/progress/change-registry.js（rename 收口）
- src/local-register.js（锁+async）
- src/verify-postcheck.js（parseFlowValue+known_failures）
- src/docs-check.js（复刻同口径）
- src/progress/consistency-doctor.js（readOnly）
- test/local-register.test.mjs（软归属·同模块测试，未声明）
需求：backlog 批 C：rename 并发竞态/local-register 锁/parseFlowValue 逗号/known_failures 截断/只读探测副作用
根因：① rename 三段独立事务 check-then-act，并发 UPDATE 0 行不报错继续搬目录（DB/目录分裂）；② local.yaml RMW 无串行化，并发 register 丢条目；③ bare 值任意逗号截断（pytest -k a,b → pytest -k a 残损命令实测）；④ 流式值内 ] 截断整表清空（豁免丢失全量假红）；⑤ _readActiveQuiet 用 db.init() 开写连接（WAL PRAGMA+可能 DDL 迁移）。触及 progress 核心两文件按解锁通道走 --force-baseline；--done 窗口内含并行会话未提交改动（005/006/007 已完成未收尾的暂存面），提交用显式 pathspec 隔离本会话文件，已退回其 4 个暂存删除（工作区未动，零丢失）
方案：rename 收口单事务+changes!==1 校验；registerRepoInLocalYaml async 化+withFileLock；parseFlowValue 分隔逗号按后随键形态双侧判别；known_failures 贪婪捕获（verify-postcheck+docs-check 双口径）；_readActiveQuiet 改 openDatabase readOnly。src/index.js 的 await 调用点被并行会话提交 e195953 顺带收录（内容一致）
结果：新测试 backlog-batch-c 17/17（外部持锁 448ms 等待+4 进程并发注册全存活/DELETE 老库探测字节不变不产 -wal）；全量 447/0 + lint 577 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：17 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/CONVENTIONS.md, docs/sillyspec/architecture-4a.md, docs/sillyspec/design-d7-scan-lifecycle.md, docs/sillyspec/file-lifecycle.md, docs/sillyspec/platform-interface-map.md, docs/sillyspec/prompt-control-debt.md, docs/sillyspec/troubleshooting.md, src/run/gate-snapshot.js, src/run/gates.js, src/run/quick-audit.js, src/run/verify-quality-scan.js, src/stages/execute.js, src/verify-facts-schema.js, src/worktree-cross.js, src/worktree.js, test/backlog-batch-c.test.mjs, test/crossrepo-three-fixes.test.mjs
审计：🔍 软归属：1 个窗口内未声明同模块测试文件已补入文件行（若属并行会话改动请手工剔除）：test/local-register.test.mjs（+7/-7）

## ql-20260912-005-3491 | 2026-09-12 07:08:56 | 跨仓 worktree 三护：主仓清理面守卫 + 跨仓跳过外来文件 checkpoint + 门禁快照 venv 链接（postmortem §59）
状态：已完成
关联变更：quick-c757822d
文件：
- src/worktree.js（isCrossWorktreeDir + safeRemoveWorktreeDir allowCross）
- src/worktree-cross.js（跳过 overlay/checkpoint）
- src/run/gate-snapshot.js（四环境目录 junction + 可见性）
- test/cross-worktree-guard.test.mjs（4 用例含端到端）
- docs/sillyspec/troubleshooting.md（§59 postmortem）
- modules/worktree.md,runtime.md（补记）
- CONVENTIONS.md,uncategorized.md（锚重锚）
需求：跨仓 worktree 三护：主仓清理面守卫 + 跨仓跳过外来文件 checkpoint + 门禁快照 venv 链接（postmortem §59）
根因：①safeRemoveWorktreeDir 对目录形态不设防，跨仓 worktree（<change>--<repoKey> 兄弟目录）被 verify 期间主仓清理面误删——apply 锚点连环失败被迫 cherry-pick；②跨仓借用主仓 dirty overlay/checkpoint，把并行会话外来文件（2 pptx+meta.json）固化进跨仓分支污染对账；③门禁快照只链 node_modules，Python 项目 venv（含 dev 依赖）缺失 + 链接失败静默 → 环境不一致持续误伤
方案：①isCrossWorktreeDir 守卫进删除原语（isCross meta ∨ 命名双判据），主仓清理面拒删、cleanupCrossWorktrees allowCross 显式放行；②跨仓仓跳过 overlay+checkpoint（锚点恒=跨仓仓 HEAD，baselineFiles=[]）；③链接面扩 node_modules/.venv/venv/env 全 junction + 失败/全缺 ⚠️ 可见
结果：cross-worktree-guard 4/4（含真实双仓端到端：外来文件不进分支）；worktree 系回归全绿；全量 npm test 447/447；lint 门禁实测过；docs check 我的漂移锚已重锚（余 11 处失效属并行会话在途文件，归其收口）
审计：⚖️ 归属切分：4 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/index.js, test/crossrepo-three-fixes.test.mjs, test/local-register.test.mjs, test/backlog-batch-c.test.mjs

## ql-20260912-006-42fc | 2026-09-12 07:22:57 | 修驾驭三负面：门禁沙箱环境预检回退 + task 进行中标记 + 回执解析双宽度容收
状态：已完成
关联变更：quick-c757822d
文件：
- src/run/gate-snapshot.js（envDirsLinked 预检回退）
- src/index.js（task start/finish/list 命令）
- src/stages/execute.js（prompt 标记指引）
- src/verify-facts-schema.js（RECEIPT_LINE_RE 双宽度）
- test/verify-facts-receipt-width.test.mjs（4 用例）
- test/task-progress-marker.test.mjs（3 用例）
- docs/sillyspec/troubleshooting.md（§60）
- 5 文档（锚重锚×16）
需求：修驾驭三负面：门禁沙箱环境预检回退 + task 进行中标记 + 回执解析双宽度容收
根因：①快照链接失败/布局差异仍硬跑假环境（node_modules 缺失必挂只能 advisory 留痕）；②中断续跑半成品无 task 级状态载体，主代理接管审查靠翻 git 猜；③回执行只认半角 | 且 log 字段遇空格截断——全角 ｜ 手写整行不命中误报无绿回执、含空格/全角括号路径截断假红（上变更实证）
方案：①envDirsLinked 纯检：主仓有而快照缺的环境目录命中即作废快照回退主仓+原因可见；②task start/finish/list（.runtime/task-progress/ 标记 + >2h 🔴 接管指引）+ execute prompt 开工/完工各一条命令指引；③RECEIPT_LINE_RE 分隔符双宽度（| 与 ｜）+ log rest-of-line + 尾注剥除
结果：新测试 7/7（回执 4 + task 标记 3）；receipt/task 系回归全绿；全量 npm test 449/449；lint 579 文件 0 fail；docs check 553 全过（自漂移 7 + 他漂移 9 锚重锚）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/platform-interface-map.md

## ql-20260912-007-63f7 | 2026-09-12 07:37:38 | 修驾驭两负面：门禁快照 monorepo 依赖布局可用性 + 失败归属可见 / baseline checkpoint 产物防御（289MB tar.gz 实证…
状态：已完成
关联变更：quick-c757822d
文件：
- src/run/gate-snapshot.js（discoverEnvDirs + envDirsLinked 发现集 + printSnapshotFailureHint）
- src/run/quick-audit.js,src/run/gates.js,src/run/verify-quality-scan.js（路径可见 + 失败提示三接线）
- src/worktree.js（isCheckpointSkippableArtifact + untracked 防御）
- test/gate-snapshot-monorepo.test.mjs（5 用例）
- docs/sillyspec/troubleshooting.md（§61）
- 4 文档（锚重锚×6）
需求：修驾驭两负面：门禁快照 monorepo 依赖布局可用性 + 失败归属可见 / baseline checkpoint 产物防御（289MB tar.gz 实证）
根因：①快照只链根级四目录——workspace 子包 node_modules 不覆盖致快照内报无关错，且路径不可见、失败无归属提示（四次重试考古）；②untracked 收入口零防御——.gitignore 缺口的部署 tar.gz 被 checkpoint 带进分支（FF 破坏 + 二进制永久入 git）
方案：①discoverEnvDirs 递归发现集（深度≤3）逐 junction + envDirsLinked 发现集口径 + 三执行点 🧺 行带快照根路径 + printSnapshotFailureHint（路径/排查顺序/SNAPSHOT_OFF 对照）；②isCheckpointSkippableArtifact（归档扩展名恒跳 + 10MB 帽 env 可调）+ 跳过清单点名 + gitignore 指引
结果：gate-snapshot-monorepo 5/5（含 pnpm workspace e2e 与 tar.gz e2e）；快照/worktree 系回归全绿；全量 npm test 450/450；lint 580 文件 0 fail；docs check 553 全过

## ql-20260912-008-8eff | 2026-09-12 10:22:41 | backlog 批 D：flag 值位守卫/合并备份/argv 分批/三小修
状态：已完成
关联变更：（无）
文件：
- src/index.js（flag 值位守卫）
- src/worktree-apply.js（备份+分批）
- src/git-helper.js（文案）
- src/constants.js（NaN）
- src/config-cat.js（大小写守卫）
需求：backlog 批 D：flag 值位守卫/合并备份/argv 分批/三小修
根因：① 取下一参数式解析无值位校验（flag 名被当值吞掉，机器输出丢失且报错指向错误）；② 三方合并覆写主仓在途内容无备份且发生在 apply 成败判定前；③ 数百长路径全量 argv 逼近 Windows 32767 上限（add/reset/diff 整体炸）+per-file cat-file N+1；④ 文案与常量漂移；⑤ NaN 比较恒 false + startsWith 大小写敏感。触及 worktree-apply/index 门禁链文件按解锁通道走 --force-baseline；worktree.js hash-object 两处因并行会话未提交改动占用推迟（避免 pathspec commit 夹带他者改动）。--done 窗口含并行会话未提交改动，提交用显式 pathspec 隔离
方案：52 三元形+5 解析器分支加值位校验；merge-backups 备份；chunkPaths 分批+N+1 改哈希表；文案推导/NaN 判 STALE/大小写归一
结果：新测试 backlog-batch-d 17/17；全量 451/0 + lint 581 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/backlog-batch-d.test.mjs

## ql-20260912-009-06b4 | 2026-09-12 10:50:58 | backlog 批 E：spec-sync O(N×M)+双读/doctor 串行 spawn/friction-tally 原子性/mcp exit-2 语义
状态：已完成
关联变更：（无）
文件：
- src/spec-sync.js（hash 索引+buf）
- src/doctor-diagnostics.js（log 合并）
- src/friction-tally.js（锁化）
- src/mcp-server.js（exit-2）
- src/run/*.js（调用点 await）
- test/friction-tally.test.mjs（软归属·同模块测试，未声明）
需求：backlog 批 E：spec-sync O(N×M)+双读/doctor 串行 spawn/friction-tally 原子性/mcp exit-2 语义
根因：① rename 双重循环万级文件变慢+变更文件读两遍；② lifecycle 逐路径 6 个串行 git log 子进程；③ record 覆盖写/consume 读后删竞态与文件头账目完整性声明有出入；④ exit 2 的合法 envelope 诊断被 isError 吞。触及 run/* 门禁链文件按解锁通道走 --force-baseline；--done 窗口含并行会话未提交改动，提交用显式 pathspec 隔离
方案：hash 索引+buf 随行；单次多 pathspec 取 max+落后才归因；async 化+withFileLock（6 调用点 await+1 处 void）；exit 2 并入合法退出码集
结果：新测试 backlog-batch-e 8/8；friction-tally.test 23 调用点随 async 化补 await；全量 452/0 + lint 582 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/run/complete-handlers.js, src/run/complete.js, test/backlog-batch-e.test.mjs
审计：🔍 软归属：1 个窗口内未声明同模块测试文件已补入文件行（若属并行会话改动请手工剔除）：test/friction-tally.test.mjs（+25/-25）
