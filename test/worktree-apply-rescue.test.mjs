/**
 * worktree-apply rescue 测试套件 — 锁死 dirty 拦截时的逐文件 rescue 机制
 *
 * 覆盖（对照 task-05 acceptance + design AC）：
 *   A. generateRescueCommands 纯函数四分类（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）
 *   B. P0 时序回归（AC-1）：main 推进 fileA + fileB dirty → rescue 排除 fileA（锁死 task-02 hashMismatch 前移）
 *   C. 前移等价（AC-8）：checkOnly 与 real apply 两路径 hashMismatchFiles 一致
 *   D. dirtyFiles 口径（AC-6）：untracked + .sillyspec/docs/ 进 rescue dirtyFiles（Grill gap 闭环）
 *   E. 零回归（AC-3）：未触发拦截 rescueCommands===null
 *   F. applyWorktree 拦截集成 + assessApplyRisk 透出
 *   G. 跨模式 deletedFiles（AC-9）：native-worktree + in-place-fallback
 *
 * 沿用 worktree-apply-baseline-clean.test.mjs 的 setupRepo/sh/assertTrue/chdir/cleanup 模式。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import {
  applyWorktree,
  assessApplyRisk,
  generateRescueCommands,
  computeRescueDirtyFiles,
} from '../src/worktree-apply.js'
import { computeBaselineHash } from '../src/worktree.js'

let passed = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function git(args, cwd) { return execSync('git ' + args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim() }

// 反斜杠字符（避免 JS 字面量反斜杠坑，memory: prompt-edit-crlf-quote-trap）
const BS = String.fromCharCode(92)

function setupRepo(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'wt-rescue-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'a1\na2\na3\n')
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'b1\nb2\nb3\n')
  sh('git add -A && git commit -qm init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm gitignore', d)
  process.chdir(d)
  return d
}

function cleanup(d) {
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

// 写 worktree meta.json（native 模式写 wtDir，in-place 模式写 worktreeBase，二者皆落在
// .sillyspec/.runtime/worktrees/tc/，由 applyWorktree 经 wm.getMeta 读回）
function writeMeta(d, meta, wtDir) {
  const metaDir = wtDir || path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  fs.writeFileSync(path.join(metaDir, 'meta.json'), JSON.stringify(meta))
}

console.log('=== A. generateRescueCommands 纯函数四分类 ===\n')

console.log('--- A1: 四分类基本（SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE）---')
{
  const r = generateRescueCommands({
    changedFiles: ['a.js', 'b.js', 'c.js', 'd.js'],
    dirtyFiles: ['b.js'],
    hashMismatchFiles: ['c.js'],
    deletedFiles: ['d.js'],
    worktreePath: '/wt',
    projectRoot: '/pr',
  })
  assertTrue(r.commands.length === 2, `commands 数=2（1 cp + 1 rm），实际 ${r.commands.length}`)
  assertTrue(r.commands[0] === 'cp "/wt/a.js" "/pr/a.js"', `commands[0]=SAFE-CP（cp a.js），实际: ${r.commands[0]}`)
  assertTrue(r.commands[1] === 'rm "/pr/d.js"', `commands[1]=DELETE（rm d.js），实际: ${r.commands[1]}`)
  assertTrue(r.warnings.length === 2, `warnings 数=2（b.js EXCLUDE-DIRTY + c.js EXCLUDE-MISMATCH），实际 ${r.warnings.length}`)
  assertTrue(r.warnings.some(w => w.includes('b.js') && w.includes('EXCLUDE-DIRTY')), 'warnings 含 b.js EXCLUDE-DIRTY')
  assertTrue(r.warnings.some(w => w.includes('c.js') && w.includes('EXCLUDE-MISMATCH')), 'warnings 含 c.js EXCLUDE-MISMATCH')
  assertTrue(r.cpFileCount === 1, `cpFileCount=1，实际 ${r.cpFileCount}`)
  assertTrue(r.excludedCount === 2, `excludedCount=2，实际 ${r.excludedCount}`)
}

console.log('--- A2: DELETE 优先级（同文件命中 deleted+dirty+mismatch → 只 rm，不计两类）---')
{
  const r = generateRescueCommands({
    changedFiles: ['x.js'],
    dirtyFiles: ['x.js'],
    hashMismatchFiles: ['x.js'],
    deletedFiles: ['x.js'],
    worktreePath: '/wt',
    projectRoot: '/pr',
  })
  assertTrue(r.commands.length === 1 && r.commands[0] === 'rm "/pr/x.js"', `DELETE 最优先 → 只 rm x.js，实际: ${r.commands.join(';')}`)
  assertTrue(r.warnings.length === 0, '不计 EXCLUDE-DIRTY / EXCLUDE-MISMATCH（warnings=0）')
  assertTrue(r.cpFileCount === 0, 'cpFileCount=0')
  assertTrue(r.excludedCount === 0, 'excludedCount=0（DELETE 不算 excluded）')
}

console.log('--- A3: dirtyFiles 传 Set 与数组结果一致 ---')
{
  const base = { changedFiles: ['a.js', 'b.js'], hashMismatchFiles: [], deletedFiles: [], worktreePath: '/wt', projectRoot: '/pr' }
  const rArr = generateRescueCommands({ ...base, dirtyFiles: ['b.js'] })
  const rSet = generateRescueCommands({ ...base, dirtyFiles: new Set(['b.js']) })
  assertTrue(JSON.stringify(rArr) === JSON.stringify(rSet), 'Set 与数组结果完全一致')
  assertTrue(rArr.warnings.length === 1 && rArr.warnings[0].includes('b.js'), 'b.js 进 EXCLUDE-DIRTY（两形态同）')
}

console.log('--- A4: 路径正斜杠（Windows 风格入参 → commands 路径无反斜杠）---')
{
  const winWt = 'C:' + BS + 'wt'
  const winPr = 'C:' + BS + 'pr'
  const r = generateRescueCommands({
    changedFiles: ['a.js'],
    dirtyFiles: [], hashMismatchFiles: [], deletedFiles: [],
    worktreePath: winWt, projectRoot: winPr,
  })
  assertTrue(r.commands.length === 1, `commands 数=1，实际 ${r.commands.length}`)
  const cmd = r.commands[0]
  assertTrue(cmd.indexOf(BS) === -1, `command 路径无反斜杠（Git Bash cp 兼容），实际: ${cmd}`)
  assertTrue(cmd.includes('a.js') && cmd.startsWith('cp '), 'command 形如 cp "...a.js" "..."')
}

console.log('--- A5: 不 mutate 入参 ---')
{
  const changedFiles = ['a.js', 'b.js']
  const dirtyFiles = ['b.js']
  const hashMismatchFiles = ['c.js']
  const deletedFiles = ['d.js']
  const before = JSON.stringify({ changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles })
  generateRescueCommands({ changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles, worktreePath: '/wt', projectRoot: '/pr' })
  const after = JSON.stringify({ changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles })
  assertTrue(before === after, '入参数组未被 mutate（纯函数）')
}

console.log('--- A6: 空 changedFiles → 全零返回 ---')
{
  const r = generateRescueCommands({
    changedFiles: [], dirtyFiles: ['b.js'], hashMismatchFiles: ['c.js'], deletedFiles: ['d.js'],
    worktreePath: '/wt', projectRoot: '/pr',
  })
  assertTrue(r.commands.length === 0 && r.warnings.length === 0, '空 changedFiles → commands/warnings 全空')
  assertTrue(r.cpFileCount === 0 && r.excludedCount === 0, 'cpFileCount/excludedCount=0')
}

console.log('\n=== B. P0 时序回归（AC-1）：main 推进 fileA + fileB dirty 重叠 → rescue 排除 fileA ===\n')
{
  const d = setupRepo('wt-p0-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  // worktree 改 fileA + fileB（fileB 进 changedFiles，使下方 main 的 fileB dirty 构成重叠——
  // step4.5 为 overlap-only 拦截，无关 dirty 已放行，见 worktree-apply-overlap-dirty.test.mjs）
  fs.writeFileSync(path.join(wtDir, 'fileA.txt'), 'WT-A\n')
  fs.writeFileSync(path.join(wtDir, 'fileB.txt'), 'WT-B\n')
  const base = git('rev-parse HEAD', d)
  // main 已提交推进 fileA（HEAD fileA ≠ base fileA → step3.5 hashMismatch 前移算出）
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'MAIN-A\n')
  sh('git add -A && git commit -qm main-advance-fileA', d)
  // main fileB 未提交 dirty（与 changedFiles 重叠 → 触发 step4.5 拦截 → 进 rescue 分支）
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'DIRTY-B\n')
  const baselineHash = computeBaselineHash(d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  assertTrue(r.hashMismatchFiles.includes('fileA.txt'), `hashMismatch 前移生效：含 fileA.txt（实际: ${r.hashMismatchFiles.join(',')}）`)
  assertTrue(r.rescueCommands !== null, 'rescueCommands 非空（step4.5 dirty 拦截触发 rescue）')
  assertTrue(
    r.rescueCommands.warnings.some(w => w.includes('fileA.txt') && w.includes('EXCLUDE-MISMATCH')),
    `warnings 含 fileA.txt EXCLUDE-MISMATCH（task-02 前移生效，rescue 不回退主干推进）`
  )
  assertTrue(
    r.rescueCommands.commands.every(c => !c.includes('fileA.txt')),
    'commands 不含 cp fileA（被 EXCLUDE-MISMATCH 排除，不会被误 cp 覆盖主干已提交推进）'
  )
  cleanup(d)
}

console.log('\n=== C. 前移等价（AC-8）：checkOnly 与 real apply 两路径 hashMismatchFiles 一致 ===\n')
{
  const d = setupRepo('wt-eq-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  fs.writeFileSync(path.join(wtDir, 'fileA.txt'), 'WT-A\n')
  const base = git('rev-parse HEAD', d)
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'MAIN-A\n')
  sh('git add -A && git commit -qm main-advance-fileA', d)
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'DIRTY-B\n')
  const baselineHash = computeBaselineHash(d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  // checkOnly:true（收集不短路）与 checkOnly:false（step4.5 dirty 短路 return）两路径，
  // hashMismatch 均在 step3.5（更早）算好 → 一致（锁死前移对两路径都生效）。
  const rCheck = applyWorktree('tc', { cwd: d, checkOnly: true })
  const rReal = applyWorktree('tc', { cwd: d, checkOnly: false })
  assertTrue(rCheck.hashMismatchFiles.includes('fileA.txt'), `checkOnly 路径 hashMismatchFiles 含 fileA.txt（实际: ${rCheck.hashMismatchFiles.join(',')}）`)
  assertTrue(rReal.hashMismatchFiles.includes('fileA.txt'), `real apply 路径 hashMismatchFiles 含 fileA.txt（实际: ${rReal.hashMismatchFiles.join(',')}）`)
  assertTrue(
    JSON.stringify(rCheck.hashMismatchFiles) === JSON.stringify(rReal.hashMismatchFiles),
    '两路径 hashMismatchFiles 完全一致（前移等价）'
  )
  cleanup(d)
}

console.log('\n=== D. dirtyFiles 口径（AC-6）：untracked + .sillyspec/docs/ 进 rescue dirtyFiles（Grill gap 闭环）===\n')
{
  const d = setupRepo('wt-dirty-')
  // 改写 .gitignore：只忽略 .runtime/ + changes/，放开 .sillyspec/docs/ 使其可被 git 跟踪
  // （对齐真实 dogfood 仓：.sillyspec/docs/ 是被跟踪的交付物，非 ignored）
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/.runtime/\n.sillyspec/changes/\n')
  sh('git add -A && git commit -qm gitignore-loosen', d)
  fs.mkdirSync(path.join(d, '.sillyspec', 'docs'), { recursive: true })
  fs.writeFileSync(path.join(d, '.sillyspec', 'docs', 'X.md'), 'v1\n')
  sh('git add -A && git commit -qm docs-init', d)
  // tracked-modified dirty：修改已提交的 .sillyspec/docs/X.md
  fs.writeFileSync(path.join(d, '.sillyspec', 'docs', 'X.md'), 'v2-dirty\n')
  // untracked dirty：新建未跟踪文件
  fs.writeFileSync(path.join(d, 'untracked-dirty.js'), 'new\n')

  const rescueDirty = computeRescueDirtyFiles(d)
  assertTrue(
    rescueDirty.includes('.sillyspec/docs/X.md'),
    `.sillyspec/docs/X.md 进 rescue dirtyFiles 口径（Grill gap 闭环：filterDeliverableFiles 保留 .sillyspec/docs/；实际: ${rescueDirty.join(',')})`
  )
  assertTrue(
    rescueDirty.includes('untracked-dirty.js'),
    `untracked 文件进 rescue dirtyFiles 口径（tracked-modified ∪ untracked 统一；实际: ${rescueDirty.join(',')})`
  )
  cleanup(d)
}

console.log('\n=== E. 零回归（AC-3）：main 干净 → rescueCommands===null ===\n')
{
  const d = setupRepo('wt-zero-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  fs.writeFileSync(path.join(wtDir, 'src-deliverable.txt'), 'from-worktree\n')
  const base = git('rev-parse HEAD', d)
  // main 干净（无 dirty）；baselineHash 设值模拟 execute 启动，但无 dirty 不触发拦截
  const baselineHash = computeBaselineHash(d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  assertTrue(r.rescueCommands === null, `main 干净 → rescueCommands===null（零回归；实际: ${JSON.stringify(r.rescueCommands)}）`)
  assertTrue(!r.errors.some(e => e.includes('rescue')), 'errors 不含 rescue 文本（未触发拦截）')
  cleanup(d)
}

console.log('\n=== F. applyWorktree 拦截集成 + assessApplyRisk 透出 ===\n')
{
  const d = setupRepo('wt-integ-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  // worktree 改 src-deliverable.txt + 新增干净文件 src-clean.txt（后者保 SAFE-CP 断言）
  fs.writeFileSync(path.join(wtDir, 'src-deliverable.txt'), 'from-worktree\n')
  fs.writeFileSync(path.join(wtDir, 'src-clean.txt'), 'clean-deliverable\n')
  const base = git('rev-parse HEAD', d)
  // main 未提交 dirty 落在与 changedFiles 重叠的 src-deliverable.txt（step4.5 overlap-only
  // 拦截：无关 dirty 已放行，只有重叠才触发拦截 + rescue）
  fs.writeFileSync(path.join(d, 'src-deliverable.txt'), 'DIRTY-MAIN\n')
  const baselineHash = computeBaselineHash(d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  assertTrue(
    r.rescueCommands !== null && r.rescueCommands.commands.length > 0,
    'applyWorktree dirty 拦截 → rescueCommands 非空且含 cp（src-deliverable.txt 干净可 cp）'
  )
  assertTrue(
    r.errors.some(e => e.includes('rescue')),
    `errors 含 rescue 文本块（实际 errors 首行: ${(r.errors[0] || '').slice(0, 60)}）`
  )

  const a = assessApplyRisk('tc', { cwd: d })
  assertTrue(a.rescueCommands !== null, 'assessApplyRisk 透出 rescueCommands（非 null）')
  assertTrue(a.decision === 'BLOCKED', `assess decision=BLOCKED（dirty 拦截），实际: ${a.decision}`)
  cleanup(d)
}

console.log('\n=== G. 跨模式 deletedFiles（AC-9）：native-worktree + in-place-fallback ===\n')

console.log('--- G1: native-worktree 模式（git worktree add）→ deletedFiles 含删除文件 ---')
{
  const d = setupRepo('wt-del-native-')
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  // worktree 内删除 fileA.txt（未 commit 的工作区删除 → git diff --name-status 显 D）
  fs.unlinkSync(path.join(wtDir, 'fileA.txt'))
  const base = git('rev-parse HEAD', d)
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }, wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  assertTrue(
    r.deletedFiles.includes('fileA.txt'),
    `native-worktree deletedFiles 含 fileA.txt（step2 name-status 解析 D；实际: ${r.deletedFiles.join(',')})`
  )
  cleanup(d)
}

console.log('--- G2: in-place-fallback 模式（worktreePath=主仓）→ deletedFiles 口径一致性 ---')
{
  const d = setupRepo('wt-del-inplace-')
  // in-place-fallback 模式：无独立 git worktree，worktreePath 指向主仓本身（self-overlay 语义）
  // 主仓删除 fileA.txt（未 commit 的工作区删除）
  fs.unlinkSync(path.join(d, 'fileA.txt'))
  const base = git('rev-parse HEAD', d)
  // in-place 模式 meta 写 worktreeBase（.sillyspec/.runtime/worktrees/tc/，由 wm.getMeta 读回）
  writeMeta(d, {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash: null,
    worktreePath: d, mode: 'in-place-fallback', baselineFiles: [],
  })

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  // design 自审存疑项（v1 遗留 line 184）：in-place 模式 name-status 口径是否与 native 一致。
  // 实测验证（不强造通过）：worktreePath===projectRoot===主仓，git diff --name-status <base> 在主仓跑，
  // 删除文件同样显 D → deletedFiles 收集一致。若实测不一致，assertTrue 会如实 FAIL 并记录（铁律：不强行造通过）。
  assertTrue(
    r.deletedFiles.includes('fileA.txt'),
    `in-place-fallback deletedFiles 含 fileA.txt（口径与 native 一致；design 自审存疑项实测通过；实际: ${r.deletedFiles.join(',')})`
  )
  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
