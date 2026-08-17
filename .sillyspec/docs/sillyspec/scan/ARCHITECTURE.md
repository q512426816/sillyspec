---
author: qinyi
created_at: 2026-05-13T08:37:15
source_commit: 4401b3d
updated_at: 2026-08-16T19:30:00+08:00
generator: sillyspec-scan
---

# ARCHITECTURE

> sillyspec 是一个 spec-driven 开发 CLI，本质是一台"流程状态机"：把 AI 协作开发拆成
> `brainstorm → plan → execute → verify → archive` 等阶段，用数据库记录每个变更
> （change）当前走到哪个阶段、哪一步，强制 AI 严格按步骤产出文件并通过门控。

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 运行时 | Node.js >= 22.13，纯 ESM（`package.json` `"type":"module"`） |
| 入口 | `./bin/sillyspec.js`（仅一行：`import '../src/index.js'`） |
| 语言 | 原生 JavaScript，**无** TypeScript / 编译 / 打包器 |
| 交互 UI | `@inquirer/prompts`（提问）、`chalk`（着色）、`ora`（spinner）、`open`（浏览器，仅 dashboard 子包） |
| 配置格式 | `js-yaml`（YAML 解析，workflow / local.yaml / config-schema） |
| 进度存储 | `node:sqlite`（Node 原生 DatabaseSync，经 `src/db-engine.js` 抽象层；sql.js WASM 已于 2026-08-11 移除），单文件 `.sillyspec/.runtime/sillyspec.db` |
| 平台同步 | 原生 `fetch`（HTTP POST 到 SillyHub 平台）；`ws` WebSocket 仅 dashboard 子包使用，主 CLI 不依赖 |
| 测试 | 自定义 `test/run-tests.mjs`（`npm test`，并发池 4~12） |
| 语法检查 | 自定义 `test/check-syntax.mjs`（`npm run lint`） |
| 版本 | v3.26.8 |

## 架构概览

整体是 **CLI 命令分发层 + 阶段状态机引擎 + 进度持久化层 + 平台同步层 + 派发抽象层（dispatch）** 五层结构。

```
                       ┌─────────────────────────────────────┐
   用户终端             │  bin/sillyspec.js  →  src/index.js  │   命令分发
   sillyspec <cmd>      │  (switch command)                   │
                       └───────────────┬─────────────────────┘
                                       │
   ┌──────────┬──────────┬──────────┬─┴──────────┬──────────────┐
   ▼          ▼          ▼          ▼            ▼              ▼
 init      progress    run/<stage>  worktree    platform      dispatch
(init.js) (progress.js) (run.js)  (worktree.js) (sync.js)   (dispatch/)
                                       │
                                       ▼
                       ┌─────────────────────────────────────┐
                       │      阶段状态机引擎  src/run.js       │
                       │  (23 行 barrel → src/run/ 叶子模块)  │
                       │  runCommand → runStage → runAutoMode │
                       │  --done / --reset / --reopen / --skip│
                       │  perProject 步骤按项目展开            │
                       └───────────────┬─────────────────────┘
                                       │ 读取定义
                                       ▼
                       ┌─────────────────────────────────────┐
                       │   阶段定义注册表  src/stages/index.js  │
                       │  stageRegistry:                      │
                       │   brainstorm / plan / execute /      │
                       │   verify (主流程)                     │
                       │   scan / quick / explore / archive / │
                       │   status / doctor (辅助)             │
                       └───────────────┬─────────────────────┘
                                       │ 读写进度
                                       ▼
                       ┌─────────────────────────────────────┐
                       │  ProgressManager (src/progress.js)   │
                       │  facade → src/progress/ 子模块        │
                       │  ↕ node:sqlite (src/db.js)           │
                       │  .sillyspec/.runtime/sillyspec.db    │
                       └───────────────┬─────────────────────┘
                                       │ 可选
                                       ▼
                       ┌─────────────────────────────────────┐
                       │  SyncManager (src/sync.js)           │
                       │  HTTP POST(fetch) → SillyHub 平台    │
                       └─────────────────────────────────────┘
```

### CLI 入口链

- `bin/sillyspec.js` 仅负责加载 `src/index.js`。
- `src/index.js` 解析 `argv`，按顶层 `command` 用 `switch` 分发到各子模块（懒加载
  `await import(...)` 49 处）。grep 定位到的顶层命令分支（64 个 `case`）：`init`、
  `setup`、`progress`、`gate`、`derive`、`backfill-reviews`、`register-stage-review`、
  `docs`、`run`、`doctor`、`scan` / `status` / `quick` / `explore` / `brainstorm` /
  `plan` / `execute` / `verify` / `auto` / `archive`（顶层阶段别名）、`knowledge`、
  `dashboard`、`worktree`、`dispatch`、`platform`、`change-rename`、`workflow`、
  `modules`、`local`、`config`、`runtime`。
- `progress` 命令还有二级子命令：`init / status / show / check / repair / validate /
  reset / set-stage / add-step / update-step / complete-stage / batch`（见
  `src/index.js:265`）。
- `docs` 命令二级子命令：`migrate / check / gate`（文档行号引用校验 + ratchet 门）。
- `dispatch` 命令二级子命令：`probe / hint`（SillyHub 派发能力探测与策略生成）。
- `run` 及阶段别名（`brainstorm` 等顶层名）统一转发到 `runCommand`（`src/run.js`）。

### 阶段状态机引擎（src/run.js barrel → src/run/）

`src/run.js` 现为 23 行 barrel（W6 重构拆分），核心实现移入 `src/run/` 11 模块
（command.js 参数解析与生命周期 / stage.js 单阶段执行 / complete*.js 完成
处理 / gates.js 完成门 / prompt.js 提示词注入 / quick-audit.js quick 审计 /
scan-profile.js 扫描档位 / concurrent-detect.js 并发检测 / multi-repo-context.js
多仓上下文 / shared.js 共享工具）。grep 定位到的关键导出与函数：

- `runCommand(args, cwd, specDir)`（`src/run/command.js:157`）：参数解析总入口，识别
  `--done / --skip / --reset / --reopen / --status / --auto / --skip-approval /
  --from-step / --confirm / --wait / --answer` 等生命周期 flag；含祖先链多实例
  `.sillyspec` 检测与 worktree 副本漂移自动锚定守卫（坑 worktree-execute-spec-drift，
  D-03@v1）。
- `runStage(...)`（`src/run/stage.js:31`）：单阶段执行器，做状态转换校验（调用
  `stage-contract.js` 的 `checkTransition`），逐 step 推进，处理审批门控。
- `runAutoMode(...)`（`src/run/command.js:824`）：自动模式，连续跑
  `['brainstorm','plan','execute','verify']` 主流程直到 `--done`。

阶段流转语义（grep 自 run/ 模块）：

| Flag | 含义 |
| --- | --- |
| `--done` | 标记当前 step 完成，推进到下一步；阶段最后一步 done 则推进阶段 |
| `--skip` | 跳过当前 step（受 step 类型限制） |
| `--reset` | 重置当前阶段从头开始 |
| `--reopen` | 已完成阶段重新打开修订，配 `--from-step` 定位 |
| `--wait` / `--answer` | step 进入等待用户输入状态 / 一步完成 wait+done |
| `--auto` | 进入自动模式连跑主流程 |

**perProject 按项目展开**：scan 阶段大量 step 带 `perProject: true` 标记（grep 自
`src/stages/scan.js`，共 8 处）。`handleScanProjectListStep`（`src/run/complete-handlers.js:456`）
逻辑：scan 第 2 步"构建扫描项目列表"
完成后，把后续所有 `perProject` step 按 `projectNames` 展开成
`步骤 × 项目` 个独立子步骤，移除原始未展开版本。

### 阶段定义注册表（src/stages/）

`src/stages/index.js` 导出：

- `stageRegistry`：所有阶段的 `definition` 对象集合（辅助阶段经 `auxiliaryFlag`
  展开 `{ ...definition, auxiliary: true }` 注入）。
- `auxiliaryStages`：自 `src/constants.js` re-export（`AUXILIARY_STAGES` 冻结数组
  `scan / quick / explore / archive / status / doctor`；另有
  `READONLY_AUXILIARY_STAGES = status / doctor` 供只读短路，FR-04 / D-005@v2）。
  主流程为 `brainstorm / plan / execute / verify`。

每个 `definition = { name, steps: [...] }`，step 可带 `perProject`。grep 定位到的阶段
文件与各自步骤（取自 `name:` 字段）：

| 文件 | 阶段名 | 主要步骤 |
| --- | --- | --- |
| `brainstorm.js` | brainstorm | 进度确认 / 加载项目上下文 / 对话式探索与需求澄清 / 提出 2-3 种方案 / 分段展示设计 / 写设计文档并自审 / Design Grill 交叉审查 / 生成规范文件（8 个主步骤，部分含条件分支） |
| `plan.js` | plan | 复杂度分类与上下文加载 / 生成分级计划 / 审查计划 / 生成 TaskCard（子代理并行）/ Wave 重排与可行性校验（含 `buildPlanSteps`、`buildCoordinatorStep` 工厂函数） |
| `execute.js` | execute | 进度确认 / 加载上下文 / 确认 worktree 路径 / 确认执行范围 / 对照设计检查 / 运行测试 / 代码审查 / 知识库审阅 / 完成确认（含 `validatePlanForExecute`、`buildExecuteSteps`） |
| `verify.js` | verify | 进度确认 / 加载规范并锚定 / 逐项检查任务 / 对照设计检查 / 任务蓝图验收 / 运行测试和质量扫描 / 输出验证报告（`_globalGuardrails` 只读护栏） |
| `scan.js` | scan | 探测项目结构并建议子项目 / 构建扫描项目列表 / 构建环境探测（perProject）/ 断点续扫检测（perProject）/ 深度扫描 7 份文档（perProject）/ 生成本地配置 / 生成模块映射（perProject）/ 生成模块卡片文档（perProject）/ 生成业务流程和术语表（perProject）/ Extract Project Knowledge（perProject）/ 自检和提交（perProject） |
| `quick.js` | quick | 理解任务 / 实现并验证 / 暂存和更新记录 |
| `explore.js` | explore | 自由探索 |
| `archive.js` | archive | 任务完成度检查 / extract-module-impact / sync-module-docs / 确认归档 / 更新路线图和提交 |
| `status.js` | status | 项目基础信息 / 变更状态 / 输出状态报告 |
| `doctor.js` | doctor | SillySpec 内部检查 / 构建环境检查 / 外部依赖检查 / 模块文档健康检查 / 汇总报告 |
| `knowledge.js` | knowledge | 知识库管理命令（非流程阶段）：search / inspect / validate / refresh / propose 子命令（propose 指知识条目提议，与已移除的 propose 阶段无关） |

> propose 阶段已移除（2026-08-07 A6 清理，`src/stages/propose.js` 删除，注册表无该条目）。

### 进度持久化层（progress 模块）

W6 重构后的结构：`src/progress.js` 是 ProgressManager facade（1127 行），实现拆至
`src/progress/` 5 个文件，对外 API 不变（详见模块卡
`.sillyspec/docs/sillyspec/modules/progress.md`）：

| 文件 | 职责 |
| --- | --- |
| `src/progress.js` | `ProgressManager` facade（`src/progress.js:172` 类声明）：持久化核心（_ensureDB / read / _write 本体留在 facade），其余按组 delegate 到子模块 |
| `src/progress/stage-machine.js` | 阶段状态机：completeStage / reopen / reset / validate / show / status + 产物校验门 + 下游级联 |
| `src/progress/step-store.js` | stages / steps / batch_progress 三表读写（setStage / addStep / updateStep / batch） |
| `src/progress/change-registry.js` | 变更注册表：changes 表生命周期（注册/注销/重命名/隔离状态/平台同步戳/审批状态） |
| `src/progress/consistency-doctor.js` | 状态一致性检查与修复（Revision v1 + `--force` 审计日志 `.runtime/audit.log`），doctor 阶段核心实现 |
| `src/progress/shared.js` | 共享常量（STAGE_ORDER / MAIN_FLOW_ORDER / VALID_STAGES 等），破 facade↔子模块循环引用 |

对外方法（grep 自 facade）：`read / _write / listChanges / registerChange /
initChange / setStage / addStep / updateStep / completeStage / renameChange /
readChangeIsolation / updateChangeIsolation / checkConsistency /
repairConsistency / validate / reset`。

- **`DB`**（`src/db.js:37`）：底层存储封装，经 `src/db-engine.js`（node:sqlite
  DatabaseSync 引擎抽象：openDatabase / applyPragmas / runTransaction，WAL + busy_timeout）
  打开库文件；`_openWithFallback` 主库 → `.bak` → 全新/报错逐级回退。

SQLite Schema（grep 自 `db.js`，仅记表名 + 用途 + 字段数）：

| 表名 | 用途 | 字段数 |
| --- | --- | --- |
| `project` | 单项目元信息（name / schema_version=5 / 时间戳） | 5 |
| `changes` | 每个变更（change）：当前阶段、状态、worktree 标记、平台同步字段等 | 11 + 迁移列 `isolation_status` |
| `stages` | 变更下每个阶段的执行状态（pending/进行/完成 + 时间戳） | 6 |
| `steps` | 阶段下每个步骤的状态、输出、序号 | 7 |
| `batch_progress` | 批量执行计数（total/completed/failed/skipped） | 6 |
| `approvals` | 审批记录（status / approved_by / 拒绝原因） | 7 |

外键级联：`changes → stages → steps` 全部 `ON DELETE CASCADE`。索引：
`idx_changes_current_stage`、`idx_changes_status`、`idx_stages_change`、`idx_steps_stage`。

### 平台同步层（src/sync.js）

- **`SyncManager`**（`src/sync.js:257`）：独立于 ProgressManager，由 `run/` 与 `index.js` 调用。
- 动态 `import('./progress.js')` 读取进度后：
  - `POST {platform.url}/api/changes/{changeName}/progress` 同步进度（`sync.js:417`）；
  - `POST {platform.url}/api/changes/{changeName}/documents` 同步文档（`sync.js:501`）；
  - 同步完更新 `changes.platform_last_sync`。
- 审批链路：`GET /api/changes/{name}/approval` 查询（`sync.js:546`）+ `approve` / `reject`
  入口（`sync.js:1046` / `sync.js:1050`，共用 `_submitApproval`，端点契约 TBD-hub-api）。
- 配置读 `.sillyspec/local.yaml` platform 段（connect/disconnect 用文本级改写保留注释）。
- platform 子命令（connect / disconnect / sync / sync-docs / status / pull / resolve /
  approve / reject / pointer）见 `src/index.js:1263`。主 CLI 无 WebSocket 依赖。

### 派发抽象层（src/dispatch/）

task-dispatcher 抽象（D-007：dispatcher **不是 JS 执行体**——CLI 生成指令文本，
实际 tool 调用由 agent 执行）。详见模块卡与头注释：

- `src/dispatch/probe.js` — SillyHub 能力探测（D-005 双后端 fallback 判定）：无 MCP
  配置快速路径不发网络；负面结果 TTL 缓存（`local.yaml dispatch.probe_ttl_ms` 可配）；
  探测失败保守返回 unavailable，绝不抛异常阻断 execute。
- `src/dispatch/strategy.js` — 派发策略生成器：依据 probe 结果选后端
  （`probe.available === true` → sillyhub，否则 local 零回归），组合成可注入 execute
  prompt 的派发指令文本；路径 A 未支持时（D-003@v2）不改 backend 标签、只附加降级
  提示段 + Local 兜底指令全文。
- `src/dispatch/backends/local-agent.js` / `sillyhub-mcp.js` — 两后端派发指令模板
  生成器（本机 Agent tool / SillyHub MCP tool 的调用说明文本）。

CLI 入口：`sillyspec dispatch probe` / `sillyspec dispatch hint`（`src/index.js:1186`）。

### SillyHub MCP 客户端（src/sillyhub-mcp/）

- `src/sillyhub-mcp/client.js` — `SillyHubMcpClient`：streamable HTTP MCP 客户端
  （协议 2025-11-25），JSON-RPC 2.0 over `POST {url}/mcp/`（Bearer token），响应兼容
  JSON 与 SSE 两种形态。best-effort 契约：网络失败 / 非 2xx 一律 console.warn 不抛错，
  保守返回 unavailable / 空 / false。仅用 Node 原生 fetch，不引入新依赖。
- `src/sillyhub-mcp/config.js` — `readMcpConfig` 凭据共享 helper：优先级
  `local.yaml mcp 段（url+token 两键齐全）> env SILLYHUB_MCP_URL/TOKEN`，三处消费点
  （client 构造 / probe configFingerprint / execute getDispatchMode）共用。

### 文档一致性子系统（docs-consistency）

四件套，共同原则「CLI 算事实注入」（详见模块卡
`.sillyspec/docs/sillyspec/modules/docs-consistency.md`）：

| 文件 | 职责 |
| --- | --- |
| `src/docs-check.js` | 文档行号引用校验核心：层1 存在性（文件存在 + 行号在界）+ 层2 关键词断言（引用行反引号 token 在源码窗口内命中）；只读，纯 Node 内置 |
| `src/docs-gate.js` | docs check 的 ratchet 门：失效数 ≤ 基线（`.sillyspec/docs-check-baseline`）即过、超基线拦；首次须显式 `--init-baseline` |
| `src/docs-debt.js` | 模块文档欠账事实计算：变更触及文件归属到模块、git 双时间戳算 behind 计数，注入 execute Wave prompt（advisory） |
| `src/scan-staleness.js` | scan 文档新鲜度提示：source_commit vs HEAD 落后数生成 fresh / needs-refresh / unknown 三态，brainstorm 读 scan 文档前注入一行提示 |

接入点：`npm test` 自动收集 `test/doc-ref-check.test.mjs`；`.husky/pre-push` 跑
lint + test + docs gate 三道关。

### 其他核心模块（grep 定位）

| 模块 | 职责 |
| --- | --- |
| `src/worktree.js` | `WorktreeManager` + git worktree 生命周期（create / list / cleanup / meta；`detectIsolation` / `isGitWorktreeSupported`） |
| `src/worktree-apply.js` | `applyWorktree` 把变更应用到主仓；`formatExecuteSummary` 汇总 |
| `src/worktree-deps.js` | worktree 依赖供给引擎（junction/symlink 快路径 + install 兜底） |
| `src/workflow.js` | workflow YAML 加载/校验/运行（`loadWorkflow` / `validateWorkflow` / `runPostCheck` / `generateRolePrompt` / `saveWorkflowRun`） |
| `src/stage-contract.js` | 阶段转换契约：`getContract` / `checkTransition` / `runValidators`（+ `stage-contract-spec.js` 产物契约 manifest 单一真相源、`stage-contract-engine.js` 通用校验引擎） |
| `src/task-review.js` | 任务评审 schema（`REVIEW_SCHEMA_VERSION`、`validateReviewSchema`、`validateTaskReviews`、executeRunId 管理） |
| `src/stage-review.js` / `src/review-tier.js` | 阶段级审查 gate（文档型）+ 审查分级（self / independent，由 plan_level 映射） |
| `src/verify-postcheck.js` | verify 客观测试对账：CLI 亲自执行 local.yaml 配置的测试命令，自报告 PASS 但实测失败 → 阻断 verify 完成；支持 `known_failures` 预存豁免 |
| `src/quicklog.js` | QUICKLOG 条目 CLI 接管层（ql-ID 分配 + O_EXCL lockfile 串行化，消除 agent 手写漏写/并发丢更新） |
| `src/quick-recommend.js` | quick 多变更关联推荐打分（脏文件 + 任务描述双信号） |
| `src/machine-interface.js` | 机器接口层 v1：JSON envelope + 退出码契约（gate / derive），SillyHub driver 模式地基，只读语义 |
| `src/contract-matrix.js` | API 契约矩阵：`buildContractMatrix` / `extractProviderArtifact` / `buildConsumerInjection` / `verifyApiParity` |
| `src/endpoint-extractor.js` | 前后端端点提取与 diff（FastAPI / 前端 API 调用 / `diffApiParity`） |
| `src/change-risk-profile.js` | 变更风险画像：`detectChangeRisk` / `checkIntegrationEvidence`（P0/P1/P2） |
| `src/change-list.js` | 解析 design.md 中的文件变更清单 |
| `src/knowledge-match.js` | 知识库索引匹配（`parseKnowledgeIndex` / `matchKnowledge`） |
| `src/scan-postcheck.js` | scan 后置检查（`runScanPostCheck` / 结构化结果写出，不信任 agent 自检） |
| `src/modules.js` | 模块文档管理（modules 命令） |
| `src/migrate.js` | 旧版文档迁移 `migrateDocs` |
| `src/setup.js` | `cmdSetup` 安装/配置 AI 工具集成 |
| `src/init.js` | 绿地项目初始化（+ 平台模式双指针落盘） |
| `src/version.js` | 轻量 `getVersion`（--version 高频路径不加载重型依赖） |
| `src/constants.js` | 冻结的状态枚举：`SCAN_STATUS / POINTER_STATUS / WORKFLOW_STATUS / CHECK_SEVERITY / STEP_STATUS / STAGE_STATUS / AUXILIARY_STAGES` + `isPointerStale / isPointerCorrupted` |
| `src/fs-atomic.js` | 原子文件写 + Windows 友好 rename 重试（EPERM/EBUSY 退避；DB 持久化不经此层） |
| `src/git-helper.js` | 统一公共 git 调用入口：`execFileSync` 数组形式 + per-command `safe.directory`（抛错版 `git` / 静默版 `gitQuiet`），消除 shell 拼接口径分裂 |
| `src/hooks/worktree-guard.js` | 写入/命令守卫：`shouldBlockWrite` / `shouldBlockBash` / `shouldBlock`（直读 sillyspec.db，防止 AI 在主仓/worktree 误改） |

## 控制流：一次 `sillyspec run <stage>` 的生命周期

```
argv → index.js switch('run') → runCommand(src/run/command.js:157)
   ├─ 解析 --done/--reset/--reopen/--skip/--auto 等 flag
   ├─ worktree 副本漂移守卫：specBase 命中 worktree 副本 → 自动锚回主仓
   ├─ new ProgressManager() 读当前 change 进度
   ├─ 若 --auto → runAutoMode(src/run/command.js:824) 连跑 brainstorm→plan→execute→verify
   ├─ 否则 → runStage(src/run/stage.js:31)
   │     ├─ stage-contract.checkTransition 校验状态转换
   │     ├─ stageRegistry[stage].steps 取步骤定义
   │     ├─ scan 阶段：perProject steps 按 projectNames 展开
   │     ├─ 逐 step：输出 prompt 让 AI 执行 → --done 写 steps 表
   │     └─ 阶段全部 done → completeStage 推进 changes.current_stage
   ├─ 关键节点调 SyncManager 同步平台
   └─ 返回
```

## 设计要点

1. **状态机而非脚本**：所有进度落 SQLite（node:sqlite），进程可任意中断，重启后从 DB 恢复。
2. **perProject 展开**：scan 天然多项目，用 `perProject: true` 标记 + 运行时展开，
   把"N 个项目 × M 步"压成线性 step 流。
3. **门控分层**：step 级（`--done` 输出校验）+ 阶段级（`stage-contract` 转换契约）
   + workflow 级（`runPostCheck`）+ push 级（pre-push lint + test + docs gate）多层把关。
4. **主/辅阶段分离**：主流程 4 阶段可 `--auto`，辅助阶段（scan/quick/explore/archive/
   status/doctor）各自独立，其中 status/doctor 只读短路不触碰进度库。
5. **平台可选**：SyncManager 是旁路，无平台配置时完全本地运行。
6. **CLI 算事实注入**：docs-check / docs-debt / scan-staleness / verify-postcheck 等
   用 git / fs 算出确定性结论注入 prompt，advisory 不阻断、无信号零输出——不信任
   agent 自报告。
