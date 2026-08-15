# execute（波次执行）阶段提示词

> **源文件**：`src/stages/execute.js`
> **阶段定位**：子代理并行 + 强制 TDD + 两阶段审查
> **类型**：主流程阶段
> **全局角色 persona**：高级工程师（先读规范再写代码，严格遵循 CONVENTIONS.md 和 plan.md；按 plan 搬砖，发现 plan 不合理就停下来反馈）
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README](./README.md)）
> **步骤总数**：12（4 前缀 + 3 Wave + 3 验收 + 2 后缀；Wave 步数随 plan.md 变化）

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/12：进度确认

**元数据**
- optional：false
- outputHint：当前状态 + 执行范围
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
检查当前进度，确认可以执行 execute。用 `sillyspec progress show` 查流程进度，不要用 `sillyspec status`（项目级快照，不推进流程）。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 execute
3. 如果不是 → 检查是否有未完成的 tasks.md
4. 确认执行范围（$ARGUMENTS 指定 wave/task 或全部）

### 输出
当前状态 + 执行范围确认
````

---

## Step 2/12：加载上下文

**元数据**
- optional：false
- outputHint：上下文摘要
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `<project>` → 当前项目名（出现在 `.sillyspec/docs/<project>/...` 路径模板中）

**提示词原文**

````markdown
加载计划、设计和代码库上下文。

### 操作
1. 读取 tasks.md（执行计划）
2. 读取 design.md（技术方案）
3. 读取 CONVENTIONS.md、ARCHITECTURE.md
4. 读取 local.yaml（构建命令）；若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取
5. 加载项目总览 `.sillyspec/docs/<project>/scan/PROJECT.md`（如存在）

### 模块文档加载
6. 读取 `.sillyspec/docs/<project>/modules/_module-map.yaml`（不存在则跳过以下步骤）
7. 根据 plan.md 中的任务文件路径匹配 _module-map.yaml 中的模块
8. 读取匹配到的 `.sillyspec/docs/<project>/modules/<module>.md`
9. 实现代码时遵循模块文档中描述的接口约定、数据流和依赖关系
10. **利用模块索引快速定位源码**：
    - 用 entrypoints 字段直接找到模块对外 API 的源码位置
    - 用 main_symbols 字段找到核心类/函数的定义位置
    - 子代理优先读模块卡片理解语义，再读 entrypoints/main_symbols 对应的源码

### 符号影响面扩展检查
11. **符号影响面扫描**（Critical — execute 前必做）：
    - 读取所有 tasks/task-NN.md，提取每个任务涉及的修改文件
    - 对每个修改文件，检查是否涉及以下变更类型：
      - class 构造函数参数变更（新增/删除/修改参数）
      - 接口（interface）定义变更
      - DTO / 类型定义变更
      - API client 方法签名变更
      - 函数/方法签名变更（参数增删改）
    - 如果涉及上述变更类型，执行调用点搜索：
      ```bash
      rg "new ClassName(" src/
      rg "ClassName(" src/
      rg "methodName(" src/
      rg "import.*from.*filePath" src/
      ```
    - 将搜索到的调用点与 plan.md 和 tasks/task-NN.md 的 allowed_paths 对比
    - **发现调用点不在任何 task 的 allowed_paths 中 → 直接阻断 execute**
    - 报告：列出每个受影响符号、调用点位置、是否在任务范围内
    - 如果调用点不在范围内但任务明确写了"不改原因"，记录但不阻断

### 输出
已加载的上下文摘要（含模块文档 + 源码锚点）
````

---

## Step 3/12：确认 worktree 路径

**元数据**
- optional：false
- outputHint：worktree 路径 + 分支名 + 模式
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `<change-name>` → 当前变更名（出现在 `sillyspec worktree meta <change-name>` 命令模板中）

**提示词原文**

````markdown
确认当前 worktree 状态，提取隔离路径。

### 操作
1. 运行 `sillyspec worktree meta <change-name>` 读取 meta.json
2. 从输出中提取 worktreePath、branch、mode 字段
3. 确认 worktree 目录存在（如果是 worktree/native-worktree 模式）
4. **确认工具链可用**：worktree 内项目工具链（lint/format/test 二进制，如 ruff / prettier / uv）可能不全——对本次会用到的工具先跑一次 `--version` 确认；缺失则按项目方式安装（Python 项目 `uv tool install ruff` / `uv sync`，Node 项目 node_modules 已由 CLI 链接主仓）。不要等到 commit 才发现二进制不在 PATH 被 hook 拦。**Python 项目注意**：worktree 自建 .venv 只含 pyproject 声明依赖，pytest 等 dev 工具可能缺失——优先在 worktree 内补装（`uv sync --group dev` / `uv pip install pytest`），**不要回退用主仓 venv 跑测试**（主仓 venv 加载的可能是主仓代码而非 worktree 代码，环境不一致会掩真 bug）

### 铁律
- **worktree 已由 CLI 在 execute 阶段启动时自动创建，不要自行创建或跳过**
- **后续所有子代理的 cwd 必须设为该 worktree 路径**
- 如果 meta.json 不存在（说明创建失败），停止并报错
- **不要自行检查 git dirty/uncommitted 状态来判断是否可以进入 worktree，CLI 已自动处理**

### 输出
worktree 路径 + 分支名 + 模式


````

---

## Step 4/12：确认执行范围

**元数据**
- optional：false
- outputHint：Wave 分组 + 模型分配
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `{KNOWLEDGE_HIT_REPORT}` → `knowledge-match.js` 的 `matchKnowledge()` 命中报告（基于 changeName + plan.md 任务名匹配 `knowledge/` 目录条目），同时落盘 `.runtime/knowledge-hit-report.json`；无命中时为 `Status: no matches` 文本

**提示词原文**

````markdown
解析任务，确认执行范围和确认模式。

### 操作
1. 从 plan 中解析 Wave 分组和任务列表
2. 模型档位：若 tasks.md 中某 task 标注了 [model:xxx]，启动该 task 子代理时按标签选模型（档位由 plan 阶段或用户在 tasks.md 显式标注，execute 不在此自动建议——关键词→档位无统一映射，自动建议反而易误导）
3. 确认频率：默认每个 Wave 完成后展示结果（wave 模式）；用户口头指定按 Task 展示或全自动时遵从
4. 查询知识库：读取 `.sillyspec/knowledge/INDEX.md`，根据 Task 关键词匹配

### 知识命中报告
{KNOWLEDGE_HIT_REPORT}

如上所示的知识条目与本次任务相关。请阅读这些条目以获取项目约定和已知模式。
如无命中条目（Status: no matches），跳过本节。

### 铁律
- **不要询问用户确认频率**，默认 wave 模式；用户已明确口头指定时遵从其指定
````

---

## Step 5/12：Wave 1 执行

**元数据**
- optional：false
- mode：`implementation`
- outputHint：Wave 1 执行结果
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 `platformOpts.specRoot`（出现在 review.json 与 contract-artifacts 路径中）
- `{EXECUTE_RUN_ID}` → 当前 execute run 的固定 ID（从 `.runtime/current-execute-run-id-<change>` 读，无则 `generateExecuteRunId()` 生成并落盘），用于 `review.json` 路径
- `<change>`、`<module>` → 字面文案（路径/模块名模板，非标量占位符）

**本步出现的 include 指令**
- `{{include: testcase-design}}` → include 指令：`resolvePromptIncludes` 在占位符替换前，把仓库根 `templates/prompts/testcase-design.md` 的「测试用例设计」6 条检查（边界/异常、断言有效、测行为不测实现、契约与回归、时间敏感分支、隔离确定性）拉进「子代理 prompt 要点」第 5 项后，供调度者整段复制进子代理 prompt（任务含测试代码时）

**提示词原文**

````markdown## Wave 1: 执行以下任务

## 执行方式（必须严格遵守）

**每个任务必须由独立子代理执行，你不要自己写代码。**

你的角色是调度者 + 审查者：
1. 为每个任务启动一个子代理（Agent tool），同 Wave 内可并行
2. 子代理完成后审查结果
3. 勾选 plan.md 中的 checkbox
4. 记录改动文件和测试结果


### 工作目录（必须严格遵守）

调用 Task 工具启动子代理时，**workdir 参数是强制必传的**。
不传 workdir 会导致子代理把文件写到主工作区而非 worktree，破坏隔离。

```json
{
  "subagent_type": "general",
  "workdir": "/tmp/worktrees/demo-change",
  "prompt": "在此编写任务描述..."
}
```

### 注意
蓝图文件（tasks.md / design.md / proposal.md / requirements.md）在主工作区 .sillyspec/changes/<change>/ 下，它们可能不在 worktree 中。读取蓝图时使用主工作区路径，不要拼接到 worktree 路径下。

### 派发后端提示：SillyHub MCP 已配置但路径A 未落地

检测到 local.yaml mcp 段或 env 配置，但 SillyHub `dispatch_worker` 尚不支持 `worktree_path`（路径A 跨仓未落地）。本次派发走 Local（本机 Agent tool），与默认行为一致——上方「执行方式」与「工作目录」段适用。

### 任务摘要（按需读取完整蓝图）
为每个任务启动子代理时，**只需告知任务目标和蓝图文件路径，让子代理按需读取**：

task-01: 默认任务 1 (TBD) → task-01.md

子代理 prompt 要点：
1. 任务目标（简短描述）
2. 蓝图文件路径（让子代理自行读取详情）
3. 编码铁律：先读后写、TDD、不编造方法、只做蓝图里写的事、遵守边界处理规则、不超出 allowed_paths
4. 如存在模块文档（.sillyspec/docs/*/modules/），按需读取涉及模块的 <module>.md 参考接口约定和数据流
5. 任务含测试代码时，把下方「测试用例设计」整段复制进子代理 prompt，要求子代理按此设计测试用例

{{include: testcase-design}}

### Wave 开始前
1. 读取 design.md 的「非目标」与「兼容策略」章节（如存在），确保子代理不超范围、不破坏旧逻辑
2. 读取 plan.md 了解全局任务划分和依赖关系
3. 确认本 Wave 的输入/输出契约（前置 Wave 产出了什么，本 Wave 需要消费什么）
4. 检查前置 Wave 的产出是否完整（文件是否存在、测试是否通过）
5. **上下文分层加载**：
   - 🔥 热上下文：design.md 非目标/兼容策略 + 当前 Wave 任务（必须加载）
   - 🌡️ 温上下文：CONVENTIONS.md + ARCHITECTURE.md（需要时加载）
   - ❄️ 冷上下文：其他变更的 design.md、历史 plan.md（不要主动加载，除非明确需要）

### 中断续跑（如曾中断恢复）
execute 按 Wave 持久化进度，task 级进度靠 plan.md checkbox 勾选。若本 Wave 曾因 429/API 配额/崩溃中断：
- plan.md 中**已勾选 `- [x]` 的 task 已完成，跳过不重跑**（子代理也可能在完成前中断，重跑前先确认该 task 产出文件是否完整）
- 用 `sillyspec status` 查当前进度，重新 `sillyspec run execute` 会回到当前 Wave step 继续，**不要从零重置或重跑已完成 Wave**
- 本 Wave 已完成但不完整（产出缺文件）的 task 补做，不牵连其他 task


### 本 Wave 任务
- [ ] 默认任务 1 (TBD)

### 调度要求
1. **同一 Wave 内的任务必须并行启动子代理，禁止串行等待。** Wave 的定义就是"无依赖、可并行"，不要自行分析依赖关系。如果有依赖应该在 plan.md 的不同 Wave 中。
2. **Reverse Sync**：子代理报告实现与 design.md 不一致时，先检查是代码错了还是文档有遗漏
3. **不要频繁编译！** 编译很慢，只在以下情况运行：
   - 写了大量代码后需要验证语法正确性
   - 最后一个 Wave 完成后做一次全量编译验证
   - 用户明确要求编译时
4. 每个任务完成后：
   - **先写 review.json 再勾选 checkbox**（见下方 Task Review Gate）
   - **既跑 lint check 也跑 formatter**：凡变更涉及的源码跑项目的 lint 检查 **和** 格式化（如 `ruff format` / `prettier --write`），不要只跑 check——只 check 不 format 会把格式问题留到 commit 时被 pre-commit hook 拦截（worktree 内二进制可能缺失，先 `which <bin>` 确认，缺则 `uv tool install` / `uv sync`）
   - 记录改动文件和测试结果
5. 遇到 BLOCKED → 记录原因，选择：重试/跳过/停止

### Task Review Gate（必须执行，不可跳过）

每个子代理完成后、勾选 checkbox **之前**，你必须创建 task review。

**操作步骤：**
1. 读取当前 task 的 git diff（从 task 开始到完成的变更）
2. 对照 plan.md 中该 task 的描述和 tasks/task-XX.md（如果存在）检查实现是否符合要求
3. 写入 review.json 文件
4. **只有 review.json 写入成功后，才允许勾选 plan.md 中的 checkbox**

**review.json 路径：**

task-XX 对应：{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json

本 execute run 的固定 ID 是：{EXECUTE_RUN_ID}
**所有 task 的 review.json 必须使用这个 ID，不要自行创建新目录。**

**review.json 必填字段：**

{ "name_zh": "任务评审", "schemaVersion": {REVIEW_SCHEMA_VERSION}, "task": "task-XX", "base": "<git-base-commit>", "head": "<git-head-commit>",
 "changedFiles": ["src/foo.js"], "specVerdict": "pass|fail|cannot_verify",
 "qualityVerdict": "pass|fail|cannot_verify", "reviewerNotes": "评审说明",
 "requiredEvidence": [] }

**评审铁律：**
- 不信任 implementer 自报结果，对照 diff 和 task brief 验证
- 只看当前 task 的 diff，不做全仓库漫游审查
- `cannot_verify` 只在确实无法验证且有待补充证据时使用，且 requiredEvidence 必须非空
- `sillyspec run execute --done` 会校验所有 task 的 review.json，缺失或 fail 会阻断完成

### module-impact.md 更新（主代理在本 Wave 所有 task 完成后汇总）
本 Wave 内所有 task 子代理完成、review.json 写好后，**由你（主代理/调度者）**汇总本 Wave 的实际代码变更，更新 {SPEC_ROOT}/changes/<change>/module-impact.md（plan 阶段已生成首版）：
- 基于本 Wave 各 task 的实际 git diff（不是计划）+ {SPEC_ROOT}/docs/<project>/modules/_module-map.yaml 对照
- 更新受影响模块的影响类型/说明（实际改动可能与 plan 首版预估不同，据实修正）
- **不由各 task 子代理分别改**（同 Wave 并行子代理改同一文件会互相覆盖）——只由主代理在 Wave 收尾统一更新一次
- 无 _module-map.yaml 时跳过模块匹配，仅按文件清单更新 unmapped 部分
这是可选更新（不阻断 execute 完成），但保持 module-impact 与实际变更一致利于 verify 核对与 archive 终审。

### 完成后
1. 为每个后端 router task，扫描变更文件提取 API 端点 artifact：
   - 在变更文件中搜索所有 router 注册路径（@router.get/post/put/delete）
   - 将端点清单写入 {SPEC_ROOT}/.runtime/contract-artifacts/<task-name>/endpoints.json
   - 格式: { "task": "task-XX", "type": "backend_endpoints", "endpoints": [{ "method": "GET", "path": "/api/ppm/xxx" }] }

````

---

## Step 6/12：Wave 2 执行

**元数据**
- optional：false
- mode：`implementation`
- outputHint：Wave 2 执行结果
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `{SPEC_ROOT}`、`{EXECUTE_RUN_ID}`、`<change>`、`<module>` — 同 Step 5

**提示词原文**

Wave 2 的 prompt 结构与 Step 5（Wave 1）**完全相同**，由同一个 `buildWavePrompt(wave, waveIndex, changeDir, worktreePath)` 函数生成（`src/stages/execute.js`）。两者唯一的差异在标题（`## Wave 2: 执行以下任务`）、`本 Wave 任务` 复选项与任务摘要中的 task 名（默认 3-wave 示例中 Wave 2 的 task 摘要为 `task-01: 默认任务 2 (TBD) → task-01.md`，本 Wave 任务为 `- [ ] 默认任务 2 (TBD)`）。

完整 prompt 模板请对照 [Step 5（Wave 1）](#step-512wave-1-执行)。实际各 Wave 的 **task 摘要、contractInjection（跨 task 端点/字段契约）、prototypeInjection（HTML 原型引用）随 plan.md 变化**——示例中 contractInjection/prototypeInjection 均为空字符串（无契约 / 无原型）；真实 plan.md 命中契约/原型时，`### API Contract Matrix`、`### 子代理 task-XX 的端点契约注入`、`### 子代理 task-XX 的字段契约注入`、`### 📐 原型参考（brainstorm 可视化确认）` 等段会插入到「Wave 开始前」与「本 Wave 任务」之间。**Task Review Gate** 段（强制每个 task 完成后、勾 checkbox 前写 `review.json`）原文保留在 Wave 1 完整 prompt 中，不在此重复粘贴。

---

## Step 7/12：Wave 3 执行

**元数据**
- optional：false
- mode：`implementation`
- outputHint：Wave 3 执行结果
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `{SPEC_ROOT}`、`{EXECUTE_RUN_ID}`、`<change>`、`<module>` — 同 Step 5

**提示词原文**

Wave 3 的 prompt 结构与 Step 5（Wave 1）**完全相同**，由同一个 `buildWavePrompt(wave, waveIndex, changeDir, worktreePath)` 函数生成（`src/stages/execute.js`）。两者唯一的差异在标题（`## Wave 3: 执行以下任务`）、`本 Wave 任务` 复选项与任务摘要中的 task 名（默认 3-wave 示例中 Wave 3 的 task 摘要为 `task-01: 默认任务 3 (TBD) → task-01.md`，本 Wave 任务为 `- [ ] 默认任务 3 (TBD)`）。

完整 prompt 模板请对照 [Step 5（Wave 1）](#step-512wave-1-执行)。contractInjection / prototypeInjection / Task Review Gate 的处理方式与 Step 6 一致，不在此重复粘贴。

---

## Step 8/12：对照设计检查

**元数据**
- optional：false
- mode：`acceptance`
- outputHint：设计对照检查清单
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `{REVIEW_TIER}` → 审查分级：`self`（当前 agent 自审）或 `independent`（强制独立子代理 + review.json）。由 `review-tier.js` 的 `classifyReviewTier({planLevel, designPath})` 按 plan_level / 变更文件数判定
- `{REVIEW_TIER_REASON}` → 分级理由文案（如 `变更文件 3 ≤ 3` 或 `plan_level=none...`）
- `{REVIEW_JSON_CONTRACT}` → `stage-review.js` 的 `renderReviewJsonContract()` 产出的 review.json 产物契约 markdown（schema + 完整示例 + docHash 算法）；execute 阶段主审查文档为 `design.md`

**提示词原文**

````markdown（Wave 3 的 prompt 由 `buildWavePrompt(wave=3, ...)` 生成，结构与 Step 5（Wave 1）**完全相同**——包含相同的角色调度 / Task Review Gate / **主代理 Wave 后汇总更新 module-impact** 等所有段落。两者唯一差异：标题为「## Wave 3: 执行以下任务」、「本 Wave 任务」复选项与任务摘要中的 task 名（默认 3-wave 示例的 Wave 3 task）。完整 prompt 模板见 Step 5。）
````

---

## Step 9/12：运行测试

**元数据**
- optional：false
- mode：`acceptance`
- outputHint：测试结果摘要
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
运行所有测试，验证代码质量。

### 执行方式
本步骤由当前 agent 执行，不需要启动独立子代理。

### 操作
1. 读取 local.yaml 获取构建和测试命令；若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取
2. 运行测试套件（单元测试、集成测试）
3. 运行 lint 检查 **+ 格式化**：凡变更涉及的源码，既跑 lint check 也跑 formatter（如 `ruff format` / `prettier --write` / `black`），不要只跑 check——只 check 不 format 会把格式问题留到 commit 时被 pre-commit hook 拦截
4. 如果有测试失败 → 分析原因，标注是代码问题还是测试本身的问题
5. 汇总测试结果

### 铁律
- 长测试/构建/lint 命令必须**前台同步执行**，禁止 run_in_background:true / & / nohup / disown——后台任务易被会话生命周期回收导致中断无果

### 输出
测试结果摘要：通过/失败/跳过数量 + 失败项分析
````

---

## Step 10/12：代码审查

**元数据**
- optional：true
- mode：`acceptance`
- outputHint：代码审查结果
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
对本次变更进行代码审查。

### 执行方式
本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。

### 操作
1. 检查 git diff 查看所有变更
2. 审查要点：
   - 代码风格是否符合 CONVENTIONS.md
   - 是否有明显的 bug 或安全漏洞
   - 是否有未处理的 TODO/FIXME
   - 错误处理是否完善
   - 是否有冗余代码或可简化的逻辑
3. 对照 ARCHITECTURE.md 检查架构合规性

### 输出
审查结果：问题列表（严重程度 + 建议修复方式）+ 总体评价
````

---

## Step 11/12：知识库审阅

**元数据**
- optional：true
- outputHint：知识条目数量
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
检查本轮执行产生的新知识。

### 操作
1. 检查 `.sillyspec/knowledge/uncategorized.md` 中待确认条目
2. 如有 → 提示用户审阅
3. 用户确认后改为 [已确认]，可归类到专题文件

### 输出
新知识条目数量 + 审阅提示（或"无新知识"）
````

---

## Step 12/12：完成确认

**元数据**
- optional：false
- outputHint：apply 结果
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `<change-name>` → 当前变更名（出现在 `WorktreeManager().getMeta('<change-name>')` 与 `sillyspec worktree assess/apply/diff/cleanup <change-name>` 命令模板中）

**提示词原文**

````markdown
所有任务完成后的收尾。

先检查当前 worktree 的隔离模式：
```bash
node -e "import('./src/worktree.js').then(w => { const wm = new w.WorktreeManager(); const m = wm.getMeta('<change-name>'); console.log(m ? JSON.stringify({mode: m.mode, path: m.worktreePath}) : 'no meta'); })"
```

### 操作（mode = worktree，SillySpec 创建的隔离 worktree）

**自动审计流程（不需要用户确认代码）：**

1. 运行 `sillyspec worktree assess <change-name>` 自动风险审计
2. 系统自动检查：
   - patch --check 是否通过
   - 变更是否在 allowed_paths 内
   - 主工作区是否有未提交 dirty（拦截；已提交推进交 --3way 自动三路合并）
   - 是否有高风险文件（lockfile/migration/配置/入口）
   - diff 规模是否异常
3. 输出 Apply Decision：

```
Worktree Apply Decision
────────────────────────
Decision: SAFE | WARNING | BLOCKED
Changed files: N
Additions: +N  Deletions: -N
Risky files: none | <list>
Action: auto-applied | blocked
```

4. **SAFE** → 自动 `sillyspec worktree apply <change-name>` + cleanup
5. **WARNING** → 自动 apply（有警告但不阻断）+ cleanup
6. **BLOCKED** → 不 apply，输出原因，提示用户检查：
   - `sillyspec worktree diff <change-name>` 查看具体变更
   - `sillyspec worktree cleanup <change-name>` 丢弃
7. 建议下一步：`sillyspec run verify`

### 操作（mode = native-worktree，用户已有的 linked worktree）
1. 同上自动审计流程
2. SAFE/WARNING → `sillyspec worktree apply <change-name>`
3. **不要运行 cleanup**
4. 输出 Worktree: kept
5. 建议下一步：`sillyspec run verify`

### 操作（mode = in-place-fallback，降级模式无隔离目录）
1. 展示本次执行摘要（`git diff` 查看变更）
2. 跳过 apply 和 cleanup
3. 输出 Worktree: none
4. 建议下一步：`sillyspec run verify`

### 输出
Apply Decision + 下一步建议

### 注意
- 完成后运行 `sillyspec run execute --done` 即可自动推进阶段
````

---

## 动态步骤说明

execute 是**动态阶段**，steps 由 `buildExecuteSteps(planFilePath, options)`（`src/stages/execute.js`）在运行时生成，构成如下：

| 段 | 步数 | 来源 | 说明 |
|---|---|---|---|
| 固定前缀 | 4 | `fixedPrefix` | 进度确认 → 加载上下文 → 确认 worktree 路径 → 确认执行范围（含知识库命中报告） |
| Wave 执行 | N | `buildWavePrompt(wave, waveIndex, changeDir, worktreePath)` | N = `parseWavesFromPlan(plan.md)` 解析出的 Wave 数；**无 plan 或解析不到 task 时默认 3 Wave**（向后兼容） |
| 全局验收 | 3 | `acceptanceSteps` | 对照设计检查（`mode: acceptance`，含 review.json 契约）→ 运行测试 → 代码审查 |
| 固定后缀 | 2 | `fixedSuffix` | 知识库审阅 → 完成确认（worktree apply/cleanup） |

### Wave 数随 plan.md 变化

- 默认 3-wave 示例：N=3，总步骤数 = 4 + 3 + 3 + 2 = 12（即本文档展示的情况）。
- 真实 plan.md 有 M 个 Wave：总步骤数 = 4 + M + 3 + 2 = 9 + M。
- light/none plan.md（`## Tasks` 下直接列 task、无 `## Wave N` 标题）：`parseWavesFromPlan` 识别隐式任务区，**遇含 task-XX 编号的 checkbox 时惰性创建隐式 Wave** 收容，详见 `src/stages/execute.js` 的注释与 `docs/sillyspec/plan-light-needs-wave-heading.md`。

### Wave prompt 含契约 / 原型注入（示例中为空）

`buildWavePrompt` 会根据 plan.md / changeDir 动态插入以下段落（位置：`### Wave 开始前` 与 `### 本 Wave 任务` 之间）：

- **contractInjection（跨 task 契约）**：由 `buildContractMatrix(planContent, changeDir)` / `buildConsumerInjection` / `buildContractFieldInjection` 生成，包含 `### API Contract Matrix`、`### 子代理 task-XX 的端点契约注入`（`<contract-injection>`）、`### 子代理 task-XX 的字段契约注入`（`<contract-field-injection>`）。命中「provider 漏字段、consumer fallback 编造 → 运行时 403/500」这类 bug 时强制注入。本文档示例 plan.md 无 provider/consumer 契约，故 contractInjection 为空字符串。
- **prototypeInjection（HTML 原型引用）**：扫描 changeDir 下 `prototype-*.html`，命中则生成 `### 📐 原型参考（brainstorm 可视化确认）`，提示前端/UI task 照原型实现而非凭文字重新发明。本文档示例无原型文件，故 prototypeInjection 为空字符串。
- **worktreeSection**：`options.worktreePath` 非空时生成 `### 工作目录（必须严格遵守）`，含 `"workdir": "${worktreePath}"` 的子代理调用模板。跨仓 task 支持下（`options.ctx` 传入 MultiRepoContext 且本 Wave 含跨仓 task 时），worktreeSection 切换为 **per-task 多值表**（主仓 task workdir=主仓 worktreePath，跨仓 task workdir=跨仓仓根）+ 跨仓 task commit 指引（直接改跨仓仓主干+commit，不经主仓 worktree）+ 双锡点（base_commit/head_commit）说明；无 ctx 或单仓 Wave 时沿用单值 worktreePath（零回归）。本文档示例由 `_extract.mjs` 不传 ctx 跑出，故展示单值版（零回归分支）。

### Task Review Gate 机制

每个 Wave prompt 内嵌 **Task Review Gate** 段（强制每个 task 完成后、勾 checkbox 前写 `review.json`），原文见 [Step 5（Wave 1）](#step-512wave-1-执行) 的完整 prompt。要点：

- `review.json` 路径：`{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json`，其中 `{EXECUTE_RUN_ID}` 是本 execute run 的固定 ID。
- 必填字段：`schemaVersion`、`task`、`base`/`head`（git commit）、`changedFiles`、`specVerdict`/`qualityVerdict`（`pass|fail|cannot_verify`）、`reviewerNotes`、`requiredEvidence`。
- `cannot_verify` 必须配合非空 `requiredEvidence`；verify 阶段会消费 `verify-required-evidence.json` 逐条核验。
- `sillyspec run execute --done` 会校验所有 task 的 review.json，缺失或 `fail` 会阻断 execute 完成。

机制总览见 [README.md「动态阶段说明 → execute」](./README.md#动态阶段说明)。
