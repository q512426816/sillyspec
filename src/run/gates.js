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
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { triggerSync, resolveChangeDir, resolveRuntimeRoot } from './shared.js'
import { runValidators } from '../stage-contract.js'
import { handleScanStageCompleted, handleExecuteWorktreeCleanup } from './complete-handlers.js'
import { detectConcurrentChanges, formatConcurrentWarning } from './concurrent-detect.js'
import { stageRegistry } from '../stages/index.js'

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
  const { validateCheckedTaskReviews, resolveLatestExecuteRunIdWithTasks, isValidExecuteRunId } = await import('../task-review.js')
  let executeRunId = readFileSync(runIdFile, 'utf8').trim()
  // marker 是 agent 可写内容：格式校验防注入/穿越，非法视为缺失走漂移兜底重定位
  if (executeRunId && !isValidExecuteRunId(executeRunId)) {
    console.warn(`⚠️ execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(executeRunId.slice(0, 60))}），改扫真实 run 目录`)
    executeRunId = ''
  }
  const planContent = readFileSync(planPath, 'utf8')
  // marker 漂移兜底（gate-atom-a 正确修法）：marker 指向的 run 缺 tasks/（generateExecuteRunId 只写
  // marker 不建目录，漂移后新 run 不继承旧 review）时，无视 marker 改扫 execute-runs/ 取 mtime 最新
  // 且真正含 tasks/ 的 run，用其齐备的 review.json 校验，避免误报「review.json 不存在」。注意不能用
  // resolveLatestExecuteRunId——它见 marker 非空即原样返回（不校验目录），恰是本场景要绕开的值。
  if (executeRunId && !existsSync(join(runtimeRoot, 'execute-runs', executeRunId, 'tasks'))) {
    const relocated = resolveLatestExecuteRunIdWithTasks({ runtimeRoot })
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
            writeFileSync(stageReviewMarkerPath(runtimeRoot, stageName, changeName), reviewRunId + '\n')
          } catch {}
        }
        const reviewType = stageName === 'brainstorm' ? 'design'
          : stageName === 'plan' ? 'plan'
          : 'acceptance'
        const searchDirs = [effectiveSpecBase, reviewChangeDir, cwd].filter(Boolean)
        const reviewResult = validateStageReview({ stage: stageName, reviewType, runtimeRoot, reviewRunId, searchDirs })
        printStageReviewResult(reviewResult, { stage: stageName, reviewRunId, runtimeRoot })
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
          const { generateExecuteRunId, resolveLatestExecuteRunId } = await import('../task-review.js')
          executeRunId = resolveLatestExecuteRunId({ runtimeRoot, changeName }) || ''
          if (!executeRunId) {
            executeRunId = generateExecuteRunId()
            // 落盘（marker 缺失时 fallback 生成后写盘，保证后续 checkbox/gate 读到同一 ID）
            try { mkdirSync(runtimeRoot, { recursive: true }); writeFileSync(runIdFile, executeRunId + '\n') } catch {}
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
    unique.forEach(f => console.log(`  - ${f.replace(cwd + '/', '')}`))
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

