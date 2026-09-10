---
author: qinyi
created_at: 2026-09-10T13:45:00+08:00
scale: large
risk_level: unit-sufficient
---

# review-dispatch：tier=independent 独立审查的平台派发命令（P2）

## 背景与问题

PI agent 等宿主无 Agent tool 且不支持 MCP，tier=independent 硬要求「独立审查子代理」时只能降级自审（2026-09-10 用户反馈①）。P1 已落地通道优先序配置（`review_dispatch.channel_priority`）与 `reviewer.channel` 审计面，其中 platform 通道标注「P2 review-dispatch 未落地暂跳过」——本变更交付该命令本体，让 platform 通道真正可用。

前置已全部就绪（本变更不再重做）：
- 平台侧（multi-agent-platform 22cdf89d1）：远端 MCP gateway 暴露、mcp-tokens 成对签发（gateway_url）、`get_daemon_status` 工具、`orchestration_mode="external"` 关 orchestrator、`agent_type` 跟随 workspace default_agent。
- sillyspec 侧（47f49c6 + 5f9bb38）：`dispatchWorker` id 兜底解析、connect 成对签发覆盖写 mcp 段（scope=read+dispatch）、`probeSillyHub` daemon 在线层（`daemon-offline` 三态 fail-open）、端点双形态兼容。活体验证：`probeDaemon=true + daemonOnline=true`。
- P1（3f22d6b）：`readReviewChannelPriority` / `classifyReviewerChannel` / 契约「审查执行通道」段。

## 目标

1. `sillyspec review-dispatch --change <名> --stage <brainstorm|plan|execute>`：CLI 直发平台独立 worker 审查，**创建即返回**（异步，D-002）。
2. `--status`：轮询在途状态 + 停滞检测（D-003：无墙钟上限、queued 不计时、疑似停滞只提示、不自动 kill）。
3. `--kill`：显式处置（kill lease 后按 channel_priority 指引降级）。
4. 回收：worker artifacts → CLI 校验（schema + docHash）→ 落既有 `stage-reviews/<stage>-<runId>/review.json`，`reviewer.channel="platform"` + missionId 落款。
5. 审查清单单源化：三 stage 审查清单从 prompt 文本抽成可编程常量，prompt 渲染与 worker_prompt 同源（事前给的 == 事后查的）。
6. Stage Review Gate：缺 review.json 但存在在途平台 mission 时，报错区分「在途」而非笼统缺件。

## 非目标（Non-Goals）

- 不改 execute 阶段的 task 派发（dispatch/ 抽象层保持「指令生成器」定位，本命令是 D-007 的**显式例外**，见「设计决策」）。
- 不做 mission 自动重试/自动 kill（处置权在人，D-003）。
- 不动平台侧协议（get_worker_result artifacts 形态消费即可；P3 的 dispatch_reviewer 专用工具另行提案）。
- 不做跨仓变更的平台派发（本变更只审主仓文档）。

## 总体架构

```
agent（任意宿主，含 PI）
  └─ sillyspec review-dispatch --change C --stage plan
       ├─ probeSillyHub 三层前置（no-config / daemon-unreachable / daemon-offline）
       │    └─ 任一不可用 → 非零退出 + 按 channel_priority 打印剩余通道指引（不猜、不重试）
       ├─ create_mission(objective=审查任务书摘要, orchestration_mode="external",
       │                 budget_usd=review_dispatch.budget_usd上限 默认 1.0)
       ├─ dispatch_worker(mission_id, objective=审查任务书, read_only=true,
       │                 worktree_path=主仓根, worker_prompt=清单+契约+期望路径+禁commit)
       └─ 落 .sillyspec/.runtime/review-dispatch-<change>.json（missionId/workerId/stage/
          createdAt/lastStateAt/lastState/terminalAt）→ 打印 missionId + --status 指引

  sillyspec review-dispatch --status --change C
       ├─ list_workers(mission_id) → 状态迁移时间戳更新 .runtime 记录
       ├─ 状态 stalled 判定：lastState != queued && now - lastStateAt > review_stall_ms
       │    └─ ⚠️ 提示三选项（继续等 / --kill / 按 channel_priority 降级），不自动处置
       └─ worker 终态：
            completed → get_worker_result → artifacts 中找 kind=review_json（或 summary
                        提取 JSON）→ CLI 校验 schema+docHash（复用 validateStageReview 机械面）
                        → 写 stage-reviews/<stage>-<runId>/review.json（runId 复用 marker 链）
                        → reviewer.channel="platform"+missionId 落款 → 打印 verdict 摘要
            failed/killed → 打印 error_code + 降级指引 → 清在途记录

  sillyspec review-dispatch --kill --change C
       └─ converge_mission 范围外（scope 无 converge，D-004 对齐）——kill 走平台
          dispatch 域的 kill 语义（如 list_workers 返回的 lease kill 路径；平台侧无
          dedicated kill tool 时：记录放弃 + 提示平台 UI 处置，fail-open 不阻塞本地降级）
```

## 生命周期契约表

本变更消费平台侧既有 mission/worker 生命周期（不新增平台侧事件），本地新增一张 .runtime 在途记录的状态机：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|------|--------|--------|----------|----------|
| dispatch 创建 | review-dispatch（CLI） | 平台 create_mission/dispatch_worker；本地 .runtime 记录 | change/stage/missionId/workerId/createdAt | 无记录 → dispatching → in-flight |
| dispatch 中断 | CLI（dispatch_worker 失败/进程崩溃） | 本地 .runtime 记录 | missionId/workerId?（worker 可能未建） | dispatching → abandoned（记录保留 error 码；--status 见 dispatching 且超 stall 窗 → 提示「派发中断：--kill 清记录重建 或 平台 UI 处置 mission」；有 workerId 则先查 list_workers 确认真终态再 abandoned） |
| 状态轮询 | review-dispatch --status（CLI） | 平台 list_workers；本地更新 lastState/lastStateAt | lastState/lastStateAt | in-flight → in-flight（时间戳刷新）；不变更则停滞计时累积 |
| 终态回收 | --status（CLI） | 平台 get_worker_result；本地 stage-reviews 落盘 | artifacts/verdict/reviewPath | in-flight → completed（写 review.json + 清在途记录） |
| 失败终态 | 平台（worker failed/killed） | --status 读到 | error_code | in-flight → failed（清在途记录 + 降级指引） |
| 显式放弃 | review-dispatch --kill（人发起） | 本地在途记录；平台 lease/UI | — | in-flight/dispatching → abandoned（清在途记录，平台侧 lease 处置指引） |
| daemon 心跳 | 平台 get_daemon_status（probe 消费） | probeSillyHub daemon 在线层 | daemon_online | 不变（既有链路，本变更只消费） |

## 模块设计

### 新文件 `src/review-dispatch.js`
纯逻辑核心（可测）：任务书组装、在途记录读写、停滞判定、artifacts 解析与 review.json 落盘、状态渲染。不直接做网络——MCP 调用经 SillyHubMcpClient 注入（与 probe.js 同款依赖注入风格）。

- `buildReviewerTaskBook({ stage, changeDir, reviewRunId, checklist })` → `{ objective, workerPrompt }`：审查清单（单源常量）+ review.json 契约（renderReviewJsonContract 复用，channelPriority 取 platform 序位说明）+ 期望落盘路径 + 禁 commit 铁律。
- `readDispatchRecord(specBase, changeName)` / `writeDispatchRecord` / `clearDispatchRecord`：.runtime/review-dispatch-<change>.json 生命周期（幂等：已有 in-flight 记录时拒绝重复创建，提示 --status/--kill）。
- `detectStall(record, nowMs, stallMs)` → `{ stalled, queuedWait, hint }`：queued 不计时；running 后 lastStateAt 超窗 → stalled。
- `extractReviewFromArtifacts(artifacts)` → review 对象或 null：优先 kind 含 review/review_json 的 artifact 解析 JSON；兜箱 summary 文本中提取首个 JSON 对象（容错平台 artifacts 形态演进）。
- `persistStageReview(...)`：校验 schema + docHash → 写 run 目录 + reviewer 落款（复用 stage-review.js 既有函数，不自造路径规则）。

### 新文件 `src/stage-review-checklist.js`
三 stage 审查清单常量（从 stages/brainstorm.js:~390 / plan.js 审查清单 / execute.js QA 清单逐条迁出，prompt 侧改为 import 渲染占位符——stages 文件的 prompt 文本以 `{REVIEW_CHECKLIST}` 类占位符替换或直接注入常量拼接，保证两消费点单源）。迁移时逐字保留条目语义（plan-postcheck 等下游可能字面引用）。

### 命令注册 `src/index.js`（+ src/run/command.js 若需 flag 解析）
`review-dispatch` 顶级命令，三个子形态由 flag 区分（缺省=创建；--status；--kill）。--files 边界不适用（本命令不改源码文件，产物在 .runtime 与 stage-reviews）。

### `src/stage-review.js` 增量
- `printStageReviewResult` 的 FAILED 分支（缺 review.json 报错处）：读在途记录存在 → 报错文案改为「平台审查在途（mission xxx，state running，最近进展 <t>）——先 --status 轮询，或 --kill 后降级」。
- 契约「审查执行通道」段 platform 描述去掉「未落地暂跳过」标注（P2 上线后指引指向本命令）。

### 配置（local.yaml）
```yaml
review_dispatch:
  channel_priority: [...]   # P1 已有
  budget_usd: 1.0            # 单次审查 mission 预算上限（默认 1.0）
  stall_ms: 900000           # 停滞判定窗（默认 15 分钟；queued 不计时）
  timeout_ms: 0              # 总时长上限（默认 0=永不；仅提示不 kill）
```

## 关键设计决策

| 决策 | 理由 | 替代方案（已否决） |
|------|------|----------|
| D-007 例外：CLI 直发（dispatcher 作执行体） | 单 worker 一次性任务，无 execute 派发的多 worker/lease 复杂度；probe 本就直连；PI 等「宿主无 Agent/MCP」的唯一解。**防泛化护栏：本例外仅限单 worker 一次性审查派发；多 worker 编排/lease 管理场景必须回 D-007 原则重议，不得援引本例外** | 纯 prompt 注入（PI 无解）；宿主 MCP 派发（宿主需支持 MCP，PI 不满足） |
| 异步创建+独立查询 | CLI 是短进程，阻塞轮询挂死宿主工具调用（D-002） | 同步等待单次命令内轮询（宿主工具超时不可控） |
| 停滞检测不自动 kill | 「有的就是比较慢」（D-003）：排队/慢模型是正常态；误 kill 在跑审查的代价 > 多等 | 墙钟超时自动 kill（误伤慢而正常的审查） |
| artifacts 回收 + CLI 侧校验落盘 | worker 只产结论不落盘（read_only + 平台文件面不承诺写本地），CLI 校验 schema+docHash 保证与既有 gate 同口径 | worker 直接写 review.json 到本地（read_only 矛盾、路径语义跨部署不稳） |
| worker_prompt 禁 commit + 禁改文件 | 审查是只读职责；改动留 artifacts 由调度方裁决（与 execute worker 铁律同源） | 允许 worker 修文档（职责越界，review 独立性受损） |
| 审查清单单源常量 | prompt 渲染与 worker_prompt 同源，事前给的 == 事后查的；防两处漂移 | 复制两份清单（必然漂移） |

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | NEW:src/review-dispatch.js | 命令核心（任务书/在途记录/停滞/回收） |
| 新增 | NEW:src/stage-review-checklist.js | 三 stage 审查清单单源常量 |
| 修改 | src/sillyhub-mcp/client.js | 新增 getWorkerResult 方法（回收链必需——get_worker_result tool 现无 CLI 封装，Grill gap①） |
| 修改 | test/sillyhub-mcp-platform-fixes.test.mjs | getWorkerResult 单测并入（task-02） |
| 修改 | src/index.js | 注册 review-dispatch 命令 |
| 修改 | src/run/command.js | flag 解析（--change/--stage/--status/--kill） |
| 修改 | src/stage-review.js | 在途区分报错 + 契约 platform 描述更新 |
| 修改 | test/review-channel-priority.test.mjs | platform「未落地暂跳过」断言随 task-05 契约更新（Wave3 子代理实证：断言在此文件非 degraded-selfreview） |
| 修改 | src/stages/brainstorm.js | 审查清单改引单源常量（文本逐字迁移） |
| 修改 | src/stages/plan.js | 审查清单改引单源常量（文本逐字迁移） |
| 修改 | src/stages/execute.js | 审查清单改引单源常量（文本逐字迁移） |
| 修改 | .sillyspec/local.yaml.example | review_dispatch 配置块补 budget_usd/stall_ms/timeout_ms |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 新文件模块登记（stage-review-checklist→core-engine / review-dispatch→dispatch / scope-audit→runtime baseline 债） |
| 修改 | docs/sillyspec/architecture-4a.md | 行号重锚（引用 src 行号随本变更移动，docs check --fix 机械重算） |
| 修改 | docs/sillyspec/multi-agent-review-2026-08-08.md | 行号重锚（同上） |
| 修改 | docs/sillyspec/prompt-control-debt.md | 行号重锚（同上） |
| 修改 | docs/sillyspec/review-2026-08-08.md | 行号重锚（同上） |
| 修改 | docs/sillyspec/review-2026-08-09.md | 行号重锚（同上） |
| 修改 | docs/sillyspec/self-audit-2026-08-16.md | 行号重锚（同上） |
| 修改 | docs/sillyspec/sillyhub-path-a-contract.md | 行号重锚（同上） |
| 修改 | .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md | 行号重锚（同上） |
| 新增 | NEW:test/review-dispatch.test.mjs | 命令核心单测（任务书/停滞/回收/幂等/中断分支） |
| 新增 | NEW:test/stage-review-checklist.test.mjs | 单源常量与 prompt 渲染一致性 |

## 风险登记（Risk）

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 平台 artifacts 形态演进（kind 命名变化） | 中 | 回收失败 | extractReviewFromArtifacts 双通道（kind 匹配 + summary JSON 提取）；失败不丢 missionId，人工 get_worker_result 兜底 |
| worker 结论质量不可控（平台模型档位） | 中 | 审查走过场 | reviewer.model 落款供人工判断；verdict=fail/低置信时 gate 照常裁决；不因通道放水 |
| 审查清单迁移改动 stages 文本致 prompt 漂移 | 低 | 下游字面断言裂 | 逐字迁移 + 一致性测试钉死（checklist 测试比对常量与渲染产物） |
| 双 CLI 进程并发操作同一在途记录 | 低 | 记录互踩 | .runtime 记录写采用 O_EXCL 创建 + 整文件原子替换（withFileLock 风格，复用 quicklog 锁原语） |
| daemon 中途失联（在途 mission 无法查询） | 中 | --status 不可用 | 报 daemon-unreachable 指引（等待恢复重试 --status；记录仍在，不丢） |

## 自审（Self-Review）

- 契约同源：任务书内嵌的 review.json 契约与 gate 校验同源（renderReviewJsonContract），无第二套 schema。
- 状态机最小：在途记录只有 dispatching/in-flight/completed/failed/abandoned 五态，全部迁移点在生命周期表列明。
- 失败全链路有出口：probe 三层、创建失败、轮询异常、回收失败、artifacts 不可解析——每个失败点都落到「非零退出 + 下一步指引」，无悬空态。
- 不破坏既有：quick/execute 派发路径零改动；stages 文本迁移逐字 + 测试钉死；gate 报错只在「存在在途记录」分支变化。
- 平台侧零依赖新增：全部用已实测在野工具（create_mission/dispatch_worker/list_workers/get_worker_result/get_daemon_status）。
