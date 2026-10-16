/**
 * 坑 thin-upgrade-stale-stage-window 回归：升厚链重置 DB 行 current_stage
 *
 * 实证（2026-10-13）：升厚只写 flow-state 不碰 DB 行——行值残留 'thin'（平台 pull 往返
 * 透传）时 serializeForSync 的 thin 投影在首次 run <stage> 前持续误标平台「轻量」出身。
 *
 * 锁定（resetThinStageRowOnUpgrade 单元 + gate FAIL 升厚路径接线 e2e）：
 *   ① 行值 'thin' → 重置 'brainstorm'；其他行值不动；
 *   ② verify 实测失败自动升厚时行值同步重置（e2e）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProgressManager } from '../src/progress.js'

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.js')
const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'upthk-')); tmpRoots.push(d); return d }
function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function readStage(cwd, name) {
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  const row = pm._ensureDB(cwd).getDb().prepare('SELECT current_stage FROM changes WHERE name = ?').get(name)
  return row ? row.current_stage : undefined
}

test('① gate FAIL 自动升厚：行值 thin → brainstorm（e2e）', async () => {
  const cwd = fx()
  const run = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n  lint: "node lint-fail.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'lint-fail.js'), "console.error('src/work.js:1:1 E501 fake'); process.exit(1)\n")
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-13-upthk-x'
  assert.equal(cli(cwd, ['flow', 'start', '--change', cn, '--input', 'x\n\n成功标准：\n- y', '--no-review']).status, 0)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  // 填槽（v2 纯 markdown 骨架，零 AGENT 槽）——同 flowdone-lint-fail-output 夹具形态填法
  {
    const dp = join(base, 'design.md')
    writeFileSync(dp, readFileSyncWrap(dp, 'utf8')
      .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, (mm) => mm + '\n不适用：升厚夹具'))
    const rp = join(base, 'requirements.md')
    writeFileSync(rp, readFileSyncWrap(rp, 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 在升厚时重置行值（夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (mm) => mm.split(':')[0] + ': 不适用：升厚夹具'))
  }
  // 模拟平台 pull 往返写入 'thin'（坑现场形态：import() 对 current_stage 零校验透传）
  {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'))
    db.prepare('UPDATE changes SET current_stage = ? WHERE name = ?').run('thin', cn)
    db.close()
  }
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const x = 1\n')
  run(['add', 'src/work.js']); run(['commit', '-q', '-m', 'work task-01'])
  assert.equal(cli(cwd, ['flow', 'approve', '--change', cn]).status, 0, 'approve')
  const r = cli(cwd, ['flow', 'done', '--change', cn])
  assert.notEqual(r.status, 0, 'lint 门红 FAIL')
  const out = r.stdout + r.stderr
  assert.ok(out.includes('已自动升厚档'), '升厚发生')
  assert.ok(out.includes('thin → brainstorm'), `行值重置日志在场：${out.split('\n').filter((l) => l.includes('brainstorm')).join(' | ')}`)
  assert.equal(readStage(cwd, cn), 'brainstorm', 'DB 行值已重置')
})

test('② resume 路径行值非 thin 不越权改动（单元态）', () => {
  const cwd = fx()
  const run2 = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString().trim()
  run2(['init', '-q']); run2(['config', 'user.email', 't@t']); run2(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run2(['add', '.']); run2(['commit', '-q', '-m', 'base'])
  const cn = '2026-10-13-upthk-y'
  assert.equal(cli(cwd, ['flow', 'start', '--change', cn, '--input', 'x\n\n成功标准：\n- y', '--no-review']).status, 0)
  // 正常 start 后行值是 brainstorm（initChange 出生值），升厚 helper 对它应为 no-op
  const before = readStage(cwd, cn)
  assert.equal(before, 'brainstorm')
  // 模拟 pull 往返写入 'thin'
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm._ensureDB(cwd).getDb().prepare('UPDATE changes SET current_stage = ? WHERE name = ?').run('thin', cn)
  assert.equal(readStage(cwd, cn), 'thin')
  // 再次 resume start（title 补写路径触发 ensureDB）不误改；真正升厚在 done 链——此处验证非升厚路径不碰行值
  assert.equal(cli(cwd, ['flow', 'start', '--change', cn]).status, 0)
  assert.equal(readStage(cwd, cn), 'thin', 'resume 不重置（重置只在升厚写点）')
})

import { readFileSync as readFileSyncWrap } from 'node:fs'
