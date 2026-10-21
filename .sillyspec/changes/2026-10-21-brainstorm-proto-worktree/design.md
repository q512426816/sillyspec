---
author: flow-machine-draft
created_at: 2026-10-21T04:01:24.321Z
---
# 设计记录（Design Record）— 2026-10-21-brainstorm-proto-worktree

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

核心是**位置豁免而非阶段豁免**：`shouldBlockWrite` 在文件白名单检查（worktree-guard.js:806）之后、阶段门（:808）之前插入一条——路径落在已注册 worktree（`.sillyspec/.runtime/worktrees/<变更名>/meta.json` 的 worktreePath 内，复用既有 `isInsideRegisteredWorktree`）即放行。理由：与 Bash 侧既定策略对称（:947 已注册 worktree 内 cwd 无条件全放行、不问阶段）——registered worktree 是隔离区，写入风险由 worktree 隔离本身兜底，阶段门的职责是保护主树。豁免面只认 meta.json 登记，未登记的 worktrees 存储区子目录维持拦截（既有回归断言不动）。

配套两件：① `STAGE_HINTS.brainstorm` 文案补原型协议指引（主树被拦的 agent 能看到出路：变更 key 已出 → `worktree create` → 进树写原型、文档照常主树）——注意 readCurrentStage 的 SQL 只认 execute/quick（测试文档化的既定契约），brainstorm 阶段落 `'(none)'` 提示，故指引行同时落在 `'(none)'` 提示（条件措辞「若在头脑风暴阶段做真原型」，无活跃变更时不误导），不改 SQL 契约；② FR-02/03 属现状核验+测试固化——create() 的 inWorktree 幂等守卫与 native 恢复是既有行为（worktree.js create 开头分支），补 create 级幂等测试；stage.js 的 getMeta 短路（stage.js:103-107）提取为 `WorktreeManager.ensure()`，行为等价重构，参照 `ensureCrossWorktrees` 的可测先例。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/hooks/worktree-guard.js` `shouldBlockWrite`：新增「已注册 worktree 路径放行」分支。对外行为变化＝brainstorm/plan/verify/(none) 阶段，已注册 worktree 内的源码 Write/Edit 由 blocked 变 allowed；主树与非登记路径行为不变。
- `src/hooks/worktree-guard.js` `STAGE_HINTS.brainstorm`：提示文案变化（纯提示，无消费者断言旧文案——已核验无引用）。
- `src/worktree.js`：新增 `WorktreeManager.ensure(name, {base, adoptBranch})`——getMeta 命中返回 `{...existing, existing:true}`；未命中调 create 返回 `{...created, existing:false}`。
- `src/run/stage.js`：execute 分支改调 `wm.ensure`，日志语义保持（已存在 → 「🔗 worktree 已存在」；新建 → 「🔗 worktree 已创建」），create 抛错的修复建议输出不变。
- CLI 命令面：无新增/无变更；文件格式（meta.json/flow-state.yaml）：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。hook 是无状态单次判定（直读 DB 只读连接 + 扫 worktrees 目录读 meta.json），每次调用独立快照；meta.json 原子写（rename）保证读到整份新值或旧值，不存在半份导致路径比对误判。ensure() 的 getMeta→create 两步间另一进程抢先 create 时，create 自身的「已存在」守卫兜底（幂等返回或显式报错，不盲重建）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   豁免判定只读共享态，不新增写并发面。两个 agent 同时写同一 worktree 内文件是多会话既有语义（Bash 侧本就全放行）；worktree 的写冲突治理在 apply/cleanup 层（repo 级 main-repo.lock + 所有权护栏），本变更不触碰该层。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。豁免只认 meta 存在这个事实：变更归档/收口后其 worktree 由既有 cleanup（salvage→删除→prune）收走，meta 随目录消失、豁免自然失效；归档与 cleanup 之间的残留窗口内可写，与 Bash 侧现状一致，doctor/cleanup 既有机制兜底，不新增风险面。头脑风暴变更被否/放弃时，worktree 含未 apply 交付面会被 cleanup 护栏拦（防误删），需 --force 显式清——既有护栏，预期内。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。豁免按 projectRoot 下 `.sillyspec/.runtime/worktrees/<名>/meta.json` 逐个比对 worktreePath（isPathInside 已做 Windows 大小写归一），findProjectRoot 逐级向上定位仓根，不会越仓匹配；跨仓 worktree（<change>--<repoKey> 命名）meta 同样登记在 worktrees 目录，天然同权放行，无特殊分支。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：豁免面覆盖 verify 阶段——「verify 只审查不改码」的软约束在 worktree 内被放开。判定：可接受。Bash 侧对 worktree 内 cwd 本就无条件放行（echo > 即可写文件），Write/Edit 门与 Bash 门不一致才是现状异常；隔离区内改动不进主树、apply 有 allowlist 门把交付面，风险有双层兜底。

放弃案①：按变更活跃态收窄（仅 DB status='active' 的变更 worktree 放行）——放弃：hook 无法知道当前 agent 属于哪个 change，只能按路径判；且归档残留 worktree 的可写性与 Bash 侧对齐更可预期，引入 DB 活跃态判断反而制造两门不一致窗口。
放弃案②：给 brainstorm 加专用声明（如 proto-worktree flag/mode）——放弃：多一层声明状态要维护，收益只是名义上的「阶段纯度」；位置豁免一条规则覆盖全部非 execute 阶段，且与 Bash 侧策略同构。
放弃案③：只改 STAGE_HINTS 指引不动豁免（纯文档）——放弃：hooked harness 里 agent 被拦后按指引进了 worktree 仍被 :808 阶段门拦死，指引成死路，问题没解。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/hooks/worktree-guard.js | shouldBlockWrite 加已注册 worktree 位置豁免；STAGE_HINTS.brainstorm + '(none)' 提示补原型协议指引 |
| 改 | src/worktree.js | 新增 WorktreeManager.ensure（getMeta 命中幂等返回，未命中 create） |
| 改 | src/run/stage.js | execute 分支改调 wm.ensure（行为等价，日志语义不变） |
| 改 | test/worktree-guard.test.mjs | FR-01 三场景：brainstorm 放行 / 主树拦+提示含指引 / 未登记存储区仍拦 |
| 改 | test/worktree-native-overlay.test.mjs | FR-02：linked worktree 内 create meta 已存在幂等复用 |
| 新增 | test/worktree-ensure-idempotent.test.mjs | FR-03：ensure 幂等语义（命中不重建） |
