/**
 * Local 后端派发指令模板（task-dispatcher 抽象层）— task-03
 *
 * 定位（D-007）：dispatcher **不是 JS 执行体**。本机 Agent tool（Claude Code Task 工具）
 * 只有 agent 能调，CLI（Node）进程调不了。所以本文件 = **派发指令模板生成器**：
 * 生成注入 execute prompt 的「派发指令文本」，告诉 agent 如何用本机 Agent tool 启动
 * 子代理；实际 Agent tool 调用由 agent 执行，本模块不调任何 tool。
 *
 * Local 后端 = **默认与降级路径**（D-005），保留现有 buildWavePrompt（src/stages/execute.js）
 * 的本机 Agent tool 派发行为：每任务一个独立子代理、workdir 强制 = worktreePath、
 * worker 终态后 SillySpec 对 worktree 工作区 git diff 写 review.json（复用既有
 * task-review 契约）。SillyHub MCP 不可用 / 未配置 / 路径 A 未落地时全程走此路径，零回归。
 *
 * Local 后端**忽略** contract 中的 modelHint / agentProfileHint：本机 Agent tool 不做
 * 异构模型 / agent 分配，这两字段仅 SillyHub 后端消费。
 */

/**
 * Local 后端结果回收约定（worker 终态 → review.json）。
 *
 * 抽成独立常量供 strategy.js 在拼接「兜底 / 降级 / SillyHub 回收」段时复用，避免 Local
 * 与 SillyHub 两份回收文案重复维护（R-07：回收统一走 review.json，屏蔽后端差异）。
 *
 * 含 `<runId>` 占位符，使用方按实际 contract.runId 替换（见 renderLocalInstruction）。
 */
export const LOCAL_RECYCLE_RULE = `### 回收约定（worker 终态 → review.json）

worker 子代理结束后，**回收不依赖 worker 自报结果，也不依赖 worker git commit**：
SillySpec 主体（你，调度 agent）对 worktree **工作区**做 git diff，按既有 task-review
契约写 review.json。

1. 读取该 task 在 worktree 工作区的 git diff（task 开始 → 完成的变更）
2. 对照 plan.md 与 tasks/task-XX.md 检查实现（不信任 implementer 自报，只看当前 task 的 diff）
3. 写入 review.json：\`{SPEC_ROOT}/.runtime/execute-runs/<runId>/tasks/task-XX/review.json\`（{SPEC_ROOT} 由 CLI 渲染时替换为主仓绝对路径——调度者 cwd 无论在哪都写主仓 .runtime，不写 worktree 副本）
4. review.json 写入成功后，该 task 的派发回收完成

review.json 复用既有 task-review 契约（必填字段：schemaVersion / task / base / head /
changedFiles / specVerdict / qualityVerdict / reviewerNotes / requiredEvidence），不发明
新契约。回收屏蔽后端差异：无论 Local 还是 SillyHub worker，SillySpec 都自己 diff worktree
工作区写 review.json。`

/**
 * @typedef {object} DispatchContract
 * @property {string}  brief              - 任务目标 + 蓝图路径（注入子代理 prompt）
 * @property {string}  worktreePath       - SillySpec worktree 绝对路径（子代理 cwd）
 * @property {string}  branch             - worktree 当前分支
 * @property {string[]} allowedPaths      - task 边界（子代理 prompt 里声明，SillySpec 侧 assess/apply 校验）
 * @property {boolean} readOnly           - execute 写模式=false；true=只读 QA（仅读/diff/写 review.json）
 * @property {string}  [modelHint]        - tasks.md [model:xxx]（Local 忽略，仅 SillyHub 消费）
 * @property {string}  [agentProfileHint] - agent profile（Local 忽略，仅 SillyHub 消费）
 * @property {string}  runId              - SillySpec execute-run id（关联 review.json 路径）
 * @property {string}  [missionId]        - Wave 级 mission id（D-008，SillyHub 专属，Local 忽略）
 */

/**
 * 渲染 Local 后端派发指令文本。
 *
 * 纯模板生成器：不校验 contract 完整性、不调任何 tool，只把 contract 字段拼成可注入
 * execute prompt 的中文指令字符串。contract 缺字段时回退到醒目占位符（`<未提供 ...>`），
 * 让 agent 在 prompt 里一眼看到派发前必须补齐的参数，而非静默产出错位指令。
 *
 * @param {DispatchContract} [contract] - 派发契约（见 design.md DispatchContract 接口定义）
 * @returns {string} 注入 execute prompt 的 Local 后端派发指令文本
 */
export function renderLocalInstruction(contract) {
  const c = contract || {}
  const worktreePath = c.worktreePath
  const branch = c.branch
  const allowedPaths = Array.isArray(c.allowedPaths) ? c.allowedPaths : null
  const readOnly = !!c.readOnly
  const brief = c.brief
  const runId = c.runId

  // 回收约定：替换 <runId> 占位符；runId 缺失保留占位符让 agent 警觉
  const recycleRule = LOCAL_RECYCLE_RULE.replaceAll(
    '<runId>',
    runId ? String(runId) : '<未提供 runId>'
  )

  const workdirDisplay = worktreePath
    ? String(worktreePath)
    : '<未提供 contract.worktreePath — 派发前必须补齐，否则破坏 worktree 隔离>'

  const branchLine = branch
    ? `- worktree 当前分支：\`${branch}\``
    : '- worktree 当前分支：未提供（沿用 worktree 检出时的既有分支）'

  const allowedLine = allowedPaths && allowedPaths.length
    ? `- 本次任务边界（allowedPaths）：${allowedPaths.map(p => `\`${p}\``).join(' / ')}`
    : '- 本次任务边界（allowedPaths）：未提供，按蓝图 tasks/task-XX.md 的 allowed_paths 为准'

  const briefLine = brief
    ? String(brief)
    : '<未提供 contract.brief — 派发前必须补齐任务目标与蓝图路径>'

  const modeLine = readOnly
    ? '5. **只读模式（readOnly=true）**：本子代理只读 / 审查 / 写 review.json，**不改源码**'
    : '5. **写模式（readOnly=false）**：按蓝图实现源码（TDD：先读后写 → 写测试 → 写实现）'

  return `### 派发后端：Local（本机 Agent tool）— 默认与降级路径

本指令用**本机 Agent tool**（Claude Code Task 工具）启动子代理执行任务。这是默认与降级
路径：SillyHub MCP 不可用 / 未配置 / 路径 A 未落地时全程走此路径，派发行为与既有 execute
波次派发等价（零回归）。

**你的角色是调度者 + 审查者，不要自己写代码。** 每个任务由一个独立子代理执行，同 Wave 内
可并行启动多个子代理。

### 启动子代理（必须严格遵守）

调用本机 Agent tool（Task 工具）为该 task 启动一个独立子代理，参数结构范例：

\`\`\`json
{
  "subagent_type": "general",
  "workdir": "${workdirDisplay}",
  "prompt": "在此编写任务描述：任务目标 + 蓝图路径 + 编码铁律（见下方要点）"
}
\`\`\`

### workdir 强制必传 = contract.worktreePath（关键）

**workdir 参数是强制必传的，值必须为 \`${workdirDisplay}\`（contract.worktreePath）。**

- **不传 workdir，子代理会在主工作区（主仓库根）而非 worktree 里读写文件**，把改动写到
  主工作区、**破坏 worktree 隔离**，后续 assess / apply / review.json 全部错位，并可能
  撞其他并行 agent 的改动。
${branchLine}
- 蓝图文件（tasks.md / design.md / tasks/task-XX.md）在主工作区 \`{SPEC_ROOT}/changes/<change>/\`
  下（{SPEC_ROOT} 由 CLI 渲染时替换为主仓绝对路径），可能不在 worktree 中——**读蓝图用主工作区绝对路径，不要拼接到 worktree 路径下**；
  写代码必须落在 workdir（worktree）内。

### 子代理 prompt 要点

在子代理 prompt 里写明：
1. 任务目标（brief）：${briefLine}
2. 蓝图文件路径（让子代理按需读取详情，不要内联整份蓝图污染上下文）
3. 编码铁律：先读后写、TDD、不编造方法、只做蓝图里写的事、遵守边界处理规则、不超出 allowedPaths
4. 如存在模块文档（\`{SPEC_ROOT}/docs/*/modules/\`），按需读取涉及模块的 <module>.md 参考接口约定与数据流（读主仓路径，不读 worktree 副本）
5. 任务含测试代码时，把下方「测试用例设计」整段复制进子代理 prompt，要求子代理按此设计测试用例

{{include: testcase-design}}
${modeLine}
${allowedLine}

### Local 后端忽略的字段（不消费）

本机 Agent tool 不做异构模型 / agent 分配，故 Local 后端**忽略** contract 中的以下字段
（仅 SillyHub 后端消费，此处列出仅为避免 agent 误把它们塞进 Agent tool 参数）：
- \`modelHint\` → SillyHub model 映射，Local 不传给本机 Agent tool
- \`agentProfileHint\` → SillyHub agent_profile_id 映射，Local 不传给本机 Agent tool
- \`missionId\` → SillyHub「一 Wave 一 mission」概念（D-008），Local 无 mission

${recycleRule}`
}
