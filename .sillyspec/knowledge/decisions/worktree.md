---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — worktree

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-worktree-001@v1 worktree 清理先解链 node_modules junction 再删目录
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
原编号：D-901@v1
锚点：src/worktree.js:81
最近确认：71a7fe6
理由：删除/重建 worktree 目录必须先经 unlinkNodeModulesLinks/safeRemoveWorktreeDir 解链根目录与 meta.depsModules 各子模块的 node_modules junction 再 rmSync——裸 rmSync 或 Git Bash rm -rf 会跟随 junction 穿透删掉主仓 node_modules（user-inputs 两次事故实录），幽灵目录清理同理走统一出口。

## D-core-engine-007@v1 mergeDirtyOverlapThreeWay 写回后补显式 pathspec git add + apply-manifest.json 指纹
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-001@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏①：mergeDirtyOverlapThreeWay clean 写回（worktree-apply.js:143）后立即 `git add -- <该批文件显式 pathspec>`（对齐 archive git add 下沉先例）；apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，全量 applied 面=patch 面∪merge 面），供 verify/doctor 做 apply 后漂移检测（staged/worktree 与指纹比对，不一致显式警告）。

## D-change-management-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-002@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-worktree-002@v1 rescue 提示补「落地后立即 git add 锁定」指引
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-003@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏①尾项：generateRescueCommands 输出末尾追加一行指引——rescue 指令人工执行后立即 `git add -- <files>` 锁定（staged 对 restore/clean 免疫）。纯文案改动。

## D-worktree-003@v1 文件所有权登记表暂不做，记入 ROADMAP
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-004@v1
锚点：未记录
最近确认：23dc755
理由：不做。裸 git 拦不住（git 无 hook 可拦截 restore/checkout 工作区写入），单独做收益不抵复杂度；D-001+D-002 把 sillyspec 面最大杀伤面（apply）管住+窗口秒级化后，裸 git 破坏面只剩理论值。复潮条件：D-001/D-002 落地后仍复现 apply 冲掉或裸 git 冲掉造成实际损失 ≥2 次。

## D-core-engine-008@v1 方案 A——manifest 落变更目录（verify-facts 先例）+ doctor 既有检查项
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-005@v1
锚点：未记录
最近确认：23dc755
理由：用户选 A（2026-09-14 对话轮，确认 manifest 体量后拍板）：apply-manifest.json 落变更目录（verify-facts.json「CLI 全权写审计底稿」同款先例，随归档留存可审计）；漂移检测走 doctor 既有检查项形态（decision-touch-cli-drift D-001/D-002 先例：不加新命令/新步骤/新占位符）。体量依据：每文件≈150B（路径+sha256+JSON 结构），典型 apply 10-40 文件=3-6KB，极端 50 文件<8KB。拒绝 B（.runtime 随清理丢历史，检测时点优势不抵）；拒绝 C（丢 §64 护栏①后半「apply 后丢失/篡改可检测」价值）。

## D-cli-entry-006@v1 change 所有权+心跳——owner_session 列 + 活跃会话拒绝 + --takeover
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-001@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏①：changes 表加 owner_session 列（v6 迁移，四处版本号同步 bump——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version）；run/<stage> 与 quick 启动时写 owner（会话标识=sessionId 或 pid@host，首次创建者获得，已有值不覆盖）；每次 CLI 写操作已刷新 last_active（现成心跳）；apply/cleanup/archive/归档内置 apply 前查所有权——owner 非本会话且 last_active 在活跃窗（15 分钟，可配）内 → 拒绝并列出 owner/最后活跃，--takeover 显式接管（重写 owner+留痕）；owner 停活跃（窗口外）→ 放行并提示接管完成。

## D-runtime-003@v1 归档收口——worktree 有未 apply 交付物时归档硬拦
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-002@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏②：archive step3（确认归档）前检查 worktree 未 apply 交付面（复用 applyWorktree checkOnly）——非空即阻断归档并给两条出路：先跑 worktree apply 或 --skip-apply 显式跳过留痕（明确知道自己要手动处理）。归档与 apply 不自动串联（自动 apply 在有脏重叠时行为复杂，人确认更稳）。

## D-worktree-004@v1 review 放行通道收紧——allowed_paths 相交校验
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-003@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏③：apply 校验的「review 声明放行」路径（reviewAdmittedFiles）加相交过滤——review changedFiles 只放行与该 task allowed_paths ∪ design 清单 ∪ 本变更 linked-change 声明面相交的文件；不相交的外来文件从 admitted 剔除、归入违规清单并显式报告（review 声明了越权文件的嫌疑留审计）。

## D-runtime-004@v1 归因源切换——worktree 模式 changedFiles 取 worktree 分支 diff
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-004@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏④：worktree 隔离模式的变更，其 review 草稿/changedFiles 归因一律取 worktree 分支 diff（git diff base..HEAD + worktree porcelain，现 verify 对账已用同口径）为唯一事实源；主仓脏窗口仅用于 in-place-fallback 模式。存量草稿归属逻辑（autoDraftAttribution）按模式分流。

## D-progress-001@v1 方案 A——DB 所有权（owner_session 列 v6 迁移 + last_active 心跳 + 锁内校验）
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-005@v1
锚点：未记录
最近确认：ee966ed
理由：用户选 A（2026-09-14 对话轮单字确认）：changes 表加 owner_session 列（schema v6 迁移，四处版本号同步——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version，附迁移测试）；last_active 既有刷新点即心跳（run 命令每次写操作更新，活跃窗 15 分钟可配 local.yaml change-ownership.heartbeat_minutes）；所有权校验内嵌 withMainRepoLock 锁内。拒绝 B（DB/文件双真相源+平台模式 specRoot 分裂锁易丢+与 last_active 重复）；拒绝 C（§65 实证 warn 挡不住代劳——对方会话不读 warn）。

## D-worktree-005@v1 overlay 隔离消费既有 own/foreign oracle，不做语法校验
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-001@v1
锚点：src/worktree.js:_overlayBaseline
最近确认：42cef77
理由：消费既有归属 oracle（`src/foreign-declared.js` 的 `splitOwnVsForeignDiffFiles`，声明源=其他 quick 会话 guard.json allowedFiles + 其他变更 design §6 清单，own 优先）。foreign 声明文件在 staged/unstaged patch 道与 untracked 复制道全排除（worktree 取基线 HEAD 版本）。语法/esbuild 探测不做——语言特定、误报率高、CLI 不该带语言工具链依赖。
故障面：oracle 误判（他者声明覆盖本变更文件）→ own 优先判据兜底（loadOwnDeclaredSet 声明过即归 own）；隔离后 worktree 缺并行会话已修 bug 的场景 → 主仓 HEAD 版本本就是干净基线
退役判据：出现比显式声明面更完整的归属事实源（如文件级 mtime 会话锁）时

## D-worktree-006@v1 no-op 过滤放 applyWorktree changedFiles choke point，apply/assess 同口径
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-002@v1
锚点：src/worktree-apply.js:applyWorktree
最近确认：42cef77
理由：`applyWorktree` step 2 的 changedFiles 计算处（filterDeliverableFiles 之后）一处过滤——apply 与 assess（assess 复用 applyWorktree checkOnly）自动同口径。比对方式：worktree 内 `git hash-object --stdin-paths`（分批，沿用 ql-20260912-010 分批先例）对照主仓 `git ls-tree -r HEAD` 一次取的 blob map；相等即 no-op，剔出 changedFiles/deletedFiles/absentAfterMerge，warnings 列清单。每调用现算不缓存（主仓 HEAD 在 assess 与 apply 间推进时安全）。
故障面：hash-object/ls-tree 失败 → 该批文件保守不剔（保留 changed，退回现状误报而非误放行）
退役判据：apply/assess 改为内容寻址交付（blob 级）时

## D-setup-001@v1 生成物供给走 local.yaml `worktree.supplyFiles`，不做 gitignore 自动探测
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-003@v1
锚点：src/config-schema.js
最近确认：42cef77
理由：local.yaml 新增 `worktree.supplyFiles`（string[]，精确路径 + glob `*`/`**`，默认空=零行为变化）。worktree create step 5.8（deps 供给）后新增供给步：glob 展开→主仓存在则复制（mkdir -p 父目录），缺失 console.warn；meta.supplyFiles 记录实供清单。gitignore 物天然不进 assess/apply 面（`ls-files --others --exclude-standard` 遵循 .gitignore）。自动探测 gitignore 生成物不做——无法判定哪些是构建必需，误供给噪声大。
故障面：glob 误配展开风暴 → 展开上限帽截断 + 单文件失败不阻断 create；供给物过期（主仓重新生成前）→ 构建期自然报错，与主仓缺生成物同症状
退役判据：项目自带构建输入 manifest 可机读时（自动探测复潮条件同）

## D-unmapped-235@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-wt-list-resilience
原编号：D-001@v1
锚点：未记录
最近确认：33bc4d2857eb29f15e10f062808e3d9d8eee2385
理由：最大风险：changeName 兜底目录名后，若某历史注册表目录名与变更名不一致（理论上只在手工改名目录时出现），list/doctor 会按目录名匹配——但该形态下旧行为是 undefined 崩溃/失配，兜底严格更优，不构成回退面。放弃的方案：① 渲染器（index.js）侧判空——只修 CLI 一处，doctor 的 undefined 失配仍在，且 index.js 当前被并行会话在途占用（不可改）；② 写入侧强制补全历史件——要迁移已落盘 meta，读侧问题写侧修，收益错位。均已弃。

## D-unmapped-236@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-branch-ref-anchor-scope
原编号：D-001@v1
锚点：未记录
最近确认：4983de1d7330240faeeabe6d47ca9b80f7f0c3bc
理由：最大风险：主仓 HEAD 恰好不含某历史 hash 但另一常驻 ref（如 origin/main）含——探针二判「不在主仓可达」→ 误锚（多余 tag，不删任何东西，安全方向）；反之不存在漏锚面：hash 要悬空必须同时在分支上且不在任何常驻 ref，而探针二只看 HEAD 这一个 ref——HEAD 不含而 origin/main 含的场景锚定是多余的但无害。放弃的方案：① 枚举全部 refs 逐一判可达——覆盖更全但 N 探针成本与配置面（remote 名不确定）不成比例，且收益仅是少打几个无害 tag；② 改为 rev-list branch ^HEAD 取分支独有集再做集合判——语义等价但一次性拉全集在候选仅个位数时反而更重。均已弃。

## D-unmapped-257@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-git-optional-locks
原编号：D-001@v1
锚点：未记录
最近确认：549d1fd1ad01c69a24799dc22016c6fe1a976dac
理由：最大风险：读命令不再刷新 stat 缓存，后续读每次都要重扫文件 stat——大仓上 status 略慢、index 文件 mtime 不再被本工具更新。可接受：正确性无差（status 结果仍如实反映工作区），性能差在毫秒级轮询场景不可观测。 放弃的方案：①逐调用点加 `--no-optional-locks` flag——放弃，只覆盖被改的调用点且维护面碎；watcher/后台全覆盖需要枚举改点，恰是要避免的形态。②在 stageArchiveSourceSideMoves 里对 lock 类错误做有界重试——放弃（本变更时点）：重试是下游补丁，治标；上游消灭锁窗口后本工具自扰的锁冲突已不存在，外部进程的偶发冲突由 archive-stage-claim 的告警面兜住。若外部冲突实测高频再议。

## D-unmapped-307@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-worktree-salvage-archive-aware
原编号：D-001@v1
锚点：未记录
最近确认：e6ac0ef313acd83af9d5626877be05e58fa9b67d
理由：最大风险：归档副本存在但 worktree 副本更新（归档后子代理又向 worktree 写入的极端时序）——本设计以 archive 副本为权威静默跳过（warn 有计数与路径清单，人工可对账），不自动覆盖，避免把「更旧快照复活」换成「更新内容覆盖归档件」的对称事故。试过放弃的方案：① 调用方传 archived flag——五入口逐一接线，漏一处即复活，且 doctor 入口判定口径（worktree.js:1795）与打捞内判定会形成两套真相；② 归档态整树跳过——「两处均缺」的真独有产物会随清理蒸发，违背打捞初衷（坑 worktree-spec-artifact-misplace）；③ 内容比对 archive 副本差异列入冲突清单——事故场景 13 文件全部内容有差（旧快照 vs 终版），全列纯噪音。

## D-unmapped-311@v1 跨仓 worktree 落位按仓可配置（worktree.crossPlacement + 落位注册表）
状态：implemented
变更：2026-10-10-cross-worktree-toolchain
原编号：D-001@v1
锚点：src/worktree-cross.js:crossWorktreePath
最近确认：83f2ee5bf60bcaed673e1da3848b46505ee29bcd
理由：local.yaml 新增 `worktree.crossPlacement.<repoKey>: <目录>`，落位该目录下 `<change>--<repoKey>`；注册表 cross-placements.json 保 list/cleanup 可发现性；WSL 分裂（repoRoot 在 /mnt/<盘>/ 而 worktree 不在）时 advisory 警告并给配置指引。
故障面：注册表并发整文件覆盖丢键（读-合并-写缓解，丢失后果=降级旧扫描行为）；placement 目录被外部清理后注册表残留条目（读取方按 meta 不可读不入列降级，重跑 cleanup 删键回收——评审吸收②）
退役判据：git 原生支持 per-worktree 可达性检测或跨仓 worktree 落位改为仓内默认时，注册表与配置键可简化删除

## D-unmapped-312@v1 maven/gradle 默认供给命令改 null（根供给 n/a）
状态：implemented
变更：2026-10-10-cross-worktree-toolchain
原编号：D-002@v1
锚点：src/worktree-deps.js:ECOSYSTEMS
最近确认：83f2ee5bf60bcaed673e1da3848b46505ee29bcd
理由：两表项 install 改 null；JVM 系依赖在用户级仓库（~/.m2 / ~/.gradle），worktree 内无本地产物可供给，根供给诚实落 n/a（门控放行集含 n/a）；freshness 的 stale/main-drift 仍以 pom.xml/build.gradle hash 为基准（marker=null 语义不变）。
故障面：冷 ~/.m2 环境下依赖缺失不再于供给期暴露，推迟到构建期（task 级编译验证兜底）
退役判据：maven/gradle 出现标准化的项目内依赖物（如 mvnd 本地仓库配额）时重估

## D-unmapped-313@v1 跨仓主副本直写检测走 apply 时点对账（advisory），hook 实时拦截记非目标
状态：implemented
变更：2026-10-10-cross-worktree-toolchain
原编号：D-003@v1
锚点：src/worktree-apply.js:applyCrossRepoWorktrees
最近确认：83f2ee5bf60bcaed673e1da3848b46505ee29bcd
理由：applyCrossRepoWorktrees 对每个有 meta 的跨仓：主副本 baseHash..HEAD 有推进且推进文件集与该仓声明文件面（resolveApplyAllowSet 切片）交集非空 → warning 列证（commit 数/交集文件/核对决策留痕指引），不阻断；跨仓 .git marker + worktree-guard hook 实时拦截记非目标（SillyHub 实证环境无 sillyspec hook，拦截无效且侵入异仓）。
故障面：声明面不全的变更交集恒空漏报（与 apply 既有清单校验治理面重合，接受）；worktree 目录被外部删除（meta 随目录消失无 baseHash 可锚）与 changedFiles 收集抛错分支不适用检测（评审吸收③）
退役判据：跨仓 hook 安装面成为现实约束（平台普遍装载 sillyspec hook）时升级为实时拦截

## D-unmapped-314@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-repo-inline-worktree-placement
原编号：D-001@v1
锚点：未记录
最近确认：1afcd83db8d1680f0ca8146c043294ca9fdc1549
理由：最大风险：三处手写 YAML 解析（plan-postcheck 内核、guard parseSimpleYaml 产物消费、deps 内联 IIFE）对同一对象形态的解析漂移——缓解：内核 `_parseRepoEntries` 单一事实源 + 旁路两处各自的最小升级 + 三处都有形态级测试（场景 16/17、guard-cd 既有回归、sibling-repo 既有回归）。试过但放弃的方案：直接删除 worktree.crossPlacement（未发布、干净迁移）——上一变更刚归档发号 FR-setup-083~089（knowledge/fr 已入库），删除需 supersede 对账且破坏「归档件即事实」原则；保留兼容读面零成本（readCrossPlacementConfig 已存在），优先级内联 > legacy 平滑迁移。

## D-unmapped-318@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-cross-wt-repo-local-placement
原编号：D-001@v1
锚点：未记录
最近确认：cb90e30eeb36c5ac9d5b9486ddd9c1a13191df15
理由：最大风险：R-01 跨仓仓的 .git 目录只读/异常导致 exclude 写失败（warn 降级，worktree 成 untracked 噪音——apply 清单校验兜底，不阻断）；R-02 仓内 .sillyspec 目录会被用户的 IDE 全局搜索/索引扫到重复内容（主仓同形态用户已习惯，execute 期临时存在、cleanup 即删）；R-03 候选寻址的探测顺序依赖注册表权威性——注册表条目指向已亡目录而旧公式处恰有他者残留 meta 时会误命中（注册表写读同链路维护，残留面与 sweep 治理重合）。 试过但放弃的方案：自动兄弟目录（<path> 旁猜一个 sillyspec-worktrees）——向用户仓外未知位置写目录侵入性大且名字无约定，仓内受控命名空间（.sillyspec/）语义更干净；删除旧公式兜底（注册表已够）——存量 worktree（升级前的变更收口中断态）会失联，兼容成本为零则不做断崖。
