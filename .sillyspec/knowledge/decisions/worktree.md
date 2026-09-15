---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — worktree

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-901@v1 worktree 清理先解链 node_modules junction 再删目录
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/worktree.js:81
最近确认：71a7fe6
理由：删除/重建 worktree 目录必须先经 unlinkNodeModulesLinks/safeRemoveWorktreeDir 解链根目录与 meta.depsModules 各子模块的 node_modules junction 再 rmSync——裸 rmSync 或 Git Bash rm -rf 会跟随 junction 穿透删掉主仓 node_modules（user-inputs 两次事故实录），幽灵目录清理同理走统一出口。

## D-001@v1 mergeDirtyOverlapThreeWay 写回后补显式 pathspec git add + apply-manifest.json 指纹
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏①：mergeDirtyOverlapThreeWay clean 写回（worktree-apply.js:143）后立即 `git add -- <该批文件显式 pathspec>`（对齐 archive git add 下沉先例）；apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，全量 applied 面=patch 面∪merge 面），供 verify/doctor 做 apply 后漂移检测（staged/worktree 与指纹比对，不一致显式警告）。

## D-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-003@v1 rescue 提示补「落地后立即 git add 锁定」指引
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏①尾项：generateRescueCommands 输出末尾追加一行指引——rescue 指令人工执行后立即 `git add -- <files>` 锁定（staged 对 restore/clean 免疫）。纯文案改动。

## D-004@v1 文件所有权登记表暂不做，记入 ROADMAP
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：不做。裸 git 拦不住（git 无 hook 可拦截 restore/checkout 工作区写入），单独做收益不抵复杂度；D-001+D-002 把 sillyspec 面最大杀伤面（apply）管住+窗口秒级化后，裸 git 破坏面只剩理论值。复潮条件：D-001/D-002 落地后仍复现 apply 冲掉或裸 git 冲掉造成实际损失 ≥2 次。

## D-005@v1 方案 A——manifest 落变更目录（verify-facts 先例）+ doctor 既有检查项
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：用户选 A（2026-09-14 对话轮，确认 manifest 体量后拍板）：apply-manifest.json 落变更目录（verify-facts.json「CLI 全权写审计底稿」同款先例，随归档留存可审计）；漂移检测走 doctor 既有检查项形态（decision-touch-cli-drift D-001/D-002 先例：不加新命令/新步骤/新占位符）。体量依据：每文件≈150B（路径+sha256+JSON 结构），典型 apply 10-40 文件=3-6KB，极端 50 文件<8KB。拒绝 B（.runtime 随清理丢历史，检测时点优势不抵）；拒绝 C（丢 §64 护栏①后半「apply 后丢失/篡改可检测」价值）。

## D-001@v1 change 所有权+心跳——owner_session 列 + 活跃会话拒绝 + --takeover
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：§65 护栏①：changes 表加 owner_session 列（v6 迁移，四处版本号同步 bump——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version）；run/<stage> 与 quick 启动时写 owner（会话标识=sessionId 或 pid@host，首次创建者获得，已有值不覆盖）；每次 CLI 写操作已刷新 last_active（现成心跳）；apply/cleanup/archive/归档内置 apply 前查所有权——owner 非本会话且 last_active 在活跃窗（15 分钟，可配）内 → 拒绝并列出 owner/最后活跃，--takeover 显式接管（重写 owner+留痕）；owner 停活跃（窗口外）→ 放行并提示接管完成。

## D-002@v1 归档收口——worktree 有未 apply 交付物时归档硬拦
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：§65 护栏②：archive step3（确认归档）前检查 worktree 未 apply 交付面（复用 applyWorktree checkOnly）——非空即阻断归档并给两条出路：先跑 worktree apply 或 --skip-apply 显式跳过留痕（明确知道自己要手动处理）。归档与 apply 不自动串联（自动 apply 在有脏重叠时行为复杂，人确认更稳）。

## D-003@v1 review 放行通道收紧——allowed_paths 相交校验
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：§65 护栏③：apply 校验的「review 声明放行」路径（reviewAdmittedFiles）加相交过滤——review changedFiles 只放行与该 task allowed_paths ∪ design 清单 ∪ 本变更 linked-change 声明面相交的文件；不相交的外来文件从 admitted 剔除、归入违规清单并显式报告（review 声明了越权文件的嫌疑留审计）。

## D-004@v1 归因源切换——worktree 模式 changedFiles 取 worktree 分支 diff
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：§65 护栏④：worktree 隔离模式的变更，其 review 草稿/changedFiles 归因一律取 worktree 分支 diff（git diff base..HEAD + worktree porcelain，现 verify 对账已用同口径）为唯一事实源；主仓脏窗口仅用于 in-place-fallback 模式。存量草稿归属逻辑（autoDraftAttribution）按模式分流。

## D-005@v1 方案 A——DB 所有权（owner_session 列 v6 迁移 + last_active 心跳 + 锁内校验）
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：用户选 A（2026-09-14 对话轮单字确认）：changes 表加 owner_session 列（schema v6 迁移，四处版本号同步——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version，附迁移测试）；last_active 既有刷新点即心跳（run 命令每次写操作更新，活跃窗 15 分钟可配 local.yaml change-ownership.heartbeat_minutes）；所有权校验内嵌 withMainRepoLock 锁内。拒绝 B（DB/文件双真相源+平台模式 specRoot 分裂锁易丢+与 last_active 重复）；拒绝 C（§65 实证 warn 挡不住代劳——对方会话不读 warn）。

## D-001@v1 overlay 隔离消费既有 own/foreign oracle，不做语法校验
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
锚点：src/worktree.js:_overlayBaseline
最近确认：42cef77
理由：消费既有归属 oracle（`src/foreign-declared.js` 的 `splitOwnVsForeignDiffFiles`，声明源=其他 quick 会话 guard.json allowedFiles + 其他变更 design §6 清单，own 优先）。foreign 声明文件在 staged/unstaged patch 道与 untracked 复制道全排除（worktree 取基线 HEAD 版本）。语法/esbuild 探测不做——语言特定、误报率高、CLI 不该带语言工具链依赖。
故障面：oracle 误判（他者声明覆盖本变更文件）→ own 优先判据兜底（loadOwnDeclaredSet 声明过即归 own）；隔离后 worktree 缺并行会话已修 bug 的场景 → 主仓 HEAD 版本本就是干净基线
退役判据：出现比显式声明面更完整的归属事实源（如文件级 mtime 会话锁）时

## D-002@v1 no-op 过滤放 applyWorktree changedFiles choke point，apply/assess 同口径
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
锚点：src/worktree-apply.js:applyWorktree
最近确认：42cef77
理由：`applyWorktree` step 2 的 changedFiles 计算处（filterDeliverableFiles 之后）一处过滤——apply 与 assess（assess 复用 applyWorktree checkOnly）自动同口径。比对方式：worktree 内 `git hash-object --stdin-paths`（分批，沿用 ql-20260912-010 分批先例）对照主仓 `git ls-tree -r HEAD` 一次取的 blob map；相等即 no-op，剔出 changedFiles/deletedFiles/absentAfterMerge，warnings 列清单。每调用现算不缓存（主仓 HEAD 在 assess 与 apply 间推进时安全）。
故障面：hash-object/ls-tree 失败 → 该批文件保守不剔（保留 changed，退回现状误报而非误放行）
退役判据：apply/assess 改为内容寻址交付（blob 级）时

## D-003@v1 生成物供给走 local.yaml `worktree.supplyFiles`，不做 gitignore 自动探测
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
锚点：src/config-schema.js
最近确认：42cef77
理由：local.yaml 新增 `worktree.supplyFiles`（string[]，精确路径 + glob `*`/`**`，默认空=零行为变化）。worktree create step 5.8（deps 供给）后新增供给步：glob 展开→主仓存在则复制（mkdir -p 父目录），缺失 console.warn；meta.supplyFiles 记录实供清单。gitignore 物天然不进 assess/apply 面（`ls-files --others --exclude-standard` 遵循 .gitignore）。自动探测 gitignore 生成物不做——无法判定哪些是构建必需，误供给噪声大。
故障面：glob 误配展开风暴 → 展开上限帽截断 + 单文件失败不阻断 create；供给物过期（主仓重新生成前）→ 构建期自然报错，与主仓缺生成物同症状
退役判据：项目自带构建输入 manifest 可机读时（自动探测复潮条件同）
