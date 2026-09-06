/**
 * plan-target-files.test.mjs — target_files 声明核验与对账测试套件（task-06 / ir-stage-p3a 收官）
 *
 * 锁定前三任务的行为（commit f332976/c84cacf/b591a80/db13068/95490ba）：
 *   - parseTargetFiles（task-03，src/stages/plan-postcheck.js）：严格解析——inline [] 与块列表
 *     双形态、NEW: 前缀剥离、glob/目录前缀/引号/绝对路径记 invalid、CRLF 入口归一、反斜杠归一。
 *   - validateTargetFiles（task-03，同文件）：幻觉路径/格式非法 ERROR；缺失汇总单条 WARNING、
 *     已存在带 NEW / 流程产物 / allowed_paths 白名单外 / design 清单外 / 跨仓卡剔除 WARNING。
 *   - reconcileTargetFiles（task-04，src/verify-postcheck.js）：三源 actual（形态 A = meta.json 在
 *     → resolveVerifyChangedFiles ctx=null + includeWorkingTree；形态 B = merge-base 分支 diff ∪
 *     status porcelain untracked ∪ apply-pathspec-<change>.txt）+ 三类差集 {matched, missing,
 *     undeclared}；存量无声明 skipped / git 不可用 degraded 不产差集。
 *   - gates 接线（task-05，src/run/gates.js）：missing_declared → 阻断（printReconcileTargetFilesCheck
 *     返回 true 走 rollback）；undeclared/skipped/degraded → 放行（返回 false）。
 *
 * 两形态×三模式矩阵说明：三模式（git worktree / native / in-place）在单测里以形态 A/B 覆盖为准——
 * in-place 无独立 diff 路径（meta.mode='in-place-fallback' 时 gitDir 即主仓 cwd，与形态 A fixture
 * 中 worktreePath=cwd 的取源路径等价），不单独造分支。
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseTargetFiles, validateTargetFiles } from '../src/stages/plan-postcheck.js'
import { reconcileTargetFiles } from '../src/verify-postcheck.js'
import { buildReconcileTargetFilesEnvelope, printReconcileTargetFilesCheck, writeReconcileRunResult } from '../src/run/gates.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// ── fixture helpers（风格同 plan-postcheck.test.mjs / verify-postcheck-worktree.test.mjs）──

const fm = body => `---\n${body}\n---\n`

function mkDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix))
}

/** 建 git 临时仓（-b main 显式定名：B1 源 merge-base main <branch> 依赖主干叫 main，
 *  本机 init.defaultBranch=master 而 suite 隔离 gitconfig 为 main，显式指定两头都确定） */
function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString()
}
function mkRepo(prefix) {
  const dir = mkDir(prefix)
  git(dir, 'init -q -b main')
  git(dir, 'config user.email t@t.t')
  git(dir, 'config user.name t')
  return dir
}
function commitAll(dir, msg) {
  git(dir, 'add -A')
  git(dir, `commit -q -m "${msg}"`)
}

/** 写 change 目录下的 task 卡（validateTargetFiles 的 changeDir 布局 / reconcile 的 specBase 布局同构） */
function writeCard(baseDir, changeName, filename, content) {
  const tasksDir = join(baseDir, '.sillyspec', 'changes', changeName, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  writeFileSync(join(tasksDir, filename), content)
}

/** 形态 A 的 worktree meta（结构与 verify-postcheck-worktree.test.mjs writeMeta 同源） */
function writeMeta(cwd, change, meta) {
  const metaDir = join(cwd, '.sillyspec', '.runtime', 'worktrees', change)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify(meta))
}

/** 捕获 console 输出（gates print 层冒烟用，避免污染测试输出且可断言文案） */
function captureConsole(fn) {
  const out = []
  const orig = { log: console.log, warn: console.warn, error: console.error }
  console.log = (...a) => out.push(a.map(String).join(' '))
  console.warn = (...a) => out.push(a.map(String).join(' '))
  console.error = (...a) => out.push(a.map(String).join(' '))
  try {
    const ret = fn()
    return { ret, out: out.join('\n') }
  } finally {
    console.log = orig.log; console.warn = orig.warn; console.error = orig.error
  }
}

// ═══════════════════════════════════════════════════════════════
// A. parseTargetFiles（纯函数，无 IO）
// ═══════════════════════════════════════════════════════════════
console.log('=== A. parseTargetFiles 严格解析 ===\n')

// ── A1. 顶格块列表 + NEW: 剥离与 isNew（与 parseAllowedPaths 坑6① 同款顶格形态）──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n- src/a.js\n- NEW:src/b.js'))
  assert(r.missing === false, `顶格块列表 missing=false（实际: ${JSON.stringify(r)}）`)
  assert(r.entries.length === 2, `块列表解析出 2 条（实际: ${JSON.stringify(r.entries)}）`)
  assert(r.entries[0].raw === 'src/a.js' && r.entries[0].path === 'src/a.js' && r.entries[0].isNew === false,
    `普通条目 raw/path/isNew 正确（实际: ${JSON.stringify(r.entries[0])}）`)
  assert(r.entries[1].raw === 'NEW:src/b.js' && r.entries[1].path === 'src/b.js' && r.entries[1].isNew === true,
    `NEW: 剥离前缀、isNew=true、path 净化（实际: ${JSON.stringify(r.entries[1])}）`)
  assert(r.entries.every(e => e.invalid === null), '合法条目 invalid=null')
}

// ── A2. 缩进块列表 ──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n  - src/a.js\n  - NEW:src/b.js'))
  assert(!r.missing && r.entries.length === 2 && r.entries[1].isNew,
    `缩进块列表同样解析（实际: ${JSON.stringify(r.entries)}）`)
}

// ── A3. inline [] 数组 ──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files: [src/a.js, NEW:src/b.js]'))
  assert(!r.missing && r.entries.length === 2 && r.entries[0].path === 'src/a.js' && r.entries[1].path === 'src/b.js',
    `inline [] 形态解析（实际: ${JSON.stringify(r.entries)}）`)
}

// ── A4. glob（* 与 ?）→ invalid ──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n- src/*.js\n- src/a?.js'))
  assert(r.entries[0].invalid && r.entries[0].invalid.includes('通配符'),
    `* glob 记 invalid（实际: ${r.entries[0].invalid}）`)
  assert(r.entries[1].invalid && r.entries[1].invalid.includes('通配符'),
    `? 通配记 invalid（实际: ${r.entries[1].invalid}）`)
  assert(r.entries[0].path === 'src/*.js', 'invalid 条目仍保留原文 path（处置归校验层）')
}

// ── A5. 目录前缀（/ 结尾）→ invalid ──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n- src/dir/'))
  assert(r.entries[0].invalid && r.entries[0].invalid.includes('目录前缀'),
    `目录前缀记 invalid（实际: ${r.entries[0].invalid}）`)
}

// ── A6. 引号（双引号/单引号/反引号）→ invalid（严格口径不剥引号，与 parseAllowedPaths 反向）──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n- "src/a.js"\n- \'src/b.js\'\n- `src/c.js`'))
  assert(r.entries.every(e => e.invalid && e.invalid.includes('引号')),
    `三种引号形态全记 invalid（实际: ${JSON.stringify(r.entries.map(e => e.invalid))}）`)
}

// ── A7. 绝对路径（/ 前缀、盘符、UNC 反斜杠）→ invalid ──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files: [/abs/a.js, C:/x/a.js, D:\\x\\a.js, \\\\srv\\share\\a.js]'))
  assert(r.entries.every(e => e.invalid && e.invalid.includes('绝对路径')),
    `/ 前缀、盘符、UNC 全记绝对路径 invalid（实际: ${JSON.stringify(r.entries.map(e => [e.path, e.invalid]))}）`)
}

// ── A8. 无字段 / 空列表 / 无 frontmatter / 非列表标量 → missing=true（存量卡兼容口径）──
{
  const none = parseTargetFiles(fm('id: task-01\ngoal: x'))
  assert(none.missing === true && none.entries.length === 0, '无 target_files 字段 → missing=true')
  const emptyInline = parseTargetFiles(fm('id: task-01\ntarget_files: []'))
  assert(emptyInline.missing === true, '空 inline [] → missing=true')
  const noFm = parseTargetFiles('# 无 frontmatter 的卡\n')
  assert(noFm.missing === true, '无 frontmatter → missing=true')
  const scalar = parseTargetFiles(fm('id: task-01\ntarget_files: src/a.js'))
  assert(scalar.missing === true, '非列表标量形态 → missing=true（与 parseAllowedPaths 家族同口径）')
}

// ── A9. CRLF 整卡（入口归一）──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n- src/a.js\n- NEW:src/b.js').replace(/\n/g, '\r\n'))
  assert(!r.missing && r.entries.length === 2 && r.entries[1].isNew,
    `CRLF 内容入口归一后仍解析（实际: ${JSON.stringify(r.entries)}）`)
}

// ── A10. 反斜杠归一（Windows 风格相对路径 → 正斜杠，不算 invalid）──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files:\n- src\\win\\a.js'))
  assert(r.entries[0].path === 'src/win/a.js' && r.entries[0].invalid === null,
    `反斜杠归一正斜杠且合法（实际: ${JSON.stringify(r.entries[0])}）`)
}

// ── A11. NEW: 剥离后为空 → invalid ──
{
  const r = parseTargetFiles(fm('id: task-01\ntarget_files: [NEW:]'))
  assert(r.entries[0].invalid && r.entries[0].invalid.includes('剥 NEW: 前缀后为空'),
    `NEW: 空壳记 invalid（实际: ${r.entries[0].invalid}）`)
}

// ═══════════════════════════════════════════════════════════════
// B. validateTargetFiles（声明核验器）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== B. validateTargetFiles 声明核验 ===\n')

// ── B1. 幻觉路径 ERROR：repoRoot 下不存在且未加 NEW: ──
{
  const changeDir = mkDir('tf-val-1-')
  const repoRoot = mkDir('tf-val-1-root-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), fm('id: task-01\ntarget_files:\n- src/ghost.js'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === false, `幻觉路径 → ok=false（实际: ${JSON.stringify(r)}）`)
  assert(r.errors.length === 1 && r.errors[0].includes('幻觉路径'), `error 文案含「幻觉路径」（实际: ${JSON.stringify(r.errors)}）`)
  assert(r.errors[0].includes('task-01'), 'error 文案带 task 标识')
  assert(r.warnings.length === 0, `无 design/allowed_paths 上下文时不产附加警告（实际: ${JSON.stringify(r.warnings)}）`)
}

// ── B2. 格式非法 ERROR（glob / 目录前缀 / 引号 / 绝对路径各一条）──
{
  const changeDir = mkDir('tf-val-2-')
  const repoRoot = mkDir('tf-val-2-root-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    fm('id: task-01\ntarget_files: [src/*.js, src/dir/, "src/q.js", /abs/a.js]'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === false, '四种非法形态 → ok=false')
  assert(r.errors.length === 4, `每条非法各一个 error（实际 ${r.errors.length} 条: ${JSON.stringify(r.errors)}）`)
  assert(r.errors.every(e => e.includes('格式非法')), 'error 文案统一含「格式非法」')
}

// ── B3. 缺失汇总单条 WARNING：多卡只有一条（X-13）──
{
  const changeDir = mkDir('tf-val-3-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), fm('id: task-01\ngoal: x'))
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), fm('id: task-02\ngoal: x'))
  const r = validateTargetFiles(changeDir, null)
  assert(r.ok === true, '缺字段仅 WARNING 不阻断（ok=true）')
  assert(r.warnings.length === 1, `两卡缺字段只产 1 条汇总（实际: ${JSON.stringify(r.warnings)}）`)
  assert(r.warnings[0].includes('2 张'), '汇总文案带卡数')
}

// ── B4. 已存在文件带 NEW: → WARNING（前缀误用）──
{
  const changeDir = mkDir('tf-val-4-')
  const repoRoot = mkDir('tf-val-4-root-')
  mkdirSync(join(repoRoot, 'src'), { recursive: true })
  writeFileSync(join(repoRoot, 'src', 'a.js'), 'x')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), fm('id: task-01\ntarget_files:\n- NEW:src/a.js'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === true, 'NEW 误用不阻断（ok=true）')
  assert(r.warnings.length === 1 && r.warnings[0].includes('已存在'),
    `WARNING 提示去前缀（实际: ${JSON.stringify(r.warnings)}）`)
}

// ── B5. allowed_paths 白名单外 → WARNING（X-5 提前暴露越权）──
{
  const changeDir = mkDir('tf-val-5-')
  const repoRoot = mkDir('tf-val-5-root-')
  mkdirSync(join(repoRoot, 'src'), { recursive: true })
  writeFileSync(join(repoRoot, 'src', 'outside.js'), 'x')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    fm('id: task-01\nallowed_paths:\n- src/inside.js\ntarget_files:\n- src/outside.js'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === true && r.errors.length === 0, '白名单外仅 WARNING 不阻断')
  assert(r.warnings.length === 1 && r.warnings[0].includes('allowed_paths'),
    `WARNING 文案含 allowed_paths 越权提示（实际: ${JSON.stringify(r.warnings)}）`)
}

// ── B5b. allowed_paths 目录前缀可覆盖精确 target_file（pathMatches 容差，不误报）──
{
  const changeDir = mkDir('tf-val-5b-')
  const repoRoot = mkDir('tf-val-5b-root-')
  mkdirSync(join(repoRoot, 'src'), { recursive: true })
  writeFileSync(join(repoRoot, 'src', 'a.js'), 'x')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    fm('id: task-01\nallowed_paths:\n- src/\ntarget_files:\n- src/a.js'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === true && r.warnings.length === 0,
    `目录前缀 allowed_paths 覆盖精确声明 → 无白名单警告（实际: ${JSON.stringify(r.warnings)}）`)
}

// ── B6. repoRoot=null 跳过存在性（纯函数测试场景）──
{
  const changeDir = mkDir('tf-val-6-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), fm('id: task-01\ntarget_files:\n- src/ghost.js'))
  const r = validateTargetFiles(changeDir, null)
  assert(r.ok === true && r.errors.length === 0, 'repoRoot=null 不做幻觉核验（ok=true）')
  assert(r.warnings.length === 0, '无其他噪音警告')
}

// ── B7. 流程产物路径 → WARNING（.sillyspec/changes/ 前缀 / meta.json）──
{
  const changeDir = mkDir('tf-val-7-')
  const repoRoot = mkDir('tf-val-7-root-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    fm('id: task-01\ntarget_files: [.sillyspec/changes/x/meta.json, meta.json]'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === true && r.errors.length === 0, '流程产物不阻断（不存在也不报幻觉——核验已跳过）')
  assert(r.warnings.length === 2 && r.warnings.every(w => w.includes('流程产物')),
    `两条流程产物各一条 WARNING（实际: ${JSON.stringify(r.warnings)}）`)
}

// ── B8. design 清单交叉：清单外 WARNING / 清单内不误报 ──
{
  const changeDir = mkDir('tf-val-8-')
  const repoRoot = mkDir('tf-val-8-root-')
  mkdirSync(join(repoRoot, 'src'), { recursive: true })
  writeFileSync(join(repoRoot, 'src', 'in-design.js'), 'x')
  writeFileSync(join(repoRoot, 'src', 'out-of-design.js'), 'x')
  writeFileSync(join(changeDir, 'design.md'),
    ['# D', '', '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/in-design.js | x |', ''].join('\n'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  // 卡 A：声明清单外文件（allowed_paths 覆盖它以隔离信号，只剩 design 漂移警告）
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    fm('id: task-01\nallowed_paths:\n- src/out-of-design.js\ntarget_files:\n- src/out-of-design.js'))
  // 卡 B：声明清单内文件 → 无警告
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'),
    fm('id: task-02\nallowed_paths:\n- src/in-design.js\ntarget_files:\n- src/in-design.js'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === true, 'design 漂移仅 WARNING')
  assert(r.warnings.length === 1 && r.warnings[0].includes('不在 design.md 文件变更清单内'),
    `清单外一条 design 漂移 WARNING（实际: ${JSON.stringify(r.warnings)}）`)
  assert(r.warnings[0].includes('task-01'), '警告定位到声明的卡')
}

// ── B9. 跨仓卡剔除：repo: 键 → WARNING 提示 + 不做主仓存在性核验 ──
{
  const changeDir = mkDir('tf-val-9-')
  const repoRoot = mkDir('tf-val-9-root-')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    fm('id: task-01\nrepo: other-repo\ntarget_files:\n- src/ghost-in-other-repo.js'))
  const r = validateTargetFiles(changeDir, repoRoot)
  assert(r.ok === true && r.errors.length === 0, '跨仓卡不参与主仓核验（不存在路径不报幻觉，D-004）')
  assert(r.warnings.length === 1 && r.warnings[0].includes('跨仓卡'),
    `跨仓剔除提示一条（实际: ${JSON.stringify(r.warnings)}）`)
}

// ═══════════════════════════════════════════════════════════════
// C. reconcileTargetFiles（真实 git 仓 fixture）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== C. reconcileTargetFiles 对账（git fixture）===\n')

// ── C1. 形态 A（meta.json 在）三类差集齐全：matched ∪ missing ∪ undeclared ──
{
  const dir = mkRepo('tf-rec-1-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.js'), 'base')
    writeFileSync(join(dir, 'src', 'b.js'), 'base')
    writeFileSync(join(dir, 'src', 'extra.js'), 'base')
    commitAll(dir, 'base')
    const baseHash = git(dir, 'rev-parse HEAD').trim()

    const change = 'tf-rec-1'
    // 声明：a.js（存量修改）+ new-file.js（NEW: 未跟踪新建）+ b.js（声明了但没做 → ②类）
    writeCard(dir, change, 'task-01.md',
      fm('id: task-01\ntarget_files:\n- src/a.js\n- NEW:src/new-file.js\n- src/b.js'))
    // meta 在 → 形态 A；worktreePath 指主仓（等价于 in-place/无独立 worktree 目录的取源路径）
    writeMeta(dir, change, { baseHash, worktreePath: dir, mode: 'worktree' })
    // 实际改动：改 a.js（未 commit）+ 新建 new-file.js（未跟踪）+ 改 extra.js（未声明 → ③类）
    writeFileSync(join(dir, 'src', 'a.js'), 'changed')
    writeFileSync(join(dir, 'src', 'new-file.js'), 'new')
    writeFileSync(join(dir, 'src', 'extra.js'), 'scope-creep')

    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'missing_declared', `②类在场 → missing_declared（实际: ${r.status}）`)
    assert(JSON.stringify(r.matched) === JSON.stringify(['src/a.js', 'src/new-file.js']),
      `①交集 = a.js + new-file.js（形态 A includeWorkingTree 捕未跟踪 NEW 文件）（实际: ${JSON.stringify(r.matched)}）`)
    assert(r.missing.length === 1 && r.missing[0].task === 'task-01' && r.missing[0].path === 'src/b.js',
      `②类逐条报 task + path（实际: ${JSON.stringify(r.missing)}）`)
    assert(r.undeclared.length === 1 && r.undeclared[0].path === 'src/extra.js',
      `③类 = extra.js（scope creep）（实际: ${JSON.stringify(r.undeclared)}）`)
    assert(r.form === 'worktree', `形态 A 判定（实际: ${r.form}）`)
    assert(r.sources.includes('worktree:status-porcelain(uncommitted)'), `uncommitted 源在列（实际: ${JSON.stringify(r.sources)}）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C2. 形态 A 全落地 → status=ok（NEW 未跟踪文件不落②类假红，R-04/R-05）──
{
  const dir = mkRepo('tf-rec-2-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.js'), 'base')
    commitAll(dir, 'base')
    const baseHash = git(dir, 'rev-parse HEAD').trim()

    const change = 'tf-rec-2'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- src/a.js\n- NEW:src/new-file.js'))
    writeMeta(dir, change, { baseHash, worktreePath: dir, mode: 'worktree' })
    writeFileSync(join(dir, 'src', 'a.js'), 'changed')
    writeFileSync(join(dir, 'src', 'new-file.js'), 'new')

    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'ok', `全部落地 → ok（实际: ${r.status}, missing=${JSON.stringify(r.missing)}, undeclared=${JSON.stringify(r.undeclared)}）`)
    assert(r.matched.length === 2, `两声明全进交集（实际: ${JSON.stringify(r.matched)}）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C3. 形态 B（meta 已删）：NEW untracked 文件进 actual（B2 status porcelain，R-05）──
{
  const dir = mkRepo('tf-rec-3-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.js'), 'base')
    commitAll(dir, 'base')

    const change = 'tf-rec-3'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- NEW:src/new-thing.js'))
    writeFileSync(join(dir, 'src', 'new-thing.js'), 'untracked new')

    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'ok', `NEW untracked 不在 missing（实际: ${r.status}, missing=${JSON.stringify(r.missing)}）`)
    assert(JSON.stringify(r.matched) === JSON.stringify(['src/new-thing.js']), `untracked NEW 进交集（实际: ${JSON.stringify(r.matched)}）`)
    assert(r.form === 'post-apply', `无 meta → 形态 B（实际: ${r.form}）`)
    assert(r.sources.includes('main:status-porcelain(untracked-all)'), `B2 源在列（实际: ${JSON.stringify(r.sources)}）`)
    // 基建文件（.sillyspec/changes/ 下的 task 卡自身在 status untracked 里）不算 undeclared
    assert(r.undeclared.length === 0 && JSON.stringify(r.undeclared) === '[]',
      `task 卡等 .sillyspec/changes/ 基建文件不落③类（实际: ${JSON.stringify(r.undeclared)}）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C4. 形态 B 之 B1 merge-base 分支 diff 源（分支存在时锚定对账）──
{
  const dir = mkRepo('tf-rec-4-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.js'), 'base')
    commitAll(dir, 'base')
    const change = 'tf-rec-4'
    git(dir, `branch sillyspec/${change}`) // 分支存在 → B1 merge-base 锚定 diff 生效

    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- src/a.js'))
    writeFileSync(join(dir, 'src', 'a.js'), 'tracked mod（未 commit，diff <mergeBase> 对工作树可见）')

    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'ok' && JSON.stringify(r.matched) === JSON.stringify(['src/a.js']),
      `B1 锚定 diff 捕 tracked 修改（实际: ${r.status}, ${JSON.stringify(r.matched)}）`)
    assert(r.sources.includes('main:diff-merge-base'), `B1 源在列（实际: ${JSON.stringify(r.sources)}）`)
    assert(r.sources.includes('main:status-porcelain(untracked-all)'), 'B2 源同在（并集口径）')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C5. 形态 B 之 B3 apply-pathspec 兜底源（主仓全 commit 后唯一来源）──
{
  const dir = mkRepo('tf-rec-5-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.js'), 'base')
    const change = 'tf-rec-5'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- src/from-pathspec.js'))
    commitAll(dir, 'base+card（status 清空，B1 无分支省略、B2 空）')

    // apply 落盘的精确清单（worktree-apply.js:1145 同源产物）
    const runtimeDir = join(dir, '.sillyspec', '.runtime')
    mkdirSync(runtimeDir, { recursive: true })
    writeFileSync(join(runtimeDir, `apply-pathspec-${change}.txt`), 'src/from-pathspec.js\n')

    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'ok' && JSON.stringify(r.matched) === JSON.stringify(['src/from-pathspec.js']),
      `B3 pathspec 文件路径进交集（实际: ${r.status}, ${JSON.stringify(r.matched)}）`)
    assert(r.sources.includes('apply-pathspec'), `B3 源在列（实际: ${JSON.stringify(r.sources)}）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C6. 存量无声明 → skipped 不产差集（零红门禁）──
{
  const dir = mkRepo('tf-rec-6-')
  try {
    const change = 'tf-rec-6'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ngoal: x')) // 存量卡：无 target_files
    writeFileSync(join(dir, 'wip.txt'), 'x')

    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'skipped', `全无声明 → skipped（实际: ${r.status}）`)
    assert(r.skipReason && r.skipReason.includes('未声明 target_files'), `skipReason 说明原因（实际: ${r.skipReason}）`)
    assert(r.missing.length === 0 && r.undeclared.length === 0, 'skipped 不产差集')
    assert(r.form === null, 'skipped 无 actual 形态')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C6b. 无 changeName（quick 等场景）→ skipped ──
{
  const dir = mkRepo('tf-rec-6b-')
  try {
    const r = reconcileTargetFiles({ cwd: dir })
    assert(r.status === 'skipped' && r.missing.length === 0 && r.undeclared.length === 0,
      `无 changeName → skipped（实际: ${r.status}）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── C7. 非 git 目录 → degraded（fail-soft 不误红）──
{
  const dir = mkDir('tf-rec-7-') // 无 git init
  try {
    const change = 'tf-rec-7'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- src/a.js'))
    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'degraded', `git 全不可用 → degraded（实际: ${r.status}）`)
    assert(r.skipReason && r.skipReason.includes('降级'), `skipReason 带降级原因（实际: ${r.skipReason}）`)
    assert(r.missing.length === 0 && r.undeclared.length === 0, 'degraded 不产差集（宁跳过不假红）')
    assert(r.form === 'post-apply', '形态判定仍产出（诊断可见性）')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ═══════════════════════════════════════════════════════════════
// D. gates 阻断冒烟（buildReconcileTargetFilesEnvelope / printReconcileTargetFilesCheck）
// ═══════════════════════════════════════════════════════════════
console.log('\n=== D. gates 接线阻断冒烟 ===\n')

// ── D1. 五状态 × print 返回值 = gates 分支判定契约（gates.js:684 `if (print(...)) rollback`）──
{
  const mkResult = status => ({
    status,
    matched: status === 'ok' ? ['src/a.js'] : [],
    missing: status === 'missing_declared' ? [{ task: 'task-01', path: 'src/b.js', isNew: true }] : [],
    undeclared: status === 'undeclared' ? [{ path: 'src/extra.js' }] : [],
    skipReason: status === 'skipped' || status === 'degraded' ? '原因' : null,
    notes: [], form: 'post-apply', sources: ['main:status-porcelain(untracked-all)'],
  })
  for (const [st, expectBlock] of [
    ['missing_declared', true],   // ②类 ERROR 阻断
    ['undeclared', false],        // ③类 WARNING 放行
    ['skipped', false],           // 存量跳过放行
    ['degraded', false],          // git 不可用降级放行
    ['ok', false],                // 全落地放行
  ]) {
    const r = mkResult(st)
    const { ret, out } = captureConsole(() => printReconcileTargetFilesCheck(r))
    assert(ret === expectBlock, `${st}: print 返回 ${expectBlock}（与 gates 阻断分支一致）（实际: ${ret}）`)
    if (expectBlock) assert(out.includes('src/b.js') && out.includes('❌'), `${st}: 阻断输出含 ❌ + 逐条 path`)
    if (st === 'undeclared') assert(out.includes('src/extra.js') && out.includes('⚠️'), `${st}: WARNING 输出含 ③类路径`)
    if (st === 'skipped' || st === 'degraded') assert(out.includes('原因'), `${st}: 输出含 skipReason`)
  }
}

// ── D2. 信封字段契约：severity 分级 / evidence 计数 / supportedFixes 可路由 ──
{
  const err = buildReconcileTargetFilesEnvelope({
    status: 'missing_declared', matched: ['a.js'], missing: [{ task: 'task-01', path: 'b.js' }],
    undeclared: [], skipReason: null, notes: [], form: 'worktree', sources: ['x'],
  })
  assert(err.name === 'target_files_reconcile', '信封 name 固定')
  assert(err.severity === 'error', `②类 severity=error（实际: ${err.severity}）`)
  assert(err.evidence.matched_count === 1 && err.evidence.missing_declared_count === 1 && err.evidence.undeclared_count === 0,
    'evidence 三类计数与结果一致')
  assert(err.evidence.form === 'worktree' && JSON.stringify(err.evidence.sources) === JSON.stringify(['x']), 'evidence 带形态与源明细')
  assert(err.supportedFixes.length === 2, `②类给 2 条修复指引（实际: ${err.supportedFixes.length}）`)

  const warn = buildReconcileTargetFilesEnvelope({
    status: 'undeclared', matched: [], missing: [], undeclared: [{ path: 'x.js' }],
    skipReason: null, notes: [], form: 'post-apply', sources: [],
  })
  assert(warn.severity === 'warning' && warn.supportedFixes.length === 2, '③类 severity=warning + 2 条指引')

  const info = buildReconcileTargetFilesEnvelope({
    status: 'ok', matched: ['a.js'], missing: [], undeclared: [], skipReason: null, notes: [], form: 'worktree', sources: [],
  })
  assert(info.severity === 'info' && info.supportedFixes.length === 0, 'ok severity=info 无指引')

  for (const st of ['skipped', 'degraded']) {
    const env = buildReconcileTargetFilesEnvelope({
      status: st, matched: [], missing: [], undeclared: [], skipReason: 'r', notes: [], form: null, sources: [],
    })
    assert(env.severity === 'warning' && env.supportedFixes.length === 1, `${st}: severity=warning + 补声明指引`)
    assert(env.detail.includes(`status=${st}`) && env.detail.includes('（r）'), `${st}: detail 带状态与 skipReason`)
  }
}

// ── D3. 真实 reconcile 结果过 gates 打印层（端到端冒烟：C1 阻断 / C3 放行）──
{
  const dir = mkRepo('tf-gates-3-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'b.js'), 'base')
    commitAll(dir, 'base')
    const change = 'tf-gates-3'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- src/b.js')) // 声明未做 → ②类
    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    const env = buildReconcileTargetFilesEnvelope(r)
    assert(env.severity === 'error', `真实②类结果 → 信封 error（实际: ${env.severity}）`)
    const { ret, out } = captureConsole(() => printReconcileTargetFilesCheck(r, env))
    assert(ret === true, '真实②类结果 → print 阻断（gates 将走 rollbackCompletionAndReturn）')
    assert(out.includes('task-01') && out.includes('src/b.js') && out.includes('修复'), '阻断输出含 task/path/修复指引')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── D4. 审查 gap 回流：envelope code 命名 + verify-runs 落盘（task-05 fix）──
{
  // code 映射契约：五状态 → 四 code（skipped/degraded 同 code——对消费方同为「本次无对账结论」）
  const codeOf = st => buildReconcileTargetFilesEnvelope({
    status: st, matched: [], missing: [], undeclared: [],
    skipReason: ['skipped', 'degraded'].includes(st) ? 'r' : null, notes: [], form: null, sources: [],
  }).code
  assert(codeOf('missing_declared') === 'reconcile_missing_declared', `②类 code=reconcile_missing_declared（实际: ${codeOf('missing_declared')}）`)
  assert(codeOf('undeclared') === 'reconcile_undeclared_file', `③类 code=reconcile_undeclared_file（实际: ${codeOf('undeclared')}）`)
  assert(codeOf('skipped') === 'reconcile_skipped' && codeOf('degraded') === 'reconcile_skipped', `skipped/degraded 同 code=reconcile_skipped（实际: ${codeOf('skipped')}/${codeOf('degraded')}）`)
  assert(codeOf('ok') === 'reconcile_ok', `ok code=reconcile_ok（实际: ${codeOf('ok')}）`)

  // 真实 missing_declared 场景直调（fixture 与 D3 同构）→ envelope.code 命中
  const dir = mkRepo('tf-gates-4-')
  try {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'b.js'), 'base')
    commitAll(dir, 'base')
    const change = 'tf-gates-4'
    writeCard(dir, change, 'task-01.md', fm('id: task-01\ntarget_files:\n- src/b.js')) // 声明未做 → ②类
    const r = reconcileTargetFiles({ cwd: dir, changeName: change })
    assert(r.status === 'missing_declared', `直调场景 status=missing_declared（实际: ${r.status}）`)
    const env = buildReconcileTargetFilesEnvelope(r)
    assert(env.code === 'reconcile_missing_declared', `envelope.code==='reconcile_missing_declared'（实际: ${env.code}）`)

    // 落盘：writeReconcileRunResult 存在且实写 verify-runs/<ts>/reconcile-result.json
    assert(typeof writeReconcileRunResult === 'function', 'verify-runs 写入函数存在且已导出')
    const runtimeRoot = join(dir, '.sillyspec', '.runtime')
    const { out } = captureConsole(() => writeReconcileRunResult({ runtimeRoot, changeName: change, envelope: env, result: r }))
    const runsDir = join(runtimeRoot, 'verify-runs')
    const runDirs = existsSync(runsDir) ? readdirSync(runsDir) : []
    assert(runDirs.length === 1 && /^\d{14}$/.test(runDirs[0]), `目录组织对齐 writeRunResult 先例 verify-runs/<ts>（实际: ${runDirs.join(',')}）`)
    const persisted = JSON.parse(readFileSync(join(runsDir, runDirs[0], 'reconcile-result.json'), 'utf8'))
    assert(persisted.code === 'reconcile_missing_declared' && persisted.change === change, `落盘 JSON 含 code/change（实际: ${persisted.code}/${persisted.change}）`)
    assert(Array.isArray(persisted.missing) && persisted.missing[0]?.task === 'task-01' && persisted.missing[0]?.path === 'src/b.js', '落盘 JSON 含②类逐条清单')
    assert(Array.isArray(persisted.supported_fixes) && persisted.supported_fixes.length === 2, '落盘 JSON 含 supported_fixes（snake_case 机器口径）')
    assert(out.includes('reconcile-result.json'), '落盘成功打印路径回执')

    // fail-soft：runtimeRoot 被同名文件占位 → mkdir 抛 → 不冒泡、返回 null、error 留痕
    const blocker = join(dir, 'blocker')
    writeFileSync(blocker, 'x')
    const { ret: softRet, out: softOut } = captureConsole(() =>
      writeReconcileRunResult({ runtimeRoot: join(blocker, 'sub'), changeName: change, envelope: env, result: r }))
    assert(softRet === null && softOut.includes('落盘失败'), `写失败 fail-soft：返回 null + 留痕不阻断（实际: ${softRet}）`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
