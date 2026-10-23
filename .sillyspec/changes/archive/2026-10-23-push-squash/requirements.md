---
author: flow-machine-draft
created_at: 2026-10-23T08:40:39.989Z
---
# 需求规格（Requirements）— 2026-10-23-push-squash

## 功能需求

### FR-01: sillyspec push --dry-run 只输出计划，不改写 ref/index/工作区/远端

- `sillyspec push --dry-run` 必须只做只读计算并输出计划，禁止创建备份 ref、改写分支 ref、变更 index/工作区内容或触发任何远端写操作。
- 计划必须包含目标远端/分支、base、待处理提交数、分组结果与压扁后的 subject 预览；无待处理提交时必须显式输出 no-op 并以 0 退出。

#### 场景：有未推送提交

- Given 当前分支领先目标远端 3 个提交
- When 执行 `sillyspec push --dry-run`
- Then 输出 1 个计划，HEAD、index、工作区、`refs/sillyspec/*` 与远端 ref 全部不变

#### 场景：没有未推送提交

- Given 当前分支与目标远端一致
- When 执行 `sillyspec push --dry-run`
- Then 输出 no-op 提示并以 0 退出，不创建任何备份 ref

### FR-02: 默认 by-change 将连续同变更提交压成一笔，保留变更名与全部 task-NN 证据 token

- 默认 `--mode by-change` 必须把连续且归属同一变更的提交压成一笔；非连续段禁止跨段重排合并，保持原提交顺序并在计划中披露；无变更归属的提交必须原样保留为独立提交。
- 合成提交的 subject 必须包含 `(<变更名>)` 或 `（<变更名>）`，body 必须保留该段全部原始提交的 subject/body，并至少包含原始消息中出现的全部 `task-NN` token。

#### 场景：连续同变更段

- Given 提交序列为 A1、A2、B1、A3（A/B 为不同变更）
- When 执行默认 `sillyspec push`
- Then 生成 3 笔提交（A1+A2、B1、A3），A3 不跨过 B1 与 A1+A2 合并

#### 场景：证据 token 保留

- Given A 段原始提交含 `task-01`、`task-02/03`
- When A 段被压成一笔
- Then 合成提交 body 同时含 `task-01` 与 `task-02/03`，哨兵证据扫描可命中

### FR-03: 执行后 index/工作区逐字节不变，远端快进推送成功

- 压扁必须用 `git commit-tree` 生成新提交并 CAS 更新分支 ref，禁止使用 `git reset --soft`、`git checkout` 或任何会重写 index/工作区的命令。
- 压扁后新 tip 的树必须与旧 HEAD 树完全相同；必须执行普通 `git push`（快进），禁止 `--force`、`--force-with-lease` 或 `--no-verify`。

#### 场景：暂存区与工作区有在途改动

- Given index 中有已暂存文件、工作区有未暂存修改
- When 执行 `sillyspec push --no-push`
- Then 新 HEAD 树等于旧 HEAD 树，`git status --porcelain` 与执行前逐字节一致

#### 场景：快进推送

- Given 目标远端分支是当前分支的祖先
- When 执行 `sillyspec push`
- Then 远端分支更新为新 HEAD，远端历史只有压扁后的提交，无需 force

### FR-04: base 非 HEAD 祖先、区间含已推送提交、活跃 worktree、merge commit、staged 改动等场景被拒绝并给出可执行指引

- 压扁前必须执行守卫检查：base 必须是 HEAD 祖先；区间 `base..HEAD` 禁止包含任何远端 ref 可达的提交；禁止在 SillySpec worktree cwd 内压扁；区间含 merge commit 时默认拒绝；index 与 HEAD 不一致时拒绝。
- 任一守卫拒绝时必须以非零退出且零改写；错误信息必须给出下一步可执行命令或明确的人工处置路径。

#### 场景：base 分叉

- Given 远端分支存在本地没有的提交
- When 执行 `sillyspec push`
- Then 拒绝并提示先 fetch/rebase，HEAD 与远端均不变

#### 场景：活跃 worktree

- Given cwd 位于 `.sillyspec/.runtime/worktrees/<change>`
- When 执行 `sillyspec push`
- Then 拒绝并提示先在主仓 `worktree apply` 后再推送

#### 场景：区间含已推送提交

- Given `base..HEAD` 中存在被其他 remote-tracking ref 可达的提交
- When 执行 `sillyspec push`
- Then 拒绝并说明不允许 force-push

### FR-05: 压扁前自动建备份 ref，--undo 可在推送前恢复

- 压扁前必须创建 `refs/sillyspec/pre-squash/<branch>/<timestamp>` 指向旧 HEAD；改写成功后必须创建对应的 `refs/sillyspec/post-squash/...` 指向新 HEAD。
- `--undo` 必须仅在当前分支 tip 精确等于 post-squash ref 时执行 CAS 回退；禁止在远端已指向压扁后 HEAD 时静默回退。

#### 场景：压扁后撤销

- Given 刚执行 `sillyspec push --no-push`
- When 执行 `sillyspec push --undo`
- Then 分支恢复到旧 HEAD，index/工作区不变，pre/post ref 仍可审计

#### 场景：已推送后撤销

- Given 压扁结果已成功推送到远端
- When 执行 `sillyspec push --undo`
- Then 拒绝并说明远端已更新，避免制造 non-fast-forward

### FR-06: 新增 sillyspec:push skill 与 push 命令卡，flow done 不再提示 reset --soft

- 必须新增 `.claude/skills/sillyspec-push/SKILL.md`（frontmatter `name: sillyspec:push`）与 `assets/command-cards/push.md`，并在 `COMMAND_CARD_NAMES` 注册 `push`。
- `src/flow.js` 中三处用户可见的 `reset --soft` 压扁指引必须替换为 `sillyspec push` 指引；skill 必须明确禁止直接 `git push`、`--force` 与 `--no-verify`。

#### 场景：init 分发

- Given 执行 `sillyspec init --tool zcode,claude`
- When skill 复制段运行
- Then 两个工具目录都包含 `sillyspec-push/SKILL.md`，命令卡目录包含 `push.md`

#### 场景：收口指引

- Given `flow done` 完成
- When 输出 Git 历史整理提示
- Then 提示使用 `sillyspec push`，不再出现 `git reset --soft`

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/push-cli.test.mjs「--dry-run 零写盘」
FR-02: test/push-plan.test.mjs「by-change 连续段与 task token 保留」
FR-03: test/push-cli.test.mjs「压扁后 index/工作区不变且远端快进」
FR-04: test/push-plan.test.mjs「守卫拒绝矩阵」；test/push-cli.test.mjs「真实仓守卫拒绝」
FR-05: test/push-cli.test.mjs「备份 ref 与 --undo」
FR-06: test/push-skill.test.mjs「push skill 与命令卡一致性」；test/flow-guidance.test.mjs「flow done 不再提示 reset --soft」
