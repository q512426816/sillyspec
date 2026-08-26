/**
 * platform-register-stage-review.test.mjs — 平台指针模式下 register-stage-review /
 * backfill-reviews 的 CLI 接线回归（A4 同族修复，2026-08-26 实证）。
 *
 * 症状：平台模式（cwd/.sillyspec-platform.json 指向外部 specRoot）下
 * `register-stage-review --change X --stage brainstorm` 只认显式 --spec-dir 拼
 * platformOpts → specRoot 缺失 → stage-review.js 回退 join(cwd,'.sillyspec') 在项目
 * 本地找 design.md → 「主审查文档不存在…无法算 docHash」→ 逼 agent 手算 sha256 兜底。
 *
 * 修复：CLI case 改走 resolvePlatformOpts（--spec-dir > 指针 specRoot+runtimeRoot > 纯本地 null）。
 * 本文件锁住：① resolvePlatformOpts 各分支语义；② CLI 端到端（review/marker/docHash 全落
 * 平台 specRoot/.runtime，本地 .sillyspec 不被创建）；③ --refresh-hash 平台模式就地刷新；
 * ④ backfill-reviews 平台模式 tasks/ 命中 + execute-run marker 落平台 runtimeRoot。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolvePlatformOpts } from '../src/progress.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const binCLI = join(resolve(__dirname, '..'), 'bin', 'sillyspec.js')

const DESIGN_V1 = '# design\n\n平台目录里的主文档 v1\n'
const DESIGN_V2 = '# design\n\n平台目录里的主文档 v2（改版）\n'

/** fixture：项目目录（cwd，只放指针）+ 外部 specRoot（design.md 真实所在地） */
function makePlatformFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'psr-proj-'))
  const specRoot = mkdtempSync(join(tmpdir(), 'psr-spec-'))
  const changeDir = join(specRoot, 'changes', 'demo')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), DESIGN_V1)
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '---\nrepo: main\nallowed_paths:\n  - "src/a.js"\n---\n# task-01\n')
  writeFileSync(join(proj, '.sillyspec-platform.json'), JSON.stringify({
    specRoot,
    runtimeRoot: join(specRoot, '.runtime'),
    workspaceId: 'ws-1',
    scanRunId: 'scan-1',
    savedAt: '2026-08-26T00:00:00.000Z',
  }, null, 2) + '\n')
  return { proj, specRoot, changeDir }
}

function cleanup(...dirs) {
  for (const d of dirs) {
    try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch {}
  }
}

function sha256File(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

function runCli(args, cwd) {
  return execFileSync(process.execPath, [binCLI, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

// ── resolvePlatformOpts 单元语义 ──

test('resolvePlatformOpts：指针模式恢复 specRoot + runtimeRoot', () => {
  const f = makePlatformFixture()
  try {
    const opts = resolvePlatformOpts(f.proj, null)
    assert.ok(opts, '指针存在且合法 → 非 null')
    assert.equal(opts.specRoot, f.specRoot)
    assert.equal(opts.runtimeRoot, join(f.specRoot, '.runtime'))
  } finally { cleanup(f.proj, f.specRoot) }
})

test('resolvePlatformOpts：显式 --spec-dir 优先于指针，runtimeRoot=null（走默认 specRoot/.runtime）', () => {
  const f = makePlatformFixture()
  const elsewhere = mkdtempSync(join(tmpdir(), 'psr-explicit-'))
  try {
    const opts = resolvePlatformOpts(f.proj, elsewhere)
    assert.equal(opts.specRoot, elsewhere)
    assert.equal(opts.runtimeRoot, null)
  } finally { cleanup(f.proj, f.specRoot, elsewhere) }
})

test('resolvePlatformOpts：无指针纯本地 → null（platformOpts 保持空，零回归）', () => {
  const proj = mkdtempSync(join(tmpdir(), 'psr-local-'))
  try {
    assert.equal(resolvePlatformOpts(proj, null), null)
  } finally { cleanup(proj) }
})

test('resolvePlatformOpts：指针损坏 → fail-closed 抛错（不静默回退本地）', () => {
  const proj = mkdtempSync(join(tmpdir(), 'psr-broken-'))
  try {
    writeFileSync(join(proj, '.sillyspec-platform.json'), '{ 不是 JSON')
    assert.throws(() => resolvePlatformOpts(proj, null), /pointer 文件损坏/)
  } finally { cleanup(proj) }
})

test('resolvePlatformOpts：自指指针（specRoot=本地 .sillyspec）→ 免疫返回 null（对齐 runCommand 恢复链）', () => {
  const proj = mkdtempSync(join(tmpdir(), 'psr-selfref-'))
  try {
    mkdirSync(join(proj, '.sillyspec'), { recursive: true })
    writeFileSync(join(proj, '.sillyspec-platform.json'), JSON.stringify({
      specRoot: join(proj, '.sillyspec'), runtimeRoot: null, workspaceId: null, scanRunId: null,
    }))
    assert.equal(resolvePlatformOpts(proj, null), null, 'junction 回环应按本地模式处理')
  } finally { cleanup(proj) }
})

// ── CLI 端到端（主修复回归） ──

test('CLI register-stage-review：平台指针模式下 docHash 自动算，产物全落平台 specRoot', () => {
  const f = makePlatformFixture()
  try {
    const out = runCli(['register-stage-review', '--change', 'demo', '--stage', 'brainstorm'], f.proj)
    assert.match(out, /已注册 brainstorm stage review/)

    const reviewsDir = join(f.specRoot, '.runtime', 'stage-reviews')
    assert.ok(existsSync(reviewsDir), 'stage-reviews 应落平台 specRoot/.runtime')
    const runDirs = readdirSync(reviewsDir).filter((d) => d.startsWith('brainstorm-review-'))
    assert.equal(runDirs.length, 1, '一个 run 目录')

    const review = JSON.parse(readFileSync(join(reviewsDir, runDirs[0], 'review.json'), 'utf8'))
    assert.equal(review.docHash, sha256File(join(f.changeDir, 'design.md')), 'docHash=CLI 亲算 sha256（主文档在平台目录）')
    assert.equal(review.reviewedFiles[0], 'changes/demo/design.md')

    const marker = join(f.specRoot, '.runtime', 'current-stage-review-run-id-brainstorm-demo')
    assert.ok(existsSync(marker), 'marker 落平台 runtimeRoot')

    assert.ok(!existsSync(join(f.proj, '.sillyspec')), '修复后不应再在项目本地创建 .sillyspec')
  } finally { cleanup(f.proj, f.specRoot) }
})

test('CLI register-stage-review --refresh-hash：平台模式下改版 design 后就地刷新 docHash', () => {
  const f = makePlatformFixture()
  try {
    runCli(['register-stage-review', '--change', 'demo', '--stage', 'brainstorm'], f.proj)
    // 主文档改版（正是用户实证场景：改一版 design 要重算 docHash）
    writeFileSync(join(f.changeDir, 'design.md'), DESIGN_V2)
    const out = runCli(['register-stage-review', '--change', 'demo', '--stage', 'brainstorm', '--refresh-hash'], f.proj)
    assert.match(out, /已注册 brainstorm stage review/)

    const reviewsDir = join(f.specRoot, '.runtime', 'stage-reviews')
    const runDirs = readdirSync(reviewsDir).filter((d) => d.startsWith('brainstorm-review-'))
    assert.equal(runDirs.length, 1, 'refresh 不换 run 目录（保留已审结论）')
    const review = JSON.parse(readFileSync(join(reviewsDir, runDirs[0], 'review.json'), 'utf8'))
    assert.equal(review.docHash, sha256File(join(f.changeDir, 'design.md')), 'docHash 刷新为新版 sha256')
    assert.match(review.reviewerNotes || '', /docHash refreshed/, '刷新记录入 reviewerNotes')
  } finally { cleanup(f.proj, f.specRoot) }
})

test('CLI backfill-reviews：平台模式下 tasks/ 命中 + execute-run marker 落平台 runtimeRoot', () => {
  const f = makePlatformFixture()
  try {
    // 不需要真实 git/commit：tasks/ 命中（specBase 对）+ marker 生成（runtimeRoot 对）即证明
    // 平台路径解析贯通；无 diff 时草稿数为 0 属合法 fail-open 返回。
    const out = runCli(['backfill-reviews', '--change', 'demo'], f.proj)
    assert.ok(!/无 tasks\/ 目录/.test(out), '平台 specRoot 下 tasks/ 应被命中（本地路径则恒报无 tasks/）')
    const marker = join(f.specRoot, '.runtime', 'current-execute-run-id-demo')
    assert.ok(existsSync(marker), 'execute-run marker 应落平台 runtimeRoot')
    assert.ok(!existsSync(join(f.proj, '.sillyspec')), '不应在项目本地创建 .sillyspec')
  } finally { cleanup(f.proj, f.specRoot) }
})

test('CLI register-stage-review：纯本地（无指针）行为不变——本地 .sillyspec 下注册', () => {
  const proj = mkdtempSync(join(tmpdir(), 'psr-purelocal-'))
  try {
    const changeDir = join(proj, '.sillyspec', 'changes', 'demo')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), DESIGN_V1)
    const out = runCli(['register-stage-review', '--change', 'demo', '--stage', 'brainstorm'], proj)
    assert.match(out, /已注册 brainstorm stage review/)
    const reviewsDir = join(proj, '.sillyspec', '.runtime', 'stage-reviews')
    assert.ok(existsSync(reviewsDir), '纯本地模式仍落本地 .sillyspec/.runtime')
  } finally { cleanup(proj) }
})
