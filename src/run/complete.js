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
import { triggerSync, WAIT_MARKER_RE, getStageSteps, formatWaitOptions } from './shared.js'
import { outputStep } from './prompt.js'
import { enforceDepsGate, enforceReviewJsonGate, runStageCompletionGates } from './gates.js'
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
 * 读取 design.md frontmatter 的 scale 字段（brainstorm 末步写入 'small'|'large'）。
 * completeStep 的下一步提示据此分叉：small→quick，large/读不到→plan（fail-safe 走重流程）。
 * 只解析首个 YAML frontmatter 块，避免误读正文里的 "scale:"。
 */
function readDesignScale(specBase, changeName) {
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
  let currentIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  // ── 坑1：--done --answer 解「已 waiting 的步骤」──
  // findIndex 仅查 pending/in-progress，排除 waiting；故 --done --answer 落到已 --wait 暂停的
  // requiresWait 步骤时会跳过它、把 --answer 静默丢弃，步骤永久卡 WAITING、末步报「等待用户输入」。
  // 修复：带 doneAnswer 且存在 waiting 步骤时，把首个 waiting 拉回 pending + 补 waitAnswer，主流程
  // requiresWait 门控见 waitAnswer 已置→不阻断→正常 completed。仅 --answer 触发，普通 --done 零变化。
  const _resolvedWaitIdx = resolveWaitingStepWithAnswer(steps, options && options.doneAnswer, new Date().toLocaleString('zh-CN', { hour12: false }))
  if (_resolvedWaitIdx !== -1) {
    currentIdx = _resolvedWaitIdx
    console.log(`⚠️  Step "${steps[_resolvedWaitIdx].name}" 此前处于 waiting，--done --answer 已补回答并拉回待完成。`)
  }
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
  // review.json 字段硬门（坑 review-json-field-gap）：已勾 [x] task 的 review.json 必须 schema 完整，
  // 提前到每次 --done 校验（而非等 Task Review Gate 在整阶段收尾才暴露，迫使用户事后批量补）。
  await enforceReviewJsonGate(stageName, cwd, changeName, steps[currentIdx], steps, currentIdx, specBase, platformOpts)

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
      const _drafts = await generateTaskReviewDrafts({ changeName, cwd, platformOpts })
      if (_drafts.generated > 0) {
        console.log('   📄 自动补写 ' + _drafts.generated + ' 个 per-task review.json 草稿（cannot_verify，主 agent 实现模式兜底，需 agent 复核后升级为 pass/fail）')
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
      await pm._write(cwd, progress, changeName)
      const wsIdx = steps.findIndex(s => s.status === 'waiting')
      console.log(`\n⏸️  阶段暂停：Step ${wsIdx + 1} 等待用户输入`)
      if (steps[wsIdx].waitReason) console.log(`   原因：${steps[wsIdx].waitReason}`)
      return { stageCompleted: false, currentIdx, nextPendingIdx: -1 }
    }
    // quick 收尾（W6 Step6b 抽至 complete-handlers.js handleQuickStageCompletion）
    await handleQuickStageCompletion({ stageName, steps, currentIdx, cwd, progress, changeName, specBase, outputText, confirm, isForceBaseline, isAllowNew, platformOpts })

    // ── reopen --done 回填（坑 brainstorm-reopen-step-state-desync）──
    // nextPendingIdx === -1 且无 waiting，说明要进阶段完成分支。此时若存在 stale 步骤
    // （reopen --from-step N 把 N+1..end 置 stale，但方案未变、无需重跑），需同步回填为
    // completed，否则进度数字与实际步骤明细矛盾（阶段已完成 + 6/8）。
    // 安全边界：仅进入阶段完成分支时才回填（stale 本就被跳过、不回填也照常标 completed），
    // 不改变单步推进行为；stale 若确需重跑，运行流（stage.js:141-148）会先于本分支转 pending 执行。
    const staleSteps = steps.filter(s => s.status === 'stale')
    if (staleSteps.length > 0) {
      const nowStr = new Date().toLocaleString('zh-CN',{hour12:false})
      for (const st of staleSteps) {
        st.status = 'completed'
        st.completedAt = st.completedAt || nowStr
      }
      await pm._write(cwd, progress, changeName)
      console.log(`  ⚠️ 同步回填 ${staleSteps.length} 个 stale 步骤为 completed（reopen --from-step N 后 --done，方案未变）`)
    }

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
    // task-08：底部锚定行——outputStep 渲染的长 prompt 易被 tail 截断，末尾再打一行推进位置，
    // 让 agent 只看末几行也能知道「推进到第几步」。仅单步推进分支（阶段完成分支已有 ✅ 阶段已完成）。
    // defSteps 越界防御：平台模式 buildPlanSteps 长度漂移时 nextPendingIdx 可能越界
    // （参照 prompt.js:174-179 越界降级先例），越界时静默跳过，不崩。
    if (defSteps && defSteps[nextPendingIdx]) {
      console.log(`\n🚀 advanced to step ${nextPendingIdx + 1}/${steps.length}: ${defSteps[nextPendingIdx].name}`)
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
async function autoCheckPlanFromReviews({ stageName, changeName, cwd, platformOpts }) {
  if (stageName !== 'execute' || !changeName) {
    return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
  }
  try {
    const specBaseLc = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const changeDir = join(specBaseLc, 'changes', changeName)
    const planPath = join(changeDir, 'plan.md')
    const runtimeRoot = platformOpts?.runtimeRoot || join(specBaseLc, '.runtime')
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    if (!existsSync(planPath) || !existsSync(runIdFile)) {
      return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
    }
    const executeRunId = readFileSync(runIdFile, 'utf8').trim()
    const planContent = readFileSync(planPath, 'utf8')
    const { readReview } = await import('../task-review.js')
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
    }
    return { autoChecked: checkedCount > 0, checkedCount, skippedCount }
  } catch {
    return { autoChecked: false, checkedCount: 0, skippedCount: 0 }
  }
}

/**
 * execute 批量完成检测：plan.md 所有 task checkbox 已勾 + 代码客观核验非零变更 →
 * 把剩余 pending/in-progress step 一次性标 completed，使 completeStep 本次 --done 即进入阶段完成
 * 分支（而非逐次 +1）。治"3 Wave 全做完仍显示未开工、需重走 7 次 --done"。
 * 复用现成能力：readPlanCheckboxStatus（plan 勾选状态）+ checkExecuteCodeEvidence（代码客观核验，
 * 与 doctor --align-execute-progress 同源，D-002/D-004）。仅在 stageName==='execute' && changeName 触发。
 *
 * 安全门：plan 零 checkbox / 未全勾 / 代码零变更（unchanged）均不批量——信任 plan 声明但用代码核验兜底。
 * @returns {Promise<{batched:boolean, aligned:number, reason?:string}>}
 */
async function detectExecuteBatchFinish({ pm, stageName, changeName, cwd, specBase, steps }) {
  if (stageName !== 'execute' || !changeName) return { batched: false, aligned: 0 }
  try {
    const changeDir = join(specBase, 'changes', changeName)
    const { total: planTotal, checked: planChecked } = pm.readPlanCheckboxStatus(changeDir)
    if (planTotal === 0) return { batched: false, aligned: 0, reason: 'plan.md 无 task checkbox' }
    if (planChecked < planTotal) {
      return { batched: false, aligned: 0, reason: `plan 未全勾（${planChecked}/${planTotal}）` }
    }
    // plan 全勾 → 代码客观核验（防 plan 被手动勾伪造导致空完成）
    const { checkExecuteCodeEvidence } = await import('../stage-contract.js')
    const evidence = checkExecuteCodeEvidence(cwd, changeName)
    if (evidence.status === 'unchanged') {
      return { batched: false, aligned: 0, reason: `代码零变更（${evidence.detail}）` }
    }
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
  } catch {
    return { batched: false, aligned: 0 }
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
    console.error('没有处于等待状态的步骤')
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
        const { WorktreeManager } = await import('../worktree.js');
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

