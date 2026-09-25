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
 *   5. smoke 亲跑执行段（2026-09-17-api-coverage-smoke task-01 / FR-01）：commands.smoke
 *      显式配置才执行（300s 超时帽／快照内超时回退主仓复跑一次），stdout+stderr tee 实录落
 *      .runtime/verify-logs/smoke-<change>.log；失败/超时只记 additive smokeResult 失败态
 *      **不 throw**（封顶信号归 --done PASS 封顶消费，非崩溃——与 test failed 的 throw 语义
 *      刻意区分）。指纹已含 commands 段原文——配置 smoke 前后指纹自动变化，代码未变不重跑。
 */
import { createHash } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { writeAtomicSync } from '../fs-atomic.js'
import { gitQuiet } from '../git-helper.js'
import { resolveRuntimeRoot, parsePorcelainPath } from './shared.js'
import { computeEnvProfile, computeTestFaceDigest } from './test-ledger.js'
import { resolveChangeRisk, extractExplicitRiskLevel } from '../change-risk-profile.js'
import { loadBlastDeclarationsAllProjects } from '../blast-surface.js'
import { parseFileChangeListDetailed } from '../change-list.js'
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
 * smokeResult（2026-09-17-api-coverage-smoke task-01）为 additive 段：RECORD_SCHEMA_VERSION
 * 保持 1——存量记录无 smoke 段照常读回（smokeResult 兜底 null）；未配置 smoke 时段形态为
 * configured=false（记录仍写，供 --done PASS 封顶判 not-configured）。
 */
export function storeQualityScan({ specBase, cwd, changeName, testResult, lintResult, smokeResult, usedSnapshot = false }) {
  const path = qualityScanRecordPath(specBase, changeName)
  if (!path) return null
  const fingerprint = computeQualityScanFingerprint({ cwd, specBase })
  const dedupKey = computeQualityScanDedupKey({ cwd, specBase, fingerprint })
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeAtomicSync(path, JSON.stringify({
      schemaVersion: RECORD_SCHEMA_VERSION,
      source: 'cli-noai',
      change: changeName,
      fingerprint,
      // 失败签名去重面（ql-20260920-010 修复一 d）：additive 字段，存量记录无这两键 →
      // shouldReuseLastFailedScan 判 no-dedup-key 保守重跑一次，之后新记录即携带
      dedupKey,
      // RERUN 失败签名（r5l 方案 4）：dedupKey × 测试面 × 环境探针；同样 additive——存量
      // 记录无此键 → RERUN 签名闸判无签名放行一次（同 no-dedup-key 先例口径）
      rerunSignature: computeRerunSignature({ cwd, specBase, dedupKey, env: process.env }),
      usedSnapshot: Boolean(usedSnapshot),
      ranAt: new Date().toISOString(),
      testResult,
      lintResult: lintResult || null,
      smokeResult: smokeResult || null,
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
 * 复用条件只判 testResult（smoke 段随整条记录复用，additive 读回 smokeResult）。
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
    return { testResult: rec.testResult, lintResult: rec.lintResult || null, smokeResult: rec.smokeResult || null, ranAt: rec.ranAt || null, fingerprint: fp }
  } catch {
    return null
  }
}

/**
 * 去重键（ql-20260920-010 修复一 d，对撞三轮三连假红重试 8~10 分钟×3 的根治）：
 * 指纹 + known_failures 块哈希。指纹只哈希 commands 段 + test_strategy 行——不含
 * known_failures；而 agent 对假红的常见补救正是加豁免条目（不改代码、指纹不动）。
 * 去重若只看指纹会把「合法补救后复跑」误判成「什么都没改」而拒绝重跑——键独立补
 * 豁免面哈希，豁免一动即失配。git 不可用 → null（fail-closed 同指纹口径）。
 */
export function computeQualityScanDedupKey({ cwd, specBase, fingerprint = null }) {
  const fp = fingerprint ?? computeQualityScanFingerprint({ cwd, specBase })
  if (!fp) return null
  let kf = 'none'
  try {
    const localPath = join(specBase, 'local.yaml')
    if (existsSync(localPath)) {
      const lines = readFileSync(localPath, 'utf8').replace(/\r\n?/g, '\n').split('\n')
      const start = lines.findIndex((l) => /^\s*known_failures:\s*(#.*)?$/.test(l))
      if (start !== -1) {
        const body = []
        for (let i = start + 1; i < lines.length && !/^\S/.test(lines[i]); i++) body.push(lines[i])
        kf = body.join('\n')
      }
    }
  } catch { /* 读不到按无豁免面处理 */ }
  return createHash('sha256').update(fp + '\n##known-failures##\n' + kf).digest('hex')
}

/**
 * RERUN 失败签名（r5l-forensic-verdict.md 方案 4 / 评审护栏#6）：dedupKey（代码指纹 ×
 * known_failures 豁免面）× 测试面 × 环境探针 三路合成，供 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1
 * 生效前对账——签名未变则拒绝重跑（重跑结果注定相同，R5-L 两次强制重扫各烧 ~8M+10m 的根治）。
 *
 * 环境必须入键（护栏#6 五态之「环境变放行」）：环境真变（探针换值）签名才失配，RERUN=1 才
 * 不会被假拒漏真拦。探针复用 test-ledger computeEnvProfile 同源实现，但剔除
 * SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN 自身——被测旋钮不是环境（原样入键 = RERUN=1 与历史
 * 记录恒失配，闸门永不触发）。测试面同理复用 computeTestFaceDigest（test/ 读不到按
 * 'unavailable' 入键——代码指纹的 HEAD+非文档脏集仍覆盖已提交/未提交的测试文件变更）。
 *
 * 任一 fail 分量不可得 → null：签名闸 fail-open（拒跑是危险方向——算不出签名就放行重跑，
 * 宁可多跑一次不可漏真拦；与复用判定的 fail-closed 方向刻意相反）。
 */
export function computeRerunSignature({ cwd, specBase, dedupKey = null, env = process.env }) {
  const dedup = dedupKey ?? computeQualityScanDedupKey({ cwd, specBase })
  if (!dedup) return null
  let testFace = 'unavailable'
  try {
    const face = computeTestFaceDigest(join(cwd, 'test'))
    if (face !== null) testFace = face
  } catch { /* 测试面读不到 → unavailable 兜底入键 */ }
  const profile = computeEnvProfile({ cwd, env })
  if (!profile) return null
  if (profile.behaviorEnv) delete profile.behaviorEnv.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
  return createHash('sha256')
    .update(dedup + '\n##test-face##\n' + testFace + '\n##env-probe##\n' + JSON.stringify(profile))
    .digest('hex')
}

/**
 * 读回最近一条扫描记录（不论成败）——失败去重重放用。loadReusableQualityScan 拒绝
 * failed 记录（复用是优化不是正确性依赖），去重恰恰要消费 failed 态；schema/source/
 * testResult 校验同 load 口径，读不回 → null。
 */
export function loadLastQualityScanRecord({ specBase, changeName }) {
  const path = qualityScanRecordPath(specBase, changeName)
  if (!path || !existsSync(path)) return null
  try {
    const rec = JSON.parse(readFileSync(path, 'utf8'))
    if (!rec || rec.schemaVersion !== RECORD_SCHEMA_VERSION || rec.source !== 'cli-noai') return null
    if (!rec.testResult || !rec.testResult.status) return null
    return rec
  } catch {
    return null
  }
}

/**
 * 失败签名去重判定（纯函数）。reuse=true 语义：代码指纹 + 豁免面 + 快照口径均未变 →
 * 上次失败必然原样复现，重跑是纯等待浪费。四路不重跑：forceRerun 逃生阀 / 无失败记录 /
 * 存量记录无 dedupKey（本版起才有，老记录保守重跑一次）/ 键或口径失配。
 */
export function shouldReuseLastFailedScan({ lastRecord, currentDedupKey, plannedSnapshot, forceRerun = false }) {
  if (forceRerun) return { reuse: false, reason: 'force-rerun（逃生阀 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN）' }
  if (!lastRecord || !lastRecord.testResult || lastRecord.testResult.status !== 'failed') {
    return { reuse: false, reason: 'no-failed-record' }
  }
  if (!lastRecord.dedupKey || !currentDedupKey) return { reuse: false, reason: 'no-dedup-key（存量记录 / git 不可用）' }
  if (lastRecord.dedupKey !== currentDedupKey) return { reuse: false, reason: 'dedup-key-mismatch（代码/配置/豁免面/HEAD 已变化）' }
  if (Boolean(lastRecord.usedSnapshot) !== Boolean(plannedSnapshot)) return { reuse: false, reason: 'snapshot-scope-changed' }
  return { reuse: true, reason: null }
}

/**
 * 伪影分诊编排（ql-20260920-010 修复一 a）：测试失败 → classify 分类 → 命中且本次是
 * 快照口径 → 主树口径单点复跑对照。复跑过 = 伪影坐实：返回主树结果 + artifactTriage
 * 证据（放行有据，disclosure 走 console + 台账，不改 passed.reason 语义）；复跑仍挂 =
 * 真失败：保留快照失败结果 + 两口径对照注记（拦截照常，归因已对照过）。主树口径失败
 * （snap=null）只注记 advice 不复跑（本身就是对照口径）。classify/rerunInMainScope
 * 可注入——纯函数化供测试；分诊永不单独放行（放行必经主树实测复证）。
 */
export function applyArtifactTriageRerun({ testCheck, classify, snap, rerunInMainScope }) {
  if (!testCheck || testCheck.status !== 'failed') return testCheck
  const triage = classify(testCheck)
  if (!triage || !triage.matched) return testCheck
  if (!snap) {
    console.warn(`🔬 伪影分诊命中（${triage.kind}，本次已主树口径）：${triage.advice}`)
    return { ...testCheck, reason: `${testCheck.reason || ''}［伪影分诊命中（${triage.kind}）：${triage.advice}］`, artifactTriage: triage }
  }
  console.warn(`🔬 伪影分诊命中（${triage.kind}）——快照口径失败疑似沙箱伪影，主树口径单点复跑对照…`)
  for (const ev of triage.evidence) console.warn(`   · ${ev}`)
  const mainRetry = rerunInMainScope()
  if (mainRetry.status === 'passed') {
    console.warn('   主树复跑通过——伪影坐实：按主树口径结果放行（快照失败输出与分诊证据随台账落盘）')
    return { ...mainRetry, artifactTriage: triage }
  }
  console.warn('   主树复跑仍失败——非沙箱伪影，按真失败拦截（两口径输出均见台账）')
  return { ...testCheck, reason: `${testCheck.reason || ''}［伪影分诊：两口径（快照/主树）均失败，非沙箱伪影］`, artifactTriage: triage }
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
              console.error(`   ℹ️ 归因提示②：本变更有 ${actionable.length} 个文件与主仓最近 10 条提交重叠且旧内容仍在工作区（${actionable.slice(0, 5).join(', ')}${actionable.length > 5 ? ' 等' : ''}）——若为生成产物（类型生成/代码生成产物等），本变更可能在旧基线生成并覆盖了已合入内容；先在新基线重跑生成命令再复验。（重叠共 ${overlap.length} 个，其余未在工作区改动或属他者会话在途文件，已归提示①/无需处理）`)
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
    execSync(covCmd.trim(), { cwd, encoding: 'utf8', timeout: 10 * 60 * 1000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
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


// ── smoke 亲跑执行段（2026-09-17-api-coverage-smoke task-01，FR-01 / D-001@v1 / D-010@v1）──
// 300s 超时帽与 gate-snapshot.js runGateSnapshotCommands 同款（300_000 先例）。
const SMOKE_TIMEOUT_MS = 300_000

/**
 * 从 local.yaml 文本提取 commands.smoke。
 * 与 extractTestCommand 同风格同容错（带引号/不带引号；'unavailable' 视为未配置——
 * 未配置/unavailable 口径对齐 coverage 先例：执行段休眠，记录 configured=false）。
 * 模块内私有（runSmokeCheck 消费）。
 */
function extractSmokeCommand(yamlText) {
  if (!yamlText) return null
  const doubleQuoted = yamlText.match(/^\s*smoke:\s*"([^"]+)"\s*(?:#.*)?$/m)
  const singleQuoted = yamlText.match(/^\s*smoke:\s*'([^']+)'\s*(?:#.*)?$/m)
  const quoted = doubleQuoted || singleQuoted
  if (quoted && quoted[1]) {
    return quoted[1].toLowerCase() === 'unavailable' ? null : quoted[1].trim()
  }
  // bare 值不排除引号字符（extractTestCommand 坑 verify-bare-quote-miss 同款修正）：
  // 全引号形态已被上方 quoted 分支先行消费，此处引号只可能是嵌在值中部的。
  const bare = yamlText.match(/^\s*smoke:[ \t]*([^\n#]+?)[ \t]*(?:#.*)?$/m)
  if (bare && bare[1]) {
    const cmd = bare[1].trim()
    return cmd.toLowerCase() === 'unavailable' ? null : cmd
  }
  return null
}

/** spawnSync 结果的超时判定（gate-snapshot.js runGateSnapshotCommands 同款口径）。 */
function isSyncTimeout(r) {
  return Boolean(r && r.error && (r.error.code === 'ETIMEDOUT' || /ETIMEDOUT/i.test(String(r.error.message || ''))))
}

/**
 * noAI smoke 亲跑：local.yaml 显式配置 commands.smoke 才执行（detect 不自动写，缺省零行为）。
 * 命令脚本自理服务生命周期（后台起服+轮询就绪+finally 杀），CLI 只施加 300s 超时帽并 tee
 * 实录 stdout+stderr 落 .runtime/verify-logs/smoke-<change>.log。失败语义与 test/lint 刻意
 * 区分：非零退出/超时只记 smokeResult 失败态**不 throw**（封顶信号非崩溃——PASS 封顶消费
 * 归 --done 第五条件 / task-03），本步推进语义不动。快照内超时 → 主仓 cwd 复跑一次
 * （lint 快照超时回退同款策略：junction I/O 病态慢时保实测不假败）。
 * 返回纯 JSON 可序列化（落进质量扫描记录 additive smokeResult 段）。
 */
function runSmokeCheck({ gateCwd, mainCwd, specBase, changeName, inSnapshot }) {
  const ranAt = new Date().toISOString()
  let yamlText = null
  try { yamlText = readFileSync(join(specBase, 'local.yaml'), 'utf8') } catch { /* 无 local.yaml → 未配置 */ }
  const command = extractSmokeCommand(yamlText)
  if (!command) {
    return {
      configured: false, status: 'skipped', command: null,
      exitCode: null, durationMs: null, logPath: null, ranAt,
      timeout: false, fallbackMainRepo: false, source: 'cli-noai-smoke',
      reason: yamlText ? '未配置 commands.smoke（或标记 unavailable）——执行段跳过（配置后 verify 自动亲跑）' : `local.yaml 不可读（${join(specBase, 'local.yaml')}）`,
    }
  }
  const startedAt = Date.now()
  let r = null
  let spawnError = null
  try {
    r = spawnSync(command, { shell: true, cwd: gateCwd, timeout: SMOKE_TIMEOUT_MS, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true })
  } catch (e) { spawnError = e }
  let timedOut = isSyncTimeout(r)
  let fallbackMainRepo = false
  let ranCwd = gateCwd
  // 快照内超时回退主仓复跑一次（lint 快照超时回退先例同款策略，主仓复跑保实测不假败）
  if (inSnapshot && timedOut) {
    fallbackMainRepo = true
    console.warn('⚠️ 快照 smoke 超时（node_modules junction I/O 慢）→ 主仓复跑 smoke（并行噪声可能混入——失败先做归属鉴定）')
    try {
      r = spawnSync(command, { shell: true, cwd: mainCwd, timeout: SMOKE_TIMEOUT_MS, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true })
      spawnError = null
      ranCwd = mainCwd
      timedOut = isSyncTimeout(r)
    } catch (e) { spawnError = e; timedOut = false }
  }
  const durationMs = Date.now() - startedAt
  const exitCode = r && typeof r.status === 'number' ? r.status : null
  const failed = timedOut || Boolean(spawnError) || (r ? r.status !== 0 : true)
  const reason = timedOut
    ? `超时（>300s 帽${fallbackMainRepo ? '，主仓复跑仍超时' : ''}）`
    : spawnError
      ? `spawn 异常：${spawnError.message || spawnError}`
      : (exitCode !== 0 ? `smoke 命令退出码 ${exitCode}` : null)
  // log 实录落盘（fail-soft：写失败只 warn 置 logPath=null，不影响判定与步骤推进）
  let logPath = null
  if (changeName) {
    try {
      const logDir = join(specBase, '.runtime', 'verify-logs')
      mkdirSync(logDir, { recursive: true })
      logPath = join(logDir, `smoke-${changeName}.log`)
      const head = [
        '# smoke 实录（source: cli-noai-smoke）',
        `# command: ${command}`,
        `# cwd: ${ranCwd}${fallbackMainRepo ? '（快照超时回退主仓）' : ''}`,
        `# ranAt: ${ranAt}   durationMs: ${durationMs}   timeout: ${timedOut}`,
        `# exitCode: ${exitCode === null ? '（无——spawn 异常/被信号杀）' : exitCode}`,
        '---- stdout + stderr ----',
      ].join('\n')
      writeFileSync(logPath, `${head}\n${String(r && r.stdout || '')}${String(r && r.stderr || '')}\n`)
    } catch (e) {
      logPath = null
      console.warn(`⚠️  smoke 实录 log 落盘失败（fail-soft，判定不受影响）: ${e && e.message ? e.message : e}`)
    }
  }
  return {
    configured: true, status: failed ? 'failed' : 'passed', command,
    exitCode, durationMs, logPath, ranAt,
    timeout: timedOut, fallbackMainRepo, source: 'cli-noai-smoke',
    reason,
  }
}

/** smoke 结果一行报告（语义边界内建：失败=封顶信号非崩溃，不阻断本步） */
function renderSmokeReport(s) {
  if (!s || !s.configured) {
    return `ℹ️  smoke 冒烟：${s && s.reason ? s.reason : '未配置 commands.smoke'}`
  }
  const logNote = s.logPath ? `——实录 ${s.logPath}` : ''
  if (s.status === 'passed') {
    return `✅ smoke 冒烟通过（exit 0，${s.durationMs}ms${s.fallbackMainRepo ? '；快照超时已回退主仓复跑' : ''}）${logNote}`
  }
  return `⚠️ smoke 冒烟失败（${s.reason || `退出码 ${s.exitCode}`}）——记失败态不阻断本步（PASS 封顶信号，--done 消费）${logNote}`
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
  const { runVerifyTestCheck, printVerifyTestCheck, runVerifyLintCheck, printVerifyLintCheck, shouldBlockVerifyLint, classifyTestFailureArtifact } = await import('../verify-postcheck.js')
  // ── RERUN 失败签名闸（r5l-forensic-verdict.md 方案 4 / 评审护栏#6 五态）──
  // R5-L 实证：RERUN=1 两次强制重扫各烧 ~8M 重发 + 10m/6.8m 等待，而失败签名未变——重跑
  // 结果注定相同。故 RERUN=1 生效前先对账失败签名（dedupKey 已含代码指纹×豁免面，再叠测试
  // 面×环境探针）：未变 → 拒绝重跑（throw=退出码非 0）；环境真变（探针入键）/代码/豁免/测试
  // 面变化 → 签名失配自动放行；RERUN=force 无条件放行（真·逃生阀，旧 RERUN=1 的裸语义移到
  // 此档）。RERUN 未设时本闸不参与——下方既有 dedup 复用判定与 fail-closed 语义一行不动。
  const rerunMode = process.env.SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN
  if (rerunMode === 'force') {
    console.log('ℹ️ SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=force——无条件强制重跑（RERUN 签名闸与失败签名去重均旁路）')
  } else if (rerunMode === '1') {
    const lastRecord = loadLastQualityScanRecord({ specBase, changeName })
    const lastSig = lastRecord ? lastRecord.rerunSignature : null
    const lastFailed = lastRecord && lastRecord.testResult && lastRecord.testResult.status === 'failed'
    if (lastFailed && lastSig) {
      const sig = computeRerunSignature({ cwd, specBase })
      if (sig && sig === lastSig) {
        const t = lastRecord.testResult
        console.error(`\n🛑 RERUN 签名闸：上次质量扫描失败且失败签名未变（代码指纹 / known_failures 豁免面 / 测试面 / 环境探针均未变${lastRecord.ranAt ? '，上次运行 ' + lastRecord.ranAt : ''}）——重跑结果注定相同，拒绝重跑：`)
        console.error(`   上次实测：\`${t.command}\` — ${(t.reason || '').split('\n')[0]}`)
        if (t.outputTail) {
          for (const line of t.outputTail.split('\n').slice(-8)) console.error(`   | ${line}`)
        }
        console.error('   出路（按序）：① 修代码（指纹即失配，下次自动重测）② 补 known_failures 豁免（豁免面即失配）③ 换快照口径（设/删 SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF，口径变化即失配）④ 环境确已修好后强制重跑：SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1（环境探针已入失败签名——环境真变即自动放行；仍被拒=探针未见变化，确要无条件重跑用 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=force）')
        throw new Error(`RERUN 签名闸拒绝重跑（失败签名未变：代码指纹×测试面×环境探针全等）——${(t.reason || '测试失败').split('\n')[0]}。按上方出路处置；确要无条件重跑设 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=force。`)
      }
    } else if (lastFailed) {
      console.log('ℹ️ RERUN=1：上次失败记录无 rerunSignature（存量记录）——签名闸放行一次，本次重跑后新记录即携带签名')
    } else {
      console.log('ℹ️ SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1——强制重跑（上次无失败记录在案，签名闸无事可对）')
    }
  }
  // ── 失败签名去重（ql-20260920-010 修复一 d）──
  // 复入本步前先对账上次失败：代码指纹 + known_failures 豁免面 + 快照口径都没变 → 失败
  // 必然原样复现，重跑是纯等待（对撞三轮三连 8~10 分钟假红重试的根治）。复用只消费
  // failed 态记录（passed 态 --done 复用归 loadReusableQualityScan），逃生阀
  // SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1（闸门见上方签名闸）与 =force（无条件旁路）。
  if (rerunMode !== '1' && rerunMode !== 'force') {
    const lastRecord = loadLastQualityScanRecord({ specBase, changeName })
    const verdict = shouldReuseLastFailedScan({
      lastRecord,
      currentDedupKey: computeQualityScanDedupKey({ cwd, specBase }),
      plannedSnapshot: !process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF,
    })
    if (verdict.reuse) {
      const t = lastRecord.testResult
      console.error(`\n🛑 检测到上次质量扫描失败且失败签名未变（代码指纹 / known_failures 豁免面 / 快照口径均未变，${lastRecord.ranAt ? '上次运行 ' + lastRecord.ranAt : ''}）——本次跳过重跑，直接复用上次失败结果：`)
      console.error(`   上次实测：\`${t.command}\` — ${(t.reason || '').split('\n')[0]}`)
      if (t.outputTail) {
        for (const line of t.outputTail.split('\n').slice(-8)) console.error(`   | ${line}`)
      }
      const replayTriage = classifyTestFailureArtifact(t)
      if (t.artifactTriage) {
        console.error(`   🔬 上次已做过伪影分诊（${t.artifactTriage.kind}）且主树对照复跑仍失败——非沙箱伪影，别再换口径重试`)
      } else if (replayTriage.matched) {
        console.error(`   🔬 失败签名命中伪影形态（${replayTriage.kind}）：${replayTriage.advice}`)
        console.error('      （上次运行早于分诊机制——本次重跑会自动做主树口径对照；如需立即重跑设 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1）')
      }
      console.error('   出路（按序）：① 修代码（指纹即失配，下次自动重测）② 补 known_failures 豁免（豁免面即失配）③ 换快照口径（设/删 SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF，口径变化即失配）④ 环境确已修好后强制重跑：SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1（环境探针已入失败签名——环境真变即放行；仍被拒用 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=force）')
      throw new Error(`noAI 质量扫描复用上次失败结果（失败签名未变，跳过重跑）——${(t.reason || '测试失败').split('\n')[0]}。修复后重跑 sillyspec run verify${changeName ? ` --change ${changeName}` : ''}，或按上方出路处置。`)
    }
  }
  // ── 隔离快照定向跑（2026-09-11 驾驭第十二批，用户第三次撞上：noAI 质量扫描是 verify 的
  // 第一实测执行点，第八批只接了 gates.js verify 块——本步仍跑 main 工作区，并行 WIP 在此弄红
  // 无辜变更）。与 gates.js 同款：createVerifyGateSnapshot（HEAD + 本变更文件集，native worktree
  // 定向源），ENV 同 SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF，基建失败 fallback 主仓 + 脏文件在场时
  // ⚠️ 口径可见。指纹（storeQualityScan）仍按主仓 cwd 算——--done 对账复用的指纹匹配口径不变。
  let snap = null
  if (!process.env.SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF) {
    // worktree 会话跳快照（2026-09-23 R9/R10 根治）：worktree 已是会话独占隔离——快照只剩
    // venv junction 冻结/慢 I/O 纯成本（R9 3MB/0CPU 冻结、R10 15min 慢跑实证），直接工作树实测。
    let skipForWorktree = false
    try {
      const { shouldSkipGateSnapshotForWorktree } = await import('./gate-snapshot.js')
      skipForWorktree = shouldSkipGateSnapshotForWorktree(cwd)
    } catch { /* 判定异常按不跳走原路 */ }
    if (skipForWorktree) {
      console.log('🔀 cwd 是会话专属 worktree——隔离快照冗余（并行会话不在场；快照 venv junction 冻结/慢 I/O 面 R9/R10 双实证），直接在 worktree 实测')
    } else {
    try {
      const { createVerifyGateSnapshot } = await import('./gate-snapshot.js')
      snap = await createVerifyGateSnapshot({ cwd, changeName, specBase, platformOpts })
      if (snap) {
        console.log(`🧪 noAI 扫描隔离快照（根：${snap.snapshotRoot}）：HEAD + 本变更 ${snap.changeFileCount} 个文件${snap.sourceRoot ? '（overlay 自 worktree——本变更分支内容定向跑）' : ''}（并行会话脏文件不参与判定）`)
      }
    } catch { /* 快照链路异常 → 主仓现行为 */ }
    }
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
  let smokeResult = null
  try {
    testCheck = runVerifyTestCheck({ cwd: gateCwd, specBase: gateSpecBase, changeName })
    // ── 伪影分诊（ql-20260920-010 修复一 a）：失败先分诊，命中 → 主树口径单点复跑对照 ──
    testCheck = applyArtifactTriageRerun({
      testCheck,
      classify: classifyTestFailureArtifact,
      snap,
      rerunInMainScope: () => runVerifyTestCheck({ cwd, specBase, changeName }),
    })
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
  // smoke 亲跑（2026-09-17-api-coverage-smoke task-01 / FR-01）：commands.smoke 配置才执行
  // ——失败记失败态不 throw（与 test failed 的 throw 语义刻意区分：封顶信号非崩溃，PASS
  // 封顶消费归 --done 第五条件 / task-03）。在快照 cleanup 前跑（cwd=gateCwd 隔离快照内），
  // 配置从主仓 local.yaml 读（与 coverage 同口径）；未配置一行 ℹ️（coverage 同款噪音面）。
  try {
    smokeResult = runSmokeCheck({ gateCwd, mainCwd: cwd, specBase, changeName, inSnapshot: Boolean(snap) })
    console.log(renderSmokeReport(smokeResult))
  } catch (e) {
    console.warn(`⚠️  smoke 冒烟执行异常（fail-soft，不影响本步推进）: ${e && e.message ? e.message : e}`)
  }
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
  storeQualityScan({ specBase, cwd, changeName, testResult: testCheck, lintResult: lintCheck, smokeResult, coverageCheck, usedSnapshot: Boolean(snap) })
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
    // 2026-09-19-ceremony-pricing-five-cuts task-03：声明面判级（design 文件清单 × blast 声明 + explicit；
    // evidenceRequired → 集成证据链不预填——level 兼容字段为 integration-critical）
    const designPath = join(changeDir || '', 'design.md')
    const designContent = existsSync(designPath) ? readFileSync(designPath, 'utf8') : ''
    const declaredFiles = parseFileChangeListDetailed(designPath, { keepSillyspecDocs: true }).map(e => e.path)
    const blastDeclarations = loadBlastDeclarationsAllProjects({ specBase: specBase || dirname(dirname(dirname(designPath))) })
    const risk = resolveChangeRisk({ files: declaredFiles, blastDeclarations, explicitRiskLevel: designContent ? extractExplicitRiskLevel(designContent) : null })
    // 否决面＝evidence:true 命中 或 agent 显式自报 critical（诚实承认集成风险 → 不代笔 PASS 草稿；
    // explicit 低档声明不豁免 evidence 命中，D-009）
    if (risk && (risk.evidenceRequired || (risk.explicit && risk.tier === 'S3'))) {
      reasons.push(risk.evidenceRequired
        ? `命中 evidence:true 声明危险面（${risk.hitPrefixes.join('、')}）——需集成证据链（回执槽 + Runtime Evidence），不预填`
        : `显式自报 risk_level=integration-critical（tier=${risk.tier}）——需集成证据链（回执槽 + Runtime Evidence），不预填`)
    }
  } catch (e) {
    reasons.push(`风险判级异常（${e && e.message ? e.message : e}）——保守不预填`)
  }
  if (reasons.length > 0) return { draft: null, reasons }
  return { draft: 'PASS', reasons }
}
