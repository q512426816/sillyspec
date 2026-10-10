---
author: flow-machine-draft
created_at: 2026-10-10T10:23:33.943Z
---
# 需求规格（Requirements）— 2026-10-10-cross-worktree-toolchain

> FR 覆盖 decisions D-001@v1（FR-01~03）/ D-002@v1（FR-04~05）/ D-003@v1（FR-06~07）。

## 功能需求

### FR-01: 跨仓 worktree 按仓落位配置生效
覆盖决策：D-001@v1
- 必须：local.yaml 声明 `worktree.crossPlacement.<repoKey>: <目录>` 时，ensureCrossWorktrees 为该仓创建的 worktree 必须落在 `<目录>/<change>--<repoKey>`；相对路径必须相对主仓根解析。
- 禁止：placement 解析后的目录落在跨仓仓根之内（配置错 fail-closed 报错拒绝创建）。
- 必须：未配置 crossPlacement 的仓，worktree 路径必须与现公式 `<specBase>/.runtime/worktrees/<change>--<repoKey>` 逐字节一致（零回归）。

#### 场景：主路径
- Given 主仓 local.yaml 配 `worktree.crossPlacement: { urgent: /mnt/e/wt-root }`
- When execute 启动 ensureCrossWorktrees
- Then urgent 的 worktree 创建于 /mnt/e/wt-root/<change>--urgent，meta.json 落该目录且 worktreePath 指向它

#### 场景：placement 指向跨仓仓根内
- Given crossPlacement.urgent 配置为跨仓仓根本身或其子路径
- When ensureCrossWorktrees
- Then 报配置错误 exit 非零，不创建任何目录

### FR-02: 落位注册表保住全链可发现性
覆盖决策：D-001@v1
- 必须：create 写注册表 `<specBase>/.runtime/worktrees/cross-placements.json`（原子写），cleanup 成功分支（cleaned 与目录已不存在的 skipped）必须删除对应键，并对 `<change>--*` 悬挂键（目录已亡仅键存）做差集 sweep。
- 必须：getCrossWorktreeMeta / listCrossWorktreeMetas / multi-repo-context worktree 模式检测 / cross-repo-reconcile B' 档必须经 resolveCrossWorktreePath（注册表优先、公式兜底）寻址，挪位 worktree 全链可达。
- 禁止：注册表条目在对应位置读不到可解析 meta.json 时被合成入列（消费方 cm.depsStatus 解引用零 TypeError 面）。
- 必须：注册表文件缺失/损坏半截 JSON 时读取方必须降级默认公式（fail-open 与 meta.json 容错同哲学）。

#### 场景：注册表寻回挪位 worktree
- Given urgent worktree 落在自定义 placement 且注册表有条目
- When listCrossWorktreeMetas 与 cleanupCrossWorktrees
- Then 该 worktree 被枚举、可被清理、meta 与分支保护语义与默认落位一致

### FR-03: WSL 跨文件系统分裂警告（advisory）
覆盖决策：D-001@v1
- 必须：linux 平台下跨仓仓根路径匹配 `/mnt/<盘>/`（WSL automount）而 worktree 落位路径不匹配时，ensureCrossWorktrees 必须输出含「WSL」「工具链」「worktree.crossPlacement」关键词的警告（引导配置同侧落位）。
- 可以：win32/darwin 或两侧同域时零输出（不误报）。
- 必须：警告不得阻断 ensureCrossWorktrees 主流程（advisory）。

#### 场景：WSL 主仓 + Windows 盘跨仓
- Given 主仓在 WSL /root、跨仓注册路径 /mnt/e/... 且未配置 crossPlacement
- When ensureCrossWorktrees
- Then stderr 出现分裂警告并给 crossPlacement 配置指引；worktree 照常创建

### FR-04: maven/gradle 缺省供给落 n/a
覆盖决策：D-002@v1
- 必须：ECOSYSTEMS 表 maven 与 gradle 表项 install 为 null；项目无显式 commands.install 时 provisionDeps 根状态必须为 n/a 且禁止 spawn mvn/gradle 进程。
- 必须：显式 `commands.install` 配置时优先级不变（仍按白名单执行）。
- 必须：checkDepsFreshness 对 maven/gradle 的 stale/main-drift 判定继续以 pom.xml/build.gradle 清单 hash 为基准（marker=null 语义不变）。

#### 场景：maven 仓 worktree 供给
- Given 跨仓 urgent（pom.xml）无 commands.install
- When provisionDeps(worktree, repoRoot)
- Then 返回 depsStatus='n/a'，无任何子进程 spawn

### FR-05: deps 门控对 n/a 放行
覆盖决策：D-002@v1
- 必须：enforceDepsGate（主仓与跨仓两侧）对 depsStatus='n/a' 必须放行，不得因 maven/gradle 缺省供给路径阻断 execute --done。

#### 场景：跨仓 maven deps 门
- Given 跨仓仓 depsStatus=n/a
- When execute --done 触发 crossCheckOrExit
- Then 该仓不计入 crossFailed，不阻断

### FR-06: 跨仓主副本直写检测告警
覆盖决策：D-003@v1
- 必须：applyCrossRepoWorktrees 对每个有 meta 的跨仓仓，主副本 baseHash..HEAD 有提交推进且推进文件集与该仓声明文件面（resolveApplyAllowSet 切片）交集非空时，必须输出含「疑似绕过 worktree 直写主干」字样与 repoKey、交集文件的 warning。
- 必须：交集为空、无提交推进或声明面缺失时禁止告警（不误报并行会话无关推进）。
- 必须：worktree 目录被外部删除（meta 随目录消失）与 changedFiles 收集抛错的分支不适用检测（D-003 故障面，不误报）。

#### 场景：D-007 签名（空 worktree + 主副本推进命中声明面）
- Given 跨仓 worktree 无任何交付改动，主副本 baseHash..HEAD 有 5 个 commit 且文件与声明面相交
- When applyCrossRepoWorktrees
- Then warnings 含「疑似绕过 worktree 直写主干」并列出 repoKey 与交集文件；apply 流程本身不阻断

### FR-07: 直写检测 advisory 不阻断
覆盖决策：D-003@v1
- 必须：直写检测任何路径（git 调用失败、allowSet 读取失败）必须 fail-open 跳过检测，禁止阻断或翻转 apply 结果。

#### 场景：检测自身异常
- Given git rev-list 在跨仓仓失败
- When applyCrossRepoWorktrees
- Then 无 warning、无 error，apply 照常完成

## 非功能需求
- 兼容性：无 crossPlacement 配置 + 非 JVM 生态 + 无主副本推进的全部既有行为零变化（现测试套全绿为证）。
- 可回退：新配置键不配置即回退旧行为；注册表文件删除即回退纯公式寻址。
- 可测试：三个新测试文件独立可跑（node:test + 真实 git fixture，对齐 cross-repo-worktree-isolation.test.mjs 范式）；Windows/Linux/macOS 路径与换行兼容（WSL 判定按 platform==='linux' 且路径前缀，不碰 win32 分支）。

## 测试绑定（每条 FR 至少一行）

FR-01: test/cross-worktree-placement.test.mjs「crossPlacement 落位 + 仓根内拒绝 + 缺省零回归」
FR-02: test/cross-worktree-placement.test.mjs「注册表寻回 + 悬挂键 sweep + 无 meta 不入列 + 损坏降级」
FR-03: test/cross-worktree-placement.test.mjs「WSL 分裂警告命中与不误报」
FR-04: test/worktree-deps-provision.test.mjs「maven/gradle 根供给 n/a 零 spawn」
FR-05: test/worktree-deps-provision.test.mjs「n/a 在放行集断言（depsOk 同源语义）」
FR-06: test/cross-main-copy-bypass.test.mjs「交集命中告警 + 未命中/声明面缺失不告警」
FR-07: test/cross-main-copy-bypass.test.mjs「git 失败 fail-open 零阻断」
