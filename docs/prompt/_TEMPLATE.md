# 文档骨架规范（子代理照此填写，产出 `docs/prompt/<stage>.md`）

本文件是**填表规范**，不是最终文档。每个阶段产出一个 `<stage>.md`，结构必须与本规范一致。

## 数据来源（保真铁律）

- **静态阶段**（brainstorm / propose / verify / scan / quick / explore / archive / status / doctor / brainstorm-auto）：直接读源码 `src/stages/<stage>.js` 中 `definition.steps[].prompt` 的**模板字符串原文**（真实换行，逐字复制）。
- **动态阶段**（plan / execute）：prompt 在源码里是函数运行时生成的（`buildPlanSteps` / `buildExecuteSteps`），**必须读 `docs/prompt/_extracted.json`** 里对应阶段的 `steps[].prompt`（脚本已用示例输入跑出真实 prompt）。JSON 字符串里的 `\n` 要**还原为真实换行**再写入 md。
- **交叉验证**：所有阶段写完后，prompt 必须与 `_extracted.json` 逐字一致（可用 `diff` 抽查）。

## 硬性规则

1. **prompt 原文逐字复制**：禁止任何改写、概括、翻译、润色、修正标点、补全缩写。中文标点（，。"" 等）、反引号、缩进、空行必须原样。
2. **占位符原样保留**：`{SPEC_ROOT}`、`<change-name>`、`{REVIEW_TIER}` 等保留字面，**不要**替换成实际值（这些是 agent 看到的模板，运行时才替换）。
3. **prompt 用 4 个反引号包裹**：因为 prompt 内部含 3 反引号代码块，外层必须用 `````markdown ... `````（4 反引号）避免冲突。
4. **每个 step 一节**：标题 `## Step N/M：<step.name>`，紧跟元数据 + 占位符 + prompt 原文。
5. **不要遗漏 step**：步骤数必须与 `_extracted.json` 的 `stepsCount` 一致；noAI 步骤（prompt 为空）也要列出，标注"无 prompt（noAI 步骤，CLI 内部执行）"。

## 单阶段文档骨架

````markdown
# <stage>（<title>）阶段提示词

> **源文件**：`src/stages/<stage>.js`
> **阶段定位**：<description 原文>
> **类型**：主流程阶段 ｜ 辅助阶段（auxiliary，无活跃变更时也可执行）
> **全局角色 persona**：<一句话概述，见 README「persona 表」> ｜ 无
> **全局护栏 _globalGuardrails**：<如 verify 有，此处附全文；无则写"无（仅有 CLI 统一铁律，见 README）">
> **步骤总数**：M ｜ 动态阶段写"M（固定 N 步 + 动态生成 K 步，取决于 plan.md 任务数/Wave 数）"

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/M：<step.name>

**元数据**
- optional：true / false
- outputHint：<原文>
- id / mode / noAI / _cliAction：<有则列，无则省略整行>
- 等待配置：<requiresWait / conditionalWait / repeatableWait / maxWaitRounds / waitReason / waitOptions，按 step 实际字段列；都没有则写"无（可直接 --done）">

**本步出现的运行时占位符**（无则省略本小节）
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 specRoot
- `<change-name>` → 当前变更名
- ……（完整映射见 README「占位符总表」）

**提示词原文**

````markdown
<prompt 全文逐字粘贴，4 反引号包裹>
````

---

## Step 2/M：<step.name>
……（同上结构）

---

## 动态步骤说明（仅 plan / execute 需要）

<说明哪些 step 是运行时生成的、依赖什么输入、示例用的输入是什么。例如：plan 的 Step 4「生成 TaskCard」由 buildCoordinatorStep(changeDir, taskNames) 生成，task 列表来自 plan.md；下方展示的是 3-task 示例（task-01/02/03）的生成结果。>
````

## 自检清单（子代理交稿前过一遍）

- [ ] 步骤数 == `_extracted.json` 的 `stepsCount`
- [ ] 每个 prompt 与源码（静态）或 JSON（动态）逐字一致（随机抽 2 处对比）
- [ ] 占位符全部保留字面，未被替换
- [ ] prompt 用 4 反引号包裹，内部 3 反引号代码块未被破坏
- [ ] 元数据字段与源码 step 对象一致（optional / outputHint / wait* / noAI）
- [ ] 动态阶段有「动态步骤说明」小节
