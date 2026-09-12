/**
 * run/verify-quality-scan.js（P0-1，docs/sillyspec/noai-ir-roadmap.md §3）。
 *
 * verify「运行测试和质量扫描」步 noAI 化的四件实现：
 *   1. executeVerifyQualityScan——noAI 动作（stage.js/complete.js 的 _cliAction
 *      'verifyRunQualityScan' 分支）：本步提前实测 commands.test/lint（与 --done 对账同源
 *      runVerifyTestCheck/runVerifyLintCheck），结果 + 代码指纹落盘；全绿自动盖 completed，
 *      失败打印输出 + 归因提示后 throw（步骤不推进，agent 修复后 run verify 复入本步重测）。
 *   2. 指纹复用（前置一·防重复跑）：computeQualityScanFingerprint = HEAD + 非文档脏集 +
 *      local.yaml commands/test_strategy 配置。--done 对账指纹匹配即复用实测结果免重跑
 *      （长套件 2~10 分钟不再跑两遍）；代码一变立即失配 → 照旧亲测。verify 护栏禁改源码，
 *      本步实测 → --done 窗口内合法产出只有规范文档（.sillyspec/、docs/、*.md 已排除出
 *      指纹），复用窗口内无假阴性面。信任边界：复用记录在 .runtime（agent 可写空间），
 *      伪造需主动协同造假，超出「偷懒幻觉谎报」威胁模型（CLI 亲测要拦的正是后者），
 *      伪造面与 verify-result.md 本身同级，且 pre-push 另有网。
 *   3. 归因透传（前置二）：renderVerifyTestAttribution——并行 WIP 归因鉴别①②自 gates.js
 *      inline 块迁出为单一实现（输出逐字保持），noAI 失败路径与 --done 失败路径共用。
 *      CLI 实测失败 ≠ 本变更的错：他者在途文件 / 旧基线生成产物两类归因缺失时，agent 会
 *      替并行会话背锅（2026-08-28 51 文件误导重跑事故教训）。
 *   4. evaluateConclusionDraft（前置三·结论草稿不进判定链）：机械事实全绿（实测通过 + lint
 *      非 failed + 探针 1/3/5/6 干净 + 风险门非 integration/deployment-critical）才给 PASS
 *      草稿；gate 对结论槽的独立复核逻辑不动——草稿只省打字成本，槽行仍由 agent 复核可改写。
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { writeAtomicSync } from '../fs-atomic.js'
import { gitQuiet } from '../git-helper.js'
import { resolveRuntimeRoot, parsePorcelainPath } from './shared.js'
import { detectChangeRisk } from '../change-risk-profile.js'
import { recordFrictionEvent } from '../friction-tally.js'

const RECORD_SCHEMA_VERSION = 1

export function qualityScanRecordPath(specBase, changeName) {
  if (!changeName) return null
  return join(specBase, '.runtime', `verify-quality-scan-${changeName}.json`)
}

/**
 * 指纹非代码面排除：verify 阶段步骤 6 实测 → --done 窗口内的合法产出只有规范文档——
 * 排除后这些写入不再触发失配重跑；src 一动（护栏外行为）立即失配照旧亲测。
 */
function isNonCodePath(p) {
  return p.startsWith('.sillyspec/') || p.startsWith('docs/') || p.endsWith('.md')
}

function porcelainCodeLines(porcelain) {
  return String(porcelain || '')
    .split('\n')
    .filter(Boolean)
    .map((l) => (l.slice(3) || '').replace(/^"|"$/g, '').replace(/\\/g, '/'))
    .filter((p) => p && !isNonCodePath(p))
    .sort()
}

/**
 * 代码指纹：sha256(local.yaml commands 段 + test_strategy 行 + git HEAD + 非文档脏集)。
 * git 不可用 → null（fail-closed：store 落 null / load 视为无记录，复用窗口关闭）。
 * 配置面口径与 prompt.js {LOCAL_COMMANDS} 注入的块扫描同款（含 unavailable 行剔除）。
 */
export function computeQualityScanFingerprint({ cwd, specBase }) {
  const localPath = join(specBase, 'local.yaml')
  let configText = ''
  try {
    if (existsSync(localPath)) {
      const lines = readFileSync(localPath, 'utf8').replace(/\r\n?/g, '\n').split('\n')
      const start = lines.findIndex((l) => /^commands:\s*(#.*)?$/.test(l))
      if (start !== -1) {
        const body = []
        for (let i = start + 1; i < lines.length && !/^\S/.test(lines[i]); i++) body.push(lines[i])
        configText = body.filter((l) => !/^\s*[\w.-]+:\s*['"]?unavailable['"]?\s*(#.*)?$/i.test(l)).join('\n')
      }
      const ts = lines.find((l) => /^test_strategy:/.test(l))
      if (ts) configText += '\n' + ts.trim()
    }
  } catch { /* 读不到按空配置面处理 */ }
  const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
  const porcelain = gitQuiet(cwd, ['status', '--porcelain'])
  if (head === null || porcelain === null) return null
  const codeLines = porcelainCodeLines(porcelain)
  return createHash('sha256')
    .update([configText, head.trim(), codeLines.join('|')].join('\n---\n'))
    .digest('hex')
}

/**
 * 实测结果 + 指纹落盘（noAI 动作调用；--done 复用读回）。fail-soft：落盘失败只 warn，
 * --done 将照旧亲测（复用是优化不是正确性依赖）。
 */
export function storeQualityScan({ specBase, cwd, changeName, testResult, lintResult }) {
  const path = qualityScanRecordPath(specBase, changeName)
  if (!path) return null
  const fingerprint = computeQualityScanFingerprint({ cwd, specBase })
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeAtomicSync(path, JSON.stringify({
      schemaVersion: RECORD_SCHEMA_VERSION,
      source: 'cli-noai',
      change: changeName,
      fingerprint,
      ranAt: new Date().toISOString(),
      testResult,
      lintResult: lintResult || null,
    }, null, 2) + '\n')
    return { path, fingerprint }
  } catch (e) {
    console.warn(`⚠️  质量扫描复用记录落盘失败（fail-soft，--done 将照旧亲测）: ${e && e.message ? e.message : e}`)
    return null
  }
}

/**
 * 读回复用记录：schema/source 校验 + 指纹当前匹配 + testResult 有效（passed/skipped；
 * failed 不复用——失败态指纹下步骤本就未完成，防御性兜底）。任一不满足 → null。
 */
export function loadReusableQualityScan({ specBase, cwd, changeName }) {
  const path = qualityScanRecordPath(specBase, changeName)
  if (!path || !existsSync(path)) return null
  try {
    const rec = JSON.parse(readFileSync(path, 'utf8'))
    if (!rec || rec.schemaVersion !== RECORD_SCHEMA_VERSION || rec.source !== 'cli-noai') return null
    if (!rec.testResult || !rec.testResult.status) return null
    if (rec.testResult.status === 'failed') return null
    const fp = computeQualityScanFingerprint({ cwd, specBase })
    if (!fp || fp !== rec.fingerprint) return null
    return { testResult: rec.testResult, lintResult: rec.lintResult || null, ranAt: rec.ranAt || null, fingerprint: fp }
  } catch {
    return null
  }
}

/**
 * 并行 WIP 归因鉴别（前置二）：迁自 gates.js verify 实测失败归因 inline 块，输出逐字保持。
 * 判据①他者声明文件命中 dirty 集；判据②本变更 apply 的文件与主仓近期提交重叠且旧内容
 * 仍在工作区（生成产物旧基线）。全降级不抛——归因提示失败不影响阻断语义。
 */
export async function renderVerifyTestAttribution({ cwd, changeName, specBase, runtimeRoot }) {
  try {
    const { collectForeignDeclaredFiles } = await import('../foreign-declared.js')
    const foreignMap = collectForeignDeclaredFiles(cwd, changeName, { specBase, runtimeRoot })
    // dirty 集提前算好：归因提示①（他者在途）与②（生成产物旧基线）共用
    const dirty = (gitQuiet(cwd, ['diff', '--name-only', 'HEAD']) || '')
      .split('\n').filter(Boolean).map((f) => f.replace(/\\/g, '/'))
    const dirtySet = new Set(dirty)
    if (foreignMap.size > 0) {
      const hitForeign = dirty.filter((f) => foreignMap.has(f))
      if (hitForeign.length > 0) {
        console.error(`   ℹ️ 归因提示：主仓检出 ${hitForeign.length} 个并行会话声明的在途文件（${hitForeign.slice(0, 5).join(', ')}${hitForeign.length > 5 ? ' 等' : ''}）——实测失败可能混入他者 WIP 而非本变更问题。待其提交/收尾后复验，仍失败才是本变更的。`)
      }
    }
    // 第二判据（坑 derived-artifact-stale-baseline / verify-attr2-foreign-wip-misdirection）：
    // 完整语义见 gates.js filterStaleBaselineOverlap 注释——两道过滤（必须 dirty + 剔除他者声明集）。
    try {
      const pathspecFile = join(runtimeRoot, `apply-pathspec-${changeName}.txt`)
      if (changeName && existsSync(pathspecFile)) {
        const ownFiles = new Set(readFileSync(pathspecFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((f) => f.replace(/\\/g, '/')))
        if (ownFiles.size > 0) {
          const recent = (gitQuiet(cwd, ['log', '-n', '10', '--name-only', '--pretty=format:']) || '')
            .split('\n').map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean)
          const overlap = [...new Set(recent)].filter((f) => ownFiles.has(f))
          if (overlap.length > 0) {
            const { filterStaleBaselineOverlap } = await import('./gates.js')
            const actionable = filterStaleBaselineOverlap(overlap, dirtySet, foreignMap)
            if (actionable.length > 0) {
              console.error(`   ℹ️ 归因提示②：本变更有 ${actionable.length} 个文件与主仓最近 10 条提交重叠且旧内容仍在工作区（${actionable.slice(0, 5).join(', ')}${actionable.length > 5 ? ' 等' : ''}）——若为生成产物（api-types 等），本变更可能在旧基线生成并覆盖了已合入内容；先在新基线重跑生成命令（如 gen:types）再复验。（重叠共 ${overlap.length} 个，其余未在工作区改动或属他者会话在途文件，已归提示①/无需处理）`)
            }
          }
        }
      }
    } catch { /* 判据②失败不影响主流程 */ }
  } catch { /* 归因提示失败不影响阻断语义 */ }
}

/**
 * coverage 存在性事实（P2，noai-ir-roadmap §5）：local.yaml 显式配置 commands.coverage
 * 才采集（不自动解析任意 runner stdout——格式多样性是长期维护税）；跑该命令后读 lcov
 * 产物（coverage_artifact 可配，缺省 coverage/lcov.info）取「有覆盖记录的文件集」，
 * 与变更 diff 文件求交集。**语义边界（评审一裁决）：交集只证明存在相关覆盖记录，
 * 不证明行为覆盖**——渲染必须带「存在性」标注，防弱事实被当强结论用（新幻觉源）。
 * 全程 fail-soft：未配置/命令失败且产物缺失/产物非 lcov 形态 → skipped + reason。
 * 返回纯 JSON 可序列化（落进质量扫描记录）。
 */
export async function runCoverageExistenceCheck({ cwd, specBase, changeName }) {
  const skipped = (reason) => ({ status: 'skipped', reason, coveredChanged: [], uncoveredChanged: [] })
  const localPath = join(specBase, 'local.yaml')
  let yamlText = null
  try { yamlText = readFileSync(localPath, 'utf8') } catch { return skipped(`local.yaml 不可读（${localPath}）`) }
  const covCmd = (yamlText.match(/^\s*coverage:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m) || [])[1]
  if (!covCmd || covCmd.trim().toLowerCase() === 'unavailable') {
    return skipped('未配置 commands.coverage（coverage 存在性事实不采集——配置后自动启用）')
  }
  const artifactRel = (yamlText.match(/^\s*coverage_artifact:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m) || [])[1] || 'coverage/lcov.info'
  let runNote = ''
  try {
    execSync(covCmd.trim(), { cwd, encoding: 'utf8', timeout: 10 * 60 * 1000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    runNote = '命令退出码 0'
  } catch (e) {
    runNote = `命令退出非 0（${e.status ?? '?'}）——产物若已生成仍按产物判定`
  }
  let lcov = ''
  try {
    lcov = readFileSync(join(cwd, artifactRel), 'utf8')
  } catch {
    return skipped(`coverage 产物缺失（${artifactRel}；${runNote}）`)
  }
  const covered = [...lcov.matchAll(/^SF:(.+)$/gm)].map((m) => m[1].trim().replace(/\\/g, '/')).filter(Boolean)
  if (covered.length === 0) return skipped(`产物无 SF: 记录（${artifactRel} 非 lcov 形态？）`)
  let changed = null
  try {
    const { resolveVerifyChangedFiles } = await import('../verify-postcheck.js')
    changed = resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase })
  } catch { /* 变更面不可得 → 空对账 */ }
  const { coveredChanged, uncoveredChanged } = intersectCoverageExistence(covered, Array.isArray(changed) ? changed : [])
  return { status: 'computed', artifact: artifactRel, runNote, coveredSetSize: covered.length, coveredChanged, uncoveredChanged }}

/** 纯函数：lcov SF 集 × 变更文件集交集（双向后缀匹配容忍绝对/仓相对前缀差） */
export function intersectCoverageExistence(coveredPaths, changedFiles) {
  const covered = (Array.isArray(coveredPaths) ? coveredPaths : []).map((c) => String(c).split('\\').join('/'))
  const coveredChanged = []
  const uncoveredChanged = []
  for (const f of (Array.isArray(changedFiles) ? changedFiles : [])) {
    const n = String(f).split('\\').join('/')
    const hit = covered.some((c) => c === n || c.endsWith('/' + n) || n.endsWith('/' + c))
    ;(hit ? coveredChanged : uncoveredChanged).push(n)
  }
  return { coveredChanged, uncoveredChanged }
}

/** 存在性事实渲染（语义边界内建：只说「有覆盖记录」，不说「已覆盖」） */
export function renderCoverageExistenceReport(cov) {
  if (!cov || cov.status === 'skipped') {
    return `ℹ️  coverage 存在性事实：${cov ? cov.reason : '未采集'}`
  }
  const total = cov.coveredChanged.length + cov.uncoveredChanged.length
  if (total === 0) return 'ℹ️  coverage 存在性事实：无变更文件可对账（diff 为空）'
  const lines = [
    `📊 测试覆盖**存在性**事实（非行为覆盖断言——只证明「有覆盖记录」，不证明「覆盖了变更行为」）：${cov.coveredChanged.length}/${total} 个变更文件在 coverage 产物中有记录（${cov.artifact}；${cov.runNote}）`,
  ]
  if (cov.uncoveredChanged.length > 0) {
    lines.push(`   ⚠️ 无覆盖记录的变更文件（存在性缺口——行为是否覆盖仍需你判断）：${cov.uncoveredChanged.slice(0, 10).join('、')}${cov.uncoveredChanged.length > 10 ? ' 等' : ''}`)
  }
  return lines.join('\n')
}


/** fallback 口径可见性（2026-09-11 驾驭第十二批）：快照不可用回退主仓且主仓存在非 .sillyspec
 * 脏文件时，明示实测判定面含并行 WIP——第三撞根因是「静默 fallback 看不出走了哪个口径」。 */
function warnIfMainRepoDirtyForGate(cwd) {
  try {
    const st = gitQuiet(cwd, ['status', '--porcelain'])
    if (!st) return
    const dirty = st.split('\n').map(l => parsePorcelainPath(l)).filter(p => p && !p.startsWith('.sillyspec/'))
    if (dirty.length > 0) {
      console.warn(`⚠️ 本次实测未走隔离快照（基建不可用/变更文件集为空），判定面 = main 工作区——当前存在 ${dirty.length} 个非 .sillyspec 脏文件（${dirty.slice(0, 3).join('、')}${dirty.length > 3 ? ' 等' : ''}），并行会话 WIP 可能影响判定；失败时先做污染归属鉴定再修。`)
    }
  } catch { /* git 不可用 → 静默（原本也无快照） */ }
}

/**
 * noAI 动作本体：提前实测 test+lint → 指纹落盘 → 全绿返回（stage.js 盖 completed 自动前进）；
 * 失败（test failed / lint 硬门档 failed）打印归因提示后 throw——步骤不推进，agent 修复后
 * `run verify` 复入本步重新实测（指纹随代码修复失配，--done 不会复用旧失败结果）。
 */
export async function executeVerifyQualityScan({ cwd, specBase, changeName, platformOpts }) {
  const { runVerifyTestCheck, printVerifyTestCheck, runVerifyLintCheck, printVerifyLintCheck, shouldBlockVerifyLint } = await import('../verify-postcheck.js')
  // ── 隔离快照定向跑（2026-09-11 驾驭第十二批，用户第三次撞上：noAI 质量扫描是 verify 的
  // 第一实测执行点，第八批只接了 gates.js verify 块——本步仍跑 main 工作区，并行 WIP 在此弄红
  // 无辜变更）。与 gates.js 同款：createVerifyGateSnapshot（HEAD + 本变更文件集，native worktree
  // 定向源），ENV 同 SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF，基建失败 fallback 主仓 + 脏文件在场时
  // ⚠️ 口径可见。指纹（storeQualityScan）仍按主仓 cwd 算——--done 对账复用的指纹匹配口径不变。
  let snap = null
  if (!process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF) {
    try {
      const { createVerifyGateSnapshot } = await import('./gate-snapshot.js')
      snap = await createVerifyGateSnapshot({ cwd, changeName, specBase, platformOpts })
      if (snap) {
        console.log(`🧪 noAI 扫描隔离快照（根：${snap.snapshotRoot}）：HEAD + 本变更 ${snap.changeFileCount} 个文件${snap.sourceRoot ? '（overlay 自 worktree——本变更分支内容定向跑）' : ''}（并行会话脏文件不参与判定）`)
      }
    } catch { /* 快照链路异常 → 主仓现行为 */ }
  }
  const gateCwd = snap ? snap.snapshotRoot : cwd
  const gateSpecBase = snap ? join(snap.snapshotRoot, '.sillyspec') : specBase
  if (!snap) {
    warnIfMainRepoDirtyForGate(cwd)
  }
  console.log(`\n⏳ noAI 质量扫描：CLI 亲自实测 commands.test（同步，长套件 2~10 分钟无输出属正常）——结果按代码指纹落盘，最终 --done 对账直接复用免重跑。`)
  let testCheck
  let lintCheck
  let coverageCheck = null
  try {
    testCheck = runVerifyTestCheck({ cwd: gateCwd, specBase: gateSpecBase, changeName })
    printVerifyTestCheck(testCheck)
    lintCheck = runVerifyLintCheck({ cwd: gateCwd, specBase: gateSpecBase, timeoutMs: snap ? 5 * 60 * 1000 : undefined })
    // 快照 lint 超时回退主仓（2026-09-12 dogfood 两连实证：junction I/O 病态慢，3min/5min 均被
    // 超时杀——主仓 60~110s 正常。按用户建议「自动回退」而非假败/advisory：主仓复跑保硬门，
    // 并行噪声混入时失败输出带归属鉴定提示）
    if (snap && lintCheck.status === 'failed' && /超时/.test(String(lintCheck.reason || ''))) {
      console.warn('⚠️ 快照 lint 超时（node_modules junction I/O 慢）→ 主仓复跑 lint（并行噪声可能混入——失败先做归属鉴定）')
      lintCheck = runVerifyLintCheck({ cwd, specBase })
    }
  if (lintCheck.status !== 'skipped') {
    console.log(`\n⏳ noAI 质量扫描：CLI 亲自实测 commands.lint…`)
  }
  printVerifyLintCheck(lintCheck)
  // P2（noai-ir-roadmap §5）：coverage 存在性事实——commands.coverage 显式配置才采集，
  // 只证「有覆盖记录」不证「覆盖了行为」（渲染自带语义边界），fail-soft 不阻断。
  try {
    coverageCheck = await runCoverageExistenceCheck({ cwd, specBase, changeName })
    console.log(renderCoverageExistenceReport(coverageCheck))
  } catch (e) {
    console.warn(`⚠️  coverage 存在性事实采集异常（fail-soft）: ${e && e.message ? e.message : e}`)
  }
  } finally {
    if (snap) { try { snap.cleanup() } catch {} }
  }
  storeQualityScan({ specBase, cwd, changeName, testResult: testCheck, lintResult: lintCheck, coverageCheck })
  const testFailed = testCheck.status === 'failed'
  const lintBlocked = shouldBlockVerifyLint(lintCheck)
  // 摩擦计数（friction-signal-hint task-03）：记录条件与 throw 条件**刻意解耦**——advisory 档
  // lint 失败（SILLYSPEC_VERIFY_LINT_GATE=advisory 时不 throw）同样是摩擦信号，计数不应随
  // 逃生阀漂移。recordFrictionEvent 自带静默降级，不影响本步推进/throw 语义。
  if (testFailed || lintCheck.status === 'failed') {
    await recordFrictionEvent({ cwd, changeName, platformOpts, type: 'verify_run_failed', detail: testFailed ? 'test' : 'lint' })
  }
  if (testFailed || lintBlocked) {
    if (snap) {
      try { const { printSnapshotFailureHint } = await import('./gate-snapshot.js')
        printSnapshotFailureHint(snap) } catch { /* 提示失败不影响阻断 */ }
    }
    const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
    await renderVerifyTestAttribution({ cwd, changeName, specBase, runtimeRoot })
    const which = testFailed ? '测试' : 'lint'
    throw new Error(`noAI 质量扫描实测${which}失败——本步骤未完成（进度不推进）。输出与归因提示见上方；修复后重跑 sillyspec run verify${changeName ? ` --change ${changeName}` : ''} 复入本步重新实测。`)
  }
  console.log(`\n✅ noAI 质量扫描全绿——本步骤自动完成；--done 对账将复用本次实测（代码变更即失配重测）。机械事实持续全绿时，verify-probes --init 会预填 PASS 结论草稿（草稿待确认，复核后可改写）。`)
}

/**
 * 结论草稿评估（前置三）：机械事实全绿才返回 draft='PASS'；任一不绿返回 { draft: null, reasons }
 * （reasons 逐条列出未预填依据，console 呈现给 agent——预填缺席也要可解释，不静默）。
 * 判定面：①指纹匹配的 noAI 实测（skip ≠ 实测，不预填）②lint 非 failed（未配置=中性绿）
 * ③探针 1 零命中 ④探针 3 有任务且全 hasTest/located ⑤探针 5 零缺口 ⑥探针 6 零删除
 * （有删除一律留人工判定，保守）⑦风险等级非 integration/deployment-critical（那两级
 * 需集成回执 + Runtime Evidence 人工链，草稿无从预填）。gate 判定链不经本函数。
 */
export function evaluateConclusionDraft({ cwd, specBase, changeName, changeDir, probesResult }) {
  const reasons = []
  const reuse = loadReusableQualityScan({ specBase, cwd, changeName })
  if (!reuse) {
    return { draft: null, reasons: ['无指纹匹配的 noAI 实测记录（未跑质量扫描步 / 代码已变 / git 不可用）'] }
  }
  const t = reuse.testResult
  if (t.status === 'skipped') {
    reasons.push(`测试按策略跳过（${t.reason ? String(t.reason).slice(0, 80) : 'test_strategy'}）——结论缺客观测试核验，不预填`)
  } else if (t.status !== 'passed') {
    reasons.push(`测试实测状态 ${t.status}，不预填`)
  }
  const lint = reuse.lintResult
  if (lint && lint.status === 'failed') {
    reasons.push(`lint 实测失败（${lint.reason || '退出码非 0'}），不预填`)
  }
  const probes = probesResult || {}
  const p1 = (probes.probe1 && probes.probe1.matches) || []
  if (p1.length > 0) reasons.push(`探针 1 命中 ${p1.length} 处未实现标记`)
  const p3tasks = (probes.probe3 && probes.probe3.tasks) || []
  if (p3tasks.length === 0) {
    reasons.push('探针 3 未解析到任务（无测试覆盖账），不预填')
  } else {
    const noTest = p3tasks.filter((x) => !x.hasTest).map((x) => x.task)
    if (noTest.length > 0) reasons.push(`探针 3 测试缺失：${noTest.join('、')}`)
    const unlocated = p3tasks.filter((x) => !x.located).map((x) => x.task)
    if (unlocated.length > 0) reasons.push(`探针 3 模块目录未定位：${unlocated.join('、')}`)
  }
  const p5 = (probes.probe5 && probes.probe5.missingBackend) || []
  if (p5.length > 0) reasons.push(`探针 5 API 契约缺口 ${p5.length} 项`)
  const p6 = (probes.probe6 && probes.probe6.deletions) || []
  if (p6.length > 0) reasons.push(`探针 6 删除对账 ${p6.length} 项（待人工判定）`)
  try {
    const designPath = join(changeDir || '', 'design.md')
    const planPath = join(changeDir || '', 'plan.md')
    const designContent = existsSync(designPath) ? readFileSync(designPath, 'utf8') : ''
    const planContent = existsSync(planPath) ? readFileSync(planPath, 'utf8') : ''
    const risk = detectChangeRisk({ designContent, planContent, changedFiles: [] })
    if (risk && (risk.level === 'integration-critical' || risk.level === 'deployment-critical')) {
      reasons.push(`风险等级 ${risk.level}——需集成证据链（回执槽 + Runtime Evidence），不预填`)
    }
  } catch (e) {
    reasons.push(`风险判级异常（${e && e.message ? e.message : e}）——保守不预填`)
  }
  if (reasons.length > 0) return { draft: null, reasons }
  return { draft: 'PASS', reasons }
}
