---
author: t
created_at: 2026-10-10T17:10:00.000Z
---

# 决策记录（Decisions）

## D-001@v1: 跨仓 worktree 落位按仓可配置（worktree.crossPlacement + 落位注册表）
- type: architecture
- priority: P0
- status: accepted
- supersedes:
- source: user
- question: 跨仓 worktree 固定落位主仓 specBase 下，主仓在 WSL /root、跨仓在 Windows 盘时与该仓唯一构建工具链分居互不可访文件系统，隔离形同虚设（2026-10-10 fire-equipment D-007 实证：后端被迫绕开 worktree 回主副本直写 master）。
- answer: local.yaml 新增 `worktree.crossPlacement.<repoKey>: <目录>`，落位该目录下 `<change>--<repoKey>`；注册表 cross-placements.json 保 list/cleanup 可发现性；WSL 分裂（repoRoot 在 /mnt/<盘>/ 而 worktree 不在）时 advisory 警告并给配置指引。
- normalized_requirement: 配置了 crossPlacement 的仓，worktree 必须落在配置目录下且 meta/list/cleanup/verify 对账全链可达；未配置时路径与现公式逐字节一致；placement 目录落在跨仓仓根内必须报配置错拒绝创建。
- impacts: [FR-01, FR-02, FR-03, task-01]
- evidence: 用户委托原文「落位策略应允许按仓配置，或至少在 deps/构建探测发现跨文件系统不可达时警告」+ 会话导出消防设施器材1轮_47e2ff1a.md 13:44/13:46 段
- 锚点: src/worktree-cross.js:crossWorktreePath
- 故障面: 注册表并发整文件覆盖丢键（读-合并-写缓解，丢失后果=降级旧扫描行为）；placement 目录被外部清理后注册表残留条目（读取方按 meta 不可读不入列降级，重跑 cleanup 删键回收——评审吸收②）
- 退役判据: git 原生支持 per-worktree 可达性检测或跨仓 worktree 落位改为仓内默认时，注册表与配置键可简化删除

## D-002@v1: maven/gradle 默认供给命令改 null（根供给 n/a）
- type: definition
- priority: P0
- status: accepted
- supersedes:
- source: code
- question: ECOSYSTEMS 表 maven install=`mvn -o test`（gradle 同款 `test`）把跑测试当依赖供给，离线 + 工具链不在 PATH 必败 → depsStatus=failed 卡 execute deps 门控（2026-10-10 实证：urgent 被迫手改 meta 放行）。
- answer: 两表项 install 改 null；JVM 系依赖在用户级仓库（~/.m2 / ~/.gradle），worktree 内无本地产物可供给，根供给诚实落 n/a（门控放行集含 n/a）；freshness 的 stale/main-drift 仍以 pom.xml/build.gradle hash 为基准（marker=null 语义不变）。
- normalized_requirement: maven/gradle 项目无 commands.install 时 provisionDeps 根状态必须为 n/a 且不得 spawn mvn/gradle 进程；显式 commands.install 优先级不变；门控不得因该两生态缺省路径阻断 --done。
- impacts: [FR-04, FR-05, task-02]
- evidence: src/worktree-deps.js:45（mvn -o test）+ 会话导出 13:43「urgent 跑的是 mvn -o test（离线）失败」+ run/gates.js depsOk 放行集实证
- 锚点: src/worktree-deps.js:ECOSYSTEMS
- 故障面: 冷 ~/.m2 环境下依赖缺失不再于供给期暴露，推迟到构建期（task 级编译验证兜底）
- 退役判据: maven/gradle 出现标准化的项目内依赖物（如 mvnd 本地仓库配额）时重估

## D-003@v1: 跨仓主副本直写检测走 apply 时点对账（advisory），hook 实时拦截记非目标
- type: boundary
- priority: P1
- status: accepted
- supersedes:
- source: user
- question: 跨仓 worktree 存在时对跨仓主副本直写/直提零检测零警告，D-007 类绕行全凭 agent 自觉。
- answer: applyCrossRepoWorktrees 对每个有 meta 的跨仓：主副本 baseHash..HEAD 有推进且推进文件集与该仓声明文件面（resolveApplyAllowSet 切片）交集非空 → warning 列证（commit 数/交集文件/核对决策留痕指引），不阻断；跨仓 .git marker + worktree-guard hook 实时拦截记非目标（SillyHub 实证环境无 sillyspec hook，拦截无效且侵入异仓）。
- normalized_requirement: 交集非空时 apply 输出必须含「疑似绕过 worktree 直写主干」字样与 repoKey/交集文件；交集为空或声明面缺失时不得告警；apply 流程不得因该检测失败或阻断。
- impacts: [FR-06, FR-07, task-03]
- evidence: 会话导出 14:03-15:16（后端 5 commit 直落 urgent master，空 worktree 被静默清理，全程零警告）
- 锚点: src/worktree-apply.js:applyCrossRepoWorktrees
- 故障面: 声明面不全的变更交集恒空漏报（与 apply 既有清单校验治理面重合，接受）；worktree 目录被外部删除（meta 随目录消失无 baseHash 可锚）与 changedFiles 收集抛错分支不适用检测（评审吸收③）
- 退役判据: 跨仓 hook 安装面成为现实约束（平台普遍装载 sillyspec hook）时升级为实时拦截
