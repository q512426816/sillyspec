---
author: flow-machine-draft
created_at: 2026-10-07T12:56:19.088Z
---
# 需求规格（Requirements）— 2026-10-07-allticked-gate-docs-resync

## 功能需求

### FR-01: flow done 全勾硬门（openspec all_done 对齐）

必须：flow done 哨兵位新增完成状态机判定——tasks.md 有任务行但未全勾（含零勾与部分勾）即拒收 exit 1，文案给三出口：逐格 task tick（每格需提交 token/review.json 证据）、先改写任务面再逐格勾、task tick 回显下一任务指针。governance-autopilot 的 token 代勾先跑：有证据未勾的格子已自动勾，拒的纯属零证据未完成面。旧「任务勾选缺失 advisory 放行」退役。

#### 场景：懒路径零勾

Given tasks.md 2 条任务零勾、区间有交付提交但无 token
When flow done
Then 拒收（任务未全勾（0/2）），change 保持 active 断点续

### FR-02: task tick 触发工件重推

必须：task tick 翻格成功后 best-effort 触发 spec-sync（triggerSync）——任务面变更即时上平台，失败不阻断翻格。

### FR-03: watcher 工件内容变更重推（防抖）

必须：watcher 主循环检测 tasks/design/requirements/proposal 四工件内容变更事件（shouldResyncDocs 纯函数：file/file-update 且 detail 含四工件名）→ 防抖冷却 10s 后 best-effort triggerSync；任务卡/代码/提交事件不触发。

#### 场景：Edit 勾格/中途重写任务面

Given watcher 在跑，agent 用 Edit 改写 tasks.md
When 下一轮采样产出 file-update(tasks.md)
Then 10s 冷却窗外即触发 spec-sync 文档重推——平台不再停留 start 时点快照

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/task-tick.test.mjs「⑤a 不勾+有交付 → 拒收」
FR-02: test/task-tick.test.mjs「⑥b 重推接线钉」
FR-03: test/task-tick.test.mjs「⑥a shouldResyncDocs 纯函数」
