/**
 * SillyHub MCP 后端派发指令模板（task-dispatcher 抽象层）— task-04
 *
 * 定位（D-007）：dispatcher **不是 JS 执行体**。SillyHub 的 MCP tool（create_mission /
 * dispatch_worker / list_workers / report_progress）只有 agent 能调，CLI（Node）进程调不了。
 * 所以本文件 = **派发指令模板生成器**：生成注入 execute prompt 的「派发指令文本」，告诉
 * agent 如何经 SillyHub MCP tool 创建 mission / 派 worker / 轮询终态 / kill lease / 回收；
 * 实际 MCP tool 调用由 agent 执行，本模块不调任何 tool，也不直接 import client.js。
 *
 * 路径 A 探测翻真（task-11，D-005 + R-04）：`isPathASupported()` 读 probe.js 预热的
 * tools/list 探测缓存——`dispatch_worker.inputSchema.properties` 含 `worktree_path` 与
 * `worker_prompt` → true；任一缺失 / 未预热 / 探测失败 → false（保守回退 Local，**绝不硬试路径A**）。
 * env 备选（spike-01 不通过时）：`process.env.SILLYHUB_PATH_A==='1'` → true（手动标记 daemon 侧
 * 已落地）。探测预热住 probe.js `probeSillyHub`（daemon 可达后 best-effort 调 `client.listTools()`），
 * 本模块只缓存探测结果 + 同步读——保持 `isPathASupported()` sync 签名不改 strategy.js /
 * execute.js `getDispatchMode` 调用点（探测 = async，读缓存 = sync，解耦）。
 *
 * 铁律：
 * - converge_mission 不出现在任何指令文本（D-004，SillySpec 自己 apply）；JSDoc 仅作开发者锚点。
 * - worker 不 git commit，改动留 worktree 工作区（D-003@v2 第三处 UB-1，worker_prompt 覆写）。
 * - 不直接调 client，只生成指令由 agent 执行 MCP tool 调用（探测由 probe.js 调 client，本模块仅读缓存）。
 * - 路径 A 检测保守：不支持即回退，不硬试。
 * - 兼容 Win/Linux/macOS：本文件无路径拼接 / 无平台分支，纯模板生成。
 */

/**
 * 路径 A 未落地时 strategy.js 拼到降级提示里的原因说明。
 *
 * 属指令文本（会注入 prompt），故不含 converge_mission 字面（D-004）。strategy 在探测到
 * isPathASupported()=false 时把此串拼进降级提示，引导 agent 回退 Local。
 */
export const PATH_A_DOWNGRADE_REASON =
  '路径A 跨仓未落地：dispatch_worker 不支持 worktree_path / render_worker_prompt 仍硬编码 commit，本次派发回退 Local'

/**
 * SillyHub 后端结果回收约定（worker 终态 → review.json，D-004 + UB-1）。
 *
 * 与 Local 后端回收同构（R-07 屏蔽后端差异）：worker 终态后 SillySpec 主体对 worktree
 * **工作区**做 git diff 写 review.json。差异在 worker 侧产出形态——SillyHub worker **绝不
 * git commit**（路径A 第三处 UB-1，worker_prompt 已覆写覆盖 daemon 默认 commit 行为），改动
 * 全留工作区；合并回主干由 SillySpec 自己 apply（worktree-apply 全门控保留），**不调 SillyHub
 * 合并 tool**（D-004）。
 *
 * 抽成独立常量供 strategy.js 在拼接降级 / 回收段时复用，避免 Local 与 SillyHub 两份回收文案
 * 重复维护。含 `<runId>` 占位符，使用方按实际 contract.runId 替换（见 renderSillyHubInstruction）。
 */
export const SILLYHUB_RECYCLE_RULE = `### 回收约定（worker 终态 → review.json，SillySpec 自己 apply）

worker 终态后，**回收不依赖 worker git commit，也不调 SillyHub 合并 tool**：SillySpec 主体
（你，调度 agent）对 worktree **工作区**做 git diff，按既有 task-review 契约写 review.json；
合并回主干由 SillySpec 自己 apply（worktree-apply / Review Gate / assess 全门控保留）。

1. worker 终态（completed / failed / killed）后，读取该 task 在 worktree 工作区的 git diff
   （task 派发 → 终态的工作区变更；worker 未 commit 故全在工作区，不依赖 worker 自报）
2. 对照 plan.md 与 tasks/task-XX.md 检查实现（不信任 worker 自报，只看当前 task 的 diff）
3. 写入 review.json：\`.runtime/execute-runs/<runId>/tasks/task-XX/review.json\`
4. review.json 写入成功后，该 task 的派发回收完成；合并走 SillySpec apply，不调 SillyHub 合并 tool

review.json 复用既有 task-review 契约（必填字段：schemaVersion / task / base / head /
changedFiles / specVerdict / qualityVerdict / reviewerNotes / requiredEvidence），不发明
新契约。回收屏蔽后端差异：无论 Local 还是 SillyHub worker，SillySpec 都自己 diff worktree
工作区写 review.json，再自己 apply（D-004）。`

/**
 * 路径A 探测结果缓存（task-11）：probe.js `probeSillyHub` 预热 → `isPathASupported` 同步读。
 *
 * 保持 `isPathASupported` sync 签名（strategy.js / execute.js `getDispatchMode` 同步调，不改
 * 调用点）：探测是 async（probe.js 调 client.listTools），读缓存是 sync。未预热（probe 未跑 /
 * 探测失败）→ 默认 false（保守 R-04，不硬试路径A）。模块级单例，进程内有效；测试用
 * `clearPathAProbeCache` 隔离。
 */
let _pathAProbe = { probed: false, supported: false };

/**
 * 写路径A 探测结果（probe.js `probeSillyHub` 在 daemon 可达后预热调用）。
 * @param {boolean} supported - dispatch_worker schema 含 worktree_path + worker_prompt
 */
export function setPathAProbeResult(supported) {
  _pathAProbe = { probed: true, supported: !!supported };
}

/**
 * 清空路径A 探测缓存（测试隔离用；生产中进程重启 / 不需要 TTL，probe 每次可达都重预热带新值）。
 */
export function clearPathAProbeCache() {
  _pathAProbe = { probed: false, supported: false };
}

/**
 * 路径 A 是否已落地（dispatch_worker 支持 caller worktree + worker_prompt 覆写）。
 *
 * task-11 翻真（D-005 + R-04）：读 probe.js 预热的探测结果（probeSillyHub 经 `tools/list` 查
 * `dispatch_worker.inputSchema.properties` 含 `worktree_path` 与 `worker_prompt`）。保持 sync
 * 签名（strategy.js / execute.js `getDispatchMode` 同步调），探测预热在 probe 流程。
 *
 * 判定顺序（保守，**绝不硬试路径A**）：
 * 1. **env 强制开启**：`process.env.SILLYHUB_PATH_A==='1'` → true（spike-01 不通过 / tools/list
 *    不可达时的备选，手动标记 daemon 侧路径A 已落地；优先级最高，让探测不可信时也能启用）
 * 2. 否则读探测缓存：probe 预热且 dispatch_worker schema 全命中（worktree_path + worker_prompt）→ true
 * 3. 未预热 / 探测失败 / schema 缺字段 → false（保守回退 Local，R-04）
 *
 * @returns {boolean} 路径A 可用 → true；否则 false（保守不硬试，R-04）
 */
export function isPathASupported() {
  // 1. env 强制开启（spike-01 备选）：优先级最高，探测不可信 / 不可达时手动启用
  if (process.env.SILLYHUB_PATH_A === '1') return true;
  // 2. 读 probe 预热的 schema 探测缓存（未预热 → supported=false，保守 R-04 不硬试）
  return _pathAProbe.supported;
}

/**
 * @typedef {import('./local-agent.js').DispatchContract} DispatchContract
 * @see design.md「接口定义」DispatchContract：brief / worktreePath / branch / allowedPaths /
 *      readOnly / modelHint / agentProfileHint / runId / missionId（与 task-03 Local 后端同构）
 */

/**
 * 渲染 SillyHub 后端派发指令文本（路径 A 落地后由 strategy.js 注入 execute prompt）。
 *
 * 纯模板生成器：不校验 contract 完整性、不调任何 MCP tool / client，只把 contract 字段拼成
 * 可注入 execute prompt 的中文指令字符串。contract 缺字段时回退到醒目占位符（`<未提供 ...>`），
 * 让 agent 在 prompt 里一眼看到派发前必须补齐的参数，而非静默产出错位指令。
 *
 * 指令含四要点（D-008 / D-003@v2 / UB-6 / D-004）：
 * 1. **一 Wave 一 mission**：agent 先调 create_mission（objective/change_id/budget_usd per Wave），
 *    Wave 内 task→worker 并行 dispatch，Wave 间 mission 串行
 * 2. **dispatch_worker 参数**：mission_id/objective/worktree_path/branch/read_only/model/
 *    agent_profile_id/worker_prompt（覆写：worker 不 git commit）
 * 3. **终态轮询**：agent 轮询 list_workers，per-worker 超时 → report_progress 标记 + kill lease
 *    防双写 + fallback Local 重派
 * 4. **回收约定**：worker 不 commit，SillySpec 自己 diff worktree 写 review.json，不调合并 tool
 *
 * @param {DispatchContract} [contract] - 派发契约（见 design.md DispatchContract 接口定义）
 * @returns {string} 注入 execute prompt 的 SillyHub 后端派发指令文本
 */
export function renderSillyHubInstruction(contract) {
  const c = contract || {}
  const worktreePath = c.worktreePath
  const branch = c.branch
  const allowedPaths = Array.isArray(c.allowedPaths) ? c.allowedPaths : null
  const readOnly = !!c.readOnly
  const brief = c.brief
  const runId = c.runId
  const modelHint = c.modelHint
  const agentProfileHint = c.agentProfileHint
  const missionId = c.missionId

  // 回收约定：替换 <runId> 占位符；runId 缺失保留占位符让 agent 警觉
  const recycleRule = SILLYHUB_RECYCLE_RULE.replaceAll(
    '<runId>',
    runId ? String(runId) : '<未提供 runId>'
  )

  // 各字段缺省醒目占位（派发前必须补齐的参数一眼可见）
  const worktreeDisplay = worktreePath
    ? String(worktreePath)
    : '<未提供 contract.worktreePath — 派发前必须补齐，否则 worker cwd 错位>'
  const branchDisplay = branch
    ? String(branch)
    : '<未提供 contract.branch — 派发前必须补齐 worktree 当前分支>'
  const briefDisplay = brief
    ? String(brief)
    : '<未提供 contract.brief — 派发前必须补齐任务目标与蓝图路径>'
  const missionDisplay = missionId
    ? String(missionId)
    : '<本 Wave mission_id — 先调 create_mission 拿到后填入>'

  const allowedLine = allowedPaths && allowedPaths.length
    ? `- 本次任务边界（allowedPaths）：${allowedPaths.map(p => `\`${p}\``).join(' / ')}（SillySpec 侧 assess/apply 校验，SillyHub 不物化）`
    : '- 本次任务边界（allowedPaths）：未提供，按蓝图 tasks/task-XX.md 的 allowed_paths 为准（SillySpec 侧校验）'
  const modelLine = modelHint
    ? `- \`model\`：\`${modelHint}\`（来自 tasks.md [model:xxx]，映射到 SillyHub model）`
    : '- `model`：未提供（contract.modelHint 缺），沿用 daemon 默认模型'
  const profileLine = agentProfileHint
    ? `- \`agent_profile_id\`：\`${agentProfileHint}\`（来自 contract.agentProfileHint）`
    : '- `agent_profile_id`：未提供（contract.agentProfileHint 缺），沿用 daemon 默认 profile'

  const modeLine = readOnly
    ? '**只读模式（read_only=true）**：worker 只读 / 审查 / 写 review.json，不改源码（注：第一波 execute task 用写模式，acceptance 强制 tier=self，R-03）'
    : '**写模式（read_only=false）**：worker 按蓝图实现源码（TDD），但**绝不 git commit**（见下方 worker_prompt 覆写）'

  return `### 派发后端：SillyHub MCP — 路径 A 落地后启用

本指令用 **SillyHub MCP tool** 派 worker 执行任务（路径 A 落地后由 strategy.js 注入；当前
\`isPathASupported()\` 返回 false，strategy 不会调本指令，而是降级提示 + 回退 Local）。

**你的角色是调度者 + 审查者，不要自己写代码。** 实际 MCP tool 调用由你（调度 agent）执行：
创建 mission → 派 worker → 轮询终态 → kill 异常 lease → 回收 diff。

### 一 Wave 一 mission（D-008）

1. **Wave 开始先建 mission**：调 \`create_mission\` tool 为本 Wave 创建独立 mission
   - 参数：\`objective\`（本 Wave 目标）/ \`change_id\`（SillySpec change id）/ \`budget_usd\`（per Wave 预算）
   - 返回 \`mission_id\`，记下供本 Wave 内所有 task→worker 复用：${missionDisplay}
2. **Wave 内 task → worker 并行 dispatch**：同 Wave 多 task 各调一次 \`dispatch_worker\`，共用本 Wave 的 mission_id（保 Wave 内并行）
3. **Wave 间 mission 串行**：上一 Wave 全 worker 终态 + 回收完成后，下一 Wave 起新 mission（不把全 Wave 塞一个 mission，否则失串行）

### dispatch_worker 参数（每个 task 调一次）

调 \`dispatch_worker\` tool，参数（snake_case 对齐 SillyHub schema；对照 client.js \`dispatchWorker\` 签名）：
- \`mission_id\`：${missionDisplay}
- \`objective\`：${briefDisplay}
- \`worktree_path\`：\`${worktreeDisplay}\`（路径A：worker cwd = SillySpec worktree，D-002）
- \`branch\`：\`${branchDisplay}\`（路径A：worktree 当前分支）
- \`read_only\`：\`${readOnly}\`
${modelLine}
${profileLine}
- \`worker_prompt\`：**必须覆写**（见下方，覆盖 daemon 默认 render_worker_prompt 的 git commit 行为）

${modeLine}
${allowedLine}

### worker_prompt 覆写（D-003@v2 第三处，UB-1 关键）

dispatch_worker 的 \`worker_prompt\` 参数必须传以下覆写文本（路径A 第三处：daemon 默认
\`render_worker_prompt\` 硬编码 \`git add -A && git commit\`，会污染 sillyspec/<change> 分支历史
+ 撞 D-004；用 worker_prompt 覆写让 caller 控制 commit 行为）：

\`\`\`
你是 SillySpec execute 的 worker，在指定 worktree 干活。铁律：
1. 按 objective + 蓝图（tasks/task-XX.md / design.md）实现任务（TDD：先读后写 → 写测试 → 写实现）
2. **绝不执行 git add / git commit / git push**：改动留在工作区（staged 或 unstaged 都行），
   交 SillySpec 主体 git diff 回收（D-004）
3. 不超出 allowedPaths，不碰其他 task 的文件
4. 完成后输出简短自报（改了哪些文件 / 跑了哪些测试 / 是否存疑），不自报 review.json（SillySpec 自己写）
\`\`\`

### 终态轮询 + 超时 kill lease（UB-6）

dispatch 后在当前 step 内主动轮询，不阻塞等待：

1. **轮询 \`list_workers\`**：间隔默认 15s，可配 local.yaml \`dispatch.poll_interval_ms\`
   - 入参 \`mission_id\`；关注每个 worker 的 status（pending → running → completed/failed）
2. **per-worker 超时**：默认可配 local.yaml \`dispatch.worker_timeout_ms\`；超时 → 三步兜底：
   - a. **标记**：调 \`report_progress\` tool（worker_id + 超时说明）记录该 worker 超时
   - b. **kill lease 防双写**：调 \`report_progress\` tool（worker_id + \`kill: true\` + marker）终止 lease
     （等价 client.js \`killLease(workerId)\` 路径；SillyHub 当前无专用 kill tool，路径A 落地后升级为专用 kill）
   - c. **fallback Local 重派**：该 task 改用本机 Agent tool 重派（调 \`sillyspec dispatch hint\` 走 Local 模板）
3. **worker 终态（completed / failed / killed）** → 进入下方回收约定

${recycleRule}`
}
