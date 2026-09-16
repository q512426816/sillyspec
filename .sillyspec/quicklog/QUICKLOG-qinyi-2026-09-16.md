
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

## ql-20260914-008-49ad | 2026-09-14 11:19:01 | SKILL/README 特性叙事按四层能力地图补齐并新增推广基准稿
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/capability-highlights-2026-09-14.md（推广与介绍对外叙事的单一基准稿，新增能力落地时须同步本文）
- SKILL.md（frontmatter 定位+核心特性四层化）
- README.md（标语/问题域/核心特性四层化）
需求：SKILL/README 特性叙事按四层能力地图补齐并新增推广基准稿
根因：对外特性叙事停留在品类词层（SDD/TDD/worktree），scope-audit、contract-matrix、跨仓隔离、跨机派发、friction-tally 等后落地机制零暴露，维护者自己都数不出真实亮点（2026-09-14 全仓模块盘点实证能力面跑在叙事前面）
方案：三文件纯文档变更：①新增 docs/sillyspec/capability-highlights-2026-09-14.md 推广基准稿（电梯稿三版/竞品本质区别表/四层能力地图带模块锚点/数据面板/四条质疑标准回应/诚实边界/叙事纪律）；②SKILL.md description 换变更账本+确定性验收定位，核心特性改四层结构；③README 标语与问题域更新（补多 agent 并行痛点），核心特性换四层结构保留平台同步细节，加基准稿链接
结果：纯 doc 变更无触及 src/test；docs check 565 处引用全通过 exit 0（2 处 advisory 为存量他档问题非本次引入）；引用一律模块路径不带行号防锚点漂移

## ql-20260914-009-4623 | 2026-09-14 13:26:08 | P1 判级基重审条件落卡——用户评审 quick-exit-tiered-gates 接受 fileCount（含文档）判级基但附条件…
状态：已完成
关联变更：（无）
文件：.sillyspec/docs/sillyspec/modules/core-engine.md（+1/-1）
需求：P1 判级基重审条件落卡——用户评审 quick-exit-tiered-gates 接受 fileCount（含文档）判级基但附条件：升 blocking 另立变更时须重审
根因：裁决条件此前只在对话里，无载体即蒸发；未来升 blocking 变更 brainstorm 经模块路由必读 core-engine 卡，THRESHOLDS 行是最小合法落点（knowledge/decisions 机器维护勿手改，归档 decisions 加版本过重）
方案：core-engine.md THRESHOLDS 行追加 ⚠️ 条件句：现裁决依据（旧规则边界连续+advisory 容忍）+ blocking 期两类成本（2代码+2文档误伤、文档同步者系统性跨阈激励成本）+ 候选（文件维改 codeFileCount）+ 溯源（用户裁决 2026-09-14/ql-20260914-009-4623）
结果：docs check 定向通过（2 处悬空为 file-lifecycle/token-cost 他文件预存 advisory 与本卡无关）；纯文档单文件零测试面；P2 裁决（proposal 历史数字不修正——同目录校准记录 5.9% 为权威定稿且方向更强）按用户判断不动

## ql-20260914-010-a1b8 | 2026-09-14 13:29:09 | 把 apply 与并行会话工作区互相冲掉的事故按现象/根因/护栏/证据四段补进 troubleshooting（用户评审裁定的护栏结论三条）
状态：已完成
关联变更：（无）
文件：docs/sillyspec/design-d7-scan-lifecycle.md（+1/-1）, docs/sillyspec/platform-interface-map.md（+8/-8）, docs/sillyspec/prompt-control-debt.md（+3/-3）, docs/sillyspec/troubleshooting.md（+10/-0）
需求：把 apply 与并行会话工作区互相冲掉的事故按现象/根因/护栏/证据四段补进 troubleshooting（用户评审裁定的护栏结论三条）
根因：主仓工作区共享可变缓冲区；本次 apply 走 rescue 出口人工落地未立即 git add，分钟级裸奔窗口被并行会话工作区级 git 操作命中（restore/clean 类 reflog 不可见）；自动主路径 3way+merge 已覆盖大半，真缺口仅 mergeDirtyOverlapThreeWay 写回 :143 不进暂存区
方案：troubleshooting §64 落档四段：护栏=①merge 写回补显式 pathspec git add+apply-manifest.json 指纹+rescue 提示补立即锁定 ②apply 前重叠检测升 fail-closed（文件集用活跃 quick guard.json --files 相交判定，勿用 last_active 当心跳）③所有权登记暂不做记 ROADMAP；盲区如实声明。顺带 docs check --fix 清偿本变更提交造成的 4 处活文档行号漂移
结果：troubleshooting §64 落盘；docs check exit 0 零失效；纯文档无需测试；护栏三条可直接作 brainstorm 输入
审计：[gate] L1（跨 0 模块 · 4 文件：0 代码/0 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量不适用（≤1 代码文件）

## ql-20260914-011-be6b | 2026-09-14 13:56:24 | 模块域门禁三条 UX 修复（幻觉报错自足/NEW: 规则预告/收尾元数据告警按变更隔离）
状态：已完成
关联变更：（无）
文件：
- src/design-facts.js（幻觉 ERROR 消息自足（map 路径+id 示例）+ locateIdInSiblingProjects 兄弟项目归属消歧，仍 fail-closed）
- src/run/gates.js（validateMetadata 增 changeName 按变更隔离（本变更逐列/他变更折叠汇总），缺省历史行为不变）
- src/stages/brainstorm.js（step8 decisions.md 模板后补可选字段说明（NEW: 写法+勿读他子项目 map））
- docs/prompt/brainstorm.md（_sync 镜像同步，附带收敛 3 处此前会话积压的 prompt 漂移（变更名 exit2 提示×2/Design Grill 无子代理降级））
- docs/prompt/_extracted.json（_extract 再生产物）
- test/design-facts.test.mjs（新增 2 用例（ERROR 消息自足/兄弟项目 map 归属消歧））
- test/validate-metadata-scope.test.mjs（新建 9 用例（隔离折叠/缺省回退/零输出））
- docs/sillyspec/prompt-control-debt.md（L219 行号重锚（gates.js:1190→1209、1346→1365））
需求：模块域门禁三条 UX 修复（幻觉报错自足/NEW: 规则预告/收尾元数据告警按变更隔离）
根因：用户实跑反馈三连——①模块域核验 ERROR 只说补录 map 不说哪张 map 合法，多项目仓 agent 按占位提示读子项目 map 拿回不认的 id 撞死胡同 ②NEW: 前缀规则只写在 step6 模板而门禁挂 step8 --done，step8 的 decisions.md 格式模板九字段无一预告，属先撞墙才知道的隐性契约 ③阶段收尾元数据告警整仓扫 changes/ 只按 10 分钟窗过滤，并行会话（session-export）文件逐条混入本变更输出易误读
方案：①design-facts.js 幻觉 ERROR 内嵌解析出的 map 完整路径+合法 id 示例（≤5 全列+总数），新增 locateIdInSiblingProjects 查兄弟项目 map——id 属他子项目时报归属与「只认当前项目 map」（语义不变仍 ERROR 拦）②brainstorm.js step8 decisions.md 围栏后补可选字段 blockquote（锚点/模块域/否决理由/复潮条件；模块域含 NEW: 冒号后不加空格写法+多项目仓勿读他子项目 map），_extract/_sync/_verify 镜像同步 ③gates.js validateMetadata 增 changeName 参（completeStageGates 传入）——本变更目录逐列、其他变更目录折叠一行汇总（目录名×计数+并行会话忽略/同批包补录处置提示），changeName 缺省保持历史全量逐列
结果：npm test 全量绿——design-facts 118 用例 0 失败（新增 2——消息自足/兄弟项目消歧），新建 validate-metadata-scope 9 用例 0 失败；lint 602 文件 0 问题；docs check 本会话引用 0 失效（prompt-control-debt L219 行号重锚 1190→1209/1346→1365；余 2 失效属并行会话 apply-conflict-hardening 在途变更非本会话产物）
审计：[gate] L2（跨 5 模块 · 11 文件：5 代码/3 测试）advisory；模块文档认领缺失（同步模块卡进改动集，或 --no-docs 显式豁免）
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/index.js, src/scan-postcheck.js, test/scan-refresh.test.mjs

## ql-20260914-012-c9e0 | 2026-09-14 14:18:08 | scan-refresh 重审四缺陷修复（HEAD 逃逸门/路径穿越校验/help 补 force/bump 尾部容错）
状态：已完成
关联变更：（无）
文件：
- src/scan-refresh.js（HEAD 门+裸名校验+白名单哈希资格前置）
- src/scan-postcheck.js（bumpFrontmatterKeys 尾部容错）
- src/index.js（help --done 补 [--force]）
- test/scan-refresh.test.mjs（4 新回归+审计字段断言+e2e fixture 重组）
需求：scan-refresh 重审四缺陷修复（HEAD 逃逸门/路径穿越校验/help 补 force/bump 尾部容错）
根因：P1 ①拍→--done 间 HEAD 被他者推进时 finalize 重取当前 HEAD 盖章，未核对 commit 被盖成已核对；P2 --docs 无裸文件名校验可 ../ 穿越盖章 modules/；P3 help --done 漏 --force、bump 遇尾 --- 无换行产生双 frontmatter；另 guard 白名单 push-before-hash fail-open
方案：finalizeRefresh 前置 HEAD 一致性门（短哈希 vs guard.sourceCommit 7 位归一，不等 code 2 拒绝重跑①拍，硬门无 force）；--docs 逐名裸文件名校验拒路径分隔符；help 补 [--force]；bump 正则放宽尾部容错重建统一补换行；白名单成员资格=哈希在手 push 后置
结果：scan-refresh.test 19/19（16→19，新增 HEAD 推进拒绝/穿越拦截/双块防护/键集不变式 4 回归）；lint 0 告警；npm test 全量 469 文件 0 失败（CLI 门禁亲测）

## ql-20260914-013-e7ba | 2026-09-14 14:31:53 | scope-audit quick 未声明噪音过滤修正
状态：已完成
关联变更：（无）
文件：
- src/scope-audit.js（声明即归属硬切+降级支过滤+isQuickMetadata import）
- test/scope-audit.test.mjs（FR-04 断言按新语义更新）
- src/scope-audit.js（自采形态 A+pathspec 收窄+sha256 归一）
- src/run/complete.js（写入方归一 hash）
- src/run/complete-handlers.js（写入方归一 hash）
- test/scope-audit.test.mjs（untracked 并入+无锚退 HEAD 窗口补路径）
需求：scope-audit 快照归属面修复（平台+本仓三实测）
根因：multi-agent-platform 186KB 快照 23/44 段并行噪音冻入+CRLF 假篡改告警；本仓 2026-09-14 执行中变更 22 文件+11840 夸张放大
方案：execute 采集 apply-pathspec 收窄；形态 A 自采纯 worktree 口径（弃 verify 证据核验面）；sha256 CRLF 归一化双侧同口径
结果：node --test 35/35；npm test 全量 0 失败；本仓 22 文件+11840→3 实改+7 计划未动；平台归档 --file 假篡改告警消除
审计：[gate] L1（跨 2 模块 · 3 文件：3 代码/0 测试）advisory；每文件注记已全覆盖；测试增量缺失（3 个代码文件无测试改动）

## ql-20260914-014-7da8 | 2026-09-14 15:43:38 | scope-audit ql-xxx 反查支持
状态：已完成
关联变更：（无）
文件：
- src/scope-audit.js（findQuickSessionByQlId+顶层 ql 分支+buildQuickRecordResult）
- src/index.js（预检放行 ql-xxx）
- test/scope-audit.test.mjs（ql 反查两例）
需求：scope-audit ql-xxx 反查支持
根因：「为什么不直接用 ql-xxx 查」——映射只在本机 guard、会话结束即清，历史 quick 拿不到 quick-xxxx 只能占位
方案：patches 按 qlId 命名+json 冗余 sessionId 是平台可抓的持久映射；findQuickSessionByQlId 文件名前缀反查；ql 分支提升到主入口顶层；预检放行 ql-xxx
结果：node --test 37/37；npm test 全量 0 失败；platform 实测 ql-xxx 直出记录态

## ql-20260914-015-0b5e | 2026-09-14 19:13:31 | postmortem §65——归档后 worktree 被并行会话清理+review 放行通道放进外来文件（apply-conflict-hardening 收官期两惊险），四段落 troubleshooting
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260914-016-8786 | 2026-09-14 21:58:08 | wt-commit 幽灵命令根治——index.js 补 dispatch 接线 runWtCommit
状态：已完成
关联变更：（无）
文件：
- src/index.js（case wt-commit dispatch + help 行）
- test/wt-commit-dispatch.test.mjs（新建 5 断言（含鬼命令回归哨兵））
- .sillyspec/knowledge/known-issues.md（条目补已根治记录+锚加?）
- docs/sillyspec/platform-interface-map.md（--fix 行号重锚）
- docs/sillyspec/architecture-4a.md（--fix 行号重锚）
- docs/sillyspec/file-lifecycle.md（--fix 行号重锚）
- docs/sillyspec/prompt-control-debt.md（--fix 行号重锚）
- docs/sillyspec/sillyhub-path-a-contract.md（--fix 行号重锚）
- .sillyspec/docs/sillyspec/modules/runtime.md（--fix 行号重锚）
- .sillyspec/knowledge/decisions/unmapped.md（--fix 行号重锚）
需求：wt-commit 幽灵命令根治——index.js 补 dispatch 接线 runWtCommit
根因：runWtCommit 模块自 bd1cb91 引入以来无任何调用点（孤儿模块），worktree-cwd 守卫还专门豁免了 wt-commit 命令名、execute Wave prompt 教 agent 用它，但 dispatch 无 case——实际跑报「未知命令」；worktree-cwd-guard 豁免测试断言太弱（未知命令错误不含拦截文案也算过），鬼命令存活至今（2026-09-14 knowledge-loop-close execute W1 实证，task-01 review notes 记档）
方案：index.js 新增 case wt-commit：解析 --change/-m/--pathspec-from-file 与 -- 后 pathspec；--change 缺省从 cwd 的 worktrees/<名> 段推断（子代理 workdir=worktree 免传）；错误 catch exit 1；help 注册。新增 test/wt-commit-dispatch.test.mjs 5 断言（CLI 真跑提交 cwd 推断/显式 --change/缺 pathspec 报 add -A 语义/缺 -m/鬼命令回归哨兵——原弱口收紧）；known-issues 条目补根治记录；docs --fix 重锚 12 处（dispatch 插入 +44 行连带漂移；知识库两文件=known-issues 根治记录+unmapped 机械重锚，--force-baseline 解锁；余 1 处漂移属并行会话在飞变更，基线 2 内）
结果：wt-commit-dispatch 5/5、wt-commit 5/5、worktree-cwd-guard 7/7；lint 611 文件 0 fail；docs check 1/576（≤基线 2）
审计：[gate] L1（跨 1 模块 · 10 文件：1 代码/1 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260915-001-ccce | 2026-09-15 00:18:37 | 四点工具摩擦修复：①apply 对 MISMATCH（主干已推进）文件自动三方合并而非跳过 ②checkbox 自动勾选链在门控时序下的断裂 ③stage review reviewType 校验报错补期望值 ④归档自动 git add 目…
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260915-002-f2b4 | 2026-09-15 01:58:57 | knowledge validate 对 uncategorized.md 误报 unregistered_file 豁免
状态：已完成
关联变更：（无）
文件：
- src/stages/knowledge.js（豁免清单+uncategorized）
- test/knowledge-validate-uncategorized.test.mjs（三态锁定）
需求：knowledge validate 对 uncategorized.md 误报 unregistered_file 豁免
根因：uncategorized.md 是暂存区语义——条目归类即迁出（classify），永不注册 INDEX 路由，validate 当未注册文件告警是误报（knowledge-loop-close verify 遗留观察①）
方案：stages/knowledge.js 校验循环豁免清单加 uncategorized.md（与 generated//proposed/ 同列）；新增 test/knowledge-validate-uncategorized.test.mjs 三态锁定（豁免生效/普通未注册仍告警/零警告回归）
结果：新测 6/6（真实 CLI 子进程）；本仓 validate 0 警告；lint 过

## ql-20260915-003-fc6e | 2026-09-15 05:04:51 | 三点工具摩擦修复——junction 归属清扫/cleanup meta 兜底探测/中断残留语法检测
状态：已完成
关联变更：（无）
文件：docs/sillyspec/platform-interface-map.md（+4/-4）, src/index.js（+10/-1）, src/task-review.js（+93/-0）, src/worktree-deps.js（+100/-2）, src/worktree.js（+117/-5）, test/tooling-friction-fixes-003.test.mjs（+286/-0）
需求：三点工具摩擦修复——junction 归属清扫/cleanup meta 兜底探测/中断残留语法检测
根因：①主仓 node_modules 被留指向 worktree .pnpm 的反向 junction，apply 后被迫 --force 重装②cleanup 早退依赖 meta+双路径全缺，meta 在 apply 后丢失即误判 mode null 跳过与实际目录不符③中断子代理留半成品 import 语法坏文件无自动检测
方案：sweepForeignNodeModulesJunctions 三挂点（create/cleanup/install 前零穿透删除）；_probeWorktreeRemnants 双探针兜底（git 分支注册+runtimeRoot 口径，全不命中输出诊断清单）；detectInterruptedSyntaxResidue 挂 writeTaskReview（.js 双跑仲裁防 Node v24 假阴，advisory）
结果：npm test 483/483+lint 620 绿；新 10 用例双平台；--force-baseline 理由=worktree.js 受保护面的刻意机制修复（挂点+兜底探测，483 全绿实证）；--no-docs 理由=三卡当日已由 change-ownership task-04 更新且并行会话在途占用，避免冲突
审计：[gate] L1（跨 3 模块 · 6 文件：4 代码/1 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含

## ql-20260915-004-6701 | 2026-09-15 07:42:55 | 三坑修复：①docs gate 基线陈旧假拦（改对比 origin/main 实测而非本地基线文件）②探针 7 覆盖矩阵预填漏证据列 ③worktree 快照断言漂移的 committed-drift 提示
状态：已取消
关联变更：（无）
文件：（见实际改动）

## ql-20260915-005-d3e7 | 2026-09-15 11:51:49 | 修复 knowledge 命令 flag-as-value 参数缺陷并清理 INDEX 垃圾路由
状态：已完成
关联变更：（无）
文件：
- src/knowledge-classify.js（pick() 增 flag-as-value 防护，flag_as_value 报错拦截（坑 knowledge-flag-as-value））
- src/stages/knowledge.js（search/inspect 同型防护 + validate 新增 flag_like_keyword 告警）
- .sillyspec/knowledge/INDEX.md（重写 9 条字面量 --file 垃圾路由关键词（a49e7a5 引入），锚点不动）
- test/knowledge-classify.test.mjs（Test 13 flag-as-value 拦截回归）
- test/knowledge-validate-uncategorized.test.mjs（flag_like_keyword 告警用例）
需求：修复 knowledge 命令 flag-as-value 参数缺陷并清理 INDEX 垃圾路由
根因：pick() 朴素 indexOf 取值把紧跟 flag 当 --keywords 值，字面量 --file 被写成 INDEX 路由行关键词（a49e7a5 实证 9 条），validate 对其放行，且污染 execute/quick 的知识注入匹配
方案：classify 五个取值参数（--ql/--title/--file/--section/--keywords）统一 flag_as_value 报错拦截；search/inspect 值以 -- 开头按缺参处理；validate 新增 flag_like_keyword 告警；按条目正文重写 9 条存量路由关键词；补 3 组回归测试
结果：classify 84/84、validate 8/8 单跑绿；全量 npm test 485/0（scan-refresh/scan-staleness 并发假红被串行复核吸收，既有已知 flake）；lint 622 文件 0 告警；CLI 实测五项行为符合预期（垃圾路由消除、validate 0 告警、classify 拦截、search 缺参报错、新关键词可检索）
审计：[gate] L1（跨 2 模块 · 5 文件：2 代码/2 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260915-006-135f | 2026-09-15 16:27:39 | 修复跨仓/门控四坑——register-repo 平台模式写死配置 / design_file_ref 跨仓盲目 / verify 命令路径解析 / deps…
状态：已完成
关联变更：（无）
文件：docs/sillyspec/architecture-4a.md（+4/-4）, docs/sillyspec/doc-consistency-debt.md（+2/-2）, docs/sillyspec/file-lifecycle.md（+1/-1）, docs/sillyspec/platform-interface-map.md（+1/-1）, docs/sillyspec/prompt-control-debt.md（+2/-2）, src/design-facts.js（+56/-17）, src/index.js（+18/-1）, src/run/gates.js（+40/-7）, src/stages/cmd-existence.js（+9/-3）, src/stages/plan-postcheck.js（+32/-5）, test/enforce-deps-gate-diagnostic.test.mjs（+80/-1）, test/session-friction-crossrepo-fixes.test.mjs（+201/-0）
需求：修复跨仓/门控四坑——register-repo 平台模式写死配置 / design_file_ref 跨仓盲目 / verify 命令路径解析 / deps 门控手动重试无效
根因：wp 奖惩功能开发会话（2026-09-15）实证的四个 CLI 摩擦：①register-repo 平台模式写平台 spec 根 local.yaml，repos: 读侧（execute MultiRepoContext/worktree-cross）恒读项目侧，注册=死配置，agent 被迫试出 --spec-dir 绕过；②validateDesignFileList 只按主仓核验存在性，## <repo> 仓变更（D-014）段下跨仓修改既有文件被逼标 NEW: 过 gate（41 条误报，标修改语义撒谎）；③TaskCard verify 的 cd <绝对路径> 被 join(主仓根) 拼病态路径、卡片 repo: 声明未切换命令校验基准根，真实命令被误判死命令；④deps 门承诺『手动安装依赖后重试』但 manual install 不改 meta.depsStatus，failed 态重试 --done 必撞墙，唯一出路 doctor --fix
方案：①无显式 --spec-dir 时 register-repo 写目标走读侧对齐链（<cwd>/.sillyspec/local.yaml），双份 local.yaml 时输出 spec 根 repos 死配置提醒；plan-postcheck repoRegistry 读侧同步对齐项目 local.yaml。②validateDesignFileList 复用 parseDesignCoverageByRepo 按 D-014 分段，main 段核主仓、跨仓段核 repos: 注册根，未注册仓段降级 warning+指引。③cmd-existence cd 绝对路径不拼根；validateTaskCommands 按卡片 repo: 以注册仓根为命令校验基准。④enforceDepsGate --done 阻断前重供给一次并写回 meta。docs check --fix 重锚 14 处行号（本改动行漂移，纯数字零逻辑）
结果：全量 npm test 486/486 通过（新增 session-friction-crossrepo-fixes 19 项 + enforce-deps-gate-diagnostic 补 B2 自救/B3 仍阻断）；npm run lint 623 文件 0 告警；docs check --fix 后 0 失效；受影响面专项回归全绿
审计：[gate] L2（跨 4 模块 · 13 文件：5 代码/2 测试）advisory；模块文档认领已 --no-docs 显式豁免

## ql-20260915-007-9b55 | 2026-09-15 16:51:14 | 知识库文件(.sillyspec/knowledge/)纳入 quick 元数据白名单…
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（isQuickMetadata 加 .sillyspec/knowledge/ 前缀白名单（原 uncategorized 精确匹配并入前缀））
- test/quick-gate-knowledge-whitelist.test.mjs（20 条白名单+门禁+回归锁定）
需求：知识库文件(.sillyspec/knowledge/)纳入 quick 元数据白名单，登记知识条目不再要 --force-baseline、--file-notes 不再强制覆盖
根因：isQuickMetadata 只豁免 uncategorized.md，INDEX/known-issues/patterns/conventions/decisions 属 .sillyspec/ 非元数据 → 危险门 blocked；知识文件留在 gateFiles → perFileNotes 逐文件强制注记
方案：isQuickMetadata 纳入 .sillyspec/knowledge/ 整体前缀白名单（尾斜杠防 knowledge-base/ 误命中）；gateFiles/文件行/预告经既有谓词自动跟随；可追溯性靠 quicklog 结构化条目+git diff+knowledge validate
结果：新增 test/quick-gate-knowledge-whitelist.test.mjs 20 条（白名单/预告/危险门/新增门/perFileNotes/回归不外溢）全绿；npm test 487/0；lint 624 文件 0 告警
审计：📝 文档欠账（D-8）：2 个源码文件改动未同步任何模块文档（涉及模块：runtime）

## ql-20260915-008-c5c7 | 2026-09-15 16:59:02 | scope-audit 跨仓清单盲区三改进：filterDeliverableFiles 扩排工具脚手架、计划侧跨仓条目标注、退栈 planned 文件标疑似他…
状态：已完成
关联变更：（无）
文件：
- src/worktree-apply.js（classifyToolScaffold 两档分类+filterDeliverableFiles 扩排 platform 硬排+apply 主/跨仓丢弃告警）
- src/change-list.js（repoKeys 跨仓子段与 cross-repo: 前缀识别，条目带 repo 字段（缺省 null 零回归））
- src/scope-audit.js（loadRegisteredRepoKeys 读 local.yaml repos 段；三态判定增 crossRepo/facility/suspectedForeignDone 标注；渲染与汇总分流）
- src/verify-postcheck.js（resolveReconcileActualFiles 增 foreignExcludedFiles 退栈名单）
- test/scope-audit.test.mjs（组 9 三集成测试（设施桶/跨仓标注/疑似他者已实现+真未动反例））
- test/worktree-apply-meta-exclude.test.mjs（Case 9 硬排软桶逐条断言）
- test/change-list-operation.test.mjs（repoKeys 解析断言（三形态/未注册/缺省零回归））
需求：scope-audit 跨仓清单盲区三改进：filterDeliverableFiles 扩排工具脚手架、计划侧跨仓条目标注、退栈 planned 文件标疑似他者已实现
根因：① filterDeliverableFiles 只排 changes/.runtime/quicklog/meta.json，CLI 自装脚手架（.claude/skills、knowledge、local.yaml、.sillyspec-platform 系、.worktrees、attachments）全落计划外（EHS 实证 52 计划外中 34 行设施）；② parseFileChangeListDetailed 把跨仓子段当主仓路径解析、实际侧只采主仓 git → 跨仓条目恒计划未动（22 行）；③ resolveReconcileActualFiles 退栈只回计数无名单，已写盘的 planned 文件被退栈后与真未动混显（14 个）
方案：改进1：worktree-apply 增 classifyToolScaffold 两档——platform 档（.worktrees、.sillyspec-platform 系、knowledge、local.yaml，回放有害）入 filterDeliverableFiles 硬排+apply 主/跨仓两处丢弃可见性告警，tool 档（.claude/skills、CLAUDE.md、attachments，可正当交付）只打标不滤除。改进2：change-list 清单解析增 repoKeys（跨仓子段标题/<key>仓后缀/cross-repo: 前缀三形态，未注册 key fail-closed，缺省全主仓零回归），scope-audit 从 local.yaml repos 段读注册表传入，跨仓条目标 crossRepo 渲染 ⊘ 跨仓（本表不含）+note 指引对应仓对账。改进3：resolveReconcileActualFiles 增 foreignExcludedFiles 退栈名单，scope-audit 对 planned∩退栈∩盘面存在（NEW: 剥后比对）行标 suspectedForeignDone 渲染「疑似他者已实现·已退栈」；渲染层四处分流——跨仓/疑似他者/设施桶各自单列计数不占笼统 ⚠️ 计数
结果：全量 npm test 1068/1070（scan-staleness/scan-refresh 既有并发 flake 单跑 31/0 绿）；lint 624 文件 0 告警；scope-audit 40/40 含新增组 9 三集成测试、worktree-apply-meta-exclude 增 Case 9、change-list-operation 增 repoKeys 断言组（23/0）
审计：[gate] L1（跨 3 模块 · 7 文件：4 代码/3 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260915-009-f9b4 | 2026-09-15 22:34:11 | verify/archive 收尾摩擦六坑——平台模式对账形态判定双根化、探针1 词边界、③类脚手架聚合、探针5 跨仓注记、sync 409 自愈键控闸、tes…
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（含并行 ql-008 未提交 hunks（foreignExcludedFiles 族），本会话改动为 _readWorktreeMeta 双根 3 处+③类脚手架聚合）
- src/scope-audit.js（含并行 ql-008 未提交 hunks（cross-repo-blindness 改进点 1-3），本会话改动为 _readWorktreeMeta 双根 4 处）
- src/contract-matrix.js（_readWorktreeMeta 补 BOM 容错（双候选样板本在此））
- src/verify-probes.js（probe1 词边界三级口径+probe5 跨仓计数注记+导出 isUnimplementedMarkerLine）
- src/sync-noise.js（新增 syncSelfHealWarn 409 自愈键控闸+测试复位扩展）
- src/sync.js（三类 409 自愈 warn 改走键控闸（自竞态/内容一致/自回声））
- src/run/prompt.js（evidence-auto 注入块扩展 test_strategy 预检提示（危险文件已核，改动仅此块））
- test/retro-verify-friction-fixes.test.mjs（新建，六坑回归 35 断言）
- docs/sillyspec/platform-interface-map.md（仅 sync.js 行号锚重锚）
需求：verify/archive 收尾摩擦六坑——平台模式对账形态判定双根化、探针1 词边界、③类脚手架聚合、探针5 跨仓注记、sync 409 自愈键控闸、test_strategy 预检提示
根因：①meta.json 落盘根随 resolveRuntimeRoot 三态漂移，而 verify-postcheck 3 处与 scope-audit 4 处只查 specBase 单路径——源码已有同族 P1 记录且 contract-matrix._readWorktreeMeta 已双候选，唯这几处没修全（复盘 21 条②类假红根因）；②TODO_MARKER_RE 裸子串无词边界；③③类对 baseline 拷入的 .claude/skills、attachments 设施文件无软桶（58 条刷屏）；④parity 扫描根只含主仓但渲染无边界注记；⑤push 409 三类自愈分支逐次 console.warn；⑥verify prompt 仅 evidence-auto 形态注入测试策略指引
方案：①统一改走 _readWorktreeMeta 双候选（specBase 优先+cwd/.sillyspec 兜底）并补 BOM 容错，覆盖 verify 形态判定/working-tree 并入/锚点 diff 与 scope-audit diff 根/预执行信号/actual 自采/getFileDiff；②isUnimplementedMarkerLine 三级口径（尚未实现子串保持、TODO/FIXME/HACK ASCII 标识符边界、XXX 边界+CJK 紧邻排除）；③classifyToolScaffold 软桶聚合一行 note+undeclaredScaffold 计数，全脚手架判 ok；④runVerifyProbes 计数跨仓 task 卡并渲染「扫描面只含主仓」注记；⑤sync-noise 新增 syncSelfHealWarn 按 change+kind 键控闸（首报可见、10 分钟窗静默、手动旁路）接管自竞态/内容一致/自回声三类自愈 warn；⑥evidence-auto 注入块扩展——已配 commands.test 未配 test_strategy 时渲染预检提示
结果：新增 test/retro-verify-friction-fixes.test.mjs 35 断言全绿（双候选/形态判定/并入/probe1 词边界 14 形态/③类聚合/probe5 注记/409 键控闸 6 态）；npm test 488/0（含并行 ql-008 未提交改动基线）+ lint 625 文件 0 告警、未引用导出 0 项；platform-interface-map.md sync.js 锚 1058→1067 重锚
审计：[gate] L1（跨 3 模块 · 7 文件：5 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260915-010-d65d | 2026-09-15 23:51:26 | 探针3 Java布局双向失真修复+verify骨架层标注语义footnote
状态：已完成
关联变更：（无）
文件：
- src/verify-probes.js（isTestFileName三路判定替换TEST_FILE_RE子串+探针3镜像根推导与mirrorDirs字段+渲染注记+骨架层标注footnote）
- test/verify-probes-probe3-java-layout.test.mjs（新增四组用例锁双向失真修复语义与零回归）
需求：探针3 Java布局双向失真修复+verify骨架层标注语义footnote
根因：EHS生产实证（2026-09-15-ehs-reward-punishment，第三方Java传统企业仓）暴露三处：①Maven/Gradle布局测试在src/test/java同包镜像树与main侧永不co-located，探针3只递归allowed_paths目录（全在src/main侧）→task-02~06五连假⚠️靠agent逐条人工消解②TestData.java数据夹具被/test|spec/i子串命中→task-01假绿「找到1个测试文件」掩盖真无测试③骨架「层：人工判断」被用户误读为人工执行（实为agent填写、CLI不机械复跑的语义判断层），缺语义说明
方案：src/verify-probes.js：①探针3补JVM镜像测试根——moduleDirs命中src/main/(java|kotlin|scala|groovy)的目录补推src/test/<lang>同包镜像目录进扫描集（主仓∪worktree任一侧存在才列/才扫；不存在的镜像根保持⚠️真信号），task对象新增mirrorDirs字段，渲染✅行注记镜像根、⚠️行如实说明已扫②TEST_FILE_RE子串替换为isTestFileName三路命中：非字母数字分词含test/tests/spec/specs∪裸词文件名∪驼峰末段后缀Test/Tests/Spec/Specs/IT——TestData/TestUtil/TestMain（Test首段=夹具命名惯势）/specification.md/contest.css不再命中，RpFlowEngineTest/FooIT/foo.test.js/test_utils.py命中；取向宁紧勿松（漏检罕见命名落agent手查fail-visible，假绿fail-hidden更糟）③generateVerifyResultSkeleton头部blockquote补footnote：层=证据可核验性分层非执行者声明、人工判断=agent填写CLI不机械复跑gate抽查+人类审批兜底；层标注名不改（gate/存量锚定不动）
结果：新增test/verify-probes-probe3-java-layout.test.mjs四组用例（isTestFileName正反例表12+11/Java镜像根命中+TestData不假绿+无镜像根保持⚠️/JS co-located零回归/骨架footnote）4/4绿；npm test全量493文件经flaky串行复核终判491通过0失败（scan-staleness/scan-refresh并发轮失败系b7eef46已知时序flake、串行复核通过、干净HEAD单跑亦绿，与本改无关）；lint 630文件0告警
审计：[gate] L1（跨 1 模块 · 7 文件：3 代码/2 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含
审计：⚖️ 归属切分：3 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/cross-repo-reconcile.js, src/probe7-anchor-check.js, test/cross-repo-probe7-anchor.test.mjs

## ql-20260916-001-3ef8 | 2026-09-16 00:10:46 | 跨仓 per-repo 对账机器可见性 + 探针7 covered 锚点机器校验
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（含并行 dual-truth 会话在途 verify 改动（evidence V2 族），本会话改动为 collectDeclaredTargetFiles 跨仓声明留存+reconcileTargetFiles crossRepo 接线）
- src/run/gates.js（printCrossRepoReconcile 渲染+探针7 锚点 advisory 接线（本会话独占））
- src/cross-repo-reconcile.js（新建零环模块（注册表→仓根→双源 actual→三类差集+软桶））
- src/probe7-anchor-check.js（新建零环模块（covered 行 :数字 锚点校验））
- test/cross-repo-probe7-anchor.test.mjs（新建 26 断言）
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（补录两新模块路径）
需求：跨仓 per-repo 对账机器可见性 + 探针7 covered 锚点机器校验
根因：①D-004 分期一直未兑现——跨仓卡声明被剔除后零机器可见性，22 个跨仓文件归档表全标「计划未动」、探针5「frontend 0 调用」被误读，跨仓全靠人工到对应仓解释（2026-09-15 复盘）；②探针7 预填说明要求 covered 证据给 file:line 锚点，但无机器校验——复盘实证 7 行 covered 缺锚点被审查打回，人工往返一轮
方案：①新建 src/cross-repo-reconcile.js 零环模块：local.yaml repos 注册表解析仓根，各仓 actual=diff HEAD~1..HEAD ∪ status untracked（resolveVerifyChangedFiles 跨仓分支同源口径），主仓同款三类差集+classifyToolScaffold 软桶，advisory 不阻断（锚点窗口脆弱期会假信号）；verify-postcheck 声明侧留存跨仓声明并接线（crossRepo 字段走 final/degraded/skip 各出口，notes 带摘要行），gates printCrossRepoReconcile 渲染逐仓明细+②缺/③多清单；②新建 src/probe7-anchor-check.js：解析正文探针7 段表格（列序与 renderProbe7Lines 骨架同源锚定），covered 行证据列须含 :数字 锚点，缺则报 task+acceptance+当前证据；gates verify 块 probe 一致性后 advisory 接线（fail-soft）
结果：新增 test/cross-repo-probe7-anchor.test.mjs 26 断言全绿（注册仓三类差集/未注册不可达 degraded/空防御/reconcileTargetFiles 集成 3 态/锚点校验 9 态含段外行豁免）；npm test 491/0 + lint 630 文件 0 告警（module-map 补录两新模块）；git 提交让位给活跃 dual-truth 会话——同文件双方未提交改动交织，待其 verify 落地后一并入库

## ql-20260916-002-d6dc | 2026-09-16 00:21:48 | 平台模式产物落点指针——阶段完成时工作树.sillyspec落PLATFORM-DOCS-POINTER.md
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（writePlatformDocsPointer新增（三豁免+fail-soft+文档清单渲染））
- src/run/complete.js（两完成点挂钩+import扩展）
- test/platform-docs-pointer.test.mjs（新增五组用例）
- docs/sillyspec/platform-interface-map.md（shared.js插入63行致7锚重锚）
- docs/sillyspec/architecture-4a.md（锚重锚）
- docs/sillyspec/doc-consistency-debt.md（锚重锚）
- docs/sillyspec/file-lifecycle.md（锚重锚）
- docs/sillyspec/prompt-control-debt.md（锚重锚）
- .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（锚重锚）
- .sillyspec/docs/sillyspec/scan/CONVENTIONS.md（锚重锚）
- .sillyspec/docs/sillyspec/modules/setup.md（config-schema锚重锚）
- .sillyspec/knowledge/decisions/core-engine.md（gates.js论述锚降级纯位置锚）
- .sillyspec/knowledge/known-issues.md（worktree.js锚重锚）
需求：平台模式产物落点指针——阶段完成时工作树.sillyspec落PLATFORM-DOCS-POINTER.md
根因：EHS生产实证（2026-09-15-ehs-reward-punishment，说明文档§4.6）：变更9文档落daemon侧specs目录，工作树.sillyspec/只剩旧变更残留、worktree无.sillyspec——人类在工作树找变更文档扑空，只有平台changes files API能读，双位置造成「文件去哪了」困惑
方案：src/run/shared.js新增writePlatformDocsPointer：平台模式（specRoot或runtimeRoot任一在）时在cwd/.sillyspec/写人类可读指针（specRoot/runtimeRoot物理路径+workspaceId+触发阶段时间戳+本变更.md文档清单mtime+tasks/任务卡计数+两种获取方式提示）；三豁免与writePlatformPointer三写同款口径——本地模式零行为/自指回环不写/temp残留形态不写；fail-soft写失败warn不阻断完成。src/run/complete.js两完成点挂钩（completeStep完成分支+wait解除continueStep完成分支）。锚维护：docs check --fix重锚9处（shared.js插入63行漂移platform-interface-map 7处+setup.md；并行会话在途src漂移顺手修复known-issues/worktree锚等），core-engine.md gates.js论述锚按校验器指引降级纯位置锚（1172?）
结果：新增test/platform-docs-pointer.test.mjs五组用例（本地零行为/自指回环不写/平台模式全字段断言/变更目录缺仍写头/runtimeRoot-only）5/5绿；docs check 569处引用全通过；全量npm test+lint由本次--done CLI实测
审计：[gate] L1（跨 1 模块 · 11 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260916-003-ccdc | 2026-09-16 00:29:10 | 等效验证先例库——local.yaml verify_precedents 段+verify prompt 自动注入
状态：已完成
关联变更：（无）
文件：
- src/run/prompt.js（parseVerifyPrecedents/renderVerifyPrecedentHint新增+EVIDENCE_AUTO块注入接线）
- src/config-schema.js（verify_precedents段登记）
- test/verify-precedent-prompt.test.mjs（新增五组用例）
- docs/sillyspec/prompt-control-debt.md（prompt.js插入67行锚重锚）
- .sillyspec/docs/sillyspec/modules/setup.md（config-schema.js插入13行锚重锚）
需求：等效验证先例库——local.yaml verify_precedents 段+verify prompt 自动注入
根因：EHS生产实证：mvn test被框架parent pom硬编码surefire skip（-D覆盖无效），等效口径build-classpath+javac+JUnitCore第二次复用靠agent翻旧verify-result正文续命——先例只活在散文里换agent/换变更即断档（building-area确立→ehs-reward-punishment复用，两变更间零结构化传承）
方案：src/run/prompt.js：parseVerifyPrecedents行扫描解析（免YAML依赖+块界容错+残项过滤）+renderVerifyPrecedentHint（五要素+行动指引指向commands.test实测而非skip放行+超5截断）+EVIDENCE_AUTO注入块接线（与test_strategy预检同挂点）；config-schema.js登记verify_precedents段；锚维护2处重锚
结果：新增test/verify-precedent-prompt.test.mjs五组用例5/5绿；docs check 569引用0失效；全量npm test+lint由--done CLI实测
审计：[gate] L1（跨 2 模块 · 5 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260916-004-c1d4 | 2026-09-16 00:33:02 | verify移交项结构化——骨架「移交项（结构化）」章节+parseHandoverRows+facts.handover回填+零行advisory
状态：已完成
关联变更：（无）
文件：
- src/verify-probes.js（parseHandoverRows+骨架移交项章节+backfill回填advisory）
- test/verify-handover-structured.test.mjs（新增四组用例）
需求：verify移交项结构化——骨架「移交项（结构化）」章节+parseHandoverRows+facts.handover回填+零行advisory
根因：EHS生产实证（2026-09-15-ehs-reward-punishment + 09-16二次独立复核）：verify结论PASS WITH NOTES的三项移交（环境阻断集成测试/三端联调人工验收/待执行SQL）只活在结论槽正文叙述——复核发现被环境阻断deferred的集成测试里正藏着5个P1；移交项没有结构化清单=没人兜，后续agent也无从恢复复跑
方案：src/verify-probes.js：①骨架结论章节后新增「## 移交项（结构化） [层：人工判断——CLI 清单核验]」三列表格+四类型枚举注释（env-blocked复跑口径/manual-acceptance验收步骤/db-script执行环境顺序/other）②parseHandoverRows导出：段界解析+表行三列+表头分隔行跳过+占位行跳过+类型归一小写连字符+未知类型保留供agent复核③backfillFactsFromMdAndTests：有效行落facts.handover={count,items}；PASS WITH NOTES零有效行console.warn advisory不阻断（存量渐进采纳）
结果：新增test/verify-handover-structured.test.mjs四组用例4/4绿；回归verify-probes/conclusion-slot/facts-v2/acceptance-matrix 18/0；docs check 569引用全过；全量npm test+lint由--done CLI实测
审计：📝 文档欠账（D-8）：2 个源码文件改动未同步任何模块文档（涉及模块：core-engine）

## ql-20260916-005-33bc | 2026-09-16 00:44:52 | C/D合并态回归修复——renderExample 补 verify_precedents + 章节计数 12→13
状态：已完成
关联变更：（无）
文件：
- src/config-schema.js（renderExample 补 verify_precedents 示例段）
- test/verify-probes-facts.test.mjs（章节计数 12→13 两处+移交项断言）
需求：C/D合并态回归修复——renderExample 补 verify_precedents + 章节计数 12→13
根因：C（eda9434）漏了 config-schema 既有守卫「live 键必须出现在 renderExample 策展模板」；D（50242df）新增移交项章节改骨架 12→13 章但 verify-probes-facts 计数断言未同步——D 的 quick 门禁 test_strategy 走了 module[cli-core,run-gates] 收窄，全量断言漏网到合并态才暴露
方案：src/config-schema.js renderExample 补 verify_precedents 中性示例段（id/standard_command/reason/equivalent/established_by 用占位值，不引 EHS 真实变更名）；test/verify-probes-facts.test.mjs 两处 12→13 + 移交项段在场断言（章节清单如实更新非改测试凑过）
结果：config-schema 311/0；verify-probes-facts 全过；全量 npm test exit 0（scan-staleness/refresh 并发轮失败系已知 flake 串行复核清）；lint 633 文件 0 告警

## ql-20260916-006-0756 | 2026-09-16 00:48:47 | 探针5跨仓前端扫描根扩展+unused分层+兄弟仓deps分类
状态：已完成
关联变更：（无）
文件：
- src/contract-matrix.js（跨仓前端并集+unused分层）
- src/worktree-deps.js（兄弟仓注册根分类）
- src/verify-probes.js（probe5渲染分层+跨仓注记）
- test/probe5-cross-repo-scan.test.mjs（四组用例）
- test/worktree-deps-sibling-repo.test.mjs（兄弟仓分类用例）
需求：探针5跨仓前端扫描根扩展+unused分层+兄弟仓deps分类
根因：EHS生产实证：①前端在兄弟仓主仓diff永不含→「0 frontend calls」假象+对账靠人工②490存量unused刷屏③modules的../sub-grid-security被「越界拒绝link」误报
方案：verifyApiParity跨仓前端并集（task卡源不滤注册表+design源路径参+repos仓根+声明集收窄+source反斜杠手工归一）+unused分层（artifact内逐条/存量折叠/无artifact回退）；worktree-deps兄弟仓先查repos注册根（轻量解析）命中→skipped准确理由未注册维持拒绝；verify-probes渲染分层+跨仓注记
结果：新增两测试文件五组用例全绿；probe5回归3文件绿；全量npm test exit 0
审计：[gate] L1（跨 2 模块 · 5 文件：3 代码/2 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260916-007-5e1a | 2026-09-16 00:59:17 | 探针8载荷字段契约对账——前端载荷键×后端字段/NOT NULL列 advisory 比对
状态：已完成
关联变更：（无）
文件：
- src/verify-probes.js（探针8三提取器+主体+渲染+接线+facts）
- test/probe8-payload-parity.test.mjs（五组用例）
需求：探针8载荷字段契约对账——前端载荷键×后端字段/NOT NULL列 advisory 比对
根因：EHS二次独立复核实证：5个P1里4处是字段/载荷错位（leaderUserId↔rpLeaderUserId Jackson静默丢弃/小程序缺发reportOrgId/sourceShdId↔safelyHiddenId/report_org_name NOT NULL）——探针5只对URL级，载荷级零覆盖
方案：三提取器（Java字段常量排除/SQL NOT NULL审计列豁免/请求调用邻近对象键）+runProbe8PayloadParity（design三面分类+NEW:剥除+未注册跨仓兜底注记+三根读取+小写剥分隔线归一化+子串∪token-Jaccard0.6双配对带长度差tie-break+NOT NULL缺送核对）+renderProbe8Lines advisory段+runVerifyProbes fail-soft接线+facts probe8 metrics
结果：test/probe8-payload-parity.test.mjs五组5/5绿；verify-probes族回归全绿；lint 636文件0告警；全量npm test由--done CLI实测

## ql-20260916-008-560d | 2026-09-16 01:08:28 | review覆盖定向+守卫一致性checklist+独立复核回流槽
状态：已完成
关联变更：（无）
文件：
- src/verify-probes.js（probe7零承接尾注+代码审查五项checklist+独立复核回流槽）
- test/verify-probes-facts.test.mjs（章节计数13→14+回流槽断言）
需求：review覆盖定向+守卫一致性checklist+独立复核回流槽
根因：EHS二次复核实证：①review走查面跟测试覆盖走，编辑路径/相关方支线零覆盖恰是5个P1藏身处②doSubmit无操作人校验而delete/withdraw有——守卫一致性无checklist③复核结论只活在聊天记录，档案仍写PASS WITH NOTES
方案：renderProbe7Lines零/半承接计数尾注（uncovered/partial>0→强制显式走查指引）；骨架代码审查TODO扩五项走查清单（编辑更新链路/非主分支流/守卫一致性/探针8配对核实/分页并发事务原子性）；骨架新增独立复核可选回流槽（P1/P2/P3分级+证据链+结论枚举影响改写）；verify-probes-facts计数13→14+回流槽断言
结果：verify-probes-facts/acceptance-matrix/handover回归全绿；lint+全量npm test由--done CLI实测

## ql-20260916-009-8b37 | 2026-09-16 01:13:08 | 平台接口图登记链路A已知问题（EHS实证核查结论备查daemon仓）
状态：已完成
关联变更：（无）
文件：
- docs/sillyspec/platform-interface-map.md（链路A已知问题登记块）
需求：平台接口图登记链路A已知问题（EHS实证核查结论备查daemon仓）
根因：EHS生产实证：全流程后平台行status=draft/current_stage空/title停提案书而updated_at在动——核查结论需留档给daemon仓
方案：链路A节首插已知问题块：CLI载荷含current_stage/status（serializeForSync契约conformant）→daemon两嫌疑（§14.5投影覆盖未生效/progress POST被总预算熔断让路同环境实测）；title不在契约内需双边变更；MASTER行单变更交付exists=f正常态。自带论述锚brainstorm.js:109?降级纯位置锚
结果：纯文档；docs check 570引用全过

## ql-20260916-010-5423 | 2026-09-16 07:44:41 | module子集测试面依赖测试自动发现——deps(auto)伪模块
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（discoverModuleDependentTests+runModuleSubset接线）
- test/module-subset-dependent-tests.test.mjs（五组用例）
需求：module子集测试面依赖测试自动发现——deps(auto)伪模块
根因：5325f55实证：modules的test命令硬编码清单不含变更src的断言测试→module收窄漏全量断言回归漏到合并态——清单必然腐烂
方案：discoverModuleDependentTests（直接import测试∪变更test本体∪命令串覆盖排除）+runModuleSubset附加deps(auto)伪模块（cap 30）+调用方传changedFiles
结果：五组用例5/5绿+module策略回归3文件绿；全量npm test由--done CLI实测
审计：[gate] L1（跨 1 模块 · 4 文件：1 代码/3 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量不适用（≤1 代码文件）
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：test/scan-refresh.test.mjs, test/scan-staleness.test.mjs

## ql-20260916-011-5972 | 2026-09-16 07:48:08 | scan系测试套件内假flake根治——fixture分支名漂移
状态：已完成
关联变更：（无）
文件：
- test/scan-staleness.test.mjs（init -b main+checkout main）
- test/scan-refresh.test.mjs（init -b main+checkout main）
需求：scan系测试套件内假flake根治——fixture分支名漂移
根因：套件runner隔离HOME预置defaultBranch=main，两fixture硬编码checkout master：套件内必挂单跑必绿串行复核环境又异——假flake实为环境确定性失败
方案：init -q -b main显式分支名+checkout目标master→main（plan-target-files同款惯例）
结果：GIT_CONFIG env模拟套件defaultBranch=main下31/31绿；全量npm test由--done CLI实测
