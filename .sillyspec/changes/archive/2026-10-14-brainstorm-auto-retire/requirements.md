---
author: flow-machine-draft
created_at: 2026-10-14T03:08:20.158Z
---
# 需求规格（Requirements）— 2026-10-14-brainstorm-auto-retire

## 功能需求

### FR-01: 删除 brainstorm-auto 自动道并让 run auto 回退主模式表（必须）

`src/stages/brainstorm-auto.js` 必须删除；`src/run/command.js` 的 runAutoMode 中 brainstorm 特化（getAutoSteps 分支与 ensureAutoStage 的 auto 表种块）必须摘除——`run auto` 在 brainstorm 阶段必须走通用 ensureStageSteps 路径种入并推进主模式 8 步表（首步「进度确认」）。

#### 场景：主路径——run auto 新变更

Given 全新变更以 `run auto` 进入 brainstorm
When runAutoMode 种步骤表
Then 种入主模式 8 步表（首步名「进度确认」），不再存在 4 步 auto 表形态。

### FR-02: 存量 auto 表退役指引（必须）

对进度库中已存在 4 步 auto 表（首名「进度确认与上下文加载」）的存量变更，`run brainstorm` 与 `run auto` 触达 brainstorm 阶段时必须明确报错并给出处置指引（`--reset` 重种主模式 8 步表或 `doctor`——评审 P2 清偿：实现期实测 `--reopen` 对非空表按名保留旧表不重种，`--reset` 才是恢复出路），必须禁止静默重种清零进度。

#### 场景：主路径——存量 auto 表

Given 变更进度库 stages.brainstorm.steps 为 4 步 auto 形态
When run brainstorm --done / run auto 触达
Then exit 非零 + 退役报错文案（含已删除说明与 reset/doctor 指引），进度未被重种。

### FR-03: 引用面清理（必须）

必须清理全部引用：`src/run/complete.js` getStageStepsAutoAware 的 auto 表感知（改退役检测）；测试侧删除 brainstorm-auto-skeleton.test.mjs、brainstorm-auto-step2-conditional-wait.test.mjs、auto-dualtrack-brainstorm.test.mjs，摘除 decisions-header-backfill.test.mjs 与 proto-reuse-register.test.mjs 中的 auto 引用；docs/prompt 侧删除 brainstorm-auto.md 并摘除 _extract.mjs 变体块、README 表行与注记、_TEMPLATE 静态清单项、_build-site.mjs 注册项，_extracted.json 与 index.html 再生成。

#### 场景：主路径——全仓零悬挂引用

Given 改动落盘
When 全仓 grep brainstorm-auto（排除 .sillyspec 归档与 docs/sillyspec 历史评审件）
Then src/test/docs/prompt 现行文件零引用。

### FR-04: 测试覆盖与全绿（必须）

新增测试必须断言：①`run auto` 新变更 brainstorm 阶段种主模式 8 步表；②存量 auto 表触达 → 报错文案 + 进度未重种。收口前 `npm test` 必须全绿、`npm run lint` 必须绿、`docs gate` 必须过。

#### 场景：主路径

Given 改动落盘
When 跑新增测试与全量
Then 断言全过、既有测试零失败、lint 零错误、docs gate 通过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/brainstorm-auto-retire.test.mjs「run auto 新变更种主模式 8 步表」
FR-02: test/brainstorm-auto-retire.test.mjs「存量 auto 表触达报错且进度未重种」
FR-03: test/brainstorm-auto-retire.test.mjs「现行文件零悬挂引用（grep 面）」
FR-04: test/brainstorm-auto-retire.test.mjs（本文件即覆盖载体；全绿由收口实测对账保证）
