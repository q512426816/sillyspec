/**
 * run/gates.js（W6 Step4 从 run.js 抽出）。
 *
 * 阶段完成校验 gate 级联 + execute deps 硬门 + 完成回滚（自洽叶子模块，仅被 completeStep 调用）：
 *   - runStageCompletionGates：runValidators → verify-test 对账 → Plan→Execute contract →
 *     Stage Review Gate，任一失败走 rollbackCompletionAndReturn（Execute Task Review Gate
 *     已随 2026-09-26-task-review-retire 退役——R18 实证任务粒度评审在无独立评审者供给时
 *     全降形式合规、实质拦截为零）；
 *     级联末位追仪式档位摩擦升档检查点（2026-09-18-ceremony-risk-pricing task-03：读
 *     friction-ledger 累计账 → escalateByFriction → .runtime/ceremony-tier-<change>.json
 *     迁移留痕，只升不降、fail-soft 不阻断完成）；verify 检查族末位接 ceremony 双跑收口第一
 *     出口（runCeremonyDualRunCheck：声明档 vs 实际 diff 事实档，mismatch=errors 硬 flag 阻断，
 *     task-04 接线 / execute 评审 FAIL 修复）；升档检查块后同步派发影子审查
 *     （dispatchShadowReview，task-06 接线 / execute 评审 GAP 修复 / 2026-11-21-shadow-dispatch-form-respect
 *     FR-02 改 await——披露行退出前恒打出，只记账不阻断）
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
import { basename, join, relative, dirname } from 'node:path'
import { timedAsync } from '../timing.js'
import { runtimeStatePath } from '../runtime-paths.js'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { writeAtomicSync } from '../fs-atomic.js'
import { triggerSync, resolveChangeDir, resolveRuntimeRoot } from './shared.js'
import { runValidators } from '../stage-contract.js'
import { computeGateFingerprint, lookupGreenCache, storeGreenCache, greenCacheNotice } from './green-cache.js'
import { handleScanStageCompleted, handleExecuteWorktreeCleanup } from './complete-handlers.js'

/**
 * 评审豁免凭据（2026-09-26-review-unsupervised-exit，R18-full 实证驱动）：无嵌套派发能力的
 * 环境（子代理不能再派子代理）里，阶段评审只能降级自审——三份自审 review.json 全 PASS 零信息
 * 量纯表演，门仍硬拦形式合规（R18-full 15 次拦截里 5 次是 review 面形式）。诚实出口：agent 写
 * 变更目录 review-unsupervised.md（一行声明：环境无嵌套派发能力+时间，须含 unsupervised 字样）
 * → Stage Review Gate / doctor align 门两点共吃（Task Review 层与 --done review.json 硬门
 * 已随 2026-09-26-task-review-retire 退役）：有效
 * review.json ‖ 豁免声明二选一放行（warn+遥测，豁免率可观测）；两凭据皆无照旧 fail-closed。
 * 真独立评审（有派发能力）不受影响——豁免是声明式自曝，不是绕门。
 */
export function readReviewUnsupervisedWaiver(changeDir) {
  try {
    if (!changeDir) return null
    const p = join(changeDir, 'review-unsupervised.md')
    if (!existsSync(p)) return null
    const t = readFileSync(p, 'utf8')
    return /unsupervised/i.test(t) ? t.trim().slice(0, 200) : null
  } catch {
    return null
  }
}

/** 豁免放行的统一回显+遥测（调用点持 runtimeRoot/specBase）。 */
async function waiveWithTelemetry({ changeName, gate, specBase }) {
  console.warn(`⚠️ [评审豁免] review-unsupervised.md 在场（${gate}）——环境无嵌套派发能力，阶段评审降级留痕放行（不产自审 review.json 不表演）；声明随归档留痕，可经遥测观测豁免率`)
  try {
    const { appendKnowledgeHit } = await import('../knowledge-hits.js')
    appendKnowledgeHit(join(specBase, '.runtime'), { type: 'review-unsupervised-escape', change: changeName, gate, source: 'gates' })
  } catch { /* 遥测 fail-soft */ }
}
import { detectConcurrentChanges, formatConcurrentWarning, detectCommittedDrift, formatCommittedDriftWarning } from './concurrent-detect.js'
import { stageRegistry } from '../stages/index.js'
import { normalizeTaskId } from '../taskcard.js'
import { recordFrictionEvent } from '../friction-tally.js'
import { readFrictionLedger } from '../friction-ledger.js'
import { computeCeremonyTier, escalateByFriction, applyDeclarationCatchUp, CEREMONY_TIERS } from '../ceremony-tier.js'
import { loadBlastDeclarations } from '../blast-surface.js'
import { loadSpanRiskPatterns } from '../span-risk-surface.js'
import { resolveChangeRisk } from '../change-risk-profile.js'
import { withFileLock } from '../quicklog.js'
import { extractExplicitRiskLevel } from '../change-risk-profile.js'
import { parseFileChangeListDetailed } from '../change-list.js'
import { parseModuleMapSimple } from '../modules.js'

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
  // 单遍扫描替代逐 task new RegExp（N 个 task 原实现编译 N 个正则 + 全文扫 N 次）
  // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
  const idSet = new Set(taskIds)
  const todoHitIds = new Set()
  for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
    if (idSet.has(m[1])) todoHitIds.add(m[1])
  }
  const todoPending = taskIds.filter(id => todoHitIds.has(id))
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
  // tasks.md 内容指纹（token 成本优化 P2a）：中断续跑/阶段重开时若指纹一致且结论完整，
  // 「加载上下文」步按 prompt 指引直接沿用既有报告，不重做调用点扫描（team-session-unify
  // 实测该步 3h06min，重入重做是纯浪费）。指纹只作提示锚，gate 校验逻辑不变。
  let fingerprint = ''
  try {
    fingerprint = createHash('sha256').update(String(tasksContent)).digest('hex').slice(0, 16)
  } catch { /* 指纹失败不阻断骨架生成 */ }
  const lines = [
    '# 符号影响面报告',
    '',
    `> tasks.md 内容指纹（生成时）: ${fingerprint}——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。`,
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
  console.warn(`   ⚠️ design.md 命中前端文件类型（${feExts.join('/')}）但变更目录无 prototype-*.html——轻微样式改动可忽略；布局/交互流程级变化应补原型（sillyspec run brainstorm --reopen 回到「分段展示设计」，或直接让 agent 补生成；已有可复跑 HTML 原型则登记复用：复制进变更目录并命名 prototype-<名称>.html，execute 按此命名注入；产物须可溯源到源码（管线编译/真实渲染捕获/登记复用），手写 HTML 不得交付，对比稿供用户决策即定稿；本仓形态未在 local.yaml ui_prototype 登记的，收口前补登记——form: real-code 或 single-html+豁免 ruling）`)
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
 *   2. Task Review 段已退役（2026-09-26-task-review-retire：R18 实证任务粒度评审在无嵌套
 *      派发环境全降自审表演、实质拦截为零——豁免通道不足以止损，层整体退役；残存 review.json
 *      由 task-review.js 保留导出作历史兼容读侧）。
 *
 * @param {{ cwd: string, changeName: string, specBase: string, platformOpts?: object }} opts
 * @returns {Promise<boolean>} true=被门阻断（CLI 应放弃 align 并 exit 1）；false=校验通过可继续
 */
export async function enforceAlignExecuteReviewGate({ cwd, changeName, specBase, platformOpts = {} }) {
  const effectiveSpecBase = platformOpts?.specRoot || specBase
  const runtimeRoot = resolveRuntimeRoot(platformOpts, effectiveSpecBase)
  const reviewChangeDir = resolveChangeDir(cwd, { currentChange: changeName }, platformOpts?.specRoot || null)
  // 豁免凭据（review-unsupervised-exit）：无嵌套派发能力环境两段校验整体降级留痕放行
  if (readReviewUnsupervisedWaiver(reviewChangeDir)) {
    await waiveWithTelemetry({ changeName, gate: 'doctor-align', specBase: effectiveSpecBase })
    console.warn('   ℹ️ align 前置 review 门整体豁免（unsupervised 声明在场）——继续对齐')
    return false
  }
  const blocked = (msgs) => {
    console.error('\n❌ doctor --align-execute-progress 前置 review 校验未过——execute 完成审计不能绕过：')
    for (const m of msgs) console.error('   - ' + m)
    console.error('   解法：补齐上述 review 后重跑 align（stage review：sillyspec register-stage-review --change ' + changeName + ' --stage execute）')
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

  // 2. Task Review 段已退役（2026-09-26-task-review-retire）——原「所有 task review.json 齐备
  //    且 verdict 非 fail」校验随层退役删除；task 粒度审计改由 execute 收口的代码证据核验
  //    （checkExecuteCodeEvidence）+ verify 测试对账承担。
  console.log('✅ align 前置 review 校验通过（stage review；task review 段已退役），继续对齐')
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
  const depsOk = (s) => ['linked', 'installed', 'n/a'].includes(s)
  const changeDir = changeName ? join(specBase, 'changes', changeName) : null

  // main 侧就绪后的跨仓 worktree deps 校验（坑 cross-repo-no-worktree-isolation）：
  // 跨仓仓供给失败同样无构建/测试能力（前端仓无 node_modules 建不了 build）。只校验已建
  // worktree 的跨仓仓（legacy 直写模式无 meta，维持原语义）。
  // 放行返回 true；跨仓未就绪置 blocked + exit(1)。
  const crossCheckOrExit = async () => {
    let crossFailed = []
    try {
      const crossSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      const { listCrossWorktreeMetas } = await import('../worktree-cross.js')
      crossFailed = listCrossWorktreeMetas(crossSpecBase, changeName)
        .filter(({ meta: cm }) => cm.depsStatus && !['linked', 'installed', 'n/a'].includes(cm.depsStatus))
    } catch (e) {
      console.warn(`⚠️ 跨仓 worktree deps 校验跳过（${e.message}）`)
    }
    if (crossFailed.length === 0) return true
    if (steps && steps[currentIdx]) {
      steps[currentIdx].status = 'blocked'
      steps[currentIdx].blockReason = `跨仓 deps 门控阻断（${crossFailed.map(f => f.repoKey).join(', ')}）：修复后重试 --done`
    }
    console.error('❌ ── deps 门控阻断（本次 --done 未完成，进度未推进）──')
    for (const { repoKey, meta: cm } of crossFailed) {
      console.error(`   跨仓 repo ${repoKey} 依赖未就绪（depsStatus=${cm.depsStatus || 'unknown'}）——workdir: ${cm.worktreePath}`)
      // 报错一次给全（2026-10-12-cli-friction-signal，dogfood 实证：首条阻断只有标题无明细、
      // agent 二跑定位 + 最终两次手改内部 meta.json 才过门）——三要素 + 逃生口 + 防手改警告。
      if (cm.depsError) {
        const tail = String(cm.depsError)
        console.error(`   上次供给错误（尾部 ≤200 字符）：${tail.length > 200 ? '…' + tail.slice(-200) : tail}`)
      }
      console.error(`   状态文件：${join(cm.worktreePath || '', 'meta.json')}（勿手改——doctor 以实态校正，假状态会被下次校验打回）`)
    }
    console.error('   修复：进上述跨仓 worktree 手动安装依赖（用该仓的包管理器），或重跑 sillyspec run execute 让 CLI 重试供给后 --done。')
    console.error('   正规逃生口：sillyspec worktree doctor --fix（按实态重供并回写 meta.json）。')
    if (persist) { try { await persist() } catch { /* 落盘失败不吞阻断语义 */ } }
    process.exit(1)
  }

  if (depsOk(meta?.depsStatus)) return await crossCheckOrExit()

  // wave 级 opt-out（先于重供给：无需 deps 能力的 wave 不花 install 成本）
  if (isCurrentWaveAllNoDepsVerify(step?.name, changeDir)) return true

  // ── --done 重供给重试（坑 deps-gate-manual-retry-ineffective，2026-09-15 wp 会话实证）──
  // 阻断提示承诺「在 worktree 内手动安装依赖后重试」，但 manual install 不改 meta.depsStatus，
  // failed 态直读 meta 永不翻绿 → 重试 --done 必撞同一堵墙，唯一出路 doctor --fix（wp 会话
  // 正是手动编译成功后重试仍被拦，被迫多跑一轮 doctor）。对齐 run execute 入口
  // ensureDepsFreshness 的同款供给：阻断前重供给一次并写回 meta——PATH 已修好的 shell 里
  // 重跑 --done 即等效 doctor --fix；marker 型生态（nodejs）手动安装补齐 node_modules 后
  // 重供给的 install 也能自然通过。仍失败则维持阻断，不无限重试。
  let depsStatus = meta?.depsStatus
  if (wm && changeName) {
    let wtPath = null
    try { wtPath = wm.getWorktreePath(changeName) } catch { /* meta 缺失走物理目录判定 */ }
    if (wtPath && existsSync(wtPath)) {
      try {
        const { provisionDeps } = await import('../worktree-deps.js')
        console.log(`🔄 deps 门控：depsStatus=${depsStatus || 'unknown'}，阻断前按 --done 重试路径重供给一次（与 doctor --fix 同款）...`)
        const deps = provisionDeps(wtPath, cwd, { specBase }) || {}
        meta = { ...meta, ...deps }
        writeAtomicSync(join(wtPath, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
        depsStatus = meta.depsStatus
        console.log(`   重供给完成：depsStatus=${depsStatus || 'unknown'}${meta.depsError ? `（${meta.depsError}）` : ''}`)
        if (depsOk(depsStatus)) return await crossCheckOrExit()
      } catch (e) {
        console.warn(`⚠️ deps 门控重供给失败（维持阻断判定）：${e.message}`)
      }
    }
  }

  if (steps && steps[currentIdx]) {
    steps[currentIdx].status = 'blocked'
    // 阻断原因持久化（坑 deps-gate-blocked-invisible）：--status/诊断时可见，不依赖阻断当刻的
    // stderr（跨进程即失忆）。completed 时由 completeStep 主流程覆盖整个步骤行，残留字段不外泄。
    steps[currentIdx].blockReason = `deps 门控阻断（depsStatus=${depsStatus || 'unknown'}）：worktree doctor --fix 修复后重试 --done`
  }
  // ── 诊断分支（Phase 2，G2/R3 修正：判定基于物理目录而非 !meta）──
  // getMeta 对"目录不存在"与"meta 损坏"都返回 null，后者会误判终态 → 用物理目录存在性判定。
  let worktreeGone = true
  try {
    worktreeGone = !!(wm && changeName) && !existsSync(wm.getWorktreePath(changeName))
  } catch {}
  // ── 正当收尾放行（坑 deps-gate-cleanup-order，2026-08-28 实证：apply 后 / execute 空变更
  // cleanup 后重试 --done，被本门拦「worktree 不可用」逼 doctor --align-execute-progress 手工
  // 对齐——顺序矛盾：cleanup 是流程自己做的收尾，门却当意外丢失拦）。两凭据二选一：
  //   - apply-pathspec-<change>.txt：applyWorktree 成功后落盘（apply 后自动 cleanup 删 meta）；
  //   - execute-cleanup-<change>.json：handleExecuteWorktreeCleanup 正当清理回执。
  // 有凭据 = 隔离期已正当结束（交付已落主仓或本无交付），deps 能力要求不再适用 → 放行。
  if (worktreeGone && changeName) {
    try {
      const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
      const legitimatelyEnded = existsSync(runtimeStatePath(runtimeRoot, `apply-pathspec-${changeName}.txt`))
        || existsSync(runtimeStatePath(runtimeRoot, `execute-cleanup-${changeName}.json`))
      if (legitimatelyEnded) {
        console.log('ℹ️  worktree 已在 apply/execute 收尾时正当清理（凭据在 .runtime），deps 门放行')
        return true
      }
    } catch { /* 凭据读取失败 → 维持原判定 */ }
  }
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
    if (meta?.depsError) {
      const tail = String(meta.depsError)
      console.error(`   上次供给错误（尾部 ≤200 字符）：${tail.length > 200 ? '…' + tail.slice(-200) : tail}`)
    }
    // 状态文件路径 + 防手改（2026-10-12-cli-friction-signal）：dogfood 实证 agent 被迫手改
    // meta.json 假状态过门——路径透明 + 明示正规校正通道，堵死「改状态绕门」的路。
    try {
      if (wm && changeName) console.error(`   状态文件：${join(wm.getWorktreePath(changeName), 'meta.json')}（勿手改——doctor 以实态校正）`)
    } catch { /* worktree 路径解析失败省略该行 */ }
  }
  if (persist) { try { await persist() } catch { /* 落盘失败不吞阻断语义 */ } }
  process.exit(1)
}

// ── enforceReviewJsonGate 已退役（2026-09-26-task-review-retire）──
// 原「execute --done 时已勾 [x] task 的 review.json schema 硬门」（坑 review-json-field-gap）
// 随 Task Review 层整体退役删除：勾选语义回归 agent 手动（完成=实现+测试绿+wt-commit 即勾），
// review.json 不再是任何门的输入；validateCheckedTaskReviews 纯函数保留在 task-review.js
// （历史变更 doctor/回放兼容读侧，单元测试 review-json-field-gate.test.mjs 仍覆盖）。

/**
 * 阶段完成校验失败时回滚状态。
 *
 * completeStep 在跑 validator 之前就把 stageData.status 写成 'completed'，
 * 若校验失败不回滚，DB 会与真实产物不一致（hook/doctor/下游阶段全部误判），
 * 且所有步骤都是 completed 时 agent 无法重新 --done（"没有待完成的步骤"）。
 * 此处将 stage 回滚为 in-progress，最后一步重置为 pending，供修复产物后重做。
 *
 * 批量乐观标记一并回滚（坑 execute-batch-rollback-half-state，2026-08-29 用户实证）：execute
 * 批量完成（detectExecuteBatchFinish）把剩余步骤批量标 completed 后任一收尾 gate 失败，原先只
 * 回滚 currentIdx → 落库「步骤 11 pending + 12-16 completed」半套状态，步骤序倒挂、要再补一次
 * --done 才对齐。批量标记打 _batchAligned 戳（内存字段不落库），gate 失败 = 批量完成整体不成立，
 * 戳上的步骤随当前步一起回滚 pending，下次 --done 满足条件再重新批量标记。
 */
export function rollbackStageCompletion(stageData, steps, currentIdx) {
  // 辅助阶段在 validator 前已被重置为 pending（steps 也换成了新数组），不要覆盖
  if (stageData.status === 'completed') {
    stageData.status = 'in-progress'
    stageData.completedAt = null
  }
  if (steps[currentIdx] && steps[currentIdx].status === 'completed') {
    steps[currentIdx].status = 'pending'
    steps[currentIdx].completedAt = null
  }
  for (const s of steps) {
    if (!s) continue
    if (s._batchAligned && s.status === 'completed') {
      s.status = 'pending'
      s.completedAt = null
    }
    s._batchAligned = false
  }
}

/**
 * 阶段完成校验失败后的统一收尾：回滚 stage/step 状态 + 落盘 + sync + 返回「未完成」。
 *
 * completeStep 的各 gate（runValidators / verify-test 对账 / plan→execute contract /
 * Stage Review）失败时都走这套动作；原先每个失败分支手写重复
 * ~7 次（含 lastActive 落盘 + triggerSync + return 结构），统一进来消坑，避免某分支
 * 漏写 triggerSync / 写错 return 结构导致行为分裂。返回 nextPendingIdx=currentIdx，
 * 让上层走「完成但不推进」分支，--done 被拒、agent 修复产物后重跑。
 */
function rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts, friction) {
  // friction 尾参（friction-signal-hint task-02）：gate 失败摩擦埋点标签 {type, detail}——各调用点
  // 按所属 gate 段传来源标签（审查两段走 review_rejected），未传兜底通用 gate-cascade。
  // recordFrictionEvent 自带静默降级（非法类型/写失败返回 null），不影响回滚/返回语义。
  void recordFrictionEvent({ cwd, changeName, platformOpts, ...(friction || { type: 'gate_rollback', detail: 'gate-cascade' }) })
  rollbackStageCompletion(stageData, steps, currentIdx)
  progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
}

// ════════ 仪式档位摩擦升档（2026-09-18-ceremony-risk-pricing task-03 / D-008）════════
// 依据：design.md「总体方案 Phase 1 friction 段」+「生命周期契约表」。四阶段完成门（brainstorm/
// plan/execute/verify）各钉一个升档检查点：读 friction-ledger 按 change 过滤的累计账（禁读
// friction-tally——其 consumeFrictionHint 消费即删 + verify 收尾清零，读它会给 verify 门引入
// 隐式次序依赖，plan 全局硬约束 1），escalateByFriction 超阈 min(S3, tier+1) 只升不降，迁移记录
// 追加写 .runtime/ceremony-tier-<change>.json。档位文件是纯派生数据（与 friction-ledger 同目录
// 同生命周期，archive 时随 runtime 清理，不进 git）；读改写整段持 withFileLock（先例 complete.js
// .tasks.md.lock / friction-tally.js tally+.lock）+ writeAtomicSync 原子写（先例 fs-atomic.js /
// local-register.js .local.yaml.lock），多会话并发下「只升不降」不变量成立。

/** 档位状态文件路径（runtimeRoot 下 per-change；命名对齐 apply-pathspec-<change>.txt 先例） */
function ceremonyTierFilePath(runtimeRoot, changeName) {
  return runtimeStatePath(runtimeRoot, `ceremony-tier-${changeName}.json`)
}

/**
 * 读档位文件：缺失 / 坏 JSON / 非对象 / tier 不在 S0~S3 序 → null（档位是派生数据，坏档按无档
 * 重定价，不修复不报错——容忍立场同 readFrictionLedger）。
 */
function readCeremonyTierDoc(path) {
  try {
    const doc = JSON.parse(readFileSync(path, 'utf8'))
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null
    if (!CEREMONY_TIERS.includes(doc.tier)) return null
    return doc
  } catch {
    return null
  }
}

/** 落档位文件：writeAtomicSync 原子写（tmp+rename，读者见旧版或新版不见半截），JSON 两空格
 *  缩进（friction-ledger 落盘同口径）；调用方须已持 tier 文件锁。 */
function writeCeremonyTierDoc(path, doc) {
  mkdirSync(dirname(path), { recursive: true })
  writeAtomicSync(path, JSON.stringify(doc, null, 2))
}

/**
 * 开跑定价 / 声明追赶重定价共用重算体（design 生命周期契约表「无 → 初始档」+ D-003 追赶）：
 *   blast ＝ resolveChangeRisk 声明面判级（declaredFiles × _module-map.yaml 顶层 blast 段
 *           ＋ local 只升合并，经 loadBlastDeclarations 装载；explicit frontmatter 只压 tier
 *           不豁免 evidence，D-008/D-009——词表散文判级随 2026-09-19-ceremony-pricing-five-cuts
 *           退役）→ computeCeremonyTier blastTier 直入。design.md 缺失 → declaredFiles 空 →
 *           blast S1（声明面缺失按无命中，不缺省不拦截）。
 *   span  ＝ design 文件变更清单（readDesignOwnFiles 委托 change-list 单一真相源，双形态标题）
 *           + _module-map.yaml 跨模块口径（moduleIndex 缺失/空 → 该维跳过不缺省不拦截）。
 * frictionCounts 不进重算——摩擦轴归 escalateByFriction 检查点（超阈升一档封顶语义），
 * 两处重复计价会让 transitions 审计口径失真。
 * eventContext='initial' → reasons 追加「初始档」事件行（档位首见）；'catchup' → 不追加
 * （追赶事件行由 applyDeclarationCatchUp 落，防语义错位与 reasons 随每道门膨胀）。
 */
function computeInitialCeremonyTierDoc({ cwd, specBase, platformOpts, progress, changeName, projectName, stageName, eventContext = 'initial' }) {
  const changeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
  const designContent = changeDir && existsSync(join(changeDir, 'design.md')) ? readFileSync(join(changeDir, 'design.md'), 'utf8') : ''
  const explicitRiskLevel = designContent ? extractExplicitRiskLevel(designContent) : null
  const declaredFiles = readDesignOwnFiles(specBase, changeName)
  const { declarations } = loadBlastDeclarations({ specBase, project: projectName })
  const risk = resolveChangeRisk({ files: declaredFiles, blastDeclarations: declarations, explicitRiskLevel })
  // span 轴声明面装载（2026-09-19-span-risk-pattern-migration task-03）：与 :639 blast 装载同
  // specBase/projectName 上下文——_module-map.yaml 顶层 span_risk 段；无声明项目 → 空表（span
  // 模式维关闭，禁回退内置表，D-003；引擎默认 [] 同效，显式装载与其他声明面入参同风格）
  const spanRiskPatterns = loadSpanRiskPatterns({ specBase, project: projectName })
  let moduleIndex = null
  const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
  if (existsSync(mapPath)) {
    try { moduleIndex = parseModuleMapSimple(readFileSync(mapPath, 'utf8')) || null } catch { moduleIndex = null }
  }
  const priced = computeCeremonyTier({ blastTier: risk.tier, declaredFiles, moduleIndex, spanRiskPatterns })
  const auditLines = []
  if (risk.hitPrefixes.length > 0) {
    auditLines.push(`声明危险面命中：${risk.hitPrefixes.join('、')}（evidenceRequired=${risk.evidenceRequired}）`)
  }
  if (risk.explicit) {
    auditLines.push(`explicit risk_level 应用（tier 覆盖 → ${risk.tier}；evidenceRequired 不受豁免，D-009）`)
  }
  const reasons = [...priced.reasons, ...auditLines]
  if (eventContext === 'initial') {
    reasons.push(`初始档（开跑定价事件：${stageName} 完成门首见该 change 无档位文件，按当时可得的 blast/span 信号定价——design 生命周期契约表「无 → 初始档」行）`)
  }
  return { tier: priced.tier, components: priced.components, reasons, transitions: [] }
}

/**
 * 阶段门摩擦升档检查点（runStageCompletionGates 四完成门共用；升档不阻断本次 --done，
 * 下一阶段才生效）。流程：读 ledger 累计账 → 无档先落初始档 → escalateByFriction →
 * escalated 时追加 transitions 迁移记录写回。全程持锁（tierPath+'.lock'，读改写一整段），
 * 「只升不降」由三重保证：escalateByFriction 数学上不降 + 锁内串行化 + 写前对磁盘更高档
 * 拒绝降档写回（reasons 留痕）。fail-soft 由调用方兜底（本函数抛出即检查失败，不碰完成状态）。
 * @returns {Promise<{escalated: boolean, from: string, to: string, frictionCounts: object,
 *   downgradeRejected?: boolean, tierFilePath: string}>}
 */
async function escalateCeremonyTierAtGate({ cwd, specBase, platformOpts, progress, changeName, projectName, stageName }) {
  const effectiveSpecBase = platformOpts?.specRoot || specBase
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  // ledger 按 change 过滤的累计账（merge-by-change 后单 change 单条目）；三键超集透传给
  // escalateByFriction——引擎只消费 gate_rollback/review_rejected 两键，verify_run_failed 容忍
  const entry = readFrictionLedger(runtimeRoot).find((e) => e.change === changeName) || null
  const rawCounts = entry && entry.counts && typeof entry.counts === 'object' && !Array.isArray(entry.counts) ? entry.counts : {}
  const frictionCounts = {
    gate_rollback: Number(rawCounts.gate_rollback) || 0,
    review_rejected: Number(rawCounts.review_rejected) || 0,
    verify_run_failed: Number(rawCounts.verify_run_failed) || 0,
  }
  const tierPath = ceremonyTierFilePath(runtimeRoot, changeName)
  const result = await withFileLock(tierPath + '.lock', async () => {
    // 读档无文件（或坏档）→ 先落初始档（开跑定价事件）；档位在场 → 声明追赶重定价
    // （D-003：按当前声明面重算 → applyDeclarationCatchUp 三分支——无摩擦可升可降/摩擦
    // 地板不退 → 写回；追赶不记 transitions，摩擦价随后由 escalate 即时兑现，同锁串行）
    let doc = readCeremonyTierDoc(tierPath)
    if (!doc) {
      doc = computeInitialCeremonyTierDoc({ cwd, specBase: effectiveSpecBase, platformOpts, progress, changeName, projectName, stageName })
      writeCeremonyTierDoc(tierPath, doc)
    } else {
      const recomputed = computeInitialCeremonyTierDoc({ cwd, specBase: effectiveSpecBase, platformOpts, progress, changeName, projectName, stageName, eventContext: 'catchup' })
      const caught = applyDeclarationCatchUp({ currentDoc: doc, recomputedTier: recomputed.tier, recomputedComponents: recomputed.components, recomputedReasons: recomputed.reasons, frictionCounts })
      // 降档保护由 applyDeclarationCatchUp 三分支承担（无摩擦整档换可升可降是 D-003 的立意；
      // 有摩擦地板托底）——此处不再叠加「拒绝降档写回」（与追赶语义矛盾，防误伤）。
      doc = caught
      writeCeremonyTierDoc(tierPath, doc)
    }
    const esc = escalateByFriction(doc.tier, frictionCounts)
    if (!esc.escalated) {
      return { escalated: false, from: doc.tier, to: doc.tier, frictionCounts, tierFilePath: tierPath }
    }
    // 只升不降兜底：锁内读改写已串行化正常并发，此处对「磁盘档高于本次算得档」的锁外写入
    // （stale 偷锁极端窗口 / 手工改档）拒绝降档写回，reasons 留痕、不追加 transitions（迁移没发生）
    const disk = readCeremonyTierDoc(tierPath)
    const diskTier = disk ? disk.tier : doc.tier
    if (CEREMONY_TIERS.indexOf(diskTier) > CEREMONY_TIERS.indexOf(esc.tier)) {
      const kept = disk
      kept.reasons = [
        ...(Array.isArray(kept.reasons) ? kept.reasons : []),
        `拒绝降档写入（磁盘已 ${diskTier}，本次按摩擦算得 ${esc.tier}——只升不降不变量）`,
      ]
      writeCeremonyTierDoc(tierPath, kept)
      return { escalated: false, from: diskTier, to: diskTier, frictionCounts, downgradeRejected: true, tierFilePath: tierPath }
    }
    const transition = {
      at: new Date().toISOString(),
      from: doc.tier,
      to: esc.tier,
      frictionCounts: { gate_rollback: frictionCounts.gate_rollback, review_rejected: frictionCounts.review_rejected },
    }
    doc.tier = esc.tier
    doc.components = { ...(doc.components || {}), friction: esc.tier }
    doc.reasons = [
      ...(Array.isArray(doc.reasons) ? doc.reasons : []),
      `friction 升档（${transition.from}→${esc.tier}：ledger 累计 gate_rollback=${frictionCounts.gate_rollback}、review_rejected=${frictionCounts.review_rejected} 超阈，min(S3, tier+1)）`,
    ]
    doc.transitions = [...(Array.isArray(doc.transitions) ? doc.transitions : []), transition]
    writeCeremonyTierDoc(tierPath, doc)
    return { escalated: true, from: transition.from, to: esc.tier, frictionCounts, tierFilePath: tierPath }
  })
  return result
}
/**
 * 阶段完成校验 gate 级联（从 completeStep 抽出，行为保持）。仅当所有步骤确实标记为 completed 时
 * 由 completeStep 调用。顺序：runValidators → verify-test 对账 → Plan→Execute contract →
 * Stage Review Gate。任一 gate 失败 → rollbackCompletionAndReturn
 * （统一回滚 + 返回 early-return 对象）；全部通过 → 返回 null（completeStep 继续收尾）。
 *
 * @returns {{stageCompleted:false,currentIdx,nextPendingIdx:number}|null}
 */
export async function runStageCompletionGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, ctx = null }) {
  const projectName = progress.project || basename(cwd)
  // ── 纯文档门收集模式（R16 减负批次，2026-09-24）──
  // 对撞 R15 实证「execute 收口连挡 4 次」：多门串行 fail-fast，每次 --done 只暴露一个门，
  // 修复重跑才见下一个门。纯文档 blocking 门（validators / verify 死信与预填注 / Stage
  // Review）改为收集：全部跑完 → 一次打印清单 → 统一 rollback 一次（detail 取首门，
  // 进度库信号语义不变）。实测门（test/lint/parity/probe）保持文档面全清后才跑、内部 fail-fast
  // 不变——贵的门只为真实代码问题付账。检查点 A=verify 实测门前；B=brainstorm/plan/execute
  // Stage Review Gate 后（friction 升档前——升档语义=「所有阻断门通过」）。
  const docGateFailures = []
  // decisions.md header 自动补齐（坑 decisions-header-late-warning，2026-08-24 用户反馈二期）：
  // brainstorm step8 旧模板自带无 frontmatter 的 decisions 样例，存量变更照抄必缺 author/created_at，
  // 拖到平台同步/后续环节才提示。gate 前幂等补机械字段（先例：autoCheckPlanFromReviews 同层写
  // tasks.md），validator 读到的即已补齐版——补的是 CLI 可自证的机械字段，不替 agent 产出语义内容。
  if (['brainstorm', 'plan'].includes(stageName) && changeName) {
    try {
      const { ensureDecisionDocHeader } = await import('../stage-contract.js')
      ensureDecisionDocHeader(resolveChangeDir(cwd, { currentChange: changeName }, platformOpts?.specRoot))
    } catch { /* 补齐失败不阻断 gate */ }
  }
  // TaskCard 骨架幂等预生成（坑 taskcard-parallel-cli-lock，2026-08-25 用户实证：并行 batch
  // 子代理各自起 sillyspec taskcard CLI 撞进度库 SQLite 锁，改主代理预生成+子代理只 Edit 才稳）。
  // gate 前主流程单进程补齐缺卡骨架（已存在跳过），与 ensureDecisionDocHeader 同层同范式——
  // 补的是 CLI 可自证的机械骨架，占位符硬拦（plan-postcheck）仍逼子代理 Edit 填语义。
  if (stageName === 'plan' && changeName) {
    try {
      const { ensureTaskcardSkeletons } = await import('../taskcard.js')
      const r = ensureTaskcardSkeletons(changeName, { cwd, specDir: platformOpts?.specRoot })
      if (r.created.length > 0) {
        console.log(`📌 已预生成 ${r.created.length} 张 TaskCard 骨架（主流程单进程生成，子代理只 Edit 填充，勿并行跑 taskcard CLI）:`)
        for (const f of r.created.slice(0, 8)) console.log(`   + ${f}`)
        if (r.created.length > 8) console.log(`   … 共 ${r.created.length} 张`)
      }
    } catch (e) {
      console.warn(`⚠️ TaskCard 骨架预生成失败（不阻断 gate，仍可逐卡手动 sillyspec taskcard 生成）: ${e.message}`)
    }
  }
  const contractResult = runValidators(stageName, cwd, changeName, { projectName, specRoot: platformOpts?.specRoot, runtimeRoot: resolveRuntimeRoot(platformOpts, specBase) })
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
    // 收集模式（R16）：不再直接 return——继续跑完其余纯文档门（review 等）后由检查点统一
    // rollback，一次 --done 暴露全部缺失面（R15 连挡 4 次的解）。
    docGateFailures.push({ type: 'gate_rollback', detail: 'validators', label: `产物契约校验未过（${contractResult.errors.length} 条，明细见上）` })
  }
  if (contractResult.warnings.length > 0) {
    console.warn(`\n⚠️ 阶段 ${stageName} 校验警告：`)
    for (const w of contractResult.warnings) {
      console.warn(`   - ${w}`)
    }
  }

  // plan 门 facade 候选预检（坑 plan-facade-files-manual-backfill，2026-08-28 用户实证 ×2：
  // daemon/service.py 类「透传必经文件」不在 allowed_paths → 执行期 apply Gate1 拦截 →
  // 手工回补两轮）。allowed 集与 Gate1 同源（resolveApplyAllowSet 主仓切片），
  // 静态引用/聚合扫描亮候选，advisory 不阻断。
  if (stageName === 'plan' && changeName) {
    try {
      const { resolveApplyAllowSet } = await import('../worktree-apply.js')
      const { warnFacadeCandidateFiles } = await import('../facade-hint.js')
      // specBase 显式传（2026-09-08 平台模式修复）：changes/ 实体在 specRoot，本地目录常空——
      // 旧硬编码在平台模式 allow 集恒空，facade 候选预检对空集全量误报
      const allowMap = resolveApplyAllowSet(cwd, changeName, { specBase })
      warnFacadeCandidateFiles({ cwd, changeName, allowSet: allowMap.get('main') })
    } catch { /* 预检失败不阻断 plan 完成 */ }
  }




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
        return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts, { type: 'gate_rollback', detail: 'plan-execute-contract' })
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
      const { validateStageReviewWithAutoRefresh, getLatestStageReviewRunId, printStageReviewResult, generateStageReviewRunId, stageReviewMarkerPath } = await import('../stage-review.js')
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
      } else if (readReviewUnsupervisedWaiver(reviewChangeDir)) {
        // 豁免凭据（review-unsupervised-exit）：无嵌套派发能力环境不强制独立审查也不接受自审表演
        await waiveWithTelemetry({ changeName, gate: 'stage-review:' + stageName, specBase: effectiveSpecBase })
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
        // docHash 失配自动刷新（坑 stage-review-refresh-hash-manual-forget，2026-09-04 ③）：
        // 主文档（design/plan.md）改版后忘跑 --refresh-hash 不再拦一轮——gate 机械重算放行
        // （verdict 保留 + reviewerNotes 审计行 + 控制台留痕）；主文档缺失/schema/verdict=fail
        // 不在自动刷新范围，照常 fail-closed。
        const gated = validateStageReviewWithAutoRefresh({ stage: stageName, reviewType, runtimeRoot, reviewRunId, searchDirs, autoRefresh: true })
        if (gated.autoRefreshed) {
          console.warn(`\n🔄 stage review docHash 失配已自动刷新（第 ${gated.refreshOrdinal || 1} 次；hash ${gated.hashDrift || 'n/a'}；主文档改版后机械重算，verdict/checklist 保留——结论是否仍适用于新文档需人工确认）`)
          console.warn(`   已就地更新: ${gated.refreshedPath}`)
          // C3 升级提醒（2026-09-15 wp EHS 实证：NEW: 批注/需求调整/Reverse Sync 多次走此通道）：
          // 同一 review 被反复刷新 = 主文档在审查通过后反复变更，「审查后的变更不再见审查」的
          // 面积在累积——序数 ≥2 从一句注记升级为显式人工确认提醒（仍放行，不伪造重审）。
          if ((gated.refreshOrdinal || 1) >= 2) {
            console.warn(`   ⚠️ 该 review 已第 ${gated.refreshOrdinal} 次刷新——主文档在审查后反复变更，建议人工复核 verdict 结论续用性（涉及设计要点/接口变更时应重审，勿把自动放行当「新文档已审过」）`)
          }
        }
        const reviewResult = gated.result
        printStageReviewResult(reviewResult, { stage: stageName, reviewRunId, runtimeRoot, changeName })
        if (!reviewResult.ok) {
          docGateFailures.push({ type: 'review_rejected', detail: 'stage-review', label: 'Stage Review 未过（stage-review，明细见上）' })
        } else {
        // 降级自审留痕（2026-09-10 用户反馈①：PI agent 等宿主无 Agent tool，prompt 降级条款允许
        // 当前 agent 自审产出 review.json）。放行但独立性折损必须可见：⚠️ 审计行区分降级 review
        // 与真子代理 review（事后可审计），与 ⚖️/🔍 软归属同哲学——可见的折损优于静默的伪装。
        // channel 识别（2026-09-10 通道优先序批次）：reviewer.channel 结构化落款优先，兼容
        // reviewerNotes 首行「降级：」约定；platform 通道（P2 review-dispatch 落地后）ℹ️ 留痕
        // missionId 供追溯，其余通道正常放行。
        const { classifyReviewerChannel, hasDelegatedWriteDisclosure } = await import('../stage-review.js')
        const reviewChannel = classifyReviewerChannel(reviewResult.review)
        if (reviewChannel === 'self') {
          console.warn(`\n⚠️ Stage Review 降级自审（tier=independent 但宿主无 Agent tool）：${stageName} review 按 prompt 降级条款由当前 agent 自审产出——独立性折损已留痕（reviewerNotes 首行「降级：」），结论应附源码锚点补偿，建议人工抽查关键结论。`)
        } else if (reviewChannel === 'platform') {
          const mid = reviewResult.review && reviewResult.review.reviewer && reviewResult.review.reviewer.missionId
          console.log(`\nℹ️ Stage Review 平台派发（channel=platform${mid ? `，missionId=${mid}` : '，missionId 未落款'}）：${stageName} review 由平台独立 worker 产出（独立进程/会话）。`)
        }
        // C4 代落盘审计行（2026-09-15 wp EHS 实证：平台写通道故障下主流程代子代理落盘 review，
        // 独立性折损当时只在 notes 里、gate 不可见）：reviewerNotes 首行「代落盘：」披露 → ⚠️ 留痕
        // （与降级自审同哲学：可见的折损优于静默伪装；首行约定识别，不阻断）。
        if (hasDelegatedWriteDisclosure(reviewResult.review)) {
          console.warn(`\n⚠️ Stage Review 代落盘披露：${stageName} review 的 reviewerNotes 首行标记「代落盘」——review.json 由主代理代（写通道故障的）审查者落盘，独立性依赖审查者结论回传的忠实性，建议人工抽查关键结论与回传文本一致性。`)
        }
        }
      }
    } catch (e) {
      // fail-closed：Gate 自身异常阻断完成，不静默放行
      //（收集模式：异常也入列，检查点 B 统一 rollback）
      console.error('❌ Stage Review Gate 异常，阻断 ' + stageName + ' 完成: ' + e.message)
      docGateFailures.push({ type: 'review_rejected', detail: 'stage-review', label: `Stage Review Gate 异常（${e.message}）` })
    }
  }

  // ── module-impact pending 死信 execute 收尾提示（坑 module-impact-debt-late-warn，
  // 2026-08-22 实证：死信门在 verify 才硬拦，文档债拖到 verify 末尾才暴露、上次也拦）。
  // execute --done 即 advisory 提示（不阻断 execute——execute 期间可能仍在迭代模块文档；
  // verify 的硬拦不变），让 agent 当场清债而非攒到 verify 撞门。
  if (stageName === 'execute') {
    try {
      const execChangeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
      const execImpactPath = execChangeDir ? join(execChangeDir, 'module-impact.md') : null
      if (execImpactPath && existsSync(execImpactPath)) {
        const { extractPendingDocSyncRows } = await import('./complete-handlers.js')
        const execPendingRows = extractPendingDocSyncRows(readFileSync(execImpactPath, 'utf8'))
        if (execPendingRows.length > 0) {
          console.warn(`\n⚠️ module-impact.md「更新结果」表有 ${execPendingRows.length} 个 pending/待办项（文档同步债）——verify 阶段会硬拦：`)
          for (const row of execPendingRows) console.warn(`   - ${row}`)
          console.warn('   建议 execute 收尾就完成模块文档同步并回填 done/skipped（说明原因），别把债拖到 verify 末尾。')
          console.warn('   批量跳过不同步行可一键回填：sillyspec module-impact --change <变更名> --fill-skipped --reason "<真实原因>"')
        }
      }
    } catch { /* 提示失败不阻断 execute */ }
    // UI 视觉证据前置 advisory（2026-10-07-flow-friction-batch3 task-05）：证据应执行期随手落盘、
    // verify 收口才执法（postmortem 实证发现时机太晚）。warn 级不阻断 execute；fail-soft。
    try {
      const uiChangeDir = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
      if (uiChangeDir) {
        const { uiEvidenceExecuteAdvisory } = await import('../ui-visual.js')
        const uiAdv = uiEvidenceExecuteAdvisory({ changeDir: uiChangeDir, specBase })
        if (uiAdv) console.warn(`\n⚠️ ${uiAdv}`)
      }
    } catch { /* advisory 失败不阻断 execute */ }
  }

  // ── Execute Task Review Gate 已退役（2026-09-26-task-review-retire）──
  // 原「所有 task 必须有 review.json 且 verdict 通过」块随层整体退役删除：R18 对撞实证该层在
  // 无嵌套派发环境全降自审表演（15 次拦截 5 次形式合规、实质拦截为零），前置豁免通道
  // （review-unsupervised-exit）已覆盖无派发环境。task 粒度审计由 execute 收口的代码证据核验
  // （checkExecuteCodeEvidence，detectExecuteBatchFinish 内）+ verify 测试对账承担；Stage Review
  // Gate（阶段粒度）保留。残存 review.json 走 task-review.js 保留导出（历史兼容读侧）。
  // ── 收集模式检查点 B（brainstorm/plan/execute）：纯文档门（validators / Stage Review）
  //    全量收口——非空则一次打印清单、统一 rollback 一次（R15「连挡 4 次」的解；
  //    detail 取首门，进度库信号语义不变）。verify 走检查点 A（其实测门在前）。──
  if (docGateFailures.length > 0) {
    console.error(`\n❌ ${stageName} 收口被 ${docGateFailures.length} 道纯文档门拦截（一次性全列——全部修复后重跑一次 --done，不必逐门连撞）：`)
    docGateFailures.forEach((f, i) => console.error(`   ${i + 1}. ${f.label}`))
    console.error(`   （各门明细见上方对应 ❌/⚠️ 段落）`)
    const firstFail = docGateFailures[0]
    return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts, { type: firstFail.type, detail: firstFail.detail })
  }

  // ── 仪式档位摩擦升档检查点（task-03 / D-008，design 生命周期契约表「阶段门升档」行）──
  // 级联末位（所有阻断门通过、本次 --done 即将成立）执行：读 friction-ledger 累计账 →
  // escalateByFriction 超阈 min(S3, tier+1) → 迁移记录写 .runtime/ceremony-tier-<change>.json
  // （withFileLock+原子写、只升不降；读档无文件先落初始档=开跑定价事件）。升档不阻断本次
  // 完成——下一阶段才生效，warning 披露 from→to 与摩擦计数审计行；未超阈静默通过不加噪。
  // fail-soft：升档检查是旁路数据面，任何异常绝不阻断完成（对齐 friction-ledger fail-soft 红线）。
  if (['brainstorm', 'plan', 'execute'].includes(stageName) && changeName) {
    try {
      const escTier = await escalateCeremonyTierAtGate({ cwd, specBase, platformOpts, progress, changeName, projectName, stageName })
      if (escTier.escalated) {
        let shownPath = escTier.tierFilePath
        try {
          const rp = relative(cwd, escTier.tierFilePath)
          if (rp) shownPath = rp
        } catch { /* Windows 跨盘符 relative 抛错 → 保留绝对路径 */ }
        console.warn(`\n⚠️ 摩擦升档 ${escTier.from}→${escTier.to}（friction-ledger 累计 gate_rollback=${escTier.frictionCounts.gate_rollback}、review_rejected=${escTier.frictionCounts.review_rejected} 超阈，min(S3, tier+1)）——不阻断本次完成，下一阶段起生效（档位文件 ${shownPath} 已迁移留痕）`)
      }
    } catch (e) {
      console.warn(`⚠️ 仪式档位摩擦升档检查异常（不阻断完成，本次跳过）: ${e && e.message ? e.message : e}`)
    }
  }

  // ── 影子期静默派发触发点（2026-09-18-ceremony-risk-pricing task-06 / Phase 3；
  //    execute 评审 GAP 项补接线）：升档检查块后同步派发（2026-11-21-shadow-dispatch-form-respect
  //    FR-02：原 fire-and-forget 孤儿 Promise 在收口命令退出后才打出 ℹ️ 行——主会话读不到披露，
  //    实证 pi 影子会话无声起会话、披露行丢失；改 await，dispatchShadowReview 自身 catch-all
  //    永不抛 + 网络面有界（client 缺省 10s 超时），await 不引入无界等待，ℹ️ 行保证退出前打出）。
  //    S0/S1 轻档变更在 brainstorm/plan/execute 完成时向平台派重仪式影子审查做轻/重对照——
  //    只记账不阻断（FR-04：影子结论只落 stage-reviews-shadow/ 命名空间，函数内部已隔离，
  //    绝不写主线 marker、不进 gate/verify/archive 判定面）。前置校验（形态免评审门
  //    form-review-exempt、档位∈S0/S1、ceremony.shadow 开关、幂等闸、平台 client 可用性）全在
  //    函数内部，不满足 → skip 留痕对照账（零噪音）。
  //    client 供给面（P3-1 收口，ql-20260918-006）：复用 review-dispatch 命令先例（index.js:1273）
  //    懒加载 SillyHubMcpClient 注入——构造只读 local.yaml 配置不联网；未配平台的仓在函数内
  //    probe no-config 仍走 skip 留痕（合理：影子只在配了平台的仓积累对照数据）。specBase 平台
  //    接管优先（与上方 Stage Review Gate effectiveSpecBase 同口径）。异常双保险：函数自身
  //    catch-all 永不抛 + 外层 try-catch 吞掉（影子是旁路数据面，任何异常绝不影响门判定与完成）。──
  if (['brainstorm', 'plan', 'execute'].includes(stageName) && changeName) {
    try {
      const shadowSpecBase = platformOpts?.specRoot || specBase
      const shadowResult = await Promise.all([
        import('../review-dispatch.js'),
        import('../sillyhub-mcp/client.js'),
      ])
        .then(async ([{ dispatchShadowReview }, { SillyHubMcpClient }]) => {
          // 构造失败（local.yaml 损坏等）传 undefined → 函数内部 skip 留痕，不报错不阻断
          let shadowClient;
          try {
            shadowClient = new SillyHubMcpClient({ cwd });
          } catch {
            shadowClient = undefined;
          }
          return dispatchShadowReview({
            mode: 'create', cwd, specBase: shadowSpecBase, changeName, stage: stageName,
            client: shadowClient,
          });
        })
      if (shadowResult && shadowResult.ok && !shadowResult.skipped && shadowResult.missionId) {
        console.log(`\nℹ️ 影子审查已派发（mission ${shadowResult.missionId}，只记账不阻断——回收随主线检查点 status 模式或 doctor 影子对照维度）`)
      }
    } catch { /* 影子链路异常吞掉（旁路数据面），绝不向主线传播 */ }
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
 * 按变更隔离（2026-09-14 quick，用户反馈③）：带 changeName 时本变更目录的缺元数据文件逐个
 * 列出；其他变更目录的命中折叠为一行汇总并点名目录与计数——多 agent 并发仓里并行会话的他者
 * 文件不再逐条混入本变更收尾输出（同批后续变更包也走汇总行，agent 按目录名自认领）。
 * changeName 缺省（历史调用面）保持全量逐列。
 */
export function validateMetadata(cwd, stageName, specBase, changeName) {
  const changesDir = join(specBase, 'changes')
  if (!existsSync(changesDir)) return

  const cutoff = Date.now() - 10 * 60 * 1000
  const missing = new Set()

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      try {
        if (entry.isDirectory()) { walk(full); continue }
        if (!/\.(md|yaml|yml)$/.test(entry.name)) continue
        const mtime = statSync(full).mtimeMs
        if (mtime < cutoff) continue
        const content = readFileSync(full, 'utf-8')
        if (!content.includes('author:') && !content.includes('author：')) missing.add(full)
        if (!content.includes('created_at:') && !content.includes('created_at：')) missing.add(full)
      } catch (e) { /* skip unreadable files */ }
    }
  }

  walk(changesDir)
  if (missing.size === 0) return

  // 归属分组：changes/ 下第一段目录名（[\\/] 切分兼容 Windows join 产物的反斜杠）
  const current = []
  const otherCounts = new Map()
  for (const f of missing) {
    const top = relative(changesDir, f).split(/[\\/]/)[0]
    if (!changeName || top === changeName) current.push(f)
    else otherCounts.set(top, (otherCounts.get(top) || 0) + 1)
  }

  if (current.length > 0) {
    console.log(`\n⚠️  以下文件缺少 author 或 created_at 元数据：`)
    current.forEach(f => console.log(`  - ${relative(cwd, f) || f}`))
    console.log('请在文件头部添加 author（git 用户名）和 created_at（精确到秒）')
  }
  if (otherCounts.size > 0) {
    const parts = [...otherCounts.entries()].map(([dir, n]) => `${dir}×${n}`).join('、')
    const total = [...otherCounts.values()].reduce((a, b) => a + b, 0)
    console.log(`\nℹ️  另有 ${total} 个其他变更目录的文件近 10 分钟新增且缺元数据（${parts}）——已按变更隔离折叠：并行会话产物请忽略；若为本步骤创建的同批变更包，请补 author/created_at`)
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
  // brainstorm:scale=small/未标(收编轻量道,2026-09-29-brainstorm-exit-thin-default 起未标默认 small)只必产
  // design.md;显式 large → 四件套全。避免对合法收编变更误报"⬜ proposal/requirements/tasks 未找到"
  // (本检查仅 advisory 打印不 gate,但误导输出仍要消除)。注:stage-contract 硬门条件(ne:small)在并行
  // 变更在途面,未标仍轻推补值——忘写 scale 的 agent 被门推向显式落值,v1 可接受。
  const brainstormExpected = readDesignScale(specBase, effectiveChange) !== 'large'
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
  // 2026-09-19-ceremony-pricing-five-cuts task-03 / D-004：委托 change-list.js 单一真相源解析器
  // （此前本地重写的数字标题版只认「## 6.」——现行模板「## 文件变更清单」8 行解析成 0，span 轴瞎）。
  // parseFileChangeListDetailed：双形态标题（## 6. 文件变更清单 / ## 文件变更清单 含括注变体）
  // + 任何 ^## 标题关段 + 表格/分类列表双写法；keepSillyspecDocs=true 保持旧实现把 .sillyspec
  // 交付文档计入声明面的行为。
  try {
    return parseFileChangeListDetailed(join(specBase, 'changes', changeName, 'design.md'), { keepSillyspecDocs: true })
      .map(e => e.path)
  } catch {
    return []
  }
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
export async function completeStageGates(args) {
  return timedAsync('gates', () => completeStageGatesImpl(args))
}

async function completeStageGatesImpl({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText, ctx = null }) {
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

  // ── full 流程绑定面补齐（2026-09-27-gate-face-binding-parity，R23-full 实证缺口）──
  // 绑定槽此前只在 thin flow start 收编时追加（flow.js ensureBindingSlots）；full 流程
  // requirements 由 brainstorm 产出、无绑定面且不经过 flow start → test-trace 恒空 →
  // FR 入库永远无 tests 绑定，动态门 FR 回归源对 full 出身 FR 失效。此处单源复用
  // ensureBindingSlots（已有槽/无 FR 块均 no-op），verify --done 的 auto-bind 因槽在场闭环。
  // best-effort：追加失败只告警不阻断 brainstorm 收尾。
  if (stageName === 'brainstorm' && changeName) {
    try {
      const changeDir = join(specBase, 'changes', changeName)
      if (existsSync(join(changeDir, 'requirements.md'))) {
        const { ensureBindingSlots } = await import('../flow-draft.js')
        const b = ensureBindingSlots({ changeDir })
        if (b.appended) {
          console.log(`📌 追加测试绑定槽 ${b.slots} 枚（full 流程 requirements 无绑定面——plan/execute 写测试时作答，verify --done 将从实测结果自动补全空槽）`)
        }
      }
    } catch (e) {
      console.warn(`⚠️ 绑定槽追加失败（best-effort 不阻断）: ${(e && e.message) || e}`)
    }
  }

  // scan 平台 manifest + post-check（S1 平台受害者：noAI scanPostcheck 末步 / continueStep 现也走这里）
  const _scanResult = await handleScanStageCompleted({ stageName, currentIdx, cwd, progress, pm, stageData, changeName, outputText, platformOpts })
  if (_scanResult) return _scanResult

  // 守卫计数：completed‖skipped === total（修 S3）；用入参 steps（pre-reset 原数组，design §5.4）
  const settledCount = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length
  const total = steps.length

  validateMetadata(cwd, stageName, specBase, changeName)

  // 验证关键文件位置（仅当所有步骤已结案 completed‖skipped 时才校验）
  if (settledCount === total && total > 0) {
    validateFileLocations(cwd, stageName, progress, changeName, specBase)
  }

  // 辅助阶段完成后重置步骤（scan 等 auxiliary 阶段重置回 pending 可重跑）。
  // archive 例外（P0-4 并步补丁）：确认归档成为末步后本重置会与 unregisterChange 的终态
  // （steps 全 completed + current_stage=archive——平台按步骤数渲染完成度的数据源）互相
  // 覆盖，把已注销变更抹回 0/N。archive 是终态阶段（变更已注销，不存在「重跑归档」流），
  // 不参与可重跑重置。
  const stageDef = stageRegistry[stageName]
  if (stageDef?.auxiliary && stageName !== 'archive') {
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

  // 阶段完成校验 gate 级联（runValidators → verify-test → Plan→Execute → Stage Review）
  if (settledCount === total && total > 0) {
    const _gateEarlyReturn = await runStageCompletionGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, ctx })
    if (_gateEarlyReturn) return _gateEarlyReturn
  } else if (settledCount < total) {
    console.log(`\n⚠️ 阶段校验跳过：${total} 步中仅 ${settledCount} 步标记为已结案（completed‖skipped），可能存在状态不同步。如确认阶段已完成，请运行 --status 确认。`)
  }
  } catch (e) {
    console.error(`\n❌ ${stageName} 阶段完成收尾异常（已 rollback 为 in-progress，请修复后重新 --done）：${e?.message || e}`)
    return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts, { type: 'gate_rollback', detail: 'internal-error' })
  }

  // execute worktree cleanup（completeStep / continueStep 完成分支统一调用，避免双清理）
  await handleExecuteWorktreeCleanup({ stageName, changeName, cwd })

  return null
}


/**
 * 归因提示②（生成产物旧基线覆盖）的重叠集过滤（坑 verify-attr2-foreign-wip-misdirection）。
 *
 * 原始重叠 = 本变更 apply-pathspec ∩ 主仓最近提交。并行会话场景下该集合被在途/刚收尾的
 * 他者文件虚高，逐轮误导 agent 重跑生成命令。只保留两个必要条件都成立的文件：
 *   - dirty（此刻对 HEAD 有改动）：verify gate 时本变更未提交，旧基线覆盖必然物理在场；
 *     内容与 HEAD 一致时重跑生成命令改变不了本轮实测。
 *   - 非他者声明集（collectForeignDeclaredFiles）：他者在途文件归归因提示①（待其收尾
 *     复验），不是生成产物过期。
 *
 * @param {string[]} overlap 原始重叠文件（POSIX 路径）
 * @param {Set<string>} dirtySet 主仓当前对 HEAD 的改动集
 * @param {Set<string>|Map} foreignDeclared 他者会话声明集（Map 亦可用 has 判定）
 * @returns {string[]} 可行动子集（空 = 不出提示②，避免误导）
 */
export function filterStaleBaselineOverlap(overlap, dirtySet, foreignDeclared) {
  return (overlap || []).filter(f => dirtySet?.has(f) && !(foreignDeclared?.has(f)))
}

/**
 * buildArchiveReadinessReport —— 归档就绪度报告构造（P3 / FR-03 / D-003@batch3，task-04）。
 * verify PASS 后、archive 前的三查前置（batch2 实证三查全压 archive 时段首查=15 回合主因）。
 * 纯读：①未-apply 交付面（applyWorktree checkOnly，含 ql-009②/ql-010 合并感知口径）②manifest
 * 缺行草拟集（面文件不在 design §6 清单——草拟不代写，agent 确认后自落）③module-impact 归因
 * 草拟集（面文件不在 module-impact.md 文本）④基线老化命中（main HEAD 前进过 worktree 基点
 * ∩ 前进文件与交付面有交集）。无 worktree（meta 缺/in-place/native）→ 全空（零噪音）。
 * fail-open：任一探测异常只置空该项，不抛（渲染层再兜一层）。
 */
export async function buildArchiveReadinessReport({ cwd, changeName, progress, specBase }) {
  const out = { face: [], manifestGaps: [], impactUnlisted: [], agingHit: false }
  try {
    const { WorktreeManager } = await import('../worktree.js')
    const wm = new WorktreeManager({ cwd })
    const meta = wm.getMeta(changeName)
    if (!meta || meta.mode === 'in-place-fallback' || meta.mode === 'native-worktree'
      || !meta.worktreePath || !existsSync(meta.worktreePath)) return out
    const { applyWorktree } = await import('../worktree-apply.js')
    const probe = applyWorktree(changeName, { cwd, checkOnly: true })
    out.face = (probe && Array.isArray(probe.changedFiles)) ? probe.changedFiles : []
    if (out.face.length === 0) return out
    // ② manifest 缺行草拟
    try {
      const changeDir = resolveChangeDir(cwd, progress || {}, specBase)
      if (changeDir) {
        const designPath = join(changeDir, 'design.md')
        if (existsSync(designPath)) {
          const { parseFileChangeList } = await import('../change-list.js')
          const declared = parseFileChangeList(designPath, { keepSillyspecDocs: true })
          out.manifestGaps = out.face.filter(f => !declared.has(f))
        }
      }
    } catch { /* 草拟失败置空该项 */ }
    // ③ module-impact 归因草拟
    try {
      const changeDir2 = resolveChangeDir(cwd, progress || {}, specBase)
      const miPath = changeDir2 ? join(changeDir2, 'module-impact.md') : null
      const miText = (miPath && existsSync(miPath)) ? readFileSync(miPath, 'utf8') : ''
      out.impactUnlisted = out.face.filter(f => !miText.includes(f))
    } catch { /* 同上 */ }
    // ④ 基线老化命中
    try {
      if (meta.baseHash) {
        const { gitQuiet } = await import('../git-helper.js')
        const advanced = gitQuiet(cwd, ['diff', '--name-only', meta.baseHash + '..HEAD'])
        if (advanced) {
          const advSet = new Set(advanced.split('\n').filter(Boolean))
          out.agingHit = out.face.some(f => advSet.has(f))
        }
      }
    } catch { /* git 失败不提示 */ }
  } catch { /* 整体 fail-open → 全空 */ }
  return out
}
