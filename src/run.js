/**
 * sillyspec run 命令实现
 *
 * CLI 成为流程引擎，AI 变成步骤执行器。
 * 支持多变更并行：每个变更状态存储在 sillyspec.db 中。
 */
import { basename, join, resolve, dirname, relative, isAbsolute, extname } from 'path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync, statSync } from 'fs'
import { writeAtomicSync, renameSyncRetry } from './fs-atomic.js'
import { randomBytes, randomUUID } from 'crypto'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

// W6 Step1: 纯工具抽至 ./run/shared.js（run.js 始终 barrel，外部 import 零感知）
import { resolveSpecDir, resolveChangeDir, resolvePromptIncludes, triggerSync, safeGit, parsePorcelainPath, auditQuickCompletion, WAIT_MARKER_RE } from './run/shared.js'
// barrel re-export: parsePorcelainPath + auditQuickCompletion 被 test 直接 import（契约保留）
export { parsePorcelainPath, auditQuickCompletion } from './run/shared.js'
// W6 Step2: scan profile 数据生成 + quick scan CLI preflight/postcheck 抽至 ./run/scan-profile.js（自洽，无 test 直接 import）
import { computeScanProfile, applyScanProfileSteps, executeScanPreflight, executeScanPostcheck } from './run/scan-profile.js'
// W6 Step2: quick 审计结论打印 + 多变更关联选择抽至 ./run/quick-audit.js（自洽，无 test 直接 import）
import { printQuickAuditReview, resolveQuickLinkedChanges } from './run/quick-audit.js'
// W6 Step3: prompt 渲染主干抽至 ./run/prompt.js（outputStep + applyRootPlaceholders + 模块上下文索引）
import { outputStep } from './run/prompt.js'
// barrel re-export: applyRootPlaceholders 被 test/prompt-placeholders.test.mjs 直接 import（契约保留）
export { applyRootPlaceholders } from './run/prompt.js'
// W6 Step4: gate 级联 + deps 门 + 完成回滚抽至 ./run/gates.js（自洽叶子模块，无 test 直接 import）
import { enforceDepsGate, runStageCompletionGates } from './run/gates.js'
// W6 Step5: completeStep 子 handler + archive 抽至 ./run/complete-handlers.js（自洽叶子，handler 无 test 直接 import）
import { handleArchiveConfirmStep, handlePlanGeneratePlanStep, handleScanProjectListStep, handleWorkflowPostCheck, handleQuickStageCompletion, handleExecuteWaveArtifact, handleExecuteWorktreeCleanup, handleScanStageCompleted } from './run/complete-handlers.js'
// barrel re-export: sanitizeProjectName + validateParsedProjects 被 test 直接 import（随 handleScan 搬走，契约保留）
export { sanitizeProjectName, validateParsedProjects } from './run/complete-handlers.js'
import { ProgressManager } from './progress.js'
import { SCAN_STATUS, POINTER_STATUS, isPointerCorrupted } from './constants.js'
import { allocateQuicklogEntry, completeQuicklogEntry, findQuicklogEntry, validateQuickResult } from './quicklog.js'



/**
 * 在容器/Docker 环境下，git 可能因目录所有权不匹配报 dubious ownership。
 * 使用 -c safe.directory= 临时参数，不污染全局 git config。
 * @param {string} cwd - 仓库根目录
 * @param {string[]} args - git 子命令及参数，如 ['rev-parse', 'HEAD']
 * @returns {{ value: string, error: string|null }}
 */

// ── Wait State Constants ──
const WAIT_MARKERS = ['[WAIT_FOR_USER]', '[NEEDS_CONFIRM]', '[NEEDS_DECISION]']

/**
 * 格式化 waitOptions 为人类可读字符串
 */
function formatWaitOptions(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return raw
  } catch {
    return raw
  }
}

/**
 * 格式化 repeatableWait 步骤的历史用户回答，注入到重新输出的 step prompt 前。
 * @param {object} step - progress 中的 step 对象（含 waitAnswers 数组）
 * @returns {string|null} 格式化的历史文本，或 null（无历史）
 */
function formatWaitHistory(step) {
  const answers = Array.isArray(step.waitAnswers) ? step.waitAnswers : []
  if (answers.length === 0) return null
  let text = `本步骤历史用户回答（共 ${answers.length} 轮）：\n`
  for (const item of answers) {
    text += `\n${item.round}. ${item.answer}`
    if (item.question) {
      text += `\n   对应问题/摘要：${item.question}`
    }
  }
  const maxRounds = step.maxWaitRounds || null
  if (maxRounds && answers.length >= maxRounds) {
    text += `\n\n已达到 maxWaitRounds=${maxRounds}。请基于以上回答总结需求；除非仍有阻塞问题，否则完成本步骤并进入方案讨论。`
  } else {
    text += `\n\n请判断信息是否足够：如果足够，完成本步骤；如果仍缺关键约束，再提出一个问题并 --wait。`
  }
  return text
}

/**
 * 解析规范目录路径
 * 向上查找含 .sillyspec 的祖先目录，类似 git 找 .git 的逻辑。
 * @param {string} cwd - 项目根目录（或子目录）
 * @param {object} [opts]
 * @param {string} [opts.specDir] - 用户指定的 specDir（通过 --spec-dir 或 --spec-root）
 * @returns {string} 规范目录的绝对路径
 */
// resolveSpecDir → ./run/shared.js（W6 Step1）
import { stageRegistry, auxiliaryStages } from './stages/index.js'
import { checkTransition, runValidators, validateChangeExists } from './stage-contract.js'
import { buildExecuteSteps } from './stages/execute.js'
import { buildPlanSteps } from './stages/plan.js'
import { formatExecuteSummary } from './worktree-apply.js'
import { classifyChange } from './classify-change.js'
import { detectRiskProfile } from './change-risk-profile.js'
import { definition as brainstormAutoDef } from './stages/brainstorm-auto.js'


/**
 * 同步触发辅助函数：_write 后 best-effort 同步到平台
 */
/**
 * 解析单行 `git status --porcelain` 输出为文件路径。
 * porcelain 格式：`XY<SP>path`（XY = 2 字符状态码）。
 * - 路径含空格/特殊字符时 git 以 C 风格加引号（如 `?? "front end.txt"`），需去引号 + 反转义。
 * - 重命名显示为 `R  old -> new`，取新路径（当前存在的文件）。
 * - 反斜杠归一化为正斜杠（Windows 路径）。
 * ⚠️ 调用方不要对【整段多行】输出先 .trim() 再 split——会削掉首行前导空格（首行 status 的空格），
 *   使 slice(3) 误吃首文件路径首字符（实测 ` M frontend/...` → "rontend/..."，见 guard.json baseline）。
 *   应直接 split('\n').filter(Boolean)，每行单独解析。
 */

// triggerSync → ./run/shared.js（W6 Step1）

/**
 * 审批检查辅助函数：execute 阶段启动前检查
 * @returns {{ status: string, reason?: string } | null}
 */
async function checkApproval(cwd, changeName, platformOpts = {}) {
  // 平台模式不需要 CLI 内置审批检查
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return null
  try {
    const syncMod = await import('./sync.js')
    return await syncMod.checkApproval(changeName, cwd)
  } catch (e) {
    return null
  }
}

// resolveChangeDir → ./run/shared.js（W6 Step1）

/**
 * 自动探测并设置 currentChange（唯一变更目录时）
 * @returns {boolean} 是否设置了 currentChange
 */
function autoDetectChange(progress, cwd, specDir = null) {
  if (progress.currentChange) return false
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return false
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) {
    progress.currentChange = entries[0].name
    return true
  }
  return false
}

/**
 * 从 progress 或变更目录推导变更名
 */
function resolveChangeName(cwd, progress, specDir = null) {
  if (progress.currentChange) return progress.currentChange
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return entries[0].name
  return null
}

/**
 * 获取阶段的步骤定义（execute 需要动态构建）
 */
async function getStageSteps(stageName, cwd, progress, specDir = null) {
  if (stageName === 'execute') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    let planFile = null
    let worktreePath = null
    if (changeDir) {
      const p = join(changeDir, 'plan.md')
      if (existsSync(p)) planFile = p
      // 自动检测 worktree 路径，注入 Wave prompt 的 workdir 指令
      // 修复：之前未传 worktreePath 给 buildExecuteSteps，导致 Wave prompt 缺失工作目录指令，
      // 子代理可能把文件写到主工作区而非 worktree 内，破坏隔离。
      try {
        const changeName = basename(changeDir)
        const { WorktreeManager } = await import('./worktree.js')
        const wm = new WorktreeManager({ cwd })
        const meta = wm.getMeta(changeName)
        if (meta?.worktreePath && existsSync(meta.worktreePath)) {
          worktreePath = meta.worktreePath
        }
      } catch {
        // 无 worktree meta 不阻断——可能是首次启动或 in-place 模式
      }
    }
    return buildExecuteSteps(planFile, { worktreePath })
  }
  if (stageName === 'plan') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    return buildPlanSteps(changeDir)
  }
  const def = stageRegistry[stageName]
  return def ? def.steps : null
}

/**
 * 确保阶段的 steps 已初始化到 progress
 */
export async function ensureStageSteps(progress, stageName, cwd, specDir = null) {
  if (!progress.stages) progress.stages = {}

  const steps = await getStageSteps(stageName, cwd, progress, specDir)
  if (!steps) return false

  if (!progress.stages[stageName] || !progress.stages[stageName].steps || progress.stages[stageName].steps.length === 0) {
    progress.stages[stageName] = {
      status: 'in-progress',
      startedAt: new Date().toLocaleString('zh-CN',{hour12:false}),
      completedAt: null,
      steps: steps.map(s => ({ name: s.name, status: 'pending' }))
    }
    return true // 需要写入
  }

  // 检查步骤数量是否匹配（execute 动态步骤可能变化）
  if (progress.stages[stageName].steps.length !== steps.length) {
    const oldSteps = progress.stages[stageName].steps
    progress.stages[stageName].steps = steps.map(s => {
      const old = oldSteps.find(step => step.name === s.name)
      if (old) return old  // 精确名命中 → 保留旧状态
      // migratedFrom：新步骤是合并/重命名来的（如 brainstorm 13→8 折叠）。
      // 吸收的旧步骤全部 completed → 新步骤标 completed，避免 completed 丢失导致 currentIdx 回跳。
      if (Array.isArray(s.migratedFrom) && s.migratedFrom.length > 0) {
        const migrated = oldSteps.filter(step => s.migratedFrom.includes(step.name))
        if (migrated.length > 0 && migrated.every(step => step.status === 'completed')) {
          return { name: s.name, status: 'completed', migratedFrom: true }
        }
      }
      return { name: s.name, status: 'pending' }
    })
    return true
  }

  return false
}


/**
 * Plan postcheck 的执行代理：委托给 plan-postcheck.js 模块
 */
async function executePlanPostcheck(cwd, platformOpts, progress) {
  // resolveChangeDir 是本模块 line 505 定义的本地函数；历史上曾误从 ./modules.js
  // 导入（该模块未导出此函数，得到 undefined），导致 plan-postcheck.js:388 抛
  // "resolveChangeDir is not a function"。详见 docs/sillyspec/plan-postcheck-resolvechangedir-not-a-function.md
  const { executePlanPostcheck: runPostcheck } = await import('./stages/plan-postcheck.js')
  await runPostcheck({
    cwd,
    specRoot: platformOpts?.specRoot,
    resolveChangeDir,
    progress
  })
}


/**
 * sillyspec run <stage> 主命令
 */
export async function runCommand(args, cwd, specDir = null, opts = {}) {
  // W1-B: run <stage> 暂不支持 --json。之前 --json 进 knownFlags 白名单却从不读取（静默吞），
  // agent 按 gate/derive 契约期望 envelope 实则拿到混合人类文本。显式 fail-fast 杜绝歧义；
  // 完整 run envelope 待 outputStep 重构（W6）后支持（prompt + nextAction 结构化）。
  if (opts.json) {
    console.error('❌ run <stage> 暂不支持 --json（静默吞是 bug，故显式拒绝）。')
    console.error('   查事实用 gate/derive（支持 --json envelope）；run 输出人类可读 prompt 供 agent 直接执行。')
    process.exit(2) // 用法错 → exit 2
  }
  // 解析参数
  const stageName = args[0]
  const flags = args.slice(1)

  if (!stageName) {
    console.error('❌ 请指定阶段，例如: sillyspec run brainstorm')
    console.error(`可选: ${Object.keys(stageRegistry).join(', ')}, auto`)
    process.exit(2) // 用法错 → exit 2
  }

  if (!stageRegistry[stageName] && stageName !== 'auto') {
    console.error(`❌ 未知阶段: ${stageName}`)
    console.error(`可选: ${Object.keys(stageRegistry).join(', ')}, auto`)
    process.exit(2) // 用法错 → exit 2
  }

  // ── cwd 纠正：向上查找真实项目根 ──
  // 防止多 project 工作区中 cwd 停在子目录（如 backend/）时
  // 状态写入子目录下误建的 .sillyspec，导致状态分裂
  if (!specDir && !existsSync(join(cwd, '.sillyspec-platform.json'))) {
    // 平台模式（cwd 有 .sillyspec-platform.json 指针）不做 cwd 纠正：指针已明确 specDir，
    // 向上找 .sillyspec 反而会撞到无关项目（如用户 home 的 .sillyspec），导致 --done 恢复
    // 读写 ~/.sillyspec-platform.json 出错的 specRoot。
    const resolvedRoot = resolveSpecDir(cwd)
    if (resolvedRoot && resolvedRoot !== join(cwd, '.sillyspec')) {
      const realRoot = dirname(resolvedRoot)
      if (realRoot !== cwd) {
        cwd = realRoot
      }
    }
  }

  // 平台模式参数（供 SillyHub 等平台调用）
  // --spec-dir 是统一参数名，--spec-root 保留为向后兼容别名
  const getFlagValue = (name) => {
    const idx = flags.indexOf(name)
    return idx !== -1 && flags[idx + 1] ? flags[idx + 1] : null
  }
  const isDone = flags.includes('--done')
  const isSkip = flags.includes('--skip')
  const isStatus = flags.includes('--status')
  const isReset = flags.includes('--reset')
  const isReopen = flags.includes('--reopen')
  const fromStepValue = getFlagValue('--from-step')
  const isConfirm = flags.includes('--confirm')
  const isSkipApproval = flags.includes('--skip-approval')
  const isWait = flags.includes('--wait')
  const isContinue = flags.includes('--continue')
  const isNonInteractive = flags.includes('--non-interactive')
  const isInteractive = flags.includes('--interactive')
  const waitReason = getFlagValue('--reason')
  const waitOptions = getFlagValue('--options')
  const continueAnswer = getFlagValue('--answer')
  const confirmMode = getFlagValue('--confirm-mode')
  const resolvedSpecDir = specDir || getFlagValue('--spec-dir') || getFlagValue('--spec-root')
  const platformOpts = {
    specRoot: resolvedSpecDir ? resolve(resolvedSpecDir) : null,
    runtimeRoot: getFlagValue('--runtime-root') ? resolve(getFlagValue('--runtime-root')) : null,
    workspaceId: getFlagValue('--workspace-id'),
    scanRunId: getFlagValue('--scan-run-id'),
  }

  // 跨 --done 生命周期：从 metadata 文件恢复 platformOpts
  // 首次 scan 时写入，所有后续调用（包括 run、--done、--skip）都读取
  // 优先在 specDir 下查找，否则回退到 cwd/.sillyspec/.runtime/
  let specRoot = platformOpts.specRoot || resolveSpecDir(cwd)
  // 平台参数恢复策略：
  // 1. 优先检查 cwd/.sillyspec-platform.json（轻量指针文件，不污染 .sillyspec 结构）
  // 2. 然后检查 specRoot/.runtime/platform-scan.json（首次 scan 写入）
  const platformPointer = join(cwd, '.sillyspec-platform.json')
  const platformScanFile = join(specRoot, '.runtime', 'platform-scan.json')
  let platformOptsFile = existsSync(platformPointer) ? platformPointer : platformScanFile
  let platformFileExists = existsSync(platformOptsFile)
  // 如果命令行没传 spec-root，尝试从持久化文件恢复
  if (!platformOpts.specRoot && !platformOpts.runtimeRoot) {
    if (platformFileExists) {
      try {
        const { readFileSync } = await import('fs')
        const saved = JSON.parse(readFileSync(platformOptsFile, 'utf8'))
        if (saved.specRoot) platformOpts.specRoot = saved.specRoot
        if (saved.runtimeRoot) platformOpts.runtimeRoot = saved.runtimeRoot
        if (saved.workspaceId) platformOpts.workspaceId = saved.workspaceId
        if (saved.scanRunId) platformOpts.scanRunId = saved.scanRunId
        // 平台模式 fail-fast：文件存在但缺少 specRoot
        if (!platformOpts.specRoot && !platformOpts.runtimeRoot) {
          console.error(`❌ 平台模式参数文件存在但缺少 specRoot/runtimeRoot: ${platformOptsFile}`)
          console.error('   可能原因：platform-scan.json 损坏或写入不完整')
          console.error('   解决：重新运行首次 scan 并传入 --spec-root')
          process.exit(2) // 环境错（平台文件损坏）→ exit 2
        }
        // 恢复成功：更新 specRoot（初始值可能是 cwd/.sillyspec，恢复后应为真实 specDir）
        specRoot = platformOpts.specRoot || specRoot
      } catch (e) {
        console.error(`❌ 平台模式参数文件读取失败: ${platformOptsFile}`)
        console.error(`   错误: ${e.message}`)
        console.error('   可能原因：文件损坏')
        console.error('   解决：删除该文件并重新运行首次 scan 传入 --spec-root')
        process.exit(2) // 环境错（文件损坏）→ exit 2
      }
    }
  }
  // 持久化 platformOpts
  // 在 specRoot/.runtime/ 写主文件，同时在 cwd/.sillyspec/.runtime/ 写恢复指针
  if (platformOpts.specRoot || platformOpts.runtimeRoot) {
    try {
      const { mkdirSync, writeFileSync } = await import('fs')
      mkdirSync(join(specRoot, '.runtime'), { recursive: true })
      writeFileSync(platformOptsFile, JSON.stringify({
        specRoot: platformOpts.specRoot,
        runtimeRoot: platformOpts.runtimeRoot,
        workspaceId: platformOpts.workspaceId,
        scanRunId: platformOpts.scanRunId,
        savedAt: new Date().toISOString(),
      }, null, 2) + '\n')
      // 恢复指针：在 cwd 下写 .sillyspec-platform.json（不在 .sillyspec 内，不污染源码结构）
      // 供后续 --done（不带 --spec-root）找到 specDir
      writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({
        specRoot: platformOpts.specRoot,
        runtimeRoot: platformOpts.runtimeRoot,
        workspaceId: platformOpts.workspaceId,
        scanRunId: platformOpts.scanRunId,
        savedAt: new Date().toISOString(),
      }, null, 2) + '\n')
    } catch {
      // 静默失败，不影响主流程
    }
  }

  // 统一规范基路径：平台模式用 specRoot，本地模式用 cwd/.sillyspec
  // runCommand 后续所有 .sillyspec/ 操作必须用 specBase
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')

  // 平台模式：首次接入时清理旧版本残留的 cwd/.sillyspec/（防止源码污染）。
  // ⚠️ 同 init.js：必须保护真实资产（changes/、projects/、sillyspec.db）。
  // 只在「首次」执行一次——用 cwd 下的 .sillyspec-platform-cleaned 标记文件记录已处理，
  // 后续每次 run 直接跳过，避免重复检查 + 红叉噪声（此清理不阻塞流程、不动真实资产）。
  if (platformOpts.specRoot) {
    const legacyDir = join(cwd, '.sillyspec')
    const cleanedMarker = join(cwd, '.sillyspec-platform-cleaned')
    if (!existsSync(cleanedMarker)) {
      if (existsSync(legacyDir)) {
        let hasChanges = false;
        try {
          const cd = join(legacyDir, 'changes');
          if (existsSync(cd)) hasChanges = readdirSync(cd).length > 0;
        } catch {}
        let hasProjects = false;
        try {
          const pd = join(legacyDir, 'projects');
          if (existsSync(pd)) hasProjects = readdirSync(pd).length > 0;
        } catch {}
        const hasDb = existsSync(join(legacyDir, 'sillyspec.db'));

        if (hasChanges || hasProjects || hasDb) {
          // 真实资产存在：只清运行时残留（白名单保留 worktrees/进度），不整删
          const { cleanupRuntimeResidue } = await import('./init.js')
          cleanupRuntimeResidue(legacyDir);
          console.log('ℹ️  [sillyspec] 源码目录 .sillyspec/ 含真实资产，已跳过整删，仅清理运行时残留（仅本次首次，后续不再提示）。');
        } else {
          try { rmSync(legacyDir, { recursive: true, force: true }) } catch {}
          if (!existsSync(legacyDir)) console.log('🧹 已清理旧版本残留的源码 .sillyspec/ 目录');
        }
      }
      // 标记本 cwd 已做平台残留清理决策，后续 run 跳过（即使之后 .sillyspec/ 被重建也不误清）
      try { writeFileSync(cleanedMarker, new Date().toISOString() + '\n') } catch {}
    }
  }

  // 解析 --output
  let outputText = null
  const outputIdx = flags.indexOf('--output')
  if (outputIdx !== -1 && flags[outputIdx + 1]) {
    outputText = flags[outputIdx + 1]
  }

  // 解析 --input
  let inputText = null
  const inputIdx = flags.indexOf('--input')
  if (inputIdx !== -1 && flags[inputIdx + 1]) {
    inputText = flags[inputIdx + 1]
  }

  // 解析 --linked-changes <a,b|none>（quick 专用：显式声明关联变更，CI/脚本友好）
  // 与 --change 解耦：--linked-changes 语义清晰（关联变更），不与「指定变更名」混淆。
  // null = 未指定（走持久化/交互/兼容回退）；[] = 显式 none（不关联）；[...] = 显式列表
  let explicitLinked = null
  const linkedIdx = flags.indexOf('--linked-changes')
  if (linkedIdx !== -1 && flags[linkedIdx + 1]) {
    const v = flags[linkedIdx + 1].trim()
    explicitLinked = v.toLowerCase() === 'none' ? [] : v.split(',').map(s => s.trim()).filter(Boolean)
  }

  // 解析 --change <name>（quick 阶段向后兼容：逗号分隔作为「关联变更」；
  // 历史写法，语义与「指定变更名」冲突，新用法建议改用 --linked-changes）
  let changeName = null
  let linkedChanges = []
  const changeIdx = flags.indexOf('--change')
  if (changeIdx !== -1 && flags[changeIdx + 1]) {
    changeName = flags[changeIdx + 1]
    if (stageName === 'quick') {
      linkedChanges = changeName.split(',').map(s => s.trim()).filter(Boolean)
      changeName = null
    }
  }
  // --linked-changes 优先于 --change（显式 > 隐式兼容）
  if (explicitLinked !== null) {
    linkedChanges = explicitLinked
  }
  // quick 会话隔离（D-001@v1 + D-003@v1 + §4.4 跨进程传递）：每会话用 sessionId 作 changeName，
  // DB 分行 progress.quick-<uuid8>，避免并行 quick 会话共享单行 progress.default.quick 互相覆盖。
  // sessionId = crypto.randomUUID 前 8 hex（摒弃旧 quick-YYYYMMDD-HHMMSS 时间戳，同秒并发撞）。
  // crypto.randomUUID 从 node:crypto import（兼容 engines node>=18，不依赖 Node 19+ 全局）。
  //
  // --done 跨进程恢复 sessionId 的优先级（§4.4）：
  //   1. --change quick-<uuid8>（单值且匹配 sessionId 形态）→ 精确指定本会话 sessionId
  //      （quick 的 --change 历史被复用为 linkedChanges 见上 1370-1377；此处对「恰好一个 quick-<8hex>」
  //       特例识别为 sessionId，多值/不匹配仍走 linkedChanges 语义，向后兼容）
  //   2. 未识别出 sessionId 且为 --done → fallback 读 .runtime/current-quick-run-id（单会话兼容；
  //      多会话时可能拿到他者，文档声明建议带 --change）
  //   3. 仍读不到 → 生成新 UUID（兼容旧行为；进度可能命中空行，由后续 pm.read 兜底）
  const QUICK_SID_RE = /^quick-[0-9a-f]{8}$/
  let quickSessionId = null
  if (stageName === 'quick') {
    // 1373-1376 已把 quick 的 --change 值清进 linkedChanges、changeName 置 null。
    // 此处回看 --change 原始值：若恰好是单个 quick-<8hex> → 识别为本会话 sessionId（精确恢复），
    // 并撤销把它当 linkedChanges 的误判。多值或不匹配 → 维持 linkedChanges 语义（旧兼容）。
    const rawChange = changeIdx !== -1 && flags[changeIdx + 1] ? flags[changeIdx + 1].trim() : null
    const rawIsSingleSid = rawChange && rawChange.indexOf(',') === -1 && QUICK_SID_RE.test(rawChange)
    if (rawIsSingleSid) {
      // --done --change quick-<uuid8>：精确恢复（撤销 1373-1376 把它误当 linkedChanges）
      quickSessionId = rawChange
      changeName = rawChange
      linkedChanges = []
    } else if (!changeName) {
      // 未精确指定：非 --done 必生成新 sessionId；--done 先 fallback current-quick-run-id，读不到再生成
      const isDoneLike = isDone || isStatus || isSkip || isReset || isReopen
      if (isDoneLike) {
        try {
          const runtimeRoot = platformOpts.runtimeRoot || join(specRoot, '.runtime')
          const idFile = join(runtimeRoot, 'current-quick-run-id')
          if (existsSync(idFile)) {
            const v = readFileSync(idFile, 'utf8').trim()
            if (QUICK_SID_RE.test(v)) quickSessionId = v
          }
        } catch {}
      }
      if (!quickSessionId) {
        quickSessionId = 'quick-' + randomUUID().slice(0, 8)
      }
      changeName = quickSessionId
    } else {
      // 用户显式传了非 sessionId 形态的变更名 → 尊重，不生成 UUID（旧兼容路径）
      quickSessionId = changeName
    }
  }

  // 解析 --files a.js,b.js（quick 专用：显式声明 allowedFiles）
  let quickFiles = []
  const filesIdx = flags.indexOf('--files')
  if (filesIdx !== -1 && flags[filesIdx + 1]) {
    quickFiles = flags[filesIdx + 1].split(',').map(f => f.trim()).filter(Boolean)
  }

  const isAllowNew = flags.includes('--allow-new')
  const isForceBaseline = flags.includes('--force-baseline')
  const isForceRescan = flags.includes('--force-rescan')

  // 未知参数 fail-fast
  const knownFlags = new Set([
    '--done', '--skip', '--status', '--reset', '--confirm', '--skip-approval',
    '--wait', '--continue', '--non-interactive', '--interactive',
    '--reason', '--options', '--answer', '--confirm-mode',
    '--output', '--input', '--change', '--linked-changes',
    '--spec-dir', '--spec-root', '--runtime-root', '--workspace-id', '--scan-run-id',
    '--files', '--allow-new', '--force-baseline', '--force-rescan',
    '--json', '--dir', '--help',
    '--reopen', '--from-step', '--mode',
  ])
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i]
    if (f.startsWith('--')) {
      if (!knownFlags.has(f)) {
        console.error(`❌ 未知参数: ${f}`)
        console.error(`已知参数: ${[...knownFlags].sort().join(', ')}`)
        process.exit(2) // 用法错 → exit 2
      }
      // 跳过 value 参数
      i++
    }
  }

  const isAuxiliary = auxiliaryStages.includes(stageName)
  // scan 元数据追踪（存储在 stageData.scanMeta 中，completeStep 通过 progress 访问）

  const pm = new ProgressManager({ specDir: specRoot })

  // quick 阶段：确定关联变更
  // 优先级：--linked-changes / --change 显式 > 已持久化 quick-guard.json（--done 复用）> 交互式 > 非交互 fallback
  // 关键：--done 收尾时复用首次 run 持久化的 linkedChanges，不在管道/CI 下重复弹交互 prompt。
  // explicitLinked === null 且未传 --change 时才进入此分支（显式 --linked-changes none 不应触发交互）。
  if (stageName === 'quick' && explicitLinked === null && linkedChanges.length === 0) {
    // D-002：guard 按 session 存（.runtime/quick-sessions/<sessionId>/guard.json）。
    // sessionId == changeName == quick-<uuid8>（上面参数解析已确定）。回退读旧单文件 quick-guard.json（task-03 前兼容）。
    let persistedLinked = null
    try {
      const sessionGuardFile = join(specRoot, '.runtime', 'quick-sessions', changeName, 'guard.json')
      const legacyGuardFile = join(specRoot, '.runtime', 'quick-guard.json')
      const g = existsSync(sessionGuardFile)
        ? JSON.parse(readFileSync(sessionGuardFile, 'utf8'))
        : (existsSync(legacyGuardFile) ? JSON.parse(readFileSync(legacyGuardFile, 'utf8')) : null)
      if (g && Array.isArray(g.linkedChanges)) persistedLinked = g.linkedChanges
    } catch {}
    if (persistedLinked) {
      linkedChanges = persistedLinked
    } else {
      linkedChanges = await resolveQuickLinkedChanges({
        pm, cwd, specDir: specRoot, quickFiles,
        taskDescription: inputText || '',
        nonInteractive: isNonInteractive,
      })
    }
  }

  // execute 阶段必须带 --change：不允许自动检测或默认值，变更名必须由 agent 显式传入
  // --status 豁免（纯查看不需要指定变更）
  if (stageName === 'execute' && !changeName && !isStatus) {
    console.error('❌ execute 阶段必须用 --change <变更名> 指定要操作的变更。')
    console.error('   agent 必须传参，不设默认值、不做自动检测。')
    console.error('   请加 --change <变更名> 重新执行。')
    process.exit(2) // 用法错（execute 必须显式 --change）→ exit 2
  }

  // --change 变更名存在性校验（治 cwd 漂移误匹配，缺陷 execute-in-place-windows-pitfalls 坑5）：
  // 必须在 pm.read/initChange 之前——initChange 会为 --change 指定的新名字创建 changes/ 目录，
  // 校验若在其后则目录已存在、永远通过。用原始 changeName（--change 参数），覆盖 plan/execute/
  // verify/archive；quick-<8hex> sessionId 与 brainstorm 新建豁免（见 validateChangeExists）。
  const changeMissing = validateChangeExists(specBase, stageName, changeName)
  if (changeMissing) {
    console.error(`❌ ${changeMissing.message}`)
    console.error(`   可能 cwd 漂移——当前 cwd=${cwd}，命中的 spec=${specBase}。`)
    console.error(`   若意图操作别的项目，请 cd 到对应项目根，或用 --spec-dir 指定正确的 spec 目录。`)
    process.exit(2) // 环境错（cwd/spec 漂移）→ exit 2
  }

  let progress = await pm.read(cwd, changeName)

  if (!progress) {
    // 如果指定了变更名或有变更目录，自动初始化变更的 progress
    const autoChange = changeName || resolveChangeNameAuto(cwd, specRoot)
    if (autoChange) {
      progress = await pm.initChange(cwd, autoChange)
    } else if (isAuxiliary) {
      let autoName = changeName || resolveChangeNameAuto(cwd, specRoot) || 'default'
      // archive 特例：归档后变更从活跃列表排除（listChanges WHERE status='active'），
      // 不带 --change 回退 default 会读错变更。无活跃变更时取最新归档变更，读其现有 progress。
      if (stageName === 'archive' && autoName === 'default') {
        try {
          const archiveDir = join(specBase, 'changes', 'archive')
          if (existsSync(archiveDir)) {
            const latest = readdirSync(archiveDir)
              .filter(d => /^\d{4}-\d{2}-\d{2}-.+/.test(d))
              .sort()
              .pop()
            if (latest) {
              autoName = latest.replace(/^\d{4}-\d{2}-\d{2}-/, '')
              progress = await pm.read(cwd, autoName)
            }
          }
        } catch {}
      }
      changeName = autoName
      if (!progress) {
        progress = await pm.initChange(cwd, autoName)
        // initChange 可能因 project 表为空返回 null
        if (!progress) {
          progress = { currentStage: stageName, stages: {}, lastActive: new Date().toLocaleString('zh-CN', { hour12: false }), project: '' }
        }
      }
    } else {
      // brainstorm 作为流程入口，自动生成变更名并初始化
      if (stageName === 'brainstorm') {
        if (isDone) {
          console.error('❌ --done 找不到变更进度数据。')
          console.error('   请用 --change <变更名> 指定要完成的变更，')
          console.error('   或先运行 sillyspec run brainstorm --change <变更名> 初始化。')
          process.exit(2) // 用法错（--done 找不到变更，未传 --change）→ exit 2
        }
        const date = new Date().toISOString().slice(0, 10)
        const autoName = `${date}-new-change-${randomBytes(4).toString('hex')}`
        console.log(`🔄 自动创建变更：${autoName}`)
        console.log(`  提示：可以用 --change <名称> 指定自定义变更名`)
        console.log(`  或事后重命名：sillyspec change-rename ${autoName} <新名称>`)
        progress = await pm.initChange(cwd, autoName)
        changeName = autoName
      } else {
        console.error('❌ 未找到进度数据，请先运行 sillyspec init 或指定 --change <变更名>')
        process.exit(2) // 环境错（未 init / 未传 --change）→ exit 2
      }
    }
  }

  // 确保 progress 有 currentChange
  const effectiveChange = changeName || progress.currentChange || resolveChangeName(cwd, progress, specRoot)

  // -- auto 模式：自动推进所有流程阶段
  if (stageName === 'auto') {
    return await runAutoMode(pm, progress, cwd, flags, effectiveChange, platformOpts)
  }

  // --change 只作为变更名标识，不再拦截流程
  // 注册变更到全局活跃列表（如果尚未注册）
  if (effectiveChange) {
    await pm.registerChange(cwd, effectiveChange)
  }

  // --reset
  if (isReset) {
    return await resetStage(pm, progress, stageName, cwd, effectiveChange, platformOpts)
  }

  // ── 规则 1：completed 阶段直接 run，拒绝（但 --status 放行）──
  const stageStatus = progress.stages[stageName]?.status
  if (stageStatus === 'completed' && !isReopen && !isStatus) {
    console.error(`\n❌ ${stageName} 阶段已完成。`)
    console.error(`   使用 --reopen 进行修订，或 --reset 从头开始。`)
    console.error(`   修订示例: sillyspec run ${stageName} --reopen --from-step <步骤序号或名称>`)
    process.exit(1)
  }

  // ── 规则 5：stale 阶段直接 run，拒绝（但 --status / --reset 放行）──
  if (stageStatus === 'stale' && !isReopen && !isStatus && !isReset) {
    const staleReason = progress.stages[stageName]?.staleReason || '上游阶段已修订'
    console.error(`\n⚠️ ${stageName} 阶段已失效（stale）。`)
    console.error(`   原因：${staleReason}`)
    console.error(`   使用 --reopen --from-step <步骤> 进行修订，或 --reset 从头开始。`)
    process.exit(1)
  }

  // ── --reopen 处理 ──
  if (isReopen) {
    // stale/revising 阶段可能 steps 为空，或者 execute 阶段的 steps 需要从最新 plan.md 刷新
    const stageDataPre = progress.stages[stageName]
    const needsInit = !stageDataPre || !stageDataPre.steps || stageDataPre.steps.length === 0
    // execute 阶段在 reopen 时需要从最新 plan.md 重新解析 steps（plan 可能已变更）
    if (needsInit || stageName === 'execute') {
      const freshSteps = await getStageSteps(stageName, cwd, progress, specRoot)
      if (freshSteps && freshSteps.length > 0) {
        if (!progress.stages[stageName]) progress.stages[stageName] = { status: 'stale', steps: [] }
        progress.stages[stageName].steps = freshSteps.map(s => ({ name: s.name, status: 'pending' }))
        await pm._write(cwd, progress, effectiveChange)
        progress = await pm.read(cwd, effectiveChange) || progress
      }
    }

    const result = await pm.reopenStage(cwd, stageName, {
      fromStep: fromStepValue,
      changeName: effectiveChange,
    })
    if (!result.ok) {
      console.error(`\n❌ ${result.error}`)
      if (stageStatus === 'completed') {
        console.error(`\n   提示：sillyspec run ${stageName} --reopen --from-step <步骤序号或名称>`)
      }
      process.exit(1)
    }
    console.log(`\n🔧 ${stageName} 阶段已重新打开（revision ${result.revision}）`)
    console.log(`   从步骤「${result.fromStep}」开始修订`)
    console.log(`   该步骤及之后的产出需要重新生成。`)
    if (stageName === 'execute') console.log(`   ⚡ execute 步骤已从最新 plan.md 重新解析。`)
    console.log('')

    // 重新读取 progress
    progress = await pm.read(cwd, effectiveChange) || progress

    // 注入 revision context 到 platformOpts，供 outputStep 使用
    const stageData = progress.stages[stageName]
    if (stageData && stageData.revision > 0) {
      platformOpts._revision = {
        revision: stageData.revision,
        fromStep: stageData.reopenedFromStep,
      }
    }
  } else {
    // 非 reopen 的正常执行：如果阶段处于 revising 状态，也注入 revision context
    const revStageData = progress.stages[stageName]
    if (revStageData && revStageData.status === 'revising' && revStageData.revision > 0 && !platformOpts._revision) {
      platformOpts._revision = {
        revision: revStageData.revision,
        fromStep: revStageData.reopenedFromStep,
      }
    }
  }

  // quick 启动（非 --done）：reset steps + 写 current-quick-run-id（本会话 sessionId，作 --done fallback）。
  // sessionId 已在参数解析阶段生成（quickSessionId == changeName == quick-<uuid8>），
  // 这里复用同一值写 current-quick-run-id，保证两处一致。
  // 旧 quick-YYYYMMDD-HHMMSS 时间戳已摒弃（D-003@v1：同秒并发撞）。
  if (stageName === 'quick' && !isDone && !isStatus && !isSkip && !isReset && !isReopen) {
    // 不再无条件 reset steps：原逻辑把任何 quick 非 --done 启动都重置为 pending，致 in-progress
    // 的 quick 中途查 prompt（sillyspec run quick）丢已 done 的 step 进度（报告
    // quick-state-reset-platform-mode）。现保留进度——completed 重跑由 runStage 内
    // currentIdx === -1 自动重置（~1944 行）；in-progress 输出当前 step；全新由
    // ensureStageSteps 初始化；显式从头用 --reset（已由 !isReset 排除出本分支）。
    try {
      const runtimeRoot = platformOpts.runtimeRoot || join(specRoot, '.runtime')
      mkdirSync(runtimeRoot, { recursive: true })
      writeAtomicSync(join(runtimeRoot, 'current-quick-run-id'), quickSessionId + '\n')
    } catch (e) {
      // 写失败不能静默：--done 不带 --change 时靠这个文件做跨进程 fallback，写不成就必须显式带 --change
      console.warn(`⚠️ current-quick-run-id 写入失败（${e.message}），--done 必须显式带 --change ${quickSessionId}`)
    }
    // 显式告知 agent 本会话 sessionId + --done 需带 --change（CLI 短进程，run/done 独立进程，
    // sessionId 靠 --change 跨进程传递；不带 --change 时 fallback 读 current-quick-run-id，多会话不可靠）
    console.log(`📌 本 quick 会话 sessionId: ${quickSessionId}`)
    console.log(`   完成时用: sillyspec run quick --done --change ${quickSessionId} --output "..."`)
  }

  // 确保步骤已初始化
  const changed = await ensureStageSteps(progress, stageName, cwd, specRoot)
  if (changed && effectiveChange) {
    await pm._write(cwd, progress, effectiveChange)
    triggerSync(cwd, effectiveChange, platformOpts)
    progress = await pm.read(cwd, effectiveChange) || progress
  }

  // --status
  if (isStatus) {
    return showStatus(progress, stageName)
  }

  // --skip
  if (isSkip) {
    return await skipStep(pm, progress, stageName, cwd, effectiveChange, platformOpts)
  }

  // --wait: 将 step 设为 waiting（独立于 --done）
  if (isWait) {
    return await waitStep(pm, progress, stageName, cwd, outputText, waitReason, waitOptions, { changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts })
  }

  // --continue: 从 waiting 恢复
  if (isContinue) {
    return await continueStep(pm, progress, stageName, cwd, continueAnswer, { changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts })
  }

  // --done
  if (isDone) {
    const doneAnswer = getFlagValue('--answer')
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText, { confirm: isConfirm, changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts, confirmMode, doneAnswer, isForceBaseline, isAllowNew })
  }

  // 默认：输出当前步骤
  return await runStage(pm, progress, stageName, cwd, effectiveChange, isSkipApproval, platformOpts, { quickFiles, isAllowNew, isForceBaseline, isForceRescan, linkedChanges, taskDescription: inputText })
}

/**
 * 自动推导变更名（不依赖 progress）
 */
function resolveChangeNameAuto(cwd, specDir = null) {
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return entries[0].name
  return null
}

async function runStage(pm, progress, stageName, cwd, changeName, skipApproval = false, platformOpts = {}, quickOpts = {}) {
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  // 状态转换校验
  const prevStage = progress.currentStage || ''
  // task-07: 提取 prevStage 的 stageData，传给 checkTransition 检测 failed_post_check 门控
  const fromStageData = (progress.stages && prevStage && progress.stages[prevStage]) || undefined
  const transition = checkTransition(prevStage, stageName, fromStageData ? { fromStageData } : {})
  if (!transition.allowed) {
    console.error(`❌ 阶段转换不允许: ${prevStage || '(起始)'} → ${stageName}`)
    console.error(`   原因: ${transition.reason}`)
    console.error(`   提示: 使用 --skip-approval 绕过（需明确意图）`)
    if (!skipApproval) {
      process.exit(1)
    }
  }

  // execute 阶段启动前检查审批
  if (stageName === 'execute' && !skipApproval) {
    const approval = await checkApproval(cwd, changeName, platformOpts)
    if (approval) {
      if (approval.status === 'rejected') {
        console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
        process.exit(1)
      }
      if (approval.status === 'pending') {
        console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
        console.log('  提示：使用 --skip-approval 跳过审批检查')
      }
    }
  }

  // execute 阶段：CLI 自动创建 worktree（不等 AI agent）
  if (stageName === 'execute' && changeName) {
    const effectiveChange = changeName
    const { WorktreeManager } = await import('./worktree.js')
    const wm = new WorktreeManager({ cwd })
    const existingMeta = wm.getMeta(effectiveChange)
    if (existingMeta) {
      console.log(`🔗 worktree 已存在: ${existingMeta.worktreePath} (${existingMeta.mode})`)
    } else {
      try {
        const result = wm.create(effectiveChange)
        console.log(`🔗 worktree 已创建: ${result.worktreePath} (分支: ${result.branch}, 模式: ${result.mode})`)
      } catch (e) {
        console.error(`❌ worktree 创建失败: ${e.message}`)
        console.error(`   修复建议：`)
        console.error(`   1. 运行 sillyspec worktree doctor --fix 检查并修复 worktree 状态`)
        console.error(`   2. 或手动清理残留：git worktree prune && git branch -D sillyspec/${effectiveChange}`)
        console.error(`   3. 必要时删除残留目录 .sillyspec/.runtime/worktrees/${effectiveChange}/ 后重试`)
        process.exit(1)
      }
    }
    // 入口 deps 自检（D-002）：已存在 worktree（create short-circuit 不供给）时重供给
    if (existingMeta) {
      const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      await ensureDepsFreshness(cwd, effectiveChange, execSpecBase, existingMeta)
    }
  }

  // ── execute 阶段启动时固定 executeRunId（绑定变更名，避免跨变更复用） ──
  let currentExecuteRunId = null
  if (stageName === 'execute') {
    const { generateExecuteRunId } = await import('./task-review.js')
    const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const runtimeRoot = platformOpts?.runtimeRoot || join(execSpecBase, '.runtime')
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    mkdirSync(runtimeRoot, { recursive: true })
    // 优先读取已有的变更专属标记文件
    try {
      if (existsSync(runIdFile)) {
        currentExecuteRunId = readFileSync(runIdFile, 'utf8').trim()
      }
    } catch {}
    if (!currentExecuteRunId) {
      currentExecuteRunId = generateExecuteRunId()
      writeFileSync(runIdFile, currentExecuteRunId + '\n')
    }
  }

  // 自动探测 currentChange
  if (autoDetectChange(progress, cwd)) {
    progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)
  }

  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  // 用户显式调用 sillyspec run <stage>：把它标记为当前阶段
  if (progress.currentStage !== stageName) {
    progress.currentStage = stageName
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)
  }

  const steps = stageData.steps
  // ── 检查是否有 waiting step 需要先处理 ──
  const waitingIdx = steps.findIndex(s => s.status === 'waiting')
  if (waitingIdx !== -1) {
    const ws = steps[waitingIdx]
    console.error(`\n⏸️  Step ${waitingIdx + 1}/${steps.length} 正在等待用户输入：${ws.name}`)
    if (ws.waitReason) console.error(`   原因：${ws.waitReason}`)
    if (ws.waitOptions) console.error(`   选项：${formatWaitOptions(ws.waitOptions)}`)
    console.error(`\n   普通运行无法跳过等待中的步骤。请先处理：`)
    console.error(`   sillyspec run ${stageName} --continue --answer "你的选择"${changeName ? ` --change ${changeName}` : ''}`)
    process.exit(1)
  }

  let currentIdx = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')

  // stale 步骤视为可执行（等同于 pending）
  if (currentIdx !== -1 && steps[currentIdx].status === 'stale') {
    steps[currentIdx].status = 'pending'
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)
  }

  // ── scanProfile: 根据 project 规模动态裁剪步骤 ──
  let scanProfile = null
  if (stageName === 'scan' && steps.length > 0 && currentIdx === 0) {
    scanProfile = computeScanProfile(cwd, platformOpts)
    console.log(`\n📊 Scan Profile: ${scanProfile.mode} (原因: ${scanProfile.reason})`)
    if (scanProfile.mode !== 'deep') {
      applyScanProfileSteps(stageData, scanProfile, cwd, platformOpts)
      // 步骤被裁剪后 currentIdx 需要重新计算
      currentIdx = 0
    }
    // 保存 profile 供后续 postcheck 使用
    stageData.scanProfile = scanProfile
    await pm._write(cwd, progress, changeName)
  } else if (stageName === 'scan' && stageData.scanProfile) {
    scanProfile = stageData.scanProfile
  }
  if (scanProfile) platformOpts.scanProfile = scanProfile

  if (stageName === 'scan') {
    try {
      const gitResult = safeGit(cwd, ['rev-parse', 'HEAD'])
      const scanGuard = {
        name_zh: '扫描守卫',
        sourceCommit: gitResult.value,
        sourceCommitError: gitResult.error,
        startedAt: new Date().toISOString(),
        forceRescan: quickOpts?.isForceRescan || false,
      }
      const guardFile = join(specBase, '.runtime', 'scan-guard.json')
      mkdirSync(dirname(guardFile), { recursive: true })
      writeFileSync(guardFile, JSON.stringify(scanGuard, null, 2) + '\n')
      if (scanGuard.forceRescan) {
        console.log('🛡️ scan 覆盖保护已记录: --force-rescan 已开启')
      } else {
        console.log('🛡️ scan 覆盖保护已记录: existing scan docs require current source_commit/updated_at')
      }
    } catch (e) {
      console.warn(`⚠️ scan 覆盖保护记录失败: ${e.message}`)
    }
  }

  if (currentIdx === -1) {
    // 所有步骤已 completed/skipped，但阶段未盖到 completed —— 这是上次最后一步完成后、
    // stage 升级事务未提交的崩溃中间态（正常完成会被上方 stageStatus==='completed' 守卫拦下）。
    // 旧逻辑无条件清空 steps 为 pending 会丢掉已完成的进度且不可恢复。改为走正式
    // completeStage：产物齐则补盖完成戳，不齐则给出 actionable 提示，永不静默清空步骤。
    console.log(`\nℹ️  ${stageName} 所有步骤已完成，但阶段未标记完成（上次可能中断）。尝试补盖完成戳…`)
    await pm.completeStage(cwd, stageName, changeName)
    const after = await pm.read(cwd, changeName)
    if (after?.stages?.[stageName]?.status === 'completed') {
      console.log(`   ✅ 已补盖完成戳。下一步: sillyspec run <下一阶段>，或 sillyspec run ${stageName} --status 查看。`)
      process.exit(0)
    }
    // completeStage 已打印产物校验失败的明细；这里只补充恢复指引
    console.error(`\n   ⚠️ 已保留步骤进度（未清空）。修复产物后重跑，或：`)
    console.error(`   - 重新开始: sillyspec run ${stageName} --reset`)
    console.error(`   - 强制补盖: sillyspec progress complete-stage ${stageName}${changeName ? ` --change ${changeName}` : ''} --force`)
    process.exit(1)
  }

  // quick 阶段：记录 baselineFiles + 分配 ql-ID（CLI 接管 QUICKLOG 写入）
  // 幂等判据是 session guard.json 文件（跨进程可靠），不是 progress.quickGuard
  // （D-003@v1：顶层 quickGuard 不跨进程持久化；agent 在 step 间用 `run quick` 取下一步
  // prompt 时每个新进程都进此块，按文件判幂等才不会重复分配 ql-ID / 重复写条目）。
  if (stageName === 'quick') {
    const sessionGuardDir = join(specBase, '.runtime', 'quick-sessions', changeName)
    const guardFile = join(sessionGuardDir, 'guard.json')
    let existingGuard = null
    try {
      if (existsSync(guardFile)) existingGuard = JSON.parse(readFileSync(guardFile, 'utf8'))
    } catch {}
    if (existingGuard) {
      // 跨进程重入：复用已分配的 ql-ID，跳过 baseline 重捕与分配（幂等）
      progress.quickGuard = existingGuard
    } else {
      try {
        const { execSync } = await import('child_process')
        const gitStatus = execSync('git status --porcelain', { cwd, encoding: 'utf8', timeout: 10000 })
        // 记录全部预存脏文件（含 untracked + .sillyspec/ 路径）。quick 会话期间自身写入的元数据
        // （quicklog/.runtime/modules/_module-map 等）由 auditQuickCompletion 的 isQuickMetadata 精确豁免，
        // 不需要这里粗放过滤 .sillyspec/——旧过滤致预存 untracked .sillyspec/changes/ 不进 baseline，
        // 却在 audit 被当「危险(.sillyspec/)+新增」误判永久 blocked（ql-20260713-002-7628 修复）。
        const baselineFiles = gitStatus
          .split('\n').filter(Boolean)
          .map(line => parsePorcelainPath(line))
          .filter(Boolean)
        const allowedFiles = quickOpts?.quickFiles || []
        const allowNew = quickOpts?.isAllowNew || false
        const forceBaseline = quickOpts?.isForceBaseline || false
        const linkedChanges = Array.isArray(quickOpts?.linkedChanges) ? quickOpts.linkedChanges : []
        // CLI 接管：分配 ql-ID + 写 QUICKLOG「进行中」条目 + 关联 tasks.md（持锁、当天唯一）
        const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
        const { qlId } = await allocateQuicklogEntry(specBase, gitUser, {
          description: quickOpts?.taskDescription || '',
          linkedChanges,
          allowedFiles,
        })
        progress.quickGuard = {
          sessionId: changeName,
          name_zh: '快速任务守卫',
          baselineCommit: safeGit(cwd, ['rev-parse', 'HEAD']).value,
          baselineFiles,
          allowedFiles,
          allowNew,
          forceBaseline,
          linkedChanges,
          quicklogId: qlId,
          startedAt: new Date().toISOString(),
        }
        // 写入 .runtime/quick-sessions/<sessionId>/guard.json 供 worktree-guard hook 读取
        // （D-002：按 session 存，多会话各自 guard 不互覆盖。runStage 作用域内 sessionId == changeName == quick-<uuid8>，见 §4.4/4.5）
        mkdirSync(sessionGuardDir, { recursive: true })
        writeAtomicSync(guardFile, JSON.stringify(progress.quickGuard, null, 2))
        const parts = [`${baselineFiles.length} 个已有脏文件`]
        if (allowedFiles.length > 0) parts.push(`${allowedFiles.length} 个 allowedFiles`)
        if (allowNew) parts.push('允许新增文件')
        console.log(`🛡️ quick 变更边界已记录: ${parts.join(', ')}`)
        console.log(`📝 QUICKLOG 条目已创建: ${qlId}`)
        await pm._write(cwd, progress, changeName)
      } catch (e) {
        console.warn(`⚠️ baseline 记录失败: ${e.message}`)
      }
    }
  }

  if (currentIdx > 0) {
    const completed = currentIdx
    const total = steps.length
    console.log(`⚠️  ${stageName} 已进行到第 ${currentIdx + 1}/${total} 步（前 ${completed} 步已完成）。`)
    console.log(`  继续执行将从中断处恢复，用 --reset 可重新开始。\n`)
  }

  // ── Brainstorm → Plan Contract：plan 启动前校验 design.md ──
  if (stageName === 'plan' && currentIdx === 0) {
    const changeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot || null)
    const designPath = changeDir ? join(changeDir, 'design.md') : null
    if (designPath && existsSync(designPath)) {
      const { validateDesignForPlan } = await import('./stages/plan.js')
      const designContent = readFileSync(designPath, 'utf8')
      const designValidation = validateDesignForPlan(designContent)
      if (!designValidation.ok) {
        console.error(`\n❌ Brainstorm → Plan Contract 校验失败：`)
        for (const err of designValidation.errors) console.error(`   - ${err}`)
        console.error(`\n   design.md 不满足 plan 契约，请先修复后重试。`)
        console.error(`   提示：sillyspec run brainstorm --reopen --from-step <步骤> 修订设计文档`)
        process.exit(1)
      }
      if (designValidation.warnings.length > 0) {
        console.log(`⚠️  Design contract 警告（不阻断）：`)
        for (const w of designValidation.warnings) console.log(`   - ${w}`)
        console.log()
      }
    }
  }

  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  if (defSteps && defSteps[currentIdx]) {
    // noAI 步骤自动完成（CLI-only，不需要 Agent 参与）
    if (defSteps[currentIdx].noAI || stageData.steps[currentIdx]?.noAI) {
      const stepName = defSteps[currentIdx].name
      const cliAction = defSteps[currentIdx]._cliAction || stageData.steps[currentIdx]?._cliAction
      console.log(`⚙️ Step ${currentIdx + 1}/${stageData.steps.length}: ${stepName}（CLI 自动执行，无需 Agent）`)
      if (cliAction === 'scanPreflight') {
        await executeScanPreflight(cwd, platformOpts, scanProfile)
      } else if (cliAction === 'scanPostcheck') {
        await executeScanPostcheck(cwd, platformOpts, scanProfile)
      } else if (cliAction === 'planPostcheck') {
        await executePlanPostcheck(cwd, platformOpts, progress)
      }
      stageData.steps[currentIdx].status = 'completed'
      stageData.steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      await pm._write(cwd, progress, changeName)
      // 自动前进到下一步
      const nextIdx = stageData.steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
      if (nextIdx !== -1 && defSteps[nextIdx]) {
        console.log('')
        await outputStep(stageName, nextIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
      } else {
        // 所有步骤完成
        stageData.status = 'completed'
        stageData.completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
        await pm._write(cwd, progress, changeName)
        console.log(`\n✅ ${stageName} 阶段全部完成。`)
      }
      return
    }
    await outputStep(stageName, currentIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}

function validateMetadata(cwd, stageName, specBase) {
  const changesDir = join(specBase, 'changes')
  if (!existsSync(changesDir)) return

  const cutoff = Date.now() - 10 * 60 * 1000
  const missing = []

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      try {
        if (entry.isDirectory()) { walk(full); continue }
        if (!/\.(md|yaml|yml)$/.test(entry.name)) continue
        const mtime = statSync(full).mtimeMs
        if (mtime < cutoff) continue
        const content = readFileSync(full, 'utf-8')
        if (!content.includes('author:') && !content.includes('author：')) missing.push(full)
        if (!content.includes('created_at:') && !content.includes('created_at：')) missing.push(full)
      } catch (e) { /* skip unreadable files */ }
    }
  }

  walk(changesDir)
  const unique = [...new Set(missing)]
  if (unique.length > 0) {
    console.log(`\n⚠️  以下文件缺少 author 或 created_at 元数据：`)
    unique.forEach(f => console.log(`  - ${f.replace(cwd + '/', '')}`))
    console.log('请在文件头部添加 author（git 用户名）和 created_at（精确到秒）')
  }
}

/**
 * 验证关键文件是否存在于正确的变更目录下
 * 防止 AI 将文件写到错误的路径
 */
function validateFileLocations(cwd, stageName, progress, changeName, specBase) {
  const effectiveChange = changeName || progress.currentChange
  if (!effectiveChange) return

  const changeDir = join(specBase, 'changes', effectiveChange)
  if (!existsSync(changeDir)) return

  // 每个阶段完成后预期存在的文件
  const expectedFiles = {
    brainstorm: ['design.md', 'proposal.md', 'requirements.md', 'tasks.md'],
    plan: ['plan.md'],
    archive: ['module-impact.md'],
  }

  const expected = expectedFiles[stageName]
  if (!expected) return

  const missing = []
  for (const file of expected) {
    if (!existsSync(join(changeDir, file))) {
      missing.push(file)
    }
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  文件位置验证：以下文件未在变更目录中找到`)
    console.log(`  变更目录：${changeDir.replace(cwd + '/', '')}/`)
    for (const f of missing) {
      // 检查是否写到了错误的位置
      const wrongPath = join(specBase, 'changes', 'change', effectiveChange, f)
      if (existsSync(wrongPath)) {
        console.log(`  ❌ ${f} — 不存在，但发现了错误路径：${wrongPath.replace(cwd + '/', '')}`)
        console.log(`     提示：应该写入 ${changeDir.replace(cwd + '/', '')}/${f}`)
      } else {
        console.log(`  ⬜ ${f} — 未找到（该阶段可能未产出此文件）`)
      }
    }
  } else {
    console.log(`\n✅ 文件位置验证：所有 ${expected.length} 个预期文件均在变更目录中`)
  }
}


// ── Wait Step ──

async function waitStep(pm, progress, stageName, cwd, outputText, waitReason, waitOptions, options = {}) {
  const { changeName, nonInteractive = false, platformOpts = {} } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]

  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  // 查找下一个 pending 或 in-progress 的步骤
  const currentIdx = stageData.steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  if (currentIdx === -1) {
    console.error('没有可以等待的步骤')
    process.exit(1)
  }

  // 前置检查：不允许已有 waiting 步骤时再 --wait
  const existingWaitingIdx = stageData.steps.findIndex(s => s.status === 'waiting')
  if (existingWaitingIdx !== -1) {
    const ws = stageData.steps[existingWaitingIdx]
    console.error(`❌ 已有步骤处于等待状态：Step ${existingWaitingIdx + 1} "${ws.name}"`)
    console.error(`   请先 --continue 或 --reset 该步骤，再开始新的 --wait`)
    process.exit(1)
  }

  // maxWaitRounds 硬上限：达到后拒绝继续 --wait
  const currentStep = stageData.steps[currentIdx]
  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const stepDef = defSteps?.[currentIdx] || {}
  const maxWaitRounds = currentStep.maxWaitRounds ?? stepDef.maxWaitRounds
  const currentWaitRound = currentStep.waitRound || 0
  if (maxWaitRounds && currentWaitRound >= maxWaitRounds) {
    console.error(`❌ Step "${currentStep.name}" 已达到最大等待轮次（maxWaitRounds=${maxWaitRounds}）`) 
    console.error(`   请基于已有回答完成本步骤：`)
    console.error(`   sillyspec run ${stageName} --done${changeName ? ` --change ${changeName}` : ''} --output "需求理解摘要"`)
    process.exit(1)
  }

  // 非交互模式下拒绝等待
  if (nonInteractive) {
    console.error(`❌ Human decision required in non-interactive mode.`)
    console.error(`   Reason: ${waitReason || '(unknown)'}`)
    if (waitOptions) console.error(`   Options: ${formatWaitOptions(waitOptions)}`)
    console.error(`   Fix: rerun with --interactive or provide decision via sillyspec run ${stageName} --continue --answer "..."`)
    process.exit(2)
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  stageData.steps[currentIdx].status = 'waiting'
  stageData.steps[currentIdx].waitedAt = now
  if (outputText) {
    const MAX_OUTPUT = 200
    stageData.steps[currentIdx].output = outputText.length > MAX_OUTPUT
      ? outputText.slice(0, MAX_OUTPUT) + '…' : outputText
  }
  if (waitReason) stageData.steps[currentIdx].waitReason = waitReason
  if (waitOptions) {
    // 统一存为 JSON 数组
    try {
      const parsed = JSON.parse(waitOptions)
      if (Array.isArray(parsed)) {
        stageData.steps[currentIdx].waitOptions = JSON.stringify(parsed)
      } else {
        stageData.steps[currentIdx].waitOptions = JSON.stringify(waitOptions.split(',').map(o => o.trim()))
      }
    } catch {
      stageData.steps[currentIdx].waitOptions = JSON.stringify(waitOptions.split(',').map(o => o.trim()))
    }
  }

  progress.lastActive = now
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  console.log(`⏸️  Step ${currentIdx + 1}/${stageData.steps.length} 已暂停等待：${stageData.steps[currentIdx].name}`)
  if (waitReason) console.log(`   原因：${waitReason}`)
  if (waitOptions) console.log(`   选项：${formatWaitOptions(waitOptions)}`)
  console.log(`   继续时执行：sillyspec run ${stageName} --continue --answer "你的选择"${changeName ? ` --change ${changeName}` : ''}`)
}

// ── Continue Step ──

async function continueStep(pm, progress, stageName, cwd, answer, options = {}) {
  const { changeName, platformOpts = {} } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]

  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  if (!answer) {
    console.error('❌ --continue 需要 --answer 参数')
    process.exit(2) // 用法错 → exit 2
  }

  // 查找 waiting 的步骤
  const waitingSteps = stageData.steps.map((s, i) => ({ ...s, idx: i })).filter(s => s.status === 'waiting')
  if (waitingSteps.length === 0) {
    console.error('没有处于等待状态的步骤')
    process.exit(1)
  }
  if (waitingSteps.length > 1) {
    console.error(`❌ 检测到 ${waitingSteps.length} 个等待中的步骤，无法确定恢复目标：`)
    for (const ws of waitingSteps) {
      console.error(`   Step ${ws.idx + 1}: ${ws.name}${ws.waitReason ? `（${ws.waitReason}）` : ''}`)
    }
    console.error(`   请使用 --reset 重置，或手动修复 DB`)
    process.exit(1)
  }
  const currentIdx = waitingSteps[0].idx
  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const currentStepDef = defSteps?.[currentIdx] || {}
  const currentStep = stageData.steps[currentIdx]
  const isRepeatableWait = currentStepDef.repeatableWait === true || currentStep.repeatableWait === true
  const requiresWait = currentStepDef.requiresWait === true || currentStep.requiresWait === true
  const shouldReturnToCurrentStep = isRepeatableWait || requiresWait

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const prevOutput = currentStep.output || ''
  const waitRound = (currentStep.waitRound || 0) + 1
  currentStep.waitRound = waitRound
  currentStep.waitAnswer = answer
  currentStep.waitAnswers = Array.isArray(currentStep.waitAnswers) ? currentStep.waitAnswers : []
  currentStep.waitAnswers.push({
    round: waitRound,
    answer,
    question: prevOutput || null,
    answeredAt: now,
  })
  currentStep.maxWaitRounds = currentStepDef.maxWaitRounds ?? currentStep.maxWaitRounds

  // 合并 waiting 信息到 output
  const waitInfo = currentStep.waitReason || ''
  if (waitInfo) {
    currentStep.output = prevOutput
      ? `${prevOutput} | 用户回答#${waitRound}：${answer}`
      : `用户回答#${waitRound}：${answer}`
  }

  // 清除等待状态
  delete currentStep.waitReason
  delete currentStep.waitOptions
  delete currentStep.waitedAt

  if (shouldReturnToCurrentStep) {
    currentStep.status = 'pending'
    currentStep.completedAt = null
  } else {
    currentStep.status = 'completed'
    currentStep.completedAt = now
  }

  progress.lastActive = now
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  console.log(`✅ Step ${currentIdx + 1}/${stageData.steps.length} 已继续：${currentStep.name}`)
  console.log(`   回答：${answer}`)

  // Append to user-inputs.md
  const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
  const entry = `\n## ${now} | ${changeName || '?'} | ${stageName}: ${currentStep.name} [CONTINUED]\n- 回答：${answer}\n`
 appendFileSync(inputsPath, entry)

  // shouldReturnToCurrentStep: 回到当前步骤继续执行（repeatable=多轮探索，requiresWait=确认后执行动作）
  if (shouldReturnToCurrentStep) {
    console.log(`\n🔁 Step ${currentIdx + 1}/${stageData.steps.length} 已收到用户输入，回到当前步骤继续执行。`)
    if (isRepeatableWait) {
      console.log(`   已收集回答轮次：${waitRound}${currentStep.maxWaitRounds ? `/${currentStep.maxWaitRounds}` : ''}`)
    }
    if (defSteps && defSteps[currentIdx]) {
      console.log('')
      await outputStep(
        stageName,
        currentIdx,
        defSteps,
        cwd,
        changeName,
        progress.project || null,
        platformOpts,
        formatWaitHistory(currentStep)
      )
    }
    return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
  }

  // 检查阶段是否全部完成
  const nextPendingIdx = stageData.steps.findIndex(s => s.status === 'pending')
  const nextWaitingIdx = stageData.steps.findIndex(s => s.status === 'waiting')
  if (nextPendingIdx === -1 && nextWaitingIdx === -1) {
    stageData.status = 'completed'
    stageData.completedAt = now
    await pm._write(cwd, progress, changeName)
    console.log(`\n✅ ${stageName} 阶段已完成（${stageData.steps.length}/${stageData.steps.length} 步）`)
    // ── execute 阶段完成时条件性清理 worktree ──
    if (stageName === 'execute' && changeName) {
      try {
        const { WorktreeManager } = await import('./worktree.js');
        const wm = new WorktreeManager({ cwd });
        const meta = wm.getMeta(changeName);
        if (!meta) {
          console.log('🔗 Worktree: n/a (no meta)');
        } else if (meta.mode === 'native-worktree') {
          console.log('🔗 Worktree: kept (外部隔离环境)');
        } else {
          // in-place 模式不再短路：cleanup 现在能安全处理 in-place（只清 meta，不碰主工作区）
          const check = wm.hasUnappliedChanges(changeName);
          if (check.hasChanges) {
            console.log(`🔗 Worktree: pending apply (${check.changedFiles.length} 个未应用变更)`);
            console.log(`   下一步: sillyspec worktree apply ${changeName}`);
          } else {
            const cleanResult = wm.cleanup(changeName);
            console.log(`🔗 Worktree: ${cleanResult.result}`);
            if (cleanResult.residual?.length > 0) {
              console.warn(`   ⚠️ 清理残留: ${cleanResult.residual.join('; ')}`);
              console.warn(`   手动处理: sillyspec worktree cleanup ${changeName} --force`);
            }
          }
        }
      } catch (e) {
        console.warn(`🔗 Worktree: check failed — ${e.message}`);
      }
    }
    // 阶段完成后明确下一步（agent 常卡：stageData completed 但不知要 run <下一阶段> 推进 currentStage）
    const nextStageHint = { brainstorm: 'plan', plan: 'execute', execute: 'verify', verify: 'archive' }[stageName]
    if (nextStageHint) {
      console.log(`\n👉 ${stageName} 已完成。下一步：sillyspec run ${nextStageHint}${changeName ? ` --change ${changeName}` : ''}`)
      if (stageName === 'execute') {
        console.log(`   ⚠️ 若 worktree 改动还没 apply 到主工作区，先：sillyspec worktree apply ${changeName}`)
        console.log(`   （apply 不需要先 commit，支持 working tree 未提交改动）`)
        // plan.md checkbox auto-check：execute 完成 + review.json pass → 自动勾选（治本，比警告可靠）
        try {
          const specBaseLc = platformOpts.specRoot || join(cwd, '.sillyspec')
          const changeDir = join(specBaseLc, 'changes', changeName)
          const planPath = join(changeDir, 'plan.md')
          const runtimeRoot = platformOpts.runtimeRoot || join(specBaseLc, '.runtime')
          const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
          if (existsSync(planPath) && existsSync(runIdFile)) {
            const executeRunId = readFileSync(runIdFile, 'utf8').trim()
            const planContent = readFileSync(planPath, 'utf8')
            const { readReview } = await import('./task-review.js')
            let checkedCount = 0
            let skippedCount = 0
            const updated = planContent.replace(/^(\s*[-*]\s*\[)\s(\]\s*task-\d+)/gim, (match, p1, p2) => {
              const taskNum = match.match(/task-(\d+)/)[1].padStart(2, '0')
              const reviewPath = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', `task-${taskNum}`, 'review.json')
              const r = readReview(reviewPath)
              if (r.ok && r.review?.specVerdict !== 'fail' && r.review?.qualityVerdict !== 'fail') {
                checkedCount++
                return `${p1}x${p2}`   // 勾选
              }
              skippedCount++
              return match              // 不勾
            })
            if (checkedCount > 0) {
              writeFileSync(planPath, updated)
              console.log(`   ✅ 自动勾选 ${checkedCount} 个 task checkbox（基于 review.json pass）`)
            }
            if (skippedCount > 0) {
              console.warn(`   ⚠️ ${skippedCount} 个 task 未勾（review.json 缺失/fail）→ archive 会拦。补 review 后重跑 execute --done 触发自动勾`)
            }
          }
        } catch {}
      }
    }
    return { stageCompleted: true, currentIdx, nextPendingIdx: -1 }
  }

  // 输出下一步
    if (nextPendingIdx !== -1 && defSteps) {
      console.log('')
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts, answer)
  } else if (nextWaitingIdx !== -1 && defSteps) {
    // 下一个步骤也在等待状态
    const ws = stageData.steps[nextWaitingIdx]
    console.log(`\n⏸️  Step ${nextWaitingIdx + 1}/${stageData.steps.length} 仍在等待：${ws.name}`)
    if (ws.waitReason) console.log(`   原因：${ws.waitReason}`)
    console.log(`   继续：sillyspec run ${stageName} --continue --answer "..."${changeName ? ` --change ${changeName}` : ''}`)
  }

  return { stageCompleted: false, currentIdx, nextPendingIdx: nextPendingIdx }
}


/**
 * execute 入口 deps 自检（D-002，change 2026-06-28-worktree-deps-provision）。
 * 已存在 worktree（create short-circuit 不供给）时，校验 depsStatus 缺失 / node_modules
 * 丢失(missing) / lockfile 变化(stale) → 触发 provisionDeps 重供给并写回 meta。
 */
async function ensureDepsFreshness(cwd, changeName, specBase, worktreeMeta) {
  if (!worktreeMeta || !worktreeMeta.worktreePath) return
  const { provisionDeps, lockfileHash } = await import('./worktree-deps.js')
  const wtPath = worktreeMeta.worktreePath
  const nodeModulesExists = existsSync(join(wtPath, 'node_modules'))
  const currentHash = lockfileHash(wtPath)
  const noStatus = !worktreeMeta.depsStatus
  const missing = ['linked', 'installed'].includes(worktreeMeta.depsStatus) && !nodeModulesExists
  const stale = !!(worktreeMeta.depsLockHash && currentHash && currentHash !== worktreeMeta.depsLockHash)
  if (!noStatus && !missing && !stale) return
  const reason = noStatus ? 'depsStatus 缺失' : (missing ? 'node_modules 丢失' : 'lockfile 变化')
  console.log(`🔄 worktree deps 自检：${reason}（depsStatus=${worktreeMeta.depsStatus || 'unknown'}），重新供给...`)
  let deps = {}
  try {
    deps = provisionDeps(wtPath, cwd, { specBase }) || {}
  } catch (e) {
    deps = { depsStatus: 'failed', depsError: `provisionDeps crashed: ${e.message}` }
  }
  try {
    const { WorktreeManager } = await import('./worktree.js')
    const metaPath = join(new WorktreeManager({ cwd }).getWorktreePath(changeName), 'meta.json')
    const updated = { ...worktreeMeta, ...deps }
    writeAtomicSync(metaPath, JSON.stringify(updated, null, 2) + '\n')
    console.log(`✅ deps 重新供给完成：depsStatus=${deps.depsStatus}`)
  } catch (e) {
    console.warn(`⚠️  deps meta 写回失败：${e.message}`)
  }
}






async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
  const { printNext = true, confirm = false, changeName, platformOpts = {}, nonInteractive = false, confirmMode = null, isForceBaseline = false, isAllowNew = false } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]
  const scanProfile = stageData?.scanProfile || null

  // ── WAIT MARKER 硬校验 ──
  // 如果 output 包含等待标记，拒绝 --done 推进
  if (outputText) {
    const match = WAIT_MARKER_RE.exec(outputText)
    if (match) {
      console.error(`❌ Refused: step output contains ${match[1]} — human input required.`)
      console.error(`   使用 --wait 替代 --done，例如：`)
      console.error(`   sillyspec run ${stageName} --wait --reason "等待用户决策" --output "你的摘要"${changeName ? ` --change ${changeName}` : ''}`)
      process.exit(1)
    }
  }

  // scanProfile 非 deep 模式：截断 outputText 减少 token 传递
  let effectiveOutput = outputText
  if (scanProfile && scanProfile.mode !== 'deep' && outputText && outputText.length > 1000) {
    effectiveOutput = outputText.slice(0, 1000) + '\n\n…[输出已截断，完整内容见 artifact]'
  }
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  const currentIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  if (currentIdx === -1) {
    console.error('没有待完成的步骤')
    process.exit(1)
  }

  // ── requiresWait 硬门控 ──
  const defStepsForCurrent = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const currentStepDef = defStepsForCurrent?.[currentIdx] || {}
  const currentStep = steps[currentIdx]
  if (currentStepDef.requiresWait === true && !currentStep.waitAnswer) {
    // 检查 --done 是否带了 --answer：如果是，自动补全 waitAnswer 状态，一步完成
    const doneAnswer = typeof options !== 'undefined' && options.doneAnswer ? options.doneAnswer : null
    // B4: 前置 step 已对同一问题确认则自动跳过重复 wait。
    // 归一化去掉「最终/再次/重复」等修饰词，避免 step N「确认 X」与 step M「最终确认 X」重复打断。
    const normalizeReason = (r) => (r || '').replace(/(最终|再次|重复|最后|首|初次|首次)/g, '').trim()
    const currentReason = normalizeReason(currentStepDef.waitReason)
    const priorConfirmed = currentReason && steps.slice(0, currentIdx).some(s =>
      s.waitAnswer && s.status === 'completed' && normalizeReason(s.waitReason) === currentReason
    )
    if (priorConfirmed) {
      currentStep.status = 'waiting'
      currentStep.waitAnswer = '前置步骤已对同一问题确认 — 自动跳过重复 wait'
      currentStep.waitReason = currentStepDef.waitReason || '等待用户输入'
      console.log(`⚠️  Step "${currentStep.name}" 的确认（${currentStepDef.waitReason}）已在前置步骤完成，自动跳过。`)
    } else if (doneAnswer) {
      currentStep.status = 'waiting'
      currentStep.waitAnswer = doneAnswer
      currentStep.waitReason = currentStepDef.waitReason || '等待用户输入'
      console.log(`⚠️  Step "${currentStep.name}" 需要 wait，但 --done 带了 --answer，自动补全 wait 状态。`)
    } else {
      console.error(`❌ Step "${currentStep.name}" 必须先等待用户输入，不能直接 --done。`)
      console.error(`   原因：${currentStepDef.waitReason || '该步骤需要人工确认/回答'}`)
      if (currentStepDef.waitOptions) {
        console.error(`   选项：${currentStepDef.waitOptions.join(', ')}`)
      }
      console.error(`   请先执行：`)
      console.error(`   sillyspec run ${stageName} --wait --reason "${currentStepDef.waitReason || '等待用户输入'}" --options "${(currentStepDef.waitOptions || ['确认']).join(',')}"${changeName ? ` --change ${changeName}` : ''} --output "你的问题/方案摘要"`)
      console.error(`   或使用 --done --answer "用户回答" 一步完成 wait + done`)
      process.exit(1)
    }
  }

  // ── execute deps 验证硬门（change 2026-06-28-worktree-deps-provision）──
  await enforceDepsGate(stageName, cwd, changeName, steps[currentIdx], steps, currentIdx, specBase, platformOpts)

  steps[currentIdx].status = 'completed'
  steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  if (outputText) {
    const MAX_OUTPUT = 200
    if (outputText.length > MAX_OUTPUT) {
      steps[currentIdx].output = outputText.slice(0, MAX_OUTPUT) + '…'
      steps[currentIdx].output_truncated = true
      steps[currentIdx].output_original_length = outputText.length
      // 平台模式：artifact 写入 runtime-root，否则写 .sillyspec/.runtime/artifacts
      const artifactBase = platformOpts?.runtimeRoot
        ? join(platformOpts.runtimeRoot, 'scan-runs', platformOpts.scanRunId || 'unknown')
        : join(specBase, '.runtime', 'artifacts')
      mkdirSync(artifactBase, { recursive: true })
      const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g, '')
      writeFileSync(join(artifactBase, `${changeName || 'unknown'}-${stageName}-step${currentIdx + 1}-${ts}.txt`), outputText)
    } else {
      steps[currentIdx].output = outputText
    }
  }

  // archive「确认归档」收尾：--confirm 门控 + archiveChangeDirectory 移动 + 推荐文档校验
  // （抽成 handleArchiveConfirmStep；缺 --confirm 时返回 early-return 对象，completeStep 透传）
  {
    const _archiveEarlyReturn = await handleArchiveConfirmStep({ stageName, steps, currentIdx, confirm, outputText, pm, cwd, progress, changeName, specBase })
    if (_archiveEarlyReturn) return _archiveEarlyReturn
  }

  // plan 阶段 "generate_plan" 完成后，动态插入任务蓝图 + postcheck 步骤（抽成 handlePlanGeneratePlanStep）
  await handlePlanGeneratePlanStep({ stageName, steps, currentIdx, defStepsForCurrent, cwd, progress })

  // scan 阶段 step 2「构建扫描项目列表」完成后，按项目展开 perProject 步骤（抽成 handleScanProjectListStep）
  await handleScanProjectListStep({ stageName, steps, currentIdx, outputText, stageData, specBase, cwd, platformOpts })

  // execute Wave artifact（W6 Step6c 抽至 complete-handlers.js handleExecuteWaveArtifact）
  await handleExecuteWaveArtifact({ stageName, steps, currentIdx, changeName, specBase, cwd })

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

  if (nextPendingIdx === -1) {
    // 也检查是否有 waiting 的步骤
    const hasWaiting = steps.some(s => s.status === 'waiting')
    if (hasWaiting) {
      // 有等待中的步骤，阶段未完成
      progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
      await pm._write(cwd, progress, changeName)
      const wsIdx = steps.findIndex(s => s.status === 'waiting')
      console.log(`\n⏸️  阶段暂停：Step ${wsIdx + 1} 等待用户输入`)
      if (steps[wsIdx].waitReason) console.log(`   原因：${steps[wsIdx].waitReason}`)
      return { stageCompleted: false, currentIdx, nextPendingIdx: -1 }
    }
    // quick 收尾（W6 Step6b 抽至 complete-handlers.js handleQuickStageCompletion）
    await handleQuickStageCompletion({ stageName, steps, currentIdx, cwd, progress, changeName, specBase, outputText, confirm, isForceBaseline, isAllowNew, platformOpts })

    stageData.status = 'completed'
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)

    // Append to user-inputs.md
    if (outputText) {
      const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
      const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
      appendFileSync(inputsPath, entry)
    }

    // scan 平台 manifest + post-check（W6 Step6d 抽至 complete-handlers.js handleScanStageCompleted）
    const _scanResult = await handleScanStageCompleted({ stageName, currentIdx, cwd, progress, pm, stageData, changeName, outputText, platformOpts })
    if (_scanResult) return _scanResult

    // 防御性守卫变量：确认所有步骤确实标记为 completed
    const actualCompleted = steps.filter(s => s.status === 'completed').length
    const actualTotal = steps.length

    validateMetadata(cwd, stageName, specBase)

    // 验证关键文件是否在正确的变更目录下（仅当所有步骤确实完成时才校验）
    if (actualCompleted === actualTotal && actualTotal > 0) {
      validateFileLocations(cwd, stageName, progress, changeName, specBase)
    }

    // 辅助阶段完成后重置步骤
    const stageDef = stageRegistry[stageName]
    if (stageDef?.auxiliary) {
      const freshSteps = (stageDef.steps || []).map(s => ({
        name: s.name,
        status: 'pending',
        output: null,
        completedAt: null
      }))
      stageData.steps = freshSteps
      stageData.status = 'pending'
      stageData.completedAt = null
      if (progress.currentStage === stageName) progress.currentStage = ''
      await pm._write(cwd, progress, changeName)
    }

    const total = steps.length
    console.log(`✅ ${stageName} 阶段已完成（${total}/${total} 步）`)

    if (stageName === 'execute') {
      // execute run summary：展示真实可得的结构化信息
      try {
        const lastOutput = steps[steps.length - 1]?.output || ''
        const summary = formatExecuteSummary({
          changeName,
          stepsCompleted: total,
          stepsTotal: total,
          agentSummary: lastOutput,
          cwd,
        })
        console.log(`\n${summary}`)
      } catch (e) {
        // summary 失败不影响主流程
        console.log('\n👉 下一步：sillyspec run verify（验证通过后才能归档）')
      }
    } else if (stageName === 'archive') {
      console.log('\n👉 归档完成！现在可以提交了：git commit -m "..."')
    } else if (stageName === 'verify') {
      // verify 的"验证通过"提示延后到下方 validator 通过后才打印，
      // 避免校验失败（FAIL / 缺 verify-result.md）时仍声称"验证通过可以归档"。
    } else {
      console.log(`\n下一步由你决定：sillyspec run <stage>（brainstorm/plan/execute/verify/archive 等）`)
    }

    // 阶段完成校验 — 防御性守卫：仅当所有步骤确实标记为 completed 时才跑 validator
    if (actualCompleted === actualTotal && actualTotal > 0) {
      const _gateEarlyReturn = await runStageCompletionGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx })
      if (_gateEarlyReturn) return _gateEarlyReturn
    } else if (actualCompleted < actualTotal) {
      // 实际步骤未全部完成，跳过 validator（状态可能不同步）
      console.log(`\n⚠️ 阶段校验跳过：${actualTotal} 步中仅 ${actualCompleted} 步标记为已完成，可能存在状态不同步。如确认阶段已完成，请运行 --status 确认。`)
    }

    // execute worktree cleanup（W6 Step6c 抽至 complete-handlers.js handleExecuteWorktreeCleanup）
    await handleExecuteWorktreeCleanup({ stageName, changeName, cwd })

    return { stageCompleted: true, currentIdx, nextPendingIdx: -1 }
  }

  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  // Append to user-inputs.md
  if (outputText) {
    const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
    const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
    appendFileSync(inputsPath, entry)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  console.log(`✅ Step ${currentIdx + 1}/${steps.length} 完成：${steps[currentIdx].name}\n`)

  // Workflow post_check（W6 Step6 抽至 complete-handlers.js handleWorkflowPostCheck）
  const _wfResult = await handleWorkflowPostCheck({ stageName, steps, currentIdx, cwd, specBase, progress, platformOpts, changeName })
  if (_wfResult) return _wfResult

  if (printNext) {
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
  return { stageCompleted: false, currentIdx, nextPendingIdx }
}

// 测试专用导出：completeStep 是 step 完成处理核心（产物校验/gate 链/sync/auto 推进），
// 行为保持重构需要 characterization 测试直接驱动它。有先例：worktree-guard.js 的 _queryDbFirstCellForTest。
export { completeStep as _completeStepForTest, outputStep as _outputStepForTest }

async function skipStep(pm, progress, stageName, cwd, changeName, platformOpts = {}) {
  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  const currentIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

  if (currentIdx === -1) {
    const wsIdx = steps.findIndex(s => s.status === 'waiting')
    if (wsIdx !== -1) {
      console.error(`⏸️  Step ${wsIdx + 1} 正在等待用户输入，不能跳过。`)
      console.error(`   请先使用 --continue --answer "..." 继续，或用 --reset 重置。`)
    } else {
      console.error('没有待跳过的步骤')
    }
    process.exit(1)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const stepDef = defSteps ? defSteps[currentIdx] : null
  if (stepDef && !stepDef.optional) {
    console.error(`❌ 步骤 "${steps[currentIdx].name}" 不可跳过`)
    process.exit(1)
  }

  steps[currentIdx].status = 'skipped'
  steps[currentIdx].skippedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  console.log(`⏭️ Step ${currentIdx + 1}/${steps.length} 已跳过：${steps[currentIdx].name}`)

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  if (nextPendingIdx !== -1 && defSteps) {
    console.log('')
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  } else {
    const wsIdx = steps.findIndex(s => s.status === 'waiting')
    if (wsIdx !== -1) {
      console.log(`\n⏸️  Step ${wsIdx + 1}/${steps.length} 正在等待：${steps[wsIdx].name}`)
      if (steps[wsIdx].waitReason) console.log(`   原因：${steps[wsIdx].waitReason}`)
      console.log(`   继续：sillyspec run ${stageName} --continue --answer "..."${changeName ? ` --change ${changeName}` : ''}`)
    }
  }
}

function showStatus(progress, stageName) {
  const stageData = progress.stages[stageName]
  const stageDef = stageRegistry[stageName]

  if (!stageData || !stageData.steps || stageData.steps.length === 0) {
    console.log(`阶段：${stageName}（${stageDef?.title || stageName}）`)
    console.log(`进度：未初始化`)
    if (stageData?.status) {
      console.log(`状态：${stageData.status}`)
      if (stageData.staleReason) console.log(`⚠️ 失效原因：${stageData.staleReason}`)
    }
    return
  }

  const steps = stageData.steps
  const completed = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length
  const bar = '█'.repeat(completed) + '░'.repeat(steps.length - completed)

  console.log(`阶段：${stageName}（${stageDef?.title || stageName}）`)
  console.log(`进度：[${bar}] ${completed}/${steps.length}`)

  // ── Revision v1 信息 ──
  if (stageData.status === 'revising') {
    console.log(`\n🔧 修订中 (revision ${stageData.revision || 1})`)
    if (stageData.reopenedFromStep) console.log(`   从步骤：${stageData.reopenedFromStep}`)
    if (stageData.reopenedAt) console.log(`   重开时间：${stageData.reopenedAt}`)
  }
  if (stageData.status === 'stale') {
    console.log(`\n⚠️ 已失效`)
    if (stageData.staleReason) console.log(`   原因：${stageData.staleReason}`)
    console.log(`   建议：sillyspec run ${stageName} --reopen --from-step 1`)
  }
  if (stageData.status === 'completed') {
    console.log(`\n✅ 已完成`)
  }

  console.log('')

  const firstPending = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

  if (progress.batchProgress) {
    const bp = progress.batchProgress
    const bpTotal = bp.total || 0
    const bpCompleted = bp.completed || 0
    const bpFailed = bp.failed || 0
    const bpSkipped = bp.skipped || 0
    const bpBarLen = 20
    const bpFilled = Math.round((bpCompleted / Math.max(bpTotal, 1)) * bpBarLen)
    const bpBar = '█'.repeat(bpFilled) + '░'.repeat(bpBarLen - bpFilled)
    const bpParts = []
    if (bpFailed > 0) bpParts.push(`${bpFailed} 失败`)
    if (bpSkipped > 0) bpParts.push(`${bpSkipped} 跳过`)
    const bpSuffix = bpParts.length ? ` (${bpParts.join(', ')})` : ''
    console.log(`\n📊 批量进度: ${bpBar} ${bpCompleted}/${bpTotal}${bpSuffix}\n`)
  }

  steps.forEach((step, i) => {
    const icon = step.status === 'completed' ? '✅' : step.status === 'skipped' ? '⏭️' : step.status === 'waiting' ? '⏸️' : '⬜'
    const isCurrent = (step.status === 'pending' || step.status === 'in-progress') && i === firstPending
    const isWaiting = step.status === 'waiting'
    console.log(`${icon} Step ${i + 1}: ${step.name}${isCurrent ? ' ← 当前' : ''}${isWaiting ? ' [WAITING]' : ''}`)
    if (isWaiting) {
      if (step.waitReason) console.log(`       原因：${step.waitReason}`)
      if (step.waitOptions) console.log(`       选项：${formatWaitOptions(step.waitOptions)}`)
      if (step.waitedAt) console.log(`       等待时间：${step.waitedAt}`)
    }
  })
}

async function resetStage(pm, progress, stageName, cwd, changeName, platformOpts = {}) {
  // execute 阶段 reset 时清理自建 worktree，否则下次 run execute 会因 existingMeta 存在
  // 直接复用带脏状态的旧 worktree（启动逻辑：meta 存在即复用，不查健康状态）
  if (stageName === 'execute' && changeName) {
    try {
      const { WorktreeManager } = await import('./worktree.js')
      const wm = new WorktreeManager({ cwd })
      const meta = wm.getMeta(changeName)
      if (meta) {
        const cleanResult = wm.cleanup(changeName)
        if (cleanResult.residual?.length > 0) {
          console.warn(`⚠️  reset 清理 worktree 残留: ${cleanResult.residual.join('; ')}`)
          console.warn(`   手动处理: sillyspec worktree cleanup ${changeName} --force`)
        } else if (cleanResult.result === 'kept') {
          console.log(`🔗 旧 worktree 保留 (${cleanResult.mode}: 外部隔离环境)`)
        } else if (cleanResult.result !== 'skipped') {
          console.log(`🧹 已清理旧 worktree (${cleanResult.result}, mode: ${cleanResult.mode})，下次 execute 将重建干净环境`)
        }
      }
    } catch (e) {
      console.warn(`⚠️  reset 清理 worktree 失败（不阻断 reset）: ${e.message}`)
    }
  }
  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  progress.stages[stageName] = {
    status: 'in-progress',
    startedAt: new Date().toLocaleString('zh-CN',{hour12:false}),
    completedAt: null,
    steps: defSteps ? defSteps.map(s => ({ name: s.name, status: 'pending' })) : []
  }
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  console.log(`🔄 ${stageName} 阶段已重置`)
}

/**
 * auto 模式：自动推进 brainstorm → plan → execute → verify
 */
async function runAutoMode(pm, progress, cwd, flags, changeName, platformOpts = {}) {
  const flowStages = ['brainstorm', 'plan', 'execute', 'verify', 'archive']
  const isDone = flags.includes('--done')
  const outputIdx = flags.indexOf('--output')
  const outputText = outputIdx !== -1 && flags[outputIdx + 1] ? flags[outputIdx + 1] : null
  const inputIdx = flags.indexOf('--input')
  const inputText = inputIdx !== -1 && flags[inputIdx + 1] ? flags[inputIdx + 1] : null
  const skipApproval = flags.includes('--skip-approval')
  const explicitMode = (() => {
    const m = flags.indexOf('--mode')
    return m !== -1 && flags[m + 1] ? flags[m + 1] : null
  })()
  const specBase = platformOpts?.specRoot || join(cwd, '.sillyspec')

  // Helper: 在 auto 模式下获取步骤定义
  const getAutoSteps = async (stage) => {
    if (stage === 'brainstorm') {
      return brainstormAutoDef.steps
    }
    return getStageSteps(stage, cwd, progress, platformOpts?.specRoot || null)
  }

  const nextInFlow = (stage) => {
    const i = flowStages.indexOf(stage)
    return i >= 0 && i < flowStages.length - 1 ? flowStages[i + 1] : null
  }
  const firstOpenStage = () => flowStages.find(s => progress.stages?.[s]?.status !== 'completed')
  const ensureAutoStage = async (stage) => {
    const stageChanged = progress.currentStage !== stage
    progress.currentStage = stage
    // Auto 模式下 brainstorm 使用 artifact-first 步骤
    if (stage === 'brainstorm') {
      const existingSteps = progress.stages?.brainstorm?.steps
      const isAutoModeSteps = existingSteps?.length === 4 && existingSteps?.[0]?.name === '状态检查与上下文加载'
      if (!isAutoModeSteps) {
        if (!progress.stages) progress.stages = {}
        progress.stages.brainstorm = {
          status: 'in-progress',
          startedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
          completedAt: null,
          steps: brainstormAutoDef.steps.map(s => ({ name: s.name, status: 'pending' }))
        }
        await pm._write(cwd, progress, changeName)
        triggerSync(cwd, changeName, platformOpts)
        progress = await pm.read(cwd, changeName)
        return progress
      }
    }
    const changed = await ensureStageSteps(progress, stage, cwd)
    if (stageChanged || changed) {
      await pm._write(cwd, progress, changeName)
      triggerSync(cwd, changeName, platformOpts)
    }
    progress = await pm.read(cwd, changeName)
    return progress
  }

  // ── Classify change on first entry ──
  if (!progress.stages?.brainstorm?.status && !progress.stages?.plan?.status) {
    const { classifyChange } = await import('./classify-change.js')
    const classification = classifyChange({ description: inputText || '', explicitMode })
    if (classification.mode === 'quick') {
      console.log(`📊 auto 模式分类：${classification.mode}（${classification.reason}）`)
      console.log(`   此变更建议使用 quick 模式，运行：sillyspec run quick "${inputText || '需求'}"`)
      return
    }
    console.log(`📊 auto 模式分类：${classification.mode}（${classification.reason}）`)
  }

  let currentStage = progress.currentStage
  if (!currentStage || progress.stages?.[currentStage]?.status === 'completed') {
    currentStage = firstOpenStage()
  }
  if (!currentStage) {
    console.log('All auto flow stages are complete.')
    return
  }
  if (!flowStages.includes(currentStage)) {
    const openStage = firstOpenStage()
    if (!openStage) {
      console.log('All auto flow stages are complete.')
      return
    }
    console.log(`⚠️  当前阶段 ${currentStage} 不在 auto 流程中，自动跳转到 ${openStage}`)
    currentStage = openStage
  }
  await ensureAutoStage(currentStage)

  if (!isDone) {
    console.log('════════════════════════════════════════')
    console.log('  SillySpec Auto Mode')
    if (changeName) console.log(`  Change: ${changeName}`)
    console.log('════════════════════════════════════════')
    console.log(`  Flow: ${flowStages.join(' -> ')}`)
    console.log(`  Current: ${currentStage}`)
    for (const stage of flowStages) {
      const stageData = progress.stages?.[stage]
      const total = stageData?.steps?.length || '?'
      const completed = stageData?.steps?.filter(step => step.status === 'completed' || step.status === 'skipped').length || 0
      const marker = stageData?.status === 'completed' ? 'done' : stage === currentStage ? 'active' : 'pending'
      console.log(`  ${marker} ${stage} (${completed}/${total})`)
    }
    console.log('')

    const defSteps = await getAutoSteps(currentStage)
    const pendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress') ?? -1
    if (pendingIdx === -1) {
      const wsIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'waiting') ?? -1
      if (wsIdx !== -1) {
        const ws = progress.stages[currentStage].steps[wsIdx]
        console.log(`⏸️  Step ${wsIdx + 1} 等待用户输入：${ws.name}`)
        if (ws.waitReason) console.log(`   原因：${ws.waitReason}`)
        console.log(`   继续：sillyspec run auto --continue --answer "..."`)
        return
      }
      const next = nextInFlow(currentStage)
      if (next) console.log(`${currentStage} is complete. Run: sillyspec run auto --done --output "${currentStage} complete"`)
      else console.log('All auto flow stages are complete.')
      return
    }
    // execute 阶段启动前检查审批
    if (currentStage === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName, platformOpts)
      if (approval) {
        if (approval.status === 'rejected') {
          console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
          process.exit(1)
        }
        if (approval.status === 'pending') {
          console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
          console.log('  提示：使用 --skip-approval 跳过审批检查')
        }
      }
    }
    await outputStep(currentStage, pendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
    return
  }

  if (!outputText) {
    console.error('auto --done requires --output')
    process.exit(2) // 用法错 → exit 2
  }

  const result = await completeStep(pm, progress, currentStage, cwd, outputText, inputText, { printNext: false, changeName, platformOpts })
  if (!result) return
  progress = await pm.read(cwd, changeName)

  const nextPendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress') ?? -1
  if (nextPendingIdx !== -1) {
    const defSteps = await getAutoSteps(currentStage)
    // execute 阶段启动前检查审批
    if (currentStage === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName, platformOpts)
      if (approval) {
        if (approval.status === 'rejected') {
          console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
          process.exit(1)
        }
        if (approval.status === 'pending') {
          console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
          console.log('  提示：使用 --skip-approval 跳过审批检查')
        }
      }
    }
    await outputStep(currentStage, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
    return
  }

  const next = nextInFlow(currentStage)
  if (!next) {
    console.log('\nAll auto flow stages are complete.')
    return
  }

  // ── next-action.json 驱动：brainstorm → plan 推进判断 ──
  if (currentStage === 'brainstorm' && next === 'plan') {
    const changeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot || null)
    if (changeDir) {
      const nextActionFile = join(changeDir, 'brainstorm', 'next-action.json')
      try {
        const nextAction = JSON.parse(readFileSync(nextActionFile, 'utf8'))
        if (nextAction.has_blocking_questions === true) {
          console.log(`\n⏸️  brainstorm 有阻塞问题，无法自动进入 plan：`)
          for (const q of (nextAction.questions || [])) {
            console.log(`   Q-${q.id}: ${q.question}`)
            if (q.options) console.log(`      选项：${q.options.join(' / ')}`)
            if (q.recommended) console.log(`      推荐：${q.recommended}`)
          }
          console.log(`\n   请回答阻塞问题后继续：sillyspec run auto --done --output "已回答"`)
          return
        }
        console.log(`\n✅ next-action.json: ${nextAction.status}，自动进入 plan`)
      } catch (e) {
        // next-action.json 不存在或格式错误，继续推进（向后兼容）
        console.log(`\n⚠️  next-action.json 未找到，继续进入 plan`)
      }
    }
  }

  progress.currentStage = next
  if (!progress.stages[next]) {
    progress.stages[next] = { status: 'pending', steps: [], startedAt: null, completedAt: null }
  }
  if (progress.stages[next].status === 'pending' || !progress.stages[next].status) {
    progress.stages[next].status = 'in-progress'
    progress.stages[next].startedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  }
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await ensureStageSteps(progress, next, cwd)
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  progress = await pm.read(cwd, changeName)

  console.log(`\n${currentStage} complete. Auto advanced to ${next}.`)
  const nextSteps = await getAutoSteps(next)
  const firstPending = progress.stages[next]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress') ?? -1
  if (firstPending !== -1) {
    // execute 阶段启动前检查审批
    if (next === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName, platformOpts)
      if (approval) {
        if (approval.status === 'rejected') {
          console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
          process.exit(1)
        }
        if (approval.status === 'pending') {
          console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
          console.log('  提示：使用 --skip-approval 跳过审批检查')
        }
      }
    }
    await outputStep(next, firstPending, nextSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}
