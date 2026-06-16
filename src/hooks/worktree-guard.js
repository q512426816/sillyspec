/**
 * worktree-guard.js — Hook 拦截判断逻辑
 *
 * 三重门禁：stageGate × locationGate × fileGate
 * 纯判断模块，不做实际的 hook 注入。
 *
 * P0 优化：
 * - 阶段检测 fallback：gate-status.json → sillyspec.db currentStage
 * - 拦截提示针对每个阶段给出具体修复建议
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'

// ── 常量 ──

const WORKTREE_STAGES = ['execute'] // 这些阶段必须在 worktree 里

const FILE_WHITELIST_EXTS = ['.md']
const FILE_WHITELIST_NAMES = ['package.json', 'tsconfig.json', 'local.yaml', 'local.yml']

/** 只读命令（命令名） */
const READONLY_COMMANDS = new Set([
  'grep', 'rg', 'ag', 'find', 'ls', 'cat', 'head', 'tail', 'wc', 'stat',
  'echo', 'pwd', 'basename', 'dirname', 'realpath',
  'node', 'npm', 'npx', // 只允许 --version 等只读子命令，在 matchReadonlyWhitelist 中处理
])

/** 只读 git 子命令 */
const READONLY_GIT_SUBS = new Set(['diff', 'status', 'log', 'show', 'branch', 'stash'])

/** 危险 git 子命令 */
const DANGER_GIT_SUBS = new Set([
  'add', 'commit', 'push', 'checkout', 'restore', 'reset', 'clean',
  'mv', 'rm',
])

/** 危险 git stash 操作 */
const DANGER_STASH_ACTIONS = new Set(['drop', 'clear', 'pop'])

/** 危险命令前缀 */
const DANGER_PREFIXES = ['sudo', 'rm -rf', 'rm -r', 'rmdir']

// ── 阶段 → 拦截提示映射 ──

const STAGE_HINTS = {
  '(none)': [
    '没有检测到活跃的 SillySpec 流程。',
    '你需要先启动一个任务流程才能修改源码（调用对应的 sillyspec skill）：',
    '',
    '  BUG修复(skill sillyspec-quick)：sillyspec run quick "任务描述"',
    '  逻辑变更(skill sillyspec-brainstorm)：sillyspec run brainstorm → plan → execute → verify → archive',
    '  全自动模式(skill sillyspec-auto)：sillyspec run auto "任务描述"',
  ],
  'brainstorm': [
    '当前在 brainstorm（需求分析）阶段，这个阶段只写文档，不写代码。',
    '完成 brainstorm 后，流程会自动推进到 plan → execute。',
    'execute 阶段才允许写代码。',
  ],
  'plan': [
    '当前在 plan（计划制定）阶段，这个阶段只写计划文档和任务蓝图，不写代码。',
    '完成 plan 后，运行 sillyspec run execute 进入执行阶段。',
  ],
  'verify': [
    '当前在 verify（验证）阶段，只做代码审查和测试验证，不修改源码。',
    '如需修改，请先回到 execute 阶段或使用 quick 模式：',
    '  sillyspec run quick "修改描述"',
  ],
  'archive': [
    '当前在 archive（归档）阶段，不修改源码。',
    '如需修改，请开启新变更：sillyspec run quick "修改描述"',
  ],
  'explore': [
    '当前在 explore（探索）阶段，只读不写。',
    '确认方案后使用：sillyspec run brainstorm 或 sillyspec run quick',
  ],
}

// ── 辅助函数 ──

function resolveWorktreeDir(cwd) {
  return path.join(cwd, '.sillyspec', '.runtime', 'worktrees')
}

function findProjectRoot(cwd) {
  let dir = path.resolve(cwd || process.cwd())
  while (true) {
    if (
      existsSync(path.join(dir, '.sillyspec', '.runtime', 'gate-status.json')) ||
      existsSync(path.join(dir, '.sillyspec', '.runtime', 'sillyspec.db')) ||
      existsSync(path.join(dir, '.sillyspec', 'local.yaml')) ||
      existsSync(path.join(dir, '.sillyspec', 'local.yml')) ||
      existsSync(path.join(dir, '.sillyspec', 'projects'))
    ) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) return path.resolve(cwd || process.cwd())
    dir = parent
  }
}

function safeChangeName(changeName) {
  return typeof changeName === 'string'
    && changeName
    && !changeName.includes('..')
    && !changeName.includes('/')
    && !changeName.includes('\\')
}

function readWorktreeMeta(cwd, changeName) {
  if (!safeChangeName(changeName)) return null
  const metaPath = path.join(resolveWorktreeDir(cwd), changeName, 'meta.json')
  if (!existsSync(metaPath)) return null
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch {
    return null
  }
}

function isPathInside(child, parent) {
  if (!child || !parent) return false
  const absChild = path.resolve(child)
  const absParent = path.resolve(parent)
  return absChild === absParent || absChild.startsWith(absParent + path.sep)
}

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, '/')
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) return {}
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return {}
  const result = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) continue
    result[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim()
  }
  return result
}

function parseTimestamp(value) {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function getScanDocInfo(filePath) {
  const normalized = toPosixPath(path.resolve(filePath))
  const match = normalized.match(/^(.*)\/docs\/([^/]+)\/scan\/([^/]+\.md)$/)
  if (!match) return null
  return {
    specRoot: path.resolve(match[1]),
    projectName: match[2],
    docName: match[3],
  }
}

function readScanGuard(scanDocInfo, projectRoot) {
  const candidates = [
    path.join(scanDocInfo.specRoot, '.runtime', 'scan-guard.json'),
    path.join(projectRoot, '.sillyspec', '.runtime', 'scan-guard.json'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      return null
    }
  }
  return null
}

function shouldBlockScanDocOverwrite(filePath, projectRoot) {
  const scanDocInfo = getScanDocInfo(filePath)
  if (!scanDocInfo || !existsSync(filePath)) return { blocked: false }

  const guard = readScanGuard(scanDocInfo, projectRoot)
  if (!guard || guard.forceRescan) return { blocked: false }

  let frontmatter = {}
  try {
    frontmatter = parseFrontmatter(readFileSync(filePath, 'utf8'))
  } catch {
    return { blocked: false }
  }

  const relPath = toPosixPath(path.relative(projectRoot, filePath))
  if (frontmatter.source_commit && guard.sourceCommit && frontmatter.source_commit !== guard.sourceCommit) {
    return {
      blocked: true,
      reason: [
        `scan 覆盖保护：${relPath} 的 source_commit=${frontmatter.source_commit} 与当前 scan source_commit=${guard.sourceCommit} 不一致。`,
        '如确认要重新生成，请重新运行 scan 并添加 --force-rescan。',
      ].join('\n')
    }
  }

  const existingUpdatedAt = parseTimestamp(frontmatter.updated_at)
  const scanStartedAt = parseTimestamp(guard.startedAt)
  if (existingUpdatedAt && scanStartedAt && existingUpdatedAt > scanStartedAt) {
    return {
      blocked: true,
      reason: [
        `scan 覆盖保护：${relPath} 的 updated_at 晚于本次 scan 开始时间，可能包含手工编辑。`,
        '如确认要覆盖，请重新运行 scan 并添加 --force-rescan。',
      ].join('\n')
    }
  }

  return { blocked: false }
}

function isInsideWorktreeStorage(filePath, cwd) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd || process.cwd(), filePath)
  return isPathInside(absPath, resolveWorktreeDir(cwd || process.cwd()))
}

/**
 * 读取 gate-status.json
 * @param {string} cwd
 * @returns {{ stage: string, changes?: string[], updatedAt?: string } | null}
 */
function readGateStatus(cwd) {
  const p = path.join(cwd, '.sillyspec', '.runtime', 'gate-status.json')
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

/**
 * 从 sillyspec.db 读取 currentStage
 * 优先级：gate-status.json > sillyspec.db
 * @param {string} cwd
 * @returns {string|null} 阶段名，null 表示无法确定
 */
function readCurrentStage(cwd) {
  // 1. gate-status.json（高速缓存，权威来源）
  const gateStatus = readGateStatus(cwd)
  if (gateStatus && gateStatus.stage) return gateStatus.stage

  // 2. 从 sillyspec.db 读取（通过 sqlite3 CLI 同步调用）
  const dbPath = path.join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
  if (!existsSync(dbPath)) return null
  try {
    const { execSync } = require('child_process')
    const result = execSync(
      `sqlite3 "${dbPath}" "SELECT current_stage FROM changes WHERE status='active' AND current_stage IN ('execute','quick') ORDER BY last_active DESC LIMIT 1"`,
      { encoding: 'utf8', timeout: 2000 }
    ).trim()
    return result || null
  } catch { /* sqlite3 CLI 不可用或查询失败 */ }

  return null
}

/**
 * 检查当前变更是否处于 noWorktree 模式
 * @param {string} cwd
 * @returns {boolean}
 */
function isNoWorktreeMode(cwd) {
  // 1. 检查 gate-status.json
  const gateStatus = readGateStatus(cwd)
  if (gateStatus && gateStatus.noWorktree) return true

  // 2. 从 sillyspec.db 读取
  const dbPath = path.join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
  if (!existsSync(dbPath)) return false
  try {
    const { execSync } = require('child_process')
    const result = execSync(
      `sqlite3 "${dbPath}" "SELECT no_worktree FROM changes WHERE status='active' AND current_stage IN ('execute','quick') LIMIT 1"`,
      { encoding: 'utf8', timeout: 2000 }
    ).trim()
    return result === '1'
  } catch { /* sqlite3 CLI 不可用或查询失败 */ }

  return false
}

/**
 * 判断路径是否在 worktree 内
 * @param {string} filePath - 绝对路径
 * @returns {boolean}
 */
function isInsideRegisteredWorktree(filePath, cwd) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd || process.cwd(), filePath)
  const effectiveCwd = cwd || process.cwd()
  const gateStatus = readGateStatus(effectiveCwd)
  const changes = Array.isArray(gateStatus?.changes) ? gateStatus.changes : []

  for (const changeName of changes) {
    const meta = readWorktreeMeta(effectiveCwd, changeName)
    if (meta?.worktreePath && isPathInside(absPath, meta.worktreePath)) return true
  }

  return false
}

/**
 * 文件白名单：文档类/配置类始终放行
 * @param {string} filePath - 绝对路径
 * @returns {boolean}
 */
function matchFileWhitelist(filePath) {
  // 路径以 .sillyspec/ 开头
  const parts = filePath.split(path.sep)
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '.sillyspec') return true
  }

  // 路径在 .git/ 下
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === '.git') return true
  }

  // 扩展名
  const ext = path.extname(filePath)
  if (FILE_WHITELIST_EXTS.includes(ext)) return true

  // 文件名
  const base = path.basename(filePath)
  if (FILE_WHITELIST_NAMES.includes(base)) return true

  return false
}

/**
 * 读取 local.yaml 中的扩展白名单配置（如果存在）
 * @param {string} cwd
 * @returns {{ fileWhitelist?: string[], readonlyCommands?: string[] }}
 */
function loadLocalConfig(cwd) {
  const candidates = [
    path.join(cwd, '.sillyspec', 'local.yaml'),
    path.join(cwd, '.sillyspec', 'local.yml'),
    path.join(cwd, 'local.yaml'),
    path.join(cwd, 'local.yml'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      const content = readFileSync(p, 'utf8')
      return parseSimpleYaml(content)
    } catch {
      return {}
    }
  }
  return {}
}

function parseSimpleYaml(content) {
  const result = {}
  let topKey = null
  let childKey = null

  function parseValue(value) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1)
    }
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    return trimmed
  }

  for (const line of content.split('\n')) {
    const noComment = line.replace(/\s+#.*$/, '')
    const trimmed = noComment.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const indent = noComment.length - noComment.trimStart().length

    if (indent === 0) {
      const topLevelMatch = trimmed.match(/^([^:]+):\s*(.*)$/)
      if (!topLevelMatch) continue
      const key = topLevelMatch[1]
      const value = topLevelMatch[2]
      topKey = key
      childKey = null

      if (value.trim()) {
        result[key] = parseValue(value)
      } else {
        result[key] = {}
      }
      continue
    }

    if (!topKey) continue

    if (indent === 2 && trimmed.startsWith('- ')) {
      if (!Array.isArray(result[topKey])) result[topKey] = []
      result[topKey].push(parseValue(trimmed.slice(2)))
      continue
    }

    if (indent === 2) {
      const childMatch = trimmed.match(/^([^:]+):\s*(.*)$/)
      if (!childMatch) continue
      childKey = childMatch[1]
      const value = childMatch[2]
      if (typeof result[topKey] !== 'object' || Array.isArray(result[topKey])) result[topKey] = {}
      result[topKey][childKey] = value.trim() ? parseValue(value) : []
      continue
    }

    if (indent >= 4 && childKey && trimmed.startsWith('- ')) {
      if (typeof result[topKey] !== 'object' || Array.isArray(result[topKey])) result[topKey] = {}
      if (!Array.isArray(result[topKey][childKey])) result[topKey][childKey] = []
      result[topKey][childKey].push(parseValue(trimmed.slice(2)))
    }
  }

  for (const key of Object.keys(result)) {
    if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      if (Object.keys(result[key]).length === 0) {
        result[key] = {}
      }
    }
  }

  return result
}

/**
 * 提取命令中第一个可执行命令名
 * @param {string} command
 * @returns {string}
 */
function extractCommandName(command) {
  const trimmed = command.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0]
}

/**
 * 判断单个命令片段是否匹配只读白名单
 * @param {string} cmd - 单个命令片段（不含管道/链式操作符）
 * @param {string[]} extraReadonlyCommands - local.yaml 扩展的只读命令
 * @returns {boolean}
 */
function isSingleCommandReadonly(cmd, extraReadonlyCommands = []) {
  const trimmed = cmd.trim()
  if (!trimmed) return true // 空片段放行

  const parts = trimmed.split(/\s+/)
  const cmdName = parts[0]

  // 纯命令名匹配
  if (READONLY_COMMANDS.has(cmdName)) {
    // node/npm/npx 需要进一步检查子命令
    if (cmdName === 'node' || cmdName === 'npm' || cmdName === 'npx') {
      const rest = parts.slice(1).join(' ')
      return rest.includes('--version') || rest.includes('-v') && parts.length <= 3 || rest === 'run test' || rest.startsWith('test')
    }
    return true
  }

  // local.yaml 扩展
  if (extraReadonlyCommands.includes(cmdName)) return true

  // git 只读子命令
  if (cmdName === 'git') {
    const sub = parts[1] || ''
    if (READONLY_GIT_SUBS.has(sub)) return true
    // git stash list
    if (sub === 'stash' && (parts[2] === 'list' || parts.length === 2)) return true
    // git worktree 管理（list/add/remove）放行
    if (sub === 'worktree') return true
    return false
  }

  // sillyspec 命令全部放行（CLI 工具本身安全）
  if (cmdName === 'sillyspec') return true

  return false
}

/**
 * 判断单个命令片段是否匹配危险黑名单
 * @param {string} cmd - 单个命令片段
 * @returns {boolean}
 */
function isSingleCommandDangerous(cmd) {
  const trimmed = cmd.trim().toLowerCase()

  for (const prefix of DANGER_PREFIXES) {
    if (trimmed.startsWith(prefix)) return true
  }

  const parts = trimmed.split(/\s+/)
  const cmdName = parts[0]

  if (cmdName === 'git') {
    const sub = parts[1] || ''
    if (DANGER_GIT_SUBS.has(sub)) return true
    // git stash drop/clear/pop
    if (sub === 'stash' && DANGER_STASH_ACTIONS.has(parts[2] || '')) return true
  }

  // rm（不限于 -rf）
  if (cmdName === 'rm') return true

  return false
}

/**
 * 将命令按管道/链式操作符拆分为多个片段
 * @param {string} command
 * @returns {string[]}
 */
function splitCommandParts(command) {
  // 按管道和链式操作符拆分
  return command.split(/(?:\|\|&&|&&|\|)/g).map(s => s.trim()).filter(Boolean)
}

/**
 * 判断命令是否匹配只读白名单（含管道/链式检查）
 * @param {string} command
 * @param {string[]} extraReadonlyCommands
 * @returns {boolean}
 */
function matchReadonlyWhitelist(command, extraReadonlyCommands = []) {
  const parts = splitCommandParts(command)
  return parts.every(p => isSingleCommandReadonly(p, extraReadonlyCommands))
}

/**
 * 判断命令是否匹配危险黑名单（含管道/链式检查）
 * @param {string} command
 * @returns {boolean}
 */
function matchDangerBlacklist(command) {
  const parts = splitCommandParts(command)
  return parts.some(p => isSingleCommandDangerous(p))
}

/**
 * 构建阶段拦截提示
 * @param {string} stage
 * @returns {string}
 */
function buildStageHint(stage) {
  const hint = STAGE_HINTS[stage] || STAGE_HINTS['(none)']
  return hint.join('\n')
}

// ── 公共接口 ──

/**
 * 判断文件写入是否应被拦截
 *
 * 降级策略（无 worktree = 更严格）:
 * - noWorktree 模式下，execute/quick 阶段不允许源码写入（没有隔离环境）
 * - 除非同时设置 SILLYSPEC_DISABLE_HOOKS=1
 *
 * P0 优化：
 * - 使用 readCurrentStage() fallback 读取阶段（gate-status → progress）
 * - 拦截提示按阶段给出具体修复建议
 *
 * @param {string} filePath - 目标文件绝对路径
 * @param {string} cwd - 当前工作目录
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function shouldBlockWrite(filePath, cwd) {
  if (!filePath) return { blocked: true, reason: 'no file path' }

  const callerCwd = cwd || process.cwd()
  const projectRoot = findProjectRoot(callerCwd)
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(callerCwd, filePath)

  // 1. 阶段门禁（使用 fallback 读取）
  const stage = readCurrentStage(projectRoot) || '(none)'

  const scanGuardResult = shouldBlockScanDocOverwrite(absPath, projectRoot)
  if (scanGuardResult.blocked) return scanGuardResult

  // 2. 文件门禁：文档类/配置类始终放行，但 worktree 存储区内的源码必须继续走登记校验。
  if (!isInsideWorktreeStorage(absPath, projectRoot) && matchFileWhitelist(absPath)) return { blocked: false }

  if (!['execute', 'quick'].includes(stage)) {
    return {
      blocked: true,
      reason: buildStageHint(stage)
    }
  }

  // quick 阶段：检查 quick-guard.json 的 baselineFiles
  if (stage === 'quick') {
    try {
      const guardFile = path.join(projectRoot, '.sillyspec', '.runtime', 'quick-guard.json')
      const guard = JSON.parse(readFileSync(guardFile, 'utf8'))
      const baselineFiles = guard.baselineFiles || []
      const relTarget = path.relative(projectRoot, absPath)
      // 如果目标是 baseline protected file，阻止写入
      if (baselineFiles.some(f => relTarget === f || relTarget.startsWith(f + path.sep))) {
        return {
          blocked: true,
          reason: [
            `⚠️ quick 变更边界保护：${relTarget} 是 baseline 文件，不允许覆盖。`,
            `当前 quick 任务不能修改任务开始前已修改的文件。`,
            `如确需修改，请在 quick 完成后单独处理此文件。`,
          ].join('\n')
        }
      }
    } catch {
      // quick-guard.json 不存在（非 quick 任务或未记录），放行
    }
    return { blocked: false }
  }

  // execute 阶段：位置门禁
  if (isInsideRegisteredWorktree(absPath, projectRoot)) return { blocked: false }

  // noWorktree 模式：无隔离环境，禁止源码写入（降级到更严格）
  if (isNoWorktreeMode(projectRoot)) {
    return {
      blocked: true,
      reason: [
        '当前处于 --no-worktree 降级模式，不允许源码写入。',
        '如需修改源码，请移除 --no-worktree 标志重新执行。',
        '紧急情况可设置 SILLYSPEC_DISABLE_HOOKS=1 绕过限制。',
      ].join('\n')
    }
  }

  return {
    blocked: true,
    reason: [
      '源码修改只能在 worktree 隔离环境中进行。',
      '',
      '你可能需要：',
      '  1. 确认 worktree 已创建并登记：sillyspec worktree list',
      '  2. 如未创建，先创建：sillyspec worktree create <变更名>',
      '  3. 在 worktree 目录中工作（子代理的 cwd 设为 worktree 路径）',
      '',
      '如果你在 execute 阶段，通常会自动创建 worktree。',
      '检查是否跳过了 "创建 worktree" 步骤。',
    ].join('\n')
  }
}

/**
 * 判断 Bash 命令是否应被拦截
 * @param {string} command - Bash 命令字符串
 * @param {string} cwd - 当前工作目录
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function shouldBlockBash(command, cwd) {
  if (!command || !command.trim()) return { blocked: false }

  const callerCwd = cwd || process.cwd()
  const projectRoot = findProjectRoot(callerCwd)

  // cwd 在 worktree 内 → 全部放行
  if (isInsideRegisteredWorktree(callerCwd, projectRoot)) return { blocked: false }

  // 阶段门禁（使用 fallback 读取）
  const stage = readCurrentStage(projectRoot) || '(none)'

  if (!['execute', 'quick'].includes(stage)) {
    // 非 execute/quick 阶段，只允许只读白名单
    const localConfig = loadLocalConfig(projectRoot)
    const extraReadonly = localConfig.worktreeHook?.readonlyCommands || localConfig['worktree-hook']?.readonlyCommands || []
    if (matchReadonlyWhitelist(command, extraReadonly)) return { blocked: false }
    return {
      blocked: true,
      reason: buildStageHint(stage)
    }
  }

  // quick 阶段：检查 quick-guard.json
  if (stage === 'quick') {
    // 危险黑名单仍然拦截
    if (matchDangerBlacklist(command)) {
      return { blocked: true, reason: `dangerous command blocked: ${command.trim()}` }
    }
    // 检查命令是否会覆盖 baseline files
    try {
      const guardFile = path.join(projectRoot, '.sillyspec', '.runtime', 'quick-guard.json')
      const guard = JSON.parse(readFileSync(guardFile, 'utf8'))
      const baselineFiles = guard.baselineFiles || []
      // 检查命令中是否引用了 baseline file
      for (const f of baselineFiles) {
        if (command.includes(f) && (command.includes('> ') || command.includes(' tee ') || command.includes('sed ') || command.includes('mv '))) {
          return { blocked: true, reason: `quick 变更边界保护：命令可能覆盖 baseline 文件 ${f}` }
        }
      }
    } catch {}
    return { blocked: false }
  }

  // execute 阶段 + 主工作区
  const localConfig = loadLocalConfig(projectRoot)
  const extraReadonly = localConfig.worktreeHook?.readonlyCommands || localConfig['worktree-hook']?.readonlyCommands || []

  // 危险黑名单
  if (matchDangerBlacklist(command)) {
    return { blocked: true, reason: `dangerous command blocked: ${command.trim()}` }
  }

  // 只读白名单放行
  if (matchReadonlyWhitelist(command, extraReadonly)) return { blocked: false }

  // 不确定 → 放行
  return { blocked: false }
}

/**
 * 判断工具调用是否应被拦截
 * @param {{
 *   tool: 'Write' | 'Edit' | 'MultiEdit' | 'Bash',
 *   filePath?: string,
 *   filePaths?: string[],
 *   command?: string,
 *   cwd?: string
 * }} opts
 * @param {{ cwd?: string }} ctx
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function shouldBlock(opts, ctx = {}) {
  // 逃生开关
  if (process.env.SILLYSPEC_DISABLE_HOOKS === '1') return { blocked: false }

  const cwd = opts.cwd || ctx.cwd || process.cwd()

  switch (opts.tool) {
    case 'Write':
    case 'Edit': {
      const fp = opts.filePath
      if (!fp) return { blocked: true, reason: 'no file path' }
      const absPath = path.isAbsolute(fp) ? fp : path.resolve(cwd, fp)
      return shouldBlockWrite(absPath, cwd)
    }
    case 'MultiEdit': {
      const filePaths = opts.filePaths
      if (!filePaths || filePaths.length === 0) return { blocked: true, reason: 'no file paths' }
      for (const fp of filePaths) {
        const absPath = path.isAbsolute(fp) ? fp : path.resolve(cwd, fp)
        const result = shouldBlockWrite(absPath, cwd)
        if (result.blocked) return result
      }
      return { blocked: false }
    }
    case 'Bash': {
      return shouldBlockBash(opts.command || '', cwd)
    }
    default:
      return { blocked: false }
  }
}
