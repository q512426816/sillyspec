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
import { basename, join, resolve, dirname } from 'node:path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeAtomicSync } from '../fs-atomic.js'
import { resolveSpecDir, countAncestorSpecDirs, ancestorSpecDirs, resolveAncestorCeiling, resolveChangeDir, triggerSync, getStageSteps, formatWaitOptions, checkApproval, warnApprovalUnknown, didYouMean, assertSafeChangeName, detectQuickSessionDrift, detectWorktreeSpecDrift, resolveRuntimeRoot, writePlatformPointer, checkPlatformManaged, isSelfReferentialSpecRoot, PLATFORM_MANAGED_FILENAME } from './shared.js'
import { resolveQuickLinkedChanges } from './quick-audit.js'
import { outputStep, collectStageWaitHistory } from './prompt.js'
import { completeStep, skipStep, waitStep, continueStep } from './complete.js'
import { runStage } from './stage.js'
import { sanitizeDesc } from '../quicklog.js'
import { ProgressManager } from '../progress.js'
import { validateChangeExists, checkTransition } from '../stage-contract.js'
import { READONLY_AUXILIARY_STAGES } from '../constants.js'
import { stageRegistry, auxiliaryStages } from '../stages/index.js'
import { definition as brainstormAutoDef } from '../stages/brainstorm-auto.js'
import { setQuickFileNotes } from '../quicklog.js'

// F2/F4: 哪些 flag 吃下一个 token 作「值」（其余 --flag 都是布尔，不吞值）。
// 校验循环只对 VALUE_FLAGS 跳下一个 token（否则 --done 后跟 typo 会被当 --done 的值吞掉）。
// getFlagValue 也据此拒收「下一个 token 是另一个 flag 名」当值。
const VALUE_FLAGS = new Set([
  '--reason', '--options', '--answer', '--confirm-mode',
  '--output', '--input', '--change', '--linked-changes',
  '--spec-dir', '--spec-root', '--runtime-root', '--workspace-id', '--scan-run-id',
  '--files', '--file-notes', '--from-step', '--mode', '--dir', '--confirm-mode',
  '--req', '--cause', '--solution', '--result', // quick 末步四字段参数（合成 --output，见 outputText 解析段）
  '--ql', // quick --cancel 显式指定 qlId（缺省读会话 guard.json）
  '--base', // scan diff 基线 commit（吃值；只在 run scan --diff 转发路径消费）
])

/**
 * 检测 `--files` 是否被空格分隔误用（坑 quick-files-space-separated-silently-drops）。
 *
 * --files 是单值 flag（VALUE_FLAGS：校验循环只跳一个 token、--k=v 只展开一个值），空格分隔的
 * 多文件只有首个被当值，其余沦为位置参数被 `:482` 的 `startsWith('--')` 校验静默忽略 →
 * guard.allowedFiles 只剩首个 → --done 边界审计误拦，边界保护形同虚设。
 *
 * 返回 --files 值及其后所有连续非 flag token（疑似被丢的多文件）；length > 1 即误用，调用方
 * fail-loud（process.exit 2，同 run --json :109 显式拒绝静默吞风格）。贪婪收集多值会破坏
 * VALUE_FLAGS 单值框架（校验循环/等号展开/getFlagValue 都假设单值），故仅检测不改语义。
 *
 * 纯函数：无副作用、不读 process、不 mutate 入参，供 command.js 解析 + 单测复用。
 * @param {string[]} flags runCommand 规范化后的 flags 数组（--k=v 已展开）
 * @returns {string[]} --files 值 + 其后连续非 flag token；无 --files / 值是 flag 名 / 含逗号 → []
 */
export function detectSpaceSeparatedFiles(flags) {
  const idx = flags.indexOf('--files')
  if (idx === -1) return []
  const val = flags[idx + 1]
  // 值缺失 / 值本身是 flag 名（--files --done 漏值）/ 逗号分隔（正确用法）→ 不检测
  if (!val || val.startsWith('--') || val.includes(',')) return []
  const suspects = [val]
  for (let j = idx + 2; j < flags.length && !flags[j].startsWith('--'); j++) suspects.push(flags[j])
  return suspects
}

/**
 * 检测 prose 参数值是否疑似被 Git Bash(MSYS) 路径转换污染（坑 quick-req-msys-path-mangling）。
 *
 * MSYS2 对以 / 开头的命令行参数做 POSIX→Windows 自动转换：--req "/sessions 页修复" 到达
 * CLI 时已是 "<Git 安装目录>/sessions 页修复"（如 E:/Software/Git/sessions 页修复），无感
 * 写入 QUICKLOG 标题与「需求：」行（该标题也是平台「快速修复」列表展示标题）。启发式：
 * 盘符绝对路径开头 + 紧随空白与中文正文——人写的 Windows 路径引用不会以「盘符路径+中文
 * 句子」形态开头；纯英文正文检不出（v1 取零误报优先，本仓主流为中文文案）。
 *
 * 纯函数：无副作用，供 command.js 解析层告警 + 单测复用。只告警不阻断——无法确定性区分
 * 误报（合法值确可能以盘符路径开头），由 agent 看到 stderr 告警后自查重发。
 * @param {string|null} v 待检值
 * @returns {boolean} 疑似污染返回 true
 */
export function looksLikeMsysMangledPath(v) {
  if (typeof v !== 'string' || v.length === 0) return false
  const m = v.match(/^[A-Za-z]:[\\/]\S+/) // 盘符绝对路径 token（吃到首个空白）
  if (!m) return false
  const rest = v.slice(m[0].length)
  return /^\s/.test(rest) && /[\u4e00-\u9fff]/.test(rest)
}

/**
 * MSYS 污染告警出口：命中嗅探时向 stderr 打 flag 名 + 值前缀 + 修复指引（不阻断）。
 */
function warnMsysMangledFlag(flag, value) {
  if (!looksLikeMsysMangledPath(value)) return
  console.error(`⚠️ ${flag} 的值疑似被 Git Bash(MSYS) 路径转换污染：「${value.slice(0, 60)}${value.length > 60 ? '…' : ''}」`)
  console.error('   以 / 开头的文案在 Git Bash 下会被展开成 <Git 安装目录>/… 绝对路径后才传入 CLI。')
  console.error('   非本意 → 去掉前导 / 或改写表述后重发本命令；确需原样 → 命令前加 MSYS_NO_PATHCONV=1。')
}

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
    // 漂移显式化（坑 execute-step-table-drift，2026-08-20 实证）：plan.md Wave 数在 execute
    // 中途被改后 DB 步骤表与重算定义错位（17/12 交替），重播种本身按名保留完成态是对的，
    // 但此前完全静默——agent 只见各处计数打架的报错，不知道发生了什么、该不该继续
    console.warn(`⚠️ ${stageName} 步骤表与当前定义漂移（DB ${oldSteps.length} 步 → 定义 ${steps.length} 步，常见原因：execute 中途修改了 plan.md 的 Wave 结构）`)
    console.warn(`   已按步骤名保留完成态重播种（新增步骤置 pending；Wave 重编号时同名步骤继承旧状态，勾选真相以 tasks.md/review.json 为准）`)
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
 * run <stage> --help/-h 的用法帮助（runCommand 内 --help 短路调用）。
 * 只打印不落盘：帮助查询不该有副作用（建会话/写 QUICKLOG）。
 */
function printStageUsage(stageName) {
  const stage = stageRegistry[stageName]
  console.log(`
sillyspec run ${stageName}${stage && stage.title ? ` — ${stage.title}` : ''}${stage && stage.description ? `\n  ${stage.description}` : ''}

用法:
  sillyspec run ${stageName}                    开始/继续该阶段（输出下一步 prompt）
  sillyspec run ${stageName} --status           查看阶段进度
  sillyspec run ${stageName} --done --output "摘要" [--input "用户原话"]   完成当前步骤
  sillyspec run ${stageName} --change <名>      指定变更（多活跃变更必填）

  通用参数: --done --output --input --status --skip --reset --reopen --from-step
            --wait --continue --answer --change --spec-dir --non-interactive
            --interactive --skip-approval --json(不支持)
  quick 专属: --linked-changes none|a,b --files a.js,b.js --allow-new
             --allow-delete --force-baseline --confirm --file-notes
  scan  专属: --quick --standard --deep --force-rescan --diff [--base <commit>] [--full] [--report]
  archive专属: --confirm
`)
}

/**
 * sillyspec run <stage> 主命令
 */
export async function runCommand(args, cwd, specDir = null, opts = {}) {
  // 原始 cwd 快照（下方 cwd 纠正前）：agent 在子目录启动时，其会话 transcript 挂在子目录
  // 对应的 harness 项目目录下，agent-log 探测须用原始 cwd（纠正后的是项目根，探测会扑空）
  const invokedCwd = cwd
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
  // HUB-12c：守卫须同时查平台接管声明——指针被 cleanup、声明还在、祖先有别的 .sillyspec
  //（monorepo 嵌套）时，cwd 被上移后 checkPlatformManaged 在新 cwd 扑空 → 静默落本地库，
  // 双入口 fail-closed 被绕过（状态分裂正是它要防的）
  if (!specDir && !existsSync(join(cwd, '.sillyspec-platform.json')) && !checkPlatformManaged(cwd)) {
    // 平台模式（cwd 有 .sillyspec-platform.json 指针或接管声明）不做 cwd 纠正：指针已明确
    // specDir，向上找 .sillyspec 反而会撞到无关项目（如用户 home 的 .sillyspec），导致
    // --done 恢复读写 ~/.sillyspec-platform.json 出错的 specRoot。
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
  // --cancel（2026-08-21 审计第四批 C-2）：quick 误启动会话的官方取消口。取消 = QUICKLOG 条目
  // 翻「已取消」+ tasks.md 挂载行移除 + 会话 guard 目录清理 + db 行注销（取消 quick 会话行，
  // 非真实变更）。fail-closed：已完成/已勾选的拒绝（真实工作记录）。
  const isCancel = flags.includes('--cancel')
  if (isCancel && stageName !== 'quick') {
    console.error('❌ --cancel 仅支持 quick 阶段（sillyspec run quick --cancel --change <quick-会话ID>）')
    process.exit(2)
  }
  if (isCancel && (isDone || isSkip || isReset || isReopen || isStatus)) {
    console.error('❌ --cancel 与 --done/--skip/--reset/--reopen/--status 互斥')
    process.exit(2)
  }
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
        // 自指指针免疫（FR-4，变更 2026-08-23-repo-native-spec-backfill）：saved.specRoot 经
        // realpath 解析回本地 .sillyspec（repo-native junction 回环，旧模板投毒残留）→ 整体
        // 忽略恢复（specRoot/runtimeRoot/workspaceId/scanRunId 全不回填，platformOpts 保持
        // 无平台参数状态），按本地模式运行——内置 sync 走本地链路，specRoot 保持本地取值链。
        if (isSelfReferentialSpecRoot(cwd, saved.specRoot)) {
          console.warn(`⚠️ 检测到自指平台指针（repo-native junction 回环，specRoot 指回本地 .sillyspec），已忽略并按本地模式运行: ${platformOptsFile}`)
        } else {
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
        }
      } catch (e) {
        console.error(`❌ 平台模式参数文件读取失败: ${platformOptsFile}`)
        console.error(`   错误: ${e.message}`)
        console.error('   可能原因：文件损坏')
        console.error('   解决：删除该文件并重新运行首次 scan 传入 --spec-root')
        process.exit(2) // 环境错（文件损坏）→ exit 2
      }
    }
  }
  // ── 平台接管声明 fail-closed（入口二，D-B@v2）──
  // runCommand 有独立指针恢复链（不经 resolvePlatformSpecDir），指针缺失时若不在此
  // 封堵，run/quick/scan 等全部 stage 命令会静默落本地库（与入口一行为分裂）。
  // 触发条件：命令行没传平台参数 + 指针与 platform-scan.json 皆未命中 + 接管声明存在。
  // 显式 --spec-dir/--spec-root 传参时 platformOpts.specRoot 已赋值，天然不进此分支（逃生口）。
  if (!platformOpts.specRoot && !platformOpts.runtimeRoot && !platformFileExists) {
    const decl = checkPlatformManaged(cwd)
    if (decl) {
      // 陈旧自指声明降级（FR-4，变更 2026-08-23-repo-native-spec-backfill）：decl.specRoot 经
      // realpath 解析回本地 .sillyspec（repo-native junction 投毒残留、指针已被清理）→ 视为
      // 陈旧声明，warn 后按本地模式继续（不 exit 1）——声明描述的"平台接管"物理上指向本地
      // .sillyspec，无跨库状态分裂风险；非自指声明维持 fail-closed 原样（状态保护阻断）。
      if (isSelfReferentialSpecRoot(cwd, decl.specRoot)) {
        console.warn(`⚠️ 检测到陈旧的自指平台接管声明（repo-native junction 回环，原 specRoot 指回本地 .sillyspec），已降级并按本地模式运行；可 sillyspec platform disconnect 清理残留声明: ${join(cwd, PLATFORM_MANAGED_FILENAME)}`)
      } else {
        console.error(`❌ 平台接管声明生效：本项目已由平台托管（原 specRoot: ${decl.specRoot || '(未记录)'}），但恢复指针缺失，拒绝静默回退本地模式。`)
        console.error(`   声明文件: ${join(cwd, PLATFORM_MANAGED_FILENAME)}`)
        console.error('   恢复：① 重跑平台 scan/init（带 --spec-root）重建指针；② 确认不再使用平台：sillyspec platform disconnect（删除接管声明）；③ 显式 --spec-dir <路径> 临时指定目录。')
        // exit(1) 而非邻近环境错的 exit(2)：这是"状态保护阻断"（对齐 PointerUnreachableError
        // 顶层 catch 语义），非"用法/环境错"——见 design.md §5.3 v2 复审观察 (a)
        process.exit(1)
      }
    }
  }
  // 持久化 platformOpts
  // 在 specRoot/.runtime/ 写主文件，同时在 cwd 下写恢复指针
  // （writePlatformPointer 收敛双写逻辑，cmdInit 平台模式共用，防两处字段漂移）
  if (platformOpts.specRoot || platformOpts.runtimeRoot) {
    writePlatformPointer(cwd, platformOpts)
  }

  // 统一规范基路径：平台模式用 specRoot，本地模式用 cwd/.sillyspec
  // runCommand 后续所有 .sillyspec/ 操作必须用 specBase
  // let：下方 worktree 副本漂移守卫命中时锚回 wt.mainSpecBase（task-05/D-03）
  let specBase = platformOpts.specRoot || join(cwd, '.sillyspec')

  // 漂移阻断:cwd 祖先链 ≥2 个 .sillyspec = monorepo 多实例,当前命中的「最近」实例
  // 可能不是用户意图的项目(如 cd 进被独立 scan 的子项目跑测试后忘回根)。
  // 平台模式 / 显式 --spec-dir 跳过(已明确指定,无歧义)。
  // 当前实例 ≠ git 顶层仓库实例 → 默认拒绝(坑 monorepo-cwd-wrong-spec-instance)。
  if (!platformOpts.specRoot && !specDir) {
    const ancestorSpecs = ancestorSpecDirs(cwd)
    if (ancestorSpecs.length >= 2) {
      // 判断当前命中的 .sillyspec 是否在 git 顶层仓库根下
      const gitRoot = resolveAncestorCeiling(resolve(cwd))
      const currentSpecParent = dirname(resolve(specBase))
      const isAtGitRoot = gitRoot && resolve(currentSpecParent) === resolve(gitRoot)
      if (!isAtGitRoot) {
        console.error(`❌ 检测到祖先链有 ${ancestorSpecs.length} 个 .sillyspec 实例(monorepo 多实例)，当前使用: ${specBase}`)
        console.error(`   当前 cwd 不在 git 顶层仓库根下，静默绑定到子项目实例会导致进度/QUICKLOG 分裂。`)
        console.error(`   修复：cd 回项目根目录，或用 --spec-dir <根>/.sillyspec 显式指定。`)
        process.exit(2)
      }
      // 在 git 根下但有多实例(子项目也有 .sillyspec)→ 仅警告(正确实例已命中)
      console.warn(`⚠️  检测到祖先链有 ${ancestorSpecs.length} 个 .sillyspec 实例(monorepo 多实例)，当前使用: ${specBase}`)
      console.warn(`    当前已绑定 git 顶层仓库实例。若意图是子项目:用 --spec-dir 显式指定。`)
    }
  }

  // scan diff 转发（D-001@v1：command.js 只认 --diff flag，等价 `sillyspec scan diff` 子命令；
  // 裸 token `run scan diff` 不在此解析——那是 index.js 子命令拦截的职责，防 command.js 静默吞）。
  // 纯只读比较：零会话/QUICKLOG 副作用，仅解析 --base/--full/--report 后转发 scan-diff 退出码。
  if (stageName === 'scan' && flags.includes('--diff')) {
    const { runScanDiff } = await import('../scan-diff.js')
    const diffBase = getFlagValue('--base')
    process.exitCode = runScanDiff({
      projectRoot: cwd,
      specBase,
      projectName: basename(cwd),
      base: diffBase,
      full: flags.includes('--full'),
      report: flags.includes('--report'),
    })
    return
  }

  // 平台模式：首次接入时清理旧版本残留的 cwd/.sillyspec/（防止源码污染）。
  // ⚠️ 同 init.js：必须保护真实资产（changes/、projects/、sillyspec.db）。
  // 只在「首次」执行一次——用 cwd 下的 .sillyspec-platform-cleaned 标记文件记录已处理，
  // 后续每次 run 直接跳过，避免重复检查 + 红叉噪声（此清理不阻塞流程、不动真实资产）。
  // 自指守卫（FR-4，变更 2026-08-23-repo-native-spec-backfill）：显式自指 --spec-root
  // （repo-native junction 回环）下 cwd/.sillyspec 与 specRoot 同物理目录——它就是平台
  // 规范目录本体，绝非"旧版本残留"；跳过整个清理决策（含 marker 写入，防后续真平台
  // 接入被误标记已清理）。否则 rmSync 会删掉 repo-native 唯一真理源并留下悬空链接。
  if (platformOpts.specRoot && !isSelfReferentialSpecRoot(cwd, platformOpts.specRoot)) {
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
  // F4 守卫统一走 getFlagValue（坑 raw-flag-value-bypass）：裸 flags[idx+1] 会把漏值后紧跟的
  // flag 名当值（--output --input x → output="--input"），--change --done 甚至会建出名为
  // --done 的变更目录（assertSafeChangeName 的 [\w.-] 恰好放行）。getFlagValue 的 F4 注释
  // 点名过本坑，此前只有 from-step 等少数 flag 用了它。
  let outputText = null
  const outputValue = getFlagValue('--output')
  if (outputValue !== null) outputText = outputValue
  warnMsysMangledFlag('--output', outputValue)

  // 解析 quick 末步四字段参数（2026-08-21 agent-手工产出审计第二批 F6）：--req/--cause/
  // --solution/--result 各传一项，CLI 合成单行四字段 outputText（quicklog 落盘侧
  // splitSingleLineFields 会归一为多行字段块）。消灭 agent 手拼「需求：… 根因：…」模板的
  // 格式事故面（嵌套全角冒号拆分误判 / 缺字段被 --done 拒 / 标题截断规则踩坑）。
  // 任一四参数出现即要求全四；与 --output 互斥（两路同时给说明意图不明，fail-fast）。
  {
    const FOUR = [['--req', '需求：'], ['--cause', '根因：'], ['--solution', '方案：'], ['--result', '结果：']]
    const fourVals = FOUR.map(([f]) => [f, getFlagValue(f)])
    if (fourVals.some(([, v]) => v !== null)) {
      if (outputText !== null) {
        console.error('❌ --req/--cause/--solution/--result 与 --output 互斥——四参数由 CLI 合成结构化 output，勿混用');
        process.exit(2)
      }
      const missing = fourVals.filter(([, v]) => v === null).map(([f]) => f)
      if (missing.length > 0) {
        console.error(`❌ quick 末步四字段参数缺项：${missing.join(' ')}（--req/--cause/--solution/--result 必须全给，或缺字段 --done 会被拒）`);
        process.exit(2)
      }
      for (const [f] of FOUR) warnMsysMangledFlag(f, getFlagValue(f))
      outputText = FOUR.map(([f, label]) => `${label}${getFlagValue(f)}`).join(' ')
    }
  }

  // 解析 --input
  let inputText = null
  const inputValue = getFlagValue('--input')
  if (inputValue !== null) inputText = inputValue

  // quick 位置参数 → 任务描述（与 auto 模式建议的 `sillyspec run quick "需求"` 用法一致）。
  // 旧行为静默忽略裸 token（QUICKLOG 标题回退占位）；现显式消费——跳过值类 flag 的值
  // （--files src/a.js 的 src/a.js 不是位置参数），取第一个真位置 token。配合下方
  // 「新会话必须带描述」启动门（坑 quick-no-input-placeholder-title）。
  if (stageName === 'quick' && inputText === null) {
    for (let i = 0; i < flags.length; i++) {
      const t = flags[i]
      if (typeof t !== 'string') continue
      if (t.startsWith('--')) { if (VALUE_FLAGS.has(t)) i++; continue }
      inputText = t
      break
    }
  }
  warnMsysMangledFlag('--input', inputText)

  // 解析 --linked-changes <a,b|none>（quick 专用：显式声明关联变更，CI/脚本友好）
  // 与 --change 解耦：--linked-changes 语义清晰（关联变更），不与「指定变更名」混淆。
  // null = 未指定（走持久化/交互/兼容回退）；[] = 显式 none（不关联）；[...] = 显式列表
  let explicitLinked = null
  const linkedValue = getFlagValue('--linked-changes')
  if (linkedValue !== null) {
    const v = linkedValue.trim()
    explicitLinked = v.toLowerCase() === 'none' ? [] : v.split(',').map(s => s.trim()).filter(Boolean)
  }

  // 解析 --change <name>（quick 阶段向后兼容：逗号分隔作为「关联变更」；
  // 历史写法，语义与「指定变更名」冲突，新用法建议改用 --linked-changes）
  let changeName = null
  let linkedChanges = []
  const changeValue = getFlagValue('--change')
  if (changeValue !== null) {
    changeName = changeValue
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
  let quickSidFresh = false      // 本轮刚生成全新 sessionId（非 --change 精确恢复 / 非 fallback）——供下方「新会话必须带 --input」门判定
  if (stageName === 'quick') {
    // 1373-1376 已把 quick 的 --change 值清进 linkedChanges、changeName 置 null。
    // 此处回看 --change 原始值：若恰好是单个 quick-<8hex> → 识别为本会话 sessionId（精确恢复），
    // 并撤销把它当 linkedChanges 的误判。多值或不匹配 → 维持 linkedChanges 语义（旧兼容）。
    // F4 守卫同款（changeIdx 变量已随裸读清理移除，此处改 getFlagValue 复读原始值）
    const rawChangeValue = getFlagValue('--change')
    const rawChange = rawChangeValue !== null ? rawChangeValue.trim() : null
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
        quickSidFresh = true
      }
      changeName = quickSessionId
    } else {
      // 用户显式传了非 sessionId 形态的变更名 → 尊重，不生成 UUID（旧兼容路径）
      quickSessionId = changeName
    }
  }

  // ── 本地 agent 会话日志登记 + 上报（平台会话展示用，best-effort）──
  // 平台/daemon 模式下 SillyHub 只能看到 CLI 阶段信息，看不到本地 agent 的实际执行日志。
  // 在此探测当前 agent 环境（Claude Code / Codex / ZCode transcript / SILLYSPEC_AGENT_LOG
  // 覆盖），把日志本地路径登记进 <runtimeRoot>/agent-session-log.json（留底）并立即
  // REST 上报平台（POST /api/agent-logs，与进度上报同风格；协议见
  // docs/platform-agent-log-protocol.md）。探测不到不发不写；任何失败只 warn 一行，
  // 绝不阻断 run 主流程。
  // 位置（2026-08-23-agent-activity-sessions task-01）：必须在上方 changeName/quickSessionId
  // 解析完成之后——上报携带会话化上下文 context：entry 级 changeKey/quickId（平台按
  // (workspace, harness, entry.ctx) 聚合建会话；quick 会话 quickId 优先且与 changeKey 互斥）
  // + body 级 hubSessionId（daemon 派发平台会话时注入 env SILLYHUB_SESSION_ID，非空才带）。
  // 两段解析均在顶层作用域，此处统一算一次 context 两值皆可达。
  try {
    const isQuickSession = stageName === 'quick' && Boolean(quickSessionId)
    const hubSessionIdEnv = typeof process.env.SILLYHUB_SESSION_ID === 'string' ? process.env.SILLYHUB_SESSION_ID.trim() : ''
    const agentLogContext = {
      hubSessionId: hubSessionIdEnv || null,
      // quick 会话 → quickId（quick-<8hex> 完整原样，不剥前缀）；普通场景 → changeKey（--change 值，无则 null）
      changeKey: isQuickSession ? null : (changeName || null),
      quickId: isQuickSession ? quickSessionId : null,
    }
    const { recordAgentLogInvocation } = await import('../agent-session-log.js')
    const r = await recordAgentLogInvocation({
      cwd,
      invokedCwd,
      platformOpts,
      specBase,
      context: agentLogContext,
      // 只记 flag 名不记值（--output 等 flag 值是 agent 工作文本，不进产物）
      command: [stageName, ...flags.filter(t => typeof t === 'string' && t.startsWith('--'))].join(' '),
    })
    if (r && r.isNew && r.latestLogPath) {
      const pushNote = r.pushed === true ? '已上报平台' : r.pushed === false ? '上报失败（本地已留底）' : '本地留底'
      console.log(`📄 本地 agent 日志已登记（${pushNote}）: ${r.latestLogPath}`)
    }
  } catch { /* best-effort：登记失败不影响 run 主流程 */ }

  // quick 关联变更存在性守卫（坑 quick-change-phantom-linked）：quick 的 --change/--linked-changes
  // 被解析为关联变更后静默接受不存在的名字（quick 不建变更，链接幻影名必是笔误/语义误用——想给
  // 会话起名却传了 --change），后果是 QUICKLOG 挂悬空关联污染 change 关联图谱 + --done 时 sessionId
  // 走 fallback 可能命中他者会话。f70c9c3 只修了「建幻影目录」后果（appendTaskCheckbox 加
  // existsSync 守卫），本守卫把误用拦在 flag 装载层。只校验 CLI 显式装载的 linkedChanges；
  // 持久化 guard.json 复用（下方 run↔--done 之间变更可能被归档）与交互式选择（列表只列存在项）不检。
  if (stageName === 'quick' && linkedChanges.length > 0) {
    const missing = linkedChanges.filter(lc => lc !== 'none' && !existsSync(join(specRoot, 'changes', lc)))
    if (missing.length > 0) {
      console.error(`❌ quick 的 --change/--linked-changes 被当作「关联变更」处理，但以下变更不存在：${missing.join('、')}`)
      console.error('   （quick 不创建变更，关联的变更必须预先存在）')
      console.error('   - 想给会话起名：不要传 --change，sessionId 由 CLI 自动生成（后续 --done 用它）')
      console.error('   - 想关联变更：修正拼写（.sillyspec/changes/ 下已存在的目录名），显式写法 --linked-changes <名>')
      console.error('   - 想新建变更：quick 不建变更，走 brainstorm 完整流程')
      process.exit(2)
    }
  }

  // 解析 --files a.js,b.js（quick 专用：显式声明 allowedFiles）
  // --files 是单值 flag，空格分隔的多文件只取首个致其余静默丢失（坑 quick-files-space-separated-silently-drops）。
  // detectSpaceSeparatedFiles 检测误用 → fail-loud 报错指明逗号用法（同 run --json :109 风格）。
  const spaceSuspects = detectSpaceSeparatedFiles(flags)
  if (spaceSuspects.length > 1) {
    console.error('❌ --files 检测到空格分隔的多文件：CLI 只识别首个，其余会被静默丢弃（边界保护失效）。')
    console.error(`   疑似多文件：${spaceSuspects.join(' ')}`)
    console.error('   --files 是单值参数，多文件请用逗号分隔（无空格）：')
    console.error(`     --files ${spaceSuspects.join(',')}`)
    process.exit(2) // 用法错 → exit 2
  }
  let quickFiles = []
  const filesValue = getFlagValue('--files')
  if (filesValue !== null) {
    quickFiles = filesValue.split(',').map(f => f.trim()).filter(Boolean)
  }

  // 解析 --file-notes "path::括注 || path::括注"（quick 专用：QUICKLOG「文件：」行落盘多行括注）。
  // 旁路注入 quicklog.js（per-process setter），不经 complete 收尾路径透传（避碰多 agent 并发改的收尾热点）。
  // completeQuicklogEntry 读后即清；不传 → '' → 回填审计到的实际文件单行（向后兼容）。
  // 格式 fail-fast（坑 quick-file-notes-format-silent，2026-08-24）：分隔符写错（`|`/`,` 等）时
  // 整段会被静默挤进第一个文件的括注、QUICKLOG 落盘后只能手工修——解析处直接拦。
  let quickFileNotes = ''
  const fileNotesValue = getFlagValue('--file-notes')
  if (fileNotesValue !== null) {
    quickFileNotes = fileNotesValue
    const { validateFileNotesFormat } = await import('../quicklog.js')
    const fv = validateFileNotesFormat(quickFileNotes)
    if (!fv.ok) {
      console.error(`❌ --file-notes 格式不对（${fv.problems.length} 处），已拒绝执行（旧行为会静默挤错进 QUICKLOG，只能手工修）：`)
      for (const p of fv.problems.slice(0, 5)) {
        console.error(`   「${p.seg.slice(0, 80)}」${p.reason}——${p.hint}`)
      }
      if (fv.problems.length > 5) console.error(`   …等共 ${fv.problems.length} 处`)
      console.error('   正确格式: --file-notes "path1::括注1 || path2::括注2"（`||` 双竖线分隔多文件，`::` 分隔路径与括注）')
      process.exit(2) // 用法错（--file-notes 格式非法）→ exit 2
    }
  }
  setQuickFileNotes(quickFileNotes)

  const isAllowNew = flags.includes('--allow-new')
  const isAllowDelete = flags.includes('--allow-delete')
  const isForceBaseline = flags.includes('--force-baseline')
  const isForceRescan = flags.includes('--force-rescan')

  // F10b（ql-20260818-010）：语义别名定向提示。did-you-mean 按编辑距离猜形近 flag，猜中的常是
  // 形近但语义错的（--title → --files，ql-20260818-003 负面③实证）。常见「语义别名」在此登记
  // 定向指引：命中时替代 did-you-mean 打印，引导到真正承载该语义的 flag/机制。
  const FLAG_SEMANTIC_HINTS = {
    '--title': 'QUICKLOG 条目标题无独立参数——从 --output 的「需求：」字段自动提取（写成一句语义化短标题即可）',
    '--message': '结果摘要用 --output（quick 末步须含 需求：/根因：/方案：/结果： 四字段）',
    '--summary': '结果摘要用 --output（quick 末步须含 需求：/根因：/方案：/结果： 四字段）',
    '--result': '结果摘要用 --output（quick 末步须含 需求：/根因：/方案：/结果： 四字段）',
    '--name': 'quick 会话名由 CLI 自动分配（quick-<hash>），恢复会话用 --change <quick-session-id>；关联变更用 --linked-changes',
    '--session': 'quick 会话名由 CLI 自动分配（quick-<hash>），恢复会话用 --change <quick-session-id>',
    '--note': '文件括注用 --file-notes "path::注 || path::注"；启动时任务描述用 --input',
    '--notes': '文件括注用 --file-notes "path::注 || path::注"',
    '--desc': '启动时任务描述用 --input；QUICKLOG 标题从 --output「需求：」自动提取',
    '--description': '启动时任务描述用 --input；QUICKLOG 标题从 --output「需求：」自动提取',
  }

  // 未知参数 fail-fast
  const knownFlags = new Set([
    '--done', '--skip', '--status', '--reset', '--confirm', '--skip-approval', '--cancel', '--ql',
    '--wait', '--continue', '--non-interactive', '--interactive',
    '--reason', '--options', '--answer', '--confirm-mode',
    '--output', '--input', '--change', '--linked-changes',
    '--req', '--cause', '--solution', '--result',
    '--spec-dir', '--spec-root', '--runtime-root', '--workspace-id', '--scan-run-id',
    '--files', '--file-notes', '--allow-new', '--allow-delete', '--force-baseline', '--force-rescan',
    '--json', '--dir', '--help',
    '--reopen', '--from-step', '--mode',
    '--deep', '--quick', '--standard', // scan profile 三档显式选择（scan-profile.js 从 argv 读；互斥见下方 PROFILE_FLAGS 检测）
    '--adopt-branch', // execute 显式收编既有 sillyspec/<change> 分支为 worktree 工作分支（坑 worktree-user-branch-conflict）
    '--diff', '--base', '--full', '--report', // scan diff（D-001：command.js 只补 flag，裸 token 解析归 index.js 子命令拦截）
    '-h',
  ])
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i]
    if (f.startsWith('--')) {
      if (!knownFlags.has(f)) {
        // F10: flag 级 did-you-mean（此前只命令级有）；F10b：语义别名定向提示优先于形近猜测
        const semanticHint = FLAG_SEMANTIC_HINTS[f]
        console.error(`❌ 未知参数: ${f}`)
        if (semanticHint) {
          console.error(`   ${semanticHint}`)
        } else {
          const suggestion = didYouMean(f, [...knownFlags])
          if (suggestion) console.error(`   你是想输入「${suggestion}」吗？`)
          else console.error(`已知参数: ${[...knownFlags].sort().join(', ')}`)
        }
        process.exit(2) // 用法错 → exit 2
      }
      // F2: 只有吃值的 flag 才跳下一个 token。布尔 flag（--done 等）不能 i++——
      // 否则会把紧跟的 typo flag 当成 --done 的「值」吞掉，既不校验也不生效（静默忽略）。
      if (VALUE_FLAGS.has(f)) i++
    }
  }

  // ── --help/-h 短路：flag 校验通过后、任何副作用（cwd 纠正/会话创建/QUICKLOG 落盘）之前 ──
  // --help 此前在 knownFlags 白名单里被静默吞掉，run quick --help 会误开 quick 会话+写骨架
  // 条目（查询意图不该有副作用）；-h 更是被当未知参数 exit 2。帮助查询 = 用法展示 = 退出 0。
  if (flags.includes('--help') || flags.includes('-h')) {
    printStageUsage(stageName)
    process.exit(0)
  }

  // 坑 quick-no-input-placeholder-title（2026-08-24 用户反馈二期①）：全新 quick 会话（上方
  // 刚生成新 sessionId）不带 --input 且无 --linked-changes 可取标题 → 拒绝启动（exit 2）。
  // 旧行为只 warn 提示「建议放弃重启」，占位标题「(quick 任务)」已落盘、只能 reset 重来——
  // 语义标题要拖到最终 --done 才回填，平台「快速修复」列表全程隐藏。此刻零沉没成本（progress
  // 行/QUICKLOG/guard 均未创建），直接拒掉最便宜。放在 --help 短路之后（help 查询不该被拦）、
  // 任何会话副作用之前。精确恢复（--change quick-<hex>）与 done-like（--done/--reset/--cancel/
  // --status/--skip/--reopen）不受限；--linked-changes 启动可从关联变更 proposal/design 提取标题。
  if (stageName === 'quick' && quickSidFresh
    && !(isDone || isStatus || isSkip || isReset || isReopen || isCancel)
    && !inputText && !(Array.isArray(linkedChanges) && linkedChanges.length > 0)) {
    console.error('❌ 新 quick 会话必须带 --input "<一句话任务描述>"（或 --linked-changes <a,b> 从关联变更取标题）。')
    console.error('   不带描述启动会落「(quick 任务)」占位标题：平台「快速修复」列表隐藏占位条目、语义标题要拖到最终 --done 才回填，长任务全程不可见。')
    console.error('   用法: sillyspec run quick --input "<一句话任务描述>" [--linked-changes <a,b>] [--files <...>]')
    process.exit(2) // 用法错（新会话无任务描述）→ exit 2
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

  // task-03 (D-005@v2 / FR-04): READONLY_AUXILIARY_STAGES（status/doctor）查询只读短路。
  // 无显式写 flag 时在 registerChange / ensureStageSteps 之前拦截，零副作用：
  //   - 目标 progress 不存在 → 提示「只读查询不建变更」exit 0（不 initChange、不建 default 行，治 8b）
  //   - 目标 progress 存在 → 只读展示，不 seed steps、不刷新 lastActive、不 registerChange
  //     （治 B7 多 agent 并发 lastActive 互相覆盖）
  // 显式写意图不短路：doctor 写操作 flag（--cleanup-remnant / --align-execute-progress）与
  // 步骤动作 flag（--done/--skip/--reset/--reopen/--wait/--continue）走原写路径；--status 本身
  // 是只读查询，纳入短路。--fix 是 worktree doctor 的 flag 不在此列（design.md Phase 4）。
  const READONLY_WRITE_ACTIONS = ['--cleanup-remnant', '--align-execute-progress', '--done', '--skip', '--reset', '--reopen', '--wait', '--continue']
  if (READONLY_AUXILIARY_STAGES.includes(stageName) && !flags.some(f => READONLY_WRITE_ACTIONS.includes(f))) {
    if (!progress) {
      console.log('ℹ️ 未找到进度数据（只读查询不建变更）')
      process.exit(0)
    }
    // 只读展示路径：复用阶段定义渲染当前步骤 prompt（outputStep 对 status/doctor 纯只读），
    // 不落盘任何 progress 改动。--status 走现有 showStatus 展示。
    const readOnlyChange = changeName || progress.currentChange || resolveChangeName(cwd, progress, specRoot)
    if (isStatus) {
      let nextSuggestion = null
      try { nextSuggestion = pm._getNextSuggestion(progress) } catch { /* 读建议失败不阻断展示 */ }
      return showStatus(progress, stageName, nextSuggestion)
    }
    const readonlySteps = await getStageSteps(stageName, cwd, progress, specRoot)
    if (readonlySteps && readonlySteps.length > 0) {
      // 已有进度（历史 seed 过）则渲染当前待办步；无进度从首步开始
      const existingSteps = progress.stages?.[stageName]?.steps
      const pendingIdx = existingSteps ? existingSteps.findIndex(s => s.status === 'pending' || s.status === 'in-progress' || s.status === 'blocked') : -1
      const stepIdx = pendingIdx !== -1 ? pendingIdx : 0
      await outputStep(stageName, stepIdx, readonlySteps, cwd, readOnlyChange, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, stageName))
    }
    return
  }

  if (!progress) {
    // 如果指定了变更名或有变更目录，自动初始化变更的 progress
    const autoChange = changeName || resolveChangeNameAuto(cwd, specRoot)
    if (autoChange) {
      // 创建时即写 title（与 name/KEY 同时落 db）：--input 需求描述 sanitizeDesc 优先，无则用 name 兜底。
      // proposal 还没写、无权威标题来源，这是临时值；brainstorm/plan 完成 proposal/design 落盘后由
      // complete.js 通用完成路径 deriveTitleFromLinkedChange 刷新为真实 # 标题（与 quick 启动 title 同源）。
      progress = pm.initChange(cwd, autoChange, { title: inputText ? sanitizeDesc(inputText) : autoChange })
    } else if (isAuxiliary) {
      let autoName = changeName || resolveChangeNameAuto(cwd, specRoot) || 'default'
      // archive 特例：归档后变更从活跃列表排除（listChanges WHERE status='active'），
      // 不带 --change 回退 default 会读错变更。无活跃变更时取最新归档变更，读其现有 progress。
      // 归档目录名 = 原变更名恒等迁移（archiveDestDirName 不改名），直接原名对读——此前按
      // 「日期前缀过滤 + 剥日期」找，剥出的短名与 DB 行名（含日期）恒不符 → pm.read 返回
      // null → initChange 凭空建幻影变更再跑 archive（坑 archive-fallback-phantom-change）。
      if (stageName === 'archive' && autoName === 'default') {
        try {
          const archiveDir = join(specBase, 'changes', 'archive')
          if (existsSync(archiveDir)) {
            const latest = readdirSync(archiveDir, { withFileTypes: true })
              .filter(d => d.isDirectory())
              .map(d => d.name)
              .sort()
              .pop()
            if (latest) {
              autoName = latest
              progress = pm.read(cwd, autoName)
            }
          }
        } catch {}
      }
      changeName = autoName
      if (!progress) {
        // auxiliary 创建也写 title（--input 优先 / name 兜底），同上完整流程语义。
        progress = pm.initChange(cwd, autoName, { title: inputText ? sanitizeDesc(inputText) : autoName })
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
        // task-03 (D-006@v1 / FR-05): 无 --change 仅当无已存在活跃变更时 auto-create；
        // 多活跃变更仓强制 --change（exit 2 引导），防 B8 幽灵变更。活跃变更数用 pm.listChanges
        // （与 progress show 同源，DB changes 表 status='active'）。
        const activeChanges = pm.listChanges(cwd)
        if (activeChanges.length > 0) {
          console.error(`❌ 已存在 ${activeChanges.length} 个活跃变更，run brainstorm 无 --change 不会自动创建新变更。`)
          console.error(`   活跃变更：${activeChanges.join('、')}`)
          console.error('   请用 --change <变更名> 指定要操作的变更，')
          console.error('   或先归档/收尾现有活跃变更后重试。')
          process.exit(2) // 用法错（多活跃变更未指定 --change）→ exit 2
        }
        const date = new Date().toISOString().slice(0, 10)
        const autoName = `${date}-new-change-${randomBytes(4).toString('hex')}`
        console.log(`🔄 自动创建变更：${autoName}`)
        console.log(`  提示：可以用 --change <名称> 指定自定义变更名`)
        console.log(`  或事后重命名：sillyspec change-rename ${autoName} <新名称>`)
        // brainstorm 自动创建变更也写 title（--input 需求描述优先 / 自动名兜底），proposal 落盘后刷新。
        progress = pm.initChange(cwd, autoName, { title: inputText ? sanitizeDesc(inputText) : autoName })
        changeName = autoName
      } else {
        console.error('❌ 未找到进度数据，请先运行 sillyspec init 或指定 --change <变更名>')
        // 自愈引导（坑 suggestion-command-missing-change 同族）：多活跃变更仓不带 --change 时
        // pm.read 无法自动定位（单活跃可自动），列出候选让 agent 一步补对，而非盲猜变更名
        try {
          const activeChanges = pm.listChanges(cwd)
          if (activeChanges.length > 1) {
            console.error(`   当前有 ${activeChanges.length} 个活跃变更（无法自动定位），请显式指定：`)
            for (const c of activeChanges) console.error(`   - --change ${c}`)
          }
        } catch { /* 列举失败不掩盖原报错 */ }
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
    // execute 阶段在 reopen 时需要从最新 plan.md 重新解析 steps（plan 可能已变更）。
    // 按名保留旧状态（坑 execute-reopen-wipes-prior-completion）：reopenStage 的语义是
    // 「i < fromStep 保持原状（completed）」，此前预置全 pending 会把 fromStep 之前已完成的
    // 步骤一并清空——CLI 打印「从步骤 N 开始修订」、prompt 注入「之前已完成不需要重做」，
    // 实际 currentIdx 却回到 0，agent 被迫从头重做，修订语义完全失效。
    if (needsInit || stageName === 'execute') {
      const freshSteps = await getStageSteps(stageName, cwd, progress, specRoot)
      if (freshSteps && freshSteps.length > 0) {
        if (!progress.stages[stageName]) progress.stages[stageName] = { status: 'stale', steps: [] }
        const oldSteps = progress.stages[stageName].steps || []
        progress.stages[stageName].steps = freshSteps.map(s => {
          const old = oldSteps.find(step => step.name === s.name)
          return old ? { ...old } : { name: s.name, status: 'pending' }
        })
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

  // ── quick --cancel：误启动会话的取消口（数据源 quicklog.js cancelQuickSession）──
  // --change 取 quick-<uuid8> 会话 ID（quick 启动时 CLI echo 的 sessionId）；qlId 从会话 guard
  // 或 --ql 显式参数解析。取消后 db 行注销（quick 会话行非真实变更，直接 unregister 安全）。
  if (stageName === 'quick' && isCancel) {
    const cancelSessionRaw = quickSessionId || changeName
    const qlFlag = getFlagValue('--ql')
    if (!cancelSessionRaw || cancelSessionRaw === 'quick-unknown') {
      console.error('用法: sillyspec run quick --cancel --change <quick-会话ID> [--ql <ql-xxx>]\n  取消误启动的 quick 会话：QUICKLOG 条目翻「已取消」+ tasks.md 挂载行移除 + 会话目录清理 + db 行注销。\n  已完成/已勾选的会话拒绝取消（真实工作记录）')
      process.exit(2)
    }
    const specBase = resolveSpecDir(cwd, { specDir })
    // qlId 优先 --ql 显式；否则读会话 guard.json（allocate 时 CLI 写入）；再退 current marker 旁的会话
    let qlId = qlFlag
    if (!qlId) {
      const guardPath = join(specBase, '.runtime', 'quick-sessions', cancelSessionRaw, 'guard.json')
      try {
        if (existsSync(guardPath)) qlId = JSON.parse(readFileSync(guardPath, 'utf8')).qlId
      } catch { /* guard 损坏 → 下面按找不到报错 */ }
    }
    if (!qlId) {
      console.error(`❌ 无法定位会话 ${cancelSessionRaw} 的 qlId（guard.json 缺失/损坏）——显式传 --ql <ql-xxx>（QUICKLOG 条目头）`)
      process.exit(1)
    }
    let gitUser = 'unknown'
    try { gitUser = (await import('../git-helper.js')).git(cwd, ['config', 'user.name']) || 'unknown' } catch {}
    const { cancelQuickSession } = await import('../quicklog.js')
    let result
    try {
      result = await cancelQuickSession({ specBase, gitUser, qlId, sessionId: cancelSessionRaw })
    } catch (e) {
      console.error(`❌ 取消失败: ${e.message}`)
      process.exit(1)
    }
    if (!result.ok) {
      console.error(`❌ 取消失败: ${result.reason}`)
      process.exit(1)
    }
    // db 侧：quick 会话行注销（quick-<uuid8> 是进度库里的会话行，非真实变更目录）
    try {
      pm.unregisterChange(cwd, cancelSessionRaw)
    } catch { /* 行不存在/平台模式 → 会话目录清理已完成，db 无行可注销不算失败 */ }
    console.log(`🗑️  已取消 quick 会话 ${cancelSessionRaw}（qlId ${qlId}）`)
    console.log(`   QUICKLOG 条目翻「已取消」: ${result.quicklogFile}`)
    if (result.removedTaskRows.length > 0) console.log(`   tasks.md 挂载行已移除: ${result.removedTaskRows.join('、')}`)
    console.log('   会话 guard 目录与 current marker 已清理（已完成条目不会被取消）')
    return
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

  // --file-notes 非末步静默忽略前置 warn（坑 quick-file-notes-nonfinal-ignored，2026-08-22 实证：
  // step2 --done 传 --file-notes 被静默丢——CLI 短进程，注入随进程结束即丢，白传一轮）。
  // 放此处：ensureStageSteps 之后 progress 已就绪可判步骤状态；仅 quick + 带了 --file-notes +
  // 非「唯一 pending 的末步 --done」时提示。末步 --done 是消费点，不提示。
  if (quickFileNotes !== '' && stageName === 'quick' && !isStatus) {
    try {
      const qSteps = progress?.stages?.quick?.steps
      const pendingCount = Array.isArray(qSteps) ? qSteps.filter(st => ['pending', 'in-progress'].includes(st?.status)).length : 0
      if (!isDone || pendingCount > 1) {
        console.warn(`⚠️ --file-notes 本次不会生效：它只在 quick 末步（暂存和更新记录）--done 时随收尾消费——CLI 是短进程，本次注入随进程结束即丢。请在末步 --done 时连同 --output 一起传。`)
      }
    } catch { /* 判定失败不提示（fail-open） */ }
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
    // task-03 (D-004@v1 / FR-02): --done 与 runStage（stage.js:35-45）同源状态转换守卫，
    // 含 fromStageData 透传（让 scan failed_post_check 门控对 --done 同样生效）。
    // auxiliary 的 --done 不受影响（checkTransition 对 auxiliary toStage 放行，见 stage-contract.js）。
    // --skip-approval 绕过语义对齐 runStage（打错但放行）。
    const prevStage = progress.currentStage || ''
    const fromStageData = (progress.stages && prevStage && progress.stages[prevStage]) || undefined
    const transition = checkTransition(prevStage, stageName, fromStageData ? { fromStageData } : {})
    if (!transition.allowed) {
      console.error(`❌ 阶段转换不允许: ${prevStage || '(起始)'} → ${stageName}`)
      console.error(`   原因: ${transition.reason}`)
      console.error(`   提示: 使用 --skip-approval 绕过（需明确意图）`)
      if (!isSkipApproval) {
        process.exit(1)
      }
    }
    const doneAnswer = getFlagValue('--answer')
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText, { confirm: isConfirm, changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts, doneAnswer, isForceBaseline, isAllowNew, isAllowDelete })
  }

  // 默认：输出当前步骤
  return await runStage(pm, progress, stageName, cwd, effectiveChange, isSkipApproval, platformOpts, { quickFiles, isAllowNew, isAllowDelete, isForceBaseline, isForceRescan, linkedChanges, taskDescription: inputText, adoptBranch: stageName === 'execute' && flags.includes('--adopt-branch') })
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

  const firstPending = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress' || s.status === 'blocked')

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
    const icon = step.status === 'completed' ? '✅' : step.status === 'skipped' ? '⏭️' : step.status === 'waiting' ? '⏸️' : step.status === 'blocked' ? '🚫' : '⬜'
    const isCurrent = (step.status === 'pending' || step.status === 'in-progress' || step.status === 'blocked') && i === firstPending
    const isWaiting = step.status === 'waiting'
    console.log(`${icon} Step ${i + 1}: ${step.name}${isCurrent ? ' ← 当前' : ''}${isWaiting ? ' [WAITING]' : ''}${step.status === 'blocked' ? ' [BLOCKED]' : ''}`)
    if (step.status === 'blocked') {
      console.log(`       此前被门控阻断——${step.blockReason || 'deps 未就绪 / review.json 不完整'}；修复后重跑 --done 即恢复，无需 --reset`)
    }
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
        const cleanResult = wm.cleanup(changeName, { force: true })
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
    // 跨仓 worktree 一并清理（坑 cross-repo-no-worktree-isolation）：否则下次 execute 因 meta
    // 存在复用带脏状态的旧跨仓 worktree
    try {
      const { cleanupCrossWorktrees } = await import('../worktree-cross.js')
      const cross = cleanupCrossWorktrees({
        cwd, changeName,
        specBase: platformOpts?.specRoot || join(cwd, '.sillyspec'),
        force: true,
      })
      for (const cr of cross.results) {
        if (cr.result === 'cleaned') console.log(`🧹 已清理跨仓 worktree repo=${cr.repoKey}，下次 execute 将重建`)
        else if (cr.result === 'partial') console.warn(`⚠️ 跨仓 repo=${cr.repoKey} 清理残留: ${(cr.details || []).join('; ')} ${(cr.residual || []).join('; ')}`)
      }
    } catch (e) {
      console.warn(`⚠️  reset 清理跨仓 worktree 失败（不阻断 reset）: ${e.message}`)
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
  // F4 守卫（坑 raw-flag-value-bypass，与 runCommand getFlagValue 同款）：裸 flags[idx+1] 会把
  // 漏值后紧跟的 flag 名当值（--output --done → outputText="--done" 污染落盘 output）。
  const autoFlagValue = (name) => {
    const i = flags.indexOf(name)
    const next = i !== -1 ? flags[i + 1] : undefined
    return next && !String(next).startsWith('--') ? next : null
  }
  const outputText = autoFlagValue('--output')
  const inputText = autoFlagValue('--input')
  const skipApproval = flags.includes('--skip-approval')
  const explicitMode = autoFlagValue('--mode')
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
    // specRoot 必传（坑 auto-mode-specroot-miss）：平台模式 specRoot 是外部目录，漏传时
    // getStageSteps 从 cwd 推导 miss 掉 plan/execute 动态步骤（buildPlanSteps(null) 只剩
    // 2 步 fixedPrefix），种出的步骤表两次 --done 即判阶段完成，与 getAutoSteps 渲染双轨失配
    const changed = await ensureStageSteps(progress, stage, cwd, platformOpts?.specRoot || null)
    if (stageChanged || changed) {
      pm._write(cwd, progress, changeName)
      triggerSync(cwd, changeName, platformOpts)
    }
    progress = pm.read(cwd, changeName)
    return progress
  }

  // ── Classify change on first entry ──
  if (!progress.stages?.brainstorm?.status && !progress.stages?.plan?.status) {
    const { classifyChange, readAutoModeFromLocalYaml } = await import('../classify-change.js')
    // auto_mode 接线（2026-08-11）：从 local.yaml 读 auto_mode 段传 localConfig，让 force_*_patterns 真生效。
    const localConfig = readAutoModeFromLocalYaml(cwd)
    const classification = classifyChange({ description: inputText || '', explicitMode, localConfig })
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
    const pendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress' || step.status === 'blocked') ?? -1
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
        // HUB-07：unknown 醒目警告 + 留痕（原单行 warn 不显眼且无记录）
        if (approval.status === 'unknown') {
          warnApprovalUnknown(cwd, changeName, approval.reason)
        }
      }
    }
    await outputStep(currentStage, pendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, currentStage))
    return
  }

  if (!outputText) {
    console.error('auto --done requires --output')
    process.exit(2) // 用法错 → exit 2
  }

  const result = await completeStep(pm, progress, currentStage, cwd, outputText, inputText, { printNext: false, changeName, platformOpts })
  if (!result) return
  progress = pm.read(cwd, changeName)
  // change 行被并发归档/删除时 read 返回 null（体检 BUG-05）：引导排查而非 TypeError 崩溃
  if (!progress) {
    console.error(`❌ 完成步骤后进度数据消失（变更 ${changeName} 可能被并发归档/删除），请用 sillyspec progress show 核对当前状态`)
    process.exitCode = 1
    return
  }

  const nextPendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress' || step.status === 'blocked') ?? -1
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
        // HUB-07：unknown 醒目警告 + 留痕（原单行 warn 不显眼且无记录）
        if (approval.status === 'unknown') {
          warnApprovalUnknown(cwd, changeName, approval.reason)
        }
      }
    }
    await outputStep(currentStage, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, currentStage))
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
  // specRoot 同上（坑 auto-mode-specroot-miss）：平台模式动态步骤表必须从外部 specRoot 构建
  await ensureStageSteps(progress, next, cwd, platformOpts?.specRoot || null)
  pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
  progress = pm.read(cwd, changeName)
  // 同 BUG-05：写入后被并发删除的窗口，null 直接解引用会 TypeError
  if (!progress) {
    console.error(`❌ 阶段推进后进度数据消失（变更 ${changeName} 可能被并发归档/删除），请用 sillyspec progress show 核对当前状态`)
    process.exitCode = 1
    return
  }

  console.log(`\n${currentStage} complete. Auto advanced to ${next}.`)
  const nextSteps = await getAutoSteps(next)
  const firstPending = progress.stages[next]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress' || step.status === 'blocked') ?? -1
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
        // HUB-07：unknown 醒目警告 + 留痕（原单行 warn 不显眼且无记录）
        if (approval.status === 'unknown') {
          warnApprovalUnknown(cwd, changeName, approval.reason)
        }
      }
    }
    await outputStep(next, firstPending, nextSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, next))
  }
}

