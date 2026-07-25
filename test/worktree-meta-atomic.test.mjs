/**
 * worktree meta.json 原子写 regression tests (W0-E)
 *
 * 背景：meta.json 历史上用裸 writeFileSync，被 hook 进程与其它 CLI 进程并发读取。
 * 写入中途崩溃（EPERM/OOM/断电）会留下半截 JSON → getMeta 返回 null → create 误判
 * 「幽灵 worktree」→ 在 git status 看不到 gitignored 改动时 rmSync 强删整个 worktree
 * （含 .env / 构建产物等 gitignored 改动，不可恢复）。
 *
 * W0 修复：所有 meta 写入收敛到 writeAtomicSync（同目录 tmp→rename 带 Windows EPERM 退避），
 * 保证读者要么看到旧完整内容、要么看到新完整内容，永远不会读到半截。
 *
 * 本测试锁定：
 *  1. meta 原子写入后 getMeta 往返正确 + 无 .tmp 残留（走 tmp→rename 且 tmp 被清理）
 *  2. 半截 JSON → getMeta 返回 null（确认这是「坏 meta」判定，文档化原子写的必要性——
 *     正是这种半截态会触发 create 幽灵强删，原子写让其永不产生）
 *  3. meta 覆盖更新后读到新值 + 无 .tmp 残留（rename 覆盖已存在目标，覆盖 _doctorReprovision/deps 更新路径）
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

function makeRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-meta-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

function listTmpFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(n => n.endsWith('.tmp'))
}

async function test1_atomicWriteRoundtrip() {
  const d = makeRepo()
  try {
    const { WorktreeManager } = await import('../src/worktree.js')
    const wm = new WorktreeManager({ cwd: d })
    wm._createInPlaceMeta('test-change', {
      worktreePath: d,
      branch: 'sillyspec/test-change',
      mode: 'in-place-fallback',
    })
    const meta = wm.getMeta('test-change')
    if (!meta) throw new Error('meta 应可读（原子写往返）')
    if (meta.changeName !== 'test-change') throw new Error('meta.changeName 不匹配')
    if (meta.mode !== 'in-place-fallback') throw new Error('meta.mode 不匹配')

    const metaDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'test-change')
    const tmps = listTmpFiles(metaDir)
    if (tmps.length > 0) throw new Error(`meta 目录残留 .tmp 文件: ${tmps.join(', ')}`)
    console.log('✅ Test 1: meta 原子写入往返正确 + 无 .tmp 残留')
  } finally {
    fs.rmSync(d, { recursive: true, force: true })
  }
}

async function test2_truncatedMetaReturnsNull() {
  const d = makeRepo()
  try {
    const { WorktreeManager } = await import('../src/worktree.js')
    const wm = new WorktreeManager({ cwd: d })
    wm._createInPlaceMeta('test-change', {
      worktreePath: d,
      branch: 'sillyspec/test-change',
      mode: 'in-place-fallback',
    })
    // 模拟旧版本裸 writeFileSync 崩溃留下的半截 JSON（原子写下永不产生——这正是它要防止的态）
    const metaPath = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'test-change', 'meta.json')
    fs.writeFileSync(metaPath, '{ "changeName": "test-change", "branch": "sillysp')
    const meta = wm.getMeta('test-change')
    if (meta !== null) throw new Error(`半截 JSON 应让 getMeta 返回 null（实际 ${JSON.stringify(meta)}）`)
    console.log('✅ Test 2: 半截 JSON → getMeta null（幽灵判定触发点；原子写让其永不产生）')
  } finally {
    fs.rmSync(d, { recursive: true, force: true })
  }
}

async function test3_metaOverwriteUpdate() {
  const d = makeRepo()
  try {
    const { WorktreeManager } = await import('../src/worktree.js')
    const wm = new WorktreeManager({ cwd: d })
    wm._createInPlaceMeta('test-change', {
      worktreePath: d, branch: 'sillyspec/test-change', mode: 'in-place-fallback',
    })
    const metaDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'test-change')
    const metaPath = path.join(metaDir, 'meta.json')
    // 模拟 _doctorReprovision / deps 写回（run.js deps 自检 / worktree.js:820）：覆盖已存在的 meta.json
    const { writeAtomicSync } = await import('../src/fs-atomic.js')
    writeAtomicSync(metaPath, JSON.stringify({ changeName: 'test-change', depsStatus: 'linked', updated: true }, null, 2) + '\n')
    const meta = wm.getMeta('test-change')
    if (!meta || meta.depsStatus !== 'linked' || meta.updated !== true) {
      throw new Error(`覆盖更新后应读到新值（实际 ${JSON.stringify(meta)}）`)
    }
    const tmps = listTmpFiles(metaDir)
    if (tmps.length > 0) throw new Error(`覆盖写后残留 .tmp: ${tmps.join(', ')}`)
    console.log('✅ Test 3: meta 覆盖更新读到新值 + 无 .tmp 残留（覆盖 _doctorReprovision/deps 更新路径）')
  } finally {
    fs.rmSync(d, { recursive: true, force: true })
  }
}

const tests = [
  ['atomic write roundtrip', test1_atomicWriteRoundtrip],
  ['truncated meta returns null', test2_truncatedMetaReturnsNull],
  ['meta overwrite update', test3_metaOverwriteUpdate],
]

let passed = 0, failed = 0
for (const [name, fn] of tests) {
  try { await fn(); passed++ }
  catch (e) { console.log(`❌ ${name}: ${e.message}`); failed++ }
}
console.log(`\n${passed}/${tests.length} passed`)
if (failed) process.exit(1)
