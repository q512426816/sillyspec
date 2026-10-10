---
author: t
created_at: 2026-10-10T17:10:00.000Z
scale: small
---
# 设计记录（Design Record）— 2026-10-10-cross-worktree-toolchain

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）？

2026-10-10 用户实证（SillyHub 环境，fire-equipment 变更）暴露三个结构性缺口：① 主仓在 WSL `/root`、跨仓（后端 urgent）在 Windows 盘 `/mnt/e` 时，跨仓 worktree 落位在主仓 specBase 下（WSL 原生文件系统），该仓唯一的构建工具链（Windows mvn/JDK）够不着 worktree → 隔离形同虚设，agent 被迫绕开 worktree 回主副本直写主干（D-007 决策留痕）；② ECOSYSTEMS 表 maven 默认 install=`mvn -o test`——把跑测试当依赖供给，离线 + 工具链不在 PATH 必败，depsStatus=failed 卡死 execute deps 门控，agent 只能手改 meta 放行；③ 跨仓 worktree 存在时对跨仓主副本的直写/直提零检测零警告，绕行全凭 agent 自觉。

修法三子项（决策 D-001@v1 / D-002@v1 / D-003@v1）：① `worktree.crossPlacement` 按仓落位配置（local.yaml，块式/inline 双形态）+ 落位注册表 `cross-placements.json` 保住 listCrossWorktreeMetas/cleanup 的可发现性 + WSL 跨文件系统分裂警告（advisory，create/reuse 时）——落位/注册表/解析收口进**新零依赖叶子模块 src/cross-placement.js**（仅 fs/path import），worktree-cross.js 与 run/multi-repo-context.js 都 import 它，规避 multi-repo-context ↔ worktree-cross（经 run/shared）的既有环约束（评审吸收①：multi-repo-context.js:157 注释明言刻意不 import worktree-cross）；② ECOSYSTEMS 表 maven/gradle 的 install 改 null——JVM 系依赖在用户级仓库（~/.m2 / ~/.gradle），worktree 内本无本地产物可供给，根供给落 n/a（门控放行集 `['linked','installed','n/a']` 诚实命中），测试归 verify/task 级验证；③ `applyCrossRepoWorktrees` 对每个有 meta 的跨仓做直写检测：主副本 `baseHash..HEAD` 有推进且推进文件集与该仓声明文件面（resolveApplyAllowSet 切片）交集非空 → warning 列证（D-007 签名 = 空 worktree 被静默清理的分支天然覆盖）。

评审吸收②（注册表 GC 与合成形状）：listCrossWorktreeMetas 的合并语义 = 注册表只提供**位置**，条目仍须在该位置读到可解析 meta.json 才入列（与默认目录扫描同判据）——注册表永不合成无 meta 的条目，消费方（gates.js crossCheckOrExit 解引用 cm.depsStatus）零 TypeError 面；cleanupCrossWorktrees 在 cleaned 与「目录不存在 skipped」两分支都删除注册表键，重跑即清悬挂条目。评审吸收③（检测边缘面）：worktree 目录被外部删除（meta 随目录消失，无 baseHash 可锚）与 changedFiles 收集抛错分支不适用直写检测，记入 D-003 故障面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `crossWorktreePath(specBase, changeName, repoKey, placementRoot?)` 增第 4 可选参（缺省走现公式，零回归）；新增导出 `resolveCrossWorktreePath(specBase, changeName, repoKey)`（注册表优先、公式兜底）与 `readCrossPlacementConfig(cwd)`；`getCrossWorktreeMeta` 内部改走 resolve。
- 新增文件 `<specBase>/.runtime/worktrees/cross-placements.json`（落位注册表：`{ "change--repoKey": { repoKey, changeName, worktreePath, placementRoot } }`，writeAtomicSync 原子写）。
- `ECOSYSTEMS` 表：maven `install: null`、gradle `install: null`（表注释同步：JVM 系依赖在用户级仓库，根供给 n/a）。`inferInstallCommand` 行为不变（表项 install 为 null 时返回 null → n/a）。
- 新增导出 `detectCrossMainCopyBypass(crossRoot, baseHash, allowSet)`（worktree-apply.js，纯函数）+ `applyCrossRepoWorktrees` 内告警接线（advisory，进 out.warnings 不阻断）。
- local.yaml 新键 `worktree.crossPlacement.<repoKey>: <目录>`（config-schema.js 补文档条目）。
- CLI 命令面无新增无删除；`listCrossWorktreeMetas` 返回结构不变（数据源扩为默认目录扫描 ∪ 注册表）。

生命周期契约：不适用（本变更为 CLI 本地文件/git 操作增强，不涉及 lifecycle 事件、会话租约或状态机迁移；「切换/生命周期」盲维见下方第 3 问作答）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。注册表读取方（resolveCrossWorktreePath / listCrossWorktreeMetas）对注册表缺失/损坏半截 JSON 一律降级默认目录公式（与 meta.json BOM/损坏容错同哲学）；注册表条目先于目录删除（create 时写、cleanup 后删）时，读取方按「条目在但目录/meta 不在 = 已清理」处理，与现扫描语义一致。直写检测读的是 git 对象（baseHash 锚定在 meta），主副本乱序推进（并行会话穿插提交）只影响告警文案里的 commit 计数，不影响交集判定的正确性。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

cross-placements.json 用 writeAtomicSync（同 meta.json 的既有并发纪律：半截 JSON 会让读方降级公式，不会误删）；两个变更并发建各自跨仓 worktree 写同一注册表文件时，后写整文件覆盖——键含 changeName 天然不碰撞，但整文件覆盖会丢对方刚写的键。对策：写前读-合并-原子写（read-modify-write），窗口极小且丢键的后果仅是「该变更跨仓 worktree 不被 list 扫到」（降级为旧行为，可用 sillyspec worktree meta 直查），不丢数据不误删——记入风险登记 R-02，v1 接受。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。全部状态是盘上文件（注册表/meta/git 对象）：create 中断 → 注册表无条目 + 默认公式仍可寻址（placement 场景下目录可能残留在自定义位置，git worktree 注册在跨仓 .git 可被 doctor/prune 发现）；cleanup 中断 → 重跑幂等（注册表条目删除放在 worktree 移除成功之后，残留条目读取方按目录不存在降级）。无内存态、无锁、无后台进程。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。注册表按 `<主仓specBase>/.runtime/` 归属（平台模式随 specRoot，与 execute-runs 同作用域）；placement 目录由用户显式配置，键为 repoKey、值为目录根，实际 worktree 路径仍带 `<change>--<repoKey>` 防跨变更碰撞；直写检测只读跨仓 git，不写跨仓任何文件。多主仓实例各自有独立 specBase 注册表，天然隔离。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：R-01 WSL 分裂检测是启发式（`/mnt/<盘>/` 前缀判定），检测不到「工具链装在另一侧」的全部形态（如 Windows 侧用 UNC 路径、WSL 侧工具链实际可达 /root 的场景会误告警）——advisory 定位容错，误报成本是一行警告 + 配置消音指引。R-02 注册表并发丢键（见盲维第 2 问，v1 接受降级语义）。R-03 直写检测的交集判定依赖声明面完整性：变更未在 design/task 卡声明该仓文件时交集恒空 → 漏报（但此时 apply 侧清单校验本就会拦未声明交付，漏报面与既有治理面重合）。
试过但放弃的方案：跨仓 .git 内写 marker + worktree-guard hook 实时拦截——SillyHub 实证环境根本没装 sillyspec hook（子代理在跨仓主副本 git commit 畅通无阻），拦截无效且对异仓 .git 侵入大，记非目标；maven install 改轻量命令（`mvn -o dependency:resolve` / `-DskipTests compile`）——仍是「跑 maven 当供给」，冷 ~/.m2 + 无 PATH 环境照败，只是把失败变慢，不如诚实 n/a。

## 自审（Self-Review）

- 四问逐条作答，无「不适用」逃逸（第 3 问以盘上文件态作答而非跳过）。
- 交叉点自查：① resolveCrossWorktreePath 的三处消费点（getCrossWorktreeMeta / multi-repo-context.js / cross-repo-reconcile.js B' 档）必须同步收口，漏一处则 verify 对账读不到挪位的 worktree——已列入文件清单；② maven install=null 与 deps 门控放行集的交账：`['linked','installed','n/a']` 含 n/a（run/gates.js:359 实证），不会卡门控；③ 直写检测放在 changedFiles 收集之后、空 worktree 清理分支之前，两个分支（有交付/无交付）都覆盖。
- 兼容性：无配置时全部路径走现公式/现行为（零回归基准）；旧行为唯一变化 = maven/gradle 项目根供给从「尝试 mvn -o test 多半 failed」变「n/a 直接过」——这是修 bug 不是行为破坏，失败循环本身是 2026-10-10 实证病灶。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/cross-placement.js | 零依赖叶子模块：crossPlacement 配置读取 + 注册表读写 + crossWorktreePath(placementRoot) + resolveCrossWorktreePath（评审吸收①：解 import 环） |
| 修改 | src/worktree-cross.js | import cross-placement + WSL 分裂警告 + ensure/cleanup 接线（注册表写在 create/移除在 cleanup 含 skipped 分支） |
| 修改 | src/run/multi-repo-context.js | worktree 模式 meta 直读公式点改走 resolveCrossWorktreePath |
| 修改 | src/cross-repo-reconcile.js | B' 档 meta 读取改走 resolveCrossWorktreePath |
| 修改 | src/worktree-deps.js | ECOSYSTEMS maven/gradle install → null + 表注释同步 |
| 修改 | src/worktree-apply.js | detectCrossMainCopyBypass 纯函数导出 + applyCrossRepoWorktrees 告警接线 |
| 修改 | src/config-schema.js | worktree.crossPlacement 键文档条目 |
| 新增 | NEW:test/cross-worktree-placement.test.mjs | 落位配置解析/注册表/resolve 收口/WSL 警告判定（真实 git fixture） |
| 修改 | test/worktree-deps-provision.test.mjs | maven/gradle install=null 与根供给 n/a 断言 |
| 新增 | NEW:test/cross-main-copy-bypass.test.mjs | 直写检测交集判定（真实 git fixture） |
