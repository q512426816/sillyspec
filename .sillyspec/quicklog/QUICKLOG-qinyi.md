
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

## ql-20260819-011-119b | 2026-08-19 13:38:58 | changes.title 在 brainstorm 单步推进时即刷新为中文标题
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（抽 refreshChangeTitleFromArtifacts 公共 helper 挂四个步骤持久化点（单步完成/阶段完成 × completeStep/continueStep），替换原两处内联块）
- test/run-complete-step-brainstorm.test.mjs（新增单步 --done 刷新 changes.title 案例（复刻英文 autoName 兜底前置态，先红后绿））
- .sillyspec/docs/sillyspec/modules/runtime.md（注意事项补 title 刷新行为条目 + 变更索引补 ql-20260819-011-119b）
需求：changes.title 在 brainstorm 单步推进时即刷新为中文标题
根因：title 刷新只挂在 completeStep/continueStep 的阶段完成分支，brainstorm 第 6 步 design.md 已落盘但阶段未走完时，DB 里 title 一直是启动 initChange 写入的英文 autoName 兜底，中途查看永远是英文 key
方案：complete.js 抽 refreshChangeTitleFromArtifacts 公共 helper（deriveTitleFromLinkedChange 提取 proposal/design 首个 # 标题中文描述 + quick-hex 会话守卫 + 失败静默），挂到四个步骤持久化点——completeStep 单步完成、completeStep 阶段完成、continueStep wait 解除、continueStep 阶段完成，单步 --done 即刷新
结果：新增单步刷新测试先红后绿；node --test 单文件 32/32 通过；npm test 全量 0 fail；npm run lint 通过（321 文件、未引用导出 0 项）

## ql-20260819-012-66fc | 2026-08-19 16:45:57 | 审计发现的 7 项高优先级缺陷修复
状态：已完成
关联变更：（无）
文件：
- src/sillyhub-mcp/client.js（删除 _token 冗余赋值）
- src/modules.js（删除 DB 死 import）
- src/progress.js（waitAnswers JSON 损坏加诊断日志 + 清理死函数死常量）
- src/run/stage.js（noAI 未知 cliAction 加 else throw）
- src/run/complete.js（noAI 未知 cliAction 加 else throw）
- src/progress/step-store.js（completed_at 条件写入）
需求：审计发现的 7 项高优先级缺陷修复。
根因：多维度审计暴露空 catch 吞错、noAI 分支缺兜底、completed_at 无条件写入、冗余赋值与死 import/死函数等代码质量债务。
方案：client.js 删 _token 冗余赋值；modules.js 删 DB 死 import；progress.js waitAnswers JSON.parse catch 加 console.warn 并清理 makeInitialProgress/makeInitialGlobal/VALID_STAGE_STATUSES；stage.js/complete.js noAI 分支加 else throw fail-fast；step-store.js completed_at 改为 status 条件写入；同步更新 runtime/progress/sillyhub-mcp/migration 模块文档变更索引。
结果：npm run lint 322 文件通过；npm test 230 通过 2 失败（change-exists-validation.test.mjs、archive-idempotent-selfheal.test.mjs 与本次改动无关，为 archive/change-exists 既有问题）；7 处修复点均经脚本核验正确
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/archive-idempotent-selfheal.test.mjs, test/change-exists-validation.test.mjs, test/progress-dump.test.mjs.bak

## ql-20260819-013-1b70 | 2026-08-19 17:22:12 | archive 与 quick 归档保持变更目录原名
状态：已完成
关联变更：（无）
文件：
- src/stage-contract.js（archiveDestDirName 恒等返回原名；validateArchiveOutputs/validateChangeExists 改精确匹配 archive/<changeName>）
- src/run/complete-handlers.js（findAlreadyArchivedDir 删日期前缀剥离匹配，只按精确原名 + plan.md 把关）
- src/stages/archive.js（确认归档 step4 prompt 目标路径改 <原变更名>）
- test/change-exists-validation.test.mjs（archive 特例按原名目录断言）
- test/archive-idempotent-selfheal.test.mjs（目录名不一致改负路径不自愈；单元改精确原名命中）
- docs/sillyspec/file-lifecycle.md + stage-artifacts.md（归档目录名口径同步 <change>）
- docs/prompt/archive.md + _extracted.json（重跑 extract 同步）
- .claude/skills/sillyspec-archive/SKILL.md（归档结果路径改 archive/<名>）
需求：archive 与 quick 归档保持变更目录原名
根因：archiveDestDirName 剥离日期前缀后重拼归档日期导致文件夹重命名
方案：archiveDestDirName 改为恒等返回并同步调整校验自愈逻辑测试文档与 SKILL
结果：archive 相关 5 个测试文件 17/17 通过（change-exists-validation / archive-idempotent-selfheal / archive-cli-git-add / run-complete-step-archive / quick-close-linked-changes）；npm run lint 通过；全量 npm test 232 文件仅 progress-dump 并发 flaky 1 失败（单独跑通过，非本次回归）

## ql-20260819-014-0082 | 2026-08-19 19:20:52 | 审计 medium 级 quick win 第二批修复完成
状态：已完成
关联变更：（无）
文件：
- src/progress.js（revision 改 != null 判定保住 0 值）
- src/fs-atomic.js（tmp 名加随机段双因子防 PID 重用碰撞）
- src/db.js（close 容错 try/catch finally 置 null）
- src/sillyhub-mcp/client.js（_initialize 成功后补发 notifications/initialized）
- src/run/complete.js（autoCheckPlanFromReviews catch 加 warn）
- src/run/prompt.js（quicklog-id guard.json 读取失败加 warn）
需求：审计 medium 级 quick win 第二批修复完成。
根因：六项独立缺陷——revision=0 falsy 吞字段、tmp 名 PID 单因子碰撞、DB.close 失败句柄残留、MCP 协议缺 initialized 通知、autoCheckPlanFromReviews 与 quicklog-id 两处空 catch 零诊断。
方案：逐一修复并同步 core-engine/sillyhub-mcp/runtime 模块文档。
结果：lint 322 文件通过；相关测试 db-atomic-write/stage-completion-atomicity/worktree-meta-atomic/progress-dump/execute-testcase-design-include 全绿

## ql-20260819-015-65fa | 2026-08-19 21:50:36 | 审计第三批安全与重复代码修复完成
状态：已完成
关联变更：（无）
文件：
- src/modules.js（rebuild git rev-parse 改 execFileSync）
- src/init.js（子项目 repo 探测改 execFileSync）
- src/spec-dir-typo.js（levenshtein 改 import run/shared.js）
- .claude/skills/sillyspec-knowledge/SKILL.md（两处 src/stages/ 内部路径改中性文案）
需求：审计第三批安全与重复代码修复完成。
根因：execSync 经 shell 的 git 注入面两处、levenshtein 重复实现、SKILL.md 内部路径违反外部纯净性。
方案：execFileSync 数组参数、import 复用单一实现、示例文案中性化，同步 migration/cli-entry/setup 模块文档。
结果：lint 322 文件通过，spec-dir-typo/init-claude-injection/modules-rebuild-dryrun 全绿

## ql-20260819-016-4c70 | 2026-08-19 23:04:43 | 修复 progress-dump 测试并发全量偶发失败 + dump 人类可读输出 camelCase 回归
状态：已完成
关联变更：（无）
文件：
- src/index.js（progress dump 人类可读分支 3 字段改读 snake_case，9a63466 漏改回归修复）
- test/progress-dump.test.mjs（runCli 加固包装+timeout 15s+section8 snake_case 守护断言）
需求：修复 progress-dump 测试并发全量偶发失败 + dump 人类可读输出 camelCase 回归
根因：环境瞬时类两机制叠加——①并发全量下 CLI 子进程（import 全链启动）撞上并行 agent 会话保存源码的瞬时中间态→罕见非0退出（c6e372f/392f0e9 两度实证同类；本次实证：另一会话改 src/sync.js 期间 sync-conflict-statemachine 全量偶发/单独通过，同机制）；②杀毒/索引独占锁 .runtime 文件时 CLI 阻塞实测 3-7s，原 timeout 10s 余量不足。另：9a63466 snake_case 契约修复漏改 index.js 人类可读分支→三字段恒(无)
方案：测试加 runCli() 包装（沿 spec-dir.test.mjs run() 先例）——失败打印 cmd+exit+stderr 诊断后重试一次，仍败带全量诊断抛出保确定性失败定位；timeout 10s→15s（最坏 3×30s < run-tests 单文件 120s）；src/index.js:393-397 改读 current_change/current_stage/last_active；section 8 补守护断言（含真实变更名+无(无)兜底值）
结果：progress-dump 60/60 通过（守护断言修复前按预期失败，实证回归存在）；并发自压 40 次 0 失败 0 重试；npm run lint 325 文件通过；全量 npm test 235 文件 progress-dump 通过，2 失败（doc-ref-check/sync-conflict-statemachine）均并行会话活编辑 stage.js/sync.js 所致、单独跑通过，非本次回归
审计：📎 文档引用失效：3/80 处 file:line 失效（sillyspec docs check 可复现）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/platform-interface-map.md

## ql-20260820-001-f651 | 2026-08-20 10:25:02 | quick 启动缺 --input 时提示占位标题后果与重启指引
状态：已完成
关联变更：（无）
文件：
- src/run/stage.js（缺 --input 占位标题警告（后果+重启指引））
- src/stages/quick.js（step1 补 --input 语义标题指引）
- .claude/skills/sillyspec-quick/SKILL.md（参数表补 --input 行+推荐启动示例）
- docs/prompt/quick.md（提示词镜像同步）
- docs/prompt/_extracted.json（_extract.mjs 再生）
- test/quick-start-input-hint.test.mjs（新增三用例锁定警告分支）
需求：quick 启动缺 --input 时提示占位标题后果与重启指引
根因：无 --input 且无可提取标题的关联变更时 QUICKLOG 落「(quick 任务)」占位标题，平台快速修复列表默认隐藏进行中占位条目（task-06 口径），长会话全程不可见被误判为同步故障；step1 提示词与技能参数表均未提 --input（command.js:651 早已支持）
方案：stage.js 分配 ql-ID 后 quickDesc 为空即警告（占位后果+带 --input 重启指引+旧会话 --reset 提示）；quick.js step1 补指引；sillyspec-quick SKILL.md 参数表补 --input 行+推荐启动示例；docs/prompt 镜像同步；新增三用例 CLI 子进程测试锁定警告出现/不出现分支
结果：新测试 11 断言全过；npm test 全量 244 过、2 失败文件均与本次无关（hub08 并发偶发单跑全过、doc-ref-check 13 处既有失败经 stash 排除法证实先在）；npm run lint 337 文件通过
审计：📎 文档引用失效：1/197 处 file:line 失效（sillyspec docs check 可复现）
审计：⚖️ 归属切分：7 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md, docs/sillyspec/platform-interface-map.md, docs/sillyspec/prompt-control-debt.md, src/run/command.js, src/run/shared.js, src/spec-sync.js, test/quick-start-input-hint.test.mjs

## ql-20260820-002-2480 | 2026-08-20 10:38:15 | quick 中途支持 --files 追加边界
状态：已完成
关联变更：（无）
文件：
- src/run/stage.js（恢复分支 --files 追加并入守卫（去重保序+hash+持久化+确认输出））
- src/stages/quick.js（step1 文件预声明段补中途追加指引）
- .claude/skills/sillyspec-quick/SKILL.md（--files 行补中途追加写法）
- docs/prompt/quick.md（提示词镜像同步）
- docs/prompt/_extracted.json（_extract.mjs 再生）
- test/quick-files-resume-append.test.mjs（新增四用例锁定追加语义）
需求：quick 中途支持 --files 追加边界
根因：恢复分支 stage.js existingGuard 直接复用旧 guard、静默丢弃本次 --files，边界冻结在启动时刻；中途改声明外文件只能靠 --done 审计行事后归属（上轮会话实测：新测试文件被切进他者审计行）
方案：恢复时带 --files 即去重保序并入 guard.allowedFiles + 点录 allowedFilesHash（不存在跳过同启动语义）+ 持久化回 guard.json（--done 审计直读该文件，追加即被归属消费）+ 打印追加确认；step1 提示词与技能文档补中途追加指引；新增四用例 CLI 子进程测试
结果：新测试 19 断言全过（含追加后全流程 --done 文件行归属端到端）；npm test 全量 247 过 0 失败；npm run lint 338 文件通过

## ql-20260820-003-3592 | 2026-08-20 13:25:10 | 全局验收标准段去 checkbox 形态
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（全局验收标准段编号清单化+承接 blockquote）
- docs/prompt/plan.md（镜像同步）
- docs/prompt/_extracted.json（_extract.mjs 再生）
- docs/sillyspec/file-lifecycle.md（plan 行描述补非执行态说明）
- test/plan-global-acceptance-no-checkbox.test.mjs（新增三组断言回归）
需求：全局验收标准段去 checkbox 形态，验收结论归 verify-result.md
根因：模板用 - [ ] checkbox 但机器侧零消费（无解析器/勾选器/门禁），执行完永远未勾成僵尸态；验收实际走 TaskCard acceptance（task 级）与 verify-result.md（全局级），checkbox 无人指派勾选
方案：plan.js full 模板改编号清单+段尾 blockquote 指明承接方；同步 _extracted/plan.md 镜像与 file-lifecycle 描述；新增 7 断言回归测试锁「无 checkbox+编号形态+承接说明+镜像一致」
结果：新测试 7 断言全过；npm test 全量 253 文件 0 失败；npm run lint 344 文件通过
审计：📎 文档引用失效：1/3 处 file:line 失效（sillyspec docs check 可复现）
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/modules.js, src/verify-postcheck.js

## ql-20260821-001-1e90 | 2026-08-21 07:51:04 | 全量体检缺陷修复——3 路静态审查 35 项发现核实修复 20 项（含在途 UI 原型分级批次文件一并登记）
状态：已完成
关联变更：（无）
文件：
- src/sync.js（take-platform fail-closed+keep-local COALESCE+syncDocuments 平台根+原子写）
- src/run/scan-profile.js（buildQuickScanSteps 抽取供 getStageSteps 同源）
- src/run/command.js（F4 守卫统一+reopen 按名保留+archive 原名回退+auto specRoot）
- test/tool-defect-audit-fixes.test.mjs（本批 18 断言回归）
需求：全量体检缺陷修复——3 路静态审查 35 项发现核实修复 20 项（含在途 UI 原型分级批次文件一并登记）
根因：take-platform 缺 platform_progress 时无 return 空 import 清库；TaskCard 命令校验只收标量致规范块列表卡片 no-op；scan quick 档 3 步表与 11 步注册表跨进程漂移；outputStep isPlatform 判定与取值字段不一致 join(null) 崩溃；--change 等裸 flags[idx+1] 绕过 F4 守卫；execute reopen 预置全 pending 破坏修订语义；另有 MAX 参数 NULL、CRLF、正则口径、平台模式路径硬编码等机械缺陷
方案：sync/gates/postcheck/command/prompt/shared/scan-profile/plan/execute/knowledge/doctor/concurrent-detect/complete-handlers 14 个源文件对应修复 + docs 行号与提示词文档同步；task id 非 1 起跳过连续性检查经 plan-execute-contract Case 10 证实为兼容契约，撤销该项误修并加防回归断言
结果：npm test 262 文件 0 失败（新增 tool-defect-audit-fixes.test.mjs 18 断言全过）；npm run lint 353 文件通过；doc-ref-check 80 处引用全过

## ql-20260821-002-a69b | 2026-08-21 09:34:33 | (quick 任务)
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260821-003-6be6 | 2026-08-21 09:34:48 | progress dump 多活跃变更取错——恒取字典序最前（老变更）
状态：已完成
关联变更：quick-a19fb16c
文件：
- src/progress.js（dump 活跃变更选择改 last_active DESC（ql-20260821-003））
- test/progress-dump.test.mjs（用例 1b 多活跃取最新（修复前红））
需求：progress dump 多活跃变更取错——恒取字典序最前（老变更），应取 last_active 最新
根因：dump() :1192 活跃变更查询 ORDER BY name 取第一个，多活跃仓（变更隔离常态）下「当前变更/当前阶段/最后活动」停留在历史数据（实测 multi-agent-platform 13 个活跃，页面恒显示 2026-07-22）
方案：ORDER BY name → ORDER BY last_active DESC + 注释；test/progress-dump.test.mjs 新增用例 1b（a-old 先建+10ms+z-new，断言取 z-new，修复前红/修复后绿）；package.json 3.26.13→3.26.14
结果：npm test 全量 300 用例 0 失败（37+263）；npm run lint 通过（354 文件）；file-lifecycle.md 不涉及（只读 dump 选变更语义，非文件生命周期）；全局重装与 daemon 链路验证随后在本机执行
审计：📝 文档欠账（D-8）：3 个源码文件改动未同步任何模块文档（涉及模块：stages · progress）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：package.json

## ql-20260823-001-f97e | 2026-08-23 20:15:40 | (quick 任务)
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260823-002-8e55 | 2026-08-23 20:19:45 | 清理保护分支连 local.yaml 一起保护——平台 init 凭据不再被误删
状态：已完成
关联变更：（无）
文件：
- src/init.js（cleanupRuntimeResidue 整删列表去 local.yaml，注释与保护分支提示文案同步）
- test/runtime-cleanup-keeps-worktree.test.mjs（Case1 断言翻转——local.yaml 应保留）
- docs/sillyspec/file-lifecycle.md（平台模式残留清理边界契约更新（updated_at 2026-08-23））
- .sillyspec/docs/sillyspec/modules/setup.md（注意事项补 cleanup 保护边界）
- .sillyspec/docs/sillyspec/modules/setup.changelog.md（新建 sidecar 记 ql-20260823-002-8e55）
需求：清理保护分支连 local.yaml 一起保护——平台 init 凭据不再被误删
根因：local.yaml 是 gitignored 凭据文件（平台 init lease 第 5 步下发/local detect/platform connect 写入），保护分支把它当非权威残留整删，与 platformMode 跳过清理的保护语义自相矛盾，且删除后无法从 git 找回
方案：cleanupRuntimeResidue 整删列表去掉 local.yaml 仅留 codebase/，init.js:255 与 run/command.js:424 两个保护分支调用点随之保留；同步翻转回归断言、契约文档 file-lifecycle.md 平台残留清理边界、setup 模块卡注意事项并新建 changelog sidecar
结果：针对性测试 28/28+7/7（本地模式无资产整删零回归）、全量 npm test 297/297、npm run lint 通过

## ql-20260824-001-0aa2 | 2026-08-24 08:40:10 | 模块卡字数预算警告（防文档膨胀成 agent 读取税）
状态：已完成
关联变更：（无）
文件：src/module-resolve.js
需求：模块卡字数预算警告（防文档膨胀成 agent 读取税）
根因：module-resolve 表已有软限（12KB 按节读）但只教 accommodating 不促精简——runtime.md 已 26.9KB、worktree 24KB、stages 20KB 在持续付税且无信号
方案：renderModuleResolveTable 增 MODULE_CARD_BUDGET_BYTES=16KB 预算——超限行标 ⚠️超预算 + 表尾提示（split-changelog 迁历史段/精简正文，预算只降不升，对标 deepseek-harness verify-doc-budgets）；软限教怎么读、预算促变瘦两层分离
结果：实测 runtime 26.9KB 触发行内警告+表尾提示（tasks.md+卡 fixture 实证）；node --check 过；token-cost-optimization 既有测试 N/N 全绿；lint 过。

## ql-20260824-002-2a27 | 2026-08-24 11:54:58 | (quick 任务)
状态：进行中
关联变更：quick-a19fb16c
文件：（见实际改动）

## ql-20260824-003-8f3f | 2026-08-24 11:55:26 | worktree 产物归属/探针5 双根并集/风险判级否定抑制——二期学习批次③工具反馈三坑修复
状态：已完成
关联变更：（无）
文件：src/change-risk-profile.js, src/stage-contract.js, src/contract-matrix.js, src/verify-probes.js, src/index.js, src/worktree.js, src/verify-postcheck.js, src/task-review.js, src/stages/verify.js, src/stages/execute.js, src/dispatch/backends/local-agent.js, test/stage-contract.test.mjs, test/probe5-worktree-parity.test.mjs, test/worktree-spec-salvage.test.mjs, docs/sillyspec/file-lifecycle.md, docs/sillyspec/file-lifecycle/worktree-and-guard.md, docs/sillyspec/platform-interface-map.md, docs/prompt/_extracted.json, docs/prompt/verify.md, docs/prompt/execute.md
需求：worktree 产物归属/探针5 双根并集/风险判级否定抑制——二期学习批次③工具反馈三坑修复
根因：用户实证反馈：①子代理 cwd=worktree 时按提示词相对路径把 verify-result.md/模块文档写进 worktree 副本，apply 的 filterDeliverableFiles 又排除 .sillyspec/changes，cleanup 即蒸发主仓看不到；②探针5 只现算 scanRoot 单根，另一侧端点不在比对集，主仓既有 daemon 端点被当 missing 全量误报；③design 写「不新增 daemon 协议」仍被判 integration-critical，frontmatter 覆盖通道对首次使用者不直观（verify 末段才暴露）
方案：①提示词 spec 路径全量 {SPEC_ROOT} 占位符化（渲染为主仓绝对路径）+ verify-probes --init 漂移锚定（resolveVerifyProbesSpecBase，平台 pointer 才当平台根）+ cleanup 前 _salvageSpecArtifacts 打捞（changes/<name>/** 与 docs/** 主仓缺失 copy 回、同名不同内容仅 warn）；②verifyApiParity 后端端点集改三根并集（scanRoot ∪ meta.worktreePath ∪ git-common-dir 主仓根，按 method+path 去重），meta 读取优先 specBase/.runtime（修旧硬编码 worktree 内读不到），前端调用读真实 worktree，porcelain 四处同口径 --untracked-files=all（修目录折叠漏文件）；③detectChangeRisk 同句否定抑制（子句切分+16 字符否定窗口+枚举继承，排除不同/无状态/非常等假阳词；全部命中被抑制才降级）+ verify gate 抑制审计 warning + brainstorm --done 风险判级提前提示
结果：npm test 304 个测试文件 0 失败（含新增 probe5-worktree-parity 12 例、worktree-spec-salvage 6 例、stage-contract 否定抑制 7 例与 gate 提示 2 例）；npm run lint 通过（408 文件）；docs/prompt 三脚本再生同步 + doc-ref-check 84 处引用全通过

## ql-20260824-004-6437 | 2026-08-24 14:34:49 | 二期学习批次④：taskcard 占位符硬拦 / Wave 依赖方向硬拦+plan-adopt-waves / decisions header 根治+补齐 /…
状态：已完成
关联变更：（无）
文件：
- src/plan-adopt-waves.js（新命令核心（topo 重排+W 列同步+幂等+拒绝误删））
- src/taskcard-placeholders.js（占位符清单叶子模块（断 ESM 循环，骨架/校验同源））
- src/stages/plan-postcheck.js（占位符硬拦+Wave 方向硬拦+collectTaskDepMap 抽出）
- src/run/command.js（quick 缺描述门+位置参数即描述+file-notes fail-fast）
- src/quicklog.js（validateFileNotesFormat 导出）
- src/stage-contract.js（ensureDecisionDocHeader 自动补齐）
- src/run/gates.js（三道 gate 前幂等补齐接线）
- src/index.js（plan-adopt-waves 命令接线）
- src/scan-postcheck.js（backfillFrontmatter 抽共用）
- src/stages/brainstorm.js（decisions 模板补 frontmatter）
- src/stages/brainstorm-auto.js（同上）
- templates/prompts/taskcard-rules.md（占位符硬拦事前契约）
- src/stages/plan.js（coordinator prompt 三处同源）
- test/plan-adopt-waves.test.mjs（24 例端到端（重排/幂等/dry-run/方向违规/无标题/混正文拒写））
- test/decisions-header-backfill.test.mjs（15 例（模板根治/纯函数/gate 补齐/scan-fix 回归））
需求：二期学习批次④：taskcard 占位符硬拦 / Wave 依赖方向硬拦+plan-adopt-waves / decisions header 根治+补齐 / quick 缺描述拒绝启动+位置参数即描述 / file-notes 格式 fail-fast
根因：用户实证五坑：①taskcard 骨架占位符过九字段存在性硬校验，task-03/04/06/07 空骨架靠人工审计才发现；②主控手排 7 波与 CLI 拓扑比对只警告不阻断，且 depends_on 落同 Wave（execute 强制并行）此前零校验；③brainstorm step8 要求所有规范文件含 frontmatter 但其 decisions 模板自己不带，agent 照抄必缺 header 拖到后续环节才提示；④quick 缺 --input 落占位标题只能手工 reset 重来；⑤--file-notes 的 || 分隔符写错时整段静默挤进第一个文件括注
方案：①占位符清单独立叶子模块 taskcard-placeholders.js 与骨架同源，validatePlanFeasibility 剥 HTML 注释后逐卡硬拦（manifest/rules/coordinator 三处事前契约同源）；②executePlanPostcheck Wave 段加依赖方向硬拦（同 Wave/后置 Wave → throw）+ 不一致 warning 降噪区分合法过度串行，新增 plan-adopt-waves 命令（depMap 与 postcheck 同源→topoSortWaves→重写 Wave 段+任务总表 W 列 best-effort+非引用内容拒绝重写+写后复跑一致性，--dry-run/幂等）；③brainstorm+brainstorm-auto decisions 模板补 frontmatter 根治，backfillFrontmatter 抽共用，ensureDecisionDocHeader 在三道 gate 前幂等补存量；④command.js 新会话（刚生成 sessionId）缺描述且无关联变更 → exit 2（--help 短路之后、任何副作用之前；精确恢复/done-like 豁免），quick 位置参数显式转任务描述（与 auto 建议用法一致）；⑤validateFileNotesFormat 逐段要求 path::括注，非法即拒
结果：npm test 306 个测试文件 0 失败（新增 plan-adopt-waves 24 例、decisions-header-backfill 15 例，更新 taskcard D 段反转、quick-start-input-hint 改拒绝语义、4 个既有 quick 测试补 --input/去装饰位置参数）；lint 412 文件通过；doc-ref-check 84 处引用全过（index.js/command.js 行号重锚两批 11 处）

## ql-20260824-005-4572 | 2026-08-24 19:00:19 | 三期学习批次：多行装饰器漏扫/探针1 worktree 盲区/FAIL 重验预告/checkpoint 夹带清单——工具反馈三坑修复
状态：已完成
关联变更：（无）
文件：
- src/endpoint-extractor.js（三框架装饰器全文匹配+lineOfIndex 助手）
- src/verify-probes.js（probe1/3 worktree 路径回退+渲染注明）
- src/contract-matrix.js（_readWorktreeMeta 导出共用）
- src/stage-contract-spec.js（failMessage 重验成本预告）
- src/stages/verify.js（FAIL 出路行补提示）
- src/worktree.js（checkpoint 夹带清单入提交信息）
需求：三期学习批次：多行装饰器漏扫/探针1 worktree 盲区/FAIL 重验预告/checkpoint 夹带清单——工具反馈三坑修复
根因：用户实证三坑：①三框架端点提取器逐行匹配，多行装饰器（@router.get( 后路径独占行）静默漏扫——endpoints.json 与 live 扫描双失真，探针5 报 11 个存量端点 missing；②探针1 只按主仓 cwd 解析 design 清单路径，apply 前新文件只在 worktree，6 个新文件被误报不存在跳过不扫；③checkpoint 提交信息不带夹带清单，逐任务归因靠人肉 diff；FAIL 阻断文案不预告重验时仍会全量对账 commands.test，长套件耗时段心里没数
方案：①装饰器匹配改全文正则（\s* 天然跨换行），FastAPI 三态合一/Express 路由同治/Spring 短旧两形式全文化，行号=装饰器起始行；探针1/3 复用探针5 的 _readWorktreeMeta（加 export）做 worktree 路径回退，worktreeHits 计数渲染注明；②failMessage 补重验成本预告（全量对账+耗时+test_strategy 收窄指引），verify prompt FAIL 出路行同步；③_createBaselineCheckpoint 收 _overlayBaseline 的 files 清单入提交信息正文（封顶30行，标注归因时排除），两调用点传参
结果：npm test 306 个测试文件 0 失败（新增多行装饰器 3 用例/探针1 回退 4 断言/checkpoint 信息 4 断言/FAIL 预告 1 断言）；lint 412 文件通过；doc-ref-check 84 引用全过；docs/prompt 再生+file-lifecycle/worktree-and-guard/troubleshooting 第39条同步

## ql-20260825-001-56a2 | 2026-08-25 02:24:43 | 四期学习批次：apply --stash-dirty 主仓在途改动一等支持 / review.json 声明偏差放行 / stash pop 静默失败工具化兜底
状态：已完成
关联变更：（无）
文件：
- src/worktree-apply.js（stashDirty 全链+collectReviewDeclaredFiles+Gate1/Gate2 三源扩展+restoreMainStash 两级恢复）
- src/index.js（--stash-dirty flag+help 接线）
- test/worktree-apply-stash-dirty.test.mjs（18 断言覆盖五场景）
- test/worktree-apply-review-allowlist.test.mjs（11 断言覆盖声明/对照/跨仓/Gate2/过滤）
需求：四期学习批次：apply --stash-dirty 主仓在途改动一等支持 / review.json 声明偏差放行 / stash pop 静默失败工具化兜底
根因：用户实证三坑：①主仓并行在途改动下 apply 三路死锁（默认 4.5/5a 拦、--skip-overlap 全重叠无子集、--merge 被 git 拒脏树启动），被迫手工 stash→checkout→3way 补丁；②手工 stash pop 混合态两次静默不落地，靠人肉记 SHA 兜底；③apply 用 design 清单比对 worktree diff，执行期有据越界（facade 转发/名单测试）被拦只能回改 design.md
方案：①新 flag --stash-dirty：Gate1 后同口径探针，脏则 stash push -u（pathspec 排除与探针同款防卷走 spec 文件），SHA 显著打印；apply 正常走；finally 两级恢复——apply --index 保暂存区优先、与 apply 落地未提交变更互斥时退普通 apply（内容保真+staged 扁平化明示）、都失败保留条目+SHA 大字兜底绝不自动 drop；drop 后 rev-parse 核验栈顶防静默不落地；checkOnly 绝不 stash；全程主仓互斥锁内；五处拦截文案补该出路；②即①的恢复校验链（退出码+栈顶 SHA+失败保留）把人肉 SHA 兜底工具化，手工指引同步提示记 SHA；③collectReviewDeclaredFiles 把最新 execute run 各 review.json changedFiles（过 Task Review Gate git 证据校验）按 repo 切片并入 Gate1 allow set，仅 review 放行记 reviewAdmittedFiles+审计 warning，Gate1 报错给 review 声明/design 补行双出路，assess Gate2 同等豁免降 warning，跨仓/运行时产物不进 main 集
结果：npm test 308 个测试文件 0 失败（新增 stash-dirty 18 断言：非重叠干净恢复/staged 保真或诚实降级/重叠冲突标记+条目保留+SHA/干净零副作用/checkOnly 只读；review-allowlist 11 断言：声明放行+审计/无声明仍拦/跨仓切片/Gate2 豁免/产物过滤）；lint 414 文件通过；doc-ref-check 84 引用全过

## ql-20260825-002-db58 | 2026-08-25 09:02:22 | 五期学习批次：worktree --adopt-branch 收编+分支误删四向量堵死 / brainstorm-auto 模板骨架化 / 多会话单工作区风险归…
状态：已完成
关联变更：（无）
文件：
- src/worktree.js（adoptBranch 收编+菜单+ghost 不盲删+doctor 收紧+native force 豁免）
- src/run/stage.js（create 传参+修复建议菜单化）
- src/run/command.js（--adopt-branch flag 接线）
- src/index.js（worktree create flag+help）
- src/stages/brainstorm-auto.js（design 完整骨架）
- src/stages/brainstorm.js（豁免短语示例）
- test/worktree-adopt-branch.test.mjs（19 断言）
- test/brainstorm-auto-skeleton.test.mjs（13 断言含自洽）
需求：五期学习批次：worktree --adopt-branch 收编+分支误删四向量堵死 / brainstorm-auto 模板骨架化 / 多会话单工作区风险归档
根因：用户实证：①「用户要求在指定分支上做」与 execute worktree 直接冲突——同名分支报错且四处合力导向误删（create 只抛 Run cleanup first、ghost 清理无守卫 branch -D、execute 修复建议无条件推荐删分支、doctor 无库孤儿照删），用户被迫走主检出+--done 兜底规避；②校验器字面匹配（文件变更清单标题/Non-Goals 字面/生命周期豁免紧邻）连环卡七八轮，brainstorm-auto 的 design 规格只有一行散文没骨架；③多会话单工作区混战（分支被快进/文件混编/钩子 stash 冲突）是最大非技术消耗，需记录固有风险
方案：①create() 同名分支→三选一菜单（删遗留/收编/换名）；--adopt-branch 检出既有分支为工作分支、分支 HEAD 作 baseline（存量不计交付 diff，meta.adoptedBranch 审计）；ghost 清理只 prune；execute 建议改菜单指引；doctor 无库保守保留+orphan 删前 review 锚点复核+native-worktree force 不删用户分支；CLI 双入口。②brainstorm-auto design 扩为完整骨架（含紧邻豁免短语字面示例+宽写法警示），brainstorm 同步补两例；骨架×校验器正则自契测试钉住防漂移。③troubleshooting 42 条归档（hunk 级暂存应对/锁覆盖边界声明/规避优先级 worktree 隔离>hunk 分离>时序错峰）
结果：npm test 310 个测试文件 0 失败（新增 adopt-branch 19 断言、auto-skeleton 13 断言；doctor 测试②反转+③b 新增）；lint 416 文件通过；doc-ref-check 84 引用全过；docs/prompt 再生+worktree-and-guard/file-lifecycle/troubleshooting 41+42 同步
