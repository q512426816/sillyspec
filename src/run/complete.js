/**
 * run/complete.js（W6 Step7b 从 run.js 抽出）。
 *
 * step 完成处理核心：completeStep（调度主干——WAIT/requiresWait 门控 + 各 handler 调用 +
 * completion path 收尾 + single-step path）+ skipStep/waitStep/continueStep（W6 Step7b-2 续搬）。
 * 本 commit（7b-1）先搬 completeStep + 2 独占 helper（validateMetadata/validateFileLocations）。
 *
 * 安全锚：run.js 始终 barrel。completeStep 由 run/command.js 在 --done 路径调用，无测试专用导出
 * （曾以 `_completeStepForTest` 别名 re-export 供 characterization 测试直驱动，2026-08-13 这些测试
 * 全部迁到 CLI 子进程 `sillyspec run <stage> --done`，导出已移除——见 run.js barrel 注释）。
 *
 * 依赖（completeStep 仅用已抽叶子 + 随搬 helper，零 run.js 闭包，零动态 import）：
 *   - shared.js: triggerSync/WAIT_MARKER_RE/getStageSteps；prompt.js: outputStep；gates.js: enforceDepsGate/runStageCompletionGates
 *   - complete-handlers.js: 8 handler；stages/index.js: stageRegistry；worktree-apply.js: formatExecuteSummary
 *   - scan-profile.js: executeScanPreflight/executeScanPostcheck/computeScanProfile（noAI 硬门）
 *   - stages/plan-postcheck.js: executePlanPostcheck（noAI 硬门）
 *   - node: join(path) + existsSync/readdirSync/readFileSync/mkdirSync/writeFileSync/appendFileSync/statSync(fs)
 */
import { join } from 'node:path'
import { existsSync, readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { writeAtomicSync } from '../fs-atomic.js'
import { withFileLock } from '../quicklog.js'
import { triggerSync, WAIT_MARKER_RE, getStageSteps, formatWaitOptions, resolveRuntimeRoot, getOrCreateMultiRepoContext, resolveChangeDir } from './shared.js'
import { executeScanPreflight, executeScanPostcheck, computeScanProfile } from './scan-profile.js'
import { executePlanPostcheck as runPlanPostcheckLib } from '../stages/plan-postcheck.js'
import { outputStep } from './prompt.js'
import { enforceDepsGate, enforceReviewJsonGate, enforceSymbolImpactGate, warnMissingUiPrototype, completeStageGates, readDesignScale } from './gates.js'
import { handleArchiveConfirmStep, handlePlanGeneratePlanStep, handleScanProjectListStep, handleWorkflowPostCheck, handleQuickStageCompletion, handleExecuteWaveArtifact } from './complete-handlers.js'
import { formatExecuteSummary } from '../worktree-apply.js'
import { isEndToEndTaskText } from '../change-risk-profile.js'
import { deriveTitleFromLinkedChange } from '../quicklog.js'
import { gitQuiet } from '../git-helper.js'

// validateMetadata / readDesignScale / validateFileLocations 已迁至 ./gates.js（completeStageGates
// 共享收尾管线，消除 noAI 末步 / continueStep 完成分支绕过 gate 的 S1/S2/S3 不对称）。
// completeStep 阶段完成分支（task-02 接入 completeStageGates）+ brainstorm 下一步提示改 import 自 gates.js。

// 完整流程 change title 刷新：从 proposal/design 首个 # 标题提取中文描述写 changes.title（人类可读
// 展示元信息）。proposal/design 落盘后的**任意步骤持久化点**都调用——单步 --done（brainstorm
// step6 design.md 已落盘但阶段未完）与阶段完成同样刷新，治「brainstorm 全程 title 存英文 autoName
// 兜底」。quick-<hex> 无 proposal/design 目录，deriveTitleFromLinkedChange 返回 '' 不刷新
// （quick 走 handleQuickStageCompletion 的 extractTitleFromResult）。失败静默（不阻断流程）。
function refreshChangeTitleFromArtifacts(pm, cwd, specBase, changeName) {
  if (!changeName || /^quick-[0-9a-f]{8}$/.test(changeName)) return
  try {
    const refinedTitle = deriveTitleFromLinkedChange(specBase, changeName)
    if (refinedTitle) pm.updateChangeMeta(cwd, changeName, { title: refinedTitle })
  } catch { /* title 刷新失败不阻断 */ }
}

/**
 * 坑1：用 --done --answer 解掉「已 waiting 的步骤」。
 *
 * completeStep 的 currentIdx 选择（findIndex pending||in-progress）排除 waiting，导致
 * --done --answer 落到已 --wait 暂停的 requiresWait 步骤时跳过它、--answer 静默丢失、步骤永久
 * 卡 WAITING、末步报「Step N 等待用户输入」无法 finish。本函数把首个 waiting 步骤拉回 pending
 * + 补 waitAnswer（对齐 continueStep 对 requiresWait 的 shouldReturnToCurrentStep=回 pending 语义），
 * 让主流程 requiresWait 门控见 waitAnswer 已置→不阻断→正常 completed。
 *
 * @param {object[]} steps - stageData.steps（原地修改）
 * @param {string|null|undefined} doneAnswer - --answer 值；空则不触发（返回 -1）
 * @param {string} nowStr - 时间戳字符串（用于 waitAnswers[].answeredAt）
 * @returns {number} 被解的 waiting 步骤 idx；无 waiting 或无 answer 返回 -1
 */
export function resolveWaitingStepWithAnswer(steps, doneAnswer, nowStr) {
  if (!doneAnswer) return -1
  const waitIdx = steps.findIndex(s => s && s.status === 'waiting')
  if (waitIdx === -1) return -1
  const ws = steps[waitIdx]
  ws.waitAnswer = doneAnswer
  ws.waitAnswers = Array.isArray(ws.waitAnswers) ? ws.waitAnswers : []
  ws.waitAnswers.push({ round: (ws.waitRound || 0) + 1, answer: doneAnswer, answeredAt: nowStr })
  delete ws.waitReason
  delete ws.waitOptions
  delete ws.waitedAt
  ws.status = 'pending'
  ws.completedAt = null
  return waitIdx
}

export async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
  const { printNext = true, confirm = false, changeName, platformOpts = {}, nonInteractive = false, isForceBaseline = false, isAllowNew = false, isAllowDelete = false } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]

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
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  let currentIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  // ── 坑1：--done --answer 解「已 waiting 的步骤」──
  // findIndex 仅查 pending/in-progress，排除 waiting；故 --done --answer 落到已 --wait 暂停的
  // requiresWait 步骤时会跳过它、把 --answer 静默丢弃，步骤永久卡 WAITING、末步报「等待用户输入」。
  // 修复：带 doneAnswer 且存在 waiting 步骤时，把首个 waiting 拉回 pending + 补 waitAnswer，主流程
  // requiresWait 门控见 waitAnswer 已置→不阻断→正常 completed。仅 --answer 触发，普通 --done 零变化。
  const _doneAnswer = options && options.doneAnswer
  // ── 多 waiting 歧义守卫（对齐 continueStep 742-751 的同名保护）──
  // resolveWaitingStepWithAnswer 只 findIndex 解「第一个」waiting；阶段内 ≥2 个 waiting 时
  // --done --answer 会静默把 answer 填给第一个，可能答错对象。与 --continue 对齐：多 waiting 时报错列出。
  if (_doneAnswer) {
    const waitingIdxs = steps.map((s, i) => (s && s.status === 'waiting') ? i : -1).filter(i => i !== -1)
    if (waitingIdxs.length > 1) {
      console.error(`❌ 检测到 ${waitingIdxs.length} 个等待中的步骤，--done --answer 无法确定解哪一个：`)
      for (const i of waitingIdxs) {
        console.error(`   Step ${i + 1}: ${steps[i].name}${steps[i].waitReason ? `（${steps[i].waitReason}）` : ''}`)
      }
      console.error(`   出路：用 --continue 逐个指定恢复（每次解一个 waiting，降到 1 个后即可 --done --answer）：`)
      console.error(`   sillyspec run ${stageName} --continue --from-step <序号|名称> --answer "..."${changeName ? ` --change ${changeName}` : ''}`)
      process.exit(1)
    }
  }
  const _resolvedWaitIdx = resolveWaitingStepWithAnswer(steps, _doneAnswer, new Date().toLocaleString('zh-CN', { hour12: false }))
  if (_resolvedWaitIdx !== -1) {
    currentIdx = _resolvedWaitIdx
    console.log(`⚠️  Step "${steps[_resolvedWaitIdx].name}" 此前处于 waiting，--done --answer 已补回答并拉回待完成。`)
  }
  // ── waiting 前置守卫（坑 archive-step3-wait-answer-hint-late）──
  // 普通 --done（无 --answer）时若存在 waiting 步骤：currentIdx 会跳过它推进后续步骤
  //（findIndex 只查 pending/in-progress），步骤被静默越过 + --answer 要求要到别处报错才暴露。
  // fail-closed 拒绝并把「需要 --answer」的提示前置到第一次尝试 --done 的时刻。
  if (!_doneAnswer) {
    const _waitIdx = steps.findIndex(s => s.status === 'waiting')
    if (_waitIdx !== -1) {
      const _ws = steps[_waitIdx]
      console.error(`❌ Step ${_waitIdx + 1} "${_ws.name}" 处于等待用户输入状态（waiting），先恢复它再推进后续步骤。`)
      if (_ws.waitReason) console.error(`   原因：${_ws.waitReason}`)
      if (_ws.waitOptions) {
        try {
          const _opts = JSON.parse(_ws.waitOptions)
          if (Array.isArray(_opts) && _opts.length > 0) console.error(`   选项：${_opts.join(', ')}`)
        } catch { /* 兼容旧格式（逗号串）非 JSON，不额外展示 */ }
      }
      console.error(`   恢复：sillyspec run ${stageName} --continue --answer "用户回答"${changeName ? ` --change ${changeName}` : ''}`)
      console.error(`   或一步完成：sillyspec run ${stageName} --done --answer "用户回答"${changeName ? ` --change ${changeName}` : ''} --output "你的摘要"`)
      process.exit(1)
    }
  }
  if (currentIdx === -1) {
    // ── reopen stale 收尾路径（坑 reopen-done-escape-hatch-unreachable）──
    // 全 completed+stale（无 pending/in-progress）时若只有 exit(1)，--done --confirm 逃生门
    // 永远到不了下方回填门控。修复：有 stale 时——无 confirm 报拦截指引（与门控同文案）；
    // 带 confirm 把首个 stale 拉回 pending 走完整完成管线，末步后的回填门控 confirm 分支
    // 收尾其余 stale（--confirm 语义 = 全部 stale 一并确认）。
    const _staleIdx = steps.findIndex(s => s.status === 'stale')
    if (_staleIdx !== -1) {
      const _staleNames = steps.filter(s => s.status === 'stale').map(s => s.name)
      if (!confirm) {
        console.error(`\n⏸️  检测到 ${_staleNames.length} 个 stale 步骤（reopen 后未执行）：${_staleNames.join('、')}`)
        console.error(`   两条出路：`)
        console.error(`   ① sillyspec run ${stageName}${changeName ? ` --change ${changeName}` : ''} 逐个真实执行（stale 会被转为 pending）`)
        console.error(`   ② 确认方案未变，一次性回填收尾：sillyspec run ${stageName} --done --confirm${changeName ? ` --change ${changeName}` : ''} --output "..."`)
        process.exit(1)
      }
      steps[_staleIdx].status = 'pending'
      currentIdx = _staleIdx
      console.log(`⚠️  --confirm 收尾：把 stale 步骤 "${steps[_staleIdx].name}" 拉回当前步骤走完成管线，其余 stale 由回填门控一并确认。`)
    } else {
      console.error(`没有待完成的步骤（阶段 ${stageName} 已无 pending/in-progress 步骤）。当前阶段状态：${stageData?.status ?? '未知'}。用 \`sillyspec run ${stageName} --status\` 查看进度，或 \`sillyspec progress show\` 看全局下一步。`)
      process.exit(1)
    }
  }

  // ── requiresWait 硬门控 ──
  const defStepsForCurrent = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  // def↔DB 一致性守卫（坑 execute-step-table-drift，2026-08-20 实证）：runCommand 入口已按名
  // 重播种（ensureStageSteps），但同一命令进程内 plan.md 若再次被改（或绕过 runCommand 直调
  // completeStep 的路径），def 与 DB 步数错位会让 currentIdx 的门控/prompt 施加到错误的步骤上
  // （17/12 交替报错但仍在推进）。fail-closed：中止本次 --done，重跑即自愈（入口重播种）。
  if (Array.isArray(defStepsForCurrent) && defStepsForCurrent.length > 0 && steps.length > 0
      && defStepsForCurrent.length !== steps.length) {
    console.error(`❌ 步骤表与当前阶段定义漂移（DB ${steps.length} 步 vs 定义 ${defStepsForCurrent.length} 步）——本次 --done 中止，防止错位门控/推进。`)
    console.error(`   常见原因：plan.md 的 Wave 结构在本命令执行期间又被修改（execute 步骤由 plan 动态构建）。`)
    console.error(`   解法：原样重跑本条 --done 命令——CLI 入口会先按步骤名保留完成态重播种（见 ⚠️ 漂移告警），然后正常推进。`)
    process.exit(1)
  }
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
  // persist 回调：gate 置 step=blocked 后 exit(1) 前落库（否则 blocked 只在内存，
  // progress show/doctor 看到的仍是 pending，误导诊断）
  const persistBlocked = () => pm._write(cwd, progress, changeName)
  await enforceDepsGate(stageName, cwd, changeName, steps[currentIdx], steps, currentIdx, specBase, platformOpts, persistBlocked)
  // review.json 字段硬门（坑 review-json-field-gap）：已勾 [x] task 的 review.json 必须 schema 完整，
  // 提前到每次 --done 校验（而非等 Task Review Gate 在整阶段收尾才暴露，迫使用户事后批量补）。
  await enforceReviewJsonGate(stageName, cwd, changeName, steps[currentIdx], steps, currentIdx, specBase, platformOpts, persistBlocked)
  // 符号影响面报告硬门（ql-20260816-005-3d7f）：execute「加载上下文」步产出落盘核验——
  // symbol-impact.md 存在 + plan 每 task 有结论行；防前缀步被一句「上下文在会话内」盖章跳过。
  await enforceSymbolImpactGate(stageName, changeName, steps[currentIdx]?.name, specBase)
  // UI 原型软提醒（非阻断）：brainstorm 收尾步 design.md 命中前端文件但无 prototype → 提示用户可否决
  warnMissingUiPrototype(stageName, changeName, steps[currentIdx]?.name, specBase)

  // ── noAI 步骤硬门（坑 noai-done-bypass）：noAI 步骤的确定性校验不可被 --done 绕过 ──
  // 正常路径 agent 跑 `run <stage>` 推进到 noAI step 时，runStage 自动执行 _cliAction
  // （stage.js noAI 分支，不写 step output）；若 agent 对 noAI step 直接 --done，此前
  // completeStep 无 noAI 检测直接标 completed，executePlanPostcheck 等 CLI 确定性校验被
  // 静默跳过（实证：multi-agent-platform 2026-08-13-spec-sync-visibility tasks/ 从未
  // 生成但 plan 阶段 completed——step4 output 为 agent 口吻 178 字符而非 CLI 自动路径的
  // 空 output）。修复：--done 落到 noAI step 时同样执行 _cliAction，校验 throw →
  // completeStep 不推进（step 保持 pending）。分支对齐 stage.js 的 noAI 自动执行。
  const _isNoAIStep = currentStepDef.noAI === true || currentStep?.noAI === true
  if (_isNoAIStep) {
    const _cliAction = currentStepDef._cliAction || currentStep?._cliAction
    console.log(`⚙️ Step ${currentIdx + 1}/${steps.length}: ${steps[currentIdx].name}（noAI，--done 路径执行 CLI 校验）`)
    if (_cliAction === 'scanPreflight') {
      await executeScanPreflight(cwd, platformOpts, stageData.scanProfile || computeScanProfile(cwd, platformOpts))
    } else if (_cliAction === 'scanPostcheck') {
      await executeScanPostcheck(cwd, platformOpts, stageData.scanProfile || computeScanProfile(cwd, platformOpts))
    } else if (_cliAction === 'planPostcheck') {
      await runPlanPostcheckLib({ cwd, specRoot: platformOpts?.specRoot, resolveChangeDir, progress })
    } else {
      throw new Error(`noAI 步骤 ${steps[currentIdx].name} 的未知 _cliAction: ${_cliAction}——请在 complete.js 注册对应分支`)
    }
  }

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
    const _archiveEarlyReturn = await handleArchiveConfirmStep({ stageName, steps, currentIdx, confirm, outputText, pm, cwd, progress, changeName, specBase, platformOpts })
    if (_archiveEarlyReturn) return _archiveEarlyReturn
  }

  // plan 阶段 "generate_plan" 完成后，动态插入任务蓝图 + postcheck 步骤（抽成 handlePlanGeneratePlanStep）
  await handlePlanGeneratePlanStep({ stageName, steps, currentIdx, defStepsForCurrent, cwd, progress })

  // scan 阶段 step 2「构建扫描项目列表」完成后，按项目展开 perProject 步骤（抽成 handleScanProjectListStep）
  await handleScanProjectListStep({ stageName, steps, currentIdx, outputText, stageData, specBase, cwd, platformOpts })

  // execute Wave artifact（W6 Step6c 抽至 complete-handlers.js handleExecuteWaveArtifact）
  await handleExecuteWaveArtifact({ stageName, steps, currentIdx, changeName, specBase, cwd })

  // execute 批量完成检测：plan 全勾 + 代码客观核验通过 → 剩余 step 一次性标 completed，
  // 使本次 --done 直接进入阶段完成分支（治"3 Wave 做完仍逐次 +1、需重走 7 次 --done"）。
  // 先按 review.json pass 自动勾 plan checkbox（复用 continueStep 同源逻辑），再判批量条件。
  if (stageName === 'execute' && changeName) {
    const _ac = await autoCheckPlanFromReviews({ stageName, changeName, cwd, platformOpts })
    if (_ac.autoChecked) {
      console.log(`   ✅ 自动勾选 ${_ac.checkedCount} 个 task checkbox（基于 review.json pass）`)
    }
    if (_ac.skippedCount > 0) {
      console.warn(`   ⚠️ ${_ac.skippedCount} 个 task 未勾（review.json 缺失/fail）→ 批量完成条件不满足，仍按单步推进`)
    }
    const _bf = await detectExecuteBatchFinish({ pm, stageName, changeName, cwd, specBase, steps })
    if (_bf.batched && _bf.aligned > 0) {
      console.log(`\n🚀 execute 批量完成：plan 全勾 + 代码核验通过，一次性补完 ${_bf.aligned} 个剩余 step → 进入阶段完成分支`)
    }

    // per-task review 草稿兜底（坑 worktree-execute-apply-friction 坑2）：主 agent 直接实现模式
    // 无子代理 review 落盘 → Task Review Gate 报缺 review.json 阻断。每次 execute --done 跑（幂等，
    // 已存在跳过），据 git diff base..head 按 allowed_paths 归属生成 cannot_verify 草稿，进 gate 前就位。
    try {
      const { generateTaskReviewDrafts } = await import('../task-review.js')
      // W3 task-09：best-effort 构造 ctx 透传（D-013），跨仓 task 草稿用跨仓 gitDir 取 diff。
      // 失败降级 null（不阻断 execute 完成——草稿兜底本就是 best-effort，gate 会复校验）。
      let _draftCtx = null
      try {
        _draftCtx = await getOrCreateMultiRepoContext({ cwd, changeName, platformOpts })
      } catch (e) {
        console.warn('   ⚠️ 草稿 ctx 构造失败，降级单仓草稿（' + (e && e.message ? e.message : e) + '）')
      }
      const _drafts = await generateTaskReviewDrafts({ changeName, cwd, platformOpts, ctx: _draftCtx })
      if (_drafts.generated > 0) {
        console.log('   📄 自动补写 ' + _drafts.generated + ' 个 per-task review.json 草稿（cannot_verify，主 agent 实现模式兜底，需 agent 复核后升级为 pass/fail）')
        if (_drafts.noAttribution > 0) {
          console.warn('   ⚠️ 其中 ' + _drafts.noAttribution + ' 个 task 的 allowed_paths 未命中本次 diff（无归属草稿，changedFiles 为空）——需人工确认实际改动后升级 verdict，确属未实现则回 fail')
        }
        if (_drafts.unattributed && _drafts.unattributed.length > 0) {
          console.warn('   ⚠️ ' + _drafts.unattributed.length + ' 个变更文件未归属任何 task（顺带修复/非源码），草稿未覆盖：' + _drafts.unattributed.join(', '))
        }
      }
    } catch (e) {
      console.warn('   ⚠️ per-task review 草稿生成失败（不阻断 execute 完成）：' + (e && e.message ? e.message : e))
    }
  }

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

  if (nextPendingIdx === -1) {
    // 也检查是否有 waiting 的步骤
    const hasWaiting = steps.some(s => s.status === 'waiting')
    if (hasWaiting) {
      // 有等待中的步骤，阶段未完成
      progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
      pm._write(cwd, progress, changeName)
      const wsIdx = steps.findIndex(s => s.status === 'waiting')
      console.log(`\n⏸️  阶段暂停：Step ${wsIdx + 1} 等待用户输入`)
      if (steps[wsIdx].waitReason) console.log(`   原因：${steps[wsIdx].waitReason}`)
      // 前置恢复指引（坑 archive-step3-wait-answer-hint-late）：暂停点直接给出 --answer 恢复命令，
      // 不等用户撞 --done 报错才知道需要 --answer
      console.log(`   恢复：sillyspec run ${stageName} --continue --answer "用户回答"${changeName ? ` --change ${changeName}` : ''}`)
      return { stageCompleted: false, currentIdx, nextPendingIdx: -1 }
    }
    // quick 收尾（W6 Step6b 抽至 complete-handlers.js handleQuickStageCompletion）
    await handleQuickStageCompletion({ stageName, steps, currentIdx, cwd, progress, changeName, specBase, outputText, confirm, isForceBaseline, isAllowNew, isAllowDelete, platformOpts, pm })

    // ── reopen --done 回填（坑 brainstorm-reopen-step-state-desync）──
    // nextPendingIdx === -1 且无 waiting，说明要进阶段完成分支。此时若存在 stale 步骤
    // （reopen --from-step N 把 N+1..end 置 stale，但方案未变、无需重跑），需同步回填为
    // completed，否则进度数字与实际步骤明细矛盾（阶段已完成 + 6/8）。
    // 安全边界：仅进入阶段完成分支时才回填（stale 本就被跳过、不回填也照常标 completed），
    // 不改变单步推进行为；stale 若确需重跑，运行流（stage.js:141-148）会先于本分支转 pending 执行。
    // FR-01 门控：无 --confirm 时不回填，阻断并给两条出路；带 --confirm 时回填并审计。
    const staleSteps = steps.filter(s => s.status === 'stale')
    if (staleSteps.length > 0) {
      if (!confirm) {
        // 无 confirm：不回填，阶段不完成，返回 staleBlocked 标记
        const staleNames = staleSteps.map(s => `Step ${steps.indexOf(s) + 1}(${s.name})`).join(', ')
        console.error(`⏸️  检测到 ${staleSteps.length} 个 stale 步骤（reopen 后未执行）——两条出路：`)
        console.error(`   ① sillyspec run ${stageName} 逐个真实执行（首个 stale 自动转 pending）`)
        console.error(`   ② 确认方案未变用 --done --confirm 一次性回填收尾`)
        console.error(`   stale 步骤：${staleNames}`)
        progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
        pm._write(cwd, progress, changeName)
        return { stageCompleted: false, currentIdx, nextPendingIdx: -1, staleBlocked: true }
      }
      // 带 confirm：按现行回填逻辑 + 审计记录
      const nowStr = new Date().toLocaleString('zh-CN',{hour12:false})
      for (const st of staleSteps) {
        st.status = 'completed'
        st.completedAt = st.completedAt || nowStr
      }
      pm._write(cwd, progress, changeName)
      console.log(`  ⚠️ 同步回填 ${staleSteps.length} 个 stale 步骤为 completed（reopen --from-step N 后 --done --confirm，方案未变）`)
      // 审计记录 reopen-stale-backfill
      try {
        pm._appendAuditLog(cwd, {
          action: 'reopen-stale-backfill',
          stage: stageName,
          change: changeName,
          steps: staleSteps.map(s => s.name),
          confirmedAt: nowStr
        })
      } catch (e) {
        console.warn('⚠️ 回填审计日志写入失败（不阻断）:', e.message)
      }
    }

    stageData.status = 'completed'
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    // persist（_write + triggerSync）移到 completeStageGates 成功之后（task-01 / review-2026-08-09 #2）：
    // gate 任一段异常/失败 → rollbackCompletionAndReturn 回 in-progress 并落盘；此处未到 _write，DB 不留假 completed。

    // Append to user-inputs.md
    if (outputText) {
      const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
      const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
      try {
        appendFileSync(inputsPath, entry)
      } catch (e) {
        // best-effort：Windows AV/索引占用偶发 EPERM，历史日志写失败不阻断主流程（review-2026-08-09 #7，对齐 shared.js triggerSync）
        console.warn('⚠️ user-inputs.md 追加失败（不阻断）:', e.message)
      }
    }

    // 阶段完成收尾共享管线（handleScan manifest + validateMetadata/FileLocations + auxiliary 重置 +
    // runStageCompletionGates + execute worktree cleanup），消除 S1/S2/S3 三处收尾不对称（task-01 抽出）。
    // gate 失败已 rollback，early-return 跳过下方"阶段已完成/下一步"提示（合理收紧：回滚不该打完成提示）。
    // W3 task-09：best-effort 构造 ctx 透传给 completeStageGates（D-013），让 task-07 gate 跨仓 task
    // 切 gitDir + per-repo verify。execute 启动期已 fail-closed 过一次，此处命中缓存或单仓退化。
    let _completeCtx = null
    try {
      _completeCtx = await getOrCreateMultiRepoContext({ cwd, changeName, platformOpts })
    } catch (e) {
      console.warn('⚠️ 阶段完成 ctx 构造失败，降级单仓 gate（' + (e && e.message ? e.message : e) + '）')
    }
    const _stageGatesResult = await completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText, ctx: _completeCtx })
    // task-04 / A5：gate 失败（stageCompleted===false）设进程退出码 1，对齐 quick 审计 blocked→exit 1 惯例。
    // 用 process.exitCode 而非 process.exit(1)：让回滚 pm._write + triggerSync 落盘完成后自然退出，保留失败现场。
    if (_stageGatesResult?.stageCompleted === false) process.exitCode = 1
    if (_stageGatesResult) return _stageGatesResult

    // 完整流程 change title 刷新（阶段完成时；proposal/design 已落盘，机制见 refreshChangeTitleFromArtifacts）
    refreshChangeTitleFromArtifacts(pm, cwd, specBase, changeName)

    // gate 全过：persist completed（task-01 移后）。此处到 _write 之间若崩，DB 仍 in-progress（内存已 completed 但未落盘），下次进 CLI 读 DB 即 in-progress，不产生"假 completed"。
    pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)

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
        console.log(`\n👉 下一步：sillyspec run verify${changeName ? ` --change ${changeName}` : ''}（验证通过后才能归档）`)
      }
    } else if (stageName === 'archive') {
      console.log('\n👉 归档完成！现在可以提交了：git commit -m "..."')
    } else if (stageName === 'verify') {
      // verify 的"验证通过"提示延后到下方 validator 通过后才打印，
      // 避免校验失败（FAIL / 缺 verify-result.md）时仍声称"验证通过可以归档"。
    } else if (stageName === 'brainstorm') {
      // brainstorm 下一步按 design.md 的 scale 分叉（与末步 prompt 的 large→plan / small→quick 对齐），
      // 不走下方 _getNextSuggestion —— 后者按全局状态机「第一个未完成且上游就绪的阶段」推荐，
      // 当 scan 未完成时会误推 scan（回头路），与 brainstorm 已完成、应进入 plan/quick 矛盾。
      // 历史教训：曾因此让 agent 在 brainstorm 完成后被误导去跑 scan。
      const _bscale = readDesignScale(specBase, changeName)
      if (_bscale === 'small') {
        console.log(`\n👉 brainstorm 已完成（small）。下一步：sillyspec run quick --linked-changes ${changeName}`)
      } else {
        console.log(`\n👉 brainstorm 已完成。下一步：sillyspec run plan${changeName ? ` --change ${changeName}` : ''}（scale=large 或未标 small 走完整 plan）`)
      }
    } else if (stageName === 'quick') {
      // quick 是收尾阶段（辅助流程，不走主链 scan→archive），完成后该提交，而非推 scan。
      // 走下方 _getNextSuggestion 会因 scan 是 STAGE_ORDER 首位、永未完成而误推 scan（回头路），
      // 与 brainstorm 同类问题（见上注释），故给 quick 专属分支。
      console.log('\n👉 quick 已完成。下一步：提交本次改动（git commit / sillyspec-commit），或 sillyspec run <stage> 继续其他阶段。')
    } else {
      // D1 暗衔接修：阶段刚完成，CLI 本就知道状态机下一步是哪个阶段（_getNextSuggestion），
      // 却只丢一句「下一步由你决定」让 agent 自己猜命令。改为按 progress 实际状态给出精确命令。
      let next = null
      try { next = pm._getNextSuggestion(progress) } catch { /* 读建议失败不阻断完成 */ }
      if (next && next.command) {
        console.log(`\n👉 ${next.text}`)
        console.log(`   下一步命令：${next.command}`)
      } else {
        console.log(`\n下一步由你决定：sillyspec run <stage>（brainstorm/plan/execute/verify/archive 等）`)
      }
    }

    return { stageCompleted: true, currentIdx, nextPendingIdx: -1 }
  }

  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  // 单步完成也刷新 change title：design.md 在 brainstorm step6 落盘，此后每次 --done 都该让
  // changes.title 反映中文描述，不等阶段收尾（机制见 refreshChangeTitleFromArtifacts）。
  refreshChangeTitleFromArtifacts(pm, cwd, specBase, changeName)

  // Append to user-inputs.md
  if (outputText) {
    const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
    const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
    try {
      appendFileSync(inputsPath, entry)
    } catch (e) {
      console.warn('⚠️ user-inputs.md 追加失败（不阻断）:', e.message)
    }
  }

  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  console.log(`✅ Step ${currentIdx + 1}/${steps.length} 完成：${steps[currentIdx].name}\n`)

  // Workflow post_check（W6 Step6 抽至 complete-handlers.js handleWorkflowPostCheck）
  const _wfResult = await handleWorkflowPostCheck({ stageName, steps, currentIdx, cwd, specBase, progress, platformOpts, changeName })
  if (_wfResult) return _wfResult

  if (printNext) {
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
    // task-08：底部锚定行——outputStep 渲染的长 prompt 易被 tail 截断，末尾再打一行推进位置，
    // 让 agent 只看末几行也能知道「推进到第几步」。仅单步推进分支（阶段完成分支已有 ✅ 阶段已完成）。
    // defSteps 越界防御：平台模式 buildPlanSteps 长度漂移时 nextPendingIdx 可能越界
    // （参照 prompt.js:174-179 越界降级先例），越界时静默跳过，不崩。
    if (defSteps && defSteps[nextPendingIdx]) {
      console.log(`\n🚀 advanced to step ${nextPendingIdx + 1}/${steps.length}: ${defSteps[nextPendingIdx].name}`)
    }
    // quick 末步四字段前置预告（坑 quick-step3-four-fields-late）：末步 --done 的 --output 四字段
    // 是硬校验（缺任一项被拒 + 回滚），但模板藏在 step3 长 prompt 中段——task-08 同因（长 prompt
    // 易被 tail 截断），agent 常到 --done 被拦才第一次见到模板。推进到末步的此刻用底部短块预告
    // 模板 + 可照抄命令，省一轮拦截往返（拦截路径保留兜底）。
    if (stageName === 'quick' && nextPendingIdx === steps.length - 1) {
      console.log(`\n📌 本步是 quick 末步：--done 必须给全四字段（CLI 硬校验，缺任一项会被拒、补全重跑不丢进度）。推荐四参数形式（CLI 自动合成，无格式事故面）：`)
      console.log(`   sillyspec run quick --done${changeName ? ` --change ${changeName}` : ''} --req "一句话语义化短标题（即 QUICKLOG 条目标题）" --cause "为什么这样改（纯新增/样式则写「无，纯新增/纯样式」）" --solution "怎么改的" --result "验证情况（测试数 / lint / typecheck / 部署状态）"`)
      console.log(`   兼容旧形式：--output "需求：… 根因：… 方案：… 结果：…"（四字段逐项一句话、不可「见前述」，正文内禁嵌套全角冒号）；可选 --file-notes "path::括注 || path2" 落多行文件括注`)
    }
  }
  return { stageCompleted: false, currentIdx, nextPendingIdx }
}

// ── Step 调度兄弟函数（W6 Step7b-2 从 run.js 搬入：skip/wait/continue + formatWaitHistory）──
/**
 * plan.md checkbox 自动勾选：execute 完成 + 各 task review.json 双 verdict 非 fail → 自动勾选。
 * 治本于"plan 全靠手动勾、易遗漏"——以 review.json pass 为客观依据勾选。供 continueStep 完成段
 * 与 completeStep 的 execute 批量完成检测复用（避免两处复制）。
 *
 * @returns {{autoChecked:boolean, checkedCount:number, skippedCount:number, planTotal:number, planChecked:number}}
 *   planTotal/planChecked 在调用方于本函数之后用 readPlanCheckboxStatus 重读（勾选已落盘）。
 */
/**
 * 读 task 卡片文本（plan.md task 行外的详细描述/allowed_paths），用于端到端 task 判定。
 * 卡片缺失返回空串（仅靠 plan.md task 行文本判）。
 */
function readTaskCardText(changeDir, taskNum) {
  try { return readFileSync(join(changeDir, 'tasks', `task-${taskNum}.md`), 'utf8') } catch { return '' }
}

/**
 * W2 task-04/05 共用 helper：构造草稿零 diff 校验用的 ctx（与 task-review.js generateTaskReviewDrafts 同源）。
 * 用于 autoCheckPlanFromReviews（勾选层）和 detectExecuteBatchFinish（批量层）。
 * 失败返回 null（调用方降级：勾选层不勾、批量层不过滤——向后兼容）。
 *
 * @returns {Promise<{gitDir:string, base:string, head:string}|null>}
 */
async function buildDraftContext(cwd, changeName) {
  try {
    const { WorktreeManager } = await import('../worktree.js')
    const meta = new WorktreeManager({ cwd }).getMeta(changeName)
    const base = meta?.baselineCommit || meta?.baseHash || null
    let gitDir = cwd
    let head = null
    if (meta?.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
      gitDir = meta.worktreePath
    }
    if (base) {
      try {
        head = gitQuiet(gitDir, ['rev-parse', 'HEAD'])
      } catch (e) {
        console.warn(`⚠️ ctx 构造失败（git rev-parse HEAD 失败：${e && e.message ? e.message : e}），跳过草稿 diff 校验`)
        return null
      }
    }
    if (base && head && gitDir) {
      return { gitDir, base, head }
    }
    return null
  } catch (e) {
    console.warn(`⚠️ ctx 构造失败（${e && e.message ? e.message : e}），跳过草稿 diff 校验`)
    return null
  }
}

/**
 * 预取 base..head 全量 diff 文件集（一次 git spawn），供草稿零 diff 守卫按 task 内存归属判定。
 * 此前每草稿 task 一次 `git diff --name-only base..head -- <files>`（同一对 base..head 查 N 次，
 * 8 task ≈ 8-16 次串行 spawn）。失败返回 null → 调用方回退逐 task 实测路径。
 */
function prefetchDiffFileSet(ctx) {
  if (!ctx?.gitDir || !ctx.base || !ctx.head) return ctx
  try {
    const out = gitQuiet(ctx.gitDir, ['diff', '--name-only', `${ctx.base}..${ctx.head}`], { trim: true })
    if (!out) return ctx
    return { ...ctx, diffFileSet: new Set(out.split('\n').filter(Boolean)) }
  } catch {
    return ctx
  }
}

/**
 * 判定 task 是否该被 autoCheckPlanFromReviews 自动勾选。
 * 端到端/deployment-critical task 要求 review spec+quality 双 pass（cannot_verify 不算，防批量完成
 * 放行未真验的端到端 task）；普通 task 非 fail 即可（保主 agent 直接实现模式体验，其 cannot_verify
 * 草稿仍可批量收尾）。坑 execute-batch-complete-endtoend-checkbox。
 *
 * W2 task-04 FR-03：草稿勾选层零 diff 守卫——review 为自动草稿且 ctx 给定时，额外要求
 * changedFiles 非空且 git diff 实测非空。防 allowed_paths 误归属他人 diff 或陈旧 review.json 导致
 * 空任务被自动勾选/批量放行。ctx 缺省时保持现行判定（向后兼容）。
 *
 * @param {{ok?:boolean, review?:{specVerdict?:string, qualityVerdict?:string, reviewerNotes?:string, changedFiles?:string[]}}} r readReview 结果
 * @param {boolean} endToEnd 是否端到端/deployment-critical task
 * @param {{gitDir?:string, base?:string, head?:string}|null} [ctx] 实测 diff 上下文；缺省保持现行判定
 * @returns {boolean}
 */
export function shouldAutoCheckTask(r, endToEnd, ctx = null) {
  if (!r?.ok) return false
  const spec = r.review?.specVerdict
  const quality = r.review?.qualityVerdict
  if (spec === 'fail' || quality === 'fail') return false
  if (endToEnd) return spec === 'pass' && quality === 'pass'

  // W2 task-04 草稿零 diff 守卫（FR-03）
  // ctx 给定且 review 为自动草稿时，要求 changedFiles 非空且实测 diff 非空
  if (ctx && r.review?.reviewerNotes && r.review.reviewerNotes.includes('auto-generated draft')) {
    const changedFiles = r.review.changedFiles || []
    if (changedFiles.length === 0) {
      console.warn(`⚠️ 草稿 review changedFiles 为空，跳过自动勾选`)
      return false
    }
    if (!ctx.gitDir || !ctx.base || !ctx.head) {
      console.warn(`⚠️ ctx 信息不完整（gitDir=${ctx.gitDir}, base=${ctx.base}, head=${ctx.head}），跳过草稿 diff 校验，保守不勾`)
      return false
    }
    // 预取路径：一次全量 diff 文件集内存归属（autoCheckPlanFromReviews/批量路径已 prefetch）
    if (ctx.diffFileSet) {
      const hit = changedFiles.filter(f => ctx.diffFileSet.has(f))
      if (hit.length === 0) {
        console.warn(`⚠️ 草稿 review 实测 diff 为空（base=${ctx.base.slice(0, 8)}, head=${ctx.head.slice(0, 8)}, files=${changedFiles.length}），跳过自动勾选`)
        return false
      }
      console.log(`   ✓ 草稿 diff 校验通过（实测 ${hit.length}/${changedFiles.length} 个声明文件有改动）`)
      return true
    }
    try {
      // 实测 diff：git diff --name-only <base>..<head> -- <changedFiles>
      // 用数组参数避免 shell 拆词，复用 git-helper 安全模式
      const diffResult = gitQuiet(ctx.gitDir, ['diff', '--name-only', `${ctx.base}..${ctx.head}`, '--', ...changedFiles], { trim: true })
      if (!diffResult || diffResult.trim() === '') {
        console.warn(`⚠️ 草稿 review 实测 diff 为空（base=${ctx.base.slice(0,8)}, head=${ctx.head.slice(0,8)}, files=${changedFiles.length}），跳过自动勾选`)
        return false
      }
      console.log(`   ✓ 草稿 diff 校验通过（${diffResult.trim().split('\n').length} 个文件有改动）`)
    } catch (e) {
      console.warn(`⚠️ 草稿 diff 校验失败（${e && e.message ? e.message : e}），保守不勾`)
      return false
    }
  }

  return true
}
async function autoCheckPlanFromReviews({ stageName, changeName, cwd, platformOpts }) {
  if (stageName !== 'execute' || !changeName) {
    return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
  }
  try {
    const specBaseLc = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const changeDir = join(specBaseLc, 'changes', changeName)
    // 2026-08-20-task-truth-unify D-001@v1：勾选写入目标从 plan.md 迁 tasks.md（任务唯一真相；
    // plan.md Wave 引用行无 checkbox，无处可勾）。tasks.md 存在性作前置。
    const tasksMdPath = join(changeDir, 'tasks.md')
    const runtimeRoot = resolveRuntimeRoot(platformOpts, specBaseLc)
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    if (!existsSync(tasksMdPath) || !existsSync(runIdFile)) {
      return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
    }
    const c = readFileSync(runIdFile, 'utf8').trim()
    const { readReview, isValidExecuteRunId } = await import('../task-review.js')
    // marker 是 agent 可写内容：格式校验防注入/穿越，非法视为缺失（跳过 autoCheck，不误勾）
    if (c && !isValidExecuteRunId(c)) {
      console.warn(`⚠️ execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），跳过 review 自动勾选`)
      return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
    }
    const executeRunId = c

    // W2 task-04 FR-03：构造 ctx 供草稿零 diff 守卫用（与 task-review.js generateTaskReviewDrafts 同源）
    const ctx = prefetchDiffFileSet(await buildDraftContext(cwd, changeName))

    // tasks.md 是 agent 与 CLI 都会写的共享文件（agent 勾 checkbox、此处 autoCheck 也勾选）。
    // 读-改-写必须整体持锁（withFileLock 串行化多进程），否则并发 execute --done / 手动勾选互相覆盖
    // （后到者覆盖先到者）；写入用 writeAtomicSync（tmp+rename 原子），防 Windows 整文件覆盖被读半截
    // （fs-atomic.js 头注明的 reader-writer 竞态坑）。锁文件放 changeDir，与 QUICKLOG 同机制。
    const lockPath = join(changeDir, '.tasks.md.lock')
    return await withFileLock(lockPath, async () => {
      const tasksContent = readFileSync(tasksMdPath, 'utf8')
      let checkedCount = 0
      let skippedCount = 0
      const updated = tasksContent.replace(/^(\s*[-*]\s*\[)\s(\]\s*task-\d+)/gim, (match, p1, p2) => {
        const taskNum = match.match(/task-(\d+)/)[1].padStart(2, '0')
        const reviewPath = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', `task-${taskNum}`, 'review.json')
        const r = readReview(reviewPath)
        // 端到端 task：必须 pass（cannot_verify 不算）；普通 task：非 fail 即可（坑 execute-batch-complete-endtoend-checkbox）
        const endToEnd = isEndToEndTaskText(match + ' ' + readTaskCardText(changeDir, taskNum))
        if (shouldAutoCheckTask(r, endToEnd, ctx)) {
          checkedCount++
          return `${p1}x${p2}`   // 勾选
        }
        skippedCount++
        return match              // 不勾
      })
      if (checkedCount > 0) {
        writeAtomicSync(tasksMdPath, updated)
      }
      return { autoChecked: checkedCount > 0, checkedCount, skippedCount }
    })
  } catch (err) {
    console.warn(`⚠️ autoCheckPlanFromReviews 异常（跳过自动勾选）: ${err && err.message ? err.message : err}`);
    return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
  }
}

/**
 * execute 批量完成检测：tasks.md 所有 task checkbox 已勾 + 代码客观核验非零变更 →
 * 把剩余 pending/in-progress step 一次性标 completed，使 completeStep 本次 --done 即进入阶段完成
 * 分支（而非逐次 +1）。治"3 Wave 全做完仍显示未开工、需重走 7 次 --done"。
 * 复用现成能力：readPlanCheckboxStatus（勾选状态，2026-08-20-task-truth-unify 起读 tasks.md）
 * + checkExecuteCodeEvidence（代码客观核验，与 doctor --align-execute-progress 同源，D-002/D-004）。
 * 仅在 stageName==='execute' && changeName 触发。
 *
 * W2 task-05 FR-04：全勾后逐 task 复核——review 缺失或草稿零 diff → 阻断批量，
 * 返回 blockedTasks 列表（task id 数组），调用方打印 reason。
 *
 * 安全门：注册表零 checkbox / 未全勾 / 代码零变更（unchanged）均不批量——信任声明但用代码核验兜底。
 * @returns {Promise<{batched:boolean, aligned:number, reason?:string, blockedTasks?:string[]}>}
 */
async function detectExecuteBatchFinish({ pm, stageName, changeName, cwd, specBase, steps }) {
  if (stageName !== 'execute' || !changeName) return { batched: false, aligned: 0 }
  try {
    const changeDir = join(specBase, 'changes', changeName)
    const { total: planTotal, checked: planChecked } = pm.readPlanCheckboxStatus(changeDir)
    if (planTotal === 0) return { batched: false, aligned: 0, reason: 'tasks.md 无 task checkbox' }
    if (planChecked < planTotal) {
      return { batched: false, aligned: 0, reason: `tasks.md 未全勾（${planChecked}/${planTotal}）` }
    }
    // 全勾 → 代码客观核验（防手动勾伪造导致空完成）
    const { checkExecuteCodeEvidence } = await import('../stage-contract.js')
    const evidence = checkExecuteCodeEvidence(cwd, changeName)
    if (evidence.status === 'unchanged') {
      return { batched: false, aligned: 0, reason: `代码零变更（${evidence.detail}）` }
    }

    // W2 task-05 FR-04：逐 task 复核（草稿零 diff 守卫——批量层）
    // 读取 tasks.md 提取已勾 task id 列表（正则 `- [x] task-NN`；勾选唯一落点 tasks.md）
    const tasksMdPath = join(changeDir, 'tasks.md')
    const tasksContent = readFileSync(tasksMdPath, 'utf8')
    const taskCheckboxRegex = /-\s\[x\]\s+task-(\d+)/gi
    const taskMatches = [...tasksContent.matchAll(taskCheckboxRegex)]
    const taskIds = taskMatches.map(m => `task-${m[1].padStart(2, '0')}`)

    if (taskIds.length === 0) {
      return { batched: false, aligned: 0, reason: 'tasks.md 无已勾 task checkbox' }
    }

    // 构造 ctx 供草稿零 diff 校验用（与 task-04 同源）
    const ctx = prefetchDiffFileSet(await buildDraftContext(cwd, changeName))
    const runtimeRoot = resolveRuntimeRoot({ specRoot: specBase }, specBase)
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    const blockedTasks = []

    for (const taskId of taskIds) {
      let review = null
      try {
        const { readReview, isValidExecuteRunId } = await import('../task-review.js')
        const c = readFileSync(runIdFile, 'utf8').trim()
        if (!c || !isValidExecuteRunId(c)) {
          blockedTasks.push(taskId)
          continue
        }
        const executeRunId = c
        const reviewPath = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', taskId, 'review.json')
        const r = readReview(reviewPath)
        if (!r?.ok) {
          blockedTasks.push(taskId)
          continue
        }
        review = r.review
      } catch {
        blockedTasks.push(taskId)
        continue
      }

      // review 存在：判定是否为自动草稿且零 diff
      if (review?.reviewerNotes && review.reviewerNotes.includes('auto-generated draft')) {
        const changedFiles = review.changedFiles || []
        // 草稿且 changedFiles 为空 → 阻断
        if (changedFiles.length === 0) {
          blockedTasks.push(taskId)
          continue
        }
        // 草稿且有 changedFiles → 实测 diff 校验（ctx 与 task-04 同源；优先用预取全量集，
        // 免去每 task 一次 spawn——与 shouldAutoCheckTask 同口径）
        if (ctx && ctx.gitDir && ctx.base && ctx.head) {
          try {
            let hit = null
            if (ctx.diffFileSet) {
              hit = changedFiles.filter(f => ctx.diffFileSet.has(f))
            } else {
              const diffResult = gitQuiet(ctx.gitDir, ['diff', '--name-only', `${ctx.base}..${ctx.head}`, '--', ...changedFiles], { trim: true })
              hit = diffResult && diffResult.trim() !== '' ? changedFiles : []
            }
            if (hit.length === 0) {
              blockedTasks.push(taskId)
            }
          } catch (e) {
            // diff 校验失败保守处理：阻断（避免误批量）
            blockedTasks.push(taskId)
          }
        }
      }
    }

    // blockedTasks 非空 → 阻断批量
    if (blockedTasks.length > 0) {
      const reason = `以下 task 复核未过（review 缺失或草稿零 diff）：${blockedTasks.join(', ')}`
      console.warn(`⚠️ 批量完成被阻断：${reason}`)
      return { batched: false, aligned: 0, reason, blockedTasks }
    }

    // 全部复核通过 → 批量标 completed
    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    let aligned = 0
    for (const step of steps) {
      if (step.status === 'pending' || step.status === 'in-progress') {
        step.status = 'completed'
        step.completedAt = now
        aligned++
      }
    }
    return { batched: true, aligned }
  } catch (e) {
    // 异常 fail-open：不批量，reason 带错误信息
    return { batched: false, aligned: 0, reason: `批量完成检测异常：${e && e.message ? e.message : e}` }
  }
}

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

export async function waitStep(pm, progress, stageName, cwd, outputText, waitReason, waitOptions, options = {}) {
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
    console.error(`没有可以等待的步骤（阶段 ${stageName} 已无 pending/in-progress 步骤）。当前阶段状态：${stageData?.status ?? '未知'}。用 \`sillyspec run ${stageName} --status\` 查看进度，或 \`sillyspec progress show\` 看全局下一步。`)
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
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  console.log(`⏸️  Step ${currentIdx + 1}/${stageData.steps.length} 已暂停等待：${stageData.steps[currentIdx].name}`)
  if (waitReason) console.log(`   原因：${waitReason}`)
  if (waitOptions) console.log(`   选项：${formatWaitOptions(waitOptions)}`)
  console.log(`   继续时执行：sillyspec run ${stageName} --continue --answer "你的选择"${changeName ? ` --change ${changeName}` : ''}`)
  // requiresWait 语义前置（坑 archive-step3-wait-answer-hint-late）：--continue --answer 只是中继回答，
  // 本步会回到待执行（回答后还需执行动作再 --done 收尾）；不想两段式可用 --done --answer 一步完成。
  // 提示落在标记 --wait 的此刻，而非等 agent 撞 --done 报错才知道。
  if (stepDef.requiresWait === true || currentStep.requiresWait === true) {
    console.log(`   注：本步为 requiresWait 步骤——--continue --answer 后本步回到待执行，完成动作后需再 --done 收尾`)
    console.log(`   或一步完成：sillyspec run ${stageName} --done --answer "你的选择"${changeName ? ` --change ${changeName}` : ''} --output "你的摘要"`)
  }
}

export async function continueStep(pm, progress, stageName, cwd, answer, options = {}) {
  const { changeName, platformOpts = {}, fromStep } = options
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
    console.error(`没有处于等待状态的步骤（阶段 ${stageName} 当前无 waiting 步骤，--continue 无目标）。当前阶段状态：${stageData?.status ?? '未知'}。用 \`sillyspec run ${stageName} --status\` 查看进度，或 \`sillyspec progress show\` 看全局下一步。`)
    process.exit(1)
  }

  // --from-step 支持在多个 waiting 时指定恢复哪一个（避免被迫 --reset 破坏性重置）。
  let currentIdx
  if (fromStep != null) {
    let targetIdx
    if (/^\d+$/.test(String(fromStep))) {
      targetIdx = parseInt(String(fromStep), 10) - 1 // 1-based → 0-based
    } else {
      targetIdx = stageData.steps.findIndex(s => s.name === fromStep)
    }
    const target = targetIdx >= 0 ? stageData.steps[targetIdx] : null
    if (!target || target.status !== 'waiting') {
      console.error(`❌ --from-step 指定的步骤「${fromStep}」不处于等待状态。当前 waiting：`)
      for (const ws of waitingSteps) console.error(`   Step ${ws.idx + 1}: ${ws.name}`)
      process.exit(1)
    }
    currentIdx = targetIdx
  } else if (waitingSteps.length > 1) {
    // 多 waiting 且未指定 fromStep：给出渐进出路（逐个 continue），而非只建议破坏性 reset。
    console.error(`❌ 检测到 ${waitingSteps.length} 个等待中的步骤，无法确定恢复目标：`)
    for (const ws of waitingSteps) {
      console.error(`   Step ${ws.idx + 1}: ${ws.name}${ws.waitReason ? `（${ws.waitReason}）` : ''}`)
    }
    console.error(`   出路（二选一）：`)
    console.error(`   ① 逐个恢复（推荐，非破坏性）：sillyspec run ${stageName} --continue --from-step <序号|名称> --answer "..."${changeName ? ` --change ${changeName}` : ''}，每次解一个 waiting，降到 1 个后即可不带 --from-step 继续`)
    console.error(`   ② 全部重来（破坏性、不可逆）：sillyspec run ${stageName} --reset${changeName ? ` --change ${changeName}` : ''}`)
    process.exit(1)
  } else {
    currentIdx = waitingSteps[0].idx
  }
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
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  // wait 解除持久化点（含 repeatable 多轮）同样刷新 change title——多轮确认期间 design.md 已存在
  refreshChangeTitleFromArtifacts(pm, cwd, specBase, changeName)

  console.log(`✅ Step ${currentIdx + 1}/${stageData.steps.length} 已继续：${currentStep.name}`)
  console.log(`   回答：${answer}`)

  // Append to user-inputs.md
  const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
  const entry = `\n## ${now} | ${changeName || '?'} | ${stageName}: ${currentStep.name} [CONTINUED]\n- 回答：${answer}\n`
  try {
    appendFileSync(inputsPath, entry)
  } catch (e) {
    console.warn('⚠️ user-inputs.md 追加失败（不阻断）:', e.message)
  }

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
    // persist _write 移到 completeStageGates 成功之后（task-03 / review-2026-08-09 #2）：gate 异常/失败 → rollback 回 in-progress 落盘，此处未到 _write，DB 不留假 completed。
    // 阶段完成收尾共享管线（含 execute worktree cleanup），消除 continueStep 完成分支绕过 gate 的 S2（task-01 抽出）。
    // gate 失败已 rollback，early-return 跳过下方"阶段已完成/下一步"提示（与 completeStep 同语义）。
    // W3 task-09：best-effort 构造 ctx 透传（D-013），与 completeStep 完成分支同语义。
    let _contCtx = null
    try {
      _contCtx = await getOrCreateMultiRepoContext({ cwd, changeName, platformOpts })
    } catch (e) {
      console.warn('⚠️ 阶段完成 ctx 构造失败，降级单仓 gate（' + (e && e.message ? e.message : e) + '）')
    }
    const _stageGatesResult = await completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps: stageData.steps, currentIdx, outputText: null, ctx: _contCtx })
    // task-04 / A5：gate 失败（stageCompleted===false）设进程退出码 1（与 completeStep 完成分支同语义）。
    if (_stageGatesResult?.stageCompleted === false) process.exitCode = 1
    if (_stageGatesResult) return _stageGatesResult
    // 完整流程 change title 刷新（同 completeStep 完成分支，wait 解除后阶段完成也刷新）。
    refreshChangeTitleFromArtifacts(pm, cwd, specBase, changeName)
    // gate 全过：persist completed（task-03 移后；此处无 triggerSync）。
    pm._write(cwd, progress, changeName)
    console.log(`\n✅ ${stageName} 阶段已完成（${stageData.steps.length}/${stageData.steps.length} 步）`)
    // 阶段完成后明确下一步（agent 常卡：stageData completed 但不知要 run <下一阶段> 推进 currentStage）
    const nextStageHint = { brainstorm: 'plan', plan: 'execute', execute: 'verify', verify: 'archive' }[stageName]
    if (nextStageHint) {
      // brainstorm 按 design.md frontmatter 的 scale 分叉（与末步 prompt 对齐）：
      //   small → quick --linked-changes（小变更免走完整 plan）；large / 读不到 scale → plan（保守默认）。
      // 修历史 bug：此处曾硬编码 brainstorm→plan 不读 scale，small 档与末步 prompt（quick）矛盾、误导小变更进 plan。
      let hintStage = nextStageHint
      let hintChangeFlag = changeName ? ` --change ${changeName}` : ''
      if (stageName === 'brainstorm' && changeName && readDesignScale(specBase, changeName) === 'small') {
        hintStage = 'quick'
        hintChangeFlag = ` --linked-changes ${changeName}`
      }
      console.log(`\n👉 ${stageName} 已完成。下一步：sillyspec run ${hintStage}${hintChangeFlag}`)
      if (stageName === 'execute') {
        console.log(`   ⚠️ 若 worktree 改动还没 apply 到主工作区，先：sillyspec worktree apply ${changeName}`)
        console.log(`   （apply 不需要先 commit，支持 working tree 未提交改动）`)
        // plan.md checkbox auto-check：execute 完成 + review.json pass → 自动勾选（治本，比警告可靠）
        const _ac = await autoCheckPlanFromReviews({ stageName, changeName, cwd, platformOpts })
        if (_ac.autoChecked) {
          console.log(`   ✅ 自动勾选 ${_ac.checkedCount} 个 task checkbox（基于 review.json pass）`)
        }
        if (_ac.skippedCount > 0) {
          console.warn(`   ⚠️ ${_ac.skippedCount} 个 task 未勾（review.json 缺失/fail）→ archive 会拦。补 review 后重跑 execute --done 触发自动勾`)
        }
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

export async function skipStep(pm, progress, stageName, cwd, changeName, platformOpts = {}) {
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
      console.error(`没有待跳过的步骤（阶段 ${stageName} 已无 pending/in-progress 步骤）。当前阶段状态：${stageData?.status ?? '未知'}。用 \`sillyspec run ${stageName} --status\` 查看进度，或 \`sillyspec progress show\` 看全局下一步。`)
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
  pm._write(cwd, progress, changeName)
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

