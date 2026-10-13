/**
 * 坑 deps-gate-offline-fragile ②：worktree deps --set 显式覆写通道
 *
 * 实证（2026-10-12 会话 47e2ff1a）：离线环境 npm ci 必败 + 主仓 lockfile 本地改动致
 * 链接快路径失效 → agent 被迫手改 meta.json 的 depsStatus——未定义行为且零留痕。
 * CLI 化：--set 显式值 + --reason 强制留痕（depsOverrideNote/At 审计锚）。
 *
 * 锁定：①合法值覆写成功并双留痕；②缺 reason 用法错 exit 2；③非法值 exit 2；
 *      ④meta 不存在（变更名错）exit 1 且指引 --spec-dir 跨仓路径。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.js')
const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'depset-')); tmpRoots.push(d); return d }
function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function seedWorktree(specBase, name) {
  const wtDir = join(specBase, '.runtime', 'worktrees', name)
  mkdirSync(wtDir, { recursive: true })
  const meta = { changeName: name, mode: 'worktree', worktreePath: wtDir, depsStatus: 'failed', depsError: 'npm ci ETIMEDOUT' }
  writeFileSync(join(wtDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
  return { wtDir, metaPath: join(wtDir, 'meta.json') }
}

test('① 合法覆写：状态翻转 + 双留痕（note 含前值与理由）', () => {
  const cwd = fx()
  const specBase = join(cwd, '.sillyspec')
  const { metaPath } = seedWorktree(specBase, '2026-10-12-dep-x')
  const r = cli(cwd, ['worktree', 'deps', '--change', '2026-10-12-dep-x', '--set', 'linked', '--reason', '离线环境，主仓 node_modules 已手工 junction 并实测可用'])
  assert.equal(r.status, 0, `应成功: ${r.stdout}\n${r.stderr}`)
  const m = JSON.parse(readFileSync(metaPath, 'utf8'))
  assert.equal(m.depsStatus, 'linked')
  assert.ok(m.depsOverrideNote && m.depsOverrideNote.includes('前值 failed') && m.depsOverrideNote.includes('离线环境'), `留痕内容: ${m.depsOverrideNote}`)
  assert.ok(m.depsOverrideAt, '时间戳留痕')
})

test('②③ 用法门：缺 reason / 非法 set 值 → exit 2', () => {
  const cwd = fx()
  const specBase = join(cwd, '.sillyspec')
  seedWorktree(specBase, '2026-10-12-dep-y')
  const r2 = cli(cwd, ['worktree', 'deps', '--change', '2026-10-12-dep-y', '--set', 'linked'])
  assert.equal(r2.status, 2, '缺 reason 拒')
  assert.ok((r2.stderr + r2.stdout).includes('--reason'), '用法行含 reason 必填')
  const r3 = cli(cwd, ['worktree', 'deps', '--change', '2026-10-12-dep-y', '--set', 'magic', '--reason', 'x'])
  assert.equal(r3.status, 2, '非法值拒')
  assert.ok((r3.stderr + r3.stdout).includes('非法'), '非法值文案')
})

test('④ meta 缺失：exit 1 + 跨仓 --spec-dir 指引', () => {
  const cwd = fx()
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  const r = cli(cwd, ['worktree', 'deps', '--change', 'no-such-wt', '--set', 'linked', '--reason', 'x'])
  assert.equal(r.status, 1)
  assert.ok((r.stderr + r.stdout).includes('--spec-dir'), '跨仓指引在场')
})
