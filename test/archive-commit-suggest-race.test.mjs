/**
 * 2026-10-06-archive-cmd-race-and-brief 回归：归档提交建议命令的共享暂存区竞态加固
 *
 * 背景（真仓实测）：flow-status-json 收尾时，CLI 打印的「归档提交一笔到位」命令照抄执行报
 * pathspec did not match——共享仓多会话/后台同步在「打印→执行」窗口瞬改暂存区，旧实现把
 * 转瞬即逝的源侧 A 条目抄进 pathspec；单会话镜像复盘命令干净（竞态即现即逝）。
 *
 * 覆盖：
 *   ① 纯函数构成：src 侧仅 HEAD 在册（幽灵 A 源侧条目被丢弃并回报）；dst 侧收拢为单条
 *      归档目录 pathspec；knowledge 共享面按「HEAD 在册 ∨ 工作区在场」收
 *   ② runArchiveChain 真链（临时 git 仓）：正常形态打印命令原样执行 exit 0 且提交含
 *      归档侧与源侧删除（rename 两侧都落地）
 *   ③ 竞态注入：源侧幽灵 A 条目先进暂存区（打印时可见）后消失，打印命令仍可执行
 *      exit 0 且提交面不含幽灵路径 + 「丢弃 N 个瞬时暂存条目」提示在场
 *   ④ test:core 清单驻留断言（防移出日常拦截面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { resolveArchiveCommitPathspecs, runArchiveChain } = await import(pathToFileURL(join(ROOT, '..', 'src', 'run', 'complete-handlers.js')).href)
const { ProgressManager } = await import(pathToFileURL(join(ROOT, '..', 'src', 'progress.js')).href)

const CHANGE = '2026-10-06-race-x'

function git(dir, args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

// Windows 容错清理：ProgressManager 的 SQLite 句柄可能短暂持有 temp 目录（EPERM）——
// 重试后仍失败则留垃圾不失败（与 _cli-step-harness cleanup 同策略，断言结果不受掩盖）
function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch { /* 句柄占用留待系统清理 */ }
}

test('① 纯函数构成：HEAD 锚 src / 目录 dst / 共享面在场判定 / 幽灵丢弃回报', () => {
  const staged = [
    `R100\t.sillyspec/changes/${CHANGE}/design.md\t.sillyspec/changes/archive/${CHANGE}/design.md`,
    `A\t.sillyspec/changes/archive/${CHANGE}/review.json`,
    `A\t.sillyspec/changes/${CHANGE}/phantom-sibling.json`, // 竞态幽灵：源侧 A、HEAD 不在册
    `M\t.sillyspec/knowledge/fr.md`, // 共享面 M：HEAD 在册
    `A\t.sillyspec/knowledge/new-domain.md`, // 共享面新产：工作区在场
    `A\t.sillyspec/knowledge/gone.json`, // 共享面幽灵：HEAD 不在册且不在场
  ].join('\n')
  const headTree = [`.sillyspec/changes/${CHANGE}/design.md`, '.sillyspec/knowledge/fr.md'].join('\n')
  const { pathspecs, dropped } = resolveArchiveCommitPathspecs({
    changeName: CHANGE,
    stagedNameStatus: staged,
    headTreeFiles: headTree,
    existsFn: (p) => p === '.sillyspec/knowledge/new-domain.md',
  })
  assert.deepEqual(pathspecs, [
    `.sillyspec/changes/archive/${CHANGE}/`,
    `.sillyspec/changes/${CHANGE}/design.md`,
    '.sillyspec/knowledge/fr.md',
    '.sillyspec/knowledge/new-domain.md',
  ], '目录 dst 单条 + HEAD 锚 src + 共享面按在场')
  assert.deepEqual(dropped, [`.sillyspec/changes/${CHANGE}/phantom-sibling.json`, '.sillyspec/knowledge/gone.json'], '两处幽灵均丢弃并回报')
})

async function buildRepo({ phantom = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'acsr-'))
  git(cwd, ['init', '-q'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  const c = join(cwd, '.sillyspec', 'changes', CHANGE)
  const k = join(cwd, '.sillyspec', 'knowledge')
  mkdirSync(c, { recursive: true })
  mkdirSync(k, { recursive: true })
  writeFileSync(join(c, 'design.md'), 'design v1\n')
  writeFileSync(join(c, 'flow-state.yaml'), 'tier: thin\n')
  writeFileSync(join(k, 'fr.md'), 'kn base\n')
  git(cwd, ['add', '-A', '--', '.sillyspec'])
  git(cwd, ['commit', '-qm', 'base'])
  if (phantom) {
    // 竞态注入（真竞态形态）：兄弟会话的瞬时暂存条目——index 在册但无物理文件
    // （先 add 后 unlink，条目存续）；打印→执行窗口内条目再被并行移出（测试后半段 reset）
    writeFileSync(join(c, 'phantom-sibling.json'), '{"transient":true}\n')
    git(cwd, ['add', '--', `.sillyspec/changes/${CHANGE}/phantom-sibling.json`])
    rmSync(join(c, 'phantom-sibling.json'))
  }
  return { cwd, c }
}

async function driveArchiveChain(cwd) {
  const specBase = join(cwd, '.sillyspec')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, CHANGE)
  const lines = []
  const orig = console.log
  console.log = (...a) => { lines.push(a.join(' ')) }
  try {
    await runArchiveChain({
      pm, cwd, specBase, changeName: CHANGE,
      srcDir: join(specBase, 'changes', CHANGE),
      destDir: join(specBase, 'changes', 'archive', CHANGE),
      skipPlanCheck: true,
    })
  } finally {
    console.log = orig
  }
  return lines.join('\n')
}

function execPrintedCommand(cwd, printed) {
  const line = printed.split('\n').find((l) => l.includes('git commit -m '))
  assert.ok(line, `应打印一笔到位命令，实际：${printed}`)
  const rest = line.trim().replace(/^git commit -m "chore\(archive\): [^"]+" -- /, '')
  const paths = rest.split(/\s+/).filter(Boolean)
  const msg = line.match(/-m "([^"]+)"/)[1]
  return { status: spawnSync('git', ['-C', cwd, 'commit', '-m', msg, '--', ...paths], { encoding: 'utf8' }).status, paths }
}

test('② runArchiveChain 真链正常形态：打印命令原样执行 exit 0，rename 两侧都落地', { timeout: 60000 }, async () => {
  const { cwd } = await buildRepo()
  try {
    const printed = await driveArchiveChain(cwd)
    assert.ok(printed.includes('归档提交一笔到位'), '建议块在场')
    assert.ok(printed.includes('pathspec 不匹配'), 'fallback 指引在场')
    const r = execPrintedCommand(cwd, printed)
    assert.equal(r.status, 0, `打印命令应 exit 0（paths=${r.paths.join(' ')}）`)
    const show = git(cwd, ['show', '--name-status', '--format=', 'HEAD'])
    assert.ok(show.includes(`R100\t.sillyspec/changes/${CHANGE}/design.md\t.sillyspec/changes/archive/${CHANGE}/design.md`) || show.includes(`R\t.sillyspec/changes/${CHANGE}/design.md`), `源侧删除应随提交落地：${show}`)
    assert.ok(show.includes(`A\t.sillyspec/changes/archive/${CHANGE}/design.md`) || show.includes(`archive/${CHANGE}/design.md`), '归档侧文件应进提交')
    // 命令构成钉：dst 为目录 pathspec、src 为 HEAD 在册路径
    assert.ok(r.paths.includes(`.sillyspec/changes/archive/${CHANGE}/`), 'dst 收拢为归档目录 pathspec')
    assert.ok(r.paths.includes(`.sillyspec/changes/${CHANGE}/design.md`), 'src 侧 HEAD 在册路径保留')
    assert.ok(!r.paths.some((p) => p.startsWith(`.sillyspec/changes/archive/${CHANGE}/`) && p.length > `.sillyspec/changes/archive/${CHANGE}/`.length), 'dst 不再逐文件罗列')
  } finally { cleanup(cwd) }
})

test('③ 竞态注入：幽灵 A 先进暂存区后消失，命令仍可执行且提交面不含幽灵', { timeout: 60000 }, async () => {
  const { cwd } = await buildRepo({ phantom: true })
  try {
    const printed = await driveArchiveChain(cwd)
    assert.ok(printed.includes('丢弃 1 个瞬时暂存条目'), `幽灵应被丢弃并提示，实际：${printed}`)
    assert.ok(printed.includes('phantom-sibling.json'), '提示含幽灵路径')
    // 模拟竞态后半段：幽灵条目被兄弟会话移出暂存区（打印→执行窗口内消失）
    git(cwd, ['reset', '-q', 'HEAD', '--', `.sillyspec/changes/${CHANGE}/phantom-sibling.json`])
    const r = execPrintedCommand(cwd, printed)
    assert.equal(r.status, 0, `竞态形态下打印命令仍应 exit 0（paths=${r.paths.join(' ')}）`)
    assert.ok(!r.paths.includes(`.sillyspec/changes/${CHANGE}/phantom-sibling.json`), '幽灵路径不进命令')
    const show = git(cwd, ['show', '--name-status', '--format=', 'HEAD'])
    assert.ok(!show.includes('phantom-sibling'), `提交面不得含幽灵：${show}`)
  } finally { cleanup(cwd) }
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/archive-commit-suggest-race.test.mjs'),
    'test:core 必须包含 test/archive-commit-suggest-race.test.mjs',
  )
})
