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
import { gitQuiet } from './git-helper.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { verifyApiParity } from './contract-matrix.js'
import { parseFileChangeListDetailed, pathMatches } from './change-list.js'
import { filterDeliverableFiles } from './worktree-apply.js'

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
 * 从 local.yaml 提取 known_failures 声明（预存失败豁免清单，坑 verify-worktree-... 修复方向 2）。
 * 支持块式与流式两种写法：
 *   known_failures:
 *     - "tests/test_ppm.py::test_legacy"
 *     - app/modules/plan/test_old
 *   或  known_failures: [a, b]
 * 每条作为子串（大小写不敏感）匹配测试输出中的失败行。
 *
 * @param {string} yamlText
 * @returns {string[]} 模式列表；无声明返回 []
 */
export function extractKnownFailures(yamlText) {
  if (!yamlText) return []
  const inline = yamlText.match(/^known_failures:\s*\[([^\]]*)\]\s*(?:#.*)?$/m)
  if (inline) {
    return inline[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  }
  const block = yamlText.match(/^known_failures:\s*\n((?:[ \t]+-[ \t].+\n?)+)/m)
  if (block) {
    return (block[1].match(/^[ \t]+-[ \t]+(.+)/gm) || [])
      .map(s => s.replace(/^[ \t]+-[ \t]+/, '').trim().replace(/^['"]|['"]$/g, '').replace(/#.*$/, '').trim())
      .filter(Boolean)
  }
  return []
}

// 单条失败行标记（跨 pytest/jest/vitest/go/generic）。大小写不敏感。
// 刻意用 FAIL/FAILED + 配合 SUMMARY_LINE_RE 排除汇总行：否则 pytest/jest 的
// "N failed" 汇总会被误判为「需豁免的失败行」→ 永远 remaining>0 → known_failures 失效。
const PER_TEST_FAIL_RE = /(FAILED|\bFAIL\b|✕|✗|✘|panic\s*:|assertionerror|traceback|---\s*fail|error:|exception)/i
// 汇总/计数行（非单条失败）：pytest === 框、jest "Tests:"、裸 "N failed/passed"、go "FAILED in Ns" 等。
const SUMMARY_LINE_RE = /(={2,}.*={2,}|^\s*\d+\s+(failed|passed|skipped|pending)\b|tests?\s*:|test\s+suites?\s*:|failed\s+in\s+\d)/i

/**
 * 把测试输出按行筛出「失败行」，再按 known_failures 模式分为已豁免 / 未豁免。
 * @param {string} output
 * @param {string[]} knownFailures 子串模式列表（大小写不敏感）
 * @returns {{ failureLines: string[], exempted: string[], remaining: string[] }}
 */
export function partitionFailures(output, knownFailures) {
  const lines = String(output || '').split(/\r?\n/)
  const failureLines = lines.filter(l => PER_TEST_FAIL_RE.test(l) && !SUMMARY_LINE_RE.test(l))
  const pats = (knownFailures || []).map(p => String(p).toLowerCase()).filter(Boolean)
  const exempted = []
  const remaining = []
  for (const l of failureLines) {
    const ll = l.toLowerCase()
    if (pats.some(p => ll.includes(p))) exempted.push(l)
    else remaining.push(l)
  }
  return { failureLines, exempted, remaining }
}

/**
 * 结合 known_failures 判定单次测试运行的状态（fail-safe）。
 *   - exitCode 0 → passed
 *   - exitCode≠0 且无 known_failures → failed（原行为）
 *   - exitCode≠0 且有 known_failures：
 *       检测到失败行且全部命中豁免 → passed（披露：请人工复核清单是否过宽）
 *       有未豁免失败行 / 检测不到失败行（保守）→ failed
 * fail-safe：检测不到失败行绝不自动 pass（避免解析盲区导致假 PASS）。
 *
 * @returns {{ status: 'passed'|'failed', reason: string|null, exemptedCount: number }}
 */
export function judgeWithKnownFailures(exitCode, output, baseReason, knownFailures) {
  if (exitCode === 0) return { status: 'passed', reason: baseReason, exemptedCount: 0 }
  if (!knownFailures || knownFailures.length === 0) {
    return { status: 'failed', reason: baseReason, exemptedCount: 0 }
  }
  const { failureLines, exempted, remaining } = partitionFailures(output, knownFailures)
  if (failureLines.length > 0 && remaining.length === 0) {
    return {
      status: 'passed',
      reason: `全部 ${failureLines.length} 个失败行命中 known_failures 已豁免（${exempted.length} 条）— 请人工复核豁免清单是否过宽`,
      exemptedCount: exempted.length,
    }
  }
  // 剩余未豁免失败行：列出具体行 + 预存债指引（坑 verify-known-failures-stale-list）。
  // known_failures 清单常滞后于新预存测试 → 同源预存债漏入清单,agent 跑完才发现要手动补。
  // 这里点出具体未命中行,让 agent 一眼分辨"补清单 vs 修代码",不替它判断（确定性:列已算出的 remaining）。
  let detail
  if (remaining.length > 0) {
    const sample = remaining.slice(0, 5).map(l => {
      const t = String(l).trim()
      return t.length > 120 ? t.slice(0, 120) + '…' : t
    })
    const more = remaining.length > 5 ? `\n     …（其余 ${remaining.length - 5} 行见上方测试输出）` : ''
    detail = `${remaining.length} 个失败行未命中 known_failures 清单：\n     - ${sample.join('\n     - ')}${more}\n   → 若是预存债（变更前就失败），加入 local.yaml 的 known_failures 清单；若是本次变更引入的真实失败，请修复`
  } else {
    detail = '失败输出未检测到可豁免的失败行（保守判 fail）'
  }
  return {
    status: 'failed',
    reason: baseReason ? `${baseReason}（${detail}）` : detail,
    exemptedCount: exempted.length,
  }
}

/**
 * 决定 verify 实测的执行动作（纯函数，便于测试；坑 verify-worktree-... 修复方向 3）。
 *   - module + 命中模块  → 'module-subset'
 *   - module + 0 命中    → 'module-zero-hit-skip'（不静默回退注定超时/预存失败的全量）
 *   - 其余（full / module 无块 / module git 不可用 hitCount=-1）→ 'full'
 * @returns {'module-subset'|'module-zero-hit-skip'|'full'}
 */
export function decideVerifyTestAction({ strategy, modulesPresent, hitCount }) {
  if (strategy === 'module' && modulesPresent) {
    if (hitCount > 0) return 'module-subset'
    if (hitCount === 0) return 'module-zero-hit-skip'
    return 'full' // hitCount === -1（git 不可用）→ 落全量兜底
  }
  return 'full'
}

/**
 * 跑单个模块的 test 命令（串行调用方逐个调用）。
 * @returns {{name, status:'passed'|'failed', command, exitCode, durationMs, outputTail, reason}}
 */
function runOneModule(name, testCommand, cwd, knownFailures = []) {
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
  const judged = judgeWithKnownFailures(exitCode, output, reason, knownFailures)
  return {
    name,
    status: judged.status,
    command: testCommand,
    exitCode,
    durationMs,
    outputTail,
    reason: judged.reason,
    exemptedCount: judged.exemptedCount,
  }
}

// refSpec 来源 meta.json（agent 可写），仅放行 git ref/range 安全字符（含 HEAD~1..HEAD 类区间），
// 防经 shell 的命令/参数注入。剥空白与引号/分号/反引号/$ 等 shell 元字符。
// 注：允许 ".."/"../.."（相对路径 ref 语法上合法）不影响安全——execFileSync 数组形式下它只是
// 一个 git rev 参数，git 自会报 not a valid ref，无 shell 解释面。
function assertSafeRefSpec(refSpec) {
  if (typeof refSpec !== 'string') return null
  if (!/^[A-Za-z0-9._~/^-]+$/.test(refSpec)) return null
  if (/~~/.test(refSpec)) return null // 连续 ~（垃圾串）
  return refSpec
}

/**
 * 在指定 cwd 跑 `git diff --name-only <refSpec>`，返回相对仓库根的文件列表。
 * git 不可用 / 非仓库 / ref 无效 → 返回 null（调用方 fallback）。
 * QUAL-01 收口：本地 execFileSync 裸调 → git-helper gitQuiet（统一 safe.directory），timeout 30s 保留。
 */
function runGitDiffNameOnly(cwd, refSpec) {
  const ref = refSpec ? assertSafeRefSpec(refSpec) : null
  if (refSpec && !ref) return null
  const args = ['diff', '--name-only']
  if (ref) args.push(ref)
  const out = gitQuiet(cwd, args, { timeout: 30 * 1000, trim: false })
  if (out === null) return null
  return out.split('\n').map(l => l.trim()).filter(Boolean)
}

/**
 * 在指定 cwd 跑 `git diff --name-status <refSpec>`，返回原始文本（调用方按行解析，
 * 保留状态字母 D/R/C 供删除探针识别删除/重命名）。git 不可用 / 非仓库 / ref 无效 → 返回 null。
 * QUAL-01 收口：同上走 gitQuiet（trim:false 保留原始文本）。
 */
function runGitDiffNameStatus(cwd, refSpec) {
  const ref = refSpec ? assertSafeRefSpec(refSpec) : null
  if (refSpec && !ref) return null
  const args = ['diff', '--name-status']
  if (ref) args.push(ref)
  return gitQuiet(cwd, args, { timeout: 30 * 1000, trim: false })
}

/**
 * 取主工作区 git 变更文件列表（unstaged + staged，相对仓库根）。
 * `git diff --name-only HEAD` 同时覆盖已暂存与未暂存改动（相对 HEAD），
 * 最适合 brownfield（apply 后未 commit / in-place 改动）场景。
 * git 不可用 / 非仓库 → 返回 null（调用方 fallback）。
 *
 * 注意：worktree 隔离模式下主仓只剩 .sillyspec/ 文档改动、代码在 worktree，
 * 本函数看不到——runVerifyTestCheck 用 resolveVerifyChangedFiles 统一处理。
 */
function gitChangedFiles(cwd) {
  const head = runGitDiffNameOnly(cwd, 'HEAD')
  if (head !== null) return head
  // HEAD 不存在（空仓库）或 git 不可用 → 尝试纯 unstaged
  return runGitDiffNameOnly(cwd, '')
}

/**
 * 解析 verify 对账用的变更文件集（worktree-aware）。
 *
 * worktree 隔离模式下 execute 的代码改动落在 worktree，主仓工作区只剩
 * .sillyspec/ 文档改动。若仍用主仓 `git diff --name-only HEAD`，hitCount=0
 * → 回退注定超时且含预存失败的全量 commands.test → verify 完成被阻断
 * （坑 verify-worktree-mode-test-reconciliation-fallback-full）。
 *
 * 判定（与 checkExecuteCodeEvidence / task-review 同源，meta.json 为权威）：
 *   1. change 有 worktree meta 且 baseHash 存在 → 在 worktree（或 in-place 的 cwd）
 *      跑 `git diff --name-only <baseHash>..HEAD` 取真实代码改动集
 *      ⚠️ baseline checkpoint 修复：优先用 baselineCommit/actualBaseHash（baseline overlay
 *      之后），否则 baseHash（pre-baseline）会把 baseline 同步的跨模块文件算进 verify diff
 *      → 命中无关模块（如 ppm 变更误测 daemon/frontend）。与 task-review.js 同源。
 *   2. 无 worktree meta / diff 异常 → 主仓 `git diff --name-only HEAD`（brownfield 原行为）
 *
 * 跨仓支持（task-06 / D-004 / design §6 A6）：ctx 参数可选，缺省走单仓原逻辑（零回归，
 * GOAL-2）。ctx 非空且含跨仓 entry 时，主仓 diff 走原逻辑，再 per-repo 在各跨仓仓
 * gitDir 跑 `git diff --name-only HEAD` 合并入结果（design §6 行 136 「per-repo 取 diff
 * 合并」字面契约）。跨仓仓 diff 路径相对各自仓根。
 *
 * 注：runVerifyTestCheck 的 module 子集策略只消费主仓 diff（跨仓仓不参与 module 子集，
 * 跨仓仓无 module 映射，design §6 + §5.4），故本函数的跨仓合并 diff 在 module 子集
 * 路径无副作用——本函数仅供「per-repo diff 合并」语义契约 + 未来 consumer 复用。
 *
 * @param {string} cwd - 项目根目录（主仓）
 * @param {string|null} changeName
 * @param {object|null} [ctx] - MultiRepoContext 实例（可选，缺省/null 走单仓原逻辑）
 * @returns {string[]|null} 变更文件列表；git 不可用返回 null（调用方按 hitCount=-1 处理）
 */
export function resolveVerifyChangedFiles(cwd, changeName, ctx = null) {
  // 主仓 diff（原逻辑不动，单仓零回归）
  const mainFiles = resolveMainChangedFiles(cwd, changeName)

  // 无 ctx / ctx 无跨仓 entry → 主仓 diff 即结果（零回归）
  if (!ctx || typeof ctx.repos !== 'object' || ctx.repos === null) return mainFiles
  const crossEntries = []
  for (const entry of ctx.repos.values()) {
    if (entry && entry.isMain === false) crossEntries.push(entry)
  }
  if (crossEntries.length === 0) return mainFiles

  // 主仓 git 不可用（null）→ 不强制兜底，保留 null 语义让调用方按 hitCount=-1 处理。
  // 跨仓仓 diff 各自取，任一可用即合并；全不可用且主仓 null → 返 null。
  // 跨仓仓 diff 锚点：HEAD~1..HEAD（跨仓 task 子代理 commit 到主干，verify 时最近一笔 commit
  // 即本次 task 改动；多 task 同仓时仅反映最近一笔，精确范围由 task 卡 base/head 锡点锚定，
  // 那是 task-04 的 scope，本函数不消费锡点——跨仓合并 diff 在 verify-postcheck 内仅供
  // 「per-repo diff 合并」语义契约 + 未来 consumer，module 子集只用主仓 diff）。
  const merged = mainFiles ? mainFiles.slice() : []
  let anyAvailable = mainFiles !== null
  for (const entry of crossEntries) {
    // 跨仓仓 gitDir = 跨仓仓根（MultiRepoContext._buildCrossRepoEntry 已 fail-closed 保证可达）
    const files = runGitDiffNameOnly(entry.gitDir, 'HEAD~1..HEAD')
    if (files !== null) {
      anyAvailable = true
      for (const f of files) {
        if (!merged.includes(f)) merged.push(f)
      }
    }
  }
  return anyAvailable ? merged : null
}

/**
 * 主仓变更文件解析（原 resolveVerifyChangedFiles 逻辑，单仓零回归基线）。
 * 抽出供 resolveVerifyChangedFiles 复用，跨仓合并时主仓部分走此函数（不动）。
 *
 * @param {string} cwd - 主仓根
 * @param {string|null} changeName
 * @returns {string[]|null}
 */
function resolveMainChangedFiles(cwd, changeName) {
  if (changeName) {
    const metaPath = join(cwd, '.sillyspec', '.runtime', 'worktrees', changeName, 'meta.json')
    if (existsSync(metaPath)) {
      let meta = null
      try { meta = JSON.parse(readFileSync(metaPath, 'utf8')) } catch {}
      // 优先 baselineCommit/actualBaseHash（baseline checkpoint 之后），回退 baseHash
      const diffBase = meta?.baselineCommit || meta?.actualBaseHash || meta?.baseHash
      if (diffBase) {
        const gitDir = (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath))
          ? meta.worktreePath
          : cwd
        const files = runGitDiffNameOnly(gitDir, `${diffBase}..HEAD`)
        if (files !== null) return files
        // worktree diff 异常 → 落主仓兜底（保持与原 gitChangedFiles 相同的 null 语义）
      }
    }
  }
  return gitChangedFiles(cwd)
}

/**
 * 执行 verify 实测：读取 local.yaml 配置，按 test_strategy 决定全量或模块子集。
 *
 * 跨仓支持（task-06 / D-004 / design §5.4 + §6 A6 + §9）：opts.ctx 可选，缺省走单仓
 * 原逻辑（零回归，GOAL-2）。ctx 非空且含跨仓 entry 时，主仓跑原 module 子集 / full npm
 * test（行为不变），再 per-repo cwd 在各跨仓仓根跑 full npm test（跨仓仓不参与 module
 * 子集策略——跨仓仓无主仓的 module 映射，design §6 + §5.4）；跨仓仓无 package.json 则
 * 跳过 + warn 不阻断 verify（design §9 兼容策略「跨仓仓无 package.json 跳过 warn」）。
 * 任一仓 fail → 整体 fail（fail-fast 语义，跨仓仓的真实失败不能被主仓 PASS 掩盖）。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 项目根目录（主仓，测试执行目录）
 * @param {string} opts.specBase - .sillyspec（或平台 specRoot）目录
 * @param {string|null} [opts.changeName]
 * @param {object|null} [opts.ctx] - MultiRepoContext 实例（可选，缺省/null 走单仓原逻辑）
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
export function runVerifyTestCheck({ cwd, specBase, changeName = null, ctx = null }) {
  // 信任边界声明（体检 SEC-02 核实）：本函数三处 execSync(command) 的命令只来源于
  // ① 主仓 specBase（resolveSpecDir → 主仓 .sillyspec/local.yaml）② 跨仓仓根
  // <repo>/.sillyspec/local.yaml——均为仓库自有配置（与 `npm test` 同信任级：跑测试
  // 本就是执行项目代码）。永不读取 agent 可写的 worktree 副本（对照 worktree-deps.js
  // SEC-01 的源级分流）；修改 yaml 来源时必须维持此边界。
  const localYamlPath = join(specBase, 'local.yaml')
  const yamlText = existsSync(localYamlPath) ? readFileSync(localYamlPath, 'utf8') : null

  const strategy = extractTestStrategy(yamlText)
  const knownFailures = extractKnownFailures(yamlText)

  // —— 模块子集路径（test_strategy: module）：算 modulesPresent / hitCount / hits ——
  // resolveVerifyChangedFiles 返回 null 表示 git 不可用 → hitCount=-1（与 0 命中区分）。
  // 注：module 子集策略只用主仓 diff（跨仓仓不参与 module 子集，design §6 + §5.4），
  //     故此处不传 ctx（避免跨仓路径误命中主仓 module 映射）。
  let modulesPresent = false
  let hitCount = 0
  let hits = []
  if (strategy === 'module') {
    const modules = extractModules(yamlText)
    if (modules) {
      modulesPresent = true
      const changedFiles = resolveVerifyChangedFiles(cwd, changeName)
      if (changedFiles === null) {
        hitCount = -1 // git 不可用 / 非仓库
      } else {
        hits = pickHitModules(changedFiles, modules)
        hitCount = hits.length
      }
    }
  }

  const action = decideVerifyTestAction({ strategy, modulesPresent, hitCount })
  let mainResult
  if (action === 'module-subset') {
    mainResult = runModuleSubset({ cwd, specBase, changeName, hits, knownFailures })
  } else if (action === 'module-zero-hit-skip') {
    // module 模式 0 命中：不静默回退注定超时/含预存失败的全量（坑 verify-worktree-... 修复方向 3）。
    // 据 verify-result.md 自报告判定；想跑全量请显式设 test_strategy: full。
    mainResult = {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason: 'test_strategy: module 但本次变更未命中任何已配置 modules（0 命中）。为避免回退到注定超时/含预存失败的全量 commands.test，CLI 未自动跑全量——据 verify-result.md 自报告判定测试。若需全量覆盖，显式设 test_strategy: full。',
      resultPath: null,
      mode: 'module-zero-hit',
      fallbackReason: null,
    }
  } else {
    // —— 全量路径（full / module 无块 / module git 不可用）——
    // fallbackReason 非 null 表示本次全量是"非显式"的（缺省/配置不全/未命中），需明示。
    const fallbackReason = computeFullFallbackReason({ strategy, modulesPresent, hitCount })
    mainResult = runFullCommand({ yamlText, localYamlPath, cwd, specBase, changeName, fallbackReason, knownFailures })
  }

  // —— 跨仓仓 per-repo cwd 跑 full npm test（task-06 / D-004 / design §5.4 + §6 A6）——
  // ctx 为空或无跨仓 entry → 直接返主仓结果（单仓零回归，GOAL-2）。
  // 跨仓仓不参与 module 子集策略，只跑 full npm test（design §6 + §5.4）；
  // 跨仓仓无 package.json → 跳过 + warn 不阻断（design §9 兼容策略）。
  // 任一跨仓仓 fail → 整体 fail（合并语义）。
  return mergeCrossRepoResults(mainResult, ctx)
}

/**
 * per-repo cwd 跑跨仓仓 full npm test，合并进主仓结果。
 *
 * design §6 A6 + §5.4 + §9 兼容策略：
 *   - 跨仓仓有 package.json → 在该仓 projectRoot cwd 跑 full npm test（跨仓仓 own local.yaml
 *     若有 commands.test 用之，否则 fallback `npm test`）
 *   - 跨仓仓无 package.json → 跳过 + console.warn（不阻断 verify）
 *   - 跨仓仓只跑 full npm test，不参与 module 子集策略（module 映射主仓强相关）
 *   - 任一仓 fail → 整体 fail；主仓 skipped + 跨仓仓 passed → 整体 passed（跨仓仓有测试即有效）
 *
 * 单仓 ctx（无跨仓 entry）→ 直接返主仓结果，零行为变化（GOAL-2）。
 *
 * @param {object} mainResult - 主仓 runVerifyTestCheck 结果
 * @param {object|null} ctx - MultiRepoContext 实例
 * @returns {object} 合并后结果（shape 同 mainResult）
 */
function mergeCrossRepoResults(mainResult, ctx) {
  if (!ctx || typeof ctx.repos !== 'object' || ctx.repos === null) return mainResult
  const crossEntries = []
  for (const entry of ctx.repos.values()) {
    if (entry && entry.isMain === false) crossEntries.push(entry)
  }
  if (crossEntries.length === 0) return mainResult

  const crossResults = []
  for (const entry of crossEntries) {
    const crossResult = runCrossRepoFullTest(entry)
    crossResults.push({ repoKey: entry.repoKey, projectRoot: entry.projectRoot, result: crossResult })
  }

  // 合并：任一 fail → fail；否则取主仓 status（passed/skipped 与跨仓 passed 合并）
  const failedRepos = crossResults.filter(r => r.result.status === 'failed')
  if (failedRepos.length > 0) {
    return mergeResultStatus({
      status: 'failed',
      mainResult,
      crossResults,
      reason: `跨仓仓测试失败：${failedRepos.map(r => r.repoKey).join(', ')}`,
    })
  }
  // 跨仓仓全 passed 或 skipped（无 package.json）→ 主仓 status 不变（合并跨仓信息到 outputTail）
  return mergeResultInfo(mainResult, crossResults)
}

/**
 * 在单个跨仓仓根跑 full npm test（跨仓仓不参与 module 子集，只跑 full）。
 * 跨仓仓 own local.yaml 若存在且配 commands.test → 用之；否则 fallback `npm test`。
 * 跨仓仓无 package.json → 跳过 + warn。
 *
 * @param {object} entry - RepoEntry（isMain=false）
 * @returns {object} 结果 shape 对齐 runFullCommand 返回
 */
function runCrossRepoFullTest(entry) {
  const projectRoot = entry.projectRoot
  // 跨仓仓无 package.json → 跳过 + warn（design §9 兼容策略，不阻断 verify）
  if (!existsSync(join(projectRoot, 'package.json'))) {
    console.warn(`⚠️  跨仓 repo "${entry.repoKey}"（${projectRoot}）无 package.json，跳过该仓 npm test（design §9 兼容策略，不阻断 verify）。`)
    return {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason: `跨仓 repo "${entry.repoKey}" 无 package.json，跳过 npm test`,
      resultPath: null,
      mode: 'cross-repo-skip',
      repoKey: entry.repoKey,
    }
  }

  // 跨仓仓 own local.yaml（在跨仓仓 .sillyspec/ 下，若存在）配 commands.test → 用之；否则 `npm test`
  // 注：跨仓仓按 NG-1 不建 .sillyspec/，但容错读取（用户可手动放 local.yaml 配跨仓仓特定测试命令）
  const crossLocalYaml = join(projectRoot, '.sillyspec', 'local.yaml')
  let command = 'npm test'
  let crossKnownFailures = []
  if (existsSync(crossLocalYaml)) {
    try {
      const crossYaml = readFileSync(crossLocalYaml, 'utf8')
      const extracted = extractTestCommand(crossYaml)
      if (extracted) command = extracted
      crossKnownFailures = extractKnownFailures(crossYaml)
    } catch { /* 读取失败 fallback npm test */ }
  }

  const startedAt = Date.now()
  let exitCode = 0
  let output = ''
  let reason = null
  try {
    output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: TEST_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    exitCode = typeof e.status === 'number' ? e.status : 1
    output = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message
    reason = e.signal === 'SIGTERM' && Date.now() - startedAt >= TEST_TIMEOUT_MS
      ? `跨仓 repo "${entry.repoKey}" 测试超时（>${TEST_TIMEOUT_MS / 1000}s）`
      : `跨仓 repo "${entry.repoKey}" 测试退出码 ${exitCode}`
  }
  const durationMs = Date.now() - startedAt
  const outputTail = output.length > OUTPUT_TAIL_CHARS ? '…' + output.slice(-OUTPUT_TAIL_CHARS) : output
  const judged = judgeWithKnownFailures(exitCode, output, reason, crossKnownFailures)

  return {
    status: judged.status,
    command,
    exitCode,
    durationMs,
    outputTail,
    reason: judged.reason,
    resultPath: null,
    mode: 'cross-repo-full',
    repoKey: entry.repoKey,
    exemptedCount: judged.exemptedCount,
  }
}

/**
 * 合并失败状态：整体 failed，保留主仓 + 各跨仓仓明细到 outputTail / reason。
 */
function mergeResultStatus({ status, mainResult, crossResults, reason }) {
  const parts = []
  parts.push(`── main (${mainResult.status}) ──\n${mainResult.outputTail || mainResult.reason || ''}`)
  for (const cr of crossResults) {
    parts.push(`── cross-repo ${cr.repoKey} (${cr.result.status}) ──\n${cr.result.outputTail || cr.result.reason || ''}`)
  }
  const mergedTail = parts.join('\n')
  return {
    status,
    command: mainResult.command ? `${mainResult.command} + cross-repo[${crossResults.map(r => r.repoKey).join(',')}]` : `cross-repo[${crossResults.map(r => r.repoKey).join(',')}]`,
    exitCode: 1,
    durationMs: (mainResult.durationMs || 0) + crossResults.reduce((n, r) => n + (r.result.durationMs || 0), 0),
    outputTail: mergedTail.length > OUTPUT_TAIL_CHARS ? '…' + mergedTail.slice(-OUTPUT_TAIL_CHARS) : mergedTail,
    reason,
    resultPath: mainResult.resultPath,
    mode: 'cross-repo-merged',
    fallbackReason: mainResult.fallbackReason || null,
  }
}

/**
 * 合并信息（跨仓仓全 passed/skipped）：主仓 status 保留，跨仓仓 PASSED 信息附入 outputTail。
 */
function mergeResultInfo(mainResult, crossResults) {
  const crossPassed = crossResults.filter(r => r.result.status === 'passed')
  const crossSkipped = crossResults.filter(r => r.result.status === 'skipped')
  if (crossPassed.length === 0 && crossSkipped.length === 0) return mainResult
  const crossSummary = []
  for (const cr of crossPassed) crossSummary.push(`cross-repo ${cr.repoKey}: PASS`)
  for (const cr of crossSkipped) crossSummary.push(`cross-repo ${cr.repoKey}: SKIP(${cr.result.reason || 'no package.json'})`)
  const crossLine = `\n── 跨仓仓 npm test ──\n${crossSummary.join('\n')}`
  const mergedTail = (mainResult.outputTail || '') + crossLine
  return {
    ...mainResult,
    outputTail: mergedTail.length > OUTPUT_TAIL_CHARS ? '…' + mergedTail.slice(-OUTPUT_TAIL_CHARS) : mergedTail,
    mode: mainResult.mode ? `${mainResult.mode}+cross-repo` : 'cross-repo-merged',
  }
}

/**
 * 全量跑 commands.test（现有逻辑，brownfield 行为不变）。
 */
function runFullCommand({ yamlText, localYamlPath, cwd, specBase, changeName, fallbackReason = null, knownFailures = [] }) {
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

  const judged = judgeWithKnownFailures(exitCode, output, reason, knownFailures)
  const result = {
    status: judged.status,
    command,
    exitCode,
    durationMs,
    outputTail,
    reason: judged.reason,
    resultPath: null,
    mode: 'full',
    fallbackReason,
    exemptedCount: judged.exemptedCount,
  }

  writeRunResult({ specBase, changeName, result, extra: fallbackReason ? { fallback_reason: fallbackReason } : {} })
  return result
}

/**
 * 串行跑命中的模块子集，聚合结果。
 * 返回 shape 与 runFullCommand 一致（status/command/exitCode/durationMs/outputTail/reason/resultPath）。
 */
function runModuleSubset({ cwd, specBase, changeName, hits, knownFailures = [] }) {
  const subsetStartedAt = Date.now()
  const perModule = hits.map(h => runOneModule(h.name, h.test, cwd, knownFailures))
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
    exemptedCount: perModule.reduce((n, r) => n + (r.exemptedCount || 0), 0),
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
    if (result.exemptedCount > 0) {
      console.log(`\n✅ Verify 实测通过（含 ${result.exemptedCount} 个 known_failures 豁免）：\`${result.command}\` — ${result.reason}`)
      console.warn('   ⚠️  本次 PASS 依赖 known_failures 豁免清单——请人工复核清单是否过宽（避免误豁免本变更引入的真实失败）。')
    } else {
      console.log(`\n✅ Verify 实测通过：\`${result.command}\` 退出码 0（${(result.durationMs / 1000).toFixed(1)}s）`)
    }
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

/**
 * API parity 对账（advisory）：前端调用 vs execute 提取的后端 endpoint artifact。
 * 三态：skipped（无 provider artifact → 非全栈项目不打扰）/ warning（missingBackend>0）/ passed。
 * 启发式正则、多假阳源 → advisory 不阻断 verify 完成（与 SillySpec 确定性校验定位一致）。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 扫描前端调用的根（主工作区，verify 时代码在此）
 * @param {string} opts.specBase
 * @param {string|null} [opts.changeName]
 * @param {string|null} [opts.runtimeRoot]
 * @returns {{ status: 'skipped'|'warning'|'passed', missingBackend: Array, unusedBackend: Array, summary: string, reason: string|null }}
 */
export function runVerifyParityCheck({ cwd, specBase, changeName = null, runtimeRoot = null }) {
  const r = verifyApiParity(specBase, cwd, runtimeRoot, changeName)
  // 无 provider artifact（execute 未提取 / 非后端项目）→ 不打扰
  if (r.backendCount === 0) {
    return { status: 'skipped', missingBackend: [], unusedBackend: [], summary: r.summary, reason: '无后端契约 artifact（非全栈项目或 execute 未提取端点）' }
  }
  if (r.missingBackend.length > 0) {
    return { status: 'warning', missingBackend: r.missingBackend, unusedBackend: r.unusedBackend, summary: r.summary, reason: null }
  }
  return { status: 'passed', missingBackend: [], unusedBackend: r.unusedBackend, summary: r.summary, reason: null }
}

/** 打印 parity 对账结果（advisory，不阻断） */
export function printVerifyParityCheck(result) {
  if (result.status === 'skipped') return  // 静默，不打扰非全栈项目
  if (result.status === 'passed') {
    console.log(`\n✅ API parity 对账通过：${result.summary}`)
    return
  }
  // warning
  console.warn(`\n⚠️  API parity 对账发现 ${result.missingBackend.length} 个前端调用无对应后端端点（advisory，不阻断归档）：`)
  for (const m of result.missingBackend.slice(0, 20)) {
    console.warn(`   - ${m.method} ${m.path}  ← ${m.consumerFile}:${m.consumerLine}`)
  }
  if (result.missingBackend.length > 20) console.warn(`   …还有 ${result.missingBackend.length - 20} 个`)
  console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。')
}

/**
 * 删除探针（advisory）：用 git 事实客观对账本次变更删除的文件 vs design.md 声明的操作。
 *
 * 切斯特顿栅栏护栏——verify 对「agent 静默删除代码」本是盲区：agent 删一段它看不懂的
 * 旧代码，只要路径合规、不碰风险关键词，5 探针 + 风险分级 + 测试对账全都不会响。本探针
 * 不信任 agent 自报告，用 `git diff --name-status HEAD` 客观提取删除文件，对账 design
 * 清单声明的操作（声明「新增/修改」却整文件删除 = 高风险）。warning 不阻断 verify 完成
 * （advisory 起步）——「检测到删除」是确定性事实（做），「该不该删」是意图（只报不拦）。
 *
 * 信号源：apply（git apply --3way）不 commit，verify 时主仓 HEAD 仍是变更前 commit，
 * 删除的文件在工作树消失但仍在 HEAD → `git diff --name-status HEAD` 显示 D。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 项目根（主仓，代码在此）
 * @param {string} opts.specBase - .sillyspec（或平台 specRoot）
 * @param {string|null} [opts.changeName]
 * @returns {{
 *   status: 'skipped'|'warning'|'passed',
 *   highRisk: Array<{path:string, declaredOp:string, reason:string}>,
 *   mediumRisk: Array<{path:string, reason:string}>,
 *   compliant: Array<{path:string, declaredOp:string}>,
 *   summary: string,
 *   reason: string|null,
 * }}
 */
export function runVerifyDeletionCheck({ cwd, specBase, changeName = null }) {
  const statusRaw = runGitDiffNameStatus(cwd, 'HEAD')
  if (statusRaw === null) {
    return { status: 'skipped', highRisk: [], mediumRisk: [], compliant: [],
      summary: '', reason: 'git 不可用或非仓库，删除对账跳过' }
  }

  // 解析 D（删除）；R/C 的旧路径等价删除（防御 committed rename；标准 apply 流程
  // rename 表现为纯 D，故本探针不加 -M，D 统一处理）。
  const deletions = []
  for (const line of statusRaw.split('\n').filter(Boolean)) {
    const parts = line.split('\t')
    const st = parts[0]
    if (!st) continue
    if (st.startsWith('D')) {
      deletions.push({ path: parts[1], kind: 'D' })
    } else if ((st.startsWith('R') || st.startsWith('C')) && parts.length >= 3) {
      // rename/copy 旧路径（parts[1]）等价删除，新路径 parts[2]
      deletions.push({ path: parts[1], kind: 'R-old', renamedTo: parts[2] })
    }
  }

  // 排除交付物外文件（.sillyspec/ 变更包/运行时/quicklog + meta.json），避免污染删除信号。
  // 复用 worktree-apply.js 的 filterDeliverableFiles 去双写（坑3：保留 .sillyspec/docs/）。
  const deliverable = filterDeliverableFiles(deletions.map(d => d.path))
    .map(p => deletions.find(d => d.path === p))

  if (deliverable.length === 0) {
    return { status: 'skipped', highRisk: [], mediumRisk: [], compliant: [],
      summary: '', reason: '本次变更无文件删除（或改动已被 commit，主仓 HEAD 已推进，删除对账无锚点）' }
  }

  // 读 design 声明（operation）。无清单章节 → []，所有删除归「未声明」。
  const designPath = changeName
    ? join(specBase, 'changes', changeName, 'design.md') : null
  const designEntries = designPath && existsSync(designPath)
    ? parseFileChangeListDetailed(designPath) : []

  const highRisk = []
  const mediumRisk = []
  const compliant = []
  for (const d of deliverable) {
    const hit = designEntries.find(e => pathMatches(d.path, e.path))
    if (!hit) {
      mediumRisk.push({ path: d.path, reason: d.kind === 'R-old'
        ? `重命名源文件未在 design 清单（→ ${d.renamedTo}）`
        : 'design 清单未列出该删除文件' })
      continue
    }
    if (hit.operation === '新增' || hit.operation === '修改') {
      highRisk.push({ path: d.path, declaredOp: hit.operation,
        reason: `design 声明「${hit.operation}」但 git 显示整文件删除` })
    } else if (hit.operation === '删除') {
      compliant.push({ path: d.path, declaredOp: '删除' })
    } else {
      // operation=null（未声明操作）或 重命名：删除发生但声明不明确
      mediumRisk.push({ path: d.path,
        reason: `design 列出但操作为「${hit.operation || '未声明'}」，与删除不一致` })
    }
  }

  if (highRisk.length > 0 || mediumRisk.length > 0) {
    return { status: 'warning', highRisk, mediumRisk, compliant,
      summary: `${highRisk.length} 个高风险删除 + ${mediumRisk.length} 个未声明删除`, reason: null }
  }
  return { status: 'passed', highRisk: [], mediumRisk: [], compliant,
    summary: `所有 ${compliant.length} 个删除均在 design 声明为「删除」`, reason: null }
}

/** 打印删除对账结果（advisory，不阻断 verify 完成） */
export function printVerifyDeletionCheck(result) {
  if (result.status === 'skipped') return  // 静默：无删除 / git 不可用 / 改动已 commit
  if (result.status === 'passed') {
    console.log(`\n✅ 删除对账通过：${result.summary}`)
    return
  }
  // warning
  if (result.highRisk.length > 0) {
    console.warn(`\n⚠️  删除对账发现 ${result.highRisk.length} 个高风险删除（design 声明新增/修改却被整文件删除，advisory 不阻断）：`)
    for (const m of result.highRisk.slice(0, 20)) console.warn(`   - ${m.path}  (${m.reason})`)
    if (result.highRisk.length > 20) console.warn(`   …还有 ${result.highRisk.length - 20} 个`)
  }
  if (result.mediumRisk.length > 0) {
    console.warn(`⚠️  ${result.mediumRisk.length} 个未声明删除（design 清单未列出 / 操作不一致）：`)
    for (const m of result.mediumRisk.slice(0, 20)) console.warn(`   - ${m.path}  (${m.reason})`)
    if (result.mediumRisk.length > 20) console.warn(`   …还有 ${result.mediumRisk.length - 20} 个`)
  }
  console.warn('   提示：确认删除是否预期。预期删除请在 design.md 清单用「删除」操作显式声明；误删请恢复。')
}

/**
 * required-evidence 对账（advisory，不阻断 verify 完成）。
 *
 * execute 阶段 Task Review Gate 把 cannot_verify 任务的 requiredEvidence 写入
 * changes/<change>/verify-required-evidence.json（schema: {generatedAt, schemaVersion, items:[{task, verdict, evidence:string[]}]}）。
 * 历史"死链"（sss1.md 矛盾2）：只写不读——verify agent 不在 verify-result.md 体现也不会被发现，
 * 且 verify.js prompt 让 agent 读 `requiredEvidence` 键（字段名错配，实际是 items[].evidence），照做必落空。
 * 本探针闭合该链：读 evidence 文件，对每个 cannot_verify 任务检查 verify-result.md 是否提及该任务 id；
 * 未提及 → warning（advisory）。CLI 只做"任务被提及"的机械存在性检查，evidence 是否真正满足
 * （satisfied/missing/partial）由 agent 在 verify-result.md 诚实自报告——不假装语义判定（与删除探针同 altitude）。
 *
 * @param {{cwd:string, specBase:string, changeName?:string}} args
 * @returns {{status:'skipped'|'passed'|'warning', items:Array, unacknowledged:Array, summary:string, reason:string|null}}
 */
export function runVerifyRequiredEvidenceCheck({ cwd, specBase, changeName = null }) {
  if (!changeName) {
    return { status: 'skipped', items: [], unacknowledged: [], summary: '', reason: '无 changeName（quick 等无关联变更场景），evidence 对账跳过' }
  }
  const evidencePath = join(specBase, 'changes', changeName, 'verify-required-evidence.json')
  if (!existsSync(evidencePath)) {
    return { status: 'skipped', items: [], unacknowledged: [], summary: '', reason: '无 verify-required-evidence.json（execute 无 cannot_verify 任务），evidence 对账跳过' }
  }

  let data
  try {
    data = JSON.parse(readFileSync(evidencePath, 'utf8'))
  } catch (e) {
    return { status: 'skipped', items: [], unacknowledged: [], summary: '', reason: `verify-required-evidence.json 解析失败（${e.message}），evidence 对账跳过` }
  }
  const items = Array.isArray(data.items) ? data.items : []

  // 读 verify-result.md（不存在则所有 evidence 任务都"未体现"）
  const verifyResultPath = join(specBase, 'changes', changeName, 'verify-result.md')
  const report = existsSync(verifyResultPath) ? readFileSync(verifyResultPath, 'utf8') : ''

  const unacknowledged = []
  for (const item of items) {
    const task = item && item.task
    if (!task) continue
    // 机械存在性检查：verify-result.md 是否提及该 cannot_verify 任务 id。
    // evidence 数组的具体满足度（satisfied/missing/partial）由 agent 自报告，CLI 不判定。
    if (!report.includes(task)) {
      const evidenceCount = Array.isArray(item.evidence) ? item.evidence.length : 0
      unacknowledged.push({ task, verdict: item.verdict || 'cannot_verify', evidenceCount,
        reason: `cannot_verify 任务 ${task} 未在 verify-result.md 中体现（需逐条 evidence 给结论 satisfied/missing/partial）` })
    }
  }

  if (unacknowledged.length > 0) {
    return { status: 'warning', items, unacknowledged,
      summary: `${items.length} 个 cannot_verify evidence 任务中 ${unacknowledged.length} 个未在 verify-result.md 体现`, reason: null }
  }
  return { status: 'passed', items, unacknowledged: [],
    summary: `${items.length} 个 cannot_verify evidence 任务均在 verify-result.md 体现（满足度由 agent 自报告）`, reason: null }
}

/** 打印 required-evidence 对账结果（advisory，不阻断 verify 完成） */
export function printVerifyRequiredEvidenceCheck(result) {
  if (result.status === 'skipped') return  // 静默：无 evidence 文件 / 无 changeName / 解析失败
  if (result.status === 'passed') {
    console.log(`\n✅ required-evidence 对账通过：${result.summary}`)
    return
  }
  // warning
  console.warn(`\n⚠️  required-evidence 对账发现 ${result.unacknowledged.length} 个 cannot_verify 任务未在 verify-result.md 体现（advisory 不阻断）：`)
  for (const u of result.unacknowledged.slice(0, 20)) console.warn(`   - ${u.task}  (${u.reason})`)
  if (result.unacknowledged.length > 20) console.warn(`   …还有 ${result.unacknowledged.length - 20} 个`)
  console.warn('   提示：execute 标记的 cannot_verify 任务需在 verify-result.md 逐条给 evidence 结论（satisfied/missing/partial）。CLI 仅查任务被提及，是否真满足由你诚实判定。')
}
