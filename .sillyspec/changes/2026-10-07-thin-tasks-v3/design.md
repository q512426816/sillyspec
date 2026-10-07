---
author: flow-machine-draft
created_at: 2026-10-07T06:49:15.464Z
---
# 设计记录（Design Record）— 2026-10-07-thin-tasks-v3

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四个触点联动：① flow-draft.js 起草模板去 `>` 指导块（draftTasksV2/draftRequirementsV2/draftDesignRecordV2/draftTasks v1 backfill），任务面从「镜像锚」改「工作分解种子」（行内容仍是成功标准转写——多数成功标准本就是祈使工作语句，agent 可自由改写增删，无锚约束）；② sentinel-assertions.js 删 mirroredTaskIds/isMirrorUntouchedFace 消费与 detectFakeCheckCompletion 的 baselineTasksMd 参数，flow.js/quick-audit.js 两道收口删镜像豁免与 mirror_autotick 代勾块；③ task-tick.js 翻格成功后向 watcher-events jsonl 直写精确事件（source:'task-tick'），detectBatchCheckCadence 按「落点计数 M」去重采样事件——CLI 逐格勾成为节奏门的权威口径；④ flow.js 横幅（thin/adopt 两处）与 verifyThinDocsV2、命令卡改为工作分解契约文案。选该方案因为它同时拆掉实测发现的四个结构性根因（验收镜像形态、文件内指令矛盾、懒路径代勾兜底、采样合并误伤），且不动 watcher 进程与事件文件格式（追加字段向后兼容）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- detectFakeCheckCompletion({changeDir, tasksMd, commits, opts})：删 baselineTasksMd 入参与 mirrored 出参字段（mirrored 恒不再返回）。
- resolveBatchTickAction({batchTick, nonMirrorCount, allowBatchTick, autopilotTicked})：签名不变；nonMirrorCount 传 claimTotal（镜像面恒 0），mirror-only 分支自然死亡（保留函数分支本体以兼容非 0 传参，无行为面）。
- detectBatchCheckCadence(events)：入参不变，新增 source:'task-tick' 事件识别与采样等值去重。
- runTaskTick({changeName, cwd, taskId, specBase})：签名不变；新增 best-effort 事件直写副作用。
- draftTasksV2/draftTasks/draftRequirementsV2/draftDesignRecordV2：内部模板变更，签名不变。
- 命令面（CLI 用户可见）：flow start 横幅文案、flow done 输出（代勾/镜像豁免行消失）、tasks.md 起草件形态。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

事件流按行追加、检测端按 ts 排序后判最大跳——CLI 直写事件与 watcher 采样事件乱序到达不影响去重（去重按落点 M 值，不按到达序）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

task tick 追加与 watcher 子进程 appendFileSync 同打一个 jsonl：沿用 readWatcherEvents 既有坏行容忍（交错半行按坏行跳过计数）。极端竞态丢一条 CLI 事件的后果=节奏门退回采样判（现状语义），fail 方向安全。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

事件直写在翻格写盘之后（先勾后记账）：中断在两步之间=勾已生效、事件缺失——同上退回采样判，无假绿面。flow-state 的 autopilot_ticked/mirror_autotick 键：本变更删 mirror_autotick 写入；存量在途变更带该键时代码不再消费（读侧删除），不迁移不回写。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

事件写入按 change 定位 jsonl（runtimeRoot/watcher-events-<change>.jsonl 同锚）；runtimeRoot 解析与 flow.js 同源（resolveRuntimeRoot）。多会话并行各自 change 隔离，无串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：移除镜像豁免后，存量在途变更（tasks.md=镜像面、agent 已一把勾、区间提交无 token）在升级后收口会从放行变拒收——属预期收紧（假完成主张本就该拦），出口是补 token 提交或 --allow-batch-tick。次风险：agentic 行为对文案变化的适应性——横幅契约若仍埋在长输出里，逐格勾依旧靠自愿；本变更不动 D-007（中间零必需交互），接受该边界（节奏门+哨兵统一判据已把「一把勾」的账算清）。试过放弃：watcher 轮询间隔调小/开 fs.watch——治标（合并概率下降不归零）且 watcher 进程面改动大；放弃。另试过：tasks.md 由 agent 在 spec 断点必写（机器不再预填）——违反「工件回填轮=0」哲学且断点无机器门可验「写没写」，放弃，保留机器种子+自由改写。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-draft.js | 四个起草函数去 `>` 指导块；verifyThinDocsV2 去 tasks 镜像 advisory、零任务行文案改工作队列 |
| 修改 | src/sentinel-assertions.js | 删 mirroredTaskIds/isMirrorUntouchedFace；detectFakeCheckCompletion 去 baseline 参数；detectBatchCheckCadence 加 CLI 事件去重；resolveBatchTickAction 删镜像-only 分支 |
| 修改 | src/flow.js | 横幅两处契约文案；done 侧删镜像豁免/收口代勾块，nonMirror 口径改 claimTotal |
| 修改 | src/run/quick-audit.js | quick 哨兵删 baseline 读取与镜像豁免渲染 |
| 修改 | src/route-hindsight.js | 删 readBaselineTasks/readBaselineTasksVerified（哨兵侧零消费；基线快照本体保留供改写比指标） |
| 修改 | src/task-tick.js | 翻格后直写精确 task-done 事件（source 标记，best-effort） |
| 修改 | assets/command-cards/flow.md | 步骤②工作分解契约同步 |
| 删除 | test/sentinel-mirror-waiver.test.mjs | 镜像豁免契约退役（改名重建为 unified-evidence） |
| 新增 | test/sentinel-unified-evidence.test.mjs | 统一证据判据测试（原镜像豁免断言反转为拒收） |
| 修改 | test/sentinel-wiring.test.mjs | A2 形态断言反转：种子行全勾零证据→拒收 |
| 修改 | test/batch-tick-gate.test.mjs | mirror-only 分支移除断言 + 文案钉刷新 + 横幅承接面钉 |
| 修改 | test/flow-draft.test.mjs | 零 `>` 指导行断言替换镜像行/防呆断言 |
| 修改 | test/thin-docs-v2.test.mjs | tasks 零 advisory（工作分解自由度）断言 |
| 修改 | test/task-tick.test.mjs | 删 isMirror 断言；加事件直写/去重/不代勾三组 |
| 修改 | test/tick-loop-nudge.test.mjs | 纪律钉迁至横幅（文件内零指令） |
| 修改 | test/input-teach-copyable.test.mjs | 锚教学钉迁至横幅 |
| 修改 | test/flow-status-heartbeat.test.mjs | spec 定稿口径钉迁至横幅 |
| 修改 | test/thin-workunits.test.mjs | 覆写语义措辞钉更新 |
