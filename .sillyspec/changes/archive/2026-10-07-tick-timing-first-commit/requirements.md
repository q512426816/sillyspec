---
author: flow-machine-draft
created_at: 2026-10-07T11:31:34.074Z
---
# 需求规格（Requirements）— 2026-10-07-tick-timing-first-commit

## 功能需求

### FR-01: 勾选时点判定按 tasks.md 首次提交锚定

必须：flow done 哨兵「勾选时点」advisory 的锚定改为 tasks.md 的 **git 首次提交**（路径全 history 最早一条，`--reverse` 首行）与收口窗口最后提交（HEAD）比对：首提 != HEAD（每任务随交付提交 tasks.md 的渐进形态）禁止出「一把勾模式」警告；首提 == HEAD（真一把勾——tasks.md 全程只在最后一笔提交出现）与 untracked（从未提交）两分支文案与行为不变。

#### 场景：渐进提交形态不再误报

Given agent 每任务提交时一并 pathspec 提交 tasks.md（历史 0→1→2 渐进勾选），窗口最后一笔提交触碰 tasks.md
When flow done 时点判定
Then 无「一把勾模式」警告（untracked 分支亦不触发）

#### 场景：真一把勾照旧警告

Given tasks.md 的唯一一笔提交就是窗口最后一笔提交
When flow done 时点判定
Then 出「首次 git 提交 == 收口最后提交（一把勾模式）」警告

### FR-02: 测试钉同步新口径

必须：tick-loop-nudge.test.mjs 时点钉更新为首提锚定参数形态（`--reverse`），断言旧 `-n 1` 参数形态零残留；全量 npm test 绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/tick-loop-nudge.test.mjs「④ 哨兵时点判定钉（首提锚定/一把勾 warn/untracked warn/fail-soft）」
FR-02: test/run-tests.mjs（全量绿）
