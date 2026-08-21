/**
 * run/gates.js（W6 Step4 从 run.js 抽出）。
 *
 * 阶段完成校验 gate 级联 + execute deps 硬门 + 完成回滚（自洽叶子模块，仅被 completeStep 调用）：
 *   - runStageCompletionGates：runValidators → verify-test 对账 → Plan→Execute contract →
 *     Stage Review Gate → Execute Task Review Gate，任一失败走 rollbackCompletionAndReturn
 *   - enforceDepsGate：execute depsStatus 不达标且非 wave 级 opt-out 时阻断 --done（exit 1）
 *   - rollbackCompletionAndReturn / rollbackStageCompletion：统一回滚 stage/step 状态 + 落盘 + sync
 *   - isCurrentWaveAllNoDepsVerify：enforceDepsGate 的私有 helper（wave 级 no_deps_verify opt-out 判定）
 *
 * 安全锚：run.js 始终 barrel。enforceDepsGate + runStageCompletionGates 由 run.js import 回来；
 * 无 test 直接 import（与 parsePorcelainPath/applyRootPlaceholders 不同），无需 barrel re-export。
 * completeStep（Step7 搬）将把这行 import 一起带走。
 *
 * 路径修正（相对 src/run/）：
 *   - triggerSync/resolveChangeDir 从 './shared.js'；runValidators 从 '../stage-contract.js'
 *   - 动态 import ./worktree.js / ./verify-postcheck.js / ./stages/execute.js / ./review-tier.js /
 *     ./stage-review.js / ./task-review.js → '../X.js'（src/ 下，退一层；真环依赖保留动态）
 *
 * 不搬：ensureDepsFreshness（execute 入口 deps 自检，调用方 runStage 非 completeStep，归属未来 execute-handler）
 */
import { basename, join, relative } from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { writeAtomicSync } from '../fs-atomic.js'
import { triggerSync, resolveChangeDir, resolveRuntimeRoot } from './shared.js'
import { runValidators } from '../stage-contract.js'
import { handleScanStageCompleted, handleExecuteWorktreeCleanup } from './complete-handlers.js'
import { detectConcurrentChanges, formatConcurrentWarning } from './concurrent-detect.js'
import { stageRegistry } from '../stages/index.js'
import { normalizeTaskId } from '../taskcard.js'

/**
 * 从任务注册表（tasks.md）提取全部 task id（task-XX）——符号影响面覆盖度校验用。
 * 只认 checkbox 行 `- [ ] task-XX:` / `- [x] task-XX:`（与 execute.js parseTaskRegistry 同口径）。
 * 2026-08-20-task-truth-unify：源从 plan.md 迁 tasks.md（任务唯一真相）；ql-xxx 行不收。
 */
function extractTaskIdsFromRegistry(tasksContent) {
  if (!tasksContent) return []
  return [...String(tasksContent).matchAll(/^[-*]\s*\[[ xX]\]\s*task-(\d+)\b/gim)]
    .map(m => `task-${m[1].padStart(2, '0')}`)
}

/**
 * 符号影响面报告结构校验（纯函数）：execute「加载上下文」步的产出落盘核验。
 *
 * 治 persuasion-only 失效现场（ql-20260816-005-3d7f）：execute 前缀 4 步无任何 gate，agent 可
 * <1s 连发 4 次 --done 盖章跳过，「符号影响面扫描」（execute.js 操作 11）被一句「上下文在会话内」
 * 带过（输出契约只写「上下文摘要」，操作与输出脱节）。修法 = 报告落盘
 * {SPEC_ROOT}/changes/<change>/symbol-impact.md + 本函数校验：plan.md 每个 task-XX 在报告中出现
 * （逐 task 结论，「无签名级变更」也要显式写，治整体一句话带过）。语义质量（调用点找没找全）
 * 仍归 agent，CLI 只核结构覆盖度——符合债单「persuasion-only → 补最小硬门」原则。
 *
 * @param {{reportContent: string|null, planContent: string|null}} params
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateSymbolImpactReport({ reportContent, planContent }) {
  const errors = []
  if (!reportContent || !String(reportContent).trim()) {
    return { ok: false, errors: ['symbol-impact.md 不存在或内容为空——「加载上下文」步的符号影响面报告必须落盘（逐 task 一行结论，「无签名级变更」也要显式写）'] }
  }
  // 2026-08-20-task-truth-unify：task 清单源迁 tasks.md（参数名 planContent 保持兼容既有调用，
  // 语义=任务注册表内容；调用方 enforceSymbolImpactGate 已改读 tasks.md）
  const taskIds = extractTaskIdsFromRegistry(planContent)
  if (taskIds.length === 0) return { ok: true, errors } // 注册表无 task 可列（默认兜底形态）→ 无可校验对象
  const missing = taskIds.filter(id => !String(reportContent).includes(id))
  for (const id of missing) {
    errors.push(`${id} 未在 symbol-impact.md 中出现——每个 task 都要有一行结论（含「无签名级变更」的显式声明）`)
  }
  // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
  //（generateSymbolImpactSkeleton），占位未替换即拦——骨架消灭的是「从零手写/漏 task」错误面，
  // 不是把「逐 task 结论」本身变成走过场。
  const report = String(reportContent)
  const todoPending = taskIds.filter(id => new RegExp(`^[-*]\\s*${id}[^\\n]*<!--TODO-->`, 'm').test(report))
  for (const id of todoPending) {
    errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
  }
  return { ok: errors.length === 0, errors }
}

/**
 * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
 *
 * gate 此前只报错不代填 → agent 从零手写整份报告，忘一个 task 就被拦、再补再撞。
 * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
 * 由 validateSymbolImpactReport 拒绝，骨架不能直接过门（防偷懒）。
 *
 * @param {string} tasksContent - 任务注册表（tasks.md，回退 plan.md）内容
 * @returns {string|null} 骨架全文（LF）；注册表无 task 行 → null
 */
export function generateSymbolImpactSkeleton(tasksContent) {
  const taskIds = extractTaskIdsFromRegistry(tasksContent)
  if (taskIds.length === 0) return null
  const lines = [
    '# 符号影响面报告',
    '',
    '> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。',
    '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
    '> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。',
    '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
    '',
  ]
  for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
  return lines.join('\n') + '\n'
}

/**
 * 符号影响面报告硬门：execute「加载上下文」步 --done 时校验 symbol-impact.md 落盘 + task 覆盖度。
 * fail-closed：不通过 → exit 1（进度不推进；步骤状态保持 pending，无 steps 句柄不标 blocked）。
 * 非目标步骤/阶段直接放行。
 */
export async function enforceSymbolImpactGate(stageName, changeName, currentStepName, specBase) {
  if (stageName !== 'execute') return
  if (!currentStepName || !currentStepName.includes('加载上下文')) return
  const tasksPath = join(specBase, 'changes', changeName || '', 'tasks.md')
  const reportPath = join(specBase, 'changes', changeName || '', 'symbol-impact.md')
  if (!existsSync(tasksPath)) return // 注册表缺失场景已有 plan 阶段 gate 把关，此处不重复拦
  let tasksContent = ''
  try { tasksContent = readFileSync(tasksPath, 'utf8') } catch { return }
  let reportContent = null
  try { reportContent = readFileSync(reportPath, 'utf8') } catch { /* 缺失由 validate 报 */ }
  const result = validateSymbolImpactReport({ reportContent, planContent: tasksContent })
  if (result.ok) return
  console.error('❌ ── 符号影响面报告校验阻断（本次 --done 未完成，进度未推进）──')
  console.error(`   「加载上下文」步的符号影响面检查报告未落盘或不完整：`)
  console.error(`   期望路径：${reportPath}`)
  for (const e of result.errors) console.error(`   • ${e}`)
  // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
  // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
  let skeletonNote = ''
  if (!existsSync(reportPath)) {
    const skeleton = generateSymbolImpactSkeleton(tasksContent)
    if (skeleton) {
      try {
        writeAtomicSync(reportPath, skeleton)
        skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
      } catch { /* 写失败只影响提示，不掩盖原始错误 */ }
    }
  }
  console.error(`   修复：按「加载上下文」步操作 11 完成符号影响面扫描，逐 task 写结论后重跑 execute --done。${skeletonNote}`)
  process.exit(1)
}

/**
 * UI 原型软提醒（非阻断）：brainstorm「生成规范文件」步 --done 时，design.md 命中前端文件
 * 但变更目录无 prototype-*.html → console.warn 一行，用户可否决。程度判断（布局级才必须出）
 * 是语义判断，CLI 不硬卡只提示——治 agent 对明显 UI 改造静默跳过原型的坑。
 */
export function warnMissingUiPrototype(stageName, changeName, currentStepName, specBase) {
  if (stageName !== 'brainstorm' || !currentStepName || !currentStepName.includes('生成规范文件')) return
  if (!changeName || !specBase) return
  const changeDir = join(specBase, 'changes', changeName)
  const designPath = join(changeDir, 'design.md')
  if (!existsSync(designPath)) return
  try {
    if (readdirSync(changeDir).some(f => /^prototype-.*\.html$/i.test(f))) return
  } catch { return } // 目录不可读（平台模式 specRoot 差异等）→ 静默跳过，不制造噪音
  const design = readFileSync(designPath, 'utf8')
  const feExts = [...new Set((design.match(/\.(vue|svelte|astro|tsx|jsx|css|scss|sass|less|styl|html)\b/gi) || []).map(s => s.replace('.', '').toLowerCase()))]
  if (feExts.length === 0) return
  console.warn(`   ⚠️ design.md 命中前端文件类型（${feExts.join('/')}）但变更目录无 prototype-*.html——轻微样式改动可忽略；布局/交互流程级变化应补原型（sillyspec run brainstorm --reopen 回到「分段展示设计」，或直接让 agent 补生成）`)
}

/**
 * 判断当前 execute step 所在 wave 是否全部 task 都声明 no_deps_verify: true（D-006@v2）。
 * 仅 wave 执行步骤（名如 "Wave N 执行"）可 opt-out；非 wave 步骤恒返回 false（保守过门）。
 */
function isCurrentWaveAllNoDepsVerify(stepName, changeDir) {
  if (!stepName) return false
  const m = String(stepName).match(/^Wave\s+(\d+)/i)
  if (!m) return false
  const waveN = parseInt(m[1], 10)
  if (!changeDir) return false
  const planPath = join(changeDir, 'plan.md')
  if (!existsSync(planPath)) return false
  const plan = readFileSync(planPath, 'utf8')
  const waveRe = new RegExp(`^##\\s*Wave\\s+${waveN}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|\\n#\\s|$)`, 'm')
  const waveMatch = plan.match(waveRe)
  if (!waveMatch) return false
  // 2026-08-20-task-truth-unify：Wave 段任务为纯 ID 引用行（"- task-XX"），不再有 checkbox
  const taskIds = [...waveMatch[1].matchAll(/^[-*]\s+(task-\d+)\s*$/gim)].map(x => x[1])
  if (taskIds.length === 0) return false
  for (const id of taskIds) {
    // 体检 BUG-19：plan 常态写补零 task-01，但 AI 写出 task-3 时卡片实际是 task-03.md——
    // 未归一则 existsSync 恒 false，wave 级 no_deps_verify 豁免静默失效（保守方向）
    const cardPath = join(changeDir, 'tasks', `${normalizeTaskId(id)}.md`)
    if (!existsSync(cardPath)) return false // 卡片缺失 → 保守不跳
    const card = readFileSync(cardPath, 'utf8')
    const fm = card.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return false
    if (!/no_deps_verify:\s*true/i.test(fm[1])) return false
  }
  return true
}

/**
 * doctor --align-execute-progress --confirm 的前置 review 门（坑 doctor-align-bypass-review-gate，
 * 2026-08-20 实证）：alignExecuteToPlan 直写 completed「绕过 completeStep 推导」，此前 execute 的
 * Stage Review Gate 与 Task Review Gate 被整体跳过——而 worktree 清理后的恢复场景恰是最需要
 * review 审计的时刻（实证靠 15 份 task review + verify 全程补足覆盖才没出事）。
 *
 * 本函数供 CLI 层（index.js doctor align 分支）在 confirm 落盘前调用，跑与正常完成路径同源的
 * 只读校验（不自动生成 marker/runId——恢复读场景缺失就是缺失，如实报告）：
 *   1. Stage Review：tier=independent 时须存在有效 execute stage review.json（verdict 非 fail）；
 *      tier=self 放行（与正常 gate 分级一致）。
 *   2. Task Review：所有 task 的 review.json 齐备且 verdict 非 fail（runId 解析同 Task Review Gate：
 *      marker → 含 tasks/ 目录扫描；不 generate）。
 *
 * @param {{ cwd: string, changeName: string, specBase: string, platformOpts?: object }} opts
 * @returns {Promise<boolean>} true=被门阻断（CLI 应放弃 align 并 exit 1）；false=校验通过可继续
 */
export async function enforceAlignExecuteReviewGate({ cwd, changeName, specBase, platformOpts = {} }) {
  const effectiveSpecBase = platformOpts?.specRoot || specBase
  const runtimeRoot = resolveRuntimeRoot(platformOpts, effectiveSpecBase)
  const reviewChangeDir = resolveChangeDir(cwd, { currentChange: changeName }, platformOpts?.specRoot || null)
  const blocked = (msgs) => {
    console.error('\n❌ doctor --align-execute-progress 前置 review 校验未过——execute 完成审计不能绕过：')
    for (const m of msgs) console.error('   - ' + m)
    console.error('   解法：补齐上述 review 后重跑 align（stage review：sillyspec register-stage-review --change ' + changeName + ' --stage execute；task review：按报错路径补 review.json）')
    return true
  }

  // 1. Stage Review（tier 分级同正常 gate）
  try {
    const { classifyReviewTier } = await import('../review-tier.js')
    const { validateStageReview, getLatestStageReviewRunId, printStageReviewResult } = await import('../stage-review.js')
    const designPath = reviewChangeDir ? join(reviewChangeDir, 'design.md') : null
    let planLevel = null
    if (reviewChangeDir) {
      const planPath = join(reviewChangeDir, 'plan.md')
      if (existsSync(planPath)) {
        const fmLine = readFileSync(planPath, 'utf8').split('\n').find(l => l.trim().startsWith('plan_level:'))
        if (fmLine) planLevel = fmLine.split(':')[1].trim()
      }
    }
    const tier = classifyReviewTier({ planLevel, designPath })
    if (tier.tier === 'self') {
      console.log('ℹ️  Stage Review: execute tier=self（' + tier.reason + '），align 前置门放行（不强制独立审查）')
    } else {
      // 只读解析（不 generate/写 marker）：恢复场景下缺失即缺失
      const reviewRunId = getLatestStageReviewRunId(runtimeRoot, 'execute', changeName)
      if (!reviewRunId) {
        return blocked(['execute stage review runId 无法定位（marker 缺失且 stage-reviews/ 无含 review 的 run 目录）'])
      }
      const searchDirs = [effectiveSpecBase, reviewChangeDir, cwd].filter(Boolean)
      const reviewResult = validateStageReview({ stage: 'execute', reviewType: 'acceptance', runtimeRoot, reviewRunId, searchDirs })
      printStageReviewResult(reviewResult, { stage: 'execute', reviewRunId, runtimeRoot, changeName })
      if (!reviewResult.ok) return true // printStageReviewResult 已给明细，不再重复列
    }
  } catch (e) {
    // fail-closed：门自身异常阻断 align（与正常 gate 一致），不静默放行
    console.error('❌ align 前置 Stage Review 校验异常，阻断对齐: ' + e.message)
    return true
  }

  // 2. Task Review（runId 只读解析：marker → 含 tasks/ 扫描；不 generate）
  try {
    const { validateTaskReviews, printReviewResult, resolveLatestExecuteRunIdWithTasks, isValidExecuteRunId } = await import('../task-review.js')
    const planPath = reviewChangeDir ? join(reviewChangeDir, 'plan.md') : null
    if (!planPath || !existsSync(planPath)) {
      return blocked(['plan.md 不存在，Task Review 无从校验（align 的 checkbox 判定依赖同目录，疑似路径解析异常）'])
    }
    const planContent = readFileSync(planPath, 'utf8')
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    let executeRunId = ''
    try {
      if (existsSync(runIdFile)) {
        const c = readFileSync(runIdFile, 'utf8').trim()
        if (c && isValidExecuteRunId(c)) executeRunId = c
      }
    } catch {}
    if (!executeRunId) {
      executeRunId = resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName }) || ''
    }
    if (!executeRunId) {
      return blocked(['execute runId 无法定位（marker 缺失且 execute-runs/ 无含 review 的 run 目录）——15/N 份 task review 所在 run 不可寻，无法对账'])
    }
    const reviewResult = validateTaskReviews({ planContent, runtimeRoot, executeRunId, changeDir: reviewChangeDir, gitDir: cwd })
    printReviewResult(reviewResult, { runtimeRoot, executeRunId })
    if (!reviewResult.ok) return true // 报错明细已在 printReviewResult 输出
    console.log('✅ align 前置 review 校验通过（stage review + task review 均齐备），继续对齐')
  } catch (e) {
    console.error('❌ align 前置 Task Review 校验异常，阻断对齐: ' + e.message)
    return true
  }
  return false
}

/**
 * execute deps 验证硬门（change 2026-06-28-worktree-deps-provision / D-001@v1, D-003@v1, D-006@v2）。
 * depsStatus 不达标且非 wave 级 opt-out 时阻断 --done：置 step=blocked + exit(1)，与 requiresWait 同范式。
 * 放行返回 true；阻断时经 persist 回调落盘 blocked 后 exit(1)（此前只改内存不落库，
 * progress show/doctor 看到的仍是 pending，与 docstring 承诺不符、误导诊断）。
 */
export async function enforceDepsGate(stageName, cwd, changeName, step, steps, currentIdx, specBase, platformOpts, persist) {
  if (stageName !== 'execute') return true
  let meta = null
  let wm = null
  try {
    const { WorktreeManager } = await import('../worktree.js')
    wm = new WorktreeManager({ cwd })
    meta = wm.getMeta(changeName)
  } catch (e) {
    // WorktreeManager 构造/读取失败（git 不可用 / worktree 元数据损坏）不阻断 deps gate；
    // 下游已有物理目录存在性判定兜底（G2/R3），这里 warn 留下根因线索，避免静默误诊。
    console.warn(`⚠️ worktree meta 读取失败（deps gate 将走物理目录判定）: ${e.message}`)
  }
  const depsStatus = meta?.depsStatus
  if (['linked', 'installed', 'n/a'].includes(depsStatus)) return true
  const changeDir = changeName ? join(specBase, 'changes', changeName) : null
  if (isCurrentWaveAllNoDepsVerify(step?.name, changeDir)) return true
  if (steps && steps[currentIdx]) steps[currentIdx].status = 'blocked'
  // ── 诊断分支（Phase 2，G2/R3 修正：判定基于物理目录而非 !meta）──
  // getMeta 对"目录不存在"与"meta 损坏"都返回 null，后者会误判终态 → 用物理目录存在性判定。
  let worktreeGone = true
  try {
    worktreeGone = !!(wm && changeName) && !existsSync(wm.getWorktreePath(changeName))
  } catch {}
  // ── fail-loud 块（Phase 3，D-005@v1：仅改拒绝侧 stderr）──
  console.error('❌ ── deps 门控阻断（本次 --done 未完成，进度未推进）──')
  if (worktreeGone) {
    console.error('   worktree 不可用（已 cleanup 或目录不存在）。')
    console.error(`   修复：sillyspec doctor --align-execute-progress${changeName ? ` --change ${changeName}` : ''} 按 plan.md 对齐进度`)
    console.error(`   或：  sillyspec worktree create ${changeName || '<change>'} 重建 worktree 继续跑`)
  } else {
    console.error(`   原因：依赖未就绪（depsStatus=${depsStatus || 'unknown'}），不得在无构建/测试能力时声称完成。`)
    console.error(`   修复：sillyspec worktree doctor --fix${changeName ? ` --change ${changeName}` : ''}`)
    console.error('   或在 worktree 内手动安装依赖后重试。')
    if (meta?.depsError) console.error(`   上次供给错误：${meta.depsError}`)
  }
  if (persist) { try { await persist() } catch { /* 落盘失败不吞阻断语义 */ } }
  process.exit(1)
}

/**
 * execute --done 硬门：已勾 [x] task 的 review.json 必须 schema 完整（坑 review-json-field-gap）。
 *
 * Task Review Gate（validateTaskReviews）只在 execute 整阶段完成时跑（complete.js 阶段完成分支的
 * actualCompleted===actualTotal 守卫），单 task --done 不校验 → 子代理勾 checkbox 却漏写/漏字段
 * review.json，要到收尾才暴露，用户被迫事后批量补。本门提前到每次 --done：校验 plan 里所有已勾
 * task 的 review.json，缺字段/不存在/JSON 坏 → 置 step=blocked + exit(1)，与 enforceDepsGate 同范式
 * （阻断前经 persist 回调落盘 blocked）。
 * 未勾 task 不校验（还没做）。平台模式/无 marker/无 plan 时放行（下游 Task Review Gate 兜底）。
 */
export async function enforceReviewJsonGate(stageName, cwd, changeName, step, steps, currentIdx, specBase, platformOpts, persist) {
  if (stageName !== 'execute' || !changeName) return true
  // head 锡点自动落盘（2026-08-21 审计项③，D-010 补对称）：跨仓 task base_commit 已在派发时
  // CLI 落盘，head_commit 此前靠主 agent 按 prompt 手跑 rev-parse 手写（漏抄/抄错炸 review gate）。
  // 每次 --done 时机幂等补齐（已存在不覆盖）。best-effort：失败只 warn，不阻断 --done 主流程。
  try {
    const { stampCrossRepoHeadCommits } = await import('../stages/execute.js')
    const stamped = await stampCrossRepoHeadCommits({ changeName, cwd, specBase, platformOpts })
    if (stamped && stamped.stamped > 0) {
      console.log(`📌 已自动落盘跨仓 task head_commit 锡点：${stamped.stampedTasks.join(', ')}（幂等，此后 --done 不再重复写）`)
    }
  } catch (e) {
    console.warn(`⚠️ head_commit 锡点自动落盘失败（降级留给 agent 手写）: ${e.message}`)
  }
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
  const planPath = join(specBase, 'changes', changeName, 'plan.md')
  if (!existsSync(runIdFile) || !existsSync(planPath)) return true
  const { validateCheckedTaskReviews, resolveLatestExecuteRunIdWithTasks, isValidExecuteRunId } = await import('../task-review.js')
  // existsSync 与 read 之间 marker 可能被并发 cleanup/归档删除（多 agent 场景）：读失败按
  //「marker 缺失」处理，走漂移兜底重定位，不让 ENOENT 冒成顶层 stack（与 :426-435 口径对齐）
  let executeRunId = ''
  try {
    executeRunId = readFileSync(runIdFile, 'utf8').trim()
  } catch {
    console.warn('⚠️ execute run marker 读取失败（可能被并发清理），改扫真实 run 目录')
    executeRunId = resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName }) || ''
  }
  // marker 是 agent 可写内容：格式校验防注入/穿越，非法视为缺失走漂移兜底重定位
  if (executeRunId && !isValidExecuteRunId(executeRunId)) {
    console.warn(`⚠️ execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(executeRunId.slice(0, 60))}），改扫真实 run 目录`)
    executeRunId = ''
  }
  // 2026-08-20-task-truth-unify：已勾 task 清单源迁 tasks.md（勾选唯一落点）；tasks.md 缺失
  // 回退 planPath 内容（旧变更兼容读侧）。planPath 存在性已在上方把关。
  const tasksRegistryPath = join(specBase, 'changes', changeName, 'tasks.md')
  const planContent = existsSync(tasksRegistryPath)
    ? readFileSync(tasksRegistryPath, 'utf8')
    : readFileSync(planPath, 'utf8')
  // marker 读失败且重定位无果（无任何含 tasks/ 的 run）：无 run 可校验，放行（下游 Task Review Gate 兜底）
  if (!executeRunId) return true
  // marker 漂移兜底（gate-atom-a 正确修法）：marker 指向的 run 缺 tasks/（generateExecuteRunId 只写
  // marker 不建目录，漂移后新 run 不继承旧 review）时，无视 marker 改扫 execute-runs/ 取 mtime 最新
  // 且真正含 tasks/ 的 run，用其齐备的 review.json 校验，避免误报「review.json 不存在」。注意不能用
  // resolveLatestExecuteRunId——它见 marker 非空即原样返回（不校验目录），恰是本场景要绕开的值。
  if (executeRunId && !existsSync(join(runtimeRoot, 'execute-runs', executeRunId, 'tasks'))) {
    const relocated = resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName })
    if (relocated && relocated !== executeRunId) {
      console.warn(`⚠️ execute run marker 漂移：${executeRunId} 无 tasks/，改用真实含 review 的 run ${relocated}`)
      executeRunId = relocated
    }
  }
  const result = validateCheckedTaskReviews({ planContent, runtimeRoot, executeRunId })
  if (result.ok) return true
  if (steps && steps[currentIdx]) steps[currentIdx].status = 'blocked'
  console.error('❌ ── review.json 字段校验阻断（本次 --done 未完成，进度未推进）──')
  console.error('   已勾选 [x] 的 task review.json 不完整（铁律：勾 checkbox 前必须先写完整 review.json）:')
  for (const f of result.failures) {
    const kindLabel = f.kind === 'missing' ? 'review.json 不存在' : (f.kind === 'parseError' ? 'JSON 解析失败' : '字段缺失')
    console.error(`   • ${f.taskId}（${kindLabel}）: ${f.reviewPath}`)
    for (const e of f.errors) console.error(`       - ${e}`)
  }
  console.error('   修复：mechanics 字段（base/head/changedFiles/schemaVersion）缺错可跑 sillyspec backfill-reviews --change ' + changeName + ' --adopt 一键代填（verdict 保留）；verdict/证据缺失需人工补全后重跑 execute --done。')
  if (persist) { try { await persist() } catch { /* 落盘失败不吞阻断语义 */ } }
  process.exit(1)
}

/**
 * 阶段完成校验失败时回滚状态。
 *
 * completeStep 在跑 validator 之前就把 stageData.status 写成 'completed'，
 * 若校验失败不回滚，DB 会与真实产物不一致（hook/doctor/下游阶段全部误判），
 * 且所有步骤都是 completed 时 agent 无法重新 --done（"没有待完成的步骤"）。
 * 此处将 stage 回滚为 in-progress，最后一步重置为 pending，供修复产物后重做。
 */
function rollbackStageCompletion(stageData, steps, currentIdx) {
  // 辅助阶段在 validator 前已被重置为 pending（steps 也换成了新数组），不要覆盖
  if (stageData.status === 'completed') {
    stageData.status = 'in-progress'
    stageData.completedAt = null
  }
  if (steps[currentIdx] && steps[currentIdx].status === 'completed') {
    steps[currentIdx].status = 'pending'
    steps[currentIdx].completedAt = null
  }
}

/**
 * 阶段完成校验失败后的统一收尾：回滚 stage/step 状态 + 落盘 + sync + 返回「未完成」。
 *
 * completeStep 的各 gate（runValidators / verify-test 对账 / plan→execute contract /
 * Stage Review / Execute Task Review）失败时都走这套动作；原先每个失败分支手写重复
 * ~7 次（含 lastActive 落盘 + triggerSync + return 结构），统一进来消坑，避免某分支
 * 漏写 triggerSync / 写错 return 结构导致行为分裂。返回 nextPendingIdx=currentIdx，
 * 让上层走「完成但不推进」分支，--done 被拒、agent 修复产物后重跑。
 */
function rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts) {
  rollbackStageCompletion(stageData, steps, currentIdx)
  progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
}
/**
 * 阶段完成校验 gate 级联（从 completeStep 抽出，行为保持）。仅当所有步骤确实标记为 completed 时
 * 由 completeStep 调用。顺序：runValidators → verify-test 对账 → Plan→Execute contract →
 * Stage Review Gate → Execute Task Review Gate。任一 gate 失败 → rollbackCompletionAndReturn
 * （统一回滚 + 返回 early-return 对象）；全部通过 → 返回 null（completeStep 继续收尾）。
 *
 * @returns {{stageCompleted:false,currentIdx,nextPendingIdx:number}|null}
 */
export async function runStageCompletionGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, ctx = null }) {
  const projectName = progress.project || basename(cwd)
  const contractResult = runValidators(stageName, cwd, changeName, { projectName, specRoot: platformOpts?.specRoot })
  if (contractResult.errors.length > 0) {
    console.error(`\n❌ 阶段 ${stageName} 校验失败：`)
    for (const err of contractResult.errors) {
      console.error(`   - ${err}`)
    }
    // 出路提示常放在 warnings（如「写明不改理由即可豁免」），此处即将阻断 return，
    // 必须一并打出，否则 agent 只看到症状看不到怎么过。
    for (const w of (contractResult.warnings || [])) {
      console.error(`   · ${w}`)
    }
    console.error(`\n   提示：修复缺失产物后重新完成此步骤（--skip-approval 只跳过阶段转换/审批检查，不能跳过产物校验）`)
    // 产物校验失败必须阻断完成 —— 否则 validator 形同虚设，
    // verify 会带着 FAIL/缺 verify-result.md 被 ✅ 标记完成（历史教训）。
    // plan/execute 的专项契约校验（下方）在产物齐全后才需要继续跑，故此处先 return。
    return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
  }
  if (contractResult.warnings.length > 0) {
    console.warn(`\n⚠️ 阶段 ${stageName} 校验警告：`)
    for (const w of contractResult.warnings) {
      console.warn(`   - ${w}`)
    }
  }

  // verify 产物校验通过 + 结论非 FAIL（否则上面已阻断）。
  // 再由 CLI 亲自执行 local.yaml 的测试命令，与 verify-result.md 的自报告对账：
  // 自报告 PASS 但实测失败 → 阻断（防止"文案通过"绕过验证）。
  if (stageName === 'verify') {
    const { runVerifyTestCheck, printVerifyTestCheck } = await import('../verify-postcheck.js')
    // 测试实测是同步 execSync，长套件可跑 2~10min 且中途无输出——先预告避免 agent 误判卡死
    console.log(`\n⏳ Verify 测试对账：CLI 亲自执行 local.yaml 的 commands.test（同步，耗时可能较长，请等待…）`)
    const testCheck = runVerifyTestCheck({ cwd, specBase, changeName, ctx })
    printVerifyTestCheck(testCheck)
    if (testCheck.status === 'failed') {
      console.error('\n❌ verify 阶段被阻断：verify-result.md 自报告通过，但 CLI 实测测试失败。')
      console.error('   请修复失败的测试并更新 verify-result.md 后重新完成此步骤。')
      return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
    }
    // lint 对账（2026-08-21 审查 CLI-1）：test 侧"自报告 PASS 但实测失败→阻断"已闭环，
    // lint 侧此前纯口头——CLI 亲自执行 commands.lint，advisory 起步（失败打印不阻断，观察期后升级）
    const { runVerifyLintCheck, printVerifyLintCheck } = await import('../verify-postcheck.js')
    const lintCheck = runVerifyLintCheck({ cwd, specBase })
    if (lintCheck.status !== 'skipped') {
      console.log(`\n⏳ Verify lint 对账：CLI 亲自执行 local.yaml 的 commands.lint…`)
    }
    printVerifyLintCheck(lintCheck)
    // 契约 parity 对账：扫前端 API 调用 vs execute 提取的 provider endpoint artifact。
    // 接线自 contract-matrix pipeline（verifyApiParity 的 CLI 入口）。
    const { runVerifyParityCheck, printVerifyParityCheck } = await import('../verify-postcheck.js')
    const parityRuntimeRoot = resolveRuntimeRoot(platformOpts, specBase)
    const parityCheck = runVerifyParityCheck({ cwd, specBase, changeName, runtimeRoot: parityRuntimeRoot })
    printVerifyParityCheck(parityCheck)
    // ── 删除探针（advisory，不阻断）：切斯特顿栅栏护栏，用 git 事实对账静默删除代码 ──
    const { runVerifyDeletionCheck, printVerifyDeletionCheck } = await import('../verify-postcheck.js')
    const deletionCheck = runVerifyDeletionCheck({ cwd, specBase, changeName })
    printVerifyDeletionCheck(deletionCheck)
    // ── required-evidence 对账（advisory，不阻断）：闭合 execute→verify evidence 死链 ──
    // execute Task Review Gate 把 cannot_verify 任务的 evidence 落盘 verify-required-evidence.json，
    // 本探针查每个 cannot_verify 任务是否在 verify-result.md 体现（CLI 只查提及，满足度 agent 自报告）。
    const { runVerifyRequiredEvidenceCheck, printVerifyRequiredEvidenceCheck } = await import('../verify-postcheck.js')
    const evidenceCheck = runVerifyRequiredEvidenceCheck({ cwd, specBase, changeName })
    printVerifyRequiredEvidenceCheck(evidenceCheck)
    // ── module-impact 死信探针（blocking，债单 D-1/D-5）：更新结果表 pending/待办行 → 阻断 verify ──
    // 与 archive 移动前校验（extractPendingDocSyncRows）同一口径，把死信号从 archive 提前到 verify：
    // agent 在 verify 阶段就须完成文档同步并回填 done/skipped，而非拖到归档被拦（修复 perf-remediation
    // 类「verify PASS → archive 才发现 pending」的时序漏洞）。
    const verifyChangeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
    if (verifyChangeDir) {
      const impactPath = join(verifyChangeDir, 'module-impact.md')
      if (existsSync(impactPath)) {
        const { extractPendingDocSyncRows } = await import('./complete-handlers.js')
        const pendingRows = extractPendingDocSyncRows(readFileSync(impactPath, 'utf8'))
        if (pendingRows.length > 0) {
          console.error(`\n❌ verify 阶段被阻断：module-impact.md「更新结果」表存在 ${pendingRows.length} 个未清 pending/待办项（死信）`)
          for (const row of pendingRows) console.error(`   - ${row}`)
          console.error('   文档同步是 verify 的收尾义务：请完成模块文档同步并回填状态为 done/skipped（说明原因），再重新完成 verify。')
          return rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
        }
      }
    }
    console.log('\n✅ 验证通过，下一步：sillyspec run archive')
  }

  // ── Plan postcheck contract：tasks.md（注册表）× plan.md（Wave 引用）须满足 execute 契约 ──
  if (stageName === 'plan') {
    const planFile = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
    const planPath = planFile ? join(planFile, 'plan.md') : null
    if (planPath && existsSync(planPath)) {
      const { validatePlanForExecute } = await import('../stages/execute.js')
      // CRLF 归一：Windows 编辑器/python 写文件可产生 CRLF，归一后交校验（与 plan-postcheck.js 同口径）
      const planContent = readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n')
      const tasksPath = join(planFile, 'tasks.md')
      const tasksContent = existsSync(tasksPath) ? readFileSync(tasksPath, 'utf8').replace(/\r\n/g, '\n') : ''
      const planValidation = validatePlanForExecute(tasksContent, planContent)
      if (!planValidation.ok) {
        console.error(`\n❌ Plan → Execute Contract 校验失败：`)
        for (const err of planValidation.errors) console.error(`   - ${err}`)
        console.error(`\n   tasks.md/plan.md 不满足 execute 契约，请修复后重新完成此步骤。`)
        // 阻断 completed
        return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
      }
      if (planValidation.warnings.length > 0) {
        console.warn(`\n⚠️  Plan contract 警告（不阻断完成）：`)
        for (const w of planValidation.warnings) console.warn(`   - ${w}`)
      }
      if (planValidation.ok) {
        console.log(`\n✅ Plan → Execute Contract 校验通过（${planValidation.tasks.length} tasks, ${planValidation.waves.length} waves）`)
      }
    }
  }

  // ── Stage Review Gate：brainstorm/plan/execute 独立审查（按 tier 分级）──
  // tier=self 放行+审计打印；tier=independent 必须 review.json 且 verdict 非 fail，fail-closed
  if (['brainstorm', 'plan', 'execute'].includes(stageName)) {
    try {
      const { classifyReviewTier } = await import('../review-tier.js')
      const { validateStageReview, getLatestStageReviewRunId, printStageReviewResult, generateStageReviewRunId, stageReviewMarkerPath } = await import('../stage-review.js')
      const effectiveSpecBase = platformOpts?.specRoot || specBase
      const reviewChangeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
      const designPath = reviewChangeDir ? join(reviewChangeDir, 'design.md') : null
      let planLevel = null
      if (reviewChangeDir) {
        const planPath = join(reviewChangeDir, 'plan.md')
        if (existsSync(planPath)) {
          const fmLine = readFileSync(planPath, 'utf8').split('\n').find(l => l.trim().startsWith('plan_level:'))
          if (fmLine) planLevel = fmLine.split(':')[1].trim()
        }
      }
      const tier = classifyReviewTier({ planLevel, designPath })
      const runtimeRoot = resolveRuntimeRoot(platformOpts, effectiveSpecBase)

      if (tier.tier === 'self') {
        console.log('\nℹ️  Stage Review: ' + stageName + ' tier=self（' + tier.reason + '），已降级为当前 agent 自审，不强制独立子代理。')
      } else {
        let reviewRunId = getLatestStageReviewRunId(runtimeRoot, stageName, changeName)
        if (!reviewRunId) {
          // marker 缺失（execute 批量完成跳过 prompt 渲染等场景）→ 自生 + 写盘
          // 让 gate 读到确定 ID，错误从 execute-null 变 execute-review-<id>（可执行）
          reviewRunId = generateStageReviewRunId()
          try {
            mkdirSync(runtimeRoot, { recursive: true })
            writeAtomicSync(stageReviewMarkerPath(runtimeRoot, stageName, changeName), reviewRunId + '\n')
          } catch {}
        }
        const reviewType = stageName === 'brainstorm' ? 'design'
          : stageName === 'plan' ? 'plan'
          : 'acceptance'
        const searchDirs = [effectiveSpecBase, reviewChangeDir, cwd].filter(Boolean)
        const reviewResult = validateStageReview({ stage: stageName, reviewType, runtimeRoot, reviewRunId, searchDirs })
        printStageReviewResult(reviewResult, { stage: stageName, reviewRunId, runtimeRoot, changeName })
        if (!reviewResult.ok) {
          return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
        }
      }
    } catch (e) {
      // fail-closed：Gate 自身异常阻断完成，不静默放行（与 Task Review Gate 一致）
      console.error('❌ Stage Review Gate 异常，阻断 ' + stageName + ' 完成: ' + e.message)
      return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
    }
  }

  // ── Execute Task Review Gate：所有 task 必须有 review.json 且 verdict 通过 ──
  if (stageName === 'execute') {
    try {
      const { validateTaskReviews, printReviewResult, writeVerifyRequiredEvidence } = await import('../task-review.js')
      const effectiveSpecBase = platformOpts?.specRoot || specBase
      const planFile = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
      const planPath = planFile ? join(planFile, 'plan.md') : null

      if (planPath && existsSync(planPath)) {
        // 2026-08-20-task-truth-unify：任务清单源迁 tasks.md（validateTaskReviews 内按
        // checkbox 行解析，tasks.md 行格式兼容原正则）；缺失回退 plan.md（旧变更兼容读侧）
        const tasksRegistryPath = join(planFile, 'tasks.md')
        const planContent = existsSync(tasksRegistryPath)
          ? readFileSync(tasksRegistryPath, 'utf8')
          : readFileSync(planPath, 'utf8')
        const runtimeRoot = resolveRuntimeRoot(platformOpts, effectiveSpecBase)

        // execute run id：从变更专属标记文件读取（agent 可写内容，格式校验防注入/穿越）
        const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
        let executeRunId = ''
        try {
          if (existsSync(runIdFile)) {
            const c = readFileSync(runIdFile, 'utf8').trim()
            const { isValidExecuteRunId } = await import('../task-review.js')
            if (c && !isValidExecuteRunId(c)) {
              console.warn(`⚠️ execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），视为缺失回退扫描`)
            } else {
              executeRunId = c
            }
          }
        } catch {}
        if (!executeRunId) {
          // marker 缺失：先扫描 execute-runs/ 既有目录找回真实 runId（与 getLatestStageReviewRunId
          // 目录扫描兜底同语义），避免 marker 丢失而 agent 已用旧 runId 落盘时，直接 generate 新 ID
          // 找不到旧 review、误判缺 review.json。仅当确实无既有 run 才 generate 新 ID 并落盘。
          const { generateExecuteRunId, resolveLatestExecuteRunId, stampExecuteRunChange } = await import('../task-review.js')
          executeRunId = resolveLatestExecuteRunId({ runtimeRoot, changeName }) || ''
          if (!executeRunId) {
            executeRunId = generateExecuteRunId()
            // 落盘（marker 缺失时 fallback 生成后写盘，保证后续 checkbox/gate 读到同一 ID）
            // D-001#1 fallback 写入点：mkdir execute-runs/<runId>/tasks 先于 marker（不变量：
            // marker 在则目录在）。不 try/catch——异常直穿外层 catch 走 fail-closed 阻断
            //（gate 自身写 run 目录失败不能静默放行完成）。
            mkdirSync(join(runtimeRoot, 'execute-runs', executeRunId, 'tasks'), { recursive: true })
            writeAtomicSync(runIdFile, executeRunId + '\n')
            stampExecuteRunChange(runtimeRoot, executeRunId, changeName)
          }
        }

        // git 真实性校验目录：worktree 存在则用 worktree（base/head commit 在其中），否则主仓库。
        // 跨仓支持（task-07 / design §6 gates 行 + D-013）：
        //   - 有 ctx（execute 启动入口 task-09 构造的 MultiRepoContext 实例）→ 用
        //     ctx.resolve('main').gitDir 作为主仓 task 的校验 cwd。ctx 的 main entry 已在
        //     _buildMainEntry 内统一编码 worktreePath/cwd + in-place-fallback 兜底（与 task-review.js:724
        //     generateTaskReviewDrafts 的 in-place 逻辑同源），避免两处漂移。Task Review Gate 内部循环
        //     再按 review.repo ?? 'main' 从 ctx.resolve(repo).gitDir 切跨仓 task 的 gitDir（task-04 实现）。
        //   - 无 ctx（ctx=null 缺省，单仓 / 旧调用链）→ 走原逻辑（meta.worktreePath 或 cwd），零回归。
        let reviewGitDir = cwd
        if (ctx) {
          const mainEntry = ctx.resolve('main')
          if (mainEntry?.gitDir) reviewGitDir = mainEntry.gitDir
        } else {
          try {
            const { WorktreeManager } = await import('../worktree.js')
            const wm = new WorktreeManager({ cwd })
            const meta = wm.getMeta(changeName)
            if (meta?.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
              reviewGitDir = meta.worktreePath
            }
          } catch {}
        }

        const reviewResult = validateTaskReviews({ planContent, runtimeRoot, executeRunId, changeDir: planFile, gitDir: reviewGitDir, ctx })
        printReviewResult(reviewResult, { runtimeRoot, executeRunId })

        if (!reviewResult.ok) {
          // Task review 校验失败，阻断 execute 完成
          // 检查是否存在 checkbox 已勾但 review 不通过的情况
          const uncheckedTasks = reviewResult.errors.filter(e => e.includes('缺少 review.json'))
          if (uncheckedTasks.length > 0) {
            console.error('\n⚠️  部分任务已在 tasks.md 中勾选，但 review.json 不存在。')
            console.error(`   请取消勾选这些任务的 checkbox，或补充对应的 review.json（execute run ID: ${executeRunId}）。`)
          }
          return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
        }

        // cannot_verify 的 requiredEvidence 写入 change 目录，供 verify 阶段消费
        if (reviewResult.requiredEvidence.length > 0) {
          const evidencePath = writeVerifyRequiredEvidence(join(effectiveSpecBase, 'changes', changeName), reviewResult.requiredEvidence)
          if (evidencePath) {
            console.log(`📄 verify-required-evidence.json 已写入: ${evidencePath}`)
            console.log('   verify 阶段必须满足这些证据要求。')
          }
        }
      }
    } catch (e) {
      // fail-closed：Gate 自身异常时不能默认放行，否则异常成了绕过评审的通道
      console.error(`❌ Task Review Gate 异常，阻断 execute 完成: ${e.message}`)
      console.error('   请检查 review.json / plan.md 是否可读，修复后重新完成此步骤。')
      return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
    }
  }
  return null
}

/**
 * 读取 design.md frontmatter 的 scale 字段（brainstorm 末步写入 'small'|'large'）。
 * completeStep 的下一步提示据此分叉：small→quick，large/读不到→plan（fail-safe 走重流程）。
 * 只解析首个 YAML frontmatter 块，避免误读正文里的 "scale:"。
 * 从 complete.js 迁入（completeStageGates 共享收尾管线 + completeStep brainstorm 提示消费）。
 */
export function readDesignScale(specBase, changeName) {
  if (!changeName) return null
  const designPath = join(specBase, 'changes', changeName, 'design.md')
  if (!existsSync(designPath)) return null
  const text = readFileSync(designPath, 'utf8')
  const fm = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/)
  if (!fm) return null
  const m = fm[1].match(/^scale:[ \t]*['"]?(\w+)/m)
  return m ? m[1] : null
}

/**
 * 校验变更目录下近 10 分钟新增的 .md/.yaml/.yml 文件含 author/created_at 元数据（advisory 打印）。
 * 从 complete.js 迁入（completeStageGates 共享收尾管线消费）。
 */
export function validateMetadata(cwd, stageName, specBase) {
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
    unique.forEach(f => console.log(`  - ${relative(cwd, f) || f}`))
    console.log('请在文件头部添加 author（git 用户名）和 created_at（精确到秒）')
  }
}

/**
 * 验证关键文件是否存在于正确的变更目录下（advisory 打印，防 AI 写错路径）。
 * 从 complete.js 迁入（completeStageGates 共享收尾管线消费）。
 */
export function validateFileLocations(cwd, stageName, progress, changeName, specBase) {
  const effectiveChange = changeName || progress.currentChange
  if (!effectiveChange) return

  const changeDir = join(specBase, 'changes', effectiveChange)
  if (!existsSync(changeDir)) return

  // 每个阶段完成后预期存在的文件
  // brainstorm:scale=small(小变更)只必产 design.md;large/未标 scale → 四件套全。
  // 与 validateBrainstormOutputs 的 BRAINSTORM_RULES condition(scale≠small)同源,避免对合法 small 变更
  // 误报"⬜ proposal/requirements/tasks 未找到"(本检查仅 advisory 打印不 gate,但误导输出仍要消除)。
  const brainstormExpected = readDesignScale(specBase, effectiveChange) === 'small'
    ? ['design.md']
    : ['design.md', 'proposal.md', 'requirements.md', 'tasks.md']
  const expectedFiles = {
    brainstorm: brainstormExpected,
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
    // relative(cwd, x)：Windows 下 join() 产物是反斜杠绝对路径，正斜杠拼接的 cwd 前缀裁剪永不命中
    console.log(`  变更目录：${relative(cwd, changeDir) || changeDir}/`)
    for (const f of missing) {
      // 检查是否写到了错误的位置
      const wrongPath = join(specBase, 'changes', 'change', effectiveChange, f)
      if (existsSync(wrongPath)) {
        console.log(`  ❌ ${f} — 不存在，但发现了错误路径：${relative(cwd, wrongPath) || wrongPath}`)
        console.log(`     提示：应该写入 ${relative(cwd, changeDir) || changeDir}/${f}`)
      } else {
        console.log(`  ⬜ ${f} — 未找到（该阶段可能未产出此文件）`)
      }
    }
  } else {
    console.log(`\n✅ 文件位置验证：所有 ${expected.length} 个预期文件均在变更目录中`)
  }
}

/**
 * 读本变更 design.md §6「文件变更清单」表格，提取声明交付的文件路径（concurrent 预检 ownFiles 源，D-002）。
 *
 * 用途：execute --done 并发预检在 in-place-fallback 模式下，需把本变更交付文件从 foreignFiles 排除
 * （否则自己产出的脏文件会被当他者）。worktree 模式下交付文件不在主仓 git status，ownFiles 用空数组即可。
 *
 * 解析：定位 `## 6.` 段（到下一个 `## N.` 前），逐行扫表格行第 2 列的反引号文件路径，跳过表头/分隔行。
 * 设计容错（design §9 / R-02）：design.md 缺失 / 无 §6 / 解析空 → 返回 []，foreignFiles 退化为保守噪音，
 * otherActiveChanges 仍可靠。
 *
 * @param {string} specBase 规范根（.sillyspec/ 所在）
 * @param {string} changeName 当前变更名
 * @returns {string[]} 本变更声明交付的文件路径（git 路径，正斜杠）
 */
function readDesignOwnFiles(specBase, changeName) {
  if (!specBase || !changeName) return []
  let content
  try {
    content = readFileSync(join(specBase, 'changes', changeName, 'design.md'), 'utf8')
  } catch {
    return []
  }
  const files = []
  let inSection6 = false
  for (const line of content.split('\n')) {
    const heading = line.match(/^##\s+(\d+)\./)
    if (heading) {
      inSection6 = heading[1] === '6'
      continue
    }
    if (!inSection6 || !line.startsWith('|')) continue
    // 跳过表头分隔行（|---|---|）
    if (/^\|[\s:|-]+\|?$/.test(line.trim())) continue
    // 表格第 2 列反引号文件路径：`| 新增 | \`src/.../x.js\` | 说明 |`
    const m = line.match(/^\|[^|]+\|\s*`([^`]+)`/)
    if (m) files.push(m[1].trim())
  }
  return files
}

/**
 * 阶段完成收尾共享管线（从 completeStep 抽出，消除 noAI 末步 / continueStep 完成分支绕过 gate 的
 * S1/S2/S3 三处不对称）。调用方已自行标记 stageData.status='completed' 并 pm._write 落盘后调用本函数。
 *
 * 序列：handleScanStageCompleted → validateMetadata → validateFileLocations[completed‖skipped 守卫] →
 * auxiliary 重置 → runStageCompletionGates[同守卫] → handleExecuteWorktreeCleanup。
 *
 * 关键陷阱（design §5.4）：auxiliary 重置把 stageData.steps 换成 freshSteps（全 pending）；下方
 * runStageCompletionGates 守卫与 rollbackStageCompletion 必须用入参 steps（pre-reset 原数组），
 * 不得重读 stageData.steps（否则计数恒 0 → gate 永跳过）。本函数全程用入参 steps，未重读。
 *
 * @returns {Promise<{stageCompleted:false,currentIdx,nextPendingIdx:number}|null>}
 *          null = 全部通过，调用方继续自管收尾（如下一步提示）；
 *          非 null = gate/handler 失败已 rollback，调用方直接 return。
 */
export async function completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText, ctx = null }) {
  // 整体 try/catch（task-04 / review-2026-08-09 #2）：收尾段（execute 预检 + scan handler + validate* +
  // auxiliary 重置 + runStageCompletionGates）任一段抛非结构化异常 → rollbackCompletionAndReturn
  // （回滚 in-progress + 落盘 + 返回未完成对象），不冒顶 exit 1。正常的 _scanResult/_gateEarlyReturn
  // early-return 是 return 非 throw，不被 catch 拦；下方 handleExecuteWorktreeCleanup 在 try 外（副作用独立，失败不 rollback stage 状态）。
  try {
  // ── execute --done 并发他者改动预检（FR-06/FR-07，非阻断 advisory）──
  // 仅 execute 触发，不影响 scan/plan/verify/archive 等 stage 的 completeStageGates。
  // 纯副作用：console.warn 后照常推进，不改 stageData / 不阻断级联（FR-07）。
  // 整个钩子 try/catch 兜底——任何异常吞掉，绝不影响 gate 级联（FR-07 不阻断铁律）。
  if (stageName === 'execute') {
    try {
      // ownFiles 源（D-002 + B-002，钉死）：动态 import WorktreeManager 取 meta.mode（复用上方
      // Task Review Gate 的 ../worktree.js 动态 import 先例）。WorktreeManager 无 appliedFiles
      // 字段（B-002 已证），不用模糊的「worktree applied 文件」。
      //   - worktree 模式（meta.mode 非 in-place-fallback）：主仓 git status 看不见本变更交付文件
      //     → ownFiles=[]（无害，dogfood 当前实际模式）
      //   - in-place-fallback 模式：交付文件就在主仓 dirty → ownFiles 读 design.md §6 文件清单排除
      let ownFiles = []
      // linkedChanges：execute 通常无（quick 管线概念，存 quick guard 文件）；stageData 取不到则 []。
      const linkedChanges = Array.isArray(stageData?.linkedChanges) ? stageData.linkedChanges : []
      try {
        const { WorktreeManager } = await import('../worktree.js')
        const wm = new WorktreeManager({ cwd })
        const meta = wm.getMeta(changeName)
        if (meta?.mode === 'in-place-fallback') {
          ownFiles = readDesignOwnFiles(specBase, changeName)
        }
      } catch {
        // getMeta 抛（meta.json 缺 / worktree 损坏）→ ownFiles=[] 兜底，不崩（FR-07）。
        ownFiles = []
      }
      const detected = detectConcurrentChanges(cwd, { changeName, linkedChanges, ownFiles })
      const warn = formatConcurrentWarning(detected)
      if (warn) console.warn(warn)
    } catch {
      // FR-07 不阻断：钩子任何意外异常静默吞掉，gate 级联照常推进。
    }
  }

  // scan 平台 manifest + post-check（S1 平台受害者：noAI scanPostcheck 末步 / continueStep 现也走这里）
  const _scanResult = await handleScanStageCompleted({ stageName, currentIdx, cwd, progress, pm, stageData, changeName, outputText, platformOpts })
  if (_scanResult) return _scanResult

  // 守卫计数：completed‖skipped === total（修 S3）；用入参 steps（pre-reset 原数组，design §5.4）
  const settledCount = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length
  const total = steps.length

  validateMetadata(cwd, stageName, specBase)

  // 验证关键文件位置（仅当所有步骤已结案 completed‖skipped 时才校验）
  if (settledCount === total && total > 0) {
    validateFileLocations(cwd, stageName, progress, changeName, specBase)
  }

  // 辅助阶段完成后重置步骤（scan 等 auxiliary 阶段重置回 pending 可重跑）
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
    // scan 的 quick 档 profile 随步骤表一并失效（坑 scan-quick-profile-step-mismatch 收尾）：
    // getStageSteps 感知 scanProfile 返回 3 步表，重置后 DB 是 11 步注册表，残留 profile 会让
    // 下次 --status 走 ensureStageSteps 时 11 vs 3 误报漂移重播种。下次 run scan 会重算 profile。
    if (stageName === 'scan' && stageData.scanProfile) delete stageData.scanProfile
    if (progress.currentStage === stageName) progress.currentStage = ''
    pm._write(cwd, progress, changeName)
  }

  // 阶段完成校验 gate 级联（runValidators → verify-test → Plan→Execute → Stage Review → Task Review）
  if (settledCount === total && total > 0) {
    const _gateEarlyReturn = await runStageCompletionGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, ctx })
    if (_gateEarlyReturn) return _gateEarlyReturn
  } else if (settledCount < total) {
    console.log(`\n⚠️ 阶段校验跳过：${total} 步中仅 ${settledCount} 步标记为已结案（completed‖skipped），可能存在状态不同步。如确认阶段已完成，请运行 --status 确认。`)
  }
  } catch (e) {
    console.error(`\n❌ ${stageName} 阶段完成收尾异常（已 rollback 为 in-progress，请修复后重新 --done）：${e?.message || e}`)
    return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
  }

  // execute worktree cleanup（completeStep / continueStep 完成分支统一调用，避免双清理）
  await handleExecuteWorktreeCleanup({ stageName, changeName, cwd })

  return null
}

