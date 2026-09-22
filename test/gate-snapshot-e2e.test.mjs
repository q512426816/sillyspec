/**
 * gate-snapshot-e2e.test.mjs — 快照门禁 E2E 测试基建（ql-20260921-008）
 *
 * 缺口实证（2026-09-21 batch2 verify）：单元钉（createGateSnapshot 直调）只覆盖组装函数，
 * 真链路（executeVerifyQualityScan → 建快照 → 快照内跑 commands.test → 判定）无自动验证面
 * ——batch2 verify 为确认 M2 血统修复在真链路成立，手工搭副本目录+副本内烧 2-3 次全量套件
 * （146+136+106s）。本件用假项目夹具把该验证机制化：**夹具测试即血统探针**——probe.js 在快照
 * 内读 service.js 比对 LINEAGE_EXPECT 期望标记，门禁判定直接反映快照取材血统。
 *
 * 覆盖（对应 D-002@v2 三态 + 负控）：
 *   ① 保护态（主仓直写提交、worktree 停基线）→ 快照取主仓 → probe 期望主仓标记 PASS
 *   ② 正常态（仅 worktree 交付提交）→ 快照取 worktree → PASS
 *   ③ 分叉态（双侧各自提交且互不相等）→ 快照取 worktree（M2 翻转点）→ PASS
 *   ③ 负控（同场景期望主仓标记）→ 探针必 FAIL（证明主仓干扰版确实没进快照）
 *
 * 全程进程内（import 真入口，不走 CLI spawn）——单场景 ~2-4s。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const { executeVerifyQualityScan } = await import('../src/run/verify-quality-scan.js')
const { WorktreeManager } = await import('../src/worktree.js')

const CHANGE = '2026-09-21-e2e-demo'
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' })

/** 假项目夹具：git 仓 + service.js + probe.js（血统探针）+ local.yaml(test=probe) + 真实 worktree（WorktreeManager 建，meta/分支全真） */
function makeFixture(tag) {
  const root = mkdtempSync(join(tmpdir(), `gs-e2e-${tag}-`))
  const repo = join(root, 'repo')
  mkdirSync(repo, { recursive: true })
  git(repo, 'init', '--quiet')
  writeFileSync(join(repo, 'service.js'), 'export const v = "base"\n', 'utf8')
  writeFileSync(join(repo, 'probe.js'), [
    "const fs = require('node:fs')",
    "const s = fs.readFileSync('service.js', 'utf8')",
    "const want = process.env.LINEAGE_EXPECT || ''",
    "if (!s.includes(want)) { console.error('LINEAGE-MISMATCH want=' + want + ' got=' + s.trim()); process.exit(1) }",
    "console.log('LINEAGE-OK ' + want)",
  ].join('\n'), 'utf8')
  // checkWorktreeDirIgnored 用 git check-ignore 判 .sillyspec/.runtime/worktrees——
  // 尾斜杠目录模式在目录不存在时不命中（/tmp 实证），夹具须整体忽略 .sillyspec/
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n', 'utf8')
  git(repo, 'add', '.')
  git(repo, 'commit', '--quiet', '-m', 'base')
  const specBase = join(repo, '.sillyspec')
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node probe.js\n', 'utf8')
  const wm = new WorktreeManager({ cwd: repo })
  const { worktreePath } = wm.create(CHANGE)
  return { root, repo, wt: worktreePath, specBase }
}

const editCommit = (cwd, content, msg) => {
  writeFileSync(join(cwd, 'service.js'), `export const v = "${content}"\n`, 'utf8')
  git(cwd, 'add', 'service.js')
  git(cwd, 'commit', '--quiet', '-m', msg)
}

/** 走真门禁入口（进程内），静音 console；返回 {ok, msg, logs} */
async function runScan({ repo, specBase }, expectMarker) {
  const prev = process.env.LINEAGE_EXPECT
  process.env.LINEAGE_EXPECT = expectMarker
  const buf = []
  const ol = console.log, oe = console.error
  console.log = (...a) => buf.push(a.map(String).join(' '))
  console.error = (...a) => buf.push(a.map(String).join(' '))
  try {
    await executeVerifyQualityScan({ cwd: repo, specBase, changeName: CHANGE, platformOpts: {} })
    return { ok: true, logs: buf }
  } catch (e) {
    return { ok: false, msg: String(e && e.message || e), logs: buf }
  } finally {
    console.log = ol; console.error = oe
    if (prev === undefined) delete process.env.LINEAGE_EXPECT; else process.env.LINEAGE_EXPECT = prev
  }
}

const clean = (root) => { try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄残留容忍 */ } }

test('E2E ① 保护态：主仓直写提交、worktree 停基线 → 快照取主仓（探测 PASS）', async () => {
  const f = makeFixture('protect')
  try {
    editCommit(f.repo, 'main-direct-v2', 'main direct write')
    const r = await runScan(f, 'main-direct-v2')
    assert.ok(r.ok, `保护态应取主仓（探测应 PASS）。诊断：${r.msg}\n${r.logs.slice(-8).join('\n')}`)
  } finally { clean(f.root) }
})

test('E2E ② 正常态：仅 worktree 交付提交 → 快照取 worktree（探测 PASS）', async () => {
  const f = makeFixture('normal')
  try {
    editCommit(f.wt, 'wt-deliverable', 'worktree deliverable')
    const r = await runScan(f, 'wt-deliverable')
    assert.ok(r.ok, `正常态应取 worktree。诊断：${r.msg}\n${r.logs.slice(-8).join('\n')}`)
  } finally { clean(f.root) }
})

test('E2E ③ 分叉态（回归钉）：双侧各自提交 → 快照取 worktree（M2 翻转；取主仓则探测 FAIL）', async () => {
  const f = makeFixture('fork')
  try {
    editCommit(f.wt, 'wt-contract-code', 'worktree contract')
    editCommit(f.repo, 'main-parallel-quickfix', 'main parallel interference')
    const r = await runScan(f, 'wt-contract-code')
    assert.ok(r.ok, `分叉态应取 worktree 分支版（batch1 假红根治点）。诊断：${r.msg}\n${r.logs.slice(-8).join('\n')}`)
  } finally { clean(f.root) }
})

test('E2E ③ 负控：同分叉场景期望主仓标记 → 探测必 FAIL（主仓干扰版未进快照）', async () => {
  const f = makeFixture('forkneg')
  try {
    editCommit(f.wt, 'wt-contract-code', 'worktree contract')
    editCommit(f.repo, 'main-parallel-quickfix', 'main parallel interference')
    const r = await runScan(f, 'main-parallel-quickfix')
    assert.ok(!r.ok, `负控应 FAIL（主仓版不得进快照）——若 PASS 说明血统翻转丢失。诊断日志尾部：\n${r.logs.slice(-8).join('\n')}`)
    assert.match(r.msg + r.logs.join('\n'), /LINEAGE-MISMATCH|测试失败|failed/, '失败信息应来自探针Mismatch')
  } finally { clean(f.root) }
})

// ── env 钉定缓存链接面（r5l 方案 5 / P17，通用机制）：快照内构建依赖可用 ──

test('E2E ④ 构建缓存：UV_CACHE_DIR 钉在仓内（gitignored）→ 快照内构建依赖可用（P17）', async () => {
  const f = makeFixture('uvcache')
  try {
    // 仓内钉定缓存：未跟踪目录（gitignored 语义——不进 HEAD），内放「构建后端已就位」标记
    // （P17 实形：构建隔离环境含 hatchling）。探针模拟工具行为：按 env var 相对 cwd 解析
    // 缓存并读取构建依赖标记——快照缺该目录即 ENOENT 假红（修复前的实态）。
    const cacheDir = join(f.repo, '.build-cache')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(join(cacheDir, 'build-backend-marker.txt'), 'hatchling-ready\n', 'utf8')
    writeFileSync(join(f.wt, 'cacheprobe.js'), [
      "const fs = require('node:fs')",
      "const path = require('node:path')",
      "const marker = path.resolve(process.cwd(), process.env.UV_CACHE_DIR, 'build-backend-marker.txt')",
      "try { fs.readFileSync(marker, 'utf8') }",
      "catch (e) { console.error('BUILD-DEP-MISSING ' + marker); process.exit(1) }",
      "console.log('BUILD-DEP-OK')",
    ].join('\n'), 'utf8')
    writeFileSync(join(f.specBase, 'local.yaml'), 'commands:\n  test: node cacheprobe.js\n  lint: unavailable\n', 'utf8')
    // 快照定向源=变更 worktree（meta 感知）——probe 须提交进 worktree 分支才进快照
    //（.build-cache 保持未跟踪：被测对象正是「HEAD 缺 gitignored 缓存、链接面补齐」）
    git(f.wt, 'add', 'cacheprobe.js')
    git(f.wt, 'commit', '--quiet', '-m', 'add cache probe')
    const prevUv = process.env.UV_CACHE_DIR
    process.env.UV_CACHE_DIR = '.build-cache'
    const buf = []
    const ol = console.log, oe = console.error
    console.log = (...a) => buf.push(a.map(String).join(' '))
    console.error = (...a) => buf.push(a.map(String).join(' '))
    try {
      await executeVerifyQualityScan({ cwd: f.repo, specBase: f.specBase, changeName: CHANGE, platformOpts: {} })
    } finally {
      console.log = ol; console.error = oe
      if (prevUv === undefined) delete process.env.UV_CACHE_DIR; else process.env.UV_CACHE_DIR = prevUv
    }
    assert.ok(buf.some((l) => /构建缓存面.*UV_CACHE_DIR=\.build-cache/.test(l)), `应打印构建缓存面链接行。日志尾部：\n${buf.slice(-8).join('\n')}`)
  } finally { clean(f.root) }
})

test('E2E ④ 钉在仓外（家目录形态）→ 不链接零行为（继承 env 绝对路径直达，机制边界）', async () => {
  const f = makeFixture('uvhome')
  try {
    writeFileSync(join(f.wt, 'cacheprobe.js'), [
      "const fs = require('node:fs')",
      "const p = process.env.UV_CACHE_DIR + '/build-backend-marker.txt'",
      "try { fs.readFileSync(p, 'utf8') }",
      "catch (e) { console.error('BUILD-DEP-MISSING ' + p); process.exit(1) }",
      "console.log('BUILD-DEP-OK')",
    ].join('\n'), 'utf8')
    writeFileSync(join(f.specBase, 'local.yaml'), 'commands:\n  test: node cacheprobe.js\n  lint: unavailable\n', 'utf8')
    git(f.wt, 'add', 'cacheprobe.js')
    git(f.wt, 'commit', '--quiet', '-m', 'add cache probe')
    // 家目录形态：绝对路径指向仓外 tmp——快照不链接，但探针经继承 env 直达同样可用
    const homeCache = join(f.root, 'home-uv-cache')
    mkdirSync(homeCache, { recursive: true })
    writeFileSync(join(homeCache, 'build-backend-marker.txt'), 'hatchling-ready\n', 'utf8')
    const prevUv = process.env.UV_CACHE_DIR
    process.env.UV_CACHE_DIR = homeCache
    const buf = []
    const ol = console.log, oe = console.error
    console.log = (...a) => buf.push(a.map(String).join(' '))
    console.error = (...a) => buf.push(a.map(String).join(' '))
    try {
      await executeVerifyQualityScan({ cwd: f.repo, specBase: f.specBase, changeName: CHANGE, platformOpts: {} })
    } finally {
      console.log = ol; console.error = oe
      if (prevUv === undefined) delete process.env.UV_CACHE_DIR; else process.env.UV_CACHE_DIR = prevUv
    }
    assert.ok(!buf.some((l) => /构建缓存面/.test(l)), '仓外钉定不应触发链接面（机制边界：继承 env 直达）')
  } finally { clean(f.root) }
})

test('resolvePinnedCacheLinks 单测：注册表逐项通用解析（非 uv 项同样命中）；相对/绝对/仓外/空值边界', async () => {
  const { resolvePinnedCacheLinks } = await import('../src/run/gate-snapshot.js')
  const f = makeFixture('resolve')
  try {
    const links = resolvePinnedCacheLinks({ cwd: f.repo, env: {
      UV_CACHE_DIR: '.uv-cache',
      PIP_CACHE_DIR: 'tools/pip/cache',        // 非 uv 注册项同样命中（机制通用性）
      POETRY_CACHE_DIR: join(f.root, 'elsewhere'), // 仓外绝对路径 → 直达不链接
    } })
    assert.deepEqual(links.map((x) => x.rel).sort(), ['.uv-cache', 'tools/pip/cache'], '两个仓内钉定命中，仓外排除')
    assert.equal(links.filter((x) => x.envName === 'PIP_CACHE_DIR')[0].tool, 'pip', '注册表元数据随行')
    assert.deepEqual(resolvePinnedCacheLinks({ cwd: f.repo, env: {} }), [], '未钉定零行为')
    assert.deepEqual(resolvePinnedCacheLinks({ cwd: f.repo, env: { UV_CACHE_DIR: '   ' } }), [], '空白值不算钉定')
  } finally { clean(f.root) }
})
