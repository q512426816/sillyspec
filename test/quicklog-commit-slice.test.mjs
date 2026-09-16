// quicklog commit —— 本会话 QUICKLOG 条目切片提交（known-issues ④ v1）
//
// 坑（2026-09-16 立项，见 .sillyspec/knowledge/known-issues.md「QUICKLOG 多会话条目交织」）：
// QUICKLOG 是多会话共享追加的单文件，某会话 `git add` 整文件会夹带并行会话未完成条目
// （违反显式 pathspec 隔离纪律），只能「备份 → 剥离并行条目 → commit pathspec → 恢复」
// 四步舞。本命令把四步舞机制化：切片（HEAD 基线 + 本会话条目块）→ 显式 pathspec 提交
// （含 patches sidecar 与额外 pathspec）→ finally 恢复工作区全量（并行条目不丢）。
//
// 覆盖：①主文件切片 ②轮转双文件（含 HEAD 无文件的新主文件）③已提交条目幂等跳过
// ④CRLF 兼容 ⑤ql-ID 缺失 fail-fast ⑥dispatch 参数面（未知子命令 / --ql 指引）
// ⑦dispatch 端到端（guard.json quicklogId 解析）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'fs'
import { join, relative } from 'path'
import { tmpdir } from 'os'
import { execFileSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { runQuicklogCommit } from '../src/quicklog.js'

const cliBin = join(fileURLToPath(import.meta.url).replace(/[\\/]test[\\/].*$/, ''), 'src', 'index.js')
const tmpRoots = []
function makeFixture() {
  const cwd = mkdtempSync(join(tmpdir(), `qlcommit-${process.pid}-`))
  // 显式建 .sillyspec（walk-up 解析防 Temp 树残留 .sillyspec 劫持，见 quick-cancel-rotation 先例）
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

function initRepo(cwd) {
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.name', 'tester'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'core.autocrlf', 'false'])
  // .runtime 运行时产物不入库（对齐主仓口径，backup 落此处不污染 status 断言）
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/.runtime/\n', 'utf8')
  git(cwd, ['add', '--', '.gitignore'])
  git(cwd, ['commit', '-q', '-m', 'init'])
}

const entry = (id, title, status) => `## ${id} | 2026-09-16 12:00:00 | ${title}\n状态：${status}\n关联变更：（无）\n文件：（见实际改动）\n\n`

test('① 主文件切片：基线+我的两条（含已取消）进提交，并行条目留工作区，patches sidecar 进暂存面', async () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const specBase = join(cwd, '.sillyspec')
  const qlDir = join(specBase, 'quicklog')
  mkdirSync(qlDir, { recursive: true })
  const main = join(qlDir, 'QUICKLOG-tester.md')
  // HEAD 基线：一条已提交的旧条目
  const baseline = entry('ql-20260916-001-aaaa', '昨天的旧条目', '已完成')
  writeFileSync(main, baseline, 'utf8')
  git(cwd, ['add', '--', '.sillyspec/quicklog/QUICKLOG-tester.md'])
  git(cwd, ['commit', '-q', '-m', 'baseline'])
  // 工作区追加：我的已完成 + 我的已取消 + 并行会话进行中
  writeFileSync(main, baseline
    + entry('ql-20260916-002-bbbb', '我的已完成条目', '已完成')
    + entry('ql-20260916-003-cccc', '我的已取消条目', '已取消')
    + entry('ql-20260916-004-dddd', '并行会话的条目', '进行中'), 'utf8')
  // patches sidecar（--done 冻结件）
  mkdirSync(join(qlDir, 'patches'), { recursive: true })
  writeFileSync(join(qlDir, 'patches', 'ql-20260916-002-bbbb.json'), '{"sessionId":"quick-11111111"}\n', 'utf8')
  writeFileSync(join(qlDir, 'patches', 'ql-20260916-002-bbbb.patch', ), 'diff --git a/x b/x\n', 'utf8')

  const headBefore = git(cwd, ['rev-parse', 'HEAD'])
  const r = await runQuicklogCommit({
    specBase, cwd, gitUser: 'tester',
    qlIds: ['ql-20260916-002-bbbb', 'ql-20260916-003-cccc'],
    message: 'chore: 收编本会话 QUICKLOG 条目',
  })
  assert.equal(r.ok, true, `ok（实际 ${JSON.stringify(r)}）`)
  assert.equal(r.skipped, false, '有新条目不 skipped')
  assert.notEqual(r.head, headBefore, 'HEAD 已推进')
  assert.deepEqual([...r.committedQlIds].sort(), ['ql-20260916-002-bbbb', 'ql-20260916-003-cccc'])

  // 提交内容 = 基线 + 我的两条；并行条目绝不进
  const committed = git(cwd, ['show', 'HEAD:.sillyspec/quicklog/QUICKLOG-tester.md'])
  assert.ok(committed.includes('ql-20260916-001-aaaa'), '基线条目保留')
  assert.ok(committed.includes('ql-20260916-002-bbbb'), '我的已完成条目进提交')
  assert.ok(committed.includes('ql-20260916-003-cccc'), '我的已取消条目一并收编')
  assert.ok(!committed.includes('ql-20260916-004-dddd'), '并行会话条目不被夹带')
  // patches sidecar 进暂存面
  const lsTree = git(cwd, ['ls-tree', '-r', '--name-only', 'HEAD'])
  assert.ok(lsTree.includes('.sillyspec/quicklog/patches/ql-20260916-002-bbbb.json'), 'sidecar json 已提交')
  assert.ok(lsTree.includes('.sillyspec/quicklog/patches/ql-20260916-002-bbbb.patch'), 'sidecar patch 已提交')
  assert.equal(git(cwd, ['log', '-1', '--format=%s']).trim(), 'chore: 收编本会话 QUICKLOG 条目', '提交信息透传')

  // 工作区恢复：并行条目回到未提交态，其余干净
  const ws = readFileSync(main, 'utf8')
  assert.ok(ws.includes('ql-20260916-004-dddd'), '并行条目恢复在工作区')
  assert.ok(ws.includes('ql-20260916-002-bbbb'), '我的条目工作区仍在（不删档）')
  const st = git(cwd, ['status', '--porcelain'])
  assert.match(st, /M \.sillyspec\/quicklog\/QUICKLOG-tester\.md/, `QUICKLOG 回到「仅并行条目未提交」态（实际 ${st}）`)
  assert.ok(!st.includes('patches'), 'sidecar 无未提交残留')

  // 备份兜底落盘
  const rt = join(specBase, '.runtime')
  assert.ok(readdirSync(rt).some(f => f.startsWith('quicklog-slice-')), '备份文件落 .runtime')
})

test('② 轮转双文件：归档文件与 HEAD 无文件的新主文件都切片，两处并行条目都留工作区', async () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const specBase = join(cwd, '.sillyspec')
  const qlDir = join(specBase, 'quicklog')
  mkdirSync(qlDir, { recursive: true })
  // HEAD：轮转归档已提交（含旧基线条目）
  const arch = join(qlDir, 'QUICKLOG-tester-2026-09-15.md')
  const archBase = entry('ql-20260915-091-eeee', '归档基线', '已完成')
  writeFileSync(arch, archBase, 'utf8')
  git(cwd, ['add', '--', '.sillyspec/quicklog/QUICKLOG-tester-2026-09-15.md'])
  git(cwd, ['commit', '-q', '-m', 'archive baseline'])
  // 工作区：归档追加我的条目（ql-014 落回旧文件的形态）+ 新主文件（未跟踪）我的 + 并行
  writeFileSync(arch, archBase + entry('ql-20260916-012-ffff', '落回归档的我的条目', '已完成'), 'utf8')
  const main = join(qlDir, 'QUICKLOG-tester.md')
  writeFileSync(main,
    entry('ql-20260916-013-aaaa', '新主文件里的我的条目', '已完成')
    + entry('ql-20260916-014-bbbb', '新主文件里的并行条目', '进行中'), 'utf8')

  const r = await runQuicklogCommit({
    specBase, cwd, gitUser: 'tester',
    qlIds: ['ql-20260916-012-ffff', 'ql-20260916-013-aaaa'],
    message: 'chore: 双文件收编',
  })
  assert.equal(r.ok, true)
  assert.deepEqual([...r.quicklogFiles].sort(),
    ['QUICKLOG-tester-2026-09-15.md', 'QUICKLOG-tester.md'])

  const archHead = git(cwd, ['show', 'HEAD:.sillyspec/quicklog/QUICKLOG-tester-2026-09-15.md'])
  assert.ok(archHead.includes('ql-20260915-091-eeee') && archHead.includes('ql-20260916-012-ffff'))
  const mainHead = git(cwd, ['show', 'HEAD:.sillyspec/quicklog/QUICKLOG-tester.md'])
  assert.ok(mainHead.includes('ql-20260916-013-aaaa'), '新文件基线为空 → 只含我的条目')
  assert.ok(!mainHead.includes('ql-20260916-014-bbbb'), '新文件里的并行条目不被夹带')
  // 恢复：两文件并行/全部条目俱在
  assert.ok(readFileSync(arch, 'utf8').includes('ql-20260916-012-ffff'))
  const wsMain = readFileSync(main, 'utf8')
  assert.ok(wsMain.includes('ql-20260916-013-aaaa') && wsMain.includes('ql-20260916-014-bbbb'), '新主文件恢复全量')
  const st = git(cwd, ['status', '--porcelain'])
  assert.match(st, /M \.sillyspec\/quicklog\/QUICKLOG-tester\.md/, '新主文件回到未提交并行条目态')
})

test('③ 幂等：条目已在 HEAD（重跑场景）→ skipped、HEAD 不动、工作区不动', async () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const specBase = join(cwd, '.sillyspec')
  const qlDir = join(specBase, 'quicklog')
  mkdirSync(qlDir, { recursive: true })
  const main = join(qlDir, 'QUICKLOG-tester.md')
  const content = entry('ql-20260916-001-aaaa', '已收编条目', '已完成')
    + entry('ql-20260916-002-bbbb', '并行条目', '进行中')
  writeFileSync(main, content, 'utf8')
  git(cwd, ['add', '--', '.sillyspec/quicklog/QUICKLOG-tester.md'])
  git(cwd, ['commit', '-q', '-m', 'baseline'])
  // 工作区与 HEAD 同（无新增我的条目）→ 重跑收编同一 ql-ID
  const headBefore = git(cwd, ['rev-parse', 'HEAD'])
  const r = await runQuicklogCommit({
    specBase, cwd, gitUser: 'tester', qlIds: ['ql-20260916-001-aaaa'], message: 're-run',
  })
  assert.equal(r.skipped, true, `无新内容 skipped（实际 ${JSON.stringify(r)}）`)
  assert.equal(r.head, headBefore, 'HEAD 不动')
  assert.equal(readFileSync(main, 'utf8'), content, '工作区原样')
})

test('④ CRLF 兼容：Windows 工作区 CRLF 切片提交后，恢复仍保持 CRLF 不污染', async () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const specBase = join(cwd, '.sillyspec')
  const qlDir = join(specBase, 'quicklog')
  mkdirSync(qlDir, { recursive: true })
  const main = join(qlDir, 'QUICKLOG-tester.md')
  const baseline = entry('ql-20260916-001-aaaa', '基线', '已完成')
  writeFileSync(main, baseline, 'utf8')
  git(cwd, ['add', '--', '.sillyspec/quicklog/QUICKLOG-tester.md'])
  git(cwd, ['commit', '-q', '-m', 'baseline'])
  const full = baseline + entry('ql-20260916-002-bbbb', '我的条目', '已完成')
    + entry('ql-20260916-003-cccc', '并行条目', '进行中')
  writeFileSync(main, full.replace(/\n/g, '\r\n'), 'utf8') // 全 CRLF 工作区

  const r = await runQuicklogCommit({
    specBase, cwd, gitUser: 'tester', qlIds: ['ql-20260916-002-bbbb'], message: 'crlf',
  })
  assert.equal(r.ok, true)
  const committed = git(cwd, ['show', 'HEAD:.sillyspec/quicklog/QUICKLOG-tester.md'])
  assert.ok(committed.includes('ql-20260916-002-bbbb') && !committed.includes('ql-20260916-003-cccc'))
  const ws = readFileSync(main, 'utf8')
  assert.ok(ws.includes('\r\n'), '恢复后仍为 CRLF')
  assert.ok(ws.includes('ql-20260916-003-cccc'), '并行条目恢复')
})

test('⑤ fail-fast：ql-ID 无法解析（无 --ql 无 guard）→ 报错含 --ql 指引；条目在任何文件都找不到 → 报错', async () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const specBase = join(cwd, '.sillyspec')
  await assert.rejects(
    runQuicklogCommit({ specBase, cwd, gitUser: 'tester', qlIds: [], changeName: 'quick-nonexist', message: 'x' }),
    /--ql/, '缺 ql-ID 报错须含 --ql 指引')
  await assert.rejects(
    runQuicklogCommit({ specBase, cwd, gitUser: 'tester', qlIds: ['ql-20260916-999-zzzz'], message: 'x' }),
    /999-zzzz/, '找不到条目报错须点名该 ql-ID')
})

test('⑥ dispatch：未知子命令报错；--change 无 guard 且无 --ql → exit 1 含指引', () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const r1 = runCli(cwd, ['quicklog', 'status'])
  assert.notEqual(r1.status, 0, '未知子命令非零退出')
  assert.match(r1.out, /commit/, '提示可用子命令')
  const r2 = runCli(cwd, ['quicklog', 'commit', '--change', 'quick-nope', '-m', 'x'])
  assert.equal(r2.status, 1, `缺 ql-ID exit 1（实际 ${r2.status}）`)
  assert.match(r2.out, /--ql/, '报错含 --ql 指引')
})

test('⑦ dispatch 端到端：guard.json quicklogId 自动解析 → 命令收编成功', () => {
  const cwd = makeFixture()
  initRepo(cwd)
  const specBase = join(cwd, '.sillyspec')
  const qlDir = join(specBase, 'quicklog')
  mkdirSync(qlDir, { recursive: true })
  const main = join(qlDir, 'QUICKLOG-tester.md')
  const full = entry('ql-20260916-021-aaaa', 'guard 指向的我的条目', '已完成')
    + entry('ql-20260916-022-bbbb', '并行条目', '进行中')
  writeFileSync(main, full, 'utf8')
  // guard：quick 会话 quick-99999999 预留 ql-20260916-021-aaaa（写侧字段 quicklogId）
  const guardDir = join(specBase, '.runtime', 'quick-sessions', 'quick-99999999')
  mkdirSync(guardDir, { recursive: true })
  writeFileSync(join(guardDir, 'guard.json'),
    JSON.stringify({ sessionId: 'quick-99999999', quicklogId: 'ql-20260916-021-aaaa', startedAt: new Date().toISOString() }), 'utf8')

  const r = runCli(cwd, ['quicklog', 'commit', '--change', 'quick-99999999', '-m', 'chore: guard 解析收编'])
  assert.equal(r.status, 0, `CLI 成功（输出 ${r.out.slice(-300)}）`)
  const committed = git(cwd, ['show', 'HEAD:.sillyspec/quicklog/QUICKLOG-tester.md'])
  assert.ok(committed.includes('ql-20260916-021-aaaa') && !committed.includes('ql-20260916-022-bbbb'))
  assert.ok(readFileSync(main, 'utf8').includes('ql-20260916-022-bbbb'), '并行条目留工作区')
})
