---
author: flow-machine-draft
created_at: 2026-09-29T08:03:28.046Z
---
# 需求规格（Requirements）— 2026-09-29-batch-tick-gate

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: A 层协议形状——spec 期任务面定稿 + openspec 式执行循环指令
- 场景：三处文案 — Given flow start 简报（fresh/adopt 两路）、tasks.md 头部纪律行；When 本变更交付后；Then 含「spec 阶段先定稿任务面（覆写为真实实现步骤全 - [ ]）」与「Working on task N/M → 做 → 勾一格 → 下一个」循环口径
### FR-02: 单拍勾选门决策纯函数（resolveBatchTickAction 四态）
- 场景：四态与豁免优先序 — Given watcher 检出单拍跳（checked N→M 跳>=2）；When resolveBatchTickAction 裁决；Then 镜像-only→silent、--allow-batch-tick→bypass、哨兵面未知或机器代勾（autopilot 单拍机械写）→advisory、agent 一把勾→reject，优先序镜像>旗标>未知>代勾>拒收
### FR-03: flow done ledger 接线——拒收/旁路留痕/降级
- 场景：拒收 — Given 非镜像单拍勾选且未旁路；When flow done；Then 拒收 exit 非零 + 遥测 sentinel:batch-tick + 出口文案（--allow-batch-tick 留痕 / doctor 核对）；旁路写 flow-state allow_batch_tick；镜像-only 零输出
### FR-04: 测试与零回归
- 场景：全绿 — Given 新增 batch-tick-gate 测试（决策函数行为级四态 + 接线钉 + autopilot 交互钉）与 heartbeat ④ 适配；When 跑全量；Then npm test 全绿 + test:core fail 0 + lint 绿，fake-check 系零回归

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/batch-tick-gate.test.mjs「③ A 层文案钉」+ test/flow-status-heartbeat.test.mjs「④」 -->
test/batch-tick-gate.test.mjs「③ A 层文案钉」+ test/flow-status-heartbeat.test.mjs「④」
test/batch-tick-gate.test.mjs「③ A 层文案钉」+ test/flow-status-heartbeat.test.mjs「④」（定稿口径钉）

<!--AGENT:测试绑定FR-02 test/batch-tick-gate.test.mjs「②b 决策纯函数行为级」 -->
test/batch-tick-gate.test.mjs「②b 决策纯函数行为级」
test/batch-tick-gate.test.mjs「② 硬门接线钉」「②b 镜像-only 不拒钉」

<!--AGENT:测试绑定FR-03 test/batch-tick-gate.test.mjs「② 硬门接线钉」「②c autopilot 交互钉」 -->
test/batch-tick-gate.test.mjs「② 硬门接线钉」「②c autopilot 交互钉」
test/batch-tick-gate.test.mjs「②」（旁路留痕/降级面源码钉）+ sentinel 系既有用例零回归

<!--AGENT:测试绑定FR-04 npm test 全量 + npm run test:core + lint -->
npm test 全量 + npm run test:core + lint
npm test 全量（run-tests.mjs）+ npm run test:core + lint

