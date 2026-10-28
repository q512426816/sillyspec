---
author: flow-machine-draft
created_at: 2026-10-28T04:37:52.062Z
---
# 设计记录（Design Record）— 2026-10-28-shadow-checkpoint

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用 git 原生 plumbing 实现「tick 即存档」：新增 `src/checkpoint.js`，在 task tick 成功翻格后，以会话隔离的临时索引（`GIT_INDEX_FILE=.git/sillyspec-cp-index-<session>`，先 `read-tree HEAD` 起底）执行 `add -A`（带硬排除清单）→ `write-tree` → 树 SHA 与现 ref 树相同即 no-op 跳过 → 否则 `commit-tree`（父=上一存档，首档父=当时 HEAD）→ `update-ref refs/sillyspec/checkpoints/<change>`。全程不读不写共享 index，恢复走 `git restore --source`（仅工作区）。挂在 task-tick 成功路径上，best-effort fail-open——存档永远不许弄断 tick。

选这个方案而非替代品的原因：`git stash create` 不含 untracked 且 store 阶段动共享 ref 有竞争；外部 CAS/FUSE 方案（LayerFS 类）跨平台（Windows 无原生 FUSE）、持久性档案不合格、且引入与 git 治理链不互通的黑箱存储——前期评估已否。git 对象库本身就是内容寻址存储，增量成本=只哈希变化文件，零新依赖即得同等「只存变化」性质。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新模块 `src/checkpoint.js` 导出：`createCheckpoint({ repoRoot, changeName, session, taskId })` → `{kind:'created'|'noop'|'skipped', sha?, treeSha?, reason?}`；`listCheckpoints({ repoRoot, changeName })` → `[{sha, taskId, ts, files}]`；`previewRestore({ repoRoot, sha, paths })` → diff 文本；`restoreCheckpoint({ repoRoot, sha, paths, all })`；`deleteCheckpointRef({ repoRoot, changeName })` → bool；`readCheckpointConfig(repoRoot)` → `{enabled, maxUntrackedMB}`。
- 新 CLI 动词：`sillyspec checkpoint --change <名> [--diff <sha> [--path p]] [--restore <sha> [--path p|--all] --yes] [--delete-ref]`（缺省列存档链）。
- `src/task-tick.js`：翻格成功后追加钩子调用（行为变化=tick 回显多一行存档态；返回值/exit code 不变）。
- `src/change-delete.js`：删除主流程加一步 deleteCheckpointRef（best-effort 警告不阻断）。
- `src/config-schema.js`：登记 `checkpoint.enabled`（boolean，缺省 true）与 `checkpoint.maxUntrackedMB`（number，缺省 200）。
- ref 命名空间 `refs/sillyspec/checkpoints/<change>` 为新持久面；`git push` 默认不推自定义命名空间 ref（现有 push 面不变）。
- 无既有函数签名变更；无文件格式变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立——每档只依赖落档瞬时的全工作区态，与 tick 顺序无因果耦合；链头由 `update-ref` 原子翻转，后写者胜。并发双 tick 极端情况下丢一档不丢数据（工作区本身仍在，下一 tick 补档）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   临时索引按会话隔离（文件名含 session 标识），无共享锁点；共享 index 全程零读写（read-tree/add/write-tree 均在 GIT_INDEX_FILE 上，`git()` 以 `{...process.env, GIT_INDEX_FILE}` 展开注入，沿仓内既有 env 注入口径）；ref 按变更名隔离，`update-ref` 原子。他者 staged 条目物理上不可能被卷走——存档只读工作区与 HEAD，从不读共享暂存区。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   中断安全：临时索引残留 `.git` 内固定路径，同会话重入覆盖同名文件幂等，finally 清理；无 ref 半途态（update-ref 原子）。change-delete 清 ref（best-effort），归档保留 ref（审计面）；skip 态（护栏/异常/关闭）一行回显留痕，不落任何对象。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   ref 在各仓自身 `.git` 内，跨仓零串台；ref 名含 change 名，同仓多变更互不覆盖；worktree 会话（git-dir ≠ common-dir）v1 显式跳过存档，主仓/worktree 双形态不混淆；`.sillyspec/.runtime/` 与硬排除清单（node_modules/dist/build/target/.venv/venv/__pycache__/.next/.cache/coverage/.env*）不进快照，volatile 产物零噪声。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是 fail-open 失守——某条 git 调用路径意外碰共享 index 或抛错未兜住，把 tick 弄断（tick 是边干边勾主路径，不可用即事故）。对策：模块内全 try/catch 单出口、`git()` 显式 env 注入、双会话并发单测硬断言「staged 面前后逐字节一致 + tick exit 0」。次级风险是 blob 级无子文件去重——已跟踪大文件高频改动会每档存整 blob；接受为已知边界（源码负载无此形态），体积护栏挡住未忽略巨物侧的失控。

放弃的方案：`git stash create`（不含 untracked、语义是暂存不是历史、store 动共享 ref 有并发竞争）；FUSE/CAS 外部存储（LayerFS 类——Windows 无原生支持、自述无崩溃持久性、SQLite 黑箱与 git 治理链不互通）；把存档做成按变更归属切分的署名器（把「时间机器」当日志器用，职责混淆——归属判定属 target-files 治理层，不属存档层）。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | src/checkpoint.js | 影子提交核心模块（create/list/preview/restore/deleteRef/配置读取） |
| 修改 | src/task-tick.js | 翻格成功后 best-effort 落档钩子（fail-open） |
| 修改 | src/change-delete.js | 删除变更时同步清 checkpoint ref（best-effort） |
| 修改 | src/index.js | 注册 `checkpoint` CLI 动词与用法行 |
| 修改 | src/config-schema.js | 登记 checkpoint.enabled / checkpoint.maxUntrackedMB 键位 |
| 新增 | test/shadow-checkpoint.test.mjs | 临时 git 仓单测：核心+并发零污染+挂点+清理 |
