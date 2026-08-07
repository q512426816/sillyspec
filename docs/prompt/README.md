# SillySpec 各阶段 CLI → Agent 提示词参考

本目录收录 SillySpec 每个阶段（stage）下、CLI 输出给 Agent 的**逐步提示词原文**，供后续编写/调整阶段 prompt 时对照参考。

> **数据保真**：所有 prompt 由 `docs/prompt/_extract.mjs` 机械提取自 `src/stages/*.js` 的运行时 `definition`（动态阶段 plan/execute 由 `buildPlanSteps`/`buildExecuteSteps` 用示例输入跑出真实步骤），落地为 `_extracted.json`。各 `<stage>.md` 的 prompt 正文与该 JSON 逐字一致，未经任何人工改写。

---

## 阶段总览

| 阶段 | 标题 | 类型 | 步骤数 | persona | 源文件 |
|---|---|---|---|---|---|
| [brainstorm](./brainstorm.md) | 头脑风暴 | 主流程 | 8 | 资深架构师 | `src/stages/brainstorm.js` |
| [plan](./plan.md) | 实现计划 | 主流程 | 5（动态） | 技术项目经理 | `src/stages/plan.js` |
| [execute](./execute.md) | 波次执行 | 主流程 | 12（动态） | 高级工程师 | `src/stages/execute.js` |
| [verify](./verify.md) | 验证 | 主流程 | 7 | QA 专家 | `src/stages/verify.js` |
| [scan](./scan.md) | 项目扫描 | 辅助 | 11 | — | `src/stages/scan.js` |
| [quick](./quick.md) | 快速任务 | 辅助 | 3 | 全栈老兵 | `src/stages/quick.js` |
| [explore](./explore.md) | 自由探索 | 辅助 | 1 | 技术探索伙伴 | `src/stages/explore.js` |
| [archive](./archive.md) | 归档 | 辅助 | 5 | — | `src/stages/archive.js` |
| [status](./status.md) | 项目快照 | 辅助 | 3 | — | `src/stages/status.js` |
| [doctor](./doctor.md) | 自检 | 辅助 | 5 | — | `src/stages/doctor.js` |
| [brainstorm-auto](./brainstorm-auto.md) | 自动模式头脑风暴 | 变体 | 4 | — | `src/stages/brainstorm-auto.js` |

> 主流程阶段（brainstorm → plan → execute → verify）通过 `sillyspec run <stage>` 推进，有进度状态机。
> 辅助阶段（scan/quick/explore/archive/status/doctor）在 `stages/index.js` 标记 `auxiliary: true`，无活跃变更时也可执行。
> `brainstorm-auto` 是 auto/full 模式的 brainstorm 变体，不在 `stages/index.js` 的 `stageRegistry` 中。

---

## CLI 注入框架（`src/run/prompt.js` 的 `outputStep`）

Agent 每个 step 实际收到的提示词**不只有 prompt 正文**。`outputStep` 在 `console.log(step.prompt)` 前后会注入下列内容。各 `<stage>.md` 只展示 prompt 正文；以下注入项为所有阶段共有，在此统一说明。

### 输出顺序（每个 step）

1. **header 块**（`` --- `` 包裹）
   ```
   ---
   stage: <stageName>
   step: <i+1>/<total>
   stepName: <step.name>
   project: <projectName>
   change: <changeName>          # 有变更时
   changeDir: <changeDir>        # 有变更时
   ---
   ```
2. **persona**（仅 step 0 注入）— 见下表。
3. **全局护栏 `_globalGuardrails`**（仅 verify 有）— 首步全文注入，后续步注入一行精简提醒 `⛔ 本阶段护栏生效中（禁止破坏性操作，详见首步护栏）`。
4. **模块上下文**（仅 brainstorm / plan / execute）— 基于 `_module-map.yaml` 匹配任务命中的模块，注入 `### 📦 模块上下文` 段（模块职责/风险等级/核心文件/依赖）。
5. **修订上下文**（仅 revision 模式）— `### 🔄 Revision Context`，提示已有产物需更新而非重建。
6. **平台模式 directives**（仅平台模式 `platformOpts.specRoot`）— 路径约束 / Write 工具规则 / workflow yaml 占位符映射；scan 阶段每步注入，其余仅 step 0。
7. **scanProfile directives**（仅 scan）— 子代理上限 / 文档上限约束。
8. **prompt 正文** — `step.prompt` 经 `resolvePromptIncludes`（拉 `{{include: name}}` 外部片段）+ 占位符替换（见下表）后的文本。
9. **上一步用户回答**（仅 `--continue --answer`）— `### 📩 上一步用户回答`。
10. **完成契约**（仅 step 0）— `renderStageContract(stageName)`，从 `stage-contract-spec.js` 渲染的「该阶段机械校验通过条件」（事前预知 == 事后校验）。
11. **铁律**（仅 step 0）— 见下。
12. **路径与平台规则**（step 1+，有 changeName 或平台模式时）— 安全关键，每步提醒。
13. **完成后执行** — 根据 step 的 wait 配置，输出 `--wait` / `--continue --answer` / `--done` 命令模板。

### persona 表（逐字，仅 step 0 注入）

> 源：`src/run/prompt.js` `personas` 对象。只对 brainstorm / plan / execute / verify / quick / explore 这 6 个阶段注入。

| 阶段 | persona 文案 |
|---|---|
| brainstorm | `### 🎯 你的角色：资深架构师`<br>你是一位有 15 年经验的系统架构师。先理解业务本质，再设计技术方案。决策附理由，方案列 trade-off。不确定就说不确定，不猜。 |
| plan | `### 📋 你的角色：技术项目经理`<br>你是一位经验丰富的技术项目经理。任务拆解粒度均匀，依赖关系明确。每个任务有完成标准，Wave 间有依赖说明。条理清晰，不做模糊描述。 |
| execute | `### 💻 你的角色：高级工程师`<br>你是一位严谨的高级工程师。先读规范再写代码，严格遵循 CONVENTIONS.md 和 plan.md。**你不是设计师，是执行者——按 plan 搬砖，禁止发散思维。** 发现 plan 不合理就停下来反馈，不要自己改方案。代码有清晰职责划分，边界处理完善。少说多做，遇到规范冲突优先问。 |
| verify | `### 🔍 你的角色：QA 专家`<br>你是一位吹毛求疵的 QA 专家。假设所有代码都有 bug，用最坏情况测试。关注边界、异常、并发。有问题直说，用证据说话，不写"看起来没问题"。 |
| quick | `### 💻 你的角色：全栈老兵`<br>你是一位实战经验丰富的全栈工程师。不纠结架构和流程，理解需求就直接干。不确定的地方先问清楚再动手，先读后写，改完就收。问题排查思路开阔，前端报错不一定是前端问题——可能是后端数据、浏览器兼容、甚至设备硬件。解决方案实用接地气，用户描述有误敢于直接指出。 |
| explore | `### 🧭 你的角色：技术探索伙伴`<br>你帮助用户澄清问题、调查代码库、比较方案和暴露风险。探索阶段不写实现代码，不安装依赖，不把讨论强行推进成开发。 |

### 通用铁律（仅 step 0 注入，逐字）

> 源：`src/run/prompt.js` L552-560。

- 文档优先：代码产出必须先有对应的设计/规范文档支撑。
- 只做本步骤描述的操作，不得自行扩展或跳过
- 不要回头修改已完成的步骤
- 不要编造不存在的 CLI 子命令
- 完成后立即执行 `--done` 命令，不得跳过
- 不要用 mv/rename 重命名变更目录，必须用 `sillyspec change-rename <旧名> <新名>`
- 文档类型文件（.md/.yaml/.json 等）头部必须包含 author（git 用户名）和 created_at（精确到秒）
- 执行构建/测试前必须先读 local.yaml，优先使用其中配置的命令、路径和环境变量；未配置时才使用默认值

### 完成后执行命令模板（逐字，根据 wait 配置）

`outputStep` 在每个 step 末尾输出下列之一：

- **`requiresWait: true`**（必须等待用户）：
  ```
  本步骤必须等待用户输入，不能直接 --done：
  sillyspec run <stage> --wait --reason "<waitReason>" --options "<waitOptions 逗号分隔>" --change <change> --output "你的问题/方案摘要"

  用户回答后执行：
  sillyspec run <stage> --continue --answer "用户回答" --change <change>

  收到回答并完成本步骤总结后，再执行：
  sillyspec run <stage> --done --change <change> --input "..." --output "..."
  ```
- **`conditionalWait` / 检测到 WAIT 指令**：先给 `--wait` 分支（"如果需要用户决策"），再给 `--done` 分支（"如果不需要用户决策，正常完成"）。
- **普通步骤**：直接
  ```
  sillyspec run <stage> --done --change <change> --input "用户原始需求/反馈" --output "你的摘要"
  ```

---

## 占位符总表

prompt 正文中出现的占位符，运行时由 `outputStep` 替换。下表为完整映射（源：`src/run/prompt.js`）。

### 标量占位符（`<xxx>` 形式，全局替换）

| 占位符 | 替换为 | 出现阶段 |
|---|---|---|
| `<project>` | 当前项目名（`basename(cwd)` 或 db 项目名） | brainstorm / plan / execute / scan / quick / archive / status / doctor / explore |
| `<git-user>` | `git config user.name`（失败为 `unknown`） | brainstorm / quick / plan(TaskCard) |
| `<now-datetime>` | `YYYY-MM-DD HH:MM:SS`（执行时刻） | brainstorm / scan / plan(TaskCard) |
| `<now-timestamp>` | `YYYYMMDD-HHMMSS` | （预留，prompt 未直接引用） |
| `<now-date>` | `YYYY-MM-DD` | （预留） |
| `<change-name>` | 当前变更名（如 `2026-05-13-user-auth`） | brainstorm / execute / archive / explore |
| `<quick-session-id>` | quick 会话 ID（= changeName = `quick-<uuid8>`） | quick |
| `<quicklog-id>` | 从 `.runtime/quick-sessions/<sessionId>/guard.json` 读 `quicklogId`（未分配则 `(未分配)`） | quick |
| `<linked-changes>` | 从 guard.json 读关联变更列表（无则 `（无）`） | quick |

### 路径根占位符（`{XXX}` 形式，`applyRootPlaceholders` 替换）

| 占位符 | 常规模式替换为 | 平台模式替换为 | 出现阶段 |
|---|---|---|---|
| `{SPEC_ROOT}` | `cwd/.sillyspec` | `platformOpts.specRoot` | 多阶段 |
| `{DOCS_ROOT}` | `cwd/.sillyspec/docs/<project>` | `specRoot/docs/<project>` | scan |
| `{PROJECTS_ROOT}` | `cwd/.sillyspec/projects` | `specRoot/projects` | scan |
| `{WORKFLOWS_ROOT}` | `cwd/.sillyspec/workflows` | `specRoot/workflows` | scan |
| `{KNOWLEDGE_ROOT}` | `cwd/.sillyspec/knowledge` | `specRoot/knowledge` | scan |

### 动态块占位符（运行时生成的大段内容）

| 占位符 | 替换为 | 出现阶段 |
|---|---|---|
| `{KNOWLEDGE_HIT_REPORT}` | `knowledge-match.js` 的 `matchKnowledge()` 命中报告（基于 changeName + plan.md 任务名匹配 `knowledge/` 目录条目）；同时落盘 `.runtime/knowledge-hit-report.json` | execute（确认执行范围步） |
| `{EXECUTE_RUN_ID}` | 当前 execute run 的固定 ID（从 `.runtime/current-execute-run-id-<change>` 读，无则 `generateExecuteRunId()` 生成并落盘） | execute（每个 Wave 执行步，用于 task review.json 路径） |
| `{REVIEW_TIER}` | 审查分级：`self`（当前 agent 自审）或 `independent`（强制独立子代理 + review.json）。由 `review-tier.js` 的 `classifyReviewTier({planLevel, designPath})` 按 plan_level / 变更文件数判定 | brainstorm / plan / execute 的 review 步 |
| `{REVIEW_TIER_REASON}` | 分级理由文案（如 `变更文件 3 ≤ 3` 或 `plan_level=none...`） | 同上 |
| `{STAGE_REVIEW_RUN_ID}` | stage review 运行 ID（从 `.runtime/current-stage-review-run-id-<stage>(-<change>)` 读，无则 `generateStageReviewRunId()` 生成并落盘；注入到 `{REVIEW_JSON_CONTRACT}` 的路径内，保证 prompt 注入的 ID == Stage Review Gate 读取的 ID） | 同上（经契约块内嵌） |
| `{REVIEW_JSON_CONTRACT}` | `stage-review.js` 的 `renderReviewJsonContract()` 产出的 review.json 产物契约 markdown：含 schema（schemaVersion=1、reviewType、verdicts∈pass/fail/cannot_verify、reviewedFiles、docHash）、完整示例、docHash 算法（主审查文档 sha256）。各阶段主审查文档：brainstorm/execute→design.md，plan→plan.md，propose→proposal.md | 同上 |
| `{TASK_COMPLETION_REPORT}` | `task-review.js` 的 `summarizeTaskCompletion({changeDir, runtimeRoot, changeName})` 产出的客观完成度报告：以 execute run 的 review.json verdict（specVerdict+qualityVerdict 均≠fail 视为完成）为准，替代 plan.md checkbox（依赖 autoCheckPlanFromReviews 回填，断裂时失真）；无 runId marker 时降级 checkbox 统计 + 标注 source | archive（Step 1 任务完成度检查） |

> **降级**：当 review-tier / stage-review 注入抛异常时，`{REVIEW_TIER}`→`self`、`{REVIEW_TIER_REASON}`→`分级异常降级 self: <err>`、`{REVIEW_JSON_CONTRACT}`→精简契约提示，避免 prompt 残留裸占位符。

### include 指令

| 形式 | 行为 |
|---|---|
| `{{include: <name>}}` | `resolvePromptIncludes`（`src/run/shared.js`）在所有占位符替换**之前**，把仓库根 `templates/prompts/<name>.md` 文件内容拉进 prompt 正文（代码自动补 `.md` 后缀）。**verify 阶段「对照设计检查」step 使用了 `{{include: verify-probes}}`**（自动探针片段）；**plan 阶段「生成 TaskCard」step 使用了 `{{include: taskcard-rules}}`**（TaskCard 公共格式规则 + 保存前自检，每个子代理 prompt 展开后相同）。 |

> ⚠️ **重要**：本目录各 `<stage>.md` 与 `_extracted.json` 展示的是 `resolvePromptIncludes` **替换前**的 prompt 原文，即保留 `{{include: verify-probes}}` / `{{include: taskcard-rules}}` 字面。agent 实际收到的是替换后的片段内容（运行时从 `templates/prompts/` 读取注入）。要查看展开后的片段全文，读 `templates/prompts/verify-probes.md` 或 `templates/prompts/taskcard-rules.md` 文件。

---

## 动态阶段说明

### plan（`buildPlanSteps(changeDir, planContent)`）

- 步骤构成：3 个固定 LLM 步骤（`stepClassify` 复杂度分类 → `stepGeneratePlan` 生成分级计划 → `stepReviewPlan` 审查计划）+ 1 个动态协调器步骤（`buildCoordinatorStep`，为每个 task 生成 TaskCard 子代理 prompt）+ 1 个 noAI postcheck 步骤（`buildPostcheckStep`，Wave 重排 + 一致性校验，无 prompt）。
- **任务数为 0**（plan.md 无 checkbox task）时，只返回 3 个固定步骤 + postcheck，**不含协调器步骤**。
- 协调器步骤的 prompt 含具体 task 清单与 changeDir，随变更变化；本目录展示的是 **3-task 示例**（task-01/02/03）的生成结果。

### execute（`buildExecuteSteps(planFilePath, options)`）

- 步骤构成：4 个固定前缀步骤（进度确认 → 加载上下文 → 确认 worktree 路径 → 确认执行范围）+ N 个 Wave 执行步骤（`buildWavePrompt`，N = plan.md 的 Wave 数，无 plan 时默认 3）+ 3 个全局验收步骤（对照设计检查 → 运行测试 → 代码审查）+ 2 个固定后缀步骤（知识库审阅 → 完成确认）。
- Wave prompt 含 contractInjection（跨 task 端点/字段契约，无契约时为空）、prototypeInjection（HTML 原型引用，无原型时为空）、worktree 路径段、task 摘要。本目录展示的是**默认 3-wave、无契约/原型**的生成结果，3 个 Wave prompt 内容相同（默认任务名）。
- 每个 Wave prompt 内嵌 **Task Review Gate**（强制每个 task 完成后、勾 checkbox 前写 `review.json`）。

---

## 边缘阶段

- **propose**：`@deprecated`（入口移除 2026-06-14）。不在 `stageRegistry`，但 `stage-review.js` 仍有 propose 的 reviewType/proposal.md 残留逻辑。prompt 仅作历史参考。
- **brainstorm-auto**：auto/full 模式使用的 brainstorm 步骤定义（4 步，合并了交互式 brainstorm 的多步为自动推进）。不在 `stageRegistry`。
- **knowledge**（`src/stages/knowledge.js`）：知识库子命令（search/inspect/validate/refresh/propose），是独立 CLI 命令而非 run stage，结构为子命令式而非 `definition.steps`，故未纳入本目录。通过 `sillyspec-knowledge` skill 调用。

---

## 维护

- 修改 `src/stages/*.js` 的 prompt 后，重跑 `node docs/prompt/_extract.mjs` 刷新 `_extracted.json`，再同步对应 `<stage>.md`。
- 修改 `src/run/prompt.js` 的注入逻辑（persona / 铁律 / 占位符）后，同步更新本 README 的对应小节。
