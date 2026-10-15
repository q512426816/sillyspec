/**
 * 2026-10-15-pitfall-batch-clearance FR-05 — 对账 actual 面剔除纯行尾差异（EOL-only）
 *
 * 坑 verify-close-gate-staggered-exposure 建议④（消费仓实证）：gen:types 幂等重生成产生零内容
 * diff（纯行尾标记）进 actual 面 → target_files ③类 undeclared 假红，要求为零内容改动补声明。
 * 锁死契约：tracked 文件仅行尾差异（--ignore-cr-at-eol 对照零内容变更）→ 剔出对账面并
 * eolOnlyFiles 软留痕；真实内容变更/未跟踪新文件不受影响。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { resolveReconcileActualFiles } from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args, input) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', input })

function baseRepo(prefix, changeName) {
  const cwd = mk('eol-')
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(cwd, 'real.js'), 'const a = 1\n')
  writeFileSync(join(cwd, 'eol.js'), 'const b = 2\n')
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  git(cwd, ['add', '.'])
  git(cwd, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'])
  const specBase = join(cwd, '.sillyspec')
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  return { cwd, specBase, runtimeRoot: join(specBase, '.runtime'), changeName }
}

test('FR-05：工作树纯行尾重写剔出 actual 面（eolOnlyFiles 留痕），真实变更/未跟踪不受影响', () => {
  const f = baseRepo('eol-wt-', 'eol-x')
  // 真实内容变更 + 纯行尾重写（CRLF）+ 未跟踪新文件
  writeFileSync(join(f.cwd, 'real.js'), 'const a = 2\n')
  writeFileSync(join(f.cwd, 'eol.js'), 'const b = 2\r\n')
  writeFileSync(join(f.cwd, 'brand-new.js'), 'const n = 0\n')

  const r = resolveReconcileActualFiles({ cwd: f.cwd, specBase: f.specBase, runtimeRoot: f.runtimeRoot, changeName: f.changeName })
  assert.equal(r.ok, true, `actual 解析 ok（got ${JSON.stringify(r)}）`)
  assert.ok(r.files.includes('real.js'), '真实内容变更在 actual 面')
  assert.ok(r.files.includes('brand-new.js'), '未跟踪新文件不受 EOL 过滤影响（豁免面）')
  assert.ok(!r.files.includes('eol.js'), '纯行尾重写文件被剔出 actual 面')
  assert.deepEqual(r.eolOnlyFiles, ['eol.js'], 'eolOnlyFiles 软留痕')
})

test('FR-05：worktree 分支已提交的纯行尾重写剔出（form A 已提交段配对探测）', () => {
  const f = baseRepo('eol-wta-', 'eol-w')
  const branch = `sillyspec/${f.changeName}`
  const initHash = git(f.cwd, ['rev-parse', 'HEAD']).trim()
  const wtPath = join(f.cwd, 'wt')
  // -b：worktree add 直接在新目录建分支并检出（主仓停留 main，避免同分支双检出拒绝）
  git(f.cwd, ['worktree', 'add', '-q', '-b', branch, wtPath])
  // worktree 内已提交：纯行尾重写 + 真实内容变更
  writeFileSync(join(wtPath, 'eol.js'), 'const b = 2\r\n')
  writeFileSync(join(wtPath, 'real.js'), 'const a = 5\n')
  git(wtPath, ['add', '.'])
  git(wtPath, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'c1'])
  // form A：worktree meta 在场（resolveReconcileActualFiles/resolveVerifyChangedFiles 同源判定）
  mkdirSync(join(f.specBase, '.runtime', 'worktrees', f.changeName), { recursive: true })
  writeFileSync(join(f.specBase, '.runtime', 'worktrees', f.changeName, 'meta.json'),
    JSON.stringify({ worktreePath: wtPath, branch, baselineCommit: initHash, mode: 'worktree' }))
  const r = resolveReconcileActualFiles({ cwd: f.cwd, specBase: f.specBase, runtimeRoot: f.runtimeRoot, changeName: f.changeName })
  assert.equal(r.ok, true, `actual 解析 ok（got ${JSON.stringify({ f: r.files, eol: r.eolOnlyFiles })}）`)
  assert.ok(r.files.includes('real.js'), '真实内容变更保留')
  assert.ok(!r.files.includes('eol.js'), '已提交的纯行尾重写剔出 actual 面')
  assert.ok((r.eolOnlyFiles || []).includes('eol.js'), 'eolOnlyFiles 留痕')
})
