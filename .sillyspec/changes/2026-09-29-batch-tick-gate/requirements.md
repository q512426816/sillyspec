---
author: flow-machine-draft
created_at: 2026-09-29T08:03:28.046Z
---
# 需求规格（Requirements）— 2026-09-29-batch-tick-gate

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: flow start 简报（两路）与 tasks.md 头部含 spec 阶段任务面定稿要求与 op
Given 系统就绪
When flow start 简报（两路）与 tasks.md 头部含 spec 阶段任务面定稿要求与 openspec 式执行循环指令
Then 行为符合本条标准描述

### FR-02: sentinel 新增 batchTickVerdict 纯函数：单跳>=2 检出/镜像-only 
Given 系统就绪
When sentinel 新增 batchTickVerdict 纯函数：单跳>=2 检出/镜像-only 判定/事件缺席降级三态，单测覆盖
Then 行为符合本条标准描述

### FR-03: flow done ledger 接线：非镜像单拍勾选 → 拒收 exit 非零并点名跳幅与非镜像任
Given 系统就绪
When flow done ledger 接线：非镜像单拍勾选
Then 拒收 exit 非零并点名跳幅与非镜像任务

### FR-04: --allow-batch-tick 放行留痕（flow-state 记 allow_batch_t
Given 系统就绪
When --allow-batch-tick 放行留痕（flow-state 记 allow_batch_tick）
Then 行为符合本条标准描述

### FR-05: 镜像-only 单拍勾选不拒（advisory 文案）
Given 系统就绪
When 镜像-only 单拍勾选不拒（advisory 文案）
Then 行为符合本条标准描述

### FR-06: 既有哨兵行为零回归（fake-check 系用例全绿），flow 系与 test:core 全绿
Given 系统就绪
When 既有哨兵行为零回归（fake-check 系用例全绿），flow 系与 test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/batch-tick-gate.test.mjs「③ A 层文案钉」+ test/flow-status-heartbeat.test.mjs「④」（定稿口径钉） -->
test/batch-tick-gate.test.mjs「③ A 层文案钉」+ test/flow-status-heartbeat.test.mjs「④」（定稿口径钉）

<!--AGENT:测试绑定FR-02 test/batch-tick-gate.test.mjs「② 硬门接线钉」「②b 镜像-only 不拒钉」 -->
test/batch-tick-gate.test.mjs「② 硬门接线钉」「②b 镜像-only 不拒钉」

<!--AGENT:测试绑定FR-03 test/batch-tick-gate.test.mjs「②」（旁路留痕/降级面源码钉）+ sentinel 系既有用例零回归 -->
test/batch-tick-gate.test.mjs「②」（旁路留痕/降级面源码钉）+ sentinel 系既有用例零回归

<!--AGENT:测试绑定FR-04 npm test 全量（run-tests.mjs）+ npm run test:core + lint -->
npm test 全量（run-tests.mjs）+ npm run test:core + lint

<!--AGENT:测试绑定FR-05 x -->

<!--AGENT:测试绑定FR-06 x -->
