---
author: flow-machine-draft
created_at: 2026-10-07T06:49:15.464Z
---
# 需求规格（Requirements）— 2026-10-07-thin-tasks-v3

## 功能需求

### FR-01: 工件文件零指令行

必须：`flow start` 机器起草与幂等补起草（v2 轨）生成的 tasks.md、requirements.md、design.md 正文不得包含任何 `>` 引用指导块；书写规则（task-NN 行形态、FR 强度词、design 四问作答、文件变更清单节名）必须由 flow start 横幅输出与命令卡承载。`- [ ] task-NN:` 任务行形态与 front-matter 保留。v1 指纹轨 backfill 稿（draftTasks）同判去 `>` 指导块。

#### 场景：新变革起草

Given flow start --input 含 4 条成功标准
When 机器起草落盘
Then tasks.md 无任何 `>` 开头行；requirements.md/design.md 无文件级 `>` 指导块（FR 占位「（待撰写…）」槽保留——那是待填槽非指导）

### FR-02: 哨兵统一证据判据（镜像豁免与收口代勾移除）

必须：detectFakeCheckCompletion 移除 baselineTasksMd 参数与镜像豁免——已勾任务一律按提交 token（task-NN）或 review.json 判证据；flow done 与 quick 侧哨兵同判。flow done 移除 mirror_autotick 收口代勾：tasks.md 有任务但零勾选时仅输出警告（不代勾、不阻断）。governance-autopilot 按提交 token 的代勾保留（证据对齐）。

#### 场景：全勾但镜像行零 token

Given tasks.md 四行全部勾选、区间提交无任何 task-NN token、无 review.json
When flow done 哨兵判定
Then status=fake 拒收（不再因「与机器稿逐字相同」豁免）

### FR-03: task tick 精确事件与节奏门去重

必须：`sillyspec task tick` 翻格成功时向本变更 watcher 事件流（watcher-events-<change>.jsonl）追加一条精确 task-done 事件（detail `checked N→M`，含 source:'task-tick' 标记，best-effort 不阻断翻格）；detectBatchCheckCadence 必须 ignores 采样事件中被 CLI 精确事件覆盖的等值跳（按落点计数 M 去重），使 CLI 快速连续 tick 不再被判单拍多格。

#### 场景：一条命令内连续两 tick

Given tasks.md 4 格未勾，agent 在 1 秒内连续执行 task tick task-01、task tick task-02（watcher 3s 轮询只能采到 0→2 合并事件）
When flow done 节奏门读取事件流
Then CLI 两条 0→1、1→2 事件在场，采样 0→2 被去重，无单拍跳 ≥2 判定，不拒收

### FR-04: 协议提示面更新为工作分解契约

必须：flow start 横幅（thin 与 adopted-brainstorm 两处）任务面文案改为工作分解契约（去镜像/锚话术，明示：tasks.md 是 agent 的工作队列、可增删改、逐格勾、CLI 以 checkbox 为进度状态机）；verifyThinDocsV2 移除「成功标准未在 tasks.md 见到镜像行」advisory（FR 标题锚 advisory 保留）；tasks 零任务行的拒收文案改为工作队列非空要求；命令卡 assets/command-cards/flow.md 步骤②同步新契约。

#### 场景：收口漂移判定

Given agent 将 tasks.md 全部改写为实现步骤（成功标准原文不在 tasks.md 出现）
When flow done artifacts 校验
Then 无 tasks 相关 advisory（requirements FR 标题锚在场即不漂移）

### FR-05: 测试面同步新契约

必须：受影响测试（sentinel-mirror-waiver、batch-tick-gate、flow-draft、thin-docs-v2、task-tick、sentinel-rules/wiring 中镜像断言）更新为新契约预期并全绿；新增覆盖：draftTasksV2/draftTasks 零 `>` 行、tick 事件落盘与去重、无代勾路径警告。npm run test:core 全绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`）

FR-01: test/flow-draft.test.mjs「① draftAll v2 形态——零 > 指导块断言」
FR-02: test/sentinel-mirror-waiver.test.mjs「镜像零证据全勾→fake（豁免移除）」
FR-03: test/task-tick.test.mjs「tick 事件直写+节奏门去重」
FR-04: test/thin-docs-v2.test.mjs「tasks 零镜像 advisory/工作队列非空门」
FR-05: test/run-tests.mjs（test:core 全量绿）
