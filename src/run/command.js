/**
 * run/command.js（W6 Step8c 从 run.js 抽出）。
 *
 * 命令分发层：runCommand（主入口，被 src/index.js + 6 个 test import）+ auto 模式 +
 * ensureStageSteps（被 step-migration test import）+ 4 个 runCommand 私有 helper
 * （resolveChangeName / resolveChangeNameAuto / showStatus / resetStage）。
 *
 * 调用图（单向，无环）：runCommand → { runStage(stage.js), runAutoMode, resetStage, showStatus,
 *   ensureStageSteps, completeStep/skip/wait/continue(complete.js) }；runAutoMode → { outputStep,
 *   completeStep, ensureStageSteps, checkApproval(shared) }，不调 runStage（内联 outputStep）。
 *
 * 安全锚：run.js 始终 barrel。runCommand + ensureStageSteps 被 test 直接 import → run.js barrel
 * re-export（契约保留）；其余 5 函数 runCommand 私有，无 test 直接 import。
 *
 * 路径修正（相对 src/run/）：
 *   - 动态 import './init.js' / './worktree.js' / './classify-change.js' → '../'（src/ 下退一层）
 *   - 'fs'（runCommand 内 await import('fs')）裸模块名不变
 *   - 静态 import './progress.js' / './stage-contract.js' / './stages/*' / './fs-atomic.js' → '../'
 *     './run/shared.js' / './run/quick-audit.js' / './run/prompt.js' / './run/complete.js' /
 *     './run/stage.js' → './shared.js' 等同级
 */
import { join, resolve, dirname } from 'node:path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeAtomicSync } from '../fs-atomic.js'
import { resolveSpecDir, countAncestorSpecDirs, resolveChangeDir, triggerSync, getStageSteps, formatWaitOptions, checkApproval, didYouMean, assertSafeChangeName, detectQuickSessionDrift, detectWorktreeSpecDrift, resolveRuntimeRoot } from './shared.js'
import { resolveQuickLinkedChanges } from './quick-audit.js'
import { outputStep } from './prompt.js'
import { completeStep, skipStep, waitStep, continueStep } from './complete.js'
import { runStage } from './stage.js'
import { ProgressManager } from '../progress.js'
import { validateChangeExists } from '../stage-contract.js'
import { stageRegistry, auxiliaryStages } from '../stages/index.js'
import { definition as brainstormAutoDef } from '../stages/brainstorm-auto.js'

// F2/F4: 哪些 flag 吃下一个 token 作「值」（其余 --flag 都是布尔，不吞值）。
// 校验循环只对 VALUE_FLAGS 跳下一个 token（否则 --done 后跟 typo 会被当 --done 的值吞掉）。
// getFlagValue 也据此拒收「下一个 token 是另一个 flag 名」当值。
const VALUE_FLAGS = new Set([
  '--reason', '--options', '--answer', '--confirm-mode',
  '--output', '--input', '--change', '--linked-changes',
  '--spec-dir', '--spec-root', '--runtime-root', '--workspace-id', '--scan-run-id',
  '--files', '--from-step', '--mode', '--dir', '--confirm-mode',
])

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
  let flags = args.slice(1) // let：下方规范化 --k=v 会改写

  // F7: 规范化 --key=value → ['--key', 'value']。许多 CLI 通用等号语法此前被整 token 当未知参数拒绝。
  // 只对值类 flag 展开（见 VALUE_FLAGS）；布尔 flag 不吃值，--skip-approval=x 这种无意义，原样进校验报错。
  flags = flags.flatMap(tok => {
    if (typeof tok === 'string' && tok.startsWith('--') && tok.includes('=')) {
      const eq = tok.indexOf('=')
      const key = tok.slice(0, eq)
      const val = tok.slice(eq + 1)
      if (VALUE_FLAGS.has(key)) return [key, val]
    }
    return [tok]
  })

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
    if (idx === -1) return null
    const next = flags[idx + 1]
    // F4: 下一个 token 若是另一个 flag 名（--xxx），说明本 flag 漏值，
    // 不能把 flag 名当值返回（否则 --change --done → changeName="--done" 一路污染）。
    if (!next || (typeof next === 'string' && next.startsWith('--'))) return null
    return next
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
  // F3 冲突 flag 检测：步骤/阶段动作 flag 互斥——各自定义「对当前步骤做什么」，同时给 2+ 个
  // 语义矛盾。旧实现按代码里 if 顺序静默取先命中的、其余被忽略，agent 以为生效的其实没生效
  // （如 --done --reset 只 reset 不 done，agent 却以为完成了步骤）。显式报冲突让 agent 选一个。
  const STEP_ACTIONS = [
    ['--done', isDone, '完成当前步骤'],
    ['--skip', isSkip, '跳过当前步骤'],
    ['--reset', isReset, '重置整个阶段（从头开始）'],
    ['--reopen', isReopen, '重新打开已完成阶段进入修订（配 --from-step）'],
    ['--wait', isWait, '暂停等用户决策'],
    ['--continue', isContinue, '恢复等待中的步骤'],
    ['--status', isStatus, '查看进度（只读）'],
  ]
  const activeActions = STEP_ACTIONS.filter(([, v]) => v)
  if (activeActions.length >= 2) {
    console.error('❌ 步骤动作参数冲突（同时只能指定一个）：')
    for (const [name, , desc] of activeActions) console.error(`   ${name} — ${desc}`)
    console.error('   这些动作互斥，请只保留其中一个再重试。')
    process.exit(2)
  }
  // scan profile flag 互斥：--quick/--standard/--deep 同时给≥2 个语义矛盾（computeScanProfile
  // 只取首个命中、其余静默忽略 → agent 以为生效的其实没生效，与 STEP_ACTIONS 同类风险）。
  const PROFILE_FLAGS = [
    ['--quick', flags.includes('--quick'), 'quick profile（快速接入，4 份核心文档）'],
    ['--standard', flags.includes('--standard'), 'standard profile（压缩步骤）'],
    ['--deep', flags.includes('--deep'), 'deep profile（完整扫描）'],
  ]
  const activeProfiles = PROFILE_FLAGS.filter(([, v]) => v)
  if (activeProfiles.length >= 2) {
    console.error('❌ scan profile 参数冲突（同时只能指定一个）：')
    for (const [name, , desc] of activeProfiles) console.error(`   ${name} — ${desc}`)
    console.error('   这三档互斥，请只保留其中一个再重试。')
    process.exit(2)
  }
  // 注：--non-interactive 与 --interactive 的冲突在 index.js 检测（--interactive 被 index.js
  // 作为全局 flag 吞掉、不透传到此处，故 isInteractive 在此恒为 false）。
  const waitReason = getFlagValue('--reason')
  const waitOptions = getFlagValue('--options')
  const continueAnswer = getFlagValue('--answer')
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
  // let：下方 worktree 副本漂移守卫命中时锚回 wt.mainSpecBase（task-05/D-03）
  let specBase = platformOpts.specRoot || join(cwd, '.sillyspec')

  // 漂移提醒:cwd 祖先链 ≥2 个 .sillyspec = monorepo 多实例,当前命中的「最近」实例
  // 可能不是用户意图的项目(如 cd 进被独立 scan 的子项目跑测试后忘回根)。
  // 平台模式 / 显式 --spec-dir 跳过(已明确指定,无歧义)。仅提醒不阻断。
  if (!platformOpts.specRoot && !specDir) {
    const ancestorCount = countAncestorSpecDirs(cwd)
    if (ancestorCount >= 2) {
      console.warn(`⚠️  检测到祖先链有 ${ancestorCount} 个 .sillyspec 实例(monorepo 多实例),当前使用: ${specBase}`)
      console.warn(`    若意图是另一个项目:cd 回该项目根,或用 --spec-dir <根>/.sillyspec 显式指定。`)
    }
  }

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
          const { cleanupRuntimeResidue } = await import('../init.js')
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
  // F6 路径穿越消毒：change 名会被 join 进 .sillyspec/changes/<name>/ 当目录名，
  // 含 ../ 或路径分隔符会逃出 changes/ 写到任意位置。quick 的 --change 复用为 sessionId
  // (quick-<8hex>，正则已约束) 或 linkedChanges，故 quick 的 changeName 不在此校验。
  try {
    if (stageName !== 'quick' && changeName) assertSafeChangeName(changeName)
    for (const lc of linkedChanges) {
      if (lc && lc !== 'none') assertSafeChangeName(lc, '关联变更名(--linked-changes)')
    }
  } catch (e) {
    console.error(`❌ ${e.message}`)
    console.error(`   合法变更名示例：2026-07-27-add-login（仅字母/数字/._-，不含 / \\ ..）`)
    process.exit(2)
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
  let quickFallbackUsed = false  // Q7: --done 未带 --change 时 fallback 读 current-quick-run-id 命中（区别于显式 --change quick-<hex>）
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
          const runtimeRoot = resolveRuntimeRoot(platformOpts, specRoot)
          const idFile = join(runtimeRoot, 'current-quick-run-id')
          if (existsSync(idFile)) {
            const v = readFileSync(idFile, 'utf8').trim()
            if (QUICK_SID_RE.test(v)) { quickSessionId = v; quickFallbackUsed = true }
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
    '--deep', '--quick', '--standard', // scan profile 三档显式选择（scan-profile.js 从 argv 读；互斥见下方 PROFILE_FLAGS 检测）
  ])
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i]
    if (f.startsWith('--')) {
      if (!knownFlags.has(f)) {
        // F10: flag 级 did-you-mean（此前只命令级有）
        const suggestion = didYouMean(f, [...knownFlags])
        console.error(`❌ 未知参数: ${f}`)
        if (suggestion) console.error(`   你是想输入「${suggestion}」吗？`)
        else console.error(`已知参数: ${[...knownFlags].sort().join(', ')}`)
        process.exit(2) // 用法错 → exit 2
      }
      // F2: 只有吃值的 flag 才跳下一个 token。布尔 flag（--done 等）不能 i++——
      // 否则会把紧跟的 typo flag 当成 --done 的「值」吞掉，既不校验也不生效（静默忽略）。
      if (VALUE_FLAGS.has(f)) i++
    }
  }

  const isAuxiliary = auxiliaryStages.includes(stageName)
  // scan 元数据追踪（存储在 stageData.scanMeta 中，completeStep 通过 progress 访问）

  // let：下方 worktree 副本漂移守卫命中时用主仓 specRoot 重建 pm（task-05/D-03）
  let pm = new ProgressManager({ specDir: specRoot })

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

  // worktree 副本漂移自动锚定守卫(坑 worktree-execute-spec-drift,D-03@v1):specBase 命中 worktree 内
  // .sillyspec checkout 副本 = agent 误 cd 进 worktree 跑 plan/execute/verify/archive(100% 误操作场景)。
  // 不 exit:自动把 specBase 锚回主仓 wt.mainSpecBase 后继续——进度/产出落主仓,不再写分裂副本(副本随
  // 工作树清理丢失)。必须在 validateChangeExists 之前:副本里 change 目录真实存在,存在性校验会被骗
  // 放行;锚定后用主仓 specBase 复查。覆盖 plan/execute/verify/archive(validateChangeExists 同 Set)。
  // 关键坑:连带重写 specBase/specRoot/specDir + 重建 pm——四者同源派生(pm._customSpecDir 持旧 specRoot),
  // 只改 specBase 会让下游 validateChangeExists(specBase) 与 pm.read(走 pm._customSpecDir) 仍指副本。
  // 平台模式/显式 --spec-dir 跳过(已明确指定,与 line~285 warn / quick 守卫条件对齐)。
  // 其他漂移(下方 changeMissing 守卫 / quick session drift 守卫)非副本场景,仍 exit(2) 不自动纠正。
  if (!platformOpts.specRoot && !specDir
      && ['plan', 'execute', 'verify', 'archive'].includes(stageName)) {
    const wt = detectWorktreeSpecDrift(specBase)
    if (wt) {
      specBase = wt.mainSpecBase
      specRoot = wt.mainSpecBase
      specDir = wt.mainSpecBase
      pm = new ProgressManager({ specDir: specRoot })
      // 【坑 execute-runs-isolation】下游 runtimeRoot 解析（execute-runs/stage-reviews 落点）经
      // platformOpts 透传读此锚点，落主仓 .runtime，不随 worktree cleanup 整目录删消失。
      // D-02：只参与 runtimeRoot 解析（resolveRuntimeRoot），绝不设 specRoot/runtimeRoot——
      // 否则触发平台 sentinel 副作用（triggerSync/checkApproval 跳过 + prompt 误进平台渲染分支）。
      platformOpts.specDriftAnchor = wt.mainSpecBase
      console.warn(`⚠️ 已自动锚定主仓 spec：${wt.mainSpecBase}（原 cwd 命中 worktree 副本 ${wt.changeName}，已纠正，流程继续）`)
    }
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

  // quick 专用 cwd 漂移 fail-fast 守卫（坑 quick-cwd-drift-splits-specdir）：
  // quick 被 validateChangeExists 的 sessionId 豁免（quick-<8hex> 不在 changes/ 下），漂移时除上方
  // countAncestorSpecDirs 的 warn 外无硬守卫 → 无声分裂（progress/artifact/QUICKLOG 落子项目、根
  // 会话停滞）。这里补：当前 specBase 无本 session guard、但祖先链别处有 = 跨 specDir 漂移 → fail-fast。
  // 平台模式/显式 --spec-dir 跳过（specBase 已明确，与 line~285 warn 条件对齐）。
  if (stageName === 'quick' && changeName && /^quick-[0-9a-f]{8}$/.test(changeName)
      && !platformOpts.specRoot && !specDir) {
    const drift = detectQuickSessionDrift(cwd, specBase, changeName)
    if (drift) {
      console.error(`❌ ${drift.message}`)
      console.error(`   当前 cwd=${cwd}，命中的 spec=${specBase}。`)
      process.exit(2) // 环境错（cwd/spec 漂移）→ exit 2
    }
  }

  let progress = pm.read(cwd, changeName)

  if (!progress) {
    // 如果指定了变更名或有变更目录，自动初始化变更的 progress
    const autoChange = changeName || resolveChangeNameAuto(cwd, specRoot)
    if (autoChange) {
      progress = pm.initChange(cwd, autoChange)
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
              progress = pm.read(cwd, autoName)
            }
          }
        } catch {}
      }
      changeName = autoName
      if (!progress) {
        progress = pm.initChange(cwd, autoName)
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
        progress = pm.initChange(cwd, autoName)
        changeName = autoName
      } else {
        console.error('❌ 未找到进度数据，请先运行 sillyspec init 或指定 --change <变更名>')
        process.exit(2) // 环境错（未 init / 未传 --change）→ exit 2
      }
    }
  }

  // 确保 progress 有 currentChange
  const effectiveChange = changeName || progress.currentChange || resolveChangeName(cwd, progress, specRoot)

  // ── Q7：quick --done 不带 --change 时 fallback 读 current-quick-run-id 可能命中他者会话 ──
  // 并发两 quick 会话：B 后启动覆盖 A 的 id（last-writer-wins），A 的 --done 不带 --change → 读到 B 的 sessionId
  // → 误操作 B 的 progress/QUICKLOG。fallback 命中的会话若已完成或无可推进步骤（id stale / 他者已收尾），
  // 拒绝推进并要求显式 --change。（live A/B race 需 per-session 锚 commit，见 review Q2/D2，本守卫只兜 stale/completed。）
  if (stageName === 'quick' && isDone && quickFallbackUsed) {
    const qs = progress.stages.quick
    const hasActionable = qs?.steps && qs.steps.some(s => s.status === 'pending' || s.status === 'waiting' || s.status === 'in-progress')
    if (!qs || qs.status === 'completed' || !hasActionable) {
      console.error(`\n❌ --done 未带 --change，回退读到的 quick 会话 ${changeName} 已不可推进（已完成或无待办步骤）。`)
      console.error(`   并发多 quick 会话时 .runtime/current-quick-run-id 可能指向他者会话（last-writer-wins）。`)
      console.error(`   请显式带 --change <quick-session-id> 指定要完成的会话（sillyspec run quick --status 查各会话进度）。`)
      process.exit(2) // 用法错（fallback 命中 stale/他者会话）→ exit 2
    }
  }

  // -- auto 模式：自动推进所有流程阶段
  if (stageName === 'auto') {
    return await runAutoMode(pm, progress, cwd, flags, effectiveChange, platformOpts)
  }

  // --change 只作为变更名标识，不再拦截流程
  // 注册变更到全局活跃列表（如果尚未注册）
  if (effectiveChange) {
    pm.registerChange(cwd, effectiveChange)
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
        pm._write(cwd, progress, effectiveChange)
        progress = pm.read(cwd, effectiveChange) || progress
      }
    }

    const result = pm.reopenStage(cwd, stageName, {
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
    progress = pm.read(cwd, effectiveChange) || progress

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
      const runtimeRoot = resolveRuntimeRoot(platformOpts, specRoot)
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
    pm._write(cwd, progress, effectiveChange)
    triggerSync(cwd, effectiveChange, platformOpts)
    progress = pm.read(cwd, effectiveChange) || progress
  }

  // --status
  if (isStatus) {
    // D9：状态展示末尾附「下一步该跑什么」。pm 持有状态机，按 progress 实际进度算出精确命令；
    // 不传则 agent 只看到一堆 step 进度条，却不知道完成后/卡住时下一条命令是什么。
    let nextSuggestion = null
    try { nextSuggestion = pm._getNextSuggestion(progress) } catch { /* 读建议失败不阻断状态展示 */ }
    return showStatus(progress, stageName, nextSuggestion)
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
    return await continueStep(pm, progress, stageName, cwd, continueAnswer, { changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts, fromStep: fromStepValue })
  }

  // --done
  if (isDone) {
    const doneAnswer = getFlagValue('--answer')
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText, { confirm: isConfirm, changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts, doneAnswer, isForceBaseline, isAllowNew })
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

function showStatus(progress, stageName, nextSuggestion = null) {
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

  // D9：本阶段进度之后，给出全局「下一步该跑什么」——
  // 否则 agent 看完进度条仍要自己推状态机（尤其阶段已完成 / 失效 / 修订中这类非线性状态）。
  if (nextSuggestion && nextSuggestion.command) {
    console.log(`\n👉 ${nextSuggestion.text}`)
    console.log(`   下一步命令：${nextSuggestion.command}`)
  }
}

async function resetStage(pm, progress, stageName, cwd, changeName, platformOpts = {}) {
  // execute 阶段 reset 时清理自建 worktree，否则下次 run execute 会因 existingMeta 存在
  // 直接复用带脏状态的旧 worktree（启动逻辑：meta 存在即复用，不查健康状态）
  if (stageName === 'execute' && changeName) {
    try {
      const { WorktreeManager } = await import('../worktree.js')
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
  pm._write(cwd, progress, changeName)
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
      const isAutoModeSteps = existingSteps?.length === 4 && existingSteps?.[0]?.name === '进度确认与上下文加载'
      if (!isAutoModeSteps) {
        if (!progress.stages) progress.stages = {}
        progress.stages.brainstorm = {
          status: 'in-progress',
          startedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
          completedAt: null,
          steps: brainstormAutoDef.steps.map(s => ({ name: s.name, status: 'pending' }))
        }
        pm._write(cwd, progress, changeName)
        triggerSync(cwd, changeName, platformOpts)
        progress = pm.read(cwd, changeName)
        return progress
      }
    }
    const changed = await ensureStageSteps(progress, stage, cwd)
    if (stageChanged || changed) {
      pm._write(cwd, progress, changeName)
      triggerSync(cwd, changeName, platformOpts)
    }
    progress = pm.read(cwd, changeName)
    return progress
  }

  // ── Classify change on first entry ──
  if (!progress.stages?.brainstorm?.status && !progress.stages?.plan?.status) {
    const { classifyChange } = await import('../classify-change.js')
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
  progress = pm.read(cwd, changeName)

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
      const nextActionFile = join(changeDir, 'next-action.json')
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
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  progress = pm.read(cwd, changeName)

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

