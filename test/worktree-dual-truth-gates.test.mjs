/**
 * 2026-09-15-worktree-dual-truth-gates 五坑回归收口（task-06 / FR-01~FR-05 / D-001~D-005@v1）。
 *
 * 五坑各一组用例（正向修复行为 + 零回归锚），断言行为契约不触内部符号（私有方法
 * _overlayBaseline/_supplyGeneratedFiles 为任务卡明示直调面）：
 *   组1 FR-01：baseline overlay 三道剔除并行会话声明文件（quick guard / 他变更 design §6，
 *      own 优先）；无声明与两参直调路径零回归。
 *   组2 FR-02：applyWorktree step 2 no-op 文件剔除（worktree 内容=主仓 HEAD blob）+ warnings
 *      清单；≠HEAD 文件与主仓 HEAD 无路径新文件不受影响。
 *   组3 FR-03：worktree.supplyFiles 生成物供给（精确+glob 复制 / meta.supplyFiles 记录 /
 *      缺失 warn 不阻断 / 未配置静默空转）。
 *   组4 FR-04：勾选守卫口径统一（collectWorktreeChangedFiles 单一真相 + baselineFiles 剔除，
 *      经 autoCheckPlanFromReviews 集成面）+ attributeSuspectTasks 多归属（reconcileTargetFiles
 *      消费面，suspectTask 边界 join 成 string）。
 *   组5 FR-05：required-evidence 逐文件核验双根（wt-only 新文件不再误报不存在）；meta 缺失
 *      退单根零回归。
 *
 * fixture 沿 test/verify-evidence-triple.test.mjs 的 makeFx + test/baseline-overlay-isolation.test.mjs
 * 的临时 git 仓搭法（node:test + node:assert/strict，Windows 路径 join + 正斜杠归一）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { WorktreeManager } from '../src/worktree.js'
import { applyWorktree } from '../src/worktree-apply.js'
import { collectWorktreeChangedFiles } from '../src/task-review.js'
import { autoCheckPlanFromReviews } from '../src/run/complete.js'
import { reconcileTargetFiles, runVerifyRequiredEvidenceCheck } from '../src/verify-postcheck.js'

function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function gitOut(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8' }).trim() }

/**
 * 临时 git 仓 fixture：init -b main + 身份 + core.autocrlf false（内容断言按 LF 精确比对），
 * .gitignore 预置 .sillyspec/.runtime/ 与 meta.json（runtime 产物与手写 meta 不进 untracked 道）。
 * files：{ 相对路径: 内容 }，全部进 base 提交。
 */
function makeRepo(files = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-dtg-'))
  sh('git init -b main -q', cwd)
  sh('git config user.email t@t && git config user.name t && git config core.autocrlf false', cwd)
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/.runtime/\nmeta.json\n')
  for (const [rel, content] of Object.entries(files)) {
    const p = join(cwd, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, content)
  }
  sh('git add -A && git commit -qm base', cwd)
  return cwd
}

/** design.md §6 文件变更清单（表格形态，change-list.js 双写法之一） */
function writeDesignWithList(specBase, changeName, paths, extra = '') {
  const dir = join(specBase, 'changes', changeName)
  mkdirSync(dir, { recursive: true })
  const rows = paths.map(p => `| 修改 | ${p} | 声明 |`)
  writeFileSync(join(dir, 'design.md'),
    `---\nauthor: t\ncreated_at: 2026-09-15T00:00:00\n---\n\n# ${changeName}\n${extra}\n## 6. 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n${rows.join('\n')}\n`)
}

/** 他 quick 会话 guard.json（--files 显式声明面） */
function writeQuickGuard(specBase, sessionId, allowedFiles) {
  const dir = join(specBase, '.runtime', 'quick-sessions', sessionId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'guard.json'), JSON.stringify({ allowedFiles }))
}

/** worktree meta.json（手搭形态，对齐 baseline-overlay-isolation.test.mjs 的 writeMeta 惯例） */
function writeMeta(wtDir, meta) {
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    name_zh: 'm', mode: 'worktree', baseBranch: 'main', baselineFiles: [], ...meta,
  }))
}

/** 真实注册 git worktree（porcelain / hash-object / patch apply 都要真 git 环境） */
function addWorktree(cwd, changeName) {
  const wt = join(cwd, '.sillyspec', '.runtime', 'worktrees', changeName)
  sh(`git worktree add "${wt}" -b sillyspec/${changeName}`, cwd)
  return wt
}

/** 收集 console.log/warn（隔离清单打印 / 缺失告警等可见性断言用） */
function captureConsole(fn) {
  const logs = []
  const warns = []
  const origLog = console.log
  const origWarn = console.warn
  console.log = (...a) => { logs.push(a.map(String).join(' ')) }
  console.warn = (...a) => { warns.push(a.map(String).join(' ')) }
  try {
    return { logs, warns, result: fn() }
  } finally {
    console.log = origLog
    console.warn = origWarn
  }
}

function cleanupRepo(cwd, wtPath) {
  try { if (wtPath) sh(`git worktree remove --force "${wtPath}"`, cwd) } catch { /* 尽力而为，仓随 rmSync 一并消亡 */ }
  try { rmSync(cwd, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* Windows 句柄释放延迟容忍 */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// 组1 FR-01：baseline overlay 隔离并行会话声明文件（D-001@v1）
// ─────────────────────────────────────────────────────────────────────────────

test('FR-01 正向：create 三道剔除他者声明在途文件（guard/design §6），own 优先照常 overlay', () => {
  const d = makeRepo({
    'feature.js': 'base\n',        // 未声明 → own 默认道，照常 overlay
    'foreign-staged.js': 'base\n', // 他变更 design §6 声明 + 主仓 staged → staged patch 道剔除
    'foreign-design.js': 'base\n', // 他变更 design §6 声明 + 主仓 unstaged → unstaged patch 道剔除
    'shared.js': 'base\n',         // 双方声明 → own 优先，照常 overlay
  })
  const cn = '2026-09-15-dtg1'
  const specBase = join(d, '.sillyspec')
  let wt = null
  try {
    // 本变更 own 声明 shared.js（design §6）；他变更声明三个 foreign 文件
    writeDesignWithList(specBase, cn, ['shared.js'])
    writeDesignWithList(specBase, '2026-09-15-other', ['foreign-design.js', 'foreign-staged.js', 'shared.js'])
    writeQuickGuard(specBase, 'quick-1a2b3c4d', ['foreign-quick.js'])
    // 主仓在途：own 两文件 unstaged、他者 staged/unstaged/untracked 各一
    writeFileSync(join(d, 'feature.js'), 'dirty-own\n')
    writeFileSync(join(d, 'shared.js'), 'dirty-shared\n')
    writeFileSync(join(d, 'foreign-design.js'), 'dirty-design\n')
    writeFileSync(join(d, 'foreign-staged.js'), 'dirty-staged\n')
    sh('git add foreign-staged.js', d)
    writeFileSync(join(d, 'foreign-quick.js'), 'quick-wip\n')

    const wm = new WorktreeManager({ cwd: d })
    const { logs, result } = captureConsole(() => wm.create(cn))
    wt = result.worktreePath

    // 剔除面：worktree 保留基线 HEAD 版本（staged/unstaged patch 道未回放）、untracked 不复制
    assert.equal(readFileSync(join(wt, 'foreign-staged.js'), 'utf8'), 'base\n', 'staged 声明文件不回放（保持 HEAD 版）')
    assert.equal(readFileSync(join(wt, 'foreign-design.js'), 'utf8'), 'base\n', 'unstaged 声明文件不回放（保持 HEAD 版）')
    assert.ok(!existsSync(join(wt, 'foreign-quick.js')), 'guard 声明 untracked 文件不复制进 worktree')
    // 保留面：未声明与 own 优先文件照常 overlay
    assert.equal(readFileSync(join(wt, 'feature.js'), 'utf8'), 'dirty-own\n', '未声明文件照常 overlay')
    assert.equal(readFileSync(join(wt, 'shared.js'), 'utf8'), 'dirty-shared\n', '双方声明 own 优先，照常 overlay')
    // meta.baselineFiles：只收 own 面
    const meta = wm.getMeta(cn)
    assert.ok((meta.baselineFiles || []).includes('feature.js') && (meta.baselineFiles || []).includes('shared.js'),
      `baselineFiles 含 own 文件（实际 ${JSON.stringify(meta.baselineFiles)}）`)
    assert.ok(!(meta.baselineFiles || []).some(f => String(f).startsWith('foreign-')), 'baselineFiles 不含他者声明文件')
    // checkpoint message 不夹带他者文件
    const ckptMsg = gitOut('git log --grep "baseline checkpoint" -1 --format=%B', wt)
    assert.ok(ckptMsg.includes('- feature.js') && ckptMsg.includes('- shared.js'), '夹带清单点名 own 文件')
    assert.ok(!ckptMsg.includes('foreign-'), '隔离的他者文件不进夹带清单')
    // 隔离清单可见性：一行打印（文件←归属者）
    assert.ok(logs.some(l => l.includes('已隔离 3 个并行会话声明的在途文件') && l.includes('foreign-quick.js←quick-1a2b3c4d')),
      `隔离清单打印（实际 ${logs.find(l => l.includes('并行会话声明')) || '无'}）`)
  } finally { cleanupRepo(d, wt) }
})

test('FR-01 零回归：无并行声明（foreign=[]）时 overlay 行为与现状完全一致', () => {
  const d = makeRepo({ 'feature.js': 'base\n' })
  const cn = '2026-09-15-dtg1z'
  let wt = null
  try {
    writeFileSync(join(d, 'feature.js'), 'dirty-own\n')   // unstaged
    writeFileSync(join(d, 'own-new.js'), 'new-own\n')     // untracked
    const wm = new WorktreeManager({ cwd: d })
    const { logs, result } = captureConsole(() => wm.create(cn))
    wt = result.worktreePath
    assert.equal(readFileSync(join(wt, 'feature.js'), 'utf8'), 'dirty-own\n', 'unstaged 改动照常 overlay')
    assert.ok(existsSync(join(wt, 'own-new.js')), 'untracked 新文件照常复制')
    const meta = wm.getMeta(cn)
    assert.deepEqual((meta.baselineFiles || []).slice().sort(), ['feature.js', 'own-new.js'], 'baselineFiles 全量收录')
    assert.ok(!logs.some(l => l.includes('并行会话声明')), '无声明时无隔离清单打印')
  } finally { cleanupRepo(d, wt) }
})

test('FR-01 零回归：_overlayBaseline 两参直调（不传 changeName）不切分——声明在场也全量 overlay', () => {
  const d = makeRepo({ 'feature.js': 'base\n', 'foreign-design.js': 'base\n' })
  const specBase = join(d, '.sillyspec')
  const wt = join(d, 'wt-legacy')
  try {
    // 声明面在场（证明下文全量 overlay 是「缺省不切分」而非「无处可剔」）
    writeQuickGuard(specBase, 'quick-1a2b3c4d', ['foreign-quick.js'])
    writeDesignWithList(specBase, '2026-09-15-other', ['foreign-design.js'])
    writeFileSync(join(d, 'feature.js'), 'dirty-own\n')
    writeFileSync(join(d, 'foreign-design.js'), 'dirty-design\n')
    writeFileSync(join(d, 'foreign-quick.js'), 'quick-wip\n')
    sh(`git worktree add "${wt}" -b tmp-legacy`, d)

    const wm = new WorktreeManager({ cwd: d })
    const r = wm._overlayBaseline(d, wt) // 两参：存量直调路径，changeName 缺省

    assert.ok(r.files.includes('feature.js') && r.files.includes('foreign-design.js') && r.files.includes('foreign-quick.js'),
      `返回 files 全量（实际 ${JSON.stringify(r.files)}）`)
    assert.ok(r.files.every(f => !String(f).includes('\\')), '返回路径正斜杠口径')
    assert.equal(readFileSync(join(wt, 'feature.js'), 'utf8'), 'dirty-own\n', 'unstaged patch 照常应用')
    assert.equal(readFileSync(join(wt, 'foreign-design.js'), 'utf8'), 'dirty-design\n', '他者声明文件照常应用（不隔离）')
    assert.ok(existsSync(join(wt, 'foreign-quick.js')), '他者 untracked 照常复制（不隔离）')
  } finally { cleanupRepo(d, wt) }
})

// ─────────────────────────────────────────────────────────────────────────────
// 组2 FR-02：assess/apply 剔除 no-op 文件（D-002@v1）
// ─────────────────────────────────────────────────────────────────────────────

test('FR-02 正向：主仓 HEAD 前进后 worktree 重同步文件剔除 changedFiles + warnings 清单；非 no-op 保留', () => {
  const d = makeRepo({ 'x.js': 'base\n', 'y.js': 'base\n' })
  const cn = '2026-09-15-dtg2'
  const wt = addWorktree(d, cn)
  try {
    const base = gitOut('git rev-parse HEAD', d)
    // 主仓 HEAD 前进：x.js 推进到新内容
    writeFileSync(join(d, 'x.js'), 'main-v2\n')
    sh('git add -A && git commit -qm advance', d)
    // worktree 自救：x.js 重同步成主仓 HEAD 同内容（对 baseline diff 非空、apply 实为 no-op）；
    // y.js 独立改动（≠主仓 HEAD）；z.js 主仓 HEAD 无路径的新文件
    writeFileSync(join(wt, 'x.js'), 'main-v2\n')
    writeFileSync(join(wt, 'y.js'), 'wt-y\n')
    writeFileSync(join(wt, 'z.js'), 'new\n')
    writeMeta(wt, { changeName: cn, branch: `sillyspec/${cn}`, baseHash: base, baselineCommit: base, worktreePath: wt })

    const r = applyWorktree(cn, { cwd: d, checkOnly: true })

    assert.equal(r.ok, true, `assess checkOnly ok（errors=${JSON.stringify(r.errors)}）`)
    assert.ok(!r.changedFiles.includes('x.js'), `no-op 文件剔除（实际 ${JSON.stringify(r.changedFiles)}）`)
    assert.ok(r.changedFiles.includes('y.js'), '内容 ≠ 主仓 HEAD 的文件保留')
    assert.ok(r.changedFiles.includes('z.js'), '主仓 HEAD 无路径的新文件保留')
    assert.ok((r.warnings || []).some(w => w.includes('no-op') && w.includes('x.js')),
      `warnings 含 no-op 清单（实际 ${JSON.stringify(r.warnings)}）`)
    assert.ok(!(r.warnings || []).some(w => w.includes('no-op') && (w.includes('y.js') || w.includes('z.js'))),
      '非 no-op 文件不进 no-op 告警')
  } finally { cleanupRepo(d, wt) }
})

test('FR-02 零回归：主仓未推进（HEAD==baseline）时无 no-op 剔除，改动文件判定不受影响', () => {
  const d = makeRepo({ 'w.js': 'base\n' })
  const cn = '2026-09-15-dtg2z'
  const wt = addWorktree(d, cn)
  try {
    const base = gitOut('git rev-parse HEAD', d)
    writeFileSync(join(wt, 'w.js'), 'wt-change\n') // worktree 独立改动，主仓 HEAD 仍是 base
    writeMeta(wt, { changeName: cn, branch: `sillyspec/${cn}`, baseHash: base, baselineCommit: base, worktreePath: wt })

    const r = applyWorktree(cn, { cwd: d, checkOnly: true })

    assert.equal(r.ok, true)
    assert.ok(r.changedFiles.includes('w.js'), '非 no-op 改动保留在 changedFiles')
    assert.ok(!(r.warnings || []).some(w => w.includes('no-op')), '无 no-op 告警')
  } finally { cleanupRepo(d, wt) }
})

// ─────────────────────────────────────────────────────────────────────────────
// 组3 FR-03：worktree.supplyFiles 生成物供给（D-003@v1）
// ─────────────────────────────────────────────────────────────────────────────

test('FR-03 正向：精确+glob 供给复制就位；缺失 warn 不阻断；glob 不越类匹配', () => {
  const d = makeRepo({ 'gen/two.js': 'js\n' })
  const target = mkdtempSync(join(tmpdir(), 'sillyspec-dtg-supply-'))
  const silent = mkdtempSync(join(tmpdir(), 'sillyspec-dtg-supply2-'))
  try {
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'build-id.ts'), 'id-1\n')
    writeFileSync(join(d, 'gen', 'one.ts'), 'g1\n')
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'local.yaml'),
      'worktree:\n  supplyFiles:\n    - src/build-id.ts\n    - gen/*.ts\n    - missing/absent.js\n')

    const wm = new WorktreeManager({ cwd: d })
    const { warns, result } = captureConsole(() => wm._supplyGeneratedFiles(target))

    assert.deepEqual(result, ['gen/one.ts', 'src/build-id.ts'], `实供清单（排序稳定，实际 ${JSON.stringify(result)}）`)
    assert.equal(readFileSync(join(target, 'src', 'build-id.ts'), 'utf8'), 'id-1\n', '精确路径复制就位（父目录按需创建）')
    assert.equal(readFileSync(join(target, 'gen', 'one.ts'), 'utf8'), 'g1\n', 'glob 命中复制就位')
    assert.ok(!existsSync(join(target, 'gen', 'two.js')), 'glob *.ts 不越类匹配 .js')
    assert.ok(warns.some(w => w.includes('supplyFiles') && w.includes('missing/absent.js')), '缺失项 warn 提示')

    // 零回归：未配置（无 local.yaml）→ 静默空转，无输出无文件
    const d2 = makeRepo({ 'a.js': 'a\n' })
    try {
      const wm2 = new WorktreeManager({ cwd: d2 })
      const cap = captureConsole(() => wm2._supplyGeneratedFiles(silent))
      assert.deepEqual(cap.result, [], '未配置返回空清单')
      assert.ok(!cap.warns.some(w => w.includes('supplyFiles')), '未配置无供给告警')
      assert.ok(!cap.logs.some(l => l.includes('supplyFiles')), '未配置无供给日志')
      assert.ok(!existsSync(join(silent, 'a.js')), '未配置零复制')
    } finally { cleanupRepo(d2, null) }
  } finally {
    try { rmSync(target, { recursive: true, force: true }) } catch { /* best-effort */ }
    try { rmSync(silent, { recursive: true, force: true }) } catch { /* best-effort */ }
  }
})

test('FR-03 正向（create 集成）：gitignore 生成物经供给步进 worktree + meta.supplyFiles 记录（缺命中不阻断）', () => {
  const d = mkdtempSync(join(tmpdir(), 'sillyspec-dtg-'))
  const cn = '2026-09-15-dtg3'
  let wt = null
  try {
    sh('git init -b main -q', d)
    sh('git config user.email t@t && git config user.name t && git config core.autocrlf false', d)
    // build-id.ts 是 gitignore 生成物：不在 git 树、也不进 untracked overlay（exclude-standard 尊重 .gitignore）
    writeFileSync(join(d, '.gitignore'), '.sillyspec/.runtime/\nmeta.json\nsrc/build-id.ts\n')
    writeFileSync(join(d, 'a.js'), 'a\n')
    sh('git add -A && git commit -qm base', d)
    mkdirSync(join(d, 'src'), { recursive: true })
    writeFileSync(join(d, 'src', 'build-id.ts'), 'id-1\n')
    mkdirSync(join(d, '.sillyspec'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'local.yaml'),
      'worktree:\n  supplyFiles:\n    - src/build-id.ts\n    - no-such.js\n')

    const wm = new WorktreeManager({ cwd: d })
    const result = wm.create(cn) // no-such.js 缺失 → warn 但不阻断
    wt = result.worktreePath

    assert.equal(readFileSync(join(wt, 'src', 'build-id.ts'), 'utf8'), 'id-1\n', '生成物复制进 worktree')
    assert.deepEqual(wm.getMeta(cn).supplyFiles, ['src/build-id.ts'], 'meta.supplyFiles 记录实供清单')
  } finally { cleanupRepo(d, wt) }
})

// ─────────────────────────────────────────────────────────────────────────────
// 组4 FR-04：勾选守卫口径统一 + 归因多归属（D-004@v1）
// ─────────────────────────────────────────────────────────────────────────────

test('FR-04 helper 面：collectWorktreeChangedFiles = porcelain 未提交 ∪ committed 补齐；in-place 退化取 cwd', () => {
  const d = makeRepo({ 'a.js': 'a\n', 'b.js': 'b\n' })
  const cn = '2026-09-15-dtg4'
  const wt = addWorktree(d, cn)
  try {
    // worktree 内：b.js 已 commit（对主仓 base..HEAD 与 porcelain 双不可见），a.js 未提交（子代理默认不 commit 形态）
    writeFileSync(join(wt, 'b.js'), 'b-wt\n')
    sh('git add -A && git commit -qm "baseline checkpoint"', wt)
    writeFileSync(join(wt, 'a.js'), 'a-wt\n')

    const files = collectWorktreeChangedFiles(d, cn, { worktreePath: wt, mode: 'worktree' })
    assert.ok(files.includes('a.js'), `porcelain 未提交文件并入（实际 ${JSON.stringify(files)}）`)
    assert.ok(files.includes('b.js'), 'worktree 内已提交文件经 merge-base 补齐并入')
    assert.ok(files.every(f => !String(f).includes('\\')), '返回路径正斜杠口径')

    // 零回归（GWT3）：meta 缺失 → in-place 退化取主仓 cwd porcelain（现状并入行为不丢）
    writeFileSync(join(d, 'c.js'), 'c-inplace\n')
    const inplace = collectWorktreeChangedFiles(d, cn, null)
    assert.ok(inplace.includes('c.js'), `in-place 退化取主仓 porcelain（实际 ${JSON.stringify(inplace)}）`)
  } finally { cleanupRepo(d, wt) }
})

test('FR-04 集成面：未提交 worktree 改动命中勾选；baselineFiles 夹带文件不误勾（防伪底线）', async () => {
  const d = makeRepo({ 'a.js': 'a\n', 'b.js': 'b\n' })
  const cn = 'c1'
  const wt = addWorktree(d, cn)
  try {
    const base = gitOut('git rev-parse HEAD', d)
    // b.js 被 baseline checkpoint 夹带（commit 进 worktree 分支）；a.js 是本变更真实未提交改动
    writeFileSync(join(wt, 'b.js'), 'b-carried\n')
    sh('git add -A && git commit -qm "baseline checkpoint"', wt)
    writeFileSync(join(wt, 'a.js'), 'a-real\n')
    const wtHead = gitOut('git rev-parse HEAD', wt)
    writeMeta(wt, { changeName: cn, branch: `sillyspec/${cn}`, baseHash: base, baselineCommit: base, worktreePath: wt, baselineFiles: ['b.js'] })

    const specBase = join(d, '.sillyspec')
    const changeDir = join(specBase, 'changes', cn)
    const rt = join(specBase, '.runtime')
    const runId = 'exec-2026-09-15-010101-x1'
    for (const t of ['task-01', 'task-02']) mkdirSync(join(rt, 'execute-runs', runId, 'tasks', t), { recursive: true })
    writeFileSync(join(rt, `current-execute-run-id-${cn}`), `${runId}\n`)
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'tasks.md'), '# tasks\n\n- [ ] task-01: 甲改文件\n- [ ] task-02: 乙声明未做\n')
    const draft = (task, changedFiles) => JSON.stringify({
      schemaVersion: 1, task, base, head: wtHead, changedFiles,
      specVerdict: 'cannot_verify', qualityVerdict: 'cannot_verify',
      requiredEvidence: ['auto-generated draft: 待复核'],
      reviewerNotes: `auto-generated draft from git diff ${base.slice(0, 8)}..${wtHead.slice(0, 8)};verdict=未评审`,
    })
    writeFileSync(join(rt, 'execute-runs', runId, 'tasks', 'task-01', 'review.json'), draft('task-01', ['a.js']))
    writeFileSync(join(rt, 'execute-runs', runId, 'tasks', 'task-02', 'review.json'), draft('task-02', ['b.js']))

    const r = await autoCheckPlanFromReviews({ stageName: 'execute', changeName: cn, cwd: d, platformOpts: {} })

    const after = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    assert.ok(/- \[x\] task-01/.test(after), '未提交 worktree 改动命中勾选（GWT1：旧口径 base..head 恒空必跳过）')
    assert.ok(/- \[ \] task-02/.test(after), 'baseline 夹带文件被剔出 diffFileSet，声明未做不误勾（GWT2 防伪底线）')
    assert.equal(r.checkedCount, 1, `checkedCount（实际 ${JSON.stringify(r)}）`)
    assert.equal(r.skippedCount, 1, 'skippedCount')
  } finally { cleanupRepo(d, wt) }
})

test('FR-04 归因面：同文件双 task 全归属（suspectTask join 成 string）；单归属形态不变', () => {
  const d = makeRepo({ 'src/a.js': 'a\n', 'src/shared.js': 's\n', 'src/extra.js': 'e\n' })
  const cn = 'c2'
  try {
    const specBase = join(d, '.sillyspec')
    // 声明侧：task-01 声明 src/a.js（已做）；shared/extra 未声明 → ③类
    const tasksDir = join(specBase, 'changes', cn, 'tasks')
    mkdirSync(tasksDir, { recursive: true })
    writeFileSync(join(tasksDir, 'task-01.md'), '---\nid: task-01\ntarget_files:\n  - src/a.js\n---\n\n# task-01\n')
    // 归因侧：两个 task 的 review 都声明 src/shared.js；src/extra.js 仅 task-04
    const runId = 'exec-2026-09-15-020202'
    const runTasks = join(specBase, '.runtime', 'execute-runs', runId, 'tasks')
    for (const t of ['task-04', 'task-05']) mkdirSync(join(runTasks, t), { recursive: true })
    writeFileSync(join(specBase, '.runtime', 'execute-runs', runId, 'change'), `${cn}\n`)
    writeFileSync(join(runTasks, 'task-04', 'review.json'), JSON.stringify({ task: 'task-04', changedFiles: ['src/shared.js', 'src/extra.js'] }))
    writeFileSync(join(runTasks, 'task-05', 'review.json'), JSON.stringify({ task: 'task-05', changedFiles: ['src/shared.js'] }))
    // actual 侧（形态 B porcelain）：三个文件均未提交改动
    writeFileSync(join(d, 'src', 'a.js'), 'a2\n')
    writeFileSync(join(d, 'src', 'shared.js'), 's2\n')
    writeFileSync(join(d, 'src', 'extra.js'), 'e2\n')

    const r = reconcileTargetFiles({ cwd: d, changeName: cn })

    assert.equal(r.status, 'undeclared', `状态（实际 ${JSON.stringify(r)}）`)
    assert.ok(r.matched.includes('src/a.js'), '①交集命中')
    const shared = r.undeclared.find(u => u.path === 'src/shared.js')
    const extra = r.undeclared.find(u => u.path === 'src/extra.js')
    assert.equal(shared && shared.suspectTask, 'task-04、task-05', '多归属：全部命中 task 收集（旧「首个命中即止」吞归属）')
    assert.equal(typeof (shared && shared.suspectTask), 'string', '边界 join 成 string（gates/archive-delta 下游零改动形态）')
    assert.equal(extra && extra.suspectTask, 'task-04', '单归属归因形态不变（零回归）')
  } finally { cleanupRepo(d, null) }
})

// ─────────────────────────────────────────────────────────────────────────────
// 组5 FR-05：required-evidence 消费侧双根核验（D-005@v1）
// ─────────────────────────────────────────────────────────────────────────────

/** evidence 双根 fixture：主仓 + 真 worktree（可选 meta）+ 证据账/报告槽 */
function makeEvidenceFx({ withMeta }) {
  const d = makeRepo({ 'src/code.js': 'old\n' })
  const cn = 'c1'
  const wt = addWorktree(d, cn)
  // 证据文件只存在于 worktree（apply 前新文件形态）
  writeFileSync(join(wt, 'src', 'wt-only.js'), 'new\n')
  const specBase = join(d, '.sillyspec')
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  // design created_at 设过去（R-05 fallback 宽容基准——mtime 核验不误判）
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2020-01-01T00:00:00\n---\n\n# d\n')
  writeFileSync(join(changeDir, 'verify-required-evidence.json'),
    JSON.stringify({ generatedAt: '2026-09-15T00:00:00', schemaVersion: 1, items: [{ task: 'task-02', verdict: 'cannot_verify', evidence: ['x'] }] }))
  writeFileSync(join(changeDir, 'verify-result.md'),
    ['# 报告', '## 证据账（cannot_verify 任务）', '[层：人工判断——CLI 核验]', '', '- task-02: satisfied | verifiedFiles: src/wt-only.js', ''].join('\n'))
  if (withMeta) {
    const base = gitOut('git rev-parse HEAD', d)
    writeMeta(wt, { changeName: cn, branch: `sillyspec/${cn}`, baseHash: base, baselineCommit: base, worktreePath: wt })
  }
  return { d, cn, wt, specBase }
}

test('FR-05 正向：wt-only 新文件双根核验不再误报「文件不存在」（root 命中 worktree）', () => {
  const fx = makeEvidenceFx({ withMeta: true })
  try {
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.d, specBase: fx.specBase, changeName: fx.cn })
    assert.equal(r.status, 'passed', `双根核验通过（实际 ${JSON.stringify(r.detailed)}）`)
    const v = r.detailed[0].verification[0]
    assert.equal(v.filesExist, true, '任一根存在即 filesExist=true（不再误报不存在）')
    assert.equal(v.root, fx.wt, `命中根=worktree（实际 ${v.root}）`)
    assert.equal(v.diffHit, true, 'worktree porcelain 并入 diff 集，代码类交集命中')
  } finally { cleanupRepo(fx.d, fx.wt) }
})

test('FR-05 零回归：meta 缺失退单根——wt-only 文件仍报不存在（blocked）', () => {
  const fx = makeEvidenceFx({ withMeta: false })
  try {
    const r = runVerifyRequiredEvidenceCheck({ cwd: fx.d, specBase: fx.specBase, changeName: fx.cn })
    assert.equal(r.status, 'blocked', '单根现状：主仓无该文件 → blocked')
    const v = r.detailed[0].verification[0]
    assert.equal(v.filesExist, false, '单查主仓 filesExist=false')
    assert.match(v.reason, /不存在/, '误报「文件不存在」形态保持（零回归锚）')
    assert.equal(v.root, null, '无命中根')
  } finally { cleanupRepo(fx.d, fx.wt) }
})
