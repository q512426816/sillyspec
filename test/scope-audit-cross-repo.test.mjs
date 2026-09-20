/**
 * 跨仓分仓真实对账专项测试（变更 2026-09-20-scope-audit-cross-repo task-04）。
 *
 * 真 git 夹具（mkdtemp + git init + config user + design.md 清单 + local.yaml repos 注册，
 * 零 mock git）覆盖 collectRepoActual 共享内核锚点四级与 scope-audit 集成面：
 *   1. 锚点四级（D-001 / FR-01）：A 档 reviews-range（execute task 锡点区间并集 ∪ status
 *      未提交尾巴；base=最早 base / head=最晚 head）/ B 档 head~1-window（无 reviews 降级）/
 *      C 档 head-uncommitted-window（单 commit 仓仅 status）/ degraded 三类边界（未注册 key /
 *      注册路径不可达 / 非 git 目录——fail-soft 不 throw）
 *   2. 跨仓行真实三态（FR-02）：design 清单跨仓段 × 该仓 actual 差集出 planned / unplanned /
 *      untouched 补行，行数 = 该仓锚点窗口 numstat（非 degraded 时不再恒 untouched）
 *   3. repos[] 信封（FR-03）：main 条目首位（只计主仓行）+ 跨仓条目锚点透传 + 三态计数 +
 *      degraded 仓降级条目
 *   4. 单仓变更 --json 逐字节等价（兼容策略 1 / FR-05）：计划侧无跨仓条目 → 无 repos 键、
 *      行级零新字段（注册表在但未引用同样零输出）
 *   5. 双仓 e2e 三仓合并表（AC-01 / FR-02+FR-04）：主仓 2 文件 + crossA 2 文件 + crossB 1 文件
 *      合并 rows；渲染出「✓ 计划内 [仓key]」行标与「跨仓 <key>：锚点」per-repo 汇总
 *   6. --file 跨仓路由（FR-04 / D-002）：跨仓行在该仓根出 base..head 锡点区间 diff，
 *      主仓行路径零变化
 *   7. settled 快照语义（D-002@v1）：新快照 repos 透传回放；旧快照（无 repos + 跨仓恒
 *      untouched）⊘ 形态 + 「冻结于跨仓对账上线前」注记；needsStats 行数补采跳过 crossRepo 行
 *      （跨仓行维持快照冻结值，不落 {0,0,deleted} 伪数据）
 *
 * 夹具约定（沿 test/scope-audit.test.mjs 同款）：
 *   - 主分支叫 main；git config user.email/name 必设（Windows/跨平台）
 *   - 主仓 .gitignore 整个 .sillyspec/（spec 产物不进主仓窗口）
 *   - local.yaml 注册路径写正斜杠形（parseRepoRegistry 保留反斜杠、isAbsolute 双形兼容，
 *     Windows 盘符路径正斜杠写法与既有 cross-repo-probe7-anchor 测试同款）
 *   - 断言中的仓根路径比较统一正斜杠归一（repoPath 来自注册表原文，分隔符形态随平台）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { collectRepoActual } from '../src/cross-repo-reconcile.js'
import { computeChangeScopeAudit, renderScopeAuditTable, getFileDiff } from '../src/scope-audit.js'

/** git 调用：数组参数不经 shell（Windows 路径安全），stdio pipe 吞输出 */
function sh(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function cleanup(d) {
  try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* Windows 句柄延迟，重试后仍失败留给 OS Temp 回收 */ }
}

/** 临时 git 仓：main 分支 + 身份配置 + gitignore .sillyspec/（夹具内 spec 产物不进窗口） */
function makeRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  sh(d, ['init', '-q', '-b', 'main'])
  sh(d, ['config', 'user.email', 't@t.com'])
  sh(d, ['config', 'user.name', 't'])
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

function head(d) { return sh(d, ['rev-parse', 'HEAD']).trim() }

function commitAll(d, msg) {
  sh(d, ['add', '-A'])
  sh(d, ['commit', '-q', '-m', msg])
}

/** 正斜杠归一（local.yaml 注册值 / 仓根比较统一口径） */
const fwd = (p) => String(p).replace(/\\/g, '/')

/** design.md 夹具：正文直写（跨仓子段形态由调用方给） */
function writeDesignBody(specBase, changeName, body, { archived = false } = {}) {
  const changeDir = join(specBase, 'changes', ...(archived ? ['archive', changeName] : [changeName]))
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'),
    `# design（fixture）\n\n## 文件变更清单\n\n${body}\n`)
}

/** 形态 A 夹具：伪造 worktree meta.json（in-place 退化——diff/numstat 均在主仓根跑） */
function writeWorktreeMeta(specBase, changeName, baseHash) {
  mkdirSync(join(specBase, '.runtime', 'worktrees', changeName), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'worktrees', changeName, 'meta.json'),
    JSON.stringify({ changeName, mode: 'in-place-fallback', baseHash }))
}

/**
 * 三仓聚落夹具（真 git，零 mock）：
 *   - crossA（A 档）：c1(seed.js) → c2(新增 auth.py) → c3(改 seed.js)，execute-runs 两 task
 *     review 锡点（task-01: c1..c2 / task-02: c2..c3）+ 可选未提交尾巴 untracked-tail.js
 *   - crossB（B 档）：b-init(base.txt) → b-work(新增 demo.py)，无 reviews → HEAD~1..HEAD 窗口
 *   - 主仓：init commit（mainFiles 各 'm1\n'）→ base；local.yaml 注册 crossA/crossB
 *     （可选 crossD 指向不可达路径，造 degraded 边界）
 * opts：changeName / reviews（execute-runs 锡点）/ untrackedTail / ghostD / mainFiles
 */
function makeCrossWorld(prefix, opts = {}) {
  const { changeName = 'xrepo-change', reviews = true, untrackedTail = true, ghostD = false, mainFiles = ['src/main.js'] } = opts
  const dirs = []
  const take = (p) => { dirs.push(p); return p }
  const main = take(makeRepo(prefix + '-main-'))
  const crossA = take(makeRepo(prefix + '-crossa-'))
  const crossB = take(makeRepo(prefix + '-crossb-'))

  // crossA 三笔提交（A 档区间素材）
  mkdirSync(join(crossA, 'src'), { recursive: true })
  writeFileSync(join(crossA, 'src', 'seed.js'), 's1\n')
  commitAll(crossA, 'c1-seed')
  const c1 = head(crossA)
  writeFileSync(join(crossA, 'src', 'auth.py'), 'auth1\n')
  commitAll(crossA, 'c2-auth')
  const c2 = head(crossA)
  writeFileSync(join(crossA, 'src', 'seed.js'), 's1\ns2\n')
  commitAll(crossA, 'c3-seed2')
  const c3 = head(crossA)
  if (untrackedTail) writeFileSync(join(crossA, 'src', 'untracked-tail.js'), 'tail1\ntail2\n')

  // crossB 两笔提交（B 档素材：HEAD 提交新增 demo.py，无 reviews）
  mkdirSync(join(crossB, 'src'), { recursive: true })
  writeFileSync(join(crossB, 'src', 'base.txt'), 'b0\n')
  commitAll(crossB, 'b-init')
  writeFileSync(join(crossB, 'src', 'demo.py'), 'demo1\n')
  commitAll(crossB, 'b-work')

  // 主仓 init + 注册表
  for (const f of mainFiles) {
    mkdirSync(dirname(join(main, f)), { recursive: true })
    writeFileSync(join(main, f), 'm1\n')
  }
  commitAll(main, 'init')
  const base = head(main)
  const specBase = join(main, '.sillyspec')
  const runtimeRoot = join(specBase, '.runtime')
  mkdirSync(specBase, { recursive: true })
  const repoLines = [
    'repos:',
    `  crossA: ${fwd(crossA)}`,
    `  crossB: ${fwd(crossB)}`,
  ]
  if (ghostD) repoLines.push(`  crossD: ${fwd(join(main, 'no-such-ghost-dir'))}`)
  repoLines.push('')
  writeFileSync(join(specBase, 'local.yaml'), repoLines.join('\n'))

  // execute-runs：crossA 两 task review 锡点（change 戳归属本变更）
  if (reviews) {
    const runDir = join(runtimeRoot, 'execute-runs', 'exec-20260920-010203')
    mkdirSync(runDir, { recursive: true })
    writeFileSync(join(runDir, 'change'), changeName + '\n')
    const stamps = [['task-01', c1, c2], ['task-02', c2, c3]]
    for (const [task, b, h] of stamps) {
      const taskDir = join(runDir, 'tasks', task)
      mkdirSync(taskDir, { recursive: true })
      writeFileSync(join(taskDir, 'review.json'), JSON.stringify({
        schemaVersion: 1, task, repo: 'crossA', base: b, head: h,
        specVerdict: 'pass', qualityVerdict: 'pass', changedFiles: [], requiredEvidence: [],
      }))
    }
  }
  return {
    main, specBase, runtimeRoot, base, changeName,
    crossA: { dir: crossA, c1, c2, c3 },
    crossB: { dir: crossB },
    cleanup: () => { for (const d of dirs) cleanup(d) },
  }
}

// ───────────────────────── 组 1：collectRepoActual 锚点四级（FR-01 / D-001） ─────────────────────────

test('A 档锚点：reviews-range 锡点区间并集——base=最早 base/head=最晚 head/files=区间 diff ∪ status 未提交尾巴', () => {
  const w = makeCrossWorld('xcr-a-')
  try {
    const r = collectRepoActual({ repoKey: 'crossA', specBase: w.specBase, cwd: w.main, runtimeRoot: w.runtimeRoot, changeName: w.changeName })
    assert.equal(r.repo, 'crossA', '回带 repoKey')
    assert.equal(r.degradedReason, null, 'A 档可用不降级')
    assert.equal(r.anchor.source, 'reviews-range', '锚点档 = reviews-range')
    assert.equal(r.anchor.base, w.crossA.c1, 'base = 两 task 区间最早 base（c1）')
    assert.equal(r.anchor.head, w.crossA.c3, 'head = 两 task 区间最晚 head（c3）')
    assert.ok(r.anchor.label.includes('2 task 区间并集'), `label 注记区间并集（实际 ${r.anchor.label}）`)
    assert.deepEqual(r.files, ['src/auth.py', 'src/seed.js', 'src/untracked-tail.js'],
      'files = c1..c2（auth.py）∪ c2..c3（seed.js）∪ status 未提交尾巴（untracked-tail.js）')
    assert.equal(fwd(r.repoPath), fwd(w.crossA.dir), 'repoPath = 注册表解析的仓根')
  } finally { w.cleanup() }
})

test('B 档锚点：同 run 无该仓 reviews → head~1-window 降级，files=HEAD~1..HEAD ∪ status', () => {
  const w = makeCrossWorld('xcr-b-')
  try {
    // execute-runs 存在且归属本变更，但 review.repo 全是 crossA → crossB 无可用 reviews 落 B 档
    const r = collectRepoActual({ repoKey: 'crossB', specBase: w.specBase, cwd: w.main, runtimeRoot: w.runtimeRoot, changeName: w.changeName })
    assert.equal(r.degradedReason, null)
    assert.equal(r.anchor.source, 'head~1-window', '锚点档 = head~1-window')
    assert.equal(r.anchor.base, null, 'B 档无行数锚（base=null）')
    assert.ok(r.anchor.label.includes('降级'), `label 注记降级（实际 ${r.anchor.label}）`)
    assert.deepEqual(r.files, ['src/demo.py'], 'files = HEAD~1..HEAD（demo.py）∪ status（干净）')
  } finally { w.cleanup() }
})

test('C 档锚点：单 commit 仓（HEAD~1 不存在）→ head-uncommitted-window 仅 status 未提交窗口', () => {
  const proj = mkdtempSync(join(tmpdir(), 'xcr-c-proj-'))
  const crossC = makeRepo('xcr-c-repo-')
  try {
    writeFileSync(join(crossC, 'only.txt'), 'x\n')
    commitAll(crossC, 'only')                       // 单 commit 仓：HEAD~1 不存在
    writeFileSync(join(crossC, 'wip.js'), 'w1\nw2\n') // 未提交新文件 → status 面
    const specBase = join(proj, '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), `repos:\n  crossC: ${fwd(crossC)}\n`)
    const r = collectRepoActual({ repoKey: 'crossC', specBase, cwd: proj, runtimeRoot: join(specBase, '.runtime'), changeName: 'c-change' })
    assert.equal(r.degradedReason, null)
    assert.equal(r.anchor.source, 'head-uncommitted-window', 'diff 锚缺失 → C 档仅 status')
    assert.ok(r.anchor.label.includes('降级'), `label 注记降级（实际 ${r.anchor.label}）`)
    assert.deepEqual(r.files, ['wip.js'], 'files = status 未提交窗口 only')
  } finally { cleanup(proj); cleanup(crossC) }
})

test('degraded 三类边界：未注册 key / 注册路径不可达 / 非 git 目录——各自文案 + files=[] + 不 throw', () => {
  const proj = mkdtempSync(join(tmpdir(), 'xcr-d-proj-'))
  const notGit = mkdtempSync(join(tmpdir(), 'xcr-d-notgit-'))
  try {
    writeFileSync(join(notGit, 'plain.txt'), 'x\n') // 普通目录（非 git 仓）
    const specBase = join(proj, '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), [
      'repos:',
      `  crossD: ${fwd(join(proj, 'definitely-missing-dir'))}`,
      `  crossE: ${fwd(notGit)}`,
      '',
    ].join('\n'))
    const runtimeRoot = join(specBase, '.runtime')

    // ① 未注册 key（crossZ 不在 local.yaml repos）
    const z = collectRepoActual({ repoKey: 'crossZ', specBase, cwd: proj, runtimeRoot, changeName: 'd-change' })
    assert.equal(z.anchor.source, 'degraded')
    assert.deepEqual(z.files, [], 'degraded 无 actual')
    assert.equal(z.repoPath, null)
    assert.ok(z.degradedReason.includes('未在 local.yaml repos 注册'), `未注册文案（实际 ${z.degradedReason}）`)
    assert.ok(z.degradedReason.includes('crossZ'), '文案点名 key')

    // ② 注册路径不可达（crossD 指向不存在目录）
    const dd = collectRepoActual({ repoKey: 'crossD', specBase, cwd: proj, runtimeRoot, changeName: 'd-change' })
    assert.equal(dd.anchor.source, 'degraded')
    assert.deepEqual(dd.files, [])
    assert.ok(dd.degradedReason.includes('注册路径不可达'), `不可达文案（实际 ${dd.degradedReason}）`)
    assert.equal(fwd(dd.repoPath), fwd(join(proj, 'definitely-missing-dir')), 'repoPath 带注册原文路径')

    // ③ 非 git 目录（diff 与 status 双源失败合并判定）
    const ee = collectRepoActual({ repoKey: 'crossE', specBase, cwd: proj, runtimeRoot, changeName: 'd-change' })
    assert.equal(ee.anchor.source, 'degraded')
    assert.deepEqual(ee.files, [])
    assert.ok(ee.degradedReason.includes('git 不可用/非仓库'), `非仓库文案（实际 ${ee.degradedReason}）`)
  } finally { cleanup(proj); cleanup(notGit) }
})

// ───────────────────────── 组 2：跨仓行真实三态（FR-02，computeChangeScopeAudit 全链） ─────────────────────────

test('跨仓行真实三态：清单文件实改→planned 带真实行数 / 未声明实际文件→unplanned / 清单未动→untouched 补行', async () => {
  const w = makeCrossWorld('xcr-t-')
  try {
    writeDesignBody(w.specBase, w.changeName, `| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/main.js | 主仓实改 |

### crossA

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/auth.py | A 档区间内实改 |
| 新增 | src/todo.py | 清单未动 |
`)
    writeWorktreeMeta(w.specBase, w.changeName, w.base)
    writeFileSync(join(w.main, 'src', 'main.js'), 'm1\nm2\n')

    const r = await computeChangeScopeAudit({ cwd: w.main, changeName: w.changeName })
    assert.equal(r.mode, 'full-flow', 'full-flow 模式')
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    const byPath = new Map(r.rows.map(x => [x.path, x]))

    // 主仓行为零变化（对照组）
    const main = byPath.get('src/main.js')
    assert.equal(main.verdict, 'planned', '主仓实改 planned')
    assert.ok(!main.crossRepo, '主仓行无 crossRepo 字段')

    // planned：清单声明 + A 档区间内实改 → 真实行数（c1..工作树 numstat）
    const auth = byPath.get('src/auth.py')
    assert.ok(auth, '跨仓实改文件进 rows')
    assert.equal(auth.verdict, 'planned', '跨仓行真实三态：实改 → planned（不恒 untouched）')
    assert.equal(auth.crossRepo, 'crossA', '跨仓归属 crossA')
    assert.equal(auth.planned, '新增', 'planned 字段携带清单 operation')
    assert.equal(auth.additions, 1, 'A 档锚窗口行数：auth.py 新增 1 行')
    assert.equal(auth.deletions, 0)
    assert.equal(auth.kind, 'new', '相对 c1 为新增文件')

    // unplanned：该仓实际改动未声明（c3 的 seed.js + 未提交尾巴）
    const seed = byPath.get('src/seed.js')
    assert.ok(seed, '区间内未声明文件进 rows')
    assert.equal(seed.verdict, 'unplanned', '未声明实际文件 → unplanned')
    assert.equal(seed.crossRepo, 'crossA')
    assert.equal(seed.additions, 1, 'unplanned 跨仓行同锚窗口行数')
    const tail = byPath.get('src/untracked-tail.js')
    assert.ok(tail, 'status 未提交尾巴进 rows')
    assert.equal(tail.verdict, 'unplanned')
    assert.equal(tail.kind, 'new', 'untracked 走 wc-l 档')
    assert.equal(tail.additions, 2, 'wc-l 记全 + 行')

    // untouched：清单文件无实际改动 → 补行（0/0，crossRepo 恒带）
    const todo = byPath.get('src/todo.py')
    assert.ok(todo, '清单未动跨仓文件有补行')
    assert.equal(todo.verdict, 'untouched')
    assert.equal(todo.additions, 0)
    assert.equal(todo.crossRepo, 'crossA')

    // 「不恒 untouched」总断言：非 degraded 仓的跨仓行三态齐全，非全 untouched
    const crossVerdicts = new Set(r.rows.filter(x => x.crossRepo === 'crossA').map(x => x.verdict))
    assert.deepEqual([...crossVerdicts].sort(), ['planned', 'unplanned', 'untouched'],
      'crossA 组三态齐全（v1 恒 untouched 失真修复）')
    assert.equal(r.totals.files, 5, '合计含跨仓行（主仓 1 + crossA 4）')
    assert.equal(r.totals.additions, 5, '主仓 1 + auth 1 + seed 1 + tail 2')
  } finally { w.cleanup() }
})

// ───────────────────────── 组 3：repos[] 信封（FR-03） ─────────────────────────

test('repos[] 信封：main 首位只计主仓行 + 跨仓锚点透传 + 三态计数 + degraded 仓降级条目', async () => {
  const w = makeCrossWorld('xcr-env-', { ghostD: true })
  try {
    writeDesignBody(w.specBase, w.changeName, `| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/main.js | 主仓实改 |

### crossA

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/auth.py | 实改 |
| 新增 | src/todo.py | 未动 |

### crossD

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/ghost.py | 不可达仓 |
`)
    writeWorktreeMeta(w.specBase, w.changeName, w.base)
    writeFileSync(join(w.main, 'src', 'main.js'), 'm1\nm2\n')

    const r = await computeChangeScopeAudit({ cwd: w.main, changeName: w.changeName })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.ok(Array.isArray(r.repos), '计划侧含跨仓条目 → 输出 repos 信封')

    // main 条目首位：只计主仓行
    const mainEntry = r.repos[0]
    assert.equal(mainEntry.key, 'main')
    assert.equal(mainEntry.repoPath, null, 'main 条目 repoPath=null 不冗余')
    assert.equal(mainEntry.anchor.source, 'main-worktree', 'main 锚 = 主仓形态包装（形态 A worktree）')
    assert.equal(mainEntry.anchor.base, w.base, 'main 锚 base = 主仓 baseAnchor')
    assert.equal(mainEntry.degraded, false)
    assert.deepEqual(mainEntry.totals, { files: 1, additions: 1, deletions: 0, planned: 1, unplanned: 0, untouched: 0 },
      'main totals 只计主仓行（跨仓行不并入）')

    // crossA 条目：内核锚点透传 + 该仓行三态计数
    const ra = r.repos.find(x => x.key === 'crossA')
    assert.ok(ra, 'crossA 条目在')
    assert.equal(fwd(ra.repoPath), fwd(w.crossA.dir))
    assert.equal(ra.degraded, false)
    assert.equal(ra.degradedReason, null)
    assert.deepEqual(ra.anchor, {
      source: 'reviews-range', base: w.crossA.c1, head: w.crossA.c3,
      label: `reviews base..head（execute task 锡点，2 task 区间并集）`,
    }, '锚点档原样透传（A 档锡点）')
    assert.deepEqual(ra.totals, { files: 4, additions: 4, deletions: 0, planned: 1, unplanned: 2, untouched: 1 },
      'crossA totals：auth planned + seed/tail unplanned + todo untouched')

    // crossD 条目：注册路径不可达 → degraded 条目
    const rd = r.repos.find(x => x.key === 'crossD')
    assert.ok(rd, 'degraded 仓也进信封')
    assert.equal(rd.degraded, true)
    assert.ok(rd.degradedReason.includes('注册路径不可达'), `degradedReason（实际 ${rd.degradedReason}）`)
    assert.equal(rd.anchor.source, 'degraded')
    assert.deepEqual(rd.totals, { files: 1, additions: 0, deletions: 0, planned: 0, unplanned: 0, untouched: 1 },
      'degraded 仓 totals 恒全 untouched')
    const ghost = r.rows.find(x => x.path === 'src/ghost.py')
    assert.equal(ghost.verdict, 'untouched', 'degraded 仓跨仓行退 v1 ⊘ 形态（恒 untouched）')
    assert.equal(ghost.crossRepo, 'crossD')
    assert.ok(r.note && r.note.includes('跨仓 crossD 对账降级'), `note 逐仓降级说明（实际 ${r.note}）`)
  } finally { w.cleanup() }
})

// ───────────────────────── 组 4：单仓变更 --json 逐字节等价（兼容策略 1 / FR-05） ─────────────────────────

test('单仓变更逐字节等价：design 无跨仓段 → 无 repos 键、行级零新字段（注册表在但未引用同样零输出）', async () => {
  const body = `| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/main.js | 主仓实改 |
`
  const w1 = makeCrossWorld('xcr-eq1-', { untrackedTail: false }) // local.yaml 注册 crossA/crossB 但清单未引用
  const d2 = makeRepo('xcr-eq2-')                                  // 无 local.yaml（v1 形态对照）
  try {
    writeDesignBody(w1.specBase, w1.changeName, body)
    writeWorktreeMeta(w1.specBase, w1.changeName, w1.base)
    writeFileSync(join(w1.main, 'src', 'main.js'), 'm1\nm2\n')

    const specBase2 = join(d2, '.sillyspec')
    mkdirSync(join(d2, 'src'), { recursive: true })
    writeFileSync(join(d2, 'src', 'main.js'), 'm1\n')
    commitAll(d2, 'init')
    writeDesignBody(specBase2, 'xrepo-change', body)
    const base2 = head(d2)
    writeWorktreeMeta(specBase2, 'xrepo-change', base2)
    writeFileSync(join(d2, 'src', 'main.js'), 'm1\nm2\n')

    const r1 = await computeChangeScopeAudit({ cwd: w1.main, changeName: w1.changeName })
    const r2 = await computeChangeScopeAudit({ cwd: d2, changeName: 'xrepo-change' })
    assert.equal(r1.ok, true, `ok（degradedReason=${r1.degradedReason}）`)
    assert.equal(r2.ok, true, `对照 ok（degradedReason=${r2.degradedReason}）`)

    // 无 repos 键（对象键 + 序列化文本双断言）
    assert.equal(r1.repos, undefined, '无 repos 键')
    assert.ok(!JSON.stringify(r1).includes('"repos"'), 'JSON 序列化不含 "repos"')
    // 行级零新字段：rows 无 crossRepo
    assert.equal(r1.rows.length, 1, '单行（主仓实改）')
    for (const row of r1.rows) assert.ok(!row.crossRepo, '主仓行无 crossRepo 字段')
    // 与 v1 形态键集相等 + 逐字节等价（剥 volatile baseAnchor 后 JSON 全等）
    assert.deepEqual(Object.keys(r1).sort(), Object.keys(r2).sort(), '结果对象键集与无注册表形态相等')
    const strip = (x) => JSON.stringify({ ...x, baseAnchor: '<stripped>' })
    assert.equal(strip(r1), strip(r2), '单仓变更 --json 与 v1 逐字节等价（additive 契约）')
  } finally { w1.cleanup(); cleanup(d2) }
})

// ───────────────────────── 组 5：双仓 e2e 三仓合并表（AC-01） ─────────────────────────

test('双仓 e2e 三仓合并表：主仓 2 + crossA 2 + crossB 1 合并 rows 全 planned + [仓key] 行标 + per-repo 汇总', async () => {
  const w = makeCrossWorld('xcr-e2e-', { untrackedTail: false, mainFiles: ['src/main-a.js', 'src/main-b.js'] })
  try {
    writeDesignBody(w.specBase, w.changeName, `| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/main-a.js | 主仓 1 |
| 修改 | src/main-b.js | 主仓 2 |

### crossA

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/auth.py | A 档实改 |
| 修改 | src/seed.js | A 档实改 |

### crossB

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/demo.py | B 档实改 |
`)
    writeWorktreeMeta(w.specBase, w.changeName, w.base)
    writeFileSync(join(w.main, 'src', 'main-a.js'), 'm1\nm2\n')
    writeFileSync(join(w.main, 'src', 'main-b.js'), 'm1\nm2\nm3\n')

    const r = await computeChangeScopeAudit({ cwd: w.main, changeName: w.changeName })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.totals.files, 5, '三仓行合并：主仓 2 + crossA 2 + crossB 1')
    for (const row of r.rows) assert.equal(row.verdict, 'planned', `${row.path} 全 planned`)

    const byPath = new Map(r.rows.map(x => [x.path, x]))
    assert.equal(byPath.get('src/auth.py').crossRepo, 'crossA')
    assert.equal(byPath.get('src/auth.py').additions, 1, 'A 档锡点窗口行数')
    assert.equal(byPath.get('src/seed.js').additions, 1)
    const demo = byPath.get('src/demo.py')
    assert.equal(demo.crossRepo, 'crossB')
    assert.equal(demo.additions, null, 'B 档无行数锚 → null 降级档（不出伪数据）')
    assert.equal(r.totals.additions, 5, '主仓 3 + crossA 2（crossB null 不计）')

    // 信封三仓条目
    assert.deepEqual(r.repos.map(x => x.key), ['main', 'crossA', 'crossB'], '信封 main 首位 + 声明序跨仓条目')

    // 渲染：跨仓行真实三态带仓标 + 表尾 per-repo 汇总
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('✓ 计划内 [crossA]'), 'crossA 行渲染带 [仓key] 标（实际形态非 ⊘）')
    assert.ok(out.includes('✓ 计划内 [crossB]'), 'crossB 行渲染带 [仓key] 标')
    assert.ok(!out.includes('⊘ 跨仓（本表不含）'), '非 degraded 跨仓行不再 ⊘')
    assert.ok(out.includes('已按 local.yaml repos 分仓对账'), '聚合行改「已按仓对账」措辞')
    assert.ok(out.includes('跨仓 crossA：锚点 reviews base..head（execute task 锡点，2 task 区间并集）'),
      'crossA per-repo 汇总行（A 档锚点 label）')
    assert.ok(out.includes('跨仓 crossB：锚点 HEAD~1..HEAD'), 'crossB per-repo 汇总行（B 档锚点 label）')
  } finally { w.cleanup() }
})

// ───────────────────────── 组 6：--file 跨仓路由（FR-04 / D-002） ─────────────────────────

test('--file 跨仓路由：跨仓行在该仓根出 base..head 锡点区间 diff，主仓行路径不变', async () => {
  const w = makeCrossWorld('xcr-file-', { untrackedTail: false })
  try {
    writeDesignBody(w.specBase, w.changeName, `| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/main.js | 主仓实改 |

### crossA

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/auth.py | 跨仓实改 |
`)
    writeWorktreeMeta(w.specBase, w.changeName, w.base)
    writeFileSync(join(w.main, 'src', 'main.js'), 'm1\nm2\n')

    // 跨仓行：路由 crossA 根，A 档封闭区间 diff（c1..c3）
    const fd = await getFileDiff({ cwd: w.main, changeName: w.changeName, filePath: 'src/auth.py' })
    assert.equal(fd.ok, true, `ok（note=${fd.note}）`)
    assert.equal(fwd(fd.root), fwd(w.crossA.dir), 'diff 执行根 = crossA 仓根（非主仓）')
    assert.equal(fd.baseRef, `${w.crossA.c1}..${w.crossA.c3}`, 'baseRef = reviews 锡点封闭区间')
    assert.ok(fd.anchorLabel.includes('reviews 锡点区间'), `anchorLabel 注记冻结语义（实际 ${fd.anchorLabel}）`)
    assert.ok(fd.diff && fd.diff.includes('+auth1'), `diff 为该仓区间内容（含新增行；实际 ${JSON.stringify((fd.diff || '').slice(0, 80))}）`)

    // 主仓行：路径零变化（meta 锚 + 主仓根）
    const fm = await getFileDiff({ cwd: w.main, changeName: w.changeName, filePath: 'src/main.js' })
    assert.equal(fm.ok, true, `主仓行 ok（note=${fm.note}）`)
    assert.equal(fwd(fm.root), fwd(w.main), '主仓行仍在主仓根执行')
    assert.equal(fm.baseRef, w.base, '主仓行 baseRef = 主仓 meta 锚')
    assert.ok(fm.diff && fm.diff.includes('+m2'), '主仓行 diff 内容正常')
  } finally { w.cleanup() }
})

// ───────────────────────── 组 7：settled 快照语义（D-002@v1） ─────────────────────────

test('settled 快照：新快照 repos 原样透传回放 + 渲染真实形态', async () => {
  const d = makeRepo('xcr-sn1-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    commitAll(d, 'init')
    const specBase = join(d, '.sillyspec')
    writeDesignBody(specBase, 'xsnap-a', '| 修改 | src/a.js | 说明 |\n', { archived: true })
    sh(d, ['tag', 'sillyspec-audit/sillyspec/xsnap-a']) // 执行证据（归档形态非预执行）
    const snap = {
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'abc1234',
      totals: { files: 2, additions: 13, deletions: 1 },
      rows: [
        { path: 'src/a.js', planned: '修改', additions: 3, deletions: 1, kind: 'modified', verdict: 'planned' },
        { path: 'pkg/x.go', planned: '新增', additions: 10, deletions: 0, kind: 'new', verdict: 'planned', crossRepo: 'crossA' },
      ],
      repos: [
        { key: 'main', repoPath: null, anchor: { source: 'main-post-apply', base: 'abc1234', head: null, label: 'post-apply 主仓锚' },
          totals: { files: 1, additions: 3, deletions: 1, planned: 1, unplanned: 0, untouched: 0 }, degraded: false, degradedReason: null },
        { key: 'crossA', repoPath: 'E:/nowhere/crossA', anchor: { source: 'reviews-range', base: 'b111', head: 'h222', label: 'reviews base..head（execute task 锡点，1 task 区间并集）' },
          totals: { files: 1, additions: 10, deletions: 0, planned: 1, unplanned: 0, untouched: 0 }, degraded: false, degradedReason: null },
      ],
      excluded: { foreignDeclared: [] },
      savedAt: '2026-09-20T08:00:00.000Z',
    }
    writeFileSync(join(specBase, 'changes', 'archive', 'xsnap-a', 'scope-audit.json'), JSON.stringify(snap))

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'xsnap-a' })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.deepEqual(r.repos, snap.repos, '快照 repos 原样透传（快照说什么是什么）')
    assert.equal(r.rows.length, 2)
    assert.equal(r.rows.find(x => x.crossRepo === 'crossA').verdict, 'planned', '跨仓行冻结值回放')
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('✓ 计划内 [crossA]'), '信封在 → 跨仓行渲染真实形态带仓标')
    assert.ok(out.includes('跨仓 crossA：锚点'), 'per-repo 汇总行')
  } finally { cleanup(d) }
})

test('settled 旧快照：无 repos + 跨仓恒 untouched 行 → ⊘ 形态照旧回放 + 「冻结于跨仓对账上线前」注记', async () => {
  const d = makeRepo('xcr-sn2-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    commitAll(d, 'init')
    const specBase = join(d, '.sillyspec')
    writeDesignBody(specBase, 'xsnap-b', '| 修改 | src/a.js | 说明 |\n', { archived: true })
    sh(d, ['tag', 'sillyspec-audit/sillyspec/xsnap-b'])
    // v1 旧快照：无 repos 键、跨仓行恒 untouched（⊘ 历史冻结值）
    writeFileSync(join(specBase, 'changes', 'archive', 'xsnap-b', 'scope-audit.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: 'abc1234',
      totals: { files: 2, additions: 3, deletions: 1 },
      rows: [
        { path: 'src/a.js', planned: '修改', additions: 3, deletions: 1, kind: 'modified', verdict: 'planned' },
        { path: 'src/x.py', planned: '新增', additions: 0, deletions: 0, kind: 'modified', verdict: 'untouched', crossRepo: 'crossA' },
      ],
      excluded: { foreignDeclared: [] },
      savedAt: '2026-09-10T08:00:00.000Z',
    }))

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'xsnap-b' })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.equal(r.repos, undefined, '旧快照无 repos 键 → 不输出（additive 兼容）')
    const cross = r.rows.find(x => x.crossRepo === 'crossA')
    assert.equal(cross.verdict, 'untouched', '⊘ 行历史冻结值照旧回放（不重算）')
    assert.ok(r.note && r.note.includes('冻结于跨仓对账上线前'), `note 指明历史形态与人工渠道（实际 ${r.note}）`)
    const out = renderScopeAuditTable(r)
    assert.ok(out.includes('⊘ 跨仓（本表不含）'), '无信封 → 跨仓行渲染保留 v1 ⊘ 标（不假装对账过）')
    assert.ok(out.includes('⊘ 行——本表不含'), '聚合行保留 v1 文案')
  } finally { cleanup(d) }
})

test('settled needsStats 补采跳过 crossRepo 行：主仓行复活真值、跨仓行维持 null 冻结（不落 {0,0,deleted}）', async () => {
  const d = makeRepo('xcr-sn3-')
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'a.js'), 'a1\n')
    commitAll(d, 'init')
    const specBase = join(d, '.sillyspec')
    writeDesignBody(specBase, 'xsnap-c', '| 修改 | src/a.js | 说明 |\n', { archived: true })
    // tag 锚链：分支 commit（a.js +2 行）→ tag → 删分支 → 主仓工作树落同改动（apply 形态）
    sh(d, ['checkout', '-q', '-b', 'sillyspec/xsnap-c'])
    writeFileSync(join(d, 'src', 'a.js'), 'a1\nb1\nb2\n')
    commitAll(d, 'branch work')
    sh(d, ['tag', 'sillyspec-audit/sillyspec/xsnap-c'])
    sh(d, ['checkout', '-q', 'main'])
    sh(d, ['branch', '-D', 'sillyspec/xsnap-c'])
    writeFileSync(join(d, 'src', 'a.js'), 'a1\nb1\nb2\n')
    // 快照：主仓行 + 跨仓行 additions 均 null（apply 后锚落地前窗口落盘），无 repos 键
    writeFileSync(join(specBase, 'changes', 'archive', 'xsnap-c', 'scope-audit.json'), JSON.stringify({
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: null,
      totals: { files: 2, additions: 0, deletions: 0 },
      rows: [
        { path: 'src/a.js', planned: '修改', additions: null, deletions: null, kind: 'modified', verdict: 'planned' },
        { path: 'src/x.py', planned: '新增', additions: null, deletions: null, kind: 'modified', verdict: 'planned', crossRepo: 'crossA' },
      ],
      excluded: { foreignDeclared: [] },
      savedAt: '2026-09-20T09:00:00.000Z',
    }))

    const r = await computeChangeScopeAudit({ cwd: d, changeName: 'xsnap-c' })
    assert.equal(r.ok, true, `ok（degradedReason=${r.degradedReason}）`)
    assert.match(r.baseAnchor, /^[0-9a-f]{7,40}$/, 'tag 锚恢复（补采基点在）')
    const main = r.rows.find(x => x.path === 'src/a.js')
    assert.equal(main.additions, 2, '主仓行 null → 按锚补采复活真值')
    assert.equal(main.deletions, 0)
    const cross = r.rows.find(x => x.crossRepo === 'crossA')
    assert.equal(cross.additions, null, '跨仓行维持快照 null 冻结值（补采跳过 crossRepo 行）')
    assert.equal(cross.deletions, null)
    assert.equal(cross.kind, 'modified', 'kind 不被主仓盘面误判成 deleted（不出伪数据）')
    assert.ok(r.note && r.note.includes('补采'), `note 标注补采口径（实际 ${r.note}）`)
  } finally { cleanup(d) }
})
