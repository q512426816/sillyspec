
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
