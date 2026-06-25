---
author: qinyi
created_at: 2026-05-13T08:37:15
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# ARCHITECTURE

> sillyspec 是一个 spec-driven 开发 CLI，本质是一台"流程状态机"：把 AI 协作开发拆成
> `brainstorm → plan → execute → verify → archive` 等阶段，用数据库记录每个变更
> （change）当前走到哪个阶段、哪一步，强制 AI 严格按步骤产出文件并通过门控。

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 运行时 | Node.js >= 18，纯 ESM（`package.json` `"type":"module"`） |
| 入口 | `./bin/sillyspec.js`（仅一行：`import '../src/index.js'`） |
| 语言 | 原生 JavaScript，**无** TypeScript / 编译 / 打包器 |
| 交互 UI | `@inquirer/prompts`（提问）、`chalk`（着色）、`ora`（spinner）、`open`（浏览器） |
| 文件监听 | `chokidar` |
| 配置格式 | `js-yaml`（YAML 解析，workflow / config） |
| 进度存储 | `sql.js`（SQLite WASM，单文件 `.sillyspec/runtime/progress.db`） |
| 平台同步 | `ws`（WebSocket 实时同步）+ `fetch`（HTTP POST 到 SillySpec 平台） |
| 测试 | 自定义 `test/run-tests.mjs`（`npm test`） |
| 语法检查 | 自定义 `test/check-syntax.mjs`（`npm run lint`） |
| 版本 | v3.19.2 |

## 架构概览

整体是 **CLI 命令分发层 + 阶段状态机引擎 + 进度持久化层 + 平台同步层** 四层结构。

```
                       ┌─────────────────────────────────────┐
   用户终端             │  bin/sillyspec.js  →  src/index.js  │   命令分发
   sillyspec <cmd>      │  (switch command)                   │
                       └───────────────┬─────────────────────┘
                                       │
            ┌──────────────┬───────────┼────────────┬──────────────┐
            ▼              ▼           ▼            ▼              ▼
        init/setup     progress    run/<stage>   worktree      platform
        (init.js)    (progress.js)  (run.js)   (worktree.js)   (sync.js)
                                       │
                                       ▼
                       ┌─────────────────────────────────────┐
                       │      阶段状态机引擎  src/run.js       │
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
                       │  ↕ sql.js SQLite (src/db.js)         │
                       │  .sillyspec/runtime/progress.db      │
                       └───────────────┬─────────────────────┘
                                       │ 可选
                                       ▼
                       ┌─────────────────────────────────────┐
                       │  SyncManager (src/sync.js)           │
                       │  WebSocket(ws) + HTTP POST → 平台     │
                       └─────────────────────────────────────┘
```

### CLI 入口链

- `bin/sillyspec.js` 仅负责加载 `src/index.js`。
- `src/index.js` 解析 `argv`，按顶层 `command` 用 `switch` 分发到各子模块。grep 定位到的
  顶层命令分支：`init`、`setup`、`progress`、`docs`、`run`、`doctor`、`scan`、`status`、
  `quick`、`explore`、`dashboard`、`worktree`、`platform`、`workflow`、`modules`。
- `progress` 命令还有二级子命令：`init / status / show / check / repair / validate /
  reset / set-stage`（见 `index.js:193`）。
- `run` 及阶段别名（`brainstorm` 等顶层名）统一转发到 `runCommand`（`src/run.js`）。

### 阶段状态机引擎（src/run.js）

`run.js` 是核心，grep 定位到的关键导出与函数：

- `runCommand(args, cwd, specDir)`（`run.js:1073`）：参数解析总入口，识别
  `--done / --skip / --reset / --reopen / --status / --auto / --skip-approval /
  --from-step / --confirm / --wait / --answer` 等生命周期 flag。
- `runStage(...)`（`run.js:1454`）：单阶段执行器，做状态转换校验（调用
  `stage-contract.js` 的 `checkTransition`），逐 step 推进，处理审批门控。
- `runAutoMode(...)`（`run.js:2977`）：自动模式，连续跑
  `['brainstorm','plan','execute','verify']` 主流程直到 `--done`。

阶段流转语义（grep 自 `run.js`）：

| Flag | 含义 |
| --- | --- |
| `--done` | 标记当前 step 完成，推进到下一步；阶段最后一步 done 则推进阶段 |
| `--skip` | 跳过当前 step（受 step 类型限制） |
| `--reset` | 重置当前阶段从头开始 |
| `--reopen` | 已完成阶段重新打开修订，配 `--from-step` 定位 |
| `--wait` / `--answer` | step 进入等待用户输入状态 / 一步完成 wait+done |
| `--auto` | 进入自动模式连跑主流程 |

**perProject 按项目展开**：scan 阶段大量 step 带 `perProject: true` 标记（grep 自
`src/stages/scan.js`，共 8 处）。`run.js:2282` 处逻辑：scan 第 2 步"构建扫描项目列表"
完成后，把后续所有 `perProject` step 按 `projectNames` 展开成
`步骤 × 项目` 个独立子步骤（日志示例见 `run.js:2322`），移除原始未展开版本。

### 阶段定义注册表（src/stages/）

`src/stages/index.js` 导出：

- `stageRegistry`：所有阶段的 `definition` 对象集合。
- `auxiliaryStages = ['scan','quick','explore','archive','status','doctor']`：辅助阶段
  标记（主流程为 `brainstorm / plan / execute / verify`）。

每个 `definition = { name, steps: [...] }`，step 可带 `perProject`。grep 定位到的阶段
文件与各自步骤（取自 `name:` 字段）：

| 文件 | 阶段名 | 主要步骤 |
| --- | --- | --- |
| `brainstorm.js` | brainstorm | 状态检查 / 加载项目上下文 / 协作与复用检查 / 原型分析 / 需求范围评估 / 对话式探索 / Grill / 提出方案 / 分段展示 / HTML 原型 / 写设计文档并自审 / Design Grill / 用户确认生成规范（约 13 步） |
| `plan.js` | plan | 复杂度分类 / 状态检查 / 加载上下文 / 锚定确认 / 按复杂度生成分级计划 / 自检总览 / 重排 Wave / 审查一致性 / 保存并更新进度 / 生成任务蓝图（含 `buildPlanSteps`、`buildCoordinatorStep` 工厂函数） |
| `execute.js` | execute | 状态检查 / 加载上下文 / 确认 worktree 路径 / 确认执行范围 / 对照设计检查 / 运行测试 / 代码审查 / 知识库审阅 / 完成确认（含 `validatePlanForExecute`、`buildExecuteSteps`） |
| `verify.js` | verify | 状态检查 / 加载规范并锚定 / 逐项检查任务 / 对照设计检查 / 任务蓝图验收 / 运行测试和质量扫描 / 输出验证报告 |
| `scan.js` | scan | 探测项目结构 / 构建扫描项目列表 / 构建环境探测（perProject）/ 断点续扫（perProject）/ 深度扫描 7 文档（perProject）/ 生成本地配置 / 生成模块映射（perProject）/ 生成模块卡片（perProject）/ 业务流程术语表（perProject）/ Extract Project Knowledge（perProject）/ 自检和提交（perProject） |
| `quick.js` | quick | 理解任务 / 实现并验证 / 暂存和更新记录 |
| `explore.js` | explore | 自由探索 |
| `archive.js` | archive | 任务完成度检查 / extract-module-impact / sync-module-docs / 确认归档 / 更新路线图和提交 |
| `status.js` | status | 项目基础信息 / 变更状态 / 输出状态报告 |
| `doctor.js` | doctor | SillySpec 内部检查 / 构建环境检查 / 外部依赖检查 / 模块文档健康检查 / 汇总报告 |
| `propose.js` | propose | **未注册到 stageRegistry**（文件头注释明确"保留以备未来恢复"），仅定义不启用 |

### 进度持久化层

- **`ProgressManager`**（`src/progress.js:79`）：对外 API 层，方法包括
  `read / _write / listChanges / registerChange / initChange / setStage / addStep /
  updateStep / completeStage / renameChange / readChangeIsolation /
  updateChangeIsolation / checkConsistency / repairConsistency / validate / reset`。
- **`DB`**（`src/db.js:5`）：底层 sql.js 封装，`_createSchema()` 建表。

SQLite Schema（grep 自 `db.js`，仅记表名 + 用途 + 字段数）：

| 表名 | 用途 | 字段数 |
| --- | --- | --- |
| `project` | 单项目元信息（name / schema_version / 时间戳） | 5 |
| `changes` | 每个变更（change）：当前阶段、状态、worktree 标记、平台同步字段、隔离状态等 | 12+（含迁移追加的 `isolation_status` 等列） |
| `stages` | 变更下每个阶段的执行状态（pending/进行/完成 + 时间戳） | 7 |
| `steps` | 阶段下每个步骤的状态、输出、序号 | 7 |
| `batch_progress` | 批量执行计数（total/completed/failed/skipped） | 6 |
| `approvals` | 审批记录（status / approved_by / 拒绝原因） | 7 |

外键级联：`changes → stages → steps` 全部 `ON DELETE CASCADE`。索引：
`idx_changes_current_stage`、`idx_changes_status`、`idx_stages_change`、`idx_steps_stage`。

### 平台同步层（src/sync.js）

- **`SyncManager`**（`sync.js:121`）：独立于 ProgressManager，由 `run.js` / `index.js` 调用。
- 动态 `import('./progress.js')` 读取进度后：
  - `POST {platform.url}/api/changes/{changeName}/progress` 同步进度；
  - `POST {platform.url}/api/changes/{changeName}/documents` 同步文档；
  - 同步完更新 `changes.platform_last_sync`。
- `ws` 用于实时事件广播（platform connect/disconnect/sync 子命令，见 `index.js:602+`）。

### 其他核心模块（grep 定位）

| 模块 | 职责 |
| --- | --- |
| `src/worktree.js` | `WorktreeManager` + git worktree 检测（`detectIsolation` / `isGitWorktreeSupported` / `checkWorktreeDirIgnored`） |
| `src/worktree-apply.js` | `applyWorktree` 把变更应用到 worktree；`formatExecuteSummary` 汇总 |
| `src/workflow.js` | workflow YAML 加载/校验/运行（`loadWorkflow` / `validateWorkflow` / `runPostCheck` / `generateRolePrompt` / `saveWorkflowRun`） |
| `src/stage-contract.js` | 阶段转换契约：`getContract` / `checkTransition` / `runValidators` |
| `src/task-review.js` | 任务评审 schema（`REVIEW_SCHEMA_VERSION`、`validateReviewSchema`、`validateTaskReviews`、executeRunId 管理） |
| `src/contract-matrix.js` | API 契约矩阵：`buildContractMatrix` / `extractProviderArtifact` / `buildConsumerInjection` / `verifyApiParity` |
| `src/endpoint-extractor.js` | 前后端端点提取与 diff（FastAPI / 前端 API 调用 / `diffApiParity`） |
| `src/change-risk-profile.js` | 变更风险画像：`detectChangeRisk` / `checkIntegrationEvidence` |
| `src/change-list.js` | 解析 design.md 中的文件变更清单 |
| `src/knowledge-match.js` | 知识库索引匹配（`parseKnowledgeIndex` / `matchKnowledge`） |
| `src/scan-postcheck.js` | scan 后置检查（`runScanPostCheck` / 结构化结果写出） |
| `src/modules.js` | 模块文档管理（modules 命令） |
| `src/migrate.js` | 旧版文档迁移 `migrateDocs` |
| `src/setup.js` | `cmdSetup` 安装/配置 AI 工具集成 |
| `src/init.js` | 绿地项目初始化 + `getVersion` |
| `src/constants.js` | 冻结的状态枚举：`SCAN_STATUS / POINTER_STATUS / WORKFLOW_STATUS / CHECK_SEVERITY / STEP_STATUS / STAGE_STATUS` + `isPointerStale / isPointerCorrupted` |
| `src/hooks/worktree-guard.js` | 写入/命令守卫：`shouldBlockWrite` / `shouldBlockBash` / `shouldBlock`（防止 AI 在主仓误改） |

## 控制流：一次 `sillyspec run <stage>` 的生命周期

```
argv → index.js switch('run') → runCommand(run.js:1073)
   ├─ 解析 --done/--reset/--reopen/--skip/--auto 等 flag
   ├─ new ProgressManager() 读当前 change 进度
   ├─ 若 --auto → runAutoMode 连跑 brainstorm→plan→execute→verify
   ├─ 否则 → runStage(run.js:1454)
   │     ├─ stage-contract.checkTransition 校验状态转换
   │     ├─ stageRegistry[stage].steps 取步骤定义
   │     ├─ scan 阶段：perProject steps 按 projectNames 展开
   │     ├─ 逐 step：输出 prompt 让 AI 执行 → --done 写 steps 表
   │     └─ 阶段全部 done → completeStage 推进 changes.current_stage
   ├─ 关键节点调 SyncManager 同步平台
   └─ 返回
```

## 设计要点

1. **状态机而非脚本**：所有进度落 SQLite，进程可任意中断，重启后从 DB 恢复。
2. **perProject 展开**：scan 天然多项目，用 `perProject: true` 标记 + 运行时展开，
   把"N 个项目 × M 步"压成线性 step 流。
3. **门控分层**：step 级（`--done` 输出校验）+ 阶段级（`stage-contract` 转换契约）
   + workflow 级（`runPostCheck`）三层把关。
4. **主/辅阶段分离**：主流程 4 阶段可 `--auto`，辅助阶段（scan/quick/explore/archive/
   status/doctor）各自独立。
5. **平台可选**：SyncManager 是旁路，无平台配置时完全本地运行。
