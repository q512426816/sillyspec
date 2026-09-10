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
 * test_strategy 支持（D-002@v1；D-005@v2 扩 skip/evidence-auto）：
 * - full（默认）：整跑 commands.test（brownfield 行为不变）
 * - module：按 local.yaml modules 映射，仅跑 git diff 命中的模块子集
 *           测试，避免 monorepo 全量测试超 gate timeout。
 * - skip：真跳过测试（不再回退全量——兑现声明语义，verify 输出显式
 *         标注留审计痕迹，R-07；既有 skipped 状态机承载）。
 * - evidence-auto：按变更目录 module-impact.md 影响类型推荐检查组合
 *                 （行为→module 聚焦测试、文档/prompt→docs-check、门禁
 *                 契约→gate；缺失/不可解析降级 module 并注记），推荐结果
 *                 由 resolveTestStrategy 统一产出（契约 test_strategy_resolution，
 *                 task-12 经 run/prompt.js 注入 prompt 供用户否决）。
 */

import { execSync, spawnSync } from 'child_process'
import { createHash } from 'crypto'
import { IR_STRICT_SINCE } from './constants.js'
import { gitQuiet } from './git-helper.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { verifyApiParity } from './contract-matrix.js'
import { parseFileChangeListDetailed, pathMatches } from './change-list.js'
import { filterDeliverableFiles } from './worktree-apply.js'
// target_files 声明侧解析（Wave 1 已落地）：依赖链已核实无环——plan-postcheck 不反向依赖本模块，
// 且本模块已经 worktree-apply.js:21 间接依赖 plan-postcheck，此处改直连不引入新环（task-04）
import { parseTargetFiles, parseRepo } from './stages/plan-postcheck.js'
// 探针重跑（P3b task-02 一致性抽查）：依赖方向已核实无环——verify-probes 只依赖
// fs/path/git-helper/change-list/plan-postcheck/contract-matrix/foreign-declared/run-shared，
// 不反向依赖本模块，此处直连不引入循环
import { runVerifyProbes } from './verify-probes.js'
import { parseEvidenceSlots, classifyVerifiedFile } from './verify-facts-schema.js'

// 测试命令最长执行时间；超时视为失败（防止 CLI 被挂起的测试卡死）
const TEST_TIMEOUT_MS = Number(process.env.SILLYSPEC_TEST_TIMEOUT_MS) || 10 * 60 * 1000
const OUTPUT_TAIL_CHARS = 4000
// 判账失败行台账上限（坑 verify-test-reconcile-tail-blindspot）：对账按完整输出判、tail 只存
// 末 4000 字符 → 失败行落在盲区时只剩 reason 里 5 行×120 字符采样，归因必须全量复跑。修法是
// 判账行集（remaining/exempted 全量原文）随结果透传落盘/打印；台账只防病态体量——单行截
// 300 字符、行数截 200，超出注明计数。judge 判账仍用全量行集，不受此截断影响。
const FAILURE_LEDGER_MAX_LINES = 200
const FAILURE_LEDGER_MAX_CHARS = 300

/** 失败行台账截断（落盘/展示用；判账本身不受影响）。export 供 test 验证截断语义 */
export function capFailureLedger(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return []
  const out = lines.slice(0, FAILURE_LEDGER_MAX_LINES).map(l => {
    const s = String(l)
    return s.length > FAILURE_LEDGER_MAX_CHARS ? s.slice(0, FAILURE_LEDGER_MAX_CHARS) + '…' : s
  })
  if (lines.length > FAILURE_LEDGER_MAX_LINES) {
    out.push(`…（共 ${lines.length} 行，仅列前 ${FAILURE_LEDGER_MAX_LINES} 行；判账按全量行集不受此截断影响）`)
  }
  return out
}

/**
 * 行尾归一（坑 verify-modules-crlf-blanket-fallback，2026-08-20 实证）：Windows 仓的
 * local.yaml 常为 CRLF（编辑器/CLI 写入），手写行扫描器的逐行正则里 `.` 不匹配 `\r`、
 * `$`（无 m 标志）又要求真串尾——`\r` 残留行尾导致条目正则整条失配。实证受害：
 * extractModules 返回 null（modules 映射恒失效 → 永远回退全量 → 600s 默认超时必炸）、
 * extractKnownFailures 块式只捕获第一条。统一在解析入口归一，JS 的 `\r?\n` 拆分与
 * yaml 库均兼容 LF 文本（零回归）。
 */
function normalizeLineEndings(text) {
  return String(text || '').replace(/\r\n?/g, '\n')
}

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
 * 从 local.yaml 文本提取 commands.lint（2026-08-21 审查 CLI-1：lint 对账）。
 * 与 extractTestCommand 同风格同容错（带引号/不带引号/unavailable）。
 * 模块内私有（runVerifyLintCheck 消费；extractTestCommand 系 export 供 test）。
 */
function extractLintCommand(yamlText) {
  if (!yamlText) return null
  const doubleQuoted = yamlText.match(/^\s*lint:\s*"([^"]+)"\s*(?:#.*)?$/m)
  const singleQuoted = yamlText.match(/^\s*lint:\s*'([^']+)'\s*(?:#.*)?$/m)
  const quoted = doubleQuoted || singleQuoted
  if (quoted && quoted[1]) {
    return quoted[1].toLowerCase() === 'unavailable' ? null : quoted[1].trim()
  }
  const bare = yamlText.match(/^\s*lint:\s*([^\n#"']+?)\s*(?:#.*)?$/m)
  if (bare && bare[1]) {
    const cmd = bare[1].trim()
    return cmd.toLowerCase() === 'unavailable' ? null : cmd
  }
  return null
}

/**
 * lint advisory 观察期计数（刀③，2026-09-08）：advisory 失败不阻断，但「观察期后升级硬门」
 * 需要失败率数据支撑（更硬 vs 更吵的决策依据——硬门误伤纯文档/跨平台路径会制造新噪音）。
 * 每次非 skipped 实测追加计数进 <specBase>/.runtime/verify-lint-tally.json（passed/failed
 * 都记，分母同要）；history 截尾 20 条。写失败静默降级——计数器不许反向阻断 verify。
 */
function recordVerifyLintTally({ specBase, result }) {
  try {
    const runtimeDir = join(specBase, '.runtime')
    mkdirSync(runtimeDir, { recursive: true })
    const tallyPath = join(runtimeDir, 'verify-lint-tally.json')
    let tally = { totalRuns: 0, failedRuns: 0, history: [] }
    try {
      tally = { ...tally, ...JSON.parse(readFileSync(tallyPath, 'utf8')) }
    } catch { /* 首跑/文件损坏 → 重置重新累计 */ }
    tally.totalRuns += 1
    if (result.status === 'failed') tally.failedRuns += 1
    tally.lastRunAt = new Date().toISOString()
    tally.lastStatus = result.status
    tally.history = [
      ...(Array.isArray(tally.history) ? tally.history : []),
      { at: tally.lastRunAt, status: result.status, reason: result.reason || null },
    ].slice(-20)
    writeFileSync(tallyPath, JSON.stringify(tally, null, 2))
    return { failedRuns: tally.failedRuns, totalRuns: tally.totalRuns }
  } catch {
    return null
  }
}

/**
 * verify --done 实测跑 local.yaml commands.lint（2026-08-21 审查 CLI-1）。
 * 此前 lint 全靠 agent 自跑自报（"我跑过 lint 了"纯口头），与 test 侧的对账不对称——
 * agent 偷懒漏跑时格式债被推迟到用户 commit 才被 pre-commit hook 炸出。
 * advisory 起步：失败只打印不阻断（test 门已 fail-closed，lint 门观察期后再升级）。
 * 信任边界与 runVerifyTestCheck 一致：命令只来源于主仓 .sillyspec/local.yaml。
 */
export function runVerifyLintCheck({ cwd, specBase }) {
  const localYamlPath = join(specBase, 'local.yaml')
  const yamlText = existsSync(localYamlPath) ? readFileSync(localYamlPath, 'utf8') : null
  const command = extractLintCommand(yamlText)

  if (!command) {
    return {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason: yamlText
        ? 'local.yaml 未配置 commands.lint（或标记 unavailable）'
        : `local.yaml 不存在（${localYamlPath}）`,
    }
  }

  const LINT_TIMEOUT_MS = Number(process.env.SILLYSPEC_LINT_TIMEOUT_MS) || 3 * 60 * 1000
  const startedAt = Date.now()
  let exitCode = 0
  let output = ''
  let reason = null
  try {
    output = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout: LINT_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    exitCode = typeof e.status === 'number' ? e.status : 1
    output = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message
    reason = e.signal === 'SIGTERM' && Date.now() - startedAt >= LINT_TIMEOUT_MS
      ? `lint 命令超时（>${LINT_TIMEOUT_MS / 1000}s）`
      : `lint 命令退出码 ${exitCode}`
  }
  const durationMs = Date.now() - startedAt
  const outputTail = output.length > OUTPUT_TAIL_CHARS ? '…' + output.slice(-OUTPUT_TAIL_CHARS) : output
  const status = exitCode === 0 ? 'passed' : 'failed'
  const finalReason = exitCode === 0 ? null : reason
  const tally = recordVerifyLintTally({ specBase, result: { status, reason: finalReason } })

  return {
    status,
    command,
    exitCode,
    durationMs,
    outputTail,
    reason: finalReason,
    tally, // { failedRuns, totalRuns } | null——观察期失败率，升级硬门的决策依据
  }
}

/**
 * lint 硬门决策（2026-09-09 升硬，外部数据驱动）：观察期 tally 14 次 5 败全真阳性零误伤，
 * 且 pre-push 钩子本就硬拦——verify 侧硬门只是同一标准 fail-fast 前移。
 * 逃生档：SILLYSPEC_VERIFY_LINT_GATE=advisory（审计留痕，对齐 quick 门 skip env 先例）。
 * @returns {boolean} failed 且非逃生档 → true（调用方 rollback）
 */
export function shouldBlockVerifyLint(lintCheck, env = process.env) {
  if (!lintCheck || lintCheck.status !== 'failed') return false
  return env.SILLYSPEC_VERIFY_LINT_GATE !== 'advisory'
}

/**
 * 打印 lint 实测结果（2026-09-09 起按 shouldBlockVerifyLint 分支）：硬门档「已阻断」+
 * 逃生 env 指引（rollback 由 gates 接线侧执行）；advisory 档保留旧观察期措辞。
 */
export function printVerifyLintCheck(result) {
  if (result.status === 'skipped') {
    console.warn(`\n⚠️  Verify lint 实测跳过：${result.reason}`)
    return
  }
  if (result.status === 'passed') {
    console.log(`\n✅ Verify lint 实测通过：\`${result.command}\` 退出码 0（${(result.durationMs / 1000).toFixed(1)}s）`)
    return
  }
  // 文案随门禁档位分支（2026-09-09 复核修正 P2：硬门档下旧「不阻断/观察期」措辞与
  // gates 的 rollback 行为打架，agent 会误判 CLI 抽风）——rollback 本体在 gates 接线侧。
  if (shouldBlockVerifyLint(result)) {
    console.error(`\n❌ Verify lint 实测失败——verify 完成已阻断（2026-09-09 起硬门）：\`${result.command}\` — ${result.reason}`)
    console.error('   agent 的 lint 自报告与实测不符时以实测为准；修复后重跑 --done（进度不丢）。')
    if (result.tally) {
      console.error(`   📊 累计 ${result.tally.failedRuns}/${result.tally.totalRuns} 次（.runtime/verify-lint-tally.json）。`)
    }
    console.error('   确认要跳过实测：SILLYSPEC_VERIFY_LINT_GATE=advisory（审计留痕）。')
  } else {
    console.error(`\n⚠️  Verify lint 实测失败（advisory 档，不阻断本次完成）：\`${result.command}\` — ${result.reason}`)
    console.error('   agent 的 lint 自报告与实测不符时以实测为准；请修复后重跑，避免格式债推迟到 commit 被 pre-commit hook 拦截。')
    if (result.tally) {
      console.error(`   📊 lint advisory 失败累计 ${result.tally.failedRuns}/${result.tally.totalRuns} 次（数据落 .runtime/verify-lint-tally.json）。`)
    }
  }
  if (result.outputTail) {
    const tail = result.outputTail.split('\n').slice(-15).join('\n')
    console.error('   输出（末尾）：')
    for (const line of tail.split('\n')) console.error(`   | ${line}`)
  }
}

/**
 * 从 local.yaml 文本提取顶层 test_strategy。
 * 轻量正则（与 extractTestCommand 同风格，不引 yaml 依赖）。
 *
 * D-005@v2：识别 skip（真跳过）与 evidence-auto（按 module-impact 推荐）两新值；
 * 未知值仍回 null（缺省全量口径不动）。
 *
 * @param {string} yamlText
 * @returns {'full'|'module'|'skip'|'evidence-auto'|null} - 解析到的策略；缺省/无法解析返回 null（调用方按 full 处理）
 */
export function extractTestStrategy(yamlText) {
  if (!yamlText) return null
  // 值字符集含 '-'（evidence-auto）；不含 '.'/空格，与顶层标量枚举写法一致
  const m = yamlText.match(/^\s*test_strategy:\s*([A-Za-z_-]+)\s*(?:#.*)?$/m)
  if (!m || !m[1]) return null
  const v = m[1].trim().toLowerCase()
  if (v === 'module') return 'module'
  if (v === 'full') return 'full'
  if (v === 'skip') return 'skip'
  if (v === 'evidence-auto') return 'evidence-auto'
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
 * 注：strategy 仅接收 full/module/null——skip 短路在其上游（runVerifyTestCheck 的
 * skip 分支）、evidence-auto 经 resolveTestStrategy 解析为生效策略后才进本函数，
 * 两者的 hint 语义由各自分支承载，本函数行为不变（D-005@v2）。
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

// ── evidence-auto 推荐逻辑（D-005@v2 / task-11，契约 test_strategy_resolution）──
// 按 W3 检查选择口径把 module-impact.md 的影响面映射为检查组合：
//   行为类（源码/逻辑/数据结构/接口/调用关系/配置/新增/修改）→ module 聚焦测试
//   文档/prompt 类（*.md、docs/** 等）→ docs-check
//   门禁/契约类（路径含 gate/contract）→ sillyspec gate
//   module-impact.md 缺失/不可解析 → 降级 module 策略并注记（多测不漏测）

/** 行为类影响信号词（module-impact.js 骨架「影响类型说明」词表 + 通用「修改/删除」）。 */
const IMPACT_BEHAVIORAL_TOKENS = ['逻辑变更', '数据结构变更', '接口变更', '调用关系变更', '配置变更', '新增', '修改', '删除']

/** 文档/prompt 面：md 系扩展名或 docs/ 前缀（.sillyspec/docs 同入）。 */
function isDocsImpactPath(p) {
  const n = String(p).replace(/\\/g, '/')
  return /\.(mdx?|markdown|txt)$/i.test(n) || n.startsWith('docs/') || n.startsWith('doc/') || n.startsWith('.sillyspec/docs/')
}

/** 门禁/契约面：路径含 gate/contract（stage-contract*.js / docs-gate.js / contract-matrix.js 等）。 */
function isGateImpactPath(p) {
  return /(gate|contract)/i.test(String(p))
}

/** 从行文本提取路径样 token：优先反引号包裹（骨架表格用），再裸路径（扩展名必须字母开头）。 */
function collectPathTokens(text) {
  const tokens = new Set()
  for (const m of String(text).matchAll(/`([^`]+)`/g)) {
    const t = m[1].trim()
    if (t) tokens.add(t)
  }
  const stripped = String(text).replace(/`[^`]*`/g, ' ')
  for (const m of stripped.matchAll(/[A-Za-z_][\w./\\-]*\.[A-Za-z][\w]{0,9}/g)) {
    tokens.add(m[0])
  }
  return [...tokens]
}

/**
 * 解析 module-impact.md 的「模块影响矩阵」+「未匹配文件」两节，按检查面归类影响证据。
 * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类
 * （影响面未知时多测不漏测）。矩阵节缺失 / 无数据行 → parseable=false（调用方降级）。
 *
 * @param {string|null} mdText
 * @returns {{ parseable: boolean, behavioral: string[], docs: string[], gate: string[] }}
 */
function classifyModuleImpactEvidence(mdText) {
  const out = { parseable: false, behavioral: [], docs: [], gate: [] }
  if (!mdText || !String(mdText).trim()) return out
  const lines = normalizeLineEndings(String(mdText)).split('\n')
  let section = null // 'matrix' | 'unmatched' | null
  let matrixRows = 0
  const consumeRow = (rowText) => {
    const tokens = collectPathTokens(rowText)
    let classified = 0
    for (const t of tokens) {
      if (isDocsImpactPath(t)) { out.docs.push(t); classified++ }
      else if (isGateImpactPath(t)) { out.gate.push(t); classified++ }
      else { out.behavioral.push(t); classified++ }
    }
    // 无路径 token 的行：落回影响类型信号词（如「| setup | 修改 | 枚举与新键 |」）
    if (classified === 0) {
      const tok = IMPACT_BEHAVIORAL_TOKENS.find((w) => rowText.includes(w))
      if (tok) { out.behavioral.push(`（影响类型：${tok}）`); classified++ }
    }
    // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类
    if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ }
    return classified
  }
  for (const line of lines) {
    const h = line.match(/^##+\s*(.+?)\s*$/)
    if (h) {
      const t = h[1]
      section = t.includes('模块影响矩阵') ? 'matrix' : t.includes('未匹配文件') ? 'unmatched' : null
      continue
    }
    if (!section) continue
    const trimmed = line.trim()
    if (section === 'matrix' && trimmed.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (cells.length === 0) continue
      if (cells.every((c) => /^[-:\s]*$/.test(c))) continue // 分隔行 |---|---|
      if (cells[0] === '模块' || cells.includes('变更文件') || cells.includes('影响类型')) continue // 表头
      matrixRows++
      consumeRow(trimmed)
    } else if (section === 'unmatched') {
      // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行
      const bullet = trimmed.match(/^-\s+(.+)$/)
      if (bullet) { consumeRow(bullet[1]); continue }
      if (trimmed.startsWith('|')) {
        const cells = line.split('|').slice(1, -1).map((c) => c.trim())
        if (cells.length === 0) continue
        if (cells.every((c) => /^[-:\s]*$/.test(c))) continue
        if (cells[0] === '文件') continue
        consumeRow(trimmed)
      }
    }
  }
  out.parseable = matrixRows > 0 && (out.behavioral.length + out.docs.length + out.gate.length) > 0
  return out
}

/**
 * resolveTestStrategy — test_strategy 解析 + evidence-auto 推荐统一入口
 * （契约 test_strategy_resolution，2026-08-23 adopt-harness-practices task-11）。
 *
 * 非 evidence-auto（full/module/skip/未配置 null）→ 原样透传 strategy 且
 * evidence_auto_recommendation=null（full/module/缺省消费路径逐字不变）；
 * evidence-auto → 按 module-impact.md 影响面解析生效策略 + 推荐检查组合：
 *   - 含行为类影响 → strategy='module'（聚焦测试）
 *   - 纯文档/prompt、门禁/契约影响（无行为类）→ strategy='skip'（测试不在推荐组合内）
 *   - module-impact.md 缺失/不可解析 → 降级 strategy='module' 且 degraded 注记
 *
 * @param {object} opts
 * @param {string|null} opts.yamlText - local.yaml 全文（与 extractTestStrategy 同源）
 * @param {string|null} [opts.changeDir] - 变更目录（定位 module-impact.md；evidence-auto 时缺省 → 降级）
 * @param {string|null} [opts.moduleImpactText] - module-impact.md 文本（测试注入用；提供则不读盘）
 * @returns {{ strategy: 'full'|'module'|'skip'|'evidence-auto'|null, evidence_auto_recommendation: object|null }}
 *   下游契约：task-12 消费 evidence_auto_recommendation（run/prompt.js 注入），
 *   task-13 消费 strategy（语义回归锁定）。两字段为 provides 契约的全部内容。
 */
export function resolveTestStrategy({ yamlText, changeDir = null, moduleImpactText = null }) {
  const configured = extractTestStrategy(yamlText ?? null)
  if (configured !== 'evidence-auto') {
    // full / module / skip / 未配置（null）——原样透传，不掺推荐语义
    return { strategy: configured, evidence_auto_recommendation: null }
  }

  let mdText = moduleImpactText
  if (mdText == null && changeDir) {
    const p = join(changeDir, 'module-impact.md')
    try {
      mdText = existsSync(p) ? readFileSync(p, 'utf8') : null
    } catch { mdText = null }
  }
  const ev = classifyModuleImpactEvidence(mdText)
  const sample = (arr) => arr.slice(0, 5).join('、') + (arr.length > 5 ? ` 等 ${arr.length} 处` : '')

  if (!ev.parseable) {
    const degradedReason = changeDir == null && moduleImpactText == null
      ? '未提供变更目录（changeDir），无法定位 module-impact.md'
      : 'module-impact.md 缺失或不可解析（无「模块影响矩阵」数据行）'
    const summary = [
      'test_strategy: evidence-auto 推荐：',
      `- ⚠️ 降级注记：${degradedReason}——已降级 module 策略（多测不漏测），推荐结果不可信时请显式设 test_strategy: full/module。`,
      '- 可在 verify-result.md 否决本推荐并改跑全量（显式设 test_strategy: full）。',
    ].join('\n')
    return {
      strategy: 'module',
      evidence_auto_recommendation: {
        configured_strategy: 'evidence-auto',
        resolved_strategy: 'module',
        degraded: true,
        degraded_reason: degradedReason,
        impact: { behavioral: [], docs: [], gate: [] },
        checks: [
          { kind: 'module-tests', reason: `${degradedReason} → 降级 test_strategy=module（多测不漏测）` },
        ],
        summary,
      },
    }
  }

  const checks = []
  if (ev.behavioral.length > 0) {
    checks.push({ kind: 'module-tests', reason: `行为类影响 ${ev.behavioral.length} 处（${sample(ev.behavioral)}）→ test_strategy=module 聚焦测试` })
  }
  if (ev.docs.length > 0) {
    checks.push({ kind: 'docs-check', reason: `文档/prompt 类影响 ${ev.docs.length} 处（${sample(ev.docs)}）→ sillyspec docs check` })
  }
  if (ev.gate.length > 0) {
    checks.push({ kind: 'gate', reason: `门禁/契约类影响 ${ev.gate.length} 处（${sample(ev.gate)}）→ sillyspec gate` })
  }
  // 生效测试策略：有行为类影响 → module；纯文档/门禁面 → skip（测试不在推荐组合内）
  const resolved = ev.behavioral.length > 0 ? 'module' : 'skip'
  const summaryLines = ['test_strategy: evidence-auto 推荐（依据变更目录 module-impact.md 影响面）：']
  for (const c of checks) summaryLines.push(`- ${c.reason}`)
  if (resolved === 'skip') {
    summaryLines.push('- 测试不在推荐组合内（module-impact.md 无行为类影响）——CLI 实测将跳过；如需全量实测，可在 verify-result.md 否决本推荐并显式设 test_strategy: full。')
  } else {
    summaryLines.push('- 可在 verify-result.md 否决本推荐并改跑全量（显式设 test_strategy: full）。')
  }
  return {
    strategy: resolved,
    evidence_auto_recommendation: {
      configured_strategy: 'evidence-auto',
      resolved_strategy: resolved,
      degraded: false,
      degraded_reason: null,
      impact: { behavioral: ev.behavioral, docs: ev.docs, gate: ev.gate },
      checks,
      summary: summaryLines.join('\n'),
    },
  }
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
  const lines = normalizeLineEndings(yamlText).split('\n')

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
    // 条目缩进放宽为「任意非零空白」（坑 modules-indent-hardcoded，plan-postcheck parseLocalYamlModules
    // 同款修复）：此前硬编码恰 2 空格——4 空格缩进条目被静默跳过、Tab 缩进直接截断整个块 →
    // modules 丢失 → modulesPresent=false 回退全量实测（600s 超时必炸）或 0 命中误跳过。
    const entry = line.match(/^([ \t]+)([A-Za-z0-9_.\-]+):\s*(.*)$/)
    if (!entry) {
      // 遇到新的顶层 key（行首非空格且非注释）→ modules 块结束
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('#') && line.trim() !== '') break
      continue
    }
    const name = entry[2]
    const rest = (entry[3] || '').trim()
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
  if (v.startsWith('"') && v.endsWith('"')) {
    // 双引号值剥壳后解开转义（坑 verify-modules-crlf-blanket-fallback 次生发现）：modules 的
    // test 命令常含嵌套引号（node -e "…" / pytest "…"），yaml 源里写作 \"；此前只剥外层引号
    // 不解 \\ 与 \"，解析结果残留字面反斜杠 → 命令直接坏。其余冷门转义（\n 等）按 YAML 规范
    // 应真转义，但保守留字面（可见优于静默变换，测试命令不含它们）
    v = v.slice(1, -1).replace(/\\(["\\])/g, '$1')
  } else if (v.startsWith("'") && v.endsWith("'")) {
    // 单引号值的 YAML 转义是 '' → '
    v = v.slice(1, -1).replace(/''/g, "'")
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
  const looseHits = []
  for (const [name, mod] of Object.entries(modules)) {
    if (!mod || !mod.path) continue
    const modPath = String(mod.path).replace(/\\/g, '/')
    const prefix = modPath.endsWith('/') ? modPath : modPath + '/'
    // path 本身被改 或 path/ 下任意文件被改
    const hit = files.some(f => f === modPath || f.startsWith(prefix))
    if (hit) { hits.push({ name, path: modPath, test: mod.test }); continue }
    // 宽松段匹配 fallback（坑 module-path-layout-mismatch，2026-08-22 实证：pnpm monorepo
    // 常见 packages/frontend 布局 vs modules 配 frontend/ 前缀——严格前缀 0 命中时按
    // 「路径段等于模块首段」兜底（packages/frontend/src/x → 命中 frontend），多测不漏测。
    // 首段去斜杠后比对，防 frontend-guide 之类前缀误蹭）
    const firstSeg = prefix.split('/')[0]
    if (firstSeg && files.some(f => ('/' + f + '/').includes('/' + firstSeg + '/'))) {
      looseHits.push({ name, path: modPath, test: mod.test, looseMatch: true })
    }
  }
  // 严格命中优先；全部严格 0 命中才用宽松兜底（并 warn 可见——宽松规则可能多命中）
  if (hits.length > 0) return hits
  if (looseHits.length > 0) {
    console.warn(`⚠️ 模块命中用宽松段匹配（modules path 前缀与 diff 布局不一致，如 packages/<name> vs <name>/）：命中 ${looseHits.map(h => h.name).join(', ')}——建议 local.yaml modules 的 path 对齐实际目录布局`)
    return looseHits
  }
  return []
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
  // CRLF 归一（坑 verify-modules-crlf-blanket-fallback）：块式正则的 `.+`/`\n?` 在 CRLF 行
  // 间失配，只捕获到第一条豁免项就停——归一后整块捕获恢复
  const yaml = normalizeLineEndings(yamlText)
  const inline = yaml.match(/^known_failures:\s*\[([^\]]*)\]\s*(?:#.*)?$/m)
  if (inline) {
    return inline[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  }
  // 坑 verify-known-failures-comment-line-truncation（2026-08-28 连续踩两次）→ 坑
  // verify-known-failures-block-fragile-chain（2026-09-07 工具复盘升级修复）：块式捕获曾要求
  // 「- 项行 / 注释行 / 空行」**连续成链**（(...)+），任何一行不合形态——手改残留的缩进杂行、
  // 空项 `  -`、误删半截的段残迹——链条即断，其后所有条目**静默丢失**（实证形态：G/H 注释段
  // 踩着 F 段残迹重写，F 段遗留行断链 → G/H 条目全丢 → 清单残缺 → verify 假红，且丢得多静默
  // 就多难归因）。改为逐行扫描：块 = known_failures: 头之后连续的「缩进行 / 注释行（任意缩进，
  // 含列首）/ 空行」，首个列首正文行收块；块内杂行一律容忍，`- ` 项行无论隔着什么都提取——
  // 只有 YAML 本就不合法的形态（列首裸 `- 项`）才不取，不再因断链静默丢项。
  const lines = yaml.split('\n')
  const headIdx = lines.findIndex(l => /^known_failures:\s*(?:#.*)?$/.test(l))
  if (headIdx === -1) return []
  const itemRe = /^[ \t]+-[ \t]+(.+)$/
  const items = []
  for (let i = headIdx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() === '') continue // 空行：块内分隔，放行
    if (/^[ \t]*#/.test(l)) continue // 注释行（任意缩进含列首）：段头/归因注记，放行
    if (!/^[ \t]/.test(l)) break // 列首正文行：下一个顶层键，收块
    const m = l.match(itemRe) // 其余缩进行一律留在块内；项行才提取（杂行不提取但不断链）
    if (m) items.push(m[1])
  }
  return items
    .map(s => {
      const item = s.trim()
      const full = item.match(/^(['"])(.*)\1$/)
      if (full) return full[2] // 整体引号值原样保留（内部 # 不是注释）
      const stripped = item.replace(/[ \t]+#.*$/, '').trim() // 行尾注释须 # 前有空白（YAML 语义），裸 # 不截
      const q2 = stripped.match(/^(['"])(.*)\1$/)
      return q2 ? q2[2] : stripped
    })
    .filter(Boolean)
}

// 单条失败行标记（跨 pytest/jest/vitest/go/generic）。大小写不敏感。
// 刻意用 FAIL/FAILED + 配合 SUMMARY_LINE_RE 排除汇总行：否则 pytest/jest 的
// "N failed" 汇总会被误判为「需豁免的失败行」→ 永远 remaining>0 → known_failures 失效。
// ×(U+00D7) 是 vitest 失败行的实际前缀标记（✕✗✘ 是 jest/mocha 形态）。
const PER_TEST_FAIL_RE = /(FAILED|\bFAIL\b|✕|✗|✘|×|panic\s*:|assertionerror|traceback|---\s*fail|error:|exception)/i
// 汇总/计数行（非单条失败）：pytest === 框、jest "Tests:"、vitest "Test Files  N failed"/"Tests  N failed | M passed"
// （无冒号形态）、裸 "N failed/passed"、go "FAILED in Ns"、pnpm "ELIFECYCLE Test failed" 退出横幅等。
const SUMMARY_LINE_RE = /(={2,}.*={2,}|^\s*\d+\s+(failed|passed|skipped|pending)\b|tests?\s*:|test\s+suites?\s*:|^\s*(?:test\s+files|tests?)\s+\d|failed\s+in\s+\d|failed\s+tests\s+\d|elifecycle)/i
// 控制台捕获噪声行（非失败信号）：vitest 把测试内 console 输出捕获为
// `stderr | <file> > <测试名>` 横幅 + 后续内容行——挂在通过用例上的噪声里常含
// error:/failed 字样（jsdom「Not implemented」警告、用例名本身带 failed 等），
// 与失败信号（× 行 / FAIL 横幅 / 汇总计数）无关，全部剔除。
const CONSOLE_CAPTURE_RE = /^\s*(?:stdout|stderr)\s*\|/
const ENV_NOISE_RE = /not\s+implemented\s*:/i
// 报表行（vitest/jest 测试运行器自身输出，非被捕获的 console 内容）：失败结果标记行
// （×✕✗✘ 前缀 / FAIL 文件行）、❯ 文件摘要行、⎯ 分节分隔行——用作捕获块的结束边界。
const REPORT_LINE_RE = /^\s*(?:[×✕✗✘]|FAIL\b|❯|⎯)/
// Python/pytest 警告噪声（坑 verify-pytest-warnings-noise，2026-09-01 实证）：pytest 把
// warnings summary 打印成「测试 id 行 + `<路径>:<行号>: <XxxWarning>: 消息` 归因行 + 缩进
// 源码展示行」。归因行的**文件路径**常含 exception/error 子串（starlette `_exception_handler.py`
// 是 FastAPI 全家桶标配，路径即命中 /exception/i）——整块被判失败行，backend 全量实测真实
// 1 个守卫失败被上百行 DeprecationWarning 噪声淹没、只能人工分模块定位。warning 不是失败
// 信号：① 区段级整段剔（区段头 → 下一 pytest 区段头）；② 行级剔（截断 tail 看不到区段头时
// 兜底：归因/分组/Node 警告行 + 其上下文的 id/源码展示行）。真实失败的归因行（如
// `file.py:42: AssertionError`）非 *Warning 类名，形态可分、不受影响。
// 区段头：`============================== warnings summary ===============================`
const PY_WARNINGS_SECTION_RE = /^\s*=+.*warnings summary.*=+\s*$/i
// pytest 任意区段分隔头（`==== short test summary info ====` / `==== 3 failed, 300 passed in 12s ====`）
const PY_SECTION_RE = /^\s*=+.*=+\s*$/
// warning 归因行：`C:\...\file.py:59: DeprecationWarning: ...` / `file.py:7: UserWarning: ...`
// （盘符/相对路径两形态；截断前缀 … 是普通非冒号字符，[^:\r\n] 天然兼容）
const PY_WARNING_ATTR_RE = /^\s*(?:[A-Za-z]:)?(?:[^:\r\n]*[\\/])?[^:\r\n]*:\d+:\s+\w*Warning:/
// 分组归因行：`tests/test_x.py: 13 warnings`
const PY_WARNING_GROUP_RE = /^\s*(?:[A-Za-z]:)?[^:\r\n]*:\s*\d+\s+warnings?\b/i
// Node 进程警告行：`(node:1234) [DEP0040] DeprecationWarning: ...`
const NODE_WARNING_RE = /^\s*\(node:\d+\)\s*(?:\[[^\]]*\]\s*)?\w*Warning:/
// pytest 测试 id 行（`path/to/test.py::TestClass::test_x`，无空格）——warnings summary 内
// 逐条 warning 的归属头；只在 warning 上下文激活时剔（正常输出里的 id 行不动）
const PY_TEST_ID_RE = /^\S+::\S+$/
// 通过行（行首标记，剥 ANSI 后判定）：vitest/jest/mocha 的 ✓√✔ 前缀行 + jest 的 PASS 文件行。
// 坑 verify-known-failures-pass-line-false-positive：FAILED/error:/exception 是子串匹配，
// 通过行用例名恰含这些字样（如「✓ … 超时后 syncStatus=failed」）会被误判失败行——
// 2710 用例套件 382 个"失败行"里 378 假阳性，known_failures 无法逐条枚举而实质失效。
// 框架输出里通过行恒以通过标记开头、失败行恒以失败标记开头，行首判定即足以分离两类。
const PASS_LINE_RE = /^\s*(?:[✓√✔]|PASS\b)/
// ANSI 色码剥离（分类用）：TTY 捕获的输出里 ✓/× 前缀可能被色码包裹，行首锚定会失配。
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g

/**
 * 把测试输出按行筛出「失败行」，再按 known_failures 模式分为已豁免 / 未豁免。
 * @param {string} output
 * @param {string[]} knownFailures 子串模式列表（大小写不敏感）
 * @returns {{ failureLines: string[], exempted: string[], remaining: string[] }}
 */
export function partitionFailures(output, knownFailures) {
  const lines = String(output || '').split(/\r?\n/)
  // 分类在剥 ANSI 后的行上做，返回保留原文（remaining 展示给 agent 时不变形）。
  // 捕获块状态机（坑 verify-console-capture-block-noise，2026-08-31 daemon 套件 ~710 行实证）：
  // vitest 把测试内 console 输出捕获为 `stdout|`/`stderr|` 横幅 + 后续内容行——旧逻辑只剔
  // 横幅行本身，内容行（通过用例的结构化日志，常含 error:/failed 字样）仍中子串匹配成假
  // 失败行。块以横幅开始，直到下一报表行（通过/失败标记、FAIL 文件行、❯ 文件摘要、⎯ 分节
  // 符、汇总行）结束；块内内容行一律剔除。真实失败恒有 ×/FAIL 报表行（先结束块、照常参与
  // 分类），失败检出不受影响；检测不到失败行时 judgeWithKnownFailures 仍 fail-safe 判 failed。
  const failureLines = []
  let inCapture = false
  // pytest warnings summary 区段态：区段头开区、下一 pytest 区段头收区，区段内容整段剔
  let inPyWarnings = false
  // warning 上下文态（行级兜底）：命中归因/分组/Node 警告行后，紧随的缩进源码展示行、
  // pytest 测试 id 行与组间空行同属该 warning 展示块，一并剔；报表行/其他内容行终结上下文。
  let pyWarnCtx = false
  for (const l of lines) {
    const bare = l.replace(ANSI_RE, '')
    if (CONSOLE_CAPTURE_RE.test(bare)) { inCapture = true; pyWarnCtx = false; continue }
    if (PY_WARNINGS_SECTION_RE.test(bare)) { inPyWarnings = true; pyWarnCtx = true; continue }
    if (inPyWarnings) {
      if (PY_SECTION_RE.test(bare)) inPyWarnings = false // 下一区段头（short test summary info 等）收区
      continue // 区段内容（测试 id / 归因 / 源码展示行）：warning 噪声，非失败信号
    }
    const isReportLine = PASS_LINE_RE.test(bare) || REPORT_LINE_RE.test(bare) || SUMMARY_LINE_RE.test(bare)
    if (inCapture && !isReportLine) continue // 捕获块内容行：console 噪声，非失败信号
    if (isReportLine) inCapture = false
    // ── Python/pytest 警告行级剔除（截断 tail 无区段头时的兜底）──
    if (PY_WARNING_ATTR_RE.test(bare) || PY_WARNING_GROUP_RE.test(bare) || NODE_WARNING_RE.test(bare)) { pyWarnCtx = true; continue }
    if (pyWarnCtx) {
      if (isReportLine) pyWarnCtx = false // 报表行（含 short summary 区段头）终结 warning 上下文
      else if (PY_TEST_ID_RE.test(bare) || /^\s{2,}\S/.test(bare) || bare.trim() === '') continue // 同块源码展示 / 测试 id / 组间空行
      else pyWarnCtx = false
    }
    if (PASS_LINE_RE.test(bare)) continue
    if (ENV_NOISE_RE.test(bare)) continue
    if (PER_TEST_FAIL_RE.test(bare) && !SUMMARY_LINE_RE.test(bare)) failureLines.push(l)
  }
  // 豁免匹配同样在剥 ANSI 后的行上做（坑 verify-known-failures-ansi-exemption-split，2026-09-07
  // 工具复盘）：TTY 捕获的失败行里色码把可见词拦腰拆开（`× \x1b[31mtests/foo.test.ts\x1b[0m > case`
  // 连不成 `tests/foo.test.ts > case`），同一行被迫拆成两段各配一条模式才能豁免。模式侧同步剥
  // ANSI（从原始输出誊抄来的模式可能自带码）；返回仍保留原文（remaining/exempted 展示不变形）。
  const pats = (knownFailures || []).map(p => String(p).replace(ANSI_RE, '').toLowerCase()).filter(Boolean)
  const exempted = []
  const remaining = []
  for (const l of failureLines) {
    const ll = l.replace(ANSI_RE, '').toLowerCase()
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
 * 判账行集全量随结果返回（坑 verify-test-reconcile-tail-blindspot）：对账按完整输出判，但
 * outputTail 只留末 OUTPUT_TAIL_CHARS 字符——失败行落在盲区时 reason 采样不足以归因，只能
 * 全量复跑。remainingLines/exemptedLines（全量原文行）由调用方透传到 test-result.json 与
 * 控制台明细，盲区归因不再依赖复跑；passed 分支同样带 exemptedLines（豁免披露复核需要）。
 *
 * @returns {{ status: 'passed'|'failed', reason: string|null, exemptedCount: number,
 *             remainingLines: string[], exemptedLines: string[] }}
 */
export function judgeWithKnownFailures(exitCode, output, baseReason, knownFailures) {
  if (exitCode === 0) return { status: 'passed', reason: baseReason, exemptedCount: 0, remainingLines: [], exemptedLines: [] }
  const { failureLines, exempted, remaining } = partitionFailures(output, knownFailures || [])
  if (!knownFailures || knownFailures.length === 0) {
    // 无清单分支同样带行集：豁免与否都不该丢判账依据（tail 盲区归因同权）
    return { status: 'failed', reason: baseReason, exemptedCount: 0, remainingLines: remaining, exemptedLines: [] }
  }
  if (failureLines.length > 0 && remaining.length === 0) {
    return {
      status: 'passed',
      reason: `全部 ${failureLines.length} 个失败行命中 known_failures 已豁免（${exempted.length} 条）— 请人工复核豁免清单是否过宽`,
      exemptedCount: exempted.length,
      remainingLines: [],
      exemptedLines: exempted,
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
    // 指针改指台账（坑 verify-test-reconcile-tail-blindspot）：原「见上方测试输出」只对 tail
    // 窗口内的行成立，盲区行必须指向完整台账（控制台明细段 + test-result.json 的 failure_remaining）
    const more = remaining.length > 5 ? `\n     …（其余 ${remaining.length - 5} 行完整清单见下方「未豁免失败行」明细，已全量落盘 test-result.json 的 failure_remaining——不受输出 tail 截断影响）` : ''
    detail = `${remaining.length} 个失败行未命中 known_failures 清单：\n     - ${sample.join('\n     - ')}${more}\n   → 若是预存债（变更前就失败），加入 local.yaml 的 known_failures 清单；若是本次变更引入的真实失败，请修复`
  } else {
    detail = '失败输出未检测到可豁免的失败行（保守判 fail）'
  }
  return {
    status: 'failed',
    reason: baseReason ? `${baseReason}（${detail}）` : detail,
    exemptedCount: exempted.length,
    remainingLines: remaining,
    exemptedLines: exempted,
  }
}

/**
 * 决定 verify 实测的执行动作（纯函数，便于测试；坑 verify-worktree-... 修复方向 3）。
 *   - skip               → 'skip'（真跳过，D-005@v2——不落 full 兜底；evidence-auto 经
 *                          resolveTestStrategy 解析出生效 skip 时同走此动作）
 *   - module + 命中模块  → 'module-subset'
 *   - module + 0 命中    → 'module-zero-hit-skip'（不静默回退注定超时/预存失败的全量）
 *   - 其余（full / module 无块 / module git 不可用 hitCount=-1）→ 'full'
 * @returns {'skip'|'module-subset'|'module-zero-hit-skip'|'full'}
 */
export function decideVerifyTestAction({ strategy, modulesPresent, hitCount }) {
  if (strategy === 'skip') return 'skip'
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
  warnPortRaceBeforeRun(testCommand)
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
    // 资源竞争鉴别提示（坑 verify-devserver-port-race，同 runFullCommand）
    if (/EADDRINUSE|address already in use|端口.*被占用|port.*already/i.test(output)) {
      reason += '。⚠️ 输出含端口占用信号（EADDRINUSE）——极可能是与你自留 dev server 的资源竞争而非代码问题：停掉占用服务后重跑 verify 再定论'
    }
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
    failureRemaining: judged.remainingLines,
    failureExempted: judged.exemptedLines,
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

// 他者声明归属过滤（坑 verify-reconcile-foreign-wip）：实现在零环模块 foreign-declared.js
// （contract-matrix 被 verify-postcheck import，parity 侧不能反向 import 本模块），此处
// re-export 保持既有消费方路径不变
export { collectForeignDeclaredFiles, splitOwnVsForeignDiffFiles } from './foreign-declared.js'
import { splitOwnVsForeignDiffFiles } from './foreign-declared.js'

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
 * @param {object} [opts]
 * @param {boolean} [opts.includeWorkingTree=false]
 * @param {string|null} [opts.specBase] spec 根（平台模式=specRoot，透传 resolveMainChangedFiles）
 * @returns {string[]|null} 变更文件列表；git 不可用返回 null（调用方按 hitCount=-1 处理）
 */
export function resolveVerifyChangedFiles(cwd, changeName, ctx = null, opts = {}) {
  const { includeWorkingTree = false } = opts
  // 主仓 diff（原逻辑不动，单仓零回归）
  let mainFiles = resolveMainChangedFiles(cwd, changeName, opts.specBase)

  // 并入 worktree 未提交改动（坑 module-subset-zero-hit-uncommitted，2026-08-21 实证：
  // 子代理默认不 commit，真实改动全在 worktree working-tree——只看 base..HEAD commit diff
  // 时 module 映射 0 命中直接跳过（frontend/** 变更未命中 frontend 模块）。与
  // generateTaskReviewDrafts 的并入口径同源：meta.worktreePath 下 status --porcelain 文件
  // （排除 .sillyspec/ 运行时产物）。opt-in（默认关）：d drafts 有自己的并入点，避免双并。
  if (includeWorkingTree && mainFiles !== null) {
    try {
      // P1 修复（2026-09-07）：metaPath 吃 opts.specBase——此前硬编码 join(cwd,'.sillyspec')，
      // 平台模式（specRoot 与 source_root 分离）下 worktree meta 静默读不到 → 形态 A 并入失效 → ②类假红。
      // 与下方 resolveMainChangedFiles 的 specBase 兜底同口径。
      const metaPath = join(opts.specBase || join(cwd, '.sillyspec'), '.runtime', 'worktrees', changeName, 'meta.json')
      if (changeName && existsSync(metaPath)) {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
        const wtGitDir = (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath))
          ? meta.worktreePath
          : cwd
        const wtStatus = gitQuiet(wtGitDir, ['status', '--porcelain', '--untracked-files=all'], { timeout: 30000, trim: false })
        // P1 修复（2026-09-07）：过滤器改 filterDeliverableFiles 口径（worktree-apply.js 同款）——
        // 此前 `.sillyspec/` 一刀切把 docs 交付物也滤掉，声明了模块文档的 task 在形态 A 下落②类假红
        // （子代理默认不 commit，形态 A 是常态）。保留 .sillyspec/docs/**（交付物），只排运行时/进度面。
        const wtFiles = String(wtStatus || '').split('\n')
          .map(l => l.slice(3).trim().split(' -> ').pop() || '')
          .map(p => p.replace(/^"|"$/g, '').replace(/\\/g, '/'))
          .filter(p => p && p !== '.sillyspec' &&
            !p.startsWith('.sillyspec/changes/') &&
            !p.startsWith('.sillyspec/.runtime/') &&
            !p.startsWith('.sillyspec/quicklog/'))
        // 已提交口径补齐（2026-09-10 用户反馈②「先提交则 diff 空」时序两难的 diff 半边）：
        // worktree 内已 commit 的改动对主仓 base..HEAD 与 status --porcelain 双双不可见——
        // 用 merge-base(主仓 HEAD, worktree HEAD)（= worktree 创建锚点）到 worktree HEAD 的
        // commit diff 补入，未提交 ∪ 已提交两形态全覆盖。wtGitDir===cwd（in-place 退化）时
        // 已提交改动已在 mainFiles，跳过防双并。fail-open：git 失败退回 status-only 现状。
        let committedFiles = []
        if (wtGitDir !== cwd) {
          try {
            const mainHead = gitQuiet(cwd, ['rev-parse', 'HEAD'], { timeout: 15000 })
            const wtHead = gitQuiet(wtGitDir, ['rev-parse', 'HEAD'], { timeout: 15000 })
            const mb = (mainHead && wtHead)
              ? gitQuiet(wtGitDir, ['merge-base', wtHead, mainHead], { timeout: 15000 })
              : null
            if (mb) {
              const diffOut = gitQuiet(wtGitDir, ['diff', '--name-only', mb, wtHead], { timeout: 30000 })
              committedFiles = String(diffOut || '').split('\n')
                .map(p => p.replace(/^"|"$/g, '').replace(/\\/g, '/').trim())
                .filter(p => p && p !== '.sillyspec' &&
                  !p.startsWith('.sillyspec/changes/') &&
                  !p.startsWith('.sillyspec/.runtime/') &&
                  !p.startsWith('.sillyspec/quicklog/'))
            }
          } catch { /* 已提交补齐失败退回 status-only（fail-open，不拖垮未提交并入） */ }
        }
        const merged = [...new Set([...(mainFiles || []), ...wtFiles, ...committedFiles])]
        if (wtFiles.length > 0 || committedFiles.length > 0) {
          mainFiles = merged
        }
      }
    } catch { /* working-tree 并入失败退回 commit diff 口径（fail-open） */ }
  }

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
  const seen = new Set(merged) // Set 去重：merged.includes 线性扫在大 diff × 多仓合并时是 O(n²)
  let anyAvailable = mainFiles !== null
  for (const entry of crossEntries) {
    // 跨仓仓 gitDir = 跨仓仓根（MultiRepoContext._buildCrossRepoEntry 已 fail-closed 保证可达）
    const files = runGitDiffNameOnly(entry.gitDir, 'HEAD~1..HEAD')
    if (files !== null) {
      anyAvailable = true
      for (const f of files) {
        if (!seen.has(f)) {
          seen.add(f)
          merged.push(f)
        }
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
 * @param {string|null} [specBase] spec 根（平台模式=specRoot；缺省 join(cwd,'.sillyspec')，
 *   meta.json 查找与他者声明过滤同用此根——A4 同族修复）
 * @returns {string[]|null}
 */
function resolveMainChangedFiles(cwd, changeName, specBase = null) {
  const sb = specBase || join(cwd, '.sillyspec')
  if (changeName) {
    const metaPath = join(sb, '.runtime', 'worktrees', changeName, 'meta.json')
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
  const fallback = gitChangedFiles(cwd)
  // 无 meta 回退（主仓 HEAD diff 全量）撞并行会话在途 WIP 的归属过滤（坑
  // verify-reconcile-foreign-wip）：他者显式声明（quick --files / 他者 design 清单）的
  // 文件剔除归他者——不混入本变更 module 命中。无主文件保留（fail-closed）。
  if (fallback !== null && changeName && fallback.length > 0) {
    const { own, foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, fallback, { specBase: sb })
    if (foreign.length > 0) {
      console.warn(`⚠️ verify 对账已排除 ${foreign.length} 个并行会话声明的文件（不参与本变更判定）：${foreign.slice(0, 5).map(x => `${x.file}←${x.owners[0]}`).join(', ')}${foreign.length > 5 ? ' 等' : ''}`)
      return own
    }
  }
  return fallback
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

  const rawStrategy = extractTestStrategy(yamlText)
  const knownFailures = extractKnownFailures(yamlText)
  if (knownFailures.length > 0) {
    // 豁免清单加载可见性（坑 verify-known-failures-block-fragile-chain 的观测面）：条数即时报出
    // ——清单被块内残迹截断/误删段时「N 条」与预期不符一眼可见，不必等假红再反推。
    // 走 stderr（console.warn）：本模块运行期叙述统一不碰 stdout（machine-interface 调用时
    // stdout 留给机器可读输出）
    console.warn(`📋 known_failures 豁免清单已加载：${knownFailures.length} 条模式（local.yaml）`)
  }

  // —— evidence-auto 生效策略解析（D-005@v2 / task-11）——
  // 按变更目录 module-impact.md 影响面取生效策略（行为→module、纯文档/门禁→skip、
  // 缺失/不可解析→降级 module 并注记）再进既有链路；full/module/skip/缺省四路径
  // 不经此分支（消费语义逐字不变）。
  let strategy = rawStrategy
  let evidenceAuto = null
  if (rawStrategy === 'evidence-auto') {
    const changeDir = changeName ? join(specBase, 'changes', changeName) : null
    const resolution = resolveTestStrategy({ yamlText, changeDir })
    strategy = resolution.strategy
    evidenceAuto = resolution.evidence_auto_recommendation
  }
  // evidence-auto 解析为 module 后的 hint/reason 追加注记（full/module 路径为空串，输出逐字不变）
  const eaNote = rawStrategy === 'evidence-auto' ? '（生效策略来自 test_strategy: evidence-auto 推荐）' : ''

  // —— 模块子集路径（test_strategy: module）：算 modulesPresent / hitCount / hits ——
  // resolveVerifyChangedFiles 返回 null 表示 git 不可用 → hitCount=-1（与 0 命中区分）。
  // 注：module 子集策略只用主仓 diff（跨仓仓不参与 module 子集，design §6 + §5.4），
  //     故此处不传 ctx（避免跨仓路径误命中主仓 module 映射）。
  let modulesPresent = false
  let hitCount = 0
  let hits = []
  let lastChangedFiles = [] // 0 命中诊断用（diff 文件样例可见性，坑 module-path-layout-mismatch）
  if (strategy === 'module') {
    const modules = extractModules(yamlText)
    if (modules) {
      modulesPresent = true
      // includeWorkingTree（坑 module-subset-zero-hit-uncommitted）：子代理不 commit 的改动
      // 也参与 module 命中判定，0 命中跳过不再误伤 worktree 未提交的真实变更
      const changedFiles = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase })
      lastChangedFiles = Array.isArray(changedFiles) ? changedFiles : []
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
  if (action === 'skip') {
    // —— skip 真跳过（D-005@v2 / R-07）——
    // 显式 skip：兑现声明语义，不回退全量；输出显式标注留审计痕迹（R-07 行为变化提示：
    // 此前配置 skip 实际仍跑全量，本版本起真跳过）。
    // evidence-auto→skip：测试不在推荐组合内（module-impact.md 无行为类影响），
    // reason 附推荐依据与否决路径。
    const reason = rawStrategy === 'skip'
      ? '测试已按 test_strategy=skip 配置跳过（D-005@v2 兑现声明语义：不回退全量 commands.test）。⚠️ 行为变化提示（R-07）：此前配置 skip 实际仍跑全量，本版本起真跳过——本次 verify 结论不含测试客观核验；如需恢复实测，把 local.yaml 的 test_strategy 改回 full/module。'
      : `测试已按 test_strategy=evidence-auto 推荐跳过：${evidenceAuto && evidenceAuto.summary ? evidenceAuto.summary : 'module-impact.md 判定无行为类影响'}。本次 verify 结论不含测试客观核验。`
    mainResult = {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason,
      resultPath: null,
      mode: 'strategy-skip',
      fallbackReason: null,
    }
    // 审计痕迹落盘（R-07）：skip 决策与依据写入 verify-runs 时间线（test-result.json），供追溯
    writeRunResult({
      specBase,
      changeName,
      result: mainResult,
      extra: {
        strategy: rawStrategy,
        ...(evidenceAuto ? {
          evidence_auto: {
            resolved_strategy: evidenceAuto.resolved_strategy,
            degraded: evidenceAuto.degraded,
            degraded_reason: evidenceAuto.degraded_reason,
            checks: evidenceAuto.checks,
          },
        } : {}),
      },
    })
  } else if (action === 'module-subset') {
    mainResult = runModuleSubset({ cwd, specBase, changeName, hits, knownFailures })
  } else if (action === 'module-zero-hit-skip') {
    // module 模式 0 命中：不静默回退注定超时/含预存失败的全量（坑 verify-worktree-... 修复方向 3）。
    // 据 verify-result.md 自报告判定；想跑全量请显式设 test_strategy: full。
    // 诊断可见性（坑 module-path-layout-mismatch，2026-08-22 实证：0 命中「靠第一次跑过的
    // 记录兜底」——为何没命中完全黑箱）：落 modules 配置 path vs diff 文件样例，配置前缀
    // 对不上（如 packages/frontend vs frontend/）一眼可见
    const modules_ = extractModules(yamlText) || {}
    const diagLines = [
      `已配置 modules（${Object.keys(modules_).length} 个）: ${Object.entries(modules_).map(([k, m]) => `${k}→${m.path}`).join('、') || '（无）'}`,
      `本次 diff（${lastChangedFiles.length} 个文件，前 5）: ${lastChangedFiles.slice(0, 5).join(', ') || '（空）'}`,
    ]
    console.warn(`⚠️ 模块 0 命中诊断（对照 path 前缀与 diff 布局是否一致，如 packages/<name> vs <name>/）：`)
    for (const l of diagLines) console.warn(`   ${l}`)
    mainResult = {
      status: 'skipped',
      command: null,
      exitCode: null,
      durationMs: null,
      outputTail: null,
      reason: 'test_strategy: module 但本次变更未命中任何已配置 modules（0 命中）。为避免回退到注定超时/含预存失败的全量 commands.test，CLI 未自动跑全量——据 verify-result.md 自报告判定测试。若需全量覆盖，显式设 test_strategy: full。' +
        ` 诊断：${diagLines.join('；')}` + eaNote,
      resultPath: null,
      mode: 'module-zero-hit',
      fallbackReason: null,
    }
  } else {
    // —— 全量路径（full / module 无块 / module git 不可用）——
    // fallbackReason 非 null 表示本次全量是"非显式"的（缺省/配置不全/未命中），需明示。
    // evidence-auto 解析为 module 后落全量兜底时追加推荐来源注记（eaNote；其余路径空串零变化）。
    let fallbackReason = computeFullFallbackReason({ strategy, modulesPresent, hitCount })
    if (fallbackReason && eaNote) fallbackReason = fallbackReason + eaNote
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
    failureRemaining: judged.remainingLines,
    failureExempted: judged.exemptedLines,
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
    // 判账行集跨仓合并（坑 verify-test-reconcile-tail-blindspot）：mergedTail 截断不影响台账
    failureRemaining: [...(mainResult.failureRemaining || []), ...crossResults.flatMap(r => r.result.failureRemaining || [])],
    failureExempted: [...(mainResult.failureExempted || []), ...crossResults.flatMap(r => r.result.failureExempted || [])],
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
/**
 * 从测试命令文本提取疑似服务端口（坑 verify-devserver-port-race，2026-08-22 实证：CLI 全量
 * 对账与用户自留 dev server 资源竞争——端口被占导致测试失败，差点误报 FAIL 成代码问题）。
 * 认 --port=N / --port N / PORT=N。
 * @param {string} cmd
 * @returns {number[]}
 */
function extractPortsFromCommand(cmd) {
  const s = String(cmd || '')
  const ports = new Set()
  for (const m of s.matchAll(/--port[=\s]+(\d{2,5})/gi)) ports.add(Number(m[1]))
  for (const m of s.matchAll(/\bPORT=(\d{2,5})/gi)) ports.add(Number(m[1]))
  return [...ports]
}

/**
 * 端口占用探测（同步 spawnSync node 试连——verify 实测是同步 execSync 流，无法 await）。
 * @param {number} port
 * @returns {boolean} true=已被占用（疑似自留 dev server/长驻服务在跑）
 */
function isPortOccupiedSync(port) {
  try {
    const r = spawnSync(process.execPath, ['-e',
      `const n=require('node:net');const s=n.connect(${port},'127.0.0.1',()=>{console.log('Y');s.end()});s.on('error',()=>console.log('N'));setTimeout(()=>{console.log('N');process.exit(0)},1500)`],
      { encoding: 'utf8', timeout: 4000 })
    return (r.stdout || '').trim().endsWith('Y')
  } catch { return false }
}

/**
 * 实测前资源竞争预警（坑 verify-devserver-port-race）：测试命令涉及的端口已被占用 →
 * 显著 warn「疑似自留 dev server」+ 建议停服务重跑——防把资源竞争误判成代码问题报 FAIL。
 * best-effort：探测失败静默。
 */
function warnPortRaceBeforeRun(command) {
  try {
    const ports = extractPortsFromCommand(command)
    for (const p of ports) {
      if (isPortOccupiedSync(p)) {
        console.warn(`⚠️ 端口 ${p} 已被占用（测试命令 ${command.slice(0, 50)}… 引用）——疑似你自留的 dev server/长驻服务。`)
        console.warn(`   测试若因此失败（端口冲突/EADDRINUSE），是资源竞争而非代码问题——停掉占用服务（或换端口）后重跑 verify 再定论，勿直接报 FAIL。`)
      }
    }
  } catch { /* 探测失败不阻断实测 */ }
}

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
  warnPortRaceBeforeRun(command)
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
    // 资源竞争鉴别提示（坑 verify-devserver-port-race）：EADDRINUSE/端口占用类失败极可能是
    // 自留 dev server 竞争而非代码问题——输出里明示鉴别路径，防误报 FAIL
    if (/EADDRINUSE|address already in use|端口.*被占用|port.*already/i.test(output)) {
      reason += '。⚠️ 输出含端口占用信号（EADDRINUSE）——极可能是与你自留 dev server 的资源竞争而非代码问题：停掉占用服务后重跑 verify 再定论'
    }
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
    failureRemaining: judged.remainingLines,
    failureExempted: judged.exemptedLines,
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
      // 失败模块的 reason 明细透传（坑 verify-devserver-port-race：EADDRINUSE 资源竞争鉴别
      // 提示在 runOneModule 的 reason 里，不透传会被顶层 reason 吞掉）
      + (perModule.filter(r => r.status === 'failed' && r.reason).some(r => /EADDRINUSE|资源竞争/.test(r.reason))
        ? '。' + perModule.filter(r => r.status === 'failed' && r.reason && /EADDRINUSE|资源竞争/.test(r.reason)).map(r => r.reason).join('；')
        : '')

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
    // 判账行集聚合（坑 verify-test-reconcile-tail-blindspot）：合并 tail 会二次截断，行集不截——
    // 每模块台账另见 extra.modules[].failure_remaining（带模块归属）
    failureRemaining: perModule.flatMap(r => r.failureRemaining || []),
    failureExempted: perModule.flatMap(r => r.failureExempted || []),
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
        ...(r.failureRemaining && r.failureRemaining.length ? { failure_remaining: capFailureLedger(r.failureRemaining) } : {}),
        ...(r.failureExempted && r.failureExempted.length ? { failure_exempted: capFailureLedger(r.failureExempted) } : {}),
      })),
    },
  })
  return result
}

/**
 * 结果落盘到 .runtime/verify-runs/<ts>/test-result.json（供追溯与 SillyHub 消费）。
 * 多模块时 extra.modules 描述各模块明细。export 供 test 验证台账落盘形状。
 */
export function writeRunResult({ specBase, changeName, result, extra = {} }) {
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
      // 判账失败行台账（坑 verify-test-reconcile-tail-blindspot）：按完整输出判账的行集全量
      // 落盘（受 capFailureLedger 防病态体量截断）——失败行落在 output_tail 盲区时归因读这里，
      // 不再需要全量复跑。空集不落键（成功/跳过运行不添噪声）。
      ...(result.failureRemaining && result.failureRemaining.length ? { failure_remaining: capFailureLedger(result.failureRemaining) } : {}),
      ...(result.failureExempted && result.failureExempted.length ? { failure_exempted: capFailureLedger(result.failureExempted) } : {}),
      reason: result.reason,
      ran_at: new Date().toISOString(),
      ...extra,
    }, null, 2) + '\n')
    result.resultPath = resultPath
    // verify-runs 回收不在此处（ql-20260908-005 已定分野）：变更归属类证据走归档时精确
    // 回收（pruneArchivedChangeRuntime 按目录内 JSON change 字段归属）；写入侧滚动是
    // 启发式，不进证据类目录。
  } catch (e) {
    console.warn(`⚠️  verify 实测结果落盘失败: ${e.message}`)
  }
}

/** 打印实测结果（人类/agent 可读） */
export function printVerifyTestCheck(result) {
  if (result.status === 'skipped') {
    console.warn(`\n⚠️  Verify 实测跳过：${result.reason}`)
    if (result.mode === 'strategy-skip') {
      // R-07：skip 由 test_strategy 显式生效（skip 配置 / evidence-auto 推荐），非「未配命令」——
      // 不给「去配 commands.test」的误导建议，改标审计口径
      console.warn('   （跳过由 test_strategy 配置生效，本次 verify 结论不含测试客观核验；跳过依据见上方 reason 并已落盘 test-result.json 留审计痕迹。）')
    } else {
      console.warn('   建议在 local.yaml 的 commands.test 配置真实测试命令，让 CLI 可客观对账。')
    }
    return
  }
  if (result.status === 'passed') {
    if (result.exemptedCount > 0) {
      console.log(`\n✅ Verify 实测通过（含 ${result.exemptedCount} 个 known_failures 豁免）：\`${result.command}\` — ${result.reason}`)
      console.warn('   ⚠️  本次 PASS 依赖 known_failures 豁免清单——请人工复核清单是否过宽（避免误豁免本变更引入的真实失败）。')
      // 豁免披露明细（坑 verify-test-reconcile-tail-blindspot）：被豁免的失败行同样可能落在
      // tail 盲区——复核"清单是否过宽"不能只看 tail。前 10 条样例进控制台，全量台账在
      // test-result.json 的 failure_exempted。
      if (result.failureExempted && result.failureExempted.length) {
        console.warn(`   已豁免失败行（共 ${result.failureExempted.length} 行，前 10 条；全量见 test-result.json 的 failure_exempted）：`)
        for (const line of capFailureLedger(result.failureExempted).slice(0, 10)) console.warn(`   ~ ${line}`)
      }
    } else {
      console.log(`\n✅ Verify 实测通过：\`${result.command}\` 退出码 0（${(result.durationMs / 1000).toFixed(1)}s）`)
    }
  } else {
    console.error(`\n❌ Verify 实测失败：\`${result.command}\` — ${result.reason}`)
    // 未豁免失败行台账（坑 verify-test-reconcile-tail-blindspot）：判账按完整输出、下方 tail
    // 只留末段——失败行落在盲区时 tail 里看不到，归因靠本段全量行集（≤30 条样例进控制台，
    // 全量落盘 failure_remaining），不再需要全量复跑定位。
    if (result.failureRemaining && result.failureRemaining.length) {
      const ledger = capFailureLedger(result.failureRemaining)
      const shown = ledger.slice(0, 30)
      console.error(`   未豁免失败行（按完整输出判账，不受 tail 截断影响；共 ${result.failureRemaining.length} 行）：`)
      for (const line of shown) console.error(`   ! ${line}`)
      if (ledger.length > shown.length) {
        console.error(`   ! …（其余 ${ledger.length - shown.length} 行全量见 test-result.json 的 failure_remaining）`)
      }
    }
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
  // 全仓口径告警（坑 probe5-single-task-artifact-scope，2026-08-28 实证：diff/apply 清单都不可得
  // 时回退全仓，全仓调用 × 本变更局部端点 = 大量假 missing，agent 照单记 FAIL 误导归档判定）
  if (/\[scope: full-repo\]/.test(result.summary || '')) {
    console.warn('   ⚠️  本次 scope 为 full-repo（diff 与 apply-pathspec 均不可得时的兜底）——missing 大概率是口径错配噪音而非真实 contract gap。')
    console.warn('      先收窄复跑：sillyspec verify-probes --change <变更名>（change-diff/apply-pathspec 口径）再判定。')
  }
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
  let deliverable = filterDeliverableFiles(deletions.map(d => d.path))
    .map(p => deletions.find(d => d.path === p))

  // 他者声明归属过滤（坑 verify-reconcile-foreign-wip）：主仓 HEAD diff 撞并行会话在途
  // WIP 时，他者显式声明（quick --files / 他者 design 清单）的删除不参与本变更删除对账
  // （否则「他者删的文件 × 本变更 design 三态」产出未声明删除误报）。无主删除保留（fail-closed）。
  if (changeName && deliverable.length > 0) {
    const { own, foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, deliverable.map(d => d.path), { specBase })
    if (foreign.length > 0) {
      console.warn(`⚠️ 删除对账已排除 ${foreign.length} 个并行会话声明的删除（${foreign.slice(0, 5).map(x => `${x.file}←${x.owners[0]}`).join(', ')}${foreign.length > 5 ? ' 等' : ''}）`)
      const keep = new Set(own)
      deliverable = deliverable.filter(d => keep.has(d.path))
    }
  }

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
 * verify-result.md 内容回退检测（2026-09-10 用户反馈③：报告在 verify 中途被平台同步覆盖
 * 回旧版一次，只能靠人眼发现后重写）。覆盖者在本仓之外（daemon/平台侧按服务端版本回写），
 * CLI 侧能做的是**检测可见**：每次 CLI 读到该文件时记高水位指纹（content hash + mtime），
 * 下次读到「内容变了且 mtime 回退」= 旧版复活的确定性指纹（服务端回写会顺带恢复服务端
 * mtime，时间倒流唯此一路）→ ⚠️ 告警。纯 advisory 不阻断；高水位只前进不后退（回退态
 * 不覆盖指纹，agent 重写后新指纹正常接管）。fail-open：任何异常视为无回退。
 * @param {string} specBase spec 根（hwm 文件落 .runtime/）
 * @param {string} changeName 变更名
 * @param {string} absPath verify-result.md 绝对路径
 * @returns {{ regressed: boolean, prevMtime: number|null }}
 */
export function trackVerifyResultRegression(specBase, changeName, absPath) {
  try {
    if (!absPath || !existsSync(absPath)) return { regressed: false, prevMtime: null }
    const st = statSync(absPath)
    const hash = createHash('sha256').update(readFileSync(absPath)).digest('hex')
    const hwmPath = join(specBase, '.runtime', `verify-result-hwm-${changeName}.json`)
    let prev = null
    try { prev = JSON.parse(readFileSync(hwmPath, 'utf8')) } catch { prev = null }
    const regressed = !!(prev && typeof prev.hash === 'string' &&
      prev.hash !== hash && typeof prev.mtimeMs === 'number' &&
      st.mtimeMs < prev.mtimeMs - 1000)
    // 高水位只前进：当前 mtime 更新（正常编辑/重写）才覆盖指纹；回退态保留旧指纹供重写后再比对
    if (!prev || st.mtimeMs >= (prev.mtimeMs || 0)) {
      try {
        mkdirSync(join(specBase, '.runtime'), { recursive: true })
        writeFileSync(hwmPath, JSON.stringify({ hash, mtimeMs: st.mtimeMs, ts: Date.now() }) + '\n')
      } catch { /* hwm 落盘失败 → 下次当首次（fail-open） */ }
    }
    return { regressed, prevMtime: prev && prev.mtimeMs ? prev.mtimeMs : null }
  } catch { return { regressed: false, prevMtime: null } }
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
export function runVerifyRequiredEvidenceCheck({ cwd, specBase, changeName = null, verifyStartAt = null }) {
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

  // ── v2 槽优先（2026-09-08-ir-verify-facts FR-02）：「## 证据账」槽段在场走分类核验；
  // 无槽（存量）降级 legacy 子串提及对账——行为等同旧版（D-001@v2，warning 不阻断）。──
  const slots = parseEvidenceSlots(report)
  if (slots.hasEvidenceSlot) {
    return runRequiredEvidenceCheckV2({ items, slots, cwd, specBase, changeName, verifyStartAt })
  }

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
    return { status: 'warning', items, unacknowledged, legacy: true,
      summary: `${items.length} 个 cannot_verify evidence 任务中 ${unacknowledged.length} 个未在 verify-result.md 体现`, reason: null }
  }
  return { status: 'passed', items, unacknowledged: [], legacy: true,
    summary: `${items.length} 个 cannot_verify evidence 任务均在 verify-result.md 体现（满足度由 agent 自报告）`, reason: null }
}

/**
 * v2 分类核验（design Phase 2，FR-02）：证据账槽行状态 + verifiedFiles 逐文件核验。
 * code 类（classifyVerifiedFile）：存在 × mtime ≥ verifyStartAt × git diff 交集三核验；
 * artifact 类（.runtime/日志/文档）：存在 × mtime（diff 交集豁免——resolveVerifyChangedFiles
 * 天然不覆盖该类路径，硬要求交集必假红）。verifyStartAt 缺省走 R-05 fallback（design.md
 * created_at 之后宽容 + warning）。status 语义扩 'blocked'（missing 无豁免 / satisfied 核验
 * 不过）——gates 接线（task-03）据此阻断 verify 完成。
 */
function runRequiredEvidenceCheckV2({ items, slots, cwd, specBase, changeName, verifyStartAt }) {
  const warnings = []
  let startAt = verifyStartAt ? new Date(verifyStartAt).getTime() : null
  if (!startAt) {
    // R-05 fallback：DB 不可得/接线间隙（W2→W3）——design.md created_at 之后即宽容
    try {
      const designPath = join(specBase, 'changes', changeName, 'design.md')
      if (existsSync(designPath)) {
        const fm = readFileSync(designPath, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
        const cm = fm && fm[1].match(/^created_at:\s*(.+)$/m)
        if (cm) {
          const t = new Date(cm[1].trim()).getTime()
          if (!Number.isNaN(t)) { startAt = t; warnings.push('verifyStartAt 未提供，走 design.md created_at 宽容基准（R-05 fallback）') }
        }
      }
    } catch { /* fallback 的 fallback：不设基准（只核存在性） */ }
    if (!startAt) warnings.push('verifyStartAt 与 design created_at 均不可得——mtime 核验降级为仅存在性')
  }

  // git diff 集合（code 类交集核验用；fail-soft 拿不到 → diffHit 记 null 不判红）
  let changedSet = null
  try {
    const changed = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase })
    changedSet = new Set((changed || []).map(p => String(p).replace(/\\/g, '/')))
  } catch { changedSet = null }

  const detailed = []
  let blockedCount = 0
  for (const item of items) {
    const task = item && item.task
    if (!task) continue
    const slot = slots.requiredEvidence.find(e => e.task === task) || null
    if (!slot) {
      detailed.push({ task, verdict: item.verdict || 'cannot_verify', status: 'missing', exempt: false,
        verification: null, reason: `cannot_verify 任务 ${task} 未在证据账槽段登记（逐 task 一行：状态三选一 + verifiedFiles）` })
      blockedCount++
      continue
    }
    const perFile = []
    let allOk = true
    if (slot.status === 'satisfied' || slot.status === 'partial') {
      if (slot.verifiedFiles.length === 0) {
        allOk = false
        perFile.push({ path: null, pathClass: null, filesExist: false, mtimeOk: null, diffHit: null,
          reason: `${slot.status} 但 verifiedFiles 为空（精确路径必填）` })
      }
      for (const vf of slot.verifiedFiles) {
        const pathClass = classifyVerifiedFile(vf)
        const abs = join(cwd, vf)
        const filesExist = existsSync(abs)
        let mtimeOk = null
        if (filesExist && startAt) {
          try { mtimeOk = statSync(abs).mtimeMs >= startAt - 60_000 } catch { mtimeOk = null }
        }
        let diffHit = null
        if (pathClass === 'code') {
          diffHit = changedSet === null ? null : changedSet.has(vf)
        } else {
          diffHit = true // artifact 类豁免 diff（design Phase 2：日志/文档天然不在 diff）
        }
        const ok = filesExist && mtimeOk !== false && diffHit !== false
        if (!ok) allOk = false
        perFile.push({ path: vf, pathClass, filesExist, mtimeOk, diffHit,
          reason: !filesExist ? '文件不存在'
            : (mtimeOk === false ? `mtime 早于 verifyStartAt（${new Date(startAt).toISOString()}）`
            : (diffHit === false ? '不在本变更 git diff 内' : null)) })
      }
    }
    const failed = (slot.status === 'satisfied' && !allOk) || (slot.status === 'missing' && !slot.exempt)
    if (failed) blockedCount++
    detailed.push({
      task, verdict: item.verdict || 'cannot_verify', status: slot.status, exempt: slot.exempt,
      verification: perFile.length > 0 ? perFile : null,
      reason: failed
        ? (slot.status === 'missing' ? 'missing 且无（豁免：<理由>）后缀——cannot_verify 未闭环'
          : (slot.status === 'satisfied' ? 'satisfied 核验不过（见 verification 明细）' : 'partial 但 verifiedFiles 全部核验不过'))
        : (slot.exempt ? `missing 已豁免：${slot.exemptionReason}`
          : (slot.status === 'partial' ? 'partial（部分核验通过，理由见槽行括注）' : '核验通过')),
    })
  }

  if (blockedCount > 0) {
    return { status: 'blocked', items, detailed, warnings,
      unacknowledged: detailed.filter(d => d.status === 'missing' && !d.exempt && !d.verification).map(d => ({ task: d.task, reason: d.reason })),
      summary: `${items.length} 个 cannot_verify 任务中 ${blockedCount} 个未闭环（missing 无豁免或核验不过）`, reason: null }
  }
  return { status: 'passed', items, detailed, unacknowledged: [], warnings,
    summary: `${items.length} 个 cannot_verify 任务证据账全部闭环（状态 + 分类核验通过）`, reason: null }
}

/** 打印 required-evidence 对账结果（v2：blocked 由 gates 阻断；legacy warning 不阻断） */
export function printVerifyRequiredEvidenceCheck(result) {
  if (result.status === 'skipped') return  // 静默：无 evidence 文件 / 无 changeName / 解析失败
  if (result.status === 'blocked') return  // 阻断明细由 gates 接线侧统一输出（本函数不重复打印）
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

// ── plan target_files 声明 ↔ 实际改动 机器对账（task-04 / design 总体方案 Wave 2）──
//
// 背景：execute 的 scope creep 此前只有 symbol-impact 试图抓，「计划落空」（声明没做）更是
// 全盲区——review.json changedFiles 是 agent 手写不能当事实源。本节让 CLI 用 git 三源口径
// 亲自取 actual，与 plan 阶段的 target_files 意图声明做三类差集（①交集✓ ②声明没做=ERROR
// ③做了没声明=WARNING）。纯函数导出，gates.js verify 块接线是 task-05 的 scope（本文件不
// 聚合调用，与 runVerifyTestCheck 同构：导出消费、阻断语义归接线方）。

/**
 * 对账路径归一：剥 ./ 前缀、反斜杠归一正斜杠。actual 三源（diff / status / pathspec 文件）
 * 与声明侧（parseTargetFiles 已归一）统一走此口径后做集合比较——任一侧漏归一都会令同一路径
 * 字面失配，②③两类差集全成噪音。
 */
function normalizeReconcilePath(p) {
  return String(p || '').trim().replace(/^\.\//, '').replace(/\\/g, '/')
}

/**
 * review.json changedFiles 条目归一（尽力归因专用）：task-review.js changedFiles 交叉比对
 * 的同款结构化剥法（坑 changedfiles-annotation-suffix-mismatch，2026-08-22 实证：agent 手写
 * changedFiles 带「src/a.js（新增）」注记后缀 / // 行内注释，裸 exact match 恒失配）——只剥
 * 路径尾部的注记形态，注记本身不参与匹配。
 */
function normalizeReviewChangedFile(p) {
  return String(p || '')
    .replace(/^\.\//, '')
    .replace(/[（(][^（()）]*[)）]\s*$/, '')   // 尾部（注记）/(note)——中段括号（路径段）不动
    .replace(/\s+(\/\/|#).*$/, '')              // 空格后的 // 或 # 注释
    .trim()
    .replace(/\\/g, '/')
}

/**
 * 声明侧收集：读 change 下全部 task 卡（tasks/task-NN.md）的 target_files 并集。
 *
 * - 跨仓卡（frontmatter 有 repo: 键）剔除：其 target_files 相对声明仓根，主仓 actual 永远
 *   对不上账，不剔除会全落②类假红（D-004；与 plan 侧 validateTargetFiles 同口径剔除+提示）。
 * - 无声明卡（missing=true，存量卡）计不进 declarations——全部卡无声明由调用方判 skipped，
 *   不在收集器内造第三种状态（与 parseTargetFiles 的缺失口径对齐）。
 * - task 标识：frontmatter id 优先（与 review.json task 字段对齐），缺省文件名 stem——
 *   ②类差集逐条报 task-NN + path，标识错位会让用户找不到对应的卡。
 *
 * @returns {{ cardCount: number, declarations: Array<{task:string, path:string, isNew:boolean, raw:string, invalid:string|null}>, crossRepoCards: string[], noDeclarationCount: number }}
 */
function collectDeclaredTargetFiles(specBase, changeName) {
  const out = { cardCount: 0, declarations: [], crossRepoCards: [], noDeclarationCount: 0 }
  const tasksDir = join(specBase, 'changes', changeName, 'tasks')
  if (!existsSync(tasksDir)) return out
  // task-NN.md 过滤 + 排序：与 plan-postcheck / task-review 的枚举口径一致，输出确定性
  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f)).sort()
  out.cardCount = taskFiles.length
  for (const file of taskFiles) {
    let content = ''
    try { content = readFileSync(join(tasksDir, file), 'utf8') } catch { continue /* 单卡读失败不炸整体对账 */ }
    const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || ''
    const task = (fm.match(/^id:\s*(.+)/m)?.[1] || '').trim() || file.replace(/\.md$/, '')
    const repo = parseRepo(content)
    if (repo) { out.crossRepoCards.push(`${task}（repo: ${repo}）`); continue }
    const { entries, missing } = parseTargetFiles(content)
    if (missing) { out.noDeclarationCount++; continue }
    for (const e of entries) {
      // invalid（glob/目录前缀等非法形态）条目照常进声明集：plan 侧 gate 已在 plan 时点报过
      // ERROR，verify 时点它对不上账属事实——落②类是真问题（改声明或补工作），静默剔除反而
      // 给「写个 glob 蒙混过对账」留后门
      out.declarations.push({ task, path: e.path, isNew: e.isNew, raw: e.raw, invalid: e.invalid })
    }
  }
  return out
}

/**
 * 解析 `git status --porcelain` 输出为文件路径列表（形态 B 的 untracked 捕获源）。
 * 与本文件 resolveVerifyChangedFiles:926-929 的 worktree status 解析同款：slice(3) 剥 XY 状态
 * 列、rename 取 -> 后新路径、剥包裹引号、反斜杠归一。
 */
function parsePorcelainFilePaths(raw) {
  return String(raw || '').split('\n')
    .map(l => l.slice(3).trim())
    .map(p => (p.includes(' -> ') ? p.slice(p.lastIndexOf(' -> ') + 4) : p).trim())
    .map(p => p.replace(/^"|"$/g, ''))
    .map(p => p.replace(/\\/g, '/'))
    .filter(Boolean)
}

/**
 * actual 侧解析：三源并集，覆盖 worktree 生命周期两形态（R-03：口径封装单一函数，形态判定
 * 不外泄）。返回带 sources 明细（诊断可见性：③类误报时先看用了哪个源）。
 *
 * 形态判定：meta.json 是 worktree 活性的唯一权威（与 resolveVerifyChangedFiles /
 * checkExecuteCodeEvidence / task-review 同源）——
 *   - 形态 A（meta 存在，worktree 存活）：复用 resolveVerifyChangedFiles(cwd, changeName,
 *     null, { includeWorkingTree: true })。ctx 显式传 null（D-004）：跨仓 diff 不并入——
 *     跨仓卡已从声明侧剔除，actual 若并入跨仓文件会全落③类噪音（对齐 runVerifyTestCheck
 *     :1067-1068 不传 ctx 的先例）。includeWorkingTree 定死 true（R-04）：子代理默认不
 *     commit，真实改动与 NEW 文件全在 worktree working-tree，漏并入 → ②类假红。
 *   - 形态 B（meta 已删，post-apply——apply 成功即 cleanup 删 meta）：resolveVerifyChangedFiles
 *     的 meta 锚点分支失效，自取三源——
 *       B1 主仓 git diff --name-only <mergeBase>：mergeBase 锚 sillyspec/<change> 分支
 *          merge-base（run/prompt.js:753-783 先例：主仓 HEAD 随并行 session 推进，拿 HEAD 当
 *          基点会把别人的演进误判为本变更改动）。分支不存在（cleanup 删分支 / in-place 无
 *          分支）→ 显式省略该源，B2∪B3 已覆盖标准流。git diff <commit> 对比 commit..工作树，
 *          含 apply 后未 commit 的 tracked 改动。
 *       B2 主仓 git status --porcelain --untracked-files=all：git apply --3way 不暂存新文件
 *          （worktree-apply.js:1105），NEW 文件 untracked 只有此源可见（R-05，两形态无假
 *          missing 的关键）。捕入的并行会话 WIP 先经 splitOwnVsForeignDiffFiles 剔除（坑
 *          verify-reconcile-foreign-wip，调用先例本文件 resolveMainChangedFiles:1004）——
 *          他者显式声明的文件不是本变更的 actual；无主文件保留（fail-closed）。
 *       B3 兜底读 .sillyspec/.runtime/apply-pathspec-<change>.txt（worktree-apply.js:1145
 *          apply 成功时落盘的本变更精确清单，每行一个路径）：主仓已 commit（B1/B2 双空）时
 *          唯一的本变更文件来源（contract-matrix.js:440 同款兜底先例）。
 *
 * 降级（fail-soft 不误红）：git 全部不可用（形态 A diff 链整体 null / 形态 B 锚定 diff 未得
 * 且 status 失败）→ ok=false——actual 覆盖面不完整时算②类必产假红，宁可整体 WARNING 跳过。
 * B3 pathspec 不参与「不降级」判定：它是 apply 时点的快照，不含 apply 后的任何漂移，救不了
 * 覆盖面。
 *
 * 统一收尾：filterDeliverableFiles 过滤基建产物（.sillyspec/changes|.runtime|quicklog、
 * meta.json——流程产物不算 scope creep）+ 去重排序（输出确定性）。
 *
 * baseAnchor：与 files 同源的 diff 基点锚（scope-audit 行数采集复用，本模块自身不消费）——
 * 形态 A 读同一份 worktree meta.json（优先级 baselineCommit>actualBaseHash>baseHash，与
 * resolveMainChangedFiles 同口径，三锚全缺 null）；形态 B 取 merge-base hash（分支不存在/
 * merge-base 不可得 null）；降级返回恒 null。
 *
 * @returns={{ ok: boolean, form: 'worktree'|'post-apply', files: string[], sources: string[], foreignExcluded: number, degradedReason: string|null, baseAnchor: string|null }}
 */
export function resolveReconcileActualFiles({ cwd, specBase, runtimeRoot, changeName }) {
  const metaPath = join(specBase, '.runtime', 'worktrees', changeName, 'meta.json')
  const form = existsSync(metaPath) ? 'worktree' : 'post-apply'
  const sources = []
  const union = new Set()
  let foreignExcluded = 0
  let baseAnchor = null

  if (form === 'worktree') {
    // —— 形态 A：worktree 存活，整链复用（锚点优先级 baselineCommit>actualBaseHash>baseHash、
    // working-tree 并入、fail-open 均为该函数既有语义，不另造口径）——
    const files = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase })
    if (files === null) {
      return { ok: false, form, files: [], sources, foreignExcluded,
        degradedReason: 'worktree 锚点 diff 与主仓 fallback 均失败（git 不可用 / 非仓库）', baseAnchor: null }
    }
    // baseAnchor：读同一份 worktree meta.json 锚点（baselineCommit>actualBaseHash>baseHash，
    // resolveMainChangedFiles 同口径；解析失败/三锚全缺 → null）
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
      baseAnchor = meta?.baselineCommit || meta?.actualBaseHash || meta?.baseHash || null
    } catch {}
    sources.push('worktree:diff-base..HEAD', 'worktree:status-porcelain(uncommitted)')
    for (const f of files) union.add(normalizeReconcilePath(f))
  } else {
    // —— 形态 B：post-apply 自取三源 ——
    let diffOk = false
    let statusOk = false
    // B1 merge-base 锚定 diff（分支/merge-base 不可得时静默省略该源，不算 git 失败）
    const branch = 'sillyspec/' + changeName
    const branchHash = gitQuiet(cwd, ['rev-parse', '--verify', '--quiet', branch + '^{commit}'], { timeout: 30 * 1000 })
    if (typeof branchHash === 'string' && branchHash.trim()) {
      // 形态 B 定义下 meta 已删，baseBranch 无从读 → 缺省 'main'（run/prompt.js:764 同缺省）；
      // 主分支叫 master 等仓库 merge-base 失败 → 与分支不存在同处置（省略该源）
      const mergeBase = gitQuiet(cwd, ['merge-base', 'main', branch], { timeout: 30 * 1000 })
      if (typeof mergeBase === 'string' && mergeBase.trim()) {
        baseAnchor = mergeBase.trim()
        const files = runGitDiffNameOnly(cwd, mergeBase.trim())
        if (files !== null) {
          diffOk = true
          sources.push('main:diff-merge-base')
          for (const f of files) union.add(normalizeReconcilePath(f))
        }
      }
    }
    // B2 status porcelain（untracked 全量，含 --untracked-files=all 防整目录折叠漏文件）
    const statusRaw = gitQuiet(cwd, ['status', '--porcelain', '--untracked-files=all'], { timeout: 30 * 1000, trim: false })
    if (statusRaw !== null) {
      statusOk = true
      sources.push('main:status-porcelain(untracked-all)')
      let files = parsePorcelainFilePaths(statusRaw)
      if (files.length > 0) {
        const { own, foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, files, { specBase })
        if (foreign.length > 0) foreignExcluded = foreign.length
        files = own
      }
      for (const f of files) union.add(normalizeReconcilePath(f))
    }
    // B3 apply-pathspec 兜底（存在则并入，读取失败静默忽略——前两源不受影响）
    const pathspecFile = join(runtimeRoot, `apply-pathspec-${changeName}.txt`)
    if (existsSync(pathspecFile)) {
      try {
        const lines = readFileSync(pathspecFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).map(normalizeReconcilePath)
        if (lines.length > 0) {
          sources.push('apply-pathspec')
          for (const f of lines) union.add(f)
        }
      } catch { /* 兜底源失败 → 忽略 */ }
    }
    if (!diffOk && !statusOk) {
      return { ok: false, form, files: [], sources, foreignExcluded,
        degradedReason: 'merge-base 锚定 diff 未得且主仓 status 失败（git 不可用 / 非仓库 / 无锚点分支）', baseAnchor: null }
    }
  }

  const files = [...new Set(filterDeliverableFiles([...union]).filter(Boolean))].sort()
  return { ok: true, form, files, sources, foreignExcluded, degradedReason: null, baseAnchor }
}

/**
 * ③类尽力归因（仅报告不门禁，D-002 方案 B 否决后的附注保留）：扫 execute-runs 下 review.json
 * 的 changedFiles，命中该文件的 task 即疑似作者。
 *
 * - 归属过滤：run 目录带 change 戳且不等值 → 他变更的 run 跳过（task-NN 跨变更同名，混扫必
 *   错归因；无戳旧 run 保留——向后兼容，task-review.js resolveLatestExecuteRunIdWithTasks 同款）。
 * - runId 形如 exec-YYYY-MM-DD-HHMMSS：字典序倒序 = 新 run 优先（review 以最新执行为准）。
 * - changedFiles 是 agent 手写（注记/相对路径常态），归一后 exact match、首个命中即止——
 *   归因只是③类报告的附注，错比漏代价低，不追求穷举。
 *
 * @param {string} runtimeRoot .sillyspec/.runtime
 * @param {string} changeName
 * @param {string[]} paths 待归因的③类路径（git 口径的干净路径）
 * @returns {Map<string, string>} normalized(path) → taskId
 */
function attributeSuspectTasks(runtimeRoot, changeName, paths) {
  const map = new Map()
  if (!runtimeRoot || paths.length === 0) return map
  const wantSet = new Set(paths.map(p => normalizeReviewChangedFile(p)))
  const runsDir = join(runtimeRoot, 'execute-runs')
  let runDirs
  try {
    runDirs = readdirSync(runsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort().reverse()
  } catch { return map /* 无 execute-runs（未走 execute 评审）→ 无从归因，空 Map */ }
  for (const run of runDirs) {
    try {
      const stamp = readFileSync(join(runsDir, run, 'change'), 'utf8').trim()
      if (stamp && stamp !== changeName) continue
    } catch { /* 无戳旧 run：保留扫描（向后兼容） */ }
    let taskDirs
    try {
      taskDirs = readdirSync(join(runsDir, run, 'tasks'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()
    } catch { continue /* 该 run 无 tasks/ */ }
    for (const t of taskDirs) {
      let review
      try { review = JSON.parse(readFileSync(join(runsDir, run, 'tasks', t, 'review.json'), 'utf8')) } catch { continue }
      if (!review || typeof review !== 'object') continue
      const taskId = (typeof review.task === 'string' && review.task.trim()) || t
      for (const cf of Array.isArray(review.changedFiles) ? review.changedFiles : []) {
        const n = normalizeReviewChangedFile(cf)
        if (n && wantSet.has(n) && !map.has(n)) map.set(n, taskId)
      }
    }
  }
  return map
}

/**
 * plan target_files 声明 ↔ 实际改动 机器对账（task-04；接线 gates.js verify 块是 task-05 的
 * scope——②类 status='missing_declared' 为 ERROR 阻断语义、③类 'undeclared' 为 WARNING、
 * 'skipped'/'degraded' 为 WARNING 不误红，均由接线方兑现，本函数只产差集事实）。
 *
 * 纯函数风格（与 runVerifyTestCheck 同构导出）：只读 git/fs，不落盘、不改既有导出语义。
 * actual 三源口径见 resolveReconcileActualFiles；声明侧见 collectDeclaredTargetFiles。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 主仓根（git 调用根）
 * @param {string|null} [opts.specBase] - .sillyspec 根（缺省 join(cwd,'.sillyspec')；平台模式传 specRoot）
 * @param {string|null} [opts.changeName] - 变更名（quick 等无关联场景缺省 → skipped）
 * @param {string|null} [opts.runtimeRoot] - 运行时根（缺省 join(specBase,'.runtime')；平台模式
 *   与 specBase 分离时传 resolveRuntimeRoot 结果）
 * @returns {{
 *   status: 'ok'|'missing_declared'|'undeclared'|'skipped'|'degraded',
 *   matched: string[],                    // ①交集（唯一路径排序）
 *   missing: Array<{task: string, path: string, isNew?: boolean}>, // ②声明没做（isNew 标 NEW: 声明，剥前缀 path）
 *   undeclared: Array<{path: string, suspectTask?: string}>,       // ③做了没声明（suspectTask=review.json 尽力归因）
 *   skipReason: string|null,              // skipped/degraded 的原因（其余状态为 null）
 *   notes: string[],                      // 跨仓卡剔除 / 并行 WIP 剔除等提示（additive）
 *   form: 'worktree'|'post-apply'|null,   // actual 形态（skipped 无 actual 时为 null；additive）
 *   sources: string[],                    // actual 实际用到的源（诊断可见性；additive）
 * }}
 */
export function reconcileTargetFiles({ cwd, specBase = null, changeName = null, runtimeRoot = null, strictMode = false }) {
  const matched = []
  const missing = []
  const undeclared = []
  const notes = []

  if (!changeName) {
    return { status: 'skipped', matched, missing, undeclared,
      skipReason: '无 changeName（quick 等无关联变更场景），target_files 对账跳过', notes, form: null, sources: [] }
  }
  const sb = specBase || join(cwd, '.sillyspec')
  const rt = runtimeRoot || join(sb, '.runtime')

  // —— 声明侧 ——
  const decl = collectDeclaredTargetFiles(sb, changeName)
  for (const label of decl.crossRepoCards) {
    notes.push(`跨仓 task 卡 ${label} 已剔除——跨仓对账不在本变更范围（D-004），其声明留待后续分期`)
  }
  if (decl.cardCount === 0) {
    return { status: 'skipped', matched, missing, undeclared,
      skipReason: `变更 ${changeName} 无 task 卡（tasks/ 缺失或为空），target_files 对账跳过`, notes, form: null, sources: [] }
  }
  if (decl.declarations.length === 0) {
    // IR 严格档（2026-09-07-ir-hardening D-003@v1，FR-01）：主仓卡全部零声明 → strictViolation。
    // 判据（Grill P2-④修订）：noDeclarationCount > 0 且 == cardCount - 跨仓卡数——跨仓卡不参与
    // 计数也不充当豁免（防「塞一张跨仓卡让全部主仓卡免检」绕过）。部分主仓卡已声明 → 不触发（灰度 WARNING）。
    if (strictMode && decl.noDeclarationCount > 0
      && decl.noDeclarationCount === decl.cardCount - decl.crossRepoCards.length) {
      return { status: 'skipped', matched, missing, undeclared,
        skipReason: `严格模式变更（created_at ≥ IR_STRICT_SINCE）主仓 task 卡全部未声明 target_files（${decl.noDeclarationCount}/${decl.cardCount - decl.crossRepoCards.length} 张主仓卡${decl.crossRepoCards.length > 0 ? `，另 ${decl.crossRepoCards.length} 张跨仓卡已剔除` : ''}）`,
        notes, form: null, sources: [],
        strictViolation: {
          code: 'target_files_all_missing_strict',
          message: `严格模式要求每个主仓 task 卡声明 target_files（计划改动的文件清单，taskcard 骨架已预置字段）——逐卡 Edit 填入：已存在文件写仓根相对精确路径，新建文件加 NEW: 前缀；填毕重跑 --done（进度不丢）`,
        } }
    }
    // 存量零红门禁：全部卡无声明 / 全部跨仓 → WARNING 语义跳过，不产生 missing/undeclared
    const reason = decl.noDeclarationCount === 0
      ? `本变更 task 卡全部为跨仓卡（${decl.crossRepoCards.length} 张），主仓 target_files 对账跳过`
      : `所有 task 卡均未声明 target_files（${decl.noDeclarationCount}/${decl.cardCount} 张无声明` +
        `${decl.crossRepoCards.length > 0 ? `，另 ${decl.crossRepoCards.length} 张跨仓卡已剔除` : ''}）` +
        `——存量卡可忽略；新卡请补：每条为仓根相对精确文件路径，不存在的文件加 NEW: 前缀`
    return { status: 'skipped', matched, missing, undeclared, skipReason: reason, notes, form: null, sources: [] }
  }

  // —— actual 侧（三源并集，两形态）——
  const actual = resolveReconcileActualFiles({ cwd, specBase: sb, runtimeRoot: rt, changeName })
  if (actual.foreignExcluded > 0) {
    notes.push(`主仓 status 捕入的 ${actual.foreignExcluded} 个并行会话声明文件已剔除（不参与本变更对账）`)
  }
  if (!actual.ok) {
    // 降级（fail-soft 不误红）：git 全部不可用 → actual 不可得，不产生 missing/undeclared
    return { status: 'degraded', matched, missing, undeclared,
      skipReason: `git 全部不可用，actual 不可得，对账降级跳过——${actual.degradedReason}`,
      notes, form: actual.form, sources: actual.sources }
  }

  // —— 三类差集 ——
  // 对账键（2026-09-08 用户反馈⑥：计划文件名 vs 实测文件名的字面差脆）：声明侧 task 卡是
  // agent 手写（大小写随手、尾部注记、./ 前缀残留），actual 侧是 git 机器产出——字面相等
  // 判定下这些形态差全部落②类假红（missing_declared，ERROR 态阻断 verify）。统一 canonical
  // key 再比对：normalizeReviewChangedFile 归一（./ 前缀/尾部注记/行内注释/反斜杠）+
  // win32/darwin 大小写折叠（默认文件系统大小写不敏感，两形指同一文件；Linux 保持敏感）。
  // 报告侧仍用原始字面串（用户按自己写的名字找到声明处）。
  const foldCase = process.platform === 'win32' || process.platform === 'darwin';
  const pathKey = (p) => {
    const n = normalizeReviewChangedFile(p);
    return foldCase ? n.toLowerCase() : n;
  };
  const actualKeySet = new Set(actual.files.map(pathKey));
  const declaredPaths = [...new Set(decl.declarations.map(d => d.path))].sort()
  const declaredKeySet = new Set(declaredPaths.map(pathKey))
  // ①交集（计数进 evidence）：唯一路径口径（多卡声明同文件只计一次）
  for (const path of declaredPaths) {
    if (actualKeySet.has(pathKey(path))) matched.push(path)
  }
  // ②声明没做（计划落空，ERROR）：逐卡逐条报 task-NN + path；NEW: 声明的取剥前缀 path、带
  // isNew 标（"新建文件没建"与"存量文件没动"的修复指引不同）
  for (const d of decl.declarations) {
    if (!actualKeySet.has(pathKey(d.path))) {
      missing.push(d.isNew ? { task: d.task, path: d.path, isNew: true } : { task: d.task, path: d.path })
    }
  }
  // ③做了没声明（scope creep，WARNING）：actual − 声明集；suspectTask 尽力归因仅报告（D-002）
  const suspect = attributeSuspectTasks(rt, changeName, actual.files.filter(p => !declaredKeySet.has(pathKey(p))))
  for (const path of actual.files) {
    if (declaredKeySet.has(pathKey(path))) continue
    const s = suspect.get(normalizeReviewChangedFile(path))
    undeclared.push(s ? { path, suspectTask: s } : { path })
  }

  // 状态聚合：②在场即 ERROR 态优先（gates 阻断语义靠它兑现）；仅③ → WARNING 态
  const status = missing.length > 0 ? 'missing_declared' : (undeclared.length > 0 ? 'undeclared' : 'ok')
  return { status, matched, missing, undeclared, skipReason: null, notes, form: actual.form, sources: actual.sources }
}

// ─────────────────────────────────────────────────────────────────────────────
// P3b task-02：verify-result.md 探针预填段一致性抽查（D-002@v1 方案A 正文基准 + D-003@v1
// G2/G8 锚点规格与判别子；接线 gates.js verify 块是 task-03 的 scope）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 正文预填段锚点正则（导出供 round-trip 测试锁定，R-01）：与 src/verify-probes.js
 * renderVerifyProbesReport 的渲染形态逐条同源（行号为 2026-09-07 P3b 基线，渲染改版须
 * 同步更新此处）。统一锚定行首 ^——正文散文行内出现同形片段不算命中（G8 紧锚）。
 */

/** probe1 命中行：`- ⚠️ \`${file}:${line}\` ${content}`（renderVerifyProbesReport :226；
 *  `:\d+` 收尾反引号前的行号段是它与探针 3/6 同形 ⚠️ 行的区分点） */
export const PROBE1_HIT_LINE_RE = /^- ⚠️ `[^`]+:\d+`/

/** probe3 hasTest 行：`- ✅ task-N: 模块目录（…）找到 N 个测试文件（…）`（:245） */
export const PROBE3_HASTEST_LINE_RE = /^- ✅ task-\d+: .*找到 \d+ 个测试文件/

/** probe5 summary 锚行（:259——summary 恒渲染为子节首条 `- ` 行；四个前缀形态覆盖
 *  verifyApiParity 的 pass/fail/无根三态 summary 与 summary 为 falsy 的兜底渲染。G2：锚行
 *  存在性而非 backend/frontend 计数——总数在 FAIL 形态不进渲染文本） */
export const PROBE5_SUMMARY_LINE_RE =
  /^- (?:✅ API parity check passed:|❌ API parity check failed:|No scan root for parity check|backend \d+ 端点 \/ frontend \d+ 调用)/

/** probe5 contract gap 表格行：`| ❌ missing | METHOD path | — | file:line |`（:271，
 *  fail 形态锚 missing 数） */
export const PROBE5_MISSING_ROW_RE = /^\| ❌ missing \|/

/** probe6 删除条目行：`- <verdict> \`${path}\`（git 状态 D）`（:288；verdict 三态前缀与
 *  runVerifyProbes 的 ✅ 合规 / ❌ 高风险 / ⚠️ 未声明删除同源，`（git 状态` 尾缀把它与
 *  unavailable 行 / 无删除行 / ℹ️ note 行天然区分——后三者均无「反引号路径+状态尾缀」形态） */
export const PROBE6_DELETION_LINE_RE = /^- (?:✅ 合规|❌ 高风险|⚠️ 未声明删除)[^`]* `[^`]+`（git 状态/

/**
 * `#### 探针 N` 子节定界（G8/R-05）：子节 = 标题行起、下一任意 markdown 标题（下一探针
 * 子节 / `##` 章 / `#` 题）前止。探针 2/4 的 agent 补写内容天然落在本子节定界之外，其
 * `- ⚠️` 同形散文不进 1/3/5/6 的锚点计数。
 * @param {string} text verify-result.md 全文（CRLF 归一内部处理）
 * @returns {Object<string, string[]>} 探针号（字符串）→ 子节正文行数组（不含自身标题行；
 *   子节缺失则无该键；同名子节重复出现时合并计数——重复本身就会撞出 mismatch）
 */
function extractProbeSubsections(text) {
  const sections = {}
  let current = null
  for (const line of normalizeLineEndings(String(text || '')).split('\n')) {
    const m = line.match(/^#### 探针 (\d+)[：:]/)
    if (m) {
      current = m[1]
      if (!sections[current]) sections[current] = []
      continue
    }
    if (current === null) continue
    if (/^#{1,6}\s/.test(line)) { current = null; continue }
    sections[current].push(line)
  }
  return sections
}

/**
 * 解析 verify-result.md 正文预填段锚点指标（checkProbeConsistency 的 doc 侧取数）。
 * 导出供渲染→解析 round-trip 测试直接消费（R-01）。
 * @param {string} text verify-result.md 全文
 * @returns {{
 *   subsections: { probe1: boolean, probe3: boolean, probe5: boolean, probe6: boolean, any: boolean },
 *   probe1Hits: number,          // probe1 命中行计数（对比 probe1.matches.length）
 *   probe3HasTest: number,       // probe3 hasTest 行计数（对比 tasks.filter(hasTest).length）
 *   probe5SummaryPresent: boolean, // probe5 summary 锚行存在性（pass 形态锚）
 *   probe5Missing: number,       // `| ❌ missing |` 行计数（fail 形态锚，对比 missingBackend.length）
 *   probe6Deletions: number,     // probe6 删除条目行计数（对比 deletions.length）
 * }}
 */
export function parseProbePrefillAnchors(text) {
  const sections = extractProbeSubsections(text)
  const count = (lines, re) => lines.reduce((n, l) => n + (re.test(l) ? 1 : 0), 0)
  const s1 = sections['1'] || []
  const s3 = sections['3'] || []
  const s5 = sections['5'] || []
  const s6 = sections['6'] || []
  return {
    subsections: {
      probe1: '1' in sections,
      probe3: '3' in sections,
      probe5: '5' in sections,
      probe6: '6' in sections,
      any: Object.keys(sections).length > 0,
    },
    probe1Hits: count(s1, PROBE1_HIT_LINE_RE),
    probe3HasTest: count(s3, PROBE3_HASTEST_LINE_RE),
    probe5SummaryPresent: count(s5, PROBE5_SUMMARY_LINE_RE) > 0,
    probe5Missing: count(s5, PROBE5_MISSING_ROW_RE),
    probe6Deletions: count(s6, PROBE6_DELETION_LINE_RE),
  }
}

/**
 * 读 <changeDir>/verify-facts.json（verify-probes --init 落盘的机器底稿，task-01）。缺失 /
 * 不可解析 / 非对象 → null。注意：facts 只是审计参照与判别子证据，防篡改对比基准是正文。
 */
function readVerifyFacts(changeDir) {
  const factsPath = join(changeDir, 'verify-facts.json')
  if (!existsSync(factsPath)) return null
  try {
    const parsed = JSON.parse(readFileSync(factsPath, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch { return null }
}

/**
 * init 快照后 HEAD 是否前进（R-06）：facts.generatedAt 之后 `git log --oneline` 非空 → true。
 * facts 缺失 / generatedAt 非法 / git 失败 → false——子案判定跳过 = 不降级，probe6 不符维持
 * ERROR（fail-closed 侧：无法证实「环境漂移」就按「疑似篡改」报）。
 */
function detectHeadAdvanceSinceFacts(cwd, facts) {
  const generatedAt = facts && typeof facts.generatedAt === 'string' ? facts.generatedAt.trim() : ''
  if (!generatedAt) return false
  const out = gitQuiet(cwd, ['log', '--oneline', `--since=${generatedAt}`], { timeout: 30 * 1000 })
  if (out === null) return false
  return out.trim().length > 0
}

/**
 * verify-result.md 探针预填段一致性抽查（P3b task-02；D-002@v1 方案A——对比基准是**正文**
 * 预填段而非 verify-facts.json，删底稿绕不过防护）。
 *
 * 纯函数风格（与 reconcileTargetFiles 同构导出）：只读 git/fs、重跑只读探针，不落盘、不改
 * 既有导出语义。流程：
 * 1. verify-result.md 不存在 → skip（未走 --init 的存量/quick 场景）；
 * 2. 判别子（D-003）：任一 `#### 探针` 子节在场 = 新格式报告，进入逐探针对账；全部子节
 *    缺失时——facts 在场 → ERROR（agent 删除预填段）；facts 也不在场 → skip（存量旧报告，
 *    零红门禁）。残余（正文预填段+facts 同时删）降级 skip——防护弱化非绕过，如实声明；
 * 3. 重跑 runVerifyProbes（specDir 显式传 sb——平台/主仓根口径由调用方给定，不走 cwd 祖先
 *    推断与 worktree 漂移锚定）；异常 → degraded（fail-soft 不误红）；
 * 4. 分级对账（D-002）：
 *    - probe1 命中数不符 / probe6 删除数不符 = ERROR（probe1 对比排除 worktreeHits 维度
 *      ——worktree 存活态与 init 时刻可能不同，R-02；probe6 重跑不可用（非仓库/git 失败）时
 *      当前删除数无意义，跳过该维度不误红）；
 *    - HEAD 前进子案（R-06）：facts.generatedAt 之后有新 commit 时 probe6 的 `git diff HEAD`
 *      口径整体漂移 → 该 mismatch 降 WARNING 提示重跑 --init；
 *    - probe3 hasTest 数 / probe5 锚（summary 行存在性 + missing 行数）不符 = WARNING
 *      （测试文件布局与 parity 扫描根环境敏感）。
 *
 * 接线约定（task-03，gates.js）：status='mismatch' 且 severity='error' → 阻断回滚；
 * 'mismatch'+'warning' → 放行告警（envelope probe_consistency_drift）；'skipped'/'degraded' →
 * 放行提示（envelope probe_consistency_skipped）；'ok' → 静默。ERROR 级 mismatch 的信封 code
 * 为 probe_consistency_mismatch。
 *
 * @param {object} opts
 * @param {string} opts.cwd - 主仓根（git 调用根，与 runVerifyProbes 同参）
 * @param {string|null} [opts.specBase] - .sillyspec 根（缺省 join(cwd,'.sillyspec')；平台模式
 *   传 specRoot——changeDir/报告/facts 的定位基准，P3a reconcileTargetFiles 同款兜底）
 * @param {string|null} [opts.changeName] - 变更名（quick 等无关联场景缺省 → skipped）
 * @param {string|null} [opts.runtimeRoot] - 运行时根（缺省 join(specBase,'.runtime')；平台模式
 *   与 specBase 分离时传 resolveRuntimeRoot 结果。取根口径与 P3a 一致——本检查的锚点产物
 *   （verify-result.md/verify-facts.json）均在 changeDir，此参为 gates 统一传参的签名对齐预留）
 * @returns {{
 *   status: 'ok'|'mismatch'|'skipped'|'degraded',
 *   severity: 'error'|'warning'|null, // mismatch 时 = mismatches 内最高级；其余状态恒 null
 *   mismatches: Array<{probe: string, expected: *, actual: *, severity: 'error'|'warning', note: string}>,
 *     // expected = 当前重跑指标（应然），actual = 正文锚点解析值（agent 可篡改侧）
 *   skipReason: string|null,
 *   subsections: {probe1: boolean, probe3: boolean, probe5: boolean, probe6: boolean, any: boolean}|null,
 *     // 诊断（additive）：探针子节在场性；报告未读到的早期 skip 为 null
 * }}
 */
/**
 * IR 严格模式判别（change: 2026-09-07-ir-hardening，D-001@v1）：
 * changes.created_at ≥ IR_STRICT_SINCE → true（严格档：P3b 探针段缺失 / P3a 主仓卡全零声明 ERROR）。
 * fail-open：读不到 created_at（无行/db 异常/pm 缺失）→ false，落存量豁免不误伤。
 * @param {{ getChangeCreatedAt?: Function }} opts.pm - ProgressManager（或含同名方法的对象）
 */
export function isStrictChange({ pm, cwd, changeName } = {}) {
  if (!pm || typeof pm.getChangeCreatedAt !== 'function' || !changeName) return false
  const createdAt = pm.getChangeCreatedAt(cwd, changeName)
  if (!createdAt || typeof createdAt !== 'string') return false
  return createdAt >= IR_STRICT_SINCE
}

export function checkProbeConsistency({ cwd, specBase = null, changeName = null, runtimeRoot = null, strictMode = false }) {
  if (!changeName) {
    return { status: 'skipped', severity: null, mismatches: [],
      skipReason: '无 changeName（quick 等无关联变更场景），探针一致性抽查跳过', subsections: null }
  }
  const sb = specBase || join(cwd, '.sillyspec')
  const changeDir = join(sb, 'changes', changeName)
  const reportPath = join(changeDir, 'verify-result.md')

  if (!existsSync(reportPath)) {
    return { status: 'skipped', severity: null, mismatches: [],
      skipReason: `verify-result.md 不存在（${reportPath}），探针一致性抽查跳过`, subsections: null }
  }
  let reportText
  try {
    reportText = readFileSync(reportPath, 'utf8')
  } catch (err) {
    return { status: 'skipped', severity: null, mismatches: [],
      skipReason: `verify-result.md 读取失败（${err && err.message ? err.message : err}），探针一致性抽查跳过`, subsections: null }
  }

  const anchors = parseProbePrefillAnchors(reportText)
  const finish = (status, severity, mismatches, skipReason) =>
    ({ status, severity, mismatches, skipReason, subsections: anchors.subsections })

  // —— 判别子（D-003）：全部 `#### 探针` 子节缺失时不进入逐探针对账 ——
  if (!anchors.subsections.any) {
    if (readVerifyFacts(changeDir)) {
      return finish('mismatch', 'error', [{
        probe: 'prefill', expected: '#### 探针 预填子节在场', actual: '全部缺失', severity: 'error',
        note: 'verify-facts.json 在场而正文探针子节全缺——疑似 agent 删除机械预填段（对比基准是正文，删 facts.json 绕不过防护）',
      }], null)
    }
  if (strictMode) {
    // IR 严格档（2026-09-07-ir-hardening D-002@v1，FR-01）：闸门后变更不跑 verify-probes --init
    // 即零子节——不再是「存量兼容 skip」而是 ERROR（可绕过口收紧）。文案必须带可执行指引（R-02）。
    return finish('mismatch', 'error', [{
      probe: 'prefill',
      code: 'probe_prefill_missing_strict',
      expected: '#### 探针 预填子节在场',
      actual: '全部缺失',
      severity: 'error',
      note: '严格模式变更（created_at ≥ IR_STRICT_SINCE）的 verify-result.md 缺探针预填子节——先跑 sillyspec verify-probes --change <变更名> --init 生成九章节骨架并如实填写，再重跑 --done',
    }], null)
  }
    return finish('skipped', null, [],
      'verify-result.md 无 #### 探针 子节且无 verify-facts.json（存量旧格式报告，闸门前变更），探针一致性抽查跳过')
  }

  // —— 重跑探针取当前指标（specDir 显式传 sb：根口径由调用方给定，不做祖先推断/漂移锚定） ——
  let current
  try {
    current = runVerifyProbes({ cwd, changeName, specDir: sb })
  } catch (err) {
    return finish('degraded', null, [],
      `探针重跑异常（${err && err.message ? err.message : err}），一致性抽查降级跳过（fail-soft 不误红）`)
  }

  const mismatches = []

  // probe1 命中数（ERROR；worktreeHits/skippedFiles 环境维度不参与对比，R-02）
  const curProbe1Hits = (((current.probe1 || {}).matches) || []).length
  if (anchors.probe1Hits !== curProbe1Hits) {
    mismatches.push({ probe: 'probe1', expected: curProbe1Hits, actual: anchors.probe1Hits, severity: 'error',
      note: '未实现标记命中数与重跑不符——正文预填段疑似被篡改（worktree 存活态等环境维度不参与对比）' })
  }

  // probe6 删除数（ERROR；重跑不可用时跳过——非仓库/git 失败下当前删除数无意义，对照不成立）
  const curProbe6 = current.probe6 || {}
  const curProbe6Deletions = (curProbe6.deletions || []).length
  if (!curProbe6.unavailable && anchors.probe6Deletions !== curProbe6Deletions) {
    const advanced = detectHeadAdvanceSinceFacts(cwd, readVerifyFacts(changeDir))
    mismatches.push({
      probe: 'probe6', expected: curProbe6Deletions, actual: anchors.probe6Deletions,
      severity: advanced ? 'warning' : 'error',
      note: advanced
        ? 'init 快照（verify-facts.json generatedAt）之后 HEAD 前进，probe6 以 HEAD 为锚整体漂移——请重跑 verify-probes --init 刷新预填（降 WARNING，R-06）'
        : '删除对账条目数与重跑不符——正文预填段疑似被篡改',
    })
  }

  // probe3 hasTest 数（WARNING——测试文件布局环境敏感）
  const curProbe3HasTest = ((((current.probe3 || {}).tasks) || []).filter(t => t && t.hasTest)).length
  if (anchors.probe3HasTest !== curProbe3HasTest) {
    mismatches.push({ probe: 'probe3', expected: curProbe3HasTest, actual: anchors.probe3HasTest, severity: 'warning',
      note: 'hasTest 任务数与重跑不符（探针3 对测试文件布局环境敏感，WARNING 不阻断）' })
  }

  // probe5 锚（WARNING——G2：summary 行存在性 + missing 行数；backend/frontend 总数不作锚）
  const curProbe5Missing = ((((current.probe5 || {}).missingBackend) || [])).length
  if (!anchors.probe5SummaryPresent) {
    mismatches.push({ probe: 'probe5', expected: 'summary 锚行在场', actual: '缺失', severity: 'warning',
      note: '探针5 summary 锚行缺失——正文预填段疑似被删改（锚行存在性口径，非计数口径）' })
  }
  if (anchors.probe5Missing !== curProbe5Missing) {
    mismatches.push({ probe: 'probe5', expected: curProbe5Missing, actual: anchors.probe5Missing, severity: 'warning',
      note: 'contract gap（missing backend）行数与重跑不符（探针5 扫描根/缓存口径环境敏感，WARNING 不阻断）' })
  }

  // —— facts 基线对比（2026-09-08-ir-verify-facts FR-05 / task-05）：重跑指标 vs
  // verify-facts.json probes 快照（init 时点）。md 锚点对账查「正文没被改」，本维度查
  // 「md 被手改对齐新代码后 facts 底稿过期」（P3d 数据源保鲜）。分级沿用现实现口径：
  // probe1/6=ERROR、probe3/5=WARNING；probe6 继承 HEAD-advance 降级（R-06）。——
  const factsSnapshot = readVerifyFacts(changeDir)
  let factsConsistency = null
  if (factsSnapshot && factsSnapshot.probes) {
    const fm = []
    const adv = detectHeadAdvanceSinceFacts(cwd, factsSnapshot)
    const snap1 = (((factsSnapshot.probes.probe1 || {}).metrics) || {}).matches
    if (typeof snap1 === 'number' && snap1 !== curProbe1Hits) {
      fm.push({ probe: 'probe1', snapshot: snap1, rerun: curProbe1Hits, severity: 'error',
        note: 'facts 快照命中数与重跑不符——md 疑已手改对齐新代码而 facts 底稿过期（修复：verify-probes --init 刷新 facts + 按新结果同步 md 探针段）' })
    }
    const snap6 = (((factsSnapshot.probes.probe6 || {}).metrics) || {}).deletions
    if (!curProbe6.unavailable && typeof snap6 === 'number' && snap6 !== curProbe6Deletions && !adv) {
      // adv（HEAD 前移）时豁免：同一漂移已由 md 锚点维度的 probe6 WARNING 报出（R-06 继承，
      // 双维度重复报同一信号是噪音）；非 adv 的不符 = facts 底稿被手改对齐——ERROR
      fm.push({ probe: 'probe6', snapshot: snap6, rerun: curProbe6Deletions, severity: 'error',
        note: 'facts 快照删除数与重跑不符——底稿疑似过期（修复：verify-probes --init 刷新 facts + 同步 md 探针段）' })
    }
    const snap3 = (((factsSnapshot.probes.probe3 || {}).metrics) || {}).hasTest
    if (typeof snap3 === 'number' && snap3 !== curProbe3HasTest) {
      fm.push({ probe: 'probe3', snapshot: snap3, rerun: curProbe3HasTest, severity: 'warning',
        note: 'facts 快照 hasTest 数与重跑不符（测试布局环境敏感，WARNING）' })
    }
    const snap5 = (((factsSnapshot.probes.probe5 || {}).metrics) || {}).backendEndpoints
    const cur5 = (current.probe5 || {}).backendCount
    if (typeof snap5 === 'number' && typeof cur5 === 'number' && snap5 !== cur5) {
      fm.push({ probe: 'probe5', snapshot: snap5, rerun: cur5, severity: 'warning',
        note: 'facts 快照 backend 端点数与重跑不符（扫描根口径环境敏感，WARNING）' })
    }
    factsConsistency = {
      checked: fm.length === 0 ? ['probe1', 'probe3', 'probe5', 'probe6'] : [...new Set(fm.map(x => x.probe))],
      verdict: fm.length === 0 ? 'match' : 'mismatch',
      detail: fm.length === 0 ? null : fm,
    }
    for (const x of fm) {
      mismatches.push({ probe: `facts:${x.probe}`, expected: x.rerun, actual: x.snapshot, severity: x.severity, note: x.note })
    }
    // 固化 factsConsistency（fail-soft；不动 probes 快照语义——probes 归 --init 所有）
    try {
      const factsPath2 = join(changeDir, 'verify-facts.json')
      const f2 = JSON.parse(readFileSync(factsPath2, 'utf8'))
      f2.factsConsistency = factsConsistency
      writeFileSync(factsPath2, JSON.stringify(f2, null, 2) + '\n')
    } catch { /* 固化失败不阻断对账 */ }
  }

  if (mismatches.length === 0) {
    const okResult = finish('ok', null, [], null)
    okResult.factsConsistency = factsConsistency
    return okResult
  }
  const severity = mismatches.some(m => m.severity === 'error') ? 'error' : 'warning'
  const mismatchResult = finish('mismatch', severity, mismatches, null)
  mismatchResult.factsConsistency = factsConsistency
  return mismatchResult
}
