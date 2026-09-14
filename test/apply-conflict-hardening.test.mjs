/**
 * apply-conflict-hardening 集成测试（2026-09-14-apply-conflict-hardening task-04）
 *
 * 真 git 临时仓，不 mock git（R-04；fixture 形态沿用 apply-dirty-threeway.test.mjs 先例）。
 * 四块：
 *   ① merge 写回批末 git add（FR-01）：脏重叠三方合并 clean 写回 + patch 新增文件全部进暂存区
 *   ② apply-manifest.json 生成/指纹/重放覆盖（FR-02）+ doctor detectApplyManifestDrift 三分支（FR-04）
 *   ③ guard 相交预检四态（FR-03）：空集零变化 / 交集 fail-closed / --force 放行留痕 / autoApply 软跳过
 *   ④ rescue 指引行（D-003）：commands 末尾含「落地后 git add 锁定」# 注释行
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { createHash } from 'crypto'
import { applyWorktree, mergeDirtyOverlapThreeWay, generateRescueCommands } from '../src/worktree-apply.js'
import { collectActiveQuickGuardFiles } from '../src/quicklog.js'
import { runDoctorDiagnostics } from '../src/doctor-diagnostics.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}
function gitBuf(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout
}
function sha256(buf) { return createHash('sha256').update(buf).digest('hex') }

/**
 * 场景工厂：主仓（base 文件 daemon.ts 含 a/b 两函数）+ 真实 worktree。
 * main 在途改 a 区（不提交，构成脏重叠），worktree 交付改 b 区 + 新增 newfeat.ts。
 */
function setupMerged({ changeName = 'c1', withNewFile = true } = {}) {
  const proj = mk('ach-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'daemon.ts'),
    'import x from "x"\n\nfunction a() {\n  return 1\n}\n\nfunction b() {\n  return 2\n}\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  const wtDir = mk('ach-wt-'); rmSync(wtDir, { recursive: true, force: true })
  git(proj, ['worktree', 'add', '-q', wtDir, '-b', `sillyspec/${changeName}`])
  // 主仓在途（不提交）+ worktree 交付（不提交）
  writeFileSync(join(proj, 'daemon.ts'),
    'import x from "x"\n\nfunction a() {\n  return 100  // 并行会话改的\n}\n\nfunction b() {\n  return 2\n}\n')
  writeFileSync(join(wtDir, 'daemon.ts'),
    'import x from "x"\n\nfunction a() {\n  return 1\n}\n\nfunction b() {\n  return 200  // 本变更交付\n}\n')
  if (withNewFile) writeFileSync(join(wtDir, 'newfeat.ts'), 'export const feat = true\n')
  const metaDir = join(proj, '.sillyspec', '.runtime', 'worktrees', changeName)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName, baseHash, baselineCommit: baseHash, baselineHash: baseHash,
    mode: 'native-worktree', worktreePath: wtDir,
  }))
  return { proj, wtDir, baseHash }
}

/** 造活跃 quick 会话 guard（guard 目录存在即活跃；7 天僵尸窗口内） */
function writeGuard(proj, sessionId, guard) {
  const dir = join(proj, '.sillyspec', '.runtime', 'quick-sessions', sessionId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'guard.json'), JSON.stringify({ startedAt: new Date().toISOString(), ...guard }))
  return dir
}

// ─────────────────────────────────────────────────────────────
console.log('\n=== ① merge 写回批末 git add：写回批（含新增）全部进暂存区 ===\n')

test('① 脏重叠 clean 合并写回 + patch 新增文件 → git diff --cached 含全部落盘文件', () => {
  const { proj, wtDir } = setupMerged()
  const r = applyWorktree('c1', { cwd: proj })
  assert.equal(r.ok, true, 'apply 放行（errors=' + JSON.stringify((r.errors || []).map(e => e.slice(0, 80))) + '）')
  assert.ok((r.mergedDirtyFiles || []).includes('daemon.ts'), 'daemon.ts 经三方合并写回（mergedDirtyFiles 留痕）')

  const staged = git(proj, ['diff', '--cached', '--name-only']).split('\n').filter(Boolean)
  assert.ok(staged.includes('daemon.ts'), `merge 写回文件在暂存区（staged=${staged.join(',')}）`)
  assert.ok(staged.includes('newfeat.ts'), `patch 新增文件在暂存区（staged=${staged.join(',')}）`)

  // 写回内容 = 两侧并集（合并正确性 sanity）
  const after = readFileSync(join(proj, 'daemon.ts'), 'utf8')
  assert.ok(after.includes('return 100') && after.includes('return 200'), '合并结果含两侧改动')

  // 直调纯函数路径同样落暂存：stagedOk=true 且文件在 index
  const proj2 = mk('ach-direct-')
  git(proj2, ['init', '-q'])
  git(proj2, ['config', 'user.email', 't@t.local']); git(proj2, ['config', 'user.name', 't'])
  writeFileSync(join(proj2, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj2, 'f.ts'), 'l1\nl2\nl3\nl4\nl5\nl6\n')
  git(proj2, ['add', '.']); git(proj2, ['commit', '-q', '-m', 'base'])
  const base2 = git(proj2, ['rev-parse', 'HEAD'])
  const wt2 = mk('ach-direct-wt-'); rmSync(wt2, { recursive: true, force: true })
  git(proj2, ['worktree', 'add', '-q', wt2, '-b', 'wt2'])
  writeFileSync(join(proj2, 'f.ts'), 'MAIN-l1\nl2\nl3\nl4\nl5\nl6\n')
  writeFileSync(join(wt2, 'f.ts'), 'l1\nl2\nl3\nl4\nl5\nWT-l6\n')
  const m = mergeDirtyOverlapThreeWay({ projectRoot: proj2, worktreePath: wt2, baseHash: base2 }, ['f.ts'])
  assert.deepEqual(m.merged, ['f.ts'], '直调合并 clean')
  assert.equal(m.stagedOk, true, '直调合并 stagedOk=true（批末 git add 成功）')
  const staged2 = git(proj2, ['diff', '--cached', '--name-only']).split('\n').filter(Boolean)
  assert.ok(staged2.includes('f.ts'), `直调合并写回也在暂存区（staged=${staged2.join(',')}）`)
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ② apply-manifest 生成/指纹/重放覆盖 + doctor 漂移三分支 ===\n')

test('② apply 成功 → apply-manifest.json 落变更目录，sha256 与 staged blob 一致；重放覆盖生效', async () => {
  const { proj, wtDir } = setupMerged({ changeName: 'c2', withNewFile: false })
  // 变更目录带 design.md（resolveActiveOrArchiveChangeDir 活跃桶确定命中）
  const changeDir = join(proj, '.sillyspec', 'changes', 'c2')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# design\n')

  const r1 = applyWorktree('c2', { cwd: proj })
  assert.equal(r1.ok, true, '首次 apply 成功')
  const mfPath = join(changeDir, 'apply-manifest.json')
  assert.ok(existsSync(mfPath), 'apply-manifest.json 已写入变更目录')
  assert.equal(r1.applyManifest, mfPath, 'result.applyManifest 透出落点')
  const mf1 = JSON.parse(readFileSync(mfPath, 'utf8'))
  assert.equal(mf1.schemaVersion, 1, 'schemaVersion=1')
  assert.equal(mf1.change, 'c2', 'manifest.change 记录变更名')
  assert.ok(Array.isArray(mf1.files) && mf1.files.length > 0, 'manifest.files 非空')
  assert.ok(mf1.files.some(e => e.path === 'daemon.ts'), 'files 覆盖实际落盘文件 daemon.ts')
  // 指纹口径：staged blob 内容（git show :<path>）——逐文件比对
  for (const ent of mf1.files) {
    const blob = gitBuf(proj, ['show', `:${ent.path}`])
    assert.equal(sha256(blob), ent.sha256, `${ent.path} manifest sha256 == staged blob sha256`)
  }

  // doctor 干净态：零漂移告警
  const d1 = await runDoctorDiagnostics({ cwd: proj })
  const dim1 = d1.dimensions.find(d => d.name === 'apply_manifest_drift')
  assert.ok(dim1, 'doctor 含 apply_manifest_drift 维度')
  assert.equal(dim1.pass, true, '干净态 pass=true')
  assert.ok(!dim1.findings.some(f => /落盘面漂移|暂存面漂移|丢失（/.test(f)), '干净态零漂移/丢失告警（findings=' + JSON.stringify(dim1.findings) + '）')

  // 重放：worktree 改首行 import（主仓在途未动的远端行 → 与已合并结果再合一次 clean）
  writeFileSync(join(wtDir, 'daemon.ts'),
    'import y from "y"  // 重放交付\n\nfunction a() {\n  return 100  // 并行会话改的\n}\n\nfunction b() {\n  return 200  // 本变更交付\n}\n')
  const r2 = applyWorktree('c2', { cwd: proj })
  assert.equal(r2.ok, true, '重放 apply 成功（errors=' + JSON.stringify((r2.errors || []).map(e => e.slice(0, 80))) + '）')
  const mf2 = JSON.parse(readFileSync(mfPath, 'utf8'))
  const ent2 = mf2.files.find(e => e.path === 'daemon.ts')
  assert.ok(ent2, '重放 manifest 仍含 daemon.ts')
  const blob2 = gitBuf(proj, ['show', ':daemon.ts'])
  assert.equal(sha256(blob2), ent2.sha256, '重放后 manifest 指纹=最新 staged blob（覆盖生效）')
  assert.ok(readFileSync(join(proj, 'daemon.ts'), 'utf8').includes('import y'), '重放落盘内容生效')

  // doctor 篡改态：worktree 落盘文件改一字节（不 add）→ 落盘面漂移告警
  const cur = readFileSync(join(proj, 'daemon.ts'), 'utf8')
  writeFileSync(join(proj, 'daemon.ts'), cur + '// tampered\n')
  const d2 = await runDoctorDiagnostics({ cwd: proj })
  const dim2 = d2.dimensions.find(d => d.name === 'apply_manifest_drift')
  assert.equal(dim2.pass, false, '篡改后 pass=false（advisory WARNING）')
  assert.ok(dim2.findings.some(f => f.includes('落盘面漂移') && f.includes('daemon.ts')),
    '篡改后告警含「落盘面漂移×daemon.ts」（findings=' + JSON.stringify(dim2.findings) + '）')
})

test('②b 无 manifest → doctor 漂移维度 skipped 零告警', async () => {
  const proj = mk('ach-nomani-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'a.txt'), 'a\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  mkdirSync(join(proj, '.sillyspec', 'changes'), { recursive: true })

  const d = await runDoctorDiagnostics({ cwd: proj })
  const dim = d.dimensions.find(x => x.name === 'apply_manifest_drift')
  assert.ok(dim, 'doctor 含 apply_manifest_drift 维度')
  assert.equal(dim.skipped, true, '无 manifest → skipped=true')
  assert.ok(!dim.findings.some(f => f.includes('漂移')), '无 manifest 零漂移告警（findings=' + JSON.stringify(dim.findings) + '）')
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ③ guard 相交预检四态（空集 / 交集拦截 / --force / autoApply） ===\n')

function setupGuard({ guard = null } = {}) {
  const proj = mk('ach-guard-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'foo.js'), 'const v = 1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'base'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  const wtDir = mk('ach-guard-wt-'); rmSync(wtDir, { recursive: true, force: true })
  git(proj, ['worktree', 'add', '-q', wtDir, '-b', 'sillyspec/c1'])
  writeFileSync(join(wtDir, 'src', 'foo.js'), 'const v = 2  // 本变更交付\n')
  const metaDir = join(proj, '.sillyspec', '.runtime', 'worktrees', 'c1')
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: 'c1', baseHash, baselineCommit: baseHash, baselineHash: baseHash,
    mode: 'native-worktree', worktreePath: wtDir,
  }))
  if (guard) writeGuard(proj, 'other-session', guard)
  return { proj, wtDir }
}

test('③a 空集（无会话 / 会话无 allowedFiles 声明）→ 行为零变化', () => {
  // 无 quick-sessions 目录
  {
    const { proj } = setupGuard()
    const r = applyWorktree('c1', { cwd: proj })
    assert.equal(r.ok, true, '无活跃会话 → apply 成功')
    assert.equal(r.overlapForced, undefined, '无 overlapForced 留痕')
    assert.equal(r.overlapSkipped, undefined, '无 overlapSkipped 留痕')
  }
  // 有活跃会话但 guard 无 allowedFiles 声明
  {
    const { proj } = setupGuard({ guard: { quicklogId: 'ql-x' } })
    const specBase = join(proj, '.sillyspec')
    const guards = collectActiveQuickGuardFiles(specBase, { excludeChange: 'c1' })
    assert.ok(guards.has('other-session'), '会话在活跃集内')
    assert.deepEqual(guards.get('other-session'), [], '无声明 → 空数组')
    const r = applyWorktree('c1', { cwd: proj })
    assert.equal(r.ok, true, '会话无声明 → 交集空 → apply 成功（零变化）')
    assert.equal(r.overlapForced, undefined)
    assert.equal(r.overlapSkipped, undefined)
  }
})

test('③b 交集（无 --force 人工入口）→ fail-closed：errors 含会话×文件对，主仓零落盘', () => {
  const { proj } = setupGuard({ guard: { allowedFiles: ['src/foo.js'] } })
  const r = applyWorktree('c1', { cwd: proj })
  assert.equal(r.ok, false, '交集 → apply 被拦（fail-closed）')
  assert.ok((r.errors || []).some(e => e.includes('other-session') && e.includes('src/foo.js')),
    'errors 含会话×文件对清单（errors=' + JSON.stringify((r.errors || []).map(e => e.slice(0, 120))) + '）')
  assert.ok((r.errors || []).some(e => e.includes('--force')), 'errors 含 --force 显式解锁指引')
  assert.equal(r.overlapForced, undefined, '未 --force → 无 overlapForced')
  assert.equal(readFileSync(join(proj, 'src', 'foo.js'), 'utf8'), 'const v = 1\n', '主仓文件零落盘（拦截在一切写动作之前）')
})

test('③c 交集 + --force → 放行并留痕 result.overlapForced', () => {
  const { proj } = setupGuard({ guard: { allowedFiles: ['src/foo.js'] } })
  const r = applyWorktree('c1', { cwd: proj, force: true })
  assert.equal(r.ok, true, '--force 放行 apply')
  assert.ok(r.overlapForced, 'result.overlapForced 留痕')
  assert.ok(r.overlapForced.sessions.includes('other-session'), 'overlapForced.sessions 含冲突会话')
  assert.ok(r.overlapForced.files.includes('src/foo.js'), 'overlapForced.files 含冲突文件')
  assert.ok((r.warnings || []).some(w => w.includes('--force')), 'warnings 留 --force 越痕说明')
  assert.ok(readFileSync(join(proj, 'src', 'foo.js'), 'utf8').replace(/\r\n/g, '\n') === 'const v = 2  // 本变更交付\n', '落盘生效')
})

test('③d 交集 + autoApply（无人值守入口）→ 软跳过：overlapSkipped=true + 主仓零落盘', () => {
  const { proj } = setupGuard({ guard: { allowedFiles: ['src/foo.js'] } })
  const r = applyWorktree('c1', { cwd: proj, autoApply: true })
  assert.equal(r.ok, false, '软跳过保持 ok=false（未落盘不声称成功）')
  assert.equal(r.overlapSkipped, true, 'result.overlapSkipped=true')
  assert.ok((r.warnings || []).some(w => w.includes('软跳过')), 'warnings 含软跳过指引')
  assert.equal(readFileSync(join(proj, 'src', 'foo.js'), 'utf8'), 'const v = 1\n', 'autoApply 软跳过主仓零落盘')
})

// ─────────────────────────────────────────────────────────────
console.log('\n=== ④ rescue 指引行：commands 末尾含「落地后 git add 锁定」# 注释行 ===\n')

test('④ 有可落地文件 → 末尾 # 指引行含 git add；空 changedFiles 不加指引', () => {
  const r = generateRescueCommands({
    changedFiles: ['a.js', 'b.js'], dirtyFiles: ['b.js'],
    hashMismatchFiles: [], deletedFiles: [], worktreePath: '/wt', projectRoot: '/pr',
  })
  const guide = r.commands.find(c => c.startsWith('#'))
  assert.ok(guide, 'commands 含 # 注释指引行')
  assert.ok(guide.includes('git add'), '指引行含 git add 锁定语义（D-003）')
  // 整块复制粘贴仍是合法 shell：动作行在前、注释行在后
  const action = r.commands.filter(c => !c.startsWith('#'))
  assert.ok(action.length === 1 && action[0].startsWith('cp '), '动作行不受影响（1 条 cp）')

  const empty = generateRescueCommands({
    changedFiles: [], dirtyFiles: [], hashMismatchFiles: [], deletedFiles: [],
    worktreePath: '/wt', projectRoot: '/pr',
  })
  assert.ok(!empty.commands.some(c => c.startsWith('#')), '无可落地文件 → 不加指引行')
})
