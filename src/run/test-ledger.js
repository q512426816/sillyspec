/**
 * test-ledger.js — 测试结果三键指纹账本（P2 / FR-02 / D-001@v1，2026-09-21-r5-efficiency-batch3）
 *
 * 背景（batch2 归档实证）：全量测试 ~100s/次，一个收尾事务跑 7 次（必要 2-3 次）；agent 因怕被
 * --done 拦而恐惧性预跑。本模块按「三键全等才复用」提供 fail-closed 结果账本，消费点=gate
 * verify 的 verify-test / quick --done 实测门 / gate --full（P1）。
 *
 * **fail-closed 三层（红线，D-001@v1）**：
 *   ① 键分量不可得（git 失败/测试面读不到）→ 不记不复用，永远真跑；
 *   ② 失败结果永不缓存——只有通过的结果才落账本（失败走真跑修复路径，缓存失败=假绿源）；
 *   ③ 严格全等——key 为三键分量的 sha256 串比对，无模糊匹配、无时间窗放宽。
 *
 * **三键定义**：
 *   - codeFingerprint：{ head, dirtyDigest }——HEAD commit + porcelain 未提交摘要（路径+内容
 *     hash 归一）。与 verify-quality-scan 的代码指纹同思想（P0-1 先例），本模块独立实现不耦合
 *     （quality-scan 是 noAI 步→verify 门单向，本账本多消费点）。
 *   - testSetHash：{ command, testFaceDigest }——测试命令串 + 测试面（test/ 目录文件清单+内容
 *     摘要）。测试文件本身也是代码，改测试=改被测面，必须换键。
 *   - envProfile：结构化探针（布尔/枚举，**禁裸路径入键**）。探针清单不是拍脑袋列举——
 *     cwdInsideWorktree 用 detectCwdInsideWorktree 同源判定（batch2 实证：13 个 worktree-cwd
 *     环境族测试在主 worktree 全挂、在隔离快照全过，其判定信号就是「cwd 路径含
 *     .sillyspec/.runtime/worktrees/<change> 段」——探针必须捕获该信号，worktree 与主仓天然
 *     分键）；另收 node 版本/平台名/行为开关 env 集（SILLYSPEC_STEP_GUIDE 等，P4 翻默认后
 *     直接影响输出形态族）/本地 spec 与平台指针存在性（resolveRuntimeRoot 分流信号）。
 *
 * 账本形态：.runtime/test-ledger-<changeName>.json 单条覆盖写（最近一次通过结果）——
 * quick 会话名=quick-<hex> 天然 per-change 隔离，无并发互写面；写入走 writeAtomicSync
 * （meta.json 并发读先例同款约束）。
 */
import { createHash } from 'crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, isAbsolute } from 'path'
import { gitQuiet } from '../git-helper.js'
import { detectCwdInsideWorktree } from './shared.js'
import { writeAtomicSync } from '../fs-atomic.js'

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

/** 行为开关 env 集（影响测试结果的 SILLYSPEC_* 键——P4 翻默认后 STEP_GUIDE 直接改 stdout 形态） */
const BEHAVIOR_ENV_KEYS = [
  'SILLYSPEC_STEP_GUIDE',
  'SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF',
  'SILLYSPEC_QUICK_TEST_GATE',
  'SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN',
]

/**
 * 环境探针（键分量③）。任何探针异常 → 整体 null（fail-closed 层①）。
 * @returns {object|null} 结构化探针（JSON 稳定序参与 key）
 */
export function computeEnvProfile({ cwd = process.cwd(), env = process.env } = {}) {
  try {
    const profile = {
      cwdInsideWorktree: detectCwdInsideWorktree(cwd) !== null, // 13 环境族测试的真实判定信号（同源）
      hasLocalSpec: existsSync(join(cwd, '.sillyspec')),
      hasPlatformPointer: existsSync(join(cwd, '.sillyspec-platform.json')),
      nodeVersion: process.version,
      platform: process.platform,
      behaviorEnv: BEHAVIOR_ENV_KEYS.reduce((acc, k) => {
        acc[k] = env[k] === undefined ? null : String(env[k])
        return acc
      }, {}),
    }
    return profile
  } catch { return null }
}

/**
 * 代码指纹（键分量①）：{ head, dirtyDigest }。git 不可达/HEAD 解析失败 → null（fail-closed）。
 * dirtyDigest = porcelain（含 untracked）行集的排序摘要——任何未提交变化换键。
 * ignoreFiles：账本自身路径（runtimeRoot 在仓内时）——**排除自污染**：记账写文件会改
 * porcelain，若不排除，落账瞬间键即漂移、下次查询永 mismatch（自毁键，测试 L1 实证）。
 * @returns {{ head: string, dirtyDigest: string }|null}
 */
export function computeCodeFingerprint(projectRoot, { ignoreFiles = [] } = {}) {
  try {
    const head = gitQuiet(projectRoot, ['rev-parse', 'HEAD'])
    if (!head) return null
    const status = gitQuiet(projectRoot, ['status', '--porcelain'])
    if (status === null) return null
    const ignore = new Set(ignoreFiles)
    const lines = status.split('\n').filter(Boolean)
      .filter(l => {
        const p = l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')
        // 两种命中：精确路径（展开的 untracked/已跟踪文件）与目录前缀（git 折叠整棵未跟踪
        // 目录成 `?? dir/` 一行——排除须向下匹配；账本自污染实测形态，测试 L1）
        if (ignore.has(p)) return false
        for (const f of ignore) { if (p.endsWith('/') && f.startsWith(p)) return false }
        return true
      })
      .sort()
    const dirtyDigest = sha256(lines.join('\n') || '(clean)')
    return { head: head.trim(), dirtyDigest }
  } catch { return null }
}

/** runtimeRoot 相对 projectRoot 的账本路径（仓外 runtimeRoot → null，无需排除） */
function ledgerIgnorePath(runtimeRoot, changeName, projectRoot) {
  try {
    const abs = testLedgerPath(runtimeRoot, changeName)
    const rel = relative(projectRoot, abs)
    return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel.split('\\').join('/') : null
  } catch { return null }
}

/**
 * 测试面摘要（键分量②的输入）：test/ 目录（含一级子目录）文件清单+每文件内容摘要。
 * 深度帽 2 层、文件数帽 2000（run-tests.mjs 同量级），超帽/读失败 → null（fail-closed——
 * 测试面不可全知时复用无意义）。
 * @returns {string|null}
 */
export function computeTestFaceDigest(testRoot, depth = 0) {
  try {
    if (!existsSync(testRoot) || depth > 2) return null
    const names = readdirSync(testRoot).filter(n => !n.startsWith('.')).sort()
    const parts = []
    let count = 0
    for (const n of names) {
      const p = join(testRoot, n)
      const st = statSync(p)
      if (st.isDirectory()) {
        const sub = computeTestFaceDigest(p, depth + 1)
        if (sub === null) return null
        parts.push(n + '/:' + sub)
      } else if (/\.(mjs|js|cjs|json)$/.test(n)) {
        if (++count > 2000) return null
        parts.push(n + ':' + sha256(readFileSync(p)))
      }
    }
    return sha256(parts.join('|'))
  } catch { return null }
}

/**
 * 三键合成（全部分量就绪才出键；任一 null → null）。
 * @returns {string|null} sha256 key
 */
export function computeTestLedgerKey({ projectRoot, testRoot, command, cwd, env, ignoreFiles = [] }) {
  const code = computeCodeFingerprint(projectRoot, { ignoreFiles })
  const face = computeTestFaceDigest(testRoot)
  const profile = computeEnvProfile({ cwd, env })
  if (!code || !face || !profile) return null
  return sha256(JSON.stringify({ code, testSet: { command: String(command || ''), testFaceDigest: face }, env: profile }))
}

/** 账本路径（per-change 单文件） */
export function testLedgerPath(runtimeRoot, changeName) {
  return join(runtimeRoot, `test-ledger-${changeName}.json`)
}

/**
 * 查询：三键全等且有通过记录 → 复用。任一分量不可得/键不等/账本缺失损坏 → 不复用（fail-closed）。
 * @returns {{ reuse: boolean, result?: object, reason: string, key?: string }}
 */
export function consultTestLedger({ runtimeRoot, changeName, projectRoot, testRoot, command, cwd, env }) {
  const selfIgnore = ledgerIgnorePath(runtimeRoot, changeName, projectRoot)
  const key = computeTestLedgerKey({ projectRoot, testRoot, command, cwd, env, ignoreFiles: selfIgnore ? [selfIgnore] : [] })
  if (!key) return { reuse: false, reason: 'fail-closed: 键分量不可得（git/测试面/环境探针任一失败）' }
  try {
    const p = testLedgerPath(runtimeRoot, changeName)
    if (!existsSync(p)) return { reuse: false, reason: 'no-ledger', key }
    const j = JSON.parse(readFileSync(p, 'utf8'))
    if (!j || j.schemaVersion !== 1 || !j.key || !j.result || j.result.pass !== true) {
      return { reuse: false, reason: 'ledger-invalid-or-failed-entry', key }
    }
    if (j.key !== key) return { reuse: false, reason: 'key-mismatch', key }
    return { reuse: true, result: j.result, reason: 'match', key }
  } catch {
    return { reuse: false, reason: 'ledger-read-error', key }
  }
}

/**
 * 记账：只有通过结果落账（fail-closed 层②——失败永不缓存）。键不可得 → 不记（下次仍真跑）。
 * 返回是否落账。
 */
export function recordTestLedger({ runtimeRoot, changeName, projectRoot, testRoot, command, cwd, env, result }) {
  if (!result || result.pass !== true) return false
  const selfIgnore = ledgerIgnorePath(runtimeRoot, changeName, projectRoot)
  const key = computeTestLedgerKey({ projectRoot, testRoot, command, cwd, env, ignoreFiles: selfIgnore ? [selfIgnore] : [] })
  if (!key) return false
  try {
    writeAtomicSync(testLedgerPath(runtimeRoot, changeName), JSON.stringify({
      schemaVersion: 1,
      change: changeName,
      key,
      result: {
        pass: true,
        total: result.total ?? null,
        failed: result.failed ?? [],
        failedFiles: result.failedFiles ?? [],
        durationMs: result.durationMs ?? null,
        strategy: result.strategy ?? null,
        ranAt: new Date().toISOString(),
      },
    }, null, 2) + '\n')
    return true
  } catch { return false }
}
