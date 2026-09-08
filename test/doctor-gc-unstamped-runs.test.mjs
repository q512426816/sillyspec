/**
 * doctor --gc-unstamped-runs（ql-20260908-006-5f04）
 *
 * pruneArchivedChangeRuntime 故意不按 mtime 猜删无 change 戳的旧 execute-runs。
 * 本命令是一次性存量清扫旁路：仅对已归档变更、经 reviewedFiles 路径首段精确命中
 * 或 tasks.md task-NN 集合全等且唯一 交叉核验后才列/删。默认 dry-run，--confirm 才写。
 * 不进 archive 热路径。
 *
 * 覆盖：
 *   dry-run 零写入 / confirm 只删候选
 *   有戳 skip has_stamp
 *   命中活跃变更 skip matches_active
 *   login 不误伤 2026-08-01-login（首段精确相等）
 *   多归档路径 / 多归档 tasks.md 全等 → ambiguous_archive
 *   路径命中但 run 多出 tasks.md 没有的 task-NN → tasks_md_mismatch
 *   无路径时子集太弱（仅 task-01）不删；全等且唯一才 via tasks_md
 *   无归属 no_attribution
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const binPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')

function makeProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-gc-runs-'))
  mkdirSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs'), { recursive: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive'), { recursive: true })
  return cwd
}

function writeTasksMd(changeDir, ids) {
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), ids.map((id) => `- [x] ${id}: x\n`).join(''))
}

function writeRun(cwd, runId, { stamp, tasks } = {}) {
  const runDir = join(cwd, '.sillyspec', '.runtime', 'execute-runs', runId)
  mkdirSync(join(runDir, 'tasks'), { recursive: true })
  if (stamp !== undefined) writeFileSync(join(runDir, 'change'), stamp)
  for (const [tid, spec] of Object.entries(tasks || {})) {
    mkdirSync(join(runDir, 'tasks', tid), { recursive: true })
    writeFileSync(join(runDir, 'tasks', tid, 'review.json'), JSON.stringify({
      verdict: 'pass',
      reviewedFiles: spec.reviewedFiles || [],
    }, null, 2) + '\n')
  }
}

function runIds(cwd) {
  const dir = join(cwd, '.sillyspec', '.runtime', 'execute-runs')
  return new Set(readdirSync(dir))
}

async function gc(cwd, confirm = false) {
  const { gcUnstampedExecuteRuns } = await import('../src/doctor-diagnostics.js')
  return gcUnstampedExecuteRuns({ cwd, confirm })
}

function skipReason(r, runId) {
  return (r.skipped || []).find((s) => s.runId === runId)?.reason
}

test('dry-run：路径命中唯一归档变更列出，零写入', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01', 'task-02'])
    writeRun(cwd, 'exec-path-old', {
      tasks: {
        'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] },
        'task-02': { reviewedFiles: ['changes/2026-09-01-old/plan.md'] },
      },
    })
    const r = await gc(cwd, false)
    assert.equal(r.action, 'dry_run')
    assert.equal(r.count, 1)
    assert.equal(r.candidates[0].runId, 'exec-path-old')
    assert.equal(r.candidates[0].owner, '2026-09-01-old')
    assert.equal(r.candidates[0].via, 'path')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-path-old')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('confirm：路径命中的无戳 run 删除，他者保留', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01'])
    writeRun(cwd, 'exec-path-old', {
      tasks: { 'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] } },
    })
    writeRun(cwd, 'exec-stamped', {
      stamp: '2026-09-01-old\n',
      tasks: { 'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] } },
    })
    const r = await gc(cwd, true)
    assert.equal(r.action, 'deleted')
    assert.equal(r.count, 1)
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-path-old')), false)
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-stamped')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('有 change 戳 → skip has_stamp，即便归属已归档', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01'])
    writeRun(cwd, 'exec-stamped', {
      stamp: '2026-09-01-old',
      tasks: { 'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] } },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-stamped'), 'has_stamp')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-stamped')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('路径命中活跃变更 → skip matches_active，不删', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'live-now'), ['task-01'])
    writeRun(cwd, 'exec-live', {
      tasks: { 'task-01': { reviewedFiles: ['changes/live-now/design.md'] } },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-live'), 'matches_active')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-live')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('login 不误伤 2026-08-01-login：短名路径不能归属长名归档', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-08-01-login'), ['task-01', 'task-02'])
    writeRun(cwd, 'exec-short-login', {
      tasks: { 'task-01': { reviewedFiles: ['changes/login/design.md'] } },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0, '短名 login 不得归属 2026-08-01-login')
    assert.ok(['no_attribution', 'matches_active'].includes(skipReason(r, 'exec-short-login')))
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-short-login')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('路径命中两个归档变更 → skip ambiguous_archive', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', 'change-a'), ['task-01'])
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', 'change-b'), ['task-01'])
    writeRun(cwd, 'exec-two', {
      tasks: {
        'task-01': { reviewedFiles: ['changes/change-a/design.md'] },
        'task-02': { reviewedFiles: ['changes/change-b/plan.md'] },
      },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-two'), 'ambiguous_archive')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-two')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('路径命中归档但 run 多出 tasks.md 没有的 task → skip tasks_md_mismatch', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01'])
    writeRun(cwd, 'exec-extra', {
      tasks: {
        'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] },
        'task-99': { reviewedFiles: ['changes/2026-09-01-old/extra.md'] },
      },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-extra'), 'tasks_md_mismatch')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-extra')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('路径命中归档：run 的 task-NN 是 tasks.md 子集 → 可删', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01', 'task-02', 'task-03'])
    writeRun(cwd, 'exec-partial', {
      tasks: { 'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] } },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 1)
    assert.equal(r.candidates[0].via, 'path')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-partial')), false)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无路径：task-NN 与唯一归档 tasks.md 全等 → via tasks_md 可删', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01', 'task-02'])
    writeRun(cwd, 'exec-eq', {
      tasks: {
        'task-01': { reviewedFiles: ['src/foo.js'] },
        'task-02': { reviewedFiles: ['src/bar.js'] },
      },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 1)
    assert.equal(r.candidates[0].owner, '2026-09-01-old')
    assert.equal(r.candidates[0].via, 'tasks_md')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-eq')), false)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无路径：仅 task-01 子集不删（几乎每个变更都有 task-01）', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', 'change-a'), ['task-01', 'task-02'])
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', 'change-b'), ['task-01', 'task-03'])
    writeRun(cwd, 'exec-subset', {
      tasks: { 'task-01': { reviewedFiles: ['src/foo.js'] } },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-subset'), 'no_attribution')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-subset')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无路径：两个归档 tasks.md 全等同一套 task → skip ambiguous_archive', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', 'change-a'), ['task-01', 'task-02'])
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', 'change-b'), ['task-01', 'task-02'])
    writeRun(cwd, 'exec-dup', {
      tasks: {
        'task-01': { reviewedFiles: ['src/a.js'] },
        'task-02': { reviewedFiles: ['src/b.js'] },
      },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-dup'), 'ambiguous_archive')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无路径：tasks.md 全等命中活跃变更 → skip matches_active', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'live-now'), ['task-01', 'task-02'])
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01', 'task-02'])
    writeRun(cwd, 'exec-live-eq', {
      tasks: {
        'task-01': { reviewedFiles: ['src/a.js'] },
        'task-02': { reviewedFiles: ['src/b.js'] },
      },
    })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-live-eq'), 'matches_active')
    assert.equal(existsSync(join(cwd, '.sillyspec', '.runtime', 'execute-runs', 'exec-live-eq')), true)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无路径无 task 目录 → skip no_attribution', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01'])
    writeRun(cwd, 'exec-empty', { tasks: {} })
    const r = await gc(cwd, true)
    assert.equal(r.count, 0)
    assert.equal(skipReason(r, 'exec-empty'), 'no_attribution')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('execute-runs 缺失：skipped，不抛', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-gc-norun-'))
  try {
    mkdirSync(join(cwd, '.sillyspec', 'changes'), { recursive: true })
    const r = await gc(cwd, false)
    assert.equal(r.action, 'skipped')
    assert.equal(r.count, 0)
    assert.ok(r.reason)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('CLI：sillyspec doctor --gc-unstamped-runs --json 默认 dry-run', async () => {
  const cwd = makeProject()
  try {
    writeTasksMd(join(cwd, '.sillyspec', 'changes', 'archive', '2026-09-01-old'), ['task-01'])
    writeRun(cwd, 'exec-cli', {
      tasks: { 'task-01': { reviewedFiles: ['changes/2026-09-01-old/design.md'] } },
    })
    const out = execFileSync(process.execPath, [binPath, 'doctor', '--gc-unstamped-runs', '--json'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const r = JSON.parse(out)
    assert.equal(r.action, 'dry_run')
    assert.equal(r.count, 1)
    assert.equal(r.candidates[0].runId, 'exec-cli')
    assert.deepEqual([...runIds(cwd)], ['exec-cli'])
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
