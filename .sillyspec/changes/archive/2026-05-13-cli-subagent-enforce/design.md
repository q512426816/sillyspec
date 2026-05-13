---
author: qinyi
created_at: 2026-05-13T11:00:00
---

# CLI 控制流修复：子代理强制 + currentChange 自动探测

## 动机

当前 CLI 控制流存在 3 个问题：

1. **currentChange 从不自动设置** — `progress.currentChange` 只在 `--change <name>` flag 时设置，但动态蓝图插入依赖它。结果：蓝图步骤永远不会被动态插入，plan 阶段直接跳过蓝图生成。
2. **子代理标记为"可选"** — plan SKILL.md 里子代理指令标记为"可选"，CLI step prompt 里完全不提。主代理串行写 14 个蓝图 → 上下文爆掉。
3. **execute Wave 不强制子代理** — buildWavePrompt() 把 task-N.md 内联给主代理，主代理串行执行 6 个 Wave → 上下文爆掉。

核心设计缺陷：**CLI 输出的 step prompt 不包含子代理指令，而 SKILL.md 的"可选"子代理段落被主代理忽略。**

## 变更范围

4 个文件修改：

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/run.js` | 修改 | + autoDetectChange()、resolveChangeDir()、简化 completeStep 插入逻辑 |
| `src/stages/plan.js` | 修改 | N 个 taskSteps → 1 个协调器步骤，prompt 内强制子代理 |
| `src/stages/execute.js` | 修改 | buildWavePrompt() 加入子代理执行指令模板 |
| `src/stages/brainstorm.js` | 修改 | 新增可选步骤：HTML 原型生成 |

### 不改的文件

- `sillyspec-plan/SKILL.md` — 删除"子代理可选"段落（但这是 skill 文件，不是代码）
- `sillyspec-execute/SKILL.md` — 本来就很薄，无需改

## 设计方案

### 1. currentChange 自动探测

**文件**: `src/run.js`

新增辅助函数 `resolveChangeDir(cwd, progress)`：

```javascript
function resolveChangeDir(cwd, progress) {
  const changesDir = join(cwd, '.sillyspec', 'changes')
  if (!existsSync(changesDir)) return null

  // 1. 优先用 currentChange
  if (progress.currentChange) {
    const target = join(changesDir, progress.currentChange)
    if (existsSync(target)) return target
  }

  // 2. fallback：唯一非 archive 目录
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return join(changesDir, entries[0].name)

  // 3. 多个变更 → 返回 null（需要用户通过 --change 指定）
  return null
}
```

> **注意：** 旧版 `getStageSteps` 中有多个变更时的交互选择器已被移除。多变更场景下，`resolveChangeDir` 返回 null，用户需通过 `--change <name>` 显式指定。

新增 `autoDetectChange(progress, cwd)`：

```javascript
function autoDetectChange(progress, cwd) {
  if (progress.currentChange) return false
  const changesDir = join(cwd, '.sillyspec', 'changes')
  if (!existsSync(changesDir)) return false
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) {
    progress.currentChange = entries[0].name
    return true
  }
  return false
}
```

在 `runStage()` 入口调用 `autoDetectChange()`，自动设置并持久化。

修改 `completeStep()` 中的动态插入逻辑，用 `resolveChangeDir()` 替代直接使用 `progress.currentChange`。

### 2. Plan 蓝图：单步协调器

**文件**: `src/stages/plan.js`

#### 修改 buildPlanSteps()

当 `taskCount > 0` 时，不再生成 N 个 `taskSteps`，改为生成 1 个协调器步骤：

```javascript
// 旧：N 个独立步骤
const taskSteps = []
for (let i = 1; i <= taskCount; i++) {
  taskSteps.push({ name: `写任务蓝图 task-${...}`, prompt: buildTaskPrompt(...) })
}
return [...fixedPrefix, ...taskSteps, ...fixedSuffix]

// 新：1 个协调器步骤
const coordinatorStep = buildCoordinatorStep(changeDir, taskNames)
return [...fixedPrefix, coordinatorStep, ...fixedSuffix]
```

#### 新增 buildCoordinatorStep()

生成一个 prompt，内容包含：
- 任务清单（从 plan.md 解析）
- **强制子代理指令**：明确说"你必须使用 Agent tool 启动子代理"
- 子代理 prompt 模板：每个子代理读取 design.md + plan.md + 源文件，写 task-N.md
- 验收检查：确认所有 task-N.md 文件已生成

#### 修改 run.js completeStep() 的动态插入

简化为：检测到"展开任务并分组"完成时，插入 1 个协调器步骤（而非 N 个）。

```javascript
// 旧：插入 N 个步骤
const taskSteps = fullSteps.slice(prefixLen, suffixLen > 0 ? -suffixLen : undefined)
steps.splice(0, steps.length, ...rebuilt)

// 新：插入 1 个步骤
const changeDir = resolveChangeDir(cwd, progress)
const planFile = join(changeDir, 'plan.md')
const taskNames = parseTaskNames(readFileSync(planFile, 'utf8'))
const coordinatorStep = buildCoordinatorStep(changeDir, taskNames)
const newStep = { name: coordinatorStep.name, status: 'pending' }
steps.splice(currentIdx + 1, 0, newStep)
```

### 3. Execute Wave：强制子代理

**文件**: `src/stages/execute.js`

修改 `buildWavePrompt()` 的返回内容，在 prompt 开头加入：

```
## 执行方式（必须严格遵守）

每个任务必须由独立子代理执行，你不要自己写代码。

你的角色是调度者 + 审查者：
1. 为每个任务启动一个子代理（Agent tool），同 Wave 内可并行
2. 子代理完成后审查结果
3. 勾选 plan.md 中的 checkbox
4. 记录改动文件和测试结果

### 子代理 prompt 模板
\`\`\`
你是高级工程师。严格执行以下任务蓝图，不增不减。
[任务蓝图内容]
[铁律：先读后写、TDD、蓝图有问题停下来反馈]
\`\`\`
```

保留原有的 Wave 执行要求（上下文分层、Reverse Sync 等），作为子代理的约束规则。

### 4. Brainstorm：HTML 原型可选步骤

**文件**: `src/stages/brainstorm.js`

在 `fixedPrefix` 中，在"分段展示设计"（step 8）之后，新增可选步骤"HTML 原型生成"：

```javascript
{
  name: 'HTML 原型生成',
  prompt: `为设计方案生成可交互的 HTML 原型，帮助用户可视化确认。

### 操作
1. 判断本次设计是否适合生成 HTML 原型：
   - 适合：有 UI 组件/布局/交互流程/状态转换
   - 不适合：纯后端逻辑/配置修改/无可视化意义
2. 如果适合，生成一个独立的 HTML 文件（内联 CSS + JS），保存到：
   \`.sillyspec/changes/<变更名>/prototype-<名称>.html\`
3. 原型要求：
   - 单文件，浏览器直接打开
   - 展示关键布局结构和交互流程
   - 不需要完整功能，重点是让用户确认设计方向
4. 展示给用户确认

### 输出
HTML 原型文件路径（或"跳过"如果不适合）`,
  outputHint: '原型文件路径或跳过',
  optional: true
}
```

## 验收标准

- [ ] `sillyspec run plan` 自动探测 change 目录并设置 currentChange
- [ ] Plan 阶段生成 1 个"生成任务蓝图（子代理并行）"协调器步骤
- [ ] 协调器步骤的 prompt 包含强制子代理指令和 prompt 模板
- [ ] Execute Wave prompt 包含强制子代理执行指令
- [ ] Brainstorm 阶段有"HTML 原型生成"可选步骤
- [ ] 所有修改不破坏现有流程（向后兼容）
