---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-07-22T16:00:00+08:00
---

# 阶段与变更产物

## 变更注册

变更状态由 `ProgressManager.initChange()` 写入 SQLite：

- 确保 `.sillyspec/changes/<change>/` 存在
- `changes` 表插入或激活 change
- 为所有有效阶段写入 `stages` 行
- 默认 `current_stage = 'brainstorm'`

`run.js` 在执行阶段时会调用 `pm.registerChange()`，确保 effective change 是 active。

## 阶段步骤来源

阶段定义来自 `src/stages/*.js`，由 `src/stages/index.js` 注册。`scan`、`quick`、`explore`、`archive`、`status`、`doctor` 被标记为辅助阶段；辅助阶段完成后，`run.js` 会把该阶段步骤重置为 pending，并清空当前辅助阶段的 gate 状态。

当前运行时步骤数：

| 阶段 | 步骤数 | 产物口径 |
|---|---:|---|
| scan | 10 | 生成 `.sillyspec/docs/<project>/...`，step 2 后动态展开项目级步骤 |
| brainstorm | 8 | 第 6 步写 `design.md` 并自审，第 7 步 Design Grill 交叉审查，第 8 步确认后按 `scale` 分叉（large→四件套 / small→仅 design.md）；第 2 步含早期规模筛查（明显小变更建议走 quick），第 3 步合并对话探索+原型分析+范围评估+需求澄清Grill；可选生成 `MASTER.md`、prototype、后续包骨架 |
| propose | 7 | 第 5 步生成四件套，第 6 步自检门控 |
| plan | 8+ | 生成 `plan.md`；如解析到任务，会动态插入任务蓝图协调器 |
| execute | 12+ | 生成/使用 worktree，按 Wave 执行；最终 apply/cleanup；完成时 `validateExecuteOutputs` 核验真实代码变更 + Task Review Gate 做 review.json git 交叉校验 |
| verify | 7 | 写 `verify-result.md`；完成时 CLI 实测 `commands.test` 与自报告对账 |
| archive | 5 | 写 `module-impact.md`，同步模块文档，归档目录 |
| quick | 3 | quicklog 由 CLI 写入（启动分配 ql-ID + 「进行中」，完成翻「已完成」）；关联变更时 CLI 在各 change tasks.md 追加/勾选 task；直接改主工作区 |

## 变更四件套

目标路径：`.sillyspec/changes/<change>/`

| 文件 | 当前创建方式 | 后续消费者 |
|---|---|---|
| `proposal.md` | brainstorm 第 8 步（仅 large）；propose 第 5 步 | propose/plan/verify/archive prompt |
| `design.md` | brainstorm 第 6 步（frontmatter 含 `scale`）；propose 第 5 步 | plan、execute、verify、worktree apply、quick 的文件清单 |
| `requirements.md` | brainstorm 第 8 步（仅 large）；propose 第 5 步 | plan、verify |
| `tasks.md` | brainstorm 第 8 步（仅 large）；propose 第 5 步；quick 关联变更时可追加 task | plan、execute、verify、archive |

`run.js validateFileLocations()` 在阶段完成时会检查：

| 阶段 | 预期文件 |
|---|---|
| propose | `proposal.md`、`design.md`、`requirements.md`、`tasks.md` |
| plan | `plan.md` |
| verify | `verify-result.md` |
| archive | `module-impact.md` |

这个检查只打印警告，不会阻止流程。

## `design.md` 文件变更清单

解析方：`src/change-list.js`

规则：

- 查找 `## 文件变更清单` 或 `### 文件变更清单`
- 截取到下一个 `##` 标题
- 解析 Markdown 表格
- 取第二列作为文件路径
- 忽略空路径、`—`、`-`、`.sillyspec/` 开头路径

消费者：

- `worktree-apply.js` 用它作为 allow list
- verify/archive prompt 要求人工对照

如果清单为空，`applyWorktree()` 不做 allow list 限制。

## `plan.md` 和 `tasks/task-NN.md`

`plan.md` 创建方式：plan 阶段“展开任务并分组”prompt 写入。

`run.js completeStep()` 在该步骤完成后读取 `plan.md`。如果能解析到 `- [ ] task-XX:` 格式的任务，会通过 `buildPlanSteps(changeDir, planContent)` 动态插入“生成任务蓝图（子代理并行）”步骤。

`tasks/task-NN.md` 创建方式：动态任务蓝图协调器 prompt 要求子代理写入。

当前 `tasks/task-NN.md` frontmatter 模板包含：

- `id`
- `title`
- `priority`
- `estimated_hours`
- `depends_on`
- `blocks`
- `allowed_paths`
- `provides`（可选，跨任务字段契约：provider 声明产出的 contract + fields）
- `expects_from`（可选，跨任务字段契约：consumer 声明依赖某 provider 的 contract + needs，plan-postcheck 会与 provider 的 `provides` 对账）
- `low_risk`（可选，type-only / 机械迁移等低逻辑风险 task 声明 `true`：execute task review gate 在该 task 缺 review.json 时豁免，只发 warning 不阻断）

## `verify-result.md`

路径：`.sillyspec/changes/<change>/verify-result.md`

创建方式：verify 阶段最后一步 prompt。

`run.js` 不生成报告正文；verify 阶段完成时依次执行：

1. `validateVerifyOutputs`：文件必须存在、结论非 FAIL、集成证据满足风险门控，否则阻断并回滚阶段状态。
2. CLI 实测对账（`verify-postcheck.js`）：执行 `local.yaml` 的 `commands.test`，结果写 `.runtime/verify-runs/<ts>/test-result.json`；自报告通过但实测失败 → 阻断完成。未配置 test 命令时降级 warning。

均通过后才提示下一步 `sillyspec run archive`。

## `module-impact.md`

路径：`.sillyspec/changes/<change>/module-impact.md`

创建方式：archive 阶段 `extract-module-impact` prompt。

`run.js` 在该步骤完成后会尝试加载 `.sillyspec/workflows/archive-impact.yaml` 并执行 workflow post-check，然后把检查结果保存到 `.sillyspec/.runtime/workflow-runs/`。

## scan 文档

目标目录：`.sillyspec/docs/<project>/scan/`

当前 scan 定义要求 7 份核心扫描文档：

- `ARCHITECTURE.md`
- `CONVENTIONS.md`
- `STRUCTURE.md`
- `INTEGRATIONS.md`
- `TESTING.md`
- `CONCERNS.md`
- `PROJECT.md`

`scan` step 2 之后，`run.js` 会把所有带 `perProject: true` 的步骤按项目展开，并在 `.sillyspec/.runtime/scan-projects.json` 记录已展开状态。

## 模块文档

目标目录：`.sillyspec/docs/<project>/modules/`

| 文件 | 当前创建/维护方 |
|---|---|
| `_module-map.yaml` | scan 可选步骤；`sillyspec modules rebuild` 会按模块卡片重建骨架 |
| `<module>.md` | scan 可选步骤；archive `sync-module-docs` prompt；quick prompt |
| `dependencies.md` | `generateDependenciesMd()` 可生成，但当前 CLI 没有直接暴露该函数 |

`sillyspec modules rebuild` 不是全量源码重扫。它会保留/合并模块卡片并生成骨架，输出也明确提示 tags、entrypoints、main_symbols、depends_on、used_by 需要重新 scan 或手动补充。

## quicklog

路径：`.sillyspec/quicklog/QUICKLOG-<git-user>.md`

创建方式：**CLI 接管**（`src/quicklog.js`，O_EXCL lockfile 串行化，无新 npm 依赖）。quick 启动（`runStage` guard 首次写入）时，CLI 持锁分配 ql-ID 并写「进行中」条目（描述取任务位置参数/`--input`），同时向每个关联变更的 tasks.md 追加未勾选 task；step 3 完成（`completeStep` quick 收尾）时，CLI 强校验条目存在 + 校验 step3 `--output` 结构（需求/根因/方案/结果）后翻「已完成」+ 追加结果块 + 勾选 task。Agent 全程不手写 QUICKLOG / tasks.md。

格式规则（`allocateQuicklogEntry`）：

- ID 为 `ql-YYYYMMDD-NNN-XXXX`
- `NNN` 每天从 001 递增（锁内扫描所有 `QUICKLOG-*.md` 当天最大序号 +1，并发安全）
- `XXXX` 是 4 位随机十六进制后缀（`crypto.randomBytes`，当天查重）
- 启动写「进行中」，step 3 完成改「已完成」+ 追加结果块
- step 3 的 `--done --output` 是「结果：」归档的唯一来源，须按 **需求/根因/方案/结果** 模板给全（见 `src/stages/quick.js` step 3 prompt）；`completeStep` 对该 output 做结构校验（`validateQuickResult`，只查必填字段齐全、不判内容质量），缺字段则本次不完成（回滚 step + exit 1），补全后重跑 `--done`。多行结果写成字段化块（每字段一行）；单行结果仍写 `结果：<一句话>`
- 超过 500 行时 CLI 轮转为 `QUICKLOG-<USER>-YYYY-MM-DD.md`（日期取最后记录日期）

幂等：分配判据是 session guard.json 的 `quicklogId` 字段（跨进程可靠），同 sessionId 重入不重复分配/写条目。收尾强校验：条目被删或缺失时 `completeStep` 阻断 `--done`（治「报 SAFE 但漏写」缺陷）；guard 缺失（brownfield）不阻断，兜底补写一条记录。这些写入、轮转、状态机、锁由 `src/quicklog.js` 的 JS 函数完成，不再由 AI 按 prompt 执行。

并发与原子写（`writeAtomic`）：锁只保证**写者互斥**（多 quick 会话串行），但 **reader 不持锁**（agent `cat`、dashboard 轮询、commit 收集），锁挡不住 reader。故所有「读-改-写」路径（`completeQuicklogEntry` 翻状态、`rotateIfNeeded` 同日已轮转分支、`checkTaskCheckbox` 勾选）经 `writeAtomic` —— 同目录临时文件 + `rename` 原子覆盖，reader 永远读到完整旧版或完整新版，绝不读半截/空。Windows 差异：`rename` 覆盖正被读取的目标会抛 `EPERM/EBUSY`，故 `writeAtomic` 为 async，对占用类错误做退避重试；这也让上述三个函数为 async。追加路径（`allocateQuicklogEntry` 的条目 append、`appendTaskCheckbox`）走 `appendFileSync`（O_APPEND 单次追加原子），无需原子包装。

## 归档目录

目标目录：`.sillyspec/changes/archive/<date>-<change>/`

当前移动目录由 `run.js` 执行：

- archive 第 4 步是“确认归档”。
- 执行 `sillyspec run archive --done --confirm --output "确认归档"` 时，`run.js` 会把 `.sillyspec/changes/<change>/` 移动到 `.sillyspec/changes/archive/<date>-<change>/`。
- 移动后会调用 `ProgressManager.unregisterChange()`，注销 active change。
- 如果没有带 `--confirm`，`run.js` 会把第 4 步回退为 pending，清除该步输出，并提示补上 `--confirm`。

第 5 步“更新路线图和提交”只负责后续人工收尾，不再移动目录。
