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
const { resolveArchiveCommitPathspecs, runArchiveChain, archiveLandedInHeadTree } = await import(pathToFileURL(join(ROOT, '..', 'src', 'run', 'complete-handlers.js')).href)
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
  const origErr = console.error
  // 双流捕获（2026-10-23 缺陷③落库断言）：未落库态建议块走 console.error（🚨 升级），
  // 已落库态走 console.log——两流合并后断言语义不变（命令行/execPrintedCommand 照旧）
  console.log = (...a) => { lines.push(a.join(' ')) }
  console.error = (...a) => { lines.push(a.join(' ')) }
  try {
    await runArchiveChain({
      pm, cwd, specBase, changeName: CHANGE,
      srcDir: join(specBase, 'changes', CHANGE),
      destDir: join(specBase, 'changes', 'archive', CHANGE),
      skipPlanCheck: true,
    })
  } finally {
    console.log = orig
    console.error = origErr
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

test('② runArchiveChain 真链正常形态：未落库态 🚨 + 命令原样执行 exit 0，rename 两侧都落地', { timeout: 60000 }, async () => {
  const { cwd } = await buildRepo()
  try {
    const printed = await driveArchiveChain(cwd)
    // 缺陷③落库断言：临时仓归档面 staged 未提交 → 未落库态——🚨 升级 + 可执行命令 + 后果告知
    assert.ok(printed.includes('归档提交未落库'), `未落库态应 🚨 升级，实际：${printed}`)
    assert.ok(printed.includes('立即执行'), '应给出立即执行指引')
    assert.ok(printed.includes('丢归档'), '应告知不执行的后果')
    assert.ok(printed.includes('git log --oneline -1'), '应给执行后核对方式')
    assert.ok(!printed.includes('归档提交一笔到位（归档路径已在 HEAD 树'), '未落库态不得走已落库 ℹ️ 文案')
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
    // 提交落库后：HEAD 树判定翻转为已落库（纯函数用真仓 ls-tree 复核）
    const headTree = git(cwd, ['ls-tree', '-r', '--name-only', 'HEAD'])
    assert.equal(archiveLandedInHeadTree({ headTreeFiles: headTree, changeName: CHANGE }), true, '提交后 HEAD 树含归档路径——landed 判定应翻 true')
  } finally { cleanup(cwd) }
})

test('②b 已落库态：HEAD 树含归档路径时提示走 stdout ℹ️ 且无 🚨', { timeout: 60000 }, async () => {
  const { cwd } = await buildRepo()
  try {
    // 预置已落库形态：历史日期前缀目录 archive/2026-10-01-<CHANGE>/ 先行入库——
    // landed 判定的 `-<changeName>` 后缀兼容形态命中（纯函数三态锚同源），且与本链
    // 即将搬移的裸名 dest 不冲突（同名 dest 会触发「目标目录已存在」process.exit）。
    const archDir = join(cwd, '.sillyspec', 'changes', 'archive', `2026-10-01-${CHANGE}`)
    mkdirSync(archDir, { recursive: true })
    writeFileSync(join(archDir, 'prev.md'), 'prev\n')
    git(cwd, ['add', '.sillyspec/changes/archive'])
    git(cwd, ['commit', '-qm', 'chore(archive): 预置历史前缀已落库锚'])
    assert.equal(git(cwd, ['ls-tree', '-r', '--name-only', 'HEAD']).includes(`archive/2026-10-01-${CHANGE}/prev.md`), true)
    // 本链搬移裸名 dest：暂存面非空且 HEAD 树已含后缀兼容归档首段 → landed 分流
    const printed = await driveArchiveChain(cwd)
    assert.ok(!printed.includes('归档提交未落库'), `已落库态不得 🚨，实际：${printed}`)
    assert.ok(printed.includes('归档提交一笔到位（归档路径已在 HEAD 树'), `已落库态应走 stdout ℹ️ 分流，实际：${printed}`)
    assert.ok(printed.includes('git commit -m '), '已落库态仍给出可执行命令')
    const r = execPrintedCommand(cwd, printed)
    assert.equal(r.status, 0, `已落库态打印命令应 exit 0`)
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

test('⑤ archiveLandedInHeadTree 纯函数：裸名/后缀兼容/同名子串不误报/负例', () => {
  const name = '2026-10-06-race-x'
  // 裸变更名（archiveDestDirName 现行口径）
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: `.sillyspec/changes/archive/${name}/design.md\n.sillyspec/knowledge/fr.md`, changeName: name }), true, '裸名归档路径→已落库')
  // 历史日期前缀形态兼容（<prefix>-<changeName>）
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: `.sillyspec/changes/archive/2026-10-05-${name}/design.md`, changeName: name }), true, '后缀兼容形态→已落库')
  // 同名做他名后缀段（-v2 结尾）不误报
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: `.sillyspec/changes/archive/${name}-v2/design.md`, changeName: name }), false, '他变更名以本名开头不误报')
  // 无归档路径 / 空树 / 空变更名
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: `.sillyspec/changes/${name}/design.md`, changeName: name }), false, '活跃目录不算落库')
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: '', changeName: name }), false, '空树→未落库')
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: `.sillyspec/changes/archive/${name}/x.md`, changeName: '' }), false, '空变更名→false（防御）')
  // 反斜杠路径容错（Windows ls-tree 输出形态）
  assert.equal(archiveLandedInHeadTree({ headTreeFiles: `.sillyspec\\changes\\archive\\${name}\\design.md`, changeName: name }), true, '反斜杠形态归一后命中')
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/archive-commit-suggest-race.test.mjs'),
    'test:core 必须包含 test/archive-commit-suggest-race.test.mjs',
  )
})
