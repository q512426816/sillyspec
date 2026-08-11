# 提案（Proposal）— SillySpec 跨仓 task 支持

## 一句话

让 SillySpec 支持一个 change 里的某些 task 改另一个 git 仓的代码（跨仓 task），review/apply/verify 全链路多仓化，单仓 change 零回归。

## 动机

sillyhub 项目（multi-agent-platform 仓）的 change 里 task-09/10 改 sillyspec 仓代码。当前 SillySpec 假设单仓，跨仓 task 在 5 个环节受阻（task review 判伪造 / apply 一刀切排除 / 清单无 repo 维度 / verify 测试跑不到 / pathOwners 冲突误判），只能用 `base=head 空 commit + changedFiles=[]` workaround 逃避校验。这是真实 dogfood 痛点，不是假设性需求。

## 方案

引入 `MultiRepoContext` 运行时多仓执行上下文（方案 B）：execute 启动时扫所有 task 卡片 `repo:` 字段，查 `local.yaml repos:` 注册表建 `Map<repoKey, {gitDir, worktreePath, base, head, projectRoot}>`。7 个单仓假设点（task-review/worktree-apply/verify-postcheck/gates）每处把硬编码 `wm.getMeta`/`cwd`/`worktreePath` 换成 `ctx.resolve(repo).xxx`。单仓 change 退化为单值 map 零回归。

三个可靠性约束：①跨仓 base/head 实时取 git 不读 meta；②未注册 repo fail-closed 阻断；③pathOwners 按 (repo,path) 聚合 + design §6 按仓分段。

## 非目标（Non-Goals）

- 不做跨仓仓进度库侵入（review 全主仓存）
- 不做 MCP 派发层复用（路径A 是 worker 派发，与本地多仓正交）
- 不做跨仓仓 worktree 嵌套
- 不做跨仓仓进度同步
- 不做 gen:types worktree 友好性（consumer 侧脚本，非本仓）
- 不做混合存储（摘要+详文）

## 影响

- **正向**：跨仓 task 全链路打通，dogfood sillyhub 场景不再 workaround；MultiRepoContext 抽象为未来更多多仓场景铺路。
- **风险**：跨仓 apply no-op 改造（A5 主流程耦合主仓 worktree 模型，跨仓 no-op 需精确区分主仓/跨仓路径）独立 PR 隔离；pathOwners 聚合改造需回归测；base+head 双锡点机制需 CLI 派发/回收时机精确。
- **兼容**：单仓 change 零行为变化；旧 review.json / 旧 local.yaml 向后兼容。
