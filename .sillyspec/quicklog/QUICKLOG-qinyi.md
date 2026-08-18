
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
