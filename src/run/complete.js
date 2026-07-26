/**
 * run/complete.js（W6 Step7b 从 run.js 抽出）。
 *
 * step 完成处理核心：completeStep（调度主干——WAIT/scanProfile/requiresWait 门控 + 各 handler 调用 +
 * completion path 收尾 + single-step path）+ skipStep/waitStep/continueStep（W6 Step7b-2 续搬）。
 * 本 commit（7b-1）先搬 completeStep + 2 独占 helper（validateMetadata/validateFileLocations）。
 *
 * 安全锚：run.js 始终 barrel。completeStep 由 run.js import 回来；_completeStepForTest 被 9 个
 * run-complete-step-* characterization 测试直接 import，run.js barrel re-export（export { completeStep as
 * _completeStepForTest } 沿用 imported-binding re-export）契约保留。
 *
 * 依赖（completeStep 仅用已抽叶子 + 随搬 helper，零 run.js 闭包，零动态 import）：
 *   - shared.js: triggerSync/WAIT_MARKER_RE/getStageSteps；prompt.js: outputStep；gates.js: enforceDepsGate/runStageCompletionGates
 *   - complete-handlers.js: 8 handler；stages/index.js: stageRegistry；worktree-apply.js: formatExecuteSummary
 *   - node: join(path) + existsSync/readdirSync/readFileSync/mkdirSync/writeFileSync/appendFileSync/statSync(fs)
 */
import { join } from 'node:path'
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, appendFileSync, statSync } from 'node:fs'
import { triggerSync, WAIT_MARKER_RE, getStageSteps } from './shared.js'
import { outputStep } from './prompt.js'
import { enforceDepsGate, runStageCompletionGates } from './gates.js'
import { handleArchiveConfirmStep, handlePlanGeneratePlanStep, handleScanProjectListStep, handleWorkflowPostCheck, handleQuickStageCompletion, handleExecuteWaveArtifact, handleExecuteWorktreeCleanup, handleScanStageCompleted } from './complete-handlers.js'
import { stageRegistry } from '../stages/index.js'
import { formatExecuteSummary } from '../worktree-apply.js'

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

export async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
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

