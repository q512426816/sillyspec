/**
 * scan-diff 单测（change: 2026-08-16-scan-diff-command, task-03）
 *
 * 覆盖 computeScanDiff / runScanDiff：
 *   1. 四分类 A/D/M/R（R 归 modified 且 renameMap 记 old→new）
 *   2. byModule 与直接 import matchFilesToModules 调用结果一致（复用验证）
 *   3. unmapped / outOfScope 边界：无 module-map → 全部归 unmapped（范围退化 + 警告）；
 *      map paths 未覆盖 → outOfScope 不计漂移；Windows 反斜杠路径 → 范围归一命中但模块
 *      原始路径失配 → in-scope 且 unmapped（显式标注）
 *   4. isAncestor 守卫：无效 base → ok:false + 退出码 2；有效但非祖先 → 警告注入（diff 仍可算）
 *   5. 无漂移：base==HEAD → driftCount 0 / 退出码 0；缺省基线读 scan 文档 source_commit
 *   6. --report 落盘 scan-diff-report.md（路径 + 格式断言）
 *   7. CLI 集成：spawn `node bin/sillyspec.js scan diff` 断言退出码（0/1/2）
 *   8. 模块化：git 依赖经 mock.module 注入 safeGit 驱动 computeScanDiff（不 mock 被测方法自身；
 *      证明计算层与真实 git 解耦）——mock.module 需 --experimental-test-module-mocks，
 *      以独立子进程跑该场景，主进程不受影响、仍走真实 git
 *
 * fixture 全 tmp git 仓（execSync git init + config + commit），仿 scan-staleness.test.mjs；
 * 每用例独立仓库 + t.after 清理，不依赖共享状态。
 */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { execSync, spawnSync } from 'node:child_process'
import { computeScanDiff, runScanDiff } from '../src/scan-diff.js'
import { matchFilesToModules } from '../src/docs-debt.js'
import { parseModuleMapSimple } from '../src/modules.js'

const HERE = dirname(fileURLToPath(import.meta.url))

// ── fixture ─────────────────────────────────────────────────────
const DEFAULT_MAP = `schema_version: 2

modules:
  core:
    status: active
    doc: modules/core.md
    paths:
      - src/core/
  util:
    status: active
    doc: modules/util.md
    paths:
      - src/util/
`
const BSLASH_MAP = `schema_version: 2

modules:
  core:
    status: active
    paths:
      - src\\core\\
`

function scanDoc(sourceCommit) {
  return `---
author: test
created_at: 2026-08-16 00:00:00
source_commit: ${sourceCommit}
---

# ARCHITECTURE

内容
`
}

/** 建 tmp git 仓：base=sources commit，随后 docs commit（scan 文档 source_commit=base + module-map）。
 *  docs 文件在 map 覆盖集外 → 后续 diff 天然 outOfScope，不污染漂移分类。 */
function mkRepo({ map = DEFAULT_MAP, proj = 'demo' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'scan-diff-'))
  const run = (a) => execSync(a, { cwd: root, stdio: 'pipe' }).toString().trim()
  run('git init -q')
  run('git config user.email t@t.com')
  run('git config user.name t')
  mkdirSync(join(root, 'src/core'), { recursive: true })
  mkdirSync(join(root, 'src/util'), { recursive: true })
  writeFileSync(join(root, 'src/core/a.js'), 'a1\n')
  writeFileSync(join(root, 'src/core/b.js'), 'b1\n')
  writeFileSync(join(root, 'src/util/u.js'), 'u1\n')
  run('git add -A')
  run('git commit -q -m base-sources')
  const base = run('git rev-parse HEAD')
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'docs', proj, 'scan'), { recursive: true })
  mkdirSync(join(specBase, 'docs', proj, 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', proj, 'scan', 'ARCH.md'), scanDoc(base))
  if (map) writeFileSync(join(specBase, 'docs', proj, 'modules', '_module-map.yaml'), map)
  run('git add -A')
  run('git commit -q -m docs')
  return { root, base, specBase, run, proj }
}
const cleanup = (root) => { try { rmSync(root, { recursive: true, force: true }) } catch {} }
const opts = (f) => ({ projectRoot: f.root, specBase: f.specBase, projectName: f.proj })

// ── 模块化子进程入口 ─────────────────────────────────────────────
// mock.module 需 --experimental-test-module-mocks，仅子进程带旗标。子进程跑到这里即
// 执行 git-mock 场景并退出，主进程（真实 git 场景）永远不进这个分支。
// 注意放在 fixture 常量之后：runModuleMockScenario 依赖 DEFAULT_MAP / cleanup，且函数
// 声明已提升，此处 await 不触 TDZ。
if (process.argv.includes('--scan-diff-module-mock')) {
  process.exit(await runModuleMockScenario())
}

// ── computeScanDiff：四分类 ─────────────────────────────────────
describe('computeScanDiff 四分类', () => {
  it('A/D/M/R：新增/删除/修改/rename 各归其类，R 归 modified 且 renameMap 记 old→new', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/core/new.js'), 'n\n') // A
    writeFileSync(join(f.root, 'src/core/b.js'), 'b2\n') // M
    rmSync(join(f.root, 'src/util/u.js')) // D
    execSync('git mv src/core/a.js src/core/renamed.js', { cwd: f.root, stdio: 'pipe' }) // R
    f.run('git add -A')
    f.run('git commit -q -m changes')
    const head = f.run('git rev-parse HEAD')

    const r = computeScanDiff(opts(f))
    assert.equal(r.ok, true)
    assert.equal(r.base, f.base.slice(0, 7))
    assert.equal(r.head, head.slice(0, 7))
    assert.equal(r.behindCommits, 2) // docs commit + changes commit
    assert.equal(r.daysSinceScan, 0)
    assert.deepEqual(r.scope, ['src/core', 'src/util'])
    assert.deepEqual(r.added, ['src/core/new.js'])
    assert.deepEqual(r.deleted, ['src/util/u.js'])
    assert.deepEqual([...r.modified].sort(), ['src/core/b.js', 'src/core/renamed.js'])
    assert.deepEqual(r.renameMap, { 'src/core/renamed.js': 'src/core/a.js' })
    assert.deepEqual(r.unknown, [])
    assert.deepEqual(r.unmapped, [])
    assert.equal(r.driftCount, 4)
    assert.deepEqual(r.warnings, [])
    // docs 文件在 map 覆盖集外 → outOfScope
    assert.deepEqual([...r.outOfScope].sort(), [
      '.sillyspec/docs/demo/modules/_module-map.yaml',
      '.sillyspec/docs/demo/scan/ARCH.md',
    ])
    // byModule A/D/M 计数
    assert.equal(r.byModule.core.added, 1)
    assert.equal(r.byModule.core.deleted, 0)
    assert.equal(r.byModule.core.modified, 2)
    assert.equal(r.byModule.util.added, 0)
    assert.equal(r.byModule.util.deleted, 1)
    assert.equal(r.byModule.util.modified, 0)
  })
})

// ── 归模块一致 ──────────────────────────────────────────────────
describe('byModule 归模块一致', () => {
  it('computeScanDiff.byModule 与直接 matchFilesToModules 调用结果一致（复用验证）', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/core/new.js'), 'n\n')
    writeFileSync(join(f.root, 'src/core/b.js'), 'b2\n')
    rmSync(join(f.root, 'src/util/u.js'))
    execSync('git mv src/core/a.js src/core/renamed.js', { cwd: f.root, stdio: 'pipe' })
    f.run('git add -A')
    f.run('git commit -q -m changes')

    const r = computeScanDiff(opts(f))
    assert.equal(r.ok, true)
    const mapContent = readFileSync(join(f.specBase, 'docs/demo/modules/_module-map.yaml'), 'utf8')
    const moduleIndex = parseModuleMapSimple(mapContent)
    const cardsDir = join(f.specBase, 'docs/demo/modules')
    const inScopeFiles = [...r.added, ...r.deleted, ...r.modified, ...r.unknown]
    const direct = matchFilesToModules(inScopeFiles, moduleIndex, { cardsDir })

    // 逐模块一致（文件清单 + doc）
    for (const [id, entry] of direct.byModule) {
      assert.ok(r.byModule[id], `byModule 应含模块 ${id}`)
      assert.deepEqual([...r.byModule[id].files].sort(), [...entry.files].sort(), `模块 ${id} 文件清单`)
      assert.equal(r.byModule[id].doc, entry.doc, `模块 ${id} doc`)
    }
    assert.deepEqual([...r.unmapped].sort(), [...direct.unmapped].sort(), 'unmapped 一致')
    // 分区不变量：byModule.files ∪ unmapped == inScopeFiles（无遗漏无重复）
    const union = [...direct.byModule.values()].flatMap((e) => e.files)
    assert.deepEqual([...union, ...direct.unmapped].sort(), [...inScopeFiles].sort())
  })
})

// ── unmapped / outOfScope 边界 ──────────────────────────────────
describe('unmapped / outOfScope', () => {
  it('无 module-map：扫描范围退化=全部变更文件，全部归 unmapped + 警告', (t) => {
    const f = mkRepo({ map: null })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/core/new.js'), 'n\n')
    f.run('git add -A')
    f.run('git commit -q -m c')

    const r = computeScanDiff(opts(f))
    assert.equal(r.ok, true)
    assert.deepEqual(r.scope, [])
    assert.ok(r.unmapped.includes('src/core/new.js'))
    assert.ok(r.unmapped.includes('.sillyspec/docs/demo/scan/ARCH.md'))
    assert.deepEqual(r.outOfScope, [])
    assert.ok(r.warnings.some((w) => w.includes('module-map 缺失')))
    assert.equal(r.driftCount, 2) // 退化=全部变更文件（ARCH.md + new.js）计入漂移
  })

  it('map paths 未覆盖的文件 → outOfScope，不计入漂移', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    mkdirSync(join(f.root, 'src/other'), { recursive: true })
    writeFileSync(join(f.root, 'src/other/extra.js'), 'x\n')
    f.run('git add -A')
    f.run('git commit -q -m c')

    const r = computeScanDiff(opts(f))
    assert.equal(r.ok, true)
    assert.ok(r.outOfScope.includes('src/other/extra.js'))
    assert.deepEqual(r.added, [])
    assert.deepEqual(r.deleted, [])
    assert.deepEqual(r.modified, [])
    assert.equal(r.driftCount, 0)
  })

  it('Windows 反斜杠路径：范围归一命中（src/core）但模块原始路径失配 → in-scope 且 unmapped', (t) => {
    const f = mkRepo({ map: BSLASH_MAP })
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/core/new.js'), 'n\n')
    f.run('git add -A')
    f.run('git commit -q -m c')

    const r = computeScanDiff(opts(f))
    assert.equal(r.ok, true)
    assert.deepEqual(r.scope, ['src/core']) // collectScope 归一反斜杠
    assert.deepEqual(r.added, ['src/core/new.js'])
    assert.deepEqual(r.unmapped, ['src/core/new.js']) // 已入范围但未匹配模块 → 显式标注
    assert.equal(r.driftCount, 1)
  })
})

// ── isAncestor 守卫 ─────────────────────────────────────────────
describe('isAncestor 守卫', () => {
  it('无效 base（rev-parse 失败）→ ok:false 报错 + runScanDiff 退出码 2', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    const badBase = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    const r = computeScanDiff({ ...opts(f), base: badBase })
    assert.equal(r.ok, false)
    assert.match(r.error, /不是有效 commit/)
    const code = runScanDiff({ ...opts(f), base: badBase })
    assert.equal(code, 2)
  })

  it('有效但非祖先 base → ok:true + 警告注入（diff 按两快照对比仍可算）', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    const origBr = f.run('git rev-parse --abbrev-ref HEAD')
    f.run('git checkout -q -b side')
    writeFileSync(join(f.root, 'src/core/side.js'), 's\n')
    f.run('git add -A')
    f.run('git commit -q -m side')
    const side = f.run('git rev-parse HEAD')
    f.run('git checkout -q ' + origBr)
    writeFileSync(join(f.root, 'src/core/main.js'), 'm\n')
    f.run('git add -A')
    f.run('git commit -q -m main')

    const r = computeScanDiff({ ...opts(f), base: side })
    assert.equal(r.ok, true)
    assert.ok(r.warnings.some((w) => w.includes('不是 HEAD') && w.includes('祖先')))
    assert.deepEqual(r.added, ['src/core/main.js'])
    assert.deepEqual(r.deleted, ['src/core/side.js'])
    assert.equal(r.driftCount, 2)
  })
})

// ── 无漂移 / 缺省基线 ───────────────────────────────────────────
describe('无漂移', () => {
  it('base==HEAD → driftCount 0 / runScanDiff 退出码 0', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    const head = f.run('git rev-parse HEAD')
    const r = computeScanDiff({ ...opts(f), base: head })
    assert.equal(r.ok, true)
    assert.equal(r.driftCount, 0)
    assert.deepEqual(r.added, [])
    assert.deepEqual(r.deleted, [])
    assert.deepEqual(r.modified, [])
    assert.deepEqual(r.unknown, [])
    assert.equal(r.behindCommits, 0)
    const code = runScanDiff({ ...opts(f), base: head })
    assert.equal(code, 0)
  })

  it('缺省基线读取 scan 文档 frontmatter source_commit（baseSource 标注，0 漂移）', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    // 不传 base：source_commit = base（sources commit），base..HEAD 仅含 docs 文件且 map 覆盖集外 → 0 漂移
    const r = computeScanDiff(opts(f))
    assert.equal(r.ok, true)
    assert.equal(r.baseSource, 'scan 文档 frontmatter source_commit')
    assert.equal(r.base, f.base.slice(0, 7))
    assert.equal(r.behindCommits, 1) // 仅 docs commit
    assert.equal(r.driftCount, 0)
  })
})

// ── --report 落盘 ───────────────────────────────────────────────
describe('runScanDiff --report', () => {
  it('report=true 落盘 specBase/docs/<proj>/scan/scan-diff-report.md 且格式正确', (t) => {
    const f = mkRepo()
    t.after(() => cleanup(f.root))
    writeFileSync(join(f.root, 'src/core/new.js'), 'n\n')
    f.run('git add -A')
    f.run('git commit -q -m c')

    const code = runScanDiff({ ...opts(f), base: f.base, report: true })
    assert.equal(code, 1) // 有漂移
    const p = join(f.specBase, 'docs/demo/scan/scan-diff-report.md')
    assert.equal(existsSync(p), true)
    const content = readFileSync(p, 'utf8')
    assert.match(content, /^# scan-diff 报告/)
    assert.match(content, /- 项目：demo/)
    assert.match(content, /- 基线：\w{7}（--base 显式指定）/)
    assert.match(content, /## 漂移总览/)
    assert.match(content, /## 按模块聚合/)
    assert.match(content, /### core（modules\/core.md）/)
    assert.match(content, /- 文件：/)
    assert.match(content, /- `src\/core\/new.js`（A）/)
    assert.match(content, /## 结论/)
    assert.match(content, /- 漂移合计：1 条（A1 \/ D0 \/ M0）/)
    assert.match(content, /- 存在漂移：请按需核对并刷新对应 scan 文档/)
    assert.match(content, /> 由 sillyspec scan-diff 自动生成/)
  })
})

// ── CLI 集成 ────────────────────────────────────────────────────
describe('CLI 集成（node bin/sillyspec.js scan diff）', () => {
  function mkCliRepo() {
    const root = mkdtempSync(join(tmpdir(), 'scan-diff-cli-'))
    const proj = basename(root) // CLI 以仓库根 basename 作 projectName
    const run = (a) => execSync(a, { cwd: root, stdio: 'pipe' }).toString().trim()
    run('git init -q')
    run('git config user.email t@t.com')
    run('git config user.name t')
    mkdirSync(join(root, 'src/core'), { recursive: true })
    writeFileSync(join(root, 'src/core/a.js'), 'a1\n')
    run('git add -A')
    run('git commit -q -m base')
    const base = run('git rev-parse HEAD')
    const specBase = join(root, '.sillyspec')
    mkdirSync(join(specBase, 'docs', proj, 'scan'), { recursive: true })
    mkdirSync(join(specBase, 'docs', proj, 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', proj, 'scan', 'ARCH.md'), scanDoc(base))
    writeFileSync(join(specBase, 'docs', proj, 'modules', '_module-map.yaml'), DEFAULT_MAP)
    run('git add -A')
    run('git commit -q -m docs')
    writeFileSync(join(root, 'src/core/new.js'), 'n\n') // 有漂移
    run('git add -A')
    run('git commit -q -m c')
    return { root, base, run }
  }
  const bin = join(HERE, '..', 'bin', 'sillyspec.js')
  const cli = (args, cwd) => spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' })

  it('退出码：1 有漂移 / 0 无漂移 / 2 无效 base', (t) => {
    const { root, base, run } = mkCliRepo()
    t.after(() => cleanup(root))
    const head = run('git rev-parse HEAD')
    assert.equal(cli(['scan', 'diff'], root).status, 1, '有漂移 → 1')
    assert.equal(cli(['scan', 'diff', '--base', head], root).status, 0, 'base==HEAD → 0')
    assert.equal(cli(['scan', 'diff', '--base', 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'], root).status, 2, '无效 base → 2')
  })
})

// ── 模块化：git 依赖可 mock ─────────────────────────────────────
describe('模块化（git 依赖可注入）', () => {
  it('经 mock.module 注入 safeGit 驱动 computeScanDiff，全部分类仍正确（不 mock 被测方法自身）', () => {
    const child = spawnSync(process.execPath,
      ['--experimental-test-module-mocks', '--disable-warning=ExperimentalWarning', fileURLToPath(import.meta.url), '--scan-diff-module-mock'],
      { encoding: 'utf8' })
    assert.equal(child.status, 0, (child.stderr || child.stdout || '').slice(0, 2000))
  })
})

// ── 子进程场景实现 ──────────────────────────────────────────────
/** 仅子进程调用：mock.module 注入 git-helper.safeGit，证明 computeScanDiff 的 git 依赖可替换。 */
async function runModuleMockScenario() {
  const gitHelperUrl = pathToFileURL(join(HERE, '..', 'src', 'git-helper.js')).href
  const scanDiffUrl = pathToFileURL(join(HERE, '..', 'src', 'scan-diff.js')).href
  const specBase = mkdtempSync(join(tmpdir(), 'scan-diff-mock-'))
  try {
    // 顶层静态 import 已载入真实实例；此处注册 mock 后以「新鲜实例」重 import scan-diff
    const real = await import(gitHelperUrl)
    const calls = []
    mock.module(gitHelperUrl, {
      exports: {
        ...real,
        safeGit: (cwd, args) => {
          calls.push(args.join(' '))
          const a = args.join(' ')
          if (a.startsWith('rev-parse --verify')) return { value: '1111111111111111111111111111111111111111', error: null }
          if (a === 'rev-parse HEAD') return { value: '2222222222222222222222222222222222222222', error: null }
          if (a.startsWith('merge-base --is-ancestor')) return { value: null, error: 'not ancestor' }
          if (a.startsWith('rev-list --count')) return { value: '3', error: null }
          if (a.startsWith('log -1 --format=%cI')) return { value: '2026-08-01T00:00:00+08:00', error: null }
          if (a.startsWith('diff --name-status')) {
            return { value: 'A\tsrc/core/new.js\nD\tsrc/core/old.js\nM\tsrc/util/u.js\nR100\tsrc/core/a.js\tsrc/core/renamed.js', error: null }
          }
          throw new Error('unexpected git call: ' + a)
        },
      },
    })
    const { computeScanDiff } = await import(scanDiffUrl + '?mock=1')
    mkdirSync(join(specBase, 'docs/demo/modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs/demo/modules/_module-map.yaml'), DEFAULT_MAP)

    const r = computeScanDiff({ projectRoot: 'C:/fake-repo', specBase, projectName: 'demo', base: 'abc1234' })
    const assertEq = (label, actual, expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${label}: 期望 ${JSON.stringify(expected)}，实得 ${JSON.stringify(actual)}`)
      }
    }
    assertEq('ok', r.ok, true)
    assertEq('added', r.added, ['src/core/new.js'])
    assertEq('deleted', r.deleted, ['src/core/old.js'])
    assertEq('modified', [...r.modified].sort(), ['src/core/renamed.js', 'src/util/u.js'])
    assertEq('renameMap', r.renameMap, { 'src/core/renamed.js': 'src/core/a.js' })
    assertEq('unmapped', r.unmapped, [])
    assertEq('driftCount', r.driftCount, 4)
    assertEq('byModule.core', r.byModule.core, {
      doc: 'modules/core.md', added: 1, deleted: 1, modified: 1,
      files: ['src/core/new.js', 'src/core/old.js', 'src/core/renamed.js'],
    })
    assertEq('byModule.util', r.byModule.util, {
      doc: 'modules/util.md', added: 0, deleted: 0, modified: 1, files: ['src/util/u.js'],
    })
    if (!r.warnings.some((w) => w.includes('不是 HEAD') && w.includes('祖先'))) {
      throw new Error('非祖先警告应注入')
    }
    if (calls.length !== 6) {
      throw new Error(`git 依赖应为 6 次 mock 调用（全部走注入层），实得 ${calls.length}：${calls.join(' | ')}`)
    }
    return 0
  } catch (e) {
    console.error('scan-diff 模块化子进程失败:', e.message)
    return 1
  } finally {
    cleanup(specBase)
  }
}
