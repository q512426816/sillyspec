---
author: flow-machine-draft
created_at: 2026-10-23T13:32:47.476Z
---
# 设计记录（Design Record）— 2026-10-23-push-review-debt

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

逐项清偿上变更评审留档的三发现，全部落在既有面内不扩 scope：①`test/push-cli.test.mjs` 补两条真仓守卫用例——「区间含已推送提交」用第二远端分支让区间提交被 remote-tracking ref 可达，「merge commit」用 no-ff 合并构造；②`src/push.js` planPush 补 tag/签名警示——tag 用 for-each-ref 取 tip 交区间集合（tip ∈ (base..head] 即告警），签名用 `git log --format=%H%x1f%G?` 逐提交取标记、非 N 计数告警，解析逻辑抽纯函数 `signatureWarnFromFlags` 供单测；③`pushBranch` human 模式传 `stdio:['ignore','inherit','inherit']` 让 hook 输出实时直达终端——git-helper 既有注释「push 用 inherit 透传」随之与实现一致（该文件零改动）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/push.js`：planPush 的 warnings 新增两类条目（tag 落区间 / 签名提交压扁）；新增导出纯函数 `signatureWarnFromFlags(flags)`（供测试直测）；pushBranch 新增 `json` 参数：human 模式 stdio=inherit，`--json` 模式行为不变（pipe 捕获）。
- `src/git-helper.js`：零改动——既有「push 用 inherit 透传」注释随 pushBranch 实现兑现而对齐。
- `test/push-cli.test.mjs`：新增 4 个用例（两守卫拒绝、tag/签名警示、hook 失败透传）；既有用例零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - tag/签名警示在 planPush 只读快照内计算；push 前已有「远端 tip 再探」守卫，计划后远端变化会被拒绝，警示信息陈旧不会造成改写（警示是 advisory 不参与守卫判定）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 警示计算只读（rev-list/tag/log），无写面；push 全程仍在既有文件锁 + CAS 内，本变更不新增临界区。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - inherit stdio 只改变输出通道，不改变子进程生命周期；push 失败路径与上变更一致（本地压扁保留 + 备份 ref + undo 指引），本变更不触碰改写链。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - tag/签名检测只在当前仓 refs 上跑；`git tag --merged` 天然限定当前 refs 命名空间，不涉及跨仓/其他 worktree。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：签名检测依赖 `git log %G?`，在无 GPG 环境对所有提交返回 N——告警天然静默，不会误报（测试锚钉「全无签名零误报」）。
- 死路 1：给签名告警造真实 GPG 签名提交做集成测试——临时仓拉起 GPG 环境在 Windows CI 上脆且慢，放弃；改用纯函数解析锚 + 真仓「零误报」负断言。
- 死路 2：pushBranch 用捕获 pipe 再转发 stderr——hook 输出变成事后整段打印，丢失实时性；inherit 才满足「报错一次给全」，--json 场景保留 pipe。
- 死路 3：编辑已归档的 2026-10-23-push-squash 冻结件来改绑定短语——sha256 锚定件不可改，绑定对齐在本变更 requirements 里以真实测试名重写。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | `src/push.js` | planPush 补 tag/签名警示；pushBranch 增加 json 参数与 inherit stdio |
| 修改 | `test/push-cli.test.mjs` | 新增 4 用例：两守卫拒绝 / tag+签名警示 / hook 失败透传 |
| 修改 | `test/push-plan.test.mjs` | 新增签名标记解析纯函数用例 |
