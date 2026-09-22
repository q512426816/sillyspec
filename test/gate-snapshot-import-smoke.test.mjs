// 快照 overlay import 闭合冒烟（坑 verify-sandbox-overlay-partial-state-importerror，2026-09-13 实证）
//
// in-place 变更的 overlay 文件集含主仓未提交并行 WIP——「改了引用方没改被引用方」部分态进
// 快照 → 模块子集测试批量 ImportError 假红。修复：overlay 后对 .py 文件 `python -c import`
// 冒烟（快照内 venv 解释器），ImportError/SyntaxError 判坏 → 回退 HEAD 版 + warn；新增文件
// 无 HEAD 版 → 醒目 warn 保留。fail-open：无解释器只 warn。
//
// fixture：真实 git 仓 + 真实 python venv（python -m venv）——冒烟链路真跑，不 mock。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'node:child_process'
import { createGateSnapshot } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), `smoke-${process.pid}-`))
  tmpRoots.push(dir)
  return dir
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], {
  encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim()

// 系统有 python 才能真跑 venv；没有则本测试跳过（CI 无 python 环境）
const PY = process.platform === 'win32' ? 'python' : 'python3'
let pyOk = true
try { execFileSync(PY, ['--version'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }) } catch { pyOk = false }

test('① 部分态 overlay 文件 import 失败 → 回退 HEAD 健版', { skip: !pyOk }, (t) => {
  const cwd = makeRepo()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  // 真实 venv（envRelDirs 发现 .venv → 快照 junction → 冒烟解释器）
  execFileSync(PY, ['-m', 'venv', join(cwd, '.venv')], { stdio: 'ignore' })
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n.venv/\n')
  // HEAD 健版：mod_a 定义 + mod_b 引用（闭合）
  mkdirSync(join(cwd, 'backend'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'mod_a.py'), 'def get_thing():\n    return 1\n', 'utf8')
  writeFileSync(join(cwd, 'backend', 'mod_b.py'), 'from mod_a import get_thing\n', 'utf8')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  // 并行会话半成品：mod_a 被改成删掉 get_thing（引用方 mod_b 未跟改 → import 断裂）
  writeFileSync(join(cwd, 'backend', 'mod_a.py'), 'def something_else():\n    return 2\n', 'utf8')

  const snap = createGateSnapshot({ cwd, files: ['backend/mod_a.py', 'backend/mod_b.py'] })
  assert.ok(snap, '快照应创建成功')
  try {
    const after = readFileSync(join(snap.snapshotRoot, 'backend', 'mod_a.py'), 'utf8')
    assert.match(after, /get_thing/, `坏半成品回退 HEAD 健版（实际：${after.slice(0, 60)}）`)
    // 回退后快照内 import 闭合验证（真跑）
    const venvPy = process.platform === 'win32'
      ? join(snap.snapshotRoot, '.venv', 'Scripts', 'python.exe')
      : join(snap.snapshotRoot, '.venv', 'bin', 'python')
    const r = execFileSync(venvPy, ['-c', 'import mod_b'], {
      cwd: join(snap.snapshotRoot, 'backend'), encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    })
    assert.ok(r !== undefined, '快照内 import mod_b 闭合（真跑通过）')
  } finally {
    snap.cleanup()
  }
})

test('② 健康 overlay 不回退（HEAD 无但自闭合的新文件组合照常保留）', { skip: !pyOk }, (t) => {
  const cwd = makeRepo()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  execFileSync(PY, ['-m', 'venv', join(cwd, '.venv')], { stdio: 'ignore' })
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n.venv/\n')
  mkdirSync(join(cwd, 'backend'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'keep.py'), 'X = 1\n', 'utf8')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  // 新增自闭合文件（HEAD 无）：冒烟应通过、保留 overlay 版
  writeFileSync(join(cwd, 'backend', 'fresh.py'), 'Y = 2\n', 'utf8')

  const snap = createGateSnapshot({ cwd, files: ['backend/keep.py', 'backend/fresh.py'] })
  assert.ok(snap, '快照应创建成功')
  try {
    assert.equal(readFileSync(join(snap.snapshotRoot, 'backend', 'fresh.py'), 'utf8'), 'Y = 2\n', '健康新文件保留 overlay 版')
    assert.equal(readFileSync(join(snap.snapshotRoot, 'backend', 'keep.py'), 'utf8'), 'X = 1\n', '健康已有文件保留')
  } finally { snap.cleanup() }
})

test('③ 无 venv（无解释器）→ fail-open 只 warn 快照照常建', (t) => {
  const cwd = makeRepo()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(cwd, 'backend'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'x.py'), 'X = 1\n', 'utf8')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  writeFileSync(join(cwd, 'backend', 'x.py'), 'broken((\n', 'utf8')

  const snap = createGateSnapshot({ cwd, files: ['backend/x.py'] })
  assert.ok(snap, '无解释器 fail-open：快照照常创建（冒烟跳过 warn）')
  snap.cleanup()
})

test('④ 缺陷一回归：backend 子目录包布局的健康 overlay 不因浅根假阳性被回退', { skip: !pyOk }, (t) => {
  // 坑 verify-gate-worktree-crossrepo-three-defects 缺陷一：backend/app/modules/... 布局的
  // 健康 overlay 文件，旧实现在浅根（快照根）报 No module named 'backend' 即判坏回退 HEAD →
  // 快照丢新增符号连环假红。修复后全根尝试——backend/ 根下 import app.modules.x 成功。
  const cwd = makeRepo()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.email', 't@t.local'])
  git(cwd, ['config', 'user.name', 't']); git(cwd, ['config', 'commit.gpgsign', 'false'])
  execFileSync(PY, ['-m', 'venv', join(cwd, '.venv')], { stdio: 'ignore' })
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n.venv/\n')
  // HEAD 版：service 无 stats()；本变更 overlay 加上 stats（健康自洽）
  const pkg = join(cwd, 'backend', 'app', 'modules', 'scan_docs')
  mkdirSync(pkg, { recursive: true })
  writeFileSync(join(cwd, 'backend', 'app', '__init__.py'), '', 'utf8')
  writeFileSync(join(cwd, 'backend', 'app', 'modules', '__init__.py'), '', 'utf8')
  writeFileSync(join(pkg, '__init__.py'), '', 'utf8')
  writeFileSync(join(pkg, 'service.py'), 'def list_all():\n    return []\n', 'utf8')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  // 本变更交付版（overlay）：新增 stats()——健康，不应被回退
  writeFileSync(join(pkg, 'service.py'), 'def list_all():\n    return []\n\ndef stats():\n    return {}\n', 'utf8')

  const snap = createGateSnapshot({ cwd, files: ['backend/app/modules/scan_docs/service.py'] })
  assert.ok(snap, '快照应创建成功')
  try {
    const after = readFileSync(join(snap.snapshotRoot, 'backend', 'app', 'modules', 'scan_docs', 'service.py'), 'utf8')
    assert.ok(after.includes('def stats'), `健康 overlay 保留（实际：${after.slice(0, 80)}）——浅根 No module named 'backend' 是 cwd 假阳性`)
  } finally { snap.cleanup() }
})
