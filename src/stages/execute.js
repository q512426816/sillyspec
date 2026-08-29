import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import path from 'path'
import { buildContractMatrix, buildConsumerInjection, buildContractFieldInjection } from '../contract-matrix.js'
import { getRule } from '../stage-contract-spec.js'
import { renderDispatchInstruction } from '../dispatch/strategy.js'
import { isPathASupported } from '../dispatch/backends/sillyhub-mcp.js'
import { readMcpConfig } from '../sillyhub-mcp/config.js'
import { gitQuiet } from '../git-helper.js'
import { parseRepo } from './plan-postcheck.js'
// 模块卡分级解析（token 成本优化 P0a）。注意：module-resolve.js 反向 import 本文件的
// parseTaskRegistry（注册表同口径）——双向引用均为函数声明 + 调用时解引（无模块初始化期
// 交叉求值），ESM live binding 下安全；两边都是纯读函数，无副作用序问题。
import { resolveChangeModuleCards } from '../module-resolve.js'
// 决策锚点触碰事实（2026-08-24-decision-touch-cli-drift task-01，W-A 主渲染点 D-003）：
// changedFiles 口径与 {DOCS_DEBT} 现算同源（collectExecuteChangedFiles 唯一实现，勿双写）
import { collectExecuteChangedFiles, computeDecisionTouches, renderDecisionTouchFacts } from '../docs-debt.js'

/**
 * 任务注册表解析（2026-08-20-task-truth-unify D-001@v1：tasks.md 唯一任务真相）。
 * 行契约：`- [ ] task-01: 名称 [model:xxx] (depends_on: task-01,02)`——标注均可选；
 * ql-xxx 等 task-XX 前缀之外的行（quick 挂载条目）与注册表正交，不收。
 * @param {string} tasksContent - tasks.md 文件内容
 * @returns {Array<{index:number, id:string, name:string, done:boolean, model:string|null, dependsOn:string[], file:string, steps:string, reference:string}>}
 */
export function parseTaskRegistry(tasksContent) {
  const tasks = []
  if (!tasksContent) return tasks
  for (const line of String(tasksContent).split('\n')) {
    const m = line.match(/^[-*]\s*\[([ xX])\]\s*task-(\d+)\b[:：]?\s*(.*)/)
    if (!m) continue
    let name = (m[3] || '').trim()
    let model = null
    const modelMatch = name.match(/\[model:([^\]]+)\]/i)
    if (modelMatch) { model = modelMatch[1].trim(); name = name.replace(modelMatch[0], '').trim() }
    let dependsOn = []
    const depMatch = name.match(/\(depends_on:\s*([^)]+)\)/i)
    if (depMatch) {
      dependsOn = depMatch[1].split(/[,，]/).map(s => s.trim().replace(/^task-/i, '')).filter(Boolean).map(n => `task-${n.padStart(2, '0')}`)
      name = name.replace(depMatch[0], '').trim()
    }
    // 兼容行尾 (文件路径) 尾注（旧 plan 内联习惯在 tasks.md 沿用时同样收容）
    let file = ''
    const fileMatch = name.match(/\(([^()]+)\)$/)
    if (fileMatch) { file = fileMatch[1].trim(); name = name.replace(/\([^()]+\)$/, '').trim() }
    tasks.push({
      index: parseInt(m[2], 10),
      id: `task-${m[2].padStart(2, '0')}`,
      name,
      done: (m[1] === 'x' || m[1] === 'X'),
      model,
      dependsOn,
      file,
      steps: '',
      reference: ''
    })
  }
  return tasks
}

/**
 * 校验 tasks.md（任务注册表）× plan.md（Wave ID 引用）是否满足 execute 执行契约。
 * 新契约（D-001@v1）：任务清单唯一真相在 tasks.md；plan.md Wave 段下为纯 ID 引用行
 * （`- task-01`，不重抄任务名），交叉校验存在性/覆盖恰一次/编号连续。
 * @param {string} tasksContent - tasks.md 文件内容
 * @param {string} planContent - plan.md 文件内容
 * @returns {{ ok: boolean, errors: string[], warnings: string[], tasks: object[], waves: object[] }}
 */
export function validatePlanForExecute(tasksContent, planContent) {
  const errors = []
  const warnings = []
  const plan = String(planContent || '')
  const registry = parseTaskRegistry(tasksContent)

  if (!plan.trim() && !String(tasksContent || '').trim()) {
    return { ok: false, errors: ['plan.md 与 tasks.md 内容均为空'], warnings, tasks: [], waves: [] }
  }

  // 检查 0: Wave 编号带字母后缀（如 "## Wave 2b"）→ 显式报错（坑 plan-wave-letter-suffix）
  const letterSuffixWaves = [...plan.matchAll(/^#+\s*Wave\s+(\d+)([a-z])(?![a-z0-9])/gim)]
  for (const m of letterSuffixWaves) {
    errors.push(
      `Wave 编号带字母后缀：${m[0].trim()}（"${m[1]}${m[2]}"）不被支持。` +
      `解析器只认纯数字编号（"## Wave N"），字母后缀会被截断为 "${m[1]}" 与显式 Wave ${m[1]} 静默合并强制并行。` +
      `解法：改顺序纯数字编号（Wave 3/4…）或并入相邻 Wave`
    )
  }

  // 检查 0.5: 旧格式残留——plan.md 内出现任务名级 checkbox 行（任务清单旧家）→ 指路迁移
  const legacyCheckbox = [...plan.matchAll(/^[-*]\s*\[[ xX]\]\s*task-\d+\b[:：]/gim)]
  if (legacyCheckbox.length > 0) {
    errors.push(
      `plan.md 含 ${legacyCheckbox.length} 处旧格式任务 checkbox 行（"- [ ] task-XX: 名称"）。` +
      `新契约（2026-08-20-task-truth-unify）：任务清单唯一真相在 tasks.md，plan.md Wave 段下只写纯 ID 引用行。` +
      `迁移：把任务 checkbox 行移入 tasks.md（保留 [model:xxx]/(depends_on: …) 行内标注），plan.md Wave 段改为 "- task-XX" 引用行`
    )
  }

  const waves = parseWavesFromPlan(plan, registry)
  const allTasks = registry

  // 检查 0.6: plan_level 锚点缺失（2026-08-21 审查 CLI-5）：plan_level 是 review tier 的
  // 判定主锚（classifyReviewTier）——漏写时静默退文件数启发式，full 级大变更会被降级成
  // self 自审且无人报错（降级方向比 fail 更危险）。与 gates 读侧同口径：任意行 plan_level:。
  const fmLine = plan.split('\n').find(l => l.trim().startsWith('plan_level:'))
  if (!fmLine) {
    errors.push(
      `plan.md 缺 plan_level 锚点。brainstorm 的规模判定落盘（frontmatter 写 plan_level: none|light|full）是 review 分级的主锚，` +
      `漏写会静默退文件数启发式——full 级变更可能被降级自审。修复：在 plan.md frontmatter 补一行，如 plan_level: full`
    )
  } else {
    const planLevelValue = fmLine.split(':')[1].trim()
    if (!['none', 'light', 'full'].includes(planLevelValue)) {
      errors.push(
        `plan_level 值非法：${JSON.stringify(planLevelValue)}（合法值 none|light|full）。` +
        `非法值在 review 分级中被当作无锚点处理，同样会静默退文件数启发式`
      )
    }
  }

  // 检查 0.8: Wave 标题格式不对（W1/波次1 等）→ 引用行不被收容，静默退化隐式单 Wave
  // 全并行——串行意图失效且无提示（原「标题格式不对」诊断的新契约承接）。仅在确有疑似标题
  // 且无任何显式 Wave 被解析时报，正常 Wave 10/带括号标题不误伤。
  const hasExplicitWave = waves.some(w => !w.implicit)
  const waveLikeHeading = /^#+\s*(?:wave\s*\d+|w\d+|波次\s*\d+)/im
  if (!hasExplicitWave && waveLikeHeading.test(plan)) {
    errors.push(
      `Wave 标题格式不对：必须字面 "## Wave N"（Wave + 空格 + 数字），"## W1" / "## Wave1" / "## 波次1" 都不被识别。` +
      `其下的 "- task-XX" 引用行不会被收容——任务将退化为单个隐式 Wave 全并行，串行意图失效`
    )
  }
  // 检查 0.9（坑 wave-heading-undercount，2026-08-21 实证）：部分 Wave 被识别 + 部分
  // wave-like 标题漏识别（6 标题解析 5 个）→ 漏掉 Wave 的任务静默落入后续步骤，收尾靠
  // 批量完成兜住才没出事。逐个点名漏网标题，plan --done 即阻断修复。
  if (hasExplicitWave) {
    const strictRe = /^#+\s*Wave\s*\d+/i
    const missed = plan.split('\n')
      .map(l => l.replace(/\r$/, ''))
      .filter(l => waveLikeHeading.test(l) && !strictRe.test(l))
    if (missed.length > 0) {
      errors.push(
        `存在 ${missed.length} 个「疑似 Wave 标题但未被识别」的行（其余 Wave 已正常解析，这 ${missed.length} 个段的任务会漏进后续步骤）：` +
        missed.slice(0, 5).map(l => `"${l.trim().slice(0, 50)}"`).join('、') +
        `。必须字面 "## Wave N" 格式（Wave+空格+数字），修正后重跑 plan --done`
      )
    }
  }

  // 检查 1: 注册表非空（tasks.md 无 task-XX checkbox → 三类根因诊断）
  if (allTasks.length === 0) {
    const diags = diagnoseNoTaskRegistry(tasksContent, plan)
    errors.push('tasks.md 中没有找到 task-XX checkbox（任务注册表为空，格式: "- [ ] task-XX: 任务名"）')
    for (const d of diags) errors.push(`  诊断：${d}`)
    return { ok: false, errors, warnings, tasks: allTasks, waves }
  }

  // 检查 2: task id 唯一性（tasks.md 内重复行）
  const idCounts = {}
  for (const task of allTasks) idCounts[task.id] = (idCounts[task.id] || 0) + 1
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) errors.push(`task id 重复: ${id} 在 tasks.md 出现 ${count} 次`)
  }

  // 检查 3: task id 连续性（从 1 开始；ids[0]!==1 时整体跳过 = 兼容旧变更编号不从 1 起，
  // 契约由 test/plan-execute-contract.test.mjs Case 10 钉死，勿改）
  const ids = allTasks.map(t => t.index).sort((a, b) => a - b)
  if (ids.length > 0 && ids[0] === 1) {
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== i + 1) {
        errors.push(getRule('plan.task-id-continuity').failMessage.replaceAll('${expected}', String(i + 1).padStart(2, '0')).replaceAll('${actual}', String(ids[i]).padStart(2, '0')))
        break
      }
    }
  }

  // 检查 4: task name 非空（注册表行）
  for (const task of allTasks) {
    if (!task.name || !task.name.trim()) {
      errors.push(`${task.id}: 任务名为空（tasks.md 行格式 "- [ ] ${task.id}: 一句话任务名"）`)
    }
  }

  // 交叉校验：plan.md Wave 引用 × tasks.md 注册表（仅显式 Wave 结构参与；隐式 Wave 由
  // parseWavesFromPlan 从注册表整体合成，天然全覆盖）
  const explicitWaves = waves.filter(w => !w.implicit)
  if (explicitWaves.length > 0) {
    const refCount = {}
    for (const wave of explicitWaves) {
      for (const task of wave.tasks) {
        refCount[task.id] = (refCount[task.id] || 0) + 1
        if (task.dangling) {
          errors.push(`plan.md Wave ${wave.index} 引用的 ${task.id} 不存在于 tasks.md 注册表（悬空引用）`)
        }
      }
    }
    // 覆盖恰一次：注册表每个 id 必须被引用（缺失）且只被一个 Wave 引用（重复）
    for (const task of allTasks) {
      const n = refCount[task.id] || 0
      if (n === 0) errors.push(`${task.id} 未被任何 Wave 引用（plan.md Wave 段缺 "- ${task.id}" 引用行——未引用的任务不进 execute 步骤）`)
      if (n > 1) errors.push(`${task.id} 被多个 Wave 重复引用 ${n} 次（一个任务只属一个 Wave；跨 Wave 依赖用 (depends_on: …) 声明）`)
    }
    // Wave 段空引用诊断
    const emptyWave = explicitWaves.find(w => w.tasks.length === 0)
    if (emptyWave) {
      errors.push(`plan.md Wave ${emptyWave.index} 段下没有任何 "- task-XX" 引用行（新契约 Wave 段只收 ID 引用行）`)
    }
  }

  return { ok: errors.length === 0, errors, warnings, tasks: allTasks, waves }
}

export const definition = {
  name: 'execute',
  title: '波次执行',
  description: '子代理并行 + 强制 TDD + 两阶段审查',
  steps: [] // 动态构建，由 buildExecuteSteps() 生成
}

// 固定前缀步骤定义
const fixedPrefix = [
  {
    name: '进度确认',
    migratedFrom: ['状态检查'],
    prompt: `检查当前进度，确认可以执行 execute。用 \`sillyspec progress show\` 查流程进度，不要用 \`sillyspec status\`（项目级快照，不推进流程）。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 execute
3. 如果不是 → 检查是否有未完成的 tasks.md
4. 确认执行范围（$ARGUMENTS 指定 wave/task 或全部）

### 输出
当前状态 + 执行范围确认`,
    outputHint: '当前状态 + 执行范围',
    optional: false
  },
  {
    name: '加载上下文',
    prompt: `加载计划、设计和代码库上下文。

### 操作
1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）
2. 读取 design.md（技术方案）
3. 读取 CONVENTIONS.md、ARCHITECTURE.md
4. 读取 local.yaml（构建命令）；若 local.yaml 不存在，先 \`sillyspec local detect\` 生成骨架再读取
5. 加载项目总览 \`.sillyspec/docs/<project>/scan/PROJECT.md\`（如存在）

### 模块文档加载（细粒度卡优先——CLI 已按 tasks 卡 allowed_paths 级联匹配）
6. 读取下方注入的 per-task 模块卡表（{MODULE_RESOLVE_TABLE}）——跨全部 _module-map.yaml 最长前缀匹配，子项目细粒度卡优先于根层大卡
7. 主代理与子代理**只读表中命中的卡**：细粒度卡整卡可读（体量小、语义近）；仅粗粒度大卡命中时**按节读**——只读「契约摘要」「注意事项」「定位」，跳过「变更索引」「人工备注」等历史累积段
8. 实现代码时遵循模块卡中描述的接口约定、数据流和依赖关系
9. **利用模块索引快速定位源码**：
    - 用 entrypoints 字段直接找到模块对外 API 的源码位置
    - 用 main_symbols 字段找到核心类/函数的定义位置
    - 子代理优先读模块卡片理解语义，再读 entrypoints/main_symbols 对应的源码
10. 表查询命令同源可复跑：\`sillyspec modules resolve --change <change-name>\`（任务卡改动后重跑刷新表）

### 符号影响面扩展检查
11. **符号影响面扫描**（Critical — execute 前必做）：
    - **重入沿用（省重复消耗）**：若 symbol-impact.md 已存在、结论完整且其文件头「tasks.md 内容指纹」与当前 tasks.md 一致（中断续跑/阶段重开场景），直接复核沿用既有结论，**不重做调用点扫描**
    - **报告骨架勿手写**：先跑 \`sillyspec symbol-impact --change <change-name>\`——CLI 从 tasks.md 生成逐 task \`<!--TODO-->\` 骨架（gate 拦截时也会自动落一份）；把每行占位替换为真实结论（**未替换的 TODO 占位会被 gate 拒绝**，骨架不能直接过门）
    - 读取所有 tasks/task-NN.md，提取每个任务涉及的修改文件
    - 对每个修改文件，检查是否涉及以下变更类型：
      - class 构造函数参数变更（新增/删除/修改参数）
      - 接口（interface）定义变更
      - DTO / 类型定义变更
      - API client 方法签名变更
      - 函数/方法签名变更（参数增删改）
    - 如果涉及上述变更类型，执行调用点搜索（用于补骨架外的调用点证据，不是生成报告的方式）：
      \`\`\`bash
      rg "new ClassName\(" src/
      rg "ClassName\(" src/
      rg "methodName\(" src/
      rg "import.*from.*filePath" src/
      \`\`\`
    - 将搜索到的调用点与 plan.md 和 tasks/task-NN.md 的 allowed_paths 对比
    - **发现调用点不在任何 task 的 allowed_paths 中 → 直接阻断 execute**
    - **报告落盘（CLI 硬校验）**：结论写入 \`{SPEC_ROOT}/changes/<change-name>/symbol-impact.md\`，每个 task 一行结论（task-XX: 变更类型 + 受影响调用点 + 是否在范围内；无签名级变更也要显式写「无签名级变更」）。\`--done\` 时 CLI 校验该文件存在且覆盖 plan.md 全部 task，缺失或不覆盖会阻断完成
    - 如果调用点不在范围内但任务明确写了"不改原因"，记录但不阻断

### 输出
已加载的上下文摘要（含模块文档 + 源码锚点）+ 符号影响面结论摘要`,
    outputHint: '上下文摘要 + 符号影响面结论',
    optional: false
  },
  {
    name: '确认 worktree 路径',
    prompt: `确认当前 worktree 状态，提取隔离路径。

### 操作
1. 运行 \`sillyspec worktree meta <change-name>\` 读取 meta.json
2. 从输出中提取 worktreePath、branch、mode 字段
3. 确认 worktree 目录存在（如果是 worktree/native-worktree 模式）
4. **确认工具链可用**：worktree 内项目工具链（lint/format/test 二进制，如 ruff / prettier / uv）可能不全——对本次会用到的工具先跑一次 \`--version\` 确认；缺失则按项目方式安装（Python 项目 \`uv tool install ruff\` / \`uv sync\`，Node 项目 node_modules 已由 CLI 链接主仓）。不要等到 commit 才发现二进制不在 PATH 被 hook 拦。**Python 项目注意**：worktree 自建 .venv 只含 pyproject 声明依赖，pytest 等 dev 工具可能缺失——优先在 worktree 内补装（\`uv sync --group dev\` / \`uv pip install pytest\`），**不要回退用主仓 venv 跑测试**（主仓 venv 加载的可能是主仓代码而非 worktree 代码，环境不一致会掩真 bug）

### 铁律
- **worktree 已由 CLI 在 execute 阶段启动时自动创建，不要自行创建或跳过**
- **后续所有子代理的 cwd 必须设为该 worktree 路径**
- 如果 meta.json 不存在（说明创建失败），停止并报错
- **不要自行检查 git dirty/uncommitted 状态来判断是否可以进入 worktree，CLI 已自动处理**

### 输出
worktree 路径 + 分支名 + 模式

`,
    outputHint: 'worktree 路径 + 分支名 + 模式',
    optional: false
  },
  {
    name: '确认执行范围',
    prompt: `解析任务，确认执行范围和确认模式。

### 操作
1. 从 plan 中解析 Wave 分组和任务列表
2. 模型档位：若 tasks.md 中某 task 标注了 [model:xxx]，启动该 task 子代理时按标签选模型（档位由 plan 阶段或用户在 tasks.md 显式标注，execute 不在此自动建议——关键词→档位无统一映射，自动建议反而易误导）
3. 确认频率：默认每个 Wave 完成后展示结果（wave 模式）；用户口头指定按 Task 展示或全自动时遵从
4. 查询知识库：读取 \`.sillyspec/knowledge/INDEX.md\`，根据 Task 关键词匹配

### 知识命中报告
{KNOWLEDGE_HIT_REPORT}

如上所示的知识条目与本次任务相关。请阅读这些条目以获取项目约定和已知模式。
如无命中条目（Status: no matches），跳过本节。

### 模块文档欠账（CLI 算事实）
{DOCS_DEBT}

如上为 CLI 用 git 事实算出的本变更触及模块文档欠账（无输出=无欠账或归属数据缺失）。
欠账处理：Wave 收尾时顺手同步对应模块卡，不必为此停下。变更索引类条目追加到卡同目录 \`<module>.changelog.md\` sidecar（无则创建；可先跑 \`sillyspec modules split-changelog\` 迁出历史段）——勿把历史条目堆回模块卡正文（卡是子代理的读取税）。

### 铁律
- **不要询问用户确认频率**，默认 wave 模式；用户已明确口头指定时遵从其指定`,
    outputHint: 'Wave 分组 + 模型分配',
    optional: false
  }
]

// 全局验收步骤定义
const acceptanceSteps = [
  {
    name: '对照设计检查',
    mode: 'acceptance',
    prompt: `对照 design.md 检查所有实现是否与设计一致。

### 执行方式（CLI 按变更规模判定，占位符由 run.js 注入）
tier: {REVIEW_TIER}（{REVIEW_TIER_REASON}）
- tier=self：当前 agent 汇总执行（对照 design.md 逐项检查 + 偏差说明）
- tier=independent：必须用 Agent tool 启动一个独立的 QA 子代理（独立上下文，不共享实现者的分析），子代理对照 design.md 逐项检查实现一致性并输出 review.json。review.json 产物契约（CLI Stage Review Gate 将硬校验，schema + 完整示例 + docHash 算法如下，照抄改值；reviewedFiles 除主文档 design.md 外可追加 git diff 涉及的源码文件）:
{REVIEW_JSON_CONTRACT}
  该 acceptance review 同时覆盖"代码审查"视角（风格/bug/安全/冗余），后续代码审查步骤仅需轻量复审。

  **审查范围分级（省重复消耗，task review 已覆盖的不全量重审）**：每个 task 在 Task Review Gate 已产出 review.json（{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json，specVerdict/qualityVerdict 双 pass）。QA 子代理按它分层：双 pass 的 task 只**抽查**（读 1-2 个核心 diff 文件抽验 reviewerNotes 与实际改动相符，不必逐文件重审）；未双 pass（fail/cannot_verify/缺失）的 task 必须全量重审。无论抽查还是全量，以下三项始终必查——task review 铁律是"只看当前 task 的 diff"，这三项是它覆盖不到、只有 stage review 能兜住的：
  1. 跨 task 交界（A 产出的接口/数据结构与 B 的消费是否对得上）
  2. design.md 整体对照（最终实现拼起来是否仍符合设计意图，而非仅各 task 局部合规）
  3. 组装行为（全量测试/构建/启动通过——单 task 测试全绿 ≠ 组装正确）

  **产物唯一化（省重复消耗）**：本步逐项对照结论**只落盘一份**——直接写进 review.json 的 \`checklist\` 数组（item=设计要点/FR/决策，note=实现状态 ✅/⚠️/❌ + 偏差说明 + commit 锚点），reviewerNotes 写汇总。**不要**另写独立的 design-check.md 长文（同一份 design×diff 二次消费；2026-08-22 实测该重复一遍 ≈8 分钟全量重读）。
  **gate 重试修复**：review.json 落盘后若后续 gate 报 docHash 失配 / 路径错，跑 \`sillyspec register-stage-review --change <变更名> --stage execute --refresh-hash\` 一键重算修复——**不要重做审查**（重做=同一材料第三遍）。

### 操作
1. 读取 design.md（技术方案）——按章节精准读（design-check 对照表可借 tasks 卡 §锚点定位），避免反复整读全文
2. 逐一对照 design.md 中的设计要点与实际代码实现
3. 检查接口签名、数据结构、模块划分是否一致
4. 记录偏差项（偏差 ≠ 错误，可能是合理的实现调整）

### 输出
review.json 已落盘（checklist=逐项核验表）+ checklist 摘要与偏差说明；无独立长文产物`,
    outputHint: '设计对照检查清单',
    optional: false
  },
  {
    name: '运行测试',
    mode: 'acceptance',
    prompt: `运行所有测试，验证代码质量。

### 执行方式
本步骤由当前 agent 执行，不需要启动独立子代理。

### 操作
1. 读取 local.yaml 获取构建和测试命令；若 local.yaml 不存在，先 \`sillyspec local detect\` 生成骨架再读取
2. 运行测试套件（单元测试、集成测试）
3. 运行 lint 检查 **+ 格式化**：凡变更涉及的源码，既跑 lint check 也跑 formatter（如 \`ruff format\` / \`prettier --write\` / \`black\`），不要只跑 check——只 check 不 format 会把格式问题留到 commit 时被 pre-commit hook 拦截
4. 如果有测试失败 → 分析原因，标注是代码问题还是测试本身的问题
5. 汇总测试结果

### 铁律
- 长测试/构建/lint 命令必须**前台同步执行**，禁止 run_in_background:true / & / nohup / disown——后台任务易被会话生命周期回收导致中断无果

### 输出
测试结果摘要：通过/失败/跳过数量 + 失败项分析`,
    outputHint: '测试结果摘要',
    optional: false
  },
  {
    name: '代码审查',
    mode: 'acceptance',
    prompt: `对本次变更进行代码审查。

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
审查结果：问题列表（严重程度 + 建议修复方式）+ 总体评价`,
    outputHint: '代码审查结果',
    optional: true
  }
]

// 固定后缀步骤定义
const fixedSuffix = [
  {
    name: '知识库审阅',
    prompt: `检查本轮执行产生的新知识。

### 操作
1. 检查 \`.sillyspec/knowledge/uncategorized.md\` 中待确认条目
2. 如有 → 提示用户审阅
3. 用户确认后改为 [已确认]，可归类到专题文件

### 输出
新知识条目数量 + 审阅提示（或"无新知识"）`,
    outputHint: '知识条目数量',
    optional: true
  },
  {
    name: '完成确认',
    prompt: `所有任务完成后的收尾。

先检查当前 worktree 的隔离模式：
\`\`\`bash
sillyspec worktree meta <change-name>
\`\`\`
（CLI 子命令，输出 meta.json 的 mode / worktreePath 字段；无 meta 输出 no meta）

### 操作（mode = worktree，SillySpec 创建的隔离 worktree）

**自动审计流程（不需要用户确认代码）：**

1. 运行 \`sillyspec worktree assess <change-name>\` 自动风险审计
2. 系统自动检查：
   - patch --check 是否通过
   - 变更是否在 allowed_paths 内
   - 主工作区是否有未提交 dirty（拦截；已提交推进交 --3way 自动三路合并）
   - 是否有高风险文件（lockfile/migration/配置/入口）
   - diff 规模是否异常
3. 输出 Apply Decision：

\`\`\`
Worktree Apply Decision
────────────────────────
Decision: SAFE | WARNING | BLOCKED
Changed files: N
Additions: +N  Deletions: -N
Risky files: none | <list>
Action: auto-applied | blocked
\`\`\`

4. **SAFE** → 自动 \`sillyspec worktree apply <change-name>\` + cleanup
5. **WARNING** → 自动 apply（有警告但不阻断）+ cleanup
6. **BLOCKED** → 不 apply，输出原因，提示用户检查：
   - \`sillyspec worktree diff <change-name>\` 查看具体变更
   - \`sillyspec worktree cleanup <change-name>\` 丢弃
7. 建议下一步：\`sillyspec run verify\`

### 操作（mode = native-worktree，用户已有的 linked worktree）
1. 同上自动审计流程
2. SAFE/WARNING → \`sillyspec worktree apply <change-name>\`
3. **不要运行 cleanup**
4. 输出 Worktree: kept
5. 建议下一步：\`sillyspec run verify\`

### 操作（mode = in-place-fallback，降级模式无隔离目录）
1. 展示本次执行摘要（\`git diff\` 查看变更）
2. 跳过 apply 和 cleanup
3. 输出 Worktree: none
4. 建议下一步：\`sillyspec run verify\`

### 输出
Apply Decision + 下一步建议

### 注意
- 完成后运行 \`sillyspec run execute --done\` 即可自动推进阶段`,
    outputHint: 'apply 结果',
    optional: false
  }
]

/**
 * 诊断任务注册表为空的根因（坑 plan-md-format-contract-hidden 延续：笼统报错逼 agent 试错）。
 * 三类根因：tasks.md 无 task-XX checkbox / plan.md Wave 段无 ID 引用 / 旧格式（任务 checkbox 还在 plan.md）。
 * @param {string} tasksContent
 * @param {string} planContent
 * @returns {string[]}
 */
function diagnoseNoTaskRegistry(tasksContent, planContent) {
  const diags = []
  const tc = String(tasksContent || '')
  const pc = String(planContent || '')
  const hasTaskCheckboxInTasks = /^[-*]\s*\[[ xX]\]\s*task-\d+/im.test(tc)
  const hasQlLines = /^[-*]\s*\[[ xX]\]\s*ql-/im.test(tc)
  const hasLegacyInPlan = /^[-*]\s*\[[ xX]\]\s*task-\d+\b[:：]/im.test(pc)
  const hasWaveHeading = /^#+\s*Wave\s+\d+/im.test(pc)
  const hasRefLine = /^[-*]\s+task-\d+\s*$/im.test(pc)

  if (hasLegacyInPlan) {
    diags.push('任务 checkbox 还在 plan.md（旧格式）：请移入 tasks.md（行格式 "- [ ] task-XX: 一句话任务名"，[model:xxx]/(depends_on: …) 标注随行），plan.md Wave 段改为 "- task-XX" 纯 ID 引用行')
  } else if (!tc.trim()) {
    diags.push('tasks.md 内容为空或缺失：plan 阶段应把展开后的任务清单写回 tasks.md（brainstorm 骨架只是名字级占位）')
  } else if (!hasTaskCheckboxInTasks && hasQlLines) {
    diags.push('tasks.md 只有 ql-xxx 行（quick 挂载条目），没有 task-XX 任务行——完整流程变更的任务清单尚未写入')
  } else if (!hasTaskCheckboxInTasks) {
    diags.push('tasks.md 无 "- [ ] task-XX:" 格式的任务行：检查行首格式（- 空格 [ ] 空格 task-XX: 英文冒号）')
  }
  if (hasTaskCheckboxInTasks && hasWaveHeading && !hasRefLine) {
    diags.push('plan.md 有 Wave 段但没有 "- task-XX" 引用行：新契约 Wave 段只收纯 ID 引用行（如 "- task-01"），未引用的任务不进 execute')
  }
  return diags
}

/**
 * 从 plan 解析 Wave 分组（新契约：Wave 段下纯 ID 引用行 `- task-XX`，任务详情在 tasks.md 注册表）。
 * @param {string} planContent
 * @param {Array<object>} registry - parseTaskRegistry 产物（id → 任务详情富化源）
 */
function parseWavesFromPlan(planContent, registry = []) {
  const waves = []
  const regById = new Map(registry.map(t => [t.id, t]))
  let currentWave = null
  // Wave 标题正则（坑 wave-heading-undercount，2026-08-21 实证：plan 6 个 Wave 只解析出 5 个，
  // 末 Wave 任务静默落入「运行测试」验收步靠批量完成兜住）。空格可选（"Wave6"/"Wave 6"）、
  // 编号后缀任意（"## Wave 6（测试）"）——解析侧宁可多收（字母后缀重复编号的硬拦仍在
  // validatePlanForExecute），不可静默丢。
  const WAVE_HEADING_RE = /^#+\s*Wave\s*(\d+)/i

  for (const line of String(planContent || '').split('\n')) {
    const waveMatch = line.match(WAVE_HEADING_RE)
    if (waveMatch) {
      currentWave = { index: parseInt(waveMatch[1]), tasks: [] }
      waves.push(currentWave)
      continue
    }
    // 任何非 Wave 的标题行退出当前 Wave 段（「## 自检」段的行不收，与旧解析同守卫）
    if (/^#{1,6}\s+/.test(line)) { currentWave = null; continue }
    const refMatch = line.match(/^[-*]\s+task-(\d+)\s*$/i)
    if (refMatch && currentWave) {
      const id = `task-${refMatch[1].padStart(2, '0')}`
      const reg = regById.get(id)
      currentWave.tasks.push(reg
        ? { ...reg }
        : { index: parseInt(refMatch[1], 10), id, name: '', done: false, model: null, dependsOn: [], file: '', steps: '', reference: '', dangling: true })
    }
  }

  // wave-like 漂移告警（坑 wave-heading-undercount 运行时防线）：比解析正则更宽的「像 Wave
  // 标题」形态（波次/W+数字等）若未被收容，说明该 Wave 段的任务会被静默漏进后续步骤——
  // execute 启动即 warn（agent 当场修 plan），而非收尾才发现步骤表缺 Wave。
  try {
    const likeRe = /^#{1,6}\s*(?:wave|w|波次)\s*\d+/i
    const likeHeadings = String(planContent || '').split('\n')
      .map(l => l.replace(/\r$/, ''))
      .filter(l => likeRe.test(l) && !WAVE_HEADING_RE.test(l))
    if (likeHeadings.length > 0) {
      console.warn(`⚠️ plan 存在 ${likeHeadings.length} 个「疑似 Wave 标题但未被识别」的行（其任务会漏进后续步骤）：`)
      for (const h of likeHeadings.slice(0, 5)) console.warn(`   ${h.trim().slice(0, 60)}（须字面 "## Wave N" 格式）`)
    }
  } catch { /* 告警失败不阻断解析 */ }

  // 无显式 Wave 结构但注册表非空（light 级：任务全在 tasks.md、plan.md 只留策略）→
  // 合成单隐式 Wave 收容全部任务（与旧 light `## Tasks` 隐式收容语义对齐，单 Wave 串行执行）
  if (waves.length === 0 && registry.length > 0) {
    waves.push({ index: 1, implicit: true, tasks: registry.map(t => ({ ...t })) })
  }
  return waves
}

/**
 * 同步判定派发后端模式（不发网络，零回归关键）— task-07
 *
 * stub 下 isPathASupported()=false → 有配置也只 local-fallback（加提示），不注入完整 SillyHub 指令。
 * 现有测试套件不设 SILLYHUB_MCP_URL/TOKEN 且无 local.yaml mcp 段 → readMcpConfig 返回 null → 默认 'local' → buildWavePrompt 不注入派发段，
 * 输出与改前字节一致（零回归，D-005）。
 *
 * @returns {'local' | 'local-fallback' | 'sillyhub'}
 *   - local：无 MCP 配置（零回归，与现状一致）
 *   - local-fallback：有配置但路径A 未落地（isPathASupported()=false），派发仍走 Local + 短提示
 *   - sillyhub：有配置且路径A 落地（isPathASupported()=true），注入完整 SillyHub 派发指令
 */
export function getDispatchMode() {
  const hasConfig = !!readMcpConfig(process.cwd())
  if (!hasConfig) return 'local'
  return isPathASupported() ? 'sillyhub' : 'local-fallback'
}

/**
 * 解析 task 卡的 repo 归属（W3 task-08，D-012）。
 * 读 changeDir/tasks/task-<num>.md 的 frontmatter `repo:` 字段；缺省/无卡/'main' → 'main'。
 * 单仓 change（无 repo: 字段）恒返 'main'，零回归。
 *
 * @param {{ index?: number, name?: string }} task - wave.tasks 元素
 * @param {string|null} changeDir - change 目录绝对路径
 * @returns {string} repoKey，'main' 或 parseRepo 返回值
 */
function resolveTaskRepo(task, changeDir) {
  if (!changeDir || !task || task.index == null) return 'main'
  const num = String(task.index).padStart(2, '0')
  const taskFile = path.join(changeDir, 'tasks', `task-${num}.md`)
  if (!existsSync(taskFile)) return 'main'
  try {
    const content = readFileSync(taskFile, 'utf8')
    const repo = parseRepo(content)
    return repo || 'main'
  } catch {
    return 'main'
  }
}

/**
 * 把 commit 锡点（base_commit/head_commit）写入 task 卡 frontmatter（W3 task-08，D-010；
 * head 侧 2026-08-21 审计项③ 补对称）。
 *
 * 策略：幂等写——frontmatter 有该字段行则就地替换，无则按 D-010 协议顺序插入：
 * head_commit 跟在 base_commit 行后；base_commit 跟在 repo 行后；均无则插 frontmatter
 * 首部。仅改 frontmatter 不动正文。已存在相同值不重复写。
 *
 * @param {string} taskFilePath - task-NN.md 绝对路径
 * @param {'base_commit'|'head_commit'} field - 锚点字段名
 * @param {string} commit - commit sha
 * @returns {boolean} 是否实际写入（false = 文件不存在 / 写失败 / 值未变）
 */
export function writeCommitAnchorToTaskCard(taskFilePath, field, commit) {
  if (!taskFilePath || !commit || (field !== 'base_commit' && field !== 'head_commit')) return false
  if (!existsSync(taskFilePath)) return false
  let content
  try {
    content = readFileSync(taskFilePath, 'utf8')
  } catch {
    return false
  }
  // CRLF 归一（坑 base-commit-crlf-frontmatter，plan-postcheck.js 同款）：跨仓 task 卡被
  // 编辑器/子代理写成 CRLF 后 `^---\n` 匹配失败 → 锚点静默不落盘，而 Wave
  // prompt 仍声称「CLI 已落盘」。归一后按 LF 写回（taskcard 生成侧本就强制 LF）。
  content = content.replace(/\r\n?/g, '\n')
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return false
  const fm = fmMatch[1]
  const lineRe = new RegExp(`^${field}:\\s.*$`, 'm')
  let newFm
  if (lineRe.test(fm)) {
    const existing = (fm.match(lineRe) || [''])[0]
    if (existing === `${field}: ${commit}`) return false // 值未变，幂等跳过
    newFm = fm.replace(lineRe, `${field}: ${commit}`)
  } else {
    // 插入锚点（D-010 协议顺序 repo→base_commit→head_commit）：head 跟 base 后，
    // base 跟 repo 后，都无则 frontmatter 首字段
    const anchor = `${field}: ${commit}`
    const prevField = field === 'head_commit' ? 'base_commit' : 'repo'
    const prevRe = new RegExp(`^${prevField}:\\s.*$`, 'm')
    if (prevRe.test(fm)) {
      newFm = fm.replace(prevRe, m => m + '\n' + anchor)
    } else {
      newFm = anchor + '\n' + fm
    }
  }
  const newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFm}\n---`)
  if (newContent === content) return false
  try {
    writeFileSync(taskFilePath, newContent)
    return true
  } catch {
    return false
  }
}

function writeBaseCommitToTaskCard(taskFilePath, baseCommit) {
  return writeCommitAnchorToTaskCard(taskFilePath, 'base_commit', baseCommit)
}

/**
 * 跨仓 task head_commit 锡点自动落盘（2026-08-21 agent-手工产出审计项③，D-010 补对称）。
 *
 * base_commit 已在派发时 CLI 落盘，head_commit 此前靠主 agent 按 Wave prompt 指引手跑
 * `rev-parse` 手写（漏抄/抄错直接炸 Task Review Gate 真实性校验）。本函数在 execute
 * --done 时机补齐另一半：扫描 task 卡，跨仓 task（repo≠main）缺 head_commit 的，实时
 * `git -C <跨仓仓根> rev-parse HEAD` 幂等写入（**已存在不覆盖**——agent 手写的精确锚点优先）。
 *
 * best-effort：MultiRepoContext 构造失败 / git 不可达 → 跳过该 task 记 reason，绝不抛。
 *
 * @param {{ changeName: string, cwd: string, specBase?: string, platformOpts?: object }} opts
 * @returns {Promise<{ stamped: number, stampedTasks: string[], skipped: number, reasons: string[] }>}
 */
export async function stampCrossRepoHeadCommits({ changeName, cwd, specBase, platformOpts = {} }) {
  const base = specBase || platformOpts.specRoot || path.join(cwd, '.sillyspec')
  const reasons = []
  const stampedTasks = []
  if (!changeName) {
    return { stamped: 0, stampedTasks, skipped: 0, reasons: ['无 changeName'] }
  }
  const tasksDir = path.join(base, 'changes', changeName, 'tasks')
  if (!existsSync(tasksDir)) {
    return { stamped: 0, stampedTasks, skipped: 0, reasons: ['无 tasks/ 目录（单 task 变更，无跨仓锡点）'] }
  }
  let ctx = null
  try {
    const { getOrCreateMultiRepoContext } = await import('../run/shared.js')
    ctx = await getOrCreateMultiRepoContext({ cwd, changeName, platformOpts })
  } catch (e) {
    return { stamped: 0, stampedTasks, skipped: 0, reasons: [`MultiRepoContext 构造失败: ${e.message}`] }
  }
  let stamped = 0
  let skipped = 0
  // 同仓多 task 只 spawn 一次 rev-parse（Windows 单次 spawn 30-100ms，N task × 同仓纯浪费）
  const headCache = new Map()
  for (const f of readdirSync(tasksDir).filter(n => /^task-\d+\.md$/.test(n)).sort()) {
    const taskFile = path.join(tasksDir, f)
    let content
    try {
      content = readFileSync(taskFile, 'utf8')
    } catch {
      skipped++
      continue
    }
    if (/^head_commit:/m.test(content)) continue // 已有（手写或前次落盘）不覆盖
    const repoKey = parseRepo(content)
    if (!repoKey || repoKey === 'main') continue // 主仓 task 锚 meta，无 head_commit 字段
    const entry = ctx && ctx.resolve ? ctx.resolve(repoKey) : null
    if (!entry || !entry.gitDir) {
      skipped++
      reasons.push(`${f}: repo "${repoKey}" 无法解析 gitDir（local.yaml repos 未注册？）`)
      continue
    }
    if (!headCache.has(entry.gitDir)) headCache.set(entry.gitDir, gitQuiet(entry.gitDir, ['rev-parse', 'HEAD']))
    const head = headCache.get(entry.gitDir)
    if (!head) {
      skipped++
      reasons.push(`${f}: git rev-parse HEAD 失败（${entry.gitDir}）`)
      continue
    }
    if (writeCommitAnchorToTaskCard(taskFile, 'head_commit', head)) {
      stamped++
      stampedTasks.push(f.replace(/\.md$/, ''))
    }
  }
  return { stamped, stampedTasks, skipped, reasons }
}

/**
 * 为 Wave 生成 prompt（强制子代理执行）
 *
 * W3 task-08（D-012 per-task workdir）：签名加可选 `ctx`（MultiRepoContext）参数。
 * - 无 ctx（单仓 change / 旧调用方）→ 退化为单 worktreePath 单值 worktreeSection（零回归）
 * - 有 ctx → 按 task 逐个解析 repo 归属，构造 per-task workdir 多值表，跨仓 task 派发前
 *   落 base_commit 锡点（D-010），注入跨仓 task commit 指引 + head_commit 落盘指引。
 * 同 Wave 允许主仓+跨仓 task 混合（各独立 Task 调用各传 workdir，不强制同 Wave 同 repo）。
 */
export function buildWavePrompt(wave, waveIndex, changeDir, worktreePath, options = {}) {
  const ctx = options.ctx || null
  // 跨 Wave 共享缓存（性能收敛 O(W×T) → O(T)）：一次 buildExecuteSteps 期间 plan/契约矩阵/
  // task 卡/模块卡表/design 行集不变，每 Wave 重读重解析是纯浪费（6-8 Wave × 15 task 的
  // full 级变更 = 数百次冗余 fs + 契约矩阵全卡重扫）。缓存对象由 buildExecuteSteps 创建传入；
  // 直接调用（tests / 单 Wave）不传 _execCache 时全部退化为即时计算，行为不变
  const cache = options._execCache || null
  const memo = (slot, compute) => {
    if (!cache) return compute()
    if (!(slot in cache)) cache[slot] = compute()
    return cache[slot]
  }
  const memoMap = (slot, key, compute) => {
    if (!cache) return compute()
    if (!cache[slot]) cache[slot] = new Map()
    if (!cache[slot].has(key)) cache[slot].set(key, compute())
    return cache[slot].get(key)
  }
  // ── Contract Matrix：检查是否有 provider/consumer 契约需要注入 ──
  let contractInjection = ''
  let prototypeInjection = ''
  if (changeDir) {
    try {
      const planFile = path.join(changeDir, 'plan.md')
      if (existsSync(planFile)) {
        const planContent = memo('plan', () => readFileSync(planFile, 'utf8'))
        // 收集本 wave 所有 task（端点注入与字段注入共用）
        const waveTasks = wave.tasks.map((t, ti) => {
          const num = String(t.index || (ti + 1)).padStart(2, '0')
          return `task-${num}`
        })

        // 1) 端点级契约（provider/consumer via buildContractMatrix）
        const contracts = memo('contracts', () => buildContractMatrix(planContent, changeDir))
        const relevantContracts = contracts.filter(c => waveTasks.includes(c.consumer))
        if (relevantContracts.length > 0) {
          contractInjection = `
### API Contract Matrix
本 Wave 存在前端/后端跨 task 契约：
${relevantContracts.map(c => `- **${c.consumer}** 消费 **${c.provider}** 产出的 API`).join('\n')}
`
          for (const taskName of waveTasks) {
            const injection = buildConsumerInjection(changeDir, path.join(changeDir, '..', '..'), taskName, contracts)
            if (injection) {
              contractInjection += `
### 子代理 ${taskName} 的端点契约注入
为 ${taskName} 启动子代理时，在子代理 prompt 末尾追加以下内容：

<contract-injection>
${injection}
</contract-injection>
`
            }
          }
        }

        // 2) 字段级契约（expects_from ↔ provides）
        // 命中「provider 漏字段、consumer fallback 编造 → 运行时 403/500」这类 bug：
        // 把 consumer 期望字段 vs provider 承诺字段显式注入子代理 prompt
        for (const taskName of waveTasks) {
          const fi = memoMap('fieldInjections', taskName, () => buildContractFieldInjection(changeDir, taskName))
          if (fi) {
            contractInjection += `
### 子代理 ${taskName} 的字段契约注入
为 ${taskName} 启动子代理时，在子代理 prompt 末尾追加以下内容：

<contract-field-injection>
${fi}
</contract-field-injection>
`
          }
        }
      }
    } catch (e) {
      // 契约注入是 best-effort：失败不阻断 execute，只记录
      console.warn(`  ⚠️ 契约注入跳过: ${e?.message || e}`)
    }

    // 原型引用注入：brainstorm 阶段的 HTML 原型（确认过的布局/组件/交互），
    // 让 execute 实现前端/UI task 时参考原型，而非凭 design 文字重新发明（避免原型浪费）。
    try {
      const prototypes = readdirSync(changeDir).filter(f => /^prototype-.*\.html$/i.test(f))
      if (prototypes.length > 0) {
        const protoRelDir = `.sillyspec/changes/${path.basename(changeDir)}`
        prototypeInjection = `
### 📐 原型参考（brainstorm 可视化确认）
本次变更有 HTML 原型（brainstorm 阶段确认过的视觉/交互），实现前端/UI 相关 task 时参考：
${prototypes.map(p => `- \`${path.join(protoRelDir, p)}\``).join('\n')}

照原型的布局/组件/交互实现，不要凭 design.md 文字重新发明。纯后端/无 UI 的 task 忽略本节。
`
      }
    } catch {}
  }

  // ── 模块卡分级（P0a）：本 Wave per-task 最优卡表，细卡优先——治「根层大卡被每个子代理
  // 整读」（multi-agent-platform backend.md 58KB 实测单卡一项 20 万+ tokens/全流程）。
  // best-effort：解析失败/无 map 不注入（零回归），可经 `sillyspec modules resolve` 手查。
  let moduleSection = ''
  try {
    if (changeDir) {
      const specBase = path.dirname(path.dirname(changeDir))
      // repo root 推导：默认 spec 布局（<repo>/.sillyspec/changes/<change>）从 specBase 反推，
      // 平台模式（specRoot 异位）回退 process.cwd()——子项目目录前缀判定用，误差只降级匹配粒度
      const repoRoot = path.basename(specBase) === '.sillyspec' ? path.dirname(specBase) : process.cwd()
      const waveTaskIds = new Set(wave.tasks.map((t, ti) => `task-${String(t.index || (ti + 1)).padStart(2, '0')}`))
      // 模块卡表与 Wave 无关（按 change 全量解析后本 Wave 过滤）：memo 跨 Wave 共享
      const { hasMaps, rows } = memo('moduleCards', () => resolveChangeModuleCards({
        cwd: repoRoot,
        specBase,
        changeName: path.basename(changeDir),
      }))
      const hits = rows.filter(r => waveTaskIds.has(r.taskId) && r.moduleId)
      if (hasMaps && hits.length > 0) {
        const kb = n => (n > 0 ? `${(n / 1024).toFixed(1)}KB` : '?')
        const cardLines = hits.map(r =>
          `- ${r.taskId} → \`${r.cardPath}\`（${r.moduleId}，${r.granularity === 'fine' ? '细卡' : '粗卡'} ${kb(r.cardBytes)}：${r.advice}）`
        ).join('\n')
        moduleSection = `
### 模块卡分级（本 Wave 子代理按表引用，勿按目录漫游 / 整读根层大卡）

${cardLines}

细粒度卡整卡读；粗粒度大卡只读「契约摘要/注意事项/定位」节（跳过变更索引/人工备注历史段）。为子代理写 prompt 时把对应卡路径直接写入。
`
      }
    }
  } catch { /* 模块卡分级是 best-effort：失败不注入不阻断 */ }

  // ── design.md 热区（P1a）：Wave 前置只需「非目标/兼容策略」两节，CLI 提取直供——免每
  // Wave 整读全文（28KB 级 design × 8 Wave 重复读）。无 design.md / 无对应节 → 不注入零回归。
  let designHotzone = ''
  let hasDesignHotzone = false
  try {
    if (changeDir) {
      const designPath = path.join(changeDir, 'design.md')
      if (existsSync(designPath)) {
        const SECTION_CHAR_LIMIT = 2400
        const dLines = memo('designLines', () => readFileSync(designPath, 'utf8').replace(/\r\n/g, '\n').split('\n'))
        const sections = []
        let cur = null
        dLines.forEach((l, i) => {
          const m = l.match(/^##\s+(.+)$/)
          if (m) {
            if (cur) cur.end = i
            cur = { title: m[1].trim(), start: i, end: dLines.length }
            sections.push(cur)
          }
        })
        const grab = kwRe => {
          const s = sections.find(s => kwRe.test(s.title))
          if (!s) return null
          const body = dLines.slice(s.start + 1, s.end).join('\n').trim()
          if (!body) return null
          return { title: s.title, body: body.length > SECTION_CHAR_LIMIT ? body.slice(0, SECTION_CHAR_LIMIT) + '\n…（超长截断，原文见 design.md）' : body }
        }
        const nonGoals = grab(/非目标/)
        const compat = grab(/兼容/)
        if (nonGoals || compat) {
          hasDesignHotzone = true
          const fmt = s => (s ? `#### ${s.title}\n${s.body}\n` : '')
          const indexLines = sections.map(s => `- L${s.start + 1} ## ${s.title}`).join('\n')
          designHotzone = `
### design.md 热区（CLI 提取——Wave 前置只读这两节，勿整读全文）

${fmt(nonGoals)}${fmt(compat)}
### design.md 章节行号索引（需要其余章节时按行号精准读，Read offset/limit）

${indexLines}
`
        }
      }
    }
  } catch { /* 热区提取 best-effort：失败不注入 */ }

  // ── 决策锚点触碰事实（W-A 主渲染点，D-003）：changedFiles 口径与 run/prompt.js {DOCS_DEBT}
  // 现算同源——collectExecuteChangedFiles（porcelain 未提交 ∪ baseline..HEAD）唯一实现，勿双写。
  // 单过流程前缀第 4 步渲染 {DOCS_DEBT} 时 changedFiles 恒空，Wave 步（重入/续跑时已含前置
  // Wave 已提交变更）才是触碰事实的主呈现时机。advisory：无触碰 section=''（模板字节不变，
  // 零输出零阻断）；≤5 条截断（R-05）。best-effort：失败不注入不阻断。
  let decisionTouchSection = ''
  try {
    if (changeDir) {
      const dtSpecBase = path.dirname(path.dirname(changeDir))
      const { changedFiles } = collectExecuteChangedFiles({
        specBase: dtSpecBase,
        changeName: path.basename(changeDir),
        cwd: options.cwd || process.cwd(),
      })
      const dtFacts = renderDecisionTouchFacts(computeDecisionTouches(changedFiles, path.join(dtSpecBase, 'knowledge')).touches)
      if (dtFacts) {
        decisionTouchSection = `\n### 决策锚点触碰（CLI 算，advisory——改到锚定文件时复核对应决策）\n\n${dtFacts}\n`
      }
    }
  } catch { /* 触碰事实 best-effort：失败不注入不阻断 */ }

  // 子代理要点 4 / Wave 开始前第 1 条：模块表 / 热区存在时换成「按注入内容执行」版文案，
  // 否则保留原文（零回归——无 map / 无 design 的项目 prompt 不变）
  const moduleDocPoint = moduleSection
    ? '4. **模块卡分级**：把上方「模块卡分级」表中该 task 命中的卡路径写进子代理 prompt（细卡整读；粗大卡只读「契约摘要/注意事项/定位」节）——勿让子代理按目录漫游或整读根层大卡'
    : '4. 如存在模块文档（{SPEC_ROOT}/docs/*/modules/），按需读取涉及模块的 <module>.md 参考接口约定和数据流——读主仓路径（CLI 已替换为绝对路径），不要读 worktree 副本'
  const waveStartItem1 = hasDesignHotzone
    ? '1. 「非目标」「兼容策略」两节已由 CLI 提取附在上方「design.md 热区」——**不要再整读 design.md**；需要其余章节时按热区下方行号索引精准读取（Read offset/limit）。确保子代理不超范围、不破坏旧逻辑'
    : '1. 读取 design.md 的「非目标」与「兼容策略」章节（如存在），确保子代理不超范围、不破坏旧逻辑'

  // 构建任务摘要（不再内联完整蓝图，减少上下文污染）。
  // 任务卡路径用 {SPEC_ROOT} 占位符（坑 worktree-spec-artifact-misplace）：子代理 cwd=worktree 时
  // 相对路径会解析到 worktree 的 .sillyspec 副本；占位符经 CLI 替换为主仓绝对路径。
  const taskSummary = wave.tasks.map((t, ti) => {
    const taskNum = String(t.index || (ti + 1)).padStart(2, '0')
    const taskRelPath = changeDir
      ? `{SPEC_ROOT}/changes/${path.basename(changeDir)}/tasks/task-${taskNum}.md`
      : `task-${taskNum}.md`
    const fileInfo = t.file ? ` (${t.file})` : ''
    return `task-${taskNum}: ${t.name}${fileInfo} → ${taskRelPath}`
  }).join('\n')

  const taskList = wave.tasks.map((t, ti) => {
    const taskNum = String(t.index || (ti + 1)).padStart(2, '0')
    let s = `- [ ] ${t.name}`
    if (t.file) s += ` (${t.file})`
    return s
  }).join('\n')

  // ── per-task workdir 解析（W3 task-08，D-012）──
  // 无 ctx（单仓 change）→ 全 task workdir=主仓 worktreePath，沿用旧单值逻辑（零回归）。
  // 有 ctx → 按 task 卡 repo: 字段逐个解析：主仓 task workdir=主仓 worktreePath，跨仓 task
  // workdir=ctx.resolve(repo).worktreePath（跨仓仓根）。同 Wave 允许主仓+跨仓混合。
  const taskRepos = wave.tasks.map(t => ctx ? resolveTaskRepo(t, changeDir) : 'main')
  const hasCrossRepoWave = ctx ? taskRepos.some(r => r !== 'main') : false

  // per-task workdir 映射（用于多值 worktreeSection + 跨仓 commit 指引）
  // 无 ctx 或无跨仓 task → 不构造（沿用旧单值 worktreePath 注入）
  let perTaskWorkdirs = null
  let crossRepoCommitSection = ''
  let baseCommitWrites = [] // [{ taskNum, repo, taskFile, written }] 跨仓 task base 锡点落盘记录
  if (ctx && hasCrossRepoWave) {
    perTaskWorkdirs = wave.tasks.map((t, ti) => {
      const taskNum = String(t.index || (ti + 1)).padStart(2, '0')
      const repo = taskRepos[ti]
      const entry = ctx.resolve(repo)
      const workdir = entry ? entry.worktreePath : (worktreePath || '')
      return { taskNum, repo, workdir }
    })

    // D-010 跨仓 task base 锡点：派发前落 task 卡 base_commit
    // 仅对跨仓 task（repo≠'main'）落盘，主仓 task 锚 meta.baseHash（MultiRepoContext 已处理）。
    // worktree 模式（跨仓 worktree 隔离，坑 cross-repo-no-worktree-isolation）优先 entry.baseCommitHint
    //（= meta.baseHash 创建时快照）——worktree HEAD 会随子代理 commit 推进，rev-parse HEAD 当 base
    // 会把 Wave 内前序 task 的交付错算进后续 task 的 base；legacy 直写模式沿用跨仓根实时 HEAD。
    const baseCommitCache = new Map() // 同仓多 task 只 spawn 一次
    for (const item of perTaskWorkdirs) {
      if (item.repo === 'main') continue
      const entry = ctx.resolve(item.repo)
      if (!entry) continue
      if (!baseCommitCache.has(entry.gitDir)) {
        baseCommitCache.set(entry.gitDir, entry.baseCommitHint || gitQuiet(entry.gitDir, ['rev-parse', 'HEAD']))
      }
      const baseCommit = baseCommitCache.get(entry.gitDir)
      if (!baseCommit) continue // git 不可达已由 MultiRepoContext 构造时 fail-closed 拦截，此处置防御
      const taskFile = changeDir
        ? path.join(changeDir, 'tasks', `task-${item.taskNum}.md`)
        : null
      const written = taskFile ? writeBaseCommitToTaskCard(taskFile, baseCommit) : false
      baseCommitWrites.push({ taskNum: item.taskNum, repo: item.repo, taskFile, written, baseCommit })
    }

    // 跨仓 task commit 指引 + head_commit 落盘指引（D-010 回收时机）。
    // worktree 模式（跨仓 worktree 隔离）：子代理在跨仓 worktree 分支改+commit，apply 阶段 CLI
    // 统一 patch 回跨仓主工作区（与主仓同构）；legacy 直写模式保留原文案（commit 直落跨仓主干）。
    const crossWorktreeItems = perTaskWorkdirs.filter(i => {
      const e = i.repo !== 'main' ? ctx.resolve(i.repo) : null
      return e && e.isWorktree
    })
    const crossLegacyItems = perTaskWorkdirs.filter(i => i.repo !== 'main' && !crossWorktreeItems.some(w => w.taskNum === i.taskNum))
    const crossLines = perTaskWorkdirs
      .filter(i => i.repo !== 'main')
      .map(i => {
        const e = ctx.resolve(i.repo)
        return `- task-${i.taskNum} → repo \`${i.repo}\`，workdir=\`${i.workdir}\`${e && e.isWorktree ? '（worktree 隔离）' : ''}`
      })
      .join('\n')
    const crossWorktreeSection = crossWorktreeItems.length > 0 ? `

**跨仓 worktree task（repo 已建 worktree 隔离）——像主仓 task 一样工作：**
- 子代理在 workdir（跨仓 worktree）内改+commit（git add + git commit 到 worktree 当前分支），**不要碰跨仓主工作副本**。
- apply 阶段 CLI 统一把各跨仓 worktree 的交付 patch 回对应跨仓主工作区（勿手工 apply）。
- base 已锚 worktree meta.baseHash（创建时快照），review 的 base/head 由 CLI 按 task 卡锡点解析。` : ''
    const crossLegacySection = crossLegacyItems.length > 0 ? `

**派发跨仓 task 前（base 锡点，CLI 已在 prompt 构造时落盘）：**
- 跨仓 task 卡 frontmatter 的 \`base_commit\` 已由 CLI 实时 \`git -C <跨仓仓根> rev-parse HEAD\` 锁定（base 锡点，约束①）。子代理在此 HEAD 上改+commit，不受同 Wave 其他 task 推进 HEAD 影响。

**跨仓 task 子代理 prompt 必须注入（legacy 直写模式）：**
> 该 task 改的是 \`<repo>\` 仓，workdir=\`<跨仓仓根>\`。**直接在该仓主干工作区改+commit（git add + git commit 到该仓主干），不经主仓 worktree、不建分支。** commit 到该仓主干即落盘，apply 阶段对跨仓 task 为 no-op（design §5.4 G1）。
> task 卡 allowed_paths 是相对**该仓根**的路径（如 \`src/routes/x.js\`）——不带仓库名前缀（\`<repo>/src/...\` ❌）、不是绝对路径；在 workdir 下直接按相对路径定位文件。` : ''
    crossRepoCommitSection = `
### 跨仓 task 派发与双锡点

${crossLines}${crossWorktreeSection}${crossLegacySection}

**回收跨仓 task（head 锡点，CLI 自动落盘，勿手写）：**
- 子代理完成 commit 后，正常写 review.json（verdict/notes）并勾选 checkbox 即可。execute \`--done\` 时 CLI 自动对跨仓仓（worktree 模式=该仓 worktree，legacy=仓根）\`git rev-parse HEAD\` 写入该 task 卡 \`head_commit:\`（幂等，已存在不覆盖——你若手写了精确锚点则以你的为准）。
- review.json 的 mechanics 字段（\`base\`/\`head\`/\`changedFiles\`）无需手算：\`base\` 取 task 卡 \`base_commit\`、\`head\` 取 task 卡 \`head_commit\`，写完跑 \`sillyspec backfill-reviews --change <变更名> --adopt\` 一键代填（verdict 保留）。
`
  }

  // worktreeSection：无 ctx / 无跨仓 task → 旧单值（零回归）；有 ctx 含跨仓 task → per-task 多值表
  let worktreeSection
  if (ctx && hasCrossRepoWave && perTaskWorkdirs) {
    const workdirLines = perTaskWorkdirs.map(i =>
      `  - task-${i.taskNum} (repo: ${i.repo}) → workdir: "${i.workdir}"`
    ).join('\n')
    worktreeSection = `
### 工作目录（per-task）

调用 Task 工具启动子代理时，**workdir 参数是强制必传的**，且本 Wave 内不同 task 的 workdir 不同（主仓 task vs 跨仓 task）。

**per-task workdir 表（每个子代理按其 task 对应的 workdir 启动）：**

${workdirLines}

不传 workdir 或传错 workdir 会导致：主仓 task 写到跨仓仓 / 跨仓 task 写到主仓 worktree，破坏隔离与 apply 归属。

\`\`\`json
{
  "subagent_type": "general",
  "workdir": "<按上方 per-task 表选>",
  "prompt": "在此编写任务描述..."
}
\`\`\`

### 注意
蓝图文件（tasks.md / design.md / proposal.md / requirements.md / tasks/task-XX.md）在主工作区 {SPEC_ROOT}/changes/<change>/ 下（CLI 已替换为主仓绝对路径），它们不在跨仓仓也不在 worktree 中。读取蓝图时使用主工作区路径，不要拼接到 worktree / 跨仓仓路径下。
`
  } else {
    worktreeSection = (worktreePath)
      ? `
### 工作目录

调用 Task 工具启动子代理时，**workdir 参数是强制必传的**。
不传 workdir 会导致子代理把文件写到主工作区而非 worktree，破坏隔离。

\`\`\`json
{
  "subagent_type": "general",
  "workdir": "${worktreePath}",
  "prompt": "在此编写任务描述..."
}
\`\`\`

### 注意
蓝图文件（tasks.md / design.md / proposal.md / requirements.md）在主工作区 {SPEC_ROOT}/changes/<change>/ 下（CLI 已替换为主仓绝对路径），它们可能不在 worktree 中。读取蓝图时使用主工作区路径，不要拼接到 worktree 路径下；同理，spec 流程产物（module-impact.md / knowledge 条目 / 模块文档）只写主仓 {SPEC_ROOT}，绝不写进 worktree 副本。
`
      : ''
  }

  // ── 派发后端段注入（task-07，D-006 / D-007 / D-008 接入）──
  // 同步判定（不发网络，零回归关键）：local（无 MCP 配置）→ dispatchSection='' → 本 prompt 与改前
  // 字节一致；sillyhub（配置 + 路径A 落地）→ 注入完整 SillyHub 派发指令（一 Wave 一 mission /
  // dispatch_worker / 轮询 list_workers / 超时 kill lease 防双写 / 回收 + Local 兜底）；local-fallback
  // （配置但路径A 未落地）→ 短提示，派发仍走 Local（与默认行为一致）。worktreePath 为空时不注入
  // （无 worktree 无谓派发指令）。测试/调用方可经 options.dispatchMode 覆盖，避免 env 污染。
  const dispatchMode = options.dispatchMode || getDispatchMode()
  let dispatchSection = ''
  if (worktreePath && dispatchMode === 'sillyhub') {
    // 路径A 落地后：注入完整 SillyHub 派发指令（renderDispatchInstruction 已含 Local 兜底全文）
    const contract = {
      brief: '本 Wave 任务（见上方任务摘要与 tasks/task-XX.md）',
      worktreePath,
      branch: options.branch || '<未提供 branch>',
      allowedPaths: [],
      readOnly: false,
      runId: '{EXECUTE_RUN_ID}',   // 占位符，prompt.js 注入阶段替换为真实 run id
    }
    const { instruction } = renderDispatchInstruction(contract, { available: true })
    dispatchSection = `\n### 派发后端：SillyHub MCP（探测可用，一 Wave 一 mission）\n\n本次 Wave 派发经 SillyHub MCP。按以下派发指令执行（含 create_mission / dispatch_worker / 轮询 list_workers / 超时 kill lease 防双写 / 回收 + Local 兜底）：\n\n${instruction}\n`
  } else if (worktreePath && dispatchMode === 'local-fallback') {
    // 有 MCP 配置但路径A 未落地：加短提示，派发仍走 Local（与默认行为一致）
    dispatchSection = `\n### 派发后端提示：SillyHub MCP 已配置但路径A 未落地\n\n检测到 local.yaml mcp 段或 env 配置，但 SillyHub \`dispatch_worker\` 尚不支持 \`worktree_path\`（路径A 跨仓未落地）。本次派发走 Local（本机 Agent tool），与默认行为一致——上方「执行方式」与「工作目录」段适用。\n`
  }
  // dispatchMode === 'local'（无配置）或 worktreePath 为空 → dispatchSection = '' → 输出与改前字节一致（零回归）

  return `## Wave ${waveIndex}: 执行以下任务

## 执行方式

**默认每个任务由独立子代理执行，你不要自己写代码。**

可选 batch（合并实现）：同一 Wave 内，若一组任务同时满足以下三个条件，可把它们合并为一个 batch（最多 3 个 task），交给单个子代理串行逐个完成实现：
- 组内任意两个 task 的 allowed_paths 无交集（文件正交）
- 组内任意两个 task 之间无 provides / expects_from 契约链（契约 task 禁止同批——串行实现会读到半成品，契约 task 由独立子代理并行处理或落在不同 Wave）
- 组大小不超过 3 个 task

任一条件不满足，该 task 走独立子代理（默认形态）；拿不准就不合并。无论独立还是 batch，实现一律由子代理完成，你不要自己写代码。

你的角色是调度者 + 审查者（batch 只合并实现、不合并审查）：
1. 为每个任务启动一个子代理（Agent tool），或按上述三条件把多个任务合并为一个 batch 子代理，同 Wave 内可并行
2. 子代理完成后审查结果——batch 子代理只做实现与自验，task 审查、review.json 产出与 checkbox 勾选仍归你（主 agent），在子代理返回后逐 task 进行；审查 batch 报告时逐 task 对照 allowed_paths 检查改动文件清单有无越权
3. 勾选 tasks.md 中对应任务的 checkbox
4. 记录改动文件和测试结果

${worktreeSection}${crossRepoCommitSection}${dispatchSection}
**SillyHub 派发互斥**：SillyHub 派发模式下按派发段执行（一 Wave 一 mission），不按 batch 分组；batch 分组指导仅适用于本地 Agent tool 派发。
${moduleSection}
### 任务摘要（按需读取完整蓝图）
为每个任务启动子代理时，**只需告知任务目标和蓝图文件路径，让子代理按需读取**：

${taskSummary}

子代理 prompt 要点：
1. 任务目标（简短描述）
2. 蓝图文件路径（让子代理自行读取详情）
3. 编码铁律：先读后写、TDD、不编造方法、只做蓝图里写的事、遵守边界处理规则、不超出 allowed_paths
4. ${moduleDocPoint}
5. 任务含测试代码时，把下方「测试用例设计」整段复制进子代理 prompt，要求子代理按此设计测试用例
6. **增量落盘与中断接手指引**：每完成一个可见产出（代码/测试/文档），立即写盘并执行一次最小验证（如语法检查、单跑相关测试）。工作过程中如被 429/API 配额/会话中断，应在最终回复里输出「已完成清单」（含文件路径、测试命令、当前卡点），不要只输出结论——主代理会依据磁盘产物和该清单判断哪些部分已完成，哪些需接手补做，避免重做已落盘的工作
7. **任务边界铁律**：严格只实现本 task 的 \`allowed_paths\` 内文件；若 design.md/plan.md 明确指定了接口/回调/钩子接入位置，必须逐字遵守；不允许顺手实现其他 task 的内容（如 task-01 不要把 task-02 的接入也做了）。如发现必须改其他 task 文件才能继续，先回到主代理由主代理决定是否重分 Wave 或调整 plan，禁止子代理私自越界
8. **batch 子代理协议**（仅当按「执行方式」节条件合并 batch 时附加进该子代理 prompt）：按 batch 内 task 顺序逐个完成实现闭环——读取 tasks/task-N.md → 实现 → 跑该 task 的 verify 命令 → 记录该 task 报告（改动文件清单 / verify 结果 / 卡点）→ 才开始下一个 task；最终回复输出逐 task 报告清单。禁止写 review.json、禁止勾选 tasks.md checkbox——task 审查与勾选归主 agent，在子代理返回后逐 task 进行。越权即停：发现必须改 batch 内其他 task 或任何 batch 外 task 的 allowed_paths 文件 → 立即停止本 task 及后续，报告冲突文件与卡点，回主 agent 裁决（重分 Wave / 调整 plan / 回退独立子代理）。第 7 条任务边界铁律在 batch 语境下的「本 task」= 当前正在实现的 task

{{include: testcase-design}}

${designHotzone}${decisionTouchSection}
### Wave 开始前
${waveStartItem1}
2. 读取 plan.md 了解全局任务划分和依赖关系
3. 确认本 Wave 的输入/输出契约（前置 Wave 产出了什么，本 Wave 需要消费什么）
4. 检查前置 Wave 的产出是否完整（文件是否存在、测试是否通过）
5. **上下文分层加载**：
   - 🔥 热上下文：design.md 非目标/兼容策略 + 当前 Wave 任务（必须加载）
   - 🌡️ 温上下文：CONVENTIONS.md + ARCHITECTURE.md（需要时加载）
   - ❄️ 冷上下文：其他变更的 design.md、历史 plan.md（不要主动加载，除非明确需要）

### 中断续跑（如曾中断恢复）
execute 按 Wave 持久化进度，task 级进度靠 tasks.md checkbox 勾选。若本 Wave 曾因 429/API 配额/崩溃中断：
- tasks.md 中**已勾选 \`- [x]\` 的 task 已完成，跳过不重跑**（子代理也可能在完成前中断，重跑前先确认该 task 产出文件是否完整）
- 用 \`sillyspec status\` 查当前进度，重新 \`sillyspec run execute\` 会回到当前 Wave step 继续，**不要从零重置或重跑已完成 Wave**
- 本 Wave 已完成但不完整（产出缺文件）的 task 补做，不牵连其他 task

${contractInjection}${prototypeInjection}
### 本 Wave 任务
${taskList}

### 调度要求
1. **同一 Wave 的多个子代理（独立或 batch）必须并行启动，batch 内部串行**（batch 分组仅按文件正交 / 无契约链判定，不改变 Wave 依赖语义——Wave 定义=无依赖可并行；有依赖应在 plan.md 的不同 Wave 中）。
2. **Reverse Sync**：子代理报告实现与 design.md 不一致时，先检查是代码错了还是文档有遗漏
3. **不要频繁编译！** 编译很慢，只在以下情况运行：
   - 写了大量代码后需要验证语法正确性
   - 最后一个 Wave 完成后做一次全量编译验证
   - 用户明确要求编译时
4. 每个任务完成后：
   - **在 worktree 内 git add -A && git commit -m "<task-NN 摘要>"**（坑 subagent-uncommitted-newfile-apply3way，2026-08-22 实证：纯新增文件不 commit 时 apply 的 git apply --3way 报 "does not exist in index" 直接炸——未 commit 的新文件不在 base commit 也不在 index，patch 生成取不到。commit 后 base..HEAD diff 完整、apply 顺畅，review.json 的 head 也有真实锚点）
   - **先写 review.json 再勾选 checkbox**（见下方 Task Review Gate）
   - **任务边界上报（每任务一次，主仓根目录）**：勾选 checkbox 后跑一次 \`sillyspec platform sync --change <change-name>\`——以任务粒度把「最后信号」（last_pushed_at）与 tasks.md 勾选状态推上平台（变更中心「进行中」可见性）；未连接平台时该命令静默跳过，无需先检查连接状态
   - **既跑 lint check 也跑 formatter**：凡变更涉及的源码跑项目的 lint 检查 **和** 格式化（如 \`ruff format\` / \`prettier --write\`），不要只跑 check——只 check 不 format 会把格式问题留到 commit 时被 pre-commit hook 拦截（worktree 内二进制可能缺失，先 \`which <bin>\` 确认，缺则 \`uv tool install\` / \`uv sync\`）
   - 记录改动文件和测试结果
5. 遇到 BLOCKED → 记录原因，选择：重试/跳过/停止

### Task Review Gate

每个子代理完成后、勾选 checkbox **之前**，你必须创建 task review。

**操作步骤：**
1. 读取当前 task 的 git diff（从 task 开始到完成的变更）
2. 对照 plan.md 中该 task 的描述和 tasks/task-XX.md（如果存在）检查实现是否符合要求
3. 写入 review.json 文件
4. **只有 review.json 写入成功后，才允许勾选 tasks.md 中对应任务的 checkbox**（勾选唯一落点；CLI 的 autoCheckPlanFromReviews 机器勾选器同样写 tasks.md，文件锁 .tasks.md.lock 串行化双路勾选）

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
- \`cannot_verify\` 只在确实无法验证且有待补充证据时使用，且 requiredEvidence 必须非空
- \`sillyspec run execute --done\` 会校验所有 task 的 review.json，缺失或 fail 会阻断完成

### module-impact.md 更新（主代理在本 Wave 所有 task 完成后汇总）
本 Wave 内所有 task 子代理完成、review.json 写好后，**由你（主代理/调度者）**汇总本 Wave 的实际代码变更，更新 {SPEC_ROOT}/changes/<change>/module-impact.md（plan 阶段已生成首版）：
- 基于本 Wave 各 task 的实际 git diff（不是计划）+ {SPEC_ROOT}/docs/<project>/modules/_module-map.yaml 对照
- 更新受影响模块的影响类型/说明（实际改动可能与 plan 首版预估不同，据实修正）
- **不由各 task 子代理分别改**（同 Wave 并行子代理改同一文件会互相覆盖）——只由主代理在 Wave 收尾统一更新一次
- 无 _module-map.yaml 时跳过模块匹配，仅按文件清单更新 unmapped 部分
这是可选更新（不阻断 execute 完成），但保持 module-impact 与实际变更一致利于 verify 核对与 archive 终审。

### 知识沉淀（主代理在本 Wave 收尾，与 module-impact.md 同批）
本 Wave 各 task 子代理报告里若提到**真正的项目特有坑**（跨变更可复用、未来 agent 可能再次踩到、且不是本任务专属细节），由你在 Wave 收尾统一追加到 \`{SPEC_ROOT}/knowledge/uncategorized.md\`：
- 条目格式：\`## <一句话标题>\` + 一段说明（坑的来龙去脉 + 规避/解法），末尾标注来源（task-XX）
- 不由各 task 子代理分别写（并行改同一文件会互相覆盖），只由主代理在 Wave 收尾统一追加——与 module-impact.md 同一收尾节奏
- 不要为了完成任务而硬凑条目；纯新增/纯样式/单点 bug 修复/临时绕过不写；拿不准时不写，宁缺毋滥
- execute 末步「知识库审阅」会检查待确认条目并提示用户归类

### 完成后
1. 为每个后端 router task 生成 API 端点 artifact——**用 CLI 命令，勿手扫装饰器手写（易漏 endpoint）**：
   - 聚合一次跑全：sillyspec endpoints extract --change <change> --all-tasks（逐 task 卡 allowed_paths 各自提取落盘，<change> = 当前变更名；与 verify 探针 5 聚合对账口径一致）
   - CLI 静态扫描变更文件（FastAPI @router.* / Express router.* / Spring @*Mapping）生成
     {SPEC_ROOT}/.runtime/contract-artifacts/<task-name>/endpoints.json
   - 格式: { "task": "task-XX", "type": "backend_endpoints", "endpoints": [{ "method": "GET", "path": "/api/ppm/xxx" }] }（CLI 已按此格式写好，verify 探针 5 直接消费）
   - 只提单 task（--task task-NN）会让探针 5 用局部端点集对账放大假 missing——多 task 变更必用 --all-tasks
`
}

/**
 * 动态构建 execute 步骤列表
 * @param {string|null} planFilePath - plan 文件路径，null 则用默认 3 Wave
 * @param {{ worktreePath?: string, noWorktree?: boolean }} options
 * @returns {Array} 步骤列表
 */
export function buildExecuteSteps(planFilePath = null, options = {}) {
  const noWorktree = !!options.noWorktree
  let waves
  let changeDir = null

  if (planFilePath && existsSync(planFilePath)) {
    const planContent = readFileSync(planFilePath, 'utf8')
    // 新契约（D-001@v1）：任务注册表在 tasks.md（与 plan.md 同目录），Wave 结构在 plan.md
    const tasksPath = path.join(path.dirname(planFilePath), 'tasks.md')
    const tasksContent = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8') : ''
    const registry = parseTaskRegistry(tasksContent)
    waves = parseWavesFromPlan(planContent, registry)
    changeDir = path.dirname(planFilePath)
  }

  // 没解析出 Wave（plan 不存在或不含可识别 task）→ 默认 3 Wave（向后兼容）
  if (!waves || waves.length === 0) {
    waves = []
    for (let i = 1; i <= 3; i++) {
      waves.push({ index: i, tasks: [{ name: `默认任务 ${i}`, file: 'TBD' }] })
    }
  }

  // 尝试获取 worktree 路径（可能由前缀步骤创建）
  const worktreePath = options.worktreePath || null

  // W3 task-08：ctx 由 execute 启动入口（task-09）透传，进程级单例贯穿 execute/apply/verify
  // （D-013）。缺省=null → buildWavePrompt 退化为单仓单 worktreePath（零回归）。
  const ctx = options.ctx || null

  // 跨 Wave 共享缓存：plan/契约矩阵/task 卡字段注入/模块卡表/design 行集在一次步骤表
  // 构建期间不变，逐 Wave 重读重算是 O(W×T) 纯浪费（见 buildWavePrompt 内 memo 注释）
  const execCache = {}

  const waveSteps = waves.map((wave, i) => ({
    name: `Wave ${i + 1} 执行`,
    mode: 'implementation',
    prompt: buildWavePrompt(wave, i + 1, changeDir, worktreePath, { dispatchMode: options.dispatchMode, branch: options.branch, ctx, _execCache: execCache }),
    outputHint: `Wave ${i + 1} 执行结果`,
    optional: false
  }))

  return [...fixedPrefix, ...waveSteps, ...acceptanceSteps, ...fixedSuffix]
}
