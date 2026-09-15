---
author: qinyi
created_at: 2026-09-15 21:18:02
---
# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 主 agent | 走 sillyspec 完整流程的执行者（本 CLI 的直接用户） |
| 子代理 | execute 期在 worktree 内实现 task 的执行者（默认不 commit） |
| 并行会话 | 同仓同时活跃的其他 sillyspec 会话（quick 或变更） |

## 功能需求

### FR-01: baseline overlay 隔离并行会话声明文件
覆盖决策：D-001@v1
Given 主仓存在并行会话在途文件（其他 quick 会话 guard.json allowedFiles 或其他变更 design §6 声明，且非本变更 own 声明），本变更 worktree create 触发 `_overlayBaseline`
When overlay 执行 staged/unstaged patch 道与 untracked 复制道
Then 三道均排除该文件（worktree 保留基线 HEAD 版本），隔离清单（文件←归属者）打印一行，`meta.baselineFiles` 与 checkpoint message 不含该文件

Given 主仓无并行会话声明（foreign=[]）
When overlay 执行
Then 行为与现状完全一致（零回归）

Given `_overlayBaseline` 调用未传 changeName（存量测试直调路径）
When overlay 执行
Then 不做 foreign 切分，行为与现状一致

### FR-02: assess/apply 剔除 no-op 文件
覆盖决策：D-002@v1
Given worktree 中某文件相对 baseline checkpoint 有 diff，但工作区内容与主仓 HEAD 树 blob 相等（apply 回主仓为 no-op）
When `applyWorktree` 计算 changedFiles（apply 与 assess checkOnly 同路径）
Then 该文件从 changedFiles/deletedFiles/absentAfterMerge 剔除，warnings 列出 no-op 清单

Given 文件内容 ≠ 主仓 HEAD blob（或主仓 HEAD 无该路径的新文件）
When changedFiles 计算
Then 该文件保留在 changedFiles（判定不受影响）

### FR-03: worktree.supplyFiles 生成物供给
覆盖决策：D-003@v1
Given local.yaml 配置 `worktree.supplyFiles: ["src/build-id.ts"]`，主仓该文件存在
When worktree create step 5.9 供给步执行
Then 文件复制进 worktree（父目录按需创建），`meta.supplyFiles` 记录实供清单

Given supplyFiles 配置的 glob 在主仓无匹配
When 供给步执行
Then console.warn 提示缺失，不阻断 create

Given local.yaml 未配置 supplyFiles（默认 []）
When create 执行
Then 供给步空转，行为与现状一致

### FR-04: 勾选守卫口径统一 + 归因多归属
覆盖决策：D-004@v1
Given worktree 内有未提交改动（子代理默认不 commit），某 task 的草稿 review changedFiles 非空且命中这些文件
When `prefetchDiffFileSet` 构造 diffFileSet
Then 集合 = base..head diff ∪ porcelain 未提交 ∪ committed merge-base 补齐，**再剔除 meta.baselineFiles**；`shouldAutoCheckTask` 守卫命中、task 被自动勾选

Given 某文件仅被 baseline checkpoint 夹带（在 meta.baselineFiles 内）而 task 声明了它但未实现
When 守卫判定
Then diffFileSet 已剔除该文件，task 不被误勾（防伪底线保持）

Given in-place 模式（无 worktree）
When helper 调用
Then porcelain 取 cwd，与现状并入行为一致（不丢）

Given 同一文件被多个 task 的 review changedFiles 声明
When `attributeSuspectTasks` 归因
Then 全部命中 task 收集（string[]），③类报告渲染多归属；`suspectTask` 边界 join 成字符串，gates.js/archive-delta.js 下游零改动

### FR-05: required-evidence 消费侧双根核验
覆盖决策：D-005@v1
Given apply 前证据账声明 verifiedFiles，某新文件只存在于 worktree（主仓不存在）
When `runRequiredEvidenceCheckV2` 逐文件核验
Then 候选根 = [主仓 cwd, worktree 根]（meta 解析同 resolveVerifyChangedFiles 口径），任一根存在即 filesExist=true，mtime 取命中根（双根都在取 worktree 根）；不再误报「文件不存在」

Given worktree meta 缺失或 in-place
When 核验执行
Then 退单根 [cwd]（现状，零回归）

## 非功能需求

- 兼容性：未配置 supplyFiles / 无并行声明 / 无 meta 的存量场景行为全部不变；`attributeSuspectTasks` 返回结构变更仅本仓消费且边界 join 保下游零改动
- 可回退：overlay 隔离/no-op 剔除/双根核验均为纯过滤与读数扩展，git 失败路径 fail-open/fail-closed 沿既有契约（oracle 失败→不过滤退现状；hash-object 失败→保守不剔）
- 可测试：五坑各至少一条正向 + 一条零回归断言；Windows 路径口径（正斜杠归一、quotepath 对齐）全覆盖

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | overlay 消费 own/foreign oracle，不做语法校验 |
| D-002@v1 | FR-02 | no-op 过滤放 choke point，apply/assess 同口径 |
| D-003@v1 | FR-03 | supplyFiles 配置驱动，不做自动探测 |
| D-004@v1 | FR-04 | helper 口径单一化 + baselineFiles 剔除 + 多归属 |
| D-005@v1 | FR-05 | 消费侧双根，生成时机不动 |
