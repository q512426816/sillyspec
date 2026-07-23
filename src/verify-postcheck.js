/**
 * Verify Postcheck — CLI 客观测试执行与自报告对账
 *
 * verify 阶段历史上完全依赖 agent 自报告（跑没跑测试、结果如何全写在
 * verify-result.md 里），可被文案绕过。此模块让 CLI 在 verify 完成时
 * 亲自执行 local.yaml 配置的测试命令，与 verify-result.md 的结论对账：
 * 自报告 PASS 但实测失败 → 阻断 verify 完成。
 *
 * 未配置 commands.test（或标记 unavailable）时降级为 warning 不阻断，
 * 兼容无测试项目。
 *
 * test_strategy 支持（D-002@v1）：
 * - full（默认）：整跑 commands.test（brownfield 行为不变）
 * - module：按 local.yaml modules 映射，仅跑 git diff 命中的模块子集
 *           测试，避免 monorepo 全量测试超 gate timeout。
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// 测试命令最长执行时间；超时视为失败（防止 CLI 被挂起的测试卡死）
const TEST_TIMEOUT_MS = Number(process.env.SILLYSPEC_TEST_TIMEOUT_MS) || 10 * 60 * 1000
const OUTPUT_TAIL_CHARS = 4000

/**
 * 从 local.yaml 文本提取 commands.test。
 * 轻量正则（与 worktree-deps/scan-postcheck 同风格，不引 yaml 依赖）：
 * 支持带引号与不带引号两种写法；'unavailable' 视为未配置。
 */
export function extractTestCommand(yamlText) {
  if (!yamlText) return null
  const doubleQuoted = yamlText.match(/^\s*test:\s*"([^"]+)"\s*(?:#.*)?$/m)
  const singleQuoted = yamlText.match(/^\s*test:\s*'([^']+)'\s*(?:#.*)?$/m)
  const quoted = doubleQuoted || singleQuoted
  if (quoted && quoted[1]) {
    return quoted[1].toLowerCase() === 'unavailable' ? null : quoted[1].trim()
  }
  const bare = yamlText.match(/^\s*test:\s*([^\n#"']+?)\s*(?:#.*)?$/m)
  if (bare && bare[1]) {
    const cmd = bare[1].trim()
    return cmd.toLowerCase() === 'unavailable' ? null : cmd
  }
  return null
}

/**
 * 从 local.yaml 文本提取顶层 test_strategy。
 * 轻量正则（与 extractTestCommand 同风格，不引 yaml 依赖）。
 *
 * @param {string} yamlText
 * @returns {'full'|'module'|null} - 解析到的策略；缺省/无法解析返回 null（调用方按 full 处理）
 */
export function extractTestStrategy(yamlText) {
  if (!yamlText) return null
  const m = yamlText.match(/^\s*test_strategy:\s*([A-Za-z_]+)\s*(?:#.*)?$/m)
  if (!m || !m[1]) return null
  const v = m[1].trim().toLowerCase()
  if (v === 'module') return 'module'
  if (v === 'full') return 'full'
  return null
}

/**
 * 计算全量 fallback 的原因文本（供 printVerifyTestCheck / facet 给 agent/daemon 明示）。
 *
 * 返回 null 表示不需要 hint：显式 test_strategy:full（用户有意跑全量），
 * 或 test_strategy:module 已成功命中模块子集（该情况不会走到全量路径）。
 * 其余走全量路径的情况都返回原因字符串，让结果可正确解读——
 * 否则 agent/daemon 会把"全量 commands.test"当成"按变更范围测的"，误把
 * 未变更模块的预存错误归因到本次变更（见 3.24 verify 坑1）。
 *
 * 语义对齐 runVerifyTestCheck 的分支：
 *   - strategy==='full' → null
 *   - strategy==='module' 但无有效 modules 块 → hint
 *   - strategy==='module' 有块但 git 不可用（hitCount=-1）→ hint
 *   - strategy==='module' 有块但 0 命中（hitCount=0）→ hint
 *   - strategy==='module' 有块且命中（hitCount>0）→ null（走子集）
 *   - strategy===null（缺省）→ hint（默认全量）
 *
 * @param {object} ctx
 * @param {'full'|'module'|null} ctx.strategy
 * @param {boolean} ctx.modulesPresent - extractModules 是否返回有效映射
 * @param {number} ctx.hitCount - git diff 命中的模块数；-1 表示 git 不可用/非仓库
 * @returns {string|null}
 */
export function computeFullFallbackReason({ strategy, modulesPresent, hitCount }) {
  if (strategy === 'full') return null
  if (strategy === 'module') {
    if (!modulesPresent) {
      return 'test_strategy: module 但 local.yaml 未配置有效的 modules: 块（需 inline flow: name: { path, test }），回退全量'
    }
    if (hitCount < 0) {
      return 'test_strategy: module 但 git 不可用/非 git 仓库，无法判定命中模块，回退全量'
    }
    if (hitCount === 0) {
      return 'test_strategy: module 但本次 git diff 未命中任何已配置 modules，回退全量'
    }
    return null
  }
  // strategy === null（缺省 → 默认全量）
  return 'local.yaml 未配置 test_strategy（默认全量 commands.test，未按变更范围收窄）'
}

/**
 * 从 local.yaml 文本解析 modules 映射块。
 * 设计约定（见 change 2026-07-10-tooling-followups design.md #2 方案 A）：
 *
 *   modules:
 *     backend: { path: "backend/", test: "cd backend && uv run pytest" }
 *     frontend: { path: "frontend/", test: "cd frontend && pnpm test" }
 *
 * 每个模块一行 inline flow mapping，含 path 与 test 两个键。
 * 轻量行扫描（与 modules.js parseModuleMapSimple 同风格，不引 yaml 依赖）。
 *
 * @param {string} yamlText
 * @returns {Record<string, {path:string, test:string}>|null}
 *   - 找不到 modules 块 → null（调用方 fallback commands.test）
 *   - 找到块但无有效条目 → null
 */
export function extractModules(yamlText) {
  if (!yamlText) return null
  const lines = yamlText.split('\n')

  // 定位 modules: 起始行（必须是顶层 key，行首无缩进或仅注释后顶层）
  let startIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^modules:\s*(?:#.*)?$/)
    if (m) { startIdx = i; break }
  }
  if (startIdx === -1) return null

  const modules = {}
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    // 子条目：以 2 空格缩进 + key + ':' 开头
    const entry = line.match(/^  ([A-Za-z0-9_.\-]+):\s*(.*)$/)
    if (!entry) {
      // 遇到新的顶层 key（行首非空格且非注释）→ modules 块结束
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('#') && line.trim() !== '') break
      continue
    }
    const name = entry[1]
    const rest = entry[2].trim()
    if (rest === '' || rest.startsWith('#')) continue // 子块展开式（本实现只支持 inline flow）
    // 解析 inline flow mapping: { path: "...", test: "..." }
    const pathVal = parseFlowValue(rest, 'path')
    const testVal = parseFlowValue(rest, 'test')
    if (pathVal && testVal) {
      modules[name] = { path: pathVal, test: testVal }
    }
  }

  return Object.keys(modules).length > 0 ? modules : null
}

/**
 * 从 inline flow mapping 文本（如 `{ path: "backend/", test: "cd ..." }`）
 * 提取指定键的值。支持双引号/单引号/bare 值。
 */
function parseFlowValue(flowText, key) {
  // 键可能带引号也可能不带：path: "x" 或 "path": "x"
  const re = new RegExp(String.raw`(?:^|[{,]\s*)"?${key}"?\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(?:[^,}]+?))\s*(?=[,}]|$)`)
  const m = flowText.match(re)
  if (!m) return null
  let v = m[1].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  return v.length > 0 ? v : null
}

/**
 * 根据变更文件列表 + modules 映射，算出被命中的模块（去重保序）。
 * 文件路径以 module.path 为前缀（含子目录）即视为命中。
 *
 * @param {string[]} changedFiles - git diff 产出的相对路径列表
 * @param {Record<string, {path:string, test:string}>} modules - extractModules 解析结果
 * @returns {Array<{name:string, path:string, test:string}>} - 命中的模块（按 modules 声明顺序去重）
 */
export function pickHitModules(changedFiles, modules) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return []
  if (!modules || typeof modules !== 'object') return []

  const files = changedFiles.map(f => String(f).replace(/\\/g, '/'))
  const hits = []
  for (const [name, mod] of Object.entries(modules)) {
    if (!mod || !mod.path) continue
    const modPath = String(mod.path).replace(/\\/g, '/')
    const prefix = modPath.endsWith('/') ? modPath : modPath + '/'
    // path 本身被改 或 path/ 下任意文件被改
    const hit = files.some(f => f === modPath || f.startsWith(prefix))
    if (hit) hits.push({ name, path: modPath, test: mod.test })
  }
  return hits
}

/**
 * 聚合多个模块测试结果为单一 status。
 * - 全 passed → 'passed'
 * - 任一 failed → 'failed'
 * - 空 → null（调用方按 fallback 处理）
 *
 * @param {Array<{status:'passed'|'failed'}>} results
 * @returns {'passed'|'failed'|null}
 */
export function aggregateStatus(results) {
  if (!Array.isArray(results) || results.length === 0) return null
  if (results.every(r => r && r.status === 'passed')) return 'passed'
  return 'failed'
}

/**
 * 跑单个模块的 test 命令（串行调用方逐个调用）。
 * @returns {{name, status:'passed'|'failed', command, exitCode, durationMs, outputTail, reason}}
 */
function runOneModule(name, testCommand, cwd) {
  const startedAt = Date.now()
  let exitCode = 0
  let output = ''
  let reason = null
  try {
    output = execSync(testCommand, {
      cwd,
      encoding: 'utf8',
      timeout: TEST_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    exitCode = typeof e.status === 'number' ? e.status : 1
    output = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message
    reason = e.signal === 'SIGTERM' && Date.now() - startedAt >= TEST_TIMEOUT_MS
      ? `模块 ${name} 测试超时（>${TEST_TIMEOUT_MS / 1000}s）`
      : `模块 ${name} 测试退出码 ${exitCode}`
  }
  const durationMs = Date.now() - startedAt
  const outputTail = output.length > OUTPUT_TAIL_CHARS ? '…' + output.slice(-OUTPUT_TAIL_CHARS) : output
  return {
    name,
    status: exitCode === 0 ? 'passed' : 'failed',
    command: testCommand,
    exitCode,
    durationMs,
    outputTail,
    reason,
  }
}

/**
 * 取 git 变更文件列表（worktree unstaged + staged，相对仓库根）。
 * 务实策略：先取 unstaged working tree 改动（`git diff --name-only HEAD`），
 * 它同时覆盖已暂存与未暂存改动（相对 HEAD），最适合 worktree 内尚未 commit 的场景。
 * git 不可用 / 非仓库 → 返回 null（调用方 fallback）。
 */
function gitChangedFiles(cwd) {
  try {
    const out = execSync('git diff --name-only HEAD', {
      cwd,
      encoding: 'utf8',
      timeout: 30 * 1000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return out.split('\n').map(l => l.trim()).filter(Boolean)
  } catch {
    // HEAD 不存在（空仓库）或 git 不可用 → 尝试纯 unstaged
    try {
      const out = execSync('git diff --name-only', {
        cwd,
        encoding: 'utf8',
        timeout: 30 * 1000,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return out.split('\n').map(l => l.trim()).filter(Boolean)
    } catch {
      return null
    }
  }
}

/**
 * 执行 verify 实测：读取 local.yaml 配置，按 test_strategy 决定全量或模块子集。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 项目根目录（测试执行目录）
 * @param {string} opts.specBase - .sillyspec（或平台 specRoot）目录
 * @param {string|null} [opts.changeName]
 * @returns {{
 *   status: 'passed'|'failed'|'skipped',
 *   command: string|null,
 *   exitCode: number|null,
 *   durationMs: number|null,
 *   outputTail: string|null,
 *   reason: string|null,
 *   resultPath: string|null,
 * }}
 */
export function runVerifyTestCheck({ cwd, specBase, changeName = null }) {
  const localYamlPath = join(specBase, 'local.yaml')
  const yamlText = existsSync(localYamlPath) ? readFileSync(localYamlPath, 'utf8') : null

  const strategy = extractTestStrategy(yamlText)

  // —— 模块子集路径（test_strategy: module）——
  // 算出 modulesPresent / hitCount 供 fallback hint 判定（computeFullFallbackReason）；
  // 命中即走子集。gitChangedFiles 返回 null 表示 git 不可用 → hitCount=-1（与 0 命中区分）。
  let modulesPresent = false
  let hitCount = 0
  if (strategy === 'module') {
    const modules = extractModules(yamlText)
    if (modules) {
      modulesPresent = true
      const changedFiles = gitChangedFiles(cwd)
      if (changedFiles === null) {
        hitCount = -1 // git 不可用 / 非仓库
      } else {
        const hits = pickHitModules(changedFiles, modules)
        hitCount = hits.length
        if (hitCount > 0) {
          return runModuleSubset({ cwd, specBase, changeName, hits })
        }
        // 有 modules 配置但无命中 → fallback commands.test（D-002@v1 向后兼容）
      }
    }
    // test_strategy:module 但无 modules 配置 → fallback commands.test（brownfield 友好）
  }

  // —— 全量路径（默认 full / fallback）——
  // fallbackReason 非 null 表示本次全量是"非显式"的（缺省/配置不全/未命中），需明示。
  const fallbackReason = computeFullFallbackReason({ strategy, modulesPresent, hitCount })
  return runFullCommand({ yamlText, localYamlPath, cwd, specBase, changeName, fallbackReason })
}

/**
 * 全量跑 commands.test（现有逻辑，brownfield 行为不变）。
 */
function runFullCommand({ yamlText, localYamlPath, cwd, specBase, changeName, fallbackReason = null }) {
  const command = extractTestCommand(yamlText)

  if (!command) {
    return {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason: yamlText
        ? 'local.yaml 未配置 commands.test（或标记 unavailable）'
        : `local.yaml 不存在（${localYamlPath}）`,
      resultPath: null,
      mode: 'full',
      fallbackReason,
    }
  }

  const startedAt = Date.now()
  let exitCode = 0
  let output = ''
  let reason = null
  try {
    output = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout: TEST_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    exitCode = typeof e.status === 'number' ? e.status : 1
    output = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message
    reason = e.signal === 'SIGTERM' && Date.now() - startedAt >= TEST_TIMEOUT_MS
      ? `测试命令超时（>${TEST_TIMEOUT_MS / 1000}s）`
      : `测试命令退出码 ${exitCode}`
  }
  const durationMs = Date.now() - startedAt
  const outputTail = output.length > OUTPUT_TAIL_CHARS ? '…' + output.slice(-OUTPUT_TAIL_CHARS) : output

  const result = {
    status: exitCode === 0 ? 'passed' : 'failed',
    command,
    exitCode,
    durationMs,
    outputTail,
    reason,
    resultPath: null,
    mode: 'full',
    fallbackReason,
  }

  writeRunResult({ specBase, changeName, result, extra: fallbackReason ? { fallback_reason: fallbackReason } : {} })
  return result
}

/**
 * 串行跑命中的模块子集，聚合结果。
 * 返回 shape 与 runFullCommand 一致（status/command/exitCode/durationMs/outputTail/reason/resultPath）。
 */
function runModuleSubset({ cwd, specBase, changeName, hits }) {
  const subsetStartedAt = Date.now()
  const perModule = hits.map(h => runOneModule(h.name, h.test, cwd))
  const status = aggregateStatus(perModule)

  const command = `module[${hits.map(h => h.name).join(',')}]`
  const exitCode = status === 'passed' ? 0 : 1
  const durationMs = Date.now() - subsetStartedAt

  // 合并各模块输出尾部（标注模块名）
  const outputTail = perModule
    .map(r => `── module ${r.name} (${r.status}) ──\n${r.outputTail || ''}`)
    .join('\n')
  const reason = status === 'passed'
    ? null
    : `模块子集测试失败：${perModule.filter(r => r.status === 'failed').map(r => r.name).join(', ')}`

  const result = {
    status,
    command,
    exitCode,
    durationMs,
    outputTail: outputTail.length > OUTPUT_TAIL_CHARS ? '…' + outputTail.slice(-OUTPUT_TAIL_CHARS) : outputTail,
    reason,
    resultPath: null,
    mode: 'module-subset',
    fallbackReason: null,
  }

  writeRunResult({
    specBase,
    changeName,
    result,
    extra: {
      modules: perModule.map(r => ({
        name: r.name,
        command: r.command,
        exit_code: r.exitCode,
        status: r.status,
        duration_ms: r.durationMs,
        output_tail: r.outputTail,
        reason: r.reason,
      })),
    },
  })
  return result
}

/**
 * 结果落盘到 .runtime/verify-runs/<ts>/test-result.json（供追溯与 SillyHub 消费）。
 * 多模块时 extra.modules 描述各模块明细。
 */
function writeRunResult({ specBase, changeName, result, extra = {} }) {
  try {
    const ts = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '')
    const runDir = join(specBase, '.runtime', 'verify-runs', ts)
    mkdirSync(runDir, { recursive: true })
    const resultPath = join(runDir, 'test-result.json')
    writeFileSync(resultPath, JSON.stringify({
      change: changeName,
      command: result.command,
      exit_code: result.exitCode,
      status: result.status,
      duration_ms: result.durationMs,
      output_tail: result.outputTail,
      reason: result.reason,
      ran_at: new Date().toISOString(),
      ...extra,
    }, null, 2) + '\n')
    result.resultPath = resultPath
  } catch (e) {
    console.warn(`⚠️  verify 实测结果落盘失败: ${e.message}`)
  }
}

/** 打印实测结果（人类/agent 可读） */
export function printVerifyTestCheck(result) {
  if (result.status === 'skipped') {
    console.warn(`\n⚠️  Verify 实测跳过：${result.reason}`)
    console.warn('   建议在 local.yaml 的 commands.test 配置真实测试命令，让 CLI 可客观对账。')
    return
  }
  if (result.status === 'passed') {
    console.log(`\n✅ Verify 实测通过：\`${result.command}\` 退出码 0（${(result.durationMs / 1000).toFixed(1)}s）`)
  } else {
    console.error(`\n❌ Verify 实测失败：\`${result.command}\` — ${result.reason}`)
    if (result.outputTail) {
      const tail = result.outputTail.split('\n').slice(-20).join('\n')
      console.error('   输出（末尾）：')
      for (const line of tail.split('\n')) console.error(`   | ${line}`)
    }
  }
  // —— 全量 fallback 明示（skipped 已提前 return，此处仅 passed/failed）——
  // 让 agent 知道本次跑的是全量 commands.test、非变更范围子集；失败可能含未变更模块
  // 的预存错误，需先核对用例归属再归因到本次变更（见 3.24 verify 坑1）。
  if (result.mode === 'full' && result.fallbackReason) {
    if (result.status === 'failed') {
      console.warn(`   ⚠️  本次跑的是 commands.test 全量（${result.fallbackReason}）。`)
      console.warn('      失败可能含与本变更无关的预存错误——先核对失败用例是否属于你的变更范围；')
      console.warn('      或在 local.yaml 配置 test_strategy: module + modules: 块以收窄到变更模块。')
    } else {
      console.warn(`   ⚠️  本次跑的是 commands.test 全量（${result.fallbackReason}）。`)
      console.warn('      如耗时过长，可在 local.yaml 配置 test_strategy: module + modules: 块按模块收窄。')
    }
  }
  if (result.resultPath) {
    console.log(`📄 实测结果已写入: ${result.resultPath}`)
  }
}
