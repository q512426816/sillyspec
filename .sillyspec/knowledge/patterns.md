---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Patterns

## Stage Step Pattern

每个阶段对应 `src/stages/` 下的独立模块，导出 `definition` 对象（含 `steps` 数组）。`run.js` 的 `getStageSteps()` 动态加载并逐步执行，支持 `--done`/`--skip`/`--status` 控制。

步骤字段：`name`、`prompt`（markdown 模板）、`outputHint`、`optional`、`perProject`（对多项目展开）。

## Database First

所有状态数据（进度、变更记录）存储在 SQLite（sql.js WASM），路径 `.sillyspec/sillyspec.db`。`src/db.js` 的 `DB` 类封装所有 CRUD。代码不直接操作文件状态来查询进度。

## Progress Management

`src/progress.js` 的 `ProgressManager` 类管理变更阶段状态。所有阶段推进通过 `ProgressManager` 方法，不手动改 DB。

## Stage Registry

`src/stages/index.js` 维护 `stageRegistry`，注册所有阶段定义。新增阶段需在此注册。阶段间转换通过 `ProgressManager` 校验。

## Worktree Isolation

`src/worktree.js` 的 `WorktreeManager` 管理 git worktree 生命周期。execute 阶段默认在独立 worktree 中执行，避免污染主分支。`src/hooks/worktree-guard.js` 提供守卫钩子。

## Platform Mode

平台模式通过 `--spec-dir` 指定规范根目录（specRoot），与源码根目录（sourceRoot）分离。所有 `.sillyspec/` 产物写入 specRoot，禁止写入 sourceRoot（postcheck 校验）。

`run.js` 中三处路径渲染代码处理 `{DOCS_ROOT}`、`{KNOWLEDGE_ROOT}`、`{PROJECTS_ROOT}` 等占位符。

## Postcheck

`src/scan-postcheck.js` 在 scan 完成后强制校验：
- source_root 污染检查
- 7 份 scan 文档完整性
- 文档 header（author/created_at）
- local.yaml 命令有效性
- knowledge 目录和 INDEX.md 引用完整性（平台模式）

## Knowledge Lifecycle

- **写入**：scan 阶段「Extract Project Knowledge」步骤提取
- **索引**：`knowledge/INDEX.md` 维护分类索引
- **消费**：execute 启动时按 Task 关键词匹配读取
- **审阅**：execute 收尾「知识库审阅」步骤检查 uncategorized.md
- **分类**：conventions.md / patterns.md / known-issues.md / uncategorized.md

## validateTaskReviews 真实签名是单 opts 解构，非 (changeDir, {gitDir})

`src/task-review.js` 的 `validateTaskReviews(opts)` 是**单个 opts 对象解构** `{ planContent, runtimeRoot, executeRunId, allowCannotVerify=true, changeDir=null, gitDir=null }`，返回 `{ ok, errors, warnings, requiredEvidence }`。task 蓝图/文档常误写为 `validateTaskReviews(changeDir, {gitDir})`。聚合调用（如 gate/derive）需自行组装：planContent 读 `changes/<c>/plan.md`、runtimeRoot = specBase/.runtime（或平台 runtimeRoot）、executeRunId 从 `<runtimeRoot>/current-execute-run-id-<changeName>` 读、gitDir 优先 WorktreeManager.getMeta().worktreePath（校验 mode!=='in-place-fallback'）。现成范式见 `src/run/gates.js:274-294` 与 `src/machine-interface.js` runGate/runDerive。建议归类到 patterns.md（task-review 调用范式）。

## plan-postcheck 与 worktree-apply 存在既有依赖边，反向复用 filterDeliverableFiles 会成环

worktree-apply.js:21 已 `import { parseAllowedPaths } from './stages/plan-postcheck.js'`——因此 plan-postcheck 侧不能反向 import worktree-apply 的 filterDeliverableFiles（ESM 循环）。需要在 plan-postcheck 内做「流程产物过滤」时，硬编码同口径清单（.sillyspec/changes|.runtime|quicklog + meta.json，保留 .sillyspec/docs/）并注释锚定来源，不引依赖。同类需求先 grep 双向 import 边再决定复用还是同口径复制。（来源：2026-09-06-ir-stage-p3a task-03）

## 对撞实验度量口径（R8 定稿：同任务书/同基线/db 同源取证）

工具对照实验的可比性要件：①任务书 verbatim——从会话库（zcode db.sqlite message 表）挖受试方收到的原始任务消息逐字复用，仅工具指令段替换并告知；②同基线提交起 detached worktree（防捞未来提交+防读对照侧记录，铁律写进受试 prompt）；③度量同源——token/时间线一律取 zcode db 的 model_usage 表（rollout 文件会被清理轮转，db 持久且含子代理），墙钟分解用「主会话空档=子代理墙钟/命令执行窗」归因+进程出生时间（uvicorn/pytest 的 CreationDate）作硬证据钉实现完成时刻；④测试口径归一——两边「全量 pytest」的实际范围可能不同（local.yaml commands.test vs 仓默认 pyproject/Makefile），耗时对比须拆出标注，防把命令源差异算成工具差距。R8 实测参考值：单上下文 vs 派发=实现墙钟 3.6×、token 0.40×。（来源：2026-09-23 R8 对撞，events-channel 任务）

## 跨工具资产对比的评估纪律——fr/ 索引 vs OpenSpec 全文规格库实例（防再翻案）

2026-09-23 R8 对比报告曾断言「活规格库是 sillyspec 不产出的资产形态」——**错误**，被用户质询后查证收回：sillyspec fr/ 域早有 FR 条目 + Given/When/Then 场景正文（fr-index.js 从 requirements.md 机械蒸馏，:105 场景行正则 + renderFrLines），且带变更来源/依据决策/最近确认 HEAD/superseded 取代链/全文回源链接，brainstorm 时机器注入（buildKnowledgeInjection：top-3 不同 file、单文件首 40 行截断——预算制）。能力对等面：活库/归档机械更新/需求场景化/格式可校验/防漂移（单一活版本+git 历史），全部打平。真区别只有两条且方向相反：①sillyspec 强在资产机器回流（定额注入+模块卡分级挑卡）与追溯链；②OpenSpec 强在人读体验（自包含全文）与 SHALL/MUST 规范语言纪律。**规模视角的再评估（关键修正）：全文自包含对 agent 上下文是最不友好形态——无预算机制，库大了得「读多撑爆/读漏白存」两病；索引+定额注入是抗规模的构造性答案。跨工具评估资产形态必须分「人读轴」与「机读轴」分别打分，禁止拿人读体验给机读协作工具扣分（本条即实证）。** 若要 OS-parity：规范语言=零成本写作约定；多场景块=中成本（fr-index 单行正则+渲染+存量迁移）；自包含全文库=与单一事实源设计相悖的架构取舍，勿盲目跟。评估纪律：下跨工具结论前先读自己仓的对应物（本次教训：夸 OS 前没读过 fr/stages.md）。（来源：2026-09-23 R8/R9 对撞 + 用户两轮质询实证）
