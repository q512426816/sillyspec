---
author: flow-machine-draft
created_at: 2026-11-14T14:24:18.838Z
---
# 需求规格（Requirements）— 2026-11-14-module-cards-wait-ask-note

## 功能需求

### FR-01: stages 模块卡注记节含 2026-11-14-wait-ask-tool-and-selfcheck-output 增补行（自检结果入产物），与 src/stages/brainstorm.js 输出契约一致

- stages 模块卡必须在既有「方案硬约束准入与禁凑数」注记节内含 2026-11-14-wait-ask-tool-and-selfcheck-output 增补行，描述自检结果入产物口径（四行检查逐行打勾、✗ 回到对应处理），必须与 `src/stages/brainstorm.js` 方案步「### 输出」契约文案一致。

#### 场景：注记与源码对表

- Given 方案步输出契约已含自检结果产物
- When 阅读 stages 模块卡注记节增补行
- Then 口径一致，无相反描述

### FR-02: runtime 模块卡含「wait 提问方式指引注入（2026-11-14-wait-ask-tool-and-selfcheck-output）」节，与 src/run/prompt.js 注入行为一致

- runtime 模块卡必须包含「wait 提问方式指引注入（2026-11-14-wait-ask-tool-and-selfcheck-output）」注记节，描述 requiresWait/mayNeedWait 两分支注入 AskUserQuestion 优先指引、auto 模式不注入，必须与 `src/run/prompt.js` 实际注入行为一致。

#### 场景：注记与注入行为对表

- Given prompt.js 两分支已注入提问方式指引
- When 阅读 runtime 模块卡注记节
- Then 注入位置（两分支）、措辞要点（AskUserQuestion 优先/回答带入 --answer）、auto 例外均一致

### FR-03: 两卡 frontmatter updated_at 更新为 2026-11-14

- stages 与 runtime 两模块卡 frontmatter 的 `updated_at` 必须为 `2026-11-14` 日期值。

#### 场景：时间戳

- Given 两卡内容有变更
- When 检查 frontmatter
- Then `updated_at` 均为 `2026-11-14T00:00:00+08:00`

### FR-04: 文档改动随变更提交入库（显式 pathspec）

- 文档改动必须用显式 pathspec 提交（禁止目录级 add / 裸 commit），提交消息带本变更任务 token。

#### 场景：提交面核对

- Given 文档改动已完成
- When 提交
- Then `git diff --cached --name-only` 仅含本变更声明文件，无并行会话残留

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯模块文档注记改动，验收靠与 src/stages/brainstorm.js 输出契约逐条对表
FR-02: 不适用：纯模块文档注记改动，验收靠与 src/run/prompt.js 注入行为逐条对表（行为锁点已在 test/output-step-render.test.mjs）
FR-03: 不适用：纯 frontmatter 时间戳改动，验收靠文件头检查
FR-04: 不适用：提交纪律由收口提交面核对与 docs-check 门覆盖
