---
author: flow-machine-draft
created_at: 2026-11-25T08:44:29.189Z
---
# 设计记录（Design Record）— 2026-11-25-freeze-face-body-attribution-and-review-base-fallback

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

缺陷一在 `src/foreign-declared.js`：`COMMIT_LOG_ARGS` 只取 `%s`（标题），`parseCommitLog` 因此看不到正文；而仓内提交惯例把 `(<变更名> task-NN)` 写在正文 footer，导致标题无名的本变更提交被 `buildCommitAttribution` 判为 pure-bare → `isForeignByCommit` 判 foreign → `filterCommittedFace` 把已提交交付文件剔出冻结面。做法：git log 格式追加 `%b`（正文）并以 `%x1e` 分隔文件列表，`parseCommitLog` 返回 `body`；归属判定（`isOwnByFacts` / `buildCommitAttribution` / `isOwnCommitForChange` 链路）改为在「标题 ∪ 正文」文本上解析变更名与 task token，标题优先、正文兜底。

缺陷二在 `src/task-review.js`：`writeTaskReview` 的 base 只从 worktree meta 取，meta 清理后即报「无法确定 base/head」。做法：base 解析链补一级回退——读变更目录（活跃或归档）`flow-state.yaml` 的 `baseline_commit`；该回退生效且未显式覆盖 changedFiles 时，用 `git diff base..HEAD`（∩ task 卡 allowed_paths）补出改动面，并保留主仓未提交改动并入。若调用方只给 `--changed-files`，base/head 双双回退 HEAD 并给 warning。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `COMMIT_LOG_ARGS` 的 git 格式串追加 `%x1f%b%x1e`；`parseCommitLog` 返回对象新增 `body` 字段（旧字段 sha/author/subject/files 不变）。
- `isOwnByFacts` / `isOwnCommitForChange` 入参新增可选 `body`；省略时行为与旧版一致。
- `writeTaskReview` 签名零变化；无 meta 时的错误路径改为回退路径，回退发生处追加 warning。
- CLI 命令参数、review.json schema、change-patch.json 结构均无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   归属解析按 git log 既成事实重算，与提交到达顺序无关；正文与标题同级读取，不存在先后依赖。body 中若引用他变更名，只会让 owners 集合变大（保守 own 方向），不会误剔本变更交付。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   本变更只改解析与推断纯逻辑，不写共享状态文件；review.json 落盘沿用既有「已存在拒覆盖 + --force」锁语义。两个会话同时跑 review write 仍由既有 reviewPath 存在性保护。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   body 解析对旧格式日志向后兼容（无 `%x1e` 时走原解析）；base 回退只读 flow-state，不写状态；回退失败（无 flow-state 且无 --changed-files）仍按原错误拒绝，不产生半写 review。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   变更目录取自 `specBase`（平台模式 specRoot 已透传），不写死 `.sillyspec`；跨仓 task 仍由既有 guardRepo 前置拒绝，不进入本回退路径。body 解析与仓无关。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：提交正文里顺带引用他变更名时，owners 集合会包含多个名字，使该文件在本变更面被判 own（保守方向，最多多冻一个文件，不会丢本变更交付）；正文里出现 task token 的纯说明文本可能让无名提交被判 token-lite，需依赖「正文无变更名且无 token」才判 foreign 的既有规则兜底。

放弃的方案：
- 只改提交规范（要求变更名写标题），不改解析：无法修复已发生提交，且平台自动提交会继续产生 footer 形态。
- 解析全部提交正文的任意文本并做模糊匹配：噪声大、误判方向不可控，否决；改为沿用既有括号变更名/task token 正则，只把输入文本从标题扩到标题+正文。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/foreign-declared.js | 日志格式带正文；parseCommitLog 返回 body；归属判定读标题+正文 |
| 修改 | src/task-review.js | base 回退 flow-state baseline；changedFiles 自动推导；仅 --changed-files 时 base/head 回退 HEAD |
| 修改 | test/commit-attribution-split.test.mjs | 先红后绿：正文 footer 归属（真实 git 仓 + filterCommittedFace） |
| 修改 | test/review-write.test.mjs | 无 meta 回退 baseline / 仅 changed-files 两用例 |
| 修改 | test/flowdone-disposition-drift.test.mjs | 夹具剥离平台注入的 GIT_AUTHOR_* 环境，保证作者断言确定性（收口实测发现） |
