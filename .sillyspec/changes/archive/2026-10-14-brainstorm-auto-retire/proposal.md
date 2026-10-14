---
author: flow-machine-draft
created_at: 2026-10-14T03:08:20.158Z
---
# 提案书（Proposal）— 2026-10-14-brainstorm-auto-retire

## 动机

任务原话转写：用户裁决：删除 brainstorm-auto 自动道。排查实证：自动道 Step2 设计产物骨架自审为自由格式（不含原型分级核对项），全流程无原型生成面与真码口径——fb51d988「规则存在但 agent 未见过」的事故模式在自动道原生存在；交互道已有完整分级/真码/登记复用链。删除范围：src/stages/brainstorm-auto.js、run auto 的 brainstorm 特化（getAutoSteps/ensureAutoStage 分支——回退通用路径用主模式 8 步表）、complete.js getStageStepsAutoAware 的 auto 表感知；存量 4 步 auto 表变更给明确退役报错+指引（不静默重种丢进度）；测试与 docs/prompt 引用面清理。

成功标准：
- src/stages/brainstorm-auto.js 删除；run auto 在 brainstorm 阶段种/推进主模式 8 步表（通用 ensureStageSteps 路径）
- 存量 4 步 auto 表（首名「进度确认与上下文加载」）变更：run brainstorm/run auto 触达时明确报错退役指引（--reopen --from-step 1 或 doctor），不静默重种清零进度
- 测试清理：删 brainstorm-auto-skeleton/brainstorm-auto-step2-conditional-wait/auto-dualtrack-brainstorm 三个测试文件；decisions-header-backfill 与 proto-reuse-register 中的 auto 引用摘除后全绿
- docs/prompt 同步：删 brainstorm-auto.md，_extract.mjs 变体块/README 表行与注记/_TEMPLATE 静态清单/_build-site 注册摘除，_extracted.json 与 index.html 再生成
- 新增退役拒绝与 auto 回退主模式表的测试；npm test 全绿、lint 绿、docs gate 过

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. src/stages/brainstorm-auto.js 删除；run auto 在 brainstorm 阶段种/推进主模式 8 步表（通用 ensureStageSteps 路径）
2. 存量 4 步 auto 表（首名「进度确认与上下文加载」）变更：run brainstorm/run auto 触达时明确报错退役指引（--reopen --from-step 1 或 doctor），不静默重种清零进度
3. 测试清理：删 brainstorm-auto-skeleton/brainstorm-auto-step2-conditional-wait/auto-dualtrack-brainstorm 三个测试文件；decisions-header-backfill 与 proto-reuse-register 中的 auto 引用摘除后全绿
4. docs/prompt 同步：删 brainstorm-auto.md，_extract.mjs 变体块/README 表行与注记/_TEMPLATE 静态清单/_build-site 注册摘除，_extracted.json 与 index.html 再生成
5. 新增退役拒绝与 auto 回退主模式表的测试；npm test 全绿、lint 绿、docs gate 过

## 成功标准（可验证）

1. src/stages/brainstorm-auto.js 删除；run auto 在 brainstorm 阶段种/推进主模式 8 步表（通用 ensureStageSteps 路径）
2. 存量 4 步 auto 表（首名「进度确认与上下文加载」）变更：run brainstorm/run auto 触达时明确报错退役指引（--reopen --from-step 1 或 doctor），不静默重种清零进度
3. 测试清理：删 brainstorm-auto-skeleton/brainstorm-auto-step2-conditional-wait/auto-dualtrack-brainstorm 三个测试文件；decisions-header-backfill 与 proto-reuse-register 中的 auto 引用摘除后全绿
4. docs/prompt 同步：删 brainstorm-auto.md，_extract.mjs 变体块/README 表行与注记/_TEMPLATE 静态清单/_build-site 注册摘除，_extracted.json 与 index.html 再生成
5. 新增退役拒绝与 auto 回退主模式表的测试；npm test 全绿、lint 绿、docs gate 过
