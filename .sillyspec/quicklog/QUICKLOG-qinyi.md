
## ql-20260912-010-0b9e | 2026-09-12 15:28:10 | 审查遗留终批：worktree.js hash-object/ls-tree argv 分批 + _branchReviewReferences 精确校验 +…
状态：已完成
关联变更：（无）
文件：
- src/worktree.js（三项）
- src/git-helper.js（env 选项）
需求：审查遗留终批：worktree.js hash-object/ls-tree argv 分批 + _branchReviewReferences 精确校验 + _createBaselineCheckpoint env/统一入口
根因：① 数百长路径全量 argv 逼近 Windows 32767 上限，hash-object 失败返 null 致 hasUnappliedChanges 全量误判 pending 卡死 cleanup；② 整分支 rev-list 进 Set 大历史仓可观内存时间且缩写 hash 漏检（rev-list 输出全 hash，缩写引用匹配不上——误删后悬空）；③ env 裸替换丢 SystemRoot/USERPROFILE/TEMP + 绕过 safeGit 的 safe.directory（dubious-ownership 必败）+ 无 timeout/maxBuffer。触及 worktree.js/git-helper.js 门禁链文件按解锁通道走 --force-baseline
方案：_chunkPathsPrivate 内联分批（环依赖规避，与 worktree-apply 同步演化注记）应用于 hash-object（批次行序拼接保索引对齐）与 _lsTreeBlobs；引用判定改先收候选 hash 再 merge-base --is-ancestor 精确校验；git() 新增可选 env 选项（缺省继承），baseline commit 走统一入口+env 展开
结果：新测试 backlog-final-batch 7/7（60 长路径分批 ls-tree 全量命中/全 hash+缩写引用检出+无关不引用/baseline checkpoint author=sillyspec）；全量 453/0 + lint 583 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：5 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/CONVENTIONS.md, docs/sillyspec/architecture-4a.md, docs/sillyspec/doc-consistency-debt.md, docs/sillyspec/prompt-control-debt.md, test/backlog-final-batch.test.mjs

## ql-20260912-011-ffdc | 2026-09-12 18:50:23 | 修审计两摩擦：并行会话 spec 残留 fail-closed 误拦（归档移动只能 --allow-delete）+ gen:types 行尾重写假 M 噪声
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（foreignSpecChurn 分流 + mtime 归因 + EOL safeGit 对照）
- src/run/quick-audit.js（两软警告段渲染）
- test/quick-audit-foreign-residue.test.mjs（4 用例）
- docs/sillyspec/troubleshooting.md（§62）
需求：修审计两摩擦：并行会话 spec 残留 fail-closed 误拦（归档移动只能 --allow-delete）+ gen:types 行尾重写假 M 噪声
根因：①删除门对路径域不设防——.sillyspec//docs/ 共享面的他者归档移动 D 面落进时间窗即拦，审计无归因信号；②行尾重写内容零变化产 M 状态混进 changedFiles 触发文件行/各门
方案：①spec 共享面非声明删除整栈退 foreignSpecChurn 软警告（src/test 仍 fail-closed）+ 新增文件 mtime 归因注记；②--ignore-cr-at-eol 单次对照剔 EOL-only 归 eolOnlyFiles（.gitattributes 指引）；修首版 gitQuiet 未 import 致 new Set(null) 空集全误剔的坑（safeGit + null 透传，audit 回归抓出）
结果：quick-audit-foreign-residue 4/4；audit-quick-completion 55/55（危险 blocked 恢复）；全量 npm test 460/460；lint 591 文件 0 fail；docs check 553 全过

## ql-20260912-012-ce01 | 2026-09-12 19:09:17 | 修驾驭第十七批四摩擦+dogfood 快照 lint 超时主仓回退
状态：已完成
关联变更：（无）
文件：.sillyspec/docs/sillyspec/modules/machine-interface.md（+1/-1）, docs/sillyspec/prompt-control-debt.md（+5/-5）, src/run/gate-snapshot.js（+27/-0）, src/task-review.js（+16/-1）, src/verify-postcheck.js（+4/-2）, src/verify-probes.js（+8/-3）, test/gate-snapshot-layout-guard.test.mjs（+90/-0）, docs/sillyspec/troubleshooting.md（+7/-0）
需求：修驾驭第十七批四摩擦+dogfood 快照 lint 超时主仓回退
根因：writer 无溯源、pnpm store 跨根失效、NEW 前缀失配、heredoc 截断、junction I/O 慢致 lint 超时假败
方案：溯源戳四 writer+emptyDiff 直显；布局探测回退；探针剥前缀；落档；timeoutMs+超时主仓复跑（含 const→let 修复）
结果：新测 4/4 回归 10/10 全量 461/461 主仓 lint 0 fail docs check 553 全过
审计：📎 文档引用失效：3/100 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/prompt-control-debt.md:219] gates.js:1183 → src/run/gates.js: 关键词缺失：期望任一「validateFileLocations」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：   ❌ [docs/sillyspec/prompt-control-debt.md:219] gates.js:1183 → src/run/gates.js: 关键词缺失：期望任一「validateFileLocations」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：   ❌ [docs/sillyspec/prompt-control-debt.md:219] gates.js:1339 → src/run/gates.js: 关键词缺失：期望任一「validateFileLocations」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：🔧 行号漂移已自动重锚 3 处（同口径复跑：3 → 0；剩余 0 处需人工 sillyspec docs check）
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/run/gates.js, src/run/verify-quality-scan.js, .patch16-tmp.mjs

## ql-20260914-001-a4de | 2026-09-14 09:11:25 | 根治平台进度同步自回声假冲突：血统归属判定 + base_ts 单调回填 + 冲突文件过期自清
状态：已完成
关联变更：（无）
文件：
- src/sync.js（pull 冲突路径加自回声血统归属（platLin∈[base,local_modified]⇒推进base不落冲突文件）+ push 409 同族判定（推进base后continue重推）+ 冲突抑制块过期自清（base≥文件平台ts⇒清文件恢复推送））
- src/progress/change-registry.js（_updatePlatformLastSync 回填改 MAX 单调推进（双COALESCE防NULL），注释记坑 sync-base-ts-out-of-order-backfill）
- test/platform-sync-self-echo.test.mjs（新增 8 段：pull 自回声/外来血统/低血统 fail-closed、push 409 自回声重推/外来、MAX 单调三态、冲突文件自清+对照）
- test/platform-sync-base-ts-advance.test.mjs（第 2/3 段断言改写为单调契约（旧回执保高不降——原断言编码的正是本次修的覆写行为））
- docs/sillyspec/platform-interface-map.md（5 处行号锚重锚（pullList 1298→1352、collectStatus 2060→2045、_submitApproval 2097→2171×2、syncDocuments 2029→1051））
需求：根治平台进度同步自回声假冲突：血统归属判定 + base_ts 单调回填 + 冲突文件过期自清
根因：multi-agent-platform 实证 6 个进度冲突全部是本机自推回声被误判为他端更新：①同机多进程并发推送时 base_ts 回填乱序落地，旧回执覆盖已推进的 base 重开回声窗，下次 push 409/pull 把自家回执当外来更新；②冲突判定只比时间戳先后，不用平台快照自带的 last_local_modified_ts 血统标记做归属；③冲突文件在即永跳自动推送且永不自清，即便 base 已被后续 resolve/自愈追平（ctx-usage 实证残留），人工 resolve 后下次 --done 再触发同竞态，故复发
方案：① change-registry.js _updatePlatformLastSync：COALESCE 直写改 MAX 单调推进（双 COALESCE 防 SQLite MAX NULL 语义），旧回执不再覆盖已推进 base，与仓内 resolve/自愈四处 MAX 写法对齐；② sync.js push 409 与 pull 冲突两路径加自回声血统归属：平台快照 changes[0].last_local_modified_ts ∈ 本地 [base_ts, last_local_modified_ts] ⇒ 判为本机自推回声——pull 不 import 不落冲突文件、base 推进到平台 ts，push base 推进后自动重推；区间外维持原冲突判定（本地永不覆盖血统比自己新的平台状态，零误放行）；③ sync() 冲突抑制块加过期自清：base ≥ 冲突文件记录的 platform_last_pushed_at ⇒ 自动清除文件恢复推送，判不出维持抑制 fail-closed；status() 只读约束不动
结果：聚焦 10 个 platform-sync/hub 套件全 PASS；npm run lint 通过（593 文件 0 告警）；全量 npm test 462/462 通过（含新增 test/platform-sync-self-echo.test.mjs 8 段与 doc-ref-check 87/87 锚校验）；未部署（CLI 发版另走流程）

## ql-20260914-002-4670 | 2026-09-14 09:28:29 | 修复 quick 会话 ql-ID 分配竞态：启动预留的 ql-ID 写入 guard.json 后，并行会话可分到同一 ID（实证 2026-09-13 007-1351 双占用）。分配时对 QUICKLOG 已有条目查重 + 他者会话 …
状态：已取消
关联变更：2026-09-14-quick-exit-tiered-gates
文件：src/quicklog.js, src/run/complete-handlers.js, src/run/stage.js

## ql-20260914-003-4d6c | 2026-09-14 09:30:31 | 根治 quick 会话 ql-ID 分配竞态（坑 ql-id-double-occupancy…
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（分配查重（guard 预留让位+容错扫描+全 ID 末检）+ countQuicklogEntries/collectGuardReservedQuicklogIds 新导出）
- src/run/complete-handlers.js（--done 占用校验（双条目硬拦/他者占用换号）+ 最终 ID 回写 guard + 条目丢失自愈）
- src/run/stage.js（启动分配传 sessionsDir）
- test/quicklog-ql-id-race.test.mjs（新回归 25 断言）
- test/quick-cli-managed-e2e.test.mjs（验收 4 契约随改（硬拦→自愈））
- docs/sillyspec/platform-interface-map.md（complete-handlers 行号锚重锚 1851）
- docs/sillyspec/quick-sync-block-filenotes-and-quicklog-mixed-commit.md（新知识档（用户点名路径））
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（sync.js 锚重锚 2171（并行会话提交遗留漂移））
- .sillyspec/knowledge/known-issues.md（坑 ql-id-double-occupancy 条目）
需求：根治 quick 会话 ql-ID 分配竞态（坑 ql-id-double-occupancy，实证 2026-09-13 ql-20260913-007-1351 双占用）
根因：分配唯一性依赖 QUICKLOG 条目在盘；条目可被并行 git 操作回滚丢失而 guard.json/进度库预留存活——窗口内 scanExisting 看不见已预留序号/后缀，并行会话复用同 ID（历史 ql-20260604-001-7a4c 同款先例）
方案：三层护栏：①分配查重——allocateQuicklogEntry maxSeq 并入他者活跃会话 guard 预留（collectGuardReservedQuicklogIds 新导出，7 天僵尸不钉号，sessionsDir 经 resolveQuickSessionsDir 对齐平台模式）+ 盘上容错扫描（畸形头）+ 候选全 ID 末检；②--done 占用校验——countQuicklogEntries 盘上同 ID ≥2 硬拦（不猜归属），他者 guard 仍预留同 ID 换新号完成（原 ID 让位，双方记录不混写）；③最终 ID 回写 guard.json + 条目丢失原硬拦改原 ID 补建自愈
结果：新增回归 test/quicklog-ql-id-race.test.mjs 25 断言全绿（单元：guard 让位/僵尸不钉/畸形头容错/计数/采集 + e2e：双条目硬拦/他者占用换号/条目丢失自愈）；quick-cli-managed-e2e 验收 4 契约随改（删条目→自愈补建）；全量 npm test 463/463 + lint 0 告警 + docs check 555 处引用全过（顺带重锚 platform-interface-map/ARCHITECTURE 两处漂移锚）

## ql-20260914-004-f4c9 | 2026-09-14 10:01:42 | 根治 quick 单活跃变更无条件自动关联（坑 quick-single-change-auto-link，实证 2026-09-14 误挂他者空骨架变更）
状态：已完成
关联变更：（无）
文件：
- src/run/quick-audit.js（resolver 单候选信号门控 + 返回 changes/autoLinked）
- src/run/command.js（linkedAuto 传递链 + guard 持久化恢复）
- src/run/stage.js（guard 落 linkedChangesAuto）
- src/run/complete-handlers.js（归档闸止血（autoLinked 命中 skip））
- test/quick-single-change-auto-link.test.mjs（新回归 8 用例）
- docs/sillyspec/platform-interface-map.md（command.js 锚重锚）
- docs/sillyspec/prompt-control-debt.md（command.js 锚重锚）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（command.js 锚重锚）
需求：根治 quick 单活跃变更无条件自动关联（坑 quick-single-change-auto-link，实证 2026-09-14 误挂他者空骨架变更）
根因：resolveQuickLinkedChanges 的「1 活跃变更直接 return」来自 2026-07-02 单用户流假设（43cf739）；多 agent 仓库里唯一活跃变更常是他者会话遗留——挂载污染 tasks.md，且 --done 僵尸清理通道可把他者变更误归档；单候选还绕过 quick-recommend 的 quick-hex8 会话过滤（会话互挂）
方案：①信号门控：单候选也跑 quick-recommend 双信号打分（脏文件×design 清单/任务描述×proposal 2-gram），score>0 才自动关联+大声提示，否则不关联+提示；会话行被过滤天然不关联 ②autoLinked 溯源：resolver 返回 changes+autoLinked，command→runStage→guard 落 linkedChangesAuto，--done 复用 guard 同步恢复 ③归档止血：closeQuickLinkedChanges 对 linkedChangesAuto 命中变更 skip（机器猜测非协作声明不触发破坏性归档），显式关联僵尸清理 D-002 契约不变
结果：新增回归 test/quick-single-change-auto-link.test.mjs 8 用例全绿（resolver 门控 4 + 归档闸止血/对照 2 + e2e 自动关联不归档/显式归档照常 2）；全量 npm test 464/464 + lint 0 告警 + docs check 557 处全过（command.js 漂移锚重锚 5 处）；既有 quick-close-linked-changes 契约测试零改动通过
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/knowledge/known-issues.md, docs/sillyspec/quick-sync-block-filenotes-and-quicklog-mixed-commit.md

## ql-20260914-005-5dd0 | 2026-09-14 10:17:41 | CLI 自回声归属升级身份优先：平台回传 last_pusher（服务端 ql-20260914-006-e395 已落）后，pusher≠本人一律真冲突堵跨机慢钟盲区；pusher==本人且血统不新于本地才自愈；身份缺失回退血统窗口
状态：进行中
关联变更：2026-09-14-quick-exit-tiered-gates
文件：src/sync.js

## ql-20260914-006-7221 | 2026-09-14 10:17:51 | CLI 自回声归属升级身份优先：last_pusher≠本人一律真冲突堵跨机慢钟盲区
状态：已完成
关联变更：（无）
文件：
- src/sync.js（_isSelfEchoAttribution 身份优先归属 + push409/pull 接线 + IGNORE_KEYS 补 last_pusher）
- test/platform-sync-self-echo.test.mjs（第 8/9 段身份用例 + mock last_pusher/platform.user 注入）
- docs/sillyspec/sillyhub-progress-sync-contract.md（§4.2 服务器权威钟算法 + §4.3 200 body + §4.4 409 body last_pusher + §6 GET 顶层）
- docs/sillyspec/platform-interface-map.md（4 处锚重锚（syncDocuments 1058/pullList 1387/collectStatus 2089/_submitApproval 2215））
需求：CLI 自回声归属升级身份优先：last_pusher≠本人一律真冲突堵跨机慢钟盲区
根因：第一批血统归属判定基于客户端时间戳：他机慢钟可把外来更新的血统伪装进本地 [base, local_modified] 窗口被误判自回声覆盖（审查暴露的窄盲区）；且服务端存客户端时钟原值，乐观锁与『平台更新』判定跨机偏差本身失真。服务端已改（multi-agent-platform ql-20260914-006-e395）：last_pushed_at 存服务器权威钟、200/409/GET 回传 last_pusher
方案：sync.js 新增 _isSelfEchoAttribution：身份优先（pusher≠本人外来否决 / ==本人仅保血统上界、下界放开 / 任一侧缺失回退双界窗口 / platLin 缺失 fail-closed），push 409 与 pull 两路径接线（身份来源与发送侧同口径 platform.user||resolvePlatformUser）；_progressContentEquals IGNORE_KEYS 补 last_pusher（服务端 GET 顶层新元字段，不忽略则内容一致自愈恒 false）；契约文档 §4.2/4.3/4.4/§6 同步 + interface-map 4 锚重锚
结果：platform-sync-self-echo 新增身份匹配（下界放开）与身份否决（盲区关闭回归）4 用例全过；聚焦 11 套件含 doc-ref-check 87/87 全 PASS；lint 595 文件 0 告警；全量 npm test 464/464；CLI 未发版（需 bump+重装生效）

## ql-20260914-007-fcb7 | 2026-09-14 10:27:34 | 修复 explore --done 拒绝提示缺自身出口与 default 空目录污染，及墓碑 409 回执刷屏
状态：已完成
关联变更：（无）
文件：
- src/progress.js（initChange 对 default 停建 changes/ 目录（系统键与 quick-hex8 同待遇，进度真相在 DB））
- src/run/command.js（resolveAuxiliaryDefaultAffinity 亲和锚定 + 守卫 !progress 前置 + explore 报错分支）
- src/sync-noise.js（变更级 change_deleted 回执噪音闸（marker sync-noise-change-deleted.json 按变更名键控））
- src/sync.js（三处回执行走闸 + res.ok 精清窗口 + manual 选项）
- src/index.js（platform sync 手动命令传 manual:true 旁路）
- test/default-no-dir-and-affinity.test.mjs（default 停建目录/亲和/文案回归 19 断言）
- test/sync-change-deleted-noise.test.mjs（噪音闸单元+集成 7 用例）
需求：修复 explore --done 拒绝提示缺自身出口与 default 空目录污染，及墓碑 409 回执刷屏
根因：initChange 对系统生成 key（default）无条件物化 changes/default/ 空目录——default 行是辅助阶段无实体产物的进度容器，空目录致 next.js 误报与目录计数失真，多活跃库中 explore --done 解析失败被守卫拒且报错只指 brainstorm；409 change_deleted 是终态幂等回执永不自愈，既有噪音闸只覆盖连接类失败
方案：initChange 对 default 停建目录（同 quick-hex8 待遇）；command.js 新增 resolveAuxiliaryDefaultAffinity（default 行在途本阶段锚回、显式 --change 优先）+ 守卫 !progress 前置 + 报错补 explore --change default 提示；sync-noise.js 新增按变更名键控的 change_deleted 回执噪音闸（首报可见/窗口静默/过期重报/推送成功精清/manual 旁路），sync.js 三处接线 + index.js platform sync manual 旁路
结果：回归 26 断言全过（default 停建与亲和 19 + 噪音闸 7）；全量 npm test 466 文件 0 失败、lint 0 告警、docs check 557 全过（5 处行号重锚）；sync/runtime 模块卡 + changelog + known-issues 同步
