
## ql-20260818-007-1c7a | 2026-08-18 09:07:03 | quick 需求字段写法与标题截断规则前置透明
状态：已完成
关联变更：（无）
文件：
- src/stages/quick.js（step3 模板行+截断规则警示段+核对段对齐、step1 ℹ️ 预告）
- docs/prompt/_extracted.json（重跑 _extract.mjs 刷新）
- docs/prompt/quick.md（step1/step3 fence 按提取稿逐字替换）
- .claude/skills/sillyspec-quick/SKILL.md（四字段模板补短标题规则、核对顺序两处同步）
需求：quick 需求字段写法与标题截断规则前置透明
根因：step3 模板把「需求：」指引为「用户/任务要什么」邀请写完整需求长句，而 extractTitleFromResult（quicklog.js）提取标题时截到首个标点（，。；,;）+ 超 80 字截断——按模板写必然截成语义不完整的状语前半段，触发事后手动精修（规则 16 补救）；「标题从需求：提取」虽在 step1 ℹ️ 和事后核对段出现，但都没说「所以需求：要写短」。
方案：quick.js 三处前置透明——step3 模板行改「一句话语义化短标题（写「改了什么」）」+ 模板块下方警示段写明截断规则（截到首个标点、80 字上限、长句截状语示例、背景放根因/方案）+ step3 核对段对齐「写短句则无需手改」+ step1 ℹ️ 预告；同步 _extracted.json / docs/prompt/quick.md 镜像（脚本带新旧字符串 sanity 断言）/ sillyspec-quick SKILL 两处。说明文字全放标签行外规避嵌套冒号坑。
结果：npm test 220/0 EXIT=0、lint 310 文件通过、docs check 417/417 全绿；file-lifecycle 不涉及（纯 prompt 文案无步骤/文件类型/流转变更）。

## ql-20260818-008-0b78 | 2026-08-18 12:43:07 | 平台同步三缺陷修复——base_ts 断链、run 命令 pull 漏接线、同步失败静默无线索
状态：已完成
关联变更：（无）
文件：
- src/progress/change-registry.js（_updatePlatformLastSync 增 syncedTs 参数，COALESCE 补写 base_ts 列 last_synced_platform_ts——原只写展示列 platform_last_sync）
- src/progress.js（facade 补 syncedTs 透传——曾丢参致列永不写入）
- src/sync.js（push 成功传 ack（回执 last_pushed_at 优先/缺省 X-SillySpec-Pushed-At）；pull 增 skipIfLocalDirty 守卫；syncDocuments manual/auto 分级；syncModule 与导出 wrapper 的 sync-docs 走 manual）
- src/run/shared.js（triggerPull/triggerPullActiveChange 透传 skipIfLocalDirty + 注入时机注释对齐）
- src/index.js（case 'run' 补 triggerPullActiveChange 下行接线——原只接顶层 stage 别名）
- src/spec-sync.js（清单 GET/同步 POST 非 2xx + 网络异常四条失败路径 debugLog 升 console.warn）
- test/platform-sync-base-ts-advance.test.mjs（新增：push 推进列/回执优先/下次携带 Base-Ts/本地领先守卫/自动路径守卫/run 命令 CLI 子进程端到端，6 组）
- test/platform-sync-failure-visibility.test.mjs（新增：spec-sync 失败 warn 可见/四件套缺失自动静默/手动 warn 措辞，3 组）
- docs/sillyspec/platform-interface-map.md（80 处 file:line 引用随源码重锚；stage 命令启动触发点补 case 'run'）
需求：平台同步三缺陷修复——base_ts 断链、run 命令 pull 漏接线、同步失败静默无线索
根因：①_updatePlatformLastSync 只写 platform_last_sync 展示列而 sync/pull 读 last_synced_platform_ts，写 A 读 B 致 CLI 直跑该列恒 NULL，乐观锁/脏度检测/behind 标记全失效（progress.js facade 还丢第三个参数）；②triggerPullActiveChange 只接顶层 stage 别名块，case 'run' 漏接与注释宣称语义分裂，且 pull 在本地领先场景会 import 平台旧快照覆盖本地进度；③spec-sync 树同步四条失败路径全 debugLog（SILLYSPEC_DEBUG_SYNC 才可见），四件套缺失在早期打误导性 warn——multi-agent-platform 实证 design/decisions 迟到 27 分钟、plan.md 迟到 8 分钟且无任何日志线索
方案：push 成功后以平台回执 last_pushed_at（缺省回退本次 X-SillySpec-Pushed-At，与后端存储精确一致）推进 last_synced_platform_ts；case 'run' 补 triggerPullActiveChange + pull 增 skipIfLocalDirty 保守守卫（本地脏跳过 import，手动 platform pull 不变）；spec-sync 失败升 console.warn 带下次重试提示、syncDocuments 四件套缺失自动路径降 debug 手动保留 warn 且说清范围
结果：全部落地——新增 platform-sync-base-ts-advance（6 组含 run 命令 CLI 子进程端到端）与 platform-sync-failure-visibility（3 组）先红后绿；npm test 222 文件 0 失败；npm run lint 312 文件通过；platform-interface-map.md 80 处 file:line 引用重锚全过（doc-ref-check）

## ql-20260818-009-9443 | 2026-08-18 13:26:28 | 活文档漂移 advisory 精度对齐 docs check——只报真失效引用
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（matchInvalidRefsToChanged 新纯函数 + 漂移块升级 runDocsCheck 真校验）
- src/run/quick-audit.js（渲染改列 drift.invalid 逐条 doc:line ref reason）
- src/config-schema.js（living-docs desc 对齐真失效口径）
- test/docs-living-drift-hint.test.mjs（改写 20 断言（真失效命中与全过零输出））
- docs/sillyspec/troubleshooting.md（坑 10 补 2026-08-18 精度对齐说明）
- docs/sillyspec/prompt-control-debt.md（cc-⑤ 锚点 546 改 560）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（ql-008 遗留 sync.js 四处锚点修正）
- .sillyspec/docs/sillyspec/modules/runtime.md（模块卡同步）
需求：活文档漂移 advisory 精度对齐 docs check——只报真失效引用
根因：原 livingDocDrift 是路径级「被引用即提示」口径，本次改动 src 文件被活文档引用就告警，但行号锚未真断时是误报（上会话实证 advisory 报漂移而 docs check 417 处全过），两套机制结论不同步
方案：auditQuickCompletion 复用 runDocsCheck 分层真校验（存在加行界加关键词窗口），matchLivingDocRefs 降为预过滤省 IO，新增 matchInvalidRefsToChanged 纯函数把 invalid 引用剥行号后按三形态匹配改动文件，drift.invalid 逐条带 doc 行号 ref 与原因，渲染列出前 8 条，全过零输出；顺手修 ql-008 遗留的 sync.js 四处锚点漂移（checkApproval 546 到 560 与 approve reject 入口 1046 1050 到 1071 1075）
结果：docs check 417 处全绿；新增改写测试 20 断言全过（真失效命中、全过零输出、关键词窗口失败、invalid 剥行号匹配、渲染零噪声回归）；npm test 222 文件 0 失败、lint 312 文件通过
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md, docs/sillyspec/prompt-control-debt.md

## ql-20260818-010-1197 | 2026-08-18 13:39:42 | quick CLI 未知 flag 语义别名定向提示（--title 等不再误导猜 --files）
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（新增 FLAG_SEMANTIC_HINTS + 语义提示优先于 did-you-mean）
- test/run-exit-codes.test.mjs（--title/--name/--output2 三回归断言）
- docs/sillyspec/platform-interface-map.md（command.js/shared.js 锚点随插入/并行提交重锚）
- .sillyspec/docs/sillyspec/modules/runtime.md（补 ql-010 变更索引与 updated_at）
需求：quick CLI 未知 flag 语义别名定向提示（--title 等不再误导猜 --files，而指向 --output「需求：」自动提取或 --file-notes）。
根因：did-you-mean 按编辑距离形近猜测，对语义别名（如 --title 想写标题）给出错误建议。
方案：在 command.js FLAG_SEMANTIC_HINTS 登记 10 组常见别名，未知 flag 命中时打印定向提示替代 did-you-mean。
结果：npm test 223 文件全过；doc-ref-check 80/80 通过；lint 313 文件通过；新增 test/run-exit-codes.test.mjs 3 条断言。
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/run/shared.js, src/sync.js, test/platform-sync-quick-session-spectree.test.mjs

## ql-20260818-011-9ae6 | 2026-08-18 13:47:43 | quick 会话收尾补平台 spec 树同步
状态：已完成
关联变更：（无）
文件：docs/sillyspec/platform-interface-map.md, src/run/shared.js, src/sync.js, test/platform-sync-quick-session-spectree.test.mjs
需求：quick 会话收尾补平台 spec 树同步
根因：quick-<hex8> 会话按设计无 changes/<name>/ 实体目录，triggerSync 的 existsSync 门与 sync() 第二道门都锚定变更目录存在，把 spec 树增量（QUICKLOG/模块文档唯一上行通道）一并误伤
方案：triggerSync 识别 QUICK_SID_RE 会话降级只调新增 syncSpecTreeOnly（跳过 progress/四件套防平台孤儿行），非 quick 形态维持静默防拼写噪音
结果：新增 platform-sync-quick-session-spectree 4 组先红后绿；npm test 223 文件 0 失败；lint 313 文件过；doc-ref-check 80/80

## ql-20260818-012-60e7 | 2026-08-18 14:46:38 | 仓库新增 .gitattributes 强制文本文件使用 LF 并清理现有 CRLF
状态：已完成
关联变更：（无）
文件：
- .gitattributes（强制所有文本文件使用 LF 换行）
- .sillyspec/quicklog/QUICKLOG-qinyi.md（ql-20260818-012-60e7 记录）
需求：仓库新增 .gitattributes 强制文本文件使用 LF 并清理现有 CRLF。
根因：缺少 eol 策略时 Windows 系统级 core.autocrlf=true 导致工作区文本文件为 CRLF，git 对新增或修改文本文件给出 LF 转 CRLF 警告。
方案：新增 .gitattributes 并写入 * text=auto eol=lf 作为唯一换行策略；通过 git ls-files 定位 484 个 w/crlf 文件，Node 脚本将其 CRLF 替换为 LF，再执行 git add --renormalize . 刷新索引消除幻影修改。
结果：.gitattributes 与 QUICKLOG-qinyi.md 已暂存；git ls-files --eol 已无任何 w/crlf；工作区 484 个文本文件已归一化为 LF；未触及 src/test 文件，无需执行 npm test/lint；并发目录 .sillyspec/changes/2026-08-18-platform-map-auto-anchors/ 与本变更无关，未暂存。

## ql-20260818-013-bd63 | 2026-08-18 16:58:11 | sync 归档后最终状态未推平台修复——目录检查硬拦
状态：已完成
关联变更：（无）
文件：
- src/sync.js（移除变更目录 existsSync 硬拦改为 warn 继续走 DB 路径（serializeForSync 从 DB 读不依赖目录））
需求：sync 归档后最终状态未推平台修复——目录检查硬拦
根因：archive 步骤4确认归档把变更目录移到 archive/ 后，sync.js sync() 的 existsSync(changeDir) 检查硬拦 return，步骤4-5 的完成状态永远推不到平台，平台停留在最后一次成功同步的 3/5
方案：移除 existsSync 硬拦改为 console.warn 继续走 serializeForSync 从 DB 读最终状态推平台（数据源是 SQLite 非文件系统目录，目录检查是多余前置）
结果：npm test 223 文件全过 0 失败 + npm run lint 通过（313 文件语法+内容规则）

## ql-20260819-001-6a9e | 2026-08-19 09:02:58 | platform sync 冲突静默死亡三缺陷修复（横幅警告/自竞态防御/last_pusher 空）
状态：已完成
关联变更：（无）
文件：
- src/sync.js（X-SillySpec-User git 兜底 + 409/pull 冲突醒目横幅 + pull 自竞态重读防御）
- test/platform-sync-silent-death.test.mjs（新增三修复点验收测试（user 兜底/冲突横幅/自竞态））
- test/platform-sync-push-header.test.mjs（断言更新到新契约（无 user → git 兜底非缺失））
- docs/sillyspec/platform-interface-map.md（sync.js 行号锚点随源码插入偏移同步）
需求：platform sync 冲突静默死亡三缺陷修复（横幅警告/自竞态防御/last_pusher 空）
根因：冲突仅单行 warn 易淹没、pull 判冲突的 base_ts 首读撞 push 回填落库前窗口会误判自竞态、X-SillySpec-User 仅 local.yaml 显式配置才发送致平台 last_pusher 恒空
方案：push/pull 冲突升级醒目横幅含 resolve 三步指引；pull 判冲突前重读 base_ts 已推进则自愈；user 兜底 git user.name>env（与 connect 写入侧同口径）
结果：新增 platform-sync-silent-death 测试 11 断言全绿，存量 sync 测试零回归（push-header 断言随契约更新），lint 通过，doc-ref-check 80 处引用全绿

## ql-20260819-002-8f16 | 2026-08-19 09:30:15 | resolve keep-local 用旧冲突文件 ts 回退已推进 base_ts 修复
状态：已完成
关联变更：（无）
文件：
- src/sync.js（resolve keep-local base_ts 单调防回退（MAX+COALESCE NULL 兜底））
- test/sync-conflict-statemachine.test.mjs（F/G 两场景（防回退 + NULL 直取））
需求：resolve keep-local 用旧冲突文件 ts 回退已推进 base_ts 修复
根因：keep-local 无条件覆盖 last_synced_platform_ts，冲突文件是历史快照其 ts 可能早于 DB 已回填值，回退后下次 sync 必撞 409 再落冲突（恢复实测二轮才收敛）
方案：UPDATE 用 MAX(?, COALESCE(col, ?)) 单调只推进不回退，COALESCE 兜 SQLite 标量 MAX(x, NULL) 恒 NULL 的首同步边界
结果：statemachine 测试 F（06:00 不被 05:00 回退）/G（NULL 直取平台 ts）全过，7 个 sync 相关测试全绿，npm test 全量 exit=0，lint 通过

## ql-20260819-003-9d6f | 2026-08-19 10:43:13 | brainstorm HTML 原型指引改高保真可复用——删 ASCII 线框低保真三条
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（分段展示设计 step 原型生成节三条低保真指引改高保真两条）
- docs/prompt/_extracted.json（重跑 _extract.mjs 再生）
- docs/prompt/brainstorm.md（prompt 镜像逐字同步）
- .sillyspec/docs/sillyspec/modules/stages.md（stages 模块变更索引追加 ql-20260819-003 条目）
需求：brainstorm HTML 原型指引改高保真可复用——删 ASCII 线框低保真三条
根因：旧指引把原型定位成线框示意（不需要精美 UI），与 execute.js 已有的原型引用注入（照原型布局/组件/交互实现、不重新发明）错位——低保真原型到 execute 阶段仍要重做视觉与交互，原型确认价值被浪费
方案：src/stages/brainstorm.js 分段展示设计 step 的 HTML 原型生成节删三条低保真指引，替换为高保真（布局/组件/交互按真实效果呈现、execute 可直接对照复用）与项目代码风格一致（优先复用项目现有技术栈/组件库/设计 token、先查 scan 文档）；重跑 docs/prompt/_extract.mjs 再生 _extracted.json，brainstorm.md 镜像逐字同步；stages.md 模块文档变更索引追加 ql 条目
结果：npm test 225 个测试文件全过（0 失败），lint 通过（315 文件、未引用导出 0 项）；brainstorm-auto 无原型生成步骤不受影响；skills 无原型引用无需同步

## ql-20260819-004-ce90 | 2026-08-19 10:59:59 | quick 轻量归档加阶段闸——完整流程中途变更不再被穿插 quick 误归档
状态：已完成
关联变更：（无）
文件：
- src/run/complete-handlers.js（阶段闸+QUICK_CLOSE_ALLOWED_STAGES 允许集）
- src/progress/change-registry.js（新增 getChangeStage（无行 null/读失败抛））
- src/progress.js（facade 转发）
- src/stages/quick.js（step3 prompt 补未进入完整流程条件）
- test/quick-close-linked-changes.test.mjs（补 verify/execute/plan/archive 挡+brainstorm 放行+fail-closed 6 场景）
- test/progress-get-change-stage.test.mjs（新增真实 DB 单测）
- docs/prompt/_extracted.json（脚本重跑）
- docs/prompt/quick.md（镜像同步）
- docs/sillyspec/file-lifecycle.md（quick 行补阶段闸+时间戳）
- .claude/skills/sillyspec-quick/SKILL.md（收尾顺序同步）
- .sillyspec/docs/sillyspec/modules/runtime.md（变更索引）
- .sillyspec/docs/sillyspec/modules/stages.md（变更索引）
需求：quick 轻量归档加阶段闸——完整流程中途变更不再被穿插 quick 误归档
根因：closeQuickLinkedChanges 判定只看 tasks.md 全勾选不看进度库 current_stage，execute 完成后 tasks.md 必然全勾而 verify 未收尾，被穿插 quick 关联即绕过 verify/archive 全部校验归档注销
方案：新增 ProgressManager.getChangeStage（读失败抛给上层 fail-closed），归档前查 current_stage 仅无 DB 记录或停在 scan/brainstorm 放行，plan/execute/verify/archive 一律 skip 提示走原流程；同步 prompt/镜像/SKILL/file-lifecycle/模块索引
结果：quick-close-linked-changes 11 用例含 6 新场景 + progress-get-change-stage 1 用例全过，全量 npm test EXIT=0，lint 316 文件过
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.claude/skills/sillyspec-quick/SKILL.md, docs/prompt/quick.md, test/progress-get-change-stage.test.mjs

## ql-20260819-005-eb50 | 2026-08-19 11:14:02 | 存量文档漂移 9 处重锚 + troubleshooting 补两 CLI 缺陷条目
状态：已完成
关联变更：（无）
文件：
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（三处重锚 runAutoMode/checkApproval/approve-reject）
- docs/sillyspec/prompt-control-debt.md（四处重锚 isQuickMetadata/checkApproval/auditQuickCompletion/completeStep）
- .sillyspec/local.yaml（docs-check.skip 增 self-audit-2026-08-16.md）
- docs/sillyspec/troubleshooting.md（补第 11/12 条 CLI 缺陷条目）
需求：存量文档漂移 9 处重锚 + troubleshooting 补两 CLI 缺陷条目
根因：execute 期间并行变更推进源码致 ARCHITECTURE/prompt-control-debt 的 file:line 锚失效（token 多命中不可自动修）；archive 实战暴露两个 CLI 缺陷（module-impact 检查失败打印 [object Object] / plan 与 archive 章节名契约不同源返工）
方案：grep 源码语义定位逐处重锚（runAutoMode→1140、checkApproval→576、approve/reject→1132/1137、isQuickMetadata→590 补函数名 token、auditQuickCompletion→713、--done completeStep→1006）；self-audit-2026-08-16.md 按带日期快照先例加 local.yaml skip；troubleshooting.md 补第 11/12 条（agent 侧解法 + CLI 修复方向）
结果：docs check 377/377 全绿（修前 9 失效）、doc-ref-check 80/80 通过；纯 doc/config 改动未触 src/test，npm test/lint 按规则跳过

## ql-20260819-006-d2d7 | 2026-08-19 11:29:10 | archive 检查失败明细打印裸 [object Object] 修复——failures 条目取 message 字段渲染
状态：已完成
关联变更：（无）
文件：
- src/run/complete-handlers.js（archive impact 检查失败明细渲染 f.message ?? JSON.stringify(f)）
- test/archive-impact-failure-readable.test.mjs（新建回归测试（fixture 复刻 workflow yaml + 两 Case 六断言））
- docs/sillyspec/troubleshooting.md（第 11 条标记已修引用 ql-20260819-006-d2d7）
需求：archive 检查失败明细打印裸 [object Object] 修复——failures 条目取 message 字段渲染
根因：complete-handlers.js archive extract-module-impact 检查块遍历 result.failures（条目为 {level,role_id,output,check,message} 对象）直接模板字符串化 ，String(obj) 得 [object Object]，失败原因完全不可读只能翻 workflow-runs fail.json
方案：渲染改 f.message ?? JSON.stringify(f)（缺字段 stringify 兜底防再退化）；新增 CLI 子进程回归测试 fixture 复刻 archive-impact.yaml + 章节缺失 module-impact.md 断言可读明细；troubleshooting 第 11 条标记已修
结果：新测试 6/6（失败路径明细可读无 [object Object] / 通过路径不受影响）；npm test 全量 exit=0；lint 317 文件通过（未引用导出 0）

## ql-20260819-007-d4f0 | 2026-08-19 13:11:01 | plan 生成 module-impact 章节名与 archive-impact.yaml 契约同源化——prompt 钉死标题 + 三方回归断言
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（审查计划步 module-impact 生成 prompt 章节标题钉死）
- test/plan-module-impact-sections.test.mjs（新建三方同源回归测试 11 断言）
- docs/prompt/_extracted.json（提取刷新）
- docs/prompt/plan.md（镜像逐字同步）
- docs/sillyspec/troubleshooting.md（第 12 条标记已修）
需求：plan 生成 module-impact 章节名与 archive-impact.yaml 契约同源化——prompt 钉死标题 + 三方回归断言
根因：plan 审查计划步 prompt 只说「生成模块影响矩阵」「归 unmapped」未钉死章节标题，agent 写「## 影响矩阵」变体；verify advisory 不查章节名放行，archive contains_sections 机械硬拦，agent 在两套期望间返工
方案：prompt 步骤 3 两章节标题逐字固定并注明与 yaml 契约同源勿写变体（更新结果表骨架保留）；_extract.mjs 刷新镜像逐字同步 plan.md；新增 11 断言回归测试锁三方不变量（yaml 期望 × plan prompt × archive 降级 prompt + 分发模板与活副本一致）
结果：新测试 11/11；npm test 全量 exit=0；lint 321 文件通过；troubleshooting 第 12 条标记已修（ql-20260819-007-d4f0）

## ql-20260819-008-7501 | 2026-08-19 13:27:48 | 存量漂移 11 处重锚——reopen-and-execute-batch-guard 变更 src 改动的伴生文档债清偿
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/architecture-4a.md（四处重锚 _getNextSuggestion/reopenStage/requiresWait/applyWorktree）
- docs/sillyspec/doc-consistency-debt.md（D-3 两处 worktree-apply 锚→40）
- docs/sillyspec/prompt-control-debt.md（L104 三处 + L300 两处（回头路注释段/分支锚/草稿调用点））
需求：存量漂移 11 处重锚——reopen-and-execute-batch-guard 变更 src 改动的伴生文档债清偿
根因：并行变更改动 stage-machine.js/complete.js/worktree-apply.js 后其文档锚点漂移（该变更的文档同步义务只覆盖模块卡，debt 类文档锚点无人跟）
方案：grep 源码语义定位逐处重锚（定义优先于调用点，applyWorktree 行改双引用解决签名行无 token）；顺手把 L104 裸数字 /382 升级为合法 ref
结果：docs check 378/378 全绿（修前 11 失效，新增 1 处合法断言）；纯 doc 未触 src/test 按规则 8 跳过 npm test/lint

## ql-20260819-009-1463 | 2026-08-19 13:29:22 | quick 起步即推 QUICKLOG 进行中占位条目上平台——spec 树增量同步消除起步到首次 --done 的可见盲窗
状态：已完成
关联变更：（无）
文件：
- src/run/stage.js（quickGuard 块尾 pm._write 后补 triggerSync：骨架分配+进度落盘后立即推，existingGuard 重入不重复推）
- test/platform-sync-quick-session-spectree.test.mjs（场景5：CLI 子进程异步 spawn 跑真实 run quick 起步，断言 spec-sync POST 含 quicklog op 且解码含「状态：进行中」、不发 progress；spawnSync 会冻结父进程事件循环致 mock server 假红，注释已记）
- docs/sillyspec/file-lifecycle.md（QUICKLOG 行补 2026-08-19 起步同步时点说明）
需求：quick 起步（run quick，含平台 claim 派发模式同路径）即在 QUICKLOG 预写「进行中」占位条目并触发 spec 树增量同步，让平台快速修复列表实时可见执行中的 quick，消除起步到第一次 --done 的可见盲窗
根因：runStage 前段三处 triggerSync（autoDetectChange/currentStage 切换/stale 复位）全在 quickGuard 块骨架分配之前执行，进行中条目要等第一次 --done 的 complete.js:452 才上平台（本会话自身即活证据）；--done 终态链路顺序本就正确（handleQuickStageCompletion 翻终态在前 complete.js:392 triggerSync 在后）无需改
方案：stage.js quickGuard 块尾 pm._write 后补一行 triggerSync（注释说明盲窗成因/降级语义/幂等边界——existingGuard 跨进程重入跳过本块不重复推）；测试扩 platform-sync-quick-session-spectree 场景5 用异步 spawn 跑 CLI 子进程（spawnSync 冻结父进程事件循环致 mock server 无法 accept 假红，注释已记）；file-lifecycle.md:140 补同步时点
结果：场景5 改前红改后绿（起步 spec-sync POST 到达+quicklog op+解码含状态：进行中+不发 progress），原4场景不回归；npm test 全量 exit=0；lint 321 文件过；真实平台手动补推 synced=4 服务端 v25 hash 对账一致。审计拦得的窗口期并发文件（change-registry.js 等，ql-20260819-010 会话产出）与本会话无涉，按并发协议 flag 解锁归审计行；.sillyspec 根位置空库残留已备份仓外清除
审计：⚖️ 归属切分：5 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/progress/change-registry.js, src/run/complete-handlers.js, test/progress-get-change-stage.test.mjs, test/quick-close-linked-changes.test.mjs, test/run-complete-step-brainstorm.test.mjs

## ql-20260819-010-0af1 | 2026-08-19 13:29:24 | 修复 quick --done 轻量归档误伤进行中变更的缺陷
状态：已完成
关联变更：（无）
文件：
- src/progress/change-registry.js（getChangeStage LEFT JOIN stages 带 stage_status）
- src/run/complete-handlers.js（阶段完成态闸 completed 不放行）
- test/progress-get-change-stage.test.mjs（stage_status 断言+空窗用例）
- test/quick-close-linked-changes.test.mjs（completed skip+in-progress closed 用例）
需求：修复 quick --done 轻量归档误伤进行中变更的缺陷。
根因：brainstorm 完成到 plan 开始的空窗期 current_stage 仍读 brainstorm，且 propose 骨架 tasks.md 无任务行使「无未勾选框=全勾」恒真，阶段闸只看阶段名误放行（2026-08-19 cross-workspace-team-mission 误归档事故）。
方案：getChangeStage LEFT JOIN stages 带出 stage_status（无阶段行归一 null），closeQuickLinkedChanges 加阶段完成态闸——completed 一律 skip 走原流程；不动 isChangeTasksComplete（只有 ql 行的真僵尸逃生通道须保留）；两测试文件补 completed skip/in-progress closed/空窗查询用例。
结果：node --test 15/15 过，全量 npm test 0 fail（0 not ok），lint 321 文件过。解锁说明：审计拦的 test/platform-sync-quick-session-spectree.test.mjs 与 .sillyspec/sillyspec.db* 为并行会话脏文件与共享 runtime DB，非本 quick 改动，提交用 pathspec 隔离不裹挟。
审计：⚖️ 归属切分：5 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/file-lifecycle.md, src/run/stage.js, test/platform-sync-quick-session-spectree.test.mjs, .sillyspec/sillyspec.db, .sillyspec/sillyspec.db.schema-version

## ql-20260819-011-119b | 2026-08-19 13:38:58 | 修复：完整流程 change 的 changes.title 在 brainstorm 单步推进时不刷新——design.md 第 6 步已落盘但 title 仍存英文 autoName 兜底 key，刷新只在阶段完成分支触发。把 deri…
状态：进行中
关联变更：（无）
文件：（见实际改动）
