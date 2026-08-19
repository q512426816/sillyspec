/**
 * run/stage.js（W6 Step8b 从 run.js 抽出）。
 *
 * `run <stage>` 默认路径的执行主干（runStage）+ 其私有 helper：
 *   - runStage：输出当前 step prompt（重 execute/scan/quick 启动期副作用——worktree 创建、
 *     executeRunId 固定、scanProfile 裁剪、quick baseline 录入、plan design 契约校验、noAI 步骤代理）
 *   - autoDetectChange：唯一变更目录时自动设置 currentChange（runStage 私有）
 *   - executePlanPostcheck：noAI planPostcheck 步骤代理（runStage 私有）
 *   - ensureDepsFreshness：execute 入口已存在 worktree 时 deps 自检重供给（runStage 私有）
 *
 * 安全锚：run.js 始终 barrel。runStage 由 run.js import 回来（无 test 直接 import，无需 re-export）。
 * checkApproval（runStage + runAutoMode 共用）已先下沉 shared.js（Step8a），避免 command/stage 环依赖。
 *
 * 路径修正（相对 src/run/）：
 *   - 动态 import './worktree.js' / './task-review.js' / './stages/plan.js' /
 *     './stages/plan-postcheck.js' / './worktree-deps.js' → '../'（src/ 下退一层）
 *   - 'child_process'（execSync）裸模块名不变
 */
import { join, dirname } from 'node:path'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { writeAtomicSync } from '../fs-atomic.js'
import { resolveSpecDir, resolveChangeDir, resolveRuntimeRoot, resolveQuickSessionsDir, triggerSync, safeGit, parsePorcelainPath, formatWaitOptions, checkApproval, getStageSteps } from './shared.js'
import { computeScanProfile, applyScanProfileSteps, executeScanPreflight, executeScanPostcheck } from './scan-profile.js'
import { outputStep } from './prompt.js'
import { allocateQuicklogEntry, deriveTitleFromLinkedChange, sanitizeDesc } from '../quicklog.js'
import { createHash } from 'node:crypto'
import { checkTransition } from '../stage-contract.js'
import { AUXILIARY_STAGES } from '../constants.js'
import { completeStageGates } from './gates.js'

export async function runStage(pm, progress, stageName, cwd, changeName, skipApproval = false, platformOpts = {}, quickOpts = {}) {
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
    const { WorktreeManager } = await import('../worktree.js')
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
    const { generateExecuteRunId, isValidExecuteRunId } = await import('../task-review.js')
    const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const runtimeRoot = resolveRuntimeRoot(platformOpts, execSpecBase)
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    mkdirSync(runtimeRoot, { recursive: true })
    // 优先读取已有的变更专属标记文件（agent 可写内容，格式校验防注入/穿越，非法视为缺失重生成）
    try {
      if (existsSync(runIdFile)) {
        const c = readFileSync(runIdFile, 'utf8').trim()
        if (c && !isValidExecuteRunId(c)) {
          console.warn(`⚠️ execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），重新生成`)
        } else {
          currentExecuteRunId = c
        }
      }
    } catch {}
    if (!currentExecuteRunId) {
      currentExecuteRunId = generateExecuteRunId()
      // D-001#1 主写入点：mkdir execute-runs/<runId>/tasks 先于 marker（不变量：marker 在则目录在，
      // archive 完成度扫描/漂移兜底不再落到「有 marker 无目录」的空 run）。失败直接 throw——execute
      // 启动即失败优于事后 review 错配（调用方 runCommand 冒到 CLI 顶层 exit 1，给出修复指引）。
      try {
        mkdirSync(join(runtimeRoot, 'execute-runs', currentExecuteRunId, 'tasks'), { recursive: true })
      } catch (e) {
        throw new Error(`execute run 目录创建失败（${join(runtimeRoot, 'execute-runs', currentExecuteRunId)}）: ${e.message}；` +
          `请检查该路径是否为普通文件/只读，清理后重跑（sillyspec run execute --change ${changeName} --skip-approval）`)
      }
      writeFileSync(runIdFile, currentExecuteRunId + '\n')
    }
  }

  // 自动探测 currentChange
  if (autoDetectChange(progress, cwd)) {
    progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
    pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)
  }

  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  // 用户显式调用 sillyspec run <stage>：把它标记为当前阶段
  // （D-003@v1：auxiliary 阶段不写 currentStage，避免 scan/quick/explore/archive/status/doctor
  //   执行后污染主流程当前阶段；lastActive 心跳与 pm._write/triggerSync 照常）
  if (progress.currentStage !== stageName) {
    if (!AUXILIARY_STAGES.includes(stageName)) {
      progress.currentStage = stageName
    }
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    pm._write(cwd, progress, changeName)
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
    pm._write(cwd, progress, changeName)
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
    pm._write(cwd, progress, changeName)
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
    pm.completeStage(cwd, stageName, changeName)
    const after = pm.read(cwd, changeName)
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
    // quick-sessions 目录经 resolveQuickSessionsDir 单一解析（multi-agent-review Q4）：
    // 平台模式 runtimeRoot 与 specBase/.runtime 不同时，写/读须对齐，否则 guard 写一处、收尾读另一处。
    const sessionGuardDir = join(resolveQuickSessionsDir(platformOpts, specBase), changeName)
    const guardFile = join(sessionGuardDir, 'guard.json')
    let existingGuard = null
    try {
      if (existsSync(guardFile)) existingGuard = JSON.parse(readFileSync(guardFile, 'utf8'))
    } catch {}
    if (existingGuard) {
      // 跨进程重入：复用已分配的 ql-ID，跳过 baseline 重捕与分配（幂等）
      progress.quickGuard = existingGuard
    } else {
      // baseline 采集用 safeGit（带 -c safe.directory，避免 linked worktree/容器异 uid/Windows 挂载点
      // 下裸 `git status` 抛错）。safeGit 已消除 safe.directory 类失败；若仍失败（真非 git 目录等），
      // 不硬阻断 quick 启动（平台模式/非 git 目录仍需渲染 step prompt），但 fail-visible：大声 warn +
      // baseline 置空。--done 时 auditQuickCompletion 的 safeGit 同样失败 → blocked，故不存在「静默
      // 完成」路径（multi-agent-review Q3）。
      const statusResult = safeGit(cwd, ['status', '--porcelain'], { trim: false })
      if (statusResult.error) {
        console.warn(`⚠️ quick baseline 采集失败（git status）: ${statusResult.error}`)
        console.warn(`   baseline 置空；--done 审计将因 git 不可用而阻断（无静默完成路径）。`)
        console.warn(`   排查：仓库 safe.directory 配置 / 非 git 目录。`)
      }
      try {
        const gitStatus = statusResult.value || ''
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
        const allowDelete = quickOpts?.isAllowDelete || false
        const forceBaseline = quickOpts?.isForceBaseline || false
        const linkedChanges = Array.isArray(quickOpts?.linkedChanges) ? quickOpts.linkedChanges : []
        // CLI 接管：分配 ql-ID + 写 QUICKLOG「进行中」条目 + 关联 tasks.md（持锁、当天唯一）
        const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
        // 标题回退：启动 quick 不带 --input 时，从关联变更的 proposal/design 提取语义标题，
        // 避免 QUICKLOG/tasks.md 落 (quick 任务) 占位（deriveTitleFromLinkedChange 读不到则空→sanitizeDesc 回退占位）。
        let quickDesc = quickOpts?.taskDescription || ''
        if (!quickDesc && linkedChanges.length > 0) {
          quickDesc = deriveTitleFromLinkedChange(specBase, linkedChanges[0])
        }
        const { qlId } = await allocateQuicklogEntry(specBase, gitUser, {
          description: quickDesc,
          linkedChanges,
          allowedFiles,
        })
        progress.quickGuard = {
          sessionId: changeName,
          // 锚定创建时的 specBase（坑 quick-cwd-drift-splits-specdir）：sessionId 全局复用但
          // guard 按 specDir 落盘，记下归属让漂移可自证（detectQuickSessionDrift 靠目录定位即可，
          // 此字段供诊断/未来一致性校验）。
          specDir: specBase,
          name_zh: '快速任务守卫',
          baselineCommit: safeGit(cwd, ['rev-parse', 'HEAD']).value,
          baselineFiles,
          allowedFiles,
          // task-01: 录每个 allowedFile 内容 sha256，供 --done auditQuickCompletion 检测同文件并发
          // （allowedFile 在 baseline 且当前 hash ≠ 此值 = 我也改了 → 同文件并发 warn）。文件不存在/读失败跳过。
          allowedFilesHash: Object.fromEntries(allowedFiles.flatMap(f => {
            try { return [[f, createHash('sha256').update(readFileSync(join(cwd, f))).digest('hex')]] }
            catch { return [] }
          })),
          allowNew,
          allowDelete,
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
        if (allowDelete) parts.push('允许删除文件')
        console.log(`🛡️ quick 变更边界已记录: ${parts.join(', ')}`)
        console.log(`📝 QUICKLOG 条目已创建: ${qlId}`)
        // 回填 DB changes 行的 title + quicklog_id，让 quick-<hex> 可读、DB↔QUICKLOG 可对账。
        // title 用 quickDesc（任务描述或关联变更标题）经 sanitizeDesc 压一行限长，与 QUICKLOG 条目标题同源。
        try {
          pm.updateChangeMeta(cwd, changeName, { title: sanitizeDesc(quickDesc), quicklogId: qlId });
        } catch { /* 回填失败不阻断 quick 启动 */ }
        pm._write(cwd, progress, changeName)
        // ql-20260819-009：起步即推「进行中」占位条目到平台。runStage 前段三处 triggerSync
        // （autoDetectChange / currentStage 切换 / stale 复位）全在本块之前执行——「进行中」骨架
        // 此前要等第一次 --done 才上平台，平台快速修复列表存在起步盲窗。此刻骨架已分配 + 进度已
        // 落盘，补一次 triggerSync 立即推 QUICKLOG（quick-<hex8> 会话自动降级 syncSpecTreeOnly
        // 只推 spec 树；未连接平台静默跳过、8s 熔断 best-effort，均不阻断 quick 启动）。平台派发
        // （claim）模式起步同样走 runStage 本块，一处插入全覆盖；guard 已存在的跨进程重入走上方
        // existingGuard 分支跳过本块，条目已在平台，不重复推。
        triggerSync(cwd, changeName, platformOpts)
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
      const { validateDesignForPlan } = await import('../stages/plan.js')
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
      } else {
        throw new Error(`noAI 步骤 ${stepName} 的未知 _cliAction: ${cliAction}——请在 stage.js 注册对应分支`)
      }
      stageData.steps[currentIdx].status = 'completed'
      stageData.steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      pm._write(cwd, progress, changeName)
      // 自动前进到下一步
      const nextIdx = stageData.steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
      if (nextIdx !== -1 && defSteps[nextIdx]) {
        console.log('')
        await outputStep(stageName, nextIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
      } else {
        // 所有步骤完成
        stageData.status = 'completed'
        stageData.completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
        // persist _write 移到 completeStageGates 成功之后（task-02 / review-2026-08-09 #2）：gate 异常/失败 → rollback 回 in-progress 落盘，此处未到 _write，DB 不留假 completed。
        // 阶段完成收尾共享管线（noAI 末步核心修复 S1：plan postcheck independent-tier review verdict=fail /
        // 平台 scan manifest 此前被绕过）。gate 失败已 rollback 为 in-progress，early-return（不 fall through 到末尾 return）。
        const _stageGatesResult = await completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText: null })
        // task-04 / A5：gate 失败（stageCompleted===false）设进程退出码 1（与 completeStep/continueStep 同语义）。
        if (_stageGatesResult?.stageCompleted === false) process.exitCode = 1
        if (_stageGatesResult) return _stageGatesResult
        // gate 全过：persist completed（task-02 移后；此处无 triggerSync，与同文件 noAI 末步语义一致）。
        pm._write(cwd, progress, changeName)
        console.log(`\n✅ ${stageName} 阶段全部完成。`)
      }
      return
    }
    await outputStep(stageName, currentIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}






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
 * Plan postcheck 的执行代理：委托给 plan-postcheck.js 模块
 */
async function executePlanPostcheck(cwd, platformOpts, progress) {
  // resolveChangeDir 从 ./shared.js 导入（W6 Step1 抽出的纯函数，原 run.js 本地函数）；历史上曾误从 ./modules.js
  // 导入（该模块未导出此函数，得到 undefined），导致 plan-postcheck.js:388 抛
  // "resolveChangeDir is not a function"。详见 docs/sillyspec/plan-postcheck-resolvechangedir-not-a-function.md
  const { executePlanPostcheck: runPostcheck } = await import('../stages/plan-postcheck.js')
  await runPostcheck({
    cwd,
    specRoot: platformOpts?.specRoot,
    resolveChangeDir,
    progress
  })
}



/**
 * execute 入口 deps 自检（D-002，change 2026-06-28-worktree-deps-provision）。
 * 已存在 worktree（create short-circuit 不供给）时，校验 deps 状态缺失/漂移 → 触发 provisionDeps 重供给并写回 meta。
 *
 * 判定改调共享 checkDepsFreshness（H1，change 2026-08-05-tooling-feedback-fixes task-04）：
 *   - status ∈ {missing, stale, main-drift, failed} → 触发重供给（main-drift 为新增主仓 lockfile 漂移触发）
 *   - status === fresh → 跳过
 *   行为与原内联 noStatus/missing/stale 三判定等价（provisionDeps 调用 / meta 写回不变），新增 main-drift 触发。
 */
async function ensureDepsFreshness(cwd, changeName, specBase, worktreeMeta) {
  if (!worktreeMeta || !worktreeMeta.worktreePath) return
  const { provisionDeps, checkDepsFreshness } = await import('../worktree-deps.js')
  const wtPath = worktreeMeta.worktreePath
  const fresh = checkDepsFreshness(worktreeMeta, wtPath, cwd)
  if (fresh.status === 'fresh') return
  const reason = fresh.detail || fresh.status
  console.log(`🔄 worktree deps 自检：${reason}（depsStatus=${worktreeMeta.depsStatus || 'unknown'}），重新供给...`)
  let deps = {}
  try {
    deps = provisionDeps(wtPath, cwd, { specBase }) || {}
  } catch (e) {
    deps = { depsStatus: 'failed', depsError: `provisionDeps crashed: ${e.message}` }
  }
  try {
    const { WorktreeManager } = await import('../worktree.js')
    const metaPath = join(new WorktreeManager({ cwd }).getWorktreePath(changeName), 'meta.json')
    const updated = { ...worktreeMeta, ...deps }
    writeAtomicSync(metaPath, JSON.stringify(updated, null, 2) + '\n')
    console.log(`✅ deps 重新供给完成：depsStatus=${deps.depsStatus}`)
  } catch (e) {
    console.warn(`⚠️  deps meta 写回失败：${e.message}`)
  }
}

