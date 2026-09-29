/**
 * 变更标题三段链路（用户需求 2026-09-29：changes.title 应为中文概括 ≤50 字、建议 ~20 字，
 * agent 总结——此前 thin flow start 不传 title（空）、auto 路径兜底英文名、上行 SELECT 漏列
 * title → 平台只能落 change_key 英文 key）。
 *
 * 锁定语义：
 *   ① deriveChangeTitle：--input 首行推导（标签剥离/成功标准止/≤50 截断/空返回 ''）
 *   ② flow start：fresh 写 title（--title > input 首行 > 变更名兜底）；resume --title 可改、
 *      空 title 补写不覆盖；serializeForSync 上行携带 title
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { deriveChangeTitle } = await import('../src/quicklog.js')
const { ProgressManager } = await import('../src/progress.js')

const tmpRoots = []
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'title-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd }
}
function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
}
function readTitle(cwd, name) {
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  const row = pm._ensureDB(cwd).getDb().prepare('SELECT title FROM changes WHERE name = ?').get(name)
  return row ? row.title : undefined
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① deriveChangeTitle：首行推导 + 标签剥离 + 成功标准止 + ≤50 截断', () => {
  assert.equal(deriveChangeTitle('知识页治理卡显示「暂无推荐去向」体验优化\n\n成功标准：\n- x'), '知识页治理卡显示「暂无推荐去向」体验优化')
  assert.equal(deriveChangeTitle('需求：变更列表加筛选\n\n成功标准：\n- x'), '变更列表加筛选', '标签前缀剥离')
  assert.equal(deriveChangeTitle('成功标准：\n- x'), '', '首行即成功标准引导行 → 空（调用方兜底）')
  assert.equal(deriveChangeTitle(''), '', '空输入 → 空串')
  const long = deriveChangeTitle('一'.repeat(80))
  assert.equal(long.length, 51, '超长截断加 …（50+1）')
  assert.ok(long.endsWith('…'))
})

test('② flow start fresh：--title 优先，否则 input 首行，横幅在场', () => {
  const { cwd } = makeRepo()
  const cn = '2026-09-29-title-a'
  const r = cli(cwd, ['flow', 'start', '--change', cn, '--input', '知识页伪域池一键归位交互\n\n成功标准：\n- 归位后覆盖率回升', '--no-review'])
  assert.equal(r.status, 0, `start 失败: ${r.stderr}`)
  assert.match(r.stdout, /🏷️ 变更标题：知识页伪域池一键归位交互/, '横幅展示推导标题')
  assert.equal(readTitle(cwd, cn), '知识页伪域池一键归位交互', 'db changes.title = input 首行')

  const cn2 = '2026-09-29-title-b'
  const r2 = cli(cwd, ['flow', 'start', '--change', cn2, '--input', '随便什么输入\n\n成功标准：\n- x', '--title', '变更标题显式指定', '--no-review'])
  assert.equal(r2.status, 0)
  assert.equal(readTitle(cwd, cn2), '变更标题显式指定', '--title 显式覆盖')
  tmpRoots.push(cwd)
})

test('③ flow start resume：--title 改标题；空 title 时 input 补写；上行携带 title', async () => {
  const { cwd } = makeRepo()
  const cn = '2026-09-29-title-c'
  assert.equal(cli(cwd, ['flow', 'start', '--change', cn, '--input', '首行就是标题素材\n\n成功标准：\n- x', '--no-review']).status, 0)
  assert.equal(readTitle(cwd, cn), '首行就是标题素材')

  // resume 带 --title → 更新
  const r2 = cli(cwd, ['flow', 'start', '--change', cn, '--title', '改后的中文标题'])
  assert.equal(r2.status, 0)
  assert.match(r2.stdout, /🏷️ 变更标题已更新：改后的中文标题/)
  assert.equal(readTitle(cwd, cn), '改后的中文标题')

  // resume 不带 --title → 不覆盖既有标题
  const r3 = cli(cwd, ['flow', 'start', '--change', cn, '--input', '另一个输入首行\n\n成功标准：\n- y'])
  assert.equal(r3.status, 0)
  assert.equal(readTitle(cwd, cn), '改后的中文标题', '无 --title 时不覆盖语义标题')

  // serializeForSync 上行携带（同步链缺口修复锚：此前 SELECT 漏列恒 null）
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  const body = pm.serializeForSync(cwd, cn)
  assert.equal(body?.changes?.[0]?.title, '改后的中文标题', 'changes[].title 上行在场')
  tmpRoots.push(cwd)
})

test('④ 存量空 title 回填：resume 时 input 首行补写（不覆盖已有）', () => {
  const { cwd } = makeRepo()
  const cn = '2026-09-29-title-d'
  assert.equal(cli(cwd, ['flow', 'start', '--change', cn, '--input', '原始输入首行\n\n成功标准：\n- x', '--no-review']).status, 0)
  // 模拟存量空 title 行（旧版本创建的变更）
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.updateChangeMeta(cwd, cn, { title: null })
  assert.equal(readTitle(cwd, cn), null)
  const r = cli(cwd, ['flow', 'start', '--change', cn, '--input', '原始输入首行\n\n成功标准：\n- x'])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /🏷️ 变更标题已补写：原始输入首行/, '空 title 补写横幅')
  assert.equal(readTitle(cwd, cn), '原始输入首行', '空 title 被 input 首行回填')
  tmpRoots.push(cwd)
})
