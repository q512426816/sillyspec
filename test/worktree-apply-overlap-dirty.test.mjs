/**
 * worktree-apply overlap-only dirty 拦截测试 — 只拦与 changedFiles 重叠的未提交文件
 *
 * 2026-08-20 放宽（原全量拦截把无关脏文件也硬挡，用户被迫走 rescue cp 手动路径）：
 *   A. 无关 dirty（tracked-modified）→ apply 放行 + warning + 变更真实落地 + 无关文件不受伤
 *   B. 无关 dirty（untracked）→ 同样放行
 *   C. 重叠 dirty → 仍拦截（rescue 分类：重叠文件 EXCLUDE-DIRTY，干净文件 SAFE-CP）
 *   D. assess 无关场景不再 BLOCKED（WARNING 透出放行提示）
 *
 * setup 显式 core.autocrlf false：autocrlf on 时 git apply --3way 对 dirty 树可报
 * does not match index（哪怕不重叠，见 worktree-apply.js step4.5 注释）——那是 catch 回滚
 * 兜底的罕见路径，本测试锁定的是「交集空 → 放行」的判定语义，须在确定性 CRLF 环境下验证。
 * 沿用 worktree-apply-rescue.test.mjs 的 setupRepo/writeMeta 模式。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree, assessApplyRisk } from '../src/worktree-apply.js'
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

function setupRepo(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'wt-ovl-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  // 锁定确定性 CRLF 环境（原因见文件头注释）
  sh('git config core.autocrlf false', d)
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

function setupWorktree(d, { wtChanges = [] } = {}) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  for (const [file, content] of wtChanges) {
    fs.writeFileSync(path.join(wtDir, file), content)
  }
  const base = git('rev-parse HEAD', d)
  return { wtDir, base }
}

function writeMeta(d, meta, wtDir) {
  const metaDir = wtDir || path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  fs.writeFileSync(path.join(metaDir, 'meta.json'), JSON.stringify(meta))
}

function metaFor(d, { base, wtDir }) {
  return {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash: computeBaselineHash(d),
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
}

console.log('=== A. 无关 dirty（tracked-modified）→ 放行 + warning + 落地 ===\n')
{
  const d = setupRepo('ovl-tracked-')
  const { wtDir, base } = setupWorktree(d, { wtChanges: [['fileA.txt', 'WT-A\n']] })
  // 主仓无关未提交修改：fileB 不在 changedFiles（worktree 只改了 fileA）
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'DIRTY-B\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: false }) // 真实 apply（原行为在此被硬挡）
  assertTrue(r.ok === true, `无关 dirty → apply 放行成功（实际 errors: ${JSON.stringify((r.errors || []).map(e => e.slice(0, 60)))}）`)
  assertTrue((r.errors || []).length === 0, '无 error')
  assertTrue((r.warnings || []).some(w => w.includes('无关') && w.includes('放行')), 'warning 提示无关文件已放行（只校验重叠文件）')
  assertTrue(fs.readFileSync(path.join(d, 'fileA.txt'), 'utf8') === 'WT-A\n', 'worktree 变更真实落地主仓 fileA')
  assertTrue(fs.readFileSync(path.join(d, 'fileB.txt'), 'utf8') === 'DIRTY-B\n', '无关脏文件 fileB 未被触碰（apply/rollback 均不波及）')
  cleanup(d)
}

console.log('\n=== B. 无关 dirty（untracked）→ 同样放行 ===\n')
{
  const d = setupRepo('ovl-untracked-')
  const { wtDir, base } = setupWorktree(d, { wtChanges: [['fileA.txt', 'WT-A\n']] })
  // 主仓无关 untracked 新文件
  fs.writeFileSync(path.join(d, 'unrelated-new.js'), 'x\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: false })
  assertTrue(r.ok === true, `无关 untracked → apply 放行成功（实际 errors: ${JSON.stringify((r.errors || []).map(e => e.slice(0, 60)))}）`)
  assertTrue(fs.readFileSync(path.join(d, 'fileA.txt'), 'utf8') === 'WT-A\n', '变更落地')
  assertTrue(fs.existsSync(path.join(d, 'unrelated-new.js')), '无关 untracked 文件未被删除')
  cleanup(d)
}

console.log('\n=== C. 重叠 dirty → 仍拦截 + rescue 分类 ===\n')
{
  const d = setupRepo('ovl-conflict-')
  const { wtDir, base } = setupWorktree(d, {
    wtChanges: [['fileA.txt', 'WT-A\n'], ['fileB.txt', 'WT-B\n']],
  })
  // 主仓未提交修改 fileA——与 changedFiles 重叠，git apply 无法安全应用，必须拦
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'DIRTY-A\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  assertTrue((r.errors || []).length > 0, '重叠 dirty → 拦截（errors 非空；checkOnly 模式 ok 恒 true 不作信号）')
  assertTrue(
    (r.errors || []).some(e => e.includes('重叠') && e.includes('fileA.txt')),
    `error 点名重叠文件 fileA.txt（实际 errors 首条: ${(r.errors[0] || '').slice(0, 80)}）`
  )
  // 拦截理由（errors[0] 的标题+文件清单行）只点名重叠文件；rescue 指引部分出现 fileB 属预期
  // （SAFE-CP 是有用的救援信息，不是误挡）
  const blockReason = (r.errors[0] || '').split('\n').slice(0, 2).join('\n')
  assertTrue(
    !blockReason.includes('fileB.txt'),
    `拦截理由只点名重叠文件（不含无关 fileB；实际: ${blockReason.replace(/\n/g, ' | ')}）`
  )
  assertTrue(r.rescueCommands !== null, 'rescueCommands 非空')
  assertTrue(
    r.rescueCommands.warnings.some(w => w.includes('fileA.txt') && w.includes('EXCLUDE-DIRTY')),
    'rescue 分类：重叠文件 fileA EXCLUDE-DIRTY（不会被 cp 覆盖未提交修改）'
  )
  assertTrue(
    r.rescueCommands.commands.some(c => c.includes('fileB.txt')),
    'rescue 分类：干净文件 fileB SAFE-CP'
  )
  cleanup(d)
}

console.log('\n=== D. assess 无关场景不再 BLOCKED ===\n')
{
  const d = setupRepo('ovl-assess-')
  const { wtDir, base } = setupWorktree(d, { wtChanges: [['fileA.txt', 'WT-A\n']] })
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'DIRTY-B\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const a = assessApplyRisk('tc', { cwd: d })
  assertTrue(a.decision !== 'BLOCKED', `无关 dirty → assess 不再 BLOCKED（实际: ${a.decision}）`)
  assertTrue(
    (a.warnings || []).some(w => w.includes('无关') && w.includes('放行')),
    'assess warnings 透出放行提示'
  )
  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
