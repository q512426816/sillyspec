// quick --cancel 轮转归档可达性 + 空壳会话直清（docs/sillyspec/quick-cancel-blind-after-quicklog-rotation）
//
// 坑（2026-09-16 实证）：①轮转发生后 --cancel 只扫活跃主文件，归档条目永久不可达
// （「提示清理 → 清理必失败」死循环）；②空壳会话（零步骤完成、无任何条目）被要求
// 「显式传 --ql」——逻辑上不可执行。
//
// 修复：①cancelQuickSession 恒扫全部 QUICKLOG 文件（主文件优先）；②command.js 空壳
// 直清（进度注销+目录清理即成功）+ --force 逃生门。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { cancelQuickSession } from '../src/quicklog.js'

const cliBin = join(fileURLToPath(import.meta.url).replace(/[\\/]test[\\/].*$/, ''), 'src', 'index.js')
const tmpRoots = []
function makeFixture() {
  const cwd = mkdtempSync(join(tmpdir(), `qcancel-${process.pid}-`))
  // 显式建 .sillyspec：祖先级解析（resolveSpecDir 向上走）在 Temp 树存在残留 .sillyspec 时
  // 会劫持夹具的 spec 落点（2026-09-16 实证：并行测试在 Temp 根泄漏的接管声明/目录殃及
  // 全部 Temp 下夹具）——夹具自有 .sillyspec 让 walk-up 立即命中自己。
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  tmpRoots.push(cwd)
  return cwd
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], {
  encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim()

function runCli(cwd, args) {
  const res = spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf-8', timeout: 60_000 })
  return { status: res.status, out: (res.stdout || '') + (res.stderr || '') }
}

test('① 条目在轮转归档文件 → --cancel 可达（修复前只扫主文件必失败）', async () => {
  const cwd = makeFixture()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.name', 'tester']); git(cwd, ['config', 'user.email', 't@t'])
  const specBase = join(cwd, '.sillyspec')
  const qlDir = join(specBase, 'quicklog')
  mkdirSync(qlDir, { recursive: true })
  // 主文件存在（含别的进行中条目）+ 轮转归档含目标条目
  writeFileSync(join(qlDir, 'QUICKLOG-tester.md'),
    '## ql-20260916-099-aaaa | 2026-09-16 12:00:00 | 当前条目\n状态：进行中\n', 'utf8')
  writeFileSync(join(qlDir, 'QUICKLOG-tester-2026-09-15.md'),
    '## ql-20260915-001-5852 | 2026-09-15 10:00:00 | 轮转前的条目\n状态：进行中\n关联变更：（无）\n', 'utf8')

  const r = await cancelQuickSession({ specBase, gitUser: 'tester', qlId: 'ql-20260915-001-5852', sessionId: 'quick-11111111' })
  assert.equal(r.ok, true, `归档条目取消成功（实际 ${JSON.stringify(r)}）`)
  const archived = readFileSync(join(qlDir, 'QUICKLOG-tester-2026-09-15.md'), 'utf8')
  assert.ok(archived.includes('状态：已取消'), '归档文件内条目已翻「已取消」')
  const mainBody = readFileSync(join(qlDir, 'QUICKLOG-tester.md'), 'utf8')
  assert.ok(mainBody.includes('状态：进行中'), '主文件其他条目不受影响')
})

test('② 空壳会话（零步骤完成、guard 缺失）→ CLI 直清成功（修复前要求不可执行的 --ql）', () => {
  const cwd = makeFixture()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.name', 'tester']); git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['commit', '-q', '--allow-empty', '-m', 'init'])
  // 启动即建立进度行（零完成）但 guard/条目全无（启动被拒形态）
  const r0 = runCli(cwd, ['run', 'quick', '--non-interactive', '--input', '空壳测试'])
  const sid = (r0.out.match(/quick-[0-9a-f]{8}/) || [])[0]
  assert.ok(sid, `会话已建立（${r0.out.slice(0, 120)}）`)
  // 模拟空壳：删 guard 目录（启动被拒时本就不写）——进度行零完成
  rmSync(join(cwd, '.sillyspec', '.runtime', 'quick-sessions', sid), { recursive: true, force: true })

  const r = runCli(cwd, ['run', 'quick', '--cancel', '--change', sid])
  assert.equal(r.status, 0, `空壳直清 exit 0（实际 ${r.status}；输出 ${r.out.slice(-200)}）`)
  assert.match(r.out, /空壳/, '输出明示空壳语义')
})

test('③ 非空壳且 guard 缺失 → 仍报错但含 --force 逃生门指引', () => {
  const cwd = makeFixture()
  git(cwd, ['init', '-q']); git(cwd, ['config', 'user.name', 'tester']); git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['commit', '-q', '--allow-empty', '-m', 'init'])
  const r0 = runCli(cwd, ['run', 'quick', '--non-interactive', '--input', '有进度会话'])
  const sid = (r0.out.match(/quick-[0-9a-f]{8}/) || [])[0]
  assert.ok(sid, '会话已建立')
  runCli(cwd, ['run', 'quick', '--done', '--change', sid, '--output', 'step1 done']) // 有完成步骤
  rmSync(join(cwd, '.sillyspec', '.runtime', 'quick-sessions', sid), { recursive: true, force: true })

  const r = runCli(cwd, ['run', 'quick', '--cancel', '--change', sid])
  assert.equal(r.status, 1, `非空壳拒绝 exit 1（实际 ${r.status}）`)
  assert.match(r.out, /--force/, '报错含 --force 逃生门指引')
})
