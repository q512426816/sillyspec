/**
 * run.js 共享纯工具（W6 Step1 从 run.js 抽出）。
 *
 * 安全锚：run.js 始终是 barrel。这些函数搬至此模块后，run.js import 回来；
 * parsePorcelainPath + auditQuickCompletion 被 test 直接 import，run.js 必须 re-export。
 *
 * 路径修正（相对 src/run/）：
 *   - resolvePromptIncludes 的 templates/prompts 在仓库根 → __dirname 上两层
 *   - triggerSync 的动态 import './sync.js' → '../sync.js'（src/sync.js）
 *   - safeGit 原用顶层 require('child_process')，改静态 import execSync（更 ESM-native）
 */
import { basename, join, resolve, dirname } from 'node:path'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Wait State Constants ──（W6 Step3 从 run.js 搬入：prompt.js outputStep 与 run.js wait-detection 共用）
// 正则匹配：只识别独立一行的标记，避免误伤文档正文引用
export const WAIT_MARKER_RE = /^\s*\[(WAIT_FOR_USER|NEEDS_CONFIRM|NEEDS_DECISION)\]\s*$/m
import { buildExecuteSteps } from '../stages/execute.js'
import { buildPlanSteps } from '../stages/plan.js'
import { stageRegistry } from '../stages/index.js'

/**
 * 解析 prompt 中的 {{include: <name>}} 占位符：读包内 templates/prompts/<name>.md 注入。
 * 把 stage step prompt 里 self-contained 的大块抽到外部模板，CLI 端组装时注入——
 * agent 收到的仍是自包含 prompt 字符串，无需自己 Read。单次替换（不递归）；
 * 模板缺失则保留占位符并 warn，便于发现配置错误。
 */
export function resolvePromptIncludes(text) {
  return text.replace(/\{\{include:\s*([\w.-]+)\s*\}\}/g, (match, name) => {
    // shared.js 在 src/run/，templates/prompts 在仓库根 → 上两层
    const tplPath = join(__dirname, '..', '..', 'templates', 'prompts', `${name}.md`)
    if (!existsSync(tplPath)) {
      console.warn(`⚠️ prompt include 模板缺失: ${name} (期望: ${tplPath})`)
      return match
    }
    return readFileSync(tplPath, 'utf8')
  })
}

/**
 * 找 .sillyspec 祖先目录：用户指定 specDir 优先，否则从 cwd 向上找。
 * @param {string} cwd
 * @param {object} [opts]
 * @param {string} [opts.specDir] - 用户指定的 specDir（通过 --spec-dir 或 --spec-root）
 * @returns {string} 规范目录的绝对路径
 */
export function resolveSpecDir(cwd, opts = {}) {
  if (opts.specDir) return resolve(opts.specDir)
  let dir = resolve(cwd)
  while (true) {
    const candidate = join(dir, '.sillyspec')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return join(resolve(cwd), '.sillyspec')
}

/**
 * 统一查找变更目录（与 progress.js 的变更检测逻辑一致）。
 */
export function resolveChangeDir(cwd, progress, specDir = null) {
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null

  // 1. 优先用 currentChange
  if (progress.currentChange) {
    const target = join(changesDir, progress.currentChange)
    if (existsSync(target)) return target
  }

  // 2. fallback：唯一非 archive 目录
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return join(changesDir, entries[0].name)

  return null
}

/**
 * 触发 sync（平台模式走自己的链路，跳过；否则 await import sync.js）。
 */
export async function triggerSync(cwd, changeName, platformOpts = {}) {
  // 平台模式（SillyHub）走自己的回传链路，不走 CLI 内置 sync
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return
  try {
    if (changeName && !existsSync(join(cwd, '.sillyspec', 'changes', changeName))) return
    // shared.js 在 src/run/，sync.js 在 src/ → 退一层
    const syncMod = await import('../sync.js')
    await syncMod.sync(changeName, cwd)
  } catch (e) {
    // sync.js 不存在或同步失败，静默跳过
    console.warn('⚠️ 同步失败:', e.message)
  }
}

/**
 * 审批检查：execute 阶段启动前检查（W6 Step8a 从 run.js 搬入，runStage + runAutoMode 共用）。
 * 平台模式走自己的链路，跳过；否则 await import sync.js。
 * @returns {{ status: string, reason?: string } | null}
 */
export async function checkApproval(cwd, changeName, platformOpts = {}) {
  // 平台模式不需要 CLI 内置审批检查
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return null
  try {
    // shared.js 在 src/run/，sync.js 在 src/ → 退一层
    const syncMod = await import('../sync.js')
    return await syncMod.checkApproval(changeName, cwd)
  } catch (e) {
    return null
  }
}

/**
 * 安全执行 git：-c safe.directory per-command（不污染全局 config）+ -C cwd。
 * @returns {{ value: string|null, error: string|null }}
 */
export function safeGit(cwd, args) {
  const fullArgs = ['-c', `safe.directory=${cwd}`, '-C', cwd, ...args]
  try {
    const value = execSync(['git', ...fullArgs].join(' '), { encoding: 'utf8', timeout: 5000 }).trim()
    return { value, error: null }
  } catch (e) {
    return { value: null, error: e.message.split('\n')[0] }
  }
}

/**
 * 解析 git status --porcelain 单行 → 文件路径（去引号/处理 rename/归一化）。
 * 注意：line.slice(3) —— porcelain 行前 2 字符是状态码 + 1 空格，路径从 index 3 开始。
 */
export function parsePorcelainPath(line) {
  if (!line) return ''
  let path = line.slice(3).trim()
  if (path.length >= 2 && path.startsWith('"') && path.endsWith('"')) {
    path = path.slice(1, -1).replace(/\\(.)/g, (_, c) => c)
  }
  const arrow = path.indexOf(' -> ')
  if (arrow !== -1) path = path.slice(arrow + 4)
  return path.replace(/\\/g, '/')
}

/**
 * quick 完成审计：对比 baseline 与实际变更。
 * @returns {{ status: 'safe'|'warning'|'blocked', reasons: string[], changedFiles: string[], newFiles: string[], deletedFiles: string[], baselineHit: string[] }}
 */
export async function auditQuickCompletion(cwd, guard, options = {}) {
  const { baselineFiles, allowedFiles = [], allowNew = false, forceBaseline = false } = guard
  const { isConfirm } = options
  const result = { status: 'safe', reasons: [], changedFiles: [], newFiles: [], deletedFiles: [], baselineHit: [] }

  try {
    const gitStatus = execSync('git status --porcelain', { cwd, encoding: 'utf8', timeout: 10000 })
    // 不对整段 .trim()：会削首行前导空格致首文件路径丢首字符（见 parsePorcelainPath 注释）。
    const currentEntries = gitStatus.split('\n').filter(Boolean)

    const normalizeGitPath = (p) => p.replace(/\\/g, '/')
    // step1 启动时记录的全量脏文件 = 预存改动（非本次 quick 产生）。审计必须排除它们，
    // 否则脏工作区下预存文件持续留在 git status → 命中 baselineFiles → 误判「覆盖 baseline」
    // → 永远 blocked（--force-baseline 也救不回来，因为 status 判定看 baselineHit 数组）。
    // 前缀匹配：baseline 录入时未跟踪目录会被 git 折叠成 `dir/`（带尾斜杠）token，审计时若该
    // 目录下文件被跟踪则展开成文件级 `dir/file`——精确匹配对不上，故尾斜杠 token 按目录前缀放行。
    const normBaseline = (baselineFiles || []).map(f => normalizeGitPath(f))
    const baselineExact = new Set(normBaseline.filter(f => !f.endsWith('/')))
    const baselineDirs = normBaseline.filter(f => f.endsWith('/'))
    const isBaselineFile = (p) => {
      const f = normalizeGitPath(p)
      return baselineExact.has(f) || baselineDirs.some(d => f.startsWith(d))
    }
    // quick 自己没有 .sillyspec/changes/ 目录——该路径下任何文件要么是关联变更（reverse-sync），
    // 要么是并发其他会话的变更工作。多会话并行时别人的 changes/ 不应被本 quick 审计拦截
    // （确定性校验无法区分「并发工作」与「本 quick 偷建变更」，后者这类意图软判定留给 sillyhub）。
    // 故：非关联变更目录整体放行；关联变更的文件仍走正常审计（reverse-sync 可见，需 --force-baseline）。
    const linkedChangeNames = new Set((Array.isArray(guard.linkedChanges) ? guard.linkedChanges : []).map(c => normalizeGitPath(c)))
    const isQuickMetadata = (p) => {
      const file = normalizeGitPath(p)
      if (file.startsWith('.sillyspec/quicklog/')
        || file.startsWith('.sillyspec/.runtime/')
        || file === '.sillyspec/knowledge/uncategorized.md'
        || (/^\.sillyspec\/docs\/[^/]+\/modules\/[^/]+\.md$/.test(file))
        || (/^\.sillyspec\/docs\/[^/]+\/modules\/_module-map\.yaml$/.test(file))) return true
      // .sillyspec/changes/ 下：bare 折叠 token（git 把全新未跟踪 changes/ 折叠成 `changes/`）
      // 或具体但【非关联】的变更 → 都属并发其他会话工作，放行；关联变更文件仍走审计。
      if (file.startsWith('.sillyspec/changes/')) {
        const m = file.match(/^\.sillyspec\/changes\/([^/]+)(\/|$)/)
        if (!m || !linkedChangeNames.has(m[1])) return true
      }
      return false
    }
    const DANGEROUS_PATTERNS = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.eslintrc',
      'tsconfig.json',
      'src/db.js',
      'src/progress.js',
      'src/run.js',
      'src/stage-contract.js',
      'src/worktree.js',
      'src/worktree-apply.js',
      'src/hooks/',
    ]

    for (const entry of currentEntries) {
      const status = entry.slice(0, 2).trim()
      const file = parsePorcelainPath(entry)   // 已去引号/处理 rename/归一化，修正首行丢首字符
      if (!file) continue

      // 预存脏文件：step1 baseline 已记录，非本次 quick 产生，跳过审计（含折叠目录前缀匹配）
      if (isBaselineFile(file)) continue

      result.changedFiles.push(file)
      if (status === 'D' || status === ' D') result.deletedFiles.push(file)
      if (status === '??') result.newFiles.push(file)

      // 检查是否命中 baseline protected files
      if (baselineFiles.includes(file)) {
        result.baselineHit.push(file)
      }

      // 检查危险文件（除非 force-baseline）
      if (file.startsWith('.sillyspec/') && !isQuickMetadata(file) && !forceBaseline) {
        result.reasons.push(`危险文件变更: ${file}`)
      }

      if (DANGEROUS_PATTERNS.some(p => file === p || file.startsWith(p)) && !forceBaseline) {
        result.reasons.push(`危险文件变更: ${file}`)
      }
    }

    // 检查 deleted files
    for (const f of result.deletedFiles) {
      result.reasons.push(`删除文件: ${f}`)
    }

    // 检查 baseline hit（除非 force-baseline）
    if (!forceBaseline) {
      for (const f of result.baselineHit) {
        result.reasons.push(`覆盖 baseline 文件: ${f}`)
      }
    }

    // 检查 new files（除非 allow-new）
    if (!allowNew) {
      for (const f of result.newFiles) {
        if (!isQuickMetadata(f)) {
          result.reasons.push(`新增文件（需 --allow-new）: ${f}`)
        }
      }
    }

    // 检查 allowedFiles 范围
    if (allowedFiles.length > 0) {
      for (const f of result.changedFiles) {
        if (!allowedFiles.includes(f) && !isQuickMetadata(f)) {
          result.reasons.push(`超出 allowedFiles: ${f}`)
        }
      }
    }

    // 判定结果（force-baseline 降级 baselineHit → 非 blocked；allow-new 降级新增文件 → 非 warning。
    // reasons 文案本就受这两个 flag 控制，但原判定直接看数组长度，致 flag 对 status 失效。）
    if ((!forceBaseline && result.baselineHit.length > 0) || result.deletedFiles.length > 0 || result.reasons.some(r => r.startsWith('危险') || r.startsWith('删除'))) {
      result.status = 'blocked'
    } else if ((!allowNew && result.newFiles.length > 0) || (allowedFiles.length > 0 && result.reasons.some(r => r.startsWith('超出')))) {
      result.status = 'warning'
    }

    // quicklog 存在性检查
    try {
      const quicklogDir = join(cwd, '.sillyspec', 'quicklog')
      if (existsSync(quicklogDir)) {
        const qlFiles = readdirSync(quicklogDir).filter(f => f.endsWith('.md'))
        if (qlFiles.length === 0) {
          result.reasons.push('quicklog 目录为空（无任务记录）')
          if (result.status === 'safe') result.status = 'warning'
        }
      } else {
        result.reasons.push('quicklog 目录不存在（agent 未创建任务记录）')
        if (result.status === 'safe') result.status = 'warning'
      }
    } catch {}

    // --confirm 模式：展示 diff 并等待确认
    if (isConfirm && (result.status === 'warning' || result.status === 'blocked')) {
      console.log(`\n📋 quick 变更概览：`)
      console.log(`   新增: ${result.newFiles.length}, 修改: ${result.changedFiles.length - result.newFiles.length - result.deletedFiles.length}, 删除: ${result.deletedFiles.length}`)
      if (result.changedFiles.length > 0) {
        console.log(`\n   变更文件：`)
        for (const f of result.changedFiles) {
          const isBaseline = baselineFiles.includes(f)
          const isDangerous = DANGEROUS_PATTERNS.some(p => f.includes(p))
          const marker = isBaseline ? '🔴' : isDangerous ? '⚠️' : '  '
          console.log(`   ${marker} ${f}`)
        }
      }
      console.log(`\n   状态: ${result.status.toUpperCase()}`)
      if (result.reasons.length > 0) {
        console.log(`   原因:`)
        for (const r of result.reasons) {
          console.log(`     - ${r}`)
        }
      }
      console.log(`\n   如确认接受这些变更，重新运行 --done 时带上对应 flag 即可解锁：`)
      console.log(`     sillyspec run quick --done --force-baseline --allow-new --change <id> --output "..."`)
      console.log(`     （--force-baseline 覆盖受保护/危险文件如 src/run.js；--allow-new 允许新增文件）`)
      console.log(`   或在首个 sillyspec run quick 启动（step 1）时就声明这些 flag，持久化进 guard。`)
    }
  } catch (e) {
    result.reasons.push(`审计失败: ${e.message}`)
    result.status = 'warning'
  }

  return result
}

// ── Step 处理辅助（W6 Step7a 从 run.js 搬入：getStageSteps/formatWaitOptions 被 run.js + complete.js 共用）──
/**
 * 格式化 waitOptions 为人类可读字符串
 */
export function formatWaitOptions(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return raw
  } catch {
    return raw
  }
}


/**
 * 获取阶段的步骤定义（execute 需要动态构建）
 */
export async function getStageSteps(stageName, cwd, progress, specDir = null) {
  if (stageName === 'execute') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    let planFile = null
    let worktreePath = null
    if (changeDir) {
      const p = join(changeDir, 'plan.md')
      if (existsSync(p)) planFile = p
      // 自动检测 worktree 路径，注入 Wave prompt 的 workdir 指令
      // 修复：之前未传 worktreePath 给 buildExecuteSteps，导致 Wave prompt 缺失工作目录指令，
      // 子代理可能把文件写到主工作区而非 worktree 内，破坏隔离。
      try {
        const changeName = basename(changeDir)
        const { WorktreeManager } = await import('../worktree.js')
        const wm = new WorktreeManager({ cwd })
        const meta = wm.getMeta(changeName)
        if (meta?.worktreePath && existsSync(meta.worktreePath)) {
          worktreePath = meta.worktreePath
        }
      } catch {
        // 无 worktree meta 不阻断——可能是首次启动或 in-place 模式
      }
    }
    return buildExecuteSteps(planFile, { worktreePath })
  }
  if (stageName === 'plan') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    return buildPlanSteps(changeDir)
  }
  const def = stageRegistry[stageName]
  return def ? def.steps : null
}

