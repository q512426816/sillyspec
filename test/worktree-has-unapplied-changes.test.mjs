/**
 * hasUnappliedChanges 检测语义 characterization 测试
 *
 * 语义：worktree 相对 baseline 的交付变更里，哪些还没 byte-identical 落到主工作区 HEAD。
 *   - 全部已在 main HEAD（cherry-pick/rebase/merge/apply 落地）→ hasChanges:false（可安全 cleanup）
 *   - 否则 hasChanges:true（保留 worktree）
 *   - 检测失败/拿不准 → 保守 hasChanges:true（防误删未落代码）
 *
 * 修复前该函数只看"worktree 相对 baseline 有无 diff"，导致 cherry-pick/rebase 直接落 main 后
 * 归档仍误报"未 apply 变更"。本测试锁定新语义。
 *
 * 范式照 test/worktree-apply-hash-mismatch.test.mjs：mkdtempSync → git init → 写基线 commit →
 * git worktree add → 改动/commit → 主仓库推进 → 手写 meta.json → new WorktreeManager({cwd}).hasUnappliedChanges。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { WorktreeManager } from '../src/worktree.js'

let passed = 0, failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function rev(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8' }).trim() }
function readNorm(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'whu-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  sh('git config commit.gpgsign false', d)
  fs.writeFileSync(path.join(d, 'a.txt'), 'a\n')
  fs.writeFileSync(path.join(d, 'b.txt'), 'b\n')
  fs.writeFileSync(path.join(d, 'shared.txt'), 'original\n')
  fs.writeFileSync(path.join(d, 'gone.txt'), 'gone\n')
  fs.writeFileSync(path.join(d, 'old.txt'), 'old\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  process.chdir(d)
  return d
}
function makeWorktree(d) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  return wtDir
}
function writeMeta(wtDir, base, overrides = {}) {
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash: 'x', baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
    ...overrides,
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
}
const cleanup = d => { process.chdir(os.tmpdir()); try { fs.rmSync(d, { recursive: true, force: true }) } catch {} }
const hasUnapplied = (d, name = 'tc') => new WorktreeManager({ cwd: d }).hasUnappliedChanges(name)

console.log('=== hasUnappliedChanges: 检测语义（cherry-pick/rebase 落 main 后归档判定）===\n')

console.log('--- ① cherry-pick 全合并 → 已应用（false）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  sh('git cherry-pick sillyspec/tc', d) // 主工作区拿到 a.txt 改动
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `cherry-pick 全合并 → hasChanges:false（reason: ${r.reason}）`)
  // 坑 cleanup-merged-branch-byte-false-positive 后：分支 tip 是 main 祖先时先走合并可达性短路
  //（reason 'branch fully merged'），非祖先形态落原逐字节路径（reason 'already on main'）——两者语义一致
  assertTrue((r.reason || '').includes('already on main') || (r.reason || '').includes('fully merged'), 'reason 含 already on main / fully merged（合并可达性短路）')
  cleanup(d)
}

console.log('--- ② 未合并 → 未应用（true），保现状 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  writeMeta(wtDir, base) // 主工作区不动
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === true, '未合并 → hasChanges:true')
  assertTrue(JSON.stringify(r.changedFiles) === JSON.stringify(['a.txt']), `changedFiles=['a.txt']（实际: ${JSON.stringify(r.changedFiles)}）`)
  cleanup(d)
}

console.log('--- ③ 部分合并（wt 改 a+b，main 只拿 a）→ true，changedFiles=[b.txt] ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n'); sh('git add -A && git commit -m c1', wtDir)
  fs.writeFileSync(path.join(wtDir, 'b.txt'), 'wt-b\n'); sh('git add -A && git commit -m c2', wtDir)
  const c1 = rev('git rev-parse HEAD~1', wtDir)
  sh(`git cherry-pick ${c1}`, d) // 只拿 a.txt 改动
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === true, '部分合并 → hasChanges:true')
  assertTrue(JSON.stringify(r.changedFiles) === JSON.stringify(['b.txt']), `changedFiles=['b.txt']（实际: ${JSON.stringify(r.changedFiles)}）`)
  cleanup(d)
}

console.log('--- ④ merge ff 落地 → 已应用（false）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  sh('git merge sillyspec/tc', d) // ff，main HEAD == wt HEAD
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `merge ff 落地 → hasChanges:false（reason: ${r.reason}）`)
  cleanup(d)
}

console.log('--- ⑤ untracked 新文件已落 main HEAD（committed）→ 已应用（false）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'new-content\n') // 不 git add，untracked
  fs.writeFileSync(path.join(d, 'new.txt'), 'new-content\n')     // main 同内容并 commit
  sh('git add new.txt && git commit -m land-new', d)
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `untracked 已落 main HEAD → hasChanges:false（reason: ${r.reason}）`)
  cleanup(d)
}

console.log('--- ⑥ untracked 未落 → 未应用（true），changedFiles=[new.txt] ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'new-content\n') // untracked
  writeMeta(wtDir, base) // main 无 new.txt
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === true, 'untracked 未落 → hasChanges:true')
  assertTrue(JSON.stringify(r.changedFiles) === JSON.stringify(['new.txt']), `changedFiles=['new.txt']（实际: ${JSON.stringify(r.changedFiles)}）`)
  cleanup(d)
}

console.log('--- ⑦ worktree dirty 未提交 + main commit 同内容 → 已应用（证明读工作区非 commit）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n') // 不 commit（dirty 工作区）
  fs.writeFileSync(path.join(d, 'a.txt'), 'wt-a\n')     // main 同内容 commit
  sh('git add a.txt && git commit -m land-a', d)
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `dirty worktree + main 同内容 → hasChanges:false（读工作区，reason: ${r.reason}）`)
  cleanup(d)
}

console.log('--- ⑧ in-place 短路 → false（不调 git）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  writeMeta(wtDir, base, { mode: 'in-place-fallback' })
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, 'in-place → hasChanges:false')
  assertTrue((r.reason || '') === 'in-place mode', `reason='in-place mode'（实际: ${r.reason}）`)
  cleanup(d)
}

console.log('--- ⑨ native-worktree 短路 → false（新，不调 git）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  writeMeta(wtDir, base, { mode: 'native-worktree' })
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, 'native-worktree → hasChanges:false')
  assertTrue((r.reason || '').includes('native'), `reason 含 native（实际: ${r.reason}）`)
  cleanup(d)
}

console.log('--- ⑩ 短路合集：no meta / dir 缺失 / 无 diffBase / 空 worktree ---')
{
  // no meta：不写 meta.json
  const d1 = setupRepo(); makeWorktree(d1)
  const r1 = hasUnapplied(d1)
  assertTrue(r1.hasChanges === false && r1.reason === 'no meta', 'no meta → false/no meta')
  cleanup(d1)

  // worktree dir 缺失 → 保守 true（execute 批量完成 cleanup 删分支盲区修复，memory execute-batch-cleanup-deletes-branch-recovery）
  const d2 = setupRepo(); const base2 = rev('git rev-parse HEAD', d2); const wtDir2 = makeWorktree(d2)
  writeMeta(wtDir2, base2, { worktreePath: path.join(d2, 'does-not-exist') })
  const r2 = hasUnapplied(d2)
  assertTrue(r2.hasChanges === true && (r2.reason || '').includes('conservative keep'), `dir 缺失 → 保守 true（实际: ${r2.reason}）`)
  cleanup(d2)

  // 无 diffBase → 保守 true（有 meta 但缺 diff 起点，无法判定未落代码）
  const d3 = setupRepo(); const base3 = rev('git rev-parse HEAD', d3); const wtDir3 = makeWorktree(d3)
  writeMeta(wtDir3, base3, { baseHash: null, baselineCommit: null })
  const r3 = hasUnapplied(d3)
  assertTrue(r3.hasChanges === true && (r3.reason || '').includes('conservative keep'), `无 diffBase → 保守 true（实际: ${r3.reason}）`)
  cleanup(d3)

  // 空 worktree（无任何改动）
  const d4 = setupRepo(); const base4 = rev('git rev-parse HEAD', d4); const wtDir4 = makeWorktree(d4)
  writeMeta(wtDir4, base4)
  const r4 = hasUnapplied(d4)
  // 空 worktree 且分支 tip 即 main HEAD（建了未动）→ 合并可达性短路同样判 false（tip===HEAD 时
  // merge-base 输出 tip 自身，祖先成立），reason 文案与逐字节路径 'no changes' 二者皆可
  assertTrue(r4.hasChanges === false && ((r4.reason || '').includes('no changes') || (r4.reason || '').includes('fully merged')), `空 worktree → false（实际: ${r4.reason}）`)
  cleanup(d4)
}

console.log('--- ⑪ binary 文件：cherry-pick 落地 → false；未落 → true ---')
{
  const buf = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00, 0x0a])
  // 落地
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'bin.dat'), buf)
  sh('git add -A && git commit -m wt-bin', wtDir)
  sh('git cherry-pick sillyspec/tc', d)
  writeMeta(wtDir, base)
  assertTrue(hasUnapplied(d).hasChanges === false, 'binary cherry-pick 落地 → false')
  cleanup(d)
  // 未落
  const d2 = setupRepo(); const base2 = rev('git rev-parse HEAD', d2); const wtDir2 = makeWorktree(d2)
  fs.writeFileSync(path.join(wtDir2, 'bin.dat'), buf)
  sh('git add -A && git commit -m wt-bin', wtDir2)
  writeMeta(wtDir2, base2)
  const r2 = hasUnapplied(d2)
  assertTrue(r2.hasChanges === true, 'binary 未落 → true')
  assertTrue(JSON.stringify(r2.changedFiles) === JSON.stringify(['bin.dat']), `changedFiles=['bin.dat']（实际: ${JSON.stringify(r2.changedFiles)}）`)
  cleanup(d2)
}

console.log('--- ⑫ rename（--no-renames）：main 同 rename → false；未落 → true 含 old+new ---')
{
  // 落地（main 也 rename）
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  sh('git mv old.txt moved.txt', wtDir); sh('git commit -m wt-rename', wtDir)
  sh('git mv old.txt moved.txt', d); sh('git commit -m main-rename', d)
  writeMeta(wtDir, base)
  assertTrue(hasUnapplied(d).hasChanges === false, 'rename 双方一致 → false')
  cleanup(d)
  // 未落
  const d2 = setupRepo(); const base2 = rev('git rev-parse HEAD', d2); const wtDir2 = makeWorktree(d2)
  sh('git mv old.txt moved.txt', wtDir2); sh('git commit -m wt-rename', wtDir2)
  writeMeta(wtDir2, base2)
  const r2 = hasUnapplied(d2)
  assertTrue(r2.hasChanges === true, 'rename 未落 → true')
  assertTrue(r2.changedFiles.includes('old.txt') && r2.changedFiles.includes('moved.txt'),
    `changedFiles 含 old.txt + moved.txt（--no-renames 生效，实际: ${JSON.stringify(r2.changedFiles)}）`)
  cleanup(d2)
}

console.log('--- ⑬ 删除：main 同删 → false；未落 → true 含 gone.txt ---')
{
  // 落地
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  sh('git rm gone.txt', wtDir); sh('git commit -m wt-rm', wtDir)
  sh('git rm gone.txt', d); sh('git commit -m main-rm', d)
  writeMeta(wtDir, base)
  assertTrue(hasUnapplied(d).hasChanges === false, '删除双方一致 → false')
  cleanup(d)
  // 未落
  const d2 = setupRepo(); const base2 = rev('git rev-parse HEAD', d2); const wtDir2 = makeWorktree(d2)
  sh('git rm gone.txt', wtDir2); sh('git commit -m wt-rm', wtDir2)
  writeMeta(wtDir2, base2)
  const r2 = hasUnapplied(d2)
  assertTrue(r2.hasChanges === true && r2.changedFiles.includes('gone.txt'),
    `删除未落 → true 含 gone.txt（实际: ${JSON.stringify(r2.changedFiles)}）`)
  cleanup(d2)
}

console.log('--- ⑭ dirty-baseline（baselineCommit checkpoint）：不污染判定 ---')
{
  // 落地：main 把 shared.txt 改成和 wt 一致 + land baseline 文件
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d)
  fs.writeFileSync(path.join(d, 'baseline-dirty.txt'), 'dirty\n') // 模拟 create 时主仓库 dirty
  const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'baseline-dirty.txt'), 'dirty\n') // 模拟 overlay
  sh('git add -A && git commit -m checkpoint', wtDir)
  const checkpoint = rev('git rev-parse HEAD', wtDir) // = baselineCommit
  fs.writeFileSync(path.join(wtDir, 'shared.txt'), 'wt-shared\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  // main land 两部分
  fs.writeFileSync(path.join(d, 'shared.txt'), 'wt-shared\n')
  fs.writeFileSync(path.join(d, 'baseline-dirty.txt'), 'dirty\n')
  sh('git add -A && git commit -m land-all', d)
  writeMeta(wtDir, base, { baselineCommit: checkpoint })
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `baselineCommit 场景 + shared 落地 → false（reason: ${r.reason}）`)
  cleanup(d)
  // 未落（只 land baseline 文件，shared 不动）
  const d2 = setupRepo(); const base2 = rev('git rev-parse HEAD', d2)
  fs.writeFileSync(path.join(d2, 'baseline-dirty.txt'), 'dirty\n')
  const wtDir2 = makeWorktree(d2)
  fs.writeFileSync(path.join(wtDir2, 'baseline-dirty.txt'), 'dirty\n')
  sh('git add -A && git commit -m checkpoint', wtDir2)
  const checkpoint2 = rev('git rev-parse HEAD', wtDir2)
  fs.writeFileSync(path.join(wtDir2, 'shared.txt'), 'wt-shared\n')
  sh('git add -A && git commit -m wt-change', wtDir2)
  fs.writeFileSync(path.join(d2, 'baseline-dirty.txt'), 'dirty\n')
  sh('git add -A && git commit -m land-baseline-only', d2) // 只 land baseline 文件，shared 仍 original
  writeMeta(wtDir2, base2, { baselineCommit: checkpoint2 })
  const r2 = hasUnapplied(d2)
  assertTrue(r2.hasChanges === true, 'baselineCommit 场景 + shared 未落 → true')
  assertTrue(JSON.stringify(r2.changedFiles) === JSON.stringify(['shared.txt']),
    `changedFiles=['shared.txt']，不含 baseline-dirty.txt（实际: ${JSON.stringify(r2.changedFiles)}）`)
  cleanup(d2)
}

console.log('--- ⑮ CRLF/多行（Windows 默认 autocrlf）：wt 与 main 同内容 → false ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  const multiline = 'line1\nline2\nline3\nlast\n'
  fs.writeFileSync(path.join(wtDir, 'a.txt'), multiline)
  sh('git add -A && git commit -m wt-multi', wtDir)
  sh('git cherry-pick sillyspec/tc', d)
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `多行内容 cherry-pick 落地 → false（CRLF 归一化无误判，reason: ${r.reason}）`)
  // 自检：wt 与 main 落地后 a.txt 内容一致
  assertTrue(readNorm(path.join(wtDir, 'a.txt')) === readNorm(path.join(d, 'a.txt')), '自检：wt 与 main a.txt 内容一致')
  cleanup(d)
}

console.log('--- ⑯ fail-safe：检测失败 → 保守 hasChanges:true（保留 worktree）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  writeMeta(wtDir, base)
  const wm = new WorktreeManager({ cwd: d })
  const badCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'whu-bad-')) // 非 git 目录
  wm.cwd = badCwd // 让 _changesAlreadyOnMain 的 git(cwd,'rev-parse HEAD') 抛
  const r = wm.hasUnappliedChanges('tc')
  assertTrue(r.hasChanges === true, 'fail-safe: this.cwd 非 git → rev-parse 抛 → catch → hasChanges:true')
  assertTrue((r.reason || '').includes('check failed'), `reason 含 check failed（实际: ${r.reason}）`)
  process.chdir(os.tmpdir()); try { fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(badCwd, { recursive: true, force: true }) } catch {}
}

console.log('--- ⑰ _resolveMainRepoRoot 不依赖 process.cwd（process.cwd 是另一 git 仓库时 worktreeBase 仍指向 cwd 仓库）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  sh('git add -A && git commit -m wt-change', wtDir)
  writeMeta(wtDir, base)
  // 另起 git 仓库 d2，把 process.cwd 移过去（模拟脚本未 chdir、或 CLI 在另一 git 仓库内跑）
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'whu-cwd2-'))
  sh('git init', d2); sh('git config user.email t@t.co && git config user.name t', d2)
  fs.writeFileSync(path.join(d2, 'x.txt'), 'x\n'); sh('git add -A && git commit -m init', d2)
  process.chdir(d2) // process.cwd = d2（含 .git），≠ this.cwd=d
  const wm = new WorktreeManager({ cwd: d })
  assertTrue(wm.worktreeBase.startsWith(d) && !wm.worktreeBase.startsWith(d2),
    `worktreeBase 指向 cwd 仓库 d 而非 process.cwd 仓库 d2（实际: ${wm.worktreeBase}）`)
  assertTrue(wm.getMeta('tc') !== null, 'getMeta(tc) 非 null（worktreeBase 正确解析到 d）')
  sh('git cherry-pick sillyspec/tc', d) // 在 d 跑（sh 的 cwd 参数），让 a.txt 落地
  const r = wm.hasUnappliedChanges('tc')
  assertTrue(r.hasChanges === false, `process.cwd≠cwd 下 cherry-pick 落地 → 已应用（reason: ${r.reason}）`)
  process.chdir(os.tmpdir()); try { fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(d2, { recursive: true, force: true }) } catch {}
}

console.log('--- ⑱ 分支已 merge 进主仓后主仓再改同批文件 → false（坑 cleanup-merged-branch-byte-false-positive）---')
{
  // 2026-08-23 实证：merge 落地 + 主仓后续演进 → 逐字节判定必然不等 → 误报未落地拦 cleanup
  // 要 --force（用户只能 git branch --merged 自证）。合并可达性短路：tip 是 HEAD 祖先即已交付。
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  // worktree 提交交付变更
  fs.writeFileSync(path.join(wtDir, 'shared.txt'), 'merged-change\n')
  sh('git add -A && git commit -m deliver', wtDir)
  // 主仓 merge 分支，再继续演进同文件
  sh('git merge --no-ff sillyspec/tc -m mergeit', d)
  fs.writeFileSync(path.join(d, 'shared.txt'), 'post-merge-evolution\n')
  sh('git add -A && git commit -m evolve', d)
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === false, `已 merge + 主仓后续演进 → false（实际 ${r.hasChanges}, reason: ${r.reason}）`)
  assertTrue((r.reason || '').includes('fully merged'), `reason 走合并可达性短路（实际: ${r.reason}）`)
  cleanup(d)
}

console.log('--- ⑲ 对照：分支领先未 merge（主仓后改同文件）→ 仍 true ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'shared.txt'), 'branch-change\n')
  sh('git add -A && git commit -m deliver', wtDir)
  // 主仓独立演进同文件（不 merge 分支）→ 分支交付未进主仓历史
  fs.writeFileSync(path.join(d, 'shared.txt'), 'main-own-change\n')
  sh('git add -A && git commit -m evolve', d)
  writeMeta(wtDir, base)
  const r = hasUnapplied(d)
  assertTrue(r.hasChanges === true, `未 merge + 内容分叉 → true 保留 worktree（实际 ${r.hasChanges}）`)
  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
