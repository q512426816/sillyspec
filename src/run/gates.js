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
import { basename, join } from 'node:path'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { triggerSync, resolveChangeDir, resolveRuntimeRoot } from './shared.js'
import { runValidators } from '../stage-contract.js'

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
  const taskIds = [...waveMatch[1].matchAll(/^[-*]\s*\[[ x]\]\s*(task-\d+)/gim)].map(x => x[1])
  if (taskIds.length === 0) return false
  for (const id of taskIds) {
    const cardPath = join(changeDir, 'tasks', `${id}.md`)
    if (!existsSync(cardPath)) return false // 卡片缺失 → 保守不跳
    const card = readFileSync(cardPath, 'utf8')
    const fm = card.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return false
    if (!/no_deps_verify:\s*true/i.test(fm[1])) return false
  }
  return true
}

/**
 * execute deps 验证硬门（change 2026-06-28-worktree-deps-provision / D-001@v1, D-003@v1, D-006@v2）。
 * depsStatus 不达标且非 wave 级 opt-out 时阻断 --done：置 step=blocked + exit(1)，与 requiresWait 同范式。
 * 放行返回 true；阻断时 process.exit(1) 不返回。
 */
export async function enforceDepsGate(stageName, cwd, changeName, step, steps, currentIdx, specBase, platformOpts) {
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
  process.exit(1)
}

/**
 * execute --done 硬门：已勾 [x] task 的 review.json 必须 schema 完整（坑 review-json-field-gap）。
 *
 * Task Review Gate（validateTaskReviews）只在 execute 整阶段完成时跑（complete.js 阶段完成分支的
 * actualCompleted===actualTotal 守卫），单 task --done 不校验 → 子代理勾 checkbox 却漏写/漏字段
 * review.json，要到收尾才暴露，用户被迫事后批量补。本门提前到每次 --done：校验 plan 里所有已勾
 * task 的 review.json，缺字段/不存在/JSON 坏 → 置 step=blocked + exit(1)，与 enforceDepsGate 同范式。
 * 未勾 task 不校验（还没做）。平台模式/无 marker/无 plan 时放行（下游 Task Review Gate 兜底）。
 */
export async function enforceReviewJsonGate(stageName, cwd, changeName, step, steps, currentIdx, specBase, platformOpts) {
  if (stageName !== 'execute' || !changeName) return true
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
  const planPath = join(specBase, 'changes', changeName, 'plan.md')
  if (!existsSync(runIdFile) || !existsSync(planPath)) return true
  const executeRunId = readFileSync(runIdFile, 'utf8').trim()
  const planContent = readFileSync(planPath, 'utf8')
  const { validateCheckedTaskReviews } = await import('../task-review.js')
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
  console.error('   修复：补全上述 review.json 字段后重跑 execute --done。')
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
async function rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts) {
  rollbackStageCompletion(stageData, steps, currentIdx)
  progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
  await pm._write(cwd, progress, changeName)
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
export async function runStageCompletionGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx }) {
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
    const testCheck = runVerifyTestCheck({ cwd, specBase, changeName })
    printVerifyTestCheck(testCheck)
    if (testCheck.status === 'failed') {
      console.error('\n❌ verify 阶段被阻断：verify-result.md 自报告通过，但 CLI 实测测试失败。')
      console.error('   请修复失败的测试并更新 verify-result.md 后重新完成此步骤。')
      return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts)
    }
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
    console.log('\n✅ 验证通过，下一步：sillyspec run archive')
  }

  // ── Plan postcheck contract：plan.md 必须满足 execute 契约 ──
  if (stageName === 'plan') {
    const planFile = resolveChangeDir(cwd, progress, platformOpts?.specRoot)
    const planPath = planFile ? join(planFile, 'plan.md') : null
    if (planPath && existsSync(planPath)) {
      const { validatePlanForExecute } = await import('../stages/execute.js')
      const planContent = readFileSync(planPath, 'utf8')
      const planValidation = validatePlanForExecute(planContent)
      if (!planValidation.ok) {
        console.error(`\n❌ Plan → Execute Contract 校验失败：`)
        for (const err of planValidation.errors) console.error(`   - ${err}`)
        console.error(`\n   plan.md 不满足 execute 契约，请修复后重新完成此步骤。`)
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

  // ── Stage Review Gate：brainstorm/plan/propose/execute 独立审查（按 tier 分级）──
  // tier=self 放行+审计打印；tier=independent 必须 review.json 且 verdict 非 fail，fail-closed
  if (['brainstorm', 'plan', 'propose', 'execute'].includes(stageName)) {
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
            writeFileSync(stageReviewMarkerPath(runtimeRoot, stageName, changeName), reviewRunId + '\n')
          } catch {}
        }
        const reviewType = stageName === 'brainstorm' ? 'design'
          : stageName === 'plan' ? 'plan'
          : stageName === 'propose' ? 'proposal'
          : 'acceptance'
        const searchDirs = [effectiveSpecBase, reviewChangeDir, cwd].filter(Boolean)
        const reviewResult = validateStageReview({ stage: stageName, reviewType, runtimeRoot, reviewRunId, searchDirs })
        printStageReviewResult(reviewResult, { stage: stageName })
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
        const planContent = readFileSync(planPath, 'utf8')
        const runtimeRoot = resolveRuntimeRoot(platformOpts, effectiveSpecBase)

        // execute run id：从变更专属标记文件读取
        const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
        let executeRunId = ''
        try {
          if (existsSync(runIdFile)) {
            executeRunId = readFileSync(runIdFile, 'utf8').trim()
          }
        } catch {}
        if (!executeRunId) {
          const { generateExecuteRunId } = await import('../task-review.js')
          executeRunId = generateExecuteRunId()
          // 落盘（marker 缺失时 fallback 生成后写盘，保证后续 checkbox/gate 读到同一 ID）
          try { mkdirSync(runtimeRoot, { recursive: true }); writeFileSync(runIdFile, executeRunId + '\n') } catch {}
        }

        // git 真实性校验目录：worktree 存在则用 worktree（base/head commit 在其中），否则主仓库
        let reviewGitDir = cwd
        try {
          const { WorktreeManager } = await import('../worktree.js')
          const wm = new WorktreeManager({ cwd })
          const meta = wm.getMeta(changeName)
          if (meta?.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
            reviewGitDir = meta.worktreePath
          }
        } catch {}

        const reviewResult = validateTaskReviews({ planContent, runtimeRoot, executeRunId, changeDir: planFile, gitDir: reviewGitDir })
        printReviewResult(reviewResult, { runtimeRoot, executeRunId })

        if (!reviewResult.ok) {
          // Task review 校验失败，阻断 execute 完成
          // 检查是否存在 checkbox 已勾但 review 不通过的情况
          const uncheckedTasks = reviewResult.errors.filter(e => e.includes('缺少 review.json'))
          if (uncheckedTasks.length > 0) {
            console.error('\n⚠️  部分任务已在 plan.md 中勾选，但 review.json 不存在。')
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

