---
author: flow-machine-draft
created_at: 2026-10-07T12:56:19.088Z
---
# 提案书（Proposal）— 2026-10-07-allticked-gate-docs-resync

## 动机

任务原话转写：真实会话（hide-quicklog-tab，跑的是修复版 CLI）暴露两个残留：① agent 全部干完后 for 循环一把连勾 4 格、先勾后补 token——机器面每格独立事件正常，但「不全勾不能收口」没有牙齿（openspec 的完成状态机：archive 拒绝直到 all_done）；② 平台工件快照陈旧——spec-sync 只在协议调用时点推文档，agent 中途重写 tasks/design 后平台永远显示 start 初稿（用户看到 4 任务+空 design，磁盘实态是 5 任务+已作答）。用户裁定：时序门不加，参考 openspec——全勾成为收口硬门；平台重推修掉。

成功标准：
- flow done：tasks.md 有任务行但未全勾 → 拒收（指引逐格 tick/每格 token 证据/可先改写任务面），不再 advisory 放行（openspec all_done 对齐）
- task tick 翻格成功后 best-effort 触发 spec-sync 文档重推；watcher 检测 tasks/design/requirements/proposal 内容变更事件（防抖冷却）触发同款重推——平台不再停留 start 时点快照
- 相关测试更新全绿（task-tick ⑤、sentinel-wiring 形态C 反转为拒收；新增 shouldResyncDocs 纯函数与接线钉）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. flow done：tasks.md 有任务行但未全勾 → 拒收（指引逐格 tick/每格 token 证据/可先改写任务面），不再 advisory 放行（openspec all_done 对齐）
2. task tick 翻格成功后 best-effort 触发 spec-sync 文档重推；watcher 检测 tasks/design/requirements/proposal 内容变更事件（防抖冷却）触发同款重推——平台不再停留 start 时点快照
3. 相关测试更新全绿（task-tick ⑤、sentinel-wiring 形态C 反转为拒收；新增 shouldResyncDocs 纯函数与接线钉）

## 成功标准（可验证）

1. flow done：tasks.md 有任务行但未全勾 → 拒收（指引逐格 tick/每格 token 证据/可先改写任务面），不再 advisory 放行（openspec all_done 对齐）
2. task tick 翻格成功后 best-effort 触发 spec-sync 文档重推；watcher 检测 tasks/design/requirements/proposal 内容变更事件（防抖冷却）触发同款重推——平台不再停留 start 时点快照
3. 相关测试更新全绿（task-tick ⑤、sentinel-wiring 形态C 反转为拒收；新增 shouldResyncDocs 纯函数与接线钉）
