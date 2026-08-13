/**
 * quick --done 同文件并发检测测试（change 2026-08-13-quick-hunk-separation）
 *
 * 痛点：quick --done 边界审计 auditQuickCompletion 的 baseline 按文件路径整文件跳过——
 * step1 启动录 baselineFiles（他者脏文件路径），若我的 allowedFile 也在其中（他者改过），
 * 我再改它，--done 时该文件在 baselineFiles → isBaselineFile 跳过整文件 → 审计既看不到我的
 * 改动也看不到同文件并发，commit 整文件 pathspec 夹带他者 hunk（实证 prompt.js f1709ec）。
 *
 * 修复（方案 A hash 对比）：
 *   1. stage.js step1 录 guard.allowedFilesHash（每个 allowedFile 内容 sha256）
 *   2. shared.js auditQuickCompletion 末尾检测：allowedFile 在 baseline 且当前 hash ≠ 录入值
 *      （我也改了）→ 同文件并发，push reason + console.warn 给 git add -p/patch 分离指引。
 *      advisory（不阻断，不改 result.status，与 detectConcurrentChanges 一致）。
 *
 * 场景：
 *   1. 命中：allowedFile 在 baseline + 内容改 → warn 含「同文件并发」+「git add -p」
 *   2. advisory 不阻断：result.status 不被升级（safe 仍 safe）
 *   3. 旧 guard 跳过（向后兼容）：guard 无 allowedFilesHash → 不 warn
 *   4. 未改不报：内容未变（hash 一致）→ 不 warn
 *   5. 非 baseline allowedFile 不报：allowedFile 不在 baselineFiles → 不检测
 *
 * 风格：自研 assert + mkdtemp 临时 git 仓库 + console.warn 捕获，参照 quick-baseline-dirty-worktree.test.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

import { auditQuickCompletion } from '../src/run.js'

let total = 0
let failed = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function initGitRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(dir, 'README.md'), 'init\n')
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', '.gitkeep'), '')
  // 预置 quicklog 目录 + .md：auditQuickCompletion 的 quicklog 存在性检查（shared.js:629）需命中，
  // 否则「quicklog 目录不存在」reason 把 status 升 warning，干扰同文件并发 advisory 的纯验证。
  mkdirSync(join(dir, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'quicklog', 'QUICKLOG-init.md'), '# init quicklog\n')
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-q', '-m', 'init'])
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

// 捕获 console.warn 输出（检测块用 console.warn 给分离指引）
async function captureWarn(fn) {
  const lines = []
  const orig = console.warn
  console.warn = (...args) => lines.push(args.map(String).join(' '))
  try {
    await fn()
  } finally {
    console.warn = orig
  }
  return lines
}

async function main() {
  // ── 场景 1：同文件并发命中——allowedFile 在 baseline + 我也改了 → warn + reason ──
  {
    const dir = makeTmpDir('qk-samefile-1-')
    initGitRepo(dir)
    // step1 时（他者已脏 + 我尚未改）：录 baseline 内容 hash
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n')          // 他者脏文件（在 baseline）
    const recordedHash = sha256('original\n')
    // 我本次也改了它（同文件并发）
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n+my hunk\n')
    const guard = {
      baselineFiles: ['src/foo.js'],
      allowedFiles: ['src/foo.js'],
      allowedFilesHash: { 'src/foo.js': recordedHash },
      allowNew: false, forceBaseline: false,
    }
    let review
    const warnLines = await captureWarn(async () => {
      review = await auditQuickCompletion(dir, guard, {})
    })
    const warnText = warnLines.join('\n')
    assert(warnText.includes('同文件并发'), `场景1 warn 含「同文件并发」（实际 ${JSON.stringify(warnText.slice(0, 120))}）`)
    assert(warnText.includes('git add -p'), `场景1 warn 含分离指引「git add -p」（实际 ${JSON.stringify(warnText.slice(0, 160))}）`)
    assert(review.reasons.some(r => r.includes('同文件并发')), `场景1 reasons 含同文件并发条目（实际 ${JSON.stringify(review.reasons)}）`)
    assert(review.reasons.some(r => r.includes('src/foo.js')), `场景1 reasons 点名 src/foo.js（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // ── 场景 2：advisory 不阻断——result.status 不被升级（safe 仍 safe）──
  {
    const dir = makeTmpDir('qk-samefile-2-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n')
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n+my hunk\n')
    const guard = {
      baselineFiles: ['src/foo.js'],
      allowedFiles: ['src/foo.js'],
      allowedFilesHash: { 'src/foo.js': sha256('original\n') },
      allowNew: false, forceBaseline: false,
    }
    const review = await auditQuickCompletion(dir, guard, {})
    // baseline 文件被 isBaselineFile 跳过 → changedFiles 空 → status safe；同文件并发只 warn 不升级
    assert(review.status === 'safe', `场景2 advisory 不阻断 status 仍 safe（实际 ${review.status}）`)
    assert(!review.changedFiles.includes('src/foo.js'), `场景2 同文件并发不把 baseline 文件塞进 changedFiles（实际 ${JSON.stringify(review.changedFiles)}）`)
  }

  // ── 场景 3：旧 guard 跳过（向后兼容）——无 allowedFilesHash → 不 warn ──
  {
    const dir = makeTmpDir('qk-samefile-3-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n')
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n+my hunk\n')
    const guard = {
      baselineFiles: ['src/foo.js'],
      allowedFiles: ['src/foo.js'],
      // 无 allowedFilesHash（旧 guard / 旧 session）
      allowNew: false, forceBaseline: false,
    }
    let review
    const warnLines = await captureWarn(async () => {
      review = await auditQuickCompletion(dir, guard, {})
    })
    const warnText = warnLines.join('\n')
    assert(!warnText.includes('同文件并发'), `场景3 旧 guard 无 allowedFilesHash 不 warn（实际 ${JSON.stringify(warnText.slice(0, 120))}）`)
    assert(!review.reasons.some(r => r.includes('同文件并发')), `场景3 旧 guard reasons 无同文件并发条目（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // ── 场景 4：未改不报——内容未变（当前 hash == 录入值）→ 不 warn ──
  {
    const dir = makeTmpDir('qk-samefile-4-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n')          // 内容未变（我未改）
    const guard = {
      baselineFiles: ['src/foo.js'],
      allowedFiles: ['src/foo.js'],
      allowedFilesHash: { 'src/foo.js': sha256('original\n') },
      allowNew: false, forceBaseline: false,
    }
    let review
    const warnLines = await captureWarn(async () => {
      review = await auditQuickCompletion(dir, guard, {})
    })
    const warnText = warnLines.join('\n')
    assert(!warnText.includes('同文件并发'), `场景4 内容未变（hash 一致）不 warn（实际 ${JSON.stringify(warnText.slice(0, 120))}）`)
    assert(!review.reasons.some(r => r.includes('同文件并发')), `场景4 内容未变 reasons 无同文件并发（实际 ${JSON.stringify(review.reasons)}）`)
  }

  // ── 场景 5：非 baseline allowedFile 不报——allowedFile 不在 baselineFiles → 不检测 ──
  {
    const dir = makeTmpDir('qk-samefile-5-')
    initGitRepo(dir)
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n')
    writeFileSync(join(dir, 'src', 'foo.js'), 'original\n+my hunk\n')
    const guard = {
      baselineFiles: ['src/other.js'],                              // foo.js 不在 baseline（非同文件并发场景）
      allowedFiles: ['src/foo.js'],
      allowedFilesHash: { 'src/foo.js': sha256('original\n') },
      allowNew: false, forceBaseline: false,
    }
    let review
    const warnLines = await captureWarn(async () => {
      review = await auditQuickCompletion(dir, guard, {})
    })
    const warnText = warnLines.join('\n')
    assert(!warnText.includes('同文件并发'), `场景5 allowedFile 非 baseline 不检测（实际 ${JSON.stringify(warnText.slice(0, 120))}）`)
  }

  for (const d of tmpRoots) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }

  console.log('')
  console.log('==================================================')
  console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
  console.log('==================================================')
  if (failed > 0) process.exit(1)
}

main().catch(e => {
  console.error('测试异常:', e)
  for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  process.exit(1)
})
