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
import { existsSync, readdirSync, readFileSync, mkdirSync, rmSync, unlinkSync } from 'node:fs'
import { writeAtomicSync } from '../fs-atomic.js'
import { resolveSpecDir, resolveChangeDir, resolveRuntimeRoot, resolveQuickSessionsDir, triggerSync, safeGit, formatWaitOptions, checkApproval, getStageSteps, warnApprovalUnknown, predictProtectedQuickFiles, mergeQuickBoundaryFiles, readStageBurst, STAGE_BURST_STAGES, readStageWall, STAGE_WALL_STAGES } from './shared.js'
import { computeScanProfile, applyScanProfileSteps, executeScanPreflight, executeScanPostcheck, executeScanDetectProjects, executeScanResumeCheck, executeScanFinalize } from './scan-profile.js'
import { executeProgressConfirm } from './progress-confirm.js'
import { outputStep, collectStageWaitHistory } from './prompt.js'
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

  // ── 阶段墙 hard 门（R16 减负批次 A 相位，2026-09-24；R16-b 实证修正 2026-09-25）──
  // 拦「前驱刚收口、未执行 handoff 切割、目标阶段首次进入」的硬续形态。三个放行口：
  // ①sillyspec handoff 已在前驱收口后执行（ledger.handoffAt > ledger.at——handoff 协议要求
  //   新会话保持同一 SILLYSPEC_SESSION_ID，SESSION_ID 相同不是硬续证据，切割凭证=handoff 动作）；
  // ②目标阶段已有 stage 数据（reopen/复跑重入——保住 verify FAIL→execute --reopen 修复回路）；
  // ③--same-session 显式逃生口。fail-open：ledger 缺失/读失败/会话标识缺省 → 放行。
  if (STAGE_WALL_STAGES.includes(stageName) && changeName && !(quickOpts && quickOpts.sameSession)) {
    try {
      if ((await readStageWall(cwd)) === 'hard') {
        const curSession = process.env.SILLYSPEC_SESSION_ID || ''
        const wallStageData = progress.stages && progress.stages[stageName]
        const firstEntry = !wallStageData || !Array.isArray(wallStageData.steps) || wallStageData.steps.length === 0
        const wallLedgerPath = join(specBase, '.runtime', `stage-session-ledger-${changeName}.json`)
        if (curSession && firstEntry && existsSync(wallLedgerPath)) {
          const wallLedger = JSON.parse(readFileSync(wallLedgerPath, 'utf8'))
          const { isStageWallBlocked } = await import('./shared.js')
          if (isStageWallBlocked({ ledger: wallLedger, curSession, stageName, stageHasData: !firstEntry })) {
            console.error(``)
            console.error(`⛔ 阶段墙（stage.wall=hard）：本变更刚在会话标识 ${curSession} 下收口 ${wallLedger.lastStage}，${stageName} 须在新会话执行。`)
            console.error(`   单会话历史重放税实测：R15 execute 段均轮 263K 输入（断崖拆会话后回落 120-170K）——${stageName} 的全部输入在盘上（design/plan/tasks/review），新会话零背景可续跑。`)
            console.error(`   动作：`)
            console.error(`   1. sillyspec handoff --change ${changeName}   # 生成交接块（即切割凭证，生成后墙自动放行）`)
            console.error(`   2. 新会话粘贴交接块 → sillyspec run ${stageName} --change ${changeName}`)
            console.error(`   逃生口：确认要同会话硬续（应急/平台编排）→ 加 --same-session 重跑本命令。`)
            process.exit(1)
          }
        }
      }
    } catch { /* fail-open：任何读取/解析失败放行，行为与无墙一致 */ }
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
      // HUB-07：unknown（连接了平台但 404/断网/非 JSON）此前静默落空（fail-open 无提示）——
      // 醒目警告 + 留痕，放行但可审计
      if (approval.status === 'unknown') {
        warnApprovalUnknown(cwd, changeName, approval.reason)
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
        const result = wm.create(effectiveChange, { adoptBranch: !!(quickOpts && quickOpts.adoptBranch) })
        console.log(`🔗 worktree 已创建: ${result.worktreePath} (分支: ${result.branch}, 模式: ${result.mode}${result.adoptedBranch ? ', 收编既有分支' : ''})`)
      } catch (e) {
        console.error(`❌ worktree 创建失败: ${e.message}`)
        // 修复建议不再无条件推荐 git branch -D（坑 worktree-user-branch-conflict，2026-08-24：
        // 同名分支可能是用户有意创建的——分支冲突时 create 报错已带三选一决策菜单，删不删
        // 交由菜单/人工判断；doctor 的分支删除也有 review 锚点 + 无库保守双保护）。
        console.error(`   修复建议：`)
        console.error(`   1. 同名分支冲突/收编：按上方报错内三选一菜单处置（遗留分支确认作废后才删；用户指定分支用 --adopt-branch 收编）`)
        console.error(`   2. worktree 状态异常：sillyspec worktree doctor --fix（分支删除有 review 锚点保护，不会误删在用分支）`)
        console.error(`   3. 目录残留：确认无未提交改动后清理 .sillyspec/.runtime/worktrees/${effectiveChange}/ 再重试`)
        process.exit(1)
      }
    }
    // 入口 deps 自检（D-002）：已存在 worktree（create short-circuit 不供给）时重供给
    if (existingMeta) {
      const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      await ensureDepsFreshness(cwd, effectiveChange, execSpecBase, existingMeta)
    }

    // ── 跨仓仓 worktree 隔离（坑 cross-repo-no-worktree-isolation，2026-08-27 用户实证）──
    // 主仓 worktree 就绪后，为 plan 声明的每个跨仓仓建同构 worktree（幂等）。此前跨仓 task 直写
    // 跨仓主工作副本，与用户在途改动混流、无 base 锚、无回滚面。fail-closed：建不起来不开工
    //（对齐主仓 create 语义）。
    try {
      const { ensureCrossWorktrees } = await import('../worktree-cross.js')
      const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      const cross = ensureCrossWorktrees({ cwd, changeName: effectiveChange, specBase: execSpecBase })
      for (const c of cross.created) {
        console.log(`🔗 跨仓 worktree 已创建: repo=${c.repoKey} → ${c.worktreePath}`)
      }
      for (const r of cross.reused) {
        console.log(`🔗 跨仓 worktree 已存在: repo=${r.repoKey} → ${r.worktreePath}`)
      }
    } catch (e) {
      console.error(`❌ 跨仓 worktree 创建失败: ${e.message}`)
      console.error(`   修复后重跑本命令（已建成功的仓会幂等复用）。`)
      process.exit(1)
    }
  }

  // ── execute 阶段启动时固定 executeRunId（绑定变更名，避免跨变更复用） ──
  let currentExecuteRunId = null
  if (stageName === 'execute') {
    const { generateExecuteRunId, isValidExecuteRunId, claimExecuteRunId } = await import('../task-review.js')
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
      currentExecuteRunId = generateExecuteRunId(changeName)
      // D-001#1 主写入点：mkdir execute-runs/<runId>/tasks 先于 marker（不变量：marker 在则目录在，
      // archive 完成度扫描/漂移兜底不再落到「有 marker 无目录」的空 run）。失败直接 throw——execute
      // 启动即失败优于事后 review 错配（调用方 runCommand 冒到 CLI 顶层 exit 1，给出修复指引）。
      try {
        // 排他认领（坑 exec-run-id-same-second-collision，2026-09-10 驾驭小结①）：并行会话同秒
        // 生成同一 runId 时在认领处消解（碰撞换随机后缀），per-task review.json 不再跨变更互相覆盖
        currentExecuteRunId = claimExecuteRunId(runtimeRoot, currentExecuteRunId)
        mkdirSync(join(runtimeRoot, 'execute-runs', currentExecuteRunId, 'tasks'), { recursive: true })
      } catch (e) {
        throw new Error(`execute run 目录创建失败（${join(runtimeRoot, 'execute-runs', currentExecuteRunId)}）: ${e.message}；` +
          `请检查该路径是否为普通文件/只读，清理后重跑（sillyspec run execute --change ${changeName} --skip-approval）`)
      }
      writeAtomicSync(runIdFile, currentExecuteRunId + '\n')
      // change 归属戳（坑 worktree-cleanup-marker-chain 根治）：run 目录自带变更身份，
      // marker 断裂（worktree cleanup / 归档清理 / 并行误删）后按戳归属，不再错配其他变更的 run
      const { stampExecuteRunChange } = await import('../task-review.js')
      stampExecuteRunChange(runtimeRoot, currentExecuteRunId, changeName)
      // execute-runs 回收不在此处（ql-20260908-005/006 已定分野）：变更归属类证据走归档时
      // 精确回收（complete-handlers pruneArchivedChangeRuntime）+ doctor --gc-unstamped-runs
      // 清存量；写入侧 keep-N 滚动是启发式，会误删活跃变更的旧 run，不进证据类目录。
    }
  }

  // ── 跨变更文件冲突预警（坑 cross-change-conflict-no-warning，2026-08-22 实证：并行变更改
  // 同一文件靠人工发现——f578a08e 的「锚点更新」是好实践但工具无预警）。execute 启动时把本变更
  // 的 diff 文件集与其他活跃变更的 diff 文件集求交集，advisory warn 交集与对端变更名 + 锚点
  // 更新提示。best-effort：任何异常静默跳过（预警不阻断 execute 启动）。
  if (stageName === 'execute' && changeName) {
    try {
      const { resolveVerifyChangedFiles } = await import('../verify-postcheck.js')
      const activeChanges = (pm.listChanges(cwd) || []).filter(c => c && c !== changeName)
      if (activeChanges.length > 0) {
        const myFiles = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase }) || []
        const mySet = new Set(myFiles.map(f => f.replace(/\\/g, '/')).filter(f => !f.startsWith('.sillyspec/')))
        if (mySet.size > 0) {
          const conflicts = []
          for (const other of activeChanges) {
            const otherFiles = resolveVerifyChangedFiles(cwd, other, null, { includeWorkingTree: true, specBase }) || []
            const overlap = [...new Set(otherFiles.map(f => f.replace(/\\/g, '/')))]
              .filter(f => mySet.has(f))
            if (overlap.length > 0) conflicts.push({ other, overlap })
          }
          if (conflicts.length > 0) {
            console.warn(`⚠️ 跨变更文件冲突预警：本变更（${changeName}）与其他活跃变更改动重叠——`)
            for (const c of conflicts) {
              console.warn(`   与 ${c.other} 重叠 ${c.overlap.length} 个文件：${c.overlap.slice(0, 5).join(', ')}${c.overlap.length > 5 ? ` …（共 ${c.overlap.length}）` : ''}`)
            }
            console.warn(`   并行 apply/归档时重叠文件会互相覆盖或冲突。实践：后完成方在其 verify/design 里记录「锚点更新」`)
            console.warn(`  （说明基于对方已合入的版本重新锚定），并考虑串行化这两个变更的 apply。`)
          }
        }
      }
    } catch { /* 预警失败不阻断 execute */ }
  }

  // ── 共享主仓竞态防护（坑 parallel-shared-main-race，2026-08-23 实证：并行会话共享主仓
  // 工作区/共享部署库的竞态——文件被清、alembic 被推进、staged 混入他者文件）。execute/verify
  // 启动时探测三类信号并 advisory（不阻断——并发是合法工作模式，但要让 agent 知道环境在变）：
  //   1. 主仓未提交改动中含非本变更文件（staged 混入：commit 时注意 pathspec）
  //   2. worktree 存在时 base..HEAD 主仓推进（主仓在他者 apply 后已前进，diff 口径注意）
  // best-effort：异常静默。
  if ((stageName === 'execute' || stageName === 'verify') && changeName) {
    try {
      const mainDirty = (safeGit(cwd, ['status', '--porcelain'], { trim: false }).value || '')
        .split('\n').filter(Boolean).map(l => l.slice(3).trim().split(' -> ').pop() || '')
        .map(p => p.replace(/^"|"$/g, '').replace(/\\/g, '/'))
        .filter(p => p && !p.startsWith('.sillyspec/'))
      const myFiles = (await import('../verify-postcheck.js')).resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase }) || []
      const mySet = new Set(myFiles.map(f => f.replace(/\\/g, '/')))
      const foreign = mainDirty.filter(p => !mySet.has(p))
      if (foreign.length > 0) {
        console.warn(`⚠️ 主仓含 ${foreign.length} 个非本变更的未提交文件（并行会话工作/部署产物混入）——`)
        console.warn(`   提交时用精确 pathspec（勿 git add -A / 目录级 add 夹带）：${foreign.slice(0, 4).join(', ')}${foreign.length > 4 ? ` …` : ''}`)
        console.warn(`   交接物核对（文件被清/迁移被推进类异常）先确认是否他者会话所谓，再判定本变更问题。`)
      }
    } catch { /* 探测失败不阻断 */ }
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

  // stale/blocked 步骤视为可执行（等同于 pending）：
  //   stale = reopen 后未重做（原语义）；blocked = 门控（deps/review.json）阻断标记。
  // blocked 必须一并转换（坑 deps-gate-blocked-invisible 的路径①失效面）：reopen 后首个未完成
  // 步骤若是 blocked（早前门控阻断污染），只转 stale 会让 completeStep 的 findIndex(pending)
  // 跳过它、--done 永远撞 stale 门控报错——「逐个真实执行」指引失效。门控在 --done 时会
  // 重新校验，此处拉回 pending 不会绕过任何校验。
  if (currentIdx !== -1 && (steps[currentIdx].status === 'stale' || steps[currentIdx].status === 'blocked')) {
    console.log(`⚠️  Step "${steps[currentIdx].name}" 处于 ${steps[currentIdx].status}，已拉回待执行。`)
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
      // 原子写：hook 进程（worktree-guard 的 readScanGuard）并发读，裸 truncate→write 的
      // 半截窗口会被 JSON.parse 吞成 null → 覆盖保护静默失效（fail-open）
      writeAtomicSync(guardFile, JSON.stringify(scanGuard, null, 2) + '\n')
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
    // quick 通道直接退役（2026-09-25-quick-channel-retire，接替 thin-default-flip 的第 2 步横幅劝导）：
    // 新会话一律硬拒（见下方 !existingGuard 分支），在途会话（guard.json 存在）照常续跑/--done/--cancel
    // 收尾——--done/--cancel 不经 runStage，本门只拦「新会话创建」，拒绝发生在任何写入之前（零副作用）。
    // 受保护文件预告打印（坑 quick-protected-late-hint，2026-08-28 用户实证：scan 类文档
    // ARCHITECTURE/CONCERNS 属受保护基线，--files 声明了照样拦、必须 --force-baseline——
    // 设计合理但提示太晚。step1 即预告哪些声明文件会触发拦截，省一轮跑到 --done 才发现的往返）
    const warnProtectedQuickFiles = (protectedFiles) => {
      console.warn(`⚠️ 声明文件中 ${protectedFiles.length} 个属受保护/危险范围，--done 审计将拦截（--files 只声明归属，不解锁拦截）：`)
      for (const f of protectedFiles) console.warn(`   - ${f}`)
      console.warn(`   确认要改这类文件：本会话收尾带 --force-baseline（sillyspec run quick --done --force-baseline ...）；`)
      console.warn(`   属误判或不该由本会话改：换出 --files 声明，或走完整流程（execute 有 review 把关）。`)
    }
    // quick-sessions 目录经 resolveQuickSessionsDir 单一解析（multi-agent-review Q4）：
    // 平台模式 runtimeRoot 与 specBase/.runtime 不同时，写/读须对齐，否则 guard 写一处、收尾读另一处。
    const sessionGuardDir = join(resolveQuickSessionsDir(platformOpts, specBase), changeName)
    const guardFile = join(sessionGuardDir, 'guard.json')
    let existingGuard = null
    try {
      if (existsSync(guardFile)) existingGuard = JSON.parse(readFileSync(guardFile, 'utf8'))
    } catch {}
    if (existingGuard) {
      // 在途会话提示（每次渲染一行，防 agent 把后续新工作又开成 quick）：本会话收尾不受退役影响
      console.log(`ℹ️ quick 通道已退役——本会话为升级前在途会话，可继续收尾（--done / --cancel）；新工作走轻量变更 flow start。`)
      // 跨进程重入：复用已分配的 ql-ID，跳过 baseline 重捕与分配（幂等）
      progress.quickGuard = existingGuard
      // 中途追加边界：会话中途发现要改启动声明外的文件，此前 resume 会把 --files 静默丢弃、
      // 边界冻结在启动时刻，只能靠事后归属/审计行兜底。恢复时带 --files 即并入 allowedFiles
      // （追加不替换、去重保序，mergeQuickBoundaryFiles 与 --done 收尾路径同源），同时点录
      // allowedFilesHash 供同文件并发检测（文件不存在跳过，与启动同语义）。--done 审计直读
      // guard.json（complete-handlers §4.6），追加即被归属消费。
      const resumeFiles = Array.isArray(quickOpts?.quickFiles) ? quickOpts.quickFiles.filter(Boolean) : []
      if (resumeFiles.length > 0) {
        const { added } = mergeQuickBoundaryFiles(progress.quickGuard, resumeFiles, cwd)
        if (added.length > 0) {
          // 受保护文件预告（坑 quick-protected-late-hint）：追加声明若含审计将拦的文件，
          // 追加时即点破（省一轮跑到 --done 才发现）。--files 只声明归属，不解锁拦截。
          const protectedPreview = predictProtectedQuickFiles(added, {
            linkedChanges: progress.quickGuard.linkedChanges || [],
            forceBaseline: quickOpts?.isForceBaseline || false,
          })
          if (protectedPreview.length > 0) warnProtectedQuickFiles(protectedPreview)
          writeAtomicSync(guardFile, JSON.stringify(progress.quickGuard, null, 2))
          console.log(`🛡️ quick 边界已追加: ${added.length} 个文件（累计 ${progress.quickGuard.allowedFiles.length} 个）: ${added.join(', ')}`)
        }
      }
    } else {
      // quick 通道直接退役（2026-09-25-quick-channel-retire）：新会话硬拒 exit 1——本 else 分支
      // 原是 ql-ID 分配 / guard 落盘 / QUICKLOG 条目写入发生处，拒绝置于所有写入之前（零副作用）。
      // 判据与 D-003 幂等判据同源（guard.json 文件存在性），在途会话走上方 existingGuard 分支不受影响。
      // 注：CLI 进程入口的新会话已被 index.js refuseRetiredQuickFreshStart 预门拦下，本门兜底
      // 进程内直调 runCommand 的入口（测试/编程调用）与 --change 指向不存在会话的形态。
      console.error(`❌ quick 通道已退役，无法启动 quick 会话（若带 --change 则该会话不存在或已清理）。`)
      console.error(`   新工作请走轻量变更：sillyspec flow start --change <YYYY-MM-DD-名> --input "<动机与背景；随后独立一行『成功标准：』；再每行一条『- <可验证标准>』>"`)
      console.error(`   升级前进行中的 quick 会话仍可收尾：sillyspec run quick --change <会话ID> 续跑 / --done 收口 / --cancel 取消。`)
      // 进程内路径幻影残留清理（best-effort）：CLI 入口已被 index.js 预门拦下；进程内直调
      // runCommand 的新会话形态在 command.js 已生成 sid + owner.json + current-quick-run-id +
      // DB 活跃进度行。guard 从未落盘——清掉本 sid 的空会话目录、指向本 sid 的共享指针与 DB
      // 幻影行（防污染 listChanges / 多活跃判定），防 --done fallback 命中幻影。保护：guard.json
      // 存在（含损坏）绝不清目录/不注销（损坏可手修恢复，拒绝但保数据）；共享指针只在内容
      // 等于本 sid 时才动，他者会话标记不碰。
      try {
        if (!existsSync(guardFile) && /^quick-[0-9a-f]{8}$/.test(changeName)) {
          // 形态门（独立评审 P2 清偿）：清理/注销只对 quick 会话 id 形态执行——防任何把
          // 真实变更名带进本分支的路径误注销其 DB 行；非 sid 形态只拒绝不清理
          if (existsSync(sessionGuardDir)) rmSync(sessionGuardDir, { recursive: true, force: true })
          try { pm.unregisterChange(cwd, changeName) } catch { /* 行不存在等忽略 */ }
        }
        const marker = join(resolveRuntimeRoot(platformOpts, specBase), 'current-quick-run-id')
        if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === changeName) unlinkSync(marker)
      } catch { /* 清理失败不掩盖拒绝语义 */ }
      process.exit(1)
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
    // ── burst 渲染分支（2026-09-22-stage-burst-fold D-002/D-006/D-008，FR-02）──
    // 白名单主阶段 + readStageBurst 开启时走单趟折叠渲染：noAI 步就地 CLI 执行，AI 步逐个
    // 调既有 outputStep 一次下发全部剩余说明书（渲染器零改动）。waiting 步在此不可达——
    // runStage 对任一 waiting 步的硬拦（上方 waiting 检查块 exit(1) 指引 --continue）先于本分支。
    if (STAGE_BURST_STAGES.includes(stageName) && await readStageBurst(cwd)) {
      return await renderStageBurst({ stageName, defSteps, cwd, changeName, platformOpts, progress, pm, specBase, scanProfile, stageData })
    }
    // noAI 步骤自动完成（CLI-only，不需要 Agent 参与）
    if (defSteps[currentIdx].noAI || stageData.steps[currentIdx]?.noAI) {
      const stepName = defSteps[currentIdx].name
      const cliAction = defSteps[currentIdx]._cliAction || stageData.steps[currentIdx]?._cliAction
      console.log(`⚙️ Step ${currentIdx + 1}/${stageData.steps.length}: ${stepName}（CLI 自动执行，无需 Agent）`)
      await executeNoAiCliAction({ cliAction, stepName, stageName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile, stageData })
      stageData.steps[currentIdx].status = 'completed'
      stageData.steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      pm._write(cwd, progress, changeName)
      // 自动前进到下一步
      const nextIdx = stageData.steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
      if (nextIdx !== -1 && defSteps[nextIdx]) {
        console.log('')
        await outputStep(stageName, nextIdx, defSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, stageName))
      } else {
        // 所有步骤完成——收尾管线抽为 finalizeStageAllStepsDone（burst 全 noAI 场景共用，防第二副本）
        return await finalizeStageAllStepsDone({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, currentIdx })
      }
      return
    }
    await outputStep(stageName, currentIdx, defSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, stageName))
  }
}

// ── burst 阶段折叠助手族（2026-09-22-stage-burst-fold，D-002/D-006/D-008）──
// 白名单 STAGE_BURST_STAGES 自 shared.js import（与 command.js --done 分发门共用单一事实源）。

/**
 * noAI 步 _cliAction 分发（原 runStage noAI 分支 if-链原样抽取，D-008——常规单步路径与
 * burst 渲染循环共同调用，单一事实源防第三副本；行为零变化：同一 if-链、同一入参语义。
 * complete.js 的 --done 路径平行副本不动——"不改 completeStep 本体"边界）。
 */
async function executeNoAiCliAction({ cliAction, stepName, stageName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile, stageData }) {
  if (cliAction === 'scanPreflight') {
    await executeScanPreflight(cwd, platformOpts, scanProfile)
  } else if (cliAction === 'scanPostcheck') {
    await executeScanPostcheck(cwd, platformOpts, scanProfile)
  } else if (cliAction === 'scanDetectProjects') {
    await executeScanDetectProjects(cwd, platformOpts)
  } else if (cliAction === 'scanResumeCheck') {
    await executeScanResumeCheck(cwd, platformOpts)
  } else if (cliAction === 'scanFinalize') {
    await executeScanFinalize(cwd, platformOpts)
  } else if (cliAction === 'planPostcheck') {
    await executePlanPostcheck(cwd, platformOpts, progress)
  } else if (cliAction === 'doctorRunDiagnostics') {
    // 2026-09-09-doctor-noai FR-01：doctor 阶段折叠——noAI 步跑全量诊断
    // （八维 + 三新 detector）+ renderDoctorSummary 渲染 + doctor-diagnosis.json 落盘
    const { runDoctorDiagnostics, renderDoctorSummary, writeDoctorDiagnosis } = await import('../doctor-diagnostics.js')
    const diag = await runDoctorDiagnostics({ cwd })
    console.log(renderDoctorSummary(diag))
    try { writeDoctorDiagnosis(diag, (platformOpts?.specRoot || join(cwd, '.sillyspec'))) } catch { /* 落盘 fail-soft */ }
  } else if (cliAction === 'progressConfirm') {
    // 主流程 step1「进度确认」noAI 化（2026-09-07）：brainstorm/execute/verify——
    // 快照本就 CLI 注入、阶段路由已由 run 落定，省一轮「复述摘要→--done」往返
    executeProgressConfirm({ stageName, cwd, stageData, changeName, pm })
  } else if (cliAction === 'verifyRunQualityScan') {
    // P0-1（noai-ir-roadmap §3）：verify「运行测试和质量扫描」noAI 化——test/lint 实测提前，
    // 指纹落盘供 --done 复用免重跑（长套件不再跑两遍）；失败 throw 不盖 completed，
    // 输出 + 并行 WIP 归因提示透传给 agent（前置一/二）。
    const { executeVerifyQualityScan } = await import('./verify-quality-scan.js')
    await executeVerifyQualityScan({ cwd, specBase, changeName, platformOpts })
  } else if (cliAction === 'archiveDistill') {
    // P0-4 安全变体（noai-ir-roadmap §3）：archive「decision-distill 决策提炼」noAI 化——
    // 提炼本体是 CLI 纯函数（旧 prompt 即「调函数转述输出」纯中继）；needsWait 裁决收敛到
    // 「确认归档 --confirm」。全路径不抛（裁决是确认步输入，非本步阻断条件）。
    const { executeArchiveDistill } = await import('./archive-distill.js')
    await executeArchiveDistill({ cwd, specBase, changeName })
  } else {
    throw new Error(`noAI 步骤 ${stepName} 的未知 _cliAction: ${cliAction}——请在 stage.js 注册对应分支`)
  }
}

/**
 * 阶段全部步骤完成后的收尾管线（原 noAI 末步 :640-653 块原样抽取）——noAI 末步路径与
 * burst 渲染全 noAI 场景共用。gate 失败 rollback + exitCode 语义逐字保留：
 * persist _write 移到 completeStageGates 成功之后（gate 异常/失败 → rollback 回 in-progress
 * 落盘，DB 不留假 completed）；阶段完成收尾共享管线（plan postcheck independent-tier review
 * verdict=fail / 平台 scan manifest 不被绕过）。
 */
async function finalizeStageAllStepsDone({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, currentIdx }) {
  stageData.status = 'completed'
  stageData.completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  // 主阶段完成钉 currentStage（troubleshooting #56 根因修复，2026-09-08；与 complete.js 两处同语义）
  if (!AUXILIARY_STAGES.includes(stageName)) progress.currentStage = stageName
  const _stageGatesResult = await completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps: stageData.steps, currentIdx, outputText: null })
  // task-04 / A5：gate 失败（stageCompleted===false）设进程退出码 1（与 completeStep/continueStep 同语义）。
  if (_stageGatesResult?.stageCompleted === false) process.exitCode = 1
  if (_stageGatesResult) return _stageGatesResult
  // gate 全过：persist completed（此处无 triggerSync，与 noAI 末步语义一致）。
  pm._write(cwd, progress, changeName)
  console.log(`\n✅ ${stageName} 阶段全部完成。`)
  return undefined
}

/**
 * burst 折叠渲染（D-002，FR-02）：单趟遍历 defSteps——跳过 completed/skipped；noAI 步就地
 * CLI 执行 + 标完成落库（与单步 noAI 路径同语义）；AI 步逐个调既有 outputStep（渲染器零改动，
 * 首 AI 步的 persona/护栏注入由 outputStep 的 firstRenderableIdx 机制自然生效）。遍历后：
 * 无剩余步 → finalizeStageAllStepsDone 收尾（全 noAI 场景）；有剩余 → burst 尾提示。
 * blocked/stale 步按「非 completed/skipped」正常进说明书（currentIdx 的 stale/blocked 已在
 * runStage 上方拉回 pending；尾随 stale 步的完成侧拉回归 completeStepBurst 轮首，D-003@v2）。
 */
async function renderStageBurst({ stageName, defSteps, cwd, changeName, platformOpts, progress, pm, specBase, scanProfile, stageData }) {
  let lastNoAiIdx = -1
  for (let i = 0; i < defSteps.length; i++) {
    const st = stageData.steps[i]
    if (st && (st.status === 'completed' || st.status === 'skipped')) continue
    const isNoAI = defSteps[i]?.noAI || st?.noAI
    if (isNoAI) {
      const stepName = defSteps[i].name
      const cliAction = defSteps[i]._cliAction || st?._cliAction
      console.log(`⚙️ Step ${i + 1}/${stageData.steps.length}: ${stepName}（burst 就地 CLI 自动执行）`)
      await executeNoAiCliAction({ cliAction, stepName, stageName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile, stageData })
      if (st) {
        st.status = 'completed'
        st.completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      }
      pm._write(cwd, progress, changeName)
      lastNoAiIdx = i
      continue
    }
    await outputStep(stageName, i, defSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, stageName))
  }
  const remainingIdx = stageData.steps.findIndex(s => s && s.status !== 'completed' && s.status !== 'skipped')
  if (remainingIdx === -1) {
    // currentIdx=本轮最后执行的 noAI 步（与单步路径「刚执行步」同语义；尾随 skipped 场景不漂移——
    // Grill execute 轮 P2-1），防御回退 defSteps.length - 1
    return await finalizeStageAllStepsDone({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, currentIdx: lastNoAiIdx !== -1 ? lastNoAiIdx : defSteps.length - 1 })
  }
  console.log('')
  console.log('📦 burst 模式：本阶段全部说明书已一次下发。干完全部步骤后用一次 --done 收口（CLI 内部逐步推进+逐步校验，失败即停在失败步）。')
  return undefined
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

