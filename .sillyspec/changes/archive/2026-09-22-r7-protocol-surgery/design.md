---
author: zcode-r7-surgery
created_at: 2026-09-22 10:30:00
scale: large
---

# 设计文档（Design）— 2026-09-22-r7-protocol-surgery

## 背景

R5-L 法证终账（round5/r5l-forensic-verdict.md）：多烧的 82.3M 输入 token 中 94%（77.7M）
是流程自转三桶——CLI 状态机往返 +29.1M（106 次调用）/ spec 工件维护闭环 +28.9M
（verify-result 读写 14 次）/ 门禁强制重跑 +19.7M。第 3 批四件（task-done 四合一、verify 填槽、
RERUN 闸、快照缓存链接）已落地但按 §十数学定死打不穿 20M 门。本变更=协议手术
（flip-3.31.0-proposal.md 刀2+刀3+底座+路由职能）：把流程从「agent 当步进机」改为
「agent 干活、CLI 记账」。

## 设计目标

1. **协议必需交互 = 2**（机械 harness 可验，非 agent 配额）——启动 1 次 + `--done` 裁决 1 次。
2. **工件回填轮 = 0**——薄跑道治理文件全部 CLI 机器起草，agent 仅例外裁决（AGENT 槽）。
3. **观测事件与协议交互解耦**——watcher 事件来自文件/git/工件三类源，恒带 `provisional:true`。
4. **编辑距离=决策覆盖度机械代理**——改写过半提示升厚；失败自动升厚，不靠 agent 主动。

## 非目标（红线，全程不动）

- fail-closed 判定语义（verify-postcheck / P2 测试门语义）。
- P2 test-ledger 口径、allowed_paths 守卫、多会话所有权/worktree 隔离、DB schema。
- **第 3 批四件已落地（用户裁定#5 精确口径，仓内现物核过）**——复用勿重做：复用
  `task-done` 幂等原子（src/task-done.js）、`verify-draft` 三件套（抽 machine-draft 泛化）、
  RERUN 闸（verify-quality-scan.js）、`runQuickTestLintGate`+P2 ledger、仓内钉定缓存链接
  （PINNED_CACHE_ENV_VARS）；非目标：不重做四件；家目录 uv 缓存不在本变更范围（既有设计
  裁定：经继承 env 绝对路径直达，刻意不 junction）。本变更只做消费方接线。
- legacy 完整流程的既有步数与门禁（thin 与 legacy 并存，开关回滚一行 yaml）。
- **MCP 面**：mcp-server.js（stdio MCP，sillyspec_next/gate/derive/progress 四只读工具）
  只读边界不动——flow start/done 是状态推进命令，不进 MCP（Phase 3 另计）；watcher/flow
  不改 sillyhub-mcp 客户端（dispatch 探测语义不涉）。
- **agent 会话日志链路**：agent-session-log.js 的探测/锚定/上报（POST /api/agent-logs）
  语义不动——watcher 事件推送只复用其实现模式（专用端点+best-effort），不并入该通道。

## 总体方案（四切片，按序四 Wave，每片独立可落地可验收）

### 切片一 · watcher（观测先立，不碰协议）

**新文件 `src/watcher.js`**（sync 模块 paths 录入——平台推送旁路语义同属 sync 域）。

- **拉起**：`runCommand` 在 `effectiveChange` 解析后（`src/run/command.js:1344` 附近）**无条件**
  `spawnWatcher`，靠单飞锁合并（活锁在跑→coalesced 直接返回）——不做「检测 change 新建」
  （registerChange 是 INSERT OR IGNORE 且不建目录不返回新建信号，`src/progress/change-registry.js:185`，
  检测面不存在；无条件+合并更鲁棒）。spawn detached 子进程（结构循 `src/run/bg-sync.js` 骨架：
  单飞锁 + pid 活性 + 日志截尾追加）。与 bg-sync 的两处语义差异：①长驻——加**心跳租约**
  （锁文件 `.runtime/watcher.lock` 增 `heartbeatAt` 字段，子进程每 30s 刷新；5min 无心跳或 pid 死
  →租约失效，下次 CLI 调用重 spawn；bg-sync 只有 startedAt+LOCK_STALE_MS，心跳是新增机制）；
  ②**未连接平台也 spawn**（本地 jsonl 照写是主目标；bg-sync 的 not-connected 短路不适用于此）。
- **观测机制=轮询快照 diff**（3s 间隔）：对 `.sillyspec/changes/<change>/` 子树与 git HEAD
  做 mtime+内容 hash 快照，diff 出事件。**不用 fs.watch**（Windows/网络盘跨平台可靠性 +
  递归监听噪声；事件数与 CLI 调用数解耦是验收钉，轮询天然满足）。轮询面收窄：
  change 子树（proposal/requirements/design/tasks/任务卡 checkbox）+ `git log -1` 头指针 +
  `.runtime` 质量扫描记录——**不扫全仓**。
- **阶段推断（产物签名）**：proposal.md 出现→`proposal` 事件；requirements.md→`requirements`；
  design.md→`design`；tasks.md→`tasks`；任务卡 `- [ ]`→`- [x]` 翻格计数→`task-done` 事件；
  git 新提交→`commit`；verify-result.md / 质量扫描记录→`verify`；change 目录移入 archive/→
  `archived`（终态，watcher 自退）。
- **事件落盘与推送**：追加 `.runtime/watcher-events-<change>.jsonl`（一行一事件：
  ts/kind/stage/detail/**provisional:true**）——**本地 jsonl 是事件唯一真相源**。平台推送走
  **专用事件端点** `POST {platform.url}/api/changes/{name}/events`（watcher 进程经 SyncManager
  的 HTTP 客户端能力直接发；探测式 best-effort——平台未升级该端点时 fail-soft 静默降级为
  本地-only，不炸不重试）。**不走 progress/documents 端点搭车**：那边有 base_ts 乐观锁 +
  409 单写者纪律（`src/sync.js:591`，回填写本机共享 DB 的 CLI 进程纪律），watcher 独立进程
  直推会互撞 409 落冲突文件，且 thin 下 CLI 仅 2 调用会让事件塌缩成 2 个点——直接违反
  「事件数与 CLI 调用数解耦」验收钉。平台侧端点升级是**声明的跨系统依赖**（平台仓另立项），
  本地 jsonl 不依赖它即可满足片一验收。**实现模板=agent-session-log.js 的上报先例**
  （`src/agent-session-log.js`：POST /api/agent-logs 专用端点同风格——readPushConfig 取凭据
  /PUSH_TIMEOUT_MS 5s/best-effort 只 warn 不阻断/env SILLYSPEC_AGENT_LOG_PUSH=0 式开关；
  专用端点不碰 progress base_ts 单写者纪律，本仓已有此模式，跨系统依赖有同仓先例可循）。
  **本地事件流形态循 knowledge-hits.jsonl 先例**（FR-core-engine-003 四类观察指标事件流：
  append-only jsonl + verify 读回对账）。平台 ingest 只展示不判定——`--done`（或 flow done）
  是唯一真相；watcher 是 best-effort 缓存，崩溃/不 spawn 零影响主流程。
- **副产品墙钟拆账**：产物 mtime 序列聚合为阶段耗时
  `.runtime/watcher-stage-timing-<change>.json`（替代 transcript 抽取）。
- **生命周期**：change 归档即自退；空闲超时（默认 6h 无事件）自退；`SILLYSPEC_WATCHER=0`
  逃生阀（测试与自救）。

### 切片二 · 2-调用协议（`flow: thin | legacy`）

**协议记账单位裁定（D-007，GSD Phase 对齐）**：flow start/done 的协议厚度=一次 change ≈ 一次 GSD Phase——协议记账单位与任务卡数量解耦；tasks/任务卡（--with-tasks 时）只是干活单位非协议检查点（task done 自愿用不计必需交互）。判据：落地后若仍是「N 张卡换名叫 flow」=只学皮，协议必需交互=2 钉死。

**新命令族 `sillyspec flow`**（`src/flow.js` + `src/flow/` 按体量拆分；cli-entry 录入）。

- **第 1 调用 `sillyspec flow start --change <名> --input "<任务原话>"`**：
  1. 建 change（**用 `initChange`**——`src/progress.js:1101`：建目录 + current_stage + 全 stages
    行；勿用 registerChange：它 INSERT OR IGNORE 不建目录，行 active+无目录会被 `_isGhostChange`
    误判鬼影（`src/progress/stage-machine.js:19`）被 doctor 清掉）。flow start 是新命令自带
    名字生成/`--change` 显式传入，不经过 `run brainstorm` 的多活跃无 `--change` 拒绝门
    （`src/run/command.js:1271`，该门只拦「不带 --change」的 run brainstorm），**多活跃限制对
    flow start 不构成障碍**——设计意图即多 change 并存；
  2. 机器起草全件治理工件（切片三：proposal/requirements/tasks/decisions，直写模式零任务卡）；
  3. 输出**薄流程说明 + 全部材料路径清单**（稳定前缀路径列表=缓存最优；说明=干活→`flow done`，
    中间零协议必需交互，自愿 status/verify 合法不计入）。
  对**已存在 change**（恢复场景）：读盘面状态（checkbox 勾选/git 提交/P2 账本/dirty files），
  生成**恢复简报**（做到哪、剩什么、下一步 flow done）。
- **显式档入口（用户裁定#1，硬入口非启发式）**：`flow start --thick`（厚档：生成任务卡+
  完整仪式收尾——起始即厚，不经薄跑试错）与 `flow start --with-tasks`（薄协议+任务卡：
  中间自愿用 task done，收尾仍 flow done）。**人/输入侧声明，不做输入覆盖度自动判档**
  （决策密度轴启发式=⑤ 的尸体，不复活）。高决策任务赔付链=失败升厚+混跑回 legacy+
  start 显式 --thick 三道。
- **第 2 调用 `sillyspec flow done --change <名>`**（唯一裁决点）：
  1. 工件完整性校验（机器稿指纹验收——切片三守卫）；
  2. 测试结果读 **P2 test-ledger**（fail-closed 指纹免重跑，verify-postcheck 同源；
     账本无记录→亲自实测，语义与 quick --done 实测门同款——**判定语义零改动**）；
  3. verify-probes 机器跑（复用第 3 批 --draft 产物）；
  4. distill / 归档机器做（**机械/裁决边界重划**，grill 核后）：机械可复用面 =
     `buildArchiveReadinessReport`（`src/run/gates.js:2393`，纯读）+
     `auditModuleImpactAgainstDiff`（`src/archive-delta.js:470`，机械半边）+
     `distillIntoKnowledge`（`src/decision-distill.js:492`）+
     `unregisterChange({archiveStepNames})` 终态一致化（`src/progress/change-registry.js:597`，
     quick 轻量归档先例 `src/run/complete-handlers.js:1907`）。**非机械面**：module-impact.md
     与模块文档同步是 agent 语义工作（archive.js 步骤名非函数）——薄跑直写模式**跳过**
     （直写模式=范围明确的局部修补，无模块文档维护面）；升厚档（tier:thick）时该子步移交
     legacy archive 走完整仪式。distill 的 rejected/needsWait 三态 → 处置=升厚档留人工裁决
     （不静默吞）。归档执行链（apply 检查→plan.md 硬校验→目录搬移→窄化 git add）现内联于
     `src/run/complete-handlers.js:640-722` 未导出——**抽链重构**为可导入函数，flow change
     跳过 plan.md 硬校验（薄工件面无 plan.md；flow-state.yaml 存在=薄工件面判据）。
  **幂等原子性循 task-done 先例**：子步各带完成标记（幂等跳过：指纹一致/标记不在/无变更自然
  skip）；中段失败精确报告已完成子步；重入断点续。
  **失败/超时/假绿三句钉死（用户裁定#2）**：①**亲自实测失败=整单 FAIL，exit≠0**
  （与 quick --done / verify 门同款 fail-closed；测挂不继续 distill/归档）；②**实测超时=失败**
  （同 quick 门，无「部分成功当绿」；六子步中只有测试实测可能长墙钟，余者秒级~分钟级）；
  ③**半态可重入但不可假绿**——归档子步未完成前 change 仍 active，禁止当成功；flow done
  重入从断点续，不新开 change。
- **第 2 调用测试门的文件清单来源**（grill 补）：复用 `runQuickTestLintGate`
  （`src/run/quick-audit.js:410`，consultTestLedger→真跑→fail 阻断，与 quick --done 实测门
  同源同语义），changedFiles 来源=**git diff 对 flow start 时记录的基线提交**（flow-state 存
  baseline_commit）；实测后 `recordTestLedger` 落账（否则后续 verify --done 因 RERUN 闸指纹
  不等仍要重跑）。
- **配置开关**：`local.yaml` `flow: thin | legacy`，**缺省 thin**；legacy=现行为逐字不动，
  回滚一行 yaml。既有 `run <stage>` 全族在 thin 下不受限（自愿调用合法）。**混跑规则**：
  thin change 上跑 `run <stage>` = 该 change 回 legacy 记账（flow-state 落
  `legacy_fallback:true`，后续 flow done 按厚档走）——两套记账不叠加。
- **状态落文件不落 DB**（红线：DB schema 不动）：`.sillyspec/changes/<名>/flow-state.yaml`
  （tier: thin|thick、子步完成标记、升级原因与来源）。

### 切片三 · 全件机器起草（agent 只裁例外）

**抽泛化 `src/machine-draft.js`**（core-engine 录入）：verify-draft.js 的三件套提为通用原语——
`wrapSection(key, body)`（MACHINE-DRAFT sha256 标记对）、`verifyMarkers(md, sidecar)`（三态：
标记缺失/哈希失配/手工重锚未审计→violation）、`amendDraft(...)`（留痕重锚）。verify-draft.js
改为消费方（**零行为回归**：既有 verify 族测试不动）。

**起草器**（flow start 内建，不单独命令）：
- proposal：`--input` 机械转写（模板+任务原话引用+动机/范围从原话摘段）；
- requirements：机械摘「成功标准」条目（input 中列表行/「成功标准」节下条目→FR 条目）；
- tasks：机械推导（成功标准→checkbox 任务行）；**任务卡分岔（用户裁定#3）**：默认
  thin+直写=**零任务卡**（薄跑=quick 的协议兄弟——对标 quick 量级：干完 flow done，
  测试门+指纹守卫收口）；`flow start --thick` 或 `--with-tasks` =**生成任务卡**
  （tasks/task-NN.md，中间自愿 task done，收尾仍 flow done）。**禁止大任务默认零卡自称
  thin 全流程**（空壳治理）——大活要治理粒度走 --thick/--with-tasks，不是把零卡硬撑成
  全流程替代；
- decisions：只记真实新增（转写任务默认零条；flow start 落 --answer 里的真实取舍）。
- 每件落 sidecar 台账（`.runtime/draft-ledger-<change>.json`）。**ledger schema 对
  verify-draft sidecar 有一处关键扩展**（切片四依赖）：每机器段除 `hash` 外**存首版原文
  `body`**（首版快照，永不覆盖——amend 重锚只刷 hash 不动 body）。命名空间按
  `文件名:段键` 分隔（verify-result 单文件单 md 的 sidecar 结构不适用于四件套）。
  AMEND_CMD 标记文案按消费方参数化（verify-draft 里硬编码 `verify-probes --amend-draft`，
  flow 稿的标记必须指向 `flow amend-draft`，否则把 agent 引向错误命令）。

**守卫全在验收侧**（flow done / verify 门，零 prompt 劝说）：机器段被整份重写三态拒收
（标记删除/内容哈希失配/手工重锚未审计→阻断+回滚指引）；AGENT 槽（`<!--AGENT:-->` 标记对）
是合法书写面不受限；`flow amend-draft`（同 --amend-draft 语义）是唯一留痕修改通道。

### 切片四 · 编辑距离路由信号

- **守卫与度量的汇合点=amend 通道**（grill 修正：三态拒收与改写比例原设计互斥——被拒收的
  改写到不了 editRatio 计算，合法路径下恒 0）。定案方案：机器段直接改写仍被验收侧拒收
  （守卫不动）；agent 要改机器段只有 `flow amend-draft` 留痕通道——**editRatio 在 amend 时
  计算**：`ledger 首版原文 vs amend 后当前内容` 的行级 diff 比例（首版 body 永存，基准不丢）。
  AGENT 槽自由书写不计入（那是合法书写面）。
- **计算**：`editRatio = 改写行数 / 机器段总行数`（LCS 行 diff，纯函数）。
- **路由**：`editRatio > 0.5`（可配 `flow.edit_ratio_threshold`，缺省 0.5）→ **测绿可薄档
  过（用户裁定#4：advisory 不强制）**——自动升厚会把「填对了需求表述」也罚成全流程，误伤大；
  本变更买的是协议变瘦不是「改了稿就审一遍」；真危险的「测挂装过」已由失败升厚管住，
  「无 amend 静默改写」已由守卫堵住。但提示升级为**可观测硬信号**：flow done 输出醒目打印
  `route_hint: thick`+editRatio 数值；遥测四列记一笔；`flow.edit_ratio_enforcement:
  advisory|block`（缺省 advisory，dogfood 先 advisory，可按遥测数据翻 block）。AGENT 槽
  书写不计入（合法书写面）。
- **失败触发升级**：flow done 的 verify 失败 / 审查否决 / distill rejected|needsWait →
  flow-state `tier: thick` + `upgrade_reason`，剩余流程（复验/复审/归档仪式）按厚档走；
  **不依赖 agent 主动 --full**（护栏#4）。flow-state 是判定输入之一，verify 内部读取。

## 文件变更清单（全量四切片）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/watcher.js | 切片一：detached 轮询 watcher（bg-sync 骨架+心跳租约+事件三类源+墙钟拆账） |
| 新增 | NEW:src/flow.js（+NEW:src/flow/ 如体量需要） | 切片二：flow start/done 命令族、thin\|legacy 开关、子步幂等 |
| 新增 | NEW:src/machine-draft.js | 切片三：MACHINE-DRAFT 三件套泛化（verify-draft 抽取） |
| 新增 | NEW:src/flow-draft.js | 切片三：proposal/requirements/tasks/decisions 起草器 + editRatio（切片四） |
| 修改 | src/verify-draft.js | 改为消费 machine-draft 原语（零行为回归） |
| 修改 | src/index.js | flow 命令分发 + watcher spawn 接线 |
| 修改 | src/run/command.js | effectiveChange 解析后无条件 spawnWatcher（锁合并） |
| 修改 | test/run-tests.mjs | 套件级 watcher 逃生阀 SILLYSPEC_WATCHER=0（41 孤儿泄漏实证修复的套件面；execute 审查 blocker②） |
| 修改 | src/run/complete-handlers.js | 归档执行链抽出为可导入函数（flow change 跳过 plan.md 硬校验） |
| 修改 | src/config-schema.js | 注册 `flow:`（thin\|legacy）、`flow.edit_ratio_threshold`、`flow.edit_ratio_enforcement`（advisory\|block）键（LOCAL_YAML_SCHEMA 单一真相表，local.yaml.example 同步） |
| 修改 | .sillyspec/local.yaml.example | flow 配置示例同步（flow 三键） |
| 修改 | src/stages/plan.js | D-006 plan 提示词反细拆（实现+单测同卡默认；同 Wave 文件不相交语义说明） |
| 新增 | NEW:test/watcher.test.mjs | 切片一：事件推断/租约判死/降级/provisional 标记/墙钟拆账 |
| 新增 | NEW:test/archive-chain.test.mjs | task-02 归档链抽取单测 |
| 新增 | NEW:test/machine-draft.test.mjs | task-04 泛化原语单测 |
| 新增 | NEW:test/flow-protocol.test.mjs | 切片二：harness 2 调用走通/恢复简报/幂等重入/legacy 开关 |
| 新增 | NEW:test/flow-draft.test.mjs | 切片三：四件起草/三态拒收/AGENT 槽放行/amend 留痕 |
| 新增 | NEW:test/flow-route.test.mjs | 切片四：阈值触发/失败升级通路 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 新文件录 module（sync/core-engine/cli-entry） |

（每片落地时按片裁剪实际清单；上表为全量预估，以各 Wave tasks 卡为准。）

## 接口定义

- `src/watcher.js`：`spawnWatcher(cwd, changeName, opts) → {status}`（spawned/coalesced/disabled）、
  `runWatcherFromEnv(env)`（子侧）、`inferEvents(prevSnap, nextSnap) → Event[]`（纯函数，
  测试主入口）、`aggregateStageTiming(events) → StageTiming[]`（纯函数）。Event：
  `{ts, kind, stage?, detail, provisional:true}`。
- `src/machine-draft.js`：`wrapSection(key, body) → string`、`parseMarkers(md) → Marker[]`、
  `verifyMarkers({md, sidecar}) → {violations[], ratios}`、`amendDraft({mdPath, ledgerPath})`。
- `src/flow.js`：`cmdFlowStart({change, input, cwd, specDir})`、`cmdFlowDone({change, ...})`、
  `readFlowState(changeDir)` / `writeFlowState(changeDir, patch)`（yaml，原子写 fs-atomic）。
- `src/flow-draft.js`：`draftProposal(input) → string`、`draftRequirements(input) → string`、
  `draftTasks(requirements) → string`、`draftDecisions(answers) → string`、
  `computeEditRatio(originalBody, currentBody) → number`（纯函数，基准=ledger 首版原文）。

## 风险登记

| 风险 | 等级 | 对冲 |
|---|---|---|
| thin 缺省翻转，新会话直接走新协议 | 高 | legacy 一行回滚；thin 只影响新 change；自举先行（切片二起） |
| 机器稿转写保真度（input→proposal 摘段失真） | 中 | 烟测校准；AGENT 槽+amend 通道兜底；editRatio 升厚信号 |
| watcher 长驻进程泄漏/多机竞态 | 中 | 心跳租约+单飞锁+空闲 6h 自退+归档自退+SILLYSPEC_WATCHER=0 |
| 平台 events 端点未升级 | 低 | fail-soft 探测降级本地 jsonl（唯一真相源不依赖平台） |
| 归档链抽取重构（complete-handlers 640-722）破坏既有归档 | 高 | 抽取为纯搬运+既有 archive 流程回归为硬门；flow 跳过 plan.md 校验按 flow-state 判据 |
| 薄跑误判（该厚走了薄） | 中 | 失败自动升厚（护栏#4）；editRatio 提示；distill 异态升厚 |
| stall advisory 对 thin change 误挂噪音 | 低 | 展示性噪音不阻断；v1 接受已知，后续优化渲染 |

## 自审（Self-Review）

写完后对照核过：①四切片依赖序正确（四依赖三的机器稿、三依赖二的 flow 通道、二依赖一的
遥测非硬依赖）；②红线逐条未触（tier 落文件不落 DB；判定语义复用既有函数不改）；③两先例
（bg-sync/verify-draft）的复用边界经实读确认（含 5 处 grill 修正）；④Windows 面三处
（轮询/windowsHide/appendFileSync）已列；⑤测试分层覆盖四验收钉+烟测+终验。已知未决：
机器稿质量首版靠烟测迭代；平台 events 端点是外部依赖。

## 决策引用

本设计依据 decisions.md 五条决策：D-001@v1（观测挂状态+轮询+provisional——切片一）、
D-002@v1（2 调用折叠+legacy 开关——切片二）、D-003@v1（flow done 幂等原子+测试门清单——切片二）、
D-004@v1（机器起草全件+指纹泛化+验收侧守卫——切片三）、D-005@v1（editRatio 汇合 amend+
失败升厚——切片四）。各决策含被否方案与理由，翻案须记 D-xxx@vN+1。

## Design Grill 修正记录（2026-09-22，独立子代理对抗审查）5 个结构性问题全部修正入上文：①归档机械面重划（2/4「函数」实为步骤名；plan.md 硬校验
拦薄工件面→抽链+跳过判据；distill 三态→升厚）；②editRatio 与三态拒收互斥→汇合于 amend
通道+ledger 存首版原文；③事件推送通道定案专用端点+fail-soft 探测+本地 jsonl 唯一真相
（不搭 progress 顺风车，保解耦验收钉）；④registerChange→initChange（ghost 误判）；
⑤config-schema.js 注册新键补入清单。execute 注意项 8 条已散布入对应节。

## 生命周期契约表

| 契约 | 语义 |
|---|---|
| watcher 租约 | 心跳 30s 刷新；5min 无心跳或 pid 死→租约失效；活锁在跑→新 spawn 合并退出；单飞锁防双跑 |
| flow-state.yaml | 唯一 tier 真相（thin/thick）；子步完成标记幂等锚；fs-atomic 原子写；缺文件=全新 thin |
| flow done 子步 | 六子步（工件校验/账本对账/探针/distill/归档/事件收口）各查自身标记，中断半态重入断点续 |
| 薄跑资格 | thin 缺省；失败升级写 flow-state 后剩余流程厚档；editRatio 阈值只提示不强制（护栏#4 机械升级靠失败触发） |

## 数据模型

无 DB schema 变更（红线）。新增三类文件态：watcher-events-*.jsonl（追加日志）、
watcher-stage-timing-*.json（聚合产物）、flow-state.yaml（tier+子步标记）+
draft-ledger-*.json（机器稿 sidecar 台账，verify-draft sidecar 同构泛化）。

## 兼容策略（brownfield 必填）

- **legacy 全保留**：`flow: legacy` 时零行为变化（既有 run <stage> 族、门禁、审批链逐字不动）；
  thin 缺省只影响**新 change**（存量活跃 change 按 legacy 续跑——flow-state 缺失即未参与 thin）。
- **verify-draft 消费方化**：抽原语后既有 verify 族测试（verify-draft 3/3 等）零回归为硬门。
- **平台事件**：新增 provisional 字段 additive；平台未升级 ingest 时忽略未知字段不炸。
- **多会话**：watcher 单飞锁+租约判死防多 spawn；flow start 对他会话活跃 change 的接管拒绝
  沿用 ownership 判定（SILLYSPEC_SESSION_ID 语义不动）。
- **Windows**：轮询 diff 规避 fs.watch 平台差异；detached+windowsHide 同 bg-sync；
  路径统一 path.join；jsonl 追加用 appendFileSync。

## 性能与安全

- watcher 轮询收窄 change 子树+git 头指针，3s 间隔，单轮 O(变更文件数)；日志 1MB 截尾同 bg-sync。
- flow start 输出的路径清单稳定前缀（不内联文件内容）——缓存命中最优，注入体积最小化。
- 机器稿指纹 sha256 同 verify-draft；sidecar 台账防伪造（手工重锚未审计三态拒收）。

## 测试与验收（分层）

1. **单测**（每片）：watcher 事件推断纯函数/租约判死；flow 协议 harness 2 调用；四件起草
   形态；三态拒收+AGENT 槽放行；editRatio 阈值与失败升级。
2. **harness 验收**（每片验收项，立项书原文）：
   - 片一：harness 无 agent 走流程，sync 事件数与 CLI 调用数解耦（事件来自文件/git/工件三类源）。
   - 片二：机械 harness 走通薄跑道，CLI 必需调用=2；恢复场景新会话同命令从盘面状态生成恢复简报。
   - 片三：薄跑道会话内 .sillyspec 写入=仅例外裁决（harness 验产物面）。
   - 片四：合成场景改写比例阈值触发正确；失败升级通路真跑一次。
3. **烟测**（30min 级小任务）：agent 采纳行为（task done 使用数/--draft 槽填充形态/RERUN 拒绝数）。
4. **终验**（四片全落地后一次）：大任务重放复用 r6-session-replay 工作树与 prompt-R6-L.md
   （同基线同防作弊，仅换本地新构建版本号）；判据三桶 Δ≤20M / 当量 ≤1.3（达标）≤1.2（拉伸）/
   墙钟 ~90min；不达标用四列遥测+机制行为计数定位，不回滚重测。

## 依据链

- round5/flip-3.31.0-proposal.md §三（刀2/刀3/底座）、§九（六条评审护栏）、§十（落地核对）、
  §十一（R6 取消裁定与验证策略）
- round5/r5l-forensic-verdict.md（三桶 77.7M 对症账）
- round5/audit/（逐请求数据：oS/r5L/sF/sQ 四臂数据 + forensic-buckets.mjs 复现脚本）
- 先例代码：src/run/bg-sync.js（detached 骨架）、src/verify-draft.js（指纹三件套）、
  src/task-done.js（四合一幂等原子性）
